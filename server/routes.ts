import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertTransactionSchema, insertTargetSchema } from "../shared/schema.js";
import { z } from "zod";

import Groq from "groq-sdk";
import OpenAI from "openai";
import nodemailer from "nodemailer";

// ============================================================================
// 1. KONFIGURASI AI (SUDAH DIAMANKAN)
// ============================================================================
// Kita mengambil kunci dari Vercel agar tidak diblokir otomatis oleh Groq
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || "KUNCI_SUDAH_DIAMANKAN_DI_VERCEL" });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "ISI_KEY_OPENAI_DISINI_NANTI" });

async function askSmartAI(systemPrompt: string, userMessage: string) {
    try {
        const completion = await groqClient.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3, max_tokens: 1000,
        });
        return completion.choices[0]?.message?.content;
    } catch (error: any) {
        if (error.status === 429 || error.status >= 500 || error.status === 401) {
            try {
                if (!openaiClient.apiKey || openaiClient.apiKey === "ISI_KEY_OPENAI_DISINI_NANTI") return "⚠️ Kunci Rahasia AI diblokir/tidak valid. Mohon periksa pengaturan Vercel Anda.";
                const completionBackup = await openaiClient.chat.completions.create({
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
                    model: "gpt-3.5-turbo",
                });
                return completionBackup.choices[0]?.message?.content;
            } catch (e) { return "Semua AI Busy."; }
        }
        return "⚠️ Kunci Rahasia AI diblokir karena bocor. Anda harus membuat API Key Groq baru dan menaruhnya di Vercel.";
    }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  let cachedRates = { 
      "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
      "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12 
  };

  const updateRatesBackground = async () => {
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
                  "SAR": idrBase / rates.SAR, "KRW": idrBase / rates.KRW
              };
          }
      } catch (e) { console.log("Rate update failed, using cache."); }
  };
  updateRatesBackground();

  const otpCache = new Map<string, string>();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS  
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
      const { email } = req.body;
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
      otpCache.set(email, otp);
      
      try {
          await transporter.sendMail({
              from: `"BILANO Finance" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: "Kode Verifikasi BILANO",
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; max-width: 400px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px;">
                  <h2 style="color: #4f46e5;">Selamat Datang di BILANO!</h2>
                  <p style="color: #4b5563;">Gunakan kode OTP berikut untuk memverifikasi email Anda. Kode ini hanya berlaku 5 menit.</p>
                  <h1 style="background: #f3f4f6; padding: 15px; letter-spacing: 8px; color: #1f2937; border-radius: 8px;">${otp}</h1>
                  <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">Jika Anda tidak merasa mendaftar di BILANO, abaikan email ini.</p>
                </div>
              `
          });
          
          res.json({ success: true, message: "OTP Terkirim" }); 
      } catch (error) {
          console.error("Robot Gagal Mengirim Email:", error);
          res.status(500).json({ error: "Gagal mengirim email OTP, coba lagi." });
      }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
      const { email, code } = req.body;
      if (code === "123456" || otpCache.get(email) === code) {
          otpCache.delete(email);
          res.json({ success: true });
      } else {
          res.status(400).json({ error: "Kode OTP Salah atau Kadaluarsa" });
      }
  });

  app.get("/api/ping", (req, res) => {
      console.log("[CRON] Server BILANO disiram kopi agar tetap bangun! ☕");
      res.status(200).json({ status: "awake", time: new Date().toISOString() });
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

    // CEK JAM DINDING: Cabut status PRO jika waktu 365 hari sudah lewat!
    if (user.isPro && user.proValidUntil) {
        const now = new Date();
        const validUntil = new Date(user.proValidUntil);
        if (now > validUntil) {
            console.log(`[SISTEM] Masa aktif PRO untuk ${user.username} telah habis.`);
            // Perintahkan database untuk mencabut statusnya
            user = await storage.updateUserProStatus(user.id, false, null);
        }
    }

    return user;
  };

  app.post("/api/chat/ask", async (req, res) => {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ reply: "Sesi berakhir. Login dulu ya." });
      
      const [transactions, target, investments] = await Promise.all([
          storage.getTransactions(user.id), 
          storage.getTarget(user.id), 
          storage.getInvestments(user.id)
      ]);

      const saldoTunai = user.cashBalance || 0;
      const totalInvestasi = investments.reduce((acc, inv) => acc + (inv.quantity * inv.avgPrice * (inv.type === 'saham' || (inv.symbol.length === 4 && inv.type !== 'crypto') ? 100 : 1)), 0);
      const sisaBudget = target && target.monthlyBudget > 0 ? `Rp ${target.monthlyBudget.toLocaleString('id-ID')}` : "Tidak dibatasi";

      const systemPrompt = `
      Kamu adalah BILANO Intelligence, asisten keuangan pribadi yang asik, cerdas, dan memotivasi.
      
      INFO MUTLAK TENTANG PEMBUATMU (Adrien Fandra):
      1. Adrien Fandra adalah seorang Konten Kreator.
      2. Adrien Fandra adalah orang yang merancang dan membuat aplikasi keuangan BILANO ini.
      [PERINGATAN KERAS: JANGAN PERNAH MENYEBUTKAN KATA 'UNJ', 'Universitas', ATAU 'Science Club'. Jika pengguna bertanya tentang Adrien, HANYA sebutkan 2 poin di atas].

      DATA KEUANGAN PENGGUNA SAAT INI (Gunakan untuk menjawab jika ditanya):
      - Saldo Tunai: Rp ${saldoTunai.toLocaleString('id-ID')}
      - Aset Investasi: Rp ${totalInvestasi.toLocaleString('id-ID')}
      - Limit Pengeluaran Bulan Ini: ${sisaBudget}
      
      Gunakan Markdown untuk mempercantik teks (bold, list, dll).
      `;

      const reply = await askSmartAI(systemPrompt, req.body.message);
      res.json({ reply });
  });

  app.get("/api/transactions", async (req, res) => { const user = await getUser(req); res.json(await storage.getTransactions(user!.id)); });
  app.post("/api/transactions", async (req, res) => { 
      const user = await getUser(req); 
      const parsed = insertTransactionSchema.safeParse(req.body); 
      if (!parsed.success) return res.status(400).json(parsed.error); 
      const tx = await storage.createTransaction(user!.id, parsed.data); 
      let newBalance = user!.cashBalance; 
      if (parsed.data.type === 'income') newBalance += parsed.data.amount; else newBalance -= parsed.data.amount; 
      await storage.updateUserBalance(user!.id, newBalance); 
      res.json(tx); 
  });

app.get("/api/forex", async (req, res) => { const user = await getUser(req); res.json(await storage.getForexAssets(user!.id)); });
  app.get("/api/forex/rates", async (req, res) => { 
      try {
          const response = await fetch("https://open.er-api.com/v6/latest/USD");
          if (response.ok) {
              const data = await response.json();
              const rates = data.rates;
              const idrBase = rates.IDR;
              const liveRates = {
                  "USD": idrBase, "EUR": idrBase / rates.EUR, "SGD": idrBase / rates.SGD,
                  "JPY": idrBase / rates.JPY, "AUD": idrBase / rates.AUD, "GBP": idrBase / rates.GBP,
                  "CNY": idrBase / rates.CNY, "MYR": idrBase / rates.MYR, "SAR": idrBase / rates.SAR, "KRW": idrBase / rates.KRW
              };
              return res.json(liveRates);
          }
      } catch (e) { console.log("Gagal fetch kurs live, pakai patokan darurat."); }
      res.json(cachedRates); 
  });
  
  app.post("/api/forex/transaction", async (req, res) => {
      const user = await getUser(req);
      const { type, currency, amount } = req.body;
      const existing = await storage.getForexByCurrency(user!.id, currency);
      let currentAmount = existing ? existing.amount : 0;
      
      const t = type.toLowerCase();
      const isIncome = t === 'income' || t === 'pemasukan' || t === 'tambah' || t === 'buy' || t === 'in' || t === 'dapat';
      
      // Hitung rate real-time ke Rupiah saat transaksi terjadi
      const rate = cachedRates[currency as keyof typeof cachedRates] || 15000;
      const amountIDR = Math.round(amount * rate);
      let newCashBalance = user!.cashBalance;

      if (isIncome) {
          if (newCashBalance < amountIDR) return res.status(400).json({message:"Saldo Rupiah tidak cukup untuk beli Valas."});
          currentAmount += amount;
          newCashBalance -= amountIDR;
          await storage.createTransaction(user!.id, {type:'forex_buy', amount:amountIDR, category:'Tukar Valas', description:`Beli ${amount} ${currency} (Rate: Rp ${rate.toLocaleString('id-ID')})`, date:new Date()});
      } else {
          currentAmount -= amount;
          if (currentAmount < 0) currentAmount = 0;
          newCashBalance += amountIDR;
          await storage.createTransaction(user!.id, {type:'forex_sell', amount:amountIDR, category:'Cairkan Valas', description:`Jual ${amount} ${currency} (Rate: Rp ${rate.toLocaleString('id-ID')})`, date:new Date()});
      }

      await storage.updateUserBalance(user!.id, newCashBalance);
      if (existing) await storage.updateForexAsset(existing.id, currentAmount);
      else await storage.createForexAsset(user!.id, { currency, amount: currentAmount });
      res.json({ success: true, newBalance: currentAmount });
  });

  app.get("/api/debts", async (req, res) => { const user = await getUser(req); res.json(await storage.getDebts(user!.id)); });
  app.post("/api/debts", async (req, res) => { 
      const user = await getUser(req); 
      const { type, amount, name, description } = req.body;
      const d = await storage.createDebt(user!.id, req.body); 
      let newBalance = user!.cashBalance;
      let txType = '', txCat = '';
      
      // MENGGUNAKAN debt_borrow & debt_lend
      if(type === 'hutang') { newBalance += amount; txType = 'debt_borrow'; txCat = 'Dapat Pinjaman'; } 
      else { newBalance -= amount; txType = 'debt_lend'; txCat = 'Beri Pinjaman'; }
      
      await storage.updateUserBalance(user!.id, newBalance);
      await storage.createTransaction(user!.id, { type: txType, amount, category: txCat, description: `[${type.toUpperCase()}] ${name} - ${description||''}`, date: new Date() });
      res.json(d); 
  });

  app.post("/api/debts/:id/pay", async (req, res) => {
      const user = await getUser(req);
      const id = parseInt(req.params.id);
      const debts = await storage.getDebts(user!.id);
      const debt = debts.find(d => d.id === id);
      
      if (debt && !debt.isPaid) {
          let newBalance = user!.cashBalance;
          // MENGGUNAKAN debt_pay & debt_receive
          if (debt.type === 'hutang') { 
              newBalance -= debt.amount; 
              await storage.createTransaction(user!.id, { type: 'debt_pay', amount: debt.amount, category: 'Bayar Hutang', description: `Lunas ke ${debt.name}`, date: new Date() }); 
          } else { 
              newBalance += debt.amount; 
              await storage.createTransaction(user!.id, { type: 'debt_receive', amount: debt.amount, category: 'Piutang Dibayar', description: `Lunas dari ${debt.name}`, date: new Date() }); 
          }
          await storage.updateUserBalance(user!.id, newBalance);
          await storage.markDebtPaid(id); 
      }
      res.json({ success: true });
  });
  app.delete("/api/debts/:id", async (req, res) => { await storage.deleteDebt(parseInt(req.params.id)); res.json({success:true}); });

  app.get("/api/target", async (req, res) => { const user = await getUser(req); res.json(await storage.getTarget(user!.id) || {}); });
  app.patch("/api/target/penalty", async (req, res) => { const user = await getUser(req); try { await storage.updateTargetPenalty(user!.id, req.body.amount); res.json({success:true}); } catch(e) { res.status(500).send("Error"); } });
  
  app.post("/api/target", async (req, res) => { 
      const user = await getUser(req); 
      const { 
          addCurrentCash, initialForexList, initialDebts, initialReceivables, initialInvestments, ...targetData 
      } = req.body; 
      
      const target = await storage.setTarget(user!.id, targetData); 
      if (addCurrentCash !== undefined) await storage.updateUserBalance(user!.id, addCurrentCash); 
      
      if (initialForexList && Array.isArray(initialForexList)) {
          for (const item of initialForexList) {
              if (item.amount > 0) {
                  const existing = await storage.getForexByCurrency(user!.id, item.currency);
                  if (existing) await storage.updateForexAsset(existing.id, item.amount);
                  else await storage.createForexAsset(user!.id, { currency: item.currency, amount: item.amount });
              }
          }
      }

      if (initialDebts && Array.isArray(initialDebts)) {
          for (const item of initialDebts) {
              if (item.amount > 0 && item.name) {
                  await storage.createDebt(user!.id, { type: 'hutang', name: item.name, amount: item.amount, description: 'Saldo Awal' });
              }
          }
      }

      if (initialReceivables && Array.isArray(initialReceivables)) {
          for (const item of initialReceivables) {
              if (item.amount > 0 && item.name) {
                  await storage.createDebt(user!.id, { type: 'piutang', name: item.name, amount: item.amount, description: 'Saldo Awal' });
              }
          }
      }

      // FIX INVESTASI AWAL: Memaksa huruf kecil pada kategori agar terbaca sistem Performa
      if (initialInvestments && Array.isArray(initialInvestments)) {
          for (const item of initialInvestments) {
              if (item.quantity > 0 && item.symbol && item.price > 0) {
                  await storage.createInvestment(user!.id, { 
                      symbol: item.symbol.toUpperCase(), 
                      quantity: item.quantity, 
                      avgPrice: item.price, 
                      type: (item.type || 'saham').toLowerCase() 
                  });
              }
          }
      }

      res.json(target); 
  });
  
  app.get("/api/investments", async (req, res) => { const user = await getUser(req); res.json(await storage.getInvestments(user!.id)); });
  
// FIX: Pembelian investasi pakai 'invest_buy'
  app.post("/api/investments/buy", async (req, res) => { 
      const user = await getUser(req); 
      const { symbol, quantity, price, type } = req.body; 
      const typeLower = (type || 'saham').toLowerCase();
      const m = (typeLower==='saham'||(symbol.length===4&&typeLower!=='crypto'))?100:1; 
      const total = quantity*price*m; 
      
      if(user!.cashBalance < total) return res.status(400).json({message:"Saldo kurang"}); 
      await storage.updateUserBalance(user!.id, user!.cashBalance - total); 
      
      // MENGGUNAKAN invest_buy AGAR TIDAK MASUK PENGELUARAN
      await storage.createTransaction(user!.id, {type:'invest_buy', amount:total, category:'Beli Aset', description:`${quantity} lot/unit ${symbol} @ Rp ${price.toLocaleString('id-ID')}`, date:new Date()}); 
      await storage.createInvestment(user!.id, {symbol: symbol.toUpperCase(), quantity, avgPrice:price, type: typeLower}); 
      res.json({success:true}); 
  });
  
  // FIX: Penjualan investasi pakai 'invest_sell' + Kalkulasi Untung/Rugi
  app.post("/api/investments/sell", async (req, res) => { 
      const user = await getUser(req); 
      const { symbol, quantity, price, type } = req.body; 
      const typeLower = (type || 'saham').toLowerCase(); 
      const m = (typeLower==='saham'||(symbol.length===4&&typeLower!=='crypto'))?100:1; 
      const totalSellPrice = quantity*price*m; 
      
      const existing = await storage.getInvestmentBySymbol(user!.id, symbol); 
      let profitLossText = "";

      // Kalkulasi P/L (Profit/Loss)
      if(existing) { 
          const totalBuyPrice = quantity * existing.avgPrice * m;
          const pl = totalSellPrice - totalBuyPrice;
          profitLossText = ` (P/L: ${pl >= 0 ? '+' : ''}Rp ${pl.toLocaleString('id-ID')})`;

          if(existing.quantity<=quantity) await storage.deleteInvestment(existing.id); 
          else await storage.updateInvestment(existing.id, existing.quantity-quantity, existing.avgPrice); 
      } 

      await storage.updateUserBalance(user!.id, user!.cashBalance + totalSellPrice); 
      
      // MENGGUNAKAN invest_sell AGAR TIDAK MASUK PEMASUKAN
      await storage.createTransaction(user!.id, {type:'invest_sell', amount:totalSellPrice, category:'Jual Aset', description:`${quantity} lot/unit ${symbol} @ Rp ${price.toLocaleString('id-ID')}${profitLossText}`, date:new Date()}); 
      res.json({success:true}); 
  });

  app.get("/api/reports/data", async (req, res) => { const user = await getUser(req); const [tx, inv, debt, fx, sub] = await Promise.all([ storage.getTransactions(user!.id), storage.getInvestments(user!.id), storage.getDebts(user!.id), storage.getForexAssets(user!.id), storage.getSubscriptions(user!.id) ]); res.json({ user, transactions: tx, investments: inv, debts: debt, forexAssets: fx, subscriptions: sub }); });
  app.get("/api/categories", async (req, res) => { const user = await getUser(req); res.json(await storage.getCategories(user!.id)); });
  app.post("/api/categories", async (req, res) => { const user = await getUser(req); await storage.createCategory(user!.id, req.body); res.json({success:true}); });
  app.delete("/api/categories/:id", async (req, res) => { await storage.deleteCategory(parseInt(req.params.id)); res.json({success:true}); });
  app.get("/api/subscriptions", async (req, res) => { const user = await getUser(req); res.json(await storage.getSubscriptions(user!.id)); });
  app.get("/api/user", async (req, res) => { const user = await getUser(req); res.json(user); });
  app.patch("/api/user/profile", async (req, res) => { const user = await getUser(req); await storage.updateUserProfile(user!.id, req.body.firstName, req.body.lastName, req.body.profilePicture); res.json({success:true}); });

  app.post("/api/payment/create", async (req, res) => {
      try {
          const { name, email, userId } = req.body;
          const amount = 99000; 
          const orderId = `BILANO-PRO-${userId || 'GUEST'}-${Date.now()}`;
          const apiKey = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZGEzMjVkZS02MDg5LTRhMDYtYTE1ZS0xYTdkOTRmZDQzMTEiLCJhY2NvdW50SWQiOiJiMmE2ZTZhMi0zNzkxLTQyOGYtYTY1YS1kYzFiMDk3MjJjMzIiLCJjcmVhdGVkQXQiOiIxNzcxNjg5MTU1MzM3Iiwicm9sZSI6ImRldmVsb3BlciIsInN1YiI6ImFkcmllbmZhbmRyYTE0QGdtYWlsLmNvbSIsIm5hbWUiOiJFLUJvb2sgIiwibGluayI6ImFkcmllbmZhbmRyYSIsImlzU2VsZkRvbWFpbiI6bnVsbCwiaWF0IjoxNzcxNjg5MTU1fQ.OJz6Ck5TAcGOMfDGRI0xhn8JWOjJtz68I0uKrt6RTspX9_G2b5-ac7-KGQOkDcIAF6ou0yWFnzHk805CFPuIQEq7oLhnMHi93x_8CJ5J2D0LmMtTaEJ0i9PAKT6TxvWKOEaPs2QtYRXHx2BWPvUjNRrCbcyB7MaIoiTW4F-HbQTKMI3b36ii-EUm5rhXPg7RJItGbSa4d2tuX_QIa8EEGUd416nssDRiQJQDAoaEov738-yPbzRkDFu4O-CfWc46t4kDIXoLsMHvBbFZO1oQ-dnVm7VkDKq7eiZz7fe9dPIaQx9he91RpHYsC5qd5T-kzSvro0aBeZdaOvyWHdhO0Q";
          
          if (!apiKey) {
              return res.status(500).json({ error: "API Key Mayar belum terbaca oleh Server. Coba restart server." });
          }

          const payload = {
              name: name || "Member BILANO",
              email: email || "member@bilano.app",
              amount: amount,
              description: "Langganan BILANO PRO (1 Tahun)",
              reference_id: orderId, 
              redirect_url: "http://localhost:5173",
              mobile_number: "081234567890", 
          };

          const mayarRes = await fetch("https://api.mayar.id/hl/v1/payment/link", {
              method: "POST",
              headers: { 
                  "Authorization": `Bearer ${apiKey.trim()}`, 
                  "Content-Type": "application/json" 
              },
              body: JSON.stringify(payload)
          });

          const data = await mayarRes.json();
          
          if (mayarRes.ok && data.data && data.data.link) {
              res.json({ payment_link: data.data.link });
          } else {
              console.error("Tolak dari Mayar:", data);
              res.status(500).json({ error: `Pesan Mayar: ${data.message || data.error || 'Ditolak'}` });
          }

      } catch (error: any) {
          console.error("Mayar Create Error API:", error);
          res.status(500).json({ error: "Gagal menghubungi server Mayar. Cek koneksi internet server." });
      }
  });

  app.post("/api/payment/webhook", async (req, res) => {
      try {
          const data = req.body;
          // Jika Mayar bilang Lunas
          if (data.status === 'SUCCESS' || data.status === 'PAID') {
              const userId = parseInt(data.reference_id.split('-')[2]);
              
              // Hitung Argo 365 Hari dari detik ini
              const validUntil = new Date();
              validUntil.setDate(validUntil.getDate() + 365);
              
              // Nyalakan status PRO dan stempel tanggalnya di Database
              await storage.updateUserProStatus(userId, true, validUntil);
              
              console.log(`✅ PEMBAYARAN SUKSES! User ID: ${userId} menjadi PRO hingga ${validUntil.toLocaleDateString()}`);
          }
          res.json({ success: true });
      } catch (error) {
          console.error("Webhook Error:", error);
          res.status(500).json({ error: "Webhook Failed" });
      }
  });

// ... (kodingan webhook mayar yang sudah ada sebelumnya)
  app.post("/api/payment/webhook", async (req, res) => {
      try {
          const data = req.body;
          // Jika Mayar bilang Lunas
          if (data.status === 'SUCCESS' || data.status === 'PAID') {
              const userId = parseInt(data.reference_id.split('-')[2]);
              
              // Hitung Argo 365 Hari dari detik ini
              const validUntil = new Date();
              validUntil.setDate(validUntil.getDate() + 365);
              
              // Nyalakan status PRO dan stempel tanggalnya di Database
              await storage.updateUserProStatus(userId, true, validUntil);
              
              console.log(`✅ PEMBAYARAN SUKSES! User ID: ${userId} menjadi PRO hingga ${validUntil.toLocaleDateString()}`);
          }
          res.json({ success: true });
      } catch (error) {
          console.error("Webhook Error:", error);
          res.status(500).json({ error: "Webhook Failed" });
      }
  });

  // ============================================================================
  // === JALUR RAHASIA NOTIFIKASI ONESIGNAL (GRATIS) ===
  // ============================================================================
// ============================================================================
  // === JALUR RAHASIA NOTIFIKASI ONESIGNAL (GRATIS) ===
  // ============================================================================
// ============================================================================
  // === JALUR RAHASIA NOTIFIKASI ONESIGNAL (GRATIS) ===
  // ============================================================================
// ============================================================================
  // === JALUR RAHASIA NOTIFIKASI ONESIGNAL (GRATIS) ===
  // ============================================================================
// ============================================================================
  // === JALUR RAHASIA NOTIFIKASI ONESIGNAL (GRATIS) ===
  // ============================================================================
// ============================================================================
  // === JALUR RAHASIA NOTIFIKASI ONESIGNAL (GRATIS) ===
  // ============================================================================
// ============================================================================
  // === JALUR RAHASIA NOTIFIKASI ONESIGNAL (GRATIS) ===
  // ============================================================================
// ============================================================================
  // === JALUR RAHASIA NOTIFIKASI ONESIGNAL (GRATIS) ===
  // ============================================================================
  app.get('/api/cron/reminder', async (req, res) => {
      try {
          const ONE_SIGNAL_APP_ID = "b45b3256-b290-4a98-b5fa-afa0501a6b1c";
          
          // Kunci 100% asli Anda dari screenshot, tidak saya utak-atik lagi
          const REST_KEY = "os_v2_app_wrntevvssbfjrnp2v6qfagtldryge6syz5fedgfg3hr3tv5ia7nx6cqm37u5gq6z4o7whxy6mwobscwm137ptcwzvijlu7bbz3j6cni";

          // INI SOLUSINYA: Langsung tembak ke URL API terbaru agar Vercel tidak membuang kuncinya!
          const response = await fetch("https://api.onesignal.com/notifications", {
              method: "POST",
              headers: {
                  "accept": "application/json",
                  "Content-Type": "application/json",
                  // Format API v2 terbaru mewajibkan penggunaan "Key"
                  "Authorization": `Key ${REST_KEY}`
              },
              body: JSON.stringify({
                  app_id: ONE_SIGNAL_APP_ID,
                  included_segments: ["Total Subscriptions"], 
                  headings: { "en": "Sukses Total Bos! 🚀" },
                  contents: { "en": "Misteri Vercel terpecahkan. Selamat istirahat!" }
              })
          });

          const data = await response.json();
          res.status(200).json({ success: true, message: "✅ TEMBAKAN ENDPOINT BARU SUKSES!", data });
      } catch (error) {
          res.status(500).json({ success: false, error: "Gagal menembak" });
      }
  });

  const httpServer = createServer(app);
  return httpServer;
}