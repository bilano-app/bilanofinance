import "dotenv/config";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { db } from "../server/db.js";
import { sql } from "drizzle-orm";
import { ensureAdrienStoreTables } from "../server/adrienStore.js";

async function main() {
  console.log("=== SYNCING ADRIEN FANDRA STORE PRODUCTS & SETTINGS ===");

  await ensureAdrienStoreTables();

  // 1. Update Settings Toko
  await db.execute(sql`
    UPDATE adrien_store_settings
    SET store_name = 'Adrien Fandra Store',
        store_tagline = 'Koleksi E-Book & Panduan Praktis Akuntansi Bisnis',
        header_title = 'AdrienFandra.id',
        header_subtitle = 'Adrien Fandra | Praktisi & Konsultan Akuntansi',
        header_hook = 'siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet',
        header_badge = 'Book Now',
        whatsapp_number = '+6289688113210'
    WHERE id = 1 OR TRUE;
  `);
  console.log("✅ Settings updated successfully.");

  // 2. Bersihkan & Perbarui 4 Produk Sesuai Urutan Permintaan User:
  // 1. Logika Akuntansi Rp46.000 dengan harga coret Rp72.000
  // 2. Paket Bundling 3 Buku Rp82.000 dengan harga coret Rp213.000
  // 3. Full Accounting Rp69.000 dengan harga coret Rp99.000
  // 4. Gudang Akuntansi Rp28.000 dengan harga coret Rp42.000

  // Hapus produk lama agar urutan ID dan data bersih
  await db.execute(sql`DELETE FROM adrien_products WHERE id > 4`);

  // Produk 1: Logika Akuntansi
  const p1Check = await db.execute(sql`SELECT id FROM adrien_products WHERE id = 1`);
  if (p1Check.rows.length === 0) {
    await db.execute(sql`
      INSERT INTO adrien_products (
        id, slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
        sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number,
        pdf_filename, is_active, sort_order
      ) VALUES (
        1,
        'logika-akuntansi',
        'Logika Akuntansi',
        'Kuasai Fondasi & Logika Debit Kredit Akuntansi Tanpa Perlu Menghafal Rumus Rumit',
        'BEST SELLER',
        '/Akuntansi/Mockup Buku Logika Akuntansi.png',
        '[]'::jsonb,
        72000,
        46000,
        'Pahami Akuntansi dari Logikanya, Bukan dari Hafalan Rumusnya!',
        'Buku ini dirancang khusus untuk Anda yang ingin menguasai akuntansi dari akarnya. Anda akan memahami mengapa suatu transaksi dicatat di debit atau kredit dengan logika yang masuk akal, bukan sekadar menghafal aturan baku yang bikin bingung.',
        '["Paham alur & logika debit-kredit tanpa perlu menghafal aturan kaku", "Kuasai persamaan dasar akuntansi dan analisis transaksi riil", "Praktik langsung pencatatan jurnal umum bisnis & studi kasus", "Bahasa santai, mudah dicerna pemula, mahasiswa, dan pemilik usaha"]'::jsonb,
        '[
          {"name": "Arif Hady", "role": "Owner Bisnis Kuliner", "comment": "Buku akuntansi paling praktis yang pernah saya baca! Logika debit kreditnya masuk akal banget, pembukuan usaha saya langsung rapi.", "rating": 5},
          {"name": "Zahra N.", "role": "Mahasiswi Akuntansi", "comment": "Penjelasannya runut dan gak ngebosenin. Dulu bingung banget debit kredit, setelah baca buku ini langsung terang benderang.", "rating": 5},
          {"name": "Fadhil R.", "role": "Staff Keuangan", "comment": "Sangat aplikatif untuk pemula, pondasi akuntansinya bener-bener dapet.", "rating": 5}
        ]'::jsonb,
        'Promo Terbatas - Diskon Spesial Hari Ini',
        3420,
        '+6289688113210',
        'LOGIKA AKUNTANSI - Adrien Fandra.pdf',
        true,
        1
      );
    `);
  } else {
    await db.execute(sql`
      UPDATE adrien_products
      SET slug = 'logika-akuntansi',
          title = 'Logika Akuntansi',
          subtitle = 'Kuasai Fondasi & Logika Debit Kredit Akuntansi Tanpa Perlu Menghafal Rumus Rumit',
          category = 'BEST SELLER',
          cover_url = '/Akuntansi/Mockup Buku Logika Akuntansi.png',
          regular_price = 72000,
          sale_price = 46000,
          sales_headline = 'Pahami Akuntansi dari Logikanya, Bukan dari Hafalan Rumusnya!',
          sales_body = 'Buku ini dirancang khusus untuk Anda yang ingin menguasai akuntansi dari akarnya. Anda akan memahami mengapa suatu transaksi dicatat di debit atau kredit dengan logika yang masuk akal, bukan sekadar menghafal aturan baku yang bikin bingung.',
          highlights = '["Paham alur & logika debit-kredit tanpa perlu menghafal aturan kaku", "Kuasai persamaan dasar akuntansi dan analisis transaksi riil", "Praktik langsung pencatatan jurnal umum bisnis & studi kasus", "Bahasa santai, mudah dicerna pemula, mahasiswa, dan pemilik usaha"]'::jsonb,
          testimonials = '[
            {"name": "Arif Hady", "role": "Owner Bisnis Kuliner", "comment": "Buku akuntansi paling praktis yang pernah saya baca! Logika debit kreditnya masuk akal banget, pembukuan usaha saya langsung rapi.", "rating": 5},
            {"name": "Zahra N.", "role": "Mahasiswi Akuntansi", "comment": "Penjelasannya runut dan gak ngebosenin. Dulu bingung banget debit kredit, setelah baca buku ini langsung terang benderang.", "rating": 5},
            {"name": "Fadhil R.", "role": "Staff Keuangan", "comment": "Sangat aplikatif untuk pemula, pondasi akuntansinya bener-bener dapet.", "rating": 5}
          ]'::jsonb,
          scarcity_text = 'Promo Terbatas - Diskon Spesial Hari Ini',
          reader_count = 3420,
          whatsapp_number = '+6289688113210',
          pdf_filename = 'LOGIKA AKUNTANSI - Adrien Fandra.pdf',
          is_active = true,
          sort_order = 1,
          updated_at = NOW()
      WHERE id = 1;
    `);
  }
  console.log("✅ Produk 1: Logika Akuntansi (Rp46.000 / Rp72.000) synced.");

  // Produk 2: Paket Bundling 3 Buku
  const p2Check = await db.execute(sql`SELECT id FROM adrien_products WHERE id = 2`);
  if (p2Check.rows.length === 0) {
    await db.execute(sql`
      INSERT INTO adrien_products (
        id, slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
        sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number,
        pdf_filename, is_active, sort_order
      ) VALUES (
        2,
        'paket-bundling-3-buku',
        'Paket Bundling 3 Buku',
        'Koleksi Lengkap 3 E-Book: Logika Akuntansi + Full Accounting + Gudang Soal Akuntansi',
        'PAKET BUNDLING 3 BUKU',
        '/Akuntansi/Tiga Buku Akuntansi Interaktif.png',
        '[]'::jsonb,
        213000,
        82000,
        'Dapatkan 3 E-Book Akuntansi Terlengkap Sekaligus dalam 1 Paket Super Hemat!',
        'Paket Bundling 3 Buku ini menggabungkan seluruh materi esensial akuntansi: mulai dari fondasi konsep dan logika di Logika Akuntansi, siklus pembukuan dan penyusunan laporan keuangan di Full Accounting, hingga ratusan latihan kasus di Gudang Soal Akuntansi. Ketiga materi langsung digabung lengkap untuk pembelajaran komprehensif Anda.',
        '["Super Hemat: Potongan Rp131.000 dibandingkan membeli terpisah", "3 Buku Lengkap Sekaligus: Logika Akuntansi, Full Accounting, & Gudang Soal", "Total 430+ Halaman materi berbobot dari dasar hingga mahir", "Ketiga buku langsung digabung lengkap saat pembelian selesai", "Studi kasus bisnis riil + ratusan latihan soal lengkap dengan pembahasan"]'::jsonb,
        '[
          {"name": "Hendra Wijaya", "role": "Business Owner", "comment": "Ambil paket bundling 3 buku ini keputusan terbaik! Sangat komplit dari konsep, praktik bikin laporan laba rugi, sampai latihan soalnya.", "rating": 5},
          {"name": "Dedi A.", "role": "UMKM Founder", "comment": "Dulu buta angka keuangan bisnis, sekarang bisa bikin neraca dan tahu profit bersih riil tiap bulan berkat paket lengkap ini.", "rating": 5},
          {"name": "Putri S.", "role": "Accounting Junior", "comment": "Worth it banget paket 3 buku ini. Bahasanya aplikatif, ada contekannya, dan ilmunya kepake banget di kantor!", "rating": 5}
        ]'::jsonb,
        'Ingat Paket ini TERBATAS - Hanya Untuk 10 Orang',
        4890,
        '+6289688113210',
        'Paket_Bundling_3_Buku_Akuntansi_Adrien_Fandra.pdf',
        true,
        2
      );
    `);
  } else {
    await db.execute(sql`
      UPDATE adrien_products
      SET slug = 'paket-bundling-3-buku',
          title = 'Paket Bundling 3 Buku',
          subtitle = 'Koleksi Lengkap 3 E-Book: Logika Akuntansi + Full Accounting + Gudang Soal Akuntansi',
          category = 'PAKET BUNDLING 3 BUKU',
          cover_url = '/Akuntansi/Tiga Buku Akuntansi Interaktif.png',
          regular_price = 213000,
          sale_price = 82000,
          sales_headline = 'Dapatkan 3 E-Book Akuntansi Terlengkap Sekaligus dalam 1 Paket Super Hemat!',
          sales_body = 'Paket Bundling 3 Buku ini menggabungkan seluruh materi esensial akuntansi: mulai dari fondasi konsep dan logika di Logika Akuntansi, siklus pembukuan dan penyusunan laporan keuangan di Full Accounting, hingga ratusan latihan kasus di Gudang Soal Akuntansi. Ketiga materi langsung digabung lengkap untuk pembelajaran komprehensif Anda.',
          highlights = '["Super Hemat: Potongan Rp131.000 dibandingkan membeli terpisah", "3 Buku Lengkap Sekaligus: Logika Akuntansi, Full Accounting, & Gudang Soal", "Total 430+ Halaman materi berbobot dari dasar hingga mahir", "Ketiga buku langsung digabung lengkap saat pembelian selesai", "Studi kasus bisnis riil + ratusan latihan soal lengkap dengan pembahasan"]'::jsonb,
          testimonials = '[
            {"name": "Hendra Wijaya", "role": "Business Owner", "comment": "Ambil paket bundling 3 buku ini keputusan terbaik! Sangat komplit dari konsep, praktik bikin laporan laba rugi, sampai latihan soalnya.", "rating": 5},
            {"name": "Dedi A.", "role": "UMKM Founder", "comment": "Dulu buta angka keuangan bisnis, sekarang bisa bikin neraca dan tahu profit bersih riil tiap bulan berkat paket lengkap ini.", "rating": 5},
            {"name": "Putri S.", "role": "Accounting Junior", "comment": "Worth it banget paket 3 buku ini. Bahasanya aplikatif, ada contekannya, dan ilmunya kepake banget di kantor!", "rating": 5}
          ]'::jsonb,
          scarcity_text = 'Ingat Paket ini TERBATAS - Hanya Untuk 10 Orang',
          reader_count = 4890,
          whatsapp_number = '+6289688113210',
          pdf_filename = 'Paket_Bundling_3_Buku_Akuntansi_Adrien_Fandra.pdf',
          is_active = true,
          sort_order = 2,
          updated_at = NOW()
      WHERE id = 2;
    `);
  }
  console.log("✅ Produk 2: Paket Bundling 3 Buku (Rp82.000 / Rp213.000) synced.");

  // Produk 3: Full Accounting
  const p3Check = await db.execute(sql`SELECT id FROM adrien_products WHERE id = 3`);
  if (p3Check.rows.length === 0) {
    await db.execute(sql`
      INSERT INTO adrien_products (
        id, slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
        sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number,
        pdf_filename, is_active, sort_order
      ) VALUES (
        3,
        'full-accounting',
        'Full Accounting',
        'Panduan Siklus Akuntansi Penuh: Dari Jurnal, Buku Besar, Neraca Saldo, hingga Laporan Keuangan Bisnis',
        'PANDUAN LENGKAP',
        '/Akuntansi/Mockup Buku Full Accounting Tebal.png',
        '[]'::jsonb,
        99000,
        69000,
        'Kuasai Siklus Akuntansi Lengkap dan Susun Laporan Keuangan Sendiri!',
        'Lewat e-book Full Accounting, Anda diajak menuntaskan seluruh siklus pembukuan: pencatatan transaksi harian, posting ke buku besar, penyusunan neraca saldo, jurnal penyesuaian akhir periode, hingga menerbitkan Laporan Laba Rugi, Perubahan Modal, dan Neraca secara presisi.',
        '["Siklus akuntansi menyeluruh dari transaksi awal hingga laporan akhir", "Langkah demi langkah menyusun Jurnal Penyesuaian & Neraca Lajur", "Teknik membaca & menganalisis Laporan Laba Rugi serta Arus Kas", "Dilengkapi contoh kasus bisnis nyata dan format pembukuan rapi"]'::jsonb,
        '[
          {"name": "Ghozi M.", "role": "Accounting Staff", "comment": "Buku Full Accounting ini sangat ngebantu kerjaan bulanan saya. Closing laporan akhir bulan jadi jauh lebih cepat dan minim revisi!", "rating": 5},
          {"name": "Maya R.", "role": "Finance Supervisor", "comment": "Panduan yang sangat terstruktur. Sangat direkomendasikan untuk staf finance maupun pemilik bisnis yang ingin mandiri menyusun laporan.", "rating": 5}
        ]'::jsonb,
        'Promo Terbatas Minggu Ini',
        2760,
        '+6289688113210',
        'FULL ACCOUNTING - Adrien Fandra.pdf',
        true,
        3
      );
    `);
  } else {
    await db.execute(sql`
      UPDATE adrien_products
      SET slug = 'full-accounting',
          title = 'Full Accounting',
          subtitle = 'Panduan Siklus Akuntansi Penuh: Dari Jurnal, Buku Besar, Neraca Saldo, hingga Laporan Keuangan Bisnis',
          category = 'PANDUAN LENGKAP',
          cover_url = '/Akuntansi/Mockup Buku Full Accounting Tebal.png',
          regular_price = 99000,
          sale_price = 69000,
          sales_headline = 'Kuasai Siklus Akuntansi Lengkap dan Susun Laporan Keuangan Sendiri!',
          sales_body = 'Lewat e-book Full Accounting, Anda diajak menuntaskan seluruh siklus pembukuan: pencatatan transaksi harian, posting ke buku besar, penyusunan neraca saldo, jurnal penyesuaian akhir periode, hingga menerbitkan Laporan Laba Rugi, Perubahan Modal, dan Neraca secara presisi.',
          highlights = '["Siklus akuntansi menyeluruh dari transaksi awal hingga laporan akhir", "Langkah demi langkah menyusun Jurnal Penyesuaian & Neraca Lajur", "Teknik membaca & menganalisis Laporan Laba Rugi serta Arus Kas", "Dilengkapi contoh kasus bisnis nyata dan format pembukuan rapi"]'::jsonb,
          testimonials = '[
            {"name": "Ghozi M.", "role": "Accounting Staff", "comment": "Buku Full Accounting ini sangat ngebantu kerjaan bulanan saya. Closing laporan akhir bulan jadi jauh lebih cepat dan minim revisi!", "rating": 5},
            {"name": "Maya R.", "role": "Finance Supervisor", "comment": "Panduan yang sangat terstruktur. Sangat direkomendasikan untuk staf finance maupun pemilik bisnis yang ingin mandiri menyusun laporan.", "rating": 5}
          ]'::jsonb,
          scarcity_text = 'Promo Terbatas Minggu Ini',
          reader_count = 2760,
          whatsapp_number = '+6289688113210',
          pdf_filename = 'FULL ACCOUNTING - Adrien Fandra.pdf',
          is_active = true,
          sort_order = 3,
          updated_at = NOW()
      WHERE id = 3;
    `);
  }
  console.log("✅ Produk 3: Full Accounting (Rp69.000 / Rp99.000) synced.");

  // Produk 4: Gudang Akuntansi
  const p4Check = await db.execute(sql`SELECT id FROM adrien_products WHERE id = 4`);
  if (p4Check.rows.length === 0) {
    await db.execute(sql`
      INSERT INTO adrien_products (
        id, slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
        sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number,
        pdf_filename, is_active, sort_order
      ) VALUES (
        4,
        'gudang-akuntansi',
        'Gudang Akuntansi',
        'Kumpulan Bank Soal & Kasus Akuntansi Praktis Lengkap dengan Kunci Jawaban & Pembahasan',
        'LATIHAN & BANK SOAL',
        '/Akuntansi/Mockup Buku Gudang Soal Akuntansi.png',
        '[]'::jsonb,
        42000,
        28000,
        'Uji dan Asah Kemampuan Akuntansi Anda dengan Ratusan Latihan Soal Praktis!',
        'Gudang Akuntansi berisi kumpulan studi kasus dan bank soal komprehensif mulai dari penjurnalan transaksi, penyesuaian pos keuangan, hingga penyusunan laporan keuangan. Dilengkapi pembahasan mendalam step-by-step untuk memastikan Anda benar-benar mahir.',
        '["Ratusan latihan soal akuntansi terstruktur dari level dasar hingga lanjutan", "Kunci jawaban dan pembahasan rinci setiap butir soal", "Simulasi kasus transaksi bisnis nyata untuk menguji ketelitian", "Solusi cepat mengatasi keraguan saat menghadapi ujian maupun praktik kerja"]'::jsonb,
        '[
          {"name": "Budi Santoso", "role": "Mahasiswa", "comment": "Soal-soalnya lengkap banget dan pembahasannya jelas. Sangat membantu persiapan ujian dan sertifikasi akuntansi!", "rating": 5},
          {"name": "Rina K.", "role": "Akuntan Pemula", "comment": "Bagus banget buat latihan ngasah insting debit kredit dan jurnal penyesuaian. Gak nyesel beli!", "rating": 5}
        ]'::jsonb,
        'Diskon Spesial Terbatas',
        1850,
        '+6289688113210',
        'Gudang Soal Akuntansi - Adrien Fandra.pdf',
        true,
        4
      );
    `);
  } else {
    await db.execute(sql`
      UPDATE adrien_products
      SET slug = 'gudang-akuntansi',
          title = 'Gudang Akuntansi',
          subtitle = 'Kumpulan Bank Soal & Kasus Akuntansi Praktis Lengkap dengan Kunci Jawaban & Pembahasan',
          category = 'LATIHAN & BANK SOAL',
          cover_url = '/Akuntansi/Mockup Buku Gudang Soal Akuntansi.png',
          regular_price = 42000,
          sale_price = 28000,
          sales_headline = 'Uji dan Asah Kemampuan Akuntansi Anda dengan Ratusan Latihan Soal Praktis!',
          sales_body = 'Gudang Akuntansi berisi kumpulan studi kasus dan bank soal komprehensif mulai dari penjurnalan transaksi, penyesuaian pos keuangan, hingga penyusunan laporan keuangan. Dilengkapi pembahasan mendalam step-by-step untuk memastikan Anda benar-benar mahir.',
          highlights = '["Ratusan latihan soal akuntansi terstruktur dari level dasar hingga lanjutan", "Kunci jawaban dan pembahasan rinci setiap butir soal", "Simulasi kasus transaksi bisnis nyata untuk menguji ketelitian", "Solusi cepat mengatasi keraguan saat menghadapi ujian maupun praktik kerja"]'::jsonb,
          testimonials = '[
            {"name": "Budi Santoso", "role": "Mahasiswa", "comment": "Soal-soalnya lengkap banget dan pembahasannya jelas. Sangat membantu persiapan ujian dan sertifikasi akuntansi!", "rating": 5},
            {"name": "Rina K.", "role": "Akuntan Pemula", "comment": "Bagus banget buat latihan ngasah insting debit kredit dan jurnal penyesuaian. Gak nyesel beli!", "rating": 5}
          ]'::jsonb,
          scarcity_text = 'Diskon Spesial Terbatas',
          reader_count = 1850,
          whatsapp_number = '+6289688113210',
          pdf_filename = 'Gudang Soal Akuntansi - Adrien Fandra.pdf',
          is_active = true,
          sort_order = 4,
          updated_at = NOW()
      WHERE id = 4;
    `);
  }
  console.log("✅ Produk 4: Gudang Akuntansi (Rp28.000 / Rp42.000) synced.");

  console.log("=== ALL 4 PRODUCTS SUCCESSFULLY SYNCED ACCORDING TO USER ORDER ===");
  process.exit(0);
}

main().catch(err => {
  console.error("Error during sync:", err);
  process.exit(1);
});
