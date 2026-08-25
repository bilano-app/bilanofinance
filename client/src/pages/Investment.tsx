import { useEffect, useState } from "react";
import { 
    ArrowLeft, PlusCircle, X, Loader2, Info, Sparkles, AlertTriangle, 
    Lock, Crown, CheckCircle2, AlertCircle, TrendingUp, ChevronRight, 
    PieChart, Wallet, Coins, Layers, ArrowUpRight, ArrowDownRight, RefreshCcw
} from "lucide-react"; 
import { Button, Input } from "@/components/UIComponents";
import { MobileLayout } from "@/components/Layout";
import { useUser, useInvestments } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { trackEvent } from "@/lib/tracking";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";

type AssetType = 'saham' | 'crypto' | 'reksadana' | 'obligasi' | 'p2p' | 'emas' | 'properti' | 'koleksi';

export default function Investment() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [viewState, setViewState] = useState<'main' | 'detail'>('main');
  const [activeCategory, setActiveCategory] = useState<AssetType | null>(null);
  
  const [detailTab, setDetailTab] = useState<'transaksi' | 'analisa'>('transaksi');
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [proFeatureModal, setProFeatureModal] = useState<{title: string, desc: string} | null>(null);
  
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [showSourcePopup, setShowSourcePopup] = useState(false);

  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: portfolioRaw = [], isLoading: isInvLoading } = useInvestments();

  const isUserPro = user?.isPro || user?.plan === 'pro' || (typeof window !== "undefined" && localStorage.getItem("bilano_pro") === "true");

  useEffect(() => {
      if (!isInvLoading && !isUserLoading) {
          trackEvent("portfolio_viewed", { module: "investment" });
      }
  }, [isInvLoading, isUserLoading]);
  
  const formatNum = (val: string) => {
      if (!val) return "";
      let raw = val.replace(/\./g, "").replace(/[^0-9,]/g, "");
      const parts = raw.split(",");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return parts.slice(0, 2).join(",");
  };
  const parseNum = (val: string) => parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) || 0;

  const { data: forexRates = {}, isLoading: isRatesLoading, refetch: refetchRates } = useQuery({
      queryKey: ['forexRates', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const availableCurrencies = Object.keys(forexRates);
  const fcf = user?.cashBalance || 0; 

  const [inputName, setInputName] = useState("");
  const [inputQty, setInputQty] = useState("");   
  const [inputPrice, setInputPrice] = useState(""); 
  const [inputCurrency, setInputCurrency] = useState("IDR");
  const [selectedSellSymbol, setSelectedSellSymbol] = useState("");

  const formatRp = (num: number) => {
      const validNum = Number(num) || 0;
      return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(validNum);
  };

  const assetConfig: Record<AssetType, { label: string, unit: string, imgUrl: string, bg: string, headerBg: string, color: string, badgeBg: string }> = {
      saham: { 
          label: 'Saham', 
          unit: 'Lot/Lembar', 
          imgUrl: 'https://api.iconify.design/solar/chart-square-bold.svg?color=%230284c7', 
          bg: 'bg-sky-50 border-sky-200', 
          headerBg: 'from-[#0284C7] to-[#0369A1]', 
          color: 'text-sky-700',
          badgeBg: 'bg-sky-100 text-sky-800 border-sky-300'
      },
      crypto: { 
          label: 'Crypto', 
          unit: 'Koin', 
          imgUrl: 'https://api.iconify.design/ic/round-currency-bitcoin.svg?color=%23ea580c', 
          bg: 'bg-orange-50 border-orange-200', 
          headerBg: 'from-[#EA580C] to-[#C2410C]', 
          color: 'text-orange-600',
          badgeBg: 'bg-orange-100 text-orange-800 border-orange-300'
      },
      reksadana: { 
          label: 'Reksadana', 
          unit: 'Unit', 
          imgUrl: 'https://api.iconify.design/solar/pie-chart-3-bold.svg?color=%230284c7', 
          bg: 'bg-cyan-50 border-cyan-200', 
          headerBg: 'from-[#0891B2] to-[#0E7490]', 
          color: 'text-cyan-700',
          badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-300'
      },
      obligasi: { 
          label: 'Obligasi', 
          unit: 'Lembar', 
          imgUrl: 'https://api.iconify.design/solar/document-text-bold.svg?color=%234f46e5', 
          bg: 'bg-indigo-50 border-indigo-200', 
          headerBg: 'from-[#4F46E5] to-[#3730A3]', 
          color: 'text-indigo-600',
          badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300'
      },
      p2p: { 
          label: 'P2P Lending', 
          unit: 'Akun / Lot', 
          imgUrl: 'https://api.iconify.design/solar/users-group-two-rounded-bold.svg?color=%239333ea', 
          bg: 'bg-purple-50 border-purple-200', 
          headerBg: 'from-[#9333EA] to-[#6B21A8]', 
          color: 'text-purple-600',
          badgeBg: 'bg-purple-100 text-purple-800 border-purple-300'
      },
      emas: { 
          label: 'Emas & Logam', 
          unit: 'Gram', 
          imgUrl: 'https://api.iconify.design/game-icons/gold-bar.svg?color=%23d97706', 
          bg: 'bg-amber-50 border-amber-200', 
          headerBg: 'from-[#D97706] to-[#B45309]', 
          color: 'text-amber-700',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-300'
      },
      properti: { 
          label: 'Properti', 
          unit: 'Unit Properti', 
          imgUrl: 'https://api.iconify.design/solar/buildings-bold.svg?color=%230d9488', 
          bg: 'bg-teal-50 border-teal-200', 
          headerBg: 'from-[#0D9488] to-[#115E59]', 
          color: 'text-teal-700',
          badgeBg: 'bg-teal-100 text-teal-800 border-teal-300'
      },
      koleksi: { 
          label: 'Koleksi', 
          unit: 'Item', 
          imgUrl: 'https://api.iconify.design/solar/crown-star-bold.svg?color=%23e11d48', 
          bg: 'bg-rose-50 border-rose-200', 
          headerBg: 'from-[#E11D48] to-[#9F1239]', 
          color: 'text-rose-600',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-300'
      },
  };

  const aggregatedPortfolio = Object.values(portfolioRaw.reduce((acc: any, p: any) => {
      if (!acc[p.symbol]) { acc[p.symbol] = { ...p, quantity: 0, totalVal: 0 }; }
      acc[p.symbol].quantity += p.quantity;
      acc[p.symbol].totalVal += (p.quantity * p.avgPrice);
      return acc;
  }, {} as Record<string, any>)).map((g: any) => ({
      ...g,
      avgPrice: g.quantity > 0 ? (g.totalVal / g.quantity) : 0
  }));

  const getFilteredPortfolio = () => {
      if (!activeCategory) return aggregatedPortfolio;
      return aggregatedPortfolio.filter((p: any) => {
          if (p.type) return p.type.toLowerCase() === activeCategory.toLowerCase();
          const parts = (p.symbol||"").split('|');
          const sym = parts[0] || "";
          const isLegacyStock = sym.length === 4 && !sym.includes(" ");
          if (activeCategory === 'saham') return isLegacyStock;
          if (isLegacyStock) return false; 
          return true; 
      });
  };

  const filteredItems = getFilteredPortfolio();

  const calculateLiveValue = (p: any) => {
      const parts = (p.symbol||"").split('|');
      const sym = parts[0] || "";
      const curr = parts[1];
      const actualCurr = curr || 'IDR';
      const rate = actualCurr === 'IDR' ? 1 : (forexRates[actualCurr] || 1);
      const isStock = p.type?.toLowerCase() === 'saham' || (!p.type && sym.length === 4);
      const multiplier = (isStock && actualCurr === 'IDR') ? 100 : 1; 
      return p.quantity * (p.avgPrice || 0) * multiplier * rate;
  };

  const totalPortfolioValue = aggregatedPortfolio.reduce((acc: number, p: any) => acc + calculateLiveValue(p), 0);
  const categoryValue = filteredItems.reduce((acc: number, p: any) => acc + calculateLiveValue(p), 0);

  const displayTotalPortfolio = formatRp(totalPortfolioValue);
  const displayCategoryValue = formatRp(categoryValue);

  const handleTransactionInit = () => {
    if (!inputPrice || !inputQty) return;
    
    if (user?.walletSources && (user.walletSources as any[]).length > 0) {
        setShowSourcePopup(true);
    } else {
        handleTransaction();
    }
  };

  const handleTransaction = async (selectedSource?: string) => {
    if (!inputPrice || !inputQty) return;
    
    const price = parseNum(inputPrice);
    const qty = parseNum(inputQty);

    setIsSubmitting(true); 

    try {
        const symbolPayload = txType === 'SELL' ? selectedSellSymbol : `${inputName.toUpperCase()}|${inputCurrency}`;
        
        const payload = {
           symbol: symbolPayload,
           quantity: qty, 
           price: price, 
           type: activeCategory || 'saham',
           source: selectedSource
        };

        const endpoint = txType === 'BUY' ? "/api/investments/buy" : "/api/investments/sell";

        const res = await fetch(endpoint, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-user-email": currentUserEmail 
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Gagal memproses transaksi.");
        }

        trackEvent("investment_tx_added", { 
            txType: txType,
            assetCategory: activeCategory || 'saham',
            currency: inputCurrency
        });
        
        toast({ 
            title: "Berhasil! 📈", 
            description: `Transaksi ${txType === 'BUY' ? 'Beli' : 'Jual'} aset berhasil dicatat dalam portofolio.` 
        });
        
        resetForm();
        queryClient.invalidateQueries({ queryKey: ["investments"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({ queryKey: ["global-finance-state"] });

    } catch (error: any) {
        toast({ title: "Transaksi Ditolak", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false); 
    }
  };

  const resetForm = () => {
    setInputName(""); setInputQty(""); setInputPrice(""); setSelectedSellSymbol(""); setInputCurrency("IDR");
  };

  const renderDynamicForm = () => {
    const qtyNum = parseNum(inputQty) || 0;
    const priceNum = parseNum(inputPrice) || 0;
    
    const isForeign = inputCurrency !== 'IDR';
    const rate = isForeign ? (Number(forexRates[inputCurrency]) || 1) : 1;
    const isSaham = activeCategory === 'saham';
    const multiplier = (isSaham && !isForeign) ? 100 : 1; 

    const rawEstimasi = qtyNum * priceNum * multiplier;
    const estimasiIDR = rawEstimasi * rate;
    
    let isSellOverLimit = false;
    let ownedQty = 0;

    if (txType === 'SELL' && selectedSellSymbol) {
        const asset = aggregatedPortfolio.find((p: any) => p.symbol === selectedSellSymbol);
        if (asset) {
            ownedQty = asset.quantity;
            if (qtyNum > ownedQty) isSellOverLimit = true;
        }
    }

    const isFormValid = txType === 'BUY' ? (inputName && inputQty && inputPrice) : (selectedSellSymbol && inputQty && inputPrice);

    return (
      <div className="space-y-4">
        {/* Switcher Beli vs Jual */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border-2 border-slate-200">
          <button 
            type="button"
            onClick={() => { setTxType('BUY'); resetForm(); }} 
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                txType === 'BUY' ? 'bg-sky-500 text-white shadow-[2px_2px_0px_0px] shadow-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            BELI ASET
          </button>
          <button 
            type="button"
            onClick={() => { setTxType('SELL'); resetForm(); }} 
            className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                txType === 'SELL' ? 'bg-rose-500 text-white shadow-[2px_2px_0px_0px] shadow-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            JUAL ASET
          </button>
        </div>

        {/* Input Aset */}
        <div className="space-y-1.5">
           <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
               {txType === 'BUY' ? 'Kode / Nama Aset' : 'Pilih Aset Portofolio'}
           </label>
           {txType === 'BUY' ? (
              <div className="flex gap-2">
                  <select 
                    value={inputCurrency} 
                    onChange={e => setInputCurrency(e.target.value)} 
                    className="w-24 px-3 h-13 font-black bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-sky-500 text-xs text-slate-800 cursor-pointer"
                  >
                      <option value="IDR">IDR</option>
                      {availableCurrencies.filter(c => c !== "IDR").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input 
                    value={inputName} 
                    onChange={e => setInputName(e.target.value.toUpperCase())} 
                    placeholder={isSaham ? "Cth: BBCA / AAPL" : "Kode Aset"} 
                    className="uppercase font-black text-xs h-13 px-4 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:bg-white focus:border-sky-500 flex-1 outline-none text-slate-800"
                  />
              </div>
           ) : (
              <select 
                  value={selectedSellSymbol}
                  className="w-full h-13 px-4 border-2 border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:border-sky-500 uppercase font-black text-xs text-slate-800 outline-none transition-all cursor-pointer" 
                  onChange={e => {
                      const val = e.target.value;
                      setSelectedSellSymbol(val);
                      const p = aggregatedPortfolio.find((x: any) => x.symbol === val);
                      if (p) {
                          const symRaw = p.symbol || "";
                          const parts = symRaw.split('|');
                          setInputCurrency(parts[1] || 'IDR');
                          setInputName(parts[0] || "");
                      } else {
                          setInputCurrency('IDR');
                          setInputName("");
                      }
                  }}
              >
                 <option value="">-- PILIH ASET DI PORTOFOLIO --</option>
                 {filteredItems.map((p: any) => {
                     const symRaw = p.symbol || "";
                     const parts = symRaw.split('|');
                     const sym = parts[0] || "";
                     const c = parts[1] || "IDR";
                     const keyId = p.id || p.symbol;
                     return <option key={keyId} value={symRaw}>{sym} {c !== 'IDR' ? `(${c})` : ''} - Sisa {p.quantity} Unit</option>
                 })}
              </select>
           )}
        </div>

        {/* Input Jumlah & Harga */}
        <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    Jumlah ({isSaham && inputCurrency === 'IDR' ? 'Lot' : 'Unit'})
                </label>
                <input 
                    type="text" 
                    inputMode="decimal" 
                    value={inputQty} 
                    onChange={e => setInputQty(formatNum(e.target.value))} 
                    placeholder="0" 
                    className={`h-13 px-4 rounded-2xl bg-slate-50 border-2 font-black text-sm text-slate-900 focus:bg-white transition-all outline-none w-full ${
                        isSellOverLimit ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 focus:border-sky-500"
                    }`}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    Harga ({inputCurrency})
                </label>
                <input 
                    type="text" 
                    inputMode="decimal" 
                    value={inputPrice} 
                    onChange={e => setInputPrice(formatNum(e.target.value))} 
                    placeholder="0" 
                    className="h-13 px-4 rounded-2xl bg-slate-50 border-2 border-slate-200 font-black text-sm text-slate-900 focus:bg-white focus:border-sky-500 transition-all outline-none w-full" 
                />
            </div>
        </div>

        {isSaham && !isForeign && (
            <div className="flex items-center gap-2 text-[11px] text-sky-800 bg-sky-50 border border-sky-200 p-2.5 rounded-xl font-bold">
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Harga per lembar saham. Total otomatis dikalikan 100 (1 Lot = 100 Lembar).</span>
            </div>
        )}
        
        {isForeign && (
            <div className="flex items-center gap-2 text-[11px] text-blue-800 bg-blue-50 border border-blue-200 p-2.5 rounded-xl font-bold">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Akan {txType === 'BUY' ? 'memotong' : 'menambah'} Dompet Valas ({inputCurrency}).</span>
            </div>
        )}

        {/* Box Estimasi IDR / Valas */}
        <div className={`p-4 rounded-2xl border-2 flex flex-col transition-colors ${
            txType === 'BUY' ? 'bg-sky-50 border-sky-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
           <div className="flex justify-between items-center">
               <span className={`text-[10px] font-black uppercase tracking-wider ${txType === 'BUY' ? 'text-sky-800' : 'text-emerald-800'}`}>
                   Estimasi {isForeign ? inputCurrency : 'IDR'} {txType === 'BUY' ? 'Keluar' : 'Masuk'}
               </span>
               <span className={`font-black text-lg tabular-nums ${txType === 'BUY' ? 'text-sky-900' : 'text-emerald-900'}`}>
                  {isForeign ? `${inputCurrency} ${Number(rawEstimasi).toLocaleString('en-US')}` : formatRp(Number(rawEstimasi))}
               </span>
           </div>
           {isForeign && (
               <div className={`flex justify-between items-center mt-1.5 pt-1.5 border-t ${txType === 'BUY' ? 'border-sky-200/60' : 'border-emerald-200/60'}`}>
                   <span className="text-[10px] font-bold text-slate-500">Estimasi Nilai IDR (Kurs Live)</span>
                   <span className="text-[10px] font-black text-slate-700">≈ {formatRp(Number(estimasiIDR))}</span>
               </div>
           )}
        </div>

        <button 
            type="button"
            onClick={handleTransactionInit} 
            disabled={!isFormValid || isSellOverLimit || isSubmitting}
            className={`w-full h-14 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                txType === 'BUY' ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`} 
        >
           {isSubmitting && <Loader2 className="w-5 h-5 animate-spin"/>}
           {isSellOverLimit ? "STOK TIDAK CUKUP" : (isSubmitting ? "MEMPROSES TRANSAKSI..." : `KONFIRMASI ${txType === 'BUY' ? 'BELI' : 'JUAL'} ASET`)}
        </button>
      </div>
    );
  };

  if (isUserLoading || isInvLoading || isRatesLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <img src="/BILANO-ICON-NEW.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-sky-700 font-black text-sm bg-sky-50 border border-sky-200 px-5 py-2.5 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                  <span>Memuat Portofolio Investasi...</span>
              </div>
          </div>
      );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA BIRU MUDA (SKY BLUE #0EA5E9) & NAVY */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD] flex flex-col relative z-10 border-b-2 border-sky-400">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(14,165,233,0.08)] flex items-center justify-between relative z-30 border-b border-sky-100">
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={() => {
                            if (viewState === 'detail') {
                                setViewState('main');
                                setDetailTab('transaksi');
                            } else {
                                setLocation('/');
                            }
                        }}
                        className="w-10 h-10 rounded-full bg-brand-navy hover:bg-[#152e55] text-sky-300 shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                        title="Kembali"
                    >
                        <ArrowLeft className="w-5 h-5 text-sky-300" strokeWidth={2.5} />
                    </button>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                            <p className="text-[10px] font-black text-sky-900 uppercase tracking-widest">
                                Aset & Pasar Modal
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                            {viewState === 'detail' && activeCategory ? `Portofolio ${assetConfig[activeCategory].label}` : "Investasi & Portofolio"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => { refetchRates(); toast({ title: "Kurs Diperbarui! 🔄", description: "Nilai valas portofolio disinkronkan ke pasar live." }); }}
                        className="flex items-center gap-1 bg-white border-2 border-sky-300 text-brand-navy px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 text-[10px] font-black active:scale-95 transition-all cursor-pointer"
                    >
                        <RefreshCcw className="w-3.5 h-3.5 text-sky-600" />
                        <span>LIVE KURS</span>
                    </button>
                </div>
            </div>

            {/* 2. HERO CARD INVESTASI (BIRU MUDA / SKY BLUE DENGAN LIST SOLID NAVY) */}
            <div className="bg-gradient-to-br from-[#1D3E72] via-[#0C4A6E] to-[#0369A1] text-white p-5 rounded-[28px] border-l-[6px] border-l-sky-400 shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <TrendingUp className="absolute -right-4 -bottom-4 w-36 h-36 text-sky-300/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-sky-400/20 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <span className="bg-sky-400 text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-brand-navy fill-current" />
                            {viewState === 'detail' && activeCategory ? `KATEGORI ${assetConfig[activeCategory].label.toUpperCase()}` : "TOTAL NILAI PORTOFOLIO"}
                        </span>

                        <span className="text-[10px] text-sky-200 font-bold bg-black/30 px-2.5 py-0.5 rounded-full border border-sky-300/20">
                            Realtime Asset
                        </span>
                    </div>

                    <p className="text-[10px] font-bold text-sky-200 uppercase tracking-widest mt-1">
                        {viewState === 'detail' ? `Estimasi Nilai ${activeCategory}` : "Total Akumulasi Semua Aset"}
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3 leading-tight tabular-nums">
                        {viewState === 'detail' ? displayCategoryValue : displayTotalPortfolio}
                    </h2>

                    <div className="flex items-center justify-between pt-2.5 border-t border-white/15 text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 text-sky-100">
                            <Wallet className="w-3.5 h-3.5 text-sky-300" /> Dana Kas Tersedia (FCF):
                        </span>
                        <span className="bg-sky-400/20 border border-sky-300/40 text-sky-100 px-2.5 py-0.5 rounded-lg font-black tabular-nums">
                            {formatRp(fcf)}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT SECTION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-4 pb-24 bg-slate-50 flex flex-col gap-4">
            
            {viewState === 'main' ? (
                <div className="space-y-4 animate-in fade-in">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <PieChart className="w-4 h-4 text-sky-600" />
                            Pilih Kategori Portofolio
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">8 Kelas Aset</span>
                    </div>

                    {/* 8 GRID KELAS ASET DENGAN SHADOW SOLID NEO-BRUTALIST */}
                    <div className="grid grid-cols-2 gap-3">
                        {(Object.keys(assetConfig) as AssetType[]).map((key) => {
                            const cfg = assetConfig[key];
                            
                            // Hitung valuasi kategori ini
                            const catItems = aggregatedPortfolio.filter((p: any) => {
                                if (p.type) return p.type.toLowerCase() === key.toLowerCase();
                                const parts = (p.symbol||"").split('|');
                                const sym = parts[0] || "";
                                const isLegacyStock = sym.length === 4 && !sym.includes(" ");
                                if (key === 'saham') return isLegacyStock;
                                return !isLegacyStock;
                            });
                            const catVal = catItems.reduce((acc: number, p: any) => acc + calculateLiveValue(p), 0);

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => { 
                                        setActiveCategory(key); 
                                        setViewState('detail'); 
                                        setDetailTab('transaksi'); 
                                    }}
                                    className="bg-white rounded-[24px] p-4 border-2 border-sky-100 hover:border-sky-300 shadow-[4px_4px_0px_0px] shadow-slate-900/70 hover:shadow-[5px_5px_0px_0px] hover:shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex flex-col items-center text-center gap-2.5 cursor-pointer group relative overflow-hidden"
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm border ${cfg.bg}`}>
                                        <img src={cfg.imgUrl} className="w-7 h-7 object-contain drop-shadow-sm" alt={cfg.label} />
                                    </div>
                                    <div className="w-full">
                                        <h4 className="font-black text-slate-900 text-xs sm:text-sm">{cfg.label}</h4>
                                        <p className="text-[10px] font-bold text-sky-700 bg-sky-50 py-0.5 px-2 rounded-md border border-sky-200/80 inline-block mt-1 tabular-nums">
                                            {catVal > 0 ? formatRp(catVal) : "0 Aset"}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                    
                    {/* Switcher Transaksi vs Analisa Aset */}
                    <div className="flex bg-white p-1 rounded-2xl border-2 border-sky-200 shadow-[3px_3px_0px_0px] shadow-slate-900">
                        <button
                            type="button"
                            onClick={() => setDetailTab('transaksi')}
                            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                detailTab === 'transaksi' 
                                    ? 'bg-sky-500 text-white shadow-[2px_2px_0px_0px] shadow-slate-900' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <PlusCircle className="w-4 h-4"/> CATAT TRANSAKSI
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (isUserPro && activeCategory) {
                                    setProFeatureModal({ 
                                        title: `Smart Screener ${assetConfig[activeCategory].label}`, 
                                        desc: "Fitur screening cerdas dan analisa tren harga menggunakan AI." 
                                    });
                                } else {
                                    setDetailTab('analisa');
                                }
                            }}
                            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                detailTab === 'analisa' 
                                    ? 'bg-brand-navy text-sky-300 shadow-[2px_2px_0px_0px] shadow-slate-900' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Sparkles className="w-4 h-4 text-sky-400"/> ANALISA AI
                        </button>
                    </div>

                    {/* TAB TRANSAKSI */}
                    {detailTab === 'transaksi' && (
                        <div className="bg-white rounded-[28px] shadow-[6px_6px_0px_0px] shadow-slate-900 border-2 border-sky-200 p-5 space-y-4">
                            {renderDynamicForm()}
                        </div>
                    )}

                    {/* TAB ANALISA ASET / SMART SCREENER */}
                    {detailTab === 'analisa' && activeCategory && (
                        <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] rounded-[28px] p-6 shadow-[6px_6px_0px_0px] shadow-slate-900 border-l-[6px] border-l-sky-400 text-center relative overflow-hidden space-y-4">
                            <div className="w-16 h-16 bg-sky-400 text-brand-navy rounded-2xl flex items-center justify-center mx-auto shadow-lg border-2 border-white/20">
                                <Sparkles className="w-8 h-8 fill-current" />
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-white mb-1">
                                    Smart Screener {assetConfig[activeCategory].label} 🚀
                                </h3>
                                <p className="text-xs text-sky-100/80 font-bold leading-relaxed">
                                    Fitur screening cerdas dan kalkulasi tren harga menggunakan AI khusus untuk aset <b>{assetConfig[activeCategory].label}</b> Anda sedang dalam perakitan akhir kami!
                                </p>
                            </div>

                            <div className="bg-sky-950/80 border border-sky-400/40 rounded-2xl p-4 text-left space-y-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-sky-300 shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-200">GARANSI HARGA PRO</span>
                                </div>
                                <p className="text-[11px] leading-relaxed font-bold text-sky-100">
                                    Dapatkan akses instan ke seluruh fitur VIP AI tanpa kenaikan harga di masa depan dengan mengunci paket tahunan Anda hari ini.
                                </p>
                            </div>

                            <button 
                                type="button"
                                onClick={() => setLocation('/paywall')} 
                                className="w-full h-13 bg-sky-400 hover:bg-sky-300 text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Lock className="w-4 h-4"/> AMANKAN PAKET SAYA SEKARANG
                            </button>
                        </div>
                    )}

                    {/* DAFTAR ASET TERDAFTAR DI PORTOFOLIO */}
                    <div className="space-y-3 pt-2">
                        <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider px-1 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-sky-600" />
                            Daftar Kepemilikan Aset {activeCategory ? assetConfig[activeCategory].label : ''}
                        </h3>

                        {filteredItems.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-[24px] border-2 border-dashed border-sky-200 shadow-sm p-5">
                                <p className="text-slate-400 text-xs font-bold">Belum ada catatan kepemilikan aset {activeCategory}.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredItems.map((p: any) => {
                                    const parts = (p.symbol||"").split('|');
                                    const displaySymbol = parts[0] || "";
                                    const curr = parts[1];
                                    const actualCurr = curr || 'IDR';
                                    const liveVal = calculateLiveValue(p);
                                    const isForeign = actualCurr !== 'IDR';
                                    const keyId = p.id || p.symbol;
                                    
                                    return (
                                        <div 
                                            key={keyId} 
                                            className="bg-white p-4 rounded-[22px] border-2 border-sky-100 flex justify-between items-center shadow-[3px_3px_0px_0px] shadow-slate-900/50 hover:border-sky-300 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center font-black text-xs text-sky-800 shrink-0">
                                                    {displaySymbol.substring(0, 3)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h4 className="font-black text-slate-900 text-sm">{displaySymbol}</h4>
                                                        {isForeign && (
                                                            <span className="text-[9px] bg-sky-100 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded font-black">
                                                                {actualCurr}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 font-bold">
                                                        {p.quantity} Unit <span className="mx-1 text-slate-300">•</span> Avg: {isForeign ? actualCurr : 'Rp'} {(p.avgPrice || 0).toLocaleString('id-ID')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-900 text-sm tabular-nums">{formatRp(liveVal)}</p>
                                                <p className="text-[9px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                                    Estimasi Live
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            )}

        </div>

        {/* PRO FEATURE MODAL */}
        {proFeatureModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 text-center overflow-hidden border border-sky-500/30">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <button 
                        type="button"
                        onClick={() => setProFeatureModal(null)} 
                        className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-rose-500 text-white rounded-full transition-colors z-10 cursor-pointer"
                    >
                        <X className="w-5 h-5"/>
                    </button>
                    
                    <div className="w-16 h-16 bg-sky-400 text-brand-navy rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-white/20">
                        <Crown className="w-8 h-8 fill-current" />
                    </div>
                    
                    <h2 className="text-xl font-black text-white mb-1 tracking-tight">Akses VIP Terjamin! 👑</h2>
                    <p className="text-xs text-sky-200 mb-6 leading-relaxed px-2 font-medium">
                        Fitur <strong className="text-sky-300">{proFeatureModal.title}</strong> saat ini sedang dalam tahap akhir pengembangan oleh tim kami. <br/><br/>
                        Sebagai pengguna <strong>PRO</strong>, Anda otomatis dapat menikmati fitur ini segera saat dirilis tanpa biaya tambahan!
                    </p>
                    
                    <button 
                        type="button"
                        onClick={() => setProFeatureModal(null)} 
                        className="w-full h-12 bg-white hover:bg-slate-100 text-brand-navy rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 relative z-10 cursor-pointer"
                    >
                        <CheckCircle2 className="w-4 h-4"/> SAYA MENGERTI
                    </button>
                </div>
            </div>
        )}

        {/* SETUP SALDO PROMPT */}
        {showSetupPrompt && (
            <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-[28px] p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 border-2 border-sky-300">
                    <div className="w-16 h-16 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 mb-1">Aksi Tertahan</h2>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed font-semibold">
                        Untuk memastikan laporan portofolio akurat, selesaikan Setup Saldo Awal sebelum mencatat transaksi.
                    </p>
                    <div className="space-y-2">
                        <Link href="/target">
                            <button className="w-full h-12 bg-brand-navy text-sky-300 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[3px_3px_0px_0px] shadow-slate-900 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer">
                                LAKUKAN SETUP SEKARANG
                            </button>
                        </Link>
                        <button 
                            type="button"
                            onClick={() => setShowSetupPrompt(false)} 
                            className="w-full h-10 font-bold text-xs text-slate-400 hover:text-slate-600"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* SOURCE SELECTION POPUP */}
        {showSourcePopup && (
            <SourceSelectionPopup 
                type={txType === 'BUY' ? 'expense' : 'income'}
                title={txType === 'BUY' ? 'Pilih RDN / Sumber Pembelian' : 'Pilih RDN / Tujuan Penjualan'}
                description={txType === 'BUY' ? 'Pilih dompet yang akan digunakan (saldo dipotong).' : 'Pilih dompet untuk menampung hasil jual (saldo ditambah).'}
                onCancel={() => setShowSourcePopup(false)}
                onSelect={(src) => {
                    setShowSourcePopup(false);
                    handleTransaction(src);
                }}
            />
        )}

      </div>
    </MobileLayout>
  );
}