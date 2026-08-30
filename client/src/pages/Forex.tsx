import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    Globe, RefreshCw, TrendingUp, TrendingDown, ArrowRightLeft, 
    Wallet, Plus, Trash2, ArrowLeft, X, ChevronDown, 
    Search, Activity, FileText, ArrowDownCircle, ArrowUpCircle, 
    StickyNote, Loader2, HandCoins, Check, DollarSign, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useTransactions, getAccessTier } from "@/hooks/use-finance";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { trackEvent } from "@/lib/tracking";

const CURRENCY_LIST = [
    { code: "USD", name: "Dolar Amerika Serikat", country: "Amerika Serikat", flag: "🇺🇸" },
    { code: "SGD", name: "Dolar Singapura", country: "Singapura", flag: "🇸🇬" },
    { code: "MYR", name: "Ringgit Malaysia", country: "Malaysia", flag: "🇲🇾" },
    { code: "EUR", name: "Euro", country: "Uni Eropa", flag: "🇪🇺" },
    { code: "JPY", name: "Yen Jepang", country: "Jepang", flag: "🇯🇵" },
    { code: "GBP", name: "Poundsterling Inggris", country: "Inggris Raya", flag: "🇬🇧" },
    { code: "AUD", name: "Dolar Australia", country: "Australia", flag: "🇦🇺" },
    { code: "SAR", name: "Riyal Arab Saudi", country: "Arab Saudi", flag: "🇸🇦" },
    { code: "CNY", name: "Yuan China", country: "China", flag: "🇨🇳" },
    { code: "KRW", name: "Won Korea Selatan", country: "Korea Selatan", flag: "🇰🇷" },
    { code: "THB", name: "Baht Thailand", country: "Thailand", flag: "🇹🇭" },
    { code: "AED", name: "Dirham UEA", country: "Uni Emirat Arab", flag: "🇦🇪" },
];

const POPULAR_RATES = ["USD", "SGD", "MYR", "EUR", "JPY", "SAR"];

interface ForexAsset {
    id: number;
    currency: string;
    amount: number;
    updatedAt: string;
}

export default function Forex() {
  const { data: user, refetch: refetchUser } = useUser();
  const { toast } = useToast();
  
  const [rates, setRates] = useState<Record<string, number>>({});
  const [assets, setAssets] = useState<ForexAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<'mutation' | 'exchange'>('mutation');

  const [selectedCurr, setSelectedCurr] = useState(CURRENCY_LIST[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [mutationMode, setMutationMode] = useState<'in' | 'out'>('in');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'debt'>('cash');
  const [amountMutation, setAmountMutation] = useState("");
  const [noteMutation, setNoteMutation] = useState("");
  const [debtName, setDebtName] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [exchangeMode, setExchangeMode] = useState<'buy' | 'sell'>('buy');
  const [amountExchange, setAmountExchange] = useState("");
  const [rateExchange, setRateExchange] = useState("");

  const [chartCurr, setChartCurr] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showSourcePopup, setShowSourcePopup] = useState(false);
  const [pendingForexSubmit, setPendingForexSubmit] = useState<{ action: 'exchange' | 'mutation' } | null>(null);
  const [sourcePopupConfig, setSourcePopupConfig] = useState<{
    type: 'income' | 'expense';
    title: string;
    description: string;
    onSelect: (src: string) => void;
  } | null>(null);

  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const accessTier = getAccessTier(user);
  const isPro = accessTier !== "free";

  const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;

  // ──────────────────────────────────────────────────────────────────────
  // SUMBER UANG VALAS: disimpan di localStorage per user
  // Format: { "USD": "BCA Dollar", "SGD": "DBS Singapura" }
  // ──────────────────────────────────────────────────────────────────────
  const forexSourceKey = `bilano_forex_sources_${currentUserEmail}`;

  const getForexSources = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem(forexSourceKey);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };

  const saveForexSources = (sources: Record<string, string>) => {
    localStorage.setItem(forexSourceKey, JSON.stringify(sources));
    setForexSources({ ...sources });
  };

  const [forexSources, setForexSources] = useState<Record<string, string>>(getForexSources);

  // State untuk popup pengisian sumber valas
  // Sekarang menggunakan SourceSelectionPopup (sama seperti halaman Pemasukan)
  const [showForexSourcePopup, setShowForexSourcePopup] = useState(false);
  const [pendingSourceCurrencies, setPendingSourceCurrencies] = useState<{ currency: string; amount: number; flag: string }[]>([]);
  const [currentPendingIndex, setCurrentPendingIndex] = useState(0);
  const [editingSourceCurrency, setEditingSourceCurrency] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [resRates, resAssets] = await Promise.all([
          fetch("/api/forex/rates", { headers: { "x-user-email": currentUserEmail } }),
          fetch("/api/forex/assets", { headers: { "x-user-email": currentUserEmail } })
      ]);
      
      if (resRates.ok) {
          const ratesData = await resRates.json();
          setRates(ratesData);
      }
      if (resAssets.ok) {
          const assetsData = await resAssets.json();
          setAssets(assetsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cek apakah ada aset valas yang belum punya sumber uang → tampilkan popup
  useEffect(() => {
    if (assets.length === 0) return;
    const sources = getForexSources();
    const missing = assets
      .filter(a => a.amount > 0 && !sources[a.currency])
      .map(a => ({
        currency: a.currency,
        amount: a.amount,
        flag: CURRENCY_LIST.find(c => c.code === a.currency)?.flag ?? "🌐"
      }));
    if (missing.length > 0) {
      setPendingSourceCurrencies(missing);
      setCurrentPendingIndex(0);
      setShowForexSourcePopup(true);
    }
  }, [assets]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getSafeRate = (code: string) => rates[code] || 1;

  const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");
  const formatIdr = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
        clean = clean.replace(/^0+/, ''); 
    }
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseIdr = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;
  const parseValas = (val: string) => parseFloat(val.replace(/,/g, '.')) || 0;

  const filteredCurrencies = CURRENCY_LIST.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateTotalValasIDR = () => {
    return assets.reduce((total, asset) => {
      const rate = getSafeRate(asset.currency);
      return total + (asset.amount * rate);
    }, 0);
  };

  const handleMutation = () => {
    const num = parseValas(amountMutation);
    if (!num || num <= 0) {
        toast({ title: "Nominal Belum Diisi", description: "Masukkan nominal valas yang valid.", variant: "destructive" });
        return;
    }

    if (paymentMode === 'debt' && !debtName.trim()) {
        toast({ title: "Nama Pihak Belum Diisi", description: "Harap isi nama pihak terkait hutang/piutang ini.", variant: "destructive" });
        return;
    }

    // Untuk mode debt tidak perlu pilih sumber, langsung eksekusi
    if (paymentMode === 'debt') {
        executeMutation("");
        return;
    }

    // Tampilkan popup pilih sumber uang
    if (mutationMode === 'in') {
        setSourcePopupConfig({
            type: 'income',
            title: 'Pilih Dompet Penerima Valas',
            description: `Valas ${selectedCurr.code} masuk ke rekening atau dompet mana?`,
            onSelect: (src) => { setShowSourcePopup(false); executeMutation(src); }
        });
    } else {
        setSourcePopupConfig({
            type: 'expense',
            title: 'Pilih Sumber Dana Valas Keluar',
            description: `Valas ${selectedCurr.code} keluar dari rekening atau dompet mana?`,
            onSelect: (src) => { setShowSourcePopup(false); executeMutation(src); }
        });
    }
    setPendingForexSubmit({ action: 'mutation' });
    setShowSourcePopup(true);
  };

  const executeMutation = async (selectedSource: string) => {
    setIsSubmitting(true);
    try {
        const num = parseValas(amountMutation);
        const finalAmount = mutationMode === 'in' ? num : -num;
        
        const res = await fetch("/api/forex/mutation", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
            body: JSON.stringify({
                currency: selectedCurr.code,
                amount: finalAmount,
                type: mutationMode === 'in' ? 'IN' : 'OUT',
                paymentMode: paymentMode,
                debtName: debtName.trim(),
                dueDate: dueDate || null,
                notes: noteMutation.trim() || undefined,
                rateSnapshot: getSafeRate(selectedCurr.code),
                source: selectedSource || undefined
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Gagal mencatat mutasi valas.");
        }

        trackEvent("forex_mutation_recorded", {
            currency: selectedCurr.code,
            amount: finalAmount,
            mode: mutationMode,
            paymentMode: paymentMode
        });

        toast({
            title: "Mutasi Valas Berhasil! 🌍",
            description: `Saldo ${selectedCurr.code} berhasil diperbarui.`
        });

        setAmountMutation("");
        setNoteMutation("");
        setDebtName("");
        setDueDate("");
        await fetchData();
        await refetchUser();
    } catch (e: any) {
        toast({ title: "Gagal Mencatat", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleExchange = async () => {
    const amountVal = parseValas(amountExchange);
    const rateVal = parseIdr(rateExchange) || getSafeRate(selectedCurr.code);
    const totalIDR = amountVal * rateVal;

    if (!amountVal || amountVal <= 0) {
        toast({ title: "Jumlah Belum Diisi", description: "Masukkan jumlah valas yang ingin ditukar.", variant: "destructive" });
        return;
    }

    if (exchangeMode === 'buy') {
        const cashBalance = user?.cashBalance || 0;
        if (totalIDR > cashBalance) {
            toast({
                title: "Saldo Kas Tidak Cukup",
                description: `Pembelian membutuhkan ${formatRp(totalIDR)}, saldo kas Anda ${formatRp(cashBalance)}.`,
                variant: "destructive"
            });
            return;
        }
        // Tampilkan popup untuk memilih sumber dana pembelian valas
        setSourcePopupConfig({
            type: 'expense',
            title: 'Pilih Sumber Dana Pembelian',
            description: `Dana pembelian ${selectedCurr.code} diambil dari rekening atau dompet mana?`,
            onSelect: (src) => { setShowSourcePopup(false); executeExchangeDirect(src); }
        });
        setPendingForexSubmit({ action: 'exchange' });
        setShowSourcePopup(true);
    } else {
        const existingAsset = assets.find(a => a.currency === selectedCurr.code);
        const currentValasBal = existingAsset ? existingAsset.amount : 0;
        if (amountVal > currentValasBal) {
            toast({
                title: "Saldo Valas Tidak Cukup",
                description: `Anda hanya memiliki ${currentValasBal.toLocaleString()} ${selectedCurr.code}.`,
                variant: "destructive"
            });
            return;
        }
        setSourcePopupConfig({
            type: 'income',
            title: 'Tujuan Masuk Saldo Penjualan',
            description: `Pilih akun atau dompet yang menerima dana hasil penukaran valas ini:`,
            onSelect: (src) => { setShowSourcePopup(false); executeExchangeDirect(src); }
        });
        setPendingForexSubmit({ action: 'exchange' });
        setShowSourcePopup(true);
    }
  };

  const executeExchangeDirect = async (targetSource?: string) => {
    const amountVal = parseValas(amountExchange);
    const rateVal = parseIdr(rateExchange) || getSafeRate(selectedCurr.code);
    const totalIDR = amountVal * rateVal;

    setIsSubmitting(true);
    try {
        const res = await fetch("/api/forex/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
            body: JSON.stringify({
                action: exchangeMode.toUpperCase(),
                currency: selectedCurr.code,
                amount: amountVal,
                rate: rateVal,
                totalIDR: totalIDR,
                source: targetSource || "Kas Utama"
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Gagal memproses pertukaran valas.");
        }

        trackEvent("forex_exchange_completed", {
            action: exchangeMode,
            currency: selectedCurr.code,
            amount: amountVal,
            rate: rateVal,
            totalIDR: totalIDR
        });

        toast({
            title: exchangeMode === 'buy' ? "Beli Valas Sukses! 💵" : "Jual Valas Sukses! 💰",
            description: `Transaksi ${selectedCurr.code} berhasil diselesaikan.`
        });

        setAmountExchange("");
        setRateExchange("");
        setShowSourcePopup(false);
        setPendingForexSubmit(null);
        await fetchData();
        await refetchUser();
    } catch (e: any) {
        toast({ title: "Gagal Menukar", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCurrencyClick = async (curr: string) => {
    setChartCurr(curr);
    setLoadingChart(true);
    try {
        const res = await fetch(`/api/forex/history/${curr}`, {
            headers: { "x-user-email": currentUserEmail }
        });
        if (res.ok) {
            const json = await res.json();
            setChartData(json.data || []);
        } else {
            setChartData([]);
        }
    } catch (e) {
        console.error(e);
        setChartData([]);
    } finally {
        setLoadingChart(false);
    }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <img src="/BILANO-ICON-NEW.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-brand-navy font-bold text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-gold"/>
                  <span>Memuat Portofolio Valas...</span>
              </div>
          </div>
      );
  }

  const totalValasIDR = calculateTotalValasIDR();
  const displayTotalValas = isTrialExpired ? "✨ Rp ********" : formatRp(totalValasIDR);

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
                                Multi-Mata Uang
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                            Dompet Valas
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={fetchData} 
                        className={`w-10 h-10 rounded-full bg-white border border-slate-200 text-brand-navy shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 ${refreshing ? "animate-spin" : ""}`}
                        title="Segarkan Kurs Pasar"
                    >
                        <RefreshCw className="w-4 h-4 text-amber-600" />
                    </button>
                </div>
            </div>

            {/* 2. HERO CARD TOTAL ASET VALAS (SATU-SATUNYA DENGAN SOLID SHADOW KHAS BILANO) */}
            <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <Globe className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <Globe className="w-3 h-3 text-brand-navy fill-current" />
                            ESTIMASI TOTAL NILAI VALAS
                        </span>

                        <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                            {assets.length} Mata Uang Aktif
                        </span>
                    </div>

                    <p className="text-[10px] font-bold text-amber-200 uppercase tracking-widest mb-0.5">
                        Kekayaan Valuta Asing (IDR)
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-gold mb-2 tabular-nums">
                        {displayTotalValas}
                    </h2>

                    <div className="flex items-center justify-between pt-2 border-t border-white/15 text-[10px] text-amber-100/80 font-semibold">
                        <span>*Mengikuti kurs live pasar global</span>
                        <span className="bg-brand-gold/20 text-amber-200 px-2 py-0.5 rounded-md font-bold">
                            Live Rate
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT SECTION - CLEAN, CRISP & MODERN ELEVATION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-4">
            
            {/* LIVE MARKET RATES GRID */}
            <div>
                <div className="flex justify-between items-center mb-2 px-1">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                        Kurs Live Pasar Global
                    </h3>
                    <span className="text-[10px] font-bold text-brand-navy bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                        Klik untuk Grafik 📈
                    </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                    {POPULAR_RATES.map(curr => {
                        const currInfo = CURRENCY_LIST.find(c => c.code === curr);
                        return (
                            <button 
                                key={curr} 
                                type="button"
                                onClick={() => handleCurrencyClick(curr)} 
                                className="bg-white border border-slate-200/80 p-3 rounded-2xl shadow-xs hover:border-amber-300 hover:shadow-sm transition-all flex flex-col items-center justify-center cursor-pointer group"
                            >
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-xs">{currInfo?.flag}</span>
                                    <span className="text-xs font-extrabold text-brand-navy group-hover:text-amber-600 transition-colors">
                                        {curr}
                                    </span>
                                </div>
                                <div className={`text-xs font-black tabular-nums ${isTrialExpired ? 'text-rose-500' : 'text-slate-800'}`}>
                                    {isTrialExpired ? "✨ Pro" : `Rp ${Math.round(getSafeRate(curr)).toLocaleString("id-ID")}`}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB SWITCHER */}
            <div className="bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs flex gap-1">
                <button 
                    type="button"
                    onClick={() => setActiveTab('mutation')} 
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'mutation' 
                            ? 'bg-brand-navy text-brand-gold shadow-xs font-extrabold' 
                            : 'text-slate-600 hover:text-brand-navy'
                    }`}
                >
                    <FileText className="w-4 h-4 stroke-[2.5]" />
                    <span>CATAT MUTASI VALAS</span>
                </button>

                <button 
                    type="button"
                    onClick={() => setActiveTab('exchange')} 
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'exchange' 
                            ? 'bg-brand-gold text-brand-navy shadow-xs font-extrabold' 
                            : 'text-slate-600 hover:text-amber-700'
                    }`}
                >
                    <ArrowRightLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>TUKAR VALAS (JUAL/BELI)</span>
                </button>
            </div>

            {/* CARD FORM TRANSAKSI VALAS */}
            <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
                
                {/* SELECTOR MATA UANG CUSTOM DROPDOWN */}
                <div className="relative" ref={dropdownRef}>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                        Pilih Mata Uang Asing
                    </label>
                    <div 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                        className="w-full h-12 border border-slate-200 rounded-2xl flex items-center px-4 justify-between cursor-pointer bg-slate-50 hover:border-brand-navy transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{selectedCurr.flag}</span>
                            <span className="font-extrabold text-brand-navy text-sm">{selectedCurr.code}</span>
                            <span className="text-xs text-slate-500 font-medium truncate max-w-[140px]">
                                • {selectedCurr.name}
                            </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                    
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-64 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                            <div className="p-2 border-b border-slate-100 bg-slate-50">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400"/>
                                    <input 
                                        type="text" 
                                        placeholder="Cari negara / kode mata uang..." 
                                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-navy bg-white" 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        autoFocus 
                                    />
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {filteredCurrencies.map((c) => (
                                    <div 
                                        key={c.code} 
                                        onClick={() => { setSelectedCurr(c); setIsDropdownOpen(false); setSearchQuery(""); }} 
                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{c.flag}</span>
                                            <div>
                                                <div className="font-bold text-slate-800 text-xs">{c.code}</div>
                                                <div className="text-[10px] text-slate-500 font-medium">{c.name}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {c.country}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* FORM TAB 1: CATAT MUTASI */}
                {activeTab === 'mutation' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                            <button 
                                type="button"
                                onClick={() => setMutationMode('in')} 
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    mutationMode === 'in' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <ArrowDownCircle className="w-4 h-4" /> PEMASUKAN
                            </button>
                            <button 
                                type="button"
                                onClick={() => setMutationMode('out')} 
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    mutationMode === 'out' 
                                        ? 'bg-rose-600 text-white shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <ArrowUpCircle className="w-4 h-4" /> PENGELUARAN
                            </button>
                        </div>
                        
                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                            <button 
                                type="button"
                                onClick={() => setPaymentMode('cash')} 
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    paymentMode === 'cash' 
                                        ? (mutationMode === 'in' ? 'bg-emerald-100 text-emerald-800 shadow-xs' : 'bg-rose-100 text-rose-800 shadow-xs') 
                                        : 'text-slate-500'
                                }`}
                            >
                                <Wallet className="w-3.5 h-3.5"/> TUNAI (Cash Valas)
                            </button>
                            <button 
                                type="button"
                                onClick={() => setPaymentMode('debt')} 
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    paymentMode === 'debt' ? 'bg-amber-100 text-amber-800 shadow-xs' : 'text-slate-500'
                                }`}
                            >
                                <HandCoins className="w-3.5 h-3.5"/> {mutationMode === 'in' ? 'PIUTANG VALAS' : 'HUTANG VALAS'}
                            </button>
                        </div>

                        {paymentMode === 'debt' && (
                            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 space-y-3 animate-in fade-in">
                                <div>
                                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block mb-1 ml-1">
                                        {mutationMode === 'in' ? 'Ditagih Ke Siapa?' : 'Ngutang Ke Siapa?'}
                                    </label>
                                    <input 
                                        placeholder="Nama Pihak / Teman / Klien..." 
                                        value={debtName} 
                                        onChange={e => setDebtName(e.target.value)} 
                                        className="w-full h-12 px-4 text-xs bg-white border border-amber-200 focus:border-amber-500 rounded-2xl font-semibold outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block mb-1 ml-1">
                                        Tenggat Waktu Pelunasan
                                    </label>
                                    <input 
                                        type="date" 
                                        value={dueDate} 
                                        onChange={e => setDueDate(e.target.value)} 
                                        className="w-full h-12 px-4 text-xs bg-white border border-amber-200 focus:border-amber-500 rounded-2xl font-semibold outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                                Nominal ({selectedCurr.code})
                            </label>
                            <input 
                                type="text" 
                                inputMode="decimal" 
                                placeholder="Contoh: 100" 
                                className="w-full h-12 px-4 text-lg font-black rounded-2xl bg-slate-50 border border-slate-200 focus:border-brand-navy focus:bg-white outline-none tabular-nums" 
                                value={amountMutation} 
                                onChange={(e) => setAmountMutation(e.target.value.replace(/[^0-9.,]/g, ''))}
                            />
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1 flex items-center gap-1">
                                <StickyNote className="w-3 h-3 text-amber-600"/> Catatan / Keperluan
                            </label>
                            <textarea 
                                placeholder="Contoh: Honor freelance luar negeri, beli souvenir..." 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium focus:border-brand-navy focus:bg-white outline-none transition-all min-h-[80px] resize-none" 
                                value={noteMutation} 
                                onChange={(e) => setNoteMutation(e.target.value)}
                            />
                        </div>

                        <button 
                            type="button"
                            disabled={isSubmitting} 
                            onClick={handleMutation} 
                            className={`w-full h-14 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-white disabled:opacity-50 ${
                                paymentMode === 'debt' 
                                    ? 'bg-amber-600 hover:bg-amber-700' 
                                    : (mutationMode === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700')
                            }`}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "SIMPAN MUTASI VALAS"}
                        </button>
                    </div>
                )}

                {/* FORM TAB 2: TUKAR VALAS (JUAL / BELI) */}
                {activeTab === 'exchange' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                            <button 
                                type="button"
                                onClick={() => setExchangeMode('buy')} 
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    exchangeMode === 'buy' 
                                        ? 'bg-brand-navy text-brand-gold shadow-xs font-extrabold' 
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                BELI ({selectedCurr.code})
                            </button>
                            <button 
                                type="button"
                                onClick={() => setExchangeMode('sell')} 
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    exchangeMode === 'sell' 
                                        ? 'bg-amber-500 text-white shadow-xs font-extrabold' 
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                JUAL ({selectedCurr.code})
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                                    Jumlah ({selectedCurr.code})
                                </label>
                                <input 
                                    type="text" 
                                    inputMode="decimal" 
                                    placeholder="0" 
                                    className="w-full h-12 px-4 text-base font-black rounded-2xl bg-slate-50 border border-slate-200 focus:border-brand-navy focus:bg-white outline-none tabular-nums" 
                                    value={amountExchange} 
                                    onChange={(e) => setAmountExchange(e.target.value.replace(/[^0-9.,]/g, ''))}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                                    Kurs Deal (Rp)
                                </label>
                                <input 
                                    type="text" 
                                    inputMode="decimal" 
                                    placeholder={isTrialExpired ? "✨" : formatIdr(Math.round(getSafeRate(selectedCurr.code)).toString())} 
                                    className="w-full h-12 px-4 text-base font-black rounded-2xl bg-slate-50 border border-slate-200 focus:border-brand-navy focus:bg-white outline-none tabular-nums" 
                                    value={rateExchange} 
                                    onChange={(e) => setRateExchange(formatIdr(e.target.value))}
                                />
                            </div>
                        </div>
                        
                        {/* Kalkulasi Total Rupiah */}
                        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 text-center space-y-1">
                            <p className="text-[10px] font-bold text-amber-900 uppercase tracking-widest">
                                Total Rupiah ({exchangeMode === 'buy' ? 'Dipotong Kas' : 'Masuk Kas'})
                            </p>
                            <p className="text-xl font-black text-slate-900 tabular-nums">
                                {amountExchange && rateExchange ? formatRp(parseValas(amountExchange) * parseIdr(rateExchange)) : "Rp 0"}
                            </p>
                        </div>
                        
                        <button 
                            type="button"
                            disabled={isSubmitting} 
                            onClick={handleExchange} 
                            className="w-full h-14 font-bold text-xs uppercase tracking-wider rounded-2xl bg-brand-navy hover:bg-[#152e55] text-brand-gold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "KONFIRMASI TRANSAKSI PERTUKARAN"}
                        </button>
                    </div>
                )}
            </div>

            {/* DAFTAR PORTOFOLIO VALAS SAYA */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-amber-600" />
                        Portofolio Valas Saya ({assets.length})
                    </h3>
                </div>

                {assets.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-amber-200 shadow-xs p-6">
                        <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200">
                            <Globe className="w-7 h-7" />
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-sm">Belum Ada Aset Asing</h4>
                        <p className="text-slate-400 text-xs font-medium mt-1">
                            Gunakan form di atas untuk mencatat kepemilikan valuta asing pertama Anda.
                        </p>
                    </div>
                ) : (
                    assets.map((asset: ForexAsset) => {
                        const currInfo = CURRENCY_LIST.find(c => c.code === asset.currency) || { country: "", name: asset.currency, flag: "🌐" };
                        const liveRate = getSafeRate(asset.currency);
                        const idrVal = asset.amount * liveRate;
                        const walletSource = forexSources[asset.currency];
                        return (
                            <div
                                key={asset.id}
                                className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all"
                            >
                                <div className="flex justify-between items-center gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="bg-brand-navy text-brand-gold font-black w-11 h-11 rounded-2xl flex items-center justify-center text-xs shadow-xs shrink-0 border border-brand-gold/30">
                                            {asset.currency}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-extrabold text-slate-900 text-sm truncate">
                                                {asset.amount.toLocaleString()} <span className="text-xs text-slate-500 font-semibold">{asset.currency}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                <span>{currInfo.flag}</span>
                                                <span className="truncate">{currInfo.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className={`font-black ${isTrialExpired ? 'text-rose-500' : 'text-emerald-700'} text-sm sm:text-base tabular-nums`}>
                                            {isTrialExpired ? "✨ Premium" : formatRp(idrVal)}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium flex items-center justify-end gap-1 mt-0.5">
                                            <Activity className="w-3 h-3 text-amber-600"/>
                                            <span>@ {isTrialExpired ? "***" : formatRp(liveRate)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Baris sumber uang */}
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    {walletSource ? (
                                        <div className="flex items-center gap-1.5">
                                            <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[160px]">{walletSource}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] text-slate-400 italic font-medium">Sumber belum diisi</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingSourceCurrency(asset.currency);
                                            setEditSourceValue(forexSources[asset.currency] || "");
                                        }}
                                        className="flex items-center gap-1 text-[10px] font-bold text-brand-navy bg-slate-100 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-full transition-all active:scale-95 cursor-pointer shrink-0"
                                    >
                                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                                        {walletSource ? "Ubah" : "Tambah Sumber"}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📈 MODAL GRAFIK PASAR VALAS */}
      {/* ========================================================================= */}
      {chartCurr && !isTrialExpired && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 relative border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                      <div>
                          <div className="flex items-center gap-2">
                              <span className="text-lg">{CURRENCY_LIST.find(c => c.code === chartCurr)?.flag}</span>
                              <h3 className="font-extrabold text-xl text-slate-900">
                                  {chartCurr} / IDR
                              </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                              Tren Nilai Tukar 30 Hari Terakhir
                          </p>
                      </div>
                      <button 
                          type="button"
                          onClick={() => setChartCurr(null)} 
                          className="w-9 h-9 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                      >
                          <X className="w-4 h-4" />
                      </button>
                  </div>
                  
                  {/* Container Grafik */}
                  <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 p-3 mb-4" style={{ height: '240px' }}>
                      {loadingChart ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 animate-pulse">
                              <Activity className="w-8 h-8 mx-auto mb-2 text-brand-gold animate-spin"/>
                              <p className="text-xs font-bold text-brand-navy">Mengambil data pasar...</p>
                          </div>
                      ) : chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#1D3E72" stopOpacity={0.4}/>
                                          <stop offset="95%" stopColor="#1D3E72" stopOpacity={0.0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp ${v.toLocaleString('id-ID')}`} />
                                  <Tooltip 
                                      contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 'bold' }}
                                      formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Kurs Penutupan']}
                                  />
                                  <Area type="monotone" dataKey="rate" stroke="#1D3E72" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                              Data grafik pasar belum tersedia untuk mata uang ini.
                          </div>
                      )}
                  </div>

                  <button 
                      type="button"
                      onClick={() => setChartCurr(null)}
                      className="w-full h-12 rounded-2xl bg-brand-navy hover:bg-[#152e55] text-brand-gold font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                      Tutup Grafik
                  </button>
              </div>
          </div>
      )}

      {/* ====================================================== */}
      {/* POPUP: ISI SUMBER UANG VALAS (pakai SourceSelectionPopup) */}
      {/* ====================================================== */}
      {showForexSourcePopup && pendingSourceCurrencies.length > 0 && currentPendingIndex < pendingSourceCurrencies.length && (() => {
          const fc = pendingSourceCurrencies[currentPendingIndex];
          const isLast = currentPendingIndex >= pendingSourceCurrencies.length - 1;
          return (
              <SourceSelectionPopup
                  type="income"
                  title={`Pilih Dompet untuk ${fc.flag} ${fc.currency}`}
                  description={`Aset ${fc.currency} (${fc.amount % 1 === 0 ? fc.amount.toLocaleString("id-ID") : fc.amount.toFixed(4)} ${fc.currency}) disimpan di akun atau dompet mana?`}
                  onCancel={() => {
                      setShowForexSourcePopup(false);
                      setPendingSourceCurrencies([]);
                      setCurrentPendingIndex(0);
                  }}
                  onSelect={(src) => {
                      const current = getForexSources();
                      saveForexSources({ ...current, [fc.currency]: src });
                      toast({ title: "Tersimpan!", description: `Sumber ${fc.currency} → ${src}` });
                      if (isLast) {
                          setShowForexSourcePopup(false);
                          setPendingSourceCurrencies([]);
                          setCurrentPendingIndex(0);
                      } else {
                          setCurrentPendingIndex(prev => prev + 1);
                      }
                  }}
              />
          );
      })()}

      {/* POPUP EDIT SUMBER SATU MATA UANG (pakai SourceSelectionPopup) */}
      {editingSourceCurrency && (() => {
          const asset = assets.find(a => a.currency === editingSourceCurrency);
          if (!asset) return null;
          const currInfo = CURRENCY_LIST.find(c => c.code === editingSourceCurrency);
          return (
              <SourceSelectionPopup
                  type="income"
                  title={`Pilih Dompet ${currInfo?.flag ?? "🌐"} ${editingSourceCurrency}`}
                  description={`Pilih akun atau dompet tempat menyimpan ${editingSourceCurrency} (${asset.amount % 1 === 0 ? asset.amount.toLocaleString("id-ID") : asset.amount.toFixed(4)} ${editingSourceCurrency})`}
                  onCancel={() => setEditingSourceCurrency(null)}
                  onSelect={(src) => {
                      const current = getForexSources();
                      saveForexSources({ ...current, [editingSourceCurrency]: src });
                      setEditingSourceCurrency(null);
                      toast({ title: "Tersimpan!", description: `Sumber ${editingSourceCurrency} → ${src}` });
                  }}
              />
          );
      })()}
    </MobileLayout>
  );
}