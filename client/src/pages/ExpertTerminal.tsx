import React, { useState, useMemo } from "react";
import { 
  LayoutDashboard, PieChart as PieIcon, TrendingUp, History, Settings, Eye, EyeOff, Search,
  ArrowUpRight, ArrowDownRight, ChevronUp, Loader2, Save
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

  const cashBalance = user?.cashBalance || 0;

  const portfolio = useMemo(() => {
    const agg: Record<string, { qty: number, totalInvested: number, symbol: string }> = {};
    investments.forEach(inv => {
      const sym = inv.symbol.split('|')[0];
      if (!agg[sym]) agg[sym] = { qty: 0, totalInvested: 0, symbol: sym };
      agg[sym].qty += inv.quantity;
      agg[sym].totalInvested += (inv.quantity * inv.avgPrice * (inv.type === 'saham' || sym.length === 4 ? 100 : 1));
    });
    return Object.values(agg);
  }, [investments]);

  const realizedTradesBase = useMemo(() => {
    return transactions.filter(t => t.type === 'invest_sell').map(t => {
      const match = t.description?.match(/([A-Z0-9]+)\s+@/);
      const symbol = match ? match[1] : 'Unknown';
      return { ...t, symbol };
    });
  }, [transactions]);

  const uniqueSymbolsToFetch = useMemo(() => {
    const syms = new Set<string>();
    portfolio.forEach(p => syms.add(p.symbol));
    realizedTradesBase.forEach(t => { if (t.symbol !== 'Unknown') syms.add(t.symbol); });
    return Array.from(syms);
  }, [portfolio, realizedTradesBase]);

  const { data: livePrices = {}, isLoading: isLivePricesLoading } = useLiveQuotes(uniqueSymbolsToFetch);

  const totalAssetValue = portfolio.reduce((acc, p) => {
    const livePrice = livePrices[p.symbol] || (p.totalInvested / p.qty); 
    const multiplier = p.symbol.length === 4 ? 100 : 1;
    return acc + (p.qty * livePrice * multiplier);
  }, 0);

  const totalInvested = portfolio.reduce((acc, p) => acc + p.totalInvested, 0);
  const totalProfitLoss = totalAssetValue - totalInvested;
  const totalWealth = cashBalance + totalAssetValue;

  const realizedTrades = useMemo(() => {
    return realizedTradesBase.map(t => ({
        ...t,
        livePrice: livePrices[t.symbol] || 0
    }));
  }, [realizedTradesBase, livePrices]);

  // Siapkan Data untuk Recharts (Pie Chart)
  const pieData = [
    { name: 'Cash Tunai', value: cashBalance },
    ...portfolio.map(p => {
       const livePrice = livePrices[p.symbol] || (p.totalInvested / p.qty);
       const multiplier = p.symbol.length === 4 ? 100 : 1;
       return { name: p.symbol, value: (p.qty * livePrice * multiplier) };
    })
  ].filter(d => d.value > 0);

  // Siapkan Data untuk Recharts (Line Chart)
  const lineData = [...snapshots].reverse().map(s => ({
      name: `${MONTH_NAMES[s.month - 1]} ${s.year}`,
      Total: s.totalValue,
      Investasi: s.investValue
  }));

  const formatRp = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  const formatPct = (num: number) => `${(num * 100).toFixed(2)}%`;

  // Fungsi Action Simpan Snapshot
  const handleSaveSnapshot = () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      const assetsDetail = portfolio.reduce((acc, p) => {
         const livePrice = livePrices[p.symbol] || (p.totalInvested / p.qty);
         const multiplier = p.symbol.length === 4 ? 100 : 1;
         acc[p.symbol] = p.qty * livePrice * multiplier;
         return acc;
      }, {} as Record<string, number>);

      saveSnapshotMutation.mutate({
          month, year, cashBalance, investValue: totalAssetValue, totalValue: totalWealth, assetsDetail: JSON.stringify(assetsDetail)
      }, {
          onSuccess: () => toast({ title: "Tersimpan", description: `Data portofolio bulan ${MONTH_NAMES[month-1]} ${year} berhasil direkam.` })
      });
  };

  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-300 font-sans overflow-hidden">
      
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
                   {isLivePricesLoading ? (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                   ) : (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   )}
                   <span className={`relative inline-flex rounded-full h-2 w-2 ${isLivePricesLoading ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                </span>
                Data Market
             </span>
             <span className={isLivePricesLoading ? 'text-amber-400' : 'text-emerald-400'}>
                {isLivePricesLoading ? 'Syncing...' : 'LIVE'}
             </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0F172A]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 bg-[#1E293B] px-4 py-2 rounded-full border border-slate-700/50 w-96 focus-within:border-indigo-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Ketik nama aset (Cth: BBCA, TSLA)..." className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-500 font-medium" />
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Kas (Cash)</p>
              <p className="text-white font-bold text-lg">{formatRp(cashBalance)}</p>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Aset Investasi</p>
              <div className="flex items-center gap-2 justify-end">
                  <p className="text-white font-black text-xl text-indigo-400">{formatRp(totalAssetValue)}</p>
                  {isLivePricesLoading && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* ================= TAB 1: ALOKASI ASET ================= */}
          {activeTab === 'alokasi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-2xl font-black text-white tracking-tight">Peta Alokasi Kekayaan</h2>
              
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4 border-b border-slate-800">Kategori</th>
                      <th className="px-6 py-4 border-b border-slate-800 text-emerald-400">Cash (Tunai)</th>
                      {portfolio.map(p => (
                        <th key={p.symbol} className="px-6 py-4 border-b border-slate-800">
                           {p.symbol} 
                           {livePrices[p.symbol] === undefined && !isLivePricesLoading && <span className="ml-1 text-rose-500" title="Data harga tidak ditemukan">⚠️</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-200 font-medium">
                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="px-6 py-4 font-bold text-slate-400">Nilai Aset</td>
                      <td className="px-6 py-4">{formatRp(cashBalance)}</td>
                      {portfolio.map(p => {
                        const livePrice = livePrices[p.symbol] || (p.totalInvested / p.qty);
                        const multiplier = p.symbol.length === 4 ? 100 : 1;
                        return <td key={p.symbol} className="px-6 py-4">{formatRp(p.qty * livePrice * multiplier)}</td>
                      })}
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="px-6 py-4 font-bold text-slate-400">Persentase</td>
                      <td className="px-6 py-4 text-emerald-400 font-bold">{totalWealth > 0 ? formatPct(cashBalance / totalWealth) : '0%'}</td>
                      {portfolio.map(p => {
                         const livePrice = livePrices[p.symbol] || (p.totalInvested / p.qty);
                         const multiplier = p.symbol.length === 4 ? 100 : 1;
                         const val = (p.qty * livePrice * multiplier);
                         return <td key={p.symbol} className="px-6 py-4 text-indigo-400 font-bold">{totalWealth > 0 ? formatPct(val / totalWealth) : '0%'}</td>
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 🚀 CHART VISUALISASI RECHARTS */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[350px] shadow-lg">
                <div className="w-full max-w-sm h-64 relative">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                            {pieData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                         </Pie>
                         <Tooltip formatter={(val: number) => formatRp(val)} contentStyle={{backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px', color: '#fff'}} itemStyle={{color: '#fff', fontWeight: 'bold'}} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 justify-center mt-4">
                    {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs font-bold text-slate-400">
                           <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></span>
                           {d.name}
                        </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PANTAUAN PORTOFOLIO ================= */}
          {activeTab === 'pantauan' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Pantauan Portofolio</h2>
                  <div className="mt-2 flex items-center gap-4">
                      <button onClick={() => setSelectedYear(selectedYear - 1)} className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                        <ChevronUp className="w-4 h-4" /> Data ({selectedYear - 1})
                      </button>
                      <button onClick={() => setSelectedYear(selectedYear + 1)} className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                        Data ({selectedYear + 1}) <ChevronUp className="w-4 h-4 rotate-180" />
                      </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                   {/* Tombol Simpan Snapshot Bulanan */}
                   <button 
                       onClick={handleSaveSnapshot} 
                       disabled={saveSnapshotMutation.isPending}
                       className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
                   >
                       {saveSnapshotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                       Simpan Data Bulan Ini
                   </button>

                   <div className="text-right bg-[#1E293B] p-4 rounded-xl border border-slate-700/50 min-w-[200px]">
                     <div className="flex items-center gap-2 justify-end mb-1">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Laba/Rugi</p>
                       <button onClick={() => setShowProfit(!showProfit)} className="text-slate-500 hover:text-white transition-colors">
                         {showProfit ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                       </button>
                     </div>
                     {showProfit ? (
                       <p className={`font-black text-lg ${totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'} flex items-center gap-1 justify-end`}>
                         {totalProfitLoss >= 0 ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                         {formatRp(Math.abs(totalProfitLoss))}
                       </p>
                     ) : (
                       <p className="font-black text-lg text-slate-600">Rp ••••••••</p>
                     )}
                   </div>
                </div>
              </div>

              {/* Tabel Bulanan Terhubung Database */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4 border-b border-slate-800">Bulan ({selectedYear})</th>
                      {portfolio.map(p => <th key={p.symbol} className="px-6 py-4 border-b border-slate-800">{p.symbol} %</th>)}
                      <th className="px-6 py-4 border-b border-slate-800 text-emerald-400">Cash %</th>
                      <th className="px-6 py-4 border-b border-slate-800 text-indigo-400">Valuasi Portfolio</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 font-medium">
                    {MONTH_NAMES.map((monthName, idx) => {
                       const monthNum = idx + 1;
                       const snap = snapshots.find(s => s.month === monthNum && s.year === selectedYear);
                       
                       if (!snap) {
                          return (
                             <tr key={monthName} className="border-b border-slate-800/30">
                                <td className="px-6 py-4 font-bold text-slate-600">{monthName}</td>
                                <td colSpan={portfolio.length + 2} className="px-6 py-4 text-slate-600 text-xs italic">Belum ada snapshot disimpan</td>
                             </tr>
                          )
                       }

                       let details: Record<string, number> = {};
                       try { details = JSON.parse(snap.assetsDetail || "{}"); } catch(e) {}

                       return (
                          <tr key={monthName} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                             <td className="px-6 py-4 font-bold text-slate-200">{monthName}</td>
                             {portfolio.map(p => {
                                 const val = details[p.symbol] || 0;
                                 const pct = snap.totalValue > 0 ? (val / snap.totalValue) * 100 : 0;
                                 return <td key={p.symbol} className="px-6 py-4 text-slate-400">{pct.toFixed(1)}%</td>
                             })}
                             <td className="px-6 py-4 text-emerald-400 font-bold">
                                 {snap.totalValue > 0 ? ((snap.cashBalance / snap.totalValue) * 100).toFixed(1) : 0}%
                             </td>
                             <td className="px-6 py-4 font-black text-indigo-400">
                                 {formatRp(snap.totalValue)}
                             </td>
                          </tr>
                       )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 🚀 CHART KINERJA PERTUMBUHAN (LINE CHART) */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-white">Grafik Kinerja Historis</h3>
                  <div className="flex gap-2">
                     <span className="px-3 py-1 rounded bg-[#0F172A] text-xs font-bold text-slate-400 border border-slate-700">Grafik ditarik dari Snapshot Bulanan</span>
                  </div>
                </div>
                <div className="h-72 w-full">
                    {lineData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lineData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                             <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                             <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`} />
                             <Tooltip formatter={(val: number) => formatRp(val)} contentStyle={{backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px', color: '#fff', fontWeight: 'bold'}} />
                             <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2}} activeDot={{r: 6}} />
                             <Line type="monotone" dataKey="Investasi" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                          </LineChart>
                       </ResponsiveContainer>
                    ) : (
                       <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-700 rounded-xl text-slate-500 font-medium text-sm">
                           Simpan data bulan ini untuk mulai menggambar grafik.
                       </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: INVESTASI TEREALISASI ================= */}
          {activeTab === 'terealisasi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-2xl font-black text-white tracking-tight">Investasi Terealisasi (Evaluasi Penjualan)</h2>
              <p className="text-sm text-slate-400 mb-4">Bandingkan harga jual aset di masa lalu dengan harga aset tersebut di pasar saat ini secara live.</p>

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
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Belum ada rekam jejak investasi yang dijual.</td>
                      </tr>
                    ) : (
                      realizedTrades.map(t => {
                        const sellPriceMatch = t.description?.match(/@\s*(?:Rp\s*)?([0-9.,]+)/);
                        const sellPriceRaw = sellPriceMatch ? parseFloat(sellPriceMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;
                        
                        const isLivePriceReady = t.livePrice > 0;
                        const isGoodSell = isLivePriceReady && t.livePrice < sellPriceRaw;

                        return (
                          <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                            <td className="px-6 py-4">{new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="px-6 py-4 font-bold text-white">{t.symbol}</td>
                            <td className="px-6 py-4">
                               {formatRp(t.amount)} <br/>
                               <span className="text-[10px] text-slate-500">@ {formatRp(sellPriceRaw)}</span>
                            </td>
                            <td className="px-6 py-4 text-indigo-300 font-bold">
                               {isLivePricesLoading && !isLivePriceReady ? (
                                   <Loader2 className="w-4 h-4 animate-spin text-indigo-500"/>
                               ) : (
                                   t.livePrice ? formatRp(t.livePrice) : <span className="text-slate-600">N/A</span>
                               )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {!isLivePriceReady ? (
                                 <span className="text-xs text-slate-600">Menunggu...</span>
                              ) : isGoodSell ? (
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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0B0F19; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}