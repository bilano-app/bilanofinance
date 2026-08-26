// @ts-nocheck
import type { Express } from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { sql } from "drizzle-orm";

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
  const parsedMaterials = safeParse(row.materials, []);
  let materialsList = [];
  let materialsStatement = "";
  let noMaterialsNeeded = false;

  if (Array.isArray(parsedMaterials)) {
    materialsList = parsedMaterials;
  } else if (parsedMaterials && typeof parsedMaterials === "object") {
    materialsList = parsedMaterials.items || [];
    materialsStatement = parsedMaterials.statement || "";
    noMaterialsNeeded = !!parsedMaterials.no_materials_needed;
  }

  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    recommendation: safeParse(row.recommendation, {}),
    state: row.state,
    status: row.status,
    materials: materialsList,
    materialsStatement: materialsStatement || (row.materials_statement || ""),
    noMaterialsNeeded: noMaterialsNeeded || (materialsList.length === 0 && row.state === "MATERIALS" && safeParse(row.recommendation, {}).capital_level === "TANPA_MODAL"),
    totalCost: Number(row.total_cost) || 0,
    feasibilityVerdict: row.feasibility_verdict,
    feasibilityAnalysis: safeParse(row.feasibility_analysis, null),
    capitalPlan: safeParse(row.capital_plan, null),
    sellingNotes: safeParse(row.selling_notes, []),
    revenueLog: safeParse(row.revenue_log, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
    
    try { await db.execute(sql`ALTER TABLE income_profiles ADD COLUMN IF NOT EXISTS jejaring_sosial TEXT;`); } catch (e) {}
    try { await db.execute(sql`ALTER TABLE income_profiles ADD COLUMN IF NOT EXISTS preferensi_kerja TEXT;`); } catch (e) {}
    try { await db.execute(sql`ALTER TABLE income_profiles ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMP;`); } catch (e) {}
    try { await db.execute(sql`ALTER TABLE income_attempts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';`); } catch (e) {}
    try { await db.execute(sql`ALTER TABLE income_attempts ADD COLUMN IF NOT EXISTS materials_statement TEXT;`); } catch (e) {}
    try { await db.execute(sql`ALTER TABLE income_attempts ADD COLUMN IF NOT EXISTS feasibility_analysis TEXT;`); } catch (e) {}
  } catch (e) {}
};

// =========================================================================
// 🧠 MESIN KOGNITIF DEEPSEEK R1 (VIA ENDPOINT OPENROUTER)
// =========================================================================
async function askDeepSeekR1(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
  if (!apiKey) throw new Error("Kunci API OpenRouter belum terpasang.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://bilano.app",
      "X-Title": "BILANO App"
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1:free", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
      // Dihapus: response_format karena model gratis sering error jika dipaksa
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter Error: ${errText}`);
  }
  
  const data = await response.json();
  let resultText = data.choices?.[0]?.message?.content;
  if (!resultText) throw new Error("DeepSeek mengembalikan balasan kosong.");

  // 🔥 SOLUSI FATAL ERROR: Hapus tag <think> bawaan DeepSeek R1 sebelum mem-parsing JSON
  resultText = resultText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  let cleanText = String(resultText).replace(/```json/gi, "").replace(/```/g, "").trim();
  const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) cleanText = jsonMatch[0];

  return JSON.parse(cleanText);
}

// =========================================================================
// 🚀 BACKUP AUTO-FALLBACK: MESIN GEMINI
// =========================================================================
async function askGeminiJSON(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
  if (!apiKey) throw new Error("Kunci API Gemini belum terpasang.");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.6, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error("Koneksi ke Gemini sibuk.");
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
    PELAJAR: { q: "Kira-kira berapa jam luang kamu di luar sekolah tiap minggu?", p: "Contoh: 5-8 jam, biasanya sore and weekend" },
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
  return `Kamu menulis teks pertanyaan untuk fitur onboarding aplikasi keuangan pribadi bernama BILANO.
Pengguna sudah menjawab status: ${status} (${STATUS_LABELS[status] || status}).

Tulis 8 pertanyaan berurutan dalam Bahasa Indonesia yang profesional, to-the-point, dan berwibawa.

Output HANYA JSON array persis format ini:
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
  return `Kamu adalah "BILANO Executive Strategy Mentor", arsitek monetisasi dan penasihat strategi bisnis kelas dunia yang sangat profesional, ramah, dan berwibawa.

DATA PROFIL PENGGUNA:
- Latar Belakang: ${profile.status} | ${profile.latarBelakang || "-"}
- Keahlian Inti: ${(profile.keahlian || []).join(", ")} ${profile.keahlianLainnya ? ", " + profile.keahlianLainnya : ""}
- Aset Pendukung: ${(profile.aset || []).join(", ") || "-"}
- Kondisi Saldo Kas: Rp${snapshot.saldo_saat_ini}
- Ketersediaan Waktu: ${profile.konstrainWaktu?.text || "-"} | ${profile.polaKerja}
- Karakter Eksekusi: Jejaring ${profile.jejaringSosial || '-'} | Preferensi ${profile.preferensiKerja || '-'}

PRINSIP STRATEGIS:
1. FOKUS NILAI TINGGI (HIGH VALUE): Prioritaskan penawaran solusi bernilai tambah tinggi ke pemilik bisnis, profesional, kreator, atau industri potensial. Hindari model pasaran murahan (seperti dropship generik, reseller acak, joki tugas, atau jualan makanan instan).
2. SINERGI SILANG KEAHLIAN: Gabungkan latar belakang keilmuan dan keterampilan unik pengguna menjadi proposisi nilai yang berdaya saing tinggi.
3. VALIDASI CEPAT & TERUKUR: Strategi harus dapat divalidasi ke calon klien pertama dalam 48 jam dengan modal yang realistis sesuai kapasitas kas pengguna (Rp${snapshot.saldo_saat_ini}).
4. BAHASA SANTUN, RAPI, & MENGINSPIRASI: Gunakan diksi bahasa Indonesia yang berbobot, terstruktur rapi, elegan, dan mendidik.

OUTPUT WAJIB JSON MURNI TANPA MARKDOWN DENGAN SKEMA:
{"recommendations":[{"id":"rec_1","title":"[Judul Strategi Bisnis Profesional]","pitch":"[Penjelasan ringkas langkah eksekusi taktis yang dapat dimulai hari ini]","why_it_fits":"[Alasan logis mengapa kombinasi keahlian dan aset pengguna sangat selaras dengan peluang ini]","capital_level":"[TANPA_MODAL/MODAL_KECIL/MODAL_SEDANG]","needs_upskilling":false,"upskilling_note":"[Opsional: 1 wawasan pelengkap untuk dipelajari kilat]","difficulty":"[MUDAH/SEDANG/MENANTANG]","estimated_time_to_first_income":"[Misal: 1-7 Hari]","risk_note":"[Mitigasi risiko yang realistis dan bijak]"}]}`;
}

function buildMaterialsPrompt(recommendation: any, profile: any) {
  return `Kamu adalah "BILANO Business Operations & Cost Estimator", penasihat kalkulasi modal dan kebutuhan operasional usaha taktis.

IDE BISNIS / PEKERJAAN TERPILIH:
- Judul: "${recommendation?.title || "-"}"
- Ringkasan / Pitch: "${recommendation?.pitch || "-"}"
- Tingkat Modal: ${recommendation?.capital_level || "-"}
- Profil Pengguna: Status ${profile?.status || "-"}, Latar Belakang ${profile?.latarBelakang || "-"}
- Keahlian Pengguna: ${(profile?.keahlian || []).join(", ")}
- Aset yang Sudah Dimiliki: ${(profile?.aset || []).join(", ") || "-"}

TUGAS:
Analisis kebutuhan bahan baku, alat bantu, kemasan, atau peralatan awal yang mutlak dibutuhkan pengguna untuk memulai bisnis ini dalam 48 jam pertama.

ATURAN KHUSUS:
1. JIKA BISNIS JASA MURNI / DIGITAL / FREELANCE (misal: jasa desain, copywriting, konsultasi, coding, penerjemah, ngajar les online, dll) di mana pengguna sudah punya laptop/HP:
   - "no_materials_needed": true
   - "statement": "Pekerjaan ini berbasis keahlian murni & aset digital yang sudah Anda miliki. Anda tidak memerlukan modal barang fisik atau pembelian alat baru untuk memulainya."
   - "items": []
2. JIKA MEMERLUKAN BARANG FISIK / PRODUK / BAHAN BAKU / PERALATAN (misal: jualan buku, kuliner, kerajinan, sablon, fotografi, dsb):
   - "no_materials_needed": false
   - "statement": "Berikut adalah daftar kebutuhan bahan & peralatan awal yang disarankan untuk Anda survei harganya di pasaran/toko/e-commerce:"
   - "items": Berikan 3 sampai 6 item paling esensial. Setiap item berisi:
     - "id": "mat_1", "mat_2", dst.
     - "name": Nama barang/bahan/kebutuhan yang jelas (Contoh: "Plastik Kemasan / Bubble Wrap", "Kertas & Tinta Cetak", "Stiker Label Pengiriman")
     - "reason": Alasan singkat mengapa barang ini diperlukan
     - "suggested_price": 0
     - "is_ai_suggested": true

OUTPUT WAJIB JSON MURNI TANPA MARKDOWN DENGAN SKEMA:
{
  "no_materials_needed": boolean,
  "statement": string,
  "items": [
    {
      "id": string,
      "name": string,
      "reason": string,
      "suggested_price": 0,
      "is_ai_suggested": true
    }
  ]
}`;
}

async function generateMaterialsAI(recommendation: any, profile: any) {
  try {
    const prompt = buildMaterialsPrompt(recommendation, profile);
    let result: any;
    try {
      result = await askDeepSeekR1(prompt, "Hasilkan daftar kebutuhan bahan & alat sekarang.");
    } catch (e) {
      result = await askGeminiJSON(prompt, "Hasilkan daftar kebutuhan bahan & alat sekarang.");
    }
    
    if (result && typeof result === "object") {
      return {
        no_materials_needed: !!result.no_materials_needed,
        statement: result.statement || (result.no_materials_needed ? "Pekerjaan ini tidak memerlukan modal barang fisik." : "Berikut estimasi bahan yang disarankan:"),
        items: Array.isArray(result.items) ? result.items.map((it: any, idx: number) => ({
          id: it.id || `mat_${idx + 1}`,
          name: it.name || `Kebutuhan ${idx + 1}`,
          reason: it.reason || "Kebutuhan operasional dasar",
          price: Number(it.suggested_price) || 0,
          isAiSuggested: true
        })) : []
      };
    }
  } catch (err: any) {
    console.error("Gagal generate materials via AI, gunakan default fallback:", err.message);
  }

  // Fallback jika AI offline
  if (recommendation?.capital_level === "TANPA_MODAL") {
    return {
      no_materials_needed: true,
      statement: "Pekerjaan ini berbasis keahlian murni & aset yang sudah Anda miliki. Tidak memerlukan modal barang fisik atau peralatan baru.",
      items: []
    };
  }

  return {
    no_materials_needed: false,
    statement: "Berikut adalah daftar kebutuhan bahan awal yang disarankan untuk Anda survei harganya:",
    items: [
      { id: "mat_1", name: "Bahan Baku / Produk Awal", reason: "Persediaan sampel atau stok pertama", price: 0, isAiSuggested: true },
      { id: "mat_2", name: "Kemasan / Packaging & Label", reason: "Untuk pengemasan produk yang rapi ke pembeli", price: 0, isAiSuggested: true },
      { id: "mat_3", name: "Biaya Operasional / Ongkir Sampel", reason: "Cadangan logistik atau pengantaran awal", price: 0, isAiSuggested: true },
    ]
  };
}

function buildSellingSystemPrompt(recommendation: any, profile: any, totalCost: number) {
  return `Kamu adalah "BILANO Executive Strategy Mentor", seorang penasihat bisnis & mentor finansial profesional yang ramah, berwibawa, solutif, dan sangat sistematis.

KONTEKS STRATEGIS:
- Ide Bisnis: ${recommendation?.title || "-"} (${recommendation?.pitch || "-"})
- Modal Estimasi: Rp${totalCost}
- Profil Pengguna: Status ${profile?.status || "-"}, Jejaring ${profile?.jejaringSosial || "-"}, Karakter Kerja ${profile?.preferensiKerja || "-"}

PEDOMAN ETIKA & KOMUNIKASI (SANGAT PENTING):
1. BAHASA SANTUN, MENGHARGAI, & MENDUKUNG: Dilarang keras menggunakan kata-kata kasar, sarkastik, meremehkan, atau menyindir (seperti 'jangan melamun', 'modalmu nol', 'kamu bukan auditor'). Gunakan sapaan yang hangat dan memberdayakan.
2. TATA BAHASA RAPI & TERTATA: Susun setiap kalimat dengan jelas dan rapi. Hindari karakter markdown bertumpuk (seperti ***, +++, atau format acak).
3. STRUKTUR BALASAN YANG INDAH & JELAS:
   Gunakan format 3 bagian berurutan berikut:
   
   📌 Analisis Strategis & Solusi:
   (Penjelasan ringkas, solutif, dan mengedukasi tentang pertanyaan pengguna)
   
   🎯 Misi Lapangan Hari Ini:
   (1 langkah tindakan nyata yang konkret dan dapat langsung dipraktikkan hari ini)
   
   📝 Draf Pesan / Skrip Siap Pakai:
   (Contoh naskah komunikasi yang sopan, elegan, dan siap disalin untuk calon klien)`;
}

function buildEvaluationPrompt(recommendation: any, revenueLog: any[]) {
  const totalIncome = revenueLog.filter(l => l.type === 'income' || !l.type).reduce((a, b) => a + Number(b.amount), 0);
  const totalExpense = revenueLog.filter(l => l.type === 'expense').reduce((a, b) => a + Number(b.amount), 0);
  const netProfit = totalIncome - totalExpense;

  return `Kamu adalah Auditor & Mentor Finansial Senior BILANO.
Bisnis: "${recommendation?.title || "-"}"
Total Pemasukan (Omset): Rp${totalIncome}
Total Pengeluaran (HPP/Beban): Rp${totalExpense}
LABA BERSIH: Rp${netProfit}

Berikan evaluasi keuangan yang tajam, konstruktif, dan santun dalam maksimal 4 kalimat. Berikan apresiasi atas pencapaian dan 1 rekomendasi peningkatan efisiensi kas. Teks bersih tanpa karakter berantakan.`;
}

async function getFinancialSnapshot(userId: number, cashBalance: number) {
  try {
    const txResult = await db.execute(sql`
      SELECT type, amount FROM transactions
      WHERE user_id = ${userId} AND date >= NOW() - INTERVAL '90 days'
    `);
    const txRows = Array.isArray(txResult) ? txResult : (txResult as any).rows || [];
    const totalIncome = txRows.filter((r: any) => r.type === "income").reduce((a: number, r: any) => a + Number(r.amount), 0);
    const totalExpense = txRows.filter((r: any) => r.type === "expense").reduce((a: number, r: any) => a + Number(r.amount), 0);

    return {
      saldo_saat_ini: Math.round(cashBalance || 0),
      rata2_pemasukan_bulanan: Math.round(totalIncome / 3),
      rata2_pengeluaran_bulanan: Math.round(totalExpense / 3),
      data_cukup_representatif: txRows.length >= 10,
    };
  } catch (e) {
    return { saldo_saat_ini: Math.round(cashBalance || 0), rata2_pemasukan_bulanan: 0, rata2_pengeluaran_bulanan: 0, data_cukup_representatif: false };
  }
}

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
        const parsed = await askGeminiJSON(buildQuestionsPrompt(status), "Generate sekarang.");
        if (!Array.isArray(parsed) || parsed.length < 8) throw new Error("format tidak lengkap");
        return res.json({ questions: parsed, source: "ai" });
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
      
      const body = req.body || {};
      const safeStatus = body.status !== undefined ? String(body.status) : null;
      const safeTujuan = body.tujuan !== undefined ? String(body.tujuan) : null;
      const safePola = body.polaKerja !== undefined ? String(body.polaKerja) : null;
      const safeJejaring = body.jejaringSosial !== undefined ? String(body.jejaringSosial) : null;
      const safePreferensi = body.preferensiKerja !== undefined ? String(body.preferensiKerja) : null;
      const safeLatar = body.latarBelakang !== undefined ? String(body.latarBelakang) : null;
      const safeKeahlian = body.keahlian ? JSON.stringify(body.keahlian) : '[]';
      const safeKeahlianLainnya = body.keahlianLainnya !== undefined && body.keahlianLainnya !== null ? String(body.keahlianLainnya) : null;
      const safeAset = body.aset ? JSON.stringify(body.aset) : '[]';
      const safeKonstrain = body.konstrainWaktu ? JSON.stringify(body.konstrainWaktu) : '{}';

      const existing = await db.execute(sql`SELECT id FROM income_profiles WHERE user_id = ${user.id} ORDER BY updated_at DESC LIMIT 1`);
      const existingRows = Array.isArray(existing) ? existing : (existing as any).rows || [];

      if (existingRows.length > 0 && existingRows[0]?.id) {
        await db.execute(sql`
          UPDATE income_profiles SET 
            status = ${safeStatus}, 
            tujuan = ${safeTujuan}, 
            pola_kerja = ${safePola},
            jejaring_sosial = ${safeJejaring}, 
            preferensi_kerja = ${safePreferensi},
            latar_belakang = ${safeLatar}, 
            keahlian = ${safeKeahlian},
            keahlian_lainnya = ${safeKeahlianLainnya}, 
            aset = ${safeAset},
            konstrain_waktu = ${safeKonstrain}, 
            updated_at = NOW(), 
            cooldown_until = NULL
          WHERE id = ${existingRows[0].id}
        `);
        return res.json({ success: true, id: existingRows[0].id });
      }
      
      const inserted = await db.execute(sql`
        INSERT INTO income_profiles (user_id, status, tujuan, pola_kerja, jejaring_sosial, preferensi_kerja, latar_belakang, keahlian, keahlian_lainnya, aset, konstrain_waktu)
        VALUES (${user.id}, ${safeStatus}, ${safeTujuan}, ${safePola}, ${safeJejaring}, ${safePreferensi}, ${safeLatar}, ${safeKeahlian}, ${safeKeahlianLainnya}, ${safeAset}, ${safeKonstrain})
        RETURNING id
      `);
      const insertedRows = Array.isArray(inserted) ? inserted : (inserted as any).rows || [];
      res.json({ success: true, id: insertedRows[0]?.id });
    } catch (e: any) { 
      res.status(500).json({ error: e.message || "Gagal menyimpan ke basis data." }); 
    }
  });

  // =========================================================================
  // ⚡ SISTEM AUTO-FALLBACK: DEEPSEEK -> GEMINI
  // =========================================================================
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
        // PERCOBAAN 1: Tembak DeepSeek R1 (Sangat tajam, tapi rawan timeout/error)
        const parsed = await askDeepSeekR1(buildRecommendationsPrompt(profile, snapshot), "Rumuskan 3 strategi gerilya terbaik.");
        recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
        if (recommendations.length === 0) throw new Error("Format kosong");
        
      } catch (aiError: any) {
        console.error("DeepSeek Gagal (Timeout/Limit). Mengaktifkan Fallback Gemini...", aiError.message);
        try {
          // PERCOBAAN 2 (AUTO-FALLBACK): Tembak Gemini Flash (Sangat stabil)
          const fallbackParsed = await askGeminiJSON(buildRecommendationsPrompt(profile, snapshot), "Rumuskan 3 strategi gerilya terbaik.");
          recommendations = Array.isArray(fallbackParsed.recommendations) ? fallbackParsed.recommendations : [];
        } catch (geminiError: any) {
          return res.status(502).json({ error: "Semua server AI sedang penuh.", detail: geminiError.message });
        }
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

  app.post("/api/income-strategy/attempts", async (req: any, res: any) => {
    try {
      await ensureIncomeStrategyTables();
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
      const { recommendation } = req.body;
      if (!recommendation || !recommendation.title) return res.status(400).json({ error: "Ide usaha tidak valid." });

      const profileResult = await db.execute(sql`SELECT * FROM income_profiles WHERE user_id = ${user.id} ORDER BY updated_at DESC LIMIT 1`);
      const profileRows = Array.isArray(profileResult) ? profileResult : (profileResult as any).rows || [];
      const profileRow = profileRows[0] || null;
      const profileId = profileRow?.id || null;

      const profile = profileRow ? {
        status: profileRow.status,
        latarBelakang: profileRow.latar_belakang,
        keahlian: safeParse(profileRow.keahlian, []),
        aset: safeParse(profileRow.aset, [])
      } : {};

      // 🧠 Generate kebutuhan bahan/alat awal otomatis via AI
      const materialsData = await generateMaterialsAI(recommendation, profile);

      const inserted = await db.execute(sql`
        INSERT INTO income_attempts (
          user_id, profile_id, recommendation, state, status, materials, materials_statement
        )
        VALUES (
          ${user.id}, ${profileId}, ${JSON.stringify(recommendation)}, 'MATERIALS', 'ACTIVE', 
          ${JSON.stringify(materialsData.items)}, ${materialsData.statement}
        )
        RETURNING *
      `);
      const insertedRows = Array.isArray(inserted) ? inserted : (inserted as any).rows || [];
      const formatted = formatAttempt(insertedRows[0]);
      formatted.materials = materialsData.items;
      formatted.materialsStatement = materialsData.statement;
      formatted.noMaterialsNeeded = materialsData.no_materials_needed;

      res.json(formatted);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/attempts/:id/generate-materials", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const result = await db.execute(sql`SELECT * FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      const attempt = rows[0];
      const recommendation = safeParse(attempt.recommendation, {});

      const profileResult = await db.execute(sql`SELECT * FROM income_profiles WHERE id = ${attempt.profile_id}`);
      const profileRows = Array.isArray(profileResult) ? profileResult : (profileResult as any).rows || [];
      const profileRow = profileRows[0] || {};
      const profile = {
        status: profileRow.status,
        latarBelakang: profileRow.latar_belakang,
        keahlian: safeParse(profileRow.keahlian, []),
        aset: safeParse(profileRow.aset, [])
      };

      const materialsData = await generateMaterialsAI(recommendation, profile);
      const totalCost = materialsData.items.reduce((a: number, m: any) => a + (Number(m.price) || 0), 0);

      await db.execute(sql`
        UPDATE income_attempts SET 
          materials = ${JSON.stringify(materialsData.items)}, 
          materials_statement = ${materialsData.statement},
          total_cost = ${totalCost},
          updated_at = NOW()
        WHERE id = ${req.params.id} AND user_id = ${user!.id}
      `);

      res.json({
        success: true,
        materials: materialsData.items,
        materialsStatement: materialsData.statement,
        noMaterialsNeeded: materialsData.no_materials_needed,
        totalCost
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/income-strategy/attempts/:id/materials", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const { materials, statement } = req.body;
      if (!Array.isArray(materials)) return res.status(400).json({ error: "Format bahan tidak valid." });
      const totalCost = materials.reduce((a: number, m: any) => a + (Number(m.price) || 0), 0);
      
      if (statement !== undefined) {
        await db.execute(sql`
          UPDATE income_attempts SET materials = ${JSON.stringify(materials)}, materials_statement = ${statement}, total_cost = ${totalCost}, updated_at = NOW()
          WHERE id = ${req.params.id} AND user_id = ${user!.id}
        `);
      } else {
        await db.execute(sql`
          UPDATE income_attempts SET materials = ${JSON.stringify(materials)}, total_cost = ${totalCost}, updated_at = NOW()
          WHERE id = ${req.params.id} AND user_id = ${user!.id}
        `);
      }
      res.json({ success: true, totalCost, materials });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/attempts/:id/feasibility", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const { manualMonthlyExpense, materials } = req.body || {};

      const result = await db.execute(sql`SELECT * FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(result) ? result : (result as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      const attempt = rows[0];

      // Update materials jika dikirimkan bersama payload
      let currentMaterials = safeParse(attempt.materials, []);
      if (Array.isArray(materials)) {
        currentMaterials = materials;
        const calcCost = currentMaterials.reduce((a: number, m: any) => a + (Number(m.price) || 0), 0);
        await db.execute(sql`
          UPDATE income_attempts SET materials = ${JSON.stringify(currentMaterials)}, total_cost = ${calcCost}, updated_at = NOW()
          WHERE id = ${req.params.id} AND user_id = ${user!.id}
        `);
      }

      const totalCost = currentMaterials.reduce((a: number, m: any) => a + (Number(m.price) || 0), 0);
      const snapshot = await getFinancialSnapshot(user!.id, user!.cashBalance);
      const hasManualInput = manualMonthlyExpense !== undefined && manualMonthlyExpense !== null && manualMonthlyExpense !== "";

      const effectiveExpense = hasManualInput ? Number(manualMonthlyExpense) : snapshot.rata2_pengeluaran_bulanan;
      const bufferBulan = 1;
      const sisaDanaAman = Math.max(0, snapshot.saldo_saat_ini - effectiveExpense * bufferBulan);

      let verdict: string;
      let verdictTitle: string;
      let analysis: string;

      if (totalCost === 0) {
        verdict = "CUKUP_AMAN";
        verdictTitle = "Sangat Layak (Bebas Modal)";
        analysis = `Pekerjaan ini tidak membutuhkan modal awal barang. Kondisi saldo kas aktif Anda (Rp${snapshot.saldo_saat_ini.toLocaleString("id-ID")}) sepenuhnya aman. Anda bisa langsung menjalankan instruksi strategi penjualan!`;
      } else if (totalCost <= sisaDanaAman) {
        verdict = "CUKUP_AMAN";
        verdictTitle = "Sangat Layak & Aman";
        analysis = `Kondisi keuangan Anda SANGAT LAYAK. Total proyeksi kebutuhan modal sebesar Rp${totalCost.toLocaleString("id-ID")} dapat dipenuhi tanpa mengorbankan dana cadangan kebutuhan bulanan Anda.`;
      } else if (totalCost <= snapshot.saldo_saat_ini) {
        verdict = "CUKUP_TAPI_RISIKO";
        verdictTitle = "Layak dengan Catatan Risiko";
        analysis = `Saldo kas Anda mencukupi (Rp${snapshot.saldo_saat_ini.toLocaleString("id-ID")}), namun pengeluaran modal sebesar Rp${totalCost.toLocaleString("id-ID")} berpotensi memotong dana cadangan kebutuhan pokok Anda. Disarankan berhati-hati atau terapkan sistem Pre-Order (PO).`;
      } else {
        verdict = "KURANG";
        verdictTitle = "Defisit Modal (Perlu Kumpul Modal)";
        const defisit = totalCost - snapshot.saldo_saat_ini;
        analysis = `Saldo kas aktif Anda (Rp${snapshot.saldo_saat_ini.toLocaleString("id-ID")}) belum mencukupi kebutuhan modal awal Rp${totalCost.toLocaleString("id-ID")} (Defisit Rp${defisit.toLocaleString("id-ID")}). Hindari berhutang konsumtif! Ikuti sistem kumpul modal cerdas dan strategi Pre-Order (PO) yang telah disiapkan.`;
      }

      const nextState = verdict === "KURANG" ? "CAPITAL" : "SELLING";
      const feasibilityAnalysis = {
        verdict,
        verdictTitle,
        analysis,
        totalCost,
        saldoSaatIni: snapshot.saldo_saat_ini,
        sisaDanaAman,
        selisih: Math.max(0, totalCost - (verdict === "KURANG" ? snapshot.saldo_saat_ini : sisaDanaAman)),
      };

      await db.execute(sql`
        UPDATE income_attempts SET 
          feasibility_verdict = ${verdict}, 
          feasibility_analysis = ${JSON.stringify(feasibilityAnalysis)},
          total_cost = ${totalCost},
          state = ${nextState}, 
          updated_at = NOW() 
        WHERE id = ${req.params.id}
      `);

      res.json({
        needs_clarification: false,
        verdict,
        verdictTitle,
        analysis,
        state: nextState,
        total_cost: totalCost,
        saldo_saat_ini: snapshot.saldo_saat_ini,
        sisa_dana_aman: sisaDanaAman,
        selisih: feasibilityAnalysis.selisih,
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

      const options = [
        { title: "Menabung bertahap", description: "Sisihkan sebagian pemasukan bulananmu.", estimated_time_or_effort: "1-2 Minggu" },
        { title: "Sistem Pre-Order (PO)", description: "Minta DP 50% dari pembeli pertama.", estimated_time_or_effort: "Bisa Langsung" },
      ];

      const capitalPlan = { options, generatedAt: new Date().toISOString() };
      await db.execute(sql`UPDATE income_attempts SET capital_plan = ${JSON.stringify(capitalPlan)}, updated_at = NOW() WHERE id = ${req.params.id}`);
      res.json(capitalPlan);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/income-strategy/attempts/:id/state", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const { state } = req.body;
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
      let replyText = "Ayo mulai eksekusi taktik gerilya hari ini. Kirim penawaran pertamamu sekarang.";
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

      const evaluation = (await askGeminiText(buildEvaluationPrompt(recommendation, revenueLog))) || "Terus catat keuangan Anda secara disiplin. Evaluasi margin keuntungankau sebelum memperluas skala.";

      const sellingNotes = safeParse(attempt.selling_notes, []);
      sellingNotes.push({ sender: "evaluation", text: evaluation, at: new Date().toISOString() });
      await db.execute(sql`UPDATE income_attempts SET selling_notes = ${JSON.stringify(sellingNotes)}, updated_at = NOW() WHERE id = ${req.params.id}`);

      res.json({ evaluation });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/income-strategy/attempts/:id/stop", async (req: any, res: any) => {
    try {
      const user = await getUser(req);
      const attRes = await db.execute(sql`SELECT profile_id FROM income_attempts WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      const rows = Array.isArray(attRes) ? attRes : (attRes as any).rows || [];
      if (rows.length === 0) return res.status(404).json({ error: "Percobaan usaha tidak ditemukan." });
      const profileId = rows[0].profile_id;
      
      await db.execute(sql`UPDATE income_attempts SET status = 'STOPPED', updated_at = NOW() WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
      
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() + 30);
      await db.execute(sql`UPDATE income_profiles SET cooldown_until = ${cooldownDate.toISOString()} WHERE id = ${profileId}`);

      res.json({ success: true, cooldownUntil: cooldownDate });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}