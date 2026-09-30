import "dotenv/config";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { db } from "../server/db.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Syncing database to Akuntansi...");

  // Update Settings
  await db.execute(sql`
    UPDATE adrien_store_settings
    SET store_name = 'Adrien Fandra Store',
        store_tagline = 'Koleksi E-Book & Panduan Praktis Akuntansi Bisnis',
        header_title = 'AdrienFandra.id',
        header_subtitle = 'Adrien Fandra | Praktisi & Konsultan Akuntansi',
        header_hook = 'siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet',
        header_badge = 'Book Now'
    WHERE id = 1 OR TRUE;
  `);
  console.log("Settings updated.");

  // Update Product 1
  await db.execute(sql`
    UPDATE adrien_products 
    SET title = 'Paket Bundling 4 in 1: Jago Akuntansi & Laporan Keuangan Bisnis',
        subtitle = 'Dari nol jurnal sampai bisa susun & analisis Laporan Keuangan dengan percaya diri',
        category = 'BUNDLING 4 IN 1 AKUNTANSI',
        sales_headline = '4 E-book ini dibuat buat lo yang Sebenarnya punya bisnis/kerja tapi sering pusing saat baca Laporan Keuangan!',
        sales_body = 'Lewat 4 e-book ini, lo gak cuma belajar teori akuntansi membosankan, tapi diajak praktek langsung cara menyusun jurnal umum, buku besar, neraca saldo, hingga membaca laporan laba rugi dan arus kas dengan mudah & aplikatif.',
        highlights = '["Bisa menyusun jurnal umum & buku besar tanpa bingung debit kredit", "Paham cara membaca Laporan Laba Rugi & Neraca dalam 5 menit", "Deteksi kebocoran uang kas bisnis sejak dini", "Template spreadsheet & studi kasus riil siap pakai"]'::jsonb,
        testimonials = '[
          {"name": "Arif Hady", "role": "Owner Bisnis Kuliner & Entrepreneur", "comment": "Buku akuntansi paling praktis yang pernah saya baca! Pembukuan usaha kuliner saya langsung rapi dan gak bocor lagi.", "rating": 5},
          {"name": "Fadhil R.", "role": "Finance Officer", "comment": "Penjelasan debit-kreditnya simpel banget, langsung paham alur laporan keuangan tahunan.", "rating": 5},
          {"name": "Dedi A.", "role": "UMKM Founder", "comment": "Dulu buta angka keuangan bisnis, sekarang bisa bikin neraca dan tahu profit bersih riil tiap bulan.", "rating": 5},
          {"name": "Zahra N.", "role": "Junior Accountant", "comment": "Sangat aplikatif buat mahasiswa & staf akuntansi pemula, ada template spreadsheet siap contek.", "rating": 5}
        ]'::jsonb,
        pdf_filename = 'Paket_Bundling_4in1_Jago_Akuntansi_Bisnis.pdf'
    WHERE id = 1;
  `);
  console.log("Product 1 updated.");

  // Update Product 2
  await db.execute(sql`
    UPDATE adrien_products 
    SET title = 'Contekan Jurnal & Laporan Keuangan: Siap Pakai untuk Bisnis & Mahasiswa',
        subtitle = 'Kumpulan Rumus & Template Jurnal Akuntansi Praktis Anti Bingung',
        category = 'BEST SELLER',
        sales_headline = 'Tinggal Contek Sesuai Transaksi Bisnis Lo!',
        sales_body = '50+ Template pencatatan jurnal transaksi mulai dari kas, persediaan, piutang, hutang, hingga penyesuaian akhir periode.',
        highlights = '["50+ Template Jurnal Transaksi Harian Bisnis", "Cara Mudah Menghitung HPP (Harga Pokok Penjualan)", "Anti Bingung Jurnal Penyesuaian & Penyusutan Aset", "Format Siap Pakai di Excel / Spreadsheet"]'::jsonb,
        testimonials = '[
          {"name": "Ghozi M.", "role": "Accounting Staff", "comment": "Contekan jurnalnya sangat ngebantu kerjaan bulanan saya, closing laporan jadi jauh lebih cepat!", "rating": 5}
        ]'::jsonb,
        pdf_filename = 'Contekan_Jurnal_Laporan_Keuangan.pdf'
    WHERE id = 2;
  `);
  console.log("Product 2 updated.");

  // Update Product 3
  await db.execute(sql`
    UPDATE adrien_products 
    SET title = '7 Hari Mahir Baca & Analisis Laporan Keuangan',
        subtitle = 'Panduan Taktis Membaca Kesehatan Keuangan Bisnis dari Laba Rugi & Neraca',
        category = 'POPULAR',
        sales_headline = 'Ketahui Apakah Bisnis Anda Benar-Benar Untung atau Sekadar Ramai!',
        sales_body = 'Metode cepat 7 hari memahami pos-pos penting dalam Neraca, Laba Rugi, dan Arus Kas untuk pengambilan keputusan bisnis yang tepat.',
        highlights = '["Cara Cepat Mengetahui Rasio Profit & Likuiditas", "Trik Membaca Arus Kas Operasional vs Investasi", "Checklist Evaluasi Keuangan Bulanan"]'::jsonb,
        pdf_filename = '7_Hari_Mahir_Baca_Laporan_Keuangan.pdf'
    WHERE id = 3;
  `);
  console.log("Product 3 updated.");

  console.log("ALL DATA SUCCESSFULLY SYNCED TO AKUNTANSI!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error syncing:", err);
  process.exit(1);
});
