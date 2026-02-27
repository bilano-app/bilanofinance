import { useState } from "react";
import { ArrowLeft, PlusCircle, X, Loader2 } from "lucide-react"; 
import { TrendingUp, Building2, LineChart, AlertCircle, Briefcase, Gem, Landmark, ScrollText, Coins } from "lucide-react";
import { Button, Card, CardContent, CardHeader, Input, CurrencyInput } from "@/components/UIComponents";
import { MobileLayout } from "@/components/Layout";
import { useUser, useInvestments, useBuyInvestment, useSellInvestment } from "@/hooks/use-finance";

type AssetType = 'saham' | 'crypto' | 'reksadana' | 'obligasi' | 'p2p' | 'emas' | 'properti' | 'koleksi';

export default function Investment() {
  const [viewState, setViewState] = useState<'main' | 'detail'>('main');
  const [activeCategory, setActiveCategory] = useState<AssetType | null>(null);
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');

  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: portfolio = [], isLoading: isInvLoading } = useInvestments();
  const buyMutation = useBuyInvestment();
  const sellMutation = useSellInvestment();

  const fcf = user?.cashBalance || 0; 

  const [inputName, setInputName] = useState("");
  const [inputQty, setInputQty] = useState("");   
  const [inputPrice, setInputPrice] = useState(""); 
  const [selectedSellSymbol, setSelectedSellSymbol] = useState("");

  const formatRp = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

  const assetConfig: Record<AssetType, { label: string, unit: string, icon: any, color: string, bg: string }> = {
      saham: { label: 'Saham', unit: 'Lot (x100)', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
      crypto: { label: 'Crypto', unit: 'Koin / Token', icon: Coins, color: 'text-orange-500', bg: 'bg-orange-100' },
      reksadana: { label: 'Reksadana', unit: 'Unit', icon: LineChart, color: 'text-blue-500', bg: 'bg-blue-100' },
      obligasi: { label: 'Obligasi', unit: 'Lembar', icon: ScrollText, color: 'text-indigo-500', bg: 'bg-indigo-100' },
      p2p: { label: 'P2P Lending', unit: 'Akun / Lot', icon: Landmark, color: 'text-purple-500', bg: 'bg-purple-100' },
      emas: { label: 'Emas & Logam', unit: 'Gram', icon: Gem, color: 'text-yellow-600', bg: 'bg-yellow-100' },
      properti: { label: 'Properti', unit: 'Unit Properti', icon: Building2, color: 'text-cyan-600', bg: 'bg-cyan-100' },
      koleksi: { label: 'Koleksi', unit: 'Item', icon: Briefcase, color: 'text-rose-600', bg: 'bg-rose-100' },
  };

  const getFilteredPortfolio = () => {
      if (!activeCategory) return portfolio;
      return portfolio.filter(p => {
          if (p.type) return p.type === activeCategory;
          const isLegacyStock = p.symbol.length === 4 && !p.symbol.includes(" ");
          if (activeCategory === 'saham') return isLegacyStock;
          if (isLegacyStock) return false; 
          return true; 
      });
  };

  const filteredItems = getFilteredPortfolio();

  // FIX: Hapus pembagian 100 agar nilai IDR akurat
  const totalPortfolioValue = portfolio.reduce((acc, p) => {
      const isStock = p.type === 'saham' || (!p.type && p.symbol.length === 4 && !p.symbol.includes(" "));
      const multiplier = isStock ? 100 : 1;
      return acc + (p.quantity * p.avgPrice * multiplier);
  }, 0);

  const categoryValue = filteredItems.reduce((acc, p) => {
      const isStock = p.type === 'saham' || (!p.type && p.symbol.length === 4 && !p.symbol.includes(" "));
      const multiplier = isStock ? 100 : 1;
      return acc + (p.quantity * p.avgPrice * multiplier);
  }, 0);

  const handleTransaction = async () => {
    if (!inputPrice) return;
    const price = parseFloat(inputPrice);
    const qty = parseFloat(inputQty || "1");

    try {
        const payload = {
           symbol: (txType === 'SELL' ? selectedSellSymbol : inputName).toUpperCase(),
           quantity: qty, 
           price: price, 
           type: activeCategory || 'other' 
        };

        if (txType === 'BUY') await buyMutation.mutateAsync(payload);
        else await sellMutation.mutateAsync(payload);
        
        setIsTxOpen(false);
        resetForm();
    } catch (error: any) {
        alert(error.message || "Transaksi Gagal");
    }
  };

  const resetForm = () => {
    setInputName(""); setInputQty(""); setInputPrice(""); setSelectedSellSymbol("");
  };

  const renderDynamicForm = () => {
    const config = activeCategory ? assetConfig[activeCategory] : assetConfig['saham'];
    const qtyNum = parseFloat(inputQty || "0");
    const priceNum = parseFloat(inputPrice || "0");
    const isSaham = activeCategory === 'saham';

    let isSellOverLimit = false;
    let ownedQty = 0;

    if (txType === 'SELL' && selectedSellSymbol) {
        const asset = portfolio.find(p => p.symbol === selectedSellSymbol);
        if (asset) {
            ownedQty = asset.quantity;
            if (qtyNum > ownedQty) isSellOverLimit = true;
        }
    }

    return (
      <div className="space-y-5 py-2">
        <div className="flex bg-slate-100 p-1.5 rounded-[20px]">
          <button onClick={() => {setTxType('BUY'); resetForm();}} className={`flex-1 py-3 rounded-[16px] font-bold text-sm transition-all ${txType==='BUY'?'bg-emerald-500 text-white shadow-md':'text-slate-500 hover:text-slate-700'}`}>BELI</button>
          <button onClick={() => {setTxType('SELL'); resetForm();}} className={`flex-1 py-3 rounded-[16px] font-bold text-sm transition-all ${txType==='SELL'?'bg-rose-500 text-white shadow-md':'text-slate-500 hover:text-slate-700'}`}>JUAL</button>
        </div>

        <div className="space-y-2">
           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nama / Kode {config.label}</label>
           {txType === 'BUY' ? (
              <Input 
                value={inputName} 
                onChange={e => setInputName(e.target.value.toUpperCase())} 
                placeholder={isSaham ? "Cth: BBCA" : (activeCategory === 'crypto' ? "Cth: BTC / USDT" : "Nama Aset")} 
                className="uppercase font-bold h-14 rounded-[20px] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500"
              />
           ) : (
              <select className="w-full h-14 px-4 border-transparent rounded-[20px] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 uppercase font-bold text-slate-700 outline-none transition-all" onChange={e => {
                  setSelectedSellSymbol(e.target.value);
                  setInputName(e.target.value);
              }}>
                 <option value="">-- PILIH ASET --</option>
                 {filteredItems.map(p => <option key={p.id} value={p.symbol}>{p.symbol} (Sisa: {p.quantity})</option>)}
              </select>
           )}
        </div>

        <div className="space-y-2">
           <div className="flex justify-between items-end mb-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Jumlah ({config.unit})</label>
              {txType === 'SELL' && selectedSellSymbol && (
                  <span className={`text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-full ${isSellOverLimit ? 'text-rose-500 bg-rose-50' : 'text-emerald-600'}`}>
                      Milik Anda: {ownedQty}
                  </span>
              )}
           </div>
           <Input 
             type="number" 
             value={inputQty} 
             onChange={e => setInputQty(e.target.value)} 
             placeholder="0" 
             className={`h-14 rounded-[20px] bg-slate-50 border-transparent font-bold text-lg focus:bg-white focus:border-indigo-500 transition-all ${isSellOverLimit ? "border-rose-500 focus:border-rose-500 bg-rose-50" : ""}`}
           />
        </div>

        <div className="space-y-2">
           <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">{txType==='BUY'?'Harga Beli':'Harga Jual'} per {config.unit.split(' ')[0]}</label>
           <CurrencyInput value={inputPrice} onChange={setInputPrice} placeholder="0" className="h-14 rounded-[20px] bg-slate-50 border-transparent font-bold text-lg focus:bg-white focus:border-indigo-500 transition-all" />
        </div>

        <div className={`p-4 rounded-[24px] flex justify-between items-center mt-2 transition-colors ${txType==='BUY'?'bg-rose-50':'bg-emerald-50'}`}>
           <span className={`text-xs font-bold ${txType==='BUY'?'text-rose-500':'text-emerald-600'}`}>Estimasi Transaksi</span>
           <span className={`font-extrabold text-xl ${txType==='BUY'?'text-rose-600':'text-emerald-700'}`}>
              {formatRp(qtyNum * priceNum * (isSaham ? 100 : 1))}
           </span>
        </div>

        <Button className={`w-full h-14 font-extrabold text-lg shadow-lg rounded-full mt-4 transition-transform active:scale-95 ${txType==='BUY'?'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200':'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`} onClick={handleTransaction} disabled={!inputName || !inputQty || !inputPrice || isSellOverLimit}>
           {isSellOverLimit ? "STOK TIDAK CUKUP" : `KONFIRMASI ${txType}`}
        </Button>
      </div>
    )
  };

  if (isUserLoading || isInvLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span>Memuat Data...</span>
              </div>
          </div>
      );
  }

  return (
    <MobileLayout title="Investasi & Portfolio" showBack={true}>
       
       {viewState !== 'main' && (
          <Button variant="ghost" size="sm" onClick={() => setViewState('main')} className="mb-4 pl-0 hover:bg-transparent text-slate-500">
             <ArrowLeft className="w-5 h-5 mr-2"/> Kembali ke Semua Aset
          </Button>
       )}

       {/* --- 1. HALAMAN UTAMA --- */}
       {viewState === 'main' ? (
          <div className="space-y-6 mt-2 animate-in fade-in duration-500 px-1">
             <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-6 rounded-[32px] shadow-xl shadow-indigo-200 relative overflow-hidden group">
                <div className="relative z-10">
                    <p className="text-[11px] font-bold text-indigo-200 mb-1 uppercase tracking-widest">Total Semua Aset</p>
                    <h2 className="text-4xl font-extrabold tracking-tight mb-4">{formatRp(totalPortfolioValue)}</h2>
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
                            onClick={() => { setActiveCategory(key); setViewState('detail'); }} 
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

       /* --- 2. HALAMAN DETAIL PER JENIS --- */
       ) : (
          <div className="animate-in slide-in-from-right duration-300 px-1">
             <div className={`mb-6 rounded-[32px] p-6 shadow-lg text-white relative overflow-hidden ${activeCategory ? assetConfig[activeCategory].bg.replace('100', '500') : 'bg-slate-800'}`}>
                   <div className="relative z-10">
                       <div className="flex items-center gap-2 mb-2 text-white/80">
                           {activeCategory && (() => {
                               const Icon = assetConfig[activeCategory].icon;
                               return <Icon className="w-5 h-5"/>
                           })()}
                           <span className="text-[11px] uppercase font-bold tracking-widest">Portfolio {activeCategory}</span>
                       </div>
                       <h2 className="text-3xl font-extrabold tracking-tight">{formatRp(categoryValue)}</h2>
                   </div>
                   <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-tl-full pointer-events-none"></div>
             </div>

             {!isTxOpen ? (
                <Button onClick={() => { setIsTxOpen(true); setTxType('BUY'); }} className="w-full mb-6 bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-full h-14 text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
                   <PlusCircle className="w-5 h-5 text-indigo-600"/> Tambah {activeCategory ? assetConfig[activeCategory].label : 'Aset'}
                </Button>
             ) : (
                <div className="mb-6 bg-white rounded-[32px] shadow-xl shadow-indigo-100/50 border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                   <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                       <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Form Transaksi</span>
                       <button onClick={()=>setIsTxOpen(false)} className="p-1.5 hover:bg-rose-100 hover:text-rose-500 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
                   </div>
                   <div className="p-5">{renderDynamicForm()}</div>
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
                   const isStock = p.type === 'saham' || (!p.type && p.symbol.length === 4 && !p.symbol.includes(" "));
                   const multiplier = isStock ? 100 : 1;
                   const val = p.quantity * p.avgPrice * multiplier; // Hapus /100
                   const unitLabel = activeCategory ? assetConfig[activeCategory].unit.split(' ')[0] : 'Unit';
                   
                   return (
                     <div key={p.id} className="bg-white p-5 rounded-[24px] border border-slate-100 flex justify-between items-center shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-sm ${activeCategory ? assetConfig[activeCategory].bg : 'bg-slate-100'} ${activeCategory ? assetConfig[activeCategory].color : 'text-slate-600'}`}>
                              {p.symbol.substring(0,2)}
                           </div>
                           <div>
                              <h4 className="font-extrabold text-slate-800 text-base mb-0.5">{p.symbol}</h4>
                              <p className="text-xs text-slate-500 font-medium">
                                 {p.quantity} {unitLabel} <span className="mx-1 text-slate-300">•</span> Avg: {formatRp(p.avgPrice)}
                              </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="font-extrabold text-slate-800">{formatRp(val)}</p>
                           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Nilai Aset</p>
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