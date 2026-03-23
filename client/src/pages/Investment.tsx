import { useState } from "react";
import { ArrowLeft, PlusCircle, X, Loader2, Info, Sparkles, AlertTriangle, Lock } from "lucide-react"; 
import { TrendingUp, Building2, LineChart, Briefcase, Gem, Landmark, ScrollText, Coins } from "lucide-react";
import { Button, Input } from "@/components/UIComponents";
import { MobileLayout } from "@/components/Layout";
import { useUser, useInvestments } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

type AssetType = 'saham' | 'crypto' | 'reksadana' | 'obligasi' | 'p2p' | 'emas' | 'properti' | 'koleksi';

export default function Investment() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [viewState, setViewState] = useState<'main' | 'detail'>('main');
  const [activeCategory, setActiveCategory] = useState<AssetType | null>(null);
  
  // 🚀 FIX: SISTEM TAB PER GANTI HALAMAN DETAIL (TRANSAKSI VS ANALISA)
  const [detailTab, setDetailTab] = useState<'transaksi' | 'analisa'>('transaksi');
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: portfolioRaw = [], isLoading: isInvLoading } = useInvestments();

  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const isUserPro = user?.isPro || user?.plan === 'pro' || localStorage.getItem("bilano_pro") === "true";

  const formatNum = (val: string) => {
      if (!val) return "";
      let raw = val.replace(/\./g, "").replace(/[^0-9,]/g, "");
      const parts = raw.split(",");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return parts.slice(0, 2).join(",");
  };
  const parseNum = (val: string) => parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) || 0;

  const { data: forexRates = {}, isLoading: isRatesLoading } = useQuery({
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

  const formatRp = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

  const assetConfig: Record<AssetType, { label: string, unit: string, icon: any, color: string, bg: string, headerBg: string }> = {
      saham: { label: 'Saham', unit: 'Lot/Lembar', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100', headerBg: 'bg-emerald-500' },
      crypto: { label: 'Crypto', unit: 'Koin', icon: Coins, color: 'text-orange-500', bg: 'bg-orange-100', headerBg: 'bg-orange-500' },
      reksadana: { label: 'Reksadana', unit: 'Unit', icon: LineChart, color: 'text-blue-500', bg: 'bg-blue-100', headerBg: 'bg-blue-500' },
      obligasi: { label: 'Obligasi', unit: 'Lembar', icon: ScrollText, color: 'text-indigo-500', bg: 'bg-indigo-100', headerBg: 'bg-indigo-500' },
      p2p: { label: 'P2P Lending', unit: 'Akun / Lot', icon: Landmark, color: 'text-purple-500', bg: 'bg-purple-100', headerBg: 'bg-purple-500' },
      emas: { label: 'Emas & Logam', unit: 'Gram', icon: Gem, color: 'text-yellow-600', bg: 'bg-yellow-100', headerBg: 'bg-yellow-500' },
      properti: { label: 'Properti', unit: 'Unit Properti', icon: Building2, color: 'text-cyan-600', bg: 'bg-cyan-100', headerBg: 'bg-cyan-500' },
      koleksi: { label: 'Koleksi', unit: 'Item', icon: Briefcase, color: 'text-rose-600', bg: 'bg-rose-100', headerBg: 'bg-rose-500' },
  };

  const aggregatedPortfolio = Object.values(portfolioRaw.reduce((acc, p: any) => {
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
      return aggregatedPortfolio.filter(p => {
          if (p.type) return p.type.toLowerCase() === activeCategory.toLowerCase();
          const [sym] = (p.symbol||"").split('|');
          const isLegacyStock = sym.length === 4 && !sym.includes(" ");
          if (activeCategory === 'saham') return isLegacyStock;
          if (isLegacyStock) return false; 
          return true; 
      });
  };

  const filteredItems = getFilteredPortfolio();

  const calculateLiveValue = (p: any) => {
      const [sym, curr] = (p.symbol||"").split('|');
      const actualCurr = curr || 'IDR';
      const rate = actualCurr === 'IDR' ? 1 : (forexRates[actualCurr] || 1);
      const isStock = p.type?.toLowerCase() === 'saham' || (!p.type && sym.length === 4);
      const multiplier = (isStock && actualCurr === 'IDR') ? 100 : 1; 
      return p.quantity * (p.avgPrice || 0) * multiplier * rate;
  };

  const totalPortfolioValue = aggregatedPortfolio.reduce((acc, p) => acc + calculateLiveValue(p), 0);
  const categoryValue = filteredItems.reduce((acc, p) => acc + calculateLiveValue(p), 0);

  const displayTotalPortfolio = formatRp(totalPortfolioValue);
  const displayCategoryValue = formatRp(categoryValue);
  const getBalanceTextSize = (text: string, defaultSize: string) => {
      if (text.length >= 20) return "text-2xl"; 
      if (text.length >= 15) return "text-3xl"; 
      return defaultSize; 
  };

  const handleTransaction = async () => {
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
           type: activeCategory || 'saham' 
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
        
        toast({ title: "Berhasil!", description: `Transaksi ${txType === 'BUY' ? 'Beli' : 'Jual'} aset berhasil dicatat.` });
        resetForm();
        window.location.reload(); 

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
    const qtyNum = parseNum(inputQty);
    const priceNum = parseNum(inputPrice);
    
    const rate = inputCurrency === 'IDR' ? 1 : (forexRates[inputCurrency] || 1);
    const isSaham = activeCategory === 'saham';
    const multiplier = (isSaham && inputCurrency === 'IDR') ? 100 : 1; 
    const estimasiIDR = qtyNum * priceNum * multiplier * rate;

    let isSellOverLimit = false;
    let ownedQty = 0;

    if (txType === 'SELL' && selectedSellSymbol) {
        const asset = aggregatedPortfolio.find(p => p.symbol === selectedSellSymbol);
        if (asset) {
            ownedQty = asset.quantity;
            if (qtyNum > ownedQty) isSellOverLimit = true;
        }
    }

    const isFormValid = txType === 'BUY' ? (inputName && inputQty && inputPrice) : (selectedSellSymbol && inputQty && inputPrice);

    return (
      <div className="space-y-5">
        <div className="flex bg-slate-100 p-1.5 rounded-[20px]">
          <button onClick={() => {setTxType('BUY'); resetForm();}} className={`flex-1 py-3 rounded-[16px] font-bold text-sm transition-all ${txType==='BUY'?'bg-emerald-500 text-white shadow-md':'text-slate-500 hover:text-slate-700'}`}>BELI ASET</button>
          <button onClick={() => {setTxType('SELL'); resetForm();}} className={`flex-1 py-3 rounded-[16px] font-bold text-sm transition-all ${txType==='SELL'?'bg-rose-500 text-white shadow-md':'text-slate-500 hover:text-slate-700'}`}>JUAL ASET</button>
        </div>

        <div className="space-y-2">
           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Aset yang dituju</label>
           {txType === 'BUY' ? (
              <div className="flex gap-2">
                  <select value={inputCurrency} onChange={e => setInputCurrency(e.target.value)} className="w-24 p-3 font-bold bg-slate-50 border-transparent rounded-[20px] outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                      <option value="IDR">IDR</option>
                      {availableCurrencies.filter(c => c !== "IDR").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Input 
                    value={inputName} 
                    onChange={e => setInputName(e.target.value.toUpperCase())} 
                    placeholder={isSaham ? "Cth: BBCA / AAPL" : "Kode Aset"} 
                    className="uppercase font-bold h-14 rounded-[20px] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 flex-1"
                  />
              </div>
           ) : (
              <select className="w-full h-14 px-4 border-transparent rounded-[20px] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 uppercase font-bold text-slate-700 outline-none transition-all" onChange={e => {
                  setSelectedSellSymbol(e.target.value);
                  const p = aggregatedPortfolio.find(x => x.symbol === e.target.value);
                  if (p) {
                      const [, c] = p.symbol.split('|');
                      setInputCurrency(c || 'IDR');
                      setInputName(p.symbol.split('|')[0]);
                  }
              }}>
                 <option value="">-- PILIH ASET DI PORTFOLIO --</option>
                 {filteredItems.map(p => {
                     const [sym, c] = p.symbol.split('|');
                     return <option key={p.id} value={p.symbol}>{sym} {c && c!=='IDR' ? `(${c})` : ''} - Sisa {p.quantity}</option>
                 })}
              </select>
           )}
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Jumlah</label>
                <Input 
                    type="text" inputMode="decimal" value={inputQty} onChange={e => setInputQty(formatNum(e.target.value))} placeholder="0" 
                    className={`h-14 rounded-[20px] bg-slate-50 border-transparent font-bold text-lg focus:bg-white transition-all ${isSellOverLimit ? "border-rose-500 focus:border-rose-500 bg-rose-50" : "focus:border-indigo-500"}`}
                />
            </div>
            <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Harga Beli {inputCurrency}</label>
                <Input type="text" inputMode="decimal" value={inputPrice} onChange={e => setInputPrice(formatNum(e.target.value))} placeholder="0" className="h-14 rounded-[20px] bg-slate-50 border-transparent font-bold text-lg focus:bg-white focus:border-indigo-500 transition-all" />
            </div>
        </div>

        {isSaham && inputCurrency === 'IDR' && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-600 bg-emerald-50 p-2 rounded-xl mt-[-10px] px-3 font-medium">
                <Info className="w-3.5 h-3.5" /> Harga per lembar, total otomatis dikali 100 (1 Lot).
            </div>
        )}

        <div className={`p-4 rounded-[24px] flex justify-between items-center mt-2 transition-colors ${txType==='BUY'?'bg-rose-50':'bg-emerald-50'}`}>
           <span className={`text-xs font-bold ${txType==='BUY'?'text-rose-500':'text-emerald-600'}`}>Estimasi Rp Keluar</span>
           <span className={`font-extrabold text-xl ${txType==='BUY'?'text-rose-600':'text-emerald-700'}`}>
              {formatRp(estimasiIDR)}
           </span>
        </div>

        <Button 
            className={`w-full h-14 font-extrabold text-lg shadow-lg rounded-full mt-4 transition-transform active:scale-95 flex items-center justify-center gap-2 ${txType==='BUY'?'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200':'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`} 
            onClick={handleTransaction} 
            disabled={!isFormValid || isSellOverLimit || isSubmitting}
        >
           {isSubmitting && <Loader2 className="w-6 h-6 animate-spin"/>}
           {isSellOverLimit ? "STOK TIDAK CUKUP" : (isSubmitting ? "MEMPROSES..." : `KONFIRMASI ${txType}`)}
        </Button>
      </div>
    )
  };

  if (isUserLoading || isInvLoading || isRatesLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500"/>
          </div>
      );
  }

  return (
    <MobileLayout title="Investasi & Portfolio" showBack={true}>
       
       {viewState !== 'main' && (
          <Button variant="ghost" size="sm" onClick={() => { setViewState('main'); setDetailTab('transaksi'); }} className="mb-4 pl-0 hover:bg-transparent text-slate-500">
             <ArrowLeft className="w-5 h-5 mr-2"/> Kembali ke Semua Aset
          </Button>
       )}

       {viewState === 'main' ? (
          <div className="space-y-6 mt-2 animate-in fade-in duration-500 px-1">
             <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-6 rounded-[32px] shadow-xl shadow-indigo-200 relative overflow-hidden group">
                <div className="relative z-10">
                    <p className="text-[11px] font-bold text-indigo-200 mb-1 uppercase tracking-widest">Total Semua Aset</p>
                    
                    <h2 className={`${getBalanceTextSize(displayTotalPortfolio, "text-4xl")} font-extrabold tracking-tight mb-4 whitespace-nowrap transition-all duration-300`}>
                        {displayTotalPortfolio}
                    </h2>
                    
                    <p className="text-[10px] opacity-80 mt-[-10px] mb-4">*Fluktuasi mengikuti kurs mata uang</p>
                    <div className="inline-flex items-center gap-2 text-xs font-bold bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                       <span>Dana Tunai:</span>
                       <span className="text-white">{formatRp(fcf)}</span>
                    </div>
                </div>
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute left-0 bottom-0 w-32 h-32 bg-purple-400/20 rounded-tr-full blur-xl pointer-events-none"></div>
             </div>

             <div className="grid grid-cols-2 gap-4 pb-20">
                {(Object.keys(assetConfig) as AssetType[]).map((key) => {
                    const cfg = assetConfig[key];
                    return (
                        <div 
                            key={key} 
                            onClick={() => { setActiveCategory(key); setViewState('detail'); setDetailTab('transaksi'); }} 
                            className="bg-white rounded-[24px] p-5 cursor-pointer shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col items-center gap-3 text-center hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] active:scale-95 transition-all"
                        >
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
                                  <cfg.icon className="w-6 h-6"/>
                              </div>
                              <div>
                                  <h3 className="font-extrabold text-slate-800 text-sm">{cfg.label}</h3>
                                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Kelola Portfolio</p>
                              </div>
                        </div>
                    );
                })}
             </div>
          </div>

       ) : (
          <div className="animate-in slide-in-from-right duration-300 px-1">
             <div className={`mb-6 rounded-[32px] p-6 shadow-lg text-white relative overflow-hidden ${activeCategory ? assetConfig[activeCategory].headerBg : 'bg-slate-800'}`}>
                   <div className="relative z-10">
                       <div className="flex items-center gap-2 mb-2 text-white/80">
                           {activeCategory && (() => {
                               const Icon = assetConfig[activeCategory].icon;
                               return <Icon className="w-5 h-5"/>
                           })()}
                           <span className="text-[11px] uppercase font-bold tracking-widest">Portfolio {activeCategory}</span>
                       </div>
                       
                       <h2 className={`${getBalanceTextSize(displayCategoryValue, "text-3xl")} font-extrabold tracking-tight whitespace-nowrap transition-all duration-300`}>
                           {displayCategoryValue}
                       </h2>
                       
                   </div>
                   <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-tl-full pointer-events-none"></div>
             </div>

             {/* 🚀 FIX: SISTEM TAB TRANSAKSI vs ANALISA ASET (SEPERTI PEMASUKAN/PENGELUARAN) */}
             <div className="flex bg-slate-100 p-1.5 rounded-[20px] mb-6">
                <button
                    onClick={() => setDetailTab('transaksi')}
                    className={`flex-1 py-3 rounded-[16px] font-bold text-sm transition-all flex items-center justify-center gap-2 ${detailTab === 'transaksi' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <PlusCircle className="w-4 h-4"/> TRANSAKSI
                </button>
                <button
                    onClick={() => {
                        if (isUserPro) {
                            toast({ title: "Akses VIP Terjamin! 👑", description: "Karena Anda member PRO, fitur analisis AI ini akan otomatis terbuka GRATIS saat rilis nanti!" });
                        } else {
                            setDetailTab('analisa');
                        }
                    }}
                    className={`flex-1 py-3 rounded-[16px] font-bold text-sm transition-all flex items-center justify-center gap-2 ${detailTab === 'analisa' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Sparkles className="w-4 h-4"/> ANALISA ASET
                </button>
            </div>

            {/* 🚀 KONTEN FORM TRANSAKSI (UTAMA) */}
            {detailTab === 'transaksi' && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="bg-white rounded-[32px] shadow-xl shadow-indigo-100/50 border border-slate-100 p-5 mb-6">
                        {renderDynamicForm()}
                    </div>
                </div>
            )}

            {/* 🚀 KONTEN ANALISA ASET (FOMO SLIDE) */}
            {detailTab === 'analisa' && activeCategory && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 mb-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-6 shadow-2xl relative overflow-hidden border-2 border-amber-300/30 text-center">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(251,191,36,0.4)] relative z-10 animate-bounce">
                            <Sparkles className="w-10 h-10 text-amber-950"/>
                        </div>

                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight relative z-10">Smart Screener {assetConfig[activeCategory].label} 🚀</h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed font-medium relative z-10 px-1">
                            Fitur screening cerdas dan analisa tren harga menggunakan AI khusus untuk aset <b>{assetConfig[activeCategory].label}</b> Anda sedang dalam perakitan akhir kami!
                        </p>
                        
                        <div className="bg-amber-100 border border-amber-300 rounded-[20px] p-4 mb-6 text-left relative z-10 shadow-inner">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600"/>
                                <span className="text-xs font-black uppercase tracking-widest text-amber-950">PERHATIAN PENTING</span>
                            </div>
                            <p className="text-[12px] leading-relaxed font-bold text-amber-900">
                                Begitu fitur eksklusif ini diluncurkan nanti, harga langganan pengguna baru BILANO PRO <b className="text-rose-600">PASTI NAIK.</b><br/><br/>
                                Amankan harga Anda di <b className="text-emerald-700">Rp 99.000/tahun HARI INI</b>, dan Anda akan mendapatkan fitur ini secara <b>GRATIS SEUMUR HIDUP</b> saat rilis nanti!
                            </p>
                        </div>

                        <Button 
                            onClick={() => setLocation('/paywall')} 
                            className="w-full h-14 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-950 rounded-full font-black text-sm shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 relative z-10"
                        >
                            <Lock className="w-4 h-4"/> AMANKAN HARGA SAYA ➔
                        </Button>
                    </div>
                </div>
            )}

             <div className="space-y-4 pb-20">
                <h3 className="font-bold text-slate-800 text-sm ml-2">Daftar Aset</h3>
                {filteredItems.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-slate-200 shadow-sm">
                        <p className="text-slate-400 text-sm font-medium">Belum ada investasi {activeCategory}.</p>
                    </div>
                )}
                
                {filteredItems.map((p) => {
                   const [displaySymbol, curr] = p.symbol.split('|');
                   const actualCurr = curr || 'IDR';
                   const liveVal = calculateLiveValue(p);
                   const isForeign = actualCurr !== 'IDR';
                   
                   return (
                     <div key={p.id} className="bg-white p-5 rounded-[24px] border border-slate-100 flex justify-between items-center shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-sm ${activeCategory ? assetConfig[activeCategory].bg : 'bg-slate-100'} ${activeCategory ? assetConfig[activeCategory].color : 'text-slate-600'}`}>
                              {displaySymbol.substring(0,2)}
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className="font-extrabold text-slate-800 text-base">{displaySymbol}</h4>
                                  {isForeign && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">{actualCurr}</span>}
                              </div>
                              <p className="text-xs text-slate-500 font-medium">
                                 {p.quantity} Unit <span className="mx-1 text-slate-300">•</span> Avg: {isForeign ? actualCurr : 'Rp'} {(p.avgPrice || 0).toLocaleString('id-ID')}
                              </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="font-extrabold text-slate-800 text-sm">{formatRp(liveVal)}</p>
                           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Estimasi Live</p>
                        </div>
                     </div>
                   );
                })}
             </div>
          </div>
       )}
    </MobileLayout>
  );
}