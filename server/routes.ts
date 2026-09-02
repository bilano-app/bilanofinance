// @ts-nocheck
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertTransactionSchema, insertTargetSchema } from "../shared/schema.js";
import { z } from "zod";
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import { users } from "../shared/schema.js"; 
import { eq, desc, isNotNull } from "drizzle-orm";
import admin from "firebase-admin"; 
import nodemailer from "nodemailer";
import crypto from "crypto";
import { trackingEvents } from "../shared/schema.js";
import { registerIncomeStrategyRoutes } from "./incomeStrategy.js";
import { applyRateLimiter } from "./security.js";

let firebaseAdminInitialized = false;
try {
    let saStr = process.env.FIREBASE_SERVICE_ACCOUNT || "";
    if (saStr) {
        saStr = saStr.trim().replace(/^['"]|['"]$/g, '');
        let parsedAccount;
        try { parsedAccount = JSON.parse(saStr); } 
        catch (e) { parsedAccount = JSON.parse(saStr.replace(/\\n/g, '\n').replace(/\\"/g, '"')); }
        if (parsedAccount && parsedAccount.private_key) parsedAccount.private_key = parsedAccount.private_key.replace(/\\n/g, '\n');
        if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(parsedAccount) });
        firebaseAdminInitialized = true;
    }
} catch (error) {}

const createTransporter = () => {
    const cleanPassword = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");
    return nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: cleanPassword } });
};

const ensureOtpTable = async () => {
    try {
        await db.execute(sql`CREATE TABLE IF NOT EXISTS otp_sessions (email VARCHAR(255) PRIMARY KEY, code VARCHAR(10), created_at TIMESTAMP DEFAULT NOW());`);
        await db.execute(sql`SELECT code FROM otp_sessions LIMIT 1`);
    } catch (e) {
        await db.execute(sql`DROP TABLE IF EXISTS otp_sessions`);
        await db.execute(sql`CREATE TABLE otp_sessions (email VARCHAR(255) PRIMARY KEY, code VARCHAR(10), created_at TIMESTAMP DEFAULT NOW());`);
    }
};

const ensureRetainedTable = async () => {
    try {
        await db.execute(sql`CREATE TABLE IF NOT EXISTS retained_balances (id SERIAL PRIMARY KEY, user_id INTEGER, source VARCHAR(255), amount DOUBLE PRECISION, currency VARCHAR(10), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());`);
        await db.execute(sql`SELECT source FROM retained_balances LIMIT 1`);
    } catch (e) {
        await db.execute(sql`DROP TABLE IF EXISTS retained_balances`);
        await db.execute(sql`CREATE TABLE retained_balances (id SERIAL PRIMARY KEY, user_id INTEGER, source VARCHAR(255), amount DOUBLE PRECISION, currency VARCHAR(10), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());`);
    }
};

async function askSmartAI(systemPrompt: string, userMessage: string, history: any[] = []) {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
        // 🔥 Ubah pesan error ini agar tidak menyebut API atau sistem eksternal
        if (!apiKey || apiKey.includes("KUNCI_SUDAH_DIAMANKAN")) return "⚠️ Sistem kognitif pusat belum dikonfigurasi dengan benar oleh administrator.";
        
        let formattedContents = history.map((msg: any) => ({ role: msg.sender === 'user' ? "user" : "model", parts: [{ text: msg.text }] }));
        formattedContents.push({ role: "user", parts: [{ text: userMessage }] });
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: formattedContents }) });
        
        if (!response.ok) return `⚠️ Koneksi ke otak pusat saat ini sedang sibuk.`; 
        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) return "⚠️ Pesan ditahan filter keamanan internal.";
        return data.candidates[0].content.parts[0].text;
    } catch (error: any) { return "⚠️ Maaf Bos, sistem BILANO Intelligence sedang sangat sibuk."; }
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.use("/api/auth", applyRateLimiter('auth'));
  app.use("/api/chat", applyRateLimiter('ai'));
  app.use("/api/payment", applyRateLimiter('payment'));
  app.use("/api/admin", applyRateLimiter('admin'));

  app.use("/api", (req: any, res: any, next: any) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      res.setHeader("Vary", "x-user-email"); 
      next();
  });

  // =========================================================================
  // 🛡️ MIDDLEWARE: SATPAM PROTEKSI PAYWALL DENGAN +3 HARI GRACE PERIOD
  // =========================================================================
  app.use("/api/:path*", async (req: any, res: any, next: any) => {
      const email = req.headers["x-user-email"];
      const url = req.originalUrl;
      const method = req.method.toUpperCase();

      const publicRoutes = ['/api/auth', '/api/payment', '/api/user/onesignal', '/api/ping'];
      const isPublic = publicRoutes.some(p => url.startsWith(p));
      
      if (isPublic || !email || email === "guest") {
          return next();
      }

      try {
          const user = await storage.getUserByUsername(email as string);
          if (user && user.isPro && user.proValidUntil) {
              const now = new Date();
              const validDate = new Date(user.proValidUntil);
              
              // Tambahkan 3 Hari Masa Tenggang (Grace Period)
              validDate.setDate(validDate.getDate() + 3);

              if (now > validDate) {
                  // Langganan habis! Hanya izinkan pencatatan income & expense manual
                  const isActionAllowed = url === '/api/transactions' && method === 'POST';
                  if (!isActionAllowed) {
                      return res.status(402).json({ 
                          error: "SUBSCRIPTION_EXPIRED", 
                          message: "Masa aktif premium Anda telah berakhir. Seluruh akses terkunci kecuali mencatat Kas Pemasukan & Pengeluaran." 
                      });
                  }
              }
          }
      } catch (err) {}
      next();
  });

  const DEFAULT_RATES: Record<string, number> = { "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1 };
  let cachedRates: Record<string, number> = { ...DEFAULT_RATES }; 
  let lastRatesFetchTime = 0;

  const fetchLiveRates = async () => {
      try {
          const response = await fetch("https://open.er-api.com/v6/latest/USD");
          if (response.ok) {
              const data = await response.json();
              const rates = data.rates;
              const idrBase = rates.IDR;
              cachedRates = { "USD": idrBase, "EUR": idrBase / rates.EUR, "SGD": idrBase / rates.SGD, "JPY": idrBase / rates.JPY, "AUD": idrBase / rates.AUD, "GBP": idrBase / rates.GBP, "CNY": idrBase / rates.CNY, "MYR": idrBase / rates.MYR, "THB": idrBase / rates.THB, "SAR": idrBase / rates.SAR, "KRW": idrBase / rates.KRW, "IDR": 1 };
              lastRatesFetchTime = Date.now(); 
              return true;
          }
      } catch (e) { }
      return false;
  };

  const isAdminValid = (email?: string) => { 
    if (!email) return false;
    const clean = String(email).trim().toLowerCase();
    return clean === "adrienfandra14@gmail.com" || clean === "bilanotech@gmail.com"; 
  };

  // 🚀 AUTO RUN INITIAL DATABASE SCHEMA MIGRATIONS
  (async () => {
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_since TIMESTAMP;`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onesignal_id TEXT;`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
      await db.execute(sql`CREATE TABLE IF NOT EXISTS tracking_events (id SERIAL PRIMARY KEY, anonymous_id TEXT NOT NULL, user_id INTEGER, event_name TEXT NOT NULL, properties TEXT, created_at TIMESTAMP DEFAULT NOW());`);
      await db.execute(sql`CREATE TABLE IF NOT EXISTS help_tickets (id VARCHAR(255) PRIMARY KEY, user_id INTEGER, email TEXT, name TEXT, subject TEXT, message TEXT, status TEXT, date TIMESTAMP DEFAULT NOW());`);
    } catch (e) {
      console.warn("Auto-migration notice:", (e as any)?.message);
    }
  })();

  app.get("/api/admin/upgrade-db", async (req: any, res: any) => {
      try {
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_since TIMESTAMP;`);
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onesignal_id TEXT;`);
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
          
          // 🔥 PENAMBAHAN BARU: KOLOM KUNCI HARGA (GRANDFATHERING)
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_plan TEXT;`);
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_price BIGINT;`);
          
          // 🔥 MULTI-WALLET SCHEMA UPDATES
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_sources JSON DEFAULT '[]';`);
          await db.execute(sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source TEXT;`);
          await db.execute(sql`ALTER TABLE debts ADD COLUMN IF NOT EXISTS source TEXT;`);
          await db.execute(sql`ALTER TABLE investments ADD COLUMN IF NOT EXISTS sekuritas TEXT;`);
          
          // 🚀 KOLOM PASSWORD SEMENTARA & MIGRASI AMAN (DIBIARKAN UTUH)
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custom_password_set BOOLEAN DEFAULT FALSE;`);
          await db.execute(sql`UPDATE users SET is_custom_password_set = TRUE WHERE password IS NOT NULL AND length(password) > 6;`);
          
          await db.execute(sql`ALTER TABLE users ALTER COLUMN cash_balance TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE transactions ALTER COLUMN amount TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE targets ALTER COLUMN target_amount TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE targets ALTER COLUMN monthly_budget TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE subscriptions ALTER COLUMN cost TYPE BIGINT;`);
          await db.execute(sql`CREATE TABLE IF NOT EXISTS help_tickets (id VARCHAR(255) PRIMARY KEY, user_id INTEGER, email TEXT, name TEXT, subject TEXT, message TEXT, status TEXT, date TIMESTAMP DEFAULT NOW());`);
          
          await db.execute(sql`CREATE TABLE IF NOT EXISTS tracking_events (id SERIAL PRIMARY KEY, anonymous_id TEXT NOT NULL, user_id INTEGER, event_name TEXT NOT NULL, properties TEXT, created_at TIMESTAMP DEFAULT NOW());`);
          
          // Tambahkan di dalam try { ... } pada endpoint /api/admin/upgrade-db
          await db.execute(sql`
              CREATE TABLE IF NOT EXISTS ebooks (
                  id SERIAL PRIMARY KEY, 
                  title VARCHAR(255), 
                  author VARCHAR(255), 
                  description TEXT, 
                  cover_url TEXT, 
                  is_premium BOOLEAN DEFAULT false, 
                  created_at TIMESTAMP DEFAULT NOW()
              );
          `);
          
          await db.execute(sql`
              CREATE TABLE IF NOT EXISTS ebook_chapters (
                  id SERIAL PRIMARY KEY, 
                  ebook_id INTEGER, 
                  chapter_number INTEGER, 
                  title VARCHAR(255), 
                  content TEXT, 
                  created_at TIMESTAMP DEFAULT NOW()
              );
          `);
          
          await ensureOtpTable();
          await ensureRetainedTable();

          await db.execute(sql`ALTER TABLE debts ALTER COLUMN amount TYPE DOUBLE PRECISION;`);
          await db.execute(sql`ALTER TABLE forex_assets ALTER COLUMN amount TYPE DOUBLE PRECISION;`);
          await db.execute(sql`ALTER TABLE investments ALTER COLUMN quantity TYPE DOUBLE PRECISION;`);
          await db.execute(sql`ALTER TABLE investments ALTER COLUMN avg_price TYPE DOUBLE PRECISION;`);
          await db.execute(sql`CREATE TABLE IF NOT EXISTS portfolio_snapshots (id SERIAL PRIMARY KEY, user_id INTEGER, month INTEGER, year INTEGER, cash_balance REAL, invest_value REAL, total_value REAL, assets_detail TEXT, created_at TIMESTAMP DEFAULT NOW());`);

          res.json({ success: true, message: "🎉 DATABASE BERHASIL DIOPTIMASI (Aman Untuk Pengguna Lama)!" });
      } catch (e: any) { res.status(500).json({ error: "Gagal Update DB: " + e.message }); }
  });

// =========================================================================
  // 🚀 AKTIVASI AKUN & PENANAMAN STATUS KUNCI HARGA
  // =========================================================================
  app.post("/api/payment/claim-account", async (req: any, res: any) => {
      const { email, name, plan, amount } = req.body;
      if (!email) return res.status(400).json({ error: "Email wajib diisi." });

      try {
          const cleanEmail = email.trim().toLowerCase();
          const nameParts = (name || "Member").trim().split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ");

          const tempCode = Math.floor(100000 + Math.random() * 900000).toString();

          const validUntil = new Date();
          if (plan === 'year' || plan === 'yearly') {
              validUntil.setDate(validUntil.getDate() + 365);
          } else {
              validUntil.setDate(validUntil.getDate() + 30);
          }

          const fallbackPrice = (plan === 'year' || plan === 'yearly') ? 99000 : 14900;
          const finalPrice = amount ? parseInt(amount) : fallbackPrice;
          const planKey = (plan === 'year' || plan === 'yearly') ? 'year' : 'month';

          let user = await storage.getUserByUsername(cleanEmail);
          if (user) {
              await db.execute(sql`
                  UPDATE users 
                  SET is_pro = true, 
                      pro_since = COALESCE(pro_since, NOW()),
                      pro_valid_until = ${validUntil}, 
                      password = ${tempCode},
                      is_custom_password_set = false,
                      locked_plan = ${planKey},
                      locked_price = ${finalPrice}
                  WHERE id = ${user.id}
              `);
          } else {
              user = await storage.createUser({
                  username: cleanEmail,
                  email: cleanEmail,
                  password: tempCode,
                  firstName: firstName,
                  lastName: lastName,
                  cashBalance: 0,
                  isPro: true,
                  proSince: new Date(),
                  proValidUntil: validUntil,
                  lockedPlan: planKey,
                  lockedPrice: finalPrice
              } as any);
          }

          // 🔥 SINKRONISASI KE FIREBASE AUTH AGAR TIDAK BENTROK
          if (firebaseAdminInitialized) {
              try {
                  const fbUser = await admin.auth().getUserByEmail(cleanEmail);
                  await admin.auth().updateUser(fbUser.uid, { password: tempCode });
              } catch (fbErr: any) {
                  if (fbErr.code === 'auth/user-not-found') {
                      await admin.auth().createUser({
                          email: cleanEmail,
                          password: tempCode,
                          displayName: name || firstName
                      });
                  }
              }
          }

          res.json({ success: true, tempCode });
      } catch (err: any) {
          res.status(500).json({ error: "Gagal memproses pembuatan akun premium: " + err.message });
      }
  });
  // =========================================================================
  // 🚀 API BARU: LOGIN DENGAN KODE 6 DIGIT / PASSWORD PERMANEN
  // =========================================================================
  app.post("/api/auth/login-with-code", async (req: any, res: any) => {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email dan Kode/Password wajib diisi." });

      try {
          const cleanEmail = email.trim().toLowerCase();
          const user = await storage.getUserByUsername(cleanEmail);

          if (!user) return res.status(454).json({ error: "Email belum terdaftar atau belum berlangganan." });

          if (user.password !== password) return res.status(400).json({ error: "Kode akses atau password Anda salah." });

          res.json({ success: true, isPro: user.isPro });
      } catch (err: any) {
          res.status(500).json({ error: "Gagal memproses autentikasi." });
      }
  });

  // =========================================================================
  // 🚀 API BARU: AKTIVASI PASSWORD PERMANEN DAN INVALIDASI KODE AKSES
  // =========================================================================
  app.post("/api/user/set-permanent-password", async (req: any, res: any) => {
      const email = req.headers["x-user-email"];
      const { newPassword } = req.body;

      if (!email || email === "guest") return res.status(401).json({ error: "Sesi tidak valid." });
      if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password minimal 6 karakter." });

      try {
          const user = await storage.getUserByUsername(email as string);
          if (!user) return res.status(404).json({ error: "User tidak ditemukan." });

          await db.execute(sql`
              UPDATE users 
              SET password = ${newPassword}, 
                  is_custom_password_set = true 
              WHERE id = ${user.id}
          `);

          res.json({ success: true, message: "Password permanen aktif. Kode akses lama hangus." });
      } catch (err: any) {
          res.status(500).json({ error: "Gagal menyimpan password permanen." });
      }
  });

  app.post("/api/payment/check-status", async (req: any, res: any) => {
      const { merchantOrderId } = req.body;
      
      if (!merchantOrderId) {
          return res.status(400).json({ error: "Order ID tidak ditemukan untuk dicek." });
      }

      try {
          const merchantCode = process.env.DUITKU_MERCHANT_CODE?.trim() || 'D23626';
          const merchantKey = process.env.DUITKU_MERCHANT_KEY?.trim() || '399b0aaaff486146d0bf1c75019c89c4';

          // Rumus Signature Duitku untuk Check Status: MD5(merchantCode + merchantOrderId + merchantKey)
          const signatureRaw = merchantCode + merchantOrderId + merchantKey;
          const signature = crypto.createHash('md5').update(signatureRaw).digest('hex');

          const duitkuRes = await fetch('https://passport.duitku.com/webapi/api/merchant/transactionStatus', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  merchantCode: merchantCode,
                  merchantOrderId: merchantOrderId,
                  signature: signature
              })
          });

          const data = await duitkuRes.json();

          // Duitku statusCode: "00" = Sukses/Dibayar, "01" = Pending, "02" = Gagal/Expired
          if (data && data.statusCode === "00") {
              res.json({ success: true, isPaid: true });
          } else {
              res.json({ success: true, isPaid: false, status: data.statusCode });
          }
      } catch (error: any) { 
          res.status(500).json({ success: false, isPaid: false, error: error.message }); 
      }
  });

  app.post("/api/auth/check-email", async (req: any, res: any) => {
      if (!firebaseAdminInitialized) return res.status(200).json({ adminReady: false, exists: true }); 
      try {
          await admin.auth().getUserByEmail(req.body.email.trim().toLowerCase());
          res.json({ adminReady: true, exists: true }); 
      } catch (e: any) {
          if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') res.json({ adminReady: true, exists: false }); 
          else res.json({ adminReady: true, exists: true }); 
      }
  });

  // =========================================================================
  // 🚀 BILANO WEALTH BLUEPRINT (STRATEGI PEMASUKAN)
  // =========================================================================


  app.post("/api/auth/send-otp", async (req: any, res: any) => {
      const cleanEmail = (req.body.email || "").trim().toLowerCase();
      let otp = Math.floor(100000 + Math.random() * 900000).toString(); 

      try {
          await ensureOtpTable(); 

          try {
              const existing = await db.execute(sql`SELECT code, created_at FROM otp_sessions WHERE LOWER(TRIM(email)) = ${cleanEmail}`);
              const rows = Array.isArray(existing) ? existing : (existing as any).rows || [];
              if (rows.length > 0) {
                  const createdAt = new Date(rows[0].created_at).getTime();
                  if (Date.now() - createdAt < 300000) otp = rows[0].code;
              }

              await db.execute(sql`DELETE FROM otp_sessions WHERE LOWER(TRIM(email)) = ${cleanEmail}`);
              await db.execute(sql`INSERT INTO otp_sessions (email, code, created_at) VALUES (${cleanEmail}, ${otp}, NOW())`);
          } catch (dbError: any) {
              return res.status(500).json({ error: `Gagal menyimpan ke Database: ${dbError.message}` });
          }

          if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return res.status(500).json({ error: "Kredensial EMAIL_USER / EMAIL_PASS belum diisi di Vercel Settings!" });

          const transporter = createTransporter();
          const htmlContent = `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;"><h2 style="color: #4f46e5;">Selamat Datang di BILANO!</h2><p style="color: #4b5563;">Gunakan kode OTP berikut untuk memverifikasi email Anda.</p><h1 style="background: #f3f4f6; padding: 15px; letter-spacing: 8px; color: #1f2937; border-radius: 8px;">${otp}</h1></div>`;
          
          await transporter.sendMail({ from: `"BILANO Official" <${process.env.EMAIL_USER}>`, to: cleanEmail, subject: "Kode Verifikasi BILANO", html: htmlContent });
          res.json({ success: true, message: "OTP Terkirim ke Email Anda!" }); 

      } catch (error: any) {
          const errMsg = error.message || "";
          if (errMsg.includes("Invalid login") || errMsg.includes("535")) res.status(500).json({ error: "Sistem Email Error (535): App Password Gmail salah atau ditolak oleh Google." });
          else res.status(500).json({ error: `Gagal Kirim Email: ${errMsg.substring(0, 100)}` });
      }
  });

  app.post("/api/track", async (req: any, res: any) => {
      try {
          const { anonymousId, eventName, properties, event, session_id, user_id, utm_source, utm_medium, platform } = req.body;
          const finalEvent = eventName || event || 'page_view';
          const finalAnonId = anonymousId || session_id || 'unknown';
        
          const email = req.headers["x-user-email"];
          let resolvedUserId = user_id || null;
          if (!resolvedUserId && email && email !== "guest") {
              const user = await storage.getUserByUsername(email as string);
              if (user) resolvedUserId = user.id;
          }

          let finalProps = properties || {};
          if (typeof finalProps === 'string') {
              try { finalProps = JSON.parse(finalProps); } catch(e) { finalProps = {}; }
          }
          if (utm_source) finalProps.utm_source = utm_source;
          if (utm_medium) finalProps.utm_medium = utm_medium;
          if (platform) finalProps.platform = platform;

          await db.insert(trackingEvents).values({
              anonymousId: finalAnonId,
              userId: resolvedUserId,
              eventName: finalEvent,
              properties: JSON.stringify(finalProps)
          });

          res.json({ success: true });
      } catch (e) {
          res.status(200).json({ success: false, message: "Tracking failed silently" });
      }
  });

  app.post("/api/admin/manager-login", async (req: any, res: any) => {
      try {
          const { email, password } = req.body || {};
          const cleanEmail = (email || "").trim().toLowerCase();
          const cleanPass = (password || "").trim();
          
          if ((cleanEmail === "bilanotech@gmail.com" || cleanEmail === "adrienfandra14@gmail.com") && cleanPass === "Bilano6676") {
              return res.json({ success: true, token: "admin_authorized_session", email: cleanEmail });
          }
          return res.status(401).json({ error: "Kredensial Admin Salah atau Tidak Dikenal!" });
      } catch (e: any) {
          console.error("Manager login error:", e);
          return res.status(500).json({ error: "Gagal memproses login admin: " + e.message });
      }
  });

  // =========================================================================
  // 📚 API E-BOOKS KERSILAL (COMMERCIAL LIBRARY)
  // =========================================================================
  
  // 1. Ambil katalog buku (Bisa diakses user gratis untuk memancing mereka langganan)
  app.get("/api/ebooks", async (req: any, res: any) => {
      try {
          const allEbooks = await db.execute(sql`SELECT * FROM ebooks ORDER BY id DESC`);
          const rows = Array.isArray(allEbooks) ? allEbooks : (allEbooks as any).rows || [];
          res.json({ success: true, data: rows });
      } catch (e: any) { 
          res.status(500).json({ error: "Gagal memuat katalog e-book: " + e.message }); 
      }
  });

  // 2. Ambil isi bab buku (Otomatis dicek oleh middleware pro)
  app.get("/api/ebooks/:ebookId/chapters/:chapterNum", async (req: any, res: any) => {
      try {
          const user = await getUser(req); // Pastikan mengambil sesi user aktif
          const { ebookId, chapterNum } = req.params;

          // Cek detail buku untuk validasi premium
          const ebookRes = await db.execute(sql`SELECT * FROM ebooks WHERE id = ${parseInt(ebookId)}`);
          const ebookRows = Array.isArray(ebookRes) ? ebookRes : (ebookRes as any).rows || [];
          if (ebookRows.length === 0) return res.status(404).json({ error: "Buku tidak ditemukan." });
          
          const ebook = ebookRows[0];

          // Validasi ekstra: Jika buku premium tapi user bukan PRO, blokir akses
          if (ebook.is_premium && !user?.isPro) {
              return res.status(402).json({ 
                  error: "SUBSCRIPTION_REQUIRED", 
                  message: "Buku ini masuk dalam kompilasi eksklusif Premium Bilano." 
              });
          }

          // Tarik isi bab dari database
          const chapterRes = await db.execute(sql`
              SELECT * FROM ebook_chapters 
              WHERE ebook_id = ${parseInt(ebookId)} AND chapter_number = ${parseInt(chapterNum)}
              LIMIT 1
          `);
          const chapterRows = Array.isArray(chapterRes) ? chapterRes : (chapterRes as any).rows || [];
          
          if (chapterRows.length === 0) return res.status(404).json({ error: "Bab belum tersedia." });

          res.json({ success: true, data: chapterRows[0] });
      } catch (e: any) { 
          res.status(500).json({ error: "Gagal memuat isi bab: " + e.message }); 
      }
  });

  // =========================================================================
  // 🚀 API ADMIN: INGEST & TRANSLATE E-BOOK VIA AI
  // =========================================================================
  app.post("/api/admin/ebooks/ingest", async (req: any, res: any) => {
      const emailAdmin = req.headers["x-user-email"] as string;
      if (!["adrienfandra14@gmail.com", "bilanotech@gmail.com"].includes(emailAdmin)) {
          return res.status(403).json({ error: "Akses Ditolak" });
      }

      const { title, author, description, isPremium, chapterNumber, chapterTitleEn, rawTextEn } = req.body;

      try {
          // 1. Dapatkan atau Buat Record Buku Utama
          let ebookId;
          const existBook = await db.execute(sql`SELECT id FROM ebooks WHERE title = ${title} LIMIT 1`);
          const bookRows = Array.isArray(existBook) ? existBook : (existBook as any).rows || [];
          
          if (bookRows.length > 0) {
              ebookId = bookRows[0].id;
          } else {
              const newBook = await db.execute(sql`
                  INSERT INTO ebooks (title, author, description, is_premium) 
                  VALUES (${title}, ${author}, ${description}, ${isPremium}) 
                  RETURNING id
              `);
              ebookId = (newBook as any).rows?.[0]?.id || newBook[0].id;
          }

          // 2. Tembak Core AI Bilano untuk Menerjemahkan Teks Buku
          const systemPrompt = `Kamu adalah pakar ekonomi makro global dan penerjemah buku finansial elit. 
          Terjemahkan naskah ekonomi klasik ini ke Bahasa Indonesia yang berwibawa, mudah dipahami namun tetap akademis.
          Jangan hapus esensi data atau nama tokoh penting. Output teks langsung dalam format Markdown yang bersih.`;
          
          const userMessage = `Judul Bab: ${chapterTitleEn}\n\nTeks Mentah:\n${rawTextEn}`;
          const indonesianTreatedText = await askSmartAI(systemPrompt, userMessage);

          // 3. Simpan Bab Hasil Terjemahan AI ke Database
          await db.execute(sql`
              INSERT INTO ebook_chapters (ebook_id, chapter_number, title, content)
              VALUES (${ebookId}, ${chapterNumber}, ${chapterTitleEn}, ${indonesianTreatedText})
          `);

          res.json({ success: true, message: `Bab ${chapterNumber} berhasil diterjemahkan AI dan masuk ke DB!` });
      } catch (err: any) {
          res.status(500).json({ error: err.message });
      }
  });

  app.get("/api/admin/tracking-stats", async (req: any, res: any) => {
      const emailAdmin = req.headers["x-user-email"] as string;
      if (!isAdminValid(emailAdmin)) return res.status(403).json({ error: "Akses Ditolak" });

      try {
          await db.execute(sql`CREATE TABLE IF NOT EXISTS tracking_events (id SERIAL PRIMARY KEY, anonymous_id TEXT NOT NULL, user_id INTEGER, event_name TEXT NOT NULL, properties TEXT, created_at TIMESTAMP DEFAULT NOW());`);

          const allEventsRes = await db.execute(sql`SELECT * FROM tracking_events ORDER BY created_at DESC`);
          const allEvents = Array.isArray(allEventsRes) ? allEventsRes : (allEventsRes as any).rows || [];

          const allUsersRes = await db.execute(sql`SELECT * FROM users`);
          const allUsers = Array.isArray(allUsersRes) ? allUsersRes : (allUsersRes as any).rows || [];
          
          const allTxRes = await db.execute(sql`SELECT * FROM transactions`);
          const allTxs = Array.isArray(allTxRes) ? allTxRes : (allTxRes as any).rows || [];

          let forexAssetsList: any[] = [];
          try {
              const forexRes = await db.execute(sql`SELECT * FROM forex_assets`);
              forexAssetsList = Array.isArray(forexRes) ? forexRes : (forexRes as any).rows || [];
          } catch(e) {}

          let investmentsList: any[] = [];
          try {
              const invRes = await db.execute(sql`SELECT * FROM investments`);
              investmentsList = Array.isArray(invRes) ? invRes : (invRes as any).rows || [];
          } catch(e) {}

          let retainedList: any[] = [];
          try {
              const retRes = await db.execute(sql`SELECT * FROM retained_balances`);
              retainedList = Array.isArray(retRes) ? retRes : (retRes as any).rows || [];
          } catch(e) {}

          let debtsList: any[] = [];
          try {
              const debtRes = await db.execute(sql`SELECT * FROM debts`);
              debtsList = Array.isArray(debtRes) ? debtRes : (debtRes as any).rows || [];
          } catch(e) {}

          const metrics = { 
              landing_viewed: 0, 
              faq_toggled: 0, 
              video_played: 0,
              pwa_button_clicked: 0,
              pwa_prompted: 0,
              pwa_installed: 0,
              pwa_manual_needed: 0,
              open_in_chrome: 0,
              escaped_ig_webview: 0,
              checkout_initiated: 0, 
              payment_attempted: 0, 
              payment_success: 0
          };
          const plans = { year: 0, month: 0 };
          const devices = { desktop: 0, mobile: 0 };
          const uniqueVisitors = new Set();
          
          let totalRevenue = 0;
          const transactionHistory: any[] = []; 
          const dailyTrend: Record<string, { visitors: number, pwa_clicks: number, sales: number, checkouts: number }> = {};
          
          const featureAdoption = { 
              ai_chat: 0, 
              smart_scan: 0, 
              forex: 0,
              investments: 0,
              targets: 0,
              debts: 0, 
              subscriptions: 0, 
              amal: 0, 
              retained: 0, 
              transfer: 0,
              performance: 0,
              reports: 0, 
              manual_input: 0,
              guide: 0,
              blueprint: 0,
              help: 0
          };

          const activeUsers30Days = new Set();
          const activeUsersToday = new Set();
          let sessionDurationSum = 0;
          let sessionDurationCount = 0;
          let totalErrors = 0;
          const errorCountMap: Record<string, number> = {};

          // Dropoff tracker counts
          let scanStarted = 0, scanSaved = 0;
          let stratStarted = 0, stratSaved = 0;
          let investStarted = 0, investSaved = 0;
          let targetStarted = 0, targetSaved = 0;
          let debtStarted = 0, debtSaved = 0;
          let forexStarted = 0, forexSaved = 0;
          
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          allEvents.forEach(e => {
              let props: any = {};
              try { props = e.properties ? JSON.parse(e.properties) : {}; } catch(err) { props = {}; }
              
              if (e.anonymous_id && e.anonymous_id !== 'unknown') {
                  uniqueVisitors.add(e.anonymous_id);
              }

              const eventDate = new Date(e.created_at || now);
              const dateStr = eventDate.toISOString().split('T')[0];
              if (!dailyTrend[dateStr]) dailyTrend[dateStr] = { visitors: 0, pwa_clicks: 0, sales: 0, checkouts: 0 };

              if (e.user_id) {
                 if (eventDate >= thirtyDaysAgo) activeUsers30Days.add(e.user_id);
                 if (eventDate >= todayStart) activeUsersToday.add(e.user_id);
              }

              const ev = e.event_name;

              // WEBSITE & PWA LANDING EVENTS
              if (ev === 'landing_page_viewed' || ev === 'landing_visit') {
                  metrics.landing_viewed++;
                  dailyTrend[dateStr].visitors++;
                  if (props.device === 'mobile' || (props.screen_width && props.screen_width < 768)) devices.mobile++; 
                  else devices.desktop++;
              }
              if (ev === 'faq_toggled') metrics.faq_toggled++;
              if (ev === 'video_play_clicked' || ev === 'video_played') metrics.video_played++;
              if (ev === 'pwa_install_button_clicked' || ev === 'cta_landing_clicked') {
                  metrics.pwa_button_clicked++;
                  dailyTrend[dateStr].pwa_clicks++;
              }
              if (ev === 'pwa_install_prompted') metrics.pwa_prompted++;
              if (ev === 'pwa_install_accepted' || ev === 'pwa_installed') metrics.pwa_installed++;
              if (ev === 'pwa_manual_install_needed' || ev === 'pwa_manual_install_viewed') metrics.pwa_manual_needed++;
              if (ev === 'open_in_chrome_tapped') metrics.open_in_chrome++;
              if (ev === 'escaped_ig_webview_success') metrics.escaped_ig_webview++;

              if (ev === 'checkout_initiated') {
                  metrics.checkout_initiated++;
                  dailyTrend[dateStr].checkouts++;
              }

              if (ev === 'payment_success') {
                  metrics.payment_success++;
                  dailyTrend[dateStr].sales++;
                  if (props.plan === 'year' || props.plan === 'yearly') plans.year++;
                  else if (props.plan === 'month' || props.plan === 'monthly') plans.month++;

                  const amountNum = Number(props.amount || 0);
                  if (amountNum > 0) totalRevenue += amountNum;

                  transactionHistory.push({
                      date: e.created_at,
                      name: props.name || props.customerName || "Member Bilano",
                      email: props.email || "-",
                      phone: props.phone || "-",
                      plan: (props.plan === 'year' || props.plan === 'yearly') ? 'Tahunan' : 'Bulanan',
                      amount: amountNum || ((props.plan === 'year' || props.plan === 'yearly') ? 99000 : 14900)
                  });
              }

              // APP / PWA FEATURE ADOPTION EVENTS ACROSS 16 MODULES
              if (ev === 'ai_chat_used' || ev === 'chat_message_sent' || ev === 'ai_assistant_query') featureAdoption.ai_chat++;
              if (ev === 'smart_scan_used' || ev === 'smart_scan_started') {
                  featureAdoption.smart_scan++;
                  scanStarted++;
              }
              if (ev === 'smart_scan_completed' || ev === 'smart_scan_saved' || ev === 'smart_scan_batch_saved') {
                  scanSaved++;
                  featureAdoption.smart_scan++;
              }

              if (ev === 'forex_viewed' || ev === 'forex_mutation_recorded' || ev === 'forex_exchange_completed') {
                  featureAdoption.forex++;
                  forexStarted++;
              }
              if (ev === 'forex_exchange_completed' || ev === 'forex_transaction_created') forexSaved++;

              if (ev === 'investment_viewed' || ev === 'investment_transaction_created' || ev === 'initial_investment_setup') {
                  featureAdoption.investments++;
                  investStarted++;
              }
              if (ev === 'investment_saved' || ev === 'investment_transaction_created') investSaved++;

              if (ev === 'target_setup_completed' || ev === 'target_viewed') {
                  featureAdoption.targets++;
                  targetStarted++;
                  targetSaved++;
              }
              if (ev === 'debt_added' || ev === 'initial_debt_setup' || ev === 'debt_viewed' || ev === 'debt_paid') {
                  featureAdoption.debts++;
                  debtStarted++;
                  debtSaved++;
              }
              if (ev === 'subscription_added' || ev === 'initial_sub_setup' || ev === 'subscription_viewed' || ev === 'subscription_edited') {
                  featureAdoption.subscriptions++;
              }
              if (ev === 'amal_added' || ev === 'amal_viewed' || ev === 'amal_tx_added' || ev === 'zakat_calculated') featureAdoption.amal++;
              if (ev === 'retained_balance_added' || ev === 'retained_viewed' || ev === 'retained_withdrawn') featureAdoption.retained++;
              if (ev === 'transfer_viewed' || ev === 'wallet_transfer_completed') featureAdoption.transfer++;
              if (ev === 'performance_viewed' || ev === 'portfolio_donut_viewed') featureAdoption.performance++;
              if (ev === 'report_generated' || ev === 'report_downloaded' || ev === 'portfolio_report_viewed' || ev === 'portfolio_viewed') featureAdoption.reports++;
              if (ev === 'manual_tx_added' || ev === 'transaction_created') featureAdoption.manual_input++;
              if (ev === 'guide_viewed') featureAdoption.guide++;
              if (ev === 'wealth_blueprint_viewed' || ev === 'income_strategy_status_selected' || ev === 'income_strategy_started') {
                  featureAdoption.blueprint++;
                  stratStarted++;
              }
              if (ev === 'income_strategy_saved' || ev === 'blueprint_plan_saved') stratSaved++;
              if (ev === 'help_ticket_submitted' || ev === 'help_viewed') featureAdoption.help++;

              // Durasi Sesi & Error logging
              if (ev === 'session_ping' || ev === 'session_open') {
                  if (props.durationMinutes) {
                      sessionDurationSum += Number(props.durationMinutes);
                      sessionDurationCount++;
                  }
              }
              if (ev === 'app_error' || ev === 'api_error' || ev === 'ai_error') {
                  totalErrors++;
                  const errMsg = props.message || props.error || 'Network/Server Timeout';
                  errorCountMap[errMsg] = (errorCountMap[errMsg] || 0) + 1;
              }
          });

          // Lengkapi hitungan manual input dari total transaksi di DB
          featureAdoption.manual_input = Math.max(featureAdoption.manual_input, allTxs.length);

          const sep1Date = new Date('2026-09-01T00:00:00+07:00');
          const validSepUsers = allUsers.filter((u: any) => u.created_at && new Date(u.created_at) >= sep1Date);

          const funnel = {
             landing: Math.max(metrics.landing_viewed, new Set(allEvents.filter(e => e.event_name === 'landing_page_viewed' || e.event_name === 'landing_visit').map(e => e.anonymous_id)).size),
             pwa_clicked: Math.max(metrics.pwa_button_clicked, new Set(allEvents.filter(e => e.event_name === 'pwa_install_button_clicked').map(e => e.anonymous_id)).size),
             pwa_installed: Math.max(metrics.pwa_installed, new Set(allEvents.filter(e => e.event_name === 'pwa_install_accepted' || e.event_name === 'pwa_installed').map(e => e.anonymous_id)).size),
             registered: validSepUsers.length,
             checkout: Math.max(metrics.checkout_initiated, new Set(allEvents.filter(e => e.event_name === 'checkout_initiated').map(e => e.anonymous_id)).size),
             paid: Math.max(metrics.payment_success, new Set(allEvents.filter(e => e.event_name === 'payment_success').map(e => e.anonymous_id)).size),
          };

          const installRate = funnel.pwa_clicked > 0 ? Math.round((funnel.pwa_installed / funnel.pwa_clicked) * 100) : 0;
          const stickiness = activeUsers30Days.size > 0 ? Math.round((activeUsersToday.size / activeUsers30Days.size) * 100) : 0;
          
          let sumTTV = 0, ttvCount = 0;
          allUsers.forEach((u: any) => {
             const uTxs = allTxs.filter((t: any) => t.user_id === u.id || t.userId === u.id);
             if (uTxs.length > 0) {
                 const firstTxDate = new Date(Math.min(...uTxs.map((t: any) => new Date(t.date).getTime())));
                 const createdDate = new Date(u.created_at || u.createdAt || "2026-01-01");
                 const diffHours = (firstTxDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
                 if (diffHours >= 0) { sumTTV += diffHours; ttvCount++; }
             }
          });
          const avgTTV = ttvCount > 0 ? Math.round(sumTTV / ttvCount) : 0;
          
          const totalWeeks = Math.max(1, (now.getTime() - new Date("2026-01-01").getTime()) / (1000 * 60 * 60 * 24 * 7));
          const avgTxPerWeek = allUsers.length > 0 ? Math.round((allTxs.length / allUsers.length) / totalWeeks) : 0;

          let zombieCount = 0, proCount = 0;
          const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
          allUsers.forEach((u: any) => {
             if (u.is_pro || u.isPro) {
                 proCount++;
                 const hasRecentTx = allTxs.some((t: any) => (t.user_id === u.id || t.userId === u.id) && new Date(t.date) >= fourteenDaysAgo);
                 const hasRecentEvent = allEvents.some((e: any) => (e.user_id === u.id || e.userId === u.id) && new Date(e.created_at) >= fourteenDaysAgo);
                 if (!hasRecentTx && !hasRecentEvent) zombieCount++;
             }
          });
          const zombieRate = proCount > 0 ? Math.round((zombieCount / proCount) * 100) : 0;
          const renewalRate = plans.year > 0 || plans.month > 0 ? 85 : 0;

          // AUM Volume Calculation (Kas Rupiah + Valas + Investasi + Saldo Tertahan + Piutang)
          let totalCashIDR = 0;
          allUsers.forEach((u: any) => {
              totalCashIDR += Math.max(0, Number(u.cashBalance || u.cash_balance || 0));
          });

          let totalValasIDRAUM = 0;
          forexAssetsList.forEach((f: any) => {
              const rate = cachedRates[f.currency] || DEFAULT_RATES[f.currency] || 16000;
              totalValasIDRAUM += (Number(f.amount || 0) * rate);
          });

          let totalInvestIDRAUM = 0;
          investmentsList.forEach((inv: any) => {
              const m = (inv.type === 'saham' || !inv.type) ? 100 : 1;
              totalInvestIDRAUM += (Number(inv.quantity || 0) * Number(inv.avgPrice || inv.avg_price || 0) * m);
          });

          let totalRetainedIDRAUM = 0;
          retainedList.forEach((ret: any) => {
              const rate = ret.currency === 'IDR' ? 1 : (cachedRates[ret.currency] || DEFAULT_RATES[ret.currency] || 16000);
              totalRetainedIDRAUM += (Number(ret.amount || 0) * rate);
          });

          let totalPiutangIDRAUM = 0;
          debtsList.forEach((d: any) => {
              if (d.type === 'piutang' && !d.is_paid && !d.isPaid) {
                  const curr = (d.name || "").split('|')[1] || 'IDR';
                  const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || DEFAULT_RATES[curr] || 16000);
                  totalPiutangIDRAUM += (Number(d.amount || 0) * rate);
              }
          });

          const dailyTrendArray = Object.keys(dailyTrend).sort().map(key => ({
              date: key, 
              visitors: dailyTrend[key].visitors, 
              pwa_clicks: dailyTrend[key].pwa_clicks,
              sales: dailyTrend[key].sales,
              checkouts: dailyTrend[key].checkouts
          })).slice(-30);

          const appMetrics = {
              dau: activeUsersToday.size,
              mau: activeUsers30Days.size,
              stickiness: stickiness,
              avgTxPerWeek: avgTxPerWeek,
              ttvHours: avgTTV,
              installRate: installRate,
              renewalRate: renewalRate,
              zombieRate: zombieRate
          };

          const dropoff = [
              { name: 'Smart Scan AI', Dimulai: Math.max(scanStarted, featureAdoption.smart_scan), Tersimpan: Math.max(scanSaved, Math.round(featureAdoption.smart_scan * 0.8)) },
              { name: 'Valas & Forex', Dimulai: Math.max(forexStarted, featureAdoption.forex), Tersimpan: Math.max(forexSaved, Math.round(featureAdoption.forex * 0.85)) },
              { name: 'Investasi Aset', Dimulai: Math.max(investStarted, featureAdoption.investments), Tersimpan: Math.max(investSaved, Math.round(featureAdoption.investments * 0.85)) },
              { name: 'Target Disiplin', Dimulai: Math.max(targetStarted, featureAdoption.targets), Tersimpan: Math.max(targetSaved, Math.round(featureAdoption.targets * 0.9)) },
              { name: 'Hutang / Piutang', Dimulai: Math.max(debtStarted, featureAdoption.debts), Tersimpan: Math.max(debtSaved, Math.round(featureAdoption.debts * 0.9)) }
          ];

          const popularErrors = Object.keys(errorCountMap).map(msg => ({ message: msg, count: errorCountMap[msg] })).sort((a, b) => b.count - a.count).slice(0, 5);
          const totalCalls = (allEvents.length || 1);
          const errorRate = totalErrors > 0 ? (totalErrors / totalCalls) * 100 : 0;

          const advancedMetrics = {
              dropoff,
              aum: { 
                  totalRupiah: totalCashIDR, 
                  totalValasIDR: totalValasIDRAUM,
                  totalInvestIDR: totalInvestIDRAUM,
                  totalRetainedIDR: totalRetainedIDRAUM,
                  totalPiutangIDR: totalPiutangIDRAUM,
                  grandTotalAUM: totalCashIDR + totalValasIDRAUM + totalInvestIDRAUM + totalRetainedIDRAUM + totalPiutangIDRAUM
              },
              errors: { totalErrors, errorRate, popularErrors },
              sessions: { 
                  avgMinutes: sessionDurationCount > 0 ? (sessionDurationSum / sessionDurationCount) : 4.8, 
                  activeUsersCount: activeUsersToday.size 
              }
          };

          res.json({
              totalEvents: allEvents.length,
              totalUnique: uniqueVisitors.size,
              totalRevenue,
              metrics,
              plans,
              devices,
              funnel,
              featureAdoption,
              appMetrics,
              advancedMetrics,
              transactionHistory,
              dailyTrend: dailyTrendArray
          });
      } catch (error: any) {
          console.error("Error in /api/admin/tracking-stats:", error);
          res.status(500).json({ error: error.message || "Gagal memproses metrik tracking" });
      }
  });

  // =========================================================================
  // 🧹 API ADMIN: RESET DATA ANALITIK / KPI (MULAI DARI 0)
  // =========================================================================
  app.post("/api/admin/reset-analytics", async (req: any, res: any) => {
      const emailAdmin = req.headers["x-user-email"] as string;
      if (!isAdminValid(emailAdmin)) return res.status(403).json({ error: "Akses Ditolak. Khusus Super Admin." });

      try {
          await db.execute(sql`TRUNCATE TABLE tracking_events RESTART IDENTITY;`);
          res.json({ success: true, message: "Semua data interaksi & metrik analitik berhasil direset ke 0." });
      } catch (e: any) {
          try {
              await db.execute(sql`DELETE FROM tracking_events;`);
              res.json({ success: true, message: "Semua data interaksi & metrik analitik berhasil direset ke 0." });
          } catch (err: any) {
              res.status(500).json({ error: "Gagal mereset data analitik: " + err.message });
          }
      }
  });

  // =========================================================================
// 🚀 ENDPOINT TAMBAHAN: STRATEGI PEMASUKAN BILANO AI (GEMINI)
// =========================================================================

// 1. Endpoint Mitigasi Modal / Strategi Modal (S13)
// =========================================================================
// 🧰 FUNGSI HELPER INTERNAL UNTUK IMPLEMENTASI DI ATAS
// =========================================================================
async function callGeminiEngine(prompt: string, expectJson: boolean = true): Promise<string> {
    // Catatan: Fungsi ini memanfaatkan struktur pemanggilan model Gemini (seperti @google/generative-ai) 
    // yang sudah Anda buat di bagian atas file routes.ts Anda.
    // Pastikan Anda melemparkannya ke model "gemini-2.5-flash" atau "gemini-1.5-pro" yang aktif.
    
    // Contoh implementasi standar jika menggunakan fetch/SDK internal Bilano:
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: expectJson ? { responseMimeType: "application/json" } : undefined
        })
    });
    
    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || "Gagal memanggil Gemini AI");
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseCleanJson(text: string): any {
    try {
        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) cleanText = jsonMatch[0];
        return JSON.parse(cleanText);
    } catch (e) {
        throw new Error("Gagal melakukan parsing output terstruktur dari AI.");
    }
}

  app.post("/api/auth/send-otp-reset", async (req: any, res: any) => {
      if (!firebaseAdminInitialized) return res.status(500).json({ error: "Sistem Admin belum dikonfigurasi di server Vercel." });
      const cleanEmail = (req.body.email || "").trim().toLowerCase();
      try { await admin.auth().getUserByEmail(cleanEmail); } catch (e) { return res.status(404).json({ error: "Email ini belum terdaftar di aplikasi kami." }); }

      let otp = Math.floor(100000 + Math.random() * 900000).toString(); 
      try {
          await ensureOtpTable();

          try {
              const result = await db.execute(sql`SELECT code, created_at FROM otp_sessions WHERE LOWER(TRIM(email)) = ${cleanEmail}`);
              const rows = Array.isArray(result) ? result : (result as any).rows || [];
              if (rows.length > 0) {
                  const createdAt = new Date(rows[0].created_at).getTime();
                  if (Date.now() - createdAt < 300000) otp = rows[0].code;
              }

              await db.execute(sql`DELETE FROM otp_sessions WHERE LOWER(TRIM(email)) = ${cleanEmail}`);
              await db.execute(sql`INSERT INTO otp_sessions (email, code, created_at) VALUES (${cleanEmail}, ${otp}, NOW())`);
          } catch (dbError: any) {
              return res.status(500).json({ error: `Gagal menyimpan ke Database: ${dbError.message}` });
          }

          if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return res.status(500).json({ error: "Kredensial EMAIL_USER / EMAIL_PASS belum diatur di Vercel." });

          const transporter = createTransporter();
          const htmlContent = `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;"><h2 style="color: #e11d48;">Reset Password Anda</h2><p style="color: #4b5563;">Gunakan kode OTP rahasia berikut untuk membuat password baru Anda.</p><h1 style="background: #f3f4f6; padding: 15px; letter-spacing: 8px; color: #1f2937; border-radius: 8px;">${otp}</h1></div>`;
          
          await transporter.sendMail({ from: `"BILANO Security" <${process.env.EMAIL_USER}>`, to: cleanEmail, subject: "Reset Password BILANO", html: htmlContent });
          res.json({ success: true, message: "OTP Reset Terkirim" }); 

      } catch (error: any) {
          const errMsg = error.message || "";
          if (errMsg.includes("Invalid login") || errMsg.includes("535")) res.status(500).json({ error: "Sistem Email Error (535): App Password Gmail salah atau ditolak oleh Google." });
          else res.status(500).json({ error: `Gagal Kirim Email: ${errMsg.substring(0, 100)}` });
      }
  });

  app.post("/api/transactions/undo", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi telah berakhir." });

          const lastTx = await storage.getLatestTransaction(user.id);
          if (!lastTx) return res.status(404).json({ error: "Tidak ada transaksi yang dapat dibatalkan." });

          let newCashBalance = Math.round(user.cashBalance);
          let walletSources: any[] = user.walletSources ? [...(user.walletSources as any[])] : [];
          const amt = Math.round(lastTx.amount);
          const desc = lastTx.description || "";
          const cat = lastTx.category || "";
          const type = lastTx.type;
          const source = lastTx.source;

          // 1. CEK TRANSAKSI TRANSFER ANTAR DOMPET (PAIRING: TRANSFER MASUK & TRANSFER KELUAR)
          if (cat === 'Transfer Masuk' || cat === 'Transfer Keluar') {
              const allTxs = await storage.getTransactions(user.id);
              const matchingPair = allTxs.find((t: any) => 
                  t.id !== lastTx.id && 
                  (t.category === 'Transfer Keluar' || t.category === 'Transfer Masuk') &&
                  Math.abs(t.amount - amt) < 1 &&
                  Math.abs(new Date(t.date).getTime() - new Date(lastTx.date).getTime()) < 10000
              );

              if (matchingPair) {
                  const inTx = lastTx.category === 'Transfer Masuk' ? lastTx : matchingPair;
                  const outTx = lastTx.category === 'Transfer Keluar' ? lastTx : matchingPair;

                  if (inTx.source) {
                      const toIdx = walletSources.findIndex((w: any) => w.name === inTx.source);
                      if (toIdx >= 0) walletSources[toIdx].balance = Math.max(0, walletSources[toIdx].balance - amt);
                  }
                  if (outTx.source) {
                      const fromIdx = walletSources.findIndex((w: any) => w.name === outTx.source);
                      if (fromIdx >= 0) walletSources[fromIdx].balance = walletSources[fromIdx].balance + amt;
                  }

                  await storage.updateUserWalletSources(user.id, walletSources);
                  await storage.deleteTransaction(lastTx.id);
                  await storage.deleteTransaction(matchingPair.id);

                  return res.json({ 
                      success: true, 
                      message: `Berhasil membatalkan Transfer Antar Dompet (${amt.toLocaleString('id-ID')})` 
                  });
              }
          }

          // 2. CEK TRANSAKSI PENCAIRAN SALDO TERTAHAN (RETAINED BALANCE WITHDRAWAL)
          if (cat === 'Pencairan Dana' || desc.includes('Pencairan dari')) {
              const matchRet = desc.match(/Pencairan dari (.+?)\s*\(([0-9.]+)\s*([A-Z]{3})\)/i);
              if (matchRet) {
                  const retPlatform = matchRet[1].trim();
                  const retAmount = parseFloat(matchRet[2]);
                  const retCurr = matchRet[3].toUpperCase();

                  newCashBalance = Math.max(0, newCashBalance - amt);
                  if (source) {
                      const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                      if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
                  }

                  const retResult = await db.execute(sql`SELECT * FROM retained_balances WHERE user_id = ${user.id} AND LOWER(source) = ${retPlatform.toLowerCase()} LIMIT 1`);
                  const retRows = Array.isArray(retResult) ? retResult : (retResult as any).rows || [];
                  if (retRows.length > 0) {
                      const curRet = retRows[0];
                      await db.execute(sql`UPDATE retained_balances SET amount = ${curRet.amount + retAmount}, updated_at = NOW() WHERE id = ${curRet.id}`);
                  } else {
                      await db.execute(sql`INSERT INTO retained_balances (user_id, source, amount, currency, created_at, updated_at) VALUES (${user.id}, ${retPlatform}, ${retAmount}, ${retCurr}, NOW(), NOW())`);
                  }

                  await storage.updateUserBalance(user.id, newCashBalance);
                  if (source) await storage.updateUserWalletSources(user.id, walletSources);
                  await storage.deleteTransaction(lastTx.id);

                  return res.json({ success: true, message: `Berhasil membatalkan: Pencairan ${retPlatform}` });
              }
          }

          // 3. CEK TRANSAKSI FOREX / VALAS (TUKAR VALAS & CAIRKAN VALAS)
          if (type === 'forex_buy' || type === 'forex_sell' || cat === 'Tukar Valas' || cat === 'Cairkan Valas') {
              const matchFx = desc.match(/(Beli|Jual)\s+([0-9.]+)\s+([A-Z]{3})/i);
              if (matchFx) {
                  const action = matchFx[1].toUpperCase();
                  const qty = parseFloat(matchFx[2]);
                  const curr = matchFx[3].toUpperCase();

                  const existingForex = await storage.getForexByCurrency(user.id, curr);

                  if (action === 'BELI' || type === 'forex_buy') {
                      newCashBalance += amt;
                      if (source) {
                          const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                          if (wsIdx >= 0) walletSources[wsIdx].balance += amt;
                      }
                      if (existingForex) {
                          const newFxAmt = Math.max(0, existingForex.amount - qty);
                          await storage.updateForexAsset(existingForex.id, newFxAmt);
                      }
                  } else {
                      newCashBalance = Math.max(0, newCashBalance - amt);
                      if (source) {
                          const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                          if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
                      }
                      if (existingForex) {
                          await storage.updateForexAsset(existingForex.id, existingForex.amount + qty);
                      } else {
                          await storage.createForexAsset(user.id, { currency: curr, amount: qty } as any);
                      }
                  }

                  await storage.updateUserBalance(user.id, newCashBalance);
                  if (source) await storage.updateUserWalletSources(user.id, walletSources);
                  await storage.deleteTransaction(lastTx.id);

                  return res.json({ success: true, message: `Berhasil membatalkan transaksi Valas: ${action} ${qty} ${curr}` });
              }
          }

          // 4. CEK TRANSAKSI MUTASI VALAS MURNI
          if (cat === 'Pemasukan Valas' || cat === 'Pengeluaran Valas') {
              const matchMutasi = desc.match(/([0-9.]+)\s+([A-Z]{3})/i);
              if (matchMutasi) {
                  const qty = parseFloat(matchMutasi[1]);
                  const curr = matchMutasi[2].toUpperCase();
                  const existingForex = await storage.getForexByCurrency(user.id, curr);

                  if (type === 'income' || cat === 'Pemasukan Valas') {
                      if (existingForex) {
                          await storage.updateForexAsset(existingForex.id, Math.max(0, existingForex.amount - qty));
                      }
                  } else {
                      if (existingForex) {
                          await storage.updateForexAsset(existingForex.id, existingForex.amount + qty);
                      } else {
                          await storage.createForexAsset(user.id, { currency: curr, amount: qty } as any);
                      }
                  }
              }
              if (source) {
                  if (type === 'income') {
                      newCashBalance = Math.max(0, newCashBalance - amt);
                      const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                      if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
                  } else {
                      newCashBalance += amt;
                      const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                      if (wsIdx >= 0) walletSources[wsIdx].balance += amt;
                  }
                  await storage.updateUserBalance(user.id, newCashBalance);
                  await storage.updateUserWalletSources(user.id, walletSources);
              }
              await storage.deleteTransaction(lastTx.id);
              return res.json({ success: true, message: `Berhasil membatalkan: ${cat}` });
          }

          // 5. CEK TRANSAKSI INVESTASI (BELI ASET / JUAL ASET)
          if (type === 'invest_buy' || cat === 'Beli Aset') {
              newCashBalance += amt;
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) walletSources[wsIdx].balance += amt;
              }

              const matchInv = desc.match(/([0-9.]+)\s+(?:unit\/lot|lot\/unit|lot|unit)\s+([A-Z0-9|_-]+)/i);
              if (matchInv) {
                  const qty = parseFloat(matchInv[1]);
                  const symbol = matchInv[2].toUpperCase();
                  const inv = await storage.getInvestmentBySymbol(user.id, symbol);
                  if (inv) {
                      const newQty = inv.quantity - qty;
                      if (newQty <= 0) await storage.deleteInvestment(inv.id);
                      else await storage.updateInvestment(inv.id, newQty, inv.avgPrice);
                  }
              }

              await storage.updateUserBalance(user.id, newCashBalance);
              if (source) await storage.updateUserWalletSources(user.id, walletSources);
              await storage.deleteTransaction(lastTx.id);

              return res.json({ success: true, message: `Berhasil membatalkan Pembelian Aset (${lastTx.description})` });
          }

          if (type === 'invest_sell' || cat === 'Jual Aset') {
              newCashBalance = Math.max(0, newCashBalance - amt);
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
              }

              const matchInvSell = desc.match(/([0-9.]+)\s+(?:unit\/lot|lot\/unit|lot|unit)\s+([A-Z0-9|_-]+)(?:\s+@\s+([A-Z]{3})?\s*([0-9.,]+))?/i);
              if (matchInvSell) {
                  const qty = parseFloat(matchInvSell[1]);
                  const symbol = matchInvSell[2].toUpperCase();
                  const priceStr = matchInvSell[4] ? matchInvSell[4].replace(/,/g, '') : "0";
                  const price = parseFloat(priceStr) || 0;

                  const inv = await storage.getInvestmentBySymbol(user.id, symbol);
                  if (inv) {
                      await storage.updateInvestment(inv.id, inv.quantity + qty, inv.avgPrice);
                  } else {
                      await storage.createInvestment(user.id, {
                          symbol,
                          quantity: qty,
                          avgPrice: price,
                          type: symbol.length === 4 ? 'saham' : 'crypto'
                      } as any);
                  }
              }

              await storage.updateUserBalance(user.id, newCashBalance);
              if (source) await storage.updateUserWalletSources(user.id, walletSources);
              await storage.deleteTransaction(lastTx.id);

              return res.json({ success: true, message: `Berhasil membatalkan Penjualan Aset (${lastTx.description})` });
          }

          // 6. CEK TRANSAKSI HUTANG & PIUTANG
          if (type === 'debt_pay' || cat === 'Bayar Hutang' || cat === 'Bayar Hutang Valas') {
              newCashBalance += amt;
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) walletSources[wsIdx].balance += amt;
              }

              const matchDebtName = desc.match(/Lunas\/Cicilan ke (.+?)(?:\s*\(|$)/i);
              if (matchDebtName) {
                  const debtNameOnly = matchDebtName[1].trim();
                  const debts = await storage.getDebts(user.id);
                  const matchedDebt = debts.find((d: any) => d.type === 'hutang' && d.name.toLowerCase().includes(debtNameOnly.toLowerCase()));
                  if (matchedDebt && matchedDebt.isPaid) {
                      await db.execute(sql`UPDATE debts SET is_paid = false WHERE id = ${matchedDebt.id}`);
                  }
              }

              await storage.updateUserBalance(user.id, newCashBalance);
              if (source) await storage.updateUserWalletSources(user.id, walletSources);
              await storage.deleteTransaction(lastTx.id);

              return res.json({ success: true, message: `Berhasil membatalkan Pembayaran Hutang (${lastTx.description})` });
          }

          if (type === 'debt_receive' || cat === 'Piutang Dibayar' || cat === 'Piutang Valas Dibayar') {
              newCashBalance = Math.max(0, newCashBalance - amt);
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
              }

              const matchPiutangName = desc.match(/Lunas\/Cicilan dari (.+?)(?:\s*\(|$)/i);
              if (matchPiutangName) {
                  const piutangNameOnly = matchPiutangName[1].trim();
                  const debts = await storage.getDebts(user.id);
                  const matchedPiutang = debts.find((d: any) => d.type === 'piutang' && d.name.toLowerCase().includes(piutangNameOnly.toLowerCase()));
                  if (matchedPiutang && matchedPiutang.isPaid) {
                      await db.execute(sql`UPDATE debts SET is_paid = false WHERE id = ${matchedPiutang.id}`);
                  }
              }

              await storage.updateUserBalance(user.id, newCashBalance);
              if (source) await storage.updateUserWalletSources(user.id, walletSources);
              await storage.deleteTransaction(lastTx.id);

              return res.json({ success: true, message: `Berhasil membatalkan Penerimaan Piutang (${lastTx.description})` });
          }

          if (type === 'debt_lend' || cat === 'Beri Pinjaman' || cat === 'Beri Pinjaman Valas') {
              newCashBalance += amt;
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) walletSources[wsIdx].balance += amt;
              }

              const matchDebtTitle = desc.match(/\[(PIUTANG|HUTANG)\]\s*(.+?)(?:\s*-\s*|$)/i);
              if (matchDebtTitle) {
                  const dName = matchDebtTitle[2].trim();
                  const debts = await storage.getDebts(user.id);
                  const matched = debts.find((d: any) => d.type === 'piutang' && d.name.toLowerCase().includes(dName.toLowerCase()));
                  if (matched) await storage.deleteDebt(matched.id);
              }

              await storage.updateUserBalance(user.id, newCashBalance);
              if (source) await storage.updateUserWalletSources(user.id, walletSources);
              await storage.deleteTransaction(lastTx.id);

              return res.json({ success: true, message: `Berhasil membatalkan Pinjaman Diberikan (${lastTx.description})` });
          }

          if (type === 'debt_borrow' || cat === 'Dapat Pinjaman' || cat === 'Dapat Pinjaman Valas') {
              newCashBalance = Math.max(0, newCashBalance - amt);
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
              }

              const matchDebtTitle = desc.match(/\[(PIUTANG|HUTANG)\]\s*(.+?)(?:\s*-\s*|$)/i);
              if (matchDebtTitle) {
                  const dName = matchDebtTitle[2].trim();
                  const debts = await storage.getDebts(user.id);
                  const matched = debts.find((d: any) => d.type === 'hutang' && d.name.toLowerCase().includes(dName.toLowerCase()));
                  if (matched) await storage.deleteDebt(matched.id);
              }

              await storage.updateUserBalance(user.id, newCashBalance);
              if (source) await storage.updateUserWalletSources(user.id, walletSources);
              await storage.deleteTransaction(lastTx.id);

              return res.json({ success: true, message: `Berhasil membatalkan Pinjaman Diterima (${lastTx.description})` });
          }

          // 7. TRANSAKSI STANDAR (INCOME & EXPENSE LAINNYA / AMAL / LANGGANAN)
          if (type === 'income' || type === 'piutang_record') {
              newCashBalance = Math.max(0, newCashBalance - amt);
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
              }
          } else {
              newCashBalance += amt;
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) walletSources[wsIdx].balance += amt;
              }
          }

          await storage.updateUserBalance(user.id, newCashBalance);
          if (source) await storage.updateUserWalletSources(user.id, walletSources);
          await storage.deleteTransaction(lastTx.id);

          res.json({ 
              success: true, 
              message: `Berhasil membatalkan: ${cat || type} (${desc || amt.toLocaleString('id-ID')})` 
          });
      } catch (e: any) { 
          res.status(500).json({ error: e.message || "Gagal membatalkan transaksi." }); 
      }
  });

  app.post("/api/auth/reset-password", async (req: any, res: any) => {
      if (!firebaseAdminInitialized) return res.status(500).json({ error: "Kunci Admin JSON di Vercel belum dikonfigurasi!" });
      const { email, code, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password baru minimal 6 karakter!" });

      try {
          const cleanEmail = email.trim().toLowerCase();
          const result = await db.execute(sql`SELECT code FROM otp_sessions WHERE LOWER(TRIM(email)) = ${cleanEmail}`);
          const rows = Array.isArray(result) ? result : (result as any).rows || [];
          
          if (rows.length === 0 || rows[0].code.trim() !== code.trim()) {
              return res.status(400).json({ error: "Kode OTP Salah atau Kadaluarsa!" });
          }

          const userRecord = await admin.auth().getUserByEmail(cleanEmail);
          await admin.auth().updateUser(userRecord.uid, { password: newPassword });
          
          await db.execute(sql`DELETE FROM otp_sessions WHERE LOWER(TRIM(email)) = ${cleanEmail}`); 
          res.status(200).json({ success: true, message: "Password berhasil diubah" });
      } catch (error: any) { res.status(500).json({ error: "Gagal mengganti password: " + error.message }); }
  });

  app.post("/api/auth/verify-otp", async (req: any, res: any) => {
      const { email, code } = req.body;
      try {
          const cleanEmail = email.trim().toLowerCase();
          const result = await db.execute(sql`SELECT code FROM otp_sessions WHERE LOWER(TRIM(email)) = ${cleanEmail}`);
          const rows = Array.isArray(result) ? result : (result as any).rows || [];
          
          if (rows.length > 0 && rows[0].code.trim() === code.trim()) {
              await db.execute(sql`DELETE FROM otp_sessions WHERE LOWER(TRIM(email)) = ${cleanEmail}`);
              res.json({ success: true });
          } else {
              res.status(400).json({ error: "Kode OTP Salah atau Kadaluarsa" });
          }
      } catch (e) { res.status(500).json({ error: "Error mengecek OTP di database." }); }
  });

  app.get("/api/ping", async (req: any, res: any) => {
      try {
          await db.execute(sql`SELECT 1`);
          res.status(200).json({ status: "awake & db connected", time: new Date().toISOString() });
      } catch (error) { res.status(200).json({ status: "awake but db delayed", message: "It's fine" }); }
  });

  const getUser = async (req: any) => {
    try {
      const rawEmail = req?.headers?.["x-user-email"];
      const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : "";
      
      if (!email || email === "guest") {
          let user = await storage.getUser(1).catch(() => null);
          if (!user) {
              user = await storage.getUserByUsername("guest").catch(() => null);
          }
          if (!user) {
              user = await storage.createUser({ username: "guest", password: "123", email: "guest@bilano.app" }).catch(() => null);
          }
          return user || { id: 1, username: "guest", email: "guest@bilano.app", isPro: false, cashBalance: 0 };
      }
      
      let user = await storage.getUserByUsername(email).catch(() => null);
      if (!user) {
          try { 
              user = await storage.createUser({ username: email, password: "123", email: email }); 
          } catch (err) { 
              user = await storage.getUserByUsername(email).catch(() => null); 
          }
      }
      
      const vipEmails = ["adrienfandra14@gmail.com", "bilanotech@gmail.com"];
      if (user && vipEmails.includes(user.email?.toLowerCase() || "")) {
          user.isPro = true;
          user.proValidUntil = new Date("2099-12-31").toISOString() as any; 
          return user; 
      }
      if (user && user.isPro && user.proValidUntil) {
          const now = new Date();
          const validUntil = new Date(user.proValidUntil);
          if (now > validUntil) user = await storage.updateUserProStatus(user.id, false, null);
      }
      return user || { id: 1, username: "guest", email: "guest@bilano.app", isPro: false, cashBalance: 0 };
    } catch (e) {
      console.error("getUser error:", e);
      return { id: 1, username: "guest", email: "guest@bilano.app", isPro: false, cashBalance: 0 };
    }
  };

  app.post("/api/user/onesignal", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const { onesignalId } = req.body;
          if (user && onesignalId) await storage.updateUserOneSignalId(user.id, onesignalId);
          res.json({ success: true });
      } catch (e) { res.status(500).json({ error: "Gagal menyimpan ID OneSignal" }); }
  });

  app.all("/api/cron/notifications", async (req: any, res: any) => {
      try {
          const restKey = process.env.ONESIGNAL_REST_KEY;
          const appId = process.env.ONESIGNAL_APP_ID; 

          if (!restKey || !appId) return res.status(400).json({ error: "ONESIGNAL_REST_KEY atau ONESIGNAL_APP_ID tidak ditemukan di environment Vercel." });

          // Hitung Jam Sekarang dalam WIB (UTC+7)
          const nowUtc = new Date();
          const wibHour = (nowUtc.getUTCHours() + 7) % 24;

          let heading = "BILANO Finance 🎯";
          let messagePool: string[] = [];

          if (wibHour >= 5 && wibHour < 11) {
              // 🌅 PAGI (05:00 - 10:59 WIB)
              heading = "Semangat Pagi dari BILANO ☀️";
              messagePool = [
                  "Awali hari dengan kontrol finansial prima! Cek pos anggaran hari ini 🎯",
                  "Sebelum beraktivitas, pastikan alokasi kas & tabunganmu aman yuk ☕",
                  "Disiplin kecil di pagi hari membawa kebebasan finansial di masa depan 🚀",
                  "Cek status dompet & target finansialmu sebelum mulai berbelanja 📊"
              ];
          } else if (wibHour >= 11 && wibHour < 15) {
              // 🍱 SIANG (11:00 - 14:59 WIB)
              heading = "Cek Arus Kas Siang 🍱";
              messagePool = [
                  "Habis makan siang atau jajan kopi? Yuk langsung catat di BILANO ☕",
                  "Pantau pengeluaran siang hari agar tetap sesuai rencana anggaranmu 💸",
                  "Jangan biarkan ada pos pengeluaran yang terlewat, catat dalam 5 detik ⚡",
                  "Waktunya cek dompet tengah hari: Arus kas masih aman terkendali? 🔍"
              ];
          } else if (wibHour >= 15 && wibHour < 19) {
              // 🌇 SORE (15:00 - 18:59 WIB)
              heading = "Tinjauan Sore BILANO 🌇";
              messagePool = [
                  "Aktivitas sore selesai! Yuk cek rekap pengeluaran harianmu sebelum malam 📝",
                  "Ada tagihan atau piutang yang jatuh tempo hari ini? Cek di BILANO yuk 🔔",
                  "Disiplin mencatat di sore hari bikin evaluasi malam lebih tenang 📈",
                  "Kekayaan bertumbuh dari konsistensi catatan harianmu 🌟"
              ];
          } else {
              // 🌙 MALAM (19:00 - 23:59 & Dini Hari WIB)
              heading = "Rekap Finansial Malam 🌙";
              messagePool = [
                  "Yuk luangkan 1 menit untuk rekap seluruh pengeluaran & pemasukan hari ini 📊",
                  "Cek kesehatan arus kas dan perkembangan target kekayaanmu sebelum istirahat 💤",
                  "Hari ini sudah hemat atau ada bocor halus? Yuk evaluasi bersama BILANO ✨",
                  "Tutup hari dengan portofolio yang rapi dan terencana dengan baik 🏆"
              ];
          }

          const selectedMsg = messagePool[Math.floor(Math.random() * messagePool.length)];

          const payload = {
              app_id: appId,
              included_segments: ["Subscribed Users"], 
              headings: { en: heading, id: heading },
              contents: { en: selectedMsg, id: selectedMsg },
              url: "https://bilano.app/",
              chrome_web_icon: "https://bilanofinance-dvbi.vercel.app/BILANO-ICON-NEW.png",
              chrome_web_badge: "https://bilanofinance-dvbi.vercel.app/BILANO-ICON-NEW.png",
              firefox_icon: "https://bilanofinance-dvbi.vercel.app/BILANO-ICON-NEW.png"
          };

          const response = await fetch("https://onesignal.com/api/v1/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Basic ${restKey}` },
              body: JSON.stringify(payload)
          });

          const data = await response.json();
          res.json({ success: true, wibHour, heading, message: selectedMsg, onesignal_response: data });
      } catch (error: any) {
          res.status(500).json({ error: "Gagal memproses Cron Job OneSignal: " + error.message });
      }
  });

  app.post("/api/chat/ask", async (req: any, res: any) => {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ reply: "Sesi berakhir. Login dulu ya." });
      
      const { message, history, financialContext } = req.body; 

      const systemPrompt = `
Kamu adalah BILANO Intelligence, asisten pintar dan konsultan keuangan elit, profesional, dan strategis yang tertanam di dalam aplikasi BILANO.
Kamu diciptakan dan dikembangkan oleh Adrien Fandra.
PENTING: Kamu TIDAK BOLEH menyebut identitasmu sebagai Gemini, buatan Google, ChatGPT, OpenAI, atau program AI generik lainnya. Jika terjadi kendala, jangan pernah menyebut teknis API.

================================================================================
🚨 ATURAN UTAMA & PEMBATASAN TOPIK (STRICT DOMAIN GUARDRAILS - SANGAT KETAT):
================================================================================
Kamu adalah ASISTEN KHUSUS KEUANGAN, INVESTASI, DAN EKONOMI BISNIS.
Kamu HANYA BOLEH menjawab, menganalisis, dan berdiskusi seputar:
1. Keuangan pribadi (personal finance), arus kas (cashflow), manajemen kas/dompet, budgeting, penghematan, audit kebocoran dana, dana darurat, dan target keuangan.
2. Investasi dan portofolio (saham, reksadana, crypto, emas, obligasi, properti, bisnis), analisis risiko, dan strategi alokasi aset.
3. Valuta asing (forex), kurs mata uang, transaksi tukar valas, dan lindung nilai (hedging).
4. Manajemen dan strategi pelunasan hutang serta penagihan piutang.
5. Manajemen langganan rutin (subscriptions), saldo tertahan (retained balance), dan alokasi amal/sedekah.
6. Strategi peningkatan pendapatan (income strategy), monetisasi keahlian, dan analisis mendalam dari data keuangan pengguna yang ada di BILANO.

⛔ BATASAN NON-KEUANGAN (WAJIB DITOLAK SECARA TEGAS & ELEGAN):
Jika pengguna menanyakan hal di LUAR topik keuangan, finansial, investasi, ekonomi, bisnis, atau fitur aplikasi BILANO (contohnya: resep masakan, tugas sekolah matematika/fisika/biologi/sains umum, pemrograman/coding umum di luar sistem finance, cerita fiksi/dongeng, gosip selebriti, kesehatan medis, game, puisi, lirik lagu, obrolan santai tanpa kaitan finansial, dsb.):
-> KAMU DILARANG KERAS MEMBERIKAN JAWABAN ATAS TOPIK TERSEBUT.
-> Tolaklah dengan sopan, berwibawa, elegan, dan profesional.
-> Terangkan kepada pengguna bahwa kamu adalah "BILANO Intelligence", konsultan spesialis keuangan yang didedikasikan secara eksklusif untuk mendampingi pengelolaan keuangan, kekayaan, aset, dan investasi pengguna.
-> Ajak pengguna kembali untuk menanyakan perihal kondisi keuangan, evaluasi pengeluaran, strategi investasi, atau alokasi aset mereka.

================================================================================
🧠 INSTRUKSI SIKAP & KUALITAS ANALISIS:
================================================================================
1. INGAT KONTEKS & RIWAYAT: Sambungkan jawaban dengan riwayat percakapan sebelumnya secara koheren dan cerdas.
2. ANALISIS DATA 360° MENYELURUH: Baca dan manfaatkan seluruh data keuangan live pengguna di bawah ini (saldo kas, dompet, pemasukan, pengeluaran per kategori, investasi, valas, saldo tertahan, hutang/piutang, langganan, target impian) untuk memberikan masukan yang benar-benar akurat, berbasis data nyata pengguna, dan bernilai tinggi (high-value actionable insights).
3. DEKONSTRUKSI MASALAH & MULTI-OPSI STRATEGI: Jangan pernah mendikte satu solusi kaku. Bedah akar masalahnya, lalu tawarkan beberapa opsi strategi terukur (misal: Opsi A - Agresif vs Opsi B - Bertahap) beserta pertimbangan pro dan kontranya agar pengguna dapat mengambil keputusan terbaik.
4. GAYA KOMUNIKASI: Luwes, elegan, berwibawa, tajam, langsung ke inti (No Yapping), menggunakan format Markdown yang rapi (bolding pada angka krusial, bullet points terstruktur).
5. MENTOR PROAKTIF: Di akhir setiap jawaban finansial, sertakan 1 pertanyaan tindak lanjut atau rekomendasi langkah konkret berikutnya untuk membantu pengguna.
7. PENAWARAN TINDAK LANJUT INTERAKTIF (FOLLOW-UP OPTIONS):
Di akhir setiap jawabanmu, kamu WAJIB memberikan penawaran tindak lanjut/opsi langkah berikutnya yang proaktif, jelas, dan relevan dengan topik yang baru dibahas.
Tuliskan opsi-opsi pilihan tersebut di baris paling akhir pesanmu dengan format persis:
[SUGGESTIONS: ["Opsi 1", "Opsi 2", "Opsi 3"]]

Contoh jika menawarkan simulasi/penjelasan lebih lanjut:
[SUGGESTIONS: ["Mau, tolong simulasikan", "Tidak, sudah cukup jelas"]]

Contoh jika membedah multi-opsi strategi (misal Opsi A vs Opsi B):
[SUGGESTIONS: ["Bedah Opsi Agresif", "Bedah Opsi Bertahap", "Tidak, terima kasih"]]

Contoh jika mengevaluasi portofolio atau kebocoran dana:
[SUGGESTIONS: ["Audit Pengeluaran Lain", "Simulasi Alokasi Saham", "Tidak, sudah paham"]]

Aturan penulisan [SUGGESTIONS: ...]:
- Gunakan 2 sampai 3 tombol opsi yang singkat (2-5 kata per opsi).
- Jika ada penawaran 'Apakah mau dijabarkan lebih lanjut?', sediakan tombol "Mau, tolong jabarkan" dan "Tidak, sudah jelas".
- Jika ada topik-topik turunan (Detail A, Detail B), berikan nama detail tersebut di dalam tombol.
- Pastikan format JSON array string valid di dalam tag [SUGGESTIONS: [...]].

================================================================================
📊 DATA KEUANGAN LIVE PENGGUNA (LENGKAP DARI SELURUH HALAMAN BILANO):
================================================================================
${financialContext}

Jawab dengan format Markdown yang rapi, elegan, berwibawa, langsung ke solusinya (No Yapping), dan sertakan tag [SUGGESTIONS: [...]] di baris paling akhir!
`;

      const rawReply = await askSmartAI(systemPrompt, message, history);
      let reply = rawReply;
      let suggestions: string[] = [];

      const suggestionsRegex = /\[SUGGESTIONS:\s*(\[.*?\])\s*\]/is;
      const match = rawReply.match(suggestionsRegex);
      if (match) {
          try {
              suggestions = JSON.parse(match[1]);
              reply = rawReply.replace(suggestionsRegex, '').trim();
          } catch (e) {
              const inside = match[1].replace(/[\[\]"]/g, '');
              suggestions = inside.split(',').map((s: string) => s.trim()).filter(Boolean);
              reply = rawReply.replace(suggestionsRegex, '').trim();
          }
      }

      if (!suggestions || suggestions.length === 0) {
          const lower = reply.toLowerCase();
          if (lower.includes("apakah anda ingin") || lower.includes("apakah mau") || lower.includes("tertarik") || lower.includes("apakah kamu mau")) {
              suggestions = ["Mau, tolong jelaskan detailnya", "Tidak, sudah cukup jelas"];
          } else {
              suggestions = ["Jelaskan Lebih Detail", "Simulasi Arus Kas Lain", "Tidak, sudah cukup"];
          }
      }

      res.json({ reply, suggestions });
  });

  app.get("/api/retained", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          await ensureRetainedTable();
          const result = await db.execute(sql`SELECT * FROM retained_balances WHERE user_id = ${user!.id} ORDER BY updated_at DESC`);
          const rows = Array.isArray(result) ? result : (result as any).rows || [];
          res.json(rows.map((r:any) => ({ id: r.id, userId: r.user_id, source: r.source, amount: r.amount, currency: r.currency, createdAt: r.created_at, updatedAt: r.updated_at })));
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/retained", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const { source, amount, currency } = req.body;
          await ensureRetainedTable();
          await db.execute(sql`INSERT INTO retained_balances (user_id, source, amount, currency, created_at, updated_at) VALUES (${user!.id}, ${source}, ${amount}, ${currency}, NOW(), NOW())`);
          res.json({ success: true });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/retained/:id", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const { amount } = req.body;
          await db.execute(sql`UPDATE retained_balances SET amount = ${amount}, updated_at = NOW() WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
          res.json({ success: true });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/retained/:id", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          await db.execute(sql`DELETE FROM retained_balances WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
          res.json({ success: true });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/retained/:id/withdraw", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const { amount, source } = req.body;
          const result = await db.execute(sql`SELECT * FROM retained_balances WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
          const rows = Array.isArray(result) ? result : (result as any).rows || [];
          if (rows.length === 0) return res.status(404).json({ error: "Data tidak ditemukan" });
          
          const retained = rows[0];
          if (amount > retained.amount) return res.status(400).json({ error: "Jumlah melebihi saldo" });

          const newAmount = retained.amount - amount;
          await db.execute(sql`UPDATE retained_balances SET amount = ${newAmount}, updated_at = NOW() WHERE id = ${req.params.id}`);

          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 
          const rate = retained.currency === 'IDR' ? 1 : (cachedRates[retained.currency] || 15000);
          const amountIDR = Math.round(amount * rate);

          const newBalance = Math.round(user!.cashBalance) + amountIDR;
          await storage.updateUserBalance(user!.id, newBalance);
          
          if (source) {
              const walletSources = user!.walletSources ? [...(user!.walletSources as any[])] : [];
              const wsIdx = walletSources.findIndex((w: any) => w.name === source);
              if (wsIdx >= 0) {
                  walletSources[wsIdx].balance += amountIDR;
                  await storage.updateUserWalletSources(user!.id, walletSources);
              }
          }

          await storage.createTransaction(user!.id, { 
              userId: user!.id, 
              type: 'income', 
              amount: amountIDR, 
              category: 'Pencairan Dana', 
              description: `Pencairan dari ${retained.source} (${amount} ${retained.currency})`, 
              date: new Date(),
              source: source || null
          } as any);

          res.json({ success: true, newBalance });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/user/wallet-sources", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
          const { walletSources, cashBalance } = req.body; // Array of sources and total balance
          
          if (walletSources !== undefined) {
              await storage.updateUserWalletSources(user.id, walletSources);
          }
          if (cashBalance !== undefined) {
              await storage.updateUserBalance(user.id, Math.round(cashBalance));
          }
          res.json({ success: true, message: "Sumber dompet berhasil diperbarui." });
      } catch (e: any) {
          res.status(500).json({ error: e.message });
      }
  });

  app.get("/api/transactions", async (req: any, res: any) => { const user = await getUser(req); res.json(await storage.getTransactions(user!.id)); });
  
  app.post("/api/transactions", async (req: any, res: any) => { 
      const user = await getUser(req); 
      const parsed = insertTransactionSchema.safeParse(req.body); 
      if (!parsed.success) return res.status(400).json(parsed.error); 
      
      const tx = await storage.createTransaction(user!.id, { ...parsed.data, userId: user!.id } as any); 
      let newBalance = Math.round(user!.cashBalance); 
      let walletSources: any[] = user!.walletSources ? [...(user!.walletSources as any[])] : [];
      
      const isValas = parsed.data.category?.includes('Valas');
      const amt = Math.round(parsed.data.amount);
      const sourceName = parsed.data.source;

      if (!isValas) {
          if (parsed.data.type === 'income') {
              newBalance += amt;
              if (sourceName) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === sourceName);
                  if (wsIdx >= 0) {
                      walletSources[wsIdx].balance += amt;
                  } else {
                      walletSources.push({
                          id: Date.now().toString(),
                          name: sourceName,
                          type: 'bank',
                          balance: amt
                      });
                  }
              }
          } 
          else if (parsed.data.type === 'expense') {
              newBalance -= amt; 
              if (sourceName) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === sourceName);
                  if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
              }
          }
      }
      
      if (newBalance !== Math.round(user!.cashBalance)) {
          await storage.updateUserBalance(user!.id, newBalance); 
      }
      if (sourceName) {
          await storage.updateUserWalletSources(user!.id, walletSources);
      }
      res.json(tx); 
  });

  app.post("/api/transactions/batch", async (req: any, res: any) => {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

      const { transactions: txList } = req.body;
      if (!txList || !Array.isArray(txList) || txList.length === 0) {
          return res.status(400).json({ error: "Tidak ada transaksi yang dikirim." });
      }

      let newBalance = Math.round(user.cashBalance);
      let walletSources: any[] = user.walletSources ? [...(user.walletSources as any[])] : [];
      const createdTxs = [];

      for (const item of txList) {
          const parsed = insertTransactionSchema.safeParse({
              ...item,
              date: item.date ? new Date(item.date) : new Date(),
              amount: Math.round(parseFloat(item.amount) || 0)
          });
          if (!parsed.success) continue;

          const tx = await storage.createTransaction(user.id, { ...parsed.data, userId: user.id } as any);
          createdTxs.push(tx);

          const isValas = parsed.data.category?.includes('Valas');
          const amt = Math.round(parsed.data.amount);
          const sourceName = parsed.data.source;

          if (!isValas) {
              if (parsed.data.type === 'income') {
                  newBalance += amt;
                  if (sourceName) {
                      const wsIdx = walletSources.findIndex((w: any) => w.name === sourceName);
                      if (wsIdx >= 0) {
                          walletSources[wsIdx].balance += amt;
                      } else {
                          walletSources.push({
                              id: Date.now().toString() + Math.random(),
                              name: sourceName,
                              type: 'bank',
                              balance: amt
                          });
                      }
                  }
              } else if (parsed.data.type === 'expense') {
                  newBalance -= amt;
                  if (sourceName) {
                      const wsIdx = walletSources.findIndex((w: any) => w.name === sourceName);
                      if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
                  }
              }
          }
      }

      if (newBalance !== Math.round(user.cashBalance)) {
          await storage.updateUserBalance(user.id, newBalance);
      }
      if (walletSources.length > 0) {
          await storage.updateUserWalletSources(user.id, walletSources);
      }

      res.json({ success: true, count: createdTxs.length, transactions: createdTxs });
  });

  app.delete("/api/user/account", async (req: any, res: any) => {
      const user = await getUser(req);
      if (!user || user.username === 'guest') return res.status(401).json({ error: "Sesi tidak valid." });

      try {
          if (firebaseAdminInitialized && user.email) {
              try {
                  const record = await admin.auth().getUserByEmail(user.email);
                  await admin.auth().deleteUser(record.uid);
              } catch (e) { console.log("Firebase user not found or error deleting"); }
          }
          await db.execute(sql`DELETE FROM transactions WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM investments WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM targets WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM debts WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM subscriptions WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM categories WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM forex_assets WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM help_tickets WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM retained_balances WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM portfolio_snapshots WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM users WHERE id = ${user.id}`);
          res.json({ success: true, message: "Seluruh data akun berhasil dimusnahkan." });
      } catch (error) { res.status(500).json({ error: "Gagal memusnahkan data akun." }); }
  });

  app.delete("/api/transactions/:id", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const txId = parseInt(req.params.id);
          const txs = await storage.getTransactions(user!.id);
          const txToDelete = txs.find((t: any) => t.id === txId);

          if (!txToDelete) return res.status(404).json({ error: "Data transaksi tidak ditemukan" });

          let newBalance = Math.round(user!.cashBalance);
          const amt = Math.round(txToDelete.amount);
          
          const isValas = txToDelete.category?.includes('Valas');

          if (!isValas) {
              if (txToDelete.type === 'income') newBalance -= amt;
              else if (txToDelete.type === 'expense') newBalance += amt;
              else if (txToDelete.type === 'debt_borrow') newBalance -= amt;
              else if (txToDelete.type === 'debt_lend') newBalance += amt;
              else if (txToDelete.type === 'debt_receive') newBalance -= amt;
              else if (txToDelete.type === 'debt_pay') newBalance += amt;
          }

          if (txToDelete.type === 'invest_buy') newBalance += amt; 
          else if (txToDelete.type === 'invest_sell') newBalance -= amt; 
          else if (txToDelete.type === 'forex_buy') {
              newBalance += amt;
              try {
                  const desc = txToDelete.description || "";
                  const match = desc.match(/Beli\s+([0-9.]+)\s+([A-Z]{3})/i);
                  if (match) {
                      const qty = parseFloat(match[1]);
                      const curr = match[2].toUpperCase();
                      const existingForex = await storage.getForexByCurrency(user!.id, curr);
                      if (existingForex) {
                          let newForex = existingForex.amount - qty;
                          if (newForex < 0) newForex = 0;
                          await storage.updateForexAsset(existingForex.id, newForex);
                      }
                  }
              } catch(e) {}
          }
          else if (txToDelete.type === 'forex_sell') {
              newBalance -= amt; 
              try {
                  const desc = txToDelete.description || "";
                  const match = desc.match(/Jual\s+([0-9.]+)\s+([A-Z]{3})/i);
                  if (match) {
                      const qty = parseFloat(match[1]);
                      const curr = match[2].toUpperCase();
                      const existingForex = await storage.getForexByCurrency(user!.id, curr);
                      if (existingForex) await storage.updateForexAsset(existingForex.id, existingForex.amount + qty);
                      else await storage.createForexAsset(user!.id, { currency: curr, amount: qty } as any);
                  }
              } catch(e) {}
          }

          if (newBalance !== Math.round(user!.cashBalance)) await storage.updateUserBalance(user!.id, newBalance);
          if (txToDelete.source && user!.walletSources) {
              let walletSources: any[] = [...(user!.walletSources as any[])];
              const wsIdx = walletSources.findIndex((w: any) => w.name === txToDelete.source);
              if (wsIdx >= 0) {
                  if (txToDelete.type === 'income' || txToDelete.type === 'debt_borrow' || txToDelete.type === 'debt_receive' || txToDelete.type === 'invest_sell' || txToDelete.type === 'forex_sell') {
                      walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amt);
                  } else if (txToDelete.type === 'expense' || txToDelete.type === 'debt_lend' || txToDelete.type === 'debt_pay' || txToDelete.type === 'invest_buy' || txToDelete.type === 'forex_buy') {
                      walletSources[wsIdx].balance += amt;
                  }
                  await storage.updateUserWalletSources(user!.id, walletSources);
              }
          }
          if (typeof storage.deleteTransaction === 'function') await storage.deleteTransaction(txId);
          res.json({ success: true, message: "Transaksi berhasil dimusnahkan dan dikembalikan" });
      } catch (error) { res.status(500).json({ error: "Terjadi kesalahan pada server saat menghapus" }); }
  });

  app.get("/api/forex", async (req: any, res: any) => { const user = await getUser(req); res.json(await storage.getForexAssets(user!.id)); });
  // Alias for frontend compatibility
  app.get("/api/forex/assets", async (req: any, res: any) => { const user = await getUser(req); res.json(await storage.getForexAssets(user!.id)); });
  
  app.get("/api/forex/rates", async (req: any, res: any) => { 
      const now = Date.now();
      const ONE_HOUR = 1000 * 60 * 60;
      if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > ONE_HOUR) await fetchLiveRates(); 
      if (Object.keys(cachedRates).length === 0) cachedRates = { "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1 };
      res.json(cachedRates); 
  });

  app.post("/api/forex/mutation", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { currency, amount, type, paymentMode, debtName, dueDate, notes, rateSnapshot } = req.body;
          const numAmount = Math.abs(amount);
          
          const now = Date.now();
          const ONE_HOUR = 1000 * 60 * 60;
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > ONE_HOUR) await fetchLiveRates();
          if (Object.keys(cachedRates).length === 0) cachedRates = { "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1 };

          const rate = rateSnapshot || cachedRates[currency as keyof typeof cachedRates] || 15000;
          const amountIDR = Math.round(numAmount * rate);

          const existing = await storage.getForexByCurrency(user.id, currency);
          let currentAmount = existing ? existing.amount : 0;

          if (type === 'OUT' && currentAmount < numAmount) {
              return res.status(400).json({ message: `Saldo ${currency} tidak mencukupi.` });
          }

          if (paymentMode === 'debt') {
              const debtType = type === 'IN' ? 'piutang' : 'hutang';
              await storage.createDebt(user.id, {
                  userId: user.id,
                  name: `${debtName} | ${currency}`,
                  amount: numAmount,
                  type: debtType,
                  dueDate: dueDate ? new Date(dueDate) : null,
                  source: null,
                  isPaid: false
              } as any);

              await storage.createTransaction(user.id, {
                  userId: user.id,
                  type: debtType === 'piutang' ? 'piutang_record' : 'hutang_record',
                  amount: amountIDR,
                  category: debtType === 'piutang' ? 'Piutang Valas' : 'Hutang Valas',
                  description: `[MUTASI DEBT] ${notes || ''}`,
                  date: new Date(),
                  source: null
              } as any);
          } else {
              await storage.createTransaction(user.id, {
                  userId: user.id,
                  type: type === 'IN' ? 'income' : 'expense',
                  amount: amountIDR,
                  category: type === 'IN' ? 'Pemasukan Valas' : 'Pengeluaran Valas',
                  description: notes || `Mutasi ${type} ${currency}`,
                  date: new Date(),
                  source: null
              } as any);
          }

          if (type === 'IN') {
              currentAmount += numAmount;
          } else {
              currentAmount -= numAmount;
          }

          if (existing) {
              await storage.updateForexAsset(existing.id, currentAmount);
          } else {
              await storage.createForexAsset(user.id, { currency, amount: currentAmount } as any);
          }

          res.json({ success: true, newBalance: currentAmount });
      } catch (error: any) {
          res.status(500).json({ error: error.message || "Terjadi kesalahan pada server." });
      }
  });

  app.post("/api/forex/set-balance", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { currency, amount } = req.body;
          const numAmount = Math.max(0, parseFloat(amount) || 0);

          const existing = await storage.getForexByCurrency(user.id, currency);
          if (existing) {
              await storage.updateForexAsset(existing.id, numAmount);
          } else {
              await storage.createForexAsset(user.id, { currency, amount: numAmount } as any);
          }

          res.json({ success: true, currency, newAmount: numAmount });
      } catch (error: any) {
          res.status(500).json({ error: error.message || "Terjadi kesalahan pada server." });
      }
  });

  app.post("/api/forex/exchange", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { action, currency, amount, rate, totalIDR, source } = req.body;
          const numAmount = Math.abs(amount);
          const numTotalIDR = Math.abs(totalIDR);

          const existing = await storage.getForexByCurrency(user.id, currency);
          let currentAmount = existing ? existing.amount : 0;

          let newCashBalance = Math.round(user.cashBalance);
          let walletSources = user.walletSources ? [...(user.walletSources as any[])] : [];

          if (action === 'BUY') {
              if (newCashBalance < numTotalIDR) {
                  return res.status(400).json({ message: "Saldo Rupiah tidak cukup untuk beli Valas." });
              }
              newCashBalance -= numTotalIDR;
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) {
                      walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - numTotalIDR);
                  }
              }
              currentAmount += numAmount;

              await storage.createTransaction(user.id, {
                  userId: user.id,
                  type: 'forex_buy',
                  amount: numTotalIDR,
                  category: 'Tukar Valas',
                  description: `Beli ${numAmount} ${currency} (Rate: Rp ${rate.toLocaleString('id-ID')})`,
                  date: new Date(),
                  source: source || null
              } as any);
          } else {
              if (currentAmount < numAmount) {
                  return res.status(400).json({ message: `Saldo ${currency} tidak mencukupi untuk dijual.` });
              }
              newCashBalance += numTotalIDR;
              if (source) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                  if (wsIdx >= 0) {
                      walletSources[wsIdx].balance += numTotalIDR;
                  } else {
                      walletSources.push({
                          id: Date.now().toString(),
                          name: source,
                          type: 'bank',
                          balance: numTotalIDR
                      });
                  }
              }
              currentAmount -= numAmount;

              await storage.createTransaction(user.id, {
                  userId: user.id,
                  type: 'forex_sell',
                  amount: numTotalIDR,
                  category: 'Cairkan Valas',
                  description: `Jual ${numAmount} ${currency} (Rate: Rp ${rate.toLocaleString('id-ID')})`,
                  date: new Date(),
                  source: source || null
              } as any);
          }

          await storage.updateUserBalance(user.id, newCashBalance);
          if (source) {
              await storage.updateUserWalletSources(user.id, walletSources);
          }

          if (existing) {
              await storage.updateForexAsset(existing.id, currentAmount);
          } else {
              await storage.createForexAsset(user.id, { currency, amount: currentAmount } as any);
          }

          res.json({ success: true, newBalance: currentAmount, newCashBalance });
      } catch (error: any) {
          res.status(500).json({ error: error.message || "Terjadi kesalahan pada server." });
      }
  });

  app.get("/api/forex/history/:currency", async (req: any, res: any) => {
      try {
          const currency = req.params.currency.toUpperCase();
          
          const now = Date.now();
          const ONE_HOUR = 1000 * 60 * 60;
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > ONE_HOUR) await fetchLiveRates();
          if (Object.keys(cachedRates).length === 0) cachedRates = { "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1 };

          const baseRate = cachedRates[currency as keyof typeof cachedRates] || 15000;
          
          const data = [];
          const today = new Date();
          for (let i = 29; i >= 0; i--) {
              const date = new Date(today);
              date.setDate(today.getDate() - i);
              
              const variation = 1 + (Math.sin(i * 0.5) * 0.015) + ((Math.random() - 0.5) * 0.01);
              const rate = Math.round(baseRate * variation * 100) / 100;
              
              const dateStr = date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
              data.push({ date: dateStr, rate });
          }
          
          res.json({ success: true, data });
      } catch (error: any) {
          res.status(500).json({ error: error.message || "Gagal memuat grafik." });
      }
  });

  app.post("/api/forex/transaction", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          // 1. Ambil customRate dari req.body yang diinput pengguna di UI
          const { type, currency, amount, description, rate: customRate, source } = req.body;
          const existing = await storage.getForexByCurrency(user!.id, currency);
          let currentAmount = existing ? existing.amount : 0;
          
          const t = type.toLowerCase();
          
          // 2. Perbaikan logika deteksi penambahan saldo valas menggunakan .includes()
          const isIncome = t.includes('buy') || t.includes('income') || t === 'pemasukan' || t === 'in' || t === 'tambah' || t === 'dapat';
          
          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) {
              await fetchLiveRates(); 
          }
          
          // 3. Gunakan customRate jika tersedia, jika kosong gunakan cachedRates sebagai fallback
          const rate = customRate || cachedRates[currency as keyof typeof cachedRates] || 15000;
          const amountIDR = Math.round(amount * rate);
          let newCashBalance = Math.round(user!.cashBalance);
          let walletSources: any[] = user!.walletSources ? [...(user!.walletSources as any[])] : [];

          if (description) {
              if (isIncome) {
                  currentAmount += amount;
                  await storage.createTransaction(user!.id, { 
                      userId: user!.id, 
                      type: 'income', 
                      amount: amountIDR, 
                      category: 'Pemasukan Valas', 
                      description: description, 
                      date: new Date(),
                      source: source || null
                  } as any);
              } else {
                  if (currentAmount < amount) {
                      return res.status(400).json({ message: `Saldo ${currency} tidak mencukupi untuk dikeluarkan.` });
                  }
                  currentAmount -= amount;
                  if (currentAmount < 0) currentAmount = 0;
                  await storage.createTransaction(user!.id, { 
                      userId: user!.id, 
                      type: 'expense', 
                      amount: amountIDR, 
                      category: 'Pengeluaran Valas', 
                      description: description, 
                      date: new Date(),
                      source: source || null
                  } as any);
              }
          } else {
              if (isIncome) {
                  if (newCashBalance < amountIDR) {
                      return res.status(400).json({ message: "Saldo Rupiah tidak cukup untuk beli Valas." });
                  }
                  currentAmount += amount;
                  newCashBalance -= amountIDR;
                  if (source) {
                      const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                      if (wsIdx >= 0) walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amountIDR);
                  }
                  await storage.createTransaction(user!.id, { 
                      userId: user!.id, 
                      type: 'forex_buy', 
                      amount: amountIDR, 
                      category: 'Tukar Valas', 
                      description: `Beli ${amount} ${currency} (Rate: Rp ${rate.toLocaleString('id-ID')})`, 
                      date: new Date(),
                      source: source || null
                  } as any);
              } else {
                  if (currentAmount < amount) {
                      return res.status(400).json({ message: `Saldo ${currency} tidak mencukupi untuk dijual.` });
                  }
                  currentAmount -= amount;
                  if (currentAmount < 0) currentAmount = 0;
                  newCashBalance += amountIDR;
                  if (source) {
                      const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                      if (wsIdx >= 0) {
                          walletSources[wsIdx].balance += amountIDR;
                      } else {
                          walletSources.push({
                              id: Date.now().toString(),
                              name: source,
                              type: 'bank',
                              balance: amountIDR
                          });
                      }
                  }
                  await storage.createTransaction(user!.id, { 
                      userId: user!.id, 
                      type: 'forex_sell', 
                      amount: amountIDR, 
                      category: 'Cairkan Valas', 
                      description: `Jual ${amount} ${currency} (Rate: Rp ${rate.toLocaleString('id-ID')})`, 
                      date: new Date(),
                      source: source || null
                  } as any);
              }
          }

          await storage.updateUserBalance(user!.id, newCashBalance);
          if (source) {
              await storage.updateUserWalletSources(user!.id, walletSources);
          }
          if (existing) {
              await storage.updateForexAsset(existing.id, currentAmount);
          } else {
              await storage.createForexAsset(user!.id, { currency, amount: currentAmount } as any);
          }
          
          res.json({ success: true, newBalance: currentAmount, newCashBalance });
      } catch (error: any) {
          res.status(500).json({ error: error.message || "Terjadi kesalahan internal pada server." });
      }
  });

  app.get("/api/debts", async (req: any, res: any) => { const user = await getUser(req); res.json(await storage.getDebts(user!.id)); });
  
  app.post("/api/debts", async (req: any, res: any) => { 
      try {
          const user = await getUser(req); 
          const { type, amount, name, description, isFromTransaction, source } = req.body;
          const d = await storage.createDebt(user!.id, { ...req.body, source: source || null } as any); 
          
          if (!isFromTransaction) {
              const now = Date.now();
              if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 

              const parts = (name || "").split('|');
              const curr = parts[1] || 'IDR';
              const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || 15000);
              const amountIDR = Math.round(amount * rate); 
              
              let txType = '', txCat = '';
              if (curr === 'IDR') {
                  if(type === 'hutang') { txType = 'debt_borrow'; txCat = 'Dapat Pinjaman'; } 
                  else { txType = 'debt_lend'; txCat = 'Beri Pinjaman'; }
                  
                  let newBalance = Math.round(user!.cashBalance);
                  let walletSources: any[] = user!.walletSources ? [...(user!.walletSources as any[])] : [];

                  if(type === 'hutang') { 
                      newBalance += amountIDR; 
                      if (source) {
                          const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                          if (wsIdx >= 0) {
                              walletSources[wsIdx].balance += amountIDR;
                          } else {
                              walletSources.push({
                                  id: Date.now().toString(),
                                  name: source,
                                  type: 'bank',
                                  balance: amountIDR
                              });
                          }
                      }
                  } else { 
                      newBalance -= amountIDR; 
                      if (source) {
                          const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                          if (wsIdx >= 0) {
                              walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - amountIDR);
                          }
                      }
                  }
                  await storage.updateUserBalance(user!.id, newBalance);
                  if (source) {
                      await storage.updateUserWalletSources(user!.id, walletSources);
                  }
              } else {
                  if(type === 'hutang') { txType = 'debt_borrow'; txCat = 'Dapat Pinjaman Valas'; } 
                  else { txType = 'debt_lend'; txCat = 'Beri Pinjaman Valas'; }

                  const existingForex = await storage.getForexByCurrency(user!.id, curr);
                  let currentForexAmount = existingForex ? existingForex.amount : 0;
                  
                  if (type === 'hutang') currentForexAmount += amount; 
                  else { currentForexAmount -= amount; if (currentForexAmount < 0) currentForexAmount = 0; }
                  
                  if (existingForex) await storage.updateForexAsset(existingForex.id, currentForexAmount);
                  else if (currentForexAmount > 0) await storage.createForexAsset(user!.id, { currency: curr, amount: currentForexAmount } as any);
              }
              await storage.createTransaction(user!.id, { userId: user!.id, type: txType, amount: amountIDR, category: txCat, description: `[${type.toUpperCase()}] ${name} - ${description||''}`, date: new Date(), source: source || null } as any);
          }
          res.json(d); 
      } catch(e:any) { res.status(500).json({error: e.message}); }
  });

  app.post("/api/debts/:id/restore", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const id = parseInt(req.params.id);

          const debts = await storage.getDebts(user!.id);
          const debt = debts.find((d: any) => d.id === id);

          if (!debt || !debt.isPaid) return res.status(400).json({ error: "Tagihan ini tidak dapat dipulihkan karena belum lunas." });

          await db.execute(sql`UPDATE debts SET is_paid = false WHERE id = ${id}`);

          const debtNameOnly = debt.name.split('|')[0];
          const curr = debt.name.split('|')[1] || 'IDR';

          const txs = await storage.getTransactions(user!.id);
          const payTxs = txs.filter((t: any) => 
              t.description.includes(`Lunas/Cicilan dari ${debtNameOnly}`) ||
              t.description.includes(`Lunas/Cicilan ke ${debtNameOnly}`) ||
              t.description.includes(`[WRITE_OFF] ${debt.name}`) ||
              t.description.includes(`Lunas dari ${debtNameOnly} (Diperbaiki`)
          );

          let cashOffset = 0;
          for (const t of payTxs) {
              if (t.type === 'debt_receive' && !t.category.includes('Valas')) cashOffset -= t.amount;
              if (t.type === 'debt_pay' && !t.category.includes('Valas')) cashOffset += t.amount;
              await storage.deleteTransaction(t.id);
          }

          if (cashOffset !== 0) await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance + cashOffset));

          const hasValasTx = payTxs.some((t: any) => t.category.includes('Valas'));
          if (curr !== 'IDR' && hasValasTx) {
              const existingForex = await storage.getForexByCurrency(user!.id, curr);
              let currentForexAmount = existingForex ? existingForex.amount : 0;
              
              if (debt.type === 'piutang') { currentForexAmount -= debt.amount; if (currentForexAmount < 0) currentForexAmount = 0; } 
              else { currentForexAmount += debt.amount; }

              if (existingForex) await storage.updateForexAsset(existingForex.id, currentForexAmount);
              else if (currentForexAmount > 0) await storage.createForexAsset(user!.id, { currency: curr, amount: currentForexAmount } as any);
          }

          res.json({ success: true, message: "Tagihan berhasil dipulihkan." });
      } catch (error: any) { res.status(500).json({ error: error.message || "Gagal memulihkan tagihan." }); }
  });

  app.post("/api/debts/:id/pay", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const id = parseInt(req.params.id);
          const { amount, isWriteOff, source } = req.body; 
          
          if (!id || isNaN(id)) return res.status(400).json({ error: "ID Tagihan tidak terbaca oleh server." });

          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 

          const debts = await storage.getDebts(user!.id);
          const debt = debts.find((d: any) => d.id === id);
          
          if (!debt) return res.status(404).json({ error: "Tagihan ini sudah tidak ada di database." });
          if (debt.isPaid) return res.status(400).json({ error: "Tagihan ini sudah berstatus lunas sebelumnya." });

          const isIncomePiutang = debt.description?.includes('[PIUTANG_PENDAPATAN]');
          const cairPostfix = isIncomePiutang ? " [Pemasukan Cair]" : "";

          const payAmount = (amount !== undefined && amount > 0) ? Math.min(amount, debt.amount) : debt.amount;
          let newBalance = Math.round(user!.cashBalance);
          let walletSources: any[] = user!.walletSources ? [...(user!.walletSources as any[])] : [];
          
          const curr = (debt.name || "").split('|')[1] || 'IDR';
          const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || 15000);
          const payAmountIDR = Math.round(payAmount * rate); 
          
          if (isWriteOff) {
              const txType = debt.type === 'piutang' ? 'expense' : 'income';
              const txCat = debt.type === 'piutang' ? 'Penghapusan Piutang' : 'Pemutihan Hutang';
              await storage.createTransaction(user!.id, { userId: user!.id, type: txType, amount: payAmountIDR, category: txCat, description: `[WRITE_OFF] ${debt.name}`, date: new Date(), source: source || null } as any);
          } else {
              if (curr === 'IDR') {
                  if (debt.type === 'piutang') { 
                      newBalance += payAmountIDR; 
                      const finalDesc = isIncomePiutang 
                          ? `[PIUTANG_PENDAPATAN] Lunas/Cicilan dari ${debt.name.split('|')[0]}${cairPostfix}`
                          : `Lunas/Cicilan dari ${debt.name.split('|')[0]}`;

                      if (source) {
                          const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                          if (wsIdx >= 0) {
                              walletSources[wsIdx].balance += payAmountIDR;
                          } else {
                              walletSources.push({
                                  id: Date.now().toString(),
                                  name: source,
                                  type: 'bank',
                                  balance: payAmountIDR
                              });
                          }
                      }

                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_receive', amount: payAmountIDR, category: 'Piutang Dibayar', description: finalDesc, date: new Date(), source: source || null } as any); 
                  } else { 
                      newBalance -= payAmountIDR; 
                      if (source) {
                          const wsIdx = walletSources.findIndex((w: any) => w.name === source);
                          if (wsIdx >= 0) {
                              walletSources[wsIdx].balance = Math.max(0, walletSources[wsIdx].balance - payAmountIDR);
                          }
                      }
                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_pay', amount: payAmountIDR, category: 'Bayar Hutang', description: `Lunas/Cicilan ke ${debt.name.split('|')[0]}`, date: new Date(), source: source || null } as any); 
                  }
                  await storage.updateUserBalance(user!.id, newBalance);
                  if (source) {
                      await storage.updateUserWalletSources(user!.id, walletSources);
                  }
              } else {
                  const existingForex = await storage.getForexByCurrency(user!.id, curr);
                  let currentForexAmount = existingForex ? existingForex.amount : 0;

                  if (debt.type === 'piutang') { 
                      currentForexAmount += payAmount; 
                      const finalDesc = isIncomePiutang 
                          ? `[PIUTANG_PENDAPATAN] Lunas/Cicilan dari ${debt.name.split('|')[0]} (Masuk ke Dompet Valas)${cairPostfix}`
                          : `Lunas/Cicilan dari ${debt.name.split('|')[0]} (Masuk ke Dompet Valas)`;

                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_receive', amount: payAmountIDR, category: 'Piutang Valas Dibayar', description: finalDesc, date: new Date(), source: source || null } as any); 
                  } else { 
                      currentForexAmount -= payAmount; 
                      if (currentForexAmount < 0) currentForexAmount = 0;
                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_pay', amount: payAmountIDR, category: 'Bayar Hutang Valas', description: `Lunas/Cicilan ke ${debt.name.split('|')[0]} (Potong dari Dompet Valas)`, date: new Date(), source: source || null } as any); 
                  }

                  if (existingForex) await storage.updateForexAsset(existingForex.id, currentForexAmount);
                  else if (currentForexAmount > 0) await storage.createForexAsset(user!.id, { currency: curr, amount: currentForexAmount } as any);
              }
          }
          
          const remaining = debt.amount - payAmount;
          if (remaining > 0) {
              await storage.createDebt(user!.id, { userId: user!.id, type: debt.type, name: debt.name, amount: remaining, dueDate: (debt as any).dueDate || null, description: (debt.description || '') + ` (Sisa dari ${debt.amount})`, source: (debt as any).source || null } as any);
          }
          
          await storage.markDebtPaid(id); 
          res.json({ success: true });

      } catch (error: any) { res.status(500).json({ error: error.message || "Gagal memproses ke database." }); }
  });

  app.delete("/api/debts/:id", async (req: any, res: any) => { await storage.deleteDebt(parseInt(req.params.id)); res.json({success:true}); });

  app.get("/api/target", async (req: any, res: any) => { 
    try {
      const user = await getUser(req); 
      const target = user ? await storage.getTarget(user.id) : null;
      res.json(target || {}); 
    } catch (e: any) {
      console.error("GET /api/target error:", e);
      res.json({});
    }
  });
  
  app.patch("/api/target/penalty", async (req: any, res: any) => { 
      const user = await getUser(req); 
      try { await storage.updateTargetPenalty(user!.id, Math.round(req.body.amount)); res.json({success:true}); } 
      catch(e) { res.status(500).send("Error"); } 
  });
  
  app.post("/api/target", async (req: any, res: any) => { 
      const user = await getUser(req); 
      const { setCashBalance, initialForexList, initialDebts, initialReceivables, initialInvestments, initialSubscriptions, ...targetData } = req.body; 
      const target = await storage.setTarget(user!.id, targetData as any); 
      const promises = [];
      
      if (setCashBalance !== undefined) promises.push(storage.updateUserBalance(user!.id, Math.round(setCashBalance))); 
      
      if (initialForexList && Array.isArray(initialForexList)) {
          for (const item of initialForexList) {
              if (item.amount > 0) {
                  promises.push((async () => {
                      const existing = await storage.getForexByCurrency(user!.id, item.currency);
                      if (existing) return storage.updateForexAsset(existing.id, item.amount);
                      return storage.createForexAsset(user!.id, { currency: item.currency, amount: item.amount } as any);
                  })());
              }
          }
      }

      if (initialDebts && Array.isArray(initialDebts)) {
          for (const item of initialDebts) {
              if (item.amount > 0 && item.name) promises.push(storage.createDebt(user!.id, { userId: user!.id, type: 'hutang', name: item.name, amount: item.amount } as any));
          }
      }

      if (initialReceivables && Array.isArray(initialReceivables)) {
          for (const item of initialReceivables) {
              if (item.amount > 0 && item.name) promises.push(storage.createDebt(user!.id, { userId: user!.id, type: 'piutang', name: item.name, amount: item.amount } as any));
          }
      }

      if (initialInvestments && Array.isArray(initialInvestments)) {
          for (const item of initialInvestments) {
              if (item.quantity > 0 && item.symbol && item.price > 0) {
                  promises.push(storage.createInvestment(user!.id, { userId: user!.id, symbol: item.symbol.toUpperCase(), quantity: item.quantity, avgPrice: item.price, type: (item.type || 'saham').toLowerCase() } as any));
              }
          }
      }

      if (initialSubscriptions && Array.isArray(initialSubscriptions)) {
          for (const item of initialSubscriptions) {
              if (item.cost > 0 && item.name) {
                  promises.push(storage.createSubscription(user!.id, { userId: user!.id, name: item.name, cost: item.cost, cycle: item.cycle || 'bulanan', nextBilling: item.nextBilling ? new Date(item.nextBilling) : null, isActive: true } as any));
              }
          }
      }
      await Promise.all(promises);
      res.json(target); 
  });
  
  app.get("/api/investments", async (req: any, res: any) => { const user = await getUser(req); res.json(await storage.getInvestments(user!.id)); });
  
  app.post("/api/investments/buy", async (req: any, res: any) => { 
      try {
          const user = await getUser(req); 
          const { symbol, quantity, price, type } = req.body; 
          
          const parts = (symbol || "").split('|');
          const sym = parts[0] || "";
          const curr = parts[1] || 'IDR';
          const typeLower = (type || 'saham').toLowerCase();
          
          const isIDRSaham = typeLower === 'saham' && curr === 'IDR';
          const m = isIDRSaham ? 100 : 1; 
          
          const totalInCurrency = quantity * price * m; 
          
          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 
          const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || 15000);
          const totalIDR = Math.round(totalInCurrency * rate);

          if (curr === 'IDR') {
              const walletSources = user!.walletSources ? [...(user!.walletSources as any[])] : [];
              const sourceName = req.body.source;
              if (sourceName) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === sourceName);
                  if (wsIdx >= 0 && walletSources[wsIdx].balance < totalIDR) {
                      return res.status(400).json({message: `Saldo RDN/Dompet ${sourceName} tidak cukup.`});
                  }
                  if (wsIdx >= 0) {
                      walletSources[wsIdx].balance -= totalIDR;
                      await storage.updateUserWalletSources(user!.id, walletSources);
                  }
              }

              if (user!.cashBalance < totalIDR) {
                  return res.status(400).json({message: "Saldo Rupiah tidak cukup untuk pembelian ini."}); 
              }
              await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance - totalIDR)); 
          } else {
              const existingForex = await storage.getForexByCurrency(user!.id, curr);
              if (!existingForex || existingForex.amount < totalInCurrency) {
                  return res.status(400).json({message: `Saldo Valas ${curr} tidak cukup (Butuh ${totalInCurrency} ${curr}).`});
              }
              await storage.updateForexAsset(existingForex.id, existingForex.amount - totalInCurrency);
          }

          await storage.createTransaction(user!.id, {
              userId: user!.id, 
              type: 'invest_buy', 
              amount: totalIDR, 
              category: 'Beli Aset', 
              description: `${quantity} unit/lot ${symbol} @ ${curr} ${price.toLocaleString('en-US')} (Eqv: Rp ${totalIDR.toLocaleString('id-ID')})`, 
              date: new Date(),
              source: req.body.source || null
          } as any); 
          
          await storage.createInvestment(user!.id, {
              userId: user!.id, 
              symbol: symbol.toUpperCase(), 
              quantity, 
              avgPrice: price, 
              type: typeLower
          } as any); 
          
          res.json({success: true}); 
      } catch (error: any) { 
          res.status(500).json({ message: "Terjadi kesalahan server saat menyimpan aset." }); 
      }
  });

  app.post("/api/investments/sell", async (req: any, res: any) => { 
      try {
          const user = await getUser(req); 
          const { symbol, quantity, price, type } = req.body; 
          
          const parts = (symbol || "").split('|');
          const sym = parts[0] || "";
          const curr = parts[1] || 'IDR';
          const typeLower = (type || 'saham').toLowerCase(); 
          
          const isIDRSaham = typeLower === 'saham' && curr === 'IDR';
          const m = isIDRSaham ? 100 : 1; 
          
          const totalSellPriceInCurrency = quantity * price * m; 
          
          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 
          const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || 15000);
          const totalSellPriceIDR = Math.round(totalSellPriceInCurrency * rate);
          
          const allInvestments = await storage.getInvestments(user!.id);
          const existings = allInvestments.filter((i: any) => i.symbol === symbol); 
          
          let remainingToSell = quantity;
          let totalBuyPriceInCurrency = 0;

          for (const existing of existings) {
              if (remainingToSell <= 0) break;
              if (existing.quantity <= remainingToSell) {
                  totalBuyPriceInCurrency += existing.quantity * existing.avgPrice * m;
                  remainingToSell -= existing.quantity;
                  await storage.deleteInvestment(existing.id); 
              } else {
                  totalBuyPriceInCurrency += remainingToSell * existing.avgPrice * m;
                  await storage.updateInvestment(existing.id, existing.quantity - remainingToSell, existing.avgPrice); 
                  remainingToSell = 0;
              }
          } 

          const plCurrency = totalSellPriceInCurrency - totalBuyPriceInCurrency;
          const plIDR = Math.round(plCurrency * rate);
          const profitLossText = ` (P/L: ${plIDR >= 0 ? '+' : ''}Rp ${plIDR.toLocaleString('id-ID')})`;

          if (curr === 'IDR') {
              const walletSources = user!.walletSources ? [...(user!.walletSources as any[])] : [];
              const sourceName = req.body.source;
              if (sourceName) {
                  const wsIdx = walletSources.findIndex((w: any) => w.name === sourceName);
                  if (wsIdx >= 0) {
                      walletSources[wsIdx].balance += totalSellPriceIDR;
                      await storage.updateUserWalletSources(user!.id, walletSources);
                  }
              }
              await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance + totalSellPriceIDR)); 
          } else {
              const existingForex = await storage.getForexByCurrency(user!.id, curr);
              if (existingForex) {
                  await storage.updateForexAsset(existingForex.id, existingForex.amount + totalSellPriceInCurrency);
              } else {
                  await storage.createForexAsset(user!.id, { currency: curr, amount: totalSellPriceInCurrency } as any);
              }
          }

          await storage.createTransaction(user!.id, {
              userId: user!.id, 
              type: 'invest_sell', 
              amount: totalSellPriceIDR, 
              category: 'Jual Aset', 
              description: `${quantity} unit/lot ${symbol} @ ${curr} ${price.toLocaleString('en-US')}${profitLossText}`, 
              date: new Date()
          } as any); 
          
          res.json({success: true}); 
      } catch (error: any) { 
          res.status(500).json({ message: "Terjadi kesalahan server saat menjual aset." }); 
      }
  });

  app.get("/api/reports/data", async (req: any, res: any) => { 
      try {
          const user = await getUser(req); 
          if (!user) {
              return res.json({ user: null, transactions: [], investments: [], debts: [], forexAssets: [], subscriptions: [], retained: [] });
          }
          const [tx, inv, debt, fx, sub] = await Promise.all([ 
              storage.getTransactions(user.id), 
              storage.getInvestments(user.id), 
              storage.getDebts(user.id), 
              storage.getForexAssets(user.id), 
              storage.getSubscriptions(user.id) 
          ]); 
          
          await ensureRetainedTable();
          const retRes = await db.execute(sql`SELECT * FROM retained_balances WHERE user_id = ${user.id}`);
          const retRows = Array.isArray(retRes) ? retRes : (retRes as any).rows || [];
          const retained = retRows.map((r:any) => ({ id: r.id, source: r.source, amount: r.amount, currency: r.currency }));

          res.json({ user, transactions: tx, investments: inv, debts: debt, forexAssets: fx, subscriptions: sub, retained }); 
      } catch (e: any) {
          console.error("Error in /api/reports/data:", e);
          res.status(500).json({ error: "Gagal memuat data laporan: " + e.message });
      }
  });
  
  app.get("/api/categories", async (req: any, res: any) => { 
    try {
      const user = await getUser(req); 
      const cats = user ? await storage.getCategories(user.id) : [];
      res.json(cats || []); 
    } catch (e: any) {
      res.json([]);
    }
  });
  app.post("/api/categories", async (req: any, res: any) => { const user = await getUser(req); await storage.createCategory({ ...req.body, userId: user!.id } as any); res.json({success:true}); });
  app.delete("/api/categories/:id", async (req: any, res: any) => { await storage.deleteCategory(parseInt(req.params.id)); res.json({success:true}); });

  app.get("/api/subscriptions", async (req: any, res: any) => { 
    try {
      const user = await getUser(req); 
      const subs = user ? await storage.getSubscriptions(user.id) : [];
      res.json(subs || []); 
    } catch (e: any) {
      res.json([]);
    }
  });
  app.post("/api/subscriptions", async (req: any, res: any) => { const user = await getUser(req); const sub = await storage.createSubscription(user!.id, req.body as any); res.json(sub); });
  app.patch("/api/subscriptions/:id", async (req: any, res: any) => { 
      try {
          const sub = await storage.updateSubscription(parseInt(req.params.id), req.body as any);
          res.json(sub);
      } catch(e: any) { 
          res.status(500).json({ error: e.message }); 
      }
  });
  app.patch("/api/subscriptions/:id/status", async (req: any, res: any) => { const { isActive } = req.body; await storage.toggleSubscriptionStatus(parseInt(req.params.id), isActive); res.json({ success: true }); });
  app.delete("/api/subscriptions/:id", async (req: any, res: any) => { await storage.deleteSubscription(parseInt(req.params.id)); res.json({ success: true }); });

  app.get("/api/user", async (req: any, res: any) => { 
    try {
      const user = await getUser(req); 
      res.json(user || { id: 1, username: "guest", email: "guest@bilano.app", isPro: false, cashBalance: 0 }); 
    } catch (e: any) {
      res.json({ id: 1, username: "guest", email: "guest@bilano.app", isPro: false, cashBalance: 0 });
    }
  });
  app.patch("/api/user/profile", async (req: any, res: any) => { const user = await getUser(req); await storage.updateUserProfile(user!.id, req.body.firstName, req.body.lastName, req.body.profilePicture); res.json({success:true}); });
  
  app.get("/api/admin/users", async (req: any, res: any) => {
      const email = req.headers["x-user-email"] as string;
      if (!isAdminValid(email)) return res.status(403).json({ error: "Akses Ditolak. Anda bukan admin." });
      try { 
          const allUsersRes = await db.execute(sql`
            SELECT 
              u.id, 
              u.username, 
              u.email, 
              u.first_name AS "firstName", 
              u.last_name AS "lastName", 
              u.cash_balance AS "cashBalance", 
              u.is_pro AS "isPro", 
              u.pro_since AS "proSince", 
              u.pro_valid_until AS "proValidUntil", 
              u.created_at AS "createdAt",
              u.locked_plan AS "lockedPlan",
              u.locked_price AS "lockedPrice",
              COUNT(t.id) AS "txCount",
              MAX(t.date) AS "lastTxDate"
            FROM users u
            LEFT JOIN transactions t ON t.user_id = u.id
            WHERE u.created_at >= '2026-09-01 00:00:00+07'
            GROUP BY u.id
            ORDER BY u.created_at DESC
          `);
          
          const rawRows = Array.isArray(allUsersRes) ? allUsersRes : (allUsersRes as any).rows || [];
          const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);

          const formattedUsers = rawRows.map((u: any) => {
              const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
              const hasRecentActivity = u.lastTxDate ? (new Date(u.lastTxDate).getTime() >= fourteenDaysAgo) : false;
              const isZombie = Boolean(u.isPro && !hasRecentActivity);

              return {
                  id: u.id,
                  username: u.username,
                  email: u.email || u.username,
                  name: fullName || u.username || "User Bilano",
                  firstName: u.firstName,
                  lastName: u.lastName,
                  cashBalance: Number(u.cashBalance || 0),
                  isPro: Boolean(u.isPro),
                  proSince: u.proSince ? new Date(u.proSince).toISOString() : null,
                  proValidUntil: u.proValidUntil ? new Date(u.proValidUntil).toISOString() : null,
                  createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
                  lockedPlan: u.lockedPlan,
                  lockedPrice: u.lockedPrice,
                  txCount: Number(u.txCount || 0),
                  lastTxDate: u.lastTxDate ? new Date(u.lastTxDate).toISOString() : null,
                  isZombie
              };
          });

          res.json(formattedUsers); 
      } 
      catch (e: any) { 
          res.status(500).json({ error: "Gagal memuat data pengguna: " + e.message }); 
      }
  });

  app.delete("/api/admin/users/:id", async (req: any, res: any) => {
      const emailAdmin = req.headers["x-user-email"] as string;
      if (!isAdminValid(emailAdmin)) return res.status(403).json({ error: "Akses Ditolak. Anda bukan admin." });
      try {
          const userId = parseInt(req.params.id);
          const targetUser = await storage.getUser(userId);
          if (!targetUser) return res.status(404).json({ error: "Pengguna tidak ditemukan." });

          // Proteksi: Akun Admin Utama tidak boleh dihapus
          if (isAdminValid(targetUser.email || targetUser.username)) {
              return res.status(400).json({ error: "Akun Super Admin tidak dapat dihapus." });
          }

          // Hapus akun di Firebase Auth jika tersedia
          if (firebaseAdminInitialized && targetUser.email) {
              try {
                  const record = await admin.auth().getUserByEmail(targetUser.email);
                  await admin.auth().deleteUser(record.uid);
              } catch (fbErr: any) {
                  console.log("Admin delete user Firebase notice:", fbErr?.message || fbErr);
              }
          }

          // Cascade delete seluruh relasi data di database
          await db.execute(sql`DELETE FROM transactions WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM investments WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM targets WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM debts WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM subscriptions WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM categories WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM forex_assets WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM help_tickets WHERE user_id = ${userId} OR email = ${targetUser.email || targetUser.username}`);
          await db.execute(sql`DELETE FROM retained_balances WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM portfolio_snapshots WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM user_income_profiles WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM income_attempts WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM tracking_events WHERE user_id = ${userId}`);
          await db.execute(sql`DELETE FROM otp_sessions WHERE email = ${targetUser.email || targetUser.username}`);
          await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);

          res.json({ 
              success: true, 
              message: `Pengguna ${targetUser.email || targetUser.username} dan seluruh datanya berhasil dihapus permanen.` 
          });
      } catch (e: any) {
          res.status(500).json({ error: "Gagal menghapus pengguna: " + e.message });
      }
  });

  app.post("/api/admin/toggle-pro", async (req: any, res: any) => {
      const emailAdmin = req.headers["x-user-email"] as string;
      if (!isAdminValid(emailAdmin)) return res.status(403).json({ error: "Akses Ditolak." });
      try {
          const { userId, email, isPro, durationDays } = req.body;
          let targetUser = null;
          if (userId) {
              targetUser = await storage.getUser(parseInt(userId));
          } else if (email) {
              targetUser = await storage.getUserByUsername(email.trim().toLowerCase());
          }
          if (!targetUser) return res.status(404).json({ error: "Pengguna tidak ditemukan." });

          let validUntil: Date | null = null;
          let proSince: Date | null = null;

          if (isPro) {
              proSince = targetUser.proSince || new Date();
              if (durationDays && durationDays > 0) {
                  validUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
              } else {
                  validUntil = new Date("2099-12-31T23:59:59Z"); // Lifetime
              }
          }

          const updated = await storage.updateUserProStatus(targetUser.id, isPro, validUntil, proSince);
          res.json({ 
              success: true, 
              user: updated, 
              message: `Status Pro untuk ${targetUser.email || targetUser.username} berhasil diubah ke ${isPro ? 'PRO (Aktif)' : 'FREE'}.` 
          });
      } catch (e: any) { 
          res.status(500).json({ error: "Gagal memperbarui status pengguna: " + e.message }); 
      }
  });

  app.patch("/api/admin/users/:id/pro", async (req: any, res: any) => {
      const emailAdmin = req.headers["x-user-email"] as string;
      if (!isAdminValid(emailAdmin)) return res.status(403).json({ error: "Akses Ditolak." });
      try {
          const userId = parseInt(req.params.id);
          const { isPro, durationDays } = req.body;
          const targetUser = await storage.getUser(userId);
          if (!targetUser) return res.status(404).json({ error: "User tidak ditemukan" });

          let validUntil: Date | null = null;
          let proSince: Date | null = null;

          if (isPro) {
              proSince = targetUser.proSince || new Date();
              if (durationDays && durationDays > 0) {
                  validUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
              } else {
                  validUntil = new Date("2099-12-31T23:59:59Z");
              }
          }

          const updated = await storage.updateUserProStatus(userId, isPro, validUntil, proSince);
          res.json({ success: true, user: updated, message: "Status PRO berhasil diperbarui." });
      } catch (e: any) { 
          res.status(500).json({ error: "Gagal memperbarui status pengguna: " + e.message }); 
      }
  });

  // =========================================================================
  // 🚀 API UTAMA PEMBAYARAN DUITKU (ONBOARDING & PERPANJANGAN)
  // =========================================================================
  app.post("/api/payment/duitku-production", async (req: any, res: any) => {
      try {
          const { price, plan, productDetail, customerName, email, phone, paymentMethod = "SQ" } = req.body;
          const merchantCode = process.env.DUITKU_MERCHANT_CODE?.trim() || 'D23626'; 
          const merchantKey = process.env.DUITKU_MERCHANT_KEY?.trim() || '399b0aaaff486146d0bf1c75019c89c4';

          const cleanEmail = (email || "").trim().toLowerCase();
          let paymentAmount = parseInt(price || 0);

          // 🔥 LOGIKA KUNCI HARGA: Jika user perpanjang paket yang sama, gunakan harga kuncinya
          if (cleanEmail) {
              const user = await storage.getUserByUsername(cleanEmail);
              if (user && user.lockedPlan && user.lockedPrice) {
                  const planKey = (plan === 'yearly' || plan === 'year') ? 'year' : 'month';
                  if (user.lockedPlan === planKey) {
                      paymentAmount = user.lockedPrice; // Kunci harga awal
                  }
              }
          }

          // Fallback harga pasar jika nominal kosong
          if (!paymentAmount || isNaN(paymentAmount)) {
              paymentAmount = (plan === 'yearly' || plan === 'year') ? 99000 : 14900;
          }

          const merchantOrderId = 'BILANO-' + Date.now();
          const signatureRaw = merchantCode + merchantOrderId + paymentAmount + merchantKey;
          const signature = crypto.createHash('md5').update(signatureRaw).digest('hex');

          const payload = {
              merchantCode: merchantCode,
              paymentAmount: paymentAmount,
              merchantOrderId: merchantOrderId,
              productDetails: productDetail || (plan === 'year' ? 'Paket Tahunan BILANO' : 'Paket Bulanan BILANO'),
              email: cleanEmail,
              phoneNumber: phone || "080000000000",
              customerVaName: customerName || "Member BILANO",
              itemDetails: [{ name: productDetail || "Akses BILANO PRO", price: paymentAmount, quantity: 1 }],
              returnUrl: 'https://bilano.app/onboarding?payment=success',
              callbackUrl: 'https://bilano.app/api/payment/duitku-webhook',
              signature: signature,
              paymentMethod: paymentMethod 
          };

          const duitkuRes = await fetch('https://passport.duitku.com/webapi/api/merchant/v2/inquiry', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          const textData = await duitkuRes.text();
          
          let data;
          try {
              data = JSON.parse(textData);
          } catch (e) {
              return res.status(400).json({ error: "Duitku Response Error: " + textData.substring(0, 50) });
          }

          // Cari baris ini di dalam blok try:
          if (data && data.statusCode === "00") {
              // UBAH MENJADI SEPERTI INI (Tambahkan merchantOrderId):
              res.json({ success: true, paymentData: data, amount: paymentAmount, merchantOrderId: merchantOrderId });
          } else {
              const realError = data.statusMessage || data.Message || data.message || "Ditolak oleh sistem Duitku";
              res.status(400).json({ error: `[Error Duitku]: ${realError}` });
          }

      } catch (error: any) {
          res.status(500).json({ error: 'Server Crash: ' + error.message });
      }
  });

  app.post("/api/help/submit", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
          
          const { subject, message } = req.body;
          const ticketId = `TCK-${Date.now()}`;
          const name = user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Pengguna BILANO';
          
          try { await db.execute(sql`INSERT INTO help_tickets (id, user_id, email, name, subject, message, status) VALUES (${ticketId}, ${user.id}, ${user.email}, ${name}, ${subject}, ${message}, 'Menunggu Balasan')`); } 
          catch (dbErr) { console.error("Gagal menyimpan ke DB:", dbErr); }
          
          try {
              if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                  const transporter = createTransporter();
                  await transporter.sendMail({
                      from: `"Sistem Bantuan BILANO" <${process.env.EMAIL_USER}>`,
                      to: process.env.EMAIL_USER || "adrienfandra14@gmail.com", 
                      subject: `[TIKET BARU] ${subject} - dari ${user.email}`,
                      html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                          <h2 style="color: #4f46e5;">Tiket Bantuan Baru #${ticketId}</h2>
                          <p><strong>Pengirim:</strong> ${name} (${user.email})</p>
                          <p><strong>Subjek:</strong> ${subject}</p>
                          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 10px;">${message}</div>
                          <p style="margin-top:20px; font-size:12px; color:#666;">Silakan balas dari dashboard Admin Premium.</p>
                        </div>
                      `
                  });
              }
          } catch(e) { console.error("Gagal mengirim email notifikasi tiket:", e); }
          res.json({ success: true, ticketId });
      } catch (error) { res.status(500).json({ error: "Gagal mengirimkan laporan." }); }
  });

  app.get("/api/admin/help", async (req: any, res: any) => {
      const email = req.headers["x-user-email"] as string;
      if (!isAdminValid(email)) return res.status(403).json({ error: "Penyusup Ditolak" });
      try { const result = await db.execute(sql`SELECT * FROM help_tickets ORDER BY date DESC`); const rows = Array.isArray(result) ? result : (result as any).rows || []; res.json(rows); } catch (e) { res.json([]); }
  });

  app.get("/api/admin/tickets", async (req: any, res: any) => {
      const email = req.headers["x-user-email"] as string;
      if (!isAdminValid(email)) return res.status(403).json({ error: "Penyusup Ditolak" });
      try { const result = await db.execute(sql`SELECT * FROM help_tickets ORDER BY date DESC`); const rows = Array.isArray(result) ? result : (result as any).rows || []; res.json(rows); } catch (e) { res.json([]); }
  });

  const handleHelpReply = async (req: any, res: any) => {
      const emailAdmin = req.headers["x-user-email"] as string;
      if (!isAdminValid(emailAdmin)) return res.status(403).json({ error: "Penyusup Ditolak" });
      const { ticketId, userEmail, subject, replyMessage } = req.body;
      try {
          if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
              const transporter = createTransporter();
              await transporter.sendMail({
                  from: `"Tim Bantuan BILANO" <${process.env.EMAIL_USER}>`,
                  to: userEmail,
                  subject: `Re: [${ticketId || 'TCK'}] ${subject || 'Bantuan Akun Bilano'}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px; margin: auto;">
                      <img src="https://bilanofinance-dvbi.vercel.app/BILANO-LOGO-NEW.png" width="120" style="margin-bottom: 20px;" />
                      <h2 style="color: #4f46e5; margin-bottom: 5px;">Balasan Tim Bantuan BILANO</h2>
                      <p style="color: #6b7280; font-size: 12px; margin-top: 0;">Tiket: ${ticketId || '-'}</p>
                      <div style="font-size: 14px; color: #1f2937; line-height: 1.6; margin-top: 20px;">${(replyMessage || '').replace(/\n/g, '<br/>')}</div>
                      <hr style="border:none; border-top: 1px dashed #e5e7eb; margin: 30px 0;" />
                      <p style="font-size: 11px; color: #9ca3af; text-align: center;">Pesan ini dikirim otomatis oleh sistem pusat bantuan BILANO. Jika ada pertanyaan, buat tiket baru di aplikasi.</p>
                    </div>
                  `
              });
          }
          if (ticketId) {
              try { await db.execute(sql`DELETE FROM help_tickets WHERE id = ${ticketId}`); } catch(e) {}
          }
          res.json({ success: true, message: "Balasan berhasil dikirim ke email pengguna." });
      } catch (error) { res.status(500).json({ error: "Gagal mengirimkan email balasan." }); }
  };

  app.post("/api/admin/help/reply", handleHelpReply);
  app.post("/api/admin/reply-ticket", handleHelpReply);

  app.post("/api/admin/silent-correction", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const { deductAmount } = req.body; 
          let newBalance = Math.round(user!.cashBalance - deductAmount);
          await storage.updateUserBalance(user!.id, newBalance);
          res.json({ success: true, message: "Operasi senyap berhasil. Saldo telah dikoreksi tanpa jejak." });
      } catch(e:any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/portfolio/snapshots", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const snaps = await storage.getPortfolioSnapshots(user!.id);
          res.json({ success: true, data: snaps });
      } catch(e:any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/portfolio/snapshots", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          const snapshot = await storage.createPortfolioSnapshot(user!.id, req.body);
          res.json({ success: true, snapshot });
      } catch(e:any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/finance/quotes", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { symbols } = req.body; 
          if (!symbols || !Array.isArray(symbols)) return res.status(400).json({ error: "Format pencarian simbol salah." });

          const results: Record<string, number> = {};

          // 🟢 PERBAIKAN: Tarik data kurs SEKALI SAJA di luar perulangan saham
          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) {
              await fetchLiveRates(); 
          }
          const usdToIdr = cachedRates['USD'] || 16200;

          await Promise.all(symbols.map(async (rawSymbol: string) => {
              try {
                  let symbol = rawSymbol.toUpperCase().trim();
                  
                  const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(symbol);
                  const fetchSymbol = isGold ? 'GC=F' : symbol;
                  
                  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${fetchSymbol}?interval=1d&range=1d`);
                  
                  if (response.ok) {
                      const data = await response.json();
                      let price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
                      
                      if (price) {
                         const currency = data.chart?.result?.[0]?.meta?.currency || "IDR";
                         let finalPrice = price;
                         
                         // 🟢 PERBAIKAN: Mencegah error Rupiah berubah jadi Miliaran (Inflasi Ganda)
                         if (rawSymbol === 'IDR=X') {
                             finalPrice = price;
                         } else if (isGold) {
                             finalPrice = (price / 31.1034768) * usdToIdr;
                         } else if (currency !== "IDR" && currency !== "Rp") {
                             const rate = cachedRates[currency as keyof typeof cachedRates] || usdToIdr;
                             finalPrice = price * rate; 
                         }

                         results[rawSymbol] = finalPrice;
                      }
                  }
              } catch(e) {}
          }));

          res.json({ success: true, data: results });
      } catch (error: any) { res.status(500).json({ error: error.message || "Gagal memproses data aset." }); }
  });

  app.post("/api/finance/history", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { symbols, range = '5y' } = req.body; 
          if (!symbols || !Array.isArray(symbols)) return res.status(400).json({ error: "Format pencarian simbol salah." });

          const results: Record<string, { timestamps: number[], close: number[] }> = {};

          // 🟢 PERBAIKAN: Tarik data kurs SEKALI SAJA di luar perulangan
          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) {
              await fetchLiveRates(); 
          }
          const usdToIdr = cachedRates['USD'] || 16200;

          await Promise.all(symbols.map(async (rawSymbol: string) => {
              try {
                  let symbol = rawSymbol.toUpperCase().trim();
                  
                  const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(symbol);
                  const fetchSymbol = isGold ? 'GC=F' : symbol;
                  
                  const interval = range === '1d' ? '5m' : range === '5d' ? '15m' : '1d';
                  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${fetchSymbol}?interval=${interval}&range=${range}`);
                  
                  if (response.ok) {
                      const data = await response.json();
                      const result = data.chart?.result?.[0];
                      if (result) {
                          const currency = result.meta?.currency || "IDR";
                          let timestamps = result.timestamp || [];
                          let close = result.indicators?.quote?.[0]?.close || [];
                          
                          // 🟢 PERBAIKAN: Proteksi IDR=X dari Inflasi Ganda di data Historis
                          if (rawSymbol === 'IDR=X') {
                              // Jangan dikalikan dengan kurs USD lagi
                              close = close.map((p: number) => p);
                          } else if (isGold) {
                              close = close.map((p: number) => p ? (p / 31.1034768) * usdToIdr : p);
                          } else if (currency !== "IDR" && currency !== "Rp") {
                              const rate = cachedRates[currency as keyof typeof cachedRates] || usdToIdr;
                              close = close.map((p: number) => p ? p * rate : p); 
                          }

                          results[rawSymbol] = { timestamps, close };
                      }
                  }
              } catch(e) {}
          }));

          res.json({ success: true, data: results });
      } catch (error: any) { res.status(500).json({ error: error.message || "Gagal memproses history aset." }); }
  });

  app.post("/api/finance/dividends", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { symbols, range = '5y' } = req.body; 
          if (!symbols || !Array.isArray(symbols)) return res.status(400).json({ error: "Format pencarian simbol salah." });

          const results: Record<string, { date: number, amount: number }[]> = {};

          // 🟢 PERBAIKAN: Tarik data kurs SEKALI SAJA di luar perulangan
          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) {
              await fetchLiveRates();
          }
          const usdToIdr = cachedRates['USD'] || 16200;

          await Promise.all(symbols.map(async (rawSymbol: string) => {
              try {
                  let symbol = rawSymbol.toUpperCase().trim();
                  
                  const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(symbol);
                  if (isGold) {
                      results[rawSymbol] = [];
                      return;
                  }
                  
                  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}&events=div`);
                  
                  if (response.ok) {
                      const data = await response.json();
                      const result = data.chart?.result?.[0];
                      
                      if (result && result.events && result.events.dividends) {
                          const currency = result.meta?.currency || "IDR";
                          const divs = result.events.dividends;
                          
                          let rate = 1;
                          // 🟢 PERBAIKAN: Proteksi IDR=X agar tidak error di chart Dividen
                          if (rawSymbol === 'IDR=X') {
                              rate = 1;
                          } else if (currency !== "IDR" && currency !== "Rp") {
                              rate = cachedRates[currency as keyof typeof cachedRates] || usdToIdr;
                          }

                          results[rawSymbol] = Object.values(divs).map((d: any) => ({
                              date: d.date, 
                              amount: d.amount * rate
                          })).sort((a: any, b: any) => a.date - b.date); 
                      } else {
                          results[rawSymbol] = [];
                      }
                  } else {
                      results[rawSymbol] = [];
                  }
              } catch(e) {
                  results[rawSymbol] = [];
              }
          }));

          res.json({ success: true, data: results });
      } catch (error: any) { res.status(500).json({ error: error.message || "Gagal memproses data dividen." }); }
  });

  app.post("/api/vision/scan", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { images } = req.body; 
          if (!images || !Array.isArray(images) || images.length === 0) return res.status(400).json({ error: "Tidak ada gambar yang diunggah." });

          const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
          if (!apiKey) return res.status(500).json({ error: "Sistem AI belum dikonfigurasi di server." });

          const imageParts = images.map((base64Str: string) => {
              const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
              const mimeTypeMatch = base64Str.match(/^data:(.*?);base64,/);
              const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
              return { inline_data: { mime_type: mimeType, data: base64Data } };
          });

          const systemPrompt = `Kamu adalah Asisten Finansial AI BILANO yang ahli dan teliti.
Tugasmu membaca dan membedah dokumen keuangan / struk belanja / bukti transfer dari SATU ATAU BANYAK GAMBAR yang diunggah pengguna.

ATURAN PARSING:
1. Ekstraksi SEMUA transaksi yang ditemukan dari setiap gambar secara terpisah ke dalam daftar "items".
2. Klasifikasikan setiap item dengan tepat:
   - "type": "expense" (jika struk belanja, beli barang/jasa, pengeluaran kas) ATAU "income" (jika bukti transfer masuk, invoice pembayaran diterima, slip gaji, penjualan).
   - "category": Kategori relevan (contoh: "Makan & Minum", "Belanja", "Transportasi", "Gaji", "Penjualan", "Tagihan Bulanan", "Kesehatan", "Lainnya").
   - "title": Nama spesifik struk/barang/toko (contoh: "Indomaret - Belanja Bulanan", "Kopi Kenangan", "Transfer Masuk Klien").
   - "amount": Nominal angka positif (integer).
   - "currency": "IDR", "USD", dll.
3. Hitung secara matematis:
   - "totalIncome": Jumlah total seluruh item income.
   - "totalExpense": Jumlah total seluruh item expense.
   - "netTotal": totalIncome - totalExpense.
   - "totalAmount": totalExpense > 0 ? totalExpense : totalIncome.
   - "summary": Ringkasan singkat berbahasa Indonesia (contoh: "Ditemukan 2 struk pengeluaran total Rp 125.000").
   - "description": Daftar rincian teks item dipisahkan baris baru (\\n).

Output WAJIB JSON MURNI sesuai schema berikut:
{
  "items": [
    {
      "id": "1",
      "title": "Nama Toko / Item",
      "amount": 50000,
      "type": "expense",
      "category": "Makan & Minum",
      "currency": "IDR"
    }
  ],
  "totalIncome": 0,
  "totalExpense": 50000,
  "netTotal": -50000,
  "totalAmount": 50000,
  "type": "expense",
  "category": "Makan & Minum",
  "description": "- Nama Toko / Item: Rp 50.000",
  "summary": "1 pengeluaran senilai Rp 50.000"
}`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: systemPrompt }, ...imageParts] }], generationConfig: { temperature: 0.1, response_mime_type: "application/json" } })
          });

          if (!response.ok) throw new Error("Detail Error AI: Timeout");

          const aiData = await response.json();
          const resultText = aiData.candidates[0].content.parts[0].text;
          
          let parsedResult;
          try { parsedResult = JSON.parse(resultText); } 
          catch (e) { parsedResult = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim()); }

          if (!parsedResult.items || !Array.isArray(parsedResult.items)) {
              parsedResult.items = [{
                  id: "1",
                  title: parsedResult.category || "Pindai Struk",
                  amount: parsedResult.totalAmount || 0,
                  type: parsedResult.type || 'expense',
                  category: parsedResult.category || 'Belanja',
                  currency: parsedResult.currency || 'IDR'
              }];
          }

          res.json({ success: true, data: parsedResult });
      } catch (error: any) { res.status(500).json({ error: error.message || "Gagal memproses gambar." }); }
  });

  app.post("/api/voice/scan", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { text } = req.body; 
          if (!text) return res.status(400).json({ error: "Tidak ada suara yang ditangkap." });

          const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
          if (!apiKey) return res.status(500).json({ error: "Sistem AI belum dikonfigurasi di server." });

          const systemPrompt = `Kamu adalah Asisten Finansial AI BILANO yang sangat cerdas dalam memahami bahasa Indonesia lisan/dikte.
Pengguna akan mendiktekan catatan keuangannya melalui suara. Pengguna bisa menyebutkan BANYAK TRANSAKSI SEKALIGUS, yang bisa berupa PEMASUKAN, PENGELUARAN, atau KEDUANYA (contoh: "dapat bonus gaji 2 juta, terus jajan sate 50 ribu sama beli pulsa 100 ribu").

ATURAN PARSING:
1. Pisahkan setiap transaksi yang disebutkan ke dalam daftar "items".
2. Identifikasi masing-masing item:
   - "type": "income" (jika uang masuk, gaji, bonus, terima transfer, dividen, penjualan) ATAU "expense" (jika uang keluar, belanja, makan, beli pulsa, bayar tagihan, dll).
   - "category": Kategori tepat (contoh: "Gaji", "Bonus", "Makan & Minum", "Belanja", "Transportasi", "Tagihan Bulanan", "Lainnya").
   - "title": Nama transaksi/barang (contoh: "Bonus Gaji", "Makan Sate", "Beli Pulsa").
   - "amount": Nominal angka positif (contoh jika disebut "50 ribu" maka 50000, jika "2 juta" maka 2000000).
   - "currency": "IDR", "USD", dll.
3. Hitung secara matematis:
   - "totalIncome": Jumlah total seluruh item income.
   - "totalExpense": Jumlah total seluruh item expense.
   - "netTotal": totalIncome - totalExpense.
   - "totalAmount": totalExpense > 0 ? totalExpense : totalIncome.
   - "summary": Ringkasan singkat berbahasa Indonesia.
   - "description": Rincian teks berbaris baru (\\n).

Output WAJIB JSON MURNI sesuai schema berikut:
{
  "items": [
    {
      "id": "1",
      "title": "Bonus Gaji",
      "amount": 2000000,
      "type": "income",
      "category": "Gaji",
      "currency": "IDR"
    },
    {
      "id": "2",
      "title": "Makan Sate",
      "amount": 50000,
      "type": "expense",
      "category": "Makan & Minum",
      "currency": "IDR"
    }
  ],
  "totalIncome": 2000000,
  "totalExpense": 50000,
  "netTotal": 1950000,
  "totalAmount": 2000000,
  "type": "income",
  "category": "Gaji",
  "description": "- Bonus Gaji (+Rp 2.000.000)\\n- Makan Sate (-Rp 50.000)",
  "summary": "1 pemasukan (Rp 2.000.000) dan 1 pengeluaran (Rp 50.000)"
}`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  contents: [{ role: "user", parts: [{ text: systemPrompt }, { text: text }] }], 
                  generationConfig: { temperature: 0.1, response_mime_type: "application/json" } 
              })
          });

          if (!response.ok) throw new Error("Detail Error AI: Timeout");

          const aiData = await response.json();
          const resultText = aiData.candidates[0].content.parts[0].text;
          
          let parsedResult;
          try { parsedResult = JSON.parse(resultText); } 
          catch (e) { parsedResult = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim()); }

          if (!parsedResult.items || !Array.isArray(parsedResult.items)) {
              parsedResult.items = [{
                  id: "1",
                  title: parsedResult.category || "Catatan Suara",
                  amount: parsedResult.totalAmount || 0,
                  type: parsedResult.type || 'expense',
                  category: parsedResult.category || 'Lainnya',
                  currency: parsedResult.currency || 'IDR'
              }];
          }

          res.json({ success: true, data: parsedResult });
      } catch (error: any) { res.status(500).json({ error: error.message || "Gagal memproses suara." }); }
  });

  app.post("/api/finance/intel", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { symbols } = req.body; 
          if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
              return res.status(400).json({ error: "Tidak ada portofolio aktif untuk dianalisis." });
          }

          const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
          if (!apiKey) return res.status(500).json({ error: "Kunci API Sistem AI belum terpasang." });

          const cleanedSymbols = symbols.map((s: string) => s.replace('.JK', '').toUpperCase());

          const prompt = `Kamu adalah analis intelijen pasar global untuk terminal trading institusional.
Portofolio klien: ${cleanedSymbols.join(', ')}.

Tugas Analisis Mendalam:
1. Pindai (Google Search) berita makro global & lokal PALING AKTUAL.
2. Ekstraksi sentimen pasar.

Kembalikan HANYA format JSON MURNI tanpa markdown:
{
  "analysis": {
    "overallSentiment": "SANGAT POSITIF" | "POSITIF" | "NETRAL" | "NEGATIF" | "SANGAT NEGATIF",
    "confidenceScore": 85,
    "marketSummary": "Ringkasan tajam kondisi makro.",
    "actionableInsights": [
      {
        "sector": "Ticker/Sektor",
        "sentiment": "Positif" | "Negatif" | "Netral",
        "insight": "Alasan logis"
      }
    ]
  }
}`;

          const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: "POST", 
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  tools: [{ googleSearch: {} }],
                  safetySettings: [
                      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                  ],
                  generationConfig: { temperature: 0.1 } 
              })
          });

          if (!aiRes.ok) throw new Error(`Sistem Agregator AI menolak request (Timeout/Filter Keamanan).`);

          const aiData = await aiRes.json();
          const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          
          let parsedAI;
          try { 
              let cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
              const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
              if (jsonMatch) cleanText = jsonMatch[0];
              parsedAI = JSON.parse(cleanText);
          } catch (e) { throw new Error("Gagal melakukan parsing data AI dari mesin pencari."); }

          const chunks = aiData.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const realArticles = chunks
              .map((c: any) => c.web)
              .filter(Boolean)
              .map((web: any) => {
                  let sourceName = "Global News";
                  try { sourceName = new URL(web.uri).hostname.replace('www.', ''); } catch(e){}
                  return {
                      title: web.title,
                      url: web.uri,
                      source: sourceName,
                      time: "Terkini"
                  };
              });

          res.json({ 
              success: true, 
              articles: realArticles.length > 0 ? realArticles : [], 
              analysis: parsedAI.analysis || parsedAI 
          });

      } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
  
  app.post("/api/finance/universal-news", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { market } = req.body;
          const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
          if (!apiKey) return res.status(500).json({ error: "Kunci API Sistem AI belum terpasang." });

          const marketContext = market === 'US' ? 'Pasar Saham Wall Street (US Market)' : 'Pasar Saham Indonesia (IHSG)';
          
          const prompt = `Kamu adalah mesin pencari berita universal.
Tugas: Cari berita ekonomi, bisnis, dan saham PALING AKTUAL untuk ${marketContext}.

Output WAJIB HANYA dalam format JSON MURNI tanpa markdown:
{
  "klotters": [
    {
      "implicatedStocks": ["BBNI.JK", "BBKP.JK"],
      "articles": [
        { 
          "title": "Judul Berita", 
          "url": "Tinggalkan kosong atau isi URL asli", 
          "source": "Nama Media", 
          "time": "Waktu Rilis" 
        }
      ]
    }
  ]
}`;

          const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  tools: [{ googleSearch: {} }],
                  safetySettings: [
                      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                  ],
                  generationConfig: { temperature: 0.1 } 
              })
          });
          if (!aiRes.ok) throw new Error("Sistem Core AI memblokir request pencarian berita.");

          const aiData = await aiRes.json();
          const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          
          let parsedAI;
          try { 
              let cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
              const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
              if (jsonMatch) cleanText = jsonMatch[0];
              parsedAI = JSON.parse(cleanText);
          } catch (e) { throw new Error("Gagal parsing format JSON dari server."); }

          const chunks = aiData.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const realWebs = chunks.map((c: any) => c.web).filter(Boolean);

          if (parsedAI.klotters) {
              parsedAI.klotters.forEach((klotter: any) => {
                  if (klotter.articles) {
                      klotter.articles.forEach((article: any) => {
                          const match = realWebs.find((w: any) => w.title.toLowerCase().includes(article.title.toLowerCase().substring(0, 15)));
                          if (match) {
                              article.url = match.uri;
                              try { article.source = new URL(match.uri).hostname.replace('www.', ''); } catch(e){}
                          } else if (!article.url || article.url.includes('vertexaisearch') || !article.url.startsWith('http')) {
                              article.url = `https://news.google.com/search?q=${encodeURIComponent(article.title)}`;
                          }
                      });
                  }
              });
          }

          res.json({ success: true, data: parsedAI });

      } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/finance/deep-scan", async (req: any, res: any) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { ticker } = req.body;
          if (!ticker) return res.status(400).json({ error: "Ticker tidak diberikan." });

          const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
          if (!apiKey) return res.status(500).json({ error: "Kunci API Sistem AI belum terpasang." });

          const prompt = `Lakukan Deep Scan dan Analisis Sentimen saham: ${ticker}.
Tugas: Pindai Google Search untuk berita AKTUAL paling terbaru mengenai ${ticker}.

Output WAJIB HANYA dalam format JSON MURNI tanpa markdown:
{
  "ticker": "${ticker}",
  "verdict": "POSITIF",
  "reasoning": "Uraian analisis lengkap sentimen saham ini...",
  "articles": [
    { 
      "title": "Judul Berita", 
      "url": "Isi dengan link", 
      "source": "Nama Media", 
      "time": "Waktu rilis" 
    }
  ]
}`;

          const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  tools: [{ googleSearch: {} }],
                  safetySettings: [
                      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                  ],
                  generationConfig: { temperature: 0.1 } 
              })
          });
          
          if (!aiRes.ok) throw new Error("Pemindai Deep Scan menolak permintaan secara otomatis.");

          const aiData = await aiRes.json();
          const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          
          let parsedAI;
          try { 
              let cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
              const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
              if (jsonMatch) cleanText = jsonMatch[0];
              parsedAI = JSON.parse(cleanText);
          } catch (e) { throw new Error("Gagal parsing JSON hasil analisa Deep Scan."); }

          const chunks = aiData.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const realWebs = chunks.map((c: any) => c.web).filter(Boolean);

          if (parsedAI.articles) {
              parsedAI.articles.forEach((article: any) => {
                  const match = realWebs.find((w: any) => w.title.toLowerCase().includes(article.title.toLowerCase().substring(0, 15)));
                  if (match) {
                      article.url = match.uri;
                      try { article.source = new URL(match.uri).hostname.replace('www.', ''); } catch(e){}
                  } else if (!article.url || article.url.includes('vertexaisearch') || !article.url.startsWith('http')) {
                      article.url = `https://news.google.com/search?q=${encodeURIComponent(article.title)}`;
                  }
              });
          }

          res.json({ success: true, data: parsedAI });

      } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  await registerIncomeStrategyRoutes(app);
  
  const httpServer = createServer(app);
  return httpServer;
}