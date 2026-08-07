// @ts-nocheck
// =========================================================================
// 🚀 FITUR PREMIUM: STRATEGI PEMASUKAN
// Modul terpisah supaya tidak menyentuh routes.ts yang sudah besar.
// Cara pakai: lihat instruksi integrasi di akhir chat.
// =========================================================================
import type { Express } from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { sql } from "drizzle-orm";

// ============================================================
// AUTH HELPER (meniru pola getUser yang sudah ada di routes.ts)
// ============================================================
const getUser = async (req: any) => {
  const email = req.headers["x-user-email"];
  if (!email || email === "guest") {
    let user = await storage.getUser(1);
    if (!user) user = await storage.createUser({ username: "guest", password: "123", email: "guest@bilano.app" });
    return user;
  }
  let user = await storage.getUserByUsername(email as string);
  if (!user) {
    try { user = await storage.createUser({ username: email as string, password: "123", email: email as string }); }
    catch (err) { user = await storage.getUserByUsername(email as string); }
  }
  return user;
};

function safeParse(val: any, fallback: any) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== "string") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function formatAttempt(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    recommendation: safeParse(row.recommendation, {}),
    state: row.state,
    status: row.status,
    materials: safeParse(row.materials, []),
    totalCost: Number(row.total_cost) || 0,
    feasibilityVerdict: row.feasibility_verdict,
    capitalPlan: safeParse(row.capital_plan, null),
    sellingNotes: safeParse(row.selling_notes, []),
    revenueLog: safeParse(row.revenue_log, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// SELF-HEALING TABLES (meniru pola ensureRetainedTable/ensureOtpTable)
// ============================================================
const ensureIncomeStrategyTables = async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS income_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        status TEXT,
        tujuan TEXT,
        pola_kerja TEXT,
        latar_belakang TEXT,
        keahlian TEXT DEFAULT '[]',
        keahlian_lainnya TEXT,
        aset TEXT DEFAULT '[]',
        konstrain_waktu TEXT DEFAULT '{}',
        recommendations TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS income_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        profile_id INTEGER,
        recommendation TEXT DEFAULT '{}',
        state TEXT DEFAULT 'MATERIALS',
        materials TEXT DEFAULT '[]',
        total_cost BIGINT DEFAULT 0,
        feasibility_verdict TEXT,
        capital_plan TEXT,
        selling_notes TEXT DEFAULT '[]',
        revenue_log TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`SELECT recommendations FROM income_profiles LIMIT 1`);
    await db.execute(sql`SELECT selling_notes, revenue_log FROM income_attempts LIMIT 1`);
    
    // Auto-Migrasi Kolom Baru tanpa menghapus tabel
    await db.execute(sql`ALTER TABLE income_profiles ADD COLUMN IF NOT EXISTS jejaring_sosial TEXT;`);
    await db.execute(sql`ALTER TABLE income_profiles ADD COLUMN IF NOT EXISTS preferensi_kerja TEXT;`);
    await db.execute(sql`ALTER TABLE income_profiles ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMP;`);
    await db.execute(sql`ALTER TABLE income_attempts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';`);
  } catch (e) {
    await db.execute(sql`DROP TABLE IF EXISTS income_attempts`);
    await db.execute(sql`DROP TABLE IF EXISTS income_profiles`);
    await db.execute(sql`
      CREATE TABLE income_profiles (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, status TEXT, tujuan TEXT, pola_kerja TEXT,
        latar_belakang TEXT, keahlian TEXT DEFAULT '[]', keahlian_lainnya TEXT, aset TEXT DEFAULT '[]',
        konstrain_waktu TEXT DEFAULT '{}', recommendations TEXT DEFAULT '[]',
        jejaring_sosial TEXT, preferensi_kerja TEXT, cooldown_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`
      CREATE TABLE income_attempts (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, profile_id INTEGER, recommendation TEXT DEFAULT '{}',
        state TEXT DEFAULT 'MATERIALS', status TEXT DEFAULT 'ACTIVE', materials TEXT DEFAULT '[]', total_cost BIGINT DEFAULT 0,
        feasibility_verdict TEXT, capital_plan TEXT, selling_notes TEXT DEFAULT '[]', revenue_log TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }
};

// ============================================================
// GEMINI HELPER
// ============================================================
async function askGeminiJSON(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
  if (!apiKey) throw new Error("Kunci API Sistem AI belum terpasang.");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.6, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error("Koneksi ke otak pusat sedang sibuk, coba lagi.");
  const data = await response.json();
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error("Pesan ditahan filter keamanan internal.");

  let cleanText = String(resultText).replace(/```json/gi, "").replace(/```/g, "").trim();
  const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) cleanText = jsonMatch[0];
  return JSON.parse(cleanText);
}

async function askGeminiText(prompt: string): Promise<string | null> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
  if (!apiKey) return null;
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { return null; }
}

// ============================================================
// ENUM VALUE TETAP (kode yang mengontrol, AI hanya menulis label)
// ============================================================
const STATUS_LABELS: Record<string, string> = {
  PELAJAR: "Pelajar (SMP/SMA/SMK)",
  MAHASISWA: "Mahasiswa",
  PEKERJA: "Pekerja / Karyawan",
  BELUM_BEKERJA: "Belum bekerja / sedang mencari kerja",
};

const TUJUAN_OPTIONS: Record<string, { value: string; desc: string }[]> = {
  PELAJAR: [
    { value: "UANG_JAJAN", desc: "uang jajan/kebutuhan pribadi tambahan" },
    { value: "MENABUNG_TUJUAN", desc: "menabung untuk tujuan tertentu (misal gadget/liburan)" },
    { value: "BELAJAR_MANDIRI", desc: "belajar cari uang sendiri, tidak selalu minta orang tua" },
  ],
  MAHASISWA: [
    { value: "UANG_SAKU", desc: "tambahan uang saku" },
    { value: "BIAYA_KULIAH", desc: "bantu biaya kuliah (UKT/kos/buku)" },
    { value: "TABUNGAN_JANGKA_PANJANG", desc: "menabung/investasi jangka panjang" },
    { value: "PORTOFOLIO_KARIR", desc: "membangun pengalaman kerja/portofolio duluan" },
  ],
  PEKERJA: [
    { value: "PENGHASILAN_TAMBAHAN", desc: "penghasilan tambahan di luar gaji utama" },
    { value: "GAJI_KURANG", desc: "gaji dirasa kurang untuk kebutuhan sehari-hari" },
    { value: "RENCANA_JANGKA_PANJANG", desc: "menyiapkan usaha sampingan untuk rencana jangka panjang" },
  ],
  BELUM_BEKERJA: [
    { value: "PENGHASILAN_SEMENTARA", desc: "penghasilan sementara sambil tetap cari kerja tetap" },
    { value: "PIVOT_KE_USAHA", desc: "sudah lama belum dapat kerja formal, ingin coba usaha sendiri" },
    { value: "EKSPLORASI", desc: "sekadar eksplorasi peluang dulu" },
  ],
};

const KEAHLIAN_OPTIONS = [
  { value: "KREATIF", desc: "desain, nulis, video editing, foto" },
  { value: "DIGITAL_TEKNIS", desc: "coding, riset, olah data" },
  { value: "KULINER", desc: "masak/baking" },
  { value: "INTERPERSONAL", desc: "ngajar, komunikasi, jualan" },
  { value: "KERAJINAN_TANGAN", desc: "jahit, craft" },
  { value: "FISIK_JASA", desc: "bersih-bersih, angkut, olahraga" },
];

const ASET_OPTIONS = [
  { value: "LAPTOP_PC", desc: "laptop/PC" },
  { value: "HP_KAMERA_BAGUS", desc: "HP dengan kamera bagus" },
  { value: "KENDARAAN", desc: "motor/mobil" },
  { value: "RUANG_USAHA", desc: "ruang yang bisa dipakai usaha (kamar/dapur/garasi)" },
  { value: "PERALATAN_DAPUR", desc: "peralatan dapur" },
  { value: "ALAT_KERAJINAN", desc: "alat kerajinan (mesin jahit, dll)" },
];

// ============================================================
// FALLBACK (kalau Gemini gagal/API key belum ada — fitur tetap jalan)
// ============================================================
function fallbackQuestions(status: string) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const tujuanOpts = (TUJUAN_OPTIONS[status] || TUJUAN_OPTIONS.MAHASISWA).map((o) => ({ value: o.value, label: cap(o.desc) }));
  const keahlianOpts = KEAHLIAN_OPTIONS.map((o) => ({ value: o.value, label: cap(o.desc) }));
  const asetOpts = ASET_OPTIONS.map((o) => ({ value: o.value, label: cap(o.desc) }));

  const latar: Record<string, { q: string; p: string }> = {
    PELAJAR: { q: "Kamu sekolah di jenjang apa dan jurusan/kelas apa?", p: "Contoh: SMA IPA, atau SMK Multimedia" },
    MAHASISWA: { q: "Kamu kuliah jurusan apa dan sudah semester berapa?", p: "Contoh: Akuntansi, semester 5" },
    PEKERJA: { q: "Bidang atau posisi pekerjaanmu saat ini apa?", p: "Contoh: Staff admin keuangan" },
    BELUM_BEKERJA: { q: "Pendidikan terakhirmu apa, dan ada pengalaman kerja sebelumnya?", p: "Contoh: D3 Akuntansi, pernah magang 6 bulan" },
  };
  const kons: Record<string, { q: string; p: string }> = {
    PELAJAR: { q: "Kira-kira berapa jam luang kamu di luar sekolah tiap minggu?", p: "Contoh: 5-8 jam, biasanya sore dan weekend" },
    MAHASISWA: { q: "Berapa jam kosong kamu per minggu di luar jadwal kuliah dan organisasi?", p: "Contoh: 10-15 jam" },
    PEKERJA: { q: "Di luar jam kerja, berapa waktu luangmu per minggu? Kontrak kerjamu ada larangan kerja sampingan?", p: "Contoh: 8 jam, tidak ada larangan" },
    BELUM_BEKERJA: { q: "Sudah berapa lama belum berpenghasilan, dan kira-kira tabunganmu bertahan berapa lama?", p: "Contoh: 2 bulan, tabungan cukup untuk 1 bulan lagi" },
  };
  const l = latar[status] || latar.MAHASISWA;
  const k = kons[status] || kons.MAHASISWA;

  return [
    { field_key: "tujuan", type: "single", question_text: "Apa tujuan utama kamu mencari penghasilan sekarang?", options: tujuanOpts },
    { field_key: "pola_kerja", type: "single", question_text: "Kamu lebih cocok dengan usaha yang jadwalnya rutin & tetap, atau yang fleksibel sesuai waktu luang?", options: [{ value: "RUTIN_TERJADWAL", label: "Rutin & terjadwal" }, { value: "FLEKSIBEL", label: "Fleksibel, sesuai waktu luang" }] },
    { field_key: "jejaring_sosial", type: "single", question_text: "Seberapa luas jejaring atau koneksimu saat ini? (Teman nongkrong, organisasi, warga sekitar)", options: [{ value: "LUAS", label: "Luas (Banyak ikut organisasi/komunitas)" }, { value: "SEDANG", label: "Sedang (Ada teman dekat, tapi tidak banyak)" }, { value: "TERBATAS", label: "Terbatas (Lebih suka menyendiri)" }] },
    { field_key: "preferensi_kerja", type: "single", question_text: "Dalam mengeksekusi ide, kamu lebih nyaman yang mana?", options: [{ value: "INTERAKSI_LANGSUNG", label: "Berani tatap muka / ngobrol langsung" }, { value: "BALIK_LAYAR", label: "Lebih suka di balik layar (chat / anonim)" }] },
    { field_key: "latar_belakang", type: "text", question_text: l.q, placeholder: l.p },
    { field_key: "keahlian", type: "multi", question_text: "Keahlian apa saja yang kamu punya?", options: keahlianOpts },
    { field_key: "aset", type: "multi", question_text: "Aset atau alat apa yang kamu punya yang bisa dipakai untuk usaha?", options: asetOpts },
    { field_key: "konstrain_waktu", type: "text", question_text: k.q, placeholder: k.p },
  ];
}

function buildQuestionsPrompt(status: string) {
  const tujuanList = (TUJUAN_OPTIONS[status] || TUJUAN_OPTIONS.MAHASISWA).map((o) => `${o.value} (${o.desc})`).join(", ");
  const keahlianList = KEAHLIAN_OPTIONS.map((o) => `${o.value} (${o.desc})`).join(", ");
  const asetList = ASET_OPTIONS.map((o) => `${o.value} (${o.desc})`).join(", ");

  const latarHint: Record<string, string> = {
    PELAJAR: "jenjang dan jurusan sekolah (misal: SMA IPA, SMA IPS, atau SMK dan jurusan vokasinya)",
    MAHASISWA: "jurusan kuliah dan semester berapa sekarang",
    PEKERJA: "bidang atau posisi pekerjaan saat ini",
    BELUM_BEKERJA: "pendidikan terakhir, bidang studi, dan pengalaman kerja sebelumnya kalau ada",
  };
  const konsHint: Record<string, string> = {
    PELAJAR: "jam luang di luar sekolah (sore hari atau akhir pekan)",
    MAHASISWA: "jam kosong per minggu di luar jadwal kuliah dan organisasi",
    PEKERJA: "hari libur/jam luang di luar jam kerja, dan apakah kontrak kerjanya melarang kerja sampingan",
    BELUM_BEKERJA: "ketersediaan waktu, sudah berapa lama tidak berpenghasilan, dan perkiraan tabungan bertahan berapa lama",
  };

  return `Kamu menulis teks pertanyaan untuk fitur onboarding aplikasi keuangan pribadi bernama BILANO.
Pengguna sudah menjawab status: ${status} (${STATUS_LABELS[status] || status}).

Tulis 8 pertanyaan berurutan dalam Bahasa Indonesia yang profesional, to-the-point, kontekstual, dan berwibawa ala Analis Bisnis.
Gunakan sapaan "kamu", ringkas (maksimal 2 kalimat per pertanyaan), jangan kaku seperti formulir resmi.

ATURAN PENTING: untuk field bertipe "single" dan "multi", kamu HANYA BOLEH menulis LABEL natural untuk
value yang sudah ditentukan di bawah — JANGAN mengubah, menambah, atau menghapus value manapun.

1. field_key "tujuan", type "single": tanyakan tujuan utama mencari penghasilan.
   Value yang tersedia (jangan diubah): ${tujuanList}
2. field_key "pola_kerja", type "single": tanyakan RUTIN_TERJADWAL (tetap/terjadwal) atau FLEKSIBEL.
3. field_key "jejaring_sosial", type "single": tanyakan luasnya koneksi sosial mereka. 
   Value: LUAS, SEDANG, TERBATAS.
4. field_key "preferensi_kerja", type "single": tanyakan tingkat kenyamanan eksekusi.
   Value: INTERAKSI_LANGSUNG (ekstrovert/berani), BALIK_LAYAR (introvert/anonim).
5. field_key "latar_belakang", type "text": tanyakan tentang ${latarHint[status] || latarHint.MAHASISWA}.
   Tulis question_text dan placeholder singkat untuk kolom isian.
6. field_key "keahlian", type "multi": tanyakan keahlian yang dimiliki.
   Value yang tersedia (jangan diubah): ${keahlianList}
7. field_key "aset", type "multi": tanyakan aset/alat yang dimiliki yang bisa dipakai untuk usaha.
   Value yang tersedia (jangan diubah): ${asetList}
8. field_key "konstrain_waktu", type "text": tanyakan tentang ${konsHint[status] || konsHint.MAHASISWA}.
   Tulis question_text dan placeholder singkat.

Output HANYA JSON array (tanpa markdown, tanpa teks lain) persis format ini:
[
 {"field_key":"tujuan","type":"single","question_text":"...","options":[{"value":"...","label":"..."}]},
 {"field_key":"pola_kerja","type":"single","question_text":"...","options":[{"value":"RUTIN_TERJADWAL","label":"..."},{"value":"FLEKSIBEL","label":"..."}]},
 {"field_key":"jejaring_sosial","type":"single","question_text":"...","options":[{"value":"LUAS","label":"..."},{"value":"SEDANG","label":"..."},{"value":"TERBATAS","label":"..."}]},
 {"field_key":"preferensi_kerja","type":"single","question_text":"...","options":[{"value":"INTERAKSI_LANGSUNG","label":"..."},{"value":"BALIK_LAYAR","label":"..."}]},
 {"field_key":"latar_belakang","type":"text","question_text":"...","placeholder":"..."},
 {"field_key":"keahlian","type":"multi","question_text":"...","options":[...]},
 {"field_key":"aset","type":"multi","question_text":"...","options":[...]},
 {"field_key":"konstrain_waktu","type":"text","question_text":"...","placeholder":"..."}
]`;
}

function buildRecommendationsPrompt(profile: any, snapshot: any) {
  return `Kamu adalah PENGARAH BISNIS GERILYA spesialis pasar lokal Indonesia. 
Tugasmu membongkar potensi pengguna berdasarkan profil psikologis, modal sosial, dan teknisnya.

DATA PENGGUNA:
- Jejaring Sosial: ${profile.jejaringSosial || 'Tidak diketahui'} | Preferensi Kerja: ${profile.preferensiKerja || 'Tidak diketahui'}
- Status: ${profile.status} | Tujuan: ${profile.tujuan} | Pola: ${profile.polaKerja}
- Latar Belakang: ${profile.latarBelakang || "-"}
- Keahlian: ${(profile.keahlian || []).join(", ")} ${profile.keahlianLainnya ? ", " + profile.keahlianLainnya : ""}
- Aset: ${(profile.aset || []).join(", ") || "Tidak ada aset spesifik"}
- Konstrain Waktu: ${JSON.stringify(profile.konstrainWaktu || {})}
- Saldo Kas Saat Ini: Rp${snapshot.saldo_saat_ini} (Pertimbangkan ini. Jangan berikan saran bermodal besar jika saldo menipis).

ATURAN WAJIB (HYPER-LOKAL INDONESIA & ANTI-GENERIK):
1. JANGAN PERNAH MENYARANKAN: "Jualan online di marketplace umum", "Jadi dropshipper generik", "Buat website", atau hal klise yang sudah basi.
2. SARANKAN TAKTIK GERILYA LOKAL: Manfaatkan grup WA RT/RW, komunitas ibu-ibu PKK, titip warung, jastip teman sekampus, koperasi, atau tawarkan skill B2B ke pedagang/UMKM sekitar.
3. Sesuaikan dengan 'Jejaring Sosial' & 'Preferensi Kerja'. Jika TERBATAS dan BALIK_LAYAR, arahkan ke digital anonim/jasa B2B di balik layar. Jika LUAS dan INTERAKSI_LANGSUNG, arahkan ke dominasi sirkel terdekat.
4. Buat 2-4 ide bisnis tajam, langsung bisa dieksekusi HARI INI tanpa perlu izin rumit atau waktu setup lama.

Output HANYA JSON (tanpa markdown) persis format ini:
{"recommendations":[{"id":"rec_1","title":"Judul Singkat & Provokatif (Maks 6 kata)","pitch":"1-2 kalimat konkret cara kerjanya di lapangan.","why_it_fits":"Analisa tajam kenapa ini sangat cocok dengan jejaring & skillnya.","capital_level":"TANPA_MODAL atau MODAL_KECIL atau MODAL_SEDANG","needs_upskilling":true,"upskilling_note":"Instruksi belajar cepat (jika ada)","difficulty":"MUDAH atau SEDANG atau MENANTANG","estimated_time_to_first_income":"Contoh: 1-3 hari","risk_note":"Risiko real di pasar lokal"}]}`;
}

function buildMaterialsDraftPrompt(recommendation: any) {
  return `Ide usaha yang dipilih pengguna:
Judul: ${recommendation.title}
Penjelasan: ${recommendation.pitch}

Berikan draft RAB (Rencana Anggaran Biaya) untuk memulai ide ini dalam skala GERILYA/percobaan sangat minim (bukan produksi massal). Maksimal 8 item. Kalau ada alternatif gratis/lebih murah, sebutkan di catatan.

Output HANYA JSON: {"draft_items":[{"name":"nama bahan/alat","note":"catatan trik murah/gratis atau null"}]}`;
}

function buildCapitalStrategyPrompt(totalCost: number, sisaDanaAman: number, selisih: number, context: string) {
  return `Total modal dibutuhkan: Rp${totalCost}
Dana aman yang tersedia: Rp${Math.max(0, sisaDanaAman)}
Kekurangan: Rp${selisih}
Konteks tambahan dari pengguna: ${context || "tidak ada"}

Berikan 2-3 strategi gerilya untuk menutupi kekurangan modal tanpa meminjam ke pinjol/rentenir! (Misal: sistem pre-order, down payment klien, pinjam alat kerabat, jual barang tak terpakai, kurangi skala awal).

Output HANYA JSON: {"options":[{"title":"...","description":"...","estimated_time_or_effort":"..."}]}`;
}

function buildSellingSystemPrompt(recommendation: any, profile: any, totalCost: number) {
  return `Kamu adalah Mentor Sales Agresif BILANO. 
Ide Bisnis: ${recommendation?.title || "-"} (${recommendation?.pitch || "-"})
Modal Siap: Rp${totalCost}
Profil: ${profile?.status || "-"}, Jejaring: ${profile?.jejaringSosial || "-"}, Kerja: ${profile?.preferensiKerja || "-"}

Tugasmu membimbing pengguna untuk SEGERA closing/pecah telur.
ATURAN MUTLAK:
Setiap balasanmu WAJIB mengandung 1 TAKTIK EKSEKUSI AGRESIF YANG BISA DILAKUKAN HARI INI. 
Contoh: "Jam 4 sore ini, copy paste template chat ini ke 5 teman terdekatmu: [Isi Chat]" atau "Buat 3 status WA berurutan dengan alur rasa penasaran, lalu tawarkan khusus untuk 3 pembeli pertama."
JANGAN beri teori panjang lebar. JANGAN bertele-tele. Langsung berikan instruksi lapangan.
Balas dengan teks biasa, ringkas, tegas, profesional, dan sedikit mendesak.`;
}

function buildEvaluationPrompt(recommendation: any, revenueLog: any[]) {
  const totalIncome = revenueLog.filter(l => l.type === 'income').reduce((a, b) => a + Number(b.amount), 0);
  const totalExpense = revenueLog.filter(l => l.type === 'expense').reduce((a, b) => a + Number(b.amount), 0);
  const netProfit = totalIncome - totalExpense;

  return `Evaluasi Bisnis: "${recommendation?.title || "-"}"
Total Omset Masuk: Rp${totalIncome}
Total Pengeluaran (HPP/Operasional Berjalan): Rp${totalExpense}
LABA BERSIH SAAT INI: Rp${netProfit}

Riwayat Pencatatan Kas Usaha: ${JSON.stringify(revenueLog)}

Tugasmu: Berikan evaluasi bisnis super tajam (maks 4 kalimat). Tinjau margin keuntungannya (apakah sehat/bocor?). 
WAJIB berikan 1 rekomendasi Pivot/Scaling ekstrem untuk minggu depan berdasarkan angka Laba Bersih di atas. (Contoh: "Hentikan promosi bakar uang di bahan X", atau "Naikkan harga 15%").
Balas teks biasa, langsung ke poinnya.`;
}

// ============================================================
// FINANCIAL SNAPSHOT (auto-pull dari data Bilano yang sudah ada)
// ============================================================
async function getFinancialSnapshot(userId: number, cashBalance: number) {
  try {
    const txResult = await db.execute(sql`
      SELECT type, amount FROM transactions
      WHERE user_id = ${userId} AND date >= NOW() - INTERVAL '90 days'
    `);
    const txRows = Array.isArray(txResult) ? txResult : (txResult as any).rows || [];
    const totalIncome = txRows.filter((r: any) => r.type === "income").reduce((a: number, r: any) => a + Number(r.amount), 0);
    const totalExpense = txRows.filter((r: any) => r.type === "expense").reduce((a: number, r: any) => a + Number(r.amount), 0);

    let totalUtang = 0;
    try {
      const debtResult = await db.execute(sql`SELECT amount FROM debts WHERE user_id = ${userId} AND is_paid = false AND type = 'utang'`);
      const debtRows = Array.isArray(debtResult) ? debtResult : (debtResult as any).rows || [];
      totalUtang = debtRows.reduce((a: number, r: any) => a + Number(r.amount), 0);
    } catch (e) {}

    return {
      saldo_saat_ini: Math.round(cashBalance || 0),
      rata2_pemasukan_bulanan: Math.round(totalIncome / 3),
      rata2_pengeluaran_bulanan: Math.round(totalExpense / 3),
      ada_utang: totalUtang > 0,
      total_utang: Math.round(totalUtang),
      data_cukup_representatif: txRows.length >= 10,
    };
  } catch (e) {
    return { saldo_saat_ini: Math.round(cashBalance || 0), rata2_pemasukan_bulanan: 0, rata2_pengeluaran_bulanan: 0, ada_utang: false, total_utang: 0, data_cukup_representatif: false };
  }
}

// ============================================================
// ROUTES
// ============================================================
export function registerIncomeStrategyRoutes(app: Express) {
  app.get("/api/income-strategy/profile", async (req: any, res: any) => {
    try {
      await ensureIncomeStrategyTables();
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
      const result = await db.execute(sql`SELECT * FROM income_profiles WHERE user_id = ${user.id} ORDER BY updated_at DESC LIMIT 1`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      if (rows.length === 0) return res.json(null);
      const p = rows[0];
      res.json({
        id: p.id, status: p.status, tujuan: p.tujuan, polaKerja: p.pola_kerja,
        jejaringSosial: p.jejaring_sosial, preferensiKerja: p.preferensi_kerja,
        latarBelakang: p.latar_belakang, keahlian: safeParse(p.keahlian, []),
        keahlianLainnya: p.keahlian_lainnya, aset: safeParse(p.aset, []),
        konstrainWaktu: safeParse(p.konstrain_waktu, {}),
        recommendations: safeParse(p.recommendations, []),
        cooldownUntil: p.cooldown_until,
        updatedAt: p.updated_at,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/questions", async (req: any, res: any) => {
    try {
      await ensureIncomeStrategyTables();
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
      const { status } = req.body;
      if (!STATUS_LABELS[status]) return res.status(400).json({ error: "Status tidak valid." });

      try {
        const questions = await askGeminiJSON(buildQuestionsPrompt(status), "Generate sekarang.");
        if (!Array.isArray(questions) || questions.length < 8) throw new Error("format tidak lengkap");
        return res.json({ questions, source: "ai" });
      } catch (aiError) {
        return res.json({ questions: fallbackQuestions(status), source: "fallback" });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/profile", async (req: any, res: any) => {
    try {
      await ensureIncomeStrategyTables();
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
      const { status, tujuan, polaKerja, jejaringSosial, preferensiKerja, latarBelakang, keahlian, keahlianLainnya, aset, konstrainWaktu } = req.body;

      const existing = await db.execute(sql`SELECT id FROM income_profiles WHERE user_id = ${user.id} ORDER BY updated_at DESC LIMIT 1`);
      const existingRows = Array.isArray(existing) ? existing : (existing as any).rows || [];

      if (existingRows.length > 0) {
        await db.execute(sql`
          UPDATE income_profiles SET status = ${status}, tujuan = ${tujuan}, pola_kerja = ${polaKerja},
            jejaring_sosial = ${jejaringSosial || null}, preferensi_kerja = ${preferensiKerja || null},
            latar_belakang = ${latarBelakang}, keahlian = ${JSON.stringify(keahlian || [])},
            keahlian_lainnya = ${keahlianLainnya || null}, aset = ${JSON.stringify(aset || [])},
            konstrain_waktu = ${JSON.stringify(konstrainWaktu || {})}, updated_at = NOW(), cooldown_until = NULL
          WHERE id = ${existingRows[0].id}
        `);
        return res.json({ success: true, id: existingRows[0].id });
      }
      const inserted = await db.execute(sql`
        INSERT INTO income_profiles (user_id, status, tujuan, pola_kerja, jejaring_sosial, preferensi_kerja, latar_belakang, keahlian, keahlian_lainnya, aset, konstrain_waktu)
        VALUES (${user.id}, ${status}, ${tujuan}, ${polaKerja}, ${jejaringSosial || null}, ${preferensiKerja || null}, ${latarBelakang}, ${JSON.stringify(keahlian || [])}, ${keahlianLainnya || null}, ${JSON.stringify(aset || [])}, ${JSON.stringify(konstrainWaktu || {})})
        RETURNING id
      `);
      const insertedRows = Array.isArray(inserted) ? inserted : (inserted as any).rows || [];
      res.json({ success: true, id: insertedRows[0]?.id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/recommendations", async (req: any, res: any) => {
    try {
      await ensureIncomeStrategyTables();
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

      const existing = await db.execute(sql`SELECT * FROM income_profiles WHERE user_id = ${user.id} ORDER BY updated_at DESC LIMIT 1`);
      const rows = Array.isArray(existing) ? existing : (existing as any).rows || [];
      if (rows.length === 0) return res.status(400).json({ error: "Profil identifikasi belum lengkap." });
      const p = rows[0];
      const profile = {
        status: p.status, tujuan: p.tujuan, polaKerja: p.pola_kerja, 
        jejaringSosial: p.jejaring_sosial, preferensiKerja: p.preferensi_kerja,
        latarBelakang: p.latar_belakang, keahlian: safeParse(p.keahlian, []), 
        keahlianLainnya: p.keahlian_lainnya, aset: safeParse(p.aset, []), 
        konstrainWaktu: safeParse(p.konstrain_waktu, {}),
      };
      const snapshot = await getFinancialSnapshot(user.id, user.cashBalance);

      let recommendations: any[];
      try {
        const parsed = await askGeminiJSON(buildRecommendationsPrompt(profile, snapshot), "Generate sekarang.");
        recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
        const genericPhrases = ["jualan online", "bisnis online", "jadi content creator", "freelance"];
        recommendations = recommendations.filter((r: any) => {
          const t = (r.title || "").toLowerCase().trim();
          return !genericPhrases.includes(t) && !!r.why_it_fits;
        });
        if (recommendations.length < 2) throw new Error("Hasil AI kurang dari 2 rekomendasi valid.");
      } catch (aiError: any) {
        return res.status(502).json({ error: "AI belum berhasil menyusun rekomendasi, coba lagi sebentar lagi.", detail: aiError.message });
      }

      await db.execute(sql`UPDATE income_profiles SET recommendations = ${JSON.stringify(recommendations)}, updated_at = NOW() WHERE id = ${p.id}`);
      res.json({ recommendations, financial_snapshot: snapshot });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/income-strategy/attempts", async (req: any, res: any) => {
    try {
      await ensureIncomeStrategyTables();
      const user = await getUser(req);
      const result = await db.execute(sql`SELECT * FROM income_attempts WHERE user_id = ${user!.id} ORDER BY updated_at DESC`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      res.json(rows.map(formatAttempt));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/income-strategy/attempts/:id", async (req: any, res: any) => {
    try {
      await ensureIncomeStrategyTables();
      const user = await getUser(req);
      const result = await db.execute(sql`SELECT * FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      res.json(formatAttempt(rows[0]));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/attempts", async (req: any, res: any) => {
    try {
      await ensureIncomeStrategyTables();
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
      const { recommendation } = req.body;
      if (!recommendation || !recommendation.title) return res.status(400).json({ error: "Ide usaha tidak valid." });

      const profileResult = await db.execute(sql`SELECT id FROM income_profiles WHERE user_id = ${user.id} ORDER BY updated_at DESC LIMIT 1`);
      const profileRows = Array.isArray(profileResult) ? profileResult : (profileResult as any).rows || [];
      const profileId = profileRows[0]?.id || null;

      let draftItems: any[] = [];
      try {
        const parsed = await askGeminiJSON(buildMaterialsDraftPrompt(recommendation), "Generate sekarang.");
        draftItems = Array.isArray(parsed.draft_items) ? parsed.draft_items : [];
      } catch (e) { draftItems = []; }

      const materials = draftItems.slice(0, 8).map((item: any, idx: number) => ({
        id: String(idx + 1).padStart(4, "0"), name: item.name || "Item", price: 0, note: item.note || null,
      }));

      const inserted = await db.execute(sql`
        INSERT INTO income_attempts (user_id, profile_id, recommendation, state, status, materials)
        VALUES (${user.id}, ${profileId}, ${JSON.stringify(recommendation)}, 'MATERIALS', 'ACTIVE', ${JSON.stringify(materials)})
        RETURNING *
      `);
      const insertedRows = Array.isArray(inserted) ? inserted : (inserted as any).rows || [];
      res.json(formatAttempt(insertedRows[0]));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/income-strategy/attempts/:id/materials", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const { materials } = req.body;
      if (!Array.isArray(materials)) return res.status(400).json({ error: "Format bahan tidak valid." });
      const totalCost = materials.reduce((a: number, m: any) => a + (Number(m.price) || 0), 0);
      await db.execute(sql`
        UPDATE income_attempts SET materials = ${JSON.stringify(materials)}, total_cost = ${totalCost}, updated_at = NOW()
        WHERE id = ${req.params.id} AND user_id = ${user!.id}
      `);
      res.json({ success: true, totalCost });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/attempts/:id/feasibility", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const { manualMonthlyExpense, hasDependents } = req.body || {};

      const result = await db.execute(sql`SELECT * FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      const attempt = rows[0];

      const snapshot = await getFinancialSnapshot(user!.id, user!.cashBalance);
      const hasManualInput = manualMonthlyExpense !== undefined && manualMonthlyExpense !== null && manualMonthlyExpense !== "";

      if (!snapshot.data_cukup_representatif && !hasManualInput) {
        return res.json({
          needs_clarification: true,
          clarification_questions: [
            { field_key: "manualMonthlyExpense", type: "text", question_text: "Data pengeluaran bulananmu di BILANO masih sedikit. Kira-kira berapa pengeluaran rutin kamu per bulan?", placeholder: "Contoh: 1500000" },
            { field_key: "hasDependents", type: "single", question_text: "Apakah ada tanggungan keluarga yang bergantung pada penghasilanmu, atau kamu masih tinggal dengan orang tua?", options: [{ value: "YA_TANGGUNGAN", label: "Ya, ada tanggungan" }, { value: "TINGGAL_ORTU", label: "Masih tinggal dengan orang tua" }, { value: "MANDIRI", label: "Sudah mandiri, tanpa tanggungan" }] },
          ],
        });
      }

      const effectiveExpense = hasManualInput ? Number(manualMonthlyExpense) : snapshot.rata2_pengeluaran_bulanan;
      const bufferBulan = 1;
      const sisaDanaAman = snapshot.saldo_saat_ini - effectiveExpense * bufferBulan;
      const totalCost = Number(attempt.total_cost) || 0;

      let verdict: string;
      if (totalCost <= sisaDanaAman) verdict = "CUKUP_AMAN";
      else if (totalCost <= snapshot.saldo_saat_ini) verdict = "CUKUP_TAPI_RISIKO";
      else verdict = "KURANG";

      const nextState = verdict === "KURANG" ? "CAPITAL" : "SELLING";
      await db.execute(sql`UPDATE income_attempts SET feasibility_verdict = ${verdict}, state = ${nextState}, updated_at = NOW() WHERE id = ${req.params.id}`);

      res.json({
        needs_clarification: false, verdict, state: nextState, total_cost: totalCost,
        saldo_saat_ini: snapshot.saldo_saat_ini, sisa_dana_aman: Math.max(0, sisaDanaAman),
        selisih: Math.max(0, totalCost - Math.max(0, sisaDanaAman)),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/attempts/:id/capital-strategy", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const { context } = req.body || {};
      const result = await db.execute(sql`SELECT * FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      const attempt = rows[0];
      const snapshot = await getFinancialSnapshot(user!.id, user!.cashBalance);
      const totalCost = Number(attempt.total_cost) || 0;
      const sisaDanaAman = snapshot.saldo_saat_ini - snapshot.rata2_pengeluaran_bulanan;
      const selisih = Math.max(0, totalCost - Math.max(0, sisaDanaAman));

      let options: any[];
      try {
        const parsed = await askGeminiJSON(buildCapitalStrategyPrompt(totalCost, sisaDanaAman, selisih, context), "Generate sekarang.");
        options = Array.isArray(parsed.options) ? parsed.options : [];
        if (options.length === 0) throw new Error("kosong");
      } catch (e) {
        options = [
          { title: "Menabung bertahap", description: "Sisihkan sebagian dari pemasukan bulananmu sampai kekurangan modal terkumpul.", estimated_time_or_effort: "Sesuaikan dengan sisa pemasukan bulananmu" },
          { title: "Mulai skala lebih kecil", description: "Kurangi jumlah bahan/alat di percobaan pertama supaya modal awal lebih ringan.", estimated_time_or_effort: "Bisa langsung dicoba" },
        ];
      }

      const capitalPlan = { options, disclaimer: "Ini adalah opsi untuk dipertimbangkan, bukan instruksi yang harus diikuti. Keputusan akhir sepenuhnya di tangan kamu.", generatedAt: new Date().toISOString() };
      await db.execute(sql`UPDATE income_attempts SET capital_plan = ${JSON.stringify(capitalPlan)}, updated_at = NOW() WHERE id = ${req.params.id}`);
      res.json(capitalPlan);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/income-strategy/attempts/:id/state", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const { state } = req.body;
      const validStates = ["MATERIALS", "CAPITAL", "SELLING", "TRACKING"];
      if (!validStates.includes(state)) return res.status(400).json({ error: "State tidak valid." });
      await db.execute(sql`UPDATE income_attempts SET state = ${state}, updated_at = NOW() WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      res.json({ success: true, state });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/attempts/:id/selling-chat", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const { message } = req.body;
      const result = await db.execute(sql`SELECT * FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      const attempt = rows[0];
      const recommendation = safeParse(attempt.recommendation, {});
      const sellingNotes = safeParse(attempt.selling_notes, []);

      const profileResult = await db.execute(sql`SELECT * FROM income_profiles WHERE id = ${attempt.profile_id}`);
      const profileRows = Array.isArray(profileResult) ? profileResult : (profileResult as any).rows || [];
      const profile = profileRows[0] ? { status: profileRows[0].status, polaKerja: profileRows[0].pola_kerja, jejaringSosial: profileRows[0].jejaring_sosial, preferensiKerja: profileRows[0].preferensi_kerja } : {};

      const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
      let replyText = "Ayo mulai eksekusi taktik gerilya hari ini. Siap?";
      if (apiKey) {
        try {
          const systemPrompt = buildSellingSystemPrompt(recommendation, profile, Number(attempt.total_cost) || 0);
          const history = sellingNotes.filter((n: any) => n.sender !== "evaluation").map((n: any) => ({ role: n.sender === "user" ? "user" : "model", parts: [{ text: n.text }] }));
          if (message) history.push({ role: "user", parts: [{ text: message }] });
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: history.length ? history : [{ role: "user", parts: [{ text: "Mulai instruksi taktis lapangan hari ini." }] }] }),
          });
          if (resp.ok) {
            const data = await resp.json();
            replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || replyText;
          }
        } catch (e) {}
      }

      const updatedNotes = [...sellingNotes];
      if (message) updatedNotes.push({ sender: "user", text: message, at: new Date().toISOString() });
      updatedNotes.push({ sender: "ai", text: replyText, at: new Date().toISOString() });

      await db.execute(sql`UPDATE income_attempts SET selling_notes = ${JSON.stringify(updatedNotes)}, updated_at = NOW() WHERE id = ${req.params.id}`);
      res.json({ reply: replyText, sellingNotes: updatedNotes });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/attempts/:id/revenue", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const { amount, note, type = 'income' } = req.body;
      const amt = Math.round(Number(amount) || 0);
      if (amt <= 0) return res.status(400).json({ error: "Jumlah tidak valid." });

      const result = await db.execute(sql`SELECT * FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      const attempt = rows[0];
      const recommendation = safeParse(attempt.recommendation, {});
      const revenueLog = safeParse(attempt.revenue_log, []);

      const entry = { date: new Date().toISOString(), amount: amt, type: type, note: note || null };
      const updatedLog = [...revenueLog, entry];

      await db.execute(sql`UPDATE income_attempts SET revenue_log = ${JSON.stringify(updatedLog)}, state = 'TRACKING', updated_at = NOW() WHERE id = ${req.params.id}`);

      const txType = type === 'income' ? 'income' : 'expense';
      const txCat = type === 'income' ? 'Pemasukan Usaha' : 'Beban/HPP Usaha';
      
      await storage.createTransaction(user!.id, {
        userId: user!.id, type: txType, amount: amt,
        category: txCat, description: `${recommendation.title || "Usaha sampingan"}${note ? " - " + note : ""}`,
        date: new Date(),
      } as any);
      
      const newBalance = Math.round((user!.cashBalance || 0) + (type === 'income' ? amt : -amt));
      await storage.updateUserBalance(user!.id, newBalance);

      res.json({ success: true, revenueLog: updatedLog, newBalance });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/attempts/:id/evaluate", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const result = await db.execute(sql`SELECT * FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      const attempt = rows[0];
      const recommendation = safeParse(attempt.recommendation, {});
      const revenueLog = safeParse(attempt.revenue_log, []);
      if (revenueLog.length === 0) return res.status(400).json({ error: "Belum ada catatan omset untuk dievaluasi." });

      const evaluation = (await askGeminiText(buildEvaluationPrompt(recommendation, revenueLog))) || "Terus catat keuangan Anda dengan cermat. Perhatikan selalu margin Laba Bersih sebelum menaikkan skala promosi.";

      const sellingNotes = safeParse(attempt.selling_notes, []);
      sellingNotes.push({ sender: "evaluation", text: evaluation, at: new Date().toISOString() });
      await db.execute(sql`UPDATE income_attempts SET selling_notes = ${JSON.stringify(sellingNotes)}, updated_at = NOW() WHERE id = ${req.params.id}`);

      res.json({ evaluation });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/income-strategy/attempts/:id", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      await db.execute(sql`DELETE FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // FITUR BARU: BERHENTI USAHA & COOLDOWN 1 BULAN
  app.post("/api/income-strategy/attempts/:id/stop", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const attRes = await db.execute(sql`SELECT profile_id FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(attRes) ? attRes : (attRes as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      const profileId = rows[0].profile_id;
      
      // Update attempt menjadi STOPPED
      await db.execute(sql`UPDATE income_attempts SET status = 'STOPPED', updated_at = NOW() WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      
      // Set Cooldown 30 Hari di Profile
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() + 30);
      await db.execute(sql`UPDATE income_profiles SET cooldown_until = ${cooldownDate.toISOString()} WHERE id = ${profileId}`);

      res.json({ success: true, cooldownUntil: cooldownDate });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}