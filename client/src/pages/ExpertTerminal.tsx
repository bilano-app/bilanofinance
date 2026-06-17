import React, { useState, useMemo, useEffect } from "react";
import { 
  LayoutDashboard, PieChart as PieIcon, TrendingUp, History, Eye, EyeOff, Search,
  ArrowUpRight, ArrowDownRight, ChevronUp, Loader2, Save, X, Link as LinkIcon
} from "lucide-react";
import { useUser, useInvestments, useTransactions, useLiveQuotes, usePortfolioSnapshots, useSaveSnapshot } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#10B981', '#6366f1', '#F59E0B', '#F43F5E', '#8B5CF6', '#06B6D4', '#EAB308'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export default function ExpertTerminal() {
  const { toast } = useToast();
  const { data: user } = useUser();
  const { data: investments = [] } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const { data: snapshots = [] } = usePortfolioSnapshots();
  const saveSnapshotMutation = useSaveSnapshot();

  const [activeTab, setActiveTab] = useState<'alokasi' | 'pantauan' | 'terealisasi'>('alokasi');
  const [showProfit, setShowProfit] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartTimeframe, setChartTimeframe] = useState<'1M' | '3M' | '1Y' | 'ALL'>('1Y');

  // === HALAMAN 1: SINKRONISASI ASET (AUTOCOMPLETE) ===
  const [monitoredAssets, setMonitoredAssets] = useState<{dbSymbol: string, ticker: string}[]>(() => {
      const saved = localStorage.getItem('bilano_expert_assets');
      return saved ? JSON.parse(saved) : [];
  });
  const [searchQ, setSearchQ] = useState("");
  const [importModal, setImportModal] = useState<{dbSymbol: string, tempTicker: string, avgPrice: number, qty: number} | null>(null);

  useEffect(() => {
      localStorage.setItem('bilano_expert_assets', JSON.stringify(monitoredAssets));
  }, [monitoredAssets]);

  const cashBalance = user?.cashBalance || 0;

  // Agregasi Portfolio Aktif dari PWA
  const aggregatedPortfolio = useMemo(() => {
    const agg: Record<string, { qty: number, totalInvested: number, symbol: string, avgPrice: number }> = {};
    investments.forEach((inv: any) => {
      const sym = inv.symbol.split('|')[0];
      if (!agg[sym]) agg[sym] = { qty: 0, totalInvested: 0, symbol: sym, avgPrice: 0 };
      agg[sym].qty += inv.quantity;
      agg[sym].totalInvested += (inv.quantity * inv.avgPrice * (inv.type === 'saham' || sym.length === 4 ? 100 : 1));
      agg[sym].avgPrice = agg[sym].qty > 0 ? (agg[sym].totalInvested / agg[sym].qty / (inv.type === 'saham' || sym.length === 4 ? 100 : 1)) : 0;
    });
    return Object.values(agg);
  }, [investments]);

  // Aset yang sudah di-mapping oleh pengguna
  const activePortfolio = useMemo(() => {
    return monitoredAssets.map(ma => {
        const dbAsset = aggregatedPortfolio.find(p => p.symbol === ma.dbSymbol);
        return {
            dbSymbol: ma.dbSymbol,
            marketTicker: ma.ticker,
            qty: dbAsset ? dbAsset.qty : 0,
            totalInvested: dbAsset ? dbAsset.totalInvested : 0,
        };
    }).filter(p => p.qty > 0); 
  }, [monitoredAssets, aggregatedPortfolio]);

  // HALAMAN 3: DETEKSI OTOMATIS KODE ASLI (Anti-Bug IDR)
  const realizedTradesBase = useMemo(() => {
    return transactions.filter((t: any) => t.type === 'invest_sell').map((t: any) => {
      // Regex pintar: Ambil kata setelah "lot/unit " tapi berhenti sebelum "|" atau "@"
      const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
      const symbol = match ? match[1].toUpperCase().trim() : 'Unknown';
      return { ...t, symbol };
    });
  }, [transactions]);

  // Kumpulkan semua ticker secara otomatis untuk dilempar ke Yahoo Finance API
  const uniqueTickersToFetch = useMemo(() => {
    const tickers = new Set<string>();
    activePortfolio.forEach(p => tickers.add(p.marketTicker));
    
    realizedTradesBase.forEach((t: any) => {
        if (t.symbol !== 'Unknown') {
            const mapping = monitoredAssets.find(m => m.dbSymbol === t.symbol);
            if (mapping) {
                tickers.add(mapping.ticker);
            } else {
                const autoTicker = t.symbol.length === 4 ? `${t.symbol}.JK` : t.symbol;
                tickers.add(autoTicker);
            }
        }
    });
    return Array.from(tickers);
  }, [activePortfolio, realizedTradesBase, monitoredAssets]);

  const { data: livePrices = {}, isLoading: isLivePricesLoading } = useLiveQuotes(uniqueTickersToFetch);

  // Kalkulasi total valuasi
  const totalAssetValue = activePortfolio.reduce((acc: any, p: any) => {
    const livePrice = livePrices[p.marketTicker] || (p.totalInvested / p.qty); 
    const multiplier = p.marketTicker.includes('.JK') || p.dbSymbol.length === 4 ? 100 : 1;
    return acc + (p.qty * livePrice * multiplier);
  }, 0);

  const totalInvested = activePortfolio.reduce((acc: any, p: any) => acc + p.totalInvested, 0);
  const totalProfitLoss = totalAssetValue - totalInvested;
  const totalWealth = cashBalance + totalAssetValue;

  // Pemetaan akhir untuk tabel investasi terealisasi
  const realizedTrades = useMemo(() => {
    return realizedTradesBase.map((t: any) => {
        const mapping = monitoredAssets.find(m => m.dbSymbol === t.symbol);
        const tickerToUse = mapping ? mapping.ticker : (t.symbol.length === 4 ? `${t.symbol}.JK` : t.symbol);
        return {
            ...t,
            marketTicker: tickerToUse,
            livePrice: livePrices[tickerToUse] || 0,
            isMapped: !!mapping
        };
    });
  }, [realizedTradesBase, livePrices, monitoredAssets]);

  // Data Pie Chart
  const pieData = [
    { name: 'Cash Tunai', value: cashBalance },
    ...activePortfolio.map((p: any) => {
       const livePrice = livePrices[p.marketTicker] || (p.totalInvested / p.qty);
       const multiplier = p.marketTicker.includes('.JK') || p.dbSymbol.length === 4 ? 100 : 1;
       return { name: p.dbSymbol, value: (p.qty * livePrice * multiplier) };
    })
  ].filter((d: any) => d.value > 0);

  // HALAMAN 2: FILTER TIMEFRAME GRAFIK
  const lineData = useMemo(() => {
     let filteredSnaps = [...snapshots].reverse();
     if (chartTimeframe === '1M') filteredSnaps = filteredSnaps.slice(-1); 
     else if (chartTimeframe === '3M') filteredSnaps = filteredSnaps.slice(-3);
     else if (chartTimeframe === '1Y') filteredSnaps = filteredSnaps.slice(-12);
     
     return filteredSnaps.map((s: any) => ({
        name: `${MONTH_NAMES[s.month - 1]} ${s.year}`,
        Total: s.totalValue,
        Investasi: s.investValue
     }));
  }, [snapshots, chartTimeframe]);

  // HALAMAN 2: CARI BULAN PERTAMA INVESTASI
  const firstInvestmentMonthIndex = useMemo(() => {
      const investTxs = transactions.filter((t: any) => t.type === 'invest_buy');
      if (investTxs.length === 0) return 0;
      const oldestTx = investTxs[investTxs.length - 1];
      const date = new Date(oldestTx.date);
      if (date.getFullYear() !== selectedYear) return 0;
      return date.getMonth(); 
  }, [transactions, selectedYear]);

  const formatRp = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  const formatPct = (num: number) => {
      const sign = num > 0 ? '+' : '';
      return `${sign}${(num * 100).toFixed(2)}%`;
  };

  const handleSaveSnapshot = () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      const assetsDetail = activePortfolio.reduce((acc: any, p: any) => {
         const livePrice = livePrices[p.marketTicker] || (p.totalInvested / p.qty);
         const multiplier = p.marketTicker.includes('.JK') || p.dbSymbol.length === 4 ? 100 : 1;
         acc[p.dbSymbol] = { invested: p.totalInvested, valuasi: p.qty * livePrice * multiplier };
         return acc;
      }, {} as Record<string, {invested: number, valuasi: number}>);

      saveSnapshotMutation.mutate({
          month, year, cashBalance, investValue: totalAssetValue, totalValue: totalWealth, assetsDetail: JSON.stringify(assetsDetail)
      }, {
          onSuccess: () => toast({ title: "Tersimpan", description: `Data portofolio bulan ${MONTH_NAMES[month-1]} ${year} berhasil direkam.` })
      });
  };

  const handleImportAsset = () => {
      if (!importModal || !importModal.tempTicker) return;
      const newAssets = monitoredAssets.filter(m => m.dbSymbol !== importModal.dbSymbol);
      newAssets.push({ dbSymbol: importModal.dbSymbol, ticker: importModal.tempTicker.toUpperCase() });
      setMonitoredAssets(newAssets);
      setImportModal(null);
      setSearchQ("");
      toast({ title: "Aset Ditambahkan", description: `${importModal.dbSymbol} terhubung ke Live Tracker.` });
  };

  const removeAsset = (dbSymbol: string) => {
      setMonitoredAssets(monitoredAssets.filter(m => m.dbSymbol !== dbSymbol));
  };

  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-300 font-sans overflow-hidden">
      
      {importModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
             <div className="bg-[#1E293B] border border-slate-700 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative">
                <button onClick={() => setImportModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <LinkIcon className="w-8 h-8 text-indigo-400"/>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Sinkronisasi Market</h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                   Hubungkan aset <b>{importModal.dbSymbol}</b> dari PWA ke ticker market global agar valuasi Anda 100% akurat dan Live.
                </p>
                <div className="space-y-4 mb-8">
                   <div className="bg-[#0F172A] p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                       <span className="text-xs font-bold text-slate-500 uppercase">Data PWA Anda</span>
                       <span className="text-sm font-bold text-white">{importModal.qty} Unit (Avg {formatRp(importModal.avgPrice)})</span>
                   </div>
                   <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase ml-1">Kode Ticker (Sesuai Yahoo Finance)</label>
                       <input 
                           type="text" 
                           value={importModal.tempTicker} 
                           onChange={e => setImportModal({...importModal, tempTicker: e.target.value})}
                           placeholder="Cth: ANTM.JK / AAPL / BTC-USD"
                           className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold outline-none focus:border-indigo-500 uppercase transition-colors"
                       />
                       <p className="text-[10px] text-slate-500 ml-1">Gunakan akhiran .JK untuk saham Indonesia (Cth: BBCA.JK).</p>
                   </div>
                </div>
                <button onClick={handleImportAsset} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-full transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                   HUBUNGKAN ASET
                </button>
             </div>
         </div>
      )}

      <aside className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col shadow-2xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-lg tracking-tight">BILANO</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Expert Terminal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Analisis & Laporan</p>
          
          <button onClick={() => setActiveTab('alokasi')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-semibold ${activeTab === 'alokasi' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
            <PieIcon className="w-4 h-4" /> Alokasi Aset
          </button>
          
          <button onClick={() => setActiveTab('pantauan')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-semibold ${activeTab === 'pantauan' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
            <TrendingUp className="w-4 h-4" /> Pantauan Portofolio
          </button>
          
          <button onClick={() => setActiveTab('terealisasi')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-semibold ${activeTab === 'terealisasi' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
            <History className="w-4 h-4" /> Investasi Terealisasi
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-400 bg-slate-800/30 text-xs font-bold border border-slate-800">
             <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                   {isLivePricesLoading ? <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span> : <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                   <span className={`relative inline-flex rounded-full h-2 w-2 ${isLivePricesLoading ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                </span>
                Data Market
             </span>
             <span className={isLivePricesLoading ? 'text-amber-400' : 'text-emerald-400'}>{isLivePricesLoading ? 'Syncing...' : 'LIVE'}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0F172A]/80 backdrop-blur-md z-10">
          <div className="relative w-[400px]">
            <div className="flex items-center gap-4 bg-[#1E293B] px-4 py-2.5 rounded-full border border-slate-700/50 focus-within:border-indigo-500 transition-colors">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Tarik & Sinkronkan Data dari PWA..." className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-500 font-medium" />
            </div>
            {searchQ && (
               <div className="absolute top-full mt-2 w-full bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="bg-[#0F172A] px-4 py-2 border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-500">Hasil dari PWA</div>
                  {aggregatedPortfolio.filter(p => p.symbol.toLowerCase().includes(searchQ.toLowerCase())).map((p: any) => {
                      const isAdded = monitoredAssets.some(m => m.dbSymbol === p.symbol);
                      return (
                        <button key={p.symbol} disabled={isAdded} onClick={() => { let guess = p.symbol; if (guess.length === 4) guess = `${guess}.JK`; setImportModal({ dbSymbol: p.symbol, tempTicker: guess, avgPrice: p.avgPrice, qty: p.qty }); }} className={`w-full text-left px-4 py-3 border-b border-slate-700/50 flex justify-between items-center transition-colors ${isAdded ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'hover:bg-slate-800'}`}>
                           <div>
                              <div className="font-bold text-white flex items-center gap-2">{p.symbol} {isAdded && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Tersinkron</span>}</div>
                              <div className="text-xs text-slate-400 mt-0.5">Avg: {formatRp(p.avgPrice)}</div>
                           </div>
                           <div className="text-right"><span className="text-xs font-bold text-indigo-400">{p.qty} Unit</span></div>
                        </button>
                      )
                  })}
               </div>
            )}
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right flex items-center gap-8">
              <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Kas (Cash)</p>
                  <p className="text-white font-bold text-lg">{formatRp(cashBalance)}</p>
              </div>
              <div className="h-8 w-px bg-slate-800"></div>
              <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Aset Investasi</p>
                  <div className="flex items-center gap-2 justify-end">
                      <p className="text-white font-black text-xl text-indigo-400">{formatRp(totalAssetValue)}</p>
                      {isLivePricesLoading && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
                  </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* ================= TAB 1: ALOKASI ASET ================= */}
          {activeTab === 'alokasi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex justify-between items-end">
                  <div>
                      <h2 className="text-2xl font-black text-white tracking-tight">Peta Alokasi Kekayaan</h2>
                      <p className="text-sm text-slate-400 mt-1">Gunakan Search Bar di atas untuk menyinkronkan data PWA ke Live Terminal.</p>
                  </div>
              </div>
              
              {activePortfolio.length === 0 ? (
                  <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-lg">
                      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4"><Search className="w-8 h-8 text-slate-500" /></div>
                      <h3 className="text-lg font-bold text-white mb-2">Terminal Masih Kosong</h3>
                      <p className="text-slate-400 text-sm max-w-sm leading-relaxed">Anda belum memanggil aset apapun dari PWA Anda. Gunakan bar pencarian di bagian atas untuk mulai mengimpor dan melacak valuasi aset secara live.</p>
                  </div>
              ) : (
                  <>
                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-x-auto shadow-lg custom-scrollbar pb-2">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="px-6 py-4 border-b border-slate-800 whitespace-nowrap sticky left-0 bg-[#0F172A] z-10">Kategori</th>
                              <th className="px-6 py-4 border-b border-slate-800 text-emerald-400 whitespace-nowrap">Cash (Tunai)</th>
                              {activePortfolio.map((p: any) => (
                                <th key={p.dbSymbol} className="px-6 py-4 border-b border-slate-800 whitespace-nowrap group">
                                   <div className="flex items-center gap-2">
                                       {p.dbSymbol} <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-medium">{p.marketTicker}</span>
                                       <button onClick={() => removeAsset(p.dbSymbol)} className="opacity-0 group-hover:opacity-100 text-rose-500 ml-2 transition-opacity"><X className="w-3.5 h-3.5"/></button>
                                   </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="text-slate-200 font-medium">
                            <tr className="border-b border-slate-800/50 hover:bg-slate-800/20">
                              <td className="px-6 py-4 font-bold text-slate-400 sticky left-0 bg-[#1E293B] z-10">Nilai Aset (Live)</td>
                              <td className="px-6 py-4">{formatRp(cashBalance)}</td>
                              {activePortfolio.map((p: any) => {
                                const livePrice = livePrices[p.marketTicker] || (p.totalInvested / p.qty);
                                const multiplier = p.marketTicker.includes('.JK') || p.dbSymbol.length === 4 ? 100 : 1;
                                return <td key={p.dbSymbol} className="px-6 py-4">{formatRp(p.qty * livePrice * multiplier)}</td>
                              })}
                            </tr>
                            <tr className="hover:bg-slate-800/20">
                              <td className="px-6 py-4 font-bold text-slate-400 sticky left-0 bg-[#1E293B] z-10">Persentase</td>
                              <td className="px-6 py-4 text-emerald-400 font-bold">{totalWealth > 0 ? formatPct(cashBalance / totalWealth) : '0%'}</td>
                              {activePortfolio.map((p: any) => {
                                 const livePrice = livePrices[p.marketTicker] || (p.totalInvested / p.qty);
                                 const multiplier = p.marketTicker.includes('.JK') || p.dbSymbol.length === 4 ? 100 : 1;
                                 const val = (p.qty * livePrice * multiplier);
                                 return <td key={p.dbSymbol} className="px-6 py-4 text-indigo-400 font-bold">{totalWealth > 0 ? formatPct(val / totalWealth) : '0%'}</td>
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[350px] shadow-lg">
                        <div className="w-full max-w-sm h-64 relative">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                                    {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                 </Pie>
                                 <Tooltip formatter={(val: number) => formatRp(val)} contentStyle={{backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px', color: '#fff'}} itemStyle={{color: '#fff', fontWeight: 'bold'}} />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-4 justify-center mt-4">
                            {pieData.map((d: any, i: number) => (
                                <div key={d.name} className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                   <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></span>
                                   {d.name}
                                </div>
                            ))}
                        </div>
                      </div>
                  </>
              )}
            </div>
          )}

          {/* ================= TAB 2: PANTAUAN PORTOFOLIO ================= */}
          {activeTab === 'pantauan' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Pantauan Portofolio</h2>
                  <div className="mt-2 flex items-center gap-4">
                      <button onClick={() => setSelectedYear(selectedYear - 1)} className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"><ChevronUp className="w-4 h-4" /> Data Tahun Sebelumnya ({selectedYear - 1})</button>
                      <button onClick={() => setSelectedYear(selectedYear + 1)} className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Data Lanjutan ({selectedYear + 1}) <ChevronUp className="w-4 h-4 rotate-180" /></button>
                  </div>
                </div>
                <button onClick={handleSaveSnapshot} disabled={saveSnapshotMutation.isPending || activePortfolio.length === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95">
                    {saveSnapshotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} Simpan Data Bulan Ini
                </button>
              </div>

              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-x-auto shadow-lg custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4 border-b border-slate-800 sticky left-0 bg-[#0F172A] z-10">Bulan ({selectedYear})</th>
                      {activePortfolio.map((p: any) => <th key={p.dbSymbol} className="px-6 py-4 border-b border-slate-800 whitespace-nowrap">{p.dbSymbol} L/R</th>)}
                      <th className="px-6 py-4 border-b border-slate-800 text-indigo-400 whitespace-nowrap">Portfolio Wtd</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 font-medium">
                    {MONTH_NAMES.slice(firstInvestmentMonthIndex).map((monthName, idx) => {
                       const monthNum = firstInvestmentMonthIndex + idx + 1;
                       const snap = snapshots.find((s: any) => s.month === monthNum && s.year === selectedYear);
                       if (!snap) return (<tr key={monthName} className="border-b border-slate-800/30"><td className="px-6 py-4 font-bold text-slate-600 sticky left-0 bg-[#1E293B] z-10">{monthName}</td><td colSpan={activePortfolio.length + 1} className="px-6 py-4 text-slate-600 text-xs italic">Belum ada snapshot disimpan</td></tr>);
                       
                       let details: Record<string, {invested: number, valuasi: number}> = {};
                       try { details = JSON.parse(snap.assetsDetail || "{}"); } catch(e) {}
                       return (
                          <tr key={monthName} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                             <td className="px-6 py-4 font-bold text-slate-200 sticky left-0 bg-[#1E293B] z-10">{monthName}</td>
                             {activePortfolio.map((p: any) => {
                                 const assetSnap = details[p.dbSymbol] || { invested: 0, valuasi: 0 };
                                 if (assetSnap.invested === 0) return <td key={p.dbSymbol} className="px-6 py-4 text-slate-600">-</td>;
                                 const plAmount = assetSnap.valuasi - assetSnap.invested;
                                 const plPct = (plAmount / assetSnap.invested);
                                 return (<td key={p.dbSymbol} className={`px-6 py-4 ${plAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}><div className="font-bold">{formatRp(plAmount)}</div><div className="text-[10px] opacity-80">({formatPct(plPct)})</div></td>);
                             })}
                             <td className="px-6 py-4 font-black">
                                 {(() => {
                                     let totalInvSnap = 0; let totalValSnap = 0;
                                     Object.values(details).forEach((d: any) => { totalInvSnap += d.invested; totalValSnap += d.valuasi; });
                                     if (totalInvSnap === 0) return <span className="text-slate-600">-</span>;
                                     const plTotalAmount = totalValSnap - totalInvSnap;
                                     return (<div className={plTotalAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}><div>{formatRp(plTotalAmount)}</div><div className="text-xs opacity-80">({formatPct(plTotalAmount / totalInvSnap)})</div></div>);
                                 })()}
                             </td>
                          </tr>
                       )
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mt-4">
                 <div className="bg-[#1E293B] p-5 rounded-2xl border border-slate-700/50 min-w-[280px] shadow-lg flex items-center justify-between">
                     <div>
                         <div className="flex items-center gap-2 mb-1">
                             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Total Laba/Rugi</p>
                             <button onClick={() => setShowProfit(!showProfit)} className="text-slate-500 hover:text-white transition-colors">{showProfit ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                         </div>
                         <p className="text-[10px] text-slate-500">Kalkulasi real-time seluruh aset saat ini</p>
                     </div>
                     <div className="text-right ml-4">
                         {showProfit ? <div className={`font-black text-2xl ${totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'} flex items-center gap-1 justify-end`}>{totalProfitLoss >= 0 ? <ArrowUpRight className="w-6 h-6"/> : <ArrowDownRight className="w-6 h-6"/>}{formatRp(Math.abs(totalProfitLoss))}</div> : <p className="font-black text-2xl text-slate-600">••••••••</p>}
                     </div>
                 </div>
              </div>

              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-lg mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-white">Grafik Kinerja Historis</h3>
                  <div className="flex gap-2">
                     <button onClick={() => setChartTimeframe('1M')} className={`px-3 py-1 rounded text-xs font-bold border ${chartTimeframe==='1M'?'bg-indigo-600 text-white border-indigo-500':'bg-[#0F172A] text-slate-400 border-slate-700'}`}>1 Bulan</button>
                     <button onClick={() => setChartTimeframe('3M')} className={`px-3 py-1 rounded text-xs font-bold border ${chartTimeframe==='3M'?'bg-indigo-600 text-white border-indigo-500':'bg-[#0F172A] text-slate-400 border-slate-700'}`}>3 Bulan</button>
                     <button onClick={() => setChartTimeframe('1Y')} className={`px-3 py-1 rounded text-xs font-bold border ${chartTimeframe==='1Y'?'bg-indigo-600 text-white border-indigo-500':'bg-[#0F172A] text-slate-400 border-slate-700'}`}>1 Tahun</button>
                     <button onClick={() => setChartTimeframe('ALL')} className={`px-3 py-1 rounded text-xs font-bold border ${chartTimeframe==='ALL'?'bg-indigo-600 text-white border-indigo-500':'bg-[#0F172A] text-slate-400 border-slate-700'}`}>Semua</button>
                  </div>
                </div>
                <div className="h-72 w-full">
                    {lineData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lineData}>
                             <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                             <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`} />
                             <Tooltip formatter={(val: number) => formatRp(val)} contentStyle={{backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px', color: '#fff', fontWeight: 'bold'}} />
                             <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1'}} name="Valuasi Total" />
                             <Line type="monotone" dataKey="Investasi" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="3 3" name="Modal Diinvestasikan" />
                          </LineChart>
                       </ResponsiveContainer>
                    ) : <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">Simpan data bulan ini untuk menggambar grafik.</div>}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: INVESTASI TEREALISASI ================= */}
          {activeTab === 'terealisasi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-2xl font-black text-white tracking-tight">Investasi Terealisasi (Evaluasi Penjualan)</h2>
              <p className="text-sm text-slate-400 mb-4">Bandingkan harga jual aset di masa lalu dengan harga aset tersebut di pasar saat ini secara live. Sistem otomatis membaca kode aset secara independen.</p>

              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4 border-b border-slate-800">Tanggal Jual</th>
                      <th className="px-6 py-4 border-b border-slate-800">Aset</th>
                      <th className="px-6 py-4 border-b border-slate-800">Nilai Penjualan</th>
                      <th className="px-6 py-4 border-b border-slate-800 text-indigo-400">Harga Live Saat Ini</th>
                      <th className="px-6 py-4 border-b border-slate-800 text-right">Status Keputusan</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 font-medium">
                    {realizedTrades.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Belum ada rekam jejak investasi yang dijual.</td></tr>
                    ) : (
                      realizedTrades.map((t: any) => {
                        const sellPriceMatch = t.description?.match(/@\s*(?:Rp\s*)?([0-9.,]+)/);
                        const sellPriceRaw = sellPriceMatch ? parseFloat(sellPriceMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;
                        
                        const isLivePriceReady = t.livePrice > 0;
                        const isGoodSell = isLivePriceReady && t.livePrice < sellPriceRaw;

                        return (
                          <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                            <td className="px-6 py-4">{new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="px-6 py-4 font-black text-white flex items-center gap-2">
                               {t.symbol} 
                               {t.isMapped ? (
                                   <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-normal">{t.marketTicker}</span>
                               ) : (
                                   <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-normal" title="Deteksi Otomatis">AUTO</span>
                               )}
                            </td>
                            <td className="px-6 py-4">
                               {formatRp(t.amount)} <br/>
                               <span className="text-[10px] text-slate-500">@ {formatRp(sellPriceRaw)} /unit</span>
                            </td>
                            <td className="px-6 py-4 text-indigo-300 font-bold">
                               {isLivePricesLoading && !isLivePriceReady ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500"/> : (t.livePrice ? formatRp(t.livePrice) : <span className="text-slate-600">N/A</span>)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {!isLivePriceReady ? <span className="text-[10px] text-slate-600">Menunggu...</span> : isGoodSell ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">✅ Tepat Waktu</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-400/10 px-2 py-1 rounded">❌ Terlalu Cepat</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}