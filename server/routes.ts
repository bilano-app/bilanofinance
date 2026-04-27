// @ts-nocheck
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertTransactionSchema, insertTargetSchema } from "../shared/schema.js";
import { z } from "zod";
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import admin from "firebase-admin"; 
import nodemailer from "nodemailer";

// ====================================================================
// 🚀 PARSER JSON SUPER TANGGUH UNTUK VERCEL ENV
// ====================================================================
let firebaseAdminInitialized = false;
try {
    let saStr = process.env.FIREBASE_SERVICE_ACCOUNT || "";
    if (saStr) {
        saStr = saStr.trim().replace(/^['"]|['"]$/g, '');
        let parsedAccount;
        try {
            parsedAccount = JSON.parse(saStr);
        } catch (e) {
            const unescaped = saStr.replace(/\\n/g, '\n').replace(/\\"/g, '"');
            parsedAccount = JSON.parse(unescaped);
        }

        if (parsedAccount && parsedAccount.private_key) {
            parsedAccount.private_key = parsedAccount.private_key.replace(/\\n/g, '\n');
        }

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(parsedAccount)
            });
        }
        firebaseAdminInitialized = true;
    }
} catch (error) {
    console.error("❌ Gagal inisialisasi Firebase Admin:", error);
}

// ====================================================================
// 🚀 SETUP NODEMAILER (PENGIRIM EMAIL 100% REAL)
// ====================================================================
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

async function askSmartAI(systemPrompt: string, userMessage: string, history: any[] = []) {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
        
        if (!apiKey || apiKey.includes("KUNCI_SUDAH_DIAMANKAN")) {
            return "⚠️ API Key AI belum terpasang dengan benar di .env atau Vercel.";
        }

        let formattedContents = history.map((msg: any) => ({
            role: msg.sender === 'user' ? "user" : "model",
            parts: [{ text: msg.text }]
        }));
        
        formattedContents.push({ role: "user", parts: [{ text: userMessage }] });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] }, 
                contents: formattedContents
            })
        });

        if (!response.ok) {
            const errData = await response.text();
            return `⚠️ Koneksi ditolak server pusat AI. Alasan: ${errData.substring(0, 150)}...`; 
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
             return "⚠️ Pesan ditahan oleh filter keamanan. Coba tanyakan dengan bahasa lain.";
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (error: any) {
        return "⚠️ Maaf Bos, sistem Asisten AI sedang sangat sibuk. Silakan coba lagi nanti ya! 🙏";
    }
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.use("/api", (req, res, next) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      res.setHeader("Vary", "x-user-email"); 
      next();
  });

  const DEFAULT_RATES: Record<string, number> = {
      "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
      "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
  };
  
  let cachedRates: Record<string, number> = { ...DEFAULT_RATES }; 
  let lastRatesFetchTime = 0;

  const fetchLiveRates = async () => {
      try {
          const response = await fetch("https://open.er-api.com/v6/latest/USD");
          if (response.ok) {
              const data = await response.json();
              const rates = data.rates;
              const idrBase = rates.IDR;
              cachedRates = {
                  "USD": idrBase, "EUR": idrBase / rates.EUR, "SGD": idrBase / rates.SGD,
                  "JPY": idrBase / rates.JPY, "AUD": idrBase / rates.AUD, "GBP": idrBase / rates.GBP,
                  "CNY": idrBase / rates.CNY, "MYR": idrBase / rates.MYR, "THB": idrBase / rates.THB,
                  "SAR": idrBase / rates.SAR, "KRW": idrBase / rates.KRW, "IDR": 1
              };
              lastRatesFetchTime = Date.now(); 
              return true;
          }
      } catch (e) { }
      return false;
  };

  app.get("/api/admin/upgrade-db", async (req, res) => {
      try {
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onesignal_id TEXT;`);
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
          await db.execute(sql`ALTER TABLE users ALTER COLUMN cash_balance TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE transactions ALTER COLUMN amount TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE targets ALTER COLUMN target_amount TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE targets ALTER COLUMN monthly_budget TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE debts ALTER COLUMN amount TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE subscriptions ALTER COLUMN cost TYPE BIGINT;`);
          await db.execute(sql`CREATE TABLE IF NOT EXISTS help_tickets (id VARCHAR(255) PRIMARY KEY, user_id INTEGER, email TEXT, name TEXT, subject TEXT, message TEXT, status TEXT, date TIMESTAMP DEFAULT NOW());`);
          await db.execute(sql`CREATE TABLE IF NOT EXISTS otp_sessions (email VARCHAR(255) PRIMARY KEY, code VARCHAR(10), created_at TIMESTAMP DEFAULT NOW());`);
          
          res.json({ 
              success: true, 
              message: "🎉 DATABASE BERHASIL DIOPTIMASI!" 
          });
      } catch (e: any) {
          res.status(500).json({ error: "Gagal Update DB: " + e.message });
      }
  });

  app.post("/api/auth/check-email", async (req, res) => {
      if (!firebaseAdminInitialized) return res.status(200).json({ adminReady: false, exists: true }); 
      try {
          await admin.auth().getUserByEmail(req.body.email);
          res.json({ adminReady: true, exists: true }); 
      } catch (e: any) {
          if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
              res.json({ adminReady: true, exists: false }); 
          } else {
              res.json({ adminReady: true, exists: true }); 
          }
      }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
      const { email } = req.body;
      let otp = "";

      try {
          const existing = await db.execute(sql`SELECT code, created_at FROM otp_sessions WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))`);
          const rows = Array.isArray(existing) ? existing : (existing as any).rows || [];
          
          if (rows.length > 0) {
              const createdAt = new Date(rows[0].created_at).getTime();
              const now = Date.now();
              if (now - createdAt < 300000) {
                  otp = rows[0].code;
              }
          }

          if (!otp) {
              otp = Math.floor(100000 + Math.random() * 900000).toString(); 
              await db.execute(sql`
                  INSERT INTO otp_sessions (email, code, created_at)
                  VALUES (LOWER(TRIM(${email})), ${otp}, NOW())
                  ON CONFLICT (email)
                  DO UPDATE SET code = ${otp}, created_at = NOW()
              `);
          }

          const htmlContent = `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;"><h2 style="color: #4f46e5;">Selamat Datang di BILANO!</h2><p style="color: #4b5563;">Gunakan kode OTP berikut untuk memverifikasi email Anda.</p><h1 style="background: #f3f4f6; padding: 15px; letter-spacing: 8px; color: #1f2937; border-radius: 8px;">${otp}</h1></div>`;

          if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
              return res.status(500).json({ error: "Kredensial EMAIL_USER / EMAIL_PASS belum diatur di Vercel." });
          }

          const transporter = createTransporter();
          
          await transporter.sendMail({
              from: `"BILANO Official" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: "Kode Verifikasi BILANO",
              html: htmlContent
          });

          res.json({ success: true, message: "OTP Terkirim Cepat!" }); 
      } catch (error: any) {
          console.error("Nodemailer Error:", error);
          res.status(500).json({ error: "Gagal mengirim OTP. Pastikan App Password Gmail sudah benar." });
      }
  });

  app.post("/api/auth/send-otp-reset", async (req, res) => {
      if (!firebaseAdminInitialized) return res.status(500).json({ error: "Sistem Admin belum dikonfigurasi di server Vercel." });
      
      const { email } = req.body;
      try {
          await admin.auth().getUserByEmail(email);
      } catch (e) {
          return res.status(404).json({ error: "Email ini belum terdaftar di aplikasi kami." });
      }

      let otp = "";
      try {
          const existing = await db.execute(sql`SELECT code, created_at FROM otp_sessions WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))`);
          const rows = Array.isArray(existing) ? existing : (existing as any).rows || [];
          
          if (rows.length > 0) {
              const createdAt = new Date(rows[0].created_at).getTime();
              if (Date.now() - createdAt < 300000) otp = rows[0].code;
          }

          if (!otp) {
              otp = Math.floor(100000 + Math.random() * 900000).toString(); 
              await db.execute(sql`
                  INSERT INTO otp_sessions (email, code, created_at)
                  VALUES (LOWER(TRIM(${email})), ${otp}, NOW())
                  ON CONFLICT (email)
                  DO UPDATE SET code = ${otp}, created_at = NOW()
              `);
          }

          const htmlContent = `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;"><h2 style="color: #e11d48;">Reset Password Anda</h2><p style="color: #4b5563;">Gunakan kode OTP rahasia berikut untuk membuat password baru Anda.</p><h1 style="background: #f3f4f6; padding: 15px; letter-spacing: 8px; color: #1f2937; border-radius: 8px;">${otp}</h1></div>`;

          if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
              return res.status(500).json({ error: "Kredensial EMAIL_USER / EMAIL_PASS belum diatur." });
          }

          const transporter = createTransporter();
          
          await transporter.sendMail({
              from: `"BILANO Security" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: "Reset Password BILANO",
              html: htmlContent
          });

          res.json({ success: true, message: "OTP Reset Terkirim" }); 
      } catch (error: any) {
          console.error("Nodemailer Reset Error:", error);
          res.status(500).json({ error: "Gagal mengirim email OTP." });
      }
  });

  app.post("/api/transactions/undo", async (req, res) => {
      try {
          const user = await getUser(req);
          const lastTx = await storage.getLatestTransaction(user!.id);
          if (!lastTx) return res.status(404).json({ error: "Tidak ada transaksi untuk dibatalkan." });

          let newBalance = Math.round(user!.cashBalance);
          const amt = Math.round(lastTx.amount);

          if (lastTx.type === 'income') newBalance -= amt;
          else if (lastTx.type === 'expense') newBalance += amt;
          else if (lastTx.type === 'invest_buy') newBalance += amt;
          else if (lastTx.type === 'invest_sell') newBalance -= amt;
          else if (lastTx.type === 'forex_buy') newBalance += amt;
          else if (lastTx.type === 'forex_sell') newBalance -= amt;
          else if (lastTx.type === 'debt_borrow' || lastTx.type === 'piutang_record') newBalance -= amt;
          else if (lastTx.type === 'debt_lend' || lastTx.type === 'hutang_record') newBalance += amt;
          else if (lastTx.type === 'debt_receive') newBalance -= amt;
          else if (lastTx.type === 'debt_pay') newBalance += amt;

          if (lastTx.type === 'forex_buy' || lastTx.type === 'forex_sell') {
              const desc = lastTx.description || "";
              const match = desc.match(/(Beli|Jual)\s+([0-9.]+)\s+([A-Z]{3})/i);
              if (match) {
                  const qty = parseFloat(match[2]);
                  const curr = match[3].toUpperCase();
                  const existing = await storage.getForexByCurrency(user!.id, curr);
                  if (existing) {
                      const reverseQty = (lastTx.type === 'forex_buy') ? (existing.amount - qty) : (existing.amount + qty);
                      await storage.updateForexAsset(existing.id, Math.max(0, reverseQty));
                  }
              }
          }

          if (lastTx.type === 'invest_buy') {
              const desc = lastTx.description || "";
              const match = desc.match(/([0-9.]+)\s+lot\/unit\s+([A-Z0-9]+)/i);
              if (match) {
                  const qty = parseFloat(match[1]);
                  const symbol = match[2].toUpperCase();
                  const inv = await storage.getInvestmentBySymbol(user!.id, symbol);
                  if (inv) {
                      const newQty = inv.quantity - qty;
                      if (newQty <= 0) await storage.deleteInvestment(inv.id);
                      else await storage.updateInvestment(inv.id, newQty, inv.avgPrice);
                  }
              }
          }

          await storage.updateUserBalance(user!.id, newBalance);
          await storage.deleteTransaction(lastTx.id);

          res.json({ success: true, message: `Berhasil membatalkan: ${lastTx.category}` });
      } catch (e: any) { 
          res.status(500).json({ error: e.message }); 
      }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
      if (!firebaseAdminInitialized) return res.status(500).json({ error: "Kunci Admin JSON di Vercel belum dikonfigurasi!" });
      
      const { email, code, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password baru minimal 6 karakter!" });

      try {
          const result = await db.execute(sql`SELECT code FROM otp_sessions WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))`);
          const rows = Array.isArray(result) ? result : (result as any).rows || [];
          
          if (rows.length === 0 || rows[0].code.trim() !== code.trim()) {
              return res.status(400).json({ error: "Kode OTP Salah atau Kadaluarsa!" });
          }

          const userRecord = await admin.auth().getUserByEmail(email);
          await admin.auth().updateUser(userRecord.uid, { password: newPassword });
          
          await db.execute(sql`DELETE FROM otp_sessions WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))`); 
          res.status(200).json({ success: true, message: "Password berhasil diubah" });
      } catch (error: any) {
          res.status(500).json({ error: "Gagal mengganti password: " + error.message });
      }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
      const { email, code } = req.body;
      try {
          const result = await db.execute(sql`SELECT code FROM otp_sessions WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))`);
          const rows = Array.isArray(result) ? result : (result as any).rows || [];
          
          if (rows.length > 0 && rows[0].code.trim() === code.trim()) {
              await db.execute(sql`DELETE FROM otp_sessions WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))`);
              res.json({ success: true });
          } else {
              res.status(400).json({ error: "Kode OTP Salah atau Kadaluarsa" });
          }
      } catch (e) {
          res.status(500).json({ error: "Error mengecek OTP di database." });
      }
  });

  app.get("/api/ping", async (req, res) => {
      try {
          await db.execute(sql`SELECT 1`);
          res.status(200).json({ status: "awake & db connected", time: new Date().toISOString() });
      } catch (error) {
          res.status(200).json({ status: "awake but db delayed", message: "It's fine" });
      }
  });

  const getUser = async (req: any) => {
    const email = req.headers["x-user-email"];
    
    if (!email || email === "guest") {
        let user = await storage.getUser(1);
        if (!user) {
            user = await storage.createUser({ username: "guest", password: "123", email: "guest@bilano.app" });
        }
        return user;
    }

    let user = await storage.getUserByUsername(email as string);
    if (!user) {
        try {
            user = await storage.createUser({ username: email as string, password: "123", email: email as string });
        } catch (err) {
            user = await storage.getUserByUsername(email as string);
        }
    }

    const vipEmails = [
        "adrienfandra14@gmail.com",
        "bilanotech@gmail.com", 
    ];

    if (user && vipEmails.includes(user.email || "")) {
        user.isPro = true;
        user.proValidUntil = new Date("2099-12-31").toISOString() as any; 
        return user; 
    }

    if (user && user.isPro && user.proValidUntil) {
        const now = new Date();
        const validUntil = new Date(user.proValidUntil);
        if (now > validUntil) {
            user = await storage.updateUserProStatus(user.id, false, null);
        }
    }

    return user;
  };

  app.post("/api/user/onesignal", async (req, res) => {
      try {
          const user = await getUser(req);
          const { onesignalId } = req.body;
          if (user && onesignalId) {
              await storage.updateUserOneSignalId(user.id, onesignalId);
          }
          res.json({ success: true });
      } catch (e) {
          res.status(500).json({ error: "Gagal menyimpan ID OneSignal" });
      }
  });

  app.post("/api/chat/ask", async (req, res) => {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ reply: "Sesi berakhir. Login dulu ya." });
      
      const { message, history } = req.body; 

      const [transactions, target, investments, debts, forexAssets, subscriptions] = await Promise.all([
          storage.getTransactions(user.id), 
          storage.getTarget(user.id), 
          storage.getInvestments(user.id),
          storage.getDebts(user.id),
          storage.getForexAssets(user.id),
          storage.getSubscriptions(user.id)
      ]);

      const saldoTunai = user.cashBalance || 0;
      const totalInvestasi = investments.reduce((acc, inv) => acc + (inv.quantity * inv.avgPrice * (inv.type === 'saham' || (inv.symbol.length === 4 && inv.type !== 'crypto') ? 100 : 1)), 0);
      const activeDebts = debts.filter(d => !d.isPaid);
      const listHutang = activeDebts.filter(d => d.type === 'hutang').map(d => `${d.amount} ${(d.name.split('|')[1] || 'IDR')}`).join(', ') || '0';
      const listPiutang = activeDebts.filter(d => d.type === 'piutang').map(d => `${d.amount} ${(d.name.split('|')[1] || 'IDR')}`).join(', ') || '0';
      const listValas = forexAssets.map(f => `${f.amount} ${f.currency}`).join(', ') || '0';
      const listSubs = subscriptions.filter(s => s.isActive).map(s => `${s.name} (${s.cost})`).join(', ') || 'Tidak ada';

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const txBulanIni = transactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const pengeluaranBulanIni = txBulanIni.filter(t => t.type === 'expense' && t.category !== 'Amal').reduce((acc, t) => acc + t.amount, 0);
      const totalAmalBulanIni = txBulanIni.filter(t => t.category === 'Amal').reduce((acc, t) => acc + t.amount, 0);
      
      let sisaBudget = "Tidak dibatasi";
      if (target && target.monthlyBudget > 0) {
          const sisa = target.monthlyBudget - pengeluaranBulanIni;
          sisaBudget = `Rp ${sisa.toLocaleString('id-ID')}`;
      }

      const systemPrompt = `
      Kamu adalah BILANO Intelligence, asisten konsultan keuangan tingkat elit dan mentor privat di aplikasi BILANO.
      Pembuatmu adalah Adrien Ahza Dhiafandra.
      
      PERATURAN SIKAP & LOGIKA KEUANGAN (MUTLAK):
      1. INGAT KONTEKS: Kamu menerima riwayat percakapan. Jika pengguna bertanya hal lanjutan, jawablah menyambung dengan topik sebelumnya tanpa kebingungan.
      2. MENTOR PROAKTIF: Jadilah mentor yang peduli dan cerdas. SETIAP KALI selesai memberikan jawaban/analisis, kamu WAJIB mengakhirinya dengan sebuah pertanyaan penawaran bantuan.
      3. HUKUM AKUNTANSI BILANO: 
         - Menghapus/Ikhlas Piutang (Write-off) TIDAK mengurangi Kas likuid, hanya mengurangi Kekayaan Bersih (Net Worth).
         - Amal/Sedekah dianggap pengeluaran positif, tidak digabungkan dengan limit budget konsumtif.
      4. PEMISAHAN WAKTU: Perhatikan pertanyaan pengguna! Jika bertanya "bulan ini", gunakan data [BULAN INI]. Jika bertanya secara utuh, gunakan data [KESELURUHAN].
      
      --- DATA KEUANGAN PENGGUNA ---
      [DATA KESELURUHAN (HARTA & KEWAJIBAN TOTAL)]
      - Saldo Kas Tunai (IDR): Rp ${saldoTunai.toLocaleString('id-ID')}
      - Aset Investasi: Rp ${totalInvestasi.toLocaleString('id-ID')}
      - Hutang Pribadi (Kewajiban): ${listHutang}
      - Piutang (Uang di orang lain): ${listPiutang}
      - Valuta Asing (Valas): ${listValas}
      - Tagihan Langganan Aktif: ${listSubs}
      
      [DATA BULAN INI SAJA]
      - Pengeluaran Konsumtif Bulan Ini: Rp ${pengeluaranBulanIni.toLocaleString('id-ID')}
      - Total Amal/Sedekah Bulan Ini: Rp ${totalAmalBulanIni.toLocaleString('id-ID')}
      - Sisa Limit Budget Bulan Ini: ${sisaBudget}
      
      Jawab dengan format Markdown yang rapi, berwibawa, langsung ke intinya (No Yapping), dan tutup dengan pertanyaan proaktif!
      `;

      const reply = await askSmartAI(systemPrompt, message, history);
      res.json({ reply });
  });

  app.get("/api/transactions", async (req, res) => { 
      const user = await getUser(req); 
      res.json(await storage.getTransactions(user!.id)); 
  });
  
  app.post("/api/transactions", async (req, res) => { 
      const user = await getUser(req); 
      const parsed = insertTransactionSchema.safeParse(req.body); 
      if (!parsed.success) return res.status(400).json(parsed.error); 
      
      const tx = await storage.createTransaction(user!.id, { ...parsed.data, userId: user!.id } as any); 
      let newBalance = Math.round(user!.cashBalance); 
      
      if (parsed.data.type === 'income') {
          newBalance += Math.round(parsed.data.amount); 
      } else if (parsed.data.type === 'expense') {
          newBalance -= Math.round(parsed.data.amount); 
      }
      
      if (newBalance !== Math.round(user!.cashBalance)) {
          await storage.updateUserBalance(user!.id, newBalance); 
      }
      res.json(tx); 
  });

  app.delete("/api/user/account", async (req, res) => {
      const user = await getUser(req);
      if (!user || user.username === 'guest') return res.status(401).json({ error: "Sesi tidak valid." });

      try {
          if (firebaseAdminInitialized && user.email) {
              try {
                  const record = await admin.auth().getUserByEmail(user.email);
                  await admin.auth().deleteUser(record.uid);
              } catch (e) {
                  console.log("Firebase user not found or error deleting");
              }
          }

          await db.execute(sql`DELETE FROM transactions WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM investments WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM targets WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM debts WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM subscriptions WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM categories WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM forex_assets WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM help_tickets WHERE user_id = ${user.id}`);
          await db.execute(sql`DELETE FROM users WHERE id = ${user.id}`);

          res.json({ success: true, message: "Seluruh data akun berhasil dimusnahkan." });
      } catch (error) {
          res.status(500).json({ error: "Gagal memusnahkan data akun." });
      }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
      try {
          const user = await getUser(req);
          const txId = parseInt(req.params.id);
          const txs = await storage.getTransactions(user!.id);
          const txToDelete = txs.find(t => t.id === txId);

          if (!txToDelete) return res.status(404).json({ error: "Data transaksi tidak ditemukan" });

          let newBalance = Math.round(user!.cashBalance);
          const amt = Math.round(txToDelete.amount);
          
          if (txToDelete.type === 'income') newBalance -= amt;
          else if (txToDelete.type === 'expense') newBalance += amt;
          else if (txToDelete.type === 'invest_buy') newBalance += amt; 
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
                      if (existingForex) {
                          await storage.updateForexAsset(existingForex.id, existingForex.amount + qty);
                      } else {
                          await storage.createForexAsset(user!.id, { currency: curr, amount: qty } as any);
                      }
                  }
              } catch(e) {}
          }
          else if (txToDelete.type === 'debt_borrow') newBalance -= amt;
          else if (txToDelete.type === 'debt_lend') newBalance += amt;
          else if (txToDelete.type === 'debt_receive') newBalance -= amt;
          else if (txToDelete.type === 'debt_pay') newBalance += amt;

          if (newBalance !== Math.round(user!.cashBalance)) {
              await storage.updateUserBalance(user!.id, newBalance);
          }
          if (typeof storage.deleteTransaction === 'function') {
              await storage.deleteTransaction(txId);
          }
          res.json({ success: true, message: "Transaksi berhasil dimusnahkan dan dikembalikan" });
      } catch (error) {
          res.status(500).json({ error: "Terjadi kesalahan pada server saat menghapus" });
      }
  });

  app.get("/api/forex", async (req, res) => { 
      const user = await getUser(req); 
      res.json(await storage.getForexAssets(user!.id)); 
  });
  
  app.get("/api/forex/rates", async (req, res) => { 
      const now = Date.now();
      const ONE_HOUR = 1000 * 60 * 60;
      if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > ONE_HOUR) { 
          await fetchLiveRates(); 
      }
      if (Object.keys(cachedRates).length === 0) {
          cachedRates = { "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1 };
      }
      res.json(cachedRates); 
  });
  
  app.post("/api/forex/transaction", async (req, res) => {
      const user = await getUser(req);
      const { type, currency, amount } = req.body;
      const existing = await storage.getForexByCurrency(user!.id, currency);
      let currentAmount = existing ? existing.amount : 0;
      
      const t = type.toLowerCase();
      const isIncome = t === 'income' || t === 'pemasukan' || t === 'tambah' || t === 'buy' || t === 'in' || t === 'dapat';
      
      const now = Date.now();
      if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) { 
          await fetchLiveRates(); 
      }
      
      const rate = cachedRates[currency as keyof typeof cachedRates] || 15000;
      const amountIDR = Math.round(amount * rate);
      let newCashBalance = Math.round(user!.cashBalance);

      if (isIncome) {
          if (newCashBalance < amountIDR) return res.status(400).json({message:"Saldo Rupiah tidak cukup untuk beli Valas."});
          currentAmount += amount;
          newCashBalance -= amountIDR;
          await storage.createTransaction(user!.id, { userId: user!.id, type:'forex_buy', amount:amountIDR, category:'Tukar Valas', description:`Beli ${amount} ${currency} (Rate: Rp ${rate.toLocaleString('id-ID')})`, date:new Date()} as any);
      } else {
          currentAmount -= amount;
          if (currentAmount < 0) currentAmount = 0;
          newCashBalance += amountIDR;
          await storage.createTransaction(user!.id, { userId: user!.id, type:'forex_sell', amount:amountIDR, category:'Cairkan Valas', description:`Jual ${amount} ${currency} (Rate: Rp ${rate.toLocaleString('id-ID')})`, date:new Date()} as any);
      }

      await storage.updateUserBalance(user!.id, newCashBalance);
      if (existing) await storage.updateForexAsset(existing.id, currentAmount);
      else await storage.createForexAsset(user!.id, { currency, amount: currentAmount } as any);
      res.json({ success: true, newBalance: currentAmount });
  });

  app.get("/api/debts", async (req, res) => { 
      const user = await getUser(req); 
      res.json(await storage.getDebts(user!.id)); 
  });
  
  app.post("/api/debts", async (req, res) => { 
      try {
          const user = await getUser(req); 
          const { type, amount, name, description, isFromTransaction } = req.body;
          const d = await storage.createDebt(user!.id, req.body as any); 
          
          if (!isFromTransaction) {
              const now = Date.now();
              if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) { 
                  await fetchLiveRates(); 
              }

              const parts = (name || "").split('|');
              const curr = parts[1] || 'IDR';
              const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || 15000);
              const amountIDR = Math.round(amount * rate); 
              
              let txType = '', txCat = '';
              if(type === 'hutang') { txType = 'debt_borrow'; txCat = 'Dapat Pinjaman'; } 
              else { txType = 'debt_lend'; txCat = 'Beri Pinjaman'; }
              
              if (curr === 'IDR') {
                  let newBalance = Math.round(user!.cashBalance);
                  if(type === 'hutang') { newBalance += amountIDR; } 
                  else { newBalance -= amountIDR; }
                  await storage.updateUserBalance(user!.id, newBalance);
              } else {
                  const existingForex = await storage.getForexByCurrency(user!.id, curr);
                  let currentForexAmount = existingForex ? existingForex.amount : 0;
                  
                  if (type === 'hutang') {
                      currentForexAmount += amount; 
                  } else {
                      currentForexAmount -= amount; 
                      if (currentForexAmount < 0) currentForexAmount = 0;
                  }
                  
                  if (existingForex) {
                      await storage.updateForexAsset(existingForex.id, currentForexAmount);
                  } else if (currentForexAmount > 0) {
                      await storage.createForexAsset(user!.id, { currency: curr, amount: currentForexAmount } as any);
                  }
              }

              await storage.createTransaction(user!.id, { userId: user!.id, type: txType, amount: amountIDR, category: txCat, description: `[${type.toUpperCase()}] ${name} - ${description||''}`, date: new Date() } as any);
          }
          res.json(d); 
      } catch(e:any) {
          res.status(500).json({error: e.message});
      }
  });

  app.post("/api/debts/:id/restore", async (req, res) => {
      try {
          const user = await getUser(req);
          const id = parseInt(req.params.id);

          const debts = await storage.getDebts(user!.id);
          const debt = debts.find(d => d.id === id);

          if (!debt || !debt.isPaid) {
              return res.status(400).json({ error: "Tagihan ini tidak dapat dipulihkan karena belum lunas." });
          }

          await db.execute(sql`UPDATE debts SET is_paid = false WHERE id = ${id}`);

          const debtNameOnly = debt.name.split('|')[0];
          const curr = debt.name.split('|')[1] || 'IDR';

          const txs = await storage.getTransactions(user!.id);
          const payTxs = txs.filter(t => 
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

          if (cashOffset !== 0) {
              await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance + cashOffset));
          }

          const hasValasTx = payTxs.some(t => t.category.includes('Valas'));
          if (curr !== 'IDR' && hasValasTx) {
              const existingForex = await storage.getForexByCurrency(user!.id, curr);
              let currentForexAmount = existingForex ? existingForex.amount : 0;
              
              if (debt.type === 'piutang') {
                  currentForexAmount -= debt.amount; 
                  if (currentForexAmount < 0) currentForexAmount = 0;
              } else {
                  currentForexAmount += debt.amount; 
              }

              if (existingForex) {
                  await storage.updateForexAsset(existingForex.id, currentForexAmount);
              } else if (currentForexAmount > 0) {
                  await storage.createForexAsset(user!.id, { currency: curr, amount: currentForexAmount } as any);
              }
          }

          res.json({ success: true, message: "Tagihan berhasil dipulihkan." });
      } catch (error: any) {
          console.error("Restore error:", error);
          res.status(500).json({ error: error.message || "Gagal memulihkan tagihan." });
      }
  });

  app.post("/api/debts/:id/pay", async (req, res) => {
      try {
          const user = await getUser(req);
          const id = parseInt(req.params.id);
          const { amount, isWriteOff } = req.body; 
          
          if (!id || isNaN(id)) return res.status(400).json({ error: "ID Tagihan tidak terbaca oleh server." });

          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) { 
              await fetchLiveRates(); 
          }

          const debts = await storage.getDebts(user!.id);
          const debt = debts.find(d => d.id === id);
          
          if (!debt) return res.status(404).json({ error: "Tagihan ini sudah tidak ada di database." });
          if (debt.isPaid) return res.status(400).json({ error: "Tagihan ini sudah berstatus lunas sebelumnya." });

          const payAmount = (amount !== undefined && amount > 0) ? Math.min(amount, debt.amount) : debt.amount;
          let newBalance = Math.round(user!.cashBalance);
          
          const curr = (debt.name || "").split('|')[1] || 'IDR';
          const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || 15000);
          const payAmountIDR = Math.round(payAmount * rate); 
          
          if (isWriteOff) {
              const txType = debt.type === 'piutang' ? 'expense' : 'income';
              const txCat = debt.type === 'piutang' ? 'Penghapusan Piutang' : 'Pemutihan Hutang';
              
              await storage.createTransaction(user!.id, { 
                  userId: user!.id, 
                  type: txType, 
                  amount: payAmountIDR, 
                  category: txCat, 
                  description: `[WRITE_OFF] ${debt.name}`, 
                  date: new Date() 
              } as any);
          } else {
              if (curr === 'IDR') {
                  if (debt.type === 'piutang') { 
                      newBalance += payAmountIDR; 
                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_receive', amount: payAmountIDR, category: 'Piutang Dibayar', description: `Lunas/Cicilan dari ${debt.name.split('|')[0]}`, date: new Date() } as any); 
                  } else { 
                      newBalance -= payAmountIDR; 
                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_pay', amount: payAmountIDR, category: 'Bayar Hutang', description: `Lunas/Cicilan ke ${debt.name.split('|')[0]}`, date: new Date() } as any); 
                  }
                  await storage.updateUserBalance(user!.id, newBalance);
              } else {
                  const existingForex = await storage.getForexByCurrency(user!.id, curr);
                  let currentForexAmount = existingForex ? existingForex.amount : 0;

                  if (debt.type === 'piutang') { 
                      currentForexAmount += payAmount; 
                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_receive', amount: payAmountIDR, category: 'Piutang Valas Dibayar', description: `Lunas/Cicilan dari ${debt.name.split('|')[0]} (Masuk ke Dompet Valas)`, date: new Date() } as any); 
                  } else { 
                      currentForexAmount -= payAmount; 
                      if (currentForexAmount < 0) currentForexAmount = 0;
                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_pay', amount: payAmountIDR, category: 'Bayar Hutang Valas', description: `Lunas/Cicilan ke ${debt.name.split('|')[0]} (Potong dari Dompet Valas)`, date: new Date() } as any); 
                  }

                  if (existingForex) {
                      await storage.updateForexAsset(existingForex.id, currentForexAmount);
                  } else if (currentForexAmount > 0) {
                      await storage.createForexAsset(user!.id, { currency: curr, amount: currentForexAmount } as any);
                  }
              }
          }
          
          const remaining = debt.amount - payAmount;
          if (remaining > 0) {
              await storage.createDebt(user!.id, {
                  userId: user!.id,
                  type: debt.type, 
                  name: debt.name, 
                  amount: remaining, 
                  dueDate: (debt as any).dueDate || null,
                  description: (debt.description || '') + ` (Sisa dari ${debt.amount})`
              } as any);
          }
          
          await storage.markDebtPaid(id); 
          res.json({ success: true });

      } catch (error: any) {
          console.error("Error pay debt:", error);
          res.status(500).json({ error: error.message || "Gagal memproses ke database." });
      }
  });

  app.delete("/api/debts/:id", async (req, res) => { 
      await storage.deleteDebt(parseInt(req.params.id)); 
      res.json({success:true}); 
  });

  app.get("/api/target", async (req, res) => { 
      const user = await getUser(req); 
      res.json(await storage.getTarget(user!.id) || {}); 
  });
  
  app.patch("/api/target/penalty", async (req, res) => { 
      const user = await getUser(req); 
      try { 
          await storage.updateTargetPenalty(user!.id, Math.round(req.body.amount)); 
          res.json({success:true}); 
      } catch(e) { 
          res.status(500).send("Error"); 
      } 
  });
  
  app.post("/api/target", async (req, res) => { 
      const user = await getUser(req); 
      const { 
          addCurrentCash, initialForexList, initialDebts, initialReceivables, initialInvestments, ...targetData 
      } = req.body; 
      
      const target = await storage.setTarget(user!.id, targetData as any); 
      
      const promises = [];
      
      if (addCurrentCash !== undefined && addCurrentCash > 0) {
          promises.push(storage.updateUserBalance(user!.id, Math.round(addCurrentCash))); 
      }
      
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
              if (item.amount > 0 && item.name) {
                  promises.push(storage.createDebt(user!.id, { userId: user!.id, type: 'hutang', name: item.name, amount: item.amount } as any));
              }
          }
      }

      if (initialReceivables && Array.isArray(initialReceivables)) {
          for (const item of initialReceivables) {
              if (item.amount > 0 && item.name) {
                  promises.push(storage.createDebt(user!.id, { userId: user!.id, type: 'piutang', name: item.name, amount: item.amount } as any));
              }
          }
      }

      if (initialInvestments && Array.isArray(initialInvestments)) {
          for (const item of initialInvestments) {
              if (item.quantity > 0 && item.symbol && item.price > 0) {
                  promises.push(storage.createInvestment(user!.id, { 
                      userId: user!.id,
                      symbol: item.symbol.toUpperCase(), 
                      quantity: item.quantity, 
                      avgPrice: item.price, 
                      type: (item.type || 'saham').toLowerCase() 
                  } as any));
              }
          }
      }

      await Promise.all(promises);

      res.json(target); 
  });
  
  app.get("/api/investments", async (req, res) => { 
      const user = await getUser(req); 
      res.json(await storage.getInvestments(user!.id)); 
  });
  
  app.post("/api/investments/buy", async (req, res) => { 
      try {
          const user = await getUser(req); 
          const { symbol, quantity, price, type } = req.body; 
          const typeLower = (type || 'saham').toLowerCase();
          const m = (typeLower==='saham'||(symbol.length===4&&typeLower!=='crypto'))?100:1; 
          const total = Math.round(quantity*price*m); 
          
          if(user!.cashBalance < total) return res.status(400).json({message:"Saldo Rupiah tidak cukup untuk pembelian ini."}); 
          await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance - total)); 
          
          await storage.createTransaction(user!.id, {userId: user!.id, type:'invest_buy', amount:total, category:'Beli Aset', description:`${quantity} lot/unit ${symbol} @ Rp ${price.toLocaleString('id-ID')}`, date:new Date()} as any); 
          await storage.createInvestment(user!.id, {userId: user!.id, symbol: symbol.toUpperCase(), quantity, avgPrice:price, type: typeLower} as any); 
          res.json({success:true}); 
      } catch (error: any) {
          res.status(500).json({ message: "Terjadi kesalahan internal pada server saat menyimpan aset." });
      }
  });

  app.post("/api/investments/sell", async (req, res) => { 
      try {
          const user = await getUser(req); 
          const { symbol, quantity, price, type } = req.body; 
          const typeLower = (type || 'saham').toLowerCase(); 
          const m = (typeLower==='saham'||(symbol.length===4&&typeLower!=='crypto'))?100:1; 
          const totalSellPrice = Math.round(quantity*price*m); 
          
          const allInvestments = await storage.getInvestments(user!.id);
          const existings = allInvestments.filter(i => i.symbol === symbol); 
          
          let remainingToSell = quantity;
          let totalBuyPrice = 0;

          for (const existing of existings) {
              if (remainingToSell <= 0) break;

              if (existing.quantity <= remainingToSell) {
                  totalBuyPrice += existing.quantity * existing.avgPrice * m;
                  remainingToSell -= existing.quantity;
                  await storage.deleteInvestment(existing.id); 
              } else {
                  totalBuyPrice += remainingToSell * existing.avgPrice * m;
                  await storage.updateInvestment(existing.id, existing.quantity - remainingToSell, existing.avgPrice); 
                  remainingToSell = 0;
              }
          } 

          const pl = Math.round(totalSellPrice - totalBuyPrice);
          const profitLossText = ` (P/L: ${pl >= 0 ? '+' : ''}Rp ${pl.toLocaleString('id-ID')})`;

          await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance + totalSellPrice)); 
          
          await storage.createTransaction(user!.id, {userId: user!.id, type:'invest_sell', amount:totalSellPrice, category:'Jual Aset', description:`${quantity} lot/unit ${symbol} @ Rp ${price.toLocaleString('id-ID')}${profitLossText}`, date:new Date()} as any); 
          res.json({success:true}); 
      } catch (error: any) {
          res.status(500).json({ message: "Terjadi kesalahan internal pada server saat menjual aset." });
      }
  });

  app.get("/api/reports/data", async (req, res) => { 
      const user = await getUser(req); 
      const [tx, inv, debt, fx, sub] = await Promise.all([ 
          storage.getTransactions(user!.id), 
          storage.getInvestments(user!.id), 
          storage.getDebts(user!.id), 
          storage.getForexAssets(user!.id), 
          storage.getSubscriptions(user!.id) 
      ]); 
      res.json({ user, transactions: tx, investments: inv, debts: debt, forexAssets: fx, subscriptions: sub }); 
  });
  
  app.get("/api/categories", async (req, res) => { 
      const user = await getUser(req); 
      res.json(await storage.getCategories(user!.id)); 
  });
  
  app.post("/api/categories", async (req, res) => { 
      const user = await getUser(req); 
      await storage.createCategory({ ...req.body, userId: user!.id } as any); 
      res.json({success:true}); 
  });
  
  app.delete("/api/categories/:id", async (req, res) => { 
      await storage.deleteCategory(parseInt(req.params.id)); 
      res.json({success:true}); 
  });

  app.get("/api/subscriptions", async (req, res) => { 
      const user = await getUser(req); 
      res.json(await storage.getSubscriptions(user!.id)); 
  });

  app.post("/api/subscriptions", async (req, res) => { 
      const user = await getUser(req); 
      const sub = await storage.createSubscription(user!.id, req.body as any); 
      res.json(sub); 
  });

  app.patch("/api/subscriptions/:id/status", async (req, res) => { 
      const { isActive } = req.body;
      await storage.updateSubscriptionStatus(parseInt(req.params.id), isActive); 
      res.json({ success: true }); 
  });

  app.delete("/api/subscriptions/:id", async (req, res) => { 
      await storage.deleteSubscription(parseInt(req.params.id)); 
      res.json({ success: true }); 
  });

  app.get("/api/user", async (req, res) => { 
      const user = await getUser(req); 
      res.json(user); 
  });
  
  app.patch("/api/user/profile", async (req, res) => { 
      const user = await getUser(req); 
      await storage.updateUserProfile(user!.id, req.body.firstName, req.body.lastName, req.body.profilePicture); 
      res.json({success:true}); 
  });

  // ====================================================================
  // 🚀 UPDATE: PAYMENT GATEWAY MAYAR (DUAL PRICING STRATEGY)
  // ====================================================================
  app.post("/api/payment/mayar/charge", async (req, res) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const mayarKey = (process.env.MAYAR_API_KEY || "").replace(/['"]/g, "").trim();

          if (!mayarKey) {
              return res.status(400).json({ error: "MAYAR_API_KEY belum terpasang di Vercel!" });
          }

          // 🚀 TANGKAP PILIHAN PAKET DARI APLIKASI
          const { plan } = req.body; 
          const isMonthly = plan === 'monthly';

          const price = isMonthly ? 14900 : 99000;
          const planName = isMonthly ? "BILANO PRO (1 Bulan)" : "BILANO PRO (1 Tahun)";
          const idProd = isMonthly ? "BILANO-PRO-1M" : "BILANO-PRO-1Y";

          const expiredDate = new Date();
          expiredDate.setDate(expiredDate.getDate() + 1);

          const appUrl = req.headers.origin || "https://bilanofinance-dvbi.vercel.app";

          const payload = {
              name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "Member BILANO",
              email: user.email || "member@bilano.app",
              mobile: "081234567890", 
              redirectUrl: `${appUrl}/`, 
              description: `Langganan ${planName}`,
              expiredAt: expiredDate.toISOString(),
              items: [
                  {
                      quantity: 1,
                      rate: price,
                      description: `Akses ${planName}`
                  }
              ],
              extraData: {
                  noCustomer: user.id.toString(),
                  idProd: idProd // 🚀 KODE RAHASIA UNTUK DIBACA OLEH WEBHOOK
              }
          };

          const mayarRes = await fetch("https://api.mayar.id/hl/v1/invoice/create", {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${mayarKey}` 
              },
              body: JSON.stringify(payload)
          });

          const textData = await mayarRes.text();

          if (!mayarRes.ok) {
              return res.status(400).json({ error: `MAYAR ERROR [${mayarRes.status}]: ${textData}` });
          }

          try {
              const data = JSON.parse(textData);
              const redirectUrl = data.data?.link || data.link || (data.data && data.data.url);
              
              if (redirectUrl) {
                  return res.json({ success: true, redirectUrl });
              } else {
                  return res.status(400).json({ error: "Mayar sukses tapi link hilang: " + textData });
              }
          } catch (parseErr) {
              return res.status(500).json({ error: "Format Mayar Aneh: " + textData });
          }

      } catch (error: any) {
          res.status(500).json({ error: "SERVER CRASH: " + error.message });
      }
  });

  // 🚀 UPDATE: WEBHOOK MAYAR (MEMBACA KODE RAHASIA BULANAN/TAHUNAN)
  app.post("/api/payment/mayar/webhook", async (req, res) => {
      try {
          const payload = req.body || {}; 
          console.log("MAYAR WEBHOOK DATA:", JSON.stringify(payload));

          const status = String(payload?.status || payload?.data?.status || "").toUpperCase();
          const userIdStr = payload?.data?.extraData?.noCustomer || payload?.extraData?.noCustomer;
          const targetUserId = userIdStr ? parseInt(userIdStr, 10) : null;
          
          // 🚀 BACA KODE RAHASIA YANG KITA KIRIM TADI
          const purchasedPlan = payload?.data?.extraData?.idProd || payload?.extraData?.idProd || "BILANO-PRO-1Y";

          const customerEmail = String(
              payload?.customer_email || 
              payload?.data?.customer_email || 
              payload?.customer?.email || 
              payload?.data?.customer?.email || 
              payload?.email || 
              payload?.data?.email || 
              ""
          );

          if (status === 'SUCCESS' || status === 'PAID' || status === 'SETTLED') {
              let targetUser = null;

              if (targetUserId) {
                  targetUser = await storage.getUser(targetUserId);
              }
              
              if (!targetUser && customerEmail) {
                  targetUser = await storage.getUserByUsername(customerEmail);
                  if (!targetUser) targetUser = await storage.getUserByUsername(customerEmail.toLowerCase());
              }

              if (targetUser) {
                  const validUntil = new Date();
                  
                  // 🚀 LOGIKA PEMBUKA GEMBOK (1 BULAN vs 1 TAHUN)
                  if (purchasedPlan === "BILANO-PRO-1M") {
                      validUntil.setMonth(validUntil.getMonth() + 1);
                      console.log(`✅ GEMBOK DIBUKA! USER ${targetUser.email} SEKARANG PRO (1 BULAN)!`);
                  } else {
                      validUntil.setFullYear(validUntil.getFullYear() + 1);
                      console.log(`✅ GEMBOK DIBUKA! USER ${targetUser.email} SEKARANG PRO (1 TAHUN)!`);
                  }

                  await storage.updateUserProStatus(targetUser.id, true, validUntil);
              } else {
                  console.error(`❌ GAGAL BUKA GEMBOK: User ID ${targetUserId} / Email ${customerEmail} tidak ditemukan di DB!`);
              }
          }
          res.status(200).json({ success: true });
      } catch (error) {
          console.error("❌ WEBHOOK ERROR:", error);
          res.status(200).json({ success: false, message: "Handled" }); 
      }
  });

  app.post("/api/help/submit", async (req, res) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
          
          const { subject, message } = req.body;
          const ticketId = `TCK-${Date.now()}`;
          const name = user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Pengguna BILANO';
          
          try {
              await db.execute(sql`INSERT INTO help_tickets (id, user_id, email, name, subject, message, status) VALUES (${ticketId}, ${user.id}, ${user.email}, ${name}, ${subject}, ${message}, 'Menunggu Balasan')`);
          } catch (dbErr) {
              console.error("Gagal menyimpan ke DB:", dbErr);
          }
          
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
                          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 10px;">
                              ${message}
                          </div>
                          <p style="margin-top:20px; font-size:12px; color:#666;">Silakan balas dari dashboard Admin Premium.</p>
                        </div>
                      `
                  });
              }
          } catch(e) {
              console.error("Gagal mengirim email notifikasi tiket:", e);
          }
          
          res.json({ success: true, ticketId });
      } catch (error) {
          res.status(500).json({ error: "Gagal mengirimkan laporan." });
      }
  });

  app.get("/api/admin/help", async (req, res) => {
      const email = req.headers["x-user-email"] as string;
      if (!isAdminValid(email)) return res.status(403).json({ error: "Penyusup Ditolak" });
      
      try {
          const result = await db.execute(sql`SELECT * FROM help_tickets ORDER BY date DESC`);
          const rows = Array.isArray(result) ? result : (result as any).rows || [];
          res.json(rows);
      } catch (e) {
          res.json([]);
      }
  });

  app.post("/api/admin/help/reply", async (req, res) => {
      const emailAdmin = req.headers["x-user-email"] as string;
      if (!isAdminValid(emailAdmin)) return res.status(403).json({ error: "Penyusup Ditolak" });
      
      const { ticketId, userEmail, subject, replyMessage } = req.body;
      
      try {
          if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
              const transporter = createTransporter();
              await transporter.sendMail({
                  from: `"Tim Bantuan BILANO" <${process.env.EMAIL_USER}>`,
                  to: userEmail,
                  subject: `Re: [${ticketId}] ${subject}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px; margin: auto;">
                      <img src="https://bilanofinance-dvbi.vercel.app/Bilano_horiz_rbg.png" width="120" style="margin-bottom: 20px;" />
                      <h2 style="color: #4f46e5; margin-bottom: 5px;">Balasan Tim Bantuan BILANO</h2>
                      <p style="color: #6b7280; font-size: 12px; margin-top: 0;">Tiket: ${ticketId}</p>
                      
                      <div style="font-size: 14px; color: #1f2937; line-height: 1.6; margin-top: 20px;">
                          ${replyMessage.replace(/\n/g, '<br/>')}
                      </div>
                      
                      <hr style="border:none; border-top: 1px dashed #e5e7eb; margin: 30px 0;" />
                      <p style="font-size: 11px; color: #9ca3af; text-align: center;">Pesan ini dikirim otomatis oleh sistem pusat bantuan BILANO. Jika ada pertanyaan, buat tiket baru di aplikasi.</p>
                    </div>
                  `
              });
          }
          
          try {
              await db.execute(sql`DELETE FROM help_tickets WHERE id = ${ticketId}`);
          } catch(e) {}
          
          res.json({ success: true });
      } catch (error) {
          res.status(500).json({ error: "Gagal mengirimkan email balasan." });
      }
  });

  app.post("/api/admin/silent-correction", async (req, res) => {
      try {
          const user = await getUser(req);
          const { deductAmount } = req.body; 

          let newBalance = Math.round(user!.cashBalance - deductAmount);
          await storage.updateUserBalance(user!.id, newBalance);

          res.json({ 
              success: true, 
              message: "Operasi senyap berhasil. Saldo telah dikoreksi tanpa jejak." 
          });
      } catch(e:any) {
          res.status(500).json({ error: e.message });
      }
  });

  app.post("/api/vision/scan", async (req, res) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const { images } = req.body; 
          if (!images || !Array.isArray(images) || images.length === 0) {
              return res.status(400).json({ error: "Tidak ada gambar yang diunggah." });
          }

          const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
          if (!apiKey) return res.status(500).json({ error: "Sistem AI belum dikonfigurasi di server." });

          const imageParts = images.map((base64Str: string) => {
              const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
              const mimeTypeMatch = base64Str.match(/^data:(.*?);base64,/);
              const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
              
              return {
                  inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                  }
              };
          });

          const systemPrompt = `
          Kamu adalah Asisten Finansial BILANO yang cerdas.
          Tugasmu adalah membaca struk belanja/transfer dari gambar yang diberikan.
          
          PERATURAN MUTLAK:
          1. Cari "TOTAL" atau "GRAND TOTAL" atau jumlah akhir yang harus dibayar. (Abaikan subtotal, diskon, atau uang kembalian).
          2. Deteksi MATA UANG. Jika ada simbol $, USD, RM, dll, catat kode ISO-nya (USD, MYR, SGD, EUR, dll). Jika Rp atau tidak ada keterangan, asumsikan "IDR".
          3. Tentukan KATEGORI pengeluaran berdasarkan nama toko/item (contoh: Makan/Minum, Transport, Belanja, Tagihan Bulanan, Lainnya).
          4. Buat RINGKASAN pendek dari mana struk ini berasal.

          JIKA ADA LEBIH DARI SATU GAMBAR:
          Jumlahkan total semuanya (asumsikan mata uangnya sama untuk semua gambar yang diupload bersamaan).
          
          OUTPUT WAJIB DALAM FORMAT JSON SEPERTI INI (TANPA MARKDOWN, HANYA JSON MURNI):
          {
            "totalAmount": 150000,
            "currency": "IDR",
            "category": "Makan/Minum",
            "description": "Makan di Resto A (Struk 1: 50.000, Struk 2: 100.000)"
          }
          `;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  contents: [
                      {
                          role: "user",
                          parts: [
                              { text: systemPrompt },
                              ...imageParts
                          ]
                      }
                  ],
                  generationConfig: {
                      temperature: 0.1, 
                      response_mime_type: "application/json", 
                  }
              })
          });

          if (!response.ok) {
              throw new Error("Detail Error AI: Timeout");
          }

          const aiData = await response.json();
          const resultText = aiData.candidates[0].content.parts[0].text;
          
          let parsedResult;
          try {
              parsedResult = JSON.parse(resultText);
          } catch (e) {
              const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
              parsedResult = JSON.parse(cleanedText);
          }

          res.json({ success: true, data: parsedResult });

      } catch (error: any) {
          res.status(500).json({ error: error.message || "Gagal memproses gambar." });
      }
  });

  const httpServer = createServer(app);
  return httpServer;
}