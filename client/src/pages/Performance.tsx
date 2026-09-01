import { useState, useEffect } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { 
    Trophy, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, 
    CalendarClock, RefreshCcw, CheckCircle2, ChevronRight, 
    ArrowLeft, Crown, ShieldCheck, Loader2, DollarSign, Wallet, 
    Activity, Zap, Target, Briefcase, HelpCircle, ShieldAlert, 
    HeartHandshake, ChevronDown, ChevronUp, ArrowDownCircle, ArrowUpCircle,
    Trash2
} from "lucide-react";
import { useUser, useTarget, useTransactions, useForexRates, useInvestments, getAccessTier } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_RATES: Record<string, number> = {
    USD: 16250, EUR: 17500, SGD: 12200, JPY: 108, GBP: 20500,
    MYR: 3500, AUD: 10600, SAR: 4330, CNY: 2240, KRW: 12, THB: 450, AED: 4420
};

export default function Performance() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: target, isLoading: isTargetLoading } = useTarget();
  const { data: transactions = [], isLoading: isTxLoading } = useTransactions();
  const { data: investments = [], isLoading: isInvLoading } = useInvestments();
  const { data: forexRates = {}, isLoading: isRatesLoading } = useForexRates();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [isCharging, setIsCharging] = useState(false);
  const [expandedDetail, setExpandedDetail] = useState<'income' | 'expense' | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const accessTier = getAccessTier(user);
  const isPro = accessTier !== "free";

  const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;
  const isLocked = accessTier === "free" && isTrialExpired;

  const { data: forexAssetsData = [] } = useQuery({
      queryKey: ['forex-assets', currentUserEmail],
      queryFn: async () => {
          const res = await fetch("/api/forex/assets", { headers: { "x-user-email": currentUserEmail } });
          if (!res.ok) return [];
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: retainedData = [] } = useQuery({
      queryKey: ['retained-data', currentUserEmail],
      queryFn: async () => {
          const res = await fetch("/api/retained", { headers: { "x-user-email": currentUserEmail } });
          if (!res.ok) return [];
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: debtsData = [] } = useQuery({
      queryKey: ['debts-data', currentUserEmail],
      queryFn: async () => {
          const res = await fetch("/api/debts", { headers: { "x-user-email": currentUserEmail } });
          if (!res.ok) return [];
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const handleLanjutBayar = async () => {
    setIsCharging(true);
    try {
        const email = currentUserEmail || "customer@bilano.id";
        const res = await fetch("/api/pay/mayar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email, 
                plan: selectedPlan,
                feature: "performance_analytics"
            })
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

  const handleDeleteTransaction = async (id: number) => {
      if (!confirm("Hapus catatan transaksi ini? Saldo dan kalkulasi performa akan diperbarui.")) return;
      setIsDeletingTx(true);
      try {
          const res = await fetch(`/api/transactions/${id}`, {
              method: "DELETE",
              headers: { "x-user-email": currentUserEmail }
          });
          if (res.ok) {
              toast({ title: "Dihapus", description: "Transaksi berhasil dihapus dari pembukuan." });
              queryClient.invalidateQueries();
          } else {
              toast({ title: "Gagal Menghapus", variant: "destructive" });
          }
      } catch (e) {
          toast({ title: "Kendala Jaringan", variant: "destructive" });
      } finally {
          setIsDeletingTx(false);
      }
  };

  if (isLocked && !isUserLoading) {
      return (
          <MobileLayout title="Analisa Performa" showBack>
              <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center -mx-5 -mt-5 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] p-6">
                  <div className="w-20 h-20 bg-brand-gold text-brand-navy rounded-3xl flex items-center justify-center mb-4 shadow-md border border-brand-navy animate-bounce">
                      <Crown className="w-10 h-10" />
                  </div>
                  <span className="bg-brand-navy text-brand-gold text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-xs">
                      ANALISIS FINANSIAL KELAS EXECUTIVE
                  </span>
                  <h2 className="text-2xl font-black text-brand-navy mb-2 tracking-tight">
                      Buka Akses Analisa Finansial PRO
                  </h2>
                  <p className="text-xs text-amber-950 font-medium mb-6 max-w-xs leading-relaxed">
                      Dapatkan diagnosis mendalam perihal Cashflow Runway, Rasio Tabungan, ROI Multi-Aset, dan Proyeksi Target Kekayaan Bersih.
                  </p>

                  <div className="w-full max-w-sm space-y-3 mb-6">
                      <div 
                        onClick={() => setSelectedPlan('yearly')} 
                        className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
                            selectedPlan === 'yearly' ? 'border-brand-navy bg-white shadow-sm' : 'border-slate-300 bg-white/70'
                        }`}
                      >
                          {selectedPlan === 'yearly' && (
                              <span className="absolute top-0 right-0 bg-brand-gold text-brand-navy text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-bl-xl border-l border-b border-brand-navy">
                                  PALING HEMAT
                              </span>
                          )}
                          <div className="flex justify-between items-center mb-1 text-left">
                              <h4 className="font-bold text-sm text-brand-navy">Paket 1 Tahun</h4>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-brand-navy bg-brand-gold' : 'border-slate-300'}`}>
                                  {selectedPlan === 'yearly' && <div className="w-2 h-2 bg-brand-navy rounded-full"></div>}
                              </div>
                          </div>
                          <p className="text-xl font-black text-slate-900 text-left">
                              Rp 8.250 <span className="text-xs font-medium text-slate-500">/ bulan</span>
                          </p>
                          <p className="text-[10px] text-emerald-700 font-bold text-left mt-0.5">Ditagih Rp 99.000 / tahun</p>
                      </div>

                      <div 
                        onClick={() => setSelectedPlan('monthly')} 
                        className={`p-4 rounded-2xl border cursor-pointer transition-all text-left ${
                            selectedPlan === 'monthly' ? 'border-brand-navy bg-white shadow-sm' : 'border-slate-300 bg-white/70'
                        }`}
                      >
                          <div className="flex justify-between items-center mb-1">
                              <h4 className="font-bold text-sm text-slate-800">Paket 1 Bulan</h4>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-brand-navy bg-brand-gold' : 'border-slate-300'}`}>
                                  {selectedPlan === 'monthly' && <div className="w-2 h-2 bg-brand-navy rounded-full"></div>}
                              </div>
                          </div>
                          <p className="text-xl font-black text-slate-900">
                              Rp 14.900 <span className="text-xs font-medium text-slate-500">/ bulan</span>
                          </p>
                      </div>
                  </div>

                  <button 
                    onClick={handleLanjutBayar} 
                    disabled={isCharging} 
                    className="w-full max-w-sm h-14 bg-brand-navy hover:bg-[#152e55] text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                      {isCharging ? <Loader2 className="w-5 h-5 animate-spin"/> : "LANJUTKAN PEMBAYARAN PRO"}
                  </button>
                  <p className="mt-4 text-[10px] text-amber-950 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600"/> Pembayaran Terverifikasi & Otomatis oleh Mayar
                  </p>
              </div>
          </MobileLayout>
      );
  }

  // =========================================================================
  // 📐 FORMULASI & KALKULASI ANALITIK FINANSIAL MENDALAM
  // =========================================================================
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

  const investmentReal = Array.isArray(investments) ? investments.reduce((acc: number, inv: any) => {
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
      debtsData.filter((d: any) => !d.isPaid).forEach((d: any) => {
          const parts = (d.name || "").split('|');
          const curr = parts[1] || 'IDR';
          const rate = curr === 'IDR' ? 1 : (forexRates[curr] || DEFAULT_RATES[curr] || 15000);
          const val = d.amount * rate;
          if (d.type === 'piutang') piutangReal += val;
          if (d.type === 'hutang') hutangReal += val;
      });
  }

  const currentWealth = cashReal + forexValue + investmentReal + retainedReal + piutangReal - hutangReal;

  const hasTargetAmount = target && target.targetAmount > 0;
  const targetDuration = target?.durationMonths || 12;
  const startMonth = target?.startMonth || 1;
  const startYear = target?.startYear || currentYear;
  
  const monthsPassed = Math.max(0, (currentYear - startYear) * 12 + (currentMonthIdx + 1 - startMonth));
  const monthsRemaining = Math.max(0, targetDuration - monthsPassed);
  
  const initialWealth = (target as any)?.initialWealth || 0;
  const wealthGained = Math.max(0, currentWealth - initialWealth);
  const targetGoal = (target?.targetAmount || 1) - initialWealth;
  
  const progressPercent = hasTargetAmount && targetGoal > 0 
      ? Math.min(100, Math.max(0, (wealthGained / targetGoal) * 100))
      : 0;

  const isPeriodEnded = hasTargetAmount && monthsRemaining === 0;
  const isTargetAchieved = hasTargetAmount && currentWealth >= target.targetAmount;

  const targetDelta = hasTargetAmount ? Math.max(0, target.targetAmount - currentWealth) : 0;
  const savingRequired = (monthsRemaining > 0 && hasTargetAmount) ? targetDelta / monthsRemaining : 0;
  const expenseLimit = target?.monthlyBudget || 0;
  const targetIncomeMonth = savingRequired + expenseLimit;

  // Transaksi Bulan Berjalan
  const monthTransactions = transactions.filter((t: any) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  });

  const baseIncomeTxs = monthTransactions.filter((t: any) => t.type === 'income');
  const baseExpenseTxs = monthTransactions.filter((t: any) => t.type === 'expense');

  let totalAmal = 0;
  baseExpenseTxs.forEach((t: any) => {
      const c = (t.category || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      if (c.includes('amal') || c.includes('sedekah') || c.includes('infaq') || c.includes('zakat') || c.includes('donasi') ||
          desc.includes('amal') || desc.includes('sedekah') || desc.includes('infaq') || desc.includes('zakat') || desc.includes('donasi')) {
          totalAmal += t.amount;
      }
  });

  const virtualPLTxs: any[] = [];
  let totalCuanJual = 0;
  let totalModalJual = 0;

  transactions.forEach((t: any) => {
      if ((t.type === 'forex_sell' || t.type === 'investment_sell') && t.description && t.description.includes('P/L:')) {
          const plMatch = t.description.match(/P\/L:\s*([^\)]+)\)/);
          if (plMatch && plMatch[1]) {
              const plString = plMatch[1].trim(); 
              const currMatch = plString.match(/^([A-Z]{3})/);
              const currCode = currMatch ? currMatch[1] : 'IDR';
              const isAlreadyIdr = plString.includes('Rp') || currCode === 'IDR';
              const rate = isAlreadyIdr ? 1 : (forexRates[currCode] || DEFAULT_RATES[currCode] || 15000);

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
                  totalCuanJual += convertedPlValue;
                  totalModalJual += Math.max(1, (t.amount * rate) - convertedPlValue);
                  
                  const d = new Date(t.date);
                  if (d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear) {
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
      }
  });

  const allIncomeTxs = [...baseIncomeTxs, ...virtualPLTxs.filter(v => v.type === 'income')];
  const allExpenseTxs = [...baseExpenseTxs, ...virtualPLTxs.filter(v => v.type === 'expense')];

  const monthlyIncome = allIncomeTxs.reduce((acc: number, t: any) => acc + t.amount, 0); 
  const monthlyExpense = allExpenseTxs.reduce((acc: number, t: any) => acc + t.amount, 0); 
  
  const pureExpenses = baseExpenseTxs.reduce((acc: number, t: any) => acc + t.amount, 0);
  const monthlyBudget = target?.monthlyBudget || 0;
  const isOverBudgetStrict = monthlyBudget > 0 && pureExpenses > monthlyBudget;
  const remainingBudget = Math.max(0, monthlyBudget - pureExpenses);
  const budgetPercentage = monthlyBudget > 0 ? Math.min(100, (pureExpenses / monthlyBudget) * 100) : 0;
    
  const monthlyNet = monthlyIncome - monthlyExpense;
  const isSafe = monthlyNet >= savingRequired; 

  // Metrik Analisis Personal
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
  const dailyBurnRate = currentDay > 0 ? pureExpenses / currentDay : 0;
  const budgetVelocityAlert = monthlyBudget > 0 && budgetPercentage > monthProgressPercent;

  const monthlyBurnBaseline = (dailyBurnRate * 30) > 0 ? (dailyBurnRate * 30) : (monthlyBudget > 0 ? monthlyBudget : 1);
  const liquidCash = cashReal + retainedReal;
  const financialRunwayMonths = monthlyBurnBaseline > 0 ? (liquidCash / monthlyBurnBaseline) : 0;
  const debtToWealthRatio = currentWealth > 0 ? (hutangReal / (currentWealth + hutangReal)) * 100 : (hutangReal > 0 ? 100 : 0);
  const amalRatio = monthlyIncome > 0 ? (totalAmal / monthlyIncome) * 100 : 0;

  let konsumtifTotal = 0;
  baseExpenseTxs.forEach((t: any) => {
      const c = (t.category || '').toLowerCase();
      if (c.includes('makan') || c.includes('jajan') || c.includes('hiburan') || c.includes('belanja') || c.includes('hobi') || c.includes('rokok') || c.includes('kopi') || c.includes('lifestyle') || c.includes('main')) {
          konsumtifTotal += t.amount;
      }
  });
  const konsumtifRatio = pureExpenses > 0 ? (konsumtifTotal / pureExpenses) * 100 : 0;
  const kebutuhanPokokTotal = Math.max(0, pureExpenses - konsumtifTotal);

  const roiPercentage = totalModalJual > 0 ? (totalCuanJual / totalModalJual) * 100 : 0;
  const assetAlocationRatio = currentWealth > 0 ? ((investmentReal + forexValue) / currentWealth) * 100 : 0;

  const generateDynamicInsight = () => {
      if (monthlyIncome === 0 && monthlyExpense === 0) {
          return {
              title: "Sistem Menunggu Data Transaksi",
              desc: "Belum ada transaksi bulan ini. Catat transaksi harian untuk mengaktifkan audit kecerdasan finansial otomatis.",
              color: "text-slate-700 bg-white border border-slate-200",
              icon: <HelpCircle className="w-5 h-5 text-slate-500" />
          };
      }
      if (monthlyNet < 0) {
          return {
              title: "Peringatan Defisit Arus Kas (Cash Burn)",
              desc: `Arus kas minus Rp ${Math.abs(monthlyNet).toLocaleString('id-ID')}. Anda membiayai operasional dari tabungan lama atau hutang. Tekan pengeluaran gaya hidup segera.`,
              color: "text-rose-900 bg-rose-50/80 border border-rose-200",
              icon: <ShieldAlert className="w-5 h-5 text-rose-600" />
          };
      }
      if (financialRunwayMonths < 1 && liquidCash > 0) {
          return {
              title: "Runway Kas Darurat Tipis (< 1 Bulan)",
              desc: `Kas tunai Anda hanya cukup membiayai ${financialRunwayMonths.toFixed(1)} bulan hidup. Prioritaskan pembentukan Dana Darurat minimal 3 bulan sebelum ekspansi aset.`,
              color: "text-amber-900 bg-amber-50/80 border border-amber-300",
              icon: <Zap className="w-5 h-5 text-amber-700" />
          };
      }
      if (budgetVelocityAlert) {
          return {
              title: "Akselerasi Pengeluaran Terlalu Cepat",
              desc: `Anggaran terpakai ${budgetPercentage.toFixed(1)}% padahal waktu bulan baru ${monthProgressPercent.toFixed(1)}%. Anda berisiko kehabisan budget sebelum akhir bulan.`,
              color: "text-amber-900 bg-amber-50/80 border border-amber-300",
              icon: <Zap className="w-5 h-5 text-amber-700" />
          };
      }
      if (savingsRate >= 30) {
          return {
              title: "Kapasitas Tabungan Sangat Prima (Fortress)",
              desc: `Tingkat tabungan bersih Anda ${savingsRate.toFixed(1)}% (jauh di atas standar 20%). Surplus ini sangat ideal untuk dialokasikan ke instrumen investasi.`,
              color: "text-emerald-950 bg-emerald-50/80 border border-emerald-300",
              icon: <Trophy className="w-5 h-5 text-emerald-700" />
          };
      }
      return {
          title: "Arus Kas Berjalan Sehat & Terkendali",
          desc: `Arus kas surplus dengan tingkat tabungan ${savingsRate.toFixed(1)}%. Jaga konsistensi belanja agar akumulasi kekayaan bersih tetap optimal.`,
          color: "text-brand-navy bg-amber-50/60 border border-amber-200",
          icon: <Activity className="w-5 h-5 text-amber-600" />
      };
  };

  const activeInsight = generateDynamicInsight();
  const detailList = (expandedDetail === 'income' ? allIncomeTxs : (expandedDetail === 'expense' ? allExpenseTxs : []))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatRp = (val: number) => {
      if (isNaN(val)) return "Rp 0";
      return formatCurrency(val).split(",")[0];
  };

  const displayWealth = formatRp(currentWealth);

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA BILANO NAVY & GOLD */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-8 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b border-amber-300/60">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(29,62,114,0.06)] flex items-center justify-between relative z-30 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            type="button"
                            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                            title="Kembali ke Beranda"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-800" strokeWidth={2.5} />
                        </button>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <p className="text-[10px] font-bold text-amber-900 uppercase tracking-widest">
                                Evaluasi & Analitik
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                            Analisa Performa
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/target">
                        <button 
                            type="button"
                            className="flex items-center gap-1 bg-brand-navy text-brand-gold px-3 py-1.5 rounded-full text-[10px] font-bold border border-brand-gold/30 shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                            <Target className="w-3.5 h-3.5 text-brand-gold" />
                            <span>SETUP TARGET</span>
                        </button>
                    </Link>
                </div>
            </div>

            {/* 2. FLAGSHIP HERO CARD: TOTAL KEKAYAAN BERSIH (SATU-SATUNYA DENGAN SOLID SHADOW KHAS BILANO) */}
            <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <TrendingUp className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <Trophy className="w-3 h-3 fill-current" /> TOTAL NET WORTH
                        </span>
                        <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                            Realtime Multi-Asset
                        </span>
                    </div>

                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Total Kekayaan Bersih Saat Ini
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3 leading-tight tabular-nums">
                        {displayWealth}
                    </h2>

                    {/* Breakdown Portofolio Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/15 text-[10px] font-semibold">
                        <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-white">Tunai: {formatRp(cashReal)}</span>
                        <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-sky-200">Aset: {formatRp(investmentReal + forexValue)}</span>
                        {retainedReal > 0 && <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-amber-300">Tertahan: {formatRp(retainedReal)}</span>}
                        {piutangReal > 0 && <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-emerald-300">Piutang: {formatRp(piutangReal)}</span>}
                        {hutangReal > 0 && <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-rose-300">Hutang: -{formatRp(hutangReal)}</span>}
                    </div>

                    {/* Target Progress Bar Jika Ada */}
                    {hasTargetAmount && (
                        <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10 mt-3.5 space-y-2">
                            <div className="flex justify-between text-[10px] text-amber-200 font-bold uppercase tracking-wider">
                                <span>Progres Target Impian</span>
                                <span className="text-emerald-400 font-black">{progressPercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10">
                                <div 
                                    className="h-full bg-gradient-to-r from-brand-gold to-emerald-400 transition-all duration-1000 rounded-full" 
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[11px] font-bold text-white pt-0.5">
                                <span>Goal: {formatRp(target.targetAmount)}</span>
                                <span className="flex items-center gap-1 text-slate-300 text-[10px]">
                                    <CalendarClock className="w-3.5 h-3.5 text-amber-300"/> Sisa {monthsRemaining} Bulan
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT SECTION: METRIK ANALITIK MENDALAM */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-4">
            
            {/* NOTIFIKASI TARGET JIKA WAKTU HABIS */}
            {isPeriodEnded && (
                <div className={`p-5 rounded-3xl text-white shadow-xs border ${isTargetAchieved ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-amber-300' : 'bg-gradient-to-br from-rose-600 to-red-700 border-rose-400'}`}>
                    {isTargetAchieved ? (
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-xs"><Trophy className="w-7 h-7 text-white"/></div>
                            <div>
                                <h3 className="font-extrabold text-base">Target Finansial Tercapai! 🎉</h3>
                                <p className="text-xs text-white/90 font-medium">Kekayaan bersih Anda berhasil melampaui batas target tepat waktu.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-white"/>
                                <h3 className="font-extrabold text-base">Periode Target Selesai</h3>
                            </div>
                            <p className="text-xs text-white/90 font-medium leading-relaxed">Target belum terpenuhi 100%. Lanjutkan evaluasi dan perpanjang durasi strategi untuk mengejar sisa target.</p>
                            <Link href="/target">
                                <button className="w-full h-12 bg-white text-rose-700 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer">
                                    <RefreshCcw className="w-4 h-4 stroke-[2.5]"/> Atur Ulang Periode Target
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* DYNAMIC INSIGHT AI BOX */}
            <div className={`p-4.5 rounded-3xl shadow-xs flex gap-3 items-start ${activeInsight.color}`}>
                <div className="p-2 rounded-xl bg-white/80 border border-current/20 shrink-0 shadow-xs">
                    {activeInsight.icon}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider mb-1">{activeInsight.title}</h4>
                    <p className="text-xs leading-relaxed font-medium opacity-90">{activeInsight.desc}</p>
                </div>
            </div>

            {/* 4 CARD ANALISIS KESEHATAN FINANSIAL PERSONAL */}
            <div className="bg-white border border-slate-200/80 shadow-xs hover:shadow-sm rounded-3xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-amber-600"/> Diagnosis Ketahanan Finansial
                    </h3>
                    <span className="text-[9px] font-bold text-brand-navy bg-brand-gold px-2 py-0.5 rounded-md">LIVE RATIOS</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    
                    {/* 1. FINANCIAL RUNWAY */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                        <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Financial Runway</p>
                            <p className={`text-base font-black tabular-nums mt-0.5 ${
                                financialRunwayMonths >= 6 ? 'text-emerald-700' : financialRunwayMonths >= 3 ? 'text-sky-700' : financialRunwayMonths >= 1 ? 'text-amber-700' : 'text-rose-700'
                            }`}>
                                {financialRunwayMonths.toFixed(1)} Bulan
                            </p>
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium mt-1.5 leading-tight">
                            {financialRunwayMonths >= 6 ? '🛡️ Sangat Kuat (Fortress)' : financialRunwayMonths >= 3 ? '✅ Kuat (Ideal)' : '⚠️ Kas darurat tipis'}
                        </p>
                    </div>

                    {/* 2. SAVINGS RATE */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                        <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Savings Rate</p>
                            <p className={`text-base font-black tabular-nums mt-0.5 ${savingsRate >= 20 ? 'text-emerald-700' : savingsRate > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                                {savingsRate.toFixed(1)}%
                            </p>
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium mt-1.5 leading-tight">
                            {savingsRate >= 20 ? '🔥 Sangat Disiplin' : savingsRate > 0 ? '👍 Surplus positif' : '🚨 Arus kas minus'}
                        </p>
                    </div>

                    {/* 3. BEBAN HARIAN */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                        <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Burn Rate Harian</p>
                            <p className="text-sm font-black text-slate-900 tabular-nums mt-0.5">{formatRp(dailyBurnRate)}</p>
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium mt-1.5 leading-tight">
                            Rata-rata keluar per hari
                        </p>
                    </div>

                    {/* 4. DEBT-TO-WEALTH RATIO */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                        <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Beban Hutang (DSR)</p>
                            <p className={`text-base font-black tabular-nums mt-0.5 ${debtToWealthRatio === 0 ? 'text-emerald-700' : debtToWealthRatio <= 20 ? 'text-amber-700' : 'text-rose-700'}`}>
                                {debtToWealthRatio.toFixed(1)}%
                            </p>
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium mt-1.5 leading-tight">
                            {debtToWealthRatio === 0 ? ' Bebas Hutang' : 'Porsi hutang vs aset'}
                        </p>
                    </div>
                </div>

                {/* STRUKTUR 50/30/20 */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2 mt-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-amber-950 uppercase tracking-wider">
                        <span>Porsi Belanja Gaya Hidup (Konsumtif)</span>
                        <span className={konsumtifRatio > 50 ? 'text-rose-700 font-black' : 'text-emerald-800 font-black'}>{konsumtifRatio.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${100 - konsumtifRatio}%` }} title="Kebutuhan Rutin & Pokok" />
                        <div className="bg-rose-500 h-full transition-all" style={{ width: `${konsumtifRatio}%` }} title="Gaya Hidup & Konsumtif" />
                    </div>
                    <div className="flex justify-between text-[9px] font-medium text-slate-500 pt-0.5">
                        <span>Pokok: {formatRp(kebutuhanPokokTotal)}</span>
                        <span>Gaya Hidup: {formatRp(konsumtifTotal)}</span>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 🍩 GRAFIK LINGKARAN ALOKASI ASET (ASSET ALLOCATION PIE / DONUT CHART) */}
            {/* ========================================================================= */}
            {(() => {
                const totalGrossAssets = cashReal + investmentReal + forexValue + retainedReal + piutangReal;
                
                const assetCategories = [
                    {
                        id: "kas",
                        name: "Kas & Bank",
                        amount: cashReal,
                        color: "#1D3E72", // BILANO Navy
                        bgLight: "bg-blue-50",
                        textColor: "text-[#1D3E72]",
                        dotColor: "bg-[#1D3E72]",
                        desc: "Dana likuid & kas operasional"
                    },
                    {
                        id: "investasi",
                        name: "Investasi",
                        amount: investmentReal,
                        color: "#F59E0B", // Amber Gold
                        bgLight: "bg-amber-50",
                        textColor: "text-amber-700",
                        dotColor: "bg-amber-500",
                        desc: "Saham, Crypto, Reksadana, Emas"
                    },
                    {
                        id: "valas",
                        name: "Valas (Forex)",
                        amount: forexValue,
                        color: "#0284C7", // Sky Blue
                        bgLight: "bg-sky-50",
                        textColor: "text-sky-700",
                        dotColor: "bg-sky-500",
                        desc: "Mata uang asing (kurs live)"
                    },
                    {
                        id: "tertahan",
                        name: "Saldo Tertahan",
                        amount: retainedReal,
                        color: "#8B5CF6", // Purple
                        bgLight: "bg-purple-50",
                        textColor: "text-purple-700",
                        dotColor: "bg-purple-500",
                        desc: "Platform bisnis / freelance"
                    },
                    {
                        id: "piutang",
                        name: "Piutang",
                        amount: piutangReal,
                        color: "#10B981", // Emerald Green
                        bgLight: "bg-emerald-50",
                        textColor: "text-emerald-700",
                        dotColor: "bg-emerald-500",
                        desc: "Uang dipinjamkan ke pihak lain"
                    }
                ];

                const calculatedCategories = assetCategories.map(cat => ({
                    ...cat,
                    pct: totalGrossAssets > 0 ? (cat.amount / totalGrossAssets) * 100 : 0
                }));

                const radius = 38;
                const circumference = 2 * Math.PI * radius; // ~238.76

                return (
                    <div className="bg-white border border-slate-200/80 shadow-xs hover:shadow-sm rounded-3xl p-5 space-y-4">
                        {/* Header Box */}
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-brand-navy"></span>
                                    Alokasi & Komposisi Aset
                                </h3>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                    Proporsi sebaran aset & kekayaan bruto
                                </p>
                            </div>
                            <span className="text-[9px] font-black text-brand-navy bg-brand-gold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                                5 KELAS ASET
                            </span>
                        </div>

                        {/* Top Donut & Summary Section */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 py-2">
                            {/* SVG Donut Chart */}
                            <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    {/* Background Circle */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r={radius}
                                        fill="transparent"
                                        stroke="#F1F5F9"
                                        strokeWidth="13"
                                    />
                                    {/* Segment Arcs */}
                                    {totalGrossAssets > 0 && (() => {
                                        let accumulatedPct = 0;
                                        return calculatedCategories.map(cat => {
                                            if (cat.pct <= 0) return null;
                                            const strokeDasharray = `${(cat.pct / 100) * circumference} ${circumference}`;
                                            const strokeDashoffset = -((accumulatedPct / 100) * circumference);
                                            accumulatedPct += cat.pct;
                                            return (
                                                <circle
                                                    key={cat.id}
                                                    cx="50"
                                                    cy="50"
                                                    r={radius}
                                                    fill="transparent"
                                                    stroke={cat.color}
                                                    strokeWidth="13"
                                                    strokeDasharray={strokeDasharray}
                                                    strokeDashoffset={strokeDashoffset}
                                                    strokeLinecap="butt"
                                                    className="transition-all duration-700 hover:opacity-90"
                                                />
                                            );
                                        });
                                    })()}
                                </svg>

                                {/* Center Donut Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        TOTAL ASET
                                    </span>
                                    <span className="text-[13px] font-black text-slate-900 leading-tight mt-1 tabular-nums">
                                        {formatRp(totalGrossAssets)}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">
                                        Kekayaan Bruto
                                    </span>
                                </div>
                            </div>

                            {/* Mini Visual Bar Strip */}
                            <div className="w-full flex-1 space-y-2">
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                    {totalGrossAssets > 0 ? (
                                        calculatedCategories.map(cat => {
                                            if (cat.pct <= 0) return null;
                                            return (
                                                <div
                                                    key={cat.id}
                                                    style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                                                    className="h-full transition-all duration-500"
                                                    title={`${cat.name}: ${cat.pct.toFixed(1)}%`}
                                                />
                                            );
                                        })
                                    ) : (
                                        <div className="w-full h-full bg-slate-200" />
                                    )}
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 px-0.5">
                                    <span>Likuid: {(((cashReal + retainedReal) / Math.max(totalGrossAssets, 1)) * 100).toFixed(1)}%</span>
                                    <span>Investasi & Valas: {(((investmentReal + forexValue) / Math.max(totalGrossAssets, 1)) * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* List Detail Per Kategori Aset */}
                        <div className="space-y-2 pt-1">
                            {calculatedCategories.map(cat => {
                                return (
                                    <div 
                                        key={cat.id}
                                        className="p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div 
                                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            <div className="truncate">
                                                <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                                                    {cat.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                                    {cat.desc}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="text-xs font-black text-slate-900 tabular-nums">
                                                    {formatRp(cat.amount)}
                                                </span>
                                                <span 
                                                    className="text-[10px] font-black px-1.5 py-0.5 rounded-md text-white tabular-nums"
                                                    style={{ backgroundColor: cat.color }}
                                                >
                                                    {cat.pct.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footnote Ringkasan Neraca Bersih */}
                        <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-[10px] font-semibold text-slate-600">
                            <div>
                                <span className="text-slate-400">Kekayaan Bersih (Net): </span>
                                <span className="font-black text-slate-900 tabular-nums">{displayWealth}</span>
                            </div>
                            {hutangReal > 0 && (
                                <div className="text-rose-700 font-bold">
                                    <span>Hutang: </span>
                                    <span className="tabular-nums">-{formatRp(hutangReal)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* REALISASI & CASHFLOW GRAPH BOX */}
            <div className="bg-white border border-slate-200/80 shadow-xs hover:shadow-sm rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Realisasi Kas Bulanan</h3>
                            <p className="text-[10px] text-slate-500 font-medium">Sentuh diagram bar untuk melihat mutasi</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            monthlyNet >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}>
                            Net: {monthlyNet > 0 ? '+' : ''}{formatRp(monthlyNet)}
                        </span>
                    </div>

                    <div className="flex items-end justify-around h-36 gap-4 pt-2">
                        {/* BAR PEMASUKAN */}
                        <div 
                            onClick={() => setExpandedDetail(expandedDetail === 'income' ? null : 'income')}
                            className={`flex flex-col items-center gap-1.5 w-full h-full justify-end group cursor-pointer p-2 rounded-2xl transition-all ${
                                expandedDetail === 'income' ? 'bg-emerald-50 border border-emerald-300 shadow-xs' : 'hover:bg-slate-50'
                            }`}
                        >
                            <span className="text-[10px] font-bold text-emerald-700 truncate max-w-full">{formatRp(monthlyIncome)}</span>
                            <div 
                                className="w-full bg-emerald-500 rounded-t-xl transition-all duration-700 shadow-xs" 
                                style={{ height: `${Math.max(monthlyIncome / Math.max(monthlyIncome, monthlyExpense, 1) * 100, 12)}%` }}
                            />
                            <span className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1 mt-1">
                                <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600"/> Masuk
                                {expandedDetail === 'income' ? <ChevronUp className="w-3 h-3 text-emerald-600"/> : <ChevronDown className="w-3 h-3 text-slate-400"/>}
                            </span>
                        </div>

                        {/* BAR PENGELUARAN */}
                        <div 
                            onClick={() => setExpandedDetail(expandedDetail === 'expense' ? null : 'expense')}
                            className={`flex flex-col items-center gap-1.5 w-full h-full justify-end group cursor-pointer p-2 rounded-2xl transition-all ${
                                expandedDetail === 'expense' ? 'bg-rose-50 border border-rose-300 shadow-xs' : 'hover:bg-slate-50'
                            }`}
                        >
                            <span className="text-[10px] font-bold text-rose-700 truncate max-w-full">{formatRp(monthlyExpense)}</span>
                            <div 
                                className="w-full bg-rose-500 rounded-t-xl transition-all duration-700 shadow-xs" 
                                style={{ height: `${Math.max(monthlyExpense / Math.max(monthlyIncome, monthlyExpense, 1) * 100, 12)}%` }}
                            />
                            <span className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1 mt-1">
                                <ArrowUpCircle className="w-3.5 h-3.5 text-rose-600"/> Keluar
                                {expandedDetail === 'expense' ? <ChevronUp className="w-3 h-3 text-rose-600"/> : <ChevronDown className="w-3 h-3 text-slate-400"/>}
                            </span>
                        </div>
                    </div>
                </div>

                {/* EXPANDED TRANSACTION LIST */}
                {expandedDetail && (
                    <div className="p-4 bg-slate-50 space-y-3 animate-in fade-in">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                Riwayat {expandedDetail === 'income' ? 'Pemasukan' : 'Pengeluaran'} Bulan Ini
                            </span>
                            <button 
                                type="button"
                                onClick={() => setExpandedDetail(null)} 
                                className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                        
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                            {detailList.length > 0 ? detailList.map((t: any, idx: number) => (
                                <div key={t.id || idx} className="bg-white p-3 rounded-2xl border border-slate-200/80 flex justify-between items-center shadow-xs">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <p className="text-xs font-extrabold text-slate-900 truncate">{t.category}</p>
                                        <p className="text-[10px] text-slate-500 font-medium truncate">{t.description || "Tanpa keterangan"}</p>
                                    </div>
                                    <div className="text-right mr-2 shrink-0">
                                        <p className={`text-xs font-black tabular-nums ${t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatRp(t.amount)}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-medium">{new Date(t.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</p>
                                    </div>
                                    {t.id && (
                                        <button 
                                            type="button"
                                            onClick={() => handleDeleteTransaction(t.id)} 
                                            disabled={isDeletingTx}
                                            className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors shrink-0 cursor-pointer"
                                            title="Hapus Transaksi"
                                        >
                                            {isDeletingTx ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5"/>}
                                        </button>
                                    )}
                                </div>
                            )) : (
                                <p className="text-center text-xs text-slate-400 font-medium py-6 bg-white rounded-2xl border border-dashed border-slate-200">
                                    Belum ada transaksi {expandedDetail} tercatat.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* PERFORMA INVESTASI & ROI REALISASI */}
            <div className="p-5 rounded-3xl bg-brand-navy text-white shadow-xs border-l-[6px] border-l-brand-gold relative overflow-hidden space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-extrabold text-base flex items-center gap-1.5 text-white">
                            <Briefcase className="w-4 h-4 text-brand-gold"/> Evaluasi Portofolio Multi-Aset
                        </h3>
                        <p className="text-[10px] text-slate-300 font-medium uppercase tracking-wider mt-0.5">
                            Kinerja Pertumbuhan & Alokasi Modal
                        </p>
                    </div>
                    <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2 py-0.5 rounded-md">
                        PORTFOLIO
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15">
                        <p className="text-[9px] text-slate-300 font-bold uppercase">ROI Realisasi Jual</p>
                        <p className={`text-lg font-black tabular-nums mt-0.5 ${totalCuanJual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalCuanJual >= 0 ? '+' : ''}{roiPercentage.toFixed(2)}%
                        </p>
                        <p className="text-[9px] text-slate-300 font-medium mt-0.5">Profit {formatRp(totalCuanJual)}</p>
                    </div>

                    <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15">
                        <p className="text-[9px] text-slate-300 font-bold uppercase">Porsi Aset & Valas</p>
                        <p className="text-lg font-black text-brand-gold tabular-nums mt-0.5">{assetAlocationRatio.toFixed(1)}%</p>
                        <p className="text-[9px] text-slate-300 font-medium mt-0.5">dari total kekayaan</p>
                    </div>
                </div>

                <div className="bg-brand-gold/15 border border-brand-gold/30 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-1.5 text-amber-300 mb-1">
                        <TrendingUp className="w-3.5 h-3.5"/>
                        <span className="text-[10px] font-black uppercase tracking-wider">Kesimpulan Strategi Modal:</span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                        {roiPercentage > 5 ? "Pertumbuhan modal positif dan efektif. Pertahankan diversifikasi instrumen Anda." : 
                         roiPercentage < 0 ? "Realisasi pertumbuhan modal minus. Evaluasi kembali waktu beli/jual instrumen Anda." :
                         "Struktur aset stabil. Alokasi dana terkelola secara bertahap tanpa over-exposure risiko."}
                    </p>
                </div>
            </div>

            {/* ALOKASI AMAL & SOSIAL */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-3xl p-5 shadow-xs relative overflow-hidden space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HeartHandshake className="w-5 h-5 text-emerald-700"/>
                        <h3 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider">Amal & Sedekah (Bulan Ini)</h3>
                    </div>
                    <span className="text-[9px] font-black text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-md">
                        {amalRatio.toFixed(1)}% Pemasukan
                    </span>
                </div>
                
                <p className="text-2xl font-black text-emerald-700 tracking-tight tabular-nums">
                    {formatRp(totalAmal)}
                </p>
                <p className="text-[10px] font-medium text-emerald-900/80 leading-relaxed">
                    {totalAmal > 0 ? "Alokasi keberkahan sosial murni di luar batas anggaran operasional harian Anda." : "Belum ada alokasi amal tercatat bulan ini. Berapapun nominalnya, jadikan keuangan Anda lebih berkah."}
                </p>
            </div>

            {/* KONTROL BUDGET & GOAL BULANAN */}
            <div className="bg-white border border-slate-200/80 shadow-xs hover:shadow-sm rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-600"/>
                        <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Limit Pengeluaran Bulanan</h3>
                    </div>
                    {isOverBudgetStrict && monthlyBudget > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md animate-pulse">
                            OVERBUDGET
                        </span>
                    )}
                </div>

                <div>
                    <div className="flex items-baseline gap-2 mb-1.5">
                        <h4 className="text-2xl font-black text-slate-900 tabular-nums">{formatCurrency(pureExpenses).split(',')[0]}</h4>
                        <span className="text-xs text-slate-500 font-medium">/ {monthlyBudget > 0 ? formatCurrency(monthlyBudget).split(',')[0] : "Tanpa Batas"}</span>
                    </div>

                    {monthlyBudget > 0 ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>Terpakai: {budgetPercentage.toFixed(1)}%</span>
                                <span>Sisa: {formatCurrency(remainingBudget).split(',')[0]}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                        isOverBudgetStrict ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                    }`}
                                    style={{ width: `${budgetPercentage}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-medium text-slate-400 pt-1 border-t border-slate-100">
                                <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3"/> Laju Waktu Bulan Ini:</span>
                                <span className="font-bold text-slate-700">{monthProgressPercent.toFixed(1)}% Hari Terlewati</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-brand-navy">Batas Belum Diatur</p>
                                <p className="text-[10px] text-slate-500 font-medium">Pasang limit untuk membatasi kebocoran kas.</p>
                            </div>
                            <Link href="/target">
                                <button className="bg-brand-navy text-brand-gold px-3.5 py-2 rounded-xl text-[10px] font-bold shadow-xs uppercase tracking-wider cursor-pointer">
                                    PASANG LIMIT
                                </button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* TABUNGAN WAJIB & DIAGNOSA AKHIR */}
                {hasTargetAmount && (
                    <div className="border-t border-slate-100 pt-3.5 space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Wajib Nabung</p>
                                <p className="text-sm font-black text-brand-navy mt-0.5">{formatRp(savingRequired)}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Target Pemasukan</p>
                                <p className="text-sm font-black text-emerald-700 mt-0.5">{formatRp(targetIncomeMonth)}</p>
                            </div>
                        </div>

                        <div className={`p-4 rounded-2xl border text-center ${
                            isSafe ? "border-emerald-300 bg-emerald-50/70" : "border-amber-300 bg-amber-50/70"
                        }`}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Diagnosa Laju Tabungan</p>
                            <h4 className={`text-base font-black mb-1 ${isSafe ? "text-emerald-800" : "text-amber-800"}`}>
                                {isSafe ? "AMAN (ON TRACK) 🎉" : "KURANG (OFF TRACK) ⚠️"}
                            </h4>
                            <p className="text-xs font-medium leading-relaxed text-slate-700">
                                {isSafe ? (
                                    <>Sisa surplus kas bersih Anda <strong>{formatRp(monthlyNet)}</strong> mencukupi syarat minimal tabungan bulanan.</>
                                ) : (
                                    <>Surplus kas hanya <strong>{formatRp(monthlyNet)}</strong>. Masih kurang <strong>{formatRp(savingRequired - monthlyNet)}</strong> untuk memenuhi target tabungan bulan ini.</>
                                )}
                            </p>
                        </div>
                    </div>
                )}
            </div>

        </div>
      </div>
    </MobileLayout>
  );
}