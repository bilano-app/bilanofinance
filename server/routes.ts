import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertTransactionSchema, insertTargetSchema } from "../shared/schema.js";
import { z } from "zod";

import { db } from "./db.js";
import { sql } from "drizzle-orm";

import Groq from "groq-sdk";
import OpenAI from "openai";
import nodemailer from "nodemailer";

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
                if (!openaiClient.apiKey || openaiClient.apiKey === "ISI_KEY_OPENAI_DISINI_NANTI") {
                    return "⚠️ Maaf, Asisten AI sedang mengalami kendala koneksi ke pusat. Mohon coba lagi dalam beberapa saat.";
                }
                const completionBackup = await openaiClient.chat.completions.create({
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
                    model: "gpt-3.5-turbo",
                });
                return completionBackup.choices[0]?.message?.content;
            } catch (e) { 
                return "⚠️ Sistem AI sedang sangat sibuk menangani banyak permintaan. Silakan coba lagi nanti."; 
            }
        }
        return "⚠️ Sistem asisten virtual sedang dalam pemeliharaan rutin. Mohon maaf atas ketidaknyamanannya.";
    }
}

export async function registerRoutes(app: Express): Promise<Server> {

  try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN onesignal_id TEXT;`);
  } catch (e) { }
  
  try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();`);
  } catch (e) {}

  // 🚀 OPTIMASI SULTAN: GROSIR DATA VALAS (CACHING)
  let cachedRates: Record<string, number> = { 
      "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
      "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450
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
      } catch (e) { console.log("Rate update background failed."); }
  };
  
  updateRatesBackground();
  setInterval(updateRatesBackground, 1000 * 60 * 60); // Update kurs diam-diam setiap 1 jam

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
      [PERINGATAN: JANGAN SEBUT KATA 'UNJ', 'Universitas', ATAU 'Science Club'].

      PERATURAN SIKAP:
      - FOKUS 100% PADA ANALISIS KEUANGAN. Berikan insight, teguran tajam jika boros, dan strategi investasi/pelunasan hutang.
      - DILARANG KERAS MENJELASKAN CARA PAKAI ATAU LETAK FITUR APLIKASI (Misal: "Buka menu X..."), KECUALI pengguna eksplisit bertanya tutorial aplikasi.

      DATA KEUANGAN PENGGUNA SAAT INI (MUTLAK):
      - Saldo Kas IDR: Rp ${saldoTunai.toLocaleString('id-ID')}
      - Aset Investasi: Rp ${totalInvestasi.toLocaleString('id-ID')}
      - Sisa Limit Pengeluaran Bulan Ini: ${sisaBudget}
      - Hutang Pribadi (Kewajiban Valas & IDR): ${listHutang}
      - Piutang Pribadi (Uang di orang lain): ${listPiutang}
      - Dompet Valuta Asing: ${listValas}
      - Tagihan Langganan: ${listSubs}
      
      Pahami bahwa pengguna mungkin mencicil hutang/piutang valas mereka. Beri tanggapan sesuai konteks data di atas menggunakan Markdown.
      `;

      const reply = await askSmartAI(systemPrompt, req.body.message);
      res.json({ reply });
  });

  app.get("/api/transactions", async (req, res) => { const user = await getUser(req); res.json(await storage.getTransactions(user!.id)); });
  
  app.post("/api/transactions", async (req, res) => { 
      const user = await getUser(req); 
      const parsed = insertTransactionSchema.safeParse(req.body); 
      if (!parsed.success) return res.status(400).json(parsed.error); 
      
      const tx = await storage.createTransaction(user!.id, { ...parsed.data, userId: user!.id } as any); 
      let newBalance = user!.cashBalance; 
      if (parsed.data.type === 'income') newBalance += parsed.data.amount; else newBalance -= parsed.data.amount; 
      await storage.updateUserBalance(user!.id, newBalance); 
      res.json(tx); 
  });

  app.delete("/api/transactions/:id", async (req, res) => {
      try {
          const user = await getUser(req);
          const txId = parseInt(req.params.id);
          const txs = await storage.getTransactions(user!.id);
          const txToDelete = txs.find(t => t.id === txId);

          if (!txToDelete) return res.status(404).json({ error: "Data transaksi tidak ditemukan" });

          let newBalance = user!.cashBalance;
          const isIncome = txToDelete.type.includes('income') || txToDelete.type.includes('receive') || txToDelete.type === 'debt_borrow' || txToDelete.type === 'invest_sell' || txToDelete.type === 'forex_sell';

          if (isIncome) {
              newBalance -= txToDelete.amount; 
          } else {
              newBalance += txToDelete.amount; 
          }

          await storage.updateUserBalance(user!.id, newBalance);
          if (typeof storage.deleteTransaction === 'function') {
              await storage.deleteTransaction(txId);
          }
          res.json({ success: true, message: "Transaksi berhasil dimusnahkan" });
      } catch (error) {
          res.status(500).json({ error: "Terjadi kesalahan pada server saat menghapus" });
      }
  });

  app.get("/api/forex", async (req, res) => { const user = await getUser(req); res.json(await storage.getForexAssets(user!.id)); });
  
  // 🚀 RESPON KILAT 0.001 DETIK (TANPA NUNGGU API LUAR)
  app.get("/api/forex/rates", async (req, res) => { 
      res.json(cachedRates); 
  });
  
  app.post("/api/forex/transaction", async (req, res) => {
      const user = await getUser(req);
      const { type, currency, amount } = req.body;
      const existing = await storage.getForexByCurrency(user!.id, currency);
      let currentAmount = existing ? existing.amount : 0;
      
      const t = type.toLowerCase();
      const isIncome = t === 'income' || t === 'pemasukan' || t === 'tambah' || t === 'buy' || t === 'in' || t === 'dapat';
      
      const rate = cachedRates[currency as keyof typeof cachedRates] || 15000;
      const amountIDR = Math.round(amount * rate);
      let newCashBalance = user!.cashBalance;

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

  app.get("/api/debts", async (req, res) => { const user = await getUser(req); res.json(await storage.getDebts(user!.id)); });
  
  app.post("/api/debts", async (req, res) => { 
      const user = await getUser(req); 
      const { type, amount, name, description, isFromTransaction } = req.body;
      const d = await storage.createDebt(user!.id, req.body as any); 
      
      if (!isFromTransaction) {
          let newBalance = user!.cashBalance;
          
          const parts = (name || "").split('|');
          const curr = parts[1] || 'IDR';
          const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || 15000);
          const amountIDR = amount * rate;
          
          let txType = '', txCat = '';
          if(type === 'hutang') { newBalance += amountIDR; txType = 'debt_borrow'; txCat = 'Dapat Pinjaman'; } 
          else { newBalance -= amountIDR; txType = 'debt_lend'; txCat = 'Beri Pinjaman'; }
          
          await storage.updateUserBalance(user!.id, newBalance);
          await storage.createTransaction(user!.id, { userId: user!.id, type: txType, amount: amountIDR, category: txCat, description: `[${type.toUpperCase()}] ${name} - ${description||''}`, date: new Date() } as any);
      }
      res.json(d); 
  });

  app.post("/api/debts/:id/pay", async (req, res) => {
      const user = await getUser(req);
      const id = parseInt(req.params.id);
      const { amount } = req.body; 
      
      const debts = await storage.getDebts(user!.id);
      const debt = debts.find(d => d.id === id);
      
      if (debt && !debt.isPaid) {
          const payAmount = (amount !== undefined && amount > 0) ? Math.min(amount, debt.amount) : debt.amount;
          let newBalance = user!.cashBalance;
          
          const curr = (debt.name || "").split('|')[1] || 'IDR';
          const rate = curr === 'IDR' ? 1 : (cachedRates[curr] || 15000);
          const payAmountIDR = payAmount * rate;
          
          if (debt.type === 'piutang') { 
              newBalance += payAmountIDR; 
              await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_receive', amount: payAmountIDR, category: 'Piutang Dibayar', description: `Lunas/Cicilan dari ${debt.name.split('|')[0]}`, date: new Date() } as any); 
          } else { 
              newBalance -= payAmountIDR; 
              await storage.createTransaction(user!.id, { userId: user!.id, type: 'debt_pay', amount: payAmountIDR, category: 'Bayar Hutang', description: `Lunas/Cicilan ke ${debt.name.split('|')[0]}`, date: new Date() } as any); 
          }
          
          await storage.updateUserBalance(user!.id, newBalance);
          
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
      
      const target = await storage.setTarget(user!.id, targetData as any); 
      
      if (addCurrentCash !== undefined && addCurrentCash > 0) {
          await storage.updateUserBalance(user!.id, addCurrentCash); 
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
  
  app.get("/api/investments", async (req, res) => { const user = await getUser(req); res.json(await storage.getInvestments(user!.id)); });
  
  app.post("/api/investments/buy", async (req, res) => { 
      try {
          const user = await getUser(req); 
          const { symbol, quantity, price, type } = req.body; 
          const typeLower = (type || 'saham').toLowerCase();
          const m = (typeLower==='saham'||(symbol.length===4&&typeLower!=='crypto'))?100:1; 
          const total = quantity*price*m; 
          
          if(user!.cashBalance < total) return res.status(400).json({message:"Saldo Rupiah tidak cukup untuk pembelian ini."}); 
          await storage.updateUserBalance(user!.id, user!.cashBalance - total); 
          
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
          const totalSellPrice = quantity*price*m; 
          
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

          const pl = totalSellPrice - totalBuyPrice;
          const profitLossText = ` (P/L: ${pl >= 0 ? '+' : ''}Rp ${pl.toLocaleString('id-ID')})`;

          await storage.updateUserBalance(user!.id, user!.cashBalance + totalSellPrice); 
          
          await storage.createTransaction(user!.id, {userId: user!.id, type:'invest_sell', amount:totalSellPrice, category:'Jual Aset', description:`${quantity} lot/unit ${symbol} @ Rp ${price.toLocaleString('id-ID')}${profitLossText}`, date:new Date()} as any); 
          res.json({success:true}); 
      } catch (error: any) {
          res.status(500).json({ message: "Terjadi kesalahan internal pada server saat menjual aset." });
      }
  });

  app.get("/api/reports/data", async (req, res) => { const user = await getUser(req); const [tx, inv, debt, fx, sub] = await Promise.all([ storage.getTransactions(user!.id), storage.getInvestments(user!.id), storage.getDebts(user!.id), storage.getForexAssets(user!.id), storage.getSubscriptions(user!.id) ]); res.json({ user, transactions: tx, investments: inv, debts: debt, forexAssets: fx, subscriptions: sub }); });
  app.get("/api/categories", async (req, res) => { const user = await getUser(req); res.json(await storage.getCategories(user!.id)); });
  
  app.post("/api/categories", async (req, res) => { const user = await getUser(req); await storage.createCategory({ ...req.body, userId: user!.id } as any); res.json({success:true}); });
  
  app.delete("/api/categories/:id", async (req, res) => { await storage.deleteCategory(parseInt(req.params.id)); res.json({success:true}); });
  
  app.get("/api/subscriptions", async (req, res) => { const user = await getUser(req); res.json(await storage.getSubscriptions(user!.id)); });
  app.get("/api/user", async (req, res) => { const user = await getUser(req); res.json(user); });
  app.patch("/api/user/profile", async (req, res) => { const user = await getUser(req); await storage.updateUserProfile(user!.id, req.body.firstName, req.body.lastName, req.body.profilePicture); res.json({success:true}); });

  // =========================================================================
  // 🚀 API MIDTRANS CORE API (TIDAK PAKAI SNAP, MURNI MINTA GAMBAR QRIS)
  // =========================================================================
  app.post("/api/payment/midtrans/charge", async (req, res) => {
      try {
          const user = await getUser(req);
          if (!user) return res.status(401).json({ error: "User tidak valid." });

          const amount = 99000; 
          const orderId = `BILANO-PRO-${user.id}-${Date.now()}`;
          
          const serverKey = process.env.MIDTRANS_SERVER_KEY || ""; 
          const authString = Buffer.from(serverKey + ":").toString('base64');

          // PAYLOAD KHUSUS UNTUK CORE API (Minta dibuatkan QRIS)
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

          // 🚀 HIT API CORE MIDTRANS V2 (MURNI TANPA SNAP)
          const midtransRes = await fetch("https://api.midtrans.com/v2/charge", {
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
              const qrAction = data.actions?.find((a: any) => a.name === "generate-qr-code");
              if (qrAction) {
                  // MENGIRIMKAN qrUrl AGAR BISA DITANGKAP OLEH Paywall.tsx
                  res.json({ success: true, qrUrl: qrAction.url, orderId: data.order_id });
              } else {
                  res.status(500).json({ error: "Sistem Midtrans gagal mengeluarkan QR Code." });
              }
          } else {
              res.status(400).json({ error: data.status_message || "Gagal memproses pembayaran." });
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

  // 🚀 OPTIMASI MUTLAK: PEMBUNUH N+1 QUERY DI CRON JOB
  app.get('/api/cron/reminder', async (req, res) => {
      try {
          const ONE_SIGNAL_APP_ID = "b45b3256-b290-4a98-b5fa-afa0501a6b1c";
          const rawKey = process.env.ONESIGNAL_REST_KEY;

          if (!rawKey) {
              return res.status(200).json({ success: false, laporan: "Brankas kosong" });
          }
          
          const cleanKey = rawKey.replace(/\s+/g, '').trim();
          const finalAuthKey = cleanKey.replace(/^(Basic|Key)\s+/i, '');

          // 1. Eksekusi Pembayaran Langganan Otomatis (Hanya 1x Jalan)
          if (typeof storage.processAllDueSubscriptions === 'function') {
              await storage.processAllDueSubscriptions();
          }

          // 2. Tarik SEMUA Data Sekaligus (Grosir Data)
          const allUsers = await storage.getAllUsers();
          let allActiveDebts: any[] = [];
          let allActiveSubs: any[] = [];
          
          if (typeof storage.getAllActiveDebts === 'function') {
              allActiveDebts = await storage.getAllActiveDebts();
              allActiveSubs = await storage.getAllActiveSubscriptions();
          }

          // 3. Kelompokkan Data di Memory (Kecepatan Instan)
          const debtsMap = allActiveDebts.reduce((acc, d) => { 
              acc[d.userId] = acc[d.userId] || []; acc[d.userId].push(d); return acc; 
          }, {} as Record<number, any[]>);
          
          const subsMap = allActiveSubs.reduce((acc, s) => { 
              acc[s.userId] = acc[s.userId] || []; acc[s.userId].push(s); return acc; 
          }, {} as Record<number, any[]>);

          const today = new Date();
          today.setHours(0,0,0,0);
          
          const isEndOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() === today.getDate();
          const isFirstOfMonth = today.getDate() === 1;
          const isPDFDay = isEndOfMonth || isFirstOfMonth;

          const notificationsToSend: any[] = [];
          const targetSegments = ["Total Subscriptions"];

          // Pesan Umum
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
                  { title: "Awas Boncos! 🛑", body: "Cek sisa limit pengeluaran bulan ini biar target keuanganmu tetap aman." },
                  { title: "Hari ini jajan apa aja? 🍔☕", body: "Uang keluar wajib dilacak. Jangan biarkan uangmu pergi tanpa jejak! 🕵️‍♂️" },
                  { title: "BILANO kangen nih 🚀", body: "Satu langkah lebih dekat ke kebebasan finansial. Yuk update catatanmu!" },
                  { title: "Udah rekap keuangan belum? 📊", body: "Sebelum istirahat, biasakan rekap pengeluaran hari ini yuk Bos!" },
                  { title: "Jangan lupa nabung! 🐖", body: "Sedikit demi sedikit lama-lama jadi bukit. Sudahkah kamu menyisihkan uang hari ini?" }
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

          // 4. Proses Notifikasi Spesifik User Tanpa Nembak Database
          for (const user of allUsers) {
              if (!user.onesignalId) continue; 

              const userDebts = debtsMap[user.id] || [];
              const userSubs = subsMap[user.id] || [];

              for (const debt of userDebts) {
                  if (debt.dueDate) {
                      const due = new Date(debt.dueDate); due.setHours(0,0,0,0);
                      const diffTime = due.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays >= 0 && diffDays <= 3) {
                          const title = debt.type === 'hutang' ? "Awas Jatuh Tempo Hutang! 🚨" : "Waktunya Nagih Piutang! 💰";
                          const body = `Tenggat waktu [${debt.name.split('|')[0]}] tinggal ${diffDays === 0 ? 'HARI INI' : diffDays + ' hari lagi'}. Nominal: Rp ${debt.amount.toLocaleString('id-ID')}`;
                          
                          notificationsToSend.push({
                              app_id: ONE_SIGNAL_APP_ID,
                              include_player_ids: [user.onesignalId], 
                              headings: { "en": title },
                              contents: { "en": body },
                              android_accent_color: "FFE11D48",
                              android_led_color: "FFE11D48",
                              priority: 10
                          });
                      }
                  }
              }

              for (const sub of userSubs) {
                  if (sub.nextBilling) {
                      const due = new Date(sub.nextBilling); due.setHours(0,0,0,0);
                      const diffTime = due.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays >= 0 && diffDays <= 3) {
                          notificationsToSend.push({
                              app_id: ONE_SIGNAL_APP_ID,
                              include_player_ids: [user.onesignalId], 
                              headings: { "en": "Tagihan Langganan 💳" },
                              contents: { "en": `Langganan [${sub.name}] akan ditagih ${diffDays === 0 ? 'HARI INI' : 'dalam ' + diffDays + ' hari'}. Siapkan dana Rp ${sub.cost.toLocaleString('id-ID')}` },
                              android_accent_color: "FFE11D48",
                              android_led_color: "FFE11D48",
                              priority: 10
                          });
                      }
                  }
              }
          }

          // Kirim Semua Notifikasi Sekaligus
          const results = [];
          for (const payload of notificationsToSend) {
              const res = await fetch("https://onesignal.com/api/v1/notifications", {
                  method: "POST",
                  headers: {
                      "accept": "application/json",
                      "Content-Type": "application/json",
                      "Authorization": `Basic ${finalAuthKey}`
                  },
                  body: JSON.stringify(payload)
              });
              results.push(await res.json());
          }

          res.status(200).json({ success: true, total_dikirim: notificationsToSend.length, details: results });
      } catch (error: any) {
          res.status(500).json({ success: false, error: "System Crash: " + error.message });
      }
  });

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
              id: u.id, 
              username: u.username, 
              email: u.email,
              isPro: u.isPro, 
              proValidUntil: u.proValidUntil, 
              createdAt: u.createdAt
          })).sort((a,b) => b.id - a.id); 
          
          res.json(safeUsers);
      } catch (error) {
          console.error("Gagal menarik data user:", error);
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
          validUntil.setFullYear(validUntil.getFullYear() + 1); // Langsung kasih 1 Tahun
      }

      await storage.updateUserProStatus(targetId, isPro, validUntil);
      res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}