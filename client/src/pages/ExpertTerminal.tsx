import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Fingerprint, Layers, Radar, Scale, VenetianMask, ShieldAlert,
  ArrowUpRight, ArrowDownRight, ChevronUp, Orbit, Database, X, Wrench, ScanSearch, Radio
} from "lucide-react";
import { useUser, useInvestments, useTransactions, useLiveQuotes, useHistoricalQuotes, usePortfolioSnapshots, useSaveSnapshot } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line } from 'recharts';
import { useQuery } from "@tanstack/react-query";

// Tema warna profesional (High Contrast & Neon)
const COLORS = ['#22C55E', '#06B6D4', '#8B5CF6', '#F59E0B', '#F43F5E', '#6366f1', '#EAB308'];
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
  const [chartTimeframe, setChartTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'>('1M');

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
  const [assetDetailModal, setAssetDetailModal] = useState<any | null>(null);

  useEffect(() => {
      localStorage.setItem('bilano_ticker_overrides', JSON.stringify(tickerOverrides));
  }, [tickerOverrides]);

  const cashBalance = user?.cashBalance || 0;

  const chronologicalTxs = useMemo(() => {
      return [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  const uniqueTickersToFetch = useMemo(() => {
    const tickers = new Set<string>();
    tickers.add("IDR=X");

    investments.forEach((inv: any) => {
        const parts = (inv.symbol || "").split('|');
        const sym = parts[0].trim().toUpperCase();
        const curr = parts[1] || 'IDR';
        const isIDR = curr === 'IDR';
        const typeLower = (inv.type || 'saham').toLowerCase();
        
        const isStock = typeLower === 'saham' || (!inv.type && sym.length === 4);
        const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(sym);
        
        const knownUS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'META', 'QQQM', 'IVV', 'VOO', 'SPY'];
        let defaultTicker = sym;
        if (isIDR && isStock && !isGold && !knownUS.includes(sym) && !sym.endsWith('.JK')) defaultTicker = `${sym}.JK`;
        
        tickers.add(tickerOverrides[sym] || defaultTicker);
    });

    chronologicalTxs.forEach((t: any) => {
        if (t.type === 'invest_sell') {
            const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
            const symbol = match ? match[1].toUpperCase().trim() : 'Unknown';
            if (symbol !== 'Unknown') {
                const isUSD = t.description?.includes('USD') || t.description?.includes('US$');
                const isIDR = !isUSD;
                const isStock = symbol.length === 4; 
                const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(symbol);
                const knownUS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'META', 'QQQM', 'IVV', 'VOO', 'SPY'];
                
                let defaultTicker = symbol;
                if (isIDR && isStock && !isGold && !knownUS.includes(symbol) && !symbol.endsWith('.JK')) defaultTicker = `${symbol}.JK`;
                tickers.add(tickerOverrides[symbol] || defaultTicker);
            }
        }
    });

    return Array.from(tickers);
  }, [investments, chronologicalTxs, tickerOverrides]);

  const { data: livePrices = {}, isLoading: isLivePricesLoading } = useLiveQuotes(uniqueTickersToFetch);
  const { data: historyPrices = {} } = useHistoricalQuotes(uniqueTickersToFetch, '5y');

  const getPriceForDate = useCallback((ticker: string, targetTs: number) => {
      const hist = historyPrices[ticker];
      if (!hist || !hist.timestamps || hist.timestamps.length === 0) return null;
      
      const targetSec = targetTs / 1000;
      let closestPrice = null; 
      
      for(let i = hist.timestamps.length-1; i >= 0; i--) {
          if (hist.timestamps[i] <= targetSec + 86400) { 
              if (hist.close[i] !== null && hist.close[i] !== undefined) {
                  closestPrice = hist.close[i];
                  break;
              }
          }
      }
      return closestPrice;
  }, [historyPrices]);

  const getHistoricalRate = useCallback((targetTs: number, currency: string) => {
      if (currency === 'IDR') return 1;
      const liveRateFallback = Number(forexRates[currency]) || 16200;
      if (currency !== 'USD') return liveRateFallback;
      return getPriceForDate('IDR=X', targetTs) || liveRateFallback;
  }, [forexRates, getPriceForDate]);

  const activePortfolio = useMemo(() => {
    const agg: Record<string, { qty: number, totalModalIDR: number, symbol: string, currency: string, activeTicker: string, liveMultiplier: number, isStock: boolean, isIDR: boolean, createdAt: string }> = {};
    
    investments.forEach((inv: any) => {
      const parts = (inv.symbol || "").split('|');
      const sym = parts[0].trim().toUpperCase();
      const curr = parts[1] || 'IDR';
      const isIDR = curr === 'IDR';
      const typeLower = (inv.type || 'saham').toLowerCase();
      
      const isStock = typeLower === 'saham' || (!inv.type && sym.length === 4);
      const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(sym);
      const multiplier = (isStock && isIDR && !isGold) ? 100 : 1; 

      const knownUS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'META', 'QQQM', 'IVV', 'VOO', 'SPY'];
      let defaultTicker = sym;
      if (isIDR && isStock && !isGold && !knownUS.includes(sym) && !sym.endsWith('.JK')) defaultTicker = `${sym}.JK`;
      
      const activeTicker = tickerOverrides[sym] || defaultTicker;
      const invDateTs = inv.createdAt ? new Date(inv.createdAt).getTime() : Date.now();
      const historicalRate = isIDR ? 1 : getHistoricalRate(invDateTs, curr);

      if (!agg[sym]) {
          agg[sym] = { qty: 0, totalModalIDR: 0, symbol: sym, currency: curr, activeTicker, liveMultiplier: multiplier, isStock, isIDR, createdAt: inv.createdAt };
      } else if (inv.createdAt && new Date(inv.createdAt) < new Date(agg[sym].createdAt)) {
          agg[sym].createdAt = inv.createdAt;
      }
      
      agg[sym].qty += inv.quantity;
      agg[sym].totalModalIDR += (inv.quantity * inv.avgPrice * multiplier * historicalRate);
    });
    
    return Object.values(agg).filter((p: any) => p.qty > 0);
  }, [investments, tickerOverrides, getHistoricalRate]);

  const realizedTradesBase = useMemo(() => {
    return chronologicalTxs.filter((t: any) => t.type === 'invest_sell').map((t: any) => {
      const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
      const symbol = match ? match[1].toUpperCase().trim() : 'Unknown';
      
      const sellPriceMatch = t.description?.match(/@\s*(?:(?:Rp|USD|US\$)\s*)?([0-9.,]+)/i);
      const sellPriceRaw = sellPriceMatch ? parseFloat(sellPriceMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;

      const isUSD = t.description?.includes('USD') || t.description?.includes('US$');
      const currency = isUSD ? 'USD' : 'IDR'; 
      const isIDR = currency === 'IDR';
      
      const txDateTs = new Date(t.date).getTime();
      const historicalRate = isIDR ? 1 : getHistoricalRate(txDateTs, currency);
      
      const sellPriceIDR = sellPriceRaw * historicalRate;
      const isStock = symbol.length === 4; 
      const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(symbol);
      const knownUS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'META', 'QQQM', 'IVV', 'VOO', 'SPY'];
      
      let defaultTicker = symbol;
      if (isIDR && isStock && !isGold && !knownUS.includes(symbol) && !symbol.endsWith('.JK')) defaultTicker = `${symbol}.JK`;
      const activeTicker = tickerOverrides[symbol] || defaultTicker;

      return { ...t, symbol, currency, sellPriceIDR, activeTicker, isIDR, isStock, isGold };
    });
  }, [chronologicalTxs, tickerOverrides, getHistoricalRate]);

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
        ...t, livePriceIDR: livePrices[t.activeTicker] || 0
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

  const firstInvestmentDate = useMemo(() => {
      let earliest = new Date();
      let found = false;

      const investTxs = chronologicalTxs.filter((t: any) => t.type === 'invest_buy' || t.type === 'invest_sell');
      if (investTxs.length > 0) {
          earliest = new Date(investTxs[0].date);
          found = true;
      }

      investments.forEach((inv: any) => {
          if (inv.createdAt) {
              const invDate = new Date(inv.createdAt);
              if (!found || invDate < earliest) {
                  earliest = invDate;
                  found = true;
              }
          }
      });
      return earliest;
  }, [chronologicalTxs, investments]);

  const setupAwalBases = useMemo(() => {
      const txNetQty: Record<string, {qty: number, invested: number}> = {};
      
      chronologicalTxs.forEach((t: any) => {
          if (t.type === 'invest_buy' || t.type === 'invest_sell') {
              const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
              const sym = match ? match[1].toUpperCase().trim() : 'Unknown';
              const qtyMatch = t.description?.match(/([0-9.]+)\s+lot\/unit/i); 
              const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
              
              if (!txNetQty[sym]) txNetQty[sym] = { qty: 0, invested: 0 };
              if (t.type === 'invest_buy') {
                  txNetQty[sym].qty += qty;
                  txNetQty[sym].invested += t.amount;
              } else {
                  txNetQty[sym].qty -= qty;
                  txNetQty[sym].invested -= t.amount;
              }
          }
      });

      const bases: Record<string, { qty: number, invested: number, date: Date }> = {};
      activePortfolio.forEach(p => {
          const txNet = txNetQty[p.symbol] || { qty: 0, invested: 0 };
          const setupQty = p.qty - txNet.qty;
          const setupInvested = p.totalModalIDR - txNet.invested; 
          
          if (setupQty > 0.0001) { 
              bases[p.symbol] = {
                  qty: setupQty,
                  invested: setupInvested > 0 ? setupInvested : 0,
                  date: new Date(p.createdAt || new Date())
              };
          }
      });
      return bases;
  }, [chronologicalTxs, activePortfolio]);

  const getSnapshotAtDate = useCallback((targetDate: Date, isCurrent: boolean) => {
      const qtyMap: Record<string, { qty: number, investedIDR: number }> = {};
      const targetTs = targetDate.getTime();
      
      Object.keys(setupAwalBases).forEach(sym => {
          if (setupAwalBases[sym].date.getTime() <= targetTs) {
              qtyMap[sym] = { qty: setupAwalBases[sym].qty, investedIDR: setupAwalBases[sym].invested };
          }
      });

      const pastTx = chronologicalTxs.filter((t:any) => new Date(t.date).getTime() <= targetTs);
      pastTx.forEach((t:any) => {
          if (t.type === 'invest_buy' || t.type === 'invest_sell') {
              const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
              if (match) {
                  const sym = match[1].toUpperCase().trim();
                  const qtyMatch = t.description?.match(/([0-9.]+)\s+lot\/unit/i);
                  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0; 
                  
                  if (!qtyMap[sym]) qtyMap[sym] = { qty: 0, investedIDR: 0 };
                  
                  if (t.type === 'invest_buy') {
                      qtyMap[sym].qty += qty;
                      qtyMap[sym].investedIDR += t.amount;
                  } else {
                      qtyMap[sym].qty -= qty;
                      qtyMap[sym].investedIDR -= t.amount;
                      if (qtyMap[sym].qty <= 0) {
                          qtyMap[sym].qty = 0;
                          qtyMap[sym].investedIDR = 0;
                      } else {
                          qtyMap[sym].investedIDR = Math.max(0, qtyMap[sym].investedIDR);
                      }
                  }
              }
          }
      });
      
      let details: Record<string, {invested: number, valuasi: number, qty: number}> = {};
      let totalInv = 0; let totalVal = 0;
      
      Object.keys(qtyMap).forEach(sym => {
          if (qtyMap[sym].qty > 0) {
              const currentAsset = activePortfolio.find((p: any) => p.symbol === sym);
              const activeTicker = currentAsset ? currentAsset.activeTicker : (tickerOverrides[sym] || sym);
              const liveMultiplier = currentAsset ? currentAsset.liveMultiplier : 1;
              
              let price = qtyMap[sym].investedIDR / (qtyMap[sym].qty * liveMultiplier); 
              if (isCurrent) {
                  price = livePrices[activeTicker] || price;
              } else {
                  const histPrice = getPriceForDate(activeTicker, targetTs);
                  price = histPrice || price;
              }
              
              const valuasi = price ? (qtyMap[sym].qty * price * liveMultiplier) : qtyMap[sym].investedIDR;
              details[sym] = { invested: qtyMap[sym].investedIDR, valuasi, qty: qtyMap[sym].qty };
              totalInv += qtyMap[sym].investedIDR;
              totalVal += valuasi;
          } else {
              details[sym] = { invested: 0, valuasi: 0, qty: 0 };
          }
      });
      
      return { totalValue: totalVal, investValue: totalInv, details };
  }, [setupAwalBases, chronologicalTxs, activePortfolio, tickerOverrides, livePrices, getPriceForDate]);

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

  const getMonthData = useCallback((monthNum: number, year: number) => {
      const snap = snapshots.find((s: any) => s.month === monthNum && s.year === year);
      if (snap) {
          let details = {};
          try { details = JSON.parse(snap.assetsDetail || "{}"); } catch(e) {}
          return { isSaved: true, totalValue: snap.totalValue, investValue: snap.investValue, details };
      }
      
      const isCurrentMonth = year === new Date().getFullYear() && monthNum === new Date().getMonth() + 1;
      const endOfMonth = isCurrentMonth ? new Date() : new Date(year, monthNum, 0, 23, 59, 59);
      
      const calcData = getSnapshotAtDate(endOfMonth, isCurrentMonth);
      return { isSaved: false, ...calcData };
  }, [snapshots, getSnapshotAtDate]);

  const availableYears = useMemo(() => {
      const startYear = firstInvestmentDate.getFullYear();
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let y = startYear; y <= currentYear; y++) years.push(y);
      return years;
  }, [firstInvestmentDate]);

  const getYearData = useCallback((year: number) => {
      const isCurrentYear = year === new Date().getFullYear();
      const endOfYear = isCurrentYear ? new Date() : new Date(year, 11, 31, 23, 59, 59);
      return getSnapshotAtDate(endOfYear, isCurrentYear);
  }, [getSnapshotAtDate]);


  const chartDataDaily = useMemo(() => {
     if (activePortfolio.length === 0 || Object.keys(historyPrices).length === 0) return [];

     const parsedInvestTxs = chronologicalTxs.filter((t: any) => t.type === 'invest_buy' || t.type === 'invest_sell').map((t: any) => {
         const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
         const sym = match ? match[1].toUpperCase().trim() : 'Unknown';
         const qtyMatch = t.description?.match(/([0-9.]+)\s+lot\/unit/i);
         const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
         
         const date = new Date(t.date);
         const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
         return { ...t, parsedSymbol: sym, parsedQty: qty, dateStr };
     });

     const firstDate = firstInvestmentDate.getTime();
     const ONE_DAY = 24 * 60 * 60 * 1000;
     const now = new Date().getTime();

     let startTimeframe = firstDate;
     if (chartTimeframe === '1D') startTimeframe = now - 1 * ONE_DAY;
     if (chartTimeframe === '1W') startTimeframe = now - 7 * ONE_DAY;
     if (chartTimeframe === '1M') startTimeframe = now - 30 * ONE_DAY;
     if (chartTimeframe === '3M') startTimeframe = now - 90 * ONE_DAY;
     if (chartTimeframe === '1Y') Math.max(firstDate, now - 365 * ONE_DAY);
     if (chartTimeframe === '5Y') Math.max(firstDate, now - 1825 * ONE_DAY);
     
     let currentTs = new Date(startTimeframe).setHours(0,0,0,0);
     const endTs = new Date().setHours(0,0,0,0);

     const txByDate: Record<string, any[]> = {};
     parsedInvestTxs.forEach((t: any) => {
         if (!txByDate[t.dateStr]) txByDate[t.dateStr] = [];
         txByDate[t.dateStr].push(t);
     });

     let currentQty: Record<string, number> = {};
     let currentInvestedIDR: Record<string, number> = {};
     
     Object.keys(setupAwalBases).forEach(sym => {
         if (setupAwalBases[sym].date.getTime() < currentTs) {
             currentQty[sym] = setupAwalBases[sym].qty;
             currentInvestedIDR[sym] = setupAwalBases[sym].invested;
         }
     });

     parsedInvestTxs.forEach((t: any) => {
         if (new Date(t.date).getTime() < currentTs) {
             if (!currentQty[t.parsedSymbol]) { currentQty[t.parsedSymbol] = 0; currentInvestedIDR[t.parsedSymbol] = 0; }
             if (t.type === 'invest_buy') {
                 currentQty[t.parsedSymbol] += t.parsedQty;
                 currentInvestedIDR[t.parsedSymbol] += t.amount;
             } else {
                 currentQty[t.parsedSymbol] -= t.parsedQty;
                 currentInvestedIDR[t.parsedSymbol] -= t.amount;
                 if (currentQty[t.parsedSymbol] <= 0) {
                     currentQty[t.parsedSymbol] = 0;
                     currentInvestedIDR[t.parsedSymbol] = 0;
                 }
             }
         }
     });

     const dailyData = [];

     while(currentTs <= endTs) {
         const dateObj = new Date(currentTs);
         const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
         
         Object.keys(setupAwalBases).forEach(sym => {
             const setupDateStr = `${setupAwalBases[sym].date.getFullYear()}-${String(setupAwalBases[sym].date.getMonth() + 1).padStart(2, '0')}-${String(setupAwalBases[sym].date.getDate()).padStart(2, '0')}`;
             if (setupDateStr === dateStr) {
                 if (!currentQty[sym]) { currentQty[sym] = 0; currentInvestedIDR[sym] = 0; }
                 currentQty[sym] += setupAwalBases[sym].qty;
                 currentInvestedIDR[sym] += setupAwalBases[sym].invested;
             }
         });

         const dayTxs = txByDate[dateStr];
         if (dayTxs) {
             dayTxs.forEach(t => {
                 if (!currentQty[t.parsedSymbol]) { currentQty[t.parsedSymbol] = 0; currentInvestedIDR[t.parsedSymbol] = 0; }
                 if (t.type === 'invest_buy') {
                     currentQty[t.parsedSymbol] += t.parsedQty;
                     currentInvestedIDR[t.parsedSymbol] += t.amount;
                 } else {
                     currentQty[t.parsedSymbol] -= t.parsedQty;
                     currentInvestedIDR[t.parsedSymbol] -= t.amount;
                     if (currentQty[t.parsedSymbol] <= 0) {
                         currentQty[t.parsedSymbol] = 0;
                         currentInvestedIDR[t.parsedSymbol] = 0;
                     }
                 }
             });
         }

         let dailyValuation = 0;
         let dailyInvested = 0;

         Object.keys(currentQty).forEach(sym => {
             if (currentQty[sym] > 0) {
                 const assetMeta = activePortfolio.find((p: any) => p.symbol === sym);
                 const ticker = assetMeta ? assetMeta.activeTicker : (tickerOverrides[sym] || sym);
                 const multiplier = assetMeta ? assetMeta.liveMultiplier : 1;

                 const price = getPriceForDate(ticker, currentTs);
                 if (price) dailyValuation += currentQty[sym] * price * multiplier;
                 else dailyValuation += currentInvestedIDR[sym]; 
                 
                 dailyInvested += currentInvestedIDR[sym];
             }
         });

         dailyData.push({
             name: dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
             Total: dailyValuation,
             Investasi: dailyInvested
         });

         currentTs += ONE_DAY;
     }

     return dailyData;
  }, [historyPrices, chronologicalTxs, activePortfolio, tickerOverrides, chartTimeframe, firstInvestmentDate, setupAwalBases, getPriceForDate]);

  const formatRp = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  const maskRp = (num: number) => showProfit ? formatRp(num) : "Rp ••••••••";
  const formatPct = (num: number) => `${num > 0 ? '+' : ''}${(num * 100).toFixed(2)}%`;

  const handleSaveSnapshot = () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      const assetsDetail = activePortfolio.reduce((acc: any, p: any) => {
         const livePriceAPI = livePrices[p.activeTicker];
         const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
         acc[p.symbol] = { invested: p.totalModalIDR, valuasi: liveValuationIDR, qty: p.qty };
         return acc;
      }, {} as Record<string, {invested: number, valuasi: number, qty: number}>);

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

  const PrivacyToggle = () => (
    <button 
        onClick={() => setShowProfit(!showProfit)} 
        className={`ml-4 px-4 py-2 rounded-full border transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
            showProfit 
            ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700' 
            : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]'
        }`}
    >
        {showProfit ? <><VenetianMask className="w-4 h-4"/> Mode Privasi Mati</> : <><ShieldAlert className="w-4 h-4"/> Nominal Ditutupi</>}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#060913] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#060913] to-black text-slate-300 font-sans overflow-hidden selection:bg-emerald-500/30">
      
      {/* MODAL AUDIT HARGA & KOREKSI TICKER */}
      {editTickerModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
             <div className="bg-[#0A0F1C] border border-emerald-900/50 rounded-[32px] p-8 max-w-md w-full shadow-[0_0_40px_rgba(34,197,94,0.15)] relative">
                <button onClick={() => setEditTickerModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/30">
                    <Wrench className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"/>
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Koreksi Ticker Aset</h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                   Sistem tidak menemukan harga pasar untuk <b className="text-white">{editTickerModal}</b>. Silakan perbaiki dengan kode ticker yang valid di Yahoo Finance.
                </p>
                <div className="space-y-2 mb-8">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Ketik Kode Ticker Baru</label>
                   <input 
                       type="text" 
                       value={tempTicker} 
                       onChange={e => setTempTicker(e.target.value)}
                       placeholder="Cth: ANTM.JK / BTC-USD / QQQM"
                       className="w-full bg-[#060913] border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold outline-none focus:border-emerald-500 uppercase transition-colors"
                   />
                </div>
                <button onClick={saveTickerOverride} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black tracking-wider py-4 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                   SIMPAN & HUBUNGKAN
                </button>
             </div>
         </div>
      )}

      {/* MODAL CEK RINCIAN HARGA */}
      {assetDetailModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
             <div className="bg-[#0A0F1C] border border-cyan-900/50 rounded-[32px] p-8 max-w-md w-full shadow-[0_0_40px_rgba(6,182,212,0.15)] relative">
                <button onClick={() => setAssetDetailModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30">
                    <ScanSearch className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"/>
                </div>
                <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Rincian Kalkulasi Live</h2>
                <p className="text-sm text-slate-400 mb-6 font-medium">Audit transparansi perhitungan untuk <b className="text-white">{assetDetailModal.symbol}</b></p>
                
                <div className="space-y-3 bg-[#060913] p-5 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Sumber Ticker API</span>
                        <div className="flex items-center gap-2">
                           <span className="text-white font-black">{assetDetailModal.activeTicker}</span>
                           <button onClick={() => { setTempTicker(assetDetailModal.activeTicker); setEditTickerModal(assetDetailModal.symbol); setAssetDetailModal(null); }} className="text-[9px] bg-slate-800 px-2 py-1 rounded text-cyan-400 hover:bg-slate-700 transition-colors font-bold uppercase tracking-wider">EDIT</button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Unit Dimiliki</span>
                        <span className="text-white font-black">{assetDetailModal.qty} Unit</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Multiplier</span>
                        <span className="text-white font-black">x {assetDetailModal.liveMultiplier}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Harga Live / Unit (IDR)</span>
                        <span className="text-cyan-400 font-black drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">{maskRp(livePrices[assetDetailModal.activeTicker] || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Valuasi Saat Ini</span>
                        <span className="text-emerald-400 font-black text-lg drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
                           {maskRp(assetDetailModal.qty * (livePrices[assetDetailModal.activeTicker] || 0) * assetDetailModal.liveMultiplier)}
                        </span>
                    </div>
                </div>
                <button onClick={() => setAssetDetailModal(null)} className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-black tracking-widest py-4 rounded-full transition-all active:scale-95 uppercase">
                   Tutup
                </button>
             </div>
         </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0A0F1C]/90 backdrop-blur-2xl border-r border-slate-800/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/60">
          <img src="/BILANO-ICON.png" alt="BILANO" className="w-9 h-9 object-contain drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
          <div>
            <h1 className="text-white font-black text-xl tracking-tight leading-none drop-shadow-md">BILANO</h1>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-1 drop-shadow-[0_0_4px_rgba(34,197,94,0.5)]">Expert Terminal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Analisis & Laporan</p>
          <button onClick={() => setActiveTab('alokasi')} className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all text-sm font-bold ${activeTab === 'alokasi' ? 'bg-gradient-to-r from-emerald-600/20 to-transparent text-emerald-400 border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
            <Layers className="w-4 h-4" /> Alokasi Aset
          </button>
          <button onClick={() => setActiveTab('pantauan')} className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all text-sm font-bold ${activeTab === 'pantauan' ? 'bg-gradient-to-r from-emerald-600/20 to-transparent text-emerald-400 border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
            <Radar className="w-4 h-4" /> Pantauan Portofolio
          </button>
          <button onClick={() => setActiveTab('terealisasi')} className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all text-sm font-bold ${activeTab === 'terealisasi' ? 'bg-gradient-to-r from-emerald-600/20 to-transparent text-emerald-400 border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
            <Scale className="w-4 h-4" /> Investasi Terealisasi
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800/60">
          <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-slate-400 bg-[#060913] text-[10px] font-black tracking-widest uppercase border border-slate-800/50">
             <span className="flex items-center gap-2">
                <Radio className={`w-3.5 h-3.5 ${isLivePricesLoading ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
                Data Market
             </span>
             <span className={isLivePricesLoading ? 'text-amber-400' : 'text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]'}>{isLivePricesLoading ? 'Syncing...' : 'LIVE'}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 border-b border-slate-800/60 flex items-center justify-between px-8 bg-[#0A0F1C]/80 backdrop-blur-md z-10 shadow-lg">
          <div>
              <h2 className="text-lg font-black text-white tracking-tight drop-shadow-md">Status Portofolio</h2>
              <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 drop-shadow-[0_0_6px_rgba(6,182,212,1)]"></span>
                  </span>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-black drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">Auto-Sync PWA Aktif</p>
              </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right flex items-center gap-8">
              <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Total Kas (Cash)</p>
                  <p className="text-white font-black text-lg drop-shadow-md">{maskRp(cashBalance)}</p>
              </div>
              <div className="h-8 w-px bg-slate-700/50"></div>
              <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Total Aset Investasi</p>
                  <div className="flex items-center gap-2 justify-end">
                      <p className="text-emerald-400 font-black text-xl drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">{maskRp(totalAssetValue)}</p>
                      {isLivePricesLoading && <Orbit className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
                  </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* ================= TAB 1: ALOKASI ASET ================= */}
          {activeTab === 'alokasi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex justify-between items-center">
                  <div className="flex items-center">
                      <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-lg">Peta Alokasi Kekayaan</h2>
                      <PrivacyToggle />
                  </div>
              </div>
              
              {activePortfolio.length === 0 ? (
                  <div className="bg-[#0A0F1C]/80 backdrop-blur-md border border-slate-800/60 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                      <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700"><Layers className="w-8 h-8 text-slate-500" /></div>
                      <h3 className="text-lg font-black text-white mb-2 tracking-tight">Belum Ada Investasi</h3>
                      <p className="text-slate-400 text-sm max-w-sm leading-relaxed">Catat pembelian aset pertama Anda di fitur Investasi pada aplikasi PWA, dan sistem ini akan menyedot datanya secara otomatis.</p>
                  </div>
              ) : (
                  <>
                      <div className="bg-[#0A0F1C]/80 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-x-auto shadow-[0_8px_32px_rgba(0,0,0,0.4)] custom-scrollbar pb-2">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gradient-to-r from-[#0F1524] to-[#0A0F1C] text-emerald-400 font-black uppercase tracking-widest text-[10px]">
                            <tr>
                              <th className="px-6 py-5 border-b border-slate-800/60 whitespace-nowrap sticky left-0 bg-[#0F1524] z-10">Kategori</th>
                              <th className="px-6 py-5 border-b border-slate-800/60 text-emerald-300 drop-shadow-[0_0_4px_rgba(110,231,183,0.5)] whitespace-nowrap">Cash (Tunai)</th>
                              {activePortfolio.map((p: any) => {
                                 const isError = livePrices[p.activeTicker] === undefined && !isLivePricesLoading;
                                 return (
                                    <th key={p.symbol} className="px-6 py-5 border-b border-slate-800/60 whitespace-nowrap group">
                                       <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors" onClick={() => setAssetDetailModal(p)}>
                                           {p.symbol} 
                                           <span className="text-[9px] bg-[#060913] border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-bold tracking-widest">{p.activeTicker}</span>
                                           <ScanSearch className="w-3 h-3 text-cyan-500 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                                           {isError && (
                                              <button onClick={(e) => { e.stopPropagation(); setTempTicker(p.activeTicker); setEditTickerModal(p.symbol); }} className="text-rose-400 hover:text-white transition-colors bg-rose-500/20 border border-rose-500/50 px-1.5 py-0.5 rounded flex items-center gap-1 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]" title="Perbaiki Ticker">
                                                 ⚠️ Error
                                              </button>
                                           )}
                                       </div>
                                    </th>
                                 );
                              })}
                            </tr>
                          </thead>
                          <tbody className="text-slate-200 font-bold">
                            <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-5 font-black text-slate-400 sticky left-0 bg-[#0A0F1C] z-10 border-r border-slate-800/50">Nilai Aset (Live)</td>
                              <td className="px-6 py-5">{maskRp(cashBalance)}</td>
                              {activePortfolio.map((p: any) => {
                                const livePriceAPI = livePrices[p.activeTicker];
                                const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
                                return <td key={p.symbol} className="px-6 py-5">{maskRp(liveValuationIDR)}</td>
                              })}
                            </tr>
                            <tr className="hover:bg-slate-800/30 transition-colors bg-emerald-900/5">
                              <td className="px-6 py-5 font-black text-slate-400 sticky left-0 bg-[#0A0F1C] z-10 border-r border-slate-800/50">Persentase</td>
                              <td className="px-6 py-5 text-emerald-400 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.4)] text-base">{totalWealth > 0 ? formatPct(cashBalance / totalWealth) : '0%'}</td>
                              {activePortfolio.map((p: any) => {
                                 const livePriceAPI = livePrices[p.activeTicker];
                                 const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
                                 return <td key={p.symbol} className="px-6 py-5 text-cyan-400 font-black drop-shadow-[0_0_6px_rgba(6,182,212,0.4)] text-base">{totalWealth > 0 ? formatPct(liveValuationIDR / totalWealth) : '0%'}</td>
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-[#0A0F1C]/80 backdrop-blur-md border border-slate-800/60 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[350px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent rounded-2xl pointer-events-none"></div>
                        <div className="w-full max-w-sm h-64 relative">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie data={pieData} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={6}>
                                    {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: `drop-shadow(0px 0px 8px ${COLORS[index % COLORS.length]}60)` }}/>)}
                                 </Pie>
                                 <Tooltip formatter={(val: number) => maskRp(val)} contentStyle={{backgroundColor: '#060913', borderColor: '#1E293B', borderRadius: '12px', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'}} itemStyle={{color: '#fff', fontWeight: '900', fontSize: '14px'}} />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-5 justify-center mt-6">
                            {pieData.map((d: any, i: number) => (
                                <div key={d.name} className="flex items-center gap-2 text-[11px] font-black tracking-wider text-slate-300 uppercase">
                                   <span className="w-3.5 h-3.5 rounded-full shadow-lg" style={{backgroundColor: COLORS[i % COLORS.length], boxShadow: `0 0 10px ${COLORS[i % COLORS.length]}80`}}></span>
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
                  <div className="flex items-center mb-1">
                      <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-lg">Pantauan Portofolio</h2>
                      <PrivacyToggle />
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                      <button onClick={() => setSelectedYear(selectedYear - 1)} className="flex items-center gap-1 text-[11px] uppercase tracking-widest font-black text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/30"><ChevronUp className="w-4 h-4" /> Data Tahun ({selectedYear - 1})</button>
                      <button onClick={() => setSelectedYear(selectedYear + 1)} className="flex items-center gap-1 text-[11px] uppercase tracking-widest font-black text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/30">Data Lanjutan ({selectedYear + 1}) <ChevronUp className="w-4 h-4 rotate-180" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="bg-[#0A0F1C]/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Laba/Rugi Total</p>
                       <div className={`font-black text-2xl drop-shadow-lg ${totalProfitLoss >= 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]'} flex items-center gap-1 justify-end`}>
                           {totalProfitLoss >= 0 ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                           {maskRp(Math.abs(totalProfitLoss))}
                       </div>
                   </div>
                   <button onClick={handleSaveSnapshot} disabled={saveSnapshotMutation.isPending || activePortfolio.length === 0} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-[11px] uppercase tracking-widest font-black px-5 py-4 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-2 transition-all active:scale-95">
                       {saveSnapshotMutation.isPending ? <Orbit className="w-4 h-4 animate-spin"/> : <Database className="w-4 h-4" />} Simpan Permanen
                   </button>
                </div>
              </div>

              {/* 🚀 TABEL BULANAN */}
              <div className="bg-[#0A0F1C]/80 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-x-auto shadow-[0_8px_32px_rgba(0,0,0,0.4)] custom-scrollbar mb-8">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gradient-to-r from-[#0F1524] to-[#0A0F1C] text-emerald-400 font-black uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="px-6 py-5 border-b border-slate-800/60 sticky left-0 bg-[#0F1524] z-10 text-cyan-400">BULANAN ({selectedYear})</th>
                      {activePortfolio.map((p: any) => (
                          <th key={p.symbol} onClick={() => setAssetDetailModal(p)} className="px-6 py-5 border-b border-slate-800/60 whitespace-nowrap cursor-pointer hover:text-white transition-colors">
                              <div className="flex items-center gap-1">
                                  {p.symbol}
                                  <ScanSearch className="w-3 h-3 text-emerald-500 drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                              </div>
                          </th>
                      ))}
                      <th className="px-6 py-5 border-b border-slate-800/60 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.5)] whitespace-nowrap">Portfolio Wtd</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 font-bold">
                    {availableMonths.length === 0 ? (
                       <tr><td colSpan={activePortfolio.length + 2} className="px-6 py-12 text-center text-slate-500 italic font-medium">Belum ada aktivitas investasi pada tahun {selectedYear}.</td></tr>
                    ) : (
                       availableMonths.map((m) => {
                          const data = getMonthData(m.monthNum, selectedYear);
                          const details = data.details as Record<string, {invested: number, valuasi: number, qty: number}>;
                          
                          return (
                             <tr key={m.name} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${!data.isSaved ? 'opacity-80' : ''}`}>
                                <td className="px-6 py-5 font-black text-slate-200 sticky left-0 bg-[#0A0F1C] z-10 border-r border-slate-800/50 flex items-center justify-between">
                                    {m.name} {!data.isSaved && <span className="text-[8px] tracking-widest font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded ml-2 drop-shadow-[0_0_4px_rgba(34,197,94,0.5)]" title="Evaluasi Otomatis (Live/Historis API)">AUTO</span>}
                                </td>
                                {activePortfolio.map((p: any) => {
                                    const assetSnap = details[p.symbol] || { invested: 0, valuasi: 0, qty: 0 };
                                    if (assetSnap.qty === 0) return <td key={p.symbol} className="px-6 py-5 text-slate-600 text-center">-</td>;
                                    
                                    const plAmount = assetSnap.valuasi - assetSnap.invested;
                                    const plPct = (plAmount / assetSnap.invested);
                                    return (
                                        <td key={p.symbol} className={`px-6 py-5 ${plAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            <div className="font-black drop-shadow-md text-[13px]">{maskRp(plAmount)}</div>
                                            <div className="text-[11px] opacity-90 font-black tracking-wider mt-0.5">{formatPct(plPct)}</div>
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-5 font-black bg-emerald-900/5">
                                    {(() => {
                                        if (data.investValue === 0) return <span className="text-slate-600">-</span>;
                                        const plTotalAmount = data.totalValue - data.investValue;
                                        return (
                                            <div className={plTotalAmount >= 0 ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'}>
                                                <div className="text-base">{maskRp(plTotalAmount)}</div>
                                                <div className="text-[11px] opacity-90 tracking-wider mt-0.5">{formatPct(plTotalAmount / data.investValue)}</div>
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

              {/* 🚀 TABEL TAHUNAN */}
              <div className="bg-[#0A0F1C]/80 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-x-auto shadow-[0_8px_32px_rgba(0,0,0,0.4)] custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gradient-to-r from-[#0F1524] to-[#0A0F1C] text-emerald-400 font-black uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="px-6 py-5 border-b border-slate-800/60 sticky left-0 bg-[#0F1524] z-10 text-amber-400">REKAP TAHUNAN</th>
                      {activePortfolio.map((p: any) => (
                          <th key={`yr-${p.symbol}`} className="px-6 py-5 border-b border-slate-800/60 whitespace-nowrap">
                              {p.symbol}
                          </th>
                      ))}
                      <th className="px-6 py-5 border-b border-slate-800/60 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)] whitespace-nowrap">Portfolio Tahunan</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 font-bold">
                    {availableYears.length === 0 ? (
                       <tr><td colSpan={activePortfolio.length + 2} className="px-6 py-12 text-center text-slate-500 italic font-medium">Belum ada rekam jejak tahunan.</td></tr>
                    ) : (
                       availableYears.map((y) => {
                          const data = getYearData(y);
                          const details = data.details as Record<string, {invested: number, valuasi: number, qty: number}>;
                          
                          return (
                             <tr key={`yr-row-${y}`} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors`}>
                                <td className="px-6 py-5 font-black text-amber-300 sticky left-0 bg-[#0A0F1C] z-10 border-r border-slate-800/50 flex items-center justify-between">
                                    TAHUN {y}
                                </td>
                                {activePortfolio.map((p: any) => {
                                    const assetSnap = details[p.symbol] || { invested: 0, valuasi: 0, qty: 0 };
                                    if (assetSnap.qty === 0) return <td key={`yr-${y}-${p.symbol}`} className="px-6 py-5 text-slate-600 text-center">-</td>;
                                    
                                    const plAmount = assetSnap.valuasi - assetSnap.invested;
                                    const plPct = (plAmount / assetSnap.invested);
                                    return (
                                        <td key={`yr-${y}-${p.symbol}`} className={`px-6 py-5 ${plAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            <div className="font-black drop-shadow-md text-[13px]">{maskRp(plAmount)}</div>
                                            <div className="text-[11px] opacity-90 font-black tracking-wider mt-0.5">{formatPct(plPct)}</div>
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-5 font-black bg-amber-900/5">
                                    {(() => {
                                        if (data.investValue === 0) return <span className="text-slate-600">-</span>;
                                        const plTotalAmount = data.totalValue - data.investValue;
                                        return (
                                            <div className={plTotalAmount >= 0 ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'}>
                                                <div className="text-base">{maskRp(plTotalAmount)}</div>
                                                <div className="text-[11px] opacity-90 tracking-wider mt-0.5">{formatPct(plTotalAmount / data.investValue)}</div>
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

              {/* 🚀 GRAFIK AREA */}
              <div className="bg-[#0A0F1C]/80 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] mt-6 relative">
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="font-black text-white tracking-tight drop-shadow-md">Grafik Kinerja Historis</h3>
                  <div className="flex gap-2 bg-[#060913] p-1 rounded-lg border border-slate-800">
                     <button onClick={() => setChartTimeframe('1D')} className={`px-4 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-black transition-all ${chartTimeframe==='1D'?'bg-emerald-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]':'text-slate-500 hover:text-slate-300'}`}>1H</button>
                     <button onClick={() => setChartTimeframe('1W')} className={`px-4 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-black transition-all ${chartTimeframe==='1W'?'bg-emerald-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]':'text-slate-500 hover:text-slate-300'}`}>1M</button>
                     <button onClick={() => setChartTimeframe('1M')} className={`px-4 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-black transition-all ${chartTimeframe==='1M'?'bg-emerald-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]':'text-slate-500 hover:text-slate-300'}`}>1B</button>
                     <button onClick={() => setChartTimeframe('3M')} className={`px-4 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-black transition-all ${chartTimeframe==='3M'?'bg-emerald-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]':'text-slate-500 hover:text-slate-300'}`}>3B</button>
                     <button onClick={() => setChartTimeframe('1Y')} className={`px-4 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-black transition-all ${chartTimeframe==='1Y'?'bg-emerald-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]':'text-slate-500 hover:text-slate-300'}`}>1T</button>
                     <button onClick={() => setChartTimeframe('5Y')} className={`px-4 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-black transition-all ${chartTimeframe==='5Y'?'bg-emerald-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]':'text-slate-500 hover:text-slate-300'}`}>5T</button>
                  </div>
                </div>
                <div className="h-72 w-full relative z-10">
                    {chartDataDaily.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartDataDaily}>
                             <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} fontWeight={900} />
                             <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => showProfit ? `Rp${(val/1000000).toFixed(0)}M` : `•••`} fontWeight={900} orientation="right" />
                             <Tooltip formatter={(val: number) => maskRp(val)} contentStyle={{backgroundColor: '#060913', borderColor: '#1E293B', borderRadius: '12px', color: '#fff', fontWeight: '900', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'}} />
                             <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                             
                             <Line type="monotone" dataKey="Investasi" stroke="#64748B" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Modal Diinvestasikan" />
                             <Area type="monotone" dataKey="Total" stroke="#22C55E" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" dot={false} activeDot={{r: 6, fill: '#22C55E', stroke: '#fff', strokeWidth: 2}} name="Valuasi Total" style={{ filter: 'drop-shadow(0px 4px 8px rgba(34,197,94,0.4))' }} />
                          </AreaChart>
                       </ResponsiveContainer>
                    ) : <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-sm font-bold uppercase tracking-widest">Menunggu sinkronisasi data riwayat...</div>}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: INVESTASI TEREALISASI ================= */}
          {activeTab === 'terealisasi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex justify-between items-center">
                  <div>
                      <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-lg">Investasi Terealisasi</h2>
                      <p className="text-xs text-emerald-300/80 mt-1 font-bold tracking-wider uppercase">Evaluasi Keputusan Penjualan Historis</p>
                  </div>
                  <PrivacyToggle />
              </div>

              <div className="bg-[#0A0F1C]/80 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gradient-to-r from-[#0F1524] to-[#0A0F1C] text-emerald-400 font-black uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="px-6 py-5 border-b border-slate-800/60">Tanggal Jual</th>
                      <th className="px-6 py-5 border-b border-slate-800/60">Aset</th>
                      <th className="px-6 py-5 border-b border-slate-800/60">Nilai Penjualan</th>
                      <th className="px-6 py-5 border-b border-slate-800/60 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.5)]">Harga Live Saat Ini</th>
                      <th className="px-6 py-5 border-b border-slate-800/60 text-right">Status Keputusan</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 font-bold">
                    {realizedTrades.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium italic">Belum ada rekam jejak investasi yang dijual.</td></tr>
                    ) : (
                      realizedTrades.map((t: any) => {
                        const isLivePriceReady = t.livePriceIDR > 0;
                        
                        // 🚀 PERBAIKAN: Gunakan harga per lembar/unit murni tanpa membaginya atau mengalikannya lagi
                        const livePricePerShareIDR = t.livePriceIDR;
                        const sellPricePerShareIDR = t.sellPriceIDR;
                        
                        const isGoodSell = isLivePriceReady && livePricePerShareIDR < sellPricePerShareIDR;

                        return (
                          <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-5 text-slate-400 font-black tracking-widest text-[11px]">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</td>
                            <td className="px-6 py-5 font-black text-white flex items-center gap-2">
                               {t.symbol} 
                               <span className="text-[9px] bg-[#060913] border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded tracking-widest">{t.activeTicker}</span>
                               {!isLivePriceReady && !isLivePricesLoading && (
                                   <button onClick={() => { setTempTicker(t.activeTicker); setEditTickerModal(t.symbol); }} className="text-rose-400 hover:text-white transition-colors bg-rose-500/20 border border-rose-500/50 px-1.5 py-0.5 rounded flex items-center gap-1 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]" title="Perbaiki Ticker">⚠️ Error</button>
                               )}
                            </td>
                            <td className="px-6 py-5">
                               <span className="font-black text-slate-200">{maskRp(t.amount)}</span> <br/>
                               {/* 🚀 PERBAIKAN: Tampilkan sellPricePerShareIDR secara murni */}
                               <span className="text-[10px] text-slate-500 tracking-wider font-bold">Modal Asli: @ {maskRp(sellPricePerShareIDR)}</span>
                            </td>
                            <td className="px-6 py-5 text-cyan-400 font-black drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">
                               {/* 🚀 PERBAIKAN: Tampilkan livePricePerShareIDR secara murni */}
                               {isLivePricesLoading && !isLivePriceReady ? <Orbit className="w-4 h-4 animate-spin text-cyan-500"/> : (isLivePriceReady ? maskRp(livePricePerShareIDR) : <span className="text-slate-600">N/A</span>)}
                            </td>
                            <td className="px-6 py-5 text-right">
                              {!isLivePriceReady ? <span className="text-[10px] text-slate-600 uppercase tracking-widest font-black">Menunggu...</span> : isGoodSell ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]">✅ Tepat Waktu</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-full drop-shadow-[0_0_4px_rgba(244,63,94,0.4)]">❌ Terlalu Cepat</span>
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