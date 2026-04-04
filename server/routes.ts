import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertTransactionSchema, insertTargetSchema } from "../shared/schema.js";
import { z } from "zod";
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import admin from "firebase-admin"; 

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
// 🚀 AI GEMINI INTEGRATION
// ====================================================================
async function askSmartAI(systemPrompt: string, userMessage: string) {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
        
        if (!apiKey || apiKey.includes("KUNCI_SUDAH_DIAMANKAN")) {
            return "⚠️ API Key Gemini belum terpasang dengan benar di .env atau Vercel.";
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] }, 
                contents: [{ role: "user", parts: [{ text: userMessage }] }]
            })
        });

        if (!response.ok) {
            const errData = await response.text();
            return `⚠️ Koneksi ditolak Google. Alasan: ${errData.substring(0, 150)}...`; 
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
             return "⚠️ Pesan ditahan oleh filter keamanan Google. Coba tanyakan dengan bahasa lain.";
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (error: any) {
        return "⚠️ Maaf Bos, sistem Asisten AI sedang sangat sibuk. Silakan coba lagi nanti ya! 🙏";
    }
}

export async function registerRoutes(app: Express): Promise<Server> {

  try { await db.execute(sql`ALTER TABLE users ADD COLUMN onesignal_id TEXT;`); } catch (e) { }
  try { await db.execute(sql`ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();`); } catch (e) {}
  
  try { 
      await db.execute(sql`CREATE TABLE IF NOT EXISTS help_tickets (
          id VARCHAR(255) PRIMARY KEY, 
          user_id INTEGER, 
          email TEXT, 
          name TEXT, 
          subject TEXT, 
          message TEXT, 
          status TEXT, 
          date TIMESTAMP DEFAULT NOW()
      );`); 
  } catch (e) { console.error("Info: Tabel tiket sudah ada."); }

  let cachedRates: Record<string, number> = {
      "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
      "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
  }; 
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

  try {
      await db.execute(sql`
          CREATE TABLE IF NOT EXISTS otp_sessions (
              email VARCHAR(255) PRIMARY KEY,
              code VARCHAR(10),
              created_at TIMESTAMP DEFAULT NOW()
          )
      `);
  } catch (e) {
      console.error("Gagal memastikan tabel OTP:", e);
  }

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

          const resendKey = process.env.RESEND_API_KEY;
          if (!resendKey) return res.status(500).json({ error: "API Key Resend belum dipasang di Vercel." });

          const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${resendKey}`
              },
              body: JSON.stringify({
                  from: "BILANO OTP <onboarding@resend.dev>",
                  to: [email],
                  subject: "Kode Verifikasi BILANO",
                  html: htmlContent
              })
          });

          if (!emailRes.ok) throw new Error("Resend API Error");

          res.json({ success: true, message: "OTP Terkirim Cepat!" }); 
      } catch (error) {
          res.status(500).json({ error: "Gagal mengirim OTP. Pastikan email terdaftar di Resend." });
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

          const htmlContent = `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;"><h2 style="color: #e11d48;">Reset Password Anda</h2><p style="color: #4b5563;">Gunakan kode OTP rahasia berikut untuk membuat password baru Anda.</p><h1 style="background: #f3f4f6; padding: 15px; letter-spacing: 8px; color: #1f2937; border-radius: 8px;">${otp}</h1></div>`;

          const resendKey = process.env.RESEND_API_KEY;
          if (!resendKey) return res.status(500).json({ error: "API Key Resend belum dipasang." });

          const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${resendKey}`
              },
              body: JSON.stringify({
                  from: "BILANO Security <onboarding@resend.dev>",
                  to: [email],
                  subject: "Reset Password BILANO",
                  html: htmlContent
              })
          });

          if (!emailRes.ok) throw new Error("Gagal Kirim Resend");

          res.json({ success: true, message: "OTP Reset Terkirim" }); 
      } catch (error) {
          res.status(500).json({ error: "Gagal mengirim email OTP." });
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
        user = await storage.createUser({ username: email as string, password: "123", email: email as string });
    }

    const vipEmails = [
        "adrienfandra14@gmail.com",
        "bilanotech@gmail.com", 
    ];

    if (vipEmails.includes(user.email || "")) {
        user.isPro = true;
        user.proValidUntil = new Date("2099-12-31").toISOString() as any; 
        return user; 
    }

    if (user.isPro && user.proValidUntil) {
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
      const sisaBudget = target && target.monthlyBudget > 0 ? `Rp ${target.monthlyBudget.toLocaleString('id-ID')}` : "Tidak dibatasi";

      const activeDebts = debts.filter(d => !d.isPaid);
      const listHutang = activeDebts.filter(d => d.type === 'hutang').map(d => `${d.amount} ${(d.name.split('|')[1] || 'IDR')}`).join(', ') || '0';
      const listPiutang = activeDebts.filter(d => d.type === 'piutang').map(d => `${d.amount} ${(d.name.split('|')[1] || 'IDR')}`).join(', ') || '0';
      const listValas = forexAssets.map(f => `${f.amount} ${f.currency}`).join(', ') || '0';
      const listSubs = subscriptions.filter(s => s.isActive).map(s => `${s.name} (${s.cost})`).join(', ') || 'Tidak ada';

      const systemPrompt = `
      Kamu adalah BILANO Intelligence, asisten konsultan keuangan tingkat elit.
      INFO MUTLAK PEMBUATMU (Adrien Fandra):
      1. Adrien Fandra adalah seorang Konten Kreator.
      2. Adrien Fandra merancang aplikasi BILANO.

      PERATURAN SIKAP & LOGIKA KEUANGAN BILANO:
      - LANGSUNG KE INTINYA (NO YAPPING). Jangan memberi salam bertele-tele.
      - FOKUS 100% PADA ANALISIS KEUANGAN. Berikan insight, teguran tajam jika boros, dan strategi pelunasan.
      - DILARANG KERAS MENJELASKAN CARA PAKAI APLIKASI (kecuali ditanya).
      - PENTING (HUKUM AKUNTANSI BILANO): Kamu WAJIB BISA membedakan "KAS" dan "KEKAYAAN BERSIH (NET WORTH)". 
        > KAS = Hanya uang tunai riil likuid (IDR). 
        > KEKAYAAN BERSIH = Kas + Valas + Investasi + Piutang - Hutang.
        > Menghapus/mengikhlaskan Piutang (Write-off) TIDAK AKAN MENGURANGI KAS, melainkan HANYA mengurangi Kekayaan Bersih! JANGAN PERNAH MENJAWAB BAHWA MENGHAPUS PIUTANG AKAN MENGURANGI KAS!

      DATA KEUANGAN PENGGUNA SAAT INI (MUTLAK):
      - Saldo Kas IDR: Rp ${saldoTunai.toLocaleString('id-ID')}
      - Aset Investasi: Rp ${totalInvestasi.toLocaleString('id-ID')}
      - Sisa Limit Pengeluaran Bulan Ini: ${sisaBudget}
      - Hutang Pribadi (Kewajiban Valas & IDR): ${listHutang}
      - Piutang Pribadi (Uang di orang lain): ${listPiutang}
      - Dompet Valuta Asing: ${listValas}
      - Tagihan Langganan: ${listSubs}
      
      Beri tanggapan sesuai konteks data di atas menggunakan Markdown.
      `;

      const reply = await askSmartAI(systemPrompt, req.body.message);
      res.json({ reply });
  });

  // ====================================================================
  // 🚀 TRANSACTIONS ROUTES
  // ====================================================================
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
      
      if (newBalance !== user!.cashBalance) {
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
          else if (txToDelete.type === 'forex_buy') newBalance += amt;
          else if (txToDelete.type === 'forex_sell') newBalance -= amt;
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
          res.json({ success: true, message: "Transaksi berhasil dimusnahkan" });
      } catch (error) {
          res.status(500).json({ error: "Terjadi kesalahan pada server saat menghapus" });
      }
  });

  // ====================================================================
  // 🚀 FOREX ROUTES
  // ====================================================================
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
      if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 3600000) { 
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

  // ====================================================================
  // 🚀 DEBTS ROUTES 
  // ====================================================================
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
              if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 3600000) { 
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

  // 🚀 FITUR BARU: PULIHKAN TAGIHAN (RESTORE / UNDO)
  app.post("/api/debts/:id/restore", async (req, res) => {
      try {
          const user = await getUser(req);
          const id = parseInt(req.params.id);

          const debts = await storage.getDebts(user!.id);
          const debt = debts.find(d => d.id === id);

          if (!debt || !debt.isPaid) {
              return res.status(400).json({ error: "Tagihan ini tidak dapat dipulihkan karena belum lunas." });
          }

          // 1. Ubah status menjadi belum lunas
          await db.execute(sql`UPDATE debts SET is_paid = false WHERE id = ${id}`);

          // 2. Cari semua transaksi yang berkaitan dengan pelunasan ini
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

          // 3. Hapus transaksinya dan kalkulasi uang yang harus dikembalikan
          for (const t of payTxs) {
              // Jika ini transaksi IDR lama yang nyasar ke kas
              if (t.type === 'debt_receive' && (t.category === 'Piutang Dibayar' || t.category.includes('Diperbaiki'))) cashOffset -= t.amount;
              if (t.type === 'debt_pay' && t.category === 'Bayar Hutang') cashOffset += t.amount;
              
              await storage.deleteTransaction(t.id);
          }

          // 4. Tarik kembali Saldo IDR yang nyasar
          if (cashOffset !== 0) {
              await storage.updateUserBalance(user!.id, Math.round(user!.cashBalance + cashOffset));
          }

          // 5. Tarik kembali Saldo Valas (jika ini Valas dan sudah pakai sistem baru)
          const hasValasTx = payTxs.some(t => t.category.includes('Valas'));
          if (curr !== 'IDR' && hasValasTx) {
              const existingForex = await storage.getForexByCurrency(user!.id, curr);
              let currentForexAmount = existingForex ? existingForex.amount : 0;
              
              if (debt.type === 'piutang') {
                  currentForexAmount -= debt.amount; // Tadi ditambah, sekarang tarik balik
                  if (currentForexAmount < 0) currentForexAmount = 0;
              } else {
                  currentForexAmount += debt.amount; // Tadi dipotong, sekarang kembalikan
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
          if (Object.keys(cachedRates).length === 0 || now - lastRatesFetchTime > 3600000) { 
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

  // ====================================================================
  // 🚀 TARGET ROUTES
  // ====================================================================
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
      
      if (addCurrentCash !== undefined && addCurrentCash > 0) {
          await storage.updateUserBalance(user!.id, Math.round(addCurrentCash)); 
      }
      
      if (initialForexList && Array.isArray(initialForexList)) {
          for (const item of initialForexList) {
              if (item.amount > 0) {
                  const existing = await storage.getForexByCurrency(user!.id, item.currency);
                  if (existing) await storage.updateForexAsset(existing.id, item.amount);
                  else await storage.createForexAsset(user!.id, { currency: item.currency, amount: item.amount } as any);
              }
          }
      }

      if (initialDebts && Array.isArray(initialDebts)) {
          for (const item of initialDebts) {
              if (item.amount > 0 && item.name) {
                  await storage.createDebt(user!.id, { userId: user!.id, type: 'hutang', name: item.name, amount: item.amount } as any);
              }
          }
      }

      if (initialReceivables && Array.isArray(initialReceivables)) {
          for (const item of initialReceivables) {
              if (item.amount > 0 && item.name) {
                  await storage.createDebt(user!.id, { userId: user!.id, type: 'piutang', name: item.name, amount: item.amount } as any);
              }
          }
      }

      if (initialInvestments && Array.isArray(initialInvestments)) {
          for (const item of initialInvestments) {
              if (item.quantity > 0 && item.symbol && item.price > 0) {
                  await storage.createInvestment(user!.id, { 
                      userId: user!.id,
                      symbol: item.symbol.toUpperCase(), 
                      quantity: item.quantity, 
                      avgPrice: item.price, 
                      type: (item.type || 'saham').toLowerCase() 
                  } as any);
              }
          }
      }

      res.json(target); 
  });
  
  // ====================================================================
  // 🚀 INVESTMENTS ROUTES
  // ====================================================================
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

  // ====================================================================
  // 🚀 REPORTS & CATEGORIES
  // ====================================================================
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

  // ====================================================================
  // 🚀 SUBSCRIPTIONS
  // ====================================================================
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

  // ====================================================================
  // 🚀 USER PROFILE
  // ====================================================================
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
  // 🚀 MIDTRANS PAYMENT
  // ====================================================================
  app.post("/api/payment/midtrans/charge", async (req, res) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "User tidak valid." });

          const amount = 99000; 
          const orderId = `BILANO-PRO-${user.id}-${Date.now()}`;
          
          const serverKey = process.env.MIDTRANS_SERVER_KEY || ""; 
          const authString = Buffer.from(serverKey + ":").toString('base64');

          const payload = {
              transaction_details: { order_id: orderId, gross_amount: amount },
              customer_details: { first_name: user.firstName || "Member", email: user.email || "member@bilano.app" }
          };

          const midtransRes = await fetch("https://app.midtrans.com/snap/v1/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": `Basic ${authString}` },
              body: JSON.stringify(payload)
          });

          const data = await midtransRes.json();
          
          if (midtransRes.ok && data.redirect_url) {
              res.json({ success: true, redirectUrl: data.redirect_url, orderId });
          } else {
              res.status(400).json({ error: data.error_messages ? data.error_messages[0] : "Gagal memproses pembayaran." });
          }

      } catch (error: any) {
          res.status(500).json({ error: "Koneksi ke Midtrans terputus." });
      }
  });

  app.post("/api/payment/midtrans/webhook", async (req, res) => {
      try {
          const data = req.body;
          if (data.transaction_status === 'capture' || data.transaction_status === 'settlement') {
              const orderId = data.order_id; 
              const parts = orderId.split('-');
              if (parts.length >= 3) {
                  const userId = parseInt(parts[2]);
                  const validUntil = new Date();
                  validUntil.setDate(validUntil.getDate() + 365);
                  await storage.updateUserProStatus(userId, true, validUntil);
              }
          }
          res.status(200).json({ success: true });
      } catch (error) {
          res.status(500).json({ error: "Webhook Gagal" });
      }
  });

  // ====================================================================
  // 🚀 CRON JOBS
  // ====================================================================
  app.get('/api/cron/reminder', async (req, res) => {
      try {
          const ONE_SIGNAL_APP_ID = "b45b3256-b290-4a98-b5fa-afa0501a6b1c";
          const rawKey = process.env.ONESIGNAL_REST_KEY;

          if (!rawKey) return res.status(200).json({ success: false, laporan: "Brankas kosong" });
          
          const cleanKey = rawKey.replace(/\s+/g, '').trim();
          const finalAuthKey = cleanKey.replace(/^(Basic|Key)\s+/i, '');

          const today = new Date();
          today.setHours(0,0,0,0);
          
          const isEndOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() === today.getDate();
          const isFirstOfMonth = today.getDate() === 1;
          const isPDFDay = isEndOfMonth || isFirstOfMonth;

          const notificationsToSend: any[] = [];
          const targetSegments = ["Total Subscriptions"];

          if (isPDFDay) {
              notificationsToSend.push({
                  app_id: ONE_SIGNAL_APP_ID,
                  included_segments: targetSegments, 
                  headings: { "en": "Laporan Keuangan Siap! 📊" },
                  contents: { "en": "Waktunya evaluasi bulan ini. Yuk download PDF Neraca & Cashflow kamu sekarang." },
                  big_picture: "https://bilanofinance-dvbi.vercel.app/LOGO-BILANO.jpg?v=3",
                  android_accent_color: "FF4F46E5",
                  android_led_color: "FF4F46E5",
                  priority: 10
              });
          } else {
              const messages = [
                  { title: "Halo Bos! Duit aman? 💸", body: "Jangan lupa catat pengeluaran hari ini ya di BILANO!" },
                  { title: "Waktunya ngecek dompet! 🤔", body: "Ada jajan yang belum dicatat hari ini? Yuk masukin sekarang!" },
                  { title: "Awas Boncos! 🛑", body: "Cek sisa limit pengeluaran bulan ini biar target keuanganmu tetap aman." }
              ];
              const randomMsg = messages[Math.floor(Math.random() * messages.length)];
              notificationsToSend.push({
                  app_id: ONE_SIGNAL_APP_ID,
                  included_segments: targetSegments, 
                  headings: { "en": randomMsg.title },
                  contents: { "en": randomMsg.body },
                  big_picture: "https://bilanofinance-dvbi.vercel.app/LOGO-BILANO.jpg?v=3",
                  android_accent_color: "FF4F46E5",
                  android_led_color: "FF4F46E5",
                  priority: 10
              });
          }

          const allUsers = await storage.getAllUsers();
          for (const user of allUsers) {
              if (typeof storage.processDueSubscriptions === 'function') await storage.processDueSubscriptions(user.id);
              if (!user.onesignalId) continue; 

              const userDebts = await storage.getDebts(user.id);
              const userSubs = await storage.getSubscriptions(user.id);

              for (const debt of userDebts) {
                  if (!debt.isPaid && debt.dueDate) {
                      const due = new Date(debt.dueDate); due.setHours(0,0,0,0);
                      const diffTime = due.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays >= 0 && diffDays <= 3) {
                          notificationsToSend.push({
                              app_id: ONE_SIGNAL_APP_ID,
                              include_player_ids: [user.onesignalId], 
                              headings: { "en": debt.type === 'hutang' ? "Awas Jatuh Tempo Hutang! 🚨" : "Waktunya Nagih Piutang! 💰" },
                              contents: { "en": `Tenggat waktu [${debt.name.split('|')[0]}] tinggal ${diffDays === 0 ? 'HARI INI' : diffDays + ' hari lagi'}.` },
                              android_accent_color: "FFE11D48",
                              android_led_color: "FFE11D48",
                              priority: 10 
                          });
                      }
                  }
              }

              for (const sub of userSubs) {
                  if (sub.isActive && sub.nextBilling) {
                      const due = new Date(sub.nextBilling); due.setHours(0,0,0,0);
                      const diffTime = due.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays >= 0 && diffDays <= 3) {
                          notificationsToSend.push({
                              app_id: ONE_SIGNAL_APP_ID,
                              include_player_ids: [user.onesignalId], 
                              headings: { "en": "Tagihan Langganan 💳" },
                              contents: { "en": `Langganan [${sub.name}] akan ditagih ${diffDays === 0 ? 'HARI INI' : 'dalam ' + diffDays + ' hari'}.` },
                              android_accent_color: "FFE11D48",
                              android_led_color: "FFE11D48",
                              priority: 10 
                          });
                      }
                  }
              }
          }

          const results = [];
          for (const payload of notificationsToSend) {
              const res = await fetch("https://onesignal.com/api/v1/notifications", {
                  method: "POST",
                  headers: { "accept": "application/json", "Content-Type": "application/json", "Authorization": `Basic ${finalAuthKey}` },
                  body: JSON.stringify(payload)
              });
              results.push(await res.json());
          }
          res.status(200).json({ success: true, total_dikirim: notificationsToSend.length, details: results });
      } catch (error: any) {
          res.status(500).json({ success: false, error: "System Crash: " + error.message });
      }
  });

  // ====================================================================
  // 🚀 ADMIN ROUTES & HELP CENTER
  // ====================================================================
  const isAdminValid = (email: string) => {
      if (!email) return false;
      return ["adrienfandra14@gmail.com", "bilanotech@gmail.com"].includes(email.toLowerCase());
  };

  app.get("/api/admin/users", async (req, res) => {
      try {
          const email = req.headers["x-user-email"] as string;
          if (!isAdminValid(email)) return res.status(403).json({ error: "Penyusup Ditolak" });
          const allUsers = await storage.getAllUsers();
          const safeUsers = allUsers.map(u => ({
              id: u.id, username: u.username, email: u.email, isPro: u.isPro, proValidUntil: u.proValidUntil, createdAt: u.createdAt
          })).sort((a,b) => b.id - a.id); 
          res.json(safeUsers);
      } catch (error) {
          res.status(500).json({ error: "Fungsi getAllUsers belum ditambahkan di storage.ts" });
      }
  });

  app.patch("/api/admin/users/:id/pro", async (req, res) => {
      const email = req.headers["x-user-email"] as string;
      if (!isAdminValid(email)) return res.status(403).json({ error: "Penyusup Ditolak" });
      const targetId = parseInt(req.params.id);
      const { isPro } = req.body;
      let validUntil = null;
      if (isPro) {
          validUntil = new Date();
          validUntil.setFullYear(validUntil.getFullYear() + 1); 
      }
      await storage.updateUserProStatus(targetId, isPro, validUntil);
      res.json({ success: true });
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
              const resendKey = process.env.RESEND_API_KEY;
              if (resendKey) {
                  await fetch("https://api.resend.com/emails", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
                      body: JSON.stringify({
                          from: "Sistem Bantuan BILANO <onboarding@resend.dev>",
                          to: [process.env.EMAIL_USER || "adrienfandra14@gmail.com"], 
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
                      })
                  });
              }
          } catch(e) {}
          
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
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey) {
              await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
                  body: JSON.stringify({
                      from: "Tim Bantuan BILANO <onboarding@resend.dev>",
                      to: [userEmail],
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
                  })
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

  const httpServer = createServer(app);
  return httpServer;
}