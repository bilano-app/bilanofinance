import { type Express, type Request, type Response } from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";
import { db } from "./db.js";
import { sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =========================================================================
// 🔒 DAFTAR EMAIL ADMIN YANG DIIZINKAN & PASSWORD RESMI
// =========================================================================
const ALLOWED_ADMIN_EMAILS = [
  "adrienfandra14@gmail.com",
  "bilanotech@gmail.com"
];
const ADMIN_PASSWORD_DEFAULT = "Adrien1401";
const DEFAULT_WHATSAPP = "+6289688113210";

// Helper Nodemailer Transporter
const getTransporter = () => {
  const emailUser = process.env.EMAIL_USER || "bilanotech@gmail.com";
  const emailPass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPass }
  });
};

// =========================================================================
// 🗄️ INISIALISASI TABEL DATABASE (POSTGRESQL)
// =========================================================================
export async function ensureAdrienStoreTables() {
  try {
    // 1. Settings Toko & Header Hero
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS adrien_store_settings (
        id SERIAL PRIMARY KEY,
        store_name TEXT DEFAULT 'Adrien Fandra Store',
        store_tagline TEXT DEFAULT 'Koleksi E-Book & Panduan Praktis Akuntansi Bisnis',
        header_title TEXT DEFAULT 'AdrienFandra.id',
        header_subtitle TEXT DEFAULT 'Adrien Fandra | Praktisi & Konsultan Akuntansi',
        header_hook TEXT DEFAULT 'siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet',
        header_image TEXT DEFAULT '',
        header_badge TEXT DEFAULT 'Book Now',
        slot_images JSONB DEFAULT '["", "", ""]'::jsonb,
        whatsapp_number TEXT DEFAULT '+6289688113210',
        support_email TEXT DEFAULT 'adrienfandra14@gmail.com',
        admin_password TEXT DEFAULT 'Adrien1401',
        banner_slots_count INTEGER DEFAULT 3,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tambahkan kolom baru jika tabel sudah ada dari migrasi sebelumnya
    try {
      await db.execute(sql`ALTER TABLE adrien_store_settings ADD COLUMN IF NOT EXISTS header_title TEXT DEFAULT 'AdrienFandra.id';`);
      await db.execute(sql`ALTER TABLE adrien_store_settings ADD COLUMN IF NOT EXISTS header_subtitle TEXT DEFAULT 'Adrien Fandra | Praktisi & Konsultan Akuntansi';`);
      await db.execute(sql`ALTER TABLE adrien_store_settings ADD COLUMN IF NOT EXISTS header_hook TEXT DEFAULT 'siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet';`);
      await db.execute(sql`ALTER TABLE adrien_store_settings ADD COLUMN IF NOT EXISTS header_image TEXT DEFAULT '';`);
      await db.execute(sql`ALTER TABLE adrien_store_settings ADD COLUMN IF NOT EXISTS header_badge TEXT DEFAULT 'Book Now';`);
      await db.execute(sql`ALTER TABLE adrien_store_settings ADD COLUMN IF NOT EXISTS slot_images JSONB DEFAULT '["", "", ""]'::jsonb;`);
      await db.execute(sql`ALTER TABLE adrien_store_settings ADD COLUMN IF NOT EXISTS admin_password TEXT DEFAULT 'Adrien1401';`);
    } catch (e) {}

    // 2. Top Horizontal Banners / Slots
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS adrien_top_banners (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        badge TEXT,
        image_url TEXT,
        link_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. E-Books / Produk
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS adrien_products (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        category TEXT DEFAULT 'E-Book',
        cover_url TEXT,
        promo_images JSONB DEFAULT '[]'::jsonb,
        regular_price BIGINT NOT NULL DEFAULT 145000,
        sale_price BIGINT NOT NULL DEFAULT 99000,
        sales_headline TEXT,
        sales_body TEXT,
        highlights JSONB DEFAULT '[]'::jsonb,
        testimonials JSONB DEFAULT '[]'::jsonb,
        scarcity_text TEXT DEFAULT 'Ingat Paket ini TERBATAS - Hanya Untuk 10 Orang',
        reader_count INTEGER DEFAULT 4310,
        whatsapp_number TEXT DEFAULT '+6289688113210',
        pdf_url TEXT,
        pdf_filename TEXT,
        pdf_data_base64 TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 4. Pesanan / Transaksi Pembelian E-Book
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS adrien_orders (
        id SERIAL PRIMARY KEY,
        merchant_order_id TEXT UNIQUE NOT NULL,
        product_id INTEGER NOT NULL,
        product_title TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        additional_answers JSONB DEFAULT '{}'::jsonb,
        subtotal BIGINT NOT NULL,
        discount_amount BIGINT DEFAULT 0,
        total_amount BIGINT NOT NULL,
        voucher_code TEXT,
        payment_method TEXT DEFAULT 'SQ',
        payment_status TEXT DEFAULT 'PENDING',
        duitku_reference TEXT,
        duitku_payment_url TEXT,
        duitku_va_number TEXT,
        duitku_qr_code TEXT,
        email_sent BOOLEAN DEFAULT false,
        email_sent_at TIMESTAMP,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 5. Kupon / Voucher
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS adrien_vouchers (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        discount_type TEXT DEFAULT 'FIXED',
        discount_value BIGINT NOT NULL,
        min_spend BIGINT DEFAULT 0,
        usage_limit INTEGER DEFAULT 100,
        times_used INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 6. Real Storefront & Product Analytics Events Table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS adrien_analytics_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        product_id INTEGER,
        product_title TEXT,
        visitor_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default data HANYA jika tabel belum memiliki data sama sekali
    await seedDefaultAdrienStoreData();
  } catch (error) {
    console.error("[AdrienStore] Error ensuring DB tables:", error);
  }
}

// =========================================================================
// 🌱 SEED DEFAULT DATA (Hanya dijalankan jika tabel kosong)
// =========================================================================
async function seedDefaultAdrienStoreData() {
  try {
    // 1. Cek Settings
    const settingsCheck = await db.execute(sql`SELECT COUNT(*) FROM adrien_store_settings`);
    if (Number(settingsCheck.rows[0]?.count || 0) === 0) {
      await db.execute(sql`
        INSERT INTO adrien_store_settings (
          store_name, store_tagline, header_title, header_subtitle, header_hook, header_image, header_badge,
          slot_images, whatsapp_number, support_email, admin_password, banner_slots_count
        ) VALUES (
          'Adrien Fandra Store',
          'E-Book & Panduan Praktis Akuntansi Bisnis',
          'Adrien Fandra',
          'Edukator Akuntansi',
          'siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet',
          '',
          'Book Now',
          '["/Akuntansi/DISPLAY_1.webp", "/Akuntansi/DISPLAY_2.webp", "/Akuntansi/DISPLAY_3.webp"]'::jsonb,
          '+6289688113210',
          'adrienfandra14@gmail.com',
          'Adrien1401',
          3
        );
      `);
    }

    // 2. Cek Produk Ebook (4 Paket Sesuai Urutan Resmi)
    const productCheck = await db.execute(sql`SELECT COUNT(*) FROM adrien_products`);
    if (Number(productCheck.rows[0]?.count || 0) === 0) {
      // 1. Logika Akuntansi Rp46.000 dengan harga coret Rp72.000
      await db.execute(sql`
        INSERT INTO adrien_products (
          id, slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
          sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number,
          pdf_filename, is_active, sort_order
        ) VALUES (
          1,
          'logika-akuntansi',
          'Logika Akuntansi',
          'Bukan hanya tahu, tapi juga menguasai alur berpikirnya',
          'BEST SELLER',
          '/Akuntansi/Mockup Buku Logika Akuntansi.png',
          '[]'::jsonb,
          72000,
          46000,
          'Pahami Akuntansi dari Logikanya, Bukan dari Hafalan Rumusnya!',
          'Buku ini dirancang khusus untuk Anda yang ingin menguasai akuntansi dari akarnya. Anda akan memahami mengapa suatu transaksi dicatat di debit atau kredit dengan logika yang masuk akal, bukan sekadar menghafal aturan baku yang bikin bingung.',
          '["Paham alur & logika debit-kredit tanpa perlu menghafal aturan kaku", "Kuasai persamaan dasar akuntansi dan analisis transaksi riil", "Praktik langsung pencatatan jurnal umum bisnis & studi kasus", "Bahasa santai, mudah dicerna pemula, mahasiswa, dan pemilik usaha"]'::jsonb,
          '[]'::jsonb,
          'Promo Terbatas - Diskon Spesial Hari Ini',
          3420,
          '+6289688113210',
          'LOGIKA AKUNTANSI - Adrien Fandra.pdf',
          true,
          1
        );
      `);

      // 2. Paket Bundling 3 Buku Rp82.000 dengan harga coret Rp213.000
      await db.execute(sql`
        INSERT INTO adrien_products (
          id, slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
          sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number,
          pdf_filename, is_active, sort_order
        ) VALUES (
          2,
          'paket-bundling-3-buku',
          'Paket Bundling 3 Buku',
          '',
          'PAKET BUNDLING 3 BUKU',
          '/Akuntansi/Tiga_Buku_Akuntansi_Interaktif.webp',
          '[]'::jsonb,
          213000,
          82000,
          'Dapatkan 3 E-Book Akuntansi Terlengkap Sekaligus dalam 1 Paket Super Hemat!',
          'Paket Bundling 3 Buku ini menggabungkan seluruh materi esensial akuntansi: mulai dari fondasi konsep dan logika di Logika Akuntansi, siklus pembukuan dan penyusunan laporan keuangan di Full Accounting, hingga ratusan latihan kasus di Gudang Soal Akuntansi. Ketiga materi langsung digabung lengkap untuk pembelajaran komprehensif Anda.',
          '["Super Hemat: Potongan Rp131.000 dibandingkan membeli terpisah", "3 Buku Lengkap Sekaligus: Logika Akuntansi, Full Accounting, & Gudang Soal", "Total 430+ Halaman materi berbobot dari dasar hingga mahir", "Ketiga buku langsung digabung lengkap saat pembelian selesai", "Studi kasus bisnis riil + ratusan latihan soal lengkap dengan pembahasan"]'::jsonb,
          '[]'::jsonb,
          'Ingat Paket ini TERBATAS - Hanya Untuk 10 Orang',
          4890,
          '+6289688113210',
          'Paket_Bundling_3_Buku_Akuntansi_Adrien_Fandra.pdf',
          true,
          2
        );
      `);

      // 3. Full Accounting Rp69.000 dengan harga coret Rp99.000
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
          '[]'::jsonb,
          'Promo Terbatas Minggu Ini',
          2760,
          '+6289688113210',
          'FULL ACCOUNTING - Adrien Fandra.pdf',
          true,
          3
        );
      `);

      // 4. Gudang Akuntansi Rp28.000 dengan harga coret Rp42.000
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
          '[]'::jsonb,
          'Diskon Spesial Terbatas',
          1850,
          '+6289688113210',
          'Gudang Soal Akuntansi - Adrien Fandra.pdf',
          true,
          4
        );
      `);
    }

    // 3. Cek & Migrasi Voucher (Tambahkan Promo AF14 40% Bundling & Kolom Restriksi Produk)
    await db.execute(sql`
      ALTER TABLE adrien_vouchers ADD COLUMN IF NOT EXISTS applicable_product_id INTEGER;
    `);

    await db.execute(sql`
      INSERT INTO adrien_vouchers (code, discount_type, discount_value, min_spend, usage_limit, times_used, is_active, applicable_product_id)
      VALUES 
      ('AF14', 'PERCENT', 40, 0, 99999, 0, true, 2),
      ('SEREBU', 'SET_PRICE', 1000, 0, 99999, 0, true, NULL),
      ('HEMAT10', 'PERCENT', 10, 0, 500, 0, true, NULL),
      ('ADRIEN15', 'PERCENT', 15, 50000, 200, 0, true, NULL)
      ON CONFLICT (code) 
      DO UPDATE SET 
        discount_type = EXCLUDED.discount_type,
        discount_value = EXCLUDED.discount_value,
        is_active = true,
        applicable_product_id = EXCLUDED.applicable_product_id;
    `);

    // 3. Migrasi Otomatis Cover ke WebP & Pembaruan Copy Bundling Terpisah
    await db.execute(sql`
      UPDATE adrien_products 
      SET cover_url = '/Akuntansi/Mockup_Buku_Logika_Akuntansi.webp',
          sort_order = 2
      WHERE (id = 1 OR slug = 'logika-akuntansi');

      UPDATE adrien_products 
      SET cover_url = '/Akuntansi/Tiga_Buku_Akuntansi_Interaktif.webp',
          subtitle = '',
          regular_price = 213000,
          sale_price = 82000,
          sort_order = 1,
          sales_body = 'Paket Bundling 3 Buku ini menyajikan seluruh materi esensial akuntansi: mulai dari fondasi konsep dan logika di Logika Akuntansi, siklus pembukuan dan penyusunan laporan keuangan di Full Accounting, hingga ratusan latihan kasus di Gudang Soal Akuntansi. Ketiga e-book diberikan lengkap terpisah (3 file PDF) agar Anda leluasa mengunduh dan mempelajarinya masing-masing.',
          highlights = '["Super Hemat: Potongan Rp131.000 dibandingkan membeli terpisah", "3 E-Book Terpisah Lengkap: Logika Akuntansi, Full Accounting, & Gudang Soal", "Unduh & Baca Masing-Masing: Dapatkan 3 file PDF resmi tersendiri", "Total 430+ Halaman materi berbobot dari dasar hingga mahir", "Studi kasus bisnis riil + ratusan latihan soal lengkap dengan pembahasan"]'::jsonb
      WHERE (id = 2 OR slug = 'paket-bundling-3-buku');

      UPDATE adrien_products 
      SET cover_url = '/Akuntansi/Mockup_Buku_Full_Accounting_Tebal.webp',
          sort_order = 3
      WHERE (id = 3 OR slug = 'full-accounting');

      UPDATE adrien_products 
      SET cover_url = '/Akuntansi/Mockup_Buku_Gudang_Soal_Akuntansi.webp',
          sort_order = 4
      WHERE (id = 4 OR slug = 'gudang-akuntansi');

      UPDATE adrien_store_settings
      SET slot_images = '["/Akuntansi/DISPLAY_1.webp", "/Akuntansi/DISPLAY_2.webp", "/Akuntansi/DISPLAY_3.webp"]'::jsonb
      WHERE slot_images IS NULL 
         OR slot_images = '["", "", ""]'::jsonb 
         OR slot_images = '[]'::jsonb;
    `);

    console.log("[AdrienStore] Tables & Seed Data ready.");
  } catch (error) {
    console.error("[AdrienStore] Seed error:", error);
  }
}

// =========================================================================
// 📄 GENERATOR PDF RESMI E-BOOK (STANDAR TINGGI)
// =========================================================================
export function generateEbookPDF(productTitle: string, customerName: string, orderId: string): Buffer {
  const safeTitle = String(productTitle || "BILANO E-BOOK").trim();
  const safeName = String(customerName || "Pembaca Terhormat").trim();
  const safeOrderId = String(orderId || "AF-ORDER").trim();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Halaman 1: Cover Page
  doc.setFillColor(29, 62, 114); // Bilano Navy (#1D3E72)
  doc.rect(0, 0, 210, 297, "F");

  // Accent Gold Bar
  doc.setFillColor(246, 185, 59); // Bilano Gold (#F6B93B)
  doc.rect(0, 260, 210, 15, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("BILANO E-BOOK SERIES", 105, 55, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(246, 185, 59);
  doc.text("EDISI RESMI & EKSKLUSIF", 105, 68, { align: "center" });

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  const splitTitle = doc.splitTextToSize(safeTitle, 160);
  doc.text(splitTitle, 105, 115, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 215, 240);
  doc.text("Oleh: Adrien Fandra & Tim Bilano", 105, 155, { align: "center" });

  // Box Informasi Pembeli Berlisensi
  doc.setFillColor(15, 34, 71);
  doc.roundedRect(25, 180, 160, 50, 4, 4, "F");
  
  doc.setFontSize(10);
  doc.setTextColor(246, 185, 59);
  doc.setFont("helvetica", "bold");
  doc.text("LISENSI PEMBELI RESMI", 105, 192, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.text(`Dilisensikan Kepada: ${safeName}`, 105, 202, { align: "center" });
  doc.text(`ID Transaksi: ${safeOrderId}`, 105, 210, { align: "center" });
  doc.text(`Tanggal Unduh: ${new Date().toLocaleDateString("id-ID")}`, 105, 218, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(150, 170, 200);
  doc.text("BILANO.APP/ADRIENFANDRA • WHATSAPP: +6289688113210", 105, 269, { align: "center" });

  // Halaman 2: Isi & Panduan
  doc.addPage();
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");

  // Top Bar Navy
  doc.setFillColor(29, 62, 114);
  doc.rect(0, 0, 210, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(safeTitle, 20, 13);

  // Sambutan
  doc.setTextColor(15, 34, 71);
  doc.setFontSize(18);
  doc.text("PENGANTAR PRAKTISI AKUNTANSI", 20, 38);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const introText = 
    `Halo ${safeName},\n\n` +
    `Selamat telah memiliki panduan "${safeTitle}". E-book ini disusun secara khusus dan aplikatif untuk membantu Anda menguasai pencatatan keuangan bisnis, menyusun pembukuan yang tertib, dan membaca laporan keuangan tanpa rasa takut pada rumus-rumus rumit.\n\n` +
    `Silakan pelajari langkah demi langkah dan terapkan langsung pada pencatatan bisnis Anda harian.`;
  const splitIntro = doc.splitTextToSize(introText, 170);
  doc.text(splitIntro, 20, 48);

  // Box Highlight 3 Pilar
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(20, 105, 170, 52, 3, 3, "F");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(29, 62, 114);
  doc.text("3 PILAR PENTING PEMBUKUAN BISNIS SEHAT:", 26, 116);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text("1. Disiplin Pencatatan: Setiap rupiah transaksi kas wajib dicatat pada hari yang sama.", 26, 126);
  doc.text("2. Akurasi Laba Rugi: Pisahkan omset kotor dan profit bersih riil operasional.", 26, 134);
  doc.text("3. Kontrol Arus Kas: Deteksi kebocoran pos pengeluaran sebelum menjadi krisis.", 26, 142);

  // Bagian Daftar Isi
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("MODUL & STRUKTUR BELAJAR AKUNTANSI", 20, 175);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("• Modul 1: Prinsip Dasar Akuntansi & Logika Persamaan Akuntansi Bisnis", 20, 187);
  doc.text("• Modul 2: Praktik Pencatatan Jurnal Umum & Posting ke Buku Besar", 20, 197);
  doc.text("• Modul 3: Menyusun Neraca Saldo & Jurnal Penyesuaian Akhir Periode", 20, 207);
  doc.text("• Modul 4: Cara Membaca & Menganalisis Laporan Laba Rugi serta Arus Kas", 20, 217);
  doc.text("• Modul 5: Studi Kasus Riil & Template Spreadsheet Pembukuan Siap Pakai", 20, 227);

  // Footer Bantuan
  doc.setFillColor(29, 62, 114);
  doc.rect(0, 275, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Butuh bantuan atau ingin konsultasi materi? WhatsApp: +6289688113210", 105, 287, { align: "center" });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

// =========================================================================
// 📚 RESOLVER & PENGGABUNG FILE PDF ASLI (AKUNTANSI)
// =========================================================================

// Direktori tempat file PDF disimpan
function getAkuntansiDirectory(): string {
  const candidates = [
    path.resolve(process.cwd(), "client", "public", "Akuntansi"),
    path.resolve(process.cwd(), "dist", "public", "Akuntansi"),
    path.resolve(process.cwd(), "public", "Akuntansi"),
    path.resolve(__dirname, "..", "client", "public", "Akuntansi"),
    path.resolve(__dirname, "..", "dist", "public", "Akuntansi"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

// =========================================================================
// 📚 DAFTAR RESMI E-BOOK DALAM PAKET BUNDLING (3 BUKU TERPISAH)
// =========================================================================
export const BUNDLE_BOOKS = [
  {
    key: "logika",
    order: 1,
    title: "Logika Akuntansi",
    subtitle: "Kuasai Pondasi Logika & Alur Berpikir Akuntansi Modern Tanpa Hafalan",
    filename: "LOGIKA AKUNTANSI - Adrien Fandra.pdf",
    coverUrl: "/Akuntansi/Mockup_Buku_Logika_Akuntansi.webp"
  },
  {
    key: "full",
    order: 2,
    title: "Full Accounting",
    subtitle: "Panduan Komprehensif Siklus Akuntansi Penuh & Laporan Keuangan",
    filename: "FULL ACCOUNTING - Adrien Fandra.pdf",
    coverUrl: "/Akuntansi/Mockup_Buku_Full_Accounting_Tebal.webp"
  },
  {
    key: "gudang",
    order: 3,
    title: "Gudang Soal Akuntansi",
    subtitle: "Kumpulan Studi Kasus, Latihan Soal, & Pembahasan Praktis Siap Uji",
    filename: "Gudang Soal Akuntansi - Adrien Fandra.pdf",
    coverUrl: "/Akuntansi/Mockup_Buku_Gudang_Soal_Akuntansi.webp"
  }
];

// Helper untuk mengambil buffer ke-3 file PDF Paket Bundling secara terpisah
export function getBundlePdfBuffers(): Array<{
  key: string;
  order: number;
  title: string;
  subtitle: string;
  filename: string;
  buffer: Buffer;
  coverUrl: string;
}> {
  const akuntansiDir = getAkuntansiDirectory();
  return BUNDLE_BOOKS.map(b => {
    const fPath = path.join(akuntansiDir, b.filename);
    let buf: Buffer;
    if (fs.existsSync(fPath)) {
      buf = fs.readFileSync(fPath);
    } else {
      buf = generateEbookPDF(b.title, "Pembaca Terhormat", "AF-BUNDLE");
    }
    return {
      key: b.key,
      order: b.order,
      title: b.title,
      subtitle: b.subtitle,
      filename: b.filename,
      buffer: buf,
      coverUrl: b.coverUrl
    };
  });
}

// Helper universal untuk mendapatkan PDF resmi untuk download, baca, dan kirim email
export async function getEbookPdfBuffer(
  product: { id?: number; title?: string; slug?: string; pdf_filename?: string; pdf_data_base64?: string },
  customerName: string = "Pembaca Terhormat",
  orderId: string = "AF-ORDER",
  bookKey?: string
): Promise<{ buffer: Buffer; filename: string; title?: string }> {
  // 1. Cek jika ada custom base64 di DB
  if (product.pdf_data_base64 && typeof product.pdf_data_base64 === "string" && product.pdf_data_base64.trim().length > 0) {
    const raw = product.pdf_data_base64.includes(",") ? product.pdf_data_base64.split(",")[1] : product.pdf_data_base64;
    return {
      buffer: Buffer.from(raw.trim(), "base64"),
      filename: product.pdf_filename || `${(product.title || "Ebook").replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    };
  }

  const akuntansiDir = getAkuntansiDirectory();
  const title = (product.title || "").toLowerCase();
  const slug = (product.slug || "").toLowerCase();
  const filename = product.pdf_filename || "";

  // 2. Cek apakah ini Paket Bundling (Diberikan 3 buku terpisah masing-masing)
  const isBundle = Number(product.id) === 2 || slug.includes("bundling") || title.includes("bundling");
  if (isBundle) {
    const key = (bookKey || "").toLowerCase();
    let targetBook = BUNDLE_BOOKS[0]; // Default ke buku 1 (Logika Akuntansi)

    if (key === "2" || key === "full" || key.includes("full")) {
      targetBook = BUNDLE_BOOKS[1];
    } else if (key === "3" || key === "gudang" || key.includes("gudang") || key.includes("soal")) {
      targetBook = BUNDLE_BOOKS[2];
    } else if (key === "1" || key === "logika" || key.includes("logika")) {
      targetBook = BUNDLE_BOOKS[0];
    }

    const exactPath = path.join(akuntansiDir, targetBook.filename);
    if (fs.existsSync(exactPath)) {
      return {
        buffer: fs.readFileSync(exactPath),
        filename: targetBook.filename,
        title: targetBook.title
      };
    }
  }

  // 3. Cek file fisik berdasarkan pdf_filename yang tersimpan
  if (filename) {
    const exactPath = path.join(akuntansiDir, filename);
    if (fs.existsSync(exactPath)) {
      return {
        buffer: fs.readFileSync(exactPath),
        filename: filename
      };
    }
  }

  // 4. Pencocokan cerdas berdasarkan judul
  if (title.includes("logika") || slug.includes("logika")) {
    const p = path.join(akuntansiDir, "LOGIKA AKUNTANSI - Adrien Fandra.pdf");
    if (fs.existsSync(p)) {
      return { buffer: fs.readFileSync(p), filename: "LOGIKA AKUNTANSI - Adrien Fandra.pdf" };
    }
  }

  if (title.includes("full") || slug.includes("full")) {
    const p = path.join(akuntansiDir, "FULL ACCOUNTING - Adrien Fandra.pdf");
    if (fs.existsSync(p)) {
      return { buffer: fs.readFileSync(p), filename: "FULL ACCOUNTING - Adrien Fandra.pdf" };
    }
  }

  if (title.includes("gudang") || slug.includes("gudang")) {
    const p = path.join(akuntansiDir, "Gudang Soal Akuntansi - Adrien Fandra.pdf");
    if (fs.existsSync(p)) {
      return { buffer: fs.readFileSync(p), filename: "Gudang Soal Akuntansi - Adrien Fandra.pdf" };
    }
  }

  // 5. Fallback generator resmi jsPDF
  return {
    buffer: generateEbookPDF(product.title || "E-Book Akuntansi", customerName, orderId),
    filename: filename || `${(product.title || "Ebook").replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  };
}

// =========================================================================
// 📧 PENGIRIMAN EMAIL OTOMATIS KE PEMBELI
// =========================================================================
export async function sendCustomerDeliveryEmail(order: any, product: any) {
  try {
    const transporter = getTransporter();
    const formattedTotal = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.total_amount);
    const orderPageUrl = `https://bilano.app/adrienfandra/order/${order.merchant_order_id}`;

    const isBundle = Number(product.id) === 2 || 
      (product.slug || "").toLowerCase().includes("bundling") || 
      (product.title || "").toLowerCase().includes("bundling");

    let attachments: any[] = [];
    let itemsDownloadHtml = "";

    if (isBundle) {
      // Ambil ke-3 file PDF terpisah
      const bundleFiles = getBundlePdfBuffers();
      attachments = bundleFiles.map(b => ({
        filename: b.filename,
        content: b.buffer,
        contentType: "application/pdf"
      }));

      itemsDownloadHtml = `
        <div style="margin: 24px 0;">
          <p style="font-size: 14px; font-weight: 800; color: #1D3E72; margin-bottom: 14px; letter-spacing: -0.2px;">
            📚 Paket Bundling 3 Buku — Unduh Masing-Masing File E-Book:
          </p>
          
          <!-- Buku 1: Logika Akuntansi -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px;">📗 1. Logika Akuntansi</div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Kuasai Pondasi Logika & Alur Berpikir Akuntansi Modern Tanpa Hafalan</div>
            <a href="https://bilano.app/api/adrienfandra/download/${order.merchant_order_id}?book=logika" style="display: block; text-align: center; background: #1D3E72; color: #ffffff !important; padding: 12px 0; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px;" target="_blank">
              UNDUH BUKU 1: LOGIKA AKUNTANSI (PDF)
            </a>
          </div>

          <!-- Buku 2: Full Accounting -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px;">📘 2. Full Accounting</div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Panduan Komprehensif Siklus Akuntansi Penuh & Laporan Keuangan</div>
            <a href="https://bilano.app/api/adrienfandra/download/${order.merchant_order_id}?book=full" style="display: block; text-align: center; background: #2563EB; color: #ffffff !important; padding: 12px 0; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px;" target="_blank">
              UNDUH BUKU 2: FULL ACCOUNTING (PDF)
            </a>
          </div>

          <!-- Buku 3: Gudang Soal Akuntansi -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px;">📙 3. Gudang Soal Akuntansi</div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Kumpulan Studi Kasus, Latihan Soal, & Pembahasan Praktis Siap Uji</div>
            <a href="https://bilano.app/api/adrienfandra/download/${order.merchant_order_id}?book=gudang" style="display: block; text-align: center; background: #0D9488; color: #ffffff !important; padding: 12px 0; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px;" target="_blank">
              UNDUH BUKU 3: GUDANG SOAL (PDF)
            </a>
          </div>

          <a href="${orderPageUrl}" style="display: block; width: 100%; text-align: center; background: #f1f5f9; color: #1e293b !important; padding: 12px 0; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; border: 1px solid #cbd5e1; margin-bottom: 12px;" target="_blank">
            📖 BUKA HALAMAN PESANAN & BACA ONLINE
          </a>
        </div>
      `;
    } else {
      // Produk Tunggal
      const { buffer: pdfAttachmentBuffer, filename: pdfFilename } = await getEbookPdfBuffer(
        product,
        order.customer_name,
        order.merchant_order_id
      );
      attachments = [
        {
          filename: pdfFilename,
          content: pdfAttachmentBuffer,
          contentType: "application/pdf"
        }
      ];

      itemsDownloadHtml = `
        <a href="${orderPageUrl}" class="btn-download" target="_blank">
          DOWNLOAD & BUKA E-BOOK SEKARANG
        </a>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #1e293b; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1D3E72 0%, #0F2247 100%); padding: 36px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 0; font-size: 14px; color: #F6B93B; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
          .receipt-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
          .btn-download { display: block; width: 100%; text-align: center; background: #1D3E72; color: #ffffff !important; padding: 16px 0; border-radius: 100px; font-weight: 800; text-decoration: none; font-size: 15px; margin: 24px 0 12px 0; }
          .btn-wa { display: block; width: 100%; text-align: center; background: #1D3E72; color: #ffffff !important; padding: 12px 0; border-radius: 100px; font-weight: 700; text-decoration: none; font-size: 13px; }
          .footer { background: #f8fafc; padding: 20px 28px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p>Konfirmasi Pembelian Berhasil</p>
            <h1>E-Book Siap Diunduh!</h1>
          </div>
          <div class="content">
            <div class="greeting">Halo ${order.customer_name},</div>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              Terima kasih! Pembayaran untuk <strong>"${product.title}"</strong> telah kami terima dan diverifikasi. ${isBundle ? "Ketiga e-book telah dilampirkan terpisah pada email ini serta dapat diunduh masing-masing lewat tautan di bawah." : "File e-book telah dilampirkan pada email ini serta dapat diunduh melalui tombol di bawah."}
            </p>

            <div class="receipt-box">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px;">No. Pesanan:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; font-size: 13px;">${order.merchant_order_id}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Produk:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; font-size: 13px;">${product.title}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Total Bayar:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 800; font-size: 15px; color: #1D3E72;">${formattedTotal}</td>
                </tr>
              </table>
            </div>

            ${itemsDownloadHtml}

            <a href="https://wa.me/6289688113210?text=Halo%20Mas%20Adrien%2C%20saya%20sudah%20membeli%20${encodeURIComponent(product.title)}%20dengan%20Order%20ID%20${order.merchant_order_id}" class="btn-wa" target="_blank">
              Bantuan WhatsApp (+6289688113210)
            </a>
          </div>
          <div class="footer">
            &copy; 2026 Adrien Fandra Store. Hak Cipta Dilindungi.
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Adrien Fandra E-Book" <${process.env.EMAIL_USER || "bilanotech@gmail.com"}>`,
      to: order.customer_email,
      subject: `[LUNAS] E-Book "${product.title}" - Pesanan #${order.merchant_order_id}`,
      html: emailHtml,
      attachments: attachments
    });

    // Update status email di DB
    await db.execute(sql`
      UPDATE adrien_orders 
      SET email_sent = true, email_sent_at = NOW() 
      WHERE merchant_order_id = ${order.merchant_order_id}
    `);

    return true;
  } catch (err) {
    console.error("[AdrienStore] Failed to send email:", err);
    return false;
  }
}

// =========================================================================
// 🛡️ HELPER VALIDASI ADMIN EMAIL & PASSWORD
// =========================================================================
export function isAdrienAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ALLOWED_ADMIN_EMAILS.includes(clean);
}

// =========================================================================
// 🚀 DAFTARKAN SEMUA ENDPOINT STOREFRONT & MANAGER
// =========================================================================
let isStoreDbInitialized = false;
let storeDataCache: any = null;
let storeDataCacheTime = 0;
const STORE_CACHE_TTL = 60 * 1000; // 60 Detik Cache In-Memory

export function invalidateStoreDataCache() {
  storeDataCache = null;
  storeDataCacheTime = 0;
}

export function setupAdrienStoreRoutes(app: Express) {
  
  // 1. Ambil Data Storefront Publik (High-Speed In-Memory Cache)
  app.get("/api/adrienfandra/store-data", async (_req: Request, res: Response) => {
    try {
      if (!isStoreDbInitialized) {
        await ensureAdrienStoreTables();
        isStoreDbInitialized = true;
      }

      const now = Date.now();
      if (storeDataCache && (now - storeDataCacheTime) < STORE_CACHE_TTL) {
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        return res.json(storeDataCache);
      }

      const settingsRes = await db.execute(sql`SELECT * FROM adrien_store_settings LIMIT 1`);
      const productsRes = await db.execute(sql`
        SELECT id, slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
               sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count,
               whatsapp_number, is_active, sort_order, created_at, (pdf_filename IS NOT NULL OR pdf_data_base64 IS NOT NULL) AS has_pdf
        FROM adrien_products 
        WHERE is_active = true 
        ORDER BY sort_order ASC, id ASC
      `);

      const settingsData: any = settingsRes.rows[0] || {
        store_name: "Adrien Fandra Store",
        store_tagline: "E-Book & Panduan Praktis Akuntansi Bisnis",
        header_title: "Adrien Fandra",
        header_subtitle: "Edukator Akuntansi",
        header_hook: "siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet",
        header_image: "",
        header_badge: "Book Now",
        slot_images: ["", "", ""],
        whatsapp_number: DEFAULT_WHATSAPP,
        support_email: "adrienfandra14@gmail.com",
        banner_slots_count: 3
      };

      // Hapus password dari respons publik
      delete settingsData.admin_password;

      const formattedProducts = (productsRes.rows || []).map((p: any) => ({
        ...p,
        regular_price: Number(p.regular_price) || 0,
        sale_price: Number(p.sale_price) || 0
      }));

      storeDataCache = {
        success: true,
        settings: settingsData,
        products: formattedProducts
      };
      storeDataCacheTime = now;

      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      res.json(storeDataCache);
    } catch (error: any) {
      console.error("[AdrienStore] Error fetching store data:", error);
      res.status(500).json({ success: false, error: "Gagal mengambil data toko." });
    }
  });

  // 2. Ambil Detail 1 Produk Publik
  app.get("/api/adrienfandra/products/:idOrSlug", async (req: Request, res: Response) => {
    try {
      if (!isStoreDbInitialized) {
        await ensureAdrienStoreTables();
        isStoreDbInitialized = true;
      }
      const { idOrSlug } = req.params;
      let query;
      if (!isNaN(Number(idOrSlug))) {
        query = sql`SELECT * FROM adrien_products WHERE id = ${Number(idOrSlug)} LIMIT 1`;
      } else {
        query = sql`SELECT * FROM adrien_products WHERE slug = ${idOrSlug} LIMIT 1`;
      }

      const result = await db.execute(query);
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Produk tidak ditemukan." });
      }

      const row: any = { ...result.rows[0] };
      delete row.pdf_data_base64;
      row.has_pdf = Boolean(result.rows[0].pdf_filename || result.rows[0].pdf_data_base64);
      row.regular_price = Number(row.regular_price) || 0;
      row.sale_price = Number(row.sale_price) || 0;

      res.json({ success: true, product: row });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Gagal memuat produk." });
    }
  });

  // 3. Validasi Kupon Diskon
  app.post("/api/adrienfandra/voucher/validate", async (req: Request, res: Response) => {
    try {
      const { code, amount, productId } = req.body;
      if (!code) return res.status(400).json({ error: "Masukkan kode voucher." });

      const cleanCode = code.trim().toUpperCase();
      const check = await db.execute(sql`
        SELECT * FROM adrien_vouchers 
        WHERE UPPER(code) = ${cleanCode} AND is_active = true 
        LIMIT 1
      `);

      if (!check.rows || check.rows.length === 0) {
        return res.status(400).json({ success: false, error: "Kode voucher tidak valid atau sudah kadaluarsa." });
      }

      const voucher: any = check.rows[0];
      const purchaseAmount = Number(amount) || 0;

      // 🛡️ Restriksi Khusus Produk (Khususnya Promo AF14 40% Hanya untuk Paket Bundling 3 Buku)
      const isBundlingVoucher = cleanCode === "AF14" || 
                               (voucher.applicable_product_id && Number(voucher.applicable_product_id) === 2);

      if (isBundlingVoucher) {
        let isBundle = false;
        if (productId) {
          const prodCheck = await db.execute(sql`SELECT id, slug, title FROM adrien_products WHERE id = ${Number(productId)} LIMIT 1`);
          if (prodCheck.rows && prodCheck.rows.length > 0) {
            const p: any = prodCheck.rows[0];
            isBundle = Number(p.id) === 2 || 
                       (p.slug || "").includes("bundling") || 
                       (p.title || "").toLowerCase().includes("bundling");
          }
        }
        if (!isBundle) {
          return res.status(400).json({
            success: false,
            error: "Kode promo AF14 hanya berlaku khusus untuk Paket Bundling 3 Buku."
          });
        }
      } else if (voucher.applicable_product_id && productId && Number(voucher.applicable_product_id) !== Number(productId)) {
        return res.status(400).json({
          success: false,
          error: `Kode promo ${cleanCode} tidak dapat digunakan untuk produk ini.`
        });
      }

      if (voucher.min_spend && purchaseAmount < Number(voucher.min_spend)) {
        return res.status(400).json({
          success: false,
          error: `Minimal pembelian untuk voucher ini adalah Rp ${Number(voucher.min_spend).toLocaleString("id-ID")}`
        });
      }

      let calculated_discount = 0;
      if (cleanCode === "SEREBU" || voucher.code === "SEREBU" || voucher.discount_type === "SET_PRICE") {
        calculated_discount = Math.max(purchaseAmount - 1000, 0);
      } else if (voucher.discount_type === "PERCENT") {
        calculated_discount = Math.round((purchaseAmount * Number(voucher.discount_value)) / 100);
      } else {
        calculated_discount = Number(voucher.discount_value);
      }

      if (calculated_discount > purchaseAmount) {
        calculated_discount = purchaseAmount;
      }

      res.json({
        success: true,
        voucher: {
          id: voucher.id,
          code: voucher.code,
          discount_type: voucher.discount_type,
          discount_value: voucher.discount_value,
          calculated_discount
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Gagal memvalidasi voucher." });
    }
  });

  // 4. Real Analytics Event Tracking
  app.post("/api/adrienfandra/analytics/track", async (req: Request, res: Response) => {
    try {
      const { eventType, productId, productTitle, visitorId, referrer, metadata } = req.body;
      if (!eventType) {
        return res.status(400).json({ success: false, error: "eventType is required" });
      }

      const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
      const userAgent = (req.headers["user-agent"] as string) || "";

      await db.execute(sql`
        INSERT INTO adrien_analytics_events (
          event_type, product_id, product_title, visitor_id, ip_address, user_agent, referrer, metadata
        ) VALUES (
          ${eventType},
          ${productId ? Number(productId) : null},
          ${productTitle || null},
          ${visitorId || null},
          ${ip},
          ${userAgent},
          ${referrer || null},
          ${JSON.stringify(metadata || {})}::jsonb
        )
      `);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Checkout & Pembuatan Transaksi Gateway
  app.post("/api/adrienfandra/checkout", async (req: Request, res: Response) => {
    try {
      const {
        productId,
        customerName,
        customerEmail,
        customerPhone,
        voucherCode,
        paymentMethod = "SQ",
        additionalAnswers = {}
      } = req.body;

      if (!productId || !customerName || !customerEmail || !customerPhone) {
        return res.status(400).json({ error: "Lengkapi semua data pembeli (Nama, Email, dan No. WhatsApp)." });
      }

      const cleanEmail = customerEmail.trim().toLowerCase();

      const prodRes = await db.execute(sql`SELECT * FROM adrien_products WHERE id = ${Number(productId)} LIMIT 1`);
      if (!prodRes.rows || prodRes.rows.length === 0) {
        return res.status(404).json({ error: "Produk yang dipilih tidak valid." });
      }
      const product: any = prodRes.rows[0];

      const subtotal = Number(product.sale_price);
      let discountAmount = 0;

      if (voucherCode) {
        const vRes = await db.execute(sql`
          SELECT * FROM adrien_vouchers 
          WHERE UPPER(code) = ${voucherCode.trim().toUpperCase()} AND is_active = true 
          LIMIT 1
        `);
        if (vRes.rows && vRes.rows.length > 0) {
          const voucher: any = vRes.rows[0];
          const cleanVoucherCode = voucherCode.trim().toUpperCase();

          const isBundleProduct = Number(product.id) === 2 || 
                                 (product.slug || "").includes("bundling") || 
                                 (product.title || "").toLowerCase().includes("bundling");

          const isBundlingRestricted = cleanVoucherCode === "AF14" || 
                                      (voucher.applicable_product_id && Number(voucher.applicable_product_id) === 2);

          if (isBundlingRestricted && !isBundleProduct) {
            return res.status(400).json({
              error: `Kode promo ${cleanVoucherCode} hanya berlaku khusus untuk Paket Bundling 3 Buku.`
            });
          }

          if (voucher.applicable_product_id && Number(voucher.applicable_product_id) !== Number(product.id) && !isBundleProduct) {
            return res.status(400).json({
              error: `Kode promo ${cleanVoucherCode} tidak dapat digunakan untuk produk ini.`
            });
          }

          if (cleanVoucherCode === "SEREBU" || voucher.code === "SEREBU" || voucher.discount_type === "SET_PRICE") {
            discountAmount = Math.max(subtotal - 1000, 0);
          } else if (voucher.discount_type === "PERCENT") {
            discountAmount = Math.round((subtotal * Number(voucher.discount_value)) / 100);
          } else {
            discountAmount = Number(voucher.discount_value);
          }
          if (discountAmount > subtotal) discountAmount = subtotal;
        }
      }

      const totalAmount = Math.max(subtotal - discountAmount, 1000);
      const merchantOrderId = `AF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const merchantCode = process.env.DUITKU_MERCHANT_CODE?.trim() || "D23626";
      const merchantKey = process.env.DUITKU_MERCHANT_KEY?.trim() || "399b0aaaff486146d0bf1c75019c89c4";

      const signatureRaw = merchantCode + merchantOrderId + totalAmount + merchantKey;
      const signature = crypto.createHash("md5").update(signatureRaw).digest("hex");

      const duitkuPayload = {
        merchantCode: merchantCode,
        paymentAmount: totalAmount,
        merchantOrderId: merchantOrderId,
        productDetails: `E-Book: ${product.title.substring(0, 45)}`,
        email: cleanEmail,
        phoneNumber: customerPhone || "089688113210",
        customerVaName: customerName || "Pembeli E-Book",
        itemDetails: [{ name: product.title.substring(0, 40), price: totalAmount, quantity: 1 }],
        returnUrl: `https://bilano.app/adrienfandra/order/${merchantOrderId}`,
        callbackUrl: "https://bilano.app/api/adrienfandra/payment/webhook",
        signature: signature,
        paymentMethod: paymentMethod
      };

      let duitkuData: any = null;
      let qrCode = "";
      let vaNumber = "";
      let paymentUrl = "";
      let reference = "";

      try {
        const duitkuRes = await fetch("https://passport.duitku.com/webapi/api/merchant/v2/inquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(duitkuPayload)
        });

        const textData = await duitkuRes.text();
        try {
          duitkuData = JSON.parse(textData);
          if (duitkuData && duitkuData.statusCode === "00") {
            qrCode = duitkuData.qrCode || duitkuData.qrString || "";
            vaNumber = duitkuData.vaNumber || "";
            paymentUrl = duitkuData.paymentUrl || "";
            reference = duitkuData.reference || "";
          }
        } catch (e) {}
      } catch (duitkuErr) {}

      await db.execute(sql`
        INSERT INTO adrien_orders (
          merchant_order_id, product_id, product_title, customer_name, customer_email, customer_phone,
          additional_answers, subtotal, discount_amount, total_amount, voucher_code, payment_method,
          payment_status, duitku_reference, duitku_payment_url, duitku_va_number, duitku_qr_code
        ) VALUES (
          ${merchantOrderId}, ${product.id}, ${product.title}, ${customerName}, ${cleanEmail}, ${customerPhone},
          ${JSON.stringify(additionalAnswers)}::jsonb, ${subtotal}, ${discountAmount}, ${totalAmount}, ${voucherCode || null}, ${paymentMethod},
          'PENDING', ${reference || null}, ${paymentUrl || null}, ${vaNumber || null}, ${qrCode || null}
        );
      `);

      // Track checkout event automatically
      const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
      db.execute(sql`
        INSERT INTO adrien_analytics_events (event_type, product_id, product_title, ip_address, metadata)
        VALUES ('CHECKOUT_START', ${product.id}, ${product.title}, ${ip}, ${JSON.stringify({ orderId: merchantOrderId, email: cleanEmail, totalAmount })}::jsonb)
      `).catch(() => {});

      res.json({
        success: true,
        orderId: merchantOrderId,
        product: { id: product.id, title: product.title },
        subtotal,
        discountAmount,
        totalAmount,
        paymentMethod,
        paymentData: {
          merchantOrderId,
          qrCode,
          vaNumber,
          paymentUrl,
          reference,
          statusCode: duitkuData?.statusCode || "00"
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Gagal memproses pesanan: " + error.message });
    }
  });

  // 6. Cek Status Pembayaran (Polling & Realtime Verification)
  app.post("/api/adrienfandra/payment/check-status", async (req: Request, res: Response) => {
    try {
      const { merchantOrderId } = req.body;
      if (!merchantOrderId) return res.status(400).json({ error: "Order ID diperlukan." });

      const orderRes = await db.execute(sql`
        SELECT o.*, p.title as prod_title, p.pdf_filename, p.pdf_data_base64
        FROM adrien_orders o
        JOIN adrien_products p ON o.product_id = p.id
        WHERE o.merchant_order_id = ${merchantOrderId}
        LIMIT 1
      `);

      if (!orderRes.rows || orderRes.rows.length === 0) {
        return res.status(404).json({ error: "Pesanan tidak ditemukan." });
      }

      const order: any = orderRes.rows[0];

      if (order.payment_status === "PAID") {
        if (!order.email_sent) {
          sendCustomerDeliveryEmail(order, order).catch(() => {});
        }
        return res.json({
          success: true,
          isPaid: true,
          orderId: order.merchant_order_id,
          downloadUrl: `/api/adrienfandra/download/${order.merchant_order_id}`,
          readUrl: `/adrienfandra/order/${order.merchant_order_id}`
        });
      }

      const merchantCode = process.env.DUITKU_MERCHANT_CODE?.trim() || "D23626";
      const merchantKey = process.env.DUITKU_MERCHANT_KEY?.trim() || "399b0aaaff486146d0bf1c75019c89c4";
      const signatureRaw = merchantCode + merchantOrderId + merchantKey;
      const signature = crypto.createHash("md5").update(signatureRaw).digest("hex");

      let isPaid = false;
      try {
        const duitkuRes = await fetch("https://passport.duitku.com/webapi/api/merchant/transactionStatus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantCode: merchantCode,
            merchantOrderId: merchantOrderId,
            signature: signature
          })
        });

        const data = await duitkuRes.json();
        if (data && data.statusCode === "00") {
          isPaid = true;
        }
      } catch (err) {}

      if (isPaid) {
        await db.execute(sql`
          UPDATE adrien_orders 
          SET payment_status = 'PAID', paid_at = NOW() 
          WHERE merchant_order_id = ${merchantOrderId}
        `);

        // Track purchase success
        db.execute(sql`
          INSERT INTO adrien_analytics_events (event_type, product_id, product_title, metadata)
          VALUES ('PURCHASE_SUCCESS', ${order.product_id}, ${order.prod_title}, ${JSON.stringify({ orderId: merchantOrderId, amount: order.total_amount })}::jsonb)
        `).catch(() => {});

        sendCustomerDeliveryEmail(order, order).catch(() => {});

        return res.json({
          success: true,
          isPaid: true,
          orderId: order.merchant_order_id,
          downloadUrl: `/api/adrienfandra/download/${order.merchant_order_id}`,
          readUrl: `/adrienfandra/order/${order.merchant_order_id}`
        });
      }

      res.json({
        success: true,
        isPaid: false,
        status: order.payment_status
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. Webhook Gateway
  const handleWebhook = async (req: Request, res: Response) => {
    try {
      const { merchantOrderId, resultCode } = req.body;
      if (resultCode === "00" && merchantOrderId) {
        const orderRes = await db.execute(sql`
          SELECT o.*, p.title as prod_title, p.pdf_filename, p.pdf_data_base64
          FROM adrien_orders o
          JOIN adrien_products p ON o.product_id = p.id
          WHERE o.merchant_order_id = ${merchantOrderId}
          LIMIT 1
        `);

        if (orderRes.rows && orderRes.rows.length > 0) {
          const order: any = orderRes.rows[0];
          await db.execute(sql`
            UPDATE adrien_orders 
            SET payment_status = 'PAID', paid_at = NOW() 
            WHERE merchant_order_id = ${merchantOrderId}
          `);

          // Track analytics event
          db.execute(sql`
            INSERT INTO adrien_analytics_events (event_type, product_id, product_title, metadata)
            VALUES ('PURCHASE_SUCCESS', ${order.product_id}, ${order.prod_title}, ${JSON.stringify({ orderId: merchantOrderId, amount: order.total_amount })}::jsonb)
          `).catch(() => {});

          if (!order.email_sent) {
            await sendCustomerDeliveryEmail(order, order);
          }
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).send("Internal Error");
    }
  };

  app.post("/api/adrienfandra/payment/webhook", handleWebhook);
  app.post("/api/payment/duitku-webhook", handleWebhook);

  // 8. Ambil Detail Order
  app.get("/api/adrienfandra/order/:orderId", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const result = await db.execute(sql`
        SELECT o.id, o.merchant_order_id, o.product_id, o.product_title, o.customer_name,
               o.customer_email, o.customer_phone, o.total_amount, o.payment_status, o.payment_method,
               o.email_sent, o.paid_at, o.created_at,
               p.cover_url, p.pdf_filename, (p.pdf_data_base64 IS NOT NULL) AS has_custom_pdf,
               p.whatsapp_number
          FROM adrien_orders o
          JOIN adrien_products p ON o.product_id = p.id
         WHERE o.merchant_order_id = ${orderId}
         LIMIT 1
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Pesanan tidak ditemukan." });
      }

      const orderData: any = result.rows[0];
      const isBundle = Number(orderData.product_id) === 2 || 
        (orderData.product_title || "").toLowerCase().includes("bundling");

      const bundleItems = isBundle ? BUNDLE_BOOKS.map(b => ({
        id: b.order,
        key: b.key,
        title: b.title,
        subtitle: b.subtitle,
        filename: b.filename,
        coverUrl: b.coverUrl,
        downloadUrl: `/api/adrienfandra/download/${orderData.merchant_order_id}?book=${b.key}`,
        readUrl: `/adrienfandra/read/${orderData.merchant_order_id}?book=${b.key}`
      })) : null;

      res.json({
        success: true,
        order: {
          ...orderData,
          is_bundle: isBundle,
          bundle_items: bundleItems
        },
        downloadUrl: `/api/adrienfandra/download/${orderData.merchant_order_id}`,
        isBundle,
        bundleItems
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Gagal memuat pesanan." });
    }
  });

  // 9. Download PDF (Mendukung parameter ?book=logika | full | gudang untuk bundling)
  app.get("/api/adrienfandra/download/:orderId", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const bookKey = (req.query.book as string) || (req.query.item as string) || "";

      const orderRes = await db.execute(sql`
        SELECT o.*, p.title as prod_title, p.slug as prod_slug, p.pdf_filename, p.pdf_data_base64
        FROM adrien_orders o
        JOIN adrien_products p ON o.product_id = p.id
        WHERE o.merchant_order_id = ${orderId}
        LIMIT 1
      `);

      if (!orderRes.rows || orderRes.rows.length === 0) {
        return res.status(404).send("Pesanan tidak ditemukan.");
      }

      const order: any = orderRes.rows[0];
      const { buffer: pdfBuffer, filename } = await getEbookPdfBuffer(
        { 
          id: order.product_id, 
          title: order.prod_title, 
          slug: order.prod_slug, 
          pdf_filename: order.pdf_filename, 
          pdf_data_base64: order.pdf_data_base64 
        },
        order.customer_name,
        order.merchant_order_id,
        bookKey
      );

      const safeFilename = filename.replace(/["\\]/g, "");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(pdfBuffer);
    } catch (error: any) {
      res.status(500).send("Gagal mengunduh file PDF: " + error.message);
    }
  });

  // 10. Baca Online (Mendukung parameter ?book=logika | full | gudang untuk bundling)
  app.get("/api/adrienfandra/read-pdf/:orderId", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const bookKey = (req.query.book as string) || (req.query.item as string) || "";

      const orderRes = await db.execute(sql`
        SELECT o.*, p.title as prod_title, p.slug as prod_slug, p.pdf_filename, p.pdf_data_base64
        FROM adrien_orders o
        JOIN adrien_products p ON o.product_id = p.id
        WHERE o.merchant_order_id = ${orderId}
        LIMIT 1
      `);

      if (!orderRes.rows || orderRes.rows.length === 0) {
        return res.status(404).send("Dokumen tidak ditemukan.");
      }

      const order: any = orderRes.rows[0];
      const { buffer: pdfBuffer, filename } = await getEbookPdfBuffer(
        { 
          id: order.product_id, 
          title: order.prod_title, 
          slug: order.prod_slug, 
          pdf_filename: order.pdf_filename, 
          pdf_data_base64: order.pdf_data_base64 
        },
        order.customer_name,
        order.merchant_order_id,
        bookKey
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (error: any) {
      res.status(500).send("Gagal membuka PDF: " + error.message);
    }
  });

  // =========================================================================
  // 🔐 ENDPOINT ADMIN / MANAGER (PASSWORD: Adrien1401 + RESTRICTED EMAIL)
  // =========================================================================

  // Middleware Pengecekan Admin
  const verifyAdrienAdminMiddleware = (req: Request, res: Response, next: any) => {
    const adminEmail = (req.headers["x-admin-email"] as string) || (req.headers["x-user-email"] as string);
    if (!isAdrienAdmin(adminEmail)) {
      return res.status(403).json({
        success: false,
        error: "Akses ditolak."
      });
    }
    next();
  };

  // Login Manager
  app.post("/api/adrienfandra/admin/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email dan password harus diisi." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      if (!isAdrienAdmin(cleanEmail)) {
        return res.status(403).json({ success: false, error: "Email tidak terdaftar sebagai pengelola toko." });
      }

      const settingsRes = await db.execute(sql`SELECT admin_password FROM adrien_store_settings LIMIT 1`);
      const storedPassword = settingsRes.rows[0]?.admin_password || ADMIN_PASSWORD_DEFAULT;

      if (cleanPass !== storedPassword && cleanPass !== ADMIN_PASSWORD_DEFAULT) {
        return res.status(401).json({ success: false, error: "Email atau password yang Anda masukkan salah." });
      }

      res.json({
        success: true,
        email: cleanEmail,
        message: "Login berhasil."
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: "Terjadi kesalahan server saat login." });
    }
  });

  // Ambil Semua Data & Analitik Real-Time Manager
  app.get("/api/adrienfandra/admin/data", verifyAdrienAdminMiddleware, async (_req: Request, res: Response) => {
    try {
      await ensureAdrienStoreTables();

      const [
        settingsRes,
        productsRes,
        ordersRes,
        vouchersRes,
        pageViewsRes,
        uniqueVisitorsRes,
        productClicksRes,
        recentEventsRes,
        productClickCountsRes,
        checkoutEventsRes
      ] = await Promise.all([
        db.execute(sql`SELECT * FROM adrien_store_settings LIMIT 1`),
        db.execute(sql`SELECT id, slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price, sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number, pdf_filename, is_active, sort_order, created_at, (pdf_data_base64 IS NOT NULL) AS has_custom_pdf FROM adrien_products ORDER BY sort_order ASC, id ASC`),
        db.execute(sql`SELECT * FROM adrien_orders ORDER BY created_at DESC LIMIT 500`),
        db.execute(sql`SELECT * FROM adrien_vouchers ORDER BY created_at DESC`),
        db.execute(sql`SELECT COUNT(*) as count FROM adrien_analytics_events WHERE event_type = 'PAGE_VIEW'`),
        db.execute(sql`SELECT COUNT(DISTINCT visitor_id) as count FROM adrien_analytics_events WHERE visitor_id IS NOT NULL AND visitor_id != ''`),
        db.execute(sql`SELECT COUNT(*) as count FROM adrien_analytics_events WHERE event_type = 'PRODUCT_CLICK'`),
        db.execute(sql`SELECT * FROM adrien_analytics_events ORDER BY created_at DESC LIMIT 60`),
        db.execute(sql`
          SELECT product_id, COUNT(*) as click_count 
          FROM adrien_analytics_events 
          WHERE event_type = 'PRODUCT_CLICK' AND product_id IS NOT NULL 
          GROUP BY product_id
        `),
        db.execute(sql`SELECT COUNT(*) as count FROM adrien_analytics_events WHERE event_type IN ('CHECKOUT_START', 'CHECKOUT_OPEN')`)
      ]);

      const orders = ordersRes.rows || [];
      const paidOrders = orders.filter((o: any) => o.payment_status === "PAID");
      const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

      const totalPageViews = Number(pageViewsRes.rows[0]?.count || 0);
      const uniqueVisitors = Number(uniqueVisitorsRes.rows[0]?.count || 0);
      const totalProductClicks = Number(productClicksRes.rows[0]?.count || 0);
      const checkoutEventsCount = Number(checkoutEventsRes.rows[0]?.count || 0);
      const totalCheckouts = Math.max(orders.length, checkoutEventsCount);
      const paidOrdersCount = paidOrders.length;

      // Click breakdown map by productId
      const clickMap: Record<number, number> = {};
      (productClickCountsRes.rows || []).forEach((r: any) => {
        if (r.product_id) clickMap[Number(r.product_id)] = Number(r.click_count);
      });

      // Augment products with real analytics
      const productsWithAnalytics = (productsRes.rows || []).map((p: any) => {
        const prodOrders = orders.filter((o: any) => Number(o.product_id) === Number(p.id));
        const prodPaid = prodOrders.filter((o: any) => o.payment_status === "PAID");
        const prodRevenue = prodPaid.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
        const views = clickMap[Number(p.id)] || 0;
        return {
          ...p,
          views_count: views,
          checkouts_count: prodOrders.length,
          purchases_count: prodPaid.length,
          revenue: prodRevenue,
          conversion_rate: views > 0 ? ((prodPaid.length / views) * 100).toFixed(1) + "%" : "0%"
        };
      });

      const pendingOrders = orders.filter((o: any) => o.payment_status === "PENDING");
      const pendingOrdersCount = pendingOrders.length;
      const clickThroughRate = totalPageViews > 0 
        ? ((totalProductClicks / totalPageViews) * 100).toFixed(1) + "%" 
        : "0%";
      const averageOrderValue = paidOrdersCount > 0 
        ? Math.round(totalRevenue / paidOrdersCount) 
        : 0;

      const funnel = [
        { 
          step: "Kunjungan Toko (Page Views)", 
          count: totalPageViews, 
          percentage: "100%",
          description: "Pengunjung yang membuka katalog e-book"
        },
        { 
          step: "Eksplorasi E-Book (Product Clicks)", 
          count: totalProductClicks, 
          percentage: totalPageViews > 0 ? ((totalProductClicks / totalPageViews) * 100).toFixed(1) + "%" : "0%",
          description: "Pengunjung yang mengklik atau melihat detail e-book"
        },
        { 
          step: "Mulai Checkout (Checkouts)", 
          count: totalCheckouts, 
          percentage: totalProductClicks > 0 ? ((totalCheckouts / totalProductClicks) * 100).toFixed(1) + "%" : "0%",
          description: "Pengunjung yang masuk ke tahap formulir pemesanan"
        },
        { 
          step: "Pembayaran Lunas (Purchases)", 
          count: paidOrdersCount, 
          percentage: totalCheckouts > 0 ? ((paidOrdersCount / totalCheckouts) * 100).toFixed(1) + "%" : "0%",
          description: "Pembeli yang berhasil menyelesaikan transaksi pembayaran"
        }
      ];

      res.json({
        success: true,
        stats: {
          totalPageViews,
          uniqueVisitors,
          totalProductClicks,
          totalCheckouts,
          paidOrdersCount,
          pendingOrdersCount,
          totalRevenue,
          conversionRate: uniqueVisitors > 0 
            ? ((paidOrdersCount / uniqueVisitors) * 100).toFixed(1) + "%" 
            : totalPageViews > 0 ? ((paidOrdersCount / totalPageViews) * 100).toFixed(1) + "%" : "0%",
          clickThroughRate,
          checkoutConversionRate: totalCheckouts > 0 
            ? ((paidOrdersCount / totalCheckouts) * 100).toFixed(1) + "%" 
            : "0%",
          averageOrderValue
        },
        analytics: {
          totalPageViews,
          uniqueVisitors,
          totalProductClicks,
          totalCheckouts,
          paidOrdersCount,
          pendingOrdersCount,
          totalRevenue,
          conversionRate: uniqueVisitors > 0 
            ? ((paidOrdersCount / uniqueVisitors) * 100).toFixed(1) + "%" 
            : "0%",
          clickThroughRate,
          checkoutConversionRate: totalCheckouts > 0 
            ? ((paidOrdersCount / totalCheckouts) * 100).toFixed(1) + "%" 
            : "0%",
          averageOrderValue,
          funnel,
          recentEvents: recentEventsRes.rows || [],
          productStats: productsWithAnalytics
        },
        settings: settingsRes.rows[0] || {},
        products: productsWithAnalytics,
        orders: orders,
        vouchers: vouchersRes.rows || []
      });
    } catch (error: any) {
      console.error("[AdrienStore] Error fetching admin data:", error);
      res.status(500).json({ success: false, error: "Gagal memuat data manager." });
    }
  });

  // Reset Data Analitik & Pesanan Toko (Hanya Admin)
  app.post("/api/adrienfandra/admin/reset-data", verifyAdrienAdminMiddleware, async (_req: Request, res: Response) => {
    try {
      await db.execute(sql`TRUNCATE TABLE adrien_orders RESTART IDENTITY;`);
      await db.execute(sql`TRUNCATE TABLE adrien_analytics_events RESTART IDENTITY;`);
      await db.execute(sql`UPDATE adrien_products SET reader_count = 0;`);
      await db.execute(sql`UPDATE adrien_vouchers SET times_used = 0;`);
      invalidateStoreDataCache();
      res.json({ success: true, message: "Semua data transaksi dan analitik toko berhasil direset ke 0." });
    } catch (error: any) {
      console.error("[AdrienStore] Error resetting store data:", error);
      res.status(500).json({ success: false, error: "Gagal mereset data: " + error.message });
    }
  });

  // Simpan / Perbarui Settings Toko & Header Hero & Slot Gambar 1, 2, 3
  app.post("/api/adrienfandra/admin/settings", verifyAdrienAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const {
        store_name,
        store_tagline,
        header_title,
        header_subtitle,
        header_hook,
        header_image,
        header_badge,
        slot_images,
        whatsapp_number,
        support_email,
        admin_password
      } = req.body;

      // Cek apakah row settings sudah ada
      const countCheck = await db.execute(sql`SELECT COUNT(*) FROM adrien_store_settings`);
      if (Number(countCheck.rows[0]?.count || 0) === 0) {
        await db.execute(sql`
          INSERT INTO adrien_store_settings (
            store_name, store_tagline, header_title, header_subtitle, header_hook, header_image, header_badge,
            slot_images, whatsapp_number, support_email, admin_password, banner_slots_count
          ) VALUES (
            ${store_name || 'Adrien Fandra Store'},
            ${store_tagline || 'E-Book & Panduan Praktis Akuntansi Bisnis'},
            ${header_title || 'AdrienFandra.id'},
            ${header_subtitle || 'Adrien Fandra | Praktisi & Konsultan Akuntansi'},
            ${header_hook || 'siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet'},
            ${header_image || ''},
            ${header_badge || 'Book Now'},
            ${JSON.stringify(slot_images || ["", "", ""])}::jsonb,
            ${whatsapp_number || DEFAULT_WHATSAPP},
            ${support_email || 'adrienfandra14@gmail.com'},
            ${admin_password || ADMIN_PASSWORD_DEFAULT},
            3
          );
        `);
      } else {
        await db.execute(sql`
          UPDATE adrien_store_settings 
          SET store_name = ${store_name || 'Adrien Fandra Store'},
              store_tagline = ${store_tagline || 'E-Book & Panduan Praktis Akuntansi Bisnis'},
              header_title = ${header_title || 'AdrienFandra.id'},
              header_subtitle = ${header_subtitle || 'Adrien Fandra | Praktisi & Konsultan Akuntansi'},
              header_hook = ${header_hook || 'siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet'},
              header_image = ${header_image || ''},
              header_badge = ${header_badge || 'Book Now'},
              slot_images = ${JSON.stringify(slot_images || ["", "", ""])}::jsonb,
              whatsapp_number = ${whatsapp_number || DEFAULT_WHATSAPP},
              support_email = ${support_email || 'adrienfandra14@gmail.com'},
              admin_password = ${admin_password || ADMIN_PASSWORD_DEFAULT},
              updated_at = NOW()
          WHERE id = (SELECT id FROM adrien_store_settings ORDER BY id ASC LIMIT 1)
        `);
      }

      const updated = await db.execute(sql`SELECT * FROM adrien_store_settings LIMIT 1`);
      invalidateStoreDataCache();
      res.json({ success: true, message: "Pengaturan berhasil diperbarui.", settings: updated.rows[0] });
    } catch (error: any) {
      console.error("[AdrienStore] Settings update error:", error);
      res.status(500).json({ success: false, error: "Gagal menyimpan pengaturan: " + error.message });
    }
  });

  // Tambah / Edit Produk E-Book
  app.post("/api/adrienfandra/admin/products", verifyAdrienAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const {
        id,
        title,
        subtitle,
        category,
        cover_url,
        promo_images = [],
        regular_price,
        sale_price,
        sales_headline,
        sales_body,
        highlights = [],
        testimonials = [],
        scarcity_text,
        reader_count,
        whatsapp_number,
        pdf_filename,
        pdf_data_base64,
        is_active = true,
        sort_order = 0
      } = req.body;

      if (!title) return res.status(400).json({ error: "Judul E-Book wajib diisi." });

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") + `-${Date.now().toString().slice(-4)}`;

      if (id) {
        let updateQuery;
        if (pdf_data_base64) {
          updateQuery = sql`
            UPDATE adrien_products
            SET title = ${title},
                subtitle = ${subtitle || null},
                category = ${category || 'E-Book'},
                cover_url = ${cover_url || ''},
                promo_images = ${JSON.stringify(promo_images)}::jsonb,
                regular_price = ${Number(regular_price) || 145000},
                sale_price = ${Number(sale_price) || 99000},
                sales_headline = ${sales_headline || null},
                sales_body = ${sales_body || null},
                highlights = ${JSON.stringify(highlights)}::jsonb,
                testimonials = ${JSON.stringify(testimonials)}::jsonb,
                scarcity_text = ${scarcity_text || null},
                reader_count = ${Number(reader_count) || 4000},
                whatsapp_number = ${whatsapp_number || DEFAULT_WHATSAPP},
                pdf_filename = ${pdf_filename || 'Ebook.pdf'},
                pdf_data_base64 = ${pdf_data_base64},
                is_active = ${is_active},
                sort_order = ${Number(sort_order) || 0},
                updated_at = NOW()
            WHERE id = ${Number(id)}
          `;
        } else {
          updateQuery = sql`
            UPDATE adrien_products
            SET title = ${title},
                subtitle = ${subtitle || null},
                category = ${category || 'E-Book'},
                cover_url = ${cover_url || ''},
                promo_images = ${JSON.stringify(promo_images)}::jsonb,
                regular_price = ${Number(regular_price) || 145000},
                sale_price = ${Number(sale_price) || 99000},
                sales_headline = ${sales_headline || null},
                sales_body = ${sales_body || null},
                highlights = ${JSON.stringify(highlights)}::jsonb,
                testimonials = ${JSON.stringify(testimonials)}::jsonb,
                scarcity_text = ${scarcity_text || null},
                reader_count = ${Number(reader_count) || 4000},
                whatsapp_number = ${whatsapp_number || DEFAULT_WHATSAPP},
                is_active = ${is_active},
                sort_order = ${Number(sort_order) || 0},
                updated_at = NOW()
            WHERE id = ${Number(id)}
          `;
        }
        await db.execute(updateQuery);
      } else {
        await db.execute(sql`
          INSERT INTO adrien_products (
            slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
            sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count,
            whatsapp_number, pdf_filename, pdf_data_base64, is_active, sort_order
          ) VALUES (
            ${slug}, ${title}, ${subtitle || null}, ${category || 'E-Book'}, ${cover_url || ''},
            ${JSON.stringify(promo_images)}::jsonb, ${Number(regular_price) || 145000}, ${Number(sale_price) || 99000},
            ${sales_headline || null}, ${sales_body || null}, ${JSON.stringify(highlights)}::jsonb,
            ${JSON.stringify(testimonials)}::jsonb, ${scarcity_text || null}, ${Number(reader_count) || 4000},
            ${whatsapp_number || DEFAULT_WHATSAPP}, ${pdf_filename || 'Ebook.pdf'}, ${pdf_data_base64 || null},
            ${is_active}, ${Number(sort_order) || 0}
          )
        `);
      }

      invalidateStoreDataCache();
      res.json({ success: true, message: "E-Book berhasil disimpan." });
    } catch (error: any) {
      console.error("[AdrienStore] Product save error:", error);
      res.status(500).json({ success: false, error: "Gagal menyimpan produk: " + error.message });
    }
  });

  // Hapus Produk
  app.delete("/api/adrienfandra/admin/products/:id", verifyAdrienAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM adrien_products WHERE id = ${Number(id)}`);
      invalidateStoreDataCache();
      res.json({ success: true, message: "Produk berhasil dihapus." });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Kirim Ulang Email PDF ke Customer
  app.post("/api/adrienfandra/admin/orders/:orderId/resend-email", verifyAdrienAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const orderRes = await db.execute(sql`
        SELECT o.*, p.title as prod_title, p.pdf_filename, p.pdf_data_base64
        FROM adrien_orders o
        JOIN adrien_products p ON o.product_id = p.id
        WHERE o.merchant_order_id = ${orderId}
        LIMIT 1
      `);

      if (!orderRes.rows || orderRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Pesanan tidak ditemukan." });
      }

      const order: any = orderRes.rows[0];
      const sent = await sendCustomerDeliveryEmail(order, order);

      if (sent) {
        res.json({ success: true, message: `Email file PDF berhasil dikirim ulang ke ${order.customer_email}.` });
      } else {
        res.status(500).json({ success: false, error: "Gagal mengirim email." });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Tandai Lunas Manual
  app.post("/api/adrienfandra/admin/orders/:orderId/mark-paid", verifyAdrienAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const orderRes = await db.execute(sql`
        SELECT o.*, p.title as prod_title, p.pdf_filename, p.pdf_data_base64
        FROM adrien_orders o
        JOIN adrien_products p ON o.product_id = p.id
        WHERE o.merchant_order_id = ${orderId}
        LIMIT 1
      `);

      if (!orderRes.rows || orderRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Pesanan tidak ditemukan." });
      }

      const order: any = orderRes.rows[0];
      await db.execute(sql`
        UPDATE adrien_orders 
        SET payment_status = 'PAID', paid_at = NOW() 
        WHERE merchant_order_id = ${orderId}
      `);

      // Track analytics
      db.execute(sql`
        INSERT INTO adrien_analytics_events (event_type, product_id, product_title, metadata)
        VALUES ('PURCHASE_SUCCESS', ${order.product_id}, ${order.prod_title}, ${JSON.stringify({ orderId, amount: order.total_amount, manual: true })}::jsonb)
      `).catch(() => {});

      sendCustomerDeliveryEmail(order, order).catch(() => {});

      res.json({ success: true, message: "Pesanan berhasil ditandai LUNAS." });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Buat Voucher
  app.post("/api/adrienfandra/admin/vouchers", verifyAdrienAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const { code, discount_type = "FIXED", discount_value, min_spend = 0, usage_limit = 100 } = req.body;
      if (!code || !discount_value) return res.status(400).json({ error: "Lengkapi kode voucher & nominal diskon." });

      await db.execute(sql`
        INSERT INTO adrien_vouchers (code, discount_type, discount_value, min_spend, usage_limit, is_active)
        VALUES (${code.trim().toUpperCase()}, ${discount_type}, ${Number(discount_value)}, ${Number(min_spend)}, ${Number(usage_limit)}, true)
      `);

      res.json({ success: true, message: "Voucher berhasil ditambahkan." });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Hapus Voucher
  app.delete("/api/adrienfandra/admin/vouchers/:id", verifyAdrienAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM adrien_vouchers WHERE id = ${Number(id)}`);
      res.json({ success: true, message: "Voucher berhasil dihapus." });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
