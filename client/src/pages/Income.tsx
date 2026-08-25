import { useState } from "react";
import { Link } from "wouter";
import { useAddTransaction, useUser } from "@/hooks/use-finance";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    Loader2, Wallet, HandCoins, AlertCircle, ArrowLeft, 
    ArrowDownLeft, CheckCircle2, Sparkles, Plus, Calendar, Check, TrendingUp
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { trackEvent } from "@/lib/tracking";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { formatCurrency } from "@/lib/utils";

const QUICK_AMOUNTS = [50000, 100000, 500000, 1000000, 5000000];

const INCOME_CATEGORIES = [
    { label: "Gaji", icon: "💼" },
    { label: "Bonus", icon: "🎉" },
    { label: "Bisnis", icon: "🏢" },
    { label: "Investasi", icon: "📈" },
    { label: "Hadiah", icon: "🎁" },
    { label: "Freelance", icon: "⚡" },
];

export default function Income() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const addTransaction = useAddTransaction();
  
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("Gaji");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [paymentMode, setPaymentMode] = useState<'cash' | 'piutang'>('cash');
  const [debtName, setDebtName] = useState("");
  const [dueDate, setDueDate] = useState("");

  const formatRp = (val: number) => "Rp " + val.toLocaleString("id-ID");
  const currentCash = user?.cashBalance || 0;
  
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [showSourcePopup, setShowSourcePopup] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    const rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
        setAmountStr("");
    } else {
        const numberValue = parseInt(rawValue, 10);
        setAmountStr(new Intl.NumberFormat("id-ID").format(numberValue));
    }
  };

  const handleQuickAdd = (amt: number) => {
    setErrorMsg("");
    setAmountStr(new Intl.NumberFormat("id-ID").format(amt));
  };

  const handleInitiateSubmit = () => {
      setErrorMsg("");
      const cleanAmount = parseInt(amountStr.replace(/\./g, ""), 10);
      if (!cleanAmount || cleanAmount <= 0) {
          setErrorMsg("Masukkan jumlah pemasukan yang valid.");
          return;
      }
      if (paymentMode === 'piutang' && (!debtName.trim() || !dueDate)) { 
          setErrorMsg("Lengkapi nama pihak penanggung dan tanggal jatuh tempo piutang.");
          return; 
      }

      if (user?.walletSources && (user.walletSources as any[]).length > 0 && paymentMode === 'cash') {
          setShowSourcePopup(true);
      } else {
          handleSubmit();
      }
  };

  const handleSubmit = async (selectedSource?: string) => {
    const cleanAmount = parseInt(amountStr.replace(/\./g, ""), 10);

    if (!cleanAmount || cleanAmount <= 0) {
        setErrorMsg("Masukkan jumlah nominal yang valid");
        return;
    }
    
    if (paymentMode === 'piutang' && (!debtName.trim() || !dueDate)) { 
        setErrorMsg("Masukkan nama pihak dan tenggat waktu piutang");
        return; 
    }

    setIsSubmitting(true);
    try {
      if (paymentMode === 'cash') {
          await addTransaction.mutateAsync({ 
              amount: cleanAmount, 
              type: "income", 
              category, 
              description: description.trim() || "Pemasukan Rutin", 
              date: new Date(),
              source: selectedSource
          } as any);
      } else {
          await fetch("/api/debts", {
              method: "POST", 
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ 
                  type: 'piutang', 
                  name: `${debtName.trim()}|IDR`, 
                  amount: cleanAmount, 
                  dueDate: dueDate,
                  description: `[PIUTANG_PENDAPATAN] ${description.trim() || category}`,
                  isFromTransaction: true
              })
          });
          
          await addTransaction.mutateAsync({ 
              amount: cleanAmount, 
              type: "piutang_record", 
              category: `Piutang: ${category}`, 
              description: `[PIUTANG_PENDAPATAN] Belum Dibayar - ${debtName.trim()}`, 
              date: new Date(),
              source: selectedSource
          } as any);
      }

      trackEvent("manual_tx_added", { 
          type: "income", 
          category: category,
          paymentMode: paymentMode 
      });
      
      await queryClient.invalidateQueries();
      window.location.href = "/";
    } catch (error) { 
        setErrorMsg("Gagal menyimpan data pemasukan.");
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const displayBalance = formatRp(currentCash);

  if (isUserLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-emerald-600 w-8 h-8 mb-3"/>
              <p className="text-xs font-bold text-slate-500">Memuat Data Keuangan...</p>
          </div>
      );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
          
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA EMERALD GREEN (#059669) & GOLD ACCENT */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#ECFDF5] via-[#D1FAE5] to-[#A7F3D0] flex flex-col relative z-10 border-b-2 border-emerald-500">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(5,150,105,0.08)] flex items-center justify-between relative z-30 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                            title="Kembali ke Beranda"
                        >
                            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                                Arus Kas Masuk
                            </p>
                        </div>
                        <h1 className="text-lg font-black text-slate-900 leading-tight">
                            Catat Pemasukan
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border-2 border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 text-[11px] font-black">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>INCOME</span>
                    </div>
                </div>
            </div>

            {/* 2. HERO CARD SALDO KAS HIJAU ZAMRUD (FORMAT KARTU HOME) */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <ArrowDownLeft className="absolute -right-4 -bottom-4 w-36 h-36 text-white/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20 backdrop-blur-xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-brand-gold fill-current" />
                            SALDO KAS SAAT INI
                        </span>

                        <span className="text-[10px] text-emerald-100 font-bold bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                            {paymentMode === 'cash' ? 'Tunai Langsung' : 'Piutang Belum Cair'}
                        </span>
                    </div>

                    <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-0.5">
                        Total Saldo Kas Likuid
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2 tabular-nums">
                        {displayBalance}
                    </h2>

                    <div className="flex items-center justify-between pt-2 border-t border-white/15 text-[10px] text-emerald-100 font-semibold">
                        <span>Pemasukan akan langsung menambah saldo kas</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-md font-bold text-white">
                            Kas Utama
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY FORM SECTION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-4 pb-20 bg-slate-50 flex flex-col gap-4">
            
            {/* SWITCHER METODE PEMASUKAN NEO-BRUTALIST */}
            <div className="bg-white p-1.5 rounded-[22px] border-2 border-emerald-200 shadow-[4px_4px_0px_0px] shadow-slate-900 flex gap-1.5">
                <button 
                    type="button"
                    onClick={() => setPaymentMode('cash')} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'cash' 
                            ? 'bg-emerald-600 text-white shadow-[2px_2px_0px_0px] shadow-slate-950 translate-x-[-1px] translate-y-[-1px]' 
                            : 'text-slate-600 hover:text-emerald-700'
                    }`}
                >
                    <Wallet className="w-4 h-4 stroke-[2.5]" />
                    <span>TUNAI (KAS MASUK)</span>
                </button>

                <button 
                    type="button"
                    onClick={() => setPaymentMode('piutang')} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'piutang' 
                            ? 'bg-amber-500 text-white shadow-[2px_2px_0px_0px] shadow-slate-950 translate-x-[-1px] translate-y-[-1px]' 
                            : 'text-slate-600 hover:text-amber-600'
                    }`}
                >
                    <HandCoins className="w-4 h-4 stroke-[2.5]" />
                    <span>PIUTANG (BELUM CAIR)</span>
                </button>
            </div>

            {/* CARD FORM CATAT PEMASUKAN */}
            <div className="bg-white p-5 rounded-[28px] shadow-[6px_6px_0px_0px] shadow-slate-900 border-2 border-emerald-200 space-y-4">
                
                {/* Input Nominal */}
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                        Nominal Pemasukan (Rp)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">Rp</span>
                        <Input 
                            type="tel" 
                            inputMode="numeric" 
                            placeholder="0" 
                            value={amountStr} 
                            onChange={handleAmountChange} 
                            className="pl-14 h-16 text-2xl font-black text-slate-900 bg-slate-50 border-2 border-slate-200 focus:border-emerald-600 rounded-2xl focus:bg-white transition-all"
                        />
                    </div>

                    {/* Quick Amount Pills */}
                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                        {QUICK_AMOUNTS.map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => handleQuickAdd(amt)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 border border-slate-200 text-[11px] font-black text-slate-700 hover:text-emerald-800 shrink-0 transition-all active:scale-95 cursor-pointer"
                            >
                                +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Khusus Piutang */}
                {paymentMode === 'piutang' && (
                    <div className="bg-amber-50/70 border-2 border-amber-200 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-1.5 text-amber-800 text-xs font-black">
                            <HandCoins className="w-4 h-4" />
                            <span>Detail Tagihan Piutang</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                                Ditagih Ke Siapa? (Nama Pihak / Klien)
                            </label>
                            <Input 
                                placeholder="Contoh: Klien Budi, PT Sukses..." 
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
                        Pilih Kategori Pemasukan
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                        {INCOME_CATEGORIES.map((cat) => {
                            const isSelected = category === cat.label;
                            return (
                                <button
                                    key={cat.label}
                                    type="button"
                                    onClick={() => setCategory(cat.label)}
                                    className={`py-2.5 px-2 rounded-2xl text-xs font-black border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
                                        isSelected
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-600 shadow-[2px_2px_0px_0px] shadow-emerald-900 translate-x-[-1px] translate-y-[-1px]"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
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
                        className="text-xs font-bold h-12 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-emerald-600 mb-3"
                    />
                    
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                        Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                        placeholder="Contoh: Gaji bulanan, penjualan proyek A, dll..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 outline-none focus:border-emerald-600 focus:bg-white transition-all text-xs font-medium text-slate-800 min-h-[90px] resize-none"
                    />
                </div>

                {errorMsg && (
                    <p className="text-xs text-rose-500 font-bold flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {errorMsg}
                    </p>
                )}

                {/* Tombol Eksekusi Submit */}
                <button 
                    type="button"
                    onClick={handleInitiateSubmit} 
                    disabled={isSubmitting}
                    className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-[4px_4px_0px_0px] shadow-slate-900 active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                        paymentMode === 'piutang' 
                            ? 'bg-amber-500 hover:bg-amber-600' 
                            : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>MENYIMPAN PEMASUKAN...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                            <span>{paymentMode === 'piutang' ? "SIMPAN PIUTANG PENDAPATAN" : "SIMPAN PEMASUKAN KAS"}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>

      {showSourcePopup && (
          <SourceSelectionPopup 
              type="income"
              title="Pilih Dompet Penerima Pemasukan"
              description="Pilih rekening atau dompet tujuan masuknya dana ini."
              onCancel={() => setShowSourcePopup(false)}
              onSelect={(src) => {
                  setShowSourcePopup(false);
                  handleSubmit(src);
              }}
          />
      )}
    </MobileLayout>
  );
}