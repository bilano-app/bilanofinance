import "dotenv/config";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { db } from "../server/db.js";
import { sql } from "drizzle-orm";
import { ensureAdrienStoreTables } from "../server/adrienStore.js";

async function main() {
  console.log("=== SYNCING ADRIEN FANDRA STORE PRODUCTS & SETTINGS ===");

  await ensureAdrienStoreTables();

  // 1. Update Settings Toko (Branding Bersih & Profesional)
  await db.execute(sql`
    UPDATE adrien_store_settings
    SET store_name = 'Adrien Fandra Store',
        store_tagline = 'Koleksi E-Book & Panduan Praktis Akuntansi Bisnis',
        header_title = 'Adrien Fandra',
        header_subtitle = 'Edukator Akuntansi',
        header_hook = 'siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet',
        header_badge = 'Book Now',
        whatsapp_number = '+6289688113210'
    WHERE id = 1 OR TRUE;
  `);
  console.log("✅ Settings updated (Title: Adrien Fandra | Subtitle: Edukator Akuntansi).");

  // 2. Tambahkan / Update Voucher Khusus "SEREBU" (Harga Menjadi Rp 1.000)
  await db.execute(sql`
    INSERT INTO adrien_vouchers (code, discount_type, discount_value, min_spend, usage_limit, times_used, is_active)
    VALUES ('SEREBU', 'SET_PRICE', 1000, 0, 99999, 0, true)
    ON CONFLICT (code) DO UPDATE 
    SET discount_type = 'SET_PRICE', discount_value = 1000, min_spend = 0, is_active = true;
  `);
  console.log("✅ Voucher 'serebu' (Harga jadi Rp 1.000) aktif dan tersimpan.");

  // 3. Hapus produk berlebih jika ada
  await db.execute(sql`DELETE FROM adrien_products WHERE id > 4`);

  // 4. Update 4 Produk Resmi Tanpa Review Fiktif
  // Produk 1: Logika Akuntansi
  await db.execute(sql`
    UPDATE adrien_products
    SET slug = 'logika-akuntansi',
        title = 'Logika Akuntansi',
        subtitle = 'Bukan hanya tahu, tapi juga menguasai alur berpikirnya dengan bahasa paling sederhana',
        category = 'BEST SELLER',
        cover_url = '/Akuntansi/Mockup_Buku_Logika_Akuntansi.webp',
        regular_price = 72000,
        sale_price = 46000,
        sales_headline = 'Pahami Akuntansi dari Logikanya, Bukan dari Hafalan Rumusnya!',
        sales_body = 'Buku Logika Akuntansi ini dirancang khusus untuk Anda yang ingin menguasai akuntansi dari akarnya. Anda akan memahami mengapa suatu transaksi dicatat di debit atau kredit dengan logika yang masuk akal dan bahasa yang sangat ramah pemula, bukan sekadar menghafal aturan baku yang bikin bingung.',
        highlights = '["Paham alur & logika debit-kredit tanpa perlu menghafal aturan kaku", "Kuasai persamaan dasar akuntansi dan analisis transaksi riil", "Praktik langsung pencatatan jurnal umum bisnis & studi kasus", "Bahasa santai, mudah dicerna pemula, mahasiswa, dan pemilik usaha"]'::jsonb,
        testimonials = '[]'::jsonb,
        scarcity_text = 'Promo Terbatas - Diskon Spesial Hari Ini',
        reader_count = 3420,
        whatsapp_number = '+6289688113210',
        pdf_filename = 'LOGIKA AKUNTANSI - Adrien Fandra.pdf',
        is_active = true,
        sort_order = 1,
        updated_at = NOW()
    WHERE id = 1;
  `);
  console.log("✅ Produk 1: Logika Akuntansi (Rp46.000 / Rp72.000) updated.");

  // Produk 2: Paket Bundling 3 Buku
  await db.execute(sql`
    UPDATE adrien_products
    SET slug = 'paket-bundling-3-buku',
        title = 'Paket Bundling 3 Buku',
        subtitle = 'Koleksi Lengkap 3 E-Book: Logika Akuntansi + Akuntansi Lengkap + Gudang Soal Akuntansi',
        category = 'PAKET BUNDLING 3 BUKU',
        cover_url = '/Akuntansi/Paket_Bundling_3_E-Book.webp',
        regular_price = 205000,
        sale_price = 82000,
        sales_headline = 'Dapatkan 3 E-Book Akuntansi Terlengkap Sekaligus dalam 1 Paket Super Hemat!',
        sales_body = 'Paket Bundling 3 E-Book ini menyajikan seluruh materi esensial akuntansi: mulai dari konsep dasar di Logika Akuntansi, siklus pembukuan lengkap di Akuntansi Lengkap, hingga ratusan latihan kasus di Gudang Soal Akuntansi. Ketiga e-book diberikan lengkap terpisah (3 file PDF) agar Anda leluasa mengunduh dan mempelajarinya masing-masing.',
        highlights = '["Super Hemat: Potongan Rp123.000 dibandingkan membeli terpisah", "3 E-Book Terpisah Lengkap: Logika Akuntansi, Akuntansi Lengkap, & Gudang Soal", "Unduh & Baca Masing-Masing: Dapatkan 3 file PDF resmi tersendiri", "Total materi berbobot dari dasar hingga mahir (434 Halaman)", "Studi kasus bisnis riil + ratusan latihan soal lengkap dengan pembahasan"]'::jsonb,
        testimonials = '[]'::jsonb,
        scarcity_text = 'Ingat Paket ini TERBATAS - Hanya Untuk 10 Orang',
        reader_count = 4890,
        whatsapp_number = '+6289688113210',
        pdf_filename = 'Paket_Bundling_3_Buku_Akuntansi_Adrien_Fandra.pdf',
        is_active = true,
        sort_order = 2,
        updated_at = NOW()
    WHERE id = 2;
  `);
  console.log("✅ Produk 2: Paket Bundling 3 Buku (Rp82.000 / Rp205.000) updated.");

  // Produk 3: Akuntansi Lengkap
  await db.execute(sql`
    UPDATE adrien_products
    SET slug = 'full-accounting',
        title = 'Akuntansi Lengkap',
        subtitle = 'Panduan Siklus Akuntansi Penuh: Dari Jurnal, Buku Besar, Neraca Saldo, hingga Laporan Keuangan Bisnis',
        category = 'PANDUAN LENGKAP',
        cover_url = '/Akuntansi/Mockup_Buku_Full_Accounting_Tebal.webp',
        regular_price = 95000,
        sale_price = 75000,
        sales_headline = 'Kuasai Siklus Akuntansi Lengkap dan Susun Laporan Keuangan Sendiri!',
        sales_body = 'Lewat e-book Akuntansi Lengkap (Full Accounting), Anda diajak menuntaskan seluruh siklus pembukuan: pencatatan transaksi harian, posting ke buku besar, penyusunan neraca saldo, jurnal penyesuaian akhir periode, hingga menerbitkan Laporan Laba Rugi, Perubahan Modal, dan Neraca secara presisi.',
        highlights = '["Siklus akuntansi menyeluruh dari transaksi awal hingga laporan akhir", "Langkah demi langkah menyusun Jurnal Penyesuaian & Neraca Lajur", "Teknik membaca & menganalisis Laporan Laba Rugi serta Arus Kas", "Dilengkapi contoh kasus bisnis nyata dan format pembukuan rapi"]'::jsonb,
        testimonials = '[]'::jsonb,
        scarcity_text = 'Promo Terbatas Minggu Ini',
        reader_count = 2760,
        whatsapp_number = '+6289688113210',
        pdf_filename = 'FULL ACCOUNTING - Adrien Fandra.pdf',
        is_active = true,
        sort_order = 3,
        updated_at = NOW()
    WHERE id = 3;
  `);
  console.log("✅ Produk 3: Akuntansi Lengkap (Rp75.000 / Rp95.000) updated.");

  // Produk 4: Gudang Soal Akuntansi
  await db.execute(sql`
    UPDATE adrien_products
    SET slug = 'gudang-akuntansi',
        title = 'Gudang Soal Akuntansi',
        subtitle = 'Kumpulan Bank Soal & Kasus Akuntansi Praktis Lengkap dengan Kunci Jawaban & Pembahasan',
        category = 'LATIHAN & BANK SOAL',
        cover_url = '/Akuntansi/Mockup_Buku_Gudang_Soal_Akuntansi.webp',
        regular_price = 38000,
        sale_price = 26000,
        sales_headline = 'Uji dan Asah Kemampuan Akuntansi Anda dengan Ratusan Latihan Soal Praktis!',
        sales_body = 'Gudang Soal Akuntansi berisi kumpulan studi kasus dan bank soal komprehensif mulai dari penjurnalan transaksi, penyesuaian pos keuangan, hingga penyusunan laporan keuangan. Dilengkapi pembahasan mendalam step-by-step untuk memastikan Anda benar-benar mahir.',
        highlights = '["Ratusan latihan soal akuntansi terstruktur dari level dasar hingga lanjutan", "Kunci jawaban dan pembahasan rinci setiap butir soal", "Simulasi kasus transaksi bisnis nyata untuk menguji ketelitian", "Solusi cepat mengatasi keraguan saat menghadapi ujian maupun praktik kerja"]'::jsonb,
        testimonials = '[]'::jsonb,
        scarcity_text = 'Diskon Spesial Terbatas',
        reader_count = 1850,
        whatsapp_number = '+6289688113210',
        pdf_filename = 'Gudang Soal Akuntansi - Adrien Fandra.pdf',
        is_active = true,
        sort_order = 4,
        updated_at = NOW()
    WHERE id = 4;
  `);
  console.log("✅ Produk 4: Gudang Soal Akuntansi (Rp26.000 / Rp38.000) updated.");

  console.log("\n=== ALL REQUESTS PROCESSED SUCCESSFULLY! ===");
  process.exit(0);
}

main().catch(err => {
  console.error("Error during sync:", err);
  process.exit(1);
});
