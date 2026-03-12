import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card } from "@/components/UIComponents";
import { useUser, useTransactions, useTarget, useInvestments } from "@/hooks/use-finance"; 
import { formatCurrency } from "@/lib/utils";
import { Target, AlertCircle, CalendarClock, ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronUp, Trophy, RefreshCcw, Loader2 } from "lucide-react";
import { Link } from "wouter";
// 🚀 FIX: Import mesin cache React Query
import { useQuery } from "@tanstack/react-query";

export default function Performance() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: transactions, isLoading: isTxLoading } = useTransactions();
  const { data: target, isLoading: isTargetLoading } = useTarget();
  const { data: investments, isLoading: isInvLoading } = useInvestments(); 

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();

  const [expandedDetail, setExpandedDetail] = useState<'income' | 'expense' | null>(null);

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  // =========================================================================
  // 🚀 FIX MUTLAK: Menggunakan useQuery agar data 100% nempel di memori HP
  // dan tidak akan pernah reset jadi 0 (delay) saat bolak-balik halaman!
  // =========================================================================
  const { data: forexRates = {}, isLoading: isRatesLoading } = useQuery({
      queryKey: ['forexRates', userEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": userEmail } });
          return res.json();
      },
      enabled: !!userEmail
  });

  const { data: forexAssetsData = [], isLoading: isForexLoading } = useQuery({
      queryKey: ['forexAssets', userEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex`, { headers: { "x-user-email": userEmail } });
          return res.json();
      },
      enabled: !!userEmail
  });

  const { data: debtsData = [], isLoading: isDebtsLoading } = useQuery({
      queryKey: ['debts', userEmail],
      queryFn: async () => {
          const res = await fetch(`/api/debts`, { headers: { "x-user-email": userEmail } });
          return res.json();
      },
      enabled: !!userEmail
  });

  const forexValue = forexAssetsData.reduce((acc: number, asset: any) => acc + (asset.amount * (forexRates[asset.currency] || 0)), 0);
  // =========================================================================

  // === KALKULASI TOTAL NET WORTH LIVE ===
  const cashReal = (user?.cashBalance || 0); 
  
  const investmentReal = investments?.reduce((acc, inv) => {
      const [sym, curr] = (inv.symbol || "").split('|');
      const actualCurr = curr || 'IDR';
      const rate = actualCurr === 'IDR' ? 1 : (forexRates[actualCurr] || 1);
      
      const isSaham = inv.type === 'saham' || (!inv.type && sym.length === 4 && inv.type !== 'crypto');
      const m = (isSaham && actualCurr === 'IDR') ? 100 : 1;
      
      return acc + (inv.quantity * inv.avgPrice * m * rate);
  }, 0) || 0;

  let piutangReal = 0;
  let hutangReal = 0;
  
  debtsData.forEach((d: any) => {
      if (d.isPaid) return;
      const [, curr] = (d.name || "").split('|');
      const actualCurr = curr || 'IDR';
      const rate = actualCurr === 'IDR' ? 1 : (forexRates[actualCurr] || 1);
      
      if (d.type === 'piutang') piutangReal += (d.amount * rate);
      else if (d.type === 'hutang') hutangReal += (d.amount * rate);
  });

  const currentWealth = cashReal + investmentReal + forexValue + piutangReal - hutangReal;

  let targetIncomeMonth = 0;
  let savingRequired = 0;
  let expenseLimit = 0;
  let monthsRemaining = 1; 
  let progressPercent = 0;
  let gap = 0;
  let isPeriodEnded = false;
  let isTargetAchieved = false;

  if (target && target.targetAmount > 0) {
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
  } else if (target && target.monthlyBudget > 0) {
      expenseLimit = target.monthlyBudget;
  }

  // =========================================================================
  // 🚀 FIX: LOGIKA CERDAS PENGHITUNG UNTUNG/RUGI INVESTASI (P/L)
  // =========================================================================
  const thisMonthTx = transactions?.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  }) || [];

  const baseIncomeTxs = thisMonthTx.filter(t => t.type === 'income');
  const baseExpenseTxs = thisMonthTx.filter(t => t.type === 'expense' && !t.category?.toLowerCase().includes('invest'));

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
      
  const monthlyNet = monthlyIncome - monthlyExpense;
  
  const isSafe = monthlyNet >= savingRequired; 
  const isOverBudget = expenseLimit > 0 && monthlyExpense > expenseLimit;

  const detailList = (expandedDetail === 'income' ? allIncomeTxs : (expandedDetail === 'expense' ? allExpenseTxs : []))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatRp = (val: number) => {
      if (isNaN(val)) return "Rp 0";
      return formatCurrency(val).split(",")[0];
  };

  // 🚀 Tambahan penjaga status loading query baru
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

  return (
    <MobileLayout title="Analisa Performa" showBack>
      <div className="space-y-6 pt-4 pb-24 px-1">

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
                    <p className="text-[11px] text-blue-200 uppercase tracking-widest font-bold">Total Kekayaan Bersih</p>
                    
                    {target && (
                        <Link href="/target">
                            <button className="bg-yellow-400 hover:bg-yellow-500 text-indigo-950 px-3 py-1.5 rounded-full text-[9px] font-extrabold shadow-md transition-all active:scale-95 uppercase tracking-wider whitespace-nowrap">
                                {target.targetAmount > 0 ? "EDIT TARGET" : "TAMBAH TARGET"}
                            </button>
                        </Link>
                    )}
                </div>

                <h2 className="text-4xl font-extrabold font-display text-white truncate block w-full">{formatRp(currentWealth)}</h2>
                
                <div className="flex flex-wrap gap-2 mt-4 text-[10px] font-bold">
                    <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">Tunai: {formatRp(cashReal)}</span>
                    <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">Aset: {formatRp(investmentReal + forexValue)}</span>
                    {(piutangReal > 0 || hutangReal > 0) && (
                        <span className={`bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 ${piutangReal - hutangReal >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                            Hutang/Piutang: {formatRp(piutangReal - hutangReal)}
                        </span>
                    )}
                </div>
            </div>

            {target && target.targetAmount > 0 && (
                <div className="relative z-10 bg-black/20 p-4 rounded-[20px] backdrop-blur-sm border border-white/10">
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

        {target ? (
            <div className="grid grid-cols-1 gap-5">
                
                {target.targetAmount > 0 && (
                    <div className="p-6 rounded-[32px] bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
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
                )}

                <div className="p-0 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white overflow-hidden rounded-[32px]">
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
                            
                            <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                {detailList.length > 0 ? detailList.map((t, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-extrabold text-slate-800">{t.category}</p>
                                            <p className="text-[11px] text-slate-500 line-clamp-1">{t.description || "Tanpa keterangan"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-extrabold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {t.type === 'income' ? '+' : '-'}{formatRp(t.amount)}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">{new Date(t.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center text-xs text-slate-400 italic py-6 bg-white rounded-[20px] border border-dashed border-slate-200">Belum ada transaksi bulan ini.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

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
        ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-[32px] shadow-sm border border-slate-100 mt-4">
                <div className="bg-slate-50 p-5 rounded-full mb-4">
                    <AlertCircle className="w-12 h-12 text-slate-300"/>
                </div>
                <p className="font-extrabold text-slate-600 text-base mb-1">Belum ada strategi aktif.</p>
                <p className="text-xs text-slate-400 mb-6">Atur tujuan finansialmu sekarang.</p>
                <Link href="/target">
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full text-sm font-extrabold shadow-lg shadow-indigo-200 transition-transform active:scale-95">
                        MULAI SETUP STRATEGI
                    </button>
                </Link>
            </div>
        )}

      </div>
    </MobileLayout>
  );
}