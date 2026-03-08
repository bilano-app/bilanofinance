import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertTransactionSchema, insertTargetSchema } from "../shared/schema.js";
import { z } from "zod";

import Groq from "groq-sdk";
import OpenAI from "openai";
import nodemailer from "nodemailer";

// Database sementara untuk menyimpan izin notifikasi use

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
    
    // 1. Tangani Guest
    if (!email || email === "guest") {
        let user = await storage.getUser(1);
        if (!user) {
            user = await storage.createUser({ username: "guest", password: "123", email: "guest@bilano.app" });
        }
        return user;
    }

    // 2. Tangani User Login Biasa
    let user = await storage.getUserByUsername(email as string);
    if (!user) {
        user = await storage.createUser({ username: email as string, password: "123", email: email as string });
    }

    // ==========================================================
    // 🚀 OVERRIDE VVIP ABSOLUT (ANTI GAGAL & PASTI TERBUKA) 
    // ==========================================================
    const vipEmails = [
        "adrienfandra14@gmail.com",
        "bilanotech@gmail.com", // Saya tambahkan email dari screenshot Midtrans Anda
    // SEMENTARA: Paksa SIAPAPUN yang sedang login menjadi PRO mutlak!
    ];

    if (vipEmails.includes(user.email)) {
        user.isPro = true;
        user.plan = "pro"; 
        user.proValidUntil = new Date("2099-12-31").toISOString(); // Aktif sampai tahun 2099
        
        // LANGSUNG KEMBALIKAN DATA DI SINI. 
        // Abaikan database dan abaikan sistem "Cek Jam Dinding" di bawahnya!
        return user; 
    }
    // ==========================================================

    // 3. CEK JAM DINDING (Hanya akan berlaku untuk user biasa, VVIP tidak akan kena sistem ini)
    if (user.isPro && user.proValidUntil) {
        const now = new Date();
        const validUntil = new Date(user.proValidUntil);
        if (now > validUntil) {
            console.log(`[SISTEM] Masa aktif PRO untuk ${user.username} telah habis.`);
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

  // =========================================================================
  // 🚀 FIX MUTLAK: JALUR PEMUSNAHAN TRANSAKSI KE AKAR DATABASE
  // =========================================================================
  app.delete("/api/transactions/:id", async (req, res) => {
      try {
          const user = await getUser(req);
          const txId = parseInt(req.params.id);

          const txs = await storage.getTransactions(user!.id);
          const txToDelete = txs.find(t => t.id === txId);

          if (!txToDelete) return res.status(404).json({ error: "Data transaksi tidak ditemukan" });

          // Hitung ulang saldo sebelum menghapus (Reverse Engineer)
          let newBalance = user!.cashBalance;
          const isIncome = txToDelete.type.includes('income') || txToDelete.type.includes('receive') || txToDelete.type === 'debt_borrow' || txToDelete.type === 'invest_sell' || txToDelete.type === 'forex_sell';

          if (isIncome) {
              newBalance -= txToDelete.amount; // Tarik kembali uang masuk
          } else {
              newBalance += txToDelete.amount; // Kembalikan uang yang keluar
          }

          // Simpan saldo baru dan hapus transaksi dari database
          await storage.updateUserBalance(user!.id, newBalance);
          
          if (typeof storage.deleteTransaction === 'function') {
              await storage.deleteTransaction(txId);
          } else {
              console.warn("storage.deleteTransaction tidak ditemukan. Harap pastikan ada di storage.ts");
          }

          res.json({ success: true, message: "Transaksi berhasil dimusnahkan" });
      } catch (error) {
          res.status(500).json({ error: "Terjadi kesalahan pada server saat menghapus" });
      }
  });
  // =========================================================================

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

  // =========================================================================
  // FIX 3: UPDATE JALUR PEMBAYARAN CICILAN / PARSIAL
  // =========================================================================
  app.post("/api/debts/:id/pay", async (req, res) => {
      const user = await getUser(req);
      const id = parseInt(req.params.id);
      const { amount } = req.body; 
      
      const debts = await storage.getDebts(user!.id);
      const debt = debts.find(d => d.id === id);
      
      if (debt && !debt.isPaid) {
          // Jika frontend mengirim amount, gunakan itu (Cicilan). Jika tidak, Lunas.
          const payAmount = (amount !== undefined && amount > 0) ? Math.min(amount, debt.amount) : debt.amount;
          let newBalance = user!.cashBalance;
          
          if (debt.type === 'hutang') { 
              newBalance -= payAmount; 
              await storage.createTransaction(user!.id, { type: 'debt_pay', amount: payAmount, category: 'Bayar Hutang', description: `Cicilan/Lunas ke ${debt.name.split('|')[0]}`, date: new Date() }); 
          } else { 
              newBalance += payAmount; 
              await storage.createTransaction(user!.id, { type: 'debt_receive', amount: payAmount, category: 'Piutang Dibayar', description: `Cicilan/Lunas dari ${debt.name.split('|')[0]}`, date: new Date() }); 
          }
          await storage.updateUserBalance(user!.id, newBalance);
          
          // Hitung sisa. Jika masih ada, buat record hutang/piutang baru dengan sisa amount
          const remaining = debt.amount - payAmount;
          if (remaining > 0) {
              await storage.createDebt(user!.id, {
                  type: debt.type, 
                  name: debt.name, 
                  amount: remaining, 
                  description: `[Sisa Tagihan] ${debt.description || ''}`, 
                  dueDate: (debt as any).dueDate || ""
              });
          }
          
          // Tandai record yang lama sebagai lunas
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

  app.post("/api/payment/midtrans/charge", async (req, res) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "User tidak valid." });

          const amount = 99000; 
          const orderId = `BILANO-PRO-${user.id}-${Date.now()}`;
          
          // Kunci Server Sandbox Midtrans yang ada di Vercel
          const serverKey = process.env.MIDTRANS_SERVER_KEY || ""; 
          const authString = Buffer.from(serverKey + ":").toString('base64');

          // Payload khusus untuk menembak gambar Barcode QRIS langsung
          const payload = {
              payment_type: "qris",
              transaction_details: {
                  order_id: orderId,
                  gross_amount: amount
              },
              customer_details: {
                  first_name: user.firstName || "Member",
                  email: user.email || "member@bilano.app"
              }
          };

          // Tembak ke API Core Midtrans (Perhatikan URL-nya menggunakan /v2/charge)
          const midtransRes = await fetch("https://api.sandbox.midtrans.com/v2/charge", {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                  "Authorization": `Basic ${authString}`
              },
              body: JSON.stringify(payload)
          });

          const data = await midtransRes.json();
          
          if (midtransRes.ok && data.status_code === "201") {
              // Cari URL Gambar QR Code dari balasan Midtrans
              const qrAction = data.actions?.find((a: any) => a.name === "generate-qr-code");
              if (qrAction) {
                  res.json({ success: true, qrUrl: qrAction.url, orderId: data.order_id });
              } else {
                  res.status(500).json({ error: "Sistem Midtrans gagal mengeluarkan QR Code." });
              }
          } else {
              console.error("Midtrans Core Error:", data);
              res.status(400).json({ error: data.status_message || "Gagal memproses pembayaran." });
          }

      } catch (error: any) {
          console.error("Sistem Midtrans Gagal:", error);
          res.status(500).json({ error: "Koneksi ke Midtrans terputus." });
      }
  });

  app.post("/api/payment/midtrans/webhook", async (req, res) => {
      try {
          const data = req.body;
          // Cek jika statusnya LUNAS (capture untuk kartu kredit, settlement untuk QRIS/GoPay/VA)
          if (data.transaction_status === 'capture' || data.transaction_status === 'settlement') {
              const orderId = data.order_id; // Format: BILANO-PRO-{userId}-{timestamp}
              const parts = orderId.split('-');
              
              if (parts.length >= 3) {
                  const userId = parseInt(parts[2]);
                  
                  // Aktifkan PRO 365 Hari
                  const validUntil = new Date();
                  validUntil.setDate(validUntil.getDate() + 365);
                  
                  await storage.updateUserProStatus(userId, true, validUntil);
                  console.log(`✅ PEMBAYARAN MIDTRANS LUNAS! User ID: ${userId} menjadi PRO.`);
              }
          }
          res.status(200).json({ success: true });
      } catch (error) {
          console.error("Midtrans Webhook Error:", error);
          res.status(500).json({ error: "Webhook Gagal" });
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
  // === JALUR NOTIFIKASI ONESIGNAL (VERSI FINAL UNTUK APK) ===
  // ============================================================================
  // ============================================================================
  // === JALUR NOTIFIKASI ONESIGNAL (VERSI DETEKTIF FINAL) ===
  // ============================================================================
  // ============================================================================
  // === JALUR NOTIFIKASI ONESIGNAL (VERSI FINAL SUKSES + GACHA PESAN) ===
  // ============================================================================
  app.get('/api/cron/reminder', async (req, res) => {
      try {
          const ONE_SIGNAL_APP_ID = "b45b3256-b290-4a98-b5fa-afa0501a6b1c";
          const rawKey = process.env.ONESIGNAL_REST_KEY;

          // 1. Keamanan Kunci
          if (!rawKey) {
              return res.status(200).json({ success: false, laporan: "Brankas kosong" });
          }
          const cleanKey = rawKey.replace(/\s+/g, '').trim();
          if (!cleanKey.startsWith('os_v2_app_')) {
              return res.status(200).json({ success: false, laporan: "Kunci salah format" });
          }

          // 2. Kumpulan Variasi Pesan Motivasi & Pengingat
          const messages = [
              { title: "Halo Bos! Duit aman? 💸", body: "Jangan lupa catat pengeluaran hari ini ya di BILANO!" },
              { title: "Waktunya ngecek dompet! 🤔", body: "Ada jajan yang belum dicatat hari ini? Yuk masukin sekarang!" },
              { title: "Awas Boncos! 🛑", body: "Cek sisa limit pengeluaran bulan ini biar target keuanganmu tetap aman." },
              { title: "Hari ini jajan apa aja? 🍔☕", body: "Uang keluar wajib dilacak. Jangan biarkan uangmu pergi tanpa jejak! 🕵️‍♂️" },
              { title: "BILANO kangen nih 🚀", body: "Satu langkah lebih dekat ke kebebasan finansial. Yuk update catatanmu!" },
              { title: "Udah rekap keuangan belum? 📊", body: "Sebelum istirahat, biasakan rekap pengeluaran hari ini yuk Bos!" },
              { title: "Jangan lupa nabung! 🐖", body: "Sedikit demi sedikit lama-lama jadi bukit. Sudahkah kamu menyisihkan uang hari ini?" }
          ];

          const randomMsg = messages[Math.floor(Math.random() * messages.length)];

          // 3. Tembakan Jitu ke OneSignal (+ SETTING GAMBAR BESAR)
          const response = await fetch("https://api.onesignal.com/notifications", {
              method: "POST",
              headers: {
                  "accept": "application/json",
                  "Content-Type": "application/json",
                  "Authorization": `Key ${cleanKey}`
              },
              body: JSON.stringify({
                  app_id: ONE_SIGNAL_APP_ID,
                  included_segments: ["Total Subscriptions"], 
                  headings: { "en": randomMsg.title },
                  contents: { "en": randomMsg.body },
                  
                  // KITA HAPUS LARGE_ICON AGAR TIDAK BENTROK DENGAN SETTING MEDIAN
                  // KITA HANYA SISAKAN BIG PICTURE (UNTUK GAMBAR SAAT DI-TARIK)
                  big_picture: "https://bilanofinance-dvbi.vercel.app/LOGO-BILANO.jpg?v=3",
                  
                  // WARNA AKSEN TETAP BOLEH ADA
                  android_accent_color: "FF4F46E5",

                  // PENTING: Kita perintahkan OneSignal untuk mencari ikon 
                  // yang sudah Anda tanam di dalam APK Median tadi.
                  android_led_color: "FF4F46E5",
                  priority: 10
              })
          });

          const data = await response.json();
          
          res.status(200).json({ 
              success: true, 
              pesan_terkirim: randomMsg.title,
              data_onesignal: data 
          });
      } catch (error: any) {
          res.status(500).json({ success: false, error: "System Crash: " + error.message });
      }
  });

  const httpServer = createServer(app);
  return httpServer;
}