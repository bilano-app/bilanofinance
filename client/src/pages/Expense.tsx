import { useState } from "react";
import { Link } from "wouter";
import { useUser, useTarget, useAddTransaction, useTransactions } from "@/hooks/use-finance"; 
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents"; 
import { 
    Wallet, AlertOctagon, Loader2, HandCoins, X, AlertCircle, 
    ArrowLeft, ArrowUpRight, CheckCircle2, Sparkles, Plus, 
    Calendar, Check, ShieldAlert, CreditCard
} from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { trackEvent } from "@/lib/tracking";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { formatCurrency } from "@/lib/utils";

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000, 250000, 500000];

const EXPENSE_CATEGORIES = [
    { label: "Makan", icon: "🍜" },
    { label: "Transport", icon: "🚗" },
    { label: "Belanja", icon: "🛍️" },
    { label: "Tagihan", icon: "💡" },
    { label: "Hiburan", icon: "🍿" },
    { label: "Kesehatan", icon: "💊" },
];

export default function Expense() {
  const { toast } = useToast();
  
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: target, isLoading: isTargetLoading } = useTarget();
  const { data: transactions, isLoading: isTxLoading } = useTransactions();
  const addTransactionMutation = useAddTransaction();

  const [amountStr, setAmountStr] = useState(""); 
  const [category, setCategory] = useState("Makan");
  const [desc, setDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyDetails, setEmergencyDetails] = useState({ deficit: 0, nextMonthLimit: 0 });

  const [paymentMode, setPaymentMode] = useState<'cash' | 'hutang'>('cash');
  const [debtName, setDebtName] = useState("");
  const [dueDate, setDueDate] = useState("");

  const formatNumber = (value: string) => value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    setAmountStr(formatNumber(e.target.value));
  };
  const handleQuickAdd = (amt: number) => {
    setErrorMsg("");
    setAmountStr(new Intl.NumberFormat("id-ID").format(amt));
  };

  const parseNumber = (value: string) => Number(value.replace(/\./g, "")) || 0;
  const formatRp = (val: number) => "Rp " + val.toLocaleString("id-ID");

  const now = new Date();
  const currentMonthIdx = now.getMonth(); 
  const currentYear = now.getFullYear();
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [showSourcePopup, setShowSourcePopup] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{ isEmergency: boolean } | null>(null);

  let remainingBudget = 0;     
  let budgetLabel = "Batas Bulan Ini";

  if (target && target.monthlyBudget > 0) {
      if (target.budgetType === 'rollover') {
          const startMonthIdx = (target.startMonth || 1) - 1; 
          const startYear = target.startYear || currentYear;
          const diffYear = currentYear - startYear;
          const diffMonth = currentMonthIdx - startMonthIdx;
          const totalMonthsActive = Math.max(1, (diffYear * 12) + diffMonth + 1);
          
          const totalBudgetPool = target.monthlyBudget * totalMonthsActive;
          
          const allExpensesSinceStart = transactions?.filter(t => {
              const tDate = new Date(t.date);
              return t.type === 'expense' && tDate >= new Date(startYear, startMonthIdx, 1);
          }).reduce((acc, t) => acc + t.amount, 0) || 0;

          remainingBudget = totalBudgetPool - allExpensesSinceStart;
          budgetLabel = "Sisa Akumulasi Rollover";
      } else {
          const expensesThisMonth = transactions?.filter(t => {
              const d = new Date(t.date);
              return t.type === 'expense' && d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
          }).reduce((acc, t) => acc + t.amount, 0) || 0;

          remainingBudget = target.monthlyBudget - expensesThisMonth;
          budgetLabel = "Sisa Jatah Bulan Ini";
      }
  }

  const handleInitiateSubmit = (isEmergencyOverride = false) => {
      setErrorMsg("");
      const nominal = parseNumber(amountStr);
      if (!nominal || nominal <= 0) {
          setErrorMsg("Masukkan nominal pengeluaran yang valid.");
          return;
      }

      if (paymentMode === 'hutang' && (!debtName.trim() || !dueDate)) { 
          setErrorMsg("Lengkapi nama pihak/toko dan tenggat waktu hutang.");
          return; 
      }

      if (user?.walletSources && (user.walletSources as any[]).length > 0 && paymentMode === 'cash') {
          setPendingSubmit({ isEmergency: isEmergencyOverride });
          setShowSourcePopup(true);
      } else {
          handleSubmit(isEmergencyOverride);
      }
  };

  const handleSubmit = async (isEmergencyOverride = false, selectedSource?: string) => {
      const nominal = parseNumber(amountStr);
      if (!nominal || nominal <= 0) {
          setErrorMsg("Masukkan nominal pengeluaran yang valid.");
          return;
      }

      if (paymentMode === 'hutang' && (!debtName.trim() || !dueDate)) { 
          setErrorMsg("Lengkapi nama pihak dan tenggat waktu hutang.");
          return; 
      }
      
      const spendingAmount = nominal; 

      if (paymentMode === 'cash' && user && spendingAmount > user.cashBalance) {
          setErrorMsg(`Uang tunai Anda tidak mencukupi. (Saldo: ${formatRp(user.cashBalance)}, Pengeluaran: ${formatRp(spendingAmount)})`);
          return;
      }

      if (target && target.monthlyBudget > 0 && !isEmergencyOverride && paymentMode === 'cash') {
          if (spendingAmount > remainingBudget) {
             const deficit = spendingAmount - remainingBudget;
             const nextMonthPred = target.monthlyBudget - deficit;
             setEmergencyDetails({ deficit, nextMonthLimit: nextMonthPred });
             setShowEmergencyModal(true);
             return;
          }
      }

      setIsSubmitting(true);
      
      try {
          if (paymentMode === 'cash') {
              await addTransactionMutation.mutateAsync({
                  type: 'expense',
                  amount: spendingAmount, 
                  category: category,
                  description: desc.trim() || "Pengeluaran Rutin",
                  date: new Date(),
                  source: selectedSource
              } as any);

              if (isEmergencyOverride) {
                  try {
                      await fetch("/api/target/penalty", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                          body: JSON.stringify({ amount: emergencyDetails.deficit })
                      });
                  } catch (e) {}
              }

          } else {
              await fetch("/api/debts", {
                  method: "POST", 
                  headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                  body: JSON.stringify({ 
                      type: 'hutang', 
                      name: `${debtName.trim()}|IDR`, 
                      amount: spendingAmount, 
                      dueDate: dueDate, 
                      description: `[Hutang Pengeluaran: ${category}] ${desc.trim()}`,
                      isFromTransaction: true 
                  })
              });
              
              await addTransactionMutation.mutateAsync({ 
                  type: 'hutang_record', 
                  amount: spendingAmount, 
                  category: `Hutang: ${category}`, 
                  description: `Belum Dibayar - ${debtName.trim()}`, 
                  date: new Date(),
                  source: selectedSource
              } as any);
          }

          trackEvent("manual_tx_added", { 
            type: "expense", 
            category: category,
            paymentMode: paymentMode 
          });

          await queryClient.invalidateQueries();
          setShowEmergencyModal(false);
          window.location.href = "/"; 

      } catch (error) {
          setErrorMsg("Terjadi kesalahan sistem saat menyimpan pengeluaran.");
      } finally {
          setIsSubmitting(false);
      }
  };

  const currentCash = user?.cashBalance || 0;
  const displayBalance = formatRp(currentCash);

  if (isUserLoading || isTargetLoading || isTxLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-rose-600 animate-spin mb-3"/>
              <p className="text-xs font-bold text-slate-500">Memuat Data Keuangan...</p>
          </div>
      );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA ROSE RED (#E11D48) & GOLD ACCENT */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#FFF1F2] via-[#FFE4E6] to-[#FECDD3] flex flex-col relative z-10 border-b-2 border-rose-500">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(225,29,72,0.08)] flex items-center justify-between relative z-30 border-b border-rose-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                            title="Kembali ke Beranda"
                        >
                            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                            <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest">
                                Arus Kas Keluar
                            </p>
                        </div>
                        <h1 className="text-lg font-black text-slate-900 leading-tight">
                            Catat Pengeluaran
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border-2 border-rose-200 text-rose-900 px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 text-[11px] font-black">
                        <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                        <span>EXPENSE</span>
                    </div>
                </div>
            </div>

            {/* 2. HERO CARD SALDO KAS & SISA BUDGET (FORMAT KARTU HOME) */}
            <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-pink-900 text-white p-5 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <ArrowUpRight className="absolute -right-4 -bottom-4 w-36 h-36 text-white/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20 backdrop-blur-xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-brand-gold fill-current" />
                            SALDO KAS TERSEDIA
                        </span>

                        <span className="text-[10px] text-rose-100 font-bold bg-black/30 px-2.5 py-0.5 rounded-full border border-white/20">
                            {paymentMode === 'cash' ? 'Tunai Kas' : 'Hutang Tertunda'}
                        </span>
                    </div>

                    <p className="text-[10px] font-bold text-rose-100 uppercase tracking-widest mb-0.5">
                        Saldo Kas Likuid
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2 tabular-nums">
                        {displayBalance}
                    </h2>

                    {/* Sisa Budget Bar */}
                    {target && target.monthlyBudget > 0 ? (
                        <div className="mt-2 bg-black/25 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
                            <div className="flex justify-between items-center text-[10px] mb-1 font-bold">
                                <span className="text-rose-200">{budgetLabel}</span>
                                <span className={remainingBudget < 0 ? "text-rose-300 font-black" : "text-white"}>
                                    {formatRp(remainingBudget)}
                                </span>
                            </div>
                            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all ${remainingBudget < 0 ? 'bg-rose-400' : 'bg-brand-gold'}`}
                                    style={{ width: `${Math.min(100, Math.max(0, (remainingBudget / target.monthlyBudget) * 100))}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between pt-2 border-t border-white/15 text-[10px] text-rose-100 font-semibold">
                            <span>Mode Pengeluaran Bebas</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded-md font-bold text-white">Tanpa Limit</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY FORM SECTION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-4 pb-20 bg-slate-50 flex flex-col gap-4">
            
            {/* SWITCHER METODE PENGELUARAN NEO-BRUTALIST */}
            <div className="bg-white p-1.5 rounded-[22px] border-2 border-rose-200 shadow-[4px_4px_0px_0px] shadow-slate-900 flex gap-1.5">
                <button 
                    type="button"
                    onClick={() => setPaymentMode('cash')} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'cash' 
                            ? 'bg-rose-600 text-white shadow-[2px_2px_0px_0px] shadow-slate-950 translate-x-[-1px] translate-y-[-1px]' 
                            : 'text-slate-600 hover:text-rose-700'
                    }`}
                >
                    <Wallet className="w-4 h-4 stroke-[2.5]" />
                    <span>TUNAI (DIPOTONG KAS)</span>
                </button>

                <button 
                    type="button"
                    onClick={() => setPaymentMode('hutang')} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'hutang' 
                            ? 'bg-amber-500 text-white shadow-[2px_2px_0px_0px] shadow-slate-950 translate-x-[-1px] translate-y-[-1px]' 
                            : 'text-slate-600 hover:text-amber-600'
                    }`}
                >
                    <HandCoins className="w-4 h-4 stroke-[2.5]" />
                    <span>HUTANG (NGUTANG DULU)</span>
                </button>
            </div>

            {/* CARD FORM CATAT PENGELUARAN */}
            <div className="bg-white p-5 rounded-[28px] shadow-[6px_6px_0px_0px] shadow-slate-900 border-2 border-rose-200 space-y-4">
                
                {/* Input Nominal */}
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                        Nominal Pengeluaran (Rp)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">Rp</span>
                        <Input 
                            type="tel" 
                            inputMode="numeric" 
                            placeholder="0" 
                            value={amountStr} 
                            onChange={handleAmountChange} 
                            className="pl-14 h-16 text-2xl font-black text-slate-900 bg-slate-50 border-2 border-slate-200 focus:border-rose-600 rounded-2xl focus:bg-white transition-all"
                        />
                    </div>

                    {/* Quick Amount Pills */}
                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                        {QUICK_AMOUNTS.map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => handleQuickAdd(amt)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 border border-slate-200 text-[11px] font-black text-slate-700 hover:text-rose-800 shrink-0 transition-all active:scale-95 cursor-pointer"
                            >
                                +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Khusus Hutang */}
                {paymentMode === 'hutang' && (
                    <div className="bg-amber-50/70 border-2 border-amber-200 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-1.5 text-amber-800 text-xs font-black">
                            <HandCoins className="w-4 h-4" />
                            <span>Detail Hutang Pengeluaran</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                                Ngutang Ke Siapa? (Nama Toko / Pihak)
                            </label>
                            <Input 
                                placeholder="Contoh: Toko Berkah, Teman Budi..." 
                                value={debtName} 
                                onChange={e => setDebtName(e.target.value)} 
                                className="h-12 bg-white border-2 border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                                Tenggat Waktu Jatuh Tempo (Wajib)
                            </label>
                            <Input 
                                type="date" 
                                value={dueDate} 
                                onChange={e => setDueDate(e.target.value)} 
                                className="h-12 bg-white border-2 border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500 w-full"
                            />
                        </div>
                    </div>
                )}

                {/* Pilihan Kategori */}
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                        Pilih Kategori Pengeluaran
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                        {EXPENSE_CATEGORIES.map((cat) => {
                            const isSelected = category === cat.label;
                            return (
                                <button
                                    key={cat.label}
                                    type="button"
                                    onClick={() => setCategory(cat.label)}
                                    className={`py-2.5 px-2 rounded-2xl text-xs font-black border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
                                        isSelected
                                            ? "bg-rose-50 text-rose-800 border-rose-600 shadow-[2px_2px_0px_0px] shadow-rose-900 translate-x-[-1px] translate-y-[-1px]"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
                                    }`}
                                >
                                    <span className="text-base">{cat.icon}</span>
                                    <span className="truncate">{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <Input 
                        placeholder="Ketik kategori kustom lainnya..." 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)} 
                        className="text-xs font-bold h-12 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-rose-600 mb-3"
                    />
                    
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                        Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                        placeholder="Contoh: Beli makan siang, bensin, servis motor..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 outline-none focus:border-rose-600 focus:bg-white transition-all text-xs font-medium text-slate-800 min-h-[90px] resize-none"
                    />
                </div>

                {errorMsg && (
                    <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {errorMsg}
                    </p>
                )}

                {/* Tombol Eksekusi Submit */}
                <button 
                    type="button"
                    onClick={() => handleInitiateSubmit(false)} 
                    disabled={isSubmitting}
                    className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-[4px_4px_0px_0px] shadow-slate-900 active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                        paymentMode === 'hutang' 
                            ? 'bg-amber-500 hover:bg-amber-600' 
                            : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>MENYIMPAN PENGELUARAN...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                            <span>{paymentMode === 'hutang' ? "SIMPAN HUTANG PENGELUARAN" : "SIMPAN PENGELUARAN KAS"}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ⚠️ MODAL PERINGATAN BUDGET DARURAT */}
      {/* ========================================================================= */}
      {showEmergencyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative border-4 border-rose-600 text-center animate-in zoom-in-95">
                  <button 
                      onClick={() => setShowEmergencyModal(false)} 
                      className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
                  >
                      <X className="w-4 h-4" />
                  </button>
                  
                  <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                      <AlertOctagon className="w-8 h-8" />
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-900 mb-1">Budget Terlampaui!</h3>
                  <p className="text-xs text-slate-500 font-semibold mb-4">
                      Sisa jatah budget: <span className="font-black text-slate-800">{formatRp(remainingBudget < 0 ? 0 : remainingBudget)}</span>
                  </p>

                  <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl text-left space-y-2 mb-4">
                      <div className="flex justify-between text-xs font-black">
                          <span className="text-slate-600">Nominal Defisit:</span>
                          <span className="text-rose-600">{formatRp(emergencyDetails.deficit)}</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                          Jika dilanjutkan, pengeluaran ini akan menggunakan <strong>Dana Darurat</strong> dan memotong budget bulan depan.
                      </p>
                      <div className="flex justify-between text-xs font-black bg-white p-2.5 rounded-xl border border-rose-200 mt-2">
                          <span className="text-slate-500">Budget Bulan Depan:</span>
                          <span className="text-[#1D3E72]">{formatRp(emergencyDetails.nextMonthLimit)}</span>
                      </div>
                  </div>

                  <div className="flex gap-2">
                      <button 
                          onClick={() => setShowEmergencyModal(false)} 
                          className="flex-1 h-12 rounded-2xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-black"
                      >
                          Batal
                      </button>
                      <button 
                          onClick={() => { setShowEmergencyModal(false); handleInitiateSubmit(true); }} 
                          className="flex-1 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-[3px_3px_0px_0px] shadow-slate-900 active:translate-x-[1px] active:translate-y-[1px]"
                          disabled={isSubmitting}
                      >
                          {isSubmitting ? "Memproses..." : "Pakai Darurat"}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* POPUP PEMILIHAN SUMBER DANA */}
      {showSourcePopup && (
          <SourceSelectionPopup 
              type="expense"
              title="Pilih Dompet Pengeluaran"
              description="Pilih rekening atau dompet sumber dana yang digunakan."
              onCancel={() => {
                  setShowSourcePopup(false);
                  setPendingSubmit(null);
              }}
              onSelect={(src) => {
                  setShowSourcePopup(false);
                  if (pendingSubmit) {
                      handleSubmit(pendingSubmit.isEmergency, src);
                  }
                  setPendingSubmit(null);
              }}
          />
      )}
    </MobileLayout>
  );
}