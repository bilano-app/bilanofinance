import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    RefreshCw, Search, ArrowDownCircle, ArrowUpCircle, 
    Globe, ChevronDown, ArrowRightLeft, FileText, Wallet,
    Activity, HandCoins, StickyNote, AlertCircle, Loader2, X,
    ArrowLeft, Sparkles, TrendingUp, DollarSign, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { trackEvent } from "@/lib/tracking";
import { formatCurrency } from "@/lib/utils";

const CURRENCY_LIST = [
    { code: "USD", name: "US Dollar", country: "Amerika Serikat", flag: "🇺🇸" },
    { code: "SGD", name: "Singapore Dollar", country: "Singapura", flag: "🇸🇬" },
    { code: "EUR", name: "Euro", country: "Uni Eropa", flag: "🇪🇺" },
    { code: "JPY", name: "Japanese Yen", country: "Jepang", flag: "🇯🇵" },
    { code: "GBP", name: "British Pound", country: "Inggris", flag: "🇬🇧" },
    { code: "AUD", name: "Australian Dollar", country: "Australia", flag: "🇦🇺" },
    { code: "MYR", name: "Malaysian Ringgit", country: "Malaysia", flag: "🇲🇾" },
    { code: "CNY", name: "Chinese Yuan", country: "China", flag: "🇨🇳" },
    { code: "SAR", name: "Saudi Riyal", country: "Arab Saudi", flag: "🇸🇦" },
    { code: "HKD", name: "Hong Kong Dollar", country: "Hong Kong", flag: "🇭🇰" },
    { code: "KRW", name: "South Korean Won", country: "Korea Selatan", flag: "🇰🇷" },
    { code: "THB", name: "Thai Baht", country: "Thailand", flag: "🇹🇭" },
    { code: "IDR", name: "Indonesian Rupiah", country: "Indonesia", flag: "🇮🇩" },
];

const POPULAR_RATES = ["USD", "SGD", "EUR", "JPY", "GBP", "AUD"];

const DEFAULT_RATES: Record<string, number> = {
    "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
    "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
};

interface ForexAsset {
  id: number;
  currency: string;
  amount: number;
  avg_price?: number;
}

export default function Forex() {
  const [activeTab, setActiveTab] = useState<'mutation' | 'exchange'>('mutation');

  const [exchangeMode, setExchangeMode] = useState<'buy' | 'sell'>('buy');
  const [amountExchange, setAmountExchange] = useState("");
  const [rateExchange, setRateExchange] = useState("");

  const [mutationMode, setMutationMode] = useState<'in' | 'out'>('in');
  const [amountMutation, setAmountMutation] = useState("");
  const [noteMutation, setNoteMutation] = useState(""); 
  
  const [paymentMode, setPaymentMode] = useState<'cash' | 'debt'>('cash');
  const [debtName, setDebtName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurr, setSelectedCurr] = useState(CURRENCY_LIST[0]); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [chartCurr, setChartCurr] = useState<string | null>(null); 
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const { toast } = useToast();

  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;

  const [showSourcePopup, setShowSourcePopup] = useState(false);
  const [pendingForexSubmit, setPendingForexSubmit] = useState<{ action: 'exchange' | 'mutation' } | null>(null);

  const formatIdr = (val: string) => {
      if (!val) return "";
      let raw = val.replace(/\./g, "").replace(/[^0-9,]/g, "");
      const parts = raw.split(",");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return parts.slice(0, 2).join(",");
  };
  const parseIdr = (val: string) => parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) || 0;
  const parseValas = (val: string) => parseFloat(val.replace(/,/g, ".")) || 0;

  const { data: user } = useQuery({
      queryKey: ['userProfile', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/user`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: rates = {}, isLoading: isRatesLoading, refetch: refetchRates } = useQuery({
      queryKey: ['forexRates', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const getSafeRate = (curr: string) => {
      return rates[curr] || DEFAULT_RATES[curr] || 15000;
  };

  const { data: assets = [], isLoading: isAssetsLoading, refetch: refetchAssets, isFetching: isRefreshing } = useQuery({
      queryKey: ['forexAssets', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const isLoading = isRatesLoading || isAssetsLoading;
  const refreshing = isRefreshing;

  const fetchData = () => {
      refetchRates();
      refetchAssets();
  };

  const filteredCurrencies = CURRENCY_LIST.filter(c => 
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsDropdownOpen(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchWithTimeout = async (url: string, timeout = 2500) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          return response;
      } catch (error) {
          clearTimeout(id);
          throw error;
      }
  };

  const handleCurrencyClick = async (currencyCode: string) => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      setChartCurr(currencyCode);
      setLoadingChart(true);
      setChartData([]); 

      const baseRate = getSafeRate(currencyCode);
      
      const safeMockData = Array.from({ length: 30 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          return {
              date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
              value: Math.round(baseRate * (1 + (Math.random() * 0.015 - 0.0075)))
          };
      });
      safeMockData[safeMockData.length - 1].value = Math.round(baseRate);

      try {
          const endDate = new Date().toISOString().split('T')[0];
          const startDateObj = new Date();
          startDateObj.setDate(startDateObj.getDate() - 30);
          const startDate = startDateObj.toISOString().split('T')[0];

          const res = await fetchWithTimeout(`https://api.frankfurter.app/${startDate}..${endDate}?from=${currencyCode}&to=IDR`, 2500);
          
          if (!res.ok) throw new Error("API Tutup");
          
          const data = await res.json();
          if (data.rates && Object.keys(data.rates).length > 0) {
              const formattedData = Object.keys(data.rates).map(date => ({
                  date: new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                  value: data.rates[date].IDR
              }));
              setChartData(formattedData);
          } else {
              throw new Error("Data rates kosong");
          }
      } catch (error) { 
          setChartData(safeMockData); 
      } finally { 
          setLoadingChart(false); 
      }
  };

  const handleExchange = async () => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      const qty = parseValas(amountExchange);
      const rate = parseIdr(rateExchange);
      if (!qty || !rate) { 
          toast({ title: "Form Belum Lengkap", description: "Masukkan jumlah valas dan kurs kesepakatan.", variant: "destructive" }); 
          return; 
      }

      if (user?.walletSources && (user.walletSources as any[]).length > 0) {
          setPendingForexSubmit({ action: 'exchange' });
          setShowSourcePopup(true);
      } else {
          executeExchange();
      }
  };

  const executeExchange = async (selectedSource?: string) => {
      const qty = parseValas(amountExchange);
      const rate = parseIdr(rateExchange);

      if (exchangeMode === 'buy') {
          const totalCost = qty * rate;
          if ((user?.cashBalance || 0) < totalCost) {
              toast({ 
                  title: "Saldo Kas Tidak Cukup", 
                  description: `Butuh Rp ${totalCost.toLocaleString('id-ID')} tapi Kas Tunai Anda hanya Rp ${(user?.cashBalance || 0).toLocaleString('id-ID')}.`, 
                  variant: "destructive" 
              });
              return; 
          }
      } else {
          const existingAsset = assets.find((a: any) => a.currency === selectedCurr.code);
          if (!existingAsset || existingAsset.amount < qty) {
              toast({ 
                  title: "Saldo Valas Tidak Cukup", 
                  description: `Anda hanya memiliki ${existingAsset?.amount || 0} ${selectedCurr.code}. Tidak cukup untuk dijual.`, 
                  variant: "destructive" 
              });
              return; 
          }
      }

      setIsSubmitting(true);
      try {
          const forexType = exchangeMode === 'buy' ? 'forex_buy' : 'forex_sell';
          
          const resForex = await fetch("/api/forex/transaction", {
              method: "POST", 
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ 
                  currency: selectedCurr.code, 
                  amount: qty, 
                  rate: rate,
                  type: forexType,
                  source: selectedSource
              })
          });
          
          if (!resForex.ok) { 
              toast({ title: "Gagal", description: "Transaksi gagal diproses oleh server.", variant: "destructive" }); 
              return; 
          }

          trackEvent("forex_exchange_tx", { 
              exchangeMode: exchangeMode,
              currency: selectedCurr.code
          });

          toast({ title: "Transaksi Berhasil! ✨", description: `Pertukaran ${selectedCurr.code} telah dibukukan.` });
          setAmountExchange(""); setRateExchange(""); 
          fetchData(); 
      } catch (e) { 
          toast({ title: "Terjadi Kendala", description: "Gangguan koneksi server.", variant: "destructive" }); 
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleMutation = async () => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      const qty = parseValas(amountMutation);
      if (!qty || qty <= 0) { 
          toast({ title: "Nominal Belum Diisi", description: "Masukkan jumlah nominal valas yang valid.", variant: "destructive" }); 
          return; 
      }
      
      if (paymentMode === 'debt' && (!debtName.trim() || !dueDate)) {
          toast({ title: "Form Tagihan Belum Lengkap", description: "Isi nama pihak dan tanggal tenggat tempo.", variant: "destructive" });
          return;
      }

      if (user?.walletSources && (user.walletSources as any[]).length > 0 && paymentMode === 'cash') {
          setPendingForexSubmit({ action: 'mutation' });
          setShowSourcePopup(true);
      } else {
          executeMutation();
      }
  };

  const executeMutation = async (selectedSource?: string) => {
      const qty = parseValas(amountMutation);

      if (mutationMode === 'out' && paymentMode === 'cash') {
          const existingAsset = assets.find((a: any) => a.currency === selectedCurr.code);
          if (!existingAsset || existingAsset.amount < qty) {
              toast({ 
                  title: "Saldo Valas Tidak Cukup", 
                  description: `Anda hanya memiliki ${existingAsset?.amount || 0} ${selectedCurr.code}.`, 
                  variant: "destructive" 
              });
              return; 
          }
      }

      const note = noteMutation.trim();
      setIsSubmitting(true);

      try {
          if (paymentMode === 'cash') {
              const res = await fetch("/api/forex/transaction", {
                  method: "POST", 
                  headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                  body: JSON.stringify({ 
                      currency: selectedCurr.code, 
                      amount: qty, 
                      type: mutationMode === 'in' ? 'income' : 'expense',
                      description: note,
                      source: selectedSource
                  })
              });

              if (res.ok) {
                  trackEvent("forex_mutation_tx", { type: mutationMode, paymentMode: "cash", currency: selectedCurr.code });
                  toast({ title: "Berhasil Tercatat! 💵", description: `Saldo ${selectedCurr.code} berhasil diperbarui.` });
                  setAmountMutation(""); setNoteMutation(""); setDebtName(""); setDueDate("");
                  fetchData();
              } else {
                  toast({ title: "Gagal", description: "Gagal memproses transaksi valas.", variant: "destructive" });
              }
          } else {
              const debtType = mutationMode === 'in' ? 'piutang' : 'hutang';

              await fetch("/api/debts", {
                  method: "POST", 
                  headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                  body: JSON.stringify({
                      type: debtType,
                      name: `${debtName.trim()}|${selectedCurr.code}`,
                      amount: qty,
                      dueDate: dueDate,
                      description: `[${debtType.toUpperCase()} VALAS] ${note}`,
                      isFromTransaction: true,
                      source: selectedSource
                  })
              });
              trackEvent("forex_mutation_tx", { type: mutationMode, paymentMode: "debt", currency: selectedCurr.code });
              toast({ title: "Tercatat ke Tagihan! 📝", description: `${debtType === 'piutang' ? 'Piutang' : 'Hutang'} ${selectedCurr.code} berhasil disimpan.` });
              setAmountMutation(""); setNoteMutation(""); setDebtName(""); setDueDate("");
              fetchData();
          }
      } catch (e) { 
          toast({ title: "Error", description: "Gagal terhubung ke server.", variant: "destructive" }); 
      } finally {
          setIsSubmitting(false);
      }
  };

  const totalValasInRupiah = assets.reduce((acc: number, asset: ForexAsset) => {
      const rate = getSafeRate(asset.currency);
      return acc + (asset.amount * rate);
  }, 0);

  const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");
  const displayTotalValas = isTrialExpired ? "✨ Premium" : formatRp(totalValasInRupiah);

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <img src="/BILANO-ICON-NEW.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-brand-navy font-black text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-gold"/>
                  <span>Memuat Portofolio Valas...</span>
              </div>
          </div>
      );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA BILANO GOLD & NAVY */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b-2 border-amber-400">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(245,158,11,0.08)] flex items-center justify-between relative z-30 border-b border-amber-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            className="w-10 h-10 rounded-full bg-brand-navy hover:bg-[#152e55] text-brand-gold shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                            title="Kembali ke Beranda"
                        >
                            <ArrowLeft className="w-5 h-5 text-brand-gold" strokeWidth={2.5} />
                        </button>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                                Valuta Asing (Forex)
                            </p>
                        </div>
                        <h1 className="text-lg font-black text-slate-900 leading-tight">
                            Dompet Valas
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchData} 
                        className={`w-10 h-10 rounded-full bg-white border-2 border-amber-200 text-brand-navy shadow-[2px_2px_0px_0px] shadow-slate-900 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${refreshing ? "animate-spin" : ""}`}
                        title="Segarkan Kurs Pasar"
                    >
                        <RefreshCw className="w-4 h-4 text-amber-600" />
                    </button>
                </div>
            </div>

            {/* 2. HERO CARD TOTAL ASET VALAS (FORMAT FLAGSHIP HOME NAVY & GOLD) */}
            <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-5 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <Globe className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-brand-gold/20 text-brand-gold text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-brand-gold/30 backdrop-blur-xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-brand-gold fill-current" />
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
        {/* 2. BODY CONTENT SECTION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-4 pb-24 bg-slate-50 flex flex-col gap-5">
            
            {/* LIVE MARKET RATES GRID */}
            <div>
                <div className="flex justify-between items-center mb-2 px-1">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                        Kurs Live Pasar Global
                    </h3>
                    <span className="text-[10px] font-black text-brand-navy bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                        Klik untuk Grafik 📈
                    </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                    {POPULAR_RATES.map(curr => {
                        const currInfo = CURRENCY_LIST.find(c => c.code === curr);
                        return (
                            <button 
                                key={curr} 
                                onClick={() => handleCurrencyClick(curr)} 
                                className="bg-white border-2 border-amber-200/90 p-3 rounded-2xl shadow-[3px_3px_0px_0px] shadow-slate-900 hover:shadow-[4px_4px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] transition-all flex flex-col items-center justify-center cursor-pointer group"
                            >
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-xs">{currInfo?.flag}</span>
                                    <span className="text-xs font-black text-brand-navy group-hover:text-amber-600 transition-colors">
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

            {/* TAB SWITCHER DENGAN GAYA NEO-BRUTALIST */}
            <div className="bg-white p-1.5 rounded-[22px] border-2 border-amber-200 shadow-[4px_4px_0px_0px] shadow-slate-900 flex gap-1.5">
                <button 
                    onClick={() => setActiveTab('mutation')} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'mutation' 
                            ? 'bg-brand-navy text-brand-gold shadow-[2px_2px_0px_0px] shadow-slate-950 translate-x-[-1px] translate-y-[-1px]' 
                            : 'text-slate-600 hover:text-brand-navy'
                    }`}
                >
                    <FileText className="w-4 h-4 stroke-[2.5]" />
                    <span>CATAT MUTASI VALAS</span>
                </button>

                <button 
                    onClick={() => setActiveTab('exchange')} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'exchange' 
                            ? 'bg-brand-gold text-brand-navy shadow-[2px_2px_0px_0px] shadow-slate-950 translate-x-[-1px] translate-y-[-1px]' 
                            : 'text-slate-600 hover:text-amber-700'
                    }`}
                >
                    <ArrowRightLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>TUKAR VALAS (JUAL/BELI)</span>
                </button>
            </div>

            {/* CARD FORM TRANSAKSI VALAS */}
            <div className="bg-white p-5 rounded-[28px] shadow-[6px_6px_0px_0px] shadow-slate-900 border-2 border-amber-200 space-y-4">
                
                {/* SELECTOR MATA UANG CUSTOM DROPDOWN */}
                <div className="relative" ref={dropdownRef}>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                        Pilih Mata Uang Asing
                    </label>
                    <div 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                        className="w-full h-13 border-2 border-amber-200 rounded-2xl flex items-center px-4 justify-between cursor-pointer bg-slate-50 hover:border-amber-400 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{selectedCurr.flag}</span>
                            <span className="font-black text-brand-navy text-sm">{selectedCurr.code}</span>
                            <span className="text-xs text-slate-500 font-semibold truncate max-w-[140px]">
                                • {selectedCurr.name}
                            </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                    
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-amber-300 rounded-2xl shadow-2xl z-50 max-h-64 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                            <div className="p-2 border-b border-slate-100 bg-amber-50/50">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400"/>
                                    <input 
                                        type="text" 
                                        placeholder="Cari negara / kode mata uang..." 
                                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-amber-500 bg-white" 
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
                                        className="px-4 py-3 hover:bg-amber-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{c.flag}</span>
                                            <div>
                                                <div className="font-black text-slate-800 text-xs">{c.code}</div>
                                                <div className="text-[10px] text-slate-500 font-medium">{c.name}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
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
                    <div className="space-y-3.5 animate-in fade-in slide-in-from-left-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                type="button"
                                onClick={() => setMutationMode('in')} 
                                className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    mutationMode === 'in' 
                                        ? 'bg-emerald-600 text-white shadow-[2px_2px_0px_0px] shadow-emerald-950' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'
                                }`}
                            >
                                <ArrowDownCircle className="w-4 h-4" /> PEMASUKAN
                            </button>
                            <button 
                                type="button"
                                onClick={() => setMutationMode('out')} 
                                className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    mutationMode === 'out' 
                                        ? 'bg-rose-600 text-white shadow-[2px_2px_0px_0px] shadow-rose-950' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-rose-50'
                                }`}
                            >
                                <ArrowUpCircle className="w-4 h-4" /> PENGELUARAN
                            </button>
                        </div>
                        
                        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                            <button 
                                type="button"
                                onClick={() => setPaymentMode('cash')} 
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    paymentMode === 'cash' 
                                        ? (mutationMode === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800') 
                                        : 'text-slate-400'
                                }`}
                            >
                                <Wallet className="w-3.5 h-3.5"/> TUNAI (Cash Valas)
                            </button>
                            <button 
                                type="button"
                                onClick={() => setPaymentMode('debt')} 
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    paymentMode === 'debt' ? 'bg-amber-100 text-amber-800' : 'text-slate-400'
                                }`}
                            >
                                <HandCoins className="w-3.5 h-3.5"/> {mutationMode === 'in' ? 'PIUTANG VALAS' : 'HUTANG VALAS'}
                            </button>
                        </div>

                        {paymentMode === 'debt' && (
                            <div className="bg-amber-50/80 p-3.5 rounded-2xl border-2 border-amber-200 space-y-2.5 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                                        {mutationMode === 'in' ? 'Ditagih Ke Siapa?' : 'Ngutang Ke Siapa?'}
                                    </label>
                                    <Input 
                                        placeholder="Nama Pihak / Teman / Klien..." 
                                        value={debtName} 
                                        onChange={e => setDebtName(e.target.value)} 
                                        className="h-11 text-xs bg-white border-2 border-amber-200 focus:border-amber-500 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                                        Tenggat Waktu Pelunasan
                                    </label>
                                    <Input 
                                        type="date" 
                                        value={dueDate} 
                                        onChange={e => setDueDate(e.target.value)} 
                                        className="h-11 text-xs bg-white border-2 border-amber-200 focus:border-amber-500 rounded-xl font-bold w-full"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                Nominal ({selectedCurr.code})
                            </label>
                            <Input 
                                type="text" 
                                inputMode="decimal" 
                                placeholder="Contoh: 100" 
                                className="h-13 text-xl font-black rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-amber-500" 
                                value={amountMutation} 
                                onChange={(e) => setAmountMutation(e.target.value.replace(/[^0-9.,]/g, ''))}
                            />
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 flex items-center gap-1">
                                <StickyNote className="w-3 h-3 text-amber-600"/> Catatan / Keperluan
                            </label>
                            <textarea 
                                placeholder="Contoh: Honor freelance luar negeri, beli souvenir..." 
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 text-xs font-medium focus:border-amber-500 focus:bg-white transition-all min-h-[75px] resize-none" 
                                value={noteMutation} 
                                onChange={(e) => setNoteMutation(e.target.value)}
                            />
                        </div>

                        <button 
                            disabled={isSubmitting} 
                            onClick={handleMutation} 
                            className={`w-full h-13 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer text-white ${
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
                    <div className="space-y-3.5 animate-in fade-in slide-in-from-right-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                type="button"
                                onClick={() => setExchangeMode('buy')} 
                                className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    exchangeMode === 'buy' 
                                        ? 'bg-brand-navy text-brand-gold shadow-[2px_2px_0px_0px] shadow-slate-950' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-blue-50'
                                }`}
                            >
                                BELI ({selectedCurr.code})
                            </button>
                            <button 
                                type="button"
                                onClick={() => setExchangeMode('sell')} 
                                className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    exchangeMode === 'sell' 
                                        ? 'bg-amber-500 text-white shadow-[2px_2px_0px_0px] shadow-slate-950' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-amber-50'
                                }`}
                            >
                                JUAL ({selectedCurr.code})
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2.5">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                    Jumlah ({selectedCurr.code})
                                </label>
                                <Input 
                                    type="text" 
                                    inputMode="decimal" 
                                    placeholder="0" 
                                    className="h-12 text-base font-black rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-amber-500" 
                                    value={amountExchange} 
                                    onChange={(e) => setAmountExchange(e.target.value.replace(/[^0-9.,]/g, ''))}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                    Kurs Deal (Rp)
                                </label>
                                <Input 
                                    type="text" 
                                    inputMode="decimal" 
                                    placeholder={isTrialExpired ? "✨" : formatIdr(Math.round(getSafeRate(selectedCurr.code)).toString())} 
                                    className="h-12 text-base font-black rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-amber-500" 
                                    value={rateExchange} 
                                    onChange={(e) => setRateExchange(formatIdr(e.target.value))}
                                />
                            </div>
                        </div>
                        
                        {/* Kalkulasi Total Rupiah */}
                        <div className="p-3.5 rounded-2xl border-2 border-amber-200 bg-amber-50 text-center">
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-0.5">
                                Total Rupiah ({exchangeMode === 'buy' ? 'Dipotong Kas' : 'Masuk Kas'})
                            </p>
                            <p className="text-xl font-black text-slate-900 tabular-nums">
                                {amountExchange && rateExchange ? formatRp(parseValas(amountExchange) * parseIdr(rateExchange)) : "Rp 0"}
                            </p>
                        </div>
                        
                        <button 
                            disabled={isSubmitting} 
                            onClick={handleExchange} 
                            className="w-full h-13 font-black text-xs uppercase tracking-wider rounded-2xl bg-brand-navy hover:bg-[#152e55] text-brand-gold shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "KONFIRMASI TRANSAKSI PERTUKARAN"}
                        </button>
                    </div>
                )}
            </div>

            {/* DAFTAR PORTOFOLIO VALAS SAYA */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-amber-600" />
                        Portofolio Valas Saya ({assets.length})
                    </h3>
                </div>

                {assets.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-[28px] border-2 border-dashed border-amber-200 shadow-sm p-6">
                        <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Globe className="w-7 h-7" />
                        </div>
                        <h4 className="font-black text-slate-800 text-sm">Belum Ada Aset Asing</h4>
                        <p className="text-slate-400 text-xs font-medium mt-1">
                            Gunakan form di atas untuk mencatat kepemilikan valuta asing pertama Anda.
                        </p>
                    </div>
                ) : (
                    assets.map((asset: ForexAsset) => {
                        const currInfo = CURRENCY_LIST.find(c => c.code === asset.currency) || { country: "", name: asset.currency, flag: "🌐" };
                        const liveRate = getSafeRate(asset.currency);
                        const idrVal = asset.amount * liveRate;
                        return (
                            <div 
                                key={asset.id} 
                                className="bg-white p-4 sm:p-5 rounded-[24px] border-2 border-amber-200/90 shadow-[4px_4px_0px_0px] shadow-slate-900 flex justify-between items-center gap-3 transition-all hover:shadow-[5px_5px_0px_0px]"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="bg-brand-navy text-brand-gold font-black w-11 h-11 rounded-2xl flex items-center justify-center text-xs shadow-md shrink-0 border border-brand-gold/30">
                                        {asset.currency}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-slate-900 text-sm truncate">
                                            {asset.amount.toLocaleString()} <span className="text-xs text-slate-500 font-semibold">{asset.currency}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                                            <span>{currInfo.flag}</span>
                                            <span className="truncate">{currInfo.name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className={`font-black ${isTrialExpired ? 'text-rose-500' : 'text-emerald-700'} text-sm sm:text-base tabular-nums`}>
                                        {isTrialExpired ? "✨ Premium" : formatRp(idrVal)}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-end gap-1 mt-0.5">
                                        <Activity className="w-3 h-3 text-amber-600"/> 
                                        <span>@ {isTrialExpired ? "***" : formatRp(liveRate)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📈 MODAL GRAFIK PASAR VALAS (LUXURIOUS GOLD & NAVY) */}
      {/* ========================================================================= */}
      {chartCurr && !isTrialExpired && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 relative border-4 border-brand-gold">
                  <div className="flex justify-between items-center mb-4">
                      <div>
                          <div className="flex items-center gap-2">
                              <span className="text-lg">{CURRENCY_LIST.find(c => c.code === chartCurr)?.flag}</span>
                              <h3 className="font-black text-xl text-brand-navy">
                                  {chartCurr} / IDR
                              </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              Tren Nilai Tukar 30 Hari Terakhir
                          </p>
                      </div>
                      <button 
                          onClick={() => setChartCurr(null)} 
                          className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  {/* Container Grafik */}
                  <div className="w-full bg-slate-50 rounded-2xl border-2 border-slate-200 p-3 mb-4" style={{ height: '240px' }}>
                      {loadingChart ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 animate-pulse">
                              <Activity className="w-8 h-8 mx-auto mb-2 text-brand-gold animate-spin"/>
                              <p className="text-xs font-black text-brand-navy">Mengambil data pasar...</p>
                          </div>
                      ) : chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="forexGoldGrad" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#F6B93B" stopOpacity={0.4}/>
                                          <stop offset="95%" stopColor="#F6B93B" stopOpacity={0.0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                  <XAxis 
                                      dataKey="date" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                                      minTickGap={20}
                                  />
                                  <YAxis 
                                      domain={['auto', 'auto']} 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
                                      tickFormatter={(val) => `Rp ${(val/1000).toFixed(1)}k`}
                                      orientation="right"
                                  />
                                  <Tooltip 
                                      contentStyle={{ 
                                          borderRadius: '16px', 
                                          border: '2px solid #F6B93B', 
                                          backgroundColor: '#1D3E72',
                                          color: '#ffffff',
                                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', 
                                          fontSize: '12px', 
                                          fontWeight: 'bold' 
                                      }} 
                                      formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Kurs']}
                                      labelStyle={{ color: '#F6B93B', marginBottom: '4px', fontSize: '10px', fontWeight: 800 }}
                                  />
                                  <Area 
                                      type="monotone" 
                                      dataKey="value" 
                                      stroke="#F6B93B" 
                                      strokeWidth={3} 
                                      fill="url(#forexGoldGrad)" 
                                      activeDot={{ r: 6, fill: '#F6B93B', stroke: '#1D3E72', strokeWidth: 3 }} 
                                  />
                              </AreaChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <p className="text-xs font-bold">Gagal memuat grafik pasar.</p>
                          </div>
                      )}
                  </div>

                  {/* Harga Saat Ini Highlight */}
                  <div className="flex items-center justify-between bg-amber-50 border-2 border-amber-200 p-3.5 rounded-2xl mb-4">
                      <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                          Harga Kurs Saat Ini
                      </span>
                      <span className="font-black text-brand-navy text-lg tabular-nums">
                          Rp {Math.round(getSafeRate(chartCurr)).toLocaleString('id-ID')}
                      </span>
                  </div>

                  <button 
                      onClick={() => { 
                          setChartCurr(null); 
                          setSelectedCurr(CURRENCY_LIST.find(c => c.code === chartCurr) || CURRENCY_LIST[0]); 
                          setActiveTab('exchange'); 
                      }} 
                      className="w-full bg-brand-navy hover:bg-[#152e55] text-brand-gold h-13 text-xs font-black uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                  >
                      TRANSAKSI {chartCurr} SEKARANG
                  </button>
              </div>
          </div>
      )}

      {/* POPUP PEMILIHAN SUMBER DANA */}
      {showSourcePopup && (
          <SourceSelectionPopup 
              type={
                  pendingForexSubmit?.action === 'exchange' 
                      ? (exchangeMode === 'buy' ? 'expense' : 'income') 
                      : (mutationMode === 'in' ? 'expense' : 'income')
              }
              title={pendingForexSubmit?.action === 'exchange' ? (exchangeMode === 'buy' ? "Sumber Dana Beli Valas" : "Tujuan Dana Jual Valas") : "Pilih Sumber Dana"}
              onCancel={() => {
                  setShowSourcePopup(false);
                  setPendingForexSubmit(null);
              }}
              onSelect={(src) => {
                  setShowSourcePopup(false);
                  if (pendingForexSubmit?.action === 'exchange') {
                      executeExchange(src);
                  } else if (pendingForexSubmit?.action === 'mutation') {
                      executeMutation(src);
                  }
                  setPendingForexSubmit(null);
              }}
          />
      )}
    </MobileLayout>
  );
}