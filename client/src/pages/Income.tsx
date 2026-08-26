import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    TrendingUp, ArrowLeft, Plus, Check, Loader2, 
    Wallet, HandCoins, AlertCircle, ArrowDownLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAddTransaction } from "@/hooks/use-finance";
import { useQueryClient } from "@tanstack/react-query";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { formatCurrency } from "@/lib/utils";

const INCOME_CATEGORIES = [
    { label: "Gaji Pokok", icon: "💼" },
    { label: "Bonus / THR", icon: "🎁" },
    { label: "Freelance", icon: "💻" },
    { label: "Hasil Usaha", icon: "🏪" },
    { label: "Dividen / Investasi", icon: "📈" },
    { label: "Penjualan Barang", icon: "📦" },
    { label: "Hadiah / Hibah", icon: "✨" },
    { label: "Pengembalian Dana", icon: "🔄" },
    { label: "Lainnya", icon: "💵" },
];

const QUICK_AMOUNTS = [50000, 100000, 250000, 500000, 1000000, 2500000, 5000000];

export default function Income() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const createTransaction = useAddTransaction();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [paymentMode, setPaymentMode] = useState<'cash' | 'piutang'>('cash');
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("Gaji Pokok");
  const [description, setDescription] = useState("");
  const [debtName, setDebtName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSourcePopup, setShowSourcePopup] = useState(false);

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

  const handleSubmitInit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseNumber(amountStr);

    if (!parsedAmount || parsedAmount <= 0) {
        setErrorMsg("Masukkan nominal pemasukan yang valid.");
        return;
    }
    if (!category.trim()) {
        setErrorMsg("Pilih atau masukkan kategori pemasukan.");
        return;
    }
    if (paymentMode === 'piutang') {
        if (!debtName.trim()) {
            setErrorMsg("Masukkan nama pihak/klien yang berhutang (Piutang).");
            return;
        }
        if (!dueDate) {
            setErrorMsg("Pilih tanggal jatuh tempo piutang.");
            return;
        }
    }

    if (paymentMode === 'cash') {
        setShowSourcePopup(true);
    } else {
        handleFinalSubmit("");
    }
  };

  const handleFinalSubmit = async (selectedSource: string) => {
    setIsSubmitting(true);
    const parsedAmount = parseNumber(amountStr);
    const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

    try {
        if (paymentMode === 'cash') {
            await createTransaction.mutateAsync({
                type: 'income',
                amount: parsedAmount,
                category: category.trim(),
                description: description.trim() || `Pemasukan: ${category}`,
                source: selectedSource || "Cash (Uang Kertas)",
                date: new Date()
            } as any);

            toast({
                title: "Pemasukan Tercatat! 💰",
                description: `Berhasil menambahkan ${formatCurrency(parsedAmount)} ke ${selectedSource || 'Kas'}.`
            });
        } else {
            // Mode Piutang
            const res = await fetch("/api/debts", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-user-email": userEmail
                },
                body: JSON.stringify({
                    type: "piutang",
                    name: `${debtName.trim()}|IDR`,
                    amount: parsedAmount,
                    description: `[Piutang Pemasukan: ${category}] ${description.trim()}`,
                    dueDate: dueDate,
                    isPaid: false
                })
            });

            if (!res.ok) throw new Error("Gagal mencatat piutang.");

            await createTransaction.mutateAsync({
                type: 'income',
                amount: parsedAmount,
                category: `Piutang: ${category}`,
                description: `[Belum Cair - ${debtName.trim()}] ${description.trim()}`,
                date: new Date()
            } as any);

            toast({
                title: "Piutang Berhasil Dicatat! 📋",
                description: `Tagihan ke ${debtName} sebesar ${formatCurrency(parsedAmount)} telah masuk daftar piutang.`
            });
        }

        queryClient.invalidateQueries();
        setTimeout(() => {
            setLocation("/");
        }, 500);

    } catch (err: any) {
        toast({
            title: "Gagal Menyimpan",
            description: err.message || "Terjadi kesalahan sistem.",
            variant: "destructive"
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const displayBalance = user ? formatCurrency(user.cashBalance || 0) : "Rp 0";

  if (isUserLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-emerald-600 w-8 h-8 mb-3"/>
              <p className="text-xs font-medium text-slate-500">Memuat Data Keuangan...</p>
          </div>
      );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
          
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA EMERALD GREEN (#059669) & GOLD ACCENT */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-8 bg-gradient-to-b from-[#ECFDF5] via-[#D1FAE5] to-[#A7F3D0] flex flex-col relative z-10 border-b border-emerald-300/60">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(5,150,105,0.06)] flex items-center justify-between relative z-30 border-b border-slate-100">
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
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                                Arus Kas Masuk
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                            Catat Pemasukan
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-xs">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>INCOME</span>
                    </div>
                </div>
            </div>

            {/* 2. HERO CARD SALDO KAS HIJAU ZAMRUD (FORMAT KARTU HOME DENGAN SOLID SHADOW SATU-SATUNYA) */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <ArrowDownLeft className="absolute -right-4 -bottom-4 w-36 h-36 text-white/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20 backdrop-blur-xs flex items-center gap-1">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-200" />
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
        {/* 2. BODY FORM SECTION - CLEAN, CRISP & MODERN */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-24 bg-slate-50 flex flex-col gap-4">
            
            {/* SWITCHER METODE PEMASUKAN */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex gap-1.5">
                <button 
                    type="button"
                    onClick={() => setPaymentMode('cash')} 
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'cash' 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'text-slate-600 hover:text-emerald-700'
                    }`}
                >
                    <Wallet className="w-4 h-4 stroke-[2.5]" />
                    <span>TUNAI (KAS MASUK)</span>
                </button>

                <button 
                    type="button"
                    onClick={() => setPaymentMode('piutang')} 
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMode === 'piutang' 
                            ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold' 
                            : 'text-slate-600 hover:text-amber-600'
                    }`}
                >
                    <HandCoins className="w-4 h-4 stroke-[2.5]" />
                    <span>PIUTANG (BELUM CAIR)</span>
                </button>
            </div>

            {/* CARD FORM CATAT PEMASUKAN */}
            <form onSubmit={handleSubmitInit} className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
                
                {/* Input Nominal */}
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
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
                            className="pl-14 h-15 text-2xl font-black text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-600 rounded-2xl focus:bg-white transition-all tabular-nums"
                        />
                    </div>

                    {/* Quick Amount Pills */}
                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                        {QUICK_AMOUNTS.map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => handleQuickAdd(amt)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-emerald-800 shrink-0 transition-all active:scale-95 cursor-pointer"
                            >
                                +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Khusus Piutang */}
                {paymentMode === 'piutang' && (
                    <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                            <HandCoins className="w-4 h-4" />
                            <span>Detail Tagihan Piutang</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block mb-1">
                                Ditagih Ke Siapa? (Nama Pihak / Klien)
                            </label>
                            <Input 
                                placeholder="Contoh: Klien Budi, PT Sukses..." 
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
                                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                                        isSelected
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-600 shadow-xs"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
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
                        className="text-xs font-semibold h-12 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-600 mb-3"
                    />
                    
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                        Catatan Tambahan (Opsional)
                    </label>
                    <textarea
                        placeholder="Contoh: Gaji bulanan, penjualan proyek A, dll..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:border-emerald-600 focus:bg-white transition-all text-xs font-medium text-slate-800 min-h-[90px] resize-none"
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
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Check className="w-5 h-5 stroke-[2.5]" />
                            <span>SIMPAN PEMASUKAN SEKARANG</span>
                        </>
                    )}
                </button>
            </form>
        </div>

        {showSourcePopup && (
          <SourceSelectionPopup 
            type="income" 
            title="Pilih Dompet Penerima" 
            description="Pemasukan ini masuk ke rekening atau dompet mana?" 
            onCancel={() => setShowSourcePopup(false)} 
            onSelect={(src) => { 
                setShowSourcePopup(false); 
                handleFinalSubmit(src); 
            }} 
          />
        )}
      </div>
    </MobileLayout>
  );
}