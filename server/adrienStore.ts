import { type Express, type Request, type Response } from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";
import { db } from "./db.js";
import { sql } from "drizzle-orm";

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
          'AdrienFandra.id',
          'Adrien Fandra | Praktisi & Konsultan Akuntansi',
          'siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet',
          '',
          'Book Now',
          '["", "", ""]'::jsonb,
          '+6289688113210',
          'adrienfandra14@gmail.com',
          'Adrien1401',
          3
        );
      `);
    }

    // 2. Cek Produk Ebook
    const productCheck = await db.execute(sql`SELECT COUNT(*) FROM adrien_products`);
    if (Number(productCheck.rows[0]?.count || 0) === 0) {
      // Produk 1: Paket Bundling 4 in 1 Akuntansi
      await db.execute(sql`
        INSERT INTO adrien_products (
          slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
          sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number,
          pdf_filename, is_active, sort_order
        ) VALUES (
          'paket-bundling-4in1',
          'Paket Bundling 4 in 1: Jago Akuntansi & Laporan Keuangan Bisnis',
          'Dari nol jurnal sampai bisa susun & analisis Laporan Keuangan dengan percaya diri',
          'BUNDLING 4 IN 1 AKUNTANSI',
          '',
          '[]'::jsonb,
          145000,
          99000,
          '4 E-book ini dibuat buat lo yang Sebenarnya punya bisnis/kerja tapi sering pusing saat baca Laporan Keuangan!',
          'Lewat 4 e-book ini, lo gak cuma belajar teori akuntansi membosankan, tapi diajak praktek langsung cara menyusun jurnal umum, buku besar, neraca saldo, hingga membaca laporan laba rugi dan arus kas dengan mudah & aplikatif.',
          '["Bisa menyusun jurnal umum & buku besar tanpa bingung debit kredit", "Paham cara membaca Laporan Laba Rugi & Neraca dalam 5 menit", "Deteksi kebocoran uang kas bisnis sejak dini", "Template spreadsheet & studi kasus riil siap pakai"]'::jsonb,
          '[
            {"name": "Arif Hady", "role": "Owner Bisnis Kuliner & Entrepreneur", "comment": "Buku akuntansi paling praktis yang pernah saya baca! Pembukuan usaha kuliner saya langsung rapi dan gak bocor lagi.", "rating": 5},
            {"name": "Fadhil R.", "role": "Finance Officer", "comment": "Penjelasan debit-kreditnya simpel banget, langsung paham alur laporan keuangan tahunan.", "rating": 5},
            {"name": "Dedi A.", "role": "UMKM Founder", "comment": "Dulu buta angka keuangan bisnis, sekarang bisa bikin neraca dan tahu profit bersih riil tiap bulan.", "rating": 5},
            {"name": "Zahra N.", "role": "Junior Accountant", "comment": "Sangat aplikatif buat mahasiswa & staf akuntansi pemula, ada template spreadsheet siap contek.", "rating": 5}
          ]'::jsonb,
          'Ingat Paket ini TERBATAS - Hanya Untuk 10 Orang',
          4310,
          '+6289688113210',
          'Paket_Bundling_4in1_Jago_Akuntansi_Bisnis.pdf',
          true,
          1
        );
      `);

      // Produk 2: Contekan Jurnal
      await db.execute(sql`
        INSERT INTO adrien_products (
          slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
          sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number,
          pdf_filename, is_active, sort_order
        ) VALUES (
          'contekan-jurnal-keuangan',
          'Contekan Jurnal & Laporan Keuangan: Siap Pakai untuk Bisnis & Mahasiswa',
          'Kumpulan Rumus & Template Jurnal Akuntansi Praktis Anti Bingung',
          'BEST SELLER',
          '',
          '[]'::jsonb,
          89000,
          49000,
          'Tinggal Contek Sesuai Transaksi Bisnis Lo!',
          '50+ Template pencatatan jurnal transaksi mulai dari kas, persediaan, piutang, hutang, hingga penyesuaian akhir periode.',
          '["50+ Template Jurnal Transaksi Harian Bisnis", "Cara Mudah Menghitung HPP (Harga Pokok Penjualan)", "Anti Bingung Jurnal Penyesuaian & Penyusutan Aset", "Format Siap Pakai di Excel / Spreadsheet"]'::jsonb,
          '[
            {"name": "Ghozi M.", "role": "Accounting Staff", "comment": "Contekan jurnalnya sangat ngebantu kerjaan bulanan saya, closing laporan jadi jauh lebih cepat!", "rating": 5}
          ]'::jsonb,
          'Promo Terbatas Minggu Ini',
          2840,
          '+6289688113210',
          'Contekan_Jurnal_Laporan_Keuangan.pdf',
          true,
          2
        );
      `);

      // Produk 3: 7 Hari Mahir Baca Laporan Keuangan
      await db.execute(sql`
        INSERT INTO adrien_products (
          slug, title, subtitle, category, cover_url, promo_images, regular_price, sale_price,
          sales_headline, sales_body, highlights, testimonials, scarcity_text, reader_count, whatsapp_number,
          pdf_filename, is_active, sort_order
        ) VALUES (
          '7-hari-mahir-laporan-keuangan',
          '7 Hari Mahir Baca & Analisis Laporan Keuangan',
          'Panduan Taktis Membaca Kesehatan Keuangan Bisnis dari Laba Rugi & Neraca',
          'POPULAR',
          '',
          '[]'::jsonb,
          75000,
          39000,
          'Ketahui Apakah Bisnis Anda Benar-Benar Untung atau Sekadar Ramai!',
          'Metode cepat 7 hari memahami pos-pos penting dalam Neraca, Laba Rugi, dan Arus Kas untuk pengambilan keputusan bisnis yang tepat.',
          '["Cara Cepat Mengetahui Rasio Profit & Likuiditas", "Trik Membaca Arus Kas Operasional vs Investasi", "Checklist Evaluasi Keuangan Bulanan"]'::jsonb,
          '[]'::jsonb,
          'Diskon Spesial Terbatas',
          1950,
          '+6289688113210',
          '7_Hari_Mahir_Baca_Laporan_Keuangan.pdf',
          true,
          3
        );
      `);
    }

    // 3. Cek Voucher Default
    const voucherCheck = await db.execute(sql`SELECT COUNT(*) FROM adrien_vouchers`);
    if (Number(voucherCheck.rows[0]?.count || 0) === 0) {
      await db.execute(sql`
        INSERT INTO adrien_vouchers (code, discount_type, discount_value, min_spend, usage_limit, times_used, is_active)
        VALUES 
        ('HEMAT10', 'PERCENT', 10, 0, 500, 0, true),
        ('ADRIEN15', 'PERCENT', 15, 50000, 200, 0, true);
      `);
    }

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
// 📧 PENGIRIMAN EMAIL OTOMATIS KE PEMBELI
// =========================================================================
export async function sendCustomerDeliveryEmail(order: any, product: any) {
  try {
    const transporter = getTransporter();
    const pdfFilename = product?.pdf_filename || `${product.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    
    // Siapkan buffer attachment PDF
    let pdfAttachmentBuffer: Buffer;
    if (product?.pdf_data_base64 && typeof product.pdf_data_base64 === "string" && product.pdf_data_base64.trim().length > 0) {
      const rawBase64 = product.pdf_data_base64.includes(",") 
        ? product.pdf_data_base64.split(",")[1] 
        : product.pdf_data_base64;
      pdfAttachmentBuffer = Buffer.from(rawBase64.trim(), "base64");
    } else {
      pdfAttachmentBuffer = generateEbookPDF(product.title, order.customer_name, order.merchant_order_id);
    }

    const downloadLink = `https://bilano.app/adrienfandra/order/${order.merchant_order_id}`;
    const formattedTotal = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.total_amount);

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
              Terima kasih! Pembayaran untuk e-book <strong>"${product.title}"</strong> telah kami terima dan diverifikasi.
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

            <a href="${downloadLink}" class="btn-download" target="_blank">
              DOWNLOAD & BUKA E-BOOK SEKARANG
            </a>

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
      attachments: [
        {
          filename: pdfFilename,
          content: pdfAttachmentBuffer,
          contentType: "application/pdf"
        }
      ]
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
export function setupAdrienStoreRoutes(app: Express) {
  
  // 1. Ambil Data Storefront Publik
  app.get("/api/adrienfandra/store-data", async (_req: Request, res: Response) => {
    try {
      await ensureAdrienStoreTables();

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
        header_title: "AdrienFandra.id",
        header_subtitle: "Adrien Fandra | Praktisi & Konsultan Akuntansi",
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

      res.json({
        success: true,
        settings: settingsData,
        products: productsRes.rows || []
      });
    } catch (error: any) {
      console.error("[AdrienStore] Error fetching store data:", error);
      res.status(500).json({ success: false, error: "Gagal mengambil data toko." });
    }
  });

  // 2. Ambil Detail 1 Produk Publik
  app.get("/api/adrienfandra/products/:idOrSlug", async (req: Request, res: Response) => {
    try {
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

      res.json({ success: true, product: row });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Gagal memuat produk." });
    }
  });

  // 3. Validasi Kupon Diskon
  app.post("/api/adrienfandra/voucher/validate", async (req: Request, res: Response) => {
    try {
      const { code, amount } = req.body;
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

      if (voucher.min_spend && purchaseAmount < Number(voucher.min_spend)) {
        return res.status(400).json({
          success: false,
          error: `Minimal pembelian untuk voucher ini adalah Rp ${Number(voucher.min_spend).toLocaleString("id-ID")}`
        });
      }

      let calculated_discount = 0;
      if (voucher.discount_type === "PERCENT") {
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
          if (voucher.discount_type === "PERCENT") {
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

      res.json({
        success: true,
        order: result.rows[0],
        downloadUrl: `/api/adrienfandra/download/${result.rows[0].merchant_order_id}`
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Gagal memuat pesanan." });
    }
  });

  // 9. Download PDF
  app.get("/api/adrienfandra/download/:orderId", async (req: Request, res: Response) => {
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
        return res.status(404).send("Pesanan tidak ditemukan.");
      }

      const order: any = orderRes.rows[0];
      const filename = order.pdf_filename || `${order.prod_title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      let pdfBuffer: Buffer;
      if (order.pdf_data_base64 && typeof order.pdf_data_base64 === "string" && order.pdf_data_base64.trim().length > 0) {
        const rawBase64 = order.pdf_data_base64.includes(",") 
          ? order.pdf_data_base64.split(",")[1] 
          : order.pdf_data_base64;
        pdfBuffer = Buffer.from(rawBase64.trim(), "base64");
      } else {
        pdfBuffer = generateEbookPDF(order.prod_title, order.customer_name, order.merchant_order_id);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (error: any) {
      res.status(500).send("Gagal mengunduh file PDF.");
    }
  });

  // 10. Baca Online
  app.get("/api/adrienfandra/read-pdf/:orderId", async (req: Request, res: Response) => {
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
        return res.status(404).send("Dokumen tidak ditemukan.");
      }

      const order: any = orderRes.rows[0];
      let pdfBuffer: Buffer;
      if (order.pdf_data_base64 && typeof order.pdf_data_base64 === "string" && order.pdf_data_base64.trim().length > 0) {
        const rawBase64 = order.pdf_data_base64.includes(",") 
          ? order.pdf_data_base64.split(",")[1] 
          : order.pdf_data_base64;
        pdfBuffer = Buffer.from(rawBase64.trim(), "base64");
      } else {
        pdfBuffer = generateEbookPDF(order.prod_title, order.customer_name, order.merchant_order_id);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${order.pdf_filename || 'Ebook.pdf'}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (error) {
      res.status(500).send("Gagal membuka PDF.");
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
        productClickCountsRes
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
        `)
      ]);

      const orders = ordersRes.rows || [];
      const paidOrders = orders.filter((o: any) => o.payment_status === "PAID");
      const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

      const totalPageViews = Number(pageViewsRes.rows[0]?.count || 0);
      const uniqueVisitors = Number(uniqueVisitorsRes.rows[0]?.count || 0);
      const totalProductClicks = Number(productClicksRes.rows[0]?.count || 0);
      const totalCheckouts = orders.length;
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

      res.json({
        success: true,
        stats: {
          totalPageViews,
          uniqueVisitors,
          totalProductClicks,
          totalCheckouts,
          paidOrdersCount,
          totalRevenue,
          conversionRate: totalPageViews > 0 
            ? ((paidOrdersCount / totalPageViews) * 100).toFixed(1) + "%" 
            : orders.length > 0 ? ((paidOrdersCount / orders.length) * 100).toFixed(1) + "%" : "0%",
          checkoutConversionRate: orders.length > 0 
            ? ((paidOrdersCount / orders.length) * 100).toFixed(1) + "%" 
            : "0%"
        },
        analytics: {
          totalPageViews,
          uniqueVisitors,
          totalProductClicks,
          totalCheckouts,
          paidOrdersCount,
          totalRevenue,
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
