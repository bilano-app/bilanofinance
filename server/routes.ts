import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertTransactionSchema, insertTargetSchema } from "../shared/schema.js";
import { z } from "zod";

// IMPORT AI DARI FILE LAMA ANDA
import Groq from "groq-sdk";
import OpenAI from "openai";

// ============================================================================
// 1. KONFIGURASI AI (DIKEMBALIKAN KE VERSI SOLID ANDA)
// ============================================================================
const groqClient = new Groq({ apiKey: "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" });
const openaiClient = new OpenAI({ apiKey: "ISI_KEY_OPENAI_DISINI_NANTI" });

async function askSmartAI(systemPrompt: string, userMessage: string) {
    try {
        const completion = await groqClient.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3, max_tokens: 1000,
        });
        return completion.choices[0]?.message?.content;
    } catch (error: any) {
        if (error.status === 429 || error.status >= 500) {
            try {
                if (!openaiClient.apiKey || openaiClient.apiKey === "ISI_KEY_OPENAI_DISINI_NANTI") return "Limit AI Habis & Backup belum siap.";
                const completionBackup = await openaiClient.chat.completions.create({
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
                    model: "gpt-3.5-turbo",
                });
                return completionBackup.choices[0]?.message?.content;
            } catch (e) { return "Semua AI Busy."; }
        }
        return "Error AI.";
    }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // --- 2. CACHING RATE (ANTI-LEMOT) ---
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

  // --- HELPER DETEKSI USER ---
  const getUser = async (req: any) => {
    const email = req.headers["x-user-email"];
    if (!email || email === "guest") return await storage.getUser(1); 
    let user = await storage.getUserByUsername(email as string);
    if (!user) user = await storage.createUser({ username: email as string, password: "123", email: email as string });
    return user;
  };

  // =================================================================
  // 🤖 AI CHAT ENDPOINT (MENGGUNAKAN LOGIKA PINTAR LAMA ANDA)
  // =================================================================
  app.post("/api/chat/ask", async (req, res) => {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ reply: "Sesi berakhir. Login dulu ya." });
      
      // Ambil data untuk diberikan ke AI
      const [transactions, target, investments] = await Promise.all([
          storage.getTransactions(user.id), 
          storage.getTarget(user.id), 
          storage.getInvestments(user.id)
      ]);

      const saldoTunai = user.cashBalance || 0;
      const totalInvestasi = investments.reduce((acc, inv) => acc + (inv.quantity * inv.avgPrice * (inv.type === 'saham' || (inv.symbol.length === 4 && inv.type !== 'crypto') ? 100 : 1)), 0);
      const sisaBudget = target && target.monthlyBudget > 0 ? `Rp ${target.monthlyBudget.toLocaleString('id-ID')}` : "Tidak dibatasi";

      // SYSTEM PROMPT: KUNCI KARAKTER & PENGETAHUAN AI
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

      // Panggil fungsi AI lama yang solid
      const reply = await askSmartAI(systemPrompt, req.body.message);
      res.json({ reply });
  });

  // =================================================================
  // API KEUANGAN (FITUR TERBARU)
  // =================================================================

  // --- TRANSAKSI (RUPIAH) ---
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

  // --- VALAS ---
  app.get("/api/forex", async (req, res) => { const user = await getUser(req); res.json(await storage.getForexAssets(user!.id)); });
  app.get("/api/forex/rates", async (req, res) => { res.json(cachedRates); updateRatesBackground(); });
  app.post("/api/forex/transaction", async (req, res) => {
      const user = await getUser(req);
      const { type, currency, amount } = req.body;
      const existing = await storage.getForexByCurrency(user!.id, currency);
      let currentAmount = existing ? existing.amount : 0;
      
      const t = type.toLowerCase();
      const isIncome = t === 'income' || t === 'pemasukan' || t === 'tambah' || t === 'buy' || t === 'in' || t === 'dapat';

      if (isIncome) currentAmount += amount; else currentAmount -= amount;
      if (currentAmount < 0) currentAmount = 0; 
      
      if (existing) await storage.updateForexAsset(existing.id, currentAmount);
      else await storage.createForexAsset(user!.id, { currency, amount: currentAmount });
      res.json({ success: true, newBalance: currentAmount });
  });

  // --- HUTANG PIUTANG ---
  app.get("/api/debts", async (req, res) => { const user = await getUser(req); res.json(await storage.getDebts(user!.id)); });
  app.post("/api/debts", async (req, res) => { 
      const user = await getUser(req); 
      const { type, amount, name, description } = req.body;
      const d = await storage.createDebt(user!.id, req.body); 
      
      let newBalance = user!.cashBalance;
      let txType = '', txCat = '';
      if(type === 'hutang') { newBalance += amount; txType = 'income'; txCat = 'Dapat Pinjaman'; } 
      else { newBalance -= amount; txType = 'expense'; txCat = 'Beri Pinjaman'; }
      
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
          if (debt.type === 'hutang') { newBalance -= debt.amount; await storage.createTransaction(user!.id, { type: 'expense', amount: debt.amount, category: 'Bayar Hutang', description: `Lunas ke ${debt.name}`, date: new Date() }); } 
          else { newBalance += debt.amount; await storage.createTransaction(user!.id, { type: 'income', amount: debt.amount, category: 'Piutang Dibayar', description: `Lunas dari ${debt.name}`, date: new Date() }); }
          await storage.updateUserBalance(user!.id, newBalance);
          await storage.markDebtPaid(id); 
      }
      res.json({ success: true });
  });
  app.delete("/api/debts/:id", async (req, res) => { await storage.deleteDebt(parseInt(req.params.id)); res.json({success:true}); });

  // --- TARGET (SETUP ASSET AWAL) ---
  app.get("/api/target", async (req, res) => { const user = await getUser(req); res.json(await storage.getTarget(user!.id) || {}); });
  app.patch("/api/target/penalty", async (req, res) => { const user = await getUser(req); try { await storage.updateTargetPenalty(user!.id, req.body.amount); res.json({success:true}); } catch(e) { res.status(500).send("Error"); } });
  
  app.post("/api/target", async (req, res) => { 
      const user = await getUser(req); 
      const { 
          addCurrentCash, initialForexList, initialDebts, initialReceivables, initialInvestments, ...targetData 
      } = req.body; 
      
      const target = await storage.setTarget(user!.id, targetData); 
      
      if (addCurrentCash !== undefined) {
          await storage.updateUserBalance(user!.id, addCurrentCash); 
      }
      
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

      if (initialInvestments && Array.isArray(initialInvestments)) {
          for (const item of initialInvestments) {
              if (item.quantity > 0 && item.symbol && item.price > 0) {
                  await storage.createInvestment(user!.id, { 
                      symbol: item.symbol, 
                      quantity: item.quantity, 
                      avgPrice: item.price, 
                      type: item.type || 'saham' 
                  });
              }
          }
      }

      res.json(target); 
  });
  
  // --- INVESTASI ---
  app.get("/api/investments", async (req, res) => { const user = await getUser(req); res.json(await storage.getInvestments(user!.id)); });
  app.post("/api/investments/buy", async (req, res) => { const user = await getUser(req); const { symbol, quantity, price, type } = req.body; const m = (type==='saham'||(symbol.length===4&&type!=='crypto'))?100:1; const total = quantity*price*m; if(user!.cashBalance < total) return res.status(400).json({message:"Saldo kurang"}); await storage.updateUserBalance(user!.id, user!.cashBalance - total); await storage.createTransaction(user!.id, {type:'expense', amount:total, category:'Investasi', description:`Beli ${symbol}`, date:new Date()}); await storage.createInvestment(user!.id, {symbol, quantity, avgPrice:price, type}); res.json({success:true}); });
  app.post("/api/investments/sell", async (req, res) => { const user = await getUser(req); const { symbol, quantity, price, type } = req.body; const m = (type==='saham'||(symbol.length===4&&type!=='crypto'))?100:1; const total = quantity*price*m; await storage.updateUserBalance(user!.id, user!.cashBalance + total); await storage.createTransaction(user!.id, {type:'income', amount:total, category:'Investasi', description:`Jual ${symbol}`, date:new Date()}); const existing = await storage.getInvestmentBySymbol(user!.id, symbol); if(existing) { if(existing.quantity<=quantity) await storage.deleteInvestment(existing.id); else await storage.updateInvestment(existing.id, existing.quantity-quantity, existing.avgPrice); } res.json({success:true}); });

  // --- UTILS ---
  app.get("/api/reports/data", async (req, res) => { const user = await getUser(req); const [tx, inv, debt, fx, sub] = await Promise.all([ storage.getTransactions(user!.id), storage.getInvestments(user!.id), storage.getDebts(user!.id), storage.getForexAssets(user!.id), storage.getSubscriptions(user!.id) ]); res.json({ user, transactions: tx, investments: inv, debts: debt, forexAssets: fx, subscriptions: sub }); });
  app.get("/api/categories", async (req, res) => { const user = await getUser(req); res.json(await storage.getCategories(user!.id)); });
  app.post("/api/categories", async (req, res) => { const user = await getUser(req); await storage.createCategory(user!.id, req.body); res.json({success:true}); });
  app.delete("/api/categories/:id", async (req, res) => { await storage.deleteCategory(parseInt(req.params.id)); res.json({success:true}); });
  app.get("/api/subscriptions", async (req, res) => { const user = await getUser(req); res.json(await storage.getSubscriptions(user!.id)); });
  app.get("/api/user", async (req, res) => { const user = await getUser(req); res.json(user); });
  app.patch("/api/user/profile", async (req, res) => { const user = await getUser(req); await storage.updateUserProfile(user!.id, req.body.firstName, req.body.lastName, req.body.profilePicture); res.json({success:true}); });

// =================================================================
  // 💳 SISTEM PEMBAYARAN MAYAR.ID
  // =================================================================

  // 1. MINTA LINK PEMBAYARAN KE MAYAR
// =================================================================
  // 💳 SISTEM PEMBAYARAN MAYAR.ID (BILANO PRO)
  // =================================================================

  // 1. MINTA LINK PEMBAYARAN KE MAYAR
  app.post("/api/payment/create", async (req, res) => {
      try {
          // Ambil identitas user dari Frontend
          const { name, email, userId } = req.body;

          const amount = 99000; // Harga Diskon BILANO PRO
          const orderId = `BILANO-PRO-${userId || 'GUEST'}-${Date.now()}`;

          // Ambil API Key dari .env
          const apiKey = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZGEzMjVkZS02MDg5LTRhMDYtYTE1ZS0xYTdkOTRmZDQzMTEiLCJhY2NvdW50SWQiOiJiMmE2ZTZhMi0zNzkxLTQyOGYtYTY1YS1kYzFiMDk3MjJjMzIiLCJjcmVhdGVkQXQiOiIxNzcxNjg5MTU1MzM3Iiwicm9sZSI6ImRldmVsb3BlciIsInN1YiI6ImFkcmllbmZhbmRyYTE0QGdtYWlsLmNvbSIsIm5hbWUiOiJFLUJvb2sgIiwibGluayI6ImFkcmllbmZhbmRyYSIsImlzU2VsZkRvbWFpbiI6bnVsbCwiaWF0IjoxNzcxNjg5MTU1fQ.OJz6Ck5TAcGOMfDGRI0xhn8JWOjJtz68I0uKrt6RTspX9_G2b5-ac7-KGQOkDcIAF6ou0yWFnzHk805CFPuIQEq7oLhnMHi93x_8CJ5J2D0LmMtTaEJ0i9PAKT6TxvWKOEaPs2QtYRXHx2BWPvUjNRrCbcyB7MaIoiTW4F-HbQTKMI3b36ii-EUm5rhXPg7RJItGbSa4d2tuX_QIa8EEGUd416nssDRiQJQDAoaEov738-yPbzRkDFu4O-CfWc46t4kDIXoLsMHvBbFZO1oQ-dnVm7VkDKq7eiZz7fe9dPIaQx9he91RpHYsC5qd5T-kzSvro0aBeZdaOvyWHdhO0Q";
          
          if (!apiKey) {
              console.error("API KEY MAYAR KOSONG!");
              return res.status(500).json({ error: "API Key Mayar belum terbaca oleh Server. Coba restart server (Ctrl+C lalu npm run dev)." });
          }

          // Payload standar Mayar.id untuk membuat Payment Link
          const payload = {
              name: name || "Member BILANO",
              email: email || "member@bilano.app",
              amount: amount,
              description: "Langganan BILANO PRO (1 Tahun)",
              reference_id: orderId, 
              redirect_url: "http://localhost:5173", // Dikembalikan ke localhost dulu untuk test
              mobile_number: "081234567890", // Mayar mewajibkan nomor HP, isi dummy dulu
          };

          // Hit (Tembak) ke API Mayar
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
              // Jika ditolak Mayar, kirimkan pesan asli dari Mayar ke layar HP
              console.error("Tolak dari Mayar:", data);
              res.status(500).json({ error: `Pesan Mayar: ${data.message || data.error || 'Ditolak'}` });
          }

      } catch (error: any) {
          console.error("Mayar Create Error API:", error);
          res.status(500).json({ error: "Gagal menghubungi server Mayar. Cek koneksi internet server." });
      }
  });

  // 2. WEBHOOK (PENERIMA NOTIFIKASI OTOMATIS DARI MAYAR)
  app.post("/api/payment/webhook", async (req, res) => {
      try {
          const data = req.body;

          // Cek apakah status pembayarannya sukses
          if (data.status === 'SUCCESS' || data.status === 'PAID') {
              // Extract ID User dari reference_id yang kita buat tadi (Format: BILANO-PRO-{id}-{timestamp})
              const userId = parseInt(data.reference_id.split('-')[2]);
              
              // DI SINI KITA UPDATE DATABASE USER MENJADI PRO!
              console.log(`✅ PEMBAYARAN MAYAR BERHASIL UNTUK USER ID: ${userId}`);
          }

          res.json({ success: true });
      } catch (error) {
          console.error("Webhook Error:", error);
          res.status(500).json({ error: "Webhook Failed" });
      }
  });
  // ==================== AKHIR SISTEM PEMBAYARAN ====================


  const httpServer = createServer(app);
  return httpServer;
}