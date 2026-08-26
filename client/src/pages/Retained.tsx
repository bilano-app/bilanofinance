import { useState, useEffect } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    Hourglass, Plus, Edit2, Trash2, ArrowDownToLine, 
    X, Check, AlertCircle, Loader2, ArrowLeft, Landmark, 
    DollarSign, Crown, ShieldCheck, CheckCircle2,
    RefreshCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import { useQueryClient } from "@tanstack/react-query";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { trackEvent } from "@/lib/tracking";

interface RetainedItem {
    id: number;
    source: string;
    amount: number;
    currency: string;
    updatedAt: string;
}

export default function Retained() {
    const { data: user, isLoading: isUserLoading, refetch: refetchUser } = useUser();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [items, setItems] = useState<RetainedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<RetainedItem | null>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState<RetainedItem | null>(null);
    const [showSourcePopup, setShowSourcePopup] = useState(false);

    const [tempSource, setTempSource] = useState("");
    const [tempAmount, setTempAmount] = useState("");
    const [tempCurrency, setTempCurrency] = useState("IDR");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');
    const [isCharging, setIsCharging] = useState(false);

    const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    const isPro = user?.isPro || (typeof window !== 'undefined' && localStorage.getItem("bilano_pro") === "true");

    const [safeForexRates, setSafeForexRates] = useState<Record<string, number>>({});
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(["IDR", "USD", "EUR", "SGD", "GBP", "JPY", "AUD", "MYR"]);

    const fetchRetained = async () => {
        setIsLoading(true);
        try {
            const [resRetained, resForex] = await Promise.all([
                fetch("/api/retained", { headers: { "x-user-email": userEmail } }),
                fetch("/api/forex/rates", { headers: { "x-user-email": userEmail } })
            ]);

            if (resRetained.ok) {
                const data = await resRetained.json();
                setItems(Array.isArray(data) ? data : []);
            }
            if (resForex.ok) {
                const rates = await resForex.json();
                setSafeForexRates(rates);
                if (rates && Object.keys(rates).length > 0) {
                    setAvailableCurrencies(["IDR", ...Object.keys(rates).filter(c => c !== "IDR")]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (userEmail) fetchRetained();
        else setIsLoading(false);
    }, [userEmail]);

    const handleLanjutBayar = async () => {
      setIsCharging(true);
      try {
          const email = userEmail || "customer@bilano.id";
          const res = await fetch("/api/pay/mayar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  email, 
                  plan: selectedPlan,
                  feature: "retained_access"
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

    const formatNumber = (val: string) => {
        let cleaned = val.replace(/[^0-9.,]/g, '');
        const parts = cleaned.split(',');
        if (parts.length > 2) {
            cleaned = parts[0] + ',' + parts.slice(1).join('');
        }
        return cleaned;
    };
    
    const parseNumber = (val: string) => {
        if (!val) return 0;
        const clean = val.replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(clean) || 0;
    };

    const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");
    const getRate = (curr: string) => curr === 'IDR' ? 1 : (safeForexRates[curr] || 15000);

    const totalRetainedIDR = items.reduce((acc, item) => acc + (item.amount * getRate(item.currency)), 0);

    const handleAdd = async () => {
        if (!tempSource || !tempAmount) {
            return toast({ title: "Input Belum Lengkap", description: "Nama sumber & nominal saldo wajib diisi.", variant: "destructive" });
        }
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/retained", {
                method: "POST", 
                headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify({ source: tempSource, amount: parseNumber(tempAmount), currency: tempCurrency })
            });
            if (res.ok) {
                trackEvent("retained_balance_added", { currency: tempCurrency });
                toast({ title: "Tersimpan! ✨", description: "Saldo tertahan berhasil ditambahkan ke neraca." });
                setShowAddModal(false);
                setTempSource(""); 
                setTempAmount(""); 
                setTempCurrency("IDR");
                queryClient.invalidateQueries();
                fetchRetained();
            } else {
                toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan pada server.", variant: "destructive" });
            }
        } catch (e) { 
            toast({ title: "Kendala Jaringan", variant: "destructive" }); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    const handleEdit = async () => {
        if (!showEditModal || !tempAmount) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/retained/${showEditModal.id}`, {
                method: "PUT", 
                headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify({ amount: parseNumber(tempAmount) })
            });
            if (res.ok) {
                toast({ title: "Diperbarui! 🔄", description: "Jumlah saldo tertahan berhasil disinkronkan." });
                setShowEditModal(null); 
                setTempAmount("");
                queryClient.invalidateQueries();
                fetchRetained();
            } else {
                toast({ title: "Gagal Update", variant: "destructive" });
            }
        } catch (e) {
            toast({ title: "Kendala Jaringan", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Hapus catatan saldo tertahan ini?")) return;
        try {
            const res = await fetch(`/api/retained/${id}`, {
                method: "DELETE",
                headers: { "x-user-email": userEmail }
            });
            if (res.ok) {
                toast({ title: "Dihapus", description: "Catatan saldo tertahan telah dibersihkan." });
                queryClient.invalidateQueries();
                fetchRetained();
            }
        } catch (e) {
            toast({ title: "Gagal Menghapus", variant: "destructive" });
        }
    };

    const handleWithdrawInit = () => {
        if (!showWithdrawModal || !tempAmount) return;
        const numVal = parseNumber(tempAmount);
        if (numVal <= 0 || numVal > showWithdrawModal.amount) {
            return toast({ title: "Nominal Tidak Valid", description: "Nominal pencairan melebihi saldo tertahan yang tersedia.", variant: "destructive" });
        }
        setShowSourcePopup(true);
    };

    const handleWithdraw = async (destWallet: string) => {
        if (!showWithdrawModal || !tempAmount) return;
        const withdrawAmt = parseNumber(tempAmount);
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/retained/${showWithdrawModal.id}/withdraw`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify({ 
                    amount: withdrawAmt,
                    destinationSource: destWallet
                })
            });

            if (res.ok) {
                trackEvent("retained_withdrawn", { amount: withdrawAmt, currency: showWithdrawModal.currency });
                toast({ title: "Berhasil Dicairkan! 💸", description: `Dana masuk ke kas ${destWallet}.` });
                setShowWithdrawModal(null);
                setTempAmount("");
                await refetchUser();
                queryClient.invalidateQueries();
                fetchRetained();
            } else {
                const errData = await res.json().catch(() => ({}));
                toast({ title: "Pencairan Gagal", description: errData.error || "Terjadi kesalahan.", variant: "destructive" });
            }
        } catch (e) {
            toast({ title: "Kendala Jaringan", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isPro && !isUserLoading) {
        return (
            <MobileLayout title="Saldo Tertahan" showBack>
                <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center -mx-5 -mt-5 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] p-6">
                    <div className="w-20 h-20 bg-brand-gold text-brand-navy rounded-3xl flex items-center justify-center mb-4 shadow-md border border-brand-navy animate-bounce">
                        <Crown className="w-10 h-10" />
                    </div>
                    <span className="bg-brand-navy text-brand-gold text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-xs">
                        FITUR PREMIUM PRO
                    </span>
                    <h2 className="text-2xl font-black text-brand-navy mb-2 tracking-tight">
                        Pelacakan Saldo Tertahan
                    </h2>
                    <p className="text-xs text-amber-950 font-medium mb-6 max-w-xs leading-relaxed">
                        Pantau saldo yang belum dicairkan dari platform eksternal (Google AdSense, AdMob, Upwork, Fiverr, dll) sebelum masuk ke rekening utama Anda.
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
                    </div>

                    <button 
                        onClick={handleLanjutBayar} 
                        disabled={isCharging} 
                        className="w-full max-w-sm h-14 bg-brand-navy hover:bg-[#152e55] text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isCharging ? <Loader2 className="w-5 h-5 animate-spin"/> : "BUKA AKSES PRO SEKARANG"}
                    </button>
                    <p className="mt-4 text-[10px] text-amber-950 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-600"/> Pembayaran Terverifikasi & Otomatis oleh Mayar
                    </p>
                </div>
            </MobileLayout>
        );
    }

    if (isUserLoading || isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
                <img src="/BILANO-ICON-NEW.png" alt="Loading" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
                <div className="flex items-center gap-2 text-brand-navy font-bold text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-gold"/>
                    <span>Memuat Saldo Tertahan...</span>
                </div>
            </div>
        );
    }

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
                                        Platform & Eksternal
                                    </p>
                                </div>
                                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                                    Saldo Tertahan
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                type="button"
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1 bg-brand-navy text-brand-gold px-3.5 py-1.5 rounded-full text-[10px] font-bold border border-brand-gold/30 shadow-xs active:scale-95 transition-all cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5 text-brand-gold stroke-[2.5]" />
                                <span>TAMBAH</span>
                            </button>
                        </div>
                    </div>

                    {/* FLAGSHIP HERO CARD - SATU-SATUNYA YANG MEMAKAI SOLID SHADOW KHAS BILANO */}
                    <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                        <Hourglass className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                        <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                                    <Hourglass className="w-3 h-3 fill-current" /> PENDING BALANCES
                                </span>
                                <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                                    {items.length} Platform Terdaftar
                                </span>
                            </div>

                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                                Estimasi Total Dana Tertahan
                            </p>

                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 leading-tight tabular-nums">
                                {formatRp(totalRetainedIDR)}
                            </h2>

                            <p className="text-[11px] text-blue-100 font-medium leading-relaxed pt-2 border-t border-white/15">
                                Dana di platform pihak ketiga yang siap dicairkan langsung ke Saldo Kas Utama Anda kapan saja.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 2. BODY CONTENT SECTION - CLEAN, CRISP & MODERN ELEVATION */}
                {/* ========================================================================= */}
                <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-3.5">
                    
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Landmark className="w-4 h-4 text-amber-600" />
                            Daftar Sumber Dana Platform
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500">
                            {items.length} Sumber
                        </span>
                    </div>

                    <div className="space-y-3">
                        {items.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 p-6 shadow-xs">
                                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                                    <Hourglass className="w-8 h-8 opacity-60" />
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-sm mb-1">Belum Ada Saldo Tertahan</h4>
                                <p className="text-xs text-slate-500 font-medium mb-4 max-w-xs mx-auto">
                                    Catat saldo yang ada di platform freelance, royalti, atau jaringan iklan Anda di sini.
                                </p>
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(true)}
                                    className="bg-brand-navy text-brand-gold px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer"
                                >
                                    + CATAT SALDO PERTAMA
                                </button>
                            </div>
                        ) : (
                            items.map((item) => {
                                const idrVal = item.amount * getRate(item.currency);
                                const lastUpdate = new Date(item.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                                
                                return (
                                    <div 
                                        key={item.id} 
                                        className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all space-y-3"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-brand-navy font-black flex items-center justify-center border border-amber-200 text-xs shrink-0 shadow-xs">
                                                    {item.currency}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-extrabold text-slate-900 text-sm truncate">{item.source}</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Update: {lastUpdate}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-slate-900 text-base tabular-nums">
                                                    {item.amount.toLocaleString('id-ID')} {item.currency}
                                                </p>
                                                <p className="text-[10px] text-amber-700 font-bold tabular-nums">
                                                    ≈ {formatRp(idrVal)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* ACTION BUTTONS: UPDATE, TARIK, HAPUS */}
                                        <div className="flex gap-2 pt-2.5 border-t border-slate-100">
                                            <button 
                                                type="button"
                                                onClick={() => { setShowEditModal(item); setTempAmount(item.amount.toString().replace('.', ',')); }} 
                                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                                            >
                                                <Edit2 className="w-3 h-3 text-slate-500" /> UPDATE
                                            </button>
                                            
                                            <button 
                                                type="button"
                                                onClick={() => { setShowWithdrawModal(item); setTempAmount(""); }} 
                                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                                            >
                                                <ArrowDownToLine className="w-3.5 h-3.5" /> CAIRKAN
                                            </button>

                                            <button 
                                                type="button"
                                                onClick={() => handleDelete(item.id)} 
                                                className="w-9 h-9 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 shrink-0 active:scale-95 transition-all cursor-pointer"
                                                title="Hapus Catatan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* MODAL 1: TAMBAH SALDO TERTAHAN */}
                {showAddModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 relative animate-in zoom-in-95 space-y-4">
                            <button 
                                type="button"
                                onClick={() => setShowAddModal(false)} 
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                            >
                                <X className="w-4 h-4"/>
                            </button>
                            
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Tambah Saldo Tertahan</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Catat simpanan dana di platform eksternal.</p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nama Sumber / Platform</label>
                                    <input 
                                        type="text"
                                        placeholder="Contoh: Google AdSense, Upwork, dll" 
                                        value={tempSource} 
                                        onChange={e => setTempSource(e.target.value)} 
                                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all mt-1"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mata Uang & Nominal</label>
                                    <div className="flex gap-2 mt-1">
                                        <select 
                                            value={tempCurrency} 
                                            onChange={e => setTempCurrency(e.target.value)} 
                                            className="w-24 h-12 px-3 text-xs font-bold rounded-2xl bg-amber-50 text-amber-900 outline-none border border-amber-300 shrink-0"
                                        >
                                            <option value="IDR">IDR</option>
                                            {availableCurrencies.filter(c => c !== "IDR").map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input 
                                            type="text" 
                                            inputMode="decimal" 
                                            placeholder="0" 
                                            value={tempAmount} 
                                            onChange={e => setTempAmount(formatNumber(e.target.value))} 
                                            className="flex-1 h-12 px-4 font-black text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="button"
                                    disabled={isSubmitting} 
                                    onClick={handleAdd} 
                                    className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4 stroke-[2.5]"/>}
                                    <span>SIMPAN SALDO TERTAHAN</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 2: EDIT / UPDATE SALDO TERTAHAN */}
                {showEditModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 relative animate-in zoom-in-95 space-y-4">
                            <button 
                                type="button"
                                onClick={() => setShowEditModal(null)} 
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                            >
                                <X className="w-4 h-4"/>
                            </button>
                            
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Update Saldo Platform</h3>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    Sesuaikan nilai terbaru dari <strong className="text-slate-900">{showEditModal.source}</strong>
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                        Nominal Saldo Baru ({showEditModal.currency})
                                    </label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-4 top-3.5 font-bold text-xs text-slate-400">{showEditModal.currency}</span>
                                        <input 
                                            type="text" 
                                            inputMode="decimal" 
                                            value={tempAmount} 
                                            onChange={e => setTempAmount(formatNumber(e.target.value))} 
                                            className="w-full pl-14 pr-4 h-12 font-black text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="button"
                                    disabled={isSubmitting} 
                                    onClick={handleEdit} 
                                    className="w-full h-14 bg-brand-navy hover:bg-[#152e55] text-brand-gold font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw className="w-4 h-4 stroke-[2.5]"/>}
                                    <span>SIMPAN PERUBAHAN SALDO</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 3: TARIK / CAIRKAN SALDO TERTAHAN KE KAS UTAMA */}
                {showWithdrawModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 relative animate-in zoom-in-95 space-y-4">
                            <button 
                                type="button"
                                onClick={() => setShowWithdrawModal(null)} 
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                            >
                                <X className="w-4 h-4"/>
                            </button>
                            
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Cairkan Saldo ke Kas</h3>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    Tarik dana dari <strong className="text-slate-900">{showWithdrawModal.source}</strong> (Maks: {showWithdrawModal.amount.toLocaleString('id-ID')} {showWithdrawModal.currency}).
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                        Nominal Penarikan
                                    </label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-4 top-3.5 font-bold text-xs text-slate-400">{showWithdrawModal.currency}</span>
                                        <input 
                                            type="text" 
                                            inputMode="decimal" 
                                            placeholder="Masukkan nominal pencairan..." 
                                            value={tempAmount} 
                                            onChange={e => setTempAmount(formatNumber(e.target.value))} 
                                            className="w-full pl-14 pr-4 h-12 font-black text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="button"
                                    disabled={isSubmitting} 
                                    onClick={handleWithdrawInit} 
                                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <ArrowDownToLine className="w-4 h-4 stroke-[2.5]"/>}
                                    <span>KONFIRMASI PENCAIRAN KAS</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {showSourcePopup && (
                    <SourceSelectionPopup 
                        type="income"
                        title="Pilih Dompet Rekening Tujuan"
                        description="Pilih akun kas atau dompet yang menerima pencairan dana ini."
                        onCancel={() => setShowSourcePopup(false)}
                        onSelect={(src) => {
                            setShowSourcePopup(false);
                            handleWithdraw(src);
                        }}
                    />
                )}

            </div>
        </MobileLayout>
    );
}