import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card, Button } from "@/components/UIComponents";
import { useUser, useTransactions, useTarget, useInvestments } from "@/hooks/use-finance"; 
import { formatCurrency } from "@/lib/utils";
import { 
  Target, AlertCircle, CalendarClock, ArrowDownCircle, ArrowUpCircle, 
  ChevronDown, ChevronUp, Trophy, RefreshCcw, Loader2, Crown, 
  ShieldCheck, ChevronRight, X, CreditCard, Briefcase, TrendingUp, Trash2, 
  HeartHandshake, Activity, Zap, ShieldAlert, PieChart, HelpCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/tracking";

const DEFAULT_RATES: Record<string, number> = {
    "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
    "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
};

export default function Performance() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isCharging, setIsCharging] = useState(false);
  const [isDeletingTx, setIsDeletingTx] = useState(false);
  const [expandedDetail, setExpandedDetail] = useState<'income' | 'expense' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  const { data: transactions, isLoading: isTxLoading } = useTransactions();
  const { data: target, isLoading: isTargetLoading } = useTarget();
  const { data: investments, isLoading: isInvLoading } = useInvestments(); 

  const { data: forexRates = {}, isLoading: isRatesLoading } = useQuery({
      queryKey: ['forexRates', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: forexAssetsData = [], isLoading: isForexLoading } = useQuery({
      queryKey: ['forexAssets', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: debtsData = [], isLoading: isDebtsLoading } = useQuery({
      queryKey: ['debts', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/debts`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: retainedData = [], isLoading: isRetainedLoading } = useQuery({
      queryKey: ['retained', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/retained`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const isPro = user?.isPro || localStorage.getItem("bilano_pro") === "true";
  const startTime = new Date(user?.createdAt || Date.now()).getTime();
  const daysPassed = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
  const isTrialExpired = daysPassed >= 3;
  const locked = !isUserLoading && !isPro && isTrialExpired;

  const handleLanjutBayar = async () => {
      if (!currentUserEmail) { toast({ title: "Email required", variant: "destructive" }); return; }
      setIsCharging(true);
      try {
          const res = await fetch("/api/payment/mayar/charge", { 
              method: "POST", 
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ plan: selectedPlan }) 
          });
          const data = await res.json();
          if (res.ok && data.redirectUrl) {
              window.location.href = data.redirectUrl; 
          } else { 
              toast({ title: "Gagal memuat kasir", description: data.error || "Coba lagi nanti.", variant: "destructive" }); 
          }
      } catch (error) { 
          toast({ title: "Error koneksi", variant: "destructive" }); 
      } finally { 
          setIsCharging(false); 
      }
  };

  useEffect(() => {
      if (!isUserLoading) {
          trackEvent("portfolio_viewed", { module: "performance_dashboard" }); 
      }
  }, [isUserLoading]);

  const handleDeleteTransaction = async (id: number) => {
      if (!confirm("Hapus transaksi ini? Saldo Kas Anda akan otomatis disesuaikan kembali.")) return;
      setIsDeletingTx(true);
      toast({ title: "Menghapus...", description: "Menyesuaikan saldo kas Anda." });
      try {
          const res = await fetch(`/api/transactions/${id}`, { method: "DELETE", headers: { "x-user-email": currentUserEmail } });
          if (res.ok) {
              toast({ title: "Terhapus!", description: "Transaksi hilang, saldo kas dinormalkan." });
              setTimeout(() => window.location.reload(), 800); 
          } else { toast({ title: "Gagal menghapus", variant: "destructive" }); }
      } catch (e) { toast({ title: "Error server", variant: "destructive" }); } 
      finally { setIsDeletingTx(false); }
  };

  if (isUserLoading || isTxLoading || isTargetLoading || isInvLoading || isRatesLoading || isForexLoading || isDebtsLoading || isRetainedLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span>Memuat Data Analitik...</span>
              </div>
          </div>
      );
  }

  if (locked) {
      // Pembatasan Paywall bawaan dipertahankan sepenuhnya
      return (
          <MobileLayout title="Analisa Performa" showBack>
              <div className="relative min-h-screen bg-slate-50 overflow-hidden pb-24 overflow-y-auto">
                  <div className="p-4 space-y-6 blur-md opacity-40 select-none pointer-events-none mt-2">
                      <div className="bg-gradient-to-br from-blue-600 to-violet-800 h-48 rounded-[32px] w-full shadow-lg"></div>
                      <div className="bg-emerald-100 h-28 rounded-[32px] w-full"></div>
                      <div className="bg-white h-72 rounded-[32px] shadow-sm border border-slate-200 w-full"></div>
                  </div>
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center px-4 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(251,191,36,0.4)] animate-bounce-slow mt-8">
                          <Crown className="w-10 h-10 text-amber-950" />
                      </div>
                      <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Masa Coba Habis</h2>
                      <p className="text-sm text-slate-600 mb-6 max-w-xs leading-relaxed font-medium">
                          Masa coba gratis 3 hari telah berakhir. Berlangganan <b className="text-slate-800">BILANO PRO</b> sekarang untuk membuka kembali Analisis Cashflow, ROI Aset, dan Diagnosa Target Finansial.
                      </p>
                      <div className="w-full max-w-sm space-y-3 mb-6 animate-in zoom-in-95">
                          <div onClick={() => setSelectedPlan('yearly')} className={`relative p-5 rounded-[20px] border-2 cursor-pointer transition-all overflow-hidden ${selectedPlan === 'yearly' ? 'border-amber-400 bg-gradient-to-br from-slate-900 to-indigo-950 shadow-xl' : 'border-slate-200 bg-white'}`}>
                              {selectedPlan === 'yearly' && <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl z-10 shadow-sm">PALING HEMAT</div>}
                              <div className="flex justify-between items-center mb-1 relative z-10">
                                  <h4 className={`font-black text-lg ${selectedPlan === 'yearly' ? 'text-amber-400' : 'text-slate-800'}`}>Paket 1 Tahun</h4>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-amber-400 bg-amber-400' : 'border-slate-300'}`}>{selectedPlan === 'yearly' && <div className="w-2 h-2 bg-amber-900 rounded-full"></div>}</div>
                              </div>
                              <div className="relative z-10 text-left">
                                  <p className={`text-3xl font-black tracking-tight ${selectedPlan === 'yearly' ? 'text-white' : 'text-slate-800'}`}>Rp 8.250 <span className="text-xs font-bold opacity-60">/ bulan</span></p>
                                  {selectedPlan === 'yearly' && <p className="text-[10px] text-emerald-400 mt-1 font-bold">Total tagihan Rp 99.000/tahun</p>}
                              </div>
                          </div>
                          <div onClick={() => setSelectedPlan('monthly')} className={`p-4 rounded-[20px] border-2 cursor-pointer transition-all text-left ${selectedPlan === 'monthly' ? 'border-indigo-500 bg-indigo-50/50 shadow-md' : 'border-slate-200 bg-white'}`}>
                              <div className="flex justify-between items-center mb-1">
                                  <h4 className="font-extrabold text-slate-800 text-base">Paket 1 Bulan</h4>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>{selectedPlan === 'monthly' && <div className="w-2 h-2 bg-white rounded-full"></div>}</div>
                              </div>
                              <p className="text-2xl font-black text-slate-800">Rp 14.900 <span className="text-xs font-bold text-slate-400">/ bulan</span></p>
                          </div>
                      </div>
                      <Button onClick={handleLanjutBayar} disabled={isCharging} className="w-full max-w-sm h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full shadow-2xl flex items-center justify-center gap-2 transition-transform active:scale-95">
                          {isCharging ? <Loader2 className="w-5 h-5 animate-spin"/> : "LANJUTKAN PEMBAYARAN"}
                      </Button>
                      <p className="mt-4 text-[10px] text-slate-400 font-medium flex items-center gap-1.5 pb-8"><ShieldCheck className="w-4 h-4 text-emerald-500"/> Pembayaran Aman & Otomatis oleh Mayar</p>
                  </div>
              </div>
          </MobileLayout>
      );
  }

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const monthProgressPercent = Math.min(100, (currentDay / daysInMonth) * 100);

  const cashReal = (user?.cashBalance || 0); 
  
  const forexValue = Array.isArray(forexAssetsData) ? forexAssetsData.reduce((acc: number, asset: any) => {
      const curr = asset.currency;
      const rate = forexRates[curr] || DEFAULT_RATES[curr] || 15000;
      return acc + (asset.amount * rate);
  }, 0) : 0;

  const investmentReal = Array.isArray(investments) ? investments.reduce((acc, inv) => {
      const parts = (inv.symbol || "").split('|');
      const sym = parts[0] || "";
      const curr = parts[1];
      const actualCurr = curr || 'IDR';
      const rate = actualCurr === 'IDR' ? 1 : (forexRates[actualCurr] || DEFAULT_RATES[actualCurr] || 15000);
      const isSaham = inv.type === 'saham' || (!inv.type && sym.length === 4 && inv.type !== 'crypto');
      const m = (isSaham && actualCurr === 'IDR') ? 100 : 1;
      return acc + (inv.quantity * inv.avgPrice * m * rate);
  }, 0) : 0;

  const retainedReal = Array.isArray(retainedData) ? retainedData.reduce((acc: number, r: any) => {
      const curr = r.currency;
      const rate = curr === 'IDR' ? 1 : (forexRates[curr] || DEFAULT_RATES[curr] || 15000);
      return acc + (r.amount * rate);
  }, 0) : 0;

  let piutangReal = 0;
  let hutangReal = 0;
  
  if (Array.isArray(debtsData)) {
      debtsData.forEach((d: any) => {
          if (d.isPaid) return;
          const [, curr] = (d.name || "").split('|');
          const actualCurr = curr || 'IDR';
          const rate = actualCurr === 'IDR' ? 1 : (forexRates[actualCurr] || DEFAULT_RATES[actualCurr] || 15000);
          if (d.type === 'piutang') piutangReal += (d.amount * rate);
          else if (d.type === 'hutang') hutangReal += (d.amount * rate);
      });
  }

  const currentWealth = cashReal + investmentReal + forexValue + retainedReal + piutangReal - hutangReal;
  const allTimeTx = Array.isArray(transactions) ? transactions : [];
  
  let totalCuanJual = 0;
  let totalModalTerpakai = 0;

  allTimeTx.filter(t => t.type === 'invest_sell' || t.type === 'forex_sell').forEach(t => {
      if (t.description && t.description.includes('P/L:')) {
          const plString = t.description.split('P/L:')[1];
          if (plString) {
              let rate = 1;
              let curr = 'IDR';
              if (t.type === 'invest_sell') {
                  const match = t.description.match(/lot\/unit\s+([A-Z0-9|]+)/i);
                  if (match) curr = match[1].split('|')[1] || 'IDR';
              } else if (t.type === 'forex_sell') {
                  const fMatch = t.description.match(/(USD|EUR|SGD|JPY|AUD|GBP|MYR|SAR|KRW|THB)/i);
                  if (fMatch) curr = fMatch[1].toUpperCase();
              }
              const isAlreadyIdr = plString.includes('Rp') || plString.includes('IDR');
              if (curr && curr !== 'IDR' && !isAlreadyIdr) {
                  rate = forexRates[curr] || DEFAULT_RATES[curr] || 15000;
              }
              let plValue = 0;
              if (isAlreadyIdr || rate === 1) {
                  plValue = parseInt(plString.replace(/[^0-9-]/g, ''), 10);
              } else {
                  const cleanFloat = plString.replace(/[^0-9.-]/g, '');
                  plValue = parseFloat(cleanFloat);
                  if (Math.abs(plValue * rate) > (t.amount * 5) && !cleanFloat.includes('.')) {
                      plValue = plValue / 10;
                  }
              }
              if (!isNaN(plValue)) {
                  const actualPl = plValue * rate; 
                  const actualAmt = t.amount; 
                  totalCuanJual += actualPl;
                  totalModalTerpakai += (actualAmt - actualPl); 
              }
          }
      }
  });

  const roiPercentage = totalModalTerpakai > 0 ? (totalCuanJual / totalModalTerpakai) * 100 : 0;
  const assetAlocationRatio = currentWealth > 0 ? ((investmentReal + forexValue + retainedReal) / currentWealth) * 100 : 0;

  let targetIncomeMonth = 0;
  let savingRequired = 0;
  let expenseLimit = 0;
  let monthsRemaining = 1; 
  let progressPercent = 0;
  let gap = 0;
  let isPeriodEnded = false;
  let isTargetAchieved = false;

  const hasValidTarget = target && (target.targetAmount > 0 || target.monthlyBudget > 0);

  if (hasValidTarget && target.targetAmount > 0) {
      const targetGoal = target.targetAmount;
      expenseLimit = (target.monthlyBudget || 0);
      const startM = target.startMonth || (currentMonthIdx + 1);
      const startY = target.startYear || currentYear;
      const duration = target.durationMonths || 12;
      const startTotalMonths = (startY * 12) + startM;
      const currentTotalMonths = (currentYear * 12) + (currentMonthIdx + 1);
      const monthsPassed = Math.max(0, currentTotalMonths - startTotalMonths);
      
      monthsRemaining = Math.max(1, duration - monthsPassed);
      gap = Math.max(0, targetGoal - currentWealth);
      savingRequired = Math.ceil(gap / monthsRemaining);
      targetIncomeMonth = savingRequired + expenseLimit;
      progressPercent = Math.min(100, Math.max(0, (currentWealth / targetGoal) * 100));

      if (monthsPassed >= duration) {
          isPeriodEnded = true;
          isTargetAchieved = currentWealth >= targetGoal;
      }
  } else if (hasValidTarget && target.monthlyBudget > 0) {
      expenseLimit = target.monthlyBudget;
  }

  const thisMonthTx = allTimeTx.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  });

  const totalAmal = thisMonthTx.filter(t => t.category === 'Amal').reduce((acc, t) => acc + t.amount, 0);

  const baseIncomeTxs = thisMonthTx.filter(t => 
      (t.type === 'income' || t.type === 'piutang_record') && 
      !t.description?.includes('[Offset') && 
      !t.description?.includes('[WRITE_OFF]') && 
      !t.description?.includes('[Catat Awal]') && 
      !t.description?.includes('[Valas Masuk') && 
      t.category !== 'Penyesuaian Sistem' && 
      t.category !== 'Sistem: Auto-Fix Valas' &&
      t.category !== 'Sistem: Auto-Fix Valas v2' &&
      t.category !== 'Pemutihan Hutang' &&
      t.category !== 'Beli Aset Valas' &&
      t.category !== 'Jual Aset Valas' &&
      !(t.category || '').includes('Piutang Dibayar') &&
      !(t.category || '').includes('Dapat Pinjaman')
  );
  
  const baseExpenseTxs = thisMonthTx.filter(t => 
      (t.type === 'expense' || t.type === 'hutang_record') && 
      !(t.category || '').toLowerCase().includes('invest') && 
      !t.description?.includes('[Offset') && 
      !t.description?.includes('[WRITE_OFF]') && 
      !t.description?.includes('[Catat Awal]') && 
      !t.description?.includes('[Valas Keluar') && 
      t.category !== 'Penyesuaian Sistem' && 
      t.category !== 'Sistem: Auto-Fix Valas' &&
      t.category !== 'Sistem: Auto-Fix Valas v2' &&
      t.category !== 'Penghapusan Piutang' &&
      t.category !== 'Beli Aset Valas' &&
      t.category !== 'Jual Aset Valas' &&
      t.category !== 'Amal' && 
      !(t.category || '').includes('Bayar Hutang') &&
      !(t.category || '').includes('Beri Pinjaman')
  );

  const virtualPLTxs: any[] = [];
  thisMonthTx.filter(t => t.type === 'invest_sell' || t.type === 'forex_sell').forEach(t => {
      if (t.description && t.description.includes('P/L:')) {
          const plString = t.description.split('P/L:')[1];
          if (plString) {
              let rate = 1;
              let curr = 'IDR';
              if (t.type === 'invest_sell') {
                  const match = t.description.match(/lot\/unit\s+([A-Z0-9|]+)/i);
                  if (match) curr = match[1].split('|')[1] || 'IDR';
              } else if (t.type === 'forex_sell') {
                  const fMatch = t.description.match(/(USD|EUR|SGD|JPY|AUD|GBP|MYR|SAR|KRW|THB)/i);
                  if (fMatch) curr = fMatch[1].toUpperCase();
              }
              const isAlreadyIdr = plString.includes('Rp') || plString.includes('IDR');
              if (curr && curr !== 'IDR' && !isAlreadyIdr) {
                  rate = forexRates[curr] || DEFAULT_RATES[curr] || 15000;
              }
              let plValue = 0;
              if (isAlreadyIdr || rate === 1) {
                  plValue = parseInt(plString.replace(/[^0-9-]/g, ''), 10);
              } else {
                  const cleanFloat = plString.replace(/[^0-9.-]/g, '');
                  plValue = parseFloat(cleanFloat);
                  if (Math.abs(plValue * rate) > (t.amount * 5) && !cleanFloat.includes('.')) {
                      plValue = plValue / 10;
                  }
              }
              if (!isNaN(plValue) && plValue !== 0) {
                  const convertedPlValue = Math.round(plValue * rate);
                  virtualPLTxs.push({
                      ...t, 
                      type: convertedPlValue > 0 ? 'income' : 'expense',
                      amount: Math.abs(convertedPlValue),
                      category: convertedPlValue > 0 ? (t.type === 'forex_sell' ? 'Profit Valas' : 'Profit Investasi') : (t.type === 'forex_sell' ? 'Rugi Valas' : 'Rugi Investasi'),
                      description: `Realisasi: ${t.description.split('@')[0].trim()}`
                  });
              }
          }
      }
  });

  const allIncomeTxs = [...baseIncomeTxs, ...virtualPLTxs.filter(v => v.type === 'income')];
  const allExpenseTxs = [...baseExpenseTxs, ...virtualPLTxs.filter(v => v.type === 'expense')];

  const monthlyIncome = allIncomeTxs.reduce((acc, t) => acc + t.amount, 0); 
  const monthlyExpense = allExpenseTxs.reduce((acc, t) => acc + t.amount, 0); 
  
  const pureExpenses = baseExpenseTxs.reduce((acc, t) => acc + t.amount, 0);
  const monthlyBudget = target?.monthlyBudget || 0;
  const isOverBudgetStrict = monthlyBudget > 0 && pureExpenses > monthlyBudget;
  const remainingBudget = Math.max(0, monthlyBudget - pureExpenses);
  const budgetPercentage = monthlyBudget > 0 ? Math.min(100, (pureExpenses / monthlyBudget) * 100) : 0;
    
  const monthlyNet = monthlyIncome - monthlyExpense;
  const isSafe = monthlyNet >= savingRequired; 
  const isOverBudget = expenseLimit > 0 && monthlyExpense > expenseLimit;

  // =========================================================================
  // 📈 LOGIKA BARU: CASHFLOW DIAGNOSTICS & ENGINE WAWASAN DINAMIS
  // =========================================================================
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
  const dailyBurnRate = currentDay > 0 ? pureExpenses / currentDay : 0;
  const projectedExpense = dailyBurnRate * daysInMonth;
  const budgetVelocityAlert = monthlyBudget > 0 && budgetPercentage > monthProgressPercent;

  const generateDynamicInsight = () => {
      if (monthlyIncome === 0 && monthlyExpense === 0) {
          return {
              title: "Sistem Menunggu Data",
              desc: "Belum ada pergerakan kas bulan ini. Mulai catat transaksi Anda untuk mengaktifkan mesin diagnosis finansial otomatis.",
              color: "text-slate-600 bg-slate-50 border-slate-200",
              icon: <HelpCircle className="w-5 h-5 text-slate-500" />
          };
      }
      if (monthlyNet < 0) {
          return {
              title: "Peringatan Defisit Kas (Mati Keras)",
              desc: `Arus kas berstatus minus Rp ${Math.abs(monthlyNet).toLocaleString('id-ID')}. Anda membiayai pengeluaran dari tabungan lama atau instrumen hutang. Tekan rem belanja diskresioner sekarang.`,
              color: "text-rose-700 bg-rose-50 border-rose-100",
              icon: <ShieldAlert className="w-5 h-5 text-rose-600" />
          };
      }
      if (budgetVelocityAlert) {
          return {
              title: "Akselerasi Anggaran Terlalu Agresif",
              desc: `Pengeluaran Anda terpakai ${budgetPercentage.toFixed(1)}% padahal waktu bulan baru berjalan ${monthProgressPercent.toFixed(1)}%. Anda diproyeksikan kehabisan anggaran sebelum akhir bulan.`,
              color: "text-amber-700 bg-amber-50 border-amber-100",
              icon: <Zap className="w-5 h-5 text-amber-600" />
          };
      }
      if (savingsRate >= 30) {
          return {
              title: "Kapasitas Alokasi Sangat Sehat",
              desc: `Rasio tabungan Anda mencapai ${savingsRate.toFixed(1)}% (di atas batas ideal 20%). Margin keamanan ini sangat bagus untuk segera didiversifikasikan ke instrumen investasi.`,
              color: "text-emerald-700 bg-emerald-50 border-emerald-100",
              icon: <Trophy className="w-5 h-5 text-emerald-600" />
          };
      }
      return {
          title: "Stabilitas Arus Kas Normatif",
          desc: `Arus kas surplus, namun rasio tabungan berada di angka ${savingsRate.toFixed(1)}%. Lakukan optimasi pada pos pengeluaran minor agar target jangka panjang terakselerasi.`,
          color: "text-indigo-700 bg-indigo-50 border-indigo-100",
          icon: <Activity className="w-5 h-5 text-indigo-600" />
      };
  };

  const activeInsight = generateDynamicInsight();
  const detailList = (expandedDetail === 'income' ? allIncomeTxs : (expandedDetail === 'expense' ? allExpenseTxs : []))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatRp = (val: number) => {
      if (isNaN(val)) return "Rp 0";
      return formatCurrency(val).split(",")[0];
  };

  const displayWealth = formatRp(currentWealth);
  const getBalanceTextSize = (text: string) => {
      if (text.length >= 20) return "text-2xl"; 
      if (text.length >= 15) return "text-3xl"; 
      return "text-4xl"; 
  };

  return (
    <MobileLayout title="Analisa Performa" showBack>
      <div className="space-y-6 pt-4 px-1 pb-24">

        {/* 1. NOTIFIKASI WAKTU HABIS TARGET */}
        {isPeriodEnded && (
            <div className={`p-5 rounded-[24px] text-white shadow-lg animate-in slide-in-from-top-4 ${isTargetAchieved ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 'bg-gradient-to-br from-rose-500 to-red-600'}`}>
                {isTargetAchieved ? (
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full"><Trophy className="w-8 h-8 text-white"/></div>
                        <div>
                            <h3 className="font-extrabold text-xl">Luar Biasa! 🎉</h3>
                            <p className="text-xs text-white/90">Target finansialmu tercapai tepat waktu.</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h3 className="font-extrabold text-xl flex items-center gap-2"><AlertCircle className="w-6 h-6"/> Waktu Habis</h3>
                        <p className="text-xs text-white/90 mt-1 mb-4 leading-relaxed">Target belum sepenuhnya tercapai. Jangan menyerah, atur ulang strategi untuk melanjutkan sisa target.</p>
                        <Link href="/target">
                            <button className="bg-white text-rose-600 px-5 py-3 rounded-full text-xs font-extrabold shadow flex items-center justify-center gap-2 w-full active:scale-95 transition-transform">
                                <RefreshCcw className="w-4 h-4"/> PERPANJANG DURASI STRATEGI
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        )}

        {/* 2. KARTU UTAMA: TOTAL KEKAYAAN BERSIH */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-800 text-white p-7 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden">
            <div className="relative z-10 mb-6">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-[11px] text-blue-200 uppercase tracking-widest font-bold flex items-center gap-2">
                        Total Kekayaan Bersih
                    </p>
                    <Link href="/target">
                        <button className="bg-yellow-400 hover:bg-yellow-500 text-indigo-950 px-3 py-1.5 rounded-full text-[9px] font-extrabold shadow-md transition-all active:scale-95 uppercase tracking-wider whitespace-nowrap">
                            {hasValidTarget ? "EDIT TARGET" : "TAMBAH TARGET"}
                        </button>
                    </Link>
                </div>

                <h2 className={`${getBalanceTextSize(displayWealth)} font-extrabold font-display text-white block w-full whitespace-nowrap transition-all duration-300`}>
                    {displayWealth}
                </h2>
                
                <div className="flex flex-wrap gap-2 mt-4 text-[10px] font-bold">
                    <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">Tunai: {formatRp(cashReal)}</span>
                    <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">Aset: {formatRp(investmentReal + forexValue)}</span>
                    {retainedReal > 0 && <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-amber-200">Tertahan: {formatRp(retainedReal)}</span>}
                    {piutangReal > 0 && <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-emerald-200">Piutang: {formatRp(piutangReal)}</span>}
                    {hutangReal > 0 && <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-rose-200">Hutang: {formatRp(hutangReal)}</span>}
                </div>
            </div>

            {hasValidTarget && target.targetAmount > 0 && (
                <div className="relative z-10 bg-black/20 p-4 rounded-[20px] backdrop-blur-sm border border-white/10 mt-6">
                    <div className="flex justify-between text-[11px] text-blue-100 mb-2 font-bold uppercase tracking-wider">
                        <span>Target Impian</span>
                        <span className="text-emerald-300">{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-1000 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-white">
                        <span>{formatRp(target.targetAmount)}</span>
                        <span className="flex items-center gap-1 opacity-80"><CalendarClock className="w-4 h-4"/> Sisa {monthsRemaining} Bln</span>
                    </div>
                </div>
            )}
            <div className="absolute right-0 top-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
            <div className="absolute left-0 bottom-0 w-32 h-32 bg-emerald-400/20 rounded-tr-full blur-2xl pointer-events-none"></div>
        </div>

        {/* 3. DYNAMIC INSIGHT ENGINE (BARU & GAHAR) */}
        <div className={`p-5 rounded-[28px] border transition-all duration-300 shadow-sm flex gap-3 items-start ${activeInsight.color}`}>
            <div className="mt-0.5 shrink-0 bg-white/50 p-2 rounded-xl border border-current/10">
                {activeInsight.icon}
            </div>
            <div>
                <h4 className="font-black text-sm mb-1 uppercase tracking-tight">{activeInsight.title}</h4>
                <p className="text-xs leading-relaxed font-medium opacity-90">{activeInsight.desc}</p>
            </div>
        </div>

        {/* 4. MODUL PREMIUM: CASHFLOW DIAGNOSTICS (BARU) */}
        <div className="bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] rounded-[32px] p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-indigo-600"/>
                <h3 className="font-extrabold text-slate-800 text-sm">Diagnosis Struktur Arus Kas</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Savings Rate</p>
                    <p className={`text-xl font-black ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {savingsRate.toFixed(1)}%
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Rasio dana teralokasi</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Rata-Rata Harian</p>
                    <p className="text-xl font-black text-slate-800">{formatRp(dailyBurnRate)}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Beban bakar kas per hari</p>
                </div>
            </div>

            {monthlyBudget > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-500">Proyeksi Pengeluaran Bulanan:</span>
                    <span className={`font-black ${projectedExpense > monthlyBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatRp(projectedExpense)}
                    </span>
                </div>
            )}
        </div>

        {/* 5. GRAFIK KAS MASUK DAN KELUAR */}
        <div className="p-0 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white overflow-hidden rounded-[32px] relative">
            <div>
                <div className="p-6 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-extrabold text-slate-800 text-base">Realisasi & Cashflow</h3>
                            <p className="text-[11px] text-slate-400 font-medium">Klik grafik untuk rincian riwayat</p>
                        </div>
                        <span className={`text-[11px] font-extrabold px-3 py-1.5 rounded-full border ${monthlyNet >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                            Net: {monthlyNet > 0 ? '+' : ''}{formatRp(monthlyNet)}
                        </span>
                    </div>

                    <div className="flex items-end justify-around h-40 gap-4">
                        <div 
                            onClick={() => setExpandedDetail(expandedDetail === 'income' ? null : 'income')}
                            className={`flex flex-col items-center gap-2 w-full h-full justify-end group cursor-pointer p-2 rounded-[20px] transition-all ${expandedDetail === 'income' ? 'bg-emerald-50 ring-2 ring-emerald-400 ring-offset-2' : 'hover:bg-slate-50'}`}
                        >
                            <span className="text-[11px] font-extrabold text-emerald-600 truncate max-w-full px-1">{formatRp(monthlyIncome)}</span>
                            <div className="w-full bg-emerald-400 rounded-t-xl transition-all duration-1000 shadow-sm" style={{ height: `${Math.max(monthlyIncome/Math.max(monthlyIncome, monthlyExpense, 1)*100, 10)}%` }}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mt-1">
                                <ArrowDownCircle className="w-3.5 h-3.5"/> Masuk
                                {expandedDetail === 'income' ? <ChevronUp className="w-3 h-3 text-emerald-500"/> : <ChevronDown className="w-3 h-3 opacity-30"/>}
                            </span>
                        </div>

                        <div 
                            onClick={() => setExpandedDetail(expandedDetail === 'expense' ? null : 'expense')}
                            className={`flex flex-col items-center gap-2 w-full h-full justify-end group cursor-pointer p-2 rounded-[20px] transition-all ${expandedDetail === 'expense' ? 'bg-rose-50 ring-2 ring-rose-400 ring-offset-2' : 'hover:bg-slate-50'}`}
                        >
                            <span className="text-[11px] font-extrabold text-rose-600 truncate max-w-full px-1">{formatRp(monthlyExpense)}</span>
                            <div className="w-full bg-rose-400 rounded-t-xl transition-all duration-1000 shadow-sm" style={{ height: `${Math.max(monthlyExpense/Math.max(monthlyIncome, monthlyExpense, 1)*100, 10)}%` }}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mt-1">
                                <ArrowUpCircle className="w-3.5 h-3.5"/> Keluar
                                {expandedDetail === 'expense' ? <ChevronUp className="w-3 h-3 text-rose-500"/> : <ChevronDown className="w-3 h-3 opacity-30"/>}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-500 ease-in-out overflow-hidden bg-slate-50/50 ${expandedDetail ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
                                Riwayat {expandedDetail === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                            </span>
                            <button onClick={() => setExpandedDetail(null)} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Tutup</button>
                        </div>
                        
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 pb-4">
                            {detailList.length > 0 ? detailList.map((t, idx) => (
                                <div key={t.id || idx} className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm flex justify-between items-center group transition-all">
                                    <div className="flex-1 mr-2">
                                        <p className="text-sm font-extrabold text-slate-800">{t.category}</p>
                                        <p className="text-[11px] text-slate-500 line-clamp-1">{t.description || "Tanpa keterangan"}</p>
                                    </div>
                                    <div className="text-right mr-3">
                                        <p className={`text-sm font-extrabold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatRp(t.amount)}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium">{new Date(t.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</p>
                                    </div>
                                    {t.id && (
                                        <button 
                                            onClick={() => handleDeleteTransaction(t.id)} 
                                            disabled={isDeletingTx}
                                            className="p-2.5 bg-rose-50 text-rose-500 rounded-[14px] hover:bg-rose-100 transition-colors shrink-0"
                                            title="Hapus Transaksi"
                                        >
                                            {isDeletingTx ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                                        </button>
                                    )}
                                </div>
                            )) : (
                                <p className="text-center text-xs text-slate-400 italic py-6 bg-white rounded-[20px] border border-dashed border-slate-200">Belum ada transaksi bulan ini.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 6. PERFORMA ASET & DIVERSIFIKASI (DENGAN ZERO STATE PROFESIONAL) */}
        {isPro && (
            (totalCuanJual !== 0 || investmentReal > 0 || forexValue > 0) ? (
                <div className="p-6 rounded-[32px] bg-slate-900 text-white shadow-xl border border-slate-700 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-black text-lg flex items-center gap-2"><Briefcase className="w-5 h-5 text-amber-400"/> Performa Aset</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ROI & Portfolio Insight</p>
                        </div>
                        <div className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-1 rounded-md">PRO</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Total ROI (Realisasi)</p>
                            <p className={`text-xl font-black ${totalCuanJual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalCuanJual >= 0 ? '+' : ''}{roiPercentage.toFixed(2)}%
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">{formatRp(totalCuanJual)} dari modal {formatRp(totalModalTerpakai)}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Porsi Aset & Valas</p>
                            <p className="text-xl font-black text-blue-400">{assetAlocationRatio.toFixed(1)}%</p>
                            <p className="text-[10px] text-slate-500 font-medium">dari Kekayaan Bersih</p>
                        </div>
                    </div>

                    <div className="bg-amber-400/10 border border-amber-400/20 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1.5 text-amber-400">
                            <TrendingUp className="w-4 h-4"/>
                            <span className="text-[11px] font-black uppercase">Analisa Strategi Aset:</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                            {roiPercentage > 5 ? "Gaya ekspansi modal Anda efektif. Lanjutkan konsistensi manajemen risiko untuk mempercepat kebebasan finansial." : 
                                roiPercentage < 0 ? "Realisasi pertumbuhan modal negatif. Lakukan evaluasi mendalam pada siklus masuk/keluar instrumen pasar Anda." :
                                "Struktur penempatan dana stabil. Pertahankan diversifikasi berkala untuk menghadapi volatilitas makro."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="p-6 rounded-[32px] bg-slate-900 text-white/40 shadow-xl border border-slate-800 relative overflow-hidden text-center">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
                    <h4 className="font-extrabold text-sm text-slate-300 mb-1">Portofolio Multi-Aset Belum Aktif</h4>
                    <p className="text-[11px] max-w-xs mx-auto text-slate-400 leading-relaxed">
                        Evaluasi ROI otomatis dan analisis diversifikasi portofolio akan terisi setelah Anda mencatat pembelian Saham atau Valas.
                    </p>
                </div>
            )
        )}

        {/* 7. AMAL & SEDEKAH (DENGAN ZERO STATE PROFESIONAL) */}
        {totalAmal > 0 ? (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-[32px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-200/50 rounded-full blur-2xl pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <HeartHandshake className="w-5 h-5 text-emerald-600"/>
                        <h3 className="font-extrabold text-emerald-900 text-sm">Amal & Sedekah (Bulan Ini)</h3>
                    </div>
                    <p className="text-[10px] font-medium text-emerald-700 mb-2">Pahala alokasi sosial murni di luar budget operasional bulanan</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatRp(totalAmal)}</p>
                </div>
            </div>
        ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[32px] p-5 text-center text-slate-400">
                <HeartHandshake className="w-6 h-6 mx-auto mb-1.5 opacity-60" />
                <p className="text-[11px] font-medium">Belum ada alokasi sosial/amal tercatat bulan ini.</p>
            </div>
        )}

        {/* 8. TARGET FINANSIAL & KONTROL ANGGARAN */}
        {hasValidTarget ? (
            <div className="grid grid-cols-1 gap-5">
                {target.monthlyBudget > 0 && (
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-indigo-300"/>
                                <h3 className="font-bold text-sm">Limit Pengeluaran Bulan Ini</h3>
                            </div>
                            {isOverBudgetStrict && <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-md animate-pulse shadow-md">OVERBUDGET</span>}
                        </div>

                        <div className="mb-6 relative z-10">
                            <p className="text-[11px] text-indigo-200 mb-1 font-medium">Pengeluaran Tercatat (Non-Amal)</p>
                            <div className="flex items-end gap-2">
                                <h2 className="text-3xl font-black tracking-tight">{formatCurrency(pureExpenses).split(',')[0]}</h2>
                                <span className="text-sm text-indigo-300 mb-1 font-bold">/ {formatCurrency(monthlyBudget).split(',')[0]}</span>
                            </div>
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between text-[10px] font-bold mb-2 text-indigo-200">
                                <span>Terpakai: {budgetPercentage.toFixed(1)}%</span>
                                <span>Sisa: {formatCurrency(remainingBudget).split(',')[0]}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${isOverBudgetStrict ? 'bg-rose-500' : 'bg-emerald-400'}`}
                                    style={{ width: `${budgetPercentage}%` }}
                                ></div>
                            </div>
                            
                            {/* INDIKATOR KECEPATAN ANGGARAN (BUDGET VELOCITY BAR) */}
                            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5"/> Laju Waktu Bulan:</span>
                                <span className="font-bold text-slate-300">{monthProgressPercent.toFixed(1)}% Hari Terlewati</span>
                            </div>
                        </div>
                    </div>
                )}

                {target.targetAmount > 0 && (
                    <div className="p-6 rounded-[32px] bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative overflow-hidden">
                        <div>
                            <h3 className="font-extrabold text-slate-800 flex items-center gap-2 mb-5">
                                <Target className="w-5 h-5 text-indigo-500"/> Goal Bulan Ini
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-indigo-50/50 p-4 rounded-[20px] border border-indigo-100/50 min-w-0">
                                    <p className="text-[10px] text-indigo-500 uppercase font-extrabold tracking-widest mb-1 truncate">Wajib Nabung</p>
                                    <p className="font-extrabold text-indigo-700 text-base truncate" title={formatRp(savingRequired)}>{formatRp(savingRequired)}</p>
                                </div>
                                {expenseLimit > 0 ? (
                                    <div className="bg-rose-50/50 p-4 rounded-[20px] border border-rose-100/50 min-w-0">
                                        <p className="text-[10px] text-rose-500 uppercase font-extrabold tracking-widest mb-1 truncate">Batas Keluar</p>
                                        <p className="font-extrabold text-rose-700 text-base truncate" title={formatRp(expenseLimit)}>{formatRp(expenseLimit)}</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-100 min-w-0">
                                        <p className="text-[10px] text-slate-500 uppercase font-extrabold tracking-widest mb-1 truncate">Batas Keluar</p>
                                        <p className="font-extrabold text-slate-400 text-sm mt-1 truncate">Tanpa Batas</p>
                                    </div>
                                )}
                            </div>

                            {expenseLimit > 0 && (
                                <div className="mt-4 p-4 bg-slate-800 rounded-[20px] flex justify-between items-center text-white shadow-md gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 min-w-0 flex-shrink">Harus Dapat Pemasukan:</span>
                                    <span className="text-base font-extrabold text-emerald-400 truncate text-right max-w-[50%]" title={formatRp(targetIncomeMonth)}>{formatRp(targetIncomeMonth)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {target.targetAmount > 0 && (
                        <div className={`p-6 text-center rounded-[32px] border-2 shadow-sm ${isSafe ? "border-emerald-100 bg-emerald-50" : "border-orange-100 bg-orange-50"}`}>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-3 text-slate-500">Diagnosa Bulan Ini</p>
                            {isSafe ? (
                                <>
                                    <h3 className="text-xl font-extrabold text-emerald-600 mb-2">AMAN (ON TRACK) 🎉</h3>
                                    <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                                        Sisa uang bulan ini {formatRp(monthlyNet)}.<br/>
                                        Memenuhi syarat minimal nabung ({formatRp(savingRequired)}).
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-extrabold text-orange-600 mb-2">KURANG (OFF TRACK) ⚠️</h3>
                                    <p className="text-xs text-orange-700 leading-relaxed font-medium">
                                        Sisa uang hanya {formatRp(monthlyNet)}.<br/>
                                        Masih kurang <b>{formatRp(savingRequired - monthlyNet)}</b> untuk mencapai target tabungan bulan ini.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {target.targetAmount === 0 && expenseLimit > 0 && (
                        <div className={`p-6 text-center rounded-[32px] border-2 shadow-sm ${!isOverBudget ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-3 text-slate-500">Kontrol Pengeluaran</p>
                            {!isOverBudget ? (
                                <>
                                    <h3 className="text-xl font-extrabold text-emerald-600 mb-2">PENGELUARAN AMAN 🛡️</h3>
                                    <p className="text-xs text-emerald-700 font-medium">Kamu masih punya sisa budget {formatRp(expenseLimit - monthlyExpense)} bulan ini.</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-extrabold text-rose-600 mb-2">AWAS OVERBUDGET 🚨</h3>
                                    <p className="text-xs text-rose-700 font-medium">Pengeluaran menembus batas! Kelebihan {formatRp(monthlyExpense - expenseLimit)}.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-white rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 mt-2 px-6 text-center">
                <div className="bg-indigo-50 p-4 rounded-full mb-3">
                    <Target className="w-8 h-8 text-indigo-400"/>
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-1">Aktifkan Strategi Finansial</h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">Pasang target tabungan atau batas pengeluaran untuk membuka fitur analisa lanjutan.</p>
                <Link href="/target">
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-3.5 rounded-full text-xs font-extrabold shadow-lg shadow-indigo-200 transition-transform active:scale-95">
                        MULAI SETUP SEKARANG
                    </button>
                </Link>
            </div>
        )}
      </div>
    </MobileLayout>
  );
}