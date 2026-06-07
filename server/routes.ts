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

  app.get("/api/ping", async (req, res) => {
      try {
          await db.execute(sql`SELECT 1`);
          res.status(200).json({ status: "awake & db connected", time: new Date().toISOString() });
      } catch (error) { res.status(200).json({ status: "awake but db delayed", message: "It's fine" }); }
  });

  // 🚀 FIX: FUNGSI GET USER DENGAN PERLINDUNGAN RACE CONDITION (MENCEGAH CRASH SAAT SIGNUP)
  const getUser = async (req: any) => {
    const email = req.headers["x-user-email"];
    
    if (!email || email === "guest") {
        let user = await storage.getUser(1);
        if (!user) user = await storage.createUser({ username: "guest", password: "123", email: "guest@bilano.app" });
        return user;
    }

    let user = await storage.getUserByUsername(email as string);
    if (!user) {
        try { 
            // 🛡️ ON CONFLICT DO NOTHING mencegah server Vercel crash bila ditembak 5 request bersamaan!
            await db.execute(sql`INSERT INTO users (username, email, password, cash_balance, is_pro, created_at) VALUES (${email as string}, ${email as string}, '123', 0, false, NOW()) ON CONFLICT (username) DO NOTHING`);
            user = await storage.getUserByUsername(email as string);
        } catch (err) { 
            user = await storage.getUserByUsername(email as string); 
        }
    }

    if (!user) return null;

    const vipEmails = ["adrienfandra14@gmail.com", "bilanotech@gmail.com"];
    if (vipEmails.includes(user.email || "")) {
        user.isPro = true;
        user.proValidUntil = new Date("2099-12-31").toISOString() as any; 
        return user; 
    }

    if (user.isPro && user.proValidUntil) {
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

      // 🚀 PENAMBAHAN KEMAMPUAN "MEMORY BRIDGE" UNTUK CHAT AI
      const systemPrompt = `
      Kamu adalah BILA (BILANO Intelligence).
      PERATURAN SIKAP & LOGIKA KEUANGAN (MUTLAK):
      1. INGAT KONTEKS: Kamu menerima riwayat percakapan. Jika pengguna bertanya hal lanjutan, jawablah menyambung dengan topik sebelumnya tanpa kebingungan.
      2. MENTOR PROAKTIF: Jadilah mentor yang peduli dan cerdas. SETIAP KALI selesai memberikan jawaban/analisis, kamu WAJIB mengakhirinya dengan sebuah pertanyaan penawaran bantuan.
      3. HUKUM AKUNTANSI BILANO: 
         - Menghapus/Ikhlas Piutang (Write-off) TIDAK mengurangi Kas likuid, hanya mengurangi Kekayaan Bersih (Net Worth).
         - Amal/Sedekah dianggap pengeluaran positif, tidak digabungkan dengan limit budget konsumtif.
      4. PEMISAHAN WAKTU: Perhatikan pertanyaan pengguna! Jika bertanya "bulan ini", gunakan data [BULAN INI]. Jika bertanya secara utuh, gunakan data [KESELURUHAN].
      5. INTEGRASI STRATEGI: Jika pengguna merujuk pada "strategi tadi", "hasil analisa", "peluang bisnis", atau ide bisnis yang baru saja diberikan, asumsikan mereka baru saja membaca Pop-up Strategi AI di Dashboard. Lanjutkan diskusi dengan tajam untuk membedah strategi tersebut. JANGAN BERASUMSI liar jika kamu tidak tau jenis usaha/sumber pendapatan mereka yang spesifik, tanyakan langsung faktanya dengan jujur.
      
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

  app.get("/api/transactions", async (req, res) => { const user = await getUser(req); res.json(await storage.getTransactions(user!.id)); });
  
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
      const user = await getUser(req);
      const { type, currency, amount, description } = req.body;
      const existing = await storage.getForexByCurrency(user!.id, currency);
      let currentAmount = existing ? existing.amount : 0;
      
      const t = type.toLowerCase();
      const isIncome = t === 'income' || t === 'pemasukan' || t === 'tambah' || t === 'buy' || t === 'in' || t === 'dapat';
      
      const now = Date.now();
      if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 600000) await fetchLiveRates(); 
      
      const rate = cachedRates[currency as keyof typeof cachedRates] || 15000;
      const amountIDR = Math.round(amount * rate);
      let newCashBalance = Math.round(user!.cashBalance);

      if (description) {
          if (isIncome) {
              currentAmount += amount;
              await storage.createTransaction(user!.id, { userId: user!.id, type:'income', amount:amountIDR, category:`Pemasukan Valas`, description:`${description}`, date:new Date()} as any);
          } else {
              currentAmount -= amount;
              if (currentAmount < 0) currentAmount = 0;
              await storage.createTransaction(user!.id, { userId: user!.id, type:'expense', amount:amountIDR, category:`Pengeluaran Valas`, description:`${description}`, date:new Date()} as any);
          }
      } else {
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
      }

      await storage.updateUserBalance(user!.id, newCashBalance);
      if (existing) await storage.updateForexAsset(existing.id, currentAmount);
      else await storage.createForexAsset(user!.id, { currency, amount: currentAmount } as any);
      res.json({ success: true, newBalance: currentAmount });
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
          const typeLower = (type || 'saham').toLowerCase();
          const m = (typeLower==='saham'||(symbol.length===4&&typeLower!=='crypto'))?100:1; 
          const total = Math.round(quantity*price*m); 
          
          if(user!.cashBalance < total) return res.status(400).json({message:"Saldo Rupiah tidak cukup untuk pembelian ini."}); 
          await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance - total)); 
          await storage.createTransaction(user!.id, {userId: user!.id, type:'invest_buy', amount:total, category:'Beli Aset', description:`${quantity} lot/unit ${symbol} @ Rp ${price.toLocaleString('id-ID')}`, date:new Date()} as any); 
          await storage.createInvestment(user!.id, {userId: user!.id, symbol: symbol.toUpperCase(), quantity, avgPrice:price, type: typeLower} as any); 
          res.json({success:true}); 
      } catch (error: any) { res.status(500).json({ message: "Terjadi kesalahan internal pada server saat menyimpan aset." }); }
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

  // 🚀 ENDPOINT BARU: AI STRATEGI PENGHASILAN DENGAN OTAK "BILA" (V2 - BRUTAL & AKURAT)
  app.post("/api/ai/strategy", async (req, res) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

          const [txList, target, investments, debts, forexAssets, subscriptions] = await Promise.all([
              storage.getTransactions(user.id),
              storage.getTarget(user.id),
              storage.getInvestments(user.id),
              storage.getDebts(user.id),
              storage.getForexAssets(user.id),
              storage.getSubscriptions(user.id)
          ]);

          const monthlyHistory: Record<string, { income: number, expense: number }> = {};
          txList.forEach(t => {
              const d = new Date(t.date);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              if (!monthlyHistory[key]) monthlyHistory[key] = { income: 0, expense: 0 };
              if (t.type === 'income') monthlyHistory[key].income += t.amount;
              if (t.type === 'expense') monthlyHistory[key].expense += t.amount;
          });
          const historyArray = Object.entries(monthlyHistory)
              .map(([month, data]) => ({ month, incomeFormatted: `Rp ${data.income.toLocaleString('id-ID')}`, expenseFormatted: `Rp ${data.expense.toLocaleString('id-ID')}` }))
              .sort((a, b) => b.month.localeCompare(a.month))
              .slice(0, 6); 

          const expCategories = txList.filter(t => t.type === 'expense').reduce((acc, t) => {
              acc[t.category] = (acc[t.category] || 0) + t.amount; return acc;
          }, {} as Record<string, number>);
          const topExpCategories = Object.entries(expCategories).sort((a,b) => b[1]-a[1]).slice(0,5).map(x => ({category: x[0], total: `Rp ${x[1].toLocaleString('id-ID')}`}));

          const incomeCategories = txList.filter(t => t.type === 'income').reduce((acc, t) => {
              acc[t.category] = (acc[t.category] || 0) + t.amount; return acc;
          }, {} as Record<string, number>);
          const topIncomeCategories = Object.entries(incomeCategories).sort((a,b) => b[1]-a[1]).slice(0,3).map(x => ({category: x[0], total: `Rp ${x[1].toLocaleString('id-ID')}`}));

          const recentTransactions = txList
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 100)
              .map(t => ({ date: t.date.toISOString().split('T')[0], type: t.type, amount: `Rp ${t.amount.toLocaleString('id-ID')}`, category: t.category, desc: t.description }));

          const financialData = {
              profile: { cashBalance: `Rp ${user.cashBalance.toLocaleString('id-ID')}`, monthlyBudget: `Rp ${target?.monthlyBudget || 0}` },
              monthlyHistory: historyArray,
              incomeAnalysis: { topSources: topIncomeCategories },
              expenseAnalysis: { topCategories: topExpCategories },
              assets: { investmentTotal: investments.length, forexTotal: forexAssets.length, debts: debts.length, activeSubscriptions: subscriptions.length },
              recentTransactions: recentTransactions
          };

          const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
          if (!apiKey) throw new Error("API Key Gemini belum diatur di Vercel/Server");

          const systemPrompt = `Kamu adalah BILA — Bilano Intelligence for Life & Assets.
Kamu BUKAN asisten keuangan generik. Kamu adalah ahli strategi berbasis data yang tajam, dan berpikir seperti gabungan dari CFO berpengalaman, Pendiri Startup, dan Ekonom Perilaku.

TUGASMU:
Analisa data finansial (JSON) pengguna di bawah ini. Hasilkan 2 strategi penghasilan tambahan / optimalisasi aset yang SANGAT SPESIFIK dan BISA DIEKSEKUSI.

PERATURAN MUTLAK (JIKA DILANGGAR KAMU GAGAL):
1. BACA ANGKA DENGAN BENAR & TELITI: Perhatikan format "Rp X.XXX.XXX". 2.000.000 adalah 2 Juta, bukan 200 Ribu. Sebutkan angka dengan benar dalam saranmu!
2. ANTI ASUMSI LIAR: JANGAN PERNAH menebak-nebak sumber uang atau pekerjaan user jika tidak tertulis eksplisit. Dilarang menggunakan kata "kemungkinan besar adalah...", "sepertinya...", "mungkin...". Jika kamu tidak tahu profesi aslinya, sebutkan secara logis "Berdasarkan arus kas dari kategori [Nama Kategori]...", dan wajib diakhiri dengan: "Mari kita diskusikan lebih detail tentang konteks sebenarnya di Chat AI."
3. LARANGAN KORELASI DANGKAL: JANGAN menyarankan pengguna berjualan barang yang sering mereka konsumsi! (Contoh BURUK: Sering beli Es Teler disuruh jualan Es Teler). Cari peluang dari Pemasukan, Aset Menganggur, atau Skill, bukan dari jajanan/konsumsi pribadi!
4. PERHATIKAN FLUKTUASI PENDAPATAN: Jika pemasukan naik-turun, fokus pada "Income Smoothing" atau menstabilkan arus kas.
5. BERIKAN KEBENARAN PAHIT terlebih dahulu sebelum solusi.

DATA PENGGUNA:
${JSON.stringify(financialData, null, 2)}

OUTPUT WAJIB JSON ARRAY MURNI dengan struktur persis seperti ini (TIDAK BOLEH ADA MARKDOWN \`\`\`json ATAU \`\`\`):
[
  {
    "title": "📊 Pembacaan Profil Finansialmu",
    "description": "[2-3 kalimat observasi tajam dari data. Tanpa asumsi profesi. Sebutkan angka fluktuasi jika ada]"
  },
  {
    "title": "⚠️ Yang Data Ini Benar-Benar Katakan",
    "description": "[1 kebenaran pahit yang mungkin dihindari user. Langsung pada intinya]"
  },
  {
    "title": "🎯 STRATEGI 1: [Nama Spesifik & Logis]",
    "description": "INSIGHT:\\n[pola spesifik dari data]\\n\\nPELUANG:\\n[peluang logis tanpa asumsi dangkal]\\n\\nCARA KERJANYA:\\n1. [step 1]\\n2. [step 2]\\n\\nMODAL DIBUTUHKAN:\\nRp [nominal rasional dari saldo mereka]\\n\\nPROYEKSI REALISTIS:\\n[proyeksi keuntungan]\\n\\n💡 DISKUSI: Ingin membedah strategi ini lebih dalam? Mari kita diskusikan detailnya di menu Chat AI!"
  },
  {
    "title": "🎯 STRATEGI 2: [Nama Spesifik & Logis]",
    "description": "[Format sama seperti strategi 1]"
  },
  {
    "title": "⚡ Langkah Pertama Besok",
    "description": "[Satu tindakan spesifik yang bisa dilakukan dalam 2 jam]"
  }
]
PASTIKAN OUTPUT HANYA JSON ARRAY MURNI.`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: "POST", 
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: "Lakukan analisa sekarang." }] }],
                  system_instruction: { parts: [{ text: systemPrompt }] },
                  generationConfig: { temperature: 0.7, response_mime_type: "application/json" }
              })
          });

          if (!response.ok) throw new Error("Gagal menghubungi Google AI. Server menolak API Key.");

          const aiData = await response.json();
          const resultText = aiData.candidates[0].content.parts[0].text;

          let parsedResult;
          try { parsedResult = JSON.parse(resultText); }
          catch(e) { parsedResult = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim()); }

          res.json({ success: true, data: parsedResult });
      } catch (error: any) {
          console.error("AI Strategy Error:", error);
          res.status(500).json({ success: false, error: error.message });
      }
  });

  const httpServer = createServer(app);
  return httpServer;
}