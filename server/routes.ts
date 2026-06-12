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
        if (!apiKey || apiKey.includes("KUNCI_SUDAH_DIAMANKAN")) return "⚠️ API Key AI belum terpasang dengan benar di .env atau Vercel.";
        let formattedContents = history.map((msg: any) => ({ role: msg.sender === 'user' ? "user" : "model", parts: [{ text: msg.text }] }));
        formattedContents.push({ role: "user", parts: [{ text: userMessage }] });
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: formattedContents }) });
        if (!response.ok) return `⚠️ Koneksi ditolak server pusat AI.`; 
        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) return "⚠️ Pesan ditahan filter keamanan.";
        return data.candidates[0].content.parts[0].text;
    } catch (error: any) { return "⚠️ Maaf Bos, sistem Asisten AI sedang sangat sibuk."; }
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

  app.get("/api/admin/upgrade-db", async (req, res) => {
      try {
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onesignal_id TEXT;`);
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
          await db.execute(sql`ALTER TABLE users ALTER COLUMN cash_balance TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE transactions ALTER COLUMN amount TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE targets ALTER COLUMN target_amount TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE targets ALTER COLUMN monthly_budget TYPE BIGINT;`);
          await db.execute(sql`ALTER TABLE subscriptions ALTER COLUMN cost TYPE BIGINT;`);
          await db.execute(sql`CREATE TABLE IF NOT EXISTS help_tickets (id VARCHAR(255) PRIMARY KEY, user_id INTEGER, email TEXT, name TEXT, subject TEXT, message TEXT, status TEXT, date TIMESTAMP DEFAULT NOW());`);
          
          await ensureOtpTable();
          await ensureRetainedTable();

          await db.execute(sql`ALTER TABLE debts ALTER COLUMN amount TYPE DOUBLE PRECISION;`);
          await db.execute(sql`ALTER TABLE forex_assets ALTER COLUMN amount TYPE DOUBLE PRECISION;`);
          await db.execute(sql`ALTER TABLE investments ALTER COLUMN quantity TYPE DOUBLE PRECISION;`);
          await db.execute(sql`ALTER TABLE investments ALTER COLUMN avg_price TYPE DOUBLE PRECISION;`);
          
          try { await db.execute(sql`ALTER TABLE forex_assets ADD COLUMN IF NOT EXISTS avg_price DOUBLE PRECISION DEFAULT 0;`); } catch(e){}

          res.json({ success: true, message: "🎉 DATABASE BERHASIL DIOPTIMASI!" });
      } catch (e: any) { res.status(500).json({ error: "Gagal Update DB: " + e.message }); }
  });

  app.post("/api/auth/check-email", async (req, res) => {
      if (!firebaseAdminInitialized) return res.status(200).json({ adminReady: false, exists: true }); 
      try {
          await admin.auth().getUserByEmail(req.body.email.trim().toLowerCase());
          res.json({ adminReady: true, exists: true }); 
      } catch (e: any) {
          if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') res.json({ adminReady: true, exists: false }); 
          else res.json({ adminReady: true, exists: true }); 
      }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
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

  app.post("/api/auth/send-otp-reset", async (req, res) => {
      if (!firebaseAdminInitialized) return res.status(500).json({ error: "Sistem Admin belum dikonfigurasi di server Vercel." });
      const cleanEmail = (req.body.email || "").trim().toLowerCase();
      try { await admin.auth().getUserByEmail(cleanEmail); } catch (e) { return res.status(404).json({ error: "Email ini belum terdaftar di aplikasi kami." }); }

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

  app.post("/api/transactions/undo", async (req, res) => {
      try {
          const user = await getUser(req);
          const lastTx = await storage.getLatestTransaction(user!.id);
          if (!lastTx) return res.status(404).json({ error: "Tidak ada transaksi untuk dibatalkan." });

          let newBalance = Math.round(user!.cashBalance);
          const amt = Math.round(lastTx.amount);

          const isValas = lastTx.category?.includes('Valas') || lastTx.type?.includes('forex') || lastTx.description?.includes('(Potong Dompet Valas)') || lastTx.description?.includes('(Masuk ke Dompet Valas)');

          if (!isValas) {
              if (lastTx.type === 'income') newBalance -= amt;
              else if (lastTx.type === 'expense') newBalance += amt;
              else if (lastTx.type === 'debt_borrow' || lastTx.type === 'piutang_record') newBalance -= amt;
              else if (lastTx.type === 'debt_lend' || lastTx.type === 'hutang_record') newBalance += amt;
              else if (lastTx.type === 'debt_receive') newBalance -= amt;
              else if (lastTx.type === 'debt_pay') newBalance += amt;
          }

          if (lastTx.type === 'invest_buy' && !isValas) newBalance += amt;
          else if (lastTx.type === 'invest_sell' && !isValas) newBalance -= amt;
          else if (lastTx.type === 'forex_buy') newBalance += amt;
          else if (lastTx.type === 'forex_sell') newBalance -= amt;

          if (lastTx.type === 'forex_buy' || lastTx.type === 'forex_sell') {
              const desc = lastTx.description || "";
              const match = desc.match(/(Beli|Jual)\s+([0-9.]+)\s+([A-Z]{3})/i);
              if (match) {
                  const qty = parseFloat(match[2]);
                  const curr = match[3].toUpperCase();
                  if (lastTx.type === 'forex_buy') {
                      await db.execute(sql`UPDATE forex_assets SET amount = GREATEST(amount - ${qty}, 0) WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  } else {
                      await db.execute(sql`UPDATE forex_assets SET amount = amount + ${qty} WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  }
              }
          }

          if (lastTx.type === 'invest_buy') {
              if (isValas) {
                  const desc = lastTx.description || "";
                  const match = desc.match(/@\s+([A-Z]{3})\s+([0-9.]+)/i);
                  if (match) {
                      const curr = match[1].toUpperCase();
                      const price = parseFloat(match[2]);
                      const qtyMatch = desc.match(/([0-9.]+)\s+unit/i) || desc.match(/([0-9.]+)\s+lot/i);
                      const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
                      const valasAmount = qty * price;
                      await db.execute(sql`UPDATE forex_assets SET amount = amount + ${valasAmount} WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  }
              }

              const desc = lastTx.description || "";
              const matchSymbol = desc.match(/lot\/unit\s+([A-Z0-9|]+)/i) || desc.match(/unit\s+([A-Z0-9|]+)/i);
              if (matchSymbol) {
                  const symbol = matchSymbol[1].toUpperCase();
                  const inv = await storage.getInvestmentBySymbol(user!.id, symbol);
                  if (inv) {
                      const qtyMatch = desc.match(/([0-9.]+)\s+lot/i) || desc.match(/([0-9.]+)\s+unit/i);
                      const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
                      const newQty = inv.quantity - qty;
                      if (newQty <= 0) await storage.deleteInvestment(inv.id);
                      else await storage.updateInvestment(inv.id, newQty, inv.avgPrice);
                  }
              }
          }
          else if (lastTx.type === 'invest_sell') {
              if (isValas) {
                  const desc = lastTx.description || "";
                  const match = desc.match(/@\s+([A-Z]{3})\s+([0-9.]+)/i);
                  if (match) {
                      const curr = match[1].toUpperCase();
                      const price = parseFloat(match[2]);
                      const qtyMatch = desc.match(/([0-9.]+)\s+unit/i) || desc.match(/([0-9.]+)\s+lot/i);
                      const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
                      const valasAmount = qty * price;
                      await db.execute(sql`UPDATE forex_assets SET amount = GREATEST(amount - ${valasAmount}, 0) WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  }
              }

              const desc = lastTx.description || "";
              const matchSymbol = desc.match(/lot\/unit\s+([A-Z0-9|]+)/i) || desc.match(/unit\s+([A-Z0-9|]+)/i);
              if (matchSymbol) {
                  const symbol = matchSymbol[1].toUpperCase();
                  const qtyMatch = desc.match(/([0-9.]+)\s+lot/i) || desc.match(/([0-9.]+)\s+unit/i);
                  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
                  const matchPrice = desc.match(/@\s+(?:Rp\s+|[A-Z]{3}\s+)([0-9.]+)/i);
                  const price = matchPrice ? parseFloat(matchPrice[1].replace(/\./g, '')) : 0;
                  
                  const inv = await storage.getInvestmentBySymbol(user!.id, symbol);
                  if (inv) {
                      await storage.updateInvestment(inv.id, inv.quantity + qty, inv.avgPrice);
                  } else {
                      await storage.createInvestment(user!.id, {userId: user!.id, symbol: symbol, quantity: qty, avgPrice: price, type: 'saham'} as any);
                  }
              }
          }

          if (lastTx.type === 'income' || lastTx.type === 'expense') {
              const valasMutMatch = (lastTx.description || "").match(/\[Valas (Masuk|Keluar)\s+([0-9.]+)\s+([A-Z]{3})\]/i);
              if (valasMutMatch) {
                  const isMasuk = valasMutMatch[1].toLowerCase() === 'masuk';
                  const qty = parseFloat(valasMutMatch[2]);
                  const curr = valasMutMatch[3].toUpperCase();
                  if (isMasuk) {
                      await db.execute(sql`UPDATE forex_assets SET amount = GREATEST(amount - ${qty}, 0) WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  } else {
                      await db.execute(sql`UPDATE forex_assets SET amount = amount + ${qty} WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  }
              }
          }

          await storage.updateUserBalance(user!.id, newBalance);
          await storage.deleteTransaction(lastTx.id);

          res.json({ success: true, message: `Berhasil membatalkan: ${lastTx.category}` });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
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

  app.post("/api/auth/verify-otp", async (req, res) => {
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

  app.get("/api/ping", async (req, res) => {
      try {
          await db.execute(sql`SELECT 1`);
          res.status(200).json({ status: "awake & db connected", time: new Date().toISOString() });
      } catch (error) { res.status(200).json({ status: "awake but db delayed", message: "It's fine" }); }
  });

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

    const vipEmails = ["adrienfandra14@gmail.com", "bilanotech@gmail.com"];

    if (user && vipEmails.includes(user.email || "")) {
        user.isPro = true;
        user.proValidUntil = new Date("2099-12-31").toISOString() as any; 
        return user; 
    }

    if (user && user.isPro && user.proValidUntil) {
        const now = new Date();
        const validUntil = new Date(user.proValidUntil);
        if (now > validUntil) user = await storage.updateUserProStatus(user.id, false, null);
    }
    return user;
  };

  const isAdminValid = (email: string) => { return ["adrienfandra14@gmail.com", "bilanotech@gmail.com"].includes(email); };

  app.post("/api/user/onesignal", async (req, res) => {
      try {
          const user = await getUser(req);
          const { onesignalId } = req.body;
          if (user && onesignalId) await storage.updateUserOneSignalId(user.id, onesignalId);
          res.json({ success: true });
      } catch (e) { res.status(500).json({ error: "Gagal menyimpan ID OneSignal" }); }
  });

  app.all("/api/cron/notifications", async (req, res) => {
      try {
          const restKey = process.env.ONESIGNAL_REST_KEY;
          const appId = process.env.ONESIGNAL_APP_ID; 

          if (!restKey || !appId) return res.status(400).json({ error: "ONESIGNAL_REST_KEY atau ONESIGNAL_APP_ID tidak ditemukan di environment Vercel." });

          const NOTIF_MESSAGES = [
              "Waktunya ngecek dompet! Ada jajan yang belum dicatat? 🤔",
              "BILANO kangen nih. Yuk update catatan keuanganmu! 🚀",
              "Hari ini udah nabung atau malah boncos? Yuk catat dulu! 📊"
          ];
          const randomMsg = NOTIF_MESSAGES[Math.floor(Math.random() * NOTIF_MESSAGES.length)];

          const payload = {
              app_id: appId,
              included_segments: ["Subscribed Users"], 
              headings: { en: "BILANO Finance", id: "BILANO Finance" },
              contents: { en: randomMsg, id: randomMsg },
              url: "https://bilanofinance-dvbi.vercel.app/dashboard",
              chrome_web_icon: "https://bilanofinance-dvbi.vercel.app/BILANO-ICON.png",
              chrome_web_badge: "https://bilanofinance-dvbi.vercel.app/BILANO-ICON.png",
              firefox_icon: "https://bilanofinance-dvbi.vercel.app/BILANO-ICON.png"
          };

          const response = await fetch("https://onesignal.com/api/v1/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Basic ${restKey}` },
              body: JSON.stringify(payload)
          });

          const data = await response.json();
          res.json({ success: true, onesignal_response: data });
      } catch (error: any) {
          res.status(500).json({ error: "Gagal memproses Cron Job OneSignal: " + error.message });
      }
  });

  app.post("/api/chat/ask", async (req, res) => {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ reply: "Sesi berakhir. Login dulu ya." });
      
      const { message, history } = req.body; 

      const [transactions, target, investments, debts, forexAssets, subscriptions] = await Promise.all([
          storage.getTransactions(user.id), storage.getTarget(user.id), storage.getInvestments(user.id),
          storage.getDebts(user.id), storage.getForexAssets(user.id), storage.getSubscriptions(user.id)
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
      if (target && target.monthlyBudget > 0) sisaBudget = `Rp ${(target.monthlyBudget - pengeluaranBulanIni).toLocaleString('id-ID')}`;

      const systemPrompt = `
      Kamu adalah BILANO Intelligence.
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

  app.get("/api/retained", async (req, res) => {
      try {
          const user = await getUser(req);
          await ensureRetainedTable();
          const result = await db.execute(sql`SELECT * FROM retained_balances WHERE user_id = ${user!.id} ORDER BY updated_at DESC`);
          const rows = Array.isArray(result) ? result : (result as any).rows || [];
          res.json(rows.map((r:any) => ({ id: r.id, userId: r.user_id, source: r.source, amount: r.amount, currency: r.currency, createdAt: r.created_at, updatedAt: r.updated_at })));
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/retained", async (req, res) => {
      try {
          const user = await getUser(req);
          const { source, amount, currency } = req.body;
          await ensureRetainedTable();
          await db.execute(sql`INSERT INTO retained_balances (user_id, source, amount, currency, created_at, updated_at) VALUES (${user!.id}, ${source}, ${amount}, ${currency}, NOW(), NOW())`);
          res.json({ success: true });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/retained/:id", async (req, res) => {
      try {
          const user = await getUser(req);
          const { amount } = req.body;
          await db.execute(sql`UPDATE retained_balances SET amount = ${amount}, updated_at = NOW() WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
          res.json({ success: true });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/retained/:id", async (req, res) => {
      try {
          const user = await getUser(req);
          await db.execute(sql`DELETE FROM retained_balances WHERE id = ${req.params.id} AND user_id = ${user!.id}`);
          res.json({ success: true });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/retained/:id/withdraw", async (req, res) => {
      try {
          const user = await getUser(req);
          const { amount } = req.body;
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

          await storage.createTransaction(user!.id, { 
              userId: user!.id, 
              type: 'income', 
              amount: amountIDR, 
              category: 'Pencairan Dana', 
              description: `Pencairan dari ${retained.source} (${amount} ${retained.currency})`, 
              date: new Date() 
          } as any);

          res.json({ success: true, newBalance });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/transactions", async (req, res) => { 
      const user = await getUser(req); 
      
      // 🧹 SAPU BERSIH: Menghapus semua transaksi gaib dari sistem
      try {
          await db.execute(sql`DELETE FROM transactions WHERE category LIKE 'Sistem: Auto-Fix%'`);
      } catch(e) {}
      
      res.json(await storage.getTransactions(user!.id)); 
  });
  
  app.post("/api/transactions", async (req, res) => { 
      const user = await getUser(req); 
      const parsed = insertTransactionSchema.safeParse(req.body); 
      if (!parsed.success) return res.status(400).json(parsed.error); 
      
      const tx = await storage.createTransaction(user!.id, { ...parsed.data, userId: user!.id } as any); 
      let newBalance = Math.round(user!.cashBalance); 
      
      const isValas = parsed.data.category?.includes('Valas');

      if (!isValas) {
          if (parsed.data.type === 'income') newBalance += Math.round(parsed.data.amount); 
          else if (parsed.data.type === 'expense') newBalance -= Math.round(parsed.data.amount); 
      }
      
      if (newBalance !== Math.round(user!.cashBalance)) await storage.updateUserBalance(user!.id, newBalance); 
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
          await db.execute(sql`DELETE FROM users WHERE id = ${user.id}`);
          res.json({ success: true, message: "Seluruh data akun berhasil dimusnahkan." });
      } catch (error) { res.status(500).json({ error: "Gagal memusnahkan data akun." }); }
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
          
          const isValas = txToDelete.category?.includes('Valas') || txToDelete.type?.includes('forex') || txToDelete.description?.includes('(Potong Dompet Valas)') || txToDelete.description?.includes('(Masuk ke Dompet Valas)');

          if (!isValas) {
              if (txToDelete.type === 'income') newBalance -= amt;
              else if (txToDelete.type === 'expense') newBalance += amt;
              else if (txToDelete.type === 'debt_borrow') newBalance -= amt;
              else if (txToDelete.type === 'debt_lend') newBalance += amt;
              else if (txToDelete.type === 'debt_receive') newBalance -= amt;
              else if (txToDelete.type === 'debt_pay') newBalance += amt;
          }

          if (txToDelete.type === 'invest_buy' && !isValas) newBalance += amt; 
          else if (txToDelete.type === 'invest_sell' && !isValas) newBalance -= amt; 
          else if (txToDelete.type === 'forex_buy') {
              newBalance += amt;
              try {
                  const desc = txToDelete.description || "";
                  const match = desc.match(/(Beli|Jual)\s+([0-9.]+)\s+([A-Z]{3})/i);
                  if (match) {
                      const qty = parseFloat(match[2]);
                      const curr = match[3].toUpperCase();
                      await db.execute(sql`UPDATE forex_assets SET amount = GREATEST(amount - ${qty}, 0) WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  }
              } catch(e) {}
          }
          else if (txToDelete.type === 'forex_sell') {
              newBalance -= amt; 
              try {
                  const desc = txToDelete.description || "";
                  const match = desc.match(/(Beli|Jual)\s+([0-9.]+)\s+([A-Z]{3})/i);
                  if (match) {
                      const qty = parseFloat(match[2]);
                      const curr = match[3].toUpperCase();
                      await db.execute(sql`UPDATE forex_assets SET amount = amount + ${qty} WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  }
              } catch(e) {}
          }
          
          if (txToDelete.type === 'invest_buy' && isValas) {
              const desc = txToDelete.description || "";
              const match = desc.match(/@\s+([A-Z]{3})\s+([0-9.]+)/i);
              if (match) {
                  const curr = match[1].toUpperCase();
                  const price = parseFloat(match[2]);
                  const qtyMatch = desc.match(/([0-9.]+)\s+unit/i) || desc.match(/([0-9.]+)\s+lot/i);
                  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
                  const valasAmount = qty * price;
                  await db.execute(sql`UPDATE forex_assets SET amount = amount + ${valasAmount} WHERE user_id = ${user!.id} AND currency = ${curr}`);
              }
          }
          else if (txToDelete.type === 'invest_sell' && isValas) {
              const desc = txToDelete.description || "";
              const match = desc.match(/@\s+([A-Z]{3})\s+([0-9.]+)/i);
              if (match) {
                  const curr = match[1].toUpperCase();
                  const price = parseFloat(match[2]);
                  const qtyMatch = desc.match(/([0-9.]+)\s+unit/i) || desc.match(/([0-9.]+)\s+lot/i);
                  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
                  const valasAmount = qty * price;
                  await db.execute(sql`UPDATE forex_assets SET amount = GREATEST(amount - ${valasAmount}, 0) WHERE user_id = ${user!.id} AND currency = ${curr}`);
              }
          }
          
          if (txToDelete.type === 'income' || txToDelete.type === 'expense') {
              const valasMutMatch = (txToDelete.description || "").match(/\[Valas (Masuk|Keluar)\s+([0-9.]+)\s+([A-Z]{3})\]/i);
              if (valasMutMatch) {
                  const isMasuk = valasMutMatch[1].toLowerCase() === 'masuk';
                  const qty = parseFloat(valasMutMatch[2]);
                  const curr = valasMutMatch[3].toUpperCase();
                  if (isMasuk) {
                      await db.execute(sql`UPDATE forex_assets SET amount = GREATEST(amount - ${qty}, 0) WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  } else {
                      await db.execute(sql`UPDATE forex_assets SET amount = amount + ${qty} WHERE user_id = ${user!.id} AND currency = ${curr}`);
                  }
              }
          }

          if (newBalance !== Math.round(user!.cashBalance)) await storage.updateUserBalance(user!.id, newBalance);
          if (typeof storage.deleteTransaction === 'function') await storage.deleteTransaction(txId);
          res.json({ success: true, message: "Transaksi berhasil dimusnahkan dan dikembalikan" });
      } catch (error) { res.status(500).json({ error: "Terjadi kesalahan pada server saat menghapus" }); }
  });

  app.get("/api/forex", async (req, res) => { const user = await getUser(req); res.json(await storage.getForexAssets(user!.id)); });
  
  app.get("/api/forex/rates", async (req, res) => { 
      const now = Date.now();
      const ONE_HOUR = 1000 * 60 * 60;
      if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > ONE_HOUR) await fetchLiveRates(); 
      if (Object.keys(cachedRates).length === 0) cachedRates = { "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1 };
      res.json(cachedRates); 
  });
  
  app.post("/api/forex/transaction", async (req, res) => {
      try {
          const user = await getUser(req);
          const { type, currency, amount, description, rate: customRate } = req.body;
          
          try { await db.execute(sql`ALTER TABLE forex_assets ADD COLUMN IF NOT EXISTS avg_price DOUBLE PRECISION DEFAULT 0;`); } catch(e){}

          const fxRes = await db.execute(sql`SELECT id, amount, avg_price FROM forex_assets WHERE user_id = ${user!.id} AND currency = ${currency}`);
          const fxRows = Array.isArray(fxRes) ? fxRes : (fxRes as any).rows || [];
          const existingFx = fxRows.length > 0 ? fxRows[0] : null;
          
          let currentAmount = existingFx ? parseFloat(existingFx.amount) : 0;
          let currentAvg = existingFx && existingFx.avg_price ? parseFloat(existingFx.avg_price) : 0;
          
          const t = type.toLowerCase();
          const isMutation = (t === 'income' || t === 'expense');
          
          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 
          
          const liveRate = cachedRates[currency as keyof typeof cachedRates] || 15000;
          const actualRate = customRate ? parseFloat(customRate) : liveRate;
          const amountIDR = Math.round(amount * actualRate);
          
          let newCashBalance = Math.round(user!.cashBalance);
          let newAvgPrice = currentAvg;

          if (isMutation) {
              if (t === 'income') {
                  currentAmount += amount;
                  await storage.createTransaction(user!.id, { userId: user!.id, type:'income', amount:amountIDR, category:`Pemasukan Valas`, description:`[Valas Masuk ${amount} ${currency}] ${description || ''}`, date:new Date()} as any);
              } else {
                  currentAmount -= amount;
                  if (currentAmount < 0) currentAmount = 0;
                  await storage.createTransaction(user!.id, { userId: user!.id, type:'expense', amount:amountIDR, category:`Pengeluaran Valas`, description:`[Valas Keluar ${amount} ${currency}] ${description || ''}`, date:new Date()} as any);
              }
          } else {
              if (t === 'forex_buy') {
                  if (newCashBalance < amountIDR) return res.status(400).json({error:"Saldo Rupiah tidak cukup untuk beli Valas."});
                  
                  if (currentAmount + amount > 0) {
                      newAvgPrice = ((currentAmount * currentAvg) + (amount * actualRate)) / (currentAmount + amount);
                  }

                  currentAmount += amount;
                  newCashBalance -= amountIDR;
                  await storage.createTransaction(user!.id, { userId: user!.id, type:'forex_buy', amount:amountIDR, category:'Tukar Valas', description:`Beli ${amount} ${currency} @ Rp ${actualRate.toLocaleString('id-ID')}`, date:new Date()} as any);
              } else if (t === 'forex_sell') {
                  currentAmount -= amount;
                  if (currentAmount < 0) currentAmount = 0;
                  newCashBalance += amountIDR;
                  
                  const pl = Math.round((actualRate - currentAvg) * amount);
                  const plText = currentAvg > 0 ? ` (P/L: ${pl >= 0 ? '+' : ''}Rp ${pl.toLocaleString('id-ID')})` : '';

                  await storage.createTransaction(user!.id, { userId: user!.id, type:'forex_sell', amount:amountIDR, category:'Cairkan Valas', description:`Jual ${amount} ${currency} @ Rp ${actualRate.toLocaleString('id-ID')}${plText}`, date:new Date()} as any);
              }
          }

          await storage.updateUserBalance(user!.id, newCashBalance);
          
          if (existingFx) {
              await db.execute(sql`UPDATE forex_assets SET amount = ${currentAmount}, avg_price = ${newAvgPrice} WHERE id = ${existingFx.id}`);
          } else {
              await db.execute(sql`INSERT INTO forex_assets (user_id, currency, amount, avg_price) VALUES (${user!.id}, ${currency}, ${currentAmount}, ${newAvgPrice})`);
          }
          res.json({ success: true, newBalance: currentAmount });
      } catch (e: any) {
          res.status(500).json({ error: e.message });
      }
  });

  app.get("/api/debts", async (req, res) => { const user = await getUser(req); res.json(await storage.getDebts(user!.id)); });
  
  app.post("/api/debts", async (req, res) => { 
      try {
          const user = await getUser(req); 
          const { type, amount, name, description, isFromTransaction } = req.body;
          const d = await storage.createDebt(user!.id, req.body as any); 
          
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
                  if(type === 'hutang') { newBalance += amountIDR; } 
                  else { newBalance -= amountIDR; }
                  await storage.updateUserBalance(user!.id, newBalance);
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
              await storage.createTransaction(user!.id, { userId: user!.id, type: txType, amount: amountIDR, category: txCat, description: `[${type.toUpperCase()}] ${name} - ${description||''}`, date: new Date() } as any);
          }
          res.json(d); 
      } catch(e:any) { res.status(500).json({error: e.message}); }
  });

  app.post("/api/debts/:id/restore", async (req, res) => {
      try {
          const user = await getUser(req);
          const id = parseInt(req.params.id);

          const debts = await storage.getDebts(user!.id);
          const debt = debts.find(d => d.id === id);

          if (!debt || !debt.isPaid) return res.status(400).json({ error: "Tagihan ini tidak dapat dipulihkan karena belum lunas." });

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

          if (cashOffset !== 0) await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance + cashOffset));

          const hasValasTx = payTxs.some(t => t.category.includes('Valas'));
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

  app.post("/api/debts/:id/pay", async (req, res) => {
      try {
          const user = await getUser(req);
          const id = parseInt(req.params.id);
          const { amount, isWriteOff } = req.body; 
          
          if (!id || isNaN(id)) return res.status(400).json({ error: "ID Tagihan tidak terbaca oleh server." });

          const now = Date.now();
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 

          const debts = await storage.getDebts(user!.id);
          const debt = debts.find(d => d.id === id);
          
          if (!debt) return res.status(404).json({ error: "Tagihan ini sudah tidak ada di database." });
          if (debt.isPaid) return res.status(400).json({ error: "Tagihan ini sudah berstatus lunas sebelumnya." });

          const isIncomePiutang = debt.description?.includes('[PIUTANG_PENDAPATAN]');
          const cairPostfix = isIncomePiutang ? " [Pemasukan Cair]" : "";

          const payAmount = (amount !== undefined && amount > 0) ? Math.min(amount, debt.amount) : debt.amount;
          let newBalance = Math.round(user!.cashBalance);
          
          const curr = (debt.name || "").split('|')[1] || 'IDR';
          const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || 15000);
          const payAmountIDR = Math.round(payAmount * rate); 
          
          if (isWriteOff) {
              const txType = debt.type === 'piutang' ? 'expense' : 'income';
              const txCat = debt.type === 'piutang' ? 'Penghapusan Piutang' : 'Pemutihan Hutang';
              await storage.createTransaction(user!.id, { userId: user!.id, type: txType, amount: payAmountIDR, category: txCat, description: `[WRITE_OFF] ${debt.name}`, date: new Date() } as any);
          } else {
              if (curr === 'IDR') {
                  if (debt.type === 'piutang') { 
                      newBalance += payAmountIDR; 
                      const finalDesc = isIncomePiutang 
                          ? `[PIUTANG_PENDAPATAN] Lunas/Cicilan dari ${debt.name.split('|')[0]}${cairPostfix}`
                          : `Lunas/Cicilan dari ${debt.name.split('|')[0]}`;

                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_receive', amount: payAmountIDR, category: 'Piutang Dibayar', description: finalDesc, date: new Date() } as any); 
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
                      const finalDesc = isIncomePiutang 
                          ? `[PIUTANG_PENDAPATAN] Lunas/Cicilan dari ${debt.name.split('|')[0]} (Masuk ke Dompet Valas)${cairPostfix}`
                          : `Lunas/Cicilan dari ${debt.name.split('|')[0]} (Masuk ke Dompet Valas)`;

                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_receive', amount: payAmountIDR, category: 'Piutang Valas Dibayar', description: finalDesc, date: new Date() } as any); 
                  } else { 
                      currentForexAmount -= payAmount; 
                      if (currentForexAmount < 0) currentForexAmount = 0;
                      await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_pay', amount: payAmountIDR, category: 'Bayar Hutang Valas', description: `Lunas/Cicilan ke ${debt.name.split('|')[0]} (Potong dari Dompet Valas)`, date: new Date() } as any); 
                  }

                  if (existingForex) await storage.updateForexAsset(existingForex.id, currentForexAmount);
                  else if (currentForexAmount > 0) await storage.createForexAsset(user!.id, { currency: curr, amount: currentForexAmount } as any);
              }
          }
          
          const remaining = debt.amount - payAmount;
          if (remaining > 0) {
              await storage.createDebt(user!.id, { userId: user!.id, type: debt.type, name: debt.name, amount: remaining, dueDate: (debt as any).dueDate || null, description: (debt.description || '') + ` (Sisa dari ${debt.amount})` } as any);
          }
          
          await storage.markDebtPaid(id); 
          res.json({ success: true });

      } catch (error: any) { res.status(500).json({ error: error.message || "Gagal memproses ke database." }); }
  });

  app.delete("/api/debts/:id", async (req, res) => { await storage.deleteDebt(parseInt(req.params.id)); res.json({success:true}); });

  app.get("/api/target", async (req, res) => { const user = await getUser(req); res.json(await storage.getTarget(user!.id) || {}); });
  
  app.patch("/api/target/penalty", async (req, res) => { 
      const user = await getUser(req); 
      try { await storage.updateTargetPenalty(user!.id, Math.round(req.body.amount)); res.json({success:true}); } 
      catch(e) { res.status(500).send("Error"); } 
  });
  
  app.post("/api/target", async (req, res) => { 
      const user = await getUser(req); 
      const { addCurrentCash, initialForexList, initialDebts, initialReceivables, initialInvestments, ...targetData } = req.body; 
      const target = await storage.setTarget(user!.id, targetData as any); 
      const promises = [];
      
      if (addCurrentCash !== undefined && addCurrentCash > 0) promises.push(storage.updateUserBalance(user!.id, Math.round(addCurrentCash))); 
      
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
      await Promise.all(promises);
      res.json(target); 
  });
  
  app.get("/api/investments", async (req, res) => { const user = await getUser(req); res.json(await storage.getInvestments(user!.id)); });

  app.post("/api/investments/buy", async (req, res) => { 
      try {
          const user = await getUser(req); 
          const { symbol, quantity, price, type } = req.body; 
          const [sym, curr] = symbol.split('|');
          const actualCurr = curr || 'IDR';
          const typeLower = (type || 'saham').toLowerCase();
          const isSaham = typeLower === 'saham' || (sym.length === 4 && typeLower !== 'crypto');
          const m = (isSaham && actualCurr === 'IDR') ? 100 : 1; 
          
          const valasCost = quantity * price * m; 
          
          if (actualCurr === 'IDR') {
              const total = Math.round(valasCost);
              if(user!.cashBalance < total) return res.status(400).json({message:"Saldo Rupiah tidak cukup untuk pembelian ini."}); 
              await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance - total)); 
              await storage.createTransaction(user!.id, {userId: user!.id, type:'invest_buy', amount:total, category:'Beli Aset', description:`${quantity} lot/unit ${symbol} @ Rp ${price.toLocaleString('id-ID')}`, date:new Date()} as any); 
          } else {
              const existingForex = await storage.getForexByCurrency(user!.id, actualCurr);
              if (!existingForex || existingForex.amount < valasCost) return res.status(400).json({message:`Saldo Dompet Valas (${actualCurr}) tidak cukup. Anda hanya memiliki ${existingForex?.amount || 0} ${actualCurr}.`});
              
              await storage.updateForexAsset(existingForex.id, existingForex.amount - valasCost);
              
              const now = Date.now();
              if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 
              const rate = cachedRates[actualCurr] || 15000;
              const totalIDR = Math.round(valasCost * rate);

              await storage.createTransaction(user!.id, {userId: user!.id, type:'invest_buy', amount:totalIDR, category:'Beli Aset Valas', description:`${quantity} unit ${symbol} @ ${actualCurr} ${price} (Potong Dompet Valas)`, date:new Date()} as any); 
          }

          await storage.createInvestment(user!.id, {userId: user!.id, symbol: symbol.toUpperCase(), quantity, avgPrice:price, type: typeLower} as any); 
          res.json({success:true}); 
      } catch (error: any) { res.status(500).json({ message: "Terjadi kesalahan internal pada server saat menyimpan aset." }); }
  });

  app.post("/api/investments/sell", async (req, res) => { 
      try {
          const user = await getUser(req); 
          const { symbol, quantity, price, type } = req.body; 
          const [sym, curr] = symbol.split('|');
          const actualCurr = curr || 'IDR';
          const typeLower = (type || 'saham').toLowerCase(); 
          const isSaham = typeLower === 'saham' || (sym.length === 4 && typeLower !== 'crypto');
          const m = (isSaham && actualCurr === 'IDR') ? 100 : 1; 
          
          const valasRevenue = quantity * price * m; 
          
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

          const pl = valasRevenue - totalBuyPrice;

          if (actualCurr === 'IDR') {
              const totalSellPriceIDR = Math.round(valasRevenue);
              const plIDR = Math.round(pl);
              const profitLossText = ` (P/L: ${plIDR >= 0 ? '+' : ''}Rp ${plIDR.toLocaleString('id-ID')})`;

              await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance + totalSellPriceIDR)); 
              await storage.createTransaction(user!.id, {userId: user!.id, type:'invest_sell', amount:totalSellPriceIDR, category:'Jual Aset', description:`${quantity} lot/unit ${symbol} @ Rp ${price.toLocaleString('id-ID')}${profitLossText}`, date:new Date()} as any); 
          } else {
              const existingForex = await storage.getForexByCurrency(user!.id, actualCurr);
              if (existingForex) {
                  await storage.updateForexAsset(existingForex.id, existingForex.amount + valasRevenue);
              } else {
                  await storage.createForexAsset(user!.id, { currency: actualCurr, amount: valasRevenue } as any);
              }

              const now = Date.now();
              if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 
              const rate = cachedRates[actualCurr] || 15000;
              const totalSellPriceIDR = Math.round(valasRevenue * rate);
              const plIDR = Math.round(pl * rate);
              const profitLossText = ` (P/L: ${plIDR >= 0 ? '+' : ''}Rp ${plIDR.toLocaleString('id-ID')})`;

              await storage.createTransaction(user!.id, {userId: user!.id, type:'invest_sell', amount:totalSellPriceIDR, category:'Jual Aset Valas', description:`${quantity} unit ${symbol} @ ${actualCurr} ${price} (Masuk ke Dompet Valas)${profitLossText}`, date:new Date()} as any); 
          }

          res.json({success:true}); 
      } catch (error: any) { res.status(500).json({ message: "Terjadi kesalahan internal pada server saat menjual aset." }); }
  });

  app.get("/api/reports/data", async (req, res) => { 
      const user = await getUser(req); 
      const [tx, inv, debt, fx, sub] = await Promise.all([ storage.getTransactions(user!.id), storage.getInvestments(user!.id), storage.getDebts(user!.id), storage.getForexAssets(user!.id), storage.getSubscriptions(user!.id) ]); 
      
      await ensureRetainedTable();
      const retRes = await db.execute(sql`SELECT * FROM retained_balances WHERE user_id = ${user!.id}`);
      const retRows = Array.isArray(retRes) ? retRes : (retRes as any).rows || [];
      const retained = retRows.map((r:any) => ({ id: r.id, source: r.source, amount: r.amount, currency: r.currency }));

      res.json({ user, transactions: tx, investments: inv, debts: debt, forexAssets: fx, subscriptions: sub, retained }); 
  });
  
  app.get("/api/categories", async (req, res) => { const user = await getUser(req); res.json(await storage.getCategories(user!.id)); });
  app.post("/api/categories", async (req, res) => { const user = await getUser(req); await storage.createCategory({ ...req.body, userId: user!.id } as any); res.json({success:true}); });
  app.delete("/api/categories/:id", async (req, res) => { await storage.deleteCategory(parseInt(req.params.id)); res.json({success:true}); });

  app.get("/api/subscriptions", async (req, res) => { const user = await getUser(req); res.json(await storage.getSubscriptions(user!.id)); });
  app.post("/api/subscriptions", async (req, res) => { const user = await getUser(req); const sub = await storage.createSubscription(user!.id, req.body as any); res.json(sub); });
  app.patch("/api/subscriptions/:id/status", async (req, res) => { const { isActive } = req.body; await storage.updateSubscriptionStatus(parseInt(req.params.id), isActive); res.json({ success: true }); });
  app.delete("/api/subscriptions/:id", async (req, res) => { await storage.deleteSubscription(parseInt(req.params.id)); res.json({ success: true }); });

  app.get("/api/user", async (req, res) => { const user = await getUser(req); res.json(user); });
  app.patch("/api/user/profile", async (req, res) => { const user = await getUser(req); await storage.updateUserProfile(user!.id, req.body.firstName, req.body.lastName, req.body.profilePicture); res.json({success:true}); });
  
  app.get("/api/admin/users", async (req, res) => {
      const email = req.headers["x-user-email"] as string;
      if (!isAdminValid(email)) return res.status(403).json({ error: "Akses Ditolak. Anda bukan admin." });
      try { const allUsers = await db.select().from(users).orderBy(desc(users.createdAt)); res.json(allUsers); } 
      catch (e) { res.status(500).json({ error: "Gagal memuat data pengguna dari database." }); }
  });

  app.patch("/api/admin/users/:id/pro", async (req, res) => {
      const emailAdmin = req.headers["x-user-email"] as string;
      if (!isAdminValid(emailAdmin)) return res.status(403).json({ error: "Akses Ditolak." });
      try {
          const userId = parseInt(req.params.id);
          const { isPro } = req.body;
          const validUntil = isPro ? new Date("2099-12-31") : null; 
          await storage.updateUserProStatus(userId, isPro, validUntil);
          res.json({ success: true, message: "Status PRO berhasil diperbarui." });
      } catch (e) { res.status(500).json({ error: "Gagal memperbarui status pengguna." }); }
  });

  app.post("/api/payment/mayar/charge", async (req, res) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "Sesi tidak valid." });

          const mayarKey = (process.env.MAYAR_API_KEY || "").replace(/['"]/g, "").trim();
          if (!mayarKey) return res.status(400).json({ error: "MAYAR_API_KEY belum terpasang di Vercel!" });

          const { plan } = req.body; 
          const isMonthly = plan === 'monthly';
          const price = isMonthly ? 14900 : 99000;
          const planName = isMonthly ? "BILANO PRO (1 Bulan)" : "BILANO PRO (1 Tahun)";

          const appUrl = req.headers.origin || "https://bilanofinance-dvbi.vercel.app";

          const payload = {
              name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "Member BILANO",
              email: user.email || "member@bilano.app",
              mobile: "080000000000",
              description: `Berlangganan ${planName}`,
              amount: price,
              redirectUrl: `${appUrl}/`,
              expiredAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              items: [
                  {
                      name: planName,
                      description: `Akses fitur eksklusif ${planName}`, 
                      quantity: 1,
                      price: price,
                      rate: price, 
                      amount: price
                  }
              ]
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
              console.log("Response Mayar Gagal:", textData);
              return res.status(400).json({ error: `MAYAR ERROR [${mayarRes.status}]: ${textData}` });
          }

          try {
              const data = JSON.parse(textData);
              const redirectUrl = data.data?.link || data.link;
              if (redirectUrl) return res.json({ success: true, redirectUrl });
              else return res.status(400).json({ error: "Mayar sukses tapi link pembayaran tidak ditemukan." });
          } catch (parseErr) { return res.status(500).json({ error: "Gagal memproses balasan dari Mayar." }); }
      } catch (error: any) { res.status(500).json({ error: "SERVER CRASH: " + error.message }); }
  });

  // =========================================================================
  // 🚀 ENDPOINT UNTUK FUNNEL & TRACKING
  // =========================================================================

  app.post("/api/track", async (req, res) => {
    try {
        const { event, session_id, user_id, ig_user, utm_source, utm_medium, properties } = req.body;
        if (!session_id || !event) return res.status(400).json({ error: "Missing payload" });

        // 1. Simpan session jika belum ada (Upsert)
        await db.execute(sql`
            INSERT INTO tracking_sessions (session_id, ig_user, utm_source, utm_medium, user_agent, created_at)
            VALUES (${session_id}, ${ig_user}, ${utm_source}, ${utm_medium}, ${req.headers['user-agent']}, NOW())
            ON CONFLICT (session_id) DO NOTHING
        `);

        // 2. Jika akun dibuat, hubungkan identitas
        if (event === 'account_created' && user_id) {
            await db.execute(sql`
                INSERT INTO user_identities (user_id, session_id, ig_user, linked_at)
                VALUES (${user_id}, ${session_id}, ${ig_user}, NOW())
                ON CONFLICT (user_id) DO NOTHING
            `);
        }

        // 3. Jika ini transaksi pertama (Aha Moment), update trial_started_at di user
        if (event === 'first_transaction' && user_id) {
            await db.execute(sql`
                UPDATE users SET trial_started_at = NOW() 
                WHERE id = ${user_id} AND trial_started_at IS NULL
            `);
        }

        // 4. Catat event ke funnel log
        await db.execute(sql`
            INSERT INTO funnel_events (session_id, user_id, ig_user, event_name, properties, created_at)
            VALUES (${session_id}, ${user_id || null}, ${ig_user}, ${event}, ${JSON.stringify(properties || {})}, NOW())
        `);

        res.status(200).json({ ok: true });
    } catch (e) {
        console.error("Tracking Error:", e);
        res.status(500).json({ ok: false }); // Fire & Forget
    }
  });

  app.get("/api/funnel/overview", async (req, res) => {
    const email = req.headers["x-user-email"] as string;
    if (!isAdminValid(email)) return res.status(403).json({ error: "Akses Ditolak." });

    try {
        // Query Funnel Raw SQL
        const result = await db.execute(sql`
            WITH funnel_counts AS (
              SELECT
                COUNT(CASE WHEN event_name = 'landing_visit' THEN 1 END) as landing,
                COUNT(CASE WHEN event_name = 'pwa_installed' THEN 1 END) as installed,
                COUNT(CASE WHEN event_name = 'account_created' THEN 1 END) as registered,
                COUNT(CASE WHEN event_name = 'first_transaction' THEN 1 END) as aha,
                COUNT(CASE WHEN event_name = 'subscription_started' THEN 1 END) as paid
              FROM funnel_events
            )
            SELECT
              landing, installed, registered, aha, paid,
              (installed::FLOAT / NULLIF(landing, 0)) as landing_to_install,
              (registered::FLOAT / NULLIF(installed, 0)) as install_to_register,
              (aha::FLOAT / NULLIF(registered, 0)) as register_to_aha,
              (paid::FLOAT / NULLIF(aha, 0)) as aha_to_paid
            FROM funnel_counts;
        `);

        const rows = Array.isArray(result) ? result : (result as any).rows || [];
        const data = rows[0] || {};

        res.json({
            acquisition_rate: data.landing_to_install || 0,
            activation_rate: data.register_to_aha || 0, // Hitung dari register ke aha
            dropoff_breakdown: {
                landing_to_install: data.landing_to_install || 0,
                install_to_register: data.install_to_register || 0,
                register_to_aha: data.register_to_aha || 0,
                aha_to_paid: data.aha_to_paid || 0
            }
        });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/funnel/followup-triggers", async (req, res) => {
    const email = req.headers["x-user-email"] as string;
    if (!isAdminValid(email)) return res.status(403).json({ error: "Akses Ditolak." });

    try {
        const result = await db.execute(sql`
            SELECT 
              session_id, 
              MAX(ig_user) as ig_user,
              MAX(created_at) as last_event_at, 
              'registered_not_activated' as condition
            FROM funnel_events
            GROUP BY session_id
            HAVING
              SUM(CASE WHEN event_name = 'account_created' THEN 1 ELSE 0 END) > 0
              AND SUM(CASE WHEN event_name = 'first_transaction' THEN 1 ELSE 0 END) = 0
              AND MAX(created_at) < NOW() - INTERVAL '72 hours'
        `);

        const rows = Array.isArray(result) ? result : (result as any).rows || [];
        res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/payment/mayar/webhook", async (req, res) => {
      try {
          const payload = req.body || {}; 
          const status = String(payload?.status || payload?.data?.status || "").toUpperCase();
          
          const amt = payload?.data?.amount || payload?.amount;
          const purchasedPlan = amt == 99000 ? "BILANO-PRO-1Y" : "BILANO-PRO-1M";
          
          const customerEmail = String(payload?.customer_email || payload?.data?.customer_email || payload?.customer?.email || payload?.data?.customer?.email || payload?.email || payload?.data?.email || "");

          if (status === 'SUCCESS' || status === 'PAID' || status === 'SETTLED') {
              let targetUser = null;
              if (customerEmail) {
                  targetUser = await storage.getUserByUsername(customerEmail);
                  if (!targetUser) targetUser = await storage.getUserByUsername(customerEmail.toLowerCase());
              }
              
              if (targetUser) {
                  const validUntil = new Date();
                  if (purchasedPlan === "BILANO-PRO-1M") validUntil.setMonth(validUntil.getMonth() + 1);
                  else validUntil.setFullYear(validUntil.getFullYear() + 1);
                  await storage.updateUserProStatus(targetUser.id, true, validUntil);
              }
          }
          res.status(200).json({ success: true });
      } catch (error) { res.status(200).json({ success: false, message: "Handled" }); }
  });

  app.post("/api/help/submit", async (req, res) => {
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

  app.get("/api/admin/help", async (req, res) => {
      const email = req.headers["x-user-email"] as string;
      if (!isAdminValid(email)) return res.status(403).json({ error: "Penyusup Ditolak" });
      try { const result = await db.execute(sql`SELECT * FROM help_tickets ORDER BY date DESC`); const rows = Array.isArray(result) ? result : (result as any).rows || []; res.json(rows); } catch (e) { res.json([]); }
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
                      <div style="font-size: 14px; color: #1f2937; line-height: 1.6; margin-top: 20px;">${replyMessage.replace(/\n/g, '<br/>')}</div>
                      <hr style="border:none; border-top: 1px dashed #e5e7eb; margin: 30px 0;" />
                      <p style="font-size: 11px; color: #9ca3af; text-align: center;">Pesan ini dikirim otomatis oleh sistem pusat bantuan BILANO. Jika ada pertanyaan, buat tiket baru di aplikasi.</p>
                    </div>
                  `
              });
          }
          try { await db.execute(sql`DELETE FROM help_tickets WHERE id = ${ticketId}`); } catch(e) {}
          res.json({ success: true });
      } catch (error) { res.status(500).json({ error: "Gagal mengirimkan email balasan." }); }
  });

  app.post("/api/admin/silent-correction", async (req, res) => {
      try {
          const user = await getUser(req);
          const { deductAmount } = req.body; 
          let newBalance = Math.round(user!.cashBalance - deductAmount);
          await storage.updateUserBalance(user!.id, newBalance);
          res.json({ success: true, message: "Operasi senyap berhasil. Saldo telah dikoreksi tanpa jejak." });
      } catch(e:any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/vision/scan", async (req, res) => {
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

          const systemPrompt = `Kamu adalah Asisten Finansial BILANO yang cerdas. Tugasmu membaca struk belanja. Cari TOTAL akhir. Output WAJIB JSON MURNI: {"totalAmount": 150000, "currency": "IDR", "category": "Makan/Minum", "description": "Makan di Resto A"}`;

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
          res.json({ success: true, data: parsedResult });
      } catch (error: any) { res.status(500).json({ error: error.message || "Gagal memproses gambar." }); }
  });

  const httpServer = createServer(app);
  return httpServer;
}