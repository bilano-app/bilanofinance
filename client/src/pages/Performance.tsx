import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card, Button } from "@/components/UIComponents";
import { useUser, useTransactions, useTarget, useInvestments } from "@/hooks/use-finance"; 
import { formatCurrency } from "@/lib/utils";
import { 
  Target, AlertCircle, CalendarClock, ArrowDownCircle, ArrowUpCircle, 
  ChevronDown, ChevronUp, Trophy, RefreshCcw, Loader2, Lock, Crown, 
  ShieldCheck, ChevronRight, X, CreditCard, Briefcase, TrendingUp, Trash2, HeartHandshake 
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_RATES: Record<string, number> = {
    "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
    "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
};

export default function Performance() {
  // ====================================================================
  // 1. SEMUA HOOKS & PENGAMBILAN DATA (HARUS DI ATAS)
  // ====================================================================
  const { data: user, isLoading: isUserLoading } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isCharging, setIsCharging] = useState(false);
  const [isDeletingTx, setIsDeletingTx] = useState(false);
  const [expandedDetail, setExpandedDetail] = useState<'income' | 'expense' | null>(null);

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

  // ====================================================================
  // 2. LOGIKA KUNCI & TOMBOL BAYAR
  // ====================================================================
  const isPro = user?.isPro || localStorage.getItem("bilano_pro") === "true";
  const isTrialExpired = localStorage.getItem("bilano_trial_expired") === "true";
  const locked = !isUserLoading && !isPro && isTrialExpired;

  const handleLanjutBayar = async () => {
      if (!currentUserEmail) { toast({ title: "Email required", variant: "destructive" }); return; }
      setIsCharging(true);
      try {
          const res = await fetch("/api/payment/mayar/charge", { method: "POST", headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail } });
          const data = await res.json();
          if (res.ok && data.redirectUrl) {
              localStorage.setItem("bilano_pro", "true");
              localStorage.setItem(`bilano_trial_expired_${currentUserEmail}`, "false");
              localStorage.setItem("bilano_trial_expired", "false");
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

  // ====================================================================
  // 3. TAMPILAN LOADING
  // ====================================================================
  if (isUserLoading || isTxLoading || isTargetLoading || isInvLoading || isRatesLoading || isForexLoading || isDebtsLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span>Memuat Data...</span>
              </div>
          </div>
      );
  }

  // ====================================================================
  // 4. 🚨 TAMPILAN TERKUNCI (ANTI CRASH) 🚨
  // Langsung potong di sini untuk Non-Pro. Semua beban matematika di bawah
  // TIDAK AKAN dieksekusi, sehingga layar dijamin tidak akan pernah blank!
  // ====================================================================
  if (locked) {
      return (
          <MobileLayout title="Analisa Performa" showBack>
              <div className="relative min-h-screen bg-slate-50 overflow-hidden pb-24">
                  
                  {/* Efek Blur Bayangan Dashboard di Belakang */}
                  <div className="p-4 space-y-6 blur-md opacity-40 select-none pointer-events-none mt-2">
                      <div className="bg-gradient-to-br from-blue-600 to-violet-800 h-48 rounded-[32px] w-full shadow-lg"></div>
                      <div className="bg-emerald-100 h-28 rounded-[32px] w-full"></div>
                      <div className="bg-white h-72 rounded-[32px] shadow-sm border border-slate-200 w-full"></div>
                  </div>

                  {/* Overlay Gembok Paywall */}
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(251,191,36,0.4)] animate-bounce-slow">
                          <Crown className="w-10 h-10 text-amber-950" />
                      </div>
                      
                      <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Akses Terkunci</h2>
                      <p className="text-sm text-slate-600 mb-8 max-w-xs leading-relaxed font-medium">
                          Masa percobaan Anda telah habis. Berlangganan <b className="text-slate-800">BILANO PRO</b> sekarang untuk membuka penuh Analisis Cashflow, ROI Aset, dan Diagnosa Target Finansial.
                      </p>
                      
                      {/* Kartu Harga */}
                      <div className="w-full max-w-sm bg-white p-5 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100 mb-8 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 to-amber-500"></div>
                          <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest mb-3 mt-1">Tagihan Langganan</p>
                          <div className="flex items-end justify-center gap-1.5 mb-2">
                              <span className="text-4xl font-black text-slate-800 tracking-tight">Rp99.000</span>
                              <span className="text-sm font-bold text-slate-400 mb-1.5">/ tahun</span>
                          </div>
                          <div className="bg-amber-50 text-amber-700 text-[10px] font-extrabold px-3 py-1.5 rounded-full inline-block mt-1">
                              Garansi Harga Tetap Selamanya
                          </div>
                      </div>

                      {/* Tombol Eksekusi */}
                      <Button 
                          onClick={handleLanjutBayar} 
                          disabled={isCharging}
                          className="w-full max-w-sm h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full shadow-2xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                      >
                          {isCharging ? <Loader2 className="w-5 h-5 animate-spin"/> : "BERLANGGANAN SEKARANG"}
                      </Button>
                      
                      <p className="mt-6 text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-500"/> Pembayaran Aman & Otomatis oleh Mayar
                      </p>
                  </div>
              </div>
          </MobileLayout>
      );
  }

  // ====================================================================
  // 5. PERHITUNGAN MATEMATIKA (HANYA UNTUK USER PRO & TRIAL AKTIF)
  // ====================================================================
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();

  const cashReal = (user?.cashBalance || 0); 
  
  const forexValue = Array.isArray(forexAssetsData) ? forexAssetsData.reduce((acc: number, asset: any) => {
      const curr = asset.currency;
      const rate = forexRates[curr] || DEFAULT_RATES[curr] || 15000;
      return acc + (asset.amount * rate);
  }, 0) : 0;

  const investmentReal = Array.isArray(investments) ? investments.reduce((acc, inv) => {
      const [sym, curr] = (inv.symbol || "").split('|');
      const actualCurr = curr || 'IDR';
      const rate = actualCurr === 'IDR' ? 1 : (forexRates[actualCurr] || DEFAULT_RATES[actualCurr] || 15000);
      const isSaham = inv.type === 'saham' || (!inv.type && sym.length === 4 && inv.type !== 'crypto');
      const m = (isSaham && actualCurr === 'IDR') ? 100 : 1;
      return acc + (inv.quantity * inv.avgPrice * m * rate);
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

  const currentWealth = cashReal + investmentReal + forexValue + piutangReal - hutangReal;
  const allTimeTx = Array.isArray(transactions) ? transactions : [];
  
  let totalCuanJual = 0;
  let totalModalTerpakai = 0;

  allTimeTx.filter(t => t.type === 'invest_sell').forEach(t => {
      if (t.description && t.description.includes('P/L:')) {
          const plString = t.description.split('P/L:')[1];
          if (plString) {
              const plValue = parseInt(plString.replace(/[^0-9-]/g, ''), 10);
              if (!isNaN(plValue)) {
                  totalCuanJual += plValue;
                  totalModalTerpakai += (t.amount - plValue); 
              }
          }
      }
  });

  const roiPercentage = totalModalTerpakai > 0 ? (totalCuanJual / totalModalTerpakai) * 100 : 0;
  const assetAlocationRatio = currentWealth > 0 ? ((investmentReal + forexValue) / currentWealth) * 100 : 0;

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
      !t.description?.includes('[Bayar Valas]') && 
      t.category !== 'Penyesuaian Sistem' && 
      t.category !== 'Pemutihan Hutang' &&
      t.category !== 'Cairkan Valas' &&
      t.category !== 'Investasi Valas' && 
      t.category !== 'Tukar Valas' &&
      t.category !== 'Jual Aset' &&
      !(t.category || '').includes('Piutang Dibayar') &&
      !(t.category || '').includes('Dapat Pinjaman')
  );
  
  const baseExpenseTxs = thisMonthTx.filter(t => 
      (t.type === 'expense' || t.type === 'hutang_record') && 
      !(t.category || '').toLowerCase().includes('invest') && 
      !t.description?.includes('[Offset') && 
      !t.description?.includes('[WRITE_OFF]') && 
      !t.description?.includes('[Catat Awal]') && 
      !t.description?.includes('[Bayar Valas]') && 
      t.category !== 'Penyesuaian Sistem' && 
      t.category !== 'Penghapusan Piutang' &&
      t.category !== 'Tukar Valas' &&
      t.category !== 'Investasi Valas' && 
      t.category !== 'Cairkan Valas' &&
      t.category !== 'Amal' && 
      !(t.category || '').includes('Bayar Hutang') &&
      !(t.category || '').includes('Beri Pinjaman')
  );

  const virtualPLTxs: any[] = [];
  thisMonthTx.filter(t => t.type === 'invest_sell').forEach(t => {
      if (t.description && t.description.includes('P/L:')) {
          const plString = t.description.split('P/L:')[1];
          if (plString) {
              const cleanString = plString.replace(/[^0-9-]/g, '');
              const plValue = parseInt(cleanString, 10);
              
              if (!isNaN(plValue) && plValue !== 0) {
                  virtualPLTxs.push({
                      ...t, 
                      type: plValue > 0 ? 'income' : 'expense',
                      amount: Math.abs(plValue),
                      category: plValue > 0 ? 'Profit Investasi' : 'Rugi Investasi',
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

  // ====================================================================
  // 6. RENDER DASHBOARD ASLI (BERSIH DARI KODE BLUR/LOCK)
  // ====================================================================
  return (
    <MobileLayout title="Analisa Performa" showBack>
      <div className="space-y-6 pt-4 px-1 pb-24">

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
                    
                    {piutangReal > 0 && (
                        <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-emerald-200">
                            Piutang: {formatRp(piutangReal)}
                        </span>
                    )}
                    
                    {hutangReal > 0 && (
                        <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-rose-200">
                            Hutang: {formatRp(hutangReal)}
                        </span>
                    )}
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

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-[32px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-200/50 rounded-full blur-2xl group-hover:bg-emerald-300/50 transition-colors pointer-events-none"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <HeartHandshake className="w-5 h-5 text-emerald-600"/>
                    <h3 className="font-extrabold text-emerald-900 text-sm">Amal & Sedekah (Bulan Ini)</h3>
                </div>
                <p className="text-[10px] font-medium text-emerald-700 mb-2">Pahala yang mengalir tanpa memotong budget bulanan</p>
                <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatRp(totalAmal)}</p>
            </div>
        </div>

        <div className="p-0 border border-slate-100 shadow-[0_4px_20_rgb(0,0,0,0.03)] bg-white overflow-hidden rounded-[32px] relative">
            <div>
                <div className="p-6 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-extrabold text-slate-800 text-base">Realisasi & Cashflow</h3>
                            <p className="text-[11px] text-slate-400 font-medium">Klik grafik untuk rincian</p>
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
                                            title="Hapus Transaksi Ini"
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

        {isPro && (totalCuanJual !== 0 || investmentReal > 0) && (
            <div className="p-6 rounded-[32px] bg-slate-900 text-white shadow-xl border border-slate-700 relative overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
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
                        <span className="text-[11px] font-black uppercase">Analisa Strategi:</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        {roiPercentage > 5 ? "Gaya trading Anda sangat efektif! Lanjutkan konsistensi ini untuk mempercepat kebebasan finansial." : 
                            roiPercentage < 0 ? "Realisasi cuan sedang negatif. Lakukan evaluasi mendalam pada pemilihan aset atau waktu masuk/keluar pasar." :
                            "Hasil investasi masih stabil. Fokus pada manajemen risiko dan diversifikasi aset untuk pertumbuhan jangka panjang."}
                    </p>
                </div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            </div>
        )}

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
                                    className={`h-full rounded-full transition-all duration-1000 ${isOverBudgetStrict ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}`}
                                    style={{ width: `${budgetPercentage}%` }}
                                ></div>
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
                                    <span className="text-base font-extrabold text-emerald-400 truncate flex-shrink-0 max-w-[50%] text-right" title={formatRp(targetIncomeMonth)}>{formatRp(targetIncomeMonth)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {target.targetAmount > 0 && (
                        <div className={`p-6 text-center rounded-[32px] border-2 shadow-sm relative overflow-hidden ${isSafe ? "border-emerald-100 bg-emerald-50" : "border-orange-100 bg-orange-50"}`}>
                            <div>
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
                        </div>
                    )}

                    {target.targetAmount === 0 && expenseLimit > 0 && (
                        <div className={`p-6 text-center rounded-[32px] border-2 shadow-sm relative overflow-hidden ${!isOverBudget ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
                            <div>
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
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-white rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 mt-2 px-6 text-center animate-in slide-in-from-bottom-4">
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