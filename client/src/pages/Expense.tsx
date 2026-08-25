import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    CreditCard, ArrowLeft, Plus, Check, Loader2, Sparkles, 
    Wallet, HandCoins, AlertCircle, ArrowUpRight, AlertTriangle, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useTransactions, useTarget } from "@/hooks/use-finance";
import { useQueryClient } from "@tanstack/react-query";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { formatCurrency } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking";

const EXPENSE_CATEGORIES = [
    { label: "Makan & Minum", icon: "🍜" },
    { label: "Transportasi", icon: "🚗" },
    { label: "Belanja Harian", icon: "🛒" },
    { label: "Tagihan & Utilitas", icon: "⚡" },
    { label: "Hiburan & Liburan", icon: "🎬" },
    { label: "Kesehatan", icon: "💊" },
    { label: "Edukasi & Buku", icon: "📚" },
    { label: "Pribadi & Gaya Hidup", icon: "👕" },
    { label: "Lainnya", icon: "📦" },
];

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];

const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");

export default function Expense() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: target, isLoading: isTargetLoading } = useTarget();
  const { data: transactions, isLoading: isTxLoading, addTransactionMutation } = useTransactions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [paymentMode, setPaymentMode] = useState<'cash' | 'hutang'>('cash');
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("Makan & Minum");
  const [desc, setDesc] = useState("");
  const [debtName, setDebtName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSourcePopup, setShowSourcePopup] = useState(false);

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyDetails, setEmergencyDetails] = useState({ deficit: 0, nextMonthLimit: 0 });

  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  const formatNumber = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
        clean = clean.replace(/^0+/, ''); 
    }
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  const parseNumber = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountStr(formatNumber(e.target.value));
    setErrorMsg("");
  };

  const handleQuickAdd = (amt: number) => {
    const current = parseNumber(amountStr);
    setAmountStr(formatNumber((current + amt).toString()));
    setErrorMsg("");
  };

  const now = new Date();
  const currentMonthExpense = (transactions || []).filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && 
             d.getMonth() === now.getMonth() && 
             d.getFullYear() === now.getFullYear();
  }).reduce((acc, t) => acc + t.amount, 0);

  const remainingBudget = target ? target.monthlyBudget - currentMonthExpense : 0;
  const budgetLabel = target?.budgetType === 'rollover' ? "Sisa Anggaran (Akumulasi)" : "Sisa Anggaran Bulanan";

  const handleSubmitInit = (e: React.FormEvent) => {
      e.preventDefault();
      const spendingAmount = parseNumber(amountStr);

      if (!spendingAmount || spendingAmount <= 0) {
          setErrorMsg("Masukkan nominal pengeluaran yang valid.");
          return;
      }
      if (!category.trim()) {
          setErrorMsg("Pilih atau masukkan kategori pengeluaran.");
          return;
      }
      if (paymentMode === 'hutang') {
          if (!debtName.trim()) {
              setErrorMsg("Masukkan nama pihak/toko yang dihutangi.");
              return;
          }
          if (!dueDate) {
              setErrorMsg("Pilih tenggat waktu jatuh tempo hutang.");
              return;
          }
      }

      if (paymentMode === 'cash' && target && target.monthlyBudget > 0) {
          if (spendingAmount > remainingBudget) {
              const deficit = spendingAmount - (remainingBudget > 0 ? remainingBudget : 0);
              const nextMonthPredicted = target.monthlyBudget - deficit;
              setEmergencyDetails({ deficit, nextMonthLimit: nextMonthPredicted });
              setShowEmergencyModal(true);
              return;
          }
      }

      if (paymentMode === 'cash') {
          setShowSourcePopup(true);
      } else {
          executeFinalSave("", false);
      }
  };

  const executeFinalSave = async (selectedSource: string, isEmergencyOverride = false) => {
      const spendingAmount = parseNumber(amountStr);
      if (!spendingAmount) return;

      if (paymentMode === 'cash') {
          const walletSources = (user?.walletSources as any[]) || [];
          const matchedWallet = walletSources.find(w => w.name === selectedSource);
          if (matchedWallet && matchedWallet.balance < spendingAmount) {
              toast({ 
                  title: "Saldo Dompet Kurang", 
                  description: `Saldo di ${selectedSource} (${formatRp(matchedWallet.balance)}) tidak mencukupi untuk pengeluaran ini.`,
                  variant: "destructive"
              });
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
                  description: desc.trim() || `Pengeluaran: ${category}`,
                  date: new Date(),
                  source: selectedSource || "Cash (Uang Kertas)"
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

              toast({
                  title: "Pengeluaran Tercatat! 💸",
                  description: `Berhasil mencatat ${formatRp(spendingAmount)} dipotong dari ${selectedSource || 'Kas'}.`
              });

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

              toast({
                  title: "Hutang Berhasil Dicatat! 📝",
                  description: `Hutang ke ${debtName} sebesar ${formatRp(spendingAmount)} telah ditambahkan.`
              });
          }

          trackEvent("manual_tx_added", { 
            type: "expense", 
            category: category,
            paymentMode: paymentMode 
          });

          await queryClient.invalidateQueries();
          setShowEmergencyModal(false);
          setTimeout(() => {
              setLocation("/");
          }, 500);

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
              <p className="text-xs font-medium text-slate-500">Memuat Data Keuangan...</p>
          </div>
      );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA ROSE RED (#E11D48) & GOLD ACCENT */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-8 bg-gradient-to-b from-[#FFF1F2] via-[#FFE4E6] to-[#FECDD3] flex flex-col relative z-10 border-b border-rose-300/60">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(225,29,72,0.06)] flex items-center justify-between relative z-30 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                            title="Kembali ke Beranda"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-800" strokeWidth={2.5} />
                        </button>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-widest">
                                Arus Kas Keluar
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                            Catat Pengeluaran
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-rose-200 text-rose-900 px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-xs">
                        <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                        <span>EXPENSE</span>
                    </div>
                </div>
            </div>

            {/* 2. HERO CARD SALDO KAS & SISA BUDGET (SATU-SATUNYA DENGAN SOLID SHADOW KHAS BILANO) */}
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
        {/* 2. BODY FORM SECTION - CLEAN, CRISP & MODERN ELEVATION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-24 bg-slate-50 flex flex-col gap-4">
            
            {/* SWITCHER METODE PENGELUARAN */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex gap-1.5">
                <button 
                    type="button"
                    onClick={() => setPaymentMode('cash')} 
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'cash' 
                            ? 'bg-rose-600 text-white shadow-xs' 
                            : 'text-slate-600 hover:text-rose-700'
                    }`}
                >
                    <Wallet className="w-4 h-4 stroke-[2.5]" />
                    <span>TUNAI (DIPOTONG KAS)</span>
                </button>

                <button 
                    type="button"
                    onClick={() => setPaymentMode('hutang')} 
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'hutang' 
                            ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold' 
                            : 'text-slate-600 hover:text-amber-600'
                    }`}
                >
                    <HandCoins className="w-4 h-4 stroke-[2.5]" />
                    <span>HUTANG (NGUTANG DULU)</span>
                </button>
            </div>

            {/* CARD FORM CATAT PENGELUARAN */}
            <form onSubmit={handleSubmitInit} className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
                
                {/* Input Nominal */}
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
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
                            className="pl-14 h-15 text-2xl font-black text-slate-900 bg-slate-50 border border-slate-200 focus:border-rose-600 rounded-2xl focus:bg-white transition-all tabular-nums"
                        />
                    </div>

                    {/* Quick Amount Pills */}
                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                        {QUICK_AMOUNTS.map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => handleQuickAdd(amt)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-rose-800 shrink-0 transition-all active:scale-95 cursor-pointer"
                            >
                                +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Khusus Hutang */}
                {paymentMode === 'hutang' && (
                    <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                            <HandCoins className="w-4 h-4" />
                            <span>Detail Tagihan Hutang</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block mb-1">
                                Berhutang Kepada Siapa? (Nama Pihak / Toko)
                            </label>
                            <Input 
                                placeholder="Contoh: Warung Berkah, Teman Budi..." 
                                value={debtName} 
                                onChange={e => setDebtName(e.target.value)} 
                                className="h-12 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block mb-1">
                                Tenggat Waktu Jatuh Tempo (Wajib)
                            </label>
                            <Input 
                                type="date" 
                                value={dueDate} 
                                onChange={e => setDueDate(e.target.value)} 
                                className="h-12 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-amber-500 w-full"
                            />
                        </div>
                    </div>
                )}

                {/* Pilihan Kategori */}
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
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
                                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                                        isSelected
                                            ? "bg-rose-50 text-rose-800 border-rose-600 shadow-xs"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
                                    }`}
                                >
                                    <span className="text-base">{cat.icon}</span>
                                    <span className="truncate text-[11px]">{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <Input 
                        placeholder="Ketik kategori kustom lainnya..." 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)} 
                        className="text-xs font-semibold h-12 rounded-xl bg-slate-50 border border-slate-200 focus:border-rose-600 mb-3"
                    />
                    
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                        Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                        placeholder="Contoh: Makan siang nasi padang bersama rekan kantor..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:border-rose-600 focus:bg-white transition-all text-xs font-medium text-slate-800 min-h-[90px] resize-none"
                    />
                </div>

                {errorMsg && (
                    <p className="text-xs text-rose-500 font-bold flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {errorMsg}
                    </p>
                )}

                <button 
                    type="submit"
                    disabled={isSubmitting} 
                    className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Check className="w-5 h-5 stroke-[2.5]" />
                            <span>SIMPAN PENGELUARAN SEKARANG</span>
                        </>
                    )}
                </button>
            </form>
        </div>

        {/* MODAL PERINGATAN DEFISIT BUDGET */}
        {showEmergencyModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 space-y-4">
                    <button 
                        type="button"
                        onClick={() => setShowEmergencyModal(false)} 
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                        <X className="w-4 h-4"/>
                    </button>
                    
                    <div className="text-center space-y-2">
                        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-7 h-7"/>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900">Batas Anggaran Terlewati!</h3>
                        <p className="text-xs text-slate-500 font-medium">
                            Sisa limit budget saat ini: <strong className="text-slate-900">{formatRp(remainingBudget < 0 ? 0 : remainingBudget)}</strong>
                        </p>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-left space-y-2 text-xs">
                        <div className="flex justify-between font-bold">
                            <span className="text-slate-600">Defisit Kelebihan:</span>
                            <span className="text-rose-700">{formatRp(emergencyDetails.deficit)}</span>
                        </div>
                        <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                            Jika dilanjutkan, sistem akan mengaktifkan <strong>Dana Cadangan</strong> dan memotong batas budget bulan depan.
                        </p>
                        <div className="flex justify-between font-bold bg-white p-2.5 rounded-xl border border-rose-200 mt-1">
                            <span className="text-slate-600">Limit Bulan Depan:</span>
                            <span className="text-brand-navy">{formatRp(emergencyDetails.nextMonthLimit)}</span>
                        </div>
                    </div>

                    <div className="flex gap-2.5 pt-1">
                        <button 
                            type="button"
                            onClick={() => setShowEmergencyModal(false)} 
                            className="flex-1 h-12 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all cursor-pointer"
                        >
                            BATALKAN
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                setShowEmergencyModal(false);
                                setShowSourcePopup(true);
                            }} 
                            disabled={isSubmitting}
                            className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                            PAKAI DARURAT
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showSourcePopup && (
          <SourceSelectionPopup 
            type="expense" 
            title="Pilih Sumber Dana" 
            description="Pengeluaran ini dibayar menggunakan dompet mana?" 
            onCancel={() => setShowSourcePopup(false)} 
            onSelect={(src) => { 
                setShowSourcePopup(false); 
                executeFinalSave(src, emergencyDetails.deficit > 0); 
            }} 
          />
        )}
      </div>
    </MobileLayout>
  );
}