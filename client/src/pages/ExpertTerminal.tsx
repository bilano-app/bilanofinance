import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  LayoutDashboard, PieChart as PieIcon, TrendingUp, History, Eye, EyeOff, Search,
  ArrowUpRight, ArrowDownRight, ChevronUp, Loader2, Save, X, Edit3
} from "lucide-react";
import { useUser, useInvestments, useTransactions, useLiveQuotes, useHistoricalQuotes, usePortfolioSnapshots, useSaveSnapshot } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useQuery } from "@tanstack/react-query";

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

  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const { data: forexRates = {} } = useQuery({
      queryKey: ['forexRates', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const [tickerOverrides, setTickerOverrides] = useState<Record<string, string>>(() => {
      const saved = localStorage.getItem('bilano_ticker_overrides');
      return saved ? JSON.parse(saved) : {};
  });
  const [editTickerModal, setEditTickerModal] = useState<string | null>(null);
  const [tempTicker, setTempTicker] = useState("");

  // Bersihkan override yang rusak secara diam-diam
  useEffect(() => {
      const cleanOverrides = { ...tickerOverrides };
      let changed = false;
      Object.keys(cleanOverrides).forEach(key => {
         if (cleanOverrides[key] === 'QQQM.JK' || cleanOverrides[key] === 'IVV.JK') {
             cleanOverrides[key] = key;
             changed = true;
         }
      });
      if (changed) setTickerOverrides(cleanOverrides);
      localStorage.setItem('bilano_ticker_overrides', JSON.stringify(cleanOverrides));
  }, [tickerOverrides]);

  const cashBalance = user?.cashBalance || 0;

  // ====================================================================
  // 1. 🚀 LOGIKA PINTAR: Tarik Seluruh Portofolio (BUG MULTIPLIER FIXED)
  // ====================================================================
  const activePortfolio = useMemo(() => {
    const agg: Record<string, { qty: number, totalModalIDR: number, symbol: string, currency: string, activeTicker: string, liveMultiplier: number }> = {};
    
    investments.forEach((inv: any) => {
      const parts = (inv.symbol || "").split('|');
      const sym = parts[0].trim().toUpperCase();
      const curr = parts[1] || 'IDR';
      const isIDR = curr === 'IDR';
      const typeLower = (inv.type || 'saham').toLowerCase();
      
      const isStock = typeLower === 'saham' || (!inv.type && sym.length === 4);
      
      // 🚀 KUNCI PERBAIKAN: Hanya kalikan 100 jika dia Saham DAN mata uangnya Rupiah
      const multiplier = (isStock && isIDR) ? 100 : 1; 

      // 🚀 KUNCI PERBAIKAN: Hanya tambah .JK jika dia IDR
      let defaultTicker = sym;
      if (isIDR && isStock && !sym.endsWith('.JK')) {
          defaultTicker = `${sym}.JK`;
      }
      
      const activeTicker = tickerOverrides[sym] || defaultTicker;
      const rate = isIDR ? 1 : (Number(forexRates[curr]) || 16200);

      if (!agg[sym]) agg[sym] = { qty: 0, totalModalIDR: 0, symbol: sym, currency: curr, activeTicker, liveMultiplier: multiplier };
      
      agg[sym].qty += inv.quantity;
      agg[sym].totalModalIDR += (inv.quantity * inv.avgPrice * multiplier * rate);
    });
    
    return Object.values(agg).filter(p => p.qty > 0);
  }, [investments, forexRates, tickerOverrides]);

  // ====================================================================
  // 2. 🚀 LOGIKA PINTAR: Ekstrak Data Investasi Terealisasi
  // ====================================================================
  const realizedTradesBase = useMemo(() => {
    return transactions.filter((t: any) => t.type === 'invest_sell').map((t: any) => {
      // Potong deskripsi sebelum "|" atau "@" agar kata IDR/USD tidak tertangkap
      const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
      const symbol = match ? match[1].toUpperCase().trim() : 'Unknown';
      
      const sellPriceMatch = t.description?.match(/@\s*(?:(?:Rp|USD|US\$)\s*)?([0-9.,]+)/i);
      const sellPriceRaw = sellPriceMatch ? parseFloat(sellPriceMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;

      const isUSD = t.description?.includes('USD') || t.description?.includes('US$');
      const currency = isUSD ? 'USD' : 'IDR'; 
      const isIDR = currency === 'IDR';
      const rate = isIDR ? 1 : (Number(forexRates[currency]) || 16200);
      
      const sellPriceIDR = sellPriceRaw * rate;

      const isStock = symbol.length === 4; 
      const defaultTicker = (isIDR && isStock && !symbol.endsWith('.JK')) ? `${symbol}.JK` : symbol;
      const activeTicker = tickerOverrides[symbol] || defaultTicker;

      return { ...t, symbol, currency, sellPriceIDR, activeTicker, isIDR, isStock };
    });
  }, [transactions, forexRates, tickerOverrides]);

  // Tentukan Kode Ticker untuk API
  const uniqueTickersToFetch = useMemo(() => {
    const tickers = new Set<string>();
    activePortfolio.forEach(p => tickers.add(p.activeTicker));
    realizedTradesBase.forEach((t: any) => {
        if (t.symbol !== 'Unknown') tickers.add(t.activeTicker);
    });
    return Array.from(tickers);
  }, [activePortfolio, realizedTradesBase]);

  const { data: livePrices = {}, isLoading: isLivePricesLoading } = useLiveQuotes(uniqueTickersToFetch);
  const { data: historyPrices = {} } = useHistoricalQuotes(uniqueTickersToFetch, '5y');

  // Kalkulasi Live Valuasi
  const totalAssetValue = activePortfolio.reduce((acc: any, p: any) => {
    const livePriceAPI = livePrices[p.activeTicker];
    const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
    return acc + liveValuationIDR;
  }, 0);

  const totalInvested = activePortfolio.reduce((acc: any, p: any) => acc + p.totalModalIDR, 0);
  const totalProfitLoss = totalAssetValue - totalInvested;
  const totalWealth = cashBalance + totalAssetValue;

  const realizedTrades = useMemo(() => {
    return realizedTradesBase.map((t: any) => ({
        ...t,
        livePriceIDR: livePrices[t.activeTicker] || 0
    }));
  }, [realizedTradesBase, livePrices]);

  const pieData = [
    { name: 'Cash Tunai', value: cashBalance },
    ...activePortfolio.map((p: any) => {
       const livePriceAPI = livePrices[p.activeTicker];
       const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
       return { name: p.symbol, value: liveValuationIDR };
    })
  ].filter((d: any) => d.value > 0);

  // ====================================================================
  // 3. 🚀 AUTO-RECONSTRUCT HISTORI & GRAFIK HARIAN YF
  // ====================================================================
  const firstInvestmentDate = useMemo(() => {
      const investTxs = transactions.filter((t: any) => t.type === 'invest_buy');
      if (investTxs.length === 0) return new Date();
      return new Date(investTxs[investTxs.length - 1].date);
  }, [transactions]);

  const availableMonths = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      if (selectedYear > currentYear) return [];
      
      let start = 0;
      if (selectedYear === firstInvestmentDate.getFullYear()) start = firstInvestmentDate.getMonth();
      else if (selectedYear < firstInvestmentDate.getFullYear()) return []; 
      
      let end = 11;
      if (selectedYear === currentYear) end = currentMonth;
      
      return MONTH_NAMES.map((name, idx) => ({ name, monthNum: idx + 1 })).slice(start, end + 1);
  }, [selectedYear, firstInvestmentDate]);

  // Fungsi Tabel: Mendapatkan nilai akhir bulan
  const getMonthData = useCallback((monthNum: number, year: number) => {
      const snap = snapshots.find((s: any) => s.month === monthNum && s.year === year);
      if (snap) {
          let details = {};
          try { details = JSON.parse(snap.assetsDetail || "{}"); } catch(e) {}
          return { isSaved: true, totalValue: snap.totalValue, investValue: snap.investValue, details };
      }
      
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59);
      const pastTx = transactions.filter((t:any) => new Date(t.date) <= endOfMonth);
      
      const qtyMap: Record<string, { qty: number, investedIDR: number }> = {};
      pastTx.forEach((t:any) => {
          if (t.type === 'invest_buy' || t.type === 'invest_sell') {
              const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
              if (match) {
                  const sym = match[1].toUpperCase().trim();
                  const qtyMatch = t.description?.match(/([0-9.,]+)\s+lot\/unit/i);
                  const qtyStr = qtyMatch ? qtyMatch[1].replace(/\./g, '').replace(/,/g, '.') : "0";
                  const qty = parseFloat(qtyStr);
                  
                  if (!qtyMap[sym]) qtyMap[sym] = { qty: 0, investedIDR: 0 };
                  if (t.type === 'invest_buy') {
                      qtyMap[sym].qty += qty;
                      qtyMap[sym].investedIDR += t.amount;
                  } else {
                      qtyMap[sym].qty -= qty;
                      qtyMap[sym].investedIDR = Math.max(0, qtyMap[sym].investedIDR - t.amount); 
                  }
              }
          }
      });
      
      let details: Record<string, {invested: number, valuasi: number}> = {};
      let totalInv = 0; let totalVal = 0;
      
      Object.keys(qtyMap).forEach(sym => {
          if (qtyMap[sym].qty > 0) {
              const currentAsset = activePortfolio.find((p: any) => p.symbol === sym);
              const activeTicker = currentAsset ? currentAsset.activeTicker : (tickerOverrides[sym] || (sym.length === 4 ? `${sym}.JK` : sym));
              const liveMultiplier = currentAsset ? currentAsset.liveMultiplier : (activeTicker.endsWith('.JK') ? 100 : 1);
              const livePriceAPI = livePrices[activeTicker];
              
              const valuasi = livePriceAPI ? (qtyMap[sym].qty * livePriceAPI * liveMultiplier) : qtyMap[sym].investedIDR;
              details[sym] = { invested: qtyMap[sym].investedIDR, valuasi };
              totalInv += qtyMap[sym].investedIDR;
              totalVal += valuasi;
          }
      });
      
      return { isSaved: false, totalValue: totalVal, investValue: totalInv, details };
  }, [snapshots, transactions, activePortfolio, livePrices, tickerOverrides]);

  // 🚀 LOGIKA GRAFIK HARIAN (MENGGUNAKAN DATA YAHOO HISTORY)
  const chartDataDaily = useMemo(() => {
     if (activePortfolio.length === 0 || Object.keys(historyPrices).length === 0) return [];

     // Kumpulkan dan parse semua transaksi investasi sekali saja
     const parsedInvestTxs = transactions.filter((t: any) => t.type === 'invest_buy' || t.type === 'invest_sell').map((t: any) => {
         const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
         const sym = match ? match[1].toUpperCase().trim() : 'Unknown';
         const qtyMatch = t.description?.match(/([0-9.,]+)\s+lot\/unit/i);
         const qty = qtyMatch ? parseFloat(qtyMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;
         const dateStr = new Date(t.date).toISOString().split('T')[0];
         return { ...t, parsedSymbol: sym, parsedQty: qty, dateStr };
     });

     if (parsedInvestTxs.length === 0) return [];

     const minDate = new Date(parsedInvestTxs[parsedInvestTxs.length - 1].date);
     const ONE_DAY = 24 * 60 * 60 * 1000;
     const now = new Date().getTime();

     let startTimeframe = minDate.getTime();
     if (chartTimeframe === '1M') startTimeframe = now - 30 * ONE_DAY;
     if (chartTimeframe === '3M') startTimeframe = now - 90 * ONE_DAY;
     if (chartTimeframe === '1Y') startTimeframe = Math.max(minDate.getTime(), now - 365 * ONE_DAY);
     
     // Bersihkan jam agar tepat 00:00
     let currentTs = new Date(startTimeframe).setHours(0,0,0,0);
     const endTs = new Date().setHours(0,0,0,0);

     const txByDate: Record<string, any[]> = {};
     parsedInvestTxs.forEach((t: any) => {
         if (!txByDate[t.dateStr]) txByDate[t.dateStr] = [];
         txByDate[t.dateStr].push(t);
     });

     // Karena kita loncat waktu, kita harus re-kalkulasi kepemilikan saham pada H-1 dari startTimeframe
     let currentQty: Record<string, number> = {};
     let currentInvestedIDR: Record<string, number> = {};
     parsedInvestTxs.forEach((t: any) => {
         if (new Date(t.date).getTime() < currentTs) {
             if (!currentQty[t.parsedSymbol]) { currentQty[t.parsedSymbol] = 0; currentInvestedIDR[t.parsedSymbol] = 0; }
             if (t.type === 'invest_buy') {
                 currentQty[t.parsedSymbol] += t.parsedQty;
                 currentInvestedIDR[t.parsedSymbol] += t.amount;
             } else {
                 currentQty[t.parsedSymbol] = Math.max(0, currentQty[t.parsedSymbol] - t.parsedQty);
                 currentInvestedIDR[t.parsedSymbol] = Math.max(0, currentInvestedIDR[t.parsedSymbol] - t.amount);
             }
         }
     });

     const dailyData = [];

     const getPriceForDate = (ticker: string, targetTs: number) => {
         const hist = historyPrices[ticker];
         if (!hist || !hist.timestamps || hist.timestamps.length === 0) return null;
         const targetSec = targetTs / 1000;
         let closestPrice = hist.close[hist.close.length - 1]; 
         for(let i = hist.timestamps.length-1; i >= 0; i--) {
             if (hist.timestamps[i] <= targetSec + 86400) { 
                 closestPrice = hist.close[i];
                 break;
             }
         }
         return closestPrice;
     };

     while(currentTs <= endTs) {
         const dateStr = new Date(currentTs).toISOString().split('T')[0];
         const dayTxs = txByDate[dateStr];
         if (dayTxs) {
             dayTxs.forEach(t => {
                 if (!currentQty[t.parsedSymbol]) { currentQty[t.parsedSymbol] = 0; currentInvestedIDR[t.parsedSymbol] = 0; }
                 if (t.type === 'invest_buy') {
                     currentQty[t.parsedSymbol] += t.parsedQty;
                     currentInvestedIDR[t.parsedSymbol] += t.amount;
                 } else {
                     currentQty[t.parsedSymbol] = Math.max(0, currentQty[t.parsedSymbol] - t.parsedQty);
                     currentInvestedIDR[t.parsedSymbol] = Math.max(0, currentInvestedIDR[t.parsedSymbol] - t.amount);
                 }
             });
         }

         let dailyValuation = 0;
         let dailyInvested = 0;

         Object.keys(currentQty).forEach(sym => {
             if (currentQty[sym] > 0) {
                 const assetMeta = activePortfolio.find((p: any) => p.symbol === sym);
                 const ticker = assetMeta ? assetMeta.activeTicker : (tickerOverrides[sym] || (sym.length === 4 ? `${sym}.JK` : sym));
                 const multiplier = assetMeta ? assetMeta.liveMultiplier : (ticker.endsWith('.JK') ? 100 : 1);

                 const price = getPriceForDate(ticker, currentTs);
                 if (price) dailyValuation += currentQty[sym] * price * multiplier;
                 else dailyValuation += currentInvestedIDR[sym]; 
                 
                 dailyInvested += currentInvestedIDR[sym];
             }
         });

         dailyData.push({
             name: new Date(currentTs).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
             Total: dailyValuation,
             Investasi: dailyInvested
         });

         currentTs += ONE_DAY;
     }

     return dailyData;
  }, [historyPrices, transactions, activePortfolio, tickerOverrides, chartTimeframe]);

  const formatRp = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  const formatPct = (num: number) => `${num > 0 ? '+' : ''}${(num * 100).toFixed(2)}%`;

  const handleSaveSnapshot = () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      const assetsDetail = activePortfolio.reduce((acc: any, p: any) => {
         const livePriceAPI = livePrices[p.activeTicker];
         const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
         acc[p.symbol] = { invested: p.totalModalIDR, valuasi: liveValuationIDR };
         return acc;
      }, {} as Record<string, {invested: number, valuasi: number}>);

      saveSnapshotMutation.mutate({
          month, year, cashBalance, investValue: totalAssetValue, totalValue: totalWealth, assetsDetail: JSON.stringify(assetsDetail)
      }, {
          onSuccess: () => toast({ title: "Tersimpan", description: `Data portofolio bulan ${MONTH_NAMES[month-1]} ${year} berhasil direkam permanen.` })
      });
  };

  const saveTickerOverride = () => {
      if (editTickerModal && tempTicker) {
          setTickerOverrides({ ...tickerOverrides, [editTickerModal]: tempTicker.toUpperCase() });
          setEditTickerModal(null);
          toast({ title: "Ticker Diperbarui", description: `Sistem sekarang melacak ${tempTicker.toUpperCase()}` });
      }
  };

  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-300 font-sans overflow-hidden">
      
      {editTickerModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
             <div className="bg-[#1E293B] border border-slate-700 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative">
                <button onClick={() => setEditTickerModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <Edit3 className="w-8 h-8 text-amber-400"/>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Koreksi Ticker Aset</h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                   Sistem tidak menemukan harga pasar untuk <b>{editTickerModal}</b>. Silakan perbaiki dengan kode ticker yang valid di Yahoo Finance.
                </p>
                <div className="space-y-2 mb-8">
                   <label className="text-xs font-bold text-slate-400 uppercase ml-1">Ketik Kode Ticker Baru</label>
                   <input 
                       type="text" 
                       value={tempTicker} 
                       onChange={e => setTempTicker(e.target.value)}
                       placeholder="Cth: ANTM.JK / BTC-USD / QQQM"
                       className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold outline-none focus:border-indigo-500 uppercase transition-colors"
                   />
                </div>
                <button onClick={saveTickerOverride} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-full transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                   SIMPAN & HUBUNGKAN
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
          <div>
              <h2 className="text-lg font-black text-white tracking-tight">Status Portofolio</h2>
              <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-xs text-emerald-400 font-bold">Auto-Sync PWA Aktif</p>
              </div>
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
                  </div>
              </div>
              
              {activePortfolio.length === 0 ? (
                  <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-lg">
                      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4"><PieIcon className="w-8 h-8 text-slate-500" /></div>
                      <h3 className="text-lg font-bold text-white mb-2">Belum Ada Investasi</h3>
                      <p className="text-slate-400 text-sm max-w-sm leading-relaxed">Catat pembelian aset pertama Anda di fitur Investasi pada aplikasi PWA, dan sistem ini akan menyedot datanya secara otomatis.</p>
                  </div>
              ) : (
                  <>
                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-x-auto shadow-lg custom-scrollbar pb-2">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="px-6 py-4 border-b border-slate-800 whitespace-nowrap sticky left-0 bg-[#0F172A] z-10">Kategori</th>
                              <th className="px-6 py-4 border-b border-slate-800 text-emerald-400 whitespace-nowrap">Cash (Tunai)</th>
                              {activePortfolio.map((p: any) => {
                                 const isError = livePrices[p.activeTicker] === undefined && !isLivePricesLoading;
                                 return (
                                    <th key={p.symbol} className="px-6 py-4 border-b border-slate-800 whitespace-nowrap group">
                                       <div className="flex items-center gap-2">
                                           {p.symbol} 
                                           <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-medium">{p.activeTicker}</span>
                                           {isError ? (
                                              <button onClick={() => { setTempTicker(p.activeTicker); setEditTickerModal(p.symbol); }} className="text-rose-500 hover:text-rose-400 transition-colors bg-rose-500/10 px-1.5 py-0.5 rounded flex items-center gap-1" title="Perbaiki Ticker">
                                                 ⚠️ Error
                                              </button>
                                           ) : (
                                              <button onClick={() => { setTempTicker(p.activeTicker); setEditTickerModal(p.symbol); }} className="text-indigo-400 hover:text-indigo-300 transition-colors opacity-0 group-hover:opacity-100 bg-indigo-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><Edit3 className="w-3 h-3"/> Edit</button>
                                           )}
                                       </div>
                                    </th>
                                 );
                              })}
                            </tr>
                          </thead>
                          <tbody className="text-slate-200 font-medium">
                            <tr className="border-b border-slate-800/50 hover:bg-slate-800/20">
                              <td className="px-6 py-4 font-bold text-slate-400 sticky left-0 bg-[#1E293B] z-10">Nilai Aset (Live)</td>
                              <td className="px-6 py-4">{formatRp(cashBalance)}</td>
                              {activePortfolio.map((p: any) => {
                                const livePriceAPI = livePrices[p.activeTicker];
                                const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
                                return <td key={p.symbol} className="px-6 py-4">{formatRp(liveValuationIDR)}</td>
                              })}
                            </tr>
                            <tr className="hover:bg-slate-800/20">
                              <td className="px-6 py-4 font-bold text-slate-400 sticky left-0 bg-[#1E293B] z-10">Persentase</td>
                              <td className="px-6 py-4 text-emerald-400 font-bold">{totalWealth > 0 ? formatPct(cashBalance / totalWealth) : '0%'}</td>
                              {activePortfolio.map((p: any) => {
                                 const livePriceAPI = livePrices[p.activeTicker];
                                 const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
                                 return <td key={p.symbol} className="px-6 py-4 text-indigo-400 font-bold">{totalWealth > 0 ? formatPct(liveValuationIDR / totalWealth) : '0%'}</td>
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
                <button onClick={handleSaveSnapshot} disabled={saveSnapshotMutation.isPending || activePortfolio.length === 0} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95">
                    {saveSnapshotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} Simpan Permanen Bulan Ini
                </button>
              </div>

              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-x-auto shadow-lg custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4 border-b border-slate-800 sticky left-0 bg-[#0F172A] z-10">Bulan ({selectedYear})</th>
                      {activePortfolio.map((p: any) => <th key={p.symbol} className="px-6 py-4 border-b border-slate-800 whitespace-nowrap">{p.symbol} L/R</th>)}
                      <th className="px-6 py-4 border-b border-slate-800 text-indigo-400 whitespace-nowrap">Portfolio Wtd</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 font-medium">
                    {availableMonths.length === 0 ? (
                       <tr><td colSpan={activePortfolio.length + 2} className="px-6 py-12 text-center text-slate-500 italic">Belum ada aktivitas investasi pada tahun {selectedYear}.</td></tr>
                    ) : (
                       availableMonths.map((m) => {
                          const data = getMonthData(m.monthNum, selectedYear);
                          const details = data.details as Record<string, {invested: number, valuasi: number}>;
                          
                          return (
                             <tr key={m.name} className={`border-b border-slate-800/50 hover:bg-slate-800/20 ${!data.isSaved ? 'opacity-80' : ''}`}>
                                <td className="px-6 py-4 font-bold text-slate-200 sticky left-0 bg-[#1E293B] z-10 flex items-center justify-between">
                                    {m.name} {!data.isSaved && <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1 rounded ml-2" title="Belum Disimpan (Dihitung Otomatis dari Transaksi Lalu)">AUTO</span>}
                                </td>
                                {activePortfolio.map((p: any) => {
                                    const assetSnap = details[p.symbol] || { invested: 0, valuasi: 0 };
                                    if (assetSnap.invested === 0) return <td key={p.symbol} className="px-6 py-4 text-slate-600">-</td>;
                                    
                                    const plAmount = assetSnap.valuasi - assetSnap.invested;
                                    const plPct = (plAmount / assetSnap.invested);
                                    return (
                                        <td key={p.symbol} className={`px-6 py-4 ${plAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            <div className="font-bold">{formatRp(plAmount)}</div>
                                            <div className="text-[10px] opacity-80">({formatPct(plPct)})</div>
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-4 font-black">
                                    {(() => {
                                        if (data.investValue === 0) return <span className="text-slate-600">-</span>;
                                        const plTotalAmount = data.totalValue - data.investValue;
                                        return (
                                            <div className={plTotalAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                                <div>{formatRp(plTotalAmount)}</div>
                                                <div className="text-xs opacity-80">({formatPct(plTotalAmount / data.investValue)})</div>
                                            </div>
                                        );
                                    })()}
                                </td>
                             </tr>
                          )
                       })
                    )}
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
                     <button onClick={() => setChartTimeframe('1M')} className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${chartTimeframe==='1M'?'bg-indigo-600 text-white border-indigo-500':'bg-[#0F172A] text-slate-400 border-slate-700 hover:border-slate-500'}`}>1 Bulan</button>
                     <button onClick={() => setChartTimeframe('3M')} className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${chartTimeframe==='3M'?'bg-indigo-600 text-white border-indigo-500':'bg-[#0F172A] text-slate-400 border-slate-700 hover:border-slate-500'}`}>3 Bulan</button>
                     <button onClick={() => setChartTimeframe('1Y')} className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${chartTimeframe==='1Y'?'bg-indigo-600 text-white border-indigo-500':'bg-[#0F172A] text-slate-400 border-slate-700 hover:border-slate-500'}`}>1 Tahun</button>
                     <button onClick={() => setChartTimeframe('ALL')} className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${chartTimeframe==='ALL'?'bg-indigo-600 text-white border-indigo-500':'bg-[#0F172A] text-slate-400 border-slate-700 hover:border-slate-500'}`}>Semua</button>
                  </div>
                </div>
                <div className="h-72 w-full">
                    {chartDataDaily.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartDataDaily}>
                             <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                             <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}M`} />
                             <Tooltip formatter={(val: number) => formatRp(val)} contentStyle={{backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px', color: '#fff', fontWeight: 'bold'}} />
                             <CartesianGrid stroke="#1E293B" vertical={false} />
                             <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{r: 6, fill: '#6366f1', strokeWidth: 0}} name="Valuasi Total" />
                             <Line type="monotone" dataKey="Investasi" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="3 3" name="Modal Diinvestasikan" />
                          </LineChart>
                       </ResponsiveContainer>
                    ) : <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">Menunggu sinkronisasi data riwayat transaksi harian...</div>}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: INVESTASI TEREALISASI ================= */}
          {activeTab === 'terealisasi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-2xl font-black text-white tracking-tight">Investasi Terealisasi (Evaluasi Penjualan)</h2>
              <p className="text-sm text-slate-400 mb-4">Bandingkan harga jual aset di masa lalu dengan harga aset tersebut di pasar saat ini secara live. Sistem otomatis membaca histori penjualan Anda.</p>

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
                        const isLivePriceReady = t.livePriceIDR > 0;
                        const livePricePerShare = t.livePriceIDR;
                        const multiplier = (t.isStock && t.isIDR) ? 100 : 1; 
                        const sellPricePerShare = t.sellPriceIDR / multiplier;
                        
                        // Keputusan Tepat = Harga di Pasar saat ini LEBIH RENDAH dari harga saat user nge-jual dulu (user jual di pucuk)
                        const isGoodSell = isLivePriceReady && livePricePerShare < sellPricePerShare;

                        return (
                          <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                            <td className="px-6 py-4">{new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="px-6 py-4 font-black text-white flex items-center gap-2">
                               {t.symbol} 
                               <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-normal">{t.activeTicker}</span>
                               {!isLivePriceReady && !isLivePricesLoading && (
                                   <button onClick={() => { setTempTicker(t.activeTicker); setEditTickerModal(t.symbol); }} className="text-rose-500 hover:text-rose-400 transition-colors bg-rose-500/10 px-1.5 py-0.5 rounded flex items-center gap-1" title="Perbaiki Ticker">⚠️ Error</button>
                               )}
                            </td>
                            <td className="px-6 py-4">
                               {formatRp(t.amount)} <br/>
                               <span className="text-[10px] text-slate-500">Modal Jual: @ {formatRp(sellPricePerShare)}</span>
                            </td>
                            <td className="px-6 py-4 text-indigo-300 font-bold">
                               {isLivePricesLoading && !isLivePriceReady ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500"/> : (isLivePriceReady ? formatRp(livePricePerShare * multiplier) : <span className="text-slate-600">N/A</span>)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {!isLivePriceReady ? <span className="text-[10px] text-slate-600">Menunggu API...</span> : isGoodSell ? (
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