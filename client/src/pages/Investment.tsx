import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { 
    TrendingUp, PieChart, PlusCircle, Layers,
    Clock, ArrowLeft, Loader2, CheckCircle2,
    Crown, Lock, ChevronRight, X, AlertCircle, RefreshCcw,
    ShieldAlert, Wallet, Info, ArrowUpRight, AlertTriangle,
    Gem, HandCoins, Building2, ShieldCheck, Store, Coins,
    Brain, LineChart, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useInvestments, useForexRates } from "@/hooks/use-finance";
import { useQueryClient } from "@tanstack/react-query";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { trackEvent } from "@/lib/tracking";

type AssetType = 'saham' | 'reksadana' | 'kripto' | 'emas' | 'p2p' | 'properti' | 'obligasi' | 'bisnis';

const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");

export default function Investment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: investments, isLoading: isInvLoading } = useInvestments();
  const { data: forexRates = {}, isLoading: isRatesLoading, refetch: refetchRates } = useForexRates();

  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(["IDR", "USD", "EUR", "SGD", "GBP", "JPY", "AUD", "MYR"]);

  useEffect(() => {
      if (forexRates && Object.keys(forexRates).length > 0) {
          setAvailableCurrencies(["IDR", ...Object.keys(forexRates).filter(c => c !== "IDR")]);
      }
  }, [forexRates]);

  const [viewState, setViewState] = useState<'main' | 'detail'>('main');
  const [activeCategory, setActiveCategory] = useState<AssetType | null>(null);
  const [detailTab, setDetailTab] = useState<'transaksi' | 'analisa'>('transaksi');

  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [inputName, setInputName] = useState("");
  const [inputCurrency, setInputCurrency] = useState("IDR");
  const [inputQty, setInputQty] = useState("");
  const [inputPrice, setInputPrice] = useState("");
  const [selectedSellSymbol, setSelectedSellSymbol] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [proFeatureModal, setProFeatureModal] = useState<{ title: string; desc: string } | null>(null);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [showSourcePopup, setShowSourcePopup] = useState(false);

  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const isUserPro = user?.isPro || (typeof window !== 'undefined' && localStorage.getItem("bilano_pro") === "true");

  const formatNum = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
        clean = clean.replace(/^0+/, ''); 
    }
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  const parseNum = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;

  const fcf = user?.cashBalance || 0;
  const portfolioRaw = investments || [];

  const assetConfig: Record<AssetType, { label: string; icon: any; bg: string; iconColor: string }> = {
      saham: {
          label: "Saham",
          icon: TrendingUp,
          bg: "bg-sky-50 border-sky-200",
          iconColor: "text-sky-600"
      },
      reksadana: {
          label: "Reksa Dana",
          icon: PieChart,
          bg: "bg-emerald-50 border-emerald-200",
          iconColor: "text-emerald-600"
      },
      kripto: {
          label: "Kripto",
          icon: Coins,
          bg: "bg-amber-50 border-amber-200",
          iconColor: "text-amber-600"
      },
      emas: {
          label: "Emas & Logam",
          icon: Gem,
          bg: "bg-yellow-50 border-yellow-200",
          iconColor: "text-yellow-600"
      },
      p2p: {
          label: "P2P Lending",
          icon: HandCoins,
          bg: "bg-indigo-50 border-indigo-200",
          iconColor: "text-indigo-600"
      },
      properti: {
          label: "Properti",
          icon: Building2,
          bg: "bg-orange-50 border-orange-200",
          iconColor: "text-orange-600"
      },
      obligasi: {
          label: "Surat Berharga / SBN",
          icon: ShieldCheck,
          bg: "bg-teal-50 border-teal-200",
          iconColor: "text-teal-600"
      },
      bisnis: {
          label: "Bisnis Riil / UMKM",
          icon: Store,
          bg: "bg-rose-50 border-rose-200",
          iconColor: "text-rose-600"
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

  const getConversionRate = (currency: string) => {
      if (currency === 'IDR') return 1;
      return forexRates[currency] || 1;
  };

  const calculateTotalCost = () => {
      const qty = parseNum(inputQty);
      const prc = parseNum(inputPrice);
      if (!qty || !prc) return 0;
      const isStock = activeCategory === 'saham';
      const multiplier = isStock ? 100 : 1;
      return qty * prc * multiplier;
  };

  const calculateTotalCostInIDR = () => {
      const totalInNative = calculateTotalCost();
      const rate = getConversionRate(inputCurrency);
      return totalInNative * rate;
  };

  const executeTransaction = async (targetSource?: string) => {
      if (!activeCategory) return;
      const qty = parseNum(inputQty);
      const prc = parseNum(inputPrice);
      const totalIDR = calculateTotalCostInIDR();

      if (txType === 'BUY' && totalIDR > fcf) {
          toast({
              title: "Saldo Kas Tidak Cukup",
              description: `Total pembelian (${formatRp(totalIDR)}) melebihi Saldo Kas FCF Anda (${formatRp(fcf)}).`,
              variant: "destructive"
          });
          return;
      }

      setIsSubmitting(true);
      try {
          const finalSymbol = inputCurrency !== 'IDR' ? `${inputName.trim().toUpperCase()}|${inputCurrency}` : inputName.trim().toUpperCase();

          const res = await fetch("/api/investments", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "x-user-email": currentUserEmail
              },
              body: JSON.stringify({
                  action: txType,
                  symbol: txType === 'BUY' ? finalSymbol : selectedSellSymbol,
                  type: activeCategory,
                  quantity: qty,
                  price: prc,
                  source: targetSource || "Kas Utama",
                  currency: inputCurrency
              })
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.message || "Gagal memproses transaksi investasi.");
          }

          trackEvent("investment_transaction_created", {
              action: txType,
              type: activeCategory,
              symbol: txType === 'BUY' ? finalSymbol : selectedSellSymbol,
              amountIdr: totalIDR
          });

          toast({
              title: txType === 'BUY' ? "Pembelian Sukses! 📈" : "Penjualan Sukses! 💰",
              description: `Transaksi ${assetConfig[activeCategory].label} berhasil tercatat dan kas diperbarui.`
          });

          setInputName("");
          setInputQty("");
          setInputPrice("");
          setSelectedSellSymbol("");
          setShowSourcePopup(false);

          await queryClient.invalidateQueries({ queryKey: ["investments"] });
          await queryClient.invalidateQueries({ queryKey: ["user"] });
          await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      } catch (e: any) {
          toast({
              title: "Transaksi Gagal",
              description: e.message || "Terjadi kesalahan server.",
              variant: "destructive"
          });
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputQty || !inputPrice) {
          toast({ title: "Form Belum Lengkap", description: "Harap isi jumlah dan harga transaksi.", variant: "destructive" });
          return;
      }
      if (txType === 'BUY' && !inputName.trim()) {
          toast({ title: "Nama/Ticker Belum Diisi", description: "Harap masukkan kode atau nama aset.", variant: "destructive" });
          return;
      }
      if (txType === 'SELL' && !selectedSellSymbol) {
          toast({ title: "Pilih Aset Yang Dijual", description: "Pilih aset dari portofolio Anda.", variant: "destructive" });
          return;
      }

      if (txType === 'SELL') {
          setShowSourcePopup(true);
      } else {
          executeTransaction();
      }
  };

  const renderDynamicForm = () => {
      if (!activeCategory) return null;
      const isStock = activeCategory === 'saham';
      const isCrypto = activeCategory === 'kripto';
      const totalIDR = calculateTotalCostInIDR();
      const isInsufficient = txType === 'BUY' && totalIDR > fcf;

      return (
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button
                      type="button"
                      onClick={() => { setTxType('BUY'); setInputQty(""); setInputPrice(""); }}
                      className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          txType === 'BUY' 
                              ? 'bg-sky-600 text-white shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                      BELI / TOP UP
                  </button>
                  <button
                      type="button"
                      onClick={() => { setTxType('SELL'); setInputQty(""); setInputPrice(""); }}
                      className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          txType === 'SELL' 
                              ? 'bg-amber-500 text-white shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                      JUAL / WITHDRAW
                  </button>
              </div>

              {txType === 'BUY' ? (
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                          {isStock ? "Kode Saham (Ticker)" : isCrypto ? "Simbol Kripto" : "Nama / Keterangan Aset"}
                      </label>
                      <div className="flex gap-2">
                          <input
                              type="text"
                              placeholder={isStock ? "Cth: BBCA / BBRI" : isCrypto ? "Cth: BTC / ETH / SOL" : "Cth: Reksadana Pasar Uang / Emas Antam"}
                              value={inputName}
                              onChange={(e) => setInputName(isStock || isCrypto ? e.target.value.toUpperCase() : e.target.value)}
                              className="flex-1 h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all"
                          />
                          <select
                              value={inputCurrency}
                              onChange={(e) => setInputCurrency(e.target.value)}
                              className="w-24 h-12 px-2 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-brand-navy outline-none focus:border-brand-navy focus:bg-white text-center cursor-pointer"
                          >
                              {availableCurrencies.map(c => (
                                  <option key={c} value={c}>{c}</option>
                              ))}
                          </select>
                      </div>
                  </div>
              ) : (
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                          Pilih Aset Yang Ingin Dijual
                      </label>
                      <select
                          value={selectedSellSymbol}
                          onChange={(e) => {
                              setSelectedSellSymbol(e.target.value);
                              const found = filteredItems.find(p => p.symbol === e.target.value);
                              if (found) {
                                  const parts = found.symbol.split('|');
                                  setInputCurrency(parts[1] || 'IDR');
                              }
                          }}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-brand-navy focus:bg-white cursor-pointer"
                      >
                          <option value="">-- Pilih dari Portofolio --</option>
                          {filteredItems.map((item: any) => (
                              <option key={item.symbol} value={item.symbol}>
                                  {item.symbol} (Sisa: {item.quantity.toLocaleString()} {isStock ? 'Lot' : 'Unit'})
                              </option>
                          ))}
                      </select>
                  </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                          {isStock ? "Jumlah (Lot)" : "Jumlah (Unit / Lembar)"}
                      </label>
                      <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={inputQty}
                          onChange={(e) => setInputQty(formatNum(e.target.value))}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm text-slate-900 outline-none focus:border-brand-navy focus:bg-white tabular-nums"
                      />
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                          Harga per {isStock ? "Lembar" : "Unit"} ({inputCurrency})
                      </label>
                      <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={inputPrice}
                          onChange={(e) => setInputPrice(formatNum(e.target.value))}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm text-slate-900 outline-none focus:border-brand-navy focus:bg-white tabular-nums"
                      />
                  </div>
              </div>

              {/* ESTIMASI TOTAL HARGA */}
              <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 text-center space-y-1">
                  <p className="text-[10px] font-bold text-sky-900 uppercase tracking-widest">
                      Estimasi Total Nilai Transaksi
                  </p>
                  <p className="text-xl font-black text-brand-navy tabular-nums">
                      {formatRp(totalIDR)}
                  </p>
                  {inputCurrency !== 'IDR' && (
                      <p className="text-[10px] text-sky-700 font-semibold">
                          ({inputCurrency} {calculateTotalCost().toLocaleString()} @ Rp {Math.round(getConversionRate(inputCurrency)).toLocaleString("id-ID")})
                      </p>
                  )}
              </div>

              {isInsufficient && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Saldo kas Anda ({formatRp(fcf)}) tidak cukup untuk transaksi ini.</span>
                  </div>
              )}

              <button
                  type="submit"
                  disabled={isSubmitting || (txType === 'BUY' && isInsufficient)}
                  className={`w-full h-14 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                      txType === 'BUY' 
                          ? 'bg-sky-600 hover:bg-sky-700 text-white' 
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
              >
                  {isSubmitting ? (
                      <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>MEMPROSES...</span>
                      </>
                  ) : (
                      <span>{txType === 'BUY' ? "KONFIRMASI BELI / TOP UP" : "KONFIRMASI JUAL / CAIRKAN"}</span>
                  )}
              </button>
          </form>
      );
  };

  if (isUserLoading || isInvLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <img src="/BILANO-ICON-NEW.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-brand-navy font-bold text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-gold"/>
                  <span>Memuat Portofolio Investasi...</span>
              </div>
          </div>
      );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA BIRU MUDA / SKY BLUE & NAVY */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-8 bg-gradient-to-b from-[#E0F2FE] via-[#BAE6FD] to-[#7DD3FC] flex flex-col relative z-10 border-b border-sky-300/60">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(12,74,110,0.06)] flex items-center justify-between relative z-30 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={() => {
                            if (viewState === 'detail') {
                                setViewState('main');
                                setActiveCategory(null);
                            } else {
                                setLocation("/");
                            }
                        }}
                        className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                        title="Kembali"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-800" strokeWidth={2.5} />
                    </button>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                            <p className="text-[10px] font-bold text-sky-900 uppercase tracking-widest">
                                Aset & Pasar Modal
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                            {viewState === 'detail' && activeCategory ? `Portofolio ${assetConfig[activeCategory].label}` : "Investasi & Portofolio"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => { refetchRates(); toast({ title: "Kurs Diperbarui! 🔄", description: "Nilai valas portofolio disinkronkan ke pasar live." }); }}
                        className="flex items-center gap-1 bg-white border border-slate-200 text-brand-navy px-3 py-1.5 rounded-full text-[10px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                        <RefreshCcw className="w-3.5 h-3.5 text-sky-600" />
                        <span>LIVE KURS</span>
                    </button>
                </div>
            </div>

            {/* 2. HERO CARD INVESTASI (SATU-SATUNYA DENGAN SOLID SHADOW KHAS BILANO) */}
            <div className="bg-gradient-to-br from-[#1D3E72] via-[#0C4A6E] to-[#0369A1] text-white p-6 rounded-[28px] border-l-[6px] border-l-sky-400 shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <TrendingUp className="absolute -right-4 -bottom-4 w-36 h-36 text-sky-300/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-sky-400/20 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <span className="bg-sky-400 text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <PieChart className="w-3 h-3 text-brand-navy fill-current" />
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
        {/* 2. BODY CONTENT SECTION - CLEAN, CRISP & MODERN ELEVATION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-4">
            
            {viewState === 'main' ? (
                <div className="space-y-4 animate-in fade-in">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <PieChart className="w-4 h-4 text-sky-600" />
                            Pilih Kategori Portofolio
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">8 Kelas Aset</span>
                    </div>

                    {/* 8 GRID KELAS ASET DENGAN VEKTOR IKON CRISP & BALANCED CONTAINER */}
                    <div className="grid grid-cols-2 gap-3">
                        {(Object.keys(assetConfig) as AssetType[]).map((key) => {
                            const cfg = assetConfig[key];
                            const Icon = cfg.icon;
                            
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
                                    className="bg-white rounded-3xl p-4 border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-sm active:scale-[0.98] transition-all flex flex-col items-center text-center gap-2.5 cursor-pointer group relative overflow-hidden"
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center p-3 transition-transform group-hover:scale-105 shadow-xs border ${cfg.bg}`}>
                                        <Icon className={`w-6 h-6 ${cfg.iconColor}`} strokeWidth={2.2} />
                                    </div>
                                    <div className="w-full">
                                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{cfg.label}</h4>
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
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setDetailTab('transaksi')}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                detailTab === 'transaksi' 
                                    ? 'bg-sky-600 text-white shadow-xs' 
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
                            className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                detailTab === 'analisa' 
                                    ? 'bg-brand-navy text-sky-300 shadow-xs font-extrabold' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Brain className="w-4 h-4 text-sky-400"/> ANALISA AI
                        </button>
                    </div>

                    {/* TAB TRANSAKSI */}
                    {detailTab === 'transaksi' && (
                        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 space-y-4">
                            {renderDynamicForm()}
                        </div>
                    )}

                    {/* TAB ANALISA ASET / SMART SCREENER */}
                    {detailTab === 'analisa' && activeCategory && (
                        <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] rounded-3xl p-6 shadow-sm border-l-[6px] border-l-sky-400 text-center relative overflow-hidden space-y-4">
                            <div className="w-16 h-16 bg-sky-400 text-brand-navy rounded-2xl flex items-center justify-center mx-auto shadow-md border-2 border-white/20">
                                <Brain className="w-8 h-8" />
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-white mb-1">
                                    Smart Screener {assetConfig[activeCategory].label} 🚀
                                </h3>
                                <p className="text-xs text-sky-100/80 font-medium leading-relaxed">
                                    Fitur screening cerdas dan kalkulasi tren harga menggunakan AI khusus untuk aset <b>{assetConfig[activeCategory].label}</b> Anda sedang dalam perakitan akhir kami!
                                </p>
                            </div>

                            <div className="bg-sky-950/80 border border-sky-400/40 rounded-2xl p-4 text-left space-y-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-sky-300 shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-200">GARANSI HARGA PRO</span>
                                </div>
                                <p className="text-[11px] leading-relaxed font-medium text-sky-100">
                                    Dapatkan akses instan ke seluruh fitur VIP AI tanpa kenaikan harga di masa depan dengan mengunci paket tahunan Anda hari ini.
                                </p>
                            </div>

                            <button 
                                type="button"
                                onClick={() => setLocation('/paywall')} 
                                className="w-full h-14 bg-sky-400 hover:bg-sky-300 text-brand-navy font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Lock className="w-4 h-4"/> AMANKAN PAKET SAYA SEKARANG
                            </button>
                        </div>
                    )}

                    {/* DAFTAR ASET TERDAFTAR DI PORTOFOLIO */}
                    <div className="space-y-3 pt-1">
                        <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider px-1 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-sky-600" />
                            Daftar Kepemilikan Aset ({filteredItems.length})
                        </h3>

                        {filteredItems.length === 0 ? (
                            <div className="bg-white rounded-3xl p-8 border border-dashed border-sky-200 text-center shadow-xs">
                                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-sky-100">
                                    <Info className="w-6 h-6" />
                                </div>
                                <p className="font-bold text-slate-800 text-xs">Belum ada aset di kategori ini</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Catat transaksi pembelian pertama Anda melalui form di atas.</p>
                            </div>
                        ) : (
                            filteredItems.map((item: any) => {
                                const parts = (item.symbol||"").split('|');
                                const sym = parts[0] || "";
                                const curr = parts[1] || 'IDR';
                                const isStock = activeCategory === 'saham';
                                const totalVal = calculateLiveValue(item);

                                return (
                                    <div 
                                        key={item.symbol} 
                                        className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 font-black text-xs flex items-center justify-center shrink-0">
                                                {curr !== 'IDR' ? curr : sym.slice(0, 3)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">{sym}</h4>
                                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                                    {item.quantity.toLocaleString()} {isStock ? 'Lot' : 'Unit'} @ {curr} {Math.round(item.avgPrice).toLocaleString("id-ID")}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="font-black text-slate-900 text-xs sm:text-sm tabular-nums">
                                                {formatRp(totalVal)}
                                            </p>
                                            <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60 inline-block mt-0.5">
                                                Live Asset
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* POPUP SUMBER DANA KETIKA MENJUAL ASET */}
      {showSourcePopup && (
          <SourceSelectionPopup
              type="income"
              onCancel={() => setShowSourcePopup(false)}
              onSelect={(source) => {
                  setShowSourcePopup(false);
                  executeTransaction(source);
              }}
              title="Tujuan Masuk Saldo Penjualan"
              description="Pilih akun atau dompet yang menerima dana hasil penjualan aset ini:"
          />
      )}
    </MobileLayout>
  );
}