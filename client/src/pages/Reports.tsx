import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { 
    Download, FileText, Globe, Wallet, FileBarChart, Loader2, 
    Briefcase, HandCoins, Archive, HeartHandshake, AlertCircle,
    ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, TrendingUp,
    Calendar, Lock, Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useUser } from "@/hooks/use-finance"; 
import { Link, useLocation } from "wouter";
import { trackEvent } from "@/lib/tracking";

const DEFAULT_RATES: Record<string, number> = {
    "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
    "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
};

export default function Reports() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: userProfile, isLoading: isUserLoading } = useUser(); 
  const [data, setData] = useState<any>(null);
  const [forexRates, setForexRates] = useState<any>({});
  const [targetData, setTargetData] = useState<any>(null); 
  
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");
  const formatRpPendek = (val: number) => {
      const num = Math.abs(Number(val) || 0);
      const sign = val < 0 ? "-" : "";
      if (num >= 1000000000) return sign + (num / 1000000000).toFixed(1) + 'M';
      if (num >= 1000000) return sign + (num / 1000000).toFixed(1) + 'Jt';
      if (num >= 1000) return sign + (num / 1000).toFixed(0) + 'Rb';
      return sign + num.toString();
  };

  const getRate = (curr: string) => forexRates[curr] || DEFAULT_RATES[curr] || 15000;

  useEffect(() => {
    try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) { ctx.drawImage(img, 0, 0); setLogoBase64(canvas.toDataURL("image/png")); }
        };
        img.src = '/BILANO-LOGO-NEW.png';
    } catch (e) {}

    const fetchData = async () => {
      try {
        const userEmail = localStorage.getItem("bilano_email") || "";
        const fetchOpts = { headers: { "x-user-email": userEmail }, cache: "no-store" as RequestCache };
        const timestamp = Date.now();
        const [resData, resRates, resTarget] = await Promise.all([
            fetch(`/api/reports/data?t=${timestamp}`, fetchOpts),
            fetch(`/api/forex/rates?t=${timestamp}`, fetchOpts),
            fetch(`/api/target?t=${timestamp}`, fetchOpts)
        ]);

        if (resData.ok) {
            const dbData = await resData.json();
            setData(dbData);
            runAutoArchiver(dbData, userEmail); 
        }
        if (resRates.ok) setForexRates(await resRates.json());
        if (resTarget.ok) setTargetData(await resTarget.json());
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
      if (!isUserLoading) {
          trackEvent("portfolio_viewed", { module: "reports_dashboard" }); 
      }
  }, [isUserLoading]);

  // =========================================================================
  // ❄️ PERMANENT DATA FREEZING & RETROSPECTIVE AUDITING ROUTINE
  // =========================================================================
  const generateFrozenData = (targetMonth: number, targetYear: number, isYearly: boolean, dbData: any) => {
      const user = dbData.user || {};
      const allTxs = dbData.transactions || [];
      const allInvestments = dbData.investments || [];
      const allDebts = dbData.debts || [];
      const allForexAssets = dbData.forexAssets || [];
      const allRetained = dbData.retained || []; 

      const now = new Date();
      const isCurrentPeriod = isYearly 
          ? targetYear === now.getFullYear() 
          : (targetMonth === now.getMonth() && targetYear === now.getFullYear());

      let appStartDate = new Date();
      if (user.createdAt) appStartDate = new Date(user.createdAt);
      else if (allTxs && allTxs.length > 0) appStartDate = new Date(Math.min(...allTxs.map((t:any) => new Date(t.date).getTime())));

      const allUniqueSymbols = new Set<string>();
      allInvestments.forEach((i:any) => allUniqueSymbols.add(`${i.symbol}`));
      allTxs.forEach((t:any) => {
          if (t.type === 'invest_buy' || t.type === 'invest_sell') {
              const match = t.description?.match(/lot\/unit\s+([A-Z0-9|]+)/i);
              if (match) allUniqueSymbols.add(match[1]);
          }
      });

      const liveCash = Number(user.cashBalance || 0);
      const safeTargetYear = targetYear;
      const reportDateEnd = isYearly 
            ? new Date(safeTargetYear, 11, 31, 23, 59, 59) 
            : new Date(safeTargetYear, targetMonth + 1, 0, 23, 59, 59);

      const globalSnapRetained = Math.round(allRetained.reduce((acc: number, r:any) => {
          const rate = r.currency === 'IDR' ? 1 : getRate(r.currency);
          return acc + (r.amount * rate);
      }, 0));

      const getSnapshotAt = (targetDate: Date) => {
          if (isCurrentPeriod) {
              const snapCash = liveCash;
              const snapForex = Math.round(allForexAssets.reduce((acc: number, f: any) => acc + (f.amount * getRate(f.currency)), 0));
              const snapInvest = Math.round(allInvestments.reduce((acc: number, inv: any) => {
                  const parts = (inv.symbol || "").split('|');
                  const sym = parts[0] || "";
                  const curr = parts[1] || 'IDR';
                  const rate = getRate(curr);
                  const isSaham = inv.type === 'saham' || (!inv.type && sym.length === 4 && inv.type !== 'crypto');
                  const m = (isSaham && curr === 'IDR') ? 100 : 1;
                  return acc + (inv.quantity * inv.avgPrice * m * rate);
              }, 0));
              
              let snapPiutang = 0; let snapDebt = 0;
              allDebts.filter((d:any) => !d.isPaid).forEach((d:any) => {
                  const curr = (d.name || "").split('|')[1] || 'IDR';
                  const rate = getRate(curr);
                  if (d.type === 'piutang') snapPiutang += (d.amount * rate);
                  else if (d.type === 'hutang') snapDebt += (d.amount * rate);
              });

              return { 
                  cash: Math.round(snapCash), 
                  invest: snapInvest, 
                  forex: snapForex, 
                  piutang: Math.round(snapPiutang), 
                  debt: Math.round(snapDebt), 
                  retained: globalSnapRetained,
                  netWorth: Math.round(snapCash + snapInvest + snapForex + globalSnapRetained + snapPiutang - snapDebt) 
              };
          }

          let snapCash = liveCash; 
          allTxs.filter((t:any) => new Date(t.date) > targetDate).forEach((t:any) => {
              const amt = Number(t.amount) || 0;
              const isNonCash = t.description?.includes('[WRITE_OFF]') || t.description?.includes('[Catat Awal]') || t.description?.includes('(Potong Dompet Valas)');
              if (!isNonCash) {
                  if (['income', 'debt_borrow', 'debt_receive', 'invest_sell', 'forex_sell'].includes(t.type)) snapCash -= amt; 
                  else if (['expense', 'debt_lend', 'debt_pay', 'invest_buy', 'forex_buy'].includes(t.type)) snapCash += amt;
              }
          });

          let snapPiutang = 0; let snapDebt = 0;
          const uniqueDebts = new Set(allDebts.map((d:any) => d.name));
          uniqueDebts.forEach((name: any) => {
              const relatedDebts = allDebts.filter((d:any) => d.name === name);
              const earliestDbDate = new Date(Math.min(...relatedDebts.map((d:any) => new Date(d.createdAt||Date.now()).getTime())));
              let firstTxDate = Date.now();
              allTxs.forEach((t:any) => {
                  if (t.description?.includes(name.split('|')[0]) && new Date(t.date).getTime() < firstTxDate) firstTxDate = new Date(t.date).getTime();
              });
              const startDate = new Date(Math.min(earliestDbDate.getTime(), firstTxDate, appStartDate.getTime()));
              
              if (startDate <= targetDate) {
                  const isHutang = relatedDebts[0].type === 'hutang';
                  let liveAmt = relatedDebts.filter((d:any) => !d.isPaid).reduce((acc:number, d:any) => acc + d.amount, 0) * getRate(name.split('|')[1]||'IDR');
                  
                  allTxs.filter((t:any) => new Date(t.date) > targetDate && (t.description||'').includes(name.split('|')[0])).forEach((t:any) => {
                      const amt = Number(t.amount) || 0;
                      if (isHutang) {
                          if (t.type === 'debt_pay' || t.category === 'Pemutihan Hutang') liveAmt += amt;
                          if (t.type === 'debt_borrow' || t.type === 'hutang_record') liveAmt -= amt;
                      } else {
                          if (t.type === 'debt_receive' || t.category === 'Penghapusan Piutang') liveAmt += amt;
                          if (t.type === 'debt_lend' || t.type === 'piutang_record') liveAmt -= amt;
                      }
                  });
                  if (isHutang) snapDebt += Math.max(0, liveAmt);
                  else snapPiutang += Math.max(0, liveAmt);
              }
          });

          let snapForex = 0;
          const uniqueForex = new Set(allForexAssets.map((f:any) => f.currency));
          uniqueForex.forEach((curr: any) => {
              const relatedFx = allForexAssets.find((f:any) => f.currency === curr);
              let firstDate = relatedFx ? new Date(relatedFx.createdAt||Date.now()).getTime() : Date.now();
              allTxs.forEach((t:any) => { if ((t.category||'').includes(curr) || (t.description||'').includes(curr)) if(new Date(t.date).getTime() < firstDate) firstDate = new Date(t.date).getTime(); });
              const startDate = new Date(Math.min(firstDate, appStartDate.getTime()));
              
              if (startDate <= targetDate) {
                  let liveAmt = (relatedFx?.amount || 0); 
                  allTxs.filter((t:any) => new Date(t.date) > targetDate && ((t.category||'').includes(curr) || (t.description||'').includes(curr))).forEach((t:any) => {
                      const desc = t.description || "";
                      let txQty = 0;
                      const exMatch = desc.match(/(Beli|Jual|@)\s+([A-Z]{3})\s+([0-9.]+)/i) || desc.match(/(Beli|Jual)\s+([0-9.]+)\s+([A-Z]{3})/i);
                      if (exMatch && (exMatch[1].toUpperCase() === curr || exMatch[3].toUpperCase() === curr)) {
                          txQty = parseFloat(exMatch[2]);
                      } else {
                          const mutMatch = desc.match(/\[Valas (Masuk|Keluar)\s+([0-9.]+)\s+([A-Z]{3})\]/i);
                          if (mutMatch && mutMatch[3].toUpperCase() === curr) txQty = parseFloat(mutMatch[2]);
                      }
                      
                      if (t.type === 'forex_sell' || t.category === 'Jual Aset Valas' || (t.type === 'expense' && desc.includes('[Valas Keluar'))) liveAmt += txQty;
                      if (t.type === 'forex_buy' || t.category === 'Beli Aset Valas' || (t.type === 'income' && desc.includes('[Valas Masuk'))) liveAmt -= txQty;
                  });
                  snapForex += Math.round(Math.max(0, liveAmt) * getRate(curr));
              }
          });

          let snapInvest = 0;
          Array.from(allUniqueSymbols).forEach((symbolRaw: any) => {
              const sym = symbolRaw.split('|')[0];
              const rate = getRate(symbolRaw.split('|')[1] || 'IDR'); 
              const dbInv = allInvestments.find((i:any) => i.symbol === symbolRaw);
              let firstDate = dbInv ? new Date(dbInv.createdAt||Date.now()).getTime() : Date.now();
              allTxs.forEach((t:any) => { if ((t.description||'').includes(sym) && new Date(t.date).getTime() < firstDate) firstDate = new Date(t.date).getTime(); });
              const startDate = new Date(Math.min(firstDate, appStartDate.getTime()));

              if (startDate <= targetDate) {
                  let liveAmt = 0;
                  if (dbInv) {
                      const isSaham = dbInv.type === 'saham' || (!dbInv.type && sym.length === 4 && dbInv.type !== 'crypto');
                      const m = (isSaham && !(dbInv.symbol || "").split('|')[1]) ? 100 : 1;
                      liveAmt = (Number(dbInv.quantity) || 0) * (Number(dbInv.avgPrice) || 0) * m * rate;
                  }
                  
                  allTxs.filter((t:any) => new Date(t.date) > targetDate && (t.description||'').includes(sym)).forEach((t:any) => {
                      const amt = Number(t.amount) || 0;
                      if (t.type === 'invest_sell') {
                          let pl = 0;
                          if (t.description?.includes('P/L:')) pl = parseInt(t.description.split('P/L:')[1].replace(/[^0-9-]/g, '')) || 0;
                          liveAmt += (amt - pl);
                      }
                      if (t.type === 'invest_buy') liveAmt -= amt;
                  });
                  snapInvest += Math.round(Math.max(0, liveAmt));
              }
          });

          return { 
              cash: Math.round(Math.max(0, snapCash)), 
              invest: Math.round(snapInvest), 
              forex: Math.round(snapForex), 
              piutang: Math.round(snapPiutang), 
              debt: Math.round(snapDebt),
              retained: globalSnapRetained,
              netWorth: Math.round(Math.max(0, snapCash) + snapInvest + snapForex + snapPiutang - snapDebt + globalSnapRetained) 
          };
      };

      const archiveSnap = getSnapshotAt(reportDateEnd);
      const isTargetInPeriod = (d: Date) => isYearly ? d.getFullYear() === safeTargetYear : d.getMonth() === targetMonth && d.getFullYear() === safeTargetYear;
      
      const thisPeriodTxs = allTxs.filter((t:any) => isTargetInPeriod(new Date(t.date)));

      const baseIncomeTxs = thisPeriodTxs.filter((t:any) => 
          (t.type === 'income' || t.type === 'piutang_record') && 
          !t.description?.includes('[Offset') && 
          !t.description?.includes('[WRITE_OFF]') && 
          !t.description?.includes('[Catat Awal]') && 
          !t.description?.includes('[Valas Masuk') && 
          t.category !== 'Penyesuaian Sistem' && 
          t.category !== 'Sistem: Auto-Fix Valas' &&
          t.category !== 'Sistem: Auto-Fix Valas v2' &&
          t.category !== 'Pemutihan Hutang' &&
          t.category !== 'Beli Aset Valas' &&
          t.category !== 'Jual Aset Valas' &&
          !(t.category || '').includes('Piutang Dibayar') &&
          !(t.category || '').includes('Dapat Pinjaman')
      );

      const baseExpenseTxs = thisPeriodTxs.filter((t:any) => 
          (t.type === 'expense' || t.type === 'hutang_record') && 
          !(t.category || '').toLowerCase().includes('invest') && 
          !t.description?.includes('[Offset') && 
          !t.description?.includes('[WRITE_OFF]') && 
          !t.description?.includes('[Catat Awal]') && 
          !t.description?.includes('[Valas Keluar') && 
          t.category !== 'Penyesuaian Sistem' && 
          t.category !== 'Sistem: Auto-Fix Valas' &&
          t.category !== 'Sistem: Auto-Fix Valas v2' &&
          t.category !== 'Penghapusan Piutang' &&
          t.category !== 'Beli Aset Valas' &&
          t.category !== 'Jual Aset Valas' &&
          t.category !== 'Amal' && 
          !(t.category || '').includes('Bayar Hutang') &&
          !(t.category || '').includes('Beri Pinjaman')
      );

      const virtualPLTxs: any[] = [];
      thisPeriodTxs.filter((t:any) => t.type === 'invest_sell' || t.type === 'forex_sell').forEach((t:any) => {
          if (t.description && t.description.includes('P/L:')) {
              const plString = t.description.split('P/L:')[1];
              if (plString) {
                  const cleanString = plString.replace(/[^0-9-]/g, '');
                  const plValue = parseInt(cleanString, 10);
                  if (!isNaN(plValue) && plValue !== 0) {
                      virtualPLTxs.push({
                          ...t, 
                          type: plValue > 0 ? 'income' : 'expense',
                          amount: Math.abs(plValue),
                          category: plValue > 0 ? (t.type === 'forex_sell' ? 'Profit Valas' : 'Profit Investasi') : (t.type === 'forex_sell' ? 'Rugi Valas' : 'Rugi Investasi'),
                          description: `Realisasi: ${t.description.split('@')[0].trim()}`
                      });
                  }
              }
          }
      });

      const incomeReceivablesPaid = thisPeriodTxs.filter((t:any) => 
          t.type === 'debt_receive' && t.description?.includes('[Pemasukan Cair]')
      );

      const allIncomeTxs = [...baseIncomeTxs, ...virtualPLTxs.filter(v => v.type === 'income'), ...incomeReceivablesPaid];
      const allExpenseTxs = [...baseExpenseTxs, ...virtualPLTxs.filter(v => v.type === 'expense')];

      const totalIncome = allIncomeTxs.reduce((acc:number, t:any) => acc + (Number(t.amount) || 0), 0);
      const totalExpense = allExpenseTxs.reduce((acc:number, t:any) => acc + (Number(t.amount) || 0), 0);
      
      const writeOffTransactions = allTxs.filter((t:any) => t.category === 'Penghapusan Piutang' && isTargetInPeriod(new Date(t.date)));
      const totalWriteOffLoss = writeOffTransactions.reduce((sum: number, t:any) => sum + (Number(t.amount) || 0), 0);
      const pemutihanTransactions = allTxs.filter((t:any) => t.category === 'Pemutihan Hutang' && isTargetInPeriod(new Date(t.date)));
      const totalPemutihanGain = pemutihanTransactions.reduce((sum: number, t:any) => sum + (Number(t.amount) || 0), 0);

      const forexRows = Array.from(new Set(allForexAssets.map((f:any) => f.currency))).map((curr: any) => {
          const relatedFx = allForexAssets.find((f:any) => f.currency === curr);
          let firstDate = relatedFx ? new Date(relatedFx.createdAt||Date.now()).getTime() : Date.now();
          allTxs.forEach((t:any) => { if ((t.category||'').includes(curr) || (t.description||'').includes(curr)) if(new Date(t.date).getTime() < firstDate) firstDate = new Date(t.date).getTime(); });
          if (firstDate > reportDateEnd.getTime()) return null; 

          let liveAmt = (relatedFx?.amount || 0);
          allTxs.filter((t:any) => new Date(t.date) > reportDateEnd && ((t.category||'').includes(curr) || (t.description||'').includes(curr))).forEach((t:any) => {
              const desc = t.description || "";
              let txQty = 0;
              const exMatch = desc.match(/(Beli|Jual|@)\s+([A-Z]{3})\s+([0-9.]+)/i) || desc.match(/(Beli|Jual)\s+([0-9.]+)\s+([A-Z]{3})/i);
              if (exMatch && (exMatch[1].toUpperCase() === curr || exMatch[3].toUpperCase() === curr)) {
                  txQty = parseFloat(exMatch[2]);
              } else {
                  const mutMatch = desc.match(/(IN|OUT) VALAS\s+([0-9.]+)/i) || desc.match(/\[Valas (Masuk|Keluar)\s+([0-9.]+)/i);
                  if (mutMatch) txQty = parseFloat(mutMatch[2]);
              }
              
              if (t.type === 'forex_sell' || t.category === 'Jual Aset Valas' || (t.type === 'expense' && desc.includes('VALAS'))) liveAmt += txQty;
              if (t.type === 'forex_buy' || t.category === 'Beli Aset Valas' || (t.type === 'income' && desc.includes('VALAS'))) liveAmt -= txQty;
          });
          if (liveAmt <= 0.001) return null; 
          const rate = getRate(curr);
          return [curr, liveAmt.toLocaleString('id-ID', {maximumFractionDigits: 2}), rate, Math.round(liveAmt * rate)];
      }).filter(Boolean);

      const invRows = Array.from(allUniqueSymbols).map((symbolRaw: any) => {
          const sym = symbolRaw.split('|')[0];
          const rate = getRate(symbolRaw.split('|')[1] || 'IDR');
          const dbInv = allInvestments.find((i:any) => i.symbol === symbolRaw);
          let firstDate = dbInv ? new Date(dbInv.createdAt||Date.now()).getTime() : Date.now();
          allTxs.forEach((t:any) => { if ((t.description||'').includes(sym) && new Date(t.date).getTime() < firstDate) firstDate = new Date(t.date).getTime(); });
          if (firstDate > reportDateEnd.getTime()) return null;

          let liveAmt = 0;
          if (dbInv) {
              const isSaham = dbInv.type === 'saham' || (!dbInv.type && sym.length === 4 && dbInv.type !== 'crypto');
              const m = (isSaham && !(dbInv.symbol || "").split('|')[1]) ? 100 : 1;
              liveAmt = (Number(dbInv.quantity) || 0) * (Number(dbInv.avgPrice) || 0) * m * rate;
          }
          allTxs.filter((t:any) => new Date(t.date) > reportDateEnd && (t.description||'').includes(sym)).forEach((t:any) => {
              const amt = Number(t.amount) || 0;
              if (t.type === 'invest_sell') {
                  let pl = 0;
                  if (t.description?.includes('P/L:')) pl = parseInt(t.description.split('P/L:')[1].replace(/[^0-9-]/g, '')) || 0;
                  liveAmt += (amt - pl);
              }
              if (t.type === 'invest_buy') liveAmt -= amt;
          });
          if (liveAmt <= 0) return null; 
          return [new Date(firstDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), 'Kepemilikan Aset', sym, Math.round(liveAmt)];
      }).filter(Boolean);

      const debtRows = Array.from(new Set(allDebts.map((d:any) => d.name))).map((name: any) => {
          const relatedDebts = allDebts.filter((d:any) => d.name === name);
          let firstDate = new Date(Math.min(...relatedDebts.map((d:any) => new Date(d.createdAt||Date.now()).getTime()))).getTime();
          allTxs.forEach((t:any) => { if ((t.description||'').includes(name.split('|')[0]) && new Date(t.date).getTime() < firstDate) firstDate = new Date(t.date).getTime(); });
          if (firstDate > reportDateEnd.getTime()) return null;

          const isHutang = relatedDebts[0].type === 'hutang';
          const actualCurr = name.split('|')[1] || 'IDR';
          const rate = getRate(actualCurr); 
          
          let liveAmt = relatedDebts.filter((d:any) => !d.isPaid).reduce((acc:number, d:any) => acc + d.amount, 0) * rate;
          allTxs.filter((t:any) => new Date(t.date) > reportDateEnd && (t.description||'').includes(name.split('|')[0])).forEach((t:any) => {
              const amt = Number(t.amount) || 0;
              if (isHutang) {
                  if (t.type === 'debt_pay' || t.category === 'Pemutihan Hutang') liveAmt += amt;
                  if (t.type === 'debt_borrow' || t.type === 'hutang_record') liveAmt -= amt;
              } else {
                  if (t.type === 'debt_receive' || t.category === 'Penghapusan Piutang') liveAmt += amt;
                  if (t.type === 'debt_lend' || t.type === 'piutang_record') liveAmt -= amt;
              }
          });
          if (liveAmt <= 0) return null;
          return [isHutang ? 'HUTANG' : 'PIUTANG', name.split('|')[0], actualCurr, Math.round(liveAmt), relatedDebts[0].dueDate];
      }).filter(Boolean);

      const amalRows = thisPeriodTxs.filter((t:any) => t.category === 'Amal').map((t: any) => [ new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), "Kebaikan", t.description || "Amal / Sedekah", Math.round(t.amount) ]);
      
      const sortedFlows = [...allIncomeTxs, ...allExpenseTxs].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const txRows = sortedFlows.map((t: any) => [ new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), t.type === 'income' || t.type === 'debt_receive' ? 'Masuk' : 'Keluar', t.category || "-", t.description || "-", Math.round(t.amount) ]);
      
      const invTxRows = thisPeriodTxs.filter((t:any) => ['invest_buy', 'invest_sell', 'forex_buy', 'forex_sell'].includes(t.type)).map((t: any) => {
          let action = t.type.includes('buy') ? 'Beli Aset' : 'Jual Aset';
          if (t.type.includes('forex')) action = t.type.includes('buy') ? 'Beli Valas' : 'Jual Valas';
          return [ new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), action, t.description, Math.round(t.amount) ];
      });

      return {
          archiveCash: archiveSnap.cash, 
          archiveInvest: archiveSnap.invest, 
          archiveForex: archiveSnap.forex, 
          archivePiutang: archiveSnap.piutang, 
          archiveDebt: archiveSnap.debt, 
          archiveRetained: archiveSnap.retained, 
          archiveNetWorth: archiveSnap.netWorth, 
          totalIncome, totalExpense, totalWriteOffLoss, totalPemutihanGain,
          forexRows, invRows, debtRows, amalRows, txRows, invTxRows
      };
  };

  const runAutoArchiver = (dbData: any, email: string) => {
      let firstDate = new Date();
      if (dbData.user && dbData.user.createdAt) firstDate = new Date(dbData.user.createdAt);
      else if (dbData.transactions && dbData.transactions.length > 0) firstDate = new Date(Math.min(...dbData.transactions.map((t:any) => new Date(t.date).getTime())));

      const now = new Date();
      let iterDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      while (iterDate < currentMonthStart) {
          const m = iterDate.getMonth();
          const y = iterDate.getFullYear();
          const archiveKey = `bilano_frozen_report_${email}_M_${m}_${y}`;
          
          if (!localStorage.getItem(archiveKey)) {
              const frozenData = generateFrozenData(m, y, false, dbData);
              localStorage.setItem(archiveKey, JSON.stringify(frozenData));
          }
          iterDate.setMonth(iterDate.getMonth() + 1);
      }
      
      for (let y = firstDate.getFullYear(); y < now.getFullYear(); y++) {
          const archiveKey = `bilano_frozen_report_${email}_Y_${11}_${y}`;
          if (!localStorage.getItem(archiveKey)) {
              const frozenData = generateFrozenData(11, y, true, dbData);
              localStorage.setItem(archiveKey, JSON.stringify(frozenData));
          }
      }
  };

  const getArchiveMonths = () => {
      if (!data) return [];
      let firstDate = new Date();
      if (userProfile && userProfile.createdAt) firstDate = new Date(userProfile.createdAt);
      else if (data.transactions && data.transactions.length > 0) firstDate = new Date(Math.min(...data.transactions.map((t:any) => new Date(t.date).getTime())));

      const archives = [];
      const now = new Date();
      let iterDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      while (iterDate < currentMonthStart) {
          archives.push({
              isYearly: false, month: iterDate.getMonth(), year: iterDate.getFullYear(),
              label: iterDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
          });
          iterDate.setMonth(iterDate.getMonth() + 1);
      }
      
      for (let y = firstDate.getFullYear(); y < now.getFullYear(); y++) archives.push({ isYearly: true, month: 11, year: y, label: `Tahunan ${y}` });
      archives.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          if (a.isYearly && !b.isYearly) return 1; 
          if (!a.isYearly && b.isYearly) return -1;
          return a.month - b.month;
      });
      return archives.reverse(); 
  };

  // =========================================================================
  // 📈 HIGH-END CORPORATE FINANCIAL CHART DRAWING (PDF)
  // =========================================================================
  const drawCorporateChart = (doc: jsPDF, title: string, subtitle: string, chartData: any[], startY: number, colorType: 'gold' | 'navy') => {
      const chartHeight = 36; 
      const chartWidth = 182; 
      const startX = 14;

      doc.setFontSize(10); 
      doc.setTextColor(29, 62, 114); 
      doc.setFont("helvetica", "bold"); 
      doc.text(title, startX, startY - 2);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(subtitle, startX, startY + 2.5);

      let maxVal = Math.max(...chartData.map(d => d.value), 0);
      let minVal = Math.min(...chartData.map(d => d.value), 0);
      if (maxVal > 0) maxVal = maxVal * 1.25; 
      if (maxVal === minVal) { maxVal = maxVal === 0 ? 100 : maxVal * 1.5; minVal = minVal > 0 ? 0 : minVal; }
      let range = maxVal - minVal; if (range === 0) range = 1;

      const plotStartY = startY + 7;
      const zeroY = plotStartY + chartHeight - ((0 - minVal) / range) * chartHeight;

      // Base Background Grid Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX, plotStartY, chartWidth, chartHeight, 2, 2, 'F');
      
      doc.setDrawColor(226, 232, 240); 
      doc.setLineWidth(0.3); 
      doc.line(startX, zeroY, startX + chartWidth, zeroY); 

      const numPoints = Math.max(1, chartData.length);
      const barGap = 4;
      const colWidth = (chartWidth - (barGap * (numPoints + 1))) / numPoints;

      chartData.forEach((item, i) => {
          const x = startX + barGap + (i * (colWidth + barGap));
          const valH = (Math.abs(item.value) / range) * (chartHeight - 8);
          const barY = item.value >= 0 ? zeroY - valH : zeroY;

          if (colorType === 'gold') {
              doc.setFillColor(246, 185, 59); // Bilano Gold
          } else {
              doc.setFillColor(item.value >= 0 ? 29 : 225, item.value >= 0 ? 62 : 29, item.value >= 0 ? 114 : 72);
          }

          if (valH > 0) {
              doc.roundedRect(x, barY, colWidth, Math.max(valH, 1.5), 1, 1, 'F');
          }

          // Label Angka
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(formatRpPendek(item.value), x + (colWidth / 2), item.value >= 0 ? barY - 2 : barY + valH + 3.5, { align: 'center' });

          // Label Bulan / Periode
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text(item.label, x + (colWidth / 2), plotStartY + chartHeight + 4.5, { align: 'center' });
      });

      return plotStartY + chartHeight + 14;
  };

  // =========================================================================
  // 📑 GENERATE PREMIUM WEALTH MANAGEMENT AUDIT PDF
  // =========================================================================
  const generatePDF = async (targetMonth?: number, targetYear?: number, isYearly: boolean = false) => {
    if (!userProfile?.isPro && localStorage.getItem("bilano_pro") !== "true") {
        toast({ title: "Fitur Premium 👑", description: "Cetak laporan PDF eksklusif untuk pengguna BILANO PRO.", variant: "destructive" });
        setTimeout(() => { setLocation('/paywall'); }, 1000); 
        return;
    }

    if (!data || !data.user) {
        toast({ title: "Data Belum Siap ⏳", description: "Sistem masih memuat data keuangan.", variant: "default" }); 
        return;
    }
    
    const processId = targetMonth !== undefined ? `archive_${targetMonth}_${targetYear}_${isYearly}` : 'current';
    setGeneratingId(processId);

    setTimeout(() => {
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const user = data.user || {};
            
            const now = new Date();
            const safeTargetYear = targetYear !== undefined ? targetYear : now.getFullYear();
            const nowForReport = (targetMonth !== undefined && targetYear !== undefined) ? new Date(targetYear, targetMonth, 1) : new Date();
            const reportDateEnd = isYearly ? new Date(safeTargetYear, 11, 31, 23, 59, 59) : new Date(safeTargetYear, nowForReport.getMonth() + 1, 0, 23, 59, 59);
            
            const isPastPeriod = reportDateEnd < now;
            const archiveKey = `bilano_frozen_report_${user.email}_${isYearly ? 'Y' : 'M'}_${targetMonth}_${safeTargetYear}`;
            let snapData: any = null;

            if (isPastPeriod && localStorage.getItem(archiveKey)) {
                snapData = JSON.parse(localStorage.getItem(archiveKey) as string);
                toast({ title: "Membuka Arsip Terkunci 🔒", description: "Menampilkan Laporan Permanen Historis..." });
            } else {
                snapData = generateFrozenData(nowForReport.getMonth(), safeTargetYear, isYearly, data);
                if (isPastPeriod) {
                    localStorage.setItem(archiveKey, JSON.stringify(snapData));
                }
            }

            let appStartDate = new Date();
            if (user.createdAt) appStartDate = new Date(user.createdAt);
            else if (data.transactions && data.transactions.length > 0) appStartDate = new Date(Math.min(...data.transactions.map((t:any) => new Date(t.date).getTime())));
            
            let chartStartMonth = new Date(appStartDate.getFullYear(), appStartDate.getMonth(), 1);
            const nowGraph = isYearly ? new Date(safeTargetYear, 11, 1) : new Date(safeTargetYear, nowForReport.getMonth(), 1);
            const paddedData = [];
            let iterDate = new Date(nowGraph.getFullYear(), nowGraph.getMonth(), 1); 
            
            while (iterDate >= chartStartMonth) {
                const mIdx = iterDate.getMonth(); const yIdx = iterDate.getFullYear();
                const label = iterDate.toLocaleDateString('id-ID', {month:'short', year:'2-digit'});
                const pastArchiveKey = `bilano_frozen_report_${user.email}_M_${mIdx}_${yIdx}`;
                const frozenStr = localStorage.getItem(pastArchiveKey);
                
                if (frozenStr) {
                    const frozen = JSON.parse(frozenStr);
                    const netFlow = (frozen.totalIncome || 0) - (frozen.totalExpense || 0);
                    if (iterDate <= nowGraph) {
                        paddedData.unshift({ label, netFlow: netFlow, cash: frozen.archiveCash, asset: frozen.archiveNetWorth });
                    }
                } else {
                    const liveSnap = generateFrozenData(mIdx, yIdx, false, data);
                    if (iterDate <= nowGraph) {
                        paddedData.unshift({ label, netFlow: (liveSnap.totalIncome - liveSnap.totalExpense), cash: liveSnap.archiveCash, asset: liveSnap.archiveNetWorth });
                    }
                }
                iterDate.setMonth(iterDate.getMonth() - 1);
            }

            let futureDate = new Date(nowGraph.getFullYear(), nowGraph.getMonth(), 1);
            while (paddedData.length < 12) {
                futureDate.setMonth(futureDate.getMonth() + 1);
                paddedData.push({ label: futureDate.toLocaleDateString('id-ID', {month:'short', year:'2-digit'}), netFlow: 0, cash: 0, asset: 0 }); 
            }

            const periodName = isYearly ? `Tahun ${safeTargetYear}` : `Bulan ${nowForReport.toLocaleDateString('id-ID', { month: 'long' })} ${safeTargetYear}`;

            // =========================================================================
            // 📑 EXECUTIVE CORPORATE PDF HEADER (GOLDMAN / MCKINSEY FINANCIAL STATEMENT STYLE)
            // =========================================================================
            
            // Top Navy Accent Bar
            doc.setFillColor(29, 62, 114); // Bilano Navy
            doc.rect(0, 0, 210, 8, 'F');
            
            // Top Gold Sub-accent
            doc.setFillColor(246, 185, 59); // Bilano Gold
            doc.rect(0, 8, 210, 1.5, 'F');

            // Logo & Brand Header
            try {
                if (logoBase64) doc.addImage(logoBase64, 'PNG', 14, 14, 38, 12);
                else { 
                    doc.setTextColor(29, 62, 114); 
                    doc.setFont("helvetica", "bold"); 
                    doc.setFontSize(22); 
                    doc.text("BILANO", 14, 24); 
                }
            } catch (e) {
                doc.setTextColor(29, 62, 114); 
                doc.setFont("helvetica", "bold"); 
                doc.setFontSize(22); 
                doc.text("BILANO", 14, 24);
            }

            // Right Header: Metadata
            doc.setTextColor(100, 116, 139); 
            doc.setFont("helvetica", "normal"); 
            doc.setFontSize(8.5);
            doc.text(`TANGGAL CETAK: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 196, 17, { align: 'right' });
            doc.text(`DIKELUARKAN UNTUK: ${user.firstName || 'Pengguna'} ${user.lastName || ''} (${user.email || 'Akun Terverifikasi'})`, 196, 22, { align: 'right' });
            doc.setFont("helvetica", "bold");
            doc.setTextColor(217, 119, 6);
            doc.text("STATUS: DOKUMEN RESMI & TERENKRIPSI", 196, 27, { align: 'right' });

            // Horizontal Separator
            doc.setDrawColor(226, 232, 240); 
            doc.setLineWidth(0.4); 
            doc.line(14, 31, 196, 31);
            
            // Big Statement Title Bar
            doc.setFillColor(29, 62, 114); 
            doc.roundedRect(14, 35, 182, 16, 2, 2, 'F');
            doc.setTextColor(246, 185, 59); 
            doc.setFont("helvetica", "bold"); 
            doc.setFontSize(13);
            doc.text(isYearly ? "ANNUAL WEALTH MANAGEMENT & FINANCIAL AUDIT" : "MONTHLY WEALTH MANAGEMENT & CASHFLOW AUDIT", 20, 43);
            doc.setTextColor(241, 245, 249);
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "normal");
            doc.text(`Periode Pemeriksaan: ${periodName} | Standar Pencatatan Akuntansi Finansial Pribadi BILANO`, 20, 48);

            // =========================================================================
            // 💼 EXECUTIVE SUMMARY CARD (TOTAL NET WORTH & CORE METRICS)
            // =========================================================================
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, 55, 182, 38, 3, 3, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, 55, 182, 38, 3, 3, 'D');

            // List aksen emas di sebelah kiri box
            doc.setFillColor(246, 185, 59);
            doc.roundedRect(14, 55, 3.5, 38, 1, 1, 'F');

            doc.setTextColor(100, 116, 139); 
            doc.setFontSize(8.5); 
            doc.setFont("helvetica", "bold"); 
            doc.text("TOTAL KEKAYAAN BERSIH (NET WORTH VALUE)", 22, 63);
            
            doc.setTextColor(29, 62, 114); 
            doc.setFontSize(22); 
            doc.text(formatRp(snapData.archiveNetWorth), 22, 73);

            // Arus Kas Murni Summary Pills
            const netCashflow = (snapData.totalIncome || 0) - (snapData.totalExpense || 0);
            doc.setFontSize(8.5);
            doc.setTextColor(5, 150, 105);
            doc.setFont("helvetica", "bold");
            doc.text(`Pemasukan: + ${formatRp(snapData.totalIncome)}`, 22, 83);
            
            doc.setTextColor(225, 29, 72);
            doc.text(`Pengeluaran: - ${formatRp(snapData.totalExpense)}`, 85, 83);

            doc.setTextColor(netCashflow >= 0 ? 5 : 225, netCashflow >= 0 ? 150 : 29, netCashflow >= 0 ? 105 : 72);
            doc.text(`Net Surplus: ${netCashflow >= 0 ? '+' : ''}${formatRp(netCashflow)}`, 145, 83);

            let currentY = 100;
            const checkPageBreak = (neededSpace: number) => { 
                if (currentY + neededSpace > 275) { 
                    doc.addPage(); 
                    // Header kecil di page baru
                    doc.setFillColor(29, 62, 114);
                    doc.rect(0, 0, 210, 4, 'F');
                    doc.setFillColor(246, 185, 59);
                    doc.rect(0, 4, 210, 1, 'F');
                    currentY = 18; 
                } 
            };

            // Target Progress Section jika ada
            if (!isYearly && targetData && targetData.targetAmount > 0) {
                checkPageBreak(32);
                doc.setTextColor(29, 62, 114); 
                doc.setFontSize(10.5); 
                doc.setFont("helvetica", "bold"); 
                doc.text("Performa Pencapaian Target Keuangan", 14, currentY);
                
                const progress = Math.min(100, Math.max(0, (snapData.archiveNetWorth / targetData.targetAmount) * 100)) || 0;
                const sisa = targetData.targetAmount - snapData.archiveNetWorth;
                
                doc.setFontSize(9); 
                doc.setFont("helvetica", "normal"); 
                doc.setTextColor(71, 85, 105);
                doc.text(`Goal Target: ${formatRp(targetData.targetAmount)} | Terkumpul: ${formatRp(snapData.archiveNetWorth)} (${progress.toFixed(1)}%)`, 14, currentY + 6);
                
                if (sisa > 0) { 
                    doc.setTextColor(225, 29, 72); 
                    doc.setFont("helvetica", "bold"); 
                    doc.text(`Kekurangan Akumulasi: ${formatRp(sisa)}`, 14, currentY + 11); 
                } else { 
                    doc.setTextColor(5, 150, 105); 
                    doc.setFont("helvetica", "bold"); 
                    doc.text(`Target Sukses Tercapai! (Melampaui Target)`, 14, currentY + 11); 
                }

                // Progress Bar
                doc.setFillColor(226, 232, 240); 
                doc.roundedRect(14, currentY + 14, 182, 4.5, 1.5, 1.5, 'F');
                if (progress > 0) { 
                    doc.setFillColor(29, 62, 114); 
                    doc.roundedRect(14, currentY + 14, (progress / 100) * 182, 4.5, 1.5, 1.5, 'F'); 
                }
                currentY += 27; 
            }

            // =========================================================================
            // 📊 CORPORATE TABLE STYLING OPTIONS (PROFESSIONAL & CLEAN)
            // =========================================================================
            const corporateTableStyles = {
                theme: 'grid' as const,
                styles: {
                    font: 'helvetica',
                    fontSize: 8.5,           
                    textColor: [30, 41, 59] as [number, number, number],          
                    lineColor: [226, 232, 240] as [number, number, number],
                    lineWidth: 0.2,        
                    cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }
                },
                headStyles: {
                    fontStyle: 'bold' as const,
                    fontSize: 9,           
                    textColor: [255, 255, 255] as [number, number, number],         
                    fillColor: [29, 62, 114] as [number, number, number],   // Deep Bilano Navy
                    lineColor: [29, 62, 114] as [number, number, number],
                    lineWidth: 0.2          
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252] as [number, number, number]
                }
            };
            
            // 1. NERACA TERPADU (BALANCE SHEET)
            checkPageBreak(50);
            doc.setTextColor(29, 62, 114); 
            doc.setFontSize(10.5); 
            doc.setFont("helvetica", "bold"); 
            doc.text("1. Neraca Terpadu Aset & Liabilitas (Balance Sheet)", 14, currentY);
            
            autoTable(doc, {
                startY: currentY + 4,
                head: [['Pos Posisi Keuangan (Neraca Akhir)', 'Estimasi Nilai Baku (IDR)']],
                body: [
                    ["Saldo Kas Likuid (Tunai & Rekening)", formatRp(snapData.archiveCash)],
                    ["Portofolio Investasi (Saham, Reksadana, Crypto, dll)", formatRp(snapData.archiveInvest)],
                    ["Aset Valuta Asing (Valas)", formatRp(snapData.archiveForex)],
                    ["Dana Tertahan di Platform Eksternal", formatRp(snapData.archiveRetained)],
                    ["Piutang Aktif Berjalan (Hak Tagih)", formatRp(snapData.archivePiutang)],
                    ["Liabilitas & Beban Hutang", `(${formatRp(snapData.archiveDebt)})`]
                ],
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
                ...corporateTableStyles
            });
            currentY = (doc as any).lastAutoTable.finalY + 10;

            // 2. DETAIL KEPEMILIKAN VALAS
            if (snapData.forexRows && snapData.forexRows.length > 0) {
                checkPageBreak(45); 
                doc.setTextColor(29, 62, 114); doc.setFontSize(10.5); doc.setFont("helvetica", "bold"); 
                doc.text("2. Detail Kepemilikan Valas (Berdasarkan Kurs Penutupan)", 14, currentY);
                const formattedForex = snapData.forexRows.map((r:any) => [r[0], r[1], formatRp(r[2]), formatRp(r[3])]);
                autoTable(doc, { 
                    startY: currentY + 4, 
                    head: [['Mata Uang', 'Jumlah Saldo', 'Kurs Satuan IDR', 'Estimasi Total Nilai (IDR)']], 
                    body: formattedForex, 
                    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } }, 
                    ...corporateTableStyles 
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            // 3. DETAIL KEPEMILIKAN INVESTASI
            if (snapData.invRows && snapData.invRows.length > 0) {
                checkPageBreak(45); 
                doc.setTextColor(29, 62, 114); doc.setFontSize(10.5); doc.setFont("helvetica", "bold"); 
                doc.text("3. Portofolio & Jadwal Instrumen Investasi", 14, currentY);
                const formattedInv = snapData.invRows.map((r:any) => [r[0], r[1], r[2], formatRp(r[3])]);
                autoTable(doc, { 
                    startY: currentY + 4, 
                    head: [['Tanggal Masuk', 'Tindakan', 'Detail Instrumen Aset', 'Valuasi Berjalan (IDR)']], 
                    body: formattedInv, 
                    columnStyles: { 0: { halign: 'center' }, 3: { halign: 'right', fontStyle: 'bold' } }, 
                    ...corporateTableStyles 
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            // 4. DAFTAR HUTANG & PIUTANG
            if (snapData.debtRows && snapData.debtRows.length > 0) {
                checkPageBreak(45); 
                doc.setTextColor(29, 62, 114); doc.setFontSize(10.5); doc.setFont("helvetica", "bold"); 
                doc.text("4. Daftar Rincian Hutang & Piutang Berjalan", 14, currentY);
                const formattedDebt = snapData.debtRows.map((r:any) => [
                    r[0], 
                    r[1], 
                    r[2] !== 'IDR' ? `${r[2]} (${formatRp(r[3])})` : formatRp(r[3]), 
                    r[4] ? new Date(r[4]).toLocaleDateString('id-ID') : 'Tanpa Tenggat', 
                    'Belum Lunas'
                ]);
                autoTable(doc, { 
                    startY: currentY + 4, 
                    head: [['Kategori', 'Nama Pihak', 'Total Nominal', 'Tenggat Waktu', 'Status']], 
                    body: formattedDebt, 
                    columnStyles: { 0: { fontStyle: 'bold' }, 2: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'center' } }, 
                    ...corporateTableStyles 
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            // 5. ALOKASI AMAL & SEDEKAH
            if (snapData.amalRows && snapData.amalRows.length > 0) {
                checkPageBreak(40); 
                doc.setTextColor(29, 62, 114); doc.setFontSize(10.5); doc.setFont("helvetica", "bold"); 
                doc.text(`5. Catatan Alokasi Sosial & Amal (${periodName})`, 14, currentY);
                const formattedAmal = snapData.amalRows.map((r:any) => [r[0], r[1], r[2], formatRp(r[3])]);
                autoTable(doc, { 
                    startY: currentY + 4, 
                    head: [['Tanggal', 'Tipe', 'Tujuan / Catatan Kebaikan', 'Nominal']], 
                    body: formattedAmal, 
                    columnStyles: { 0: { halign: 'center' }, 3: { halign: 'right', fontStyle: 'bold' } }, 
                    ...corporateTableStyles 
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            // 6. RIWAYAT ARUS KAS MURNI
            checkPageBreak(45); 
            doc.setTextColor(29, 62, 114); doc.setFontSize(10.5); doc.setFont("helvetica", "bold"); 
            doc.text(`6. Jurnal Transaksi Arus Kas (${periodName})`, 14, currentY);
            const formattedTx = (snapData.txRows || []).map((r:any) => [r[0], r[1], r[2], r[3], formatRp(r[4])]);

            if (formattedTx.length === 0) {
                doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139); 
                doc.text("Tidak ada catatan pengeluaran/pemasukan operasional pada periode ini.", 14, currentY + 8); 
                currentY += 15;
            } else {
                autoTable(doc, { 
                    startY: currentY + 4, 
                    head: [['Tanggal', 'Arus', 'Kategori', 'Catatan Transaksi', 'Nominal (IDR)']], 
                    body: formattedTx, 
                    columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center', fontStyle: 'bold' }, 4: { halign: 'right', fontStyle: 'bold' } }, 
                    ...corporateTableStyles 
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            // =========================================================================
            // 📈 PAGE 2: EXECUTIVE ANALYTICAL CHARTS & PERFORMANCE SCHEDULE
            // =========================================================================
            doc.addPage(); 
            let graphY = 18;

            doc.setFillColor(29, 62, 114);
            doc.rect(0, 0, 210, 4, 'F');
            doc.setFillColor(246, 185, 59);
            doc.rect(0, 4, 210, 1, 'F');

            doc.setTextColor(29, 62, 114); 
            doc.setFontSize(13); 
            doc.setFont("helvetica", "bold"); 
            doc.text(isYearly ? `Analisis Visual Kinerja Keuangan (${safeTargetYear})` : "Analisis Visual Kinerja Keuangan (Tren 12 Bulan)", 14, graphY + 6);
            
            graphY += 14;

            if (snapData.totalWriteOffLoss > 0) {
                doc.setFillColor(254, 242, 242);
                doc.roundedRect(14, graphY, 182, 16, 2, 2, 'F');
                doc.setDrawColor(244, 63, 94);
                doc.roundedRect(14, graphY, 182, 16, 2, 2, 'D');
                doc.setTextColor(159, 18, 57); 
                doc.setFontSize(9); 
                doc.setFont("helvetica", "bold"); 
                doc.text("Catatan Khusus Kerugian Piutang Diikhlaskan (Write-Off Loss):", 20, graphY + 6);
                doc.setFontSize(8.5); 
                doc.setFont("helvetica", "normal"); 
                doc.text(`Total Piutang Diikhlaskan periode ini: ${formatRp(snapData.totalWriteOffLoss)} (Penyesuaian Buku)`, 20, graphY + 11);
                graphY += 22;
            }

            const chartCash = paddedData.map((d:any) => ({ label: d.label, value: d.cash }));
            const chartNetFlow = paddedData.map((d:any) => ({ label: d.label, value: d.netFlow || 0 }));

            graphY = drawCorporateChart(doc, "1. Grafik Saldo Kas Likuid Bulanan", "Perkembangan ketersediaan dana kas tunai dan tabungan rekening berjalan.", chartCash, graphY, 'gold');
            graphY = drawCorporateChart(doc, isYearly ? "2. Grafik Arus Kas Bersih (Net Cashflow Tahunan)" : "2. Grafik Arus Kas Bersih (Net Surplus/Defisit Bulanan)", "Pemasukan bersih dikurangi total pengeluaran operasional per bulan.", chartNetFlow, graphY, 'navy');

            // Footer & Page Numbers pada seluruh halaman
            const totalPages = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i); 
                doc.setFontSize(7.5); 
                doc.setTextColor(148, 163, 184); 
                doc.setFont("helvetica", "normal");
                doc.text("Laporan Resmi BILANO Intelligence Wealth Engine — Kerahasiaan Dokumen Terjamin.", 14, 287);
                doc.text(`Halaman ${i} dari ${totalPages}`, 196, 287, { align: 'right' });
            }

            const fileName = isYearly ? `Laporan_Tahunan_BILANO_${safeTargetYear}.pdf` : `Laporan_Keuangan_BILANO_${nowForReport.toLocaleDateString('id-ID', { month: 'long' })}_${safeTargetYear}.pdf`;
            doc.save(fileName);
            toast({ title: "Laporan Terunduh! 📄", description: "Laporan PDF Standar Korporat siap ditinjau." });

        } catch (error: any) {
            console.error("PDF Engine Error:", error);
            toast({ title: "Gagal Memproses PDF", description: "Terjadi kesalahan sistem internal.", variant: "destructive" });
        } finally {
            setGeneratingId(null); 
        }
    }, 100); 
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <img src="/BILANO-ICON-NEW.png" alt="Loading" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-brand-navy font-black text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-gold"/>
                  <span>Memuat Pusat Laporan...</span>
              </div>
          </div>
      );
  }

  const archiveList = getArchiveMonths();

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA BILANO NAVY & GOLD */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b-2 border-amber-400">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(29,62,114,0.08)] flex items-center justify-between relative z-30 border-b border-amber-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            type="button"
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
                                Pembukuan & Arsip
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                            Pusat Laporan & PDF
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="bg-brand-navy text-brand-gold text-[10px] font-black px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 border border-brand-gold/30">
                        AUDIT ENGINE
                    </span>
                </div>
            </div>

            {/* FLAGSHIP HERO CARD: CETAK LAPORAN BULAN INI */}
            <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <FileBarChart className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3 fill-current" /> STANDAR KORPORAT
                        </span>
                        <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                            Bulan Berjalan
                        </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2 leading-tight">
                        Cetak Laporan Bulan Ini
                    </h2>
                    <p className="text-xs text-blue-100 font-medium leading-relaxed mb-4">
                        Download dokumen PDF resmi lengkap dengan Neraca Terpadu, Arus Kas Murni, Portofolio Valas, dan Rincian Hutang/Piutang.
                    </p>

                    <button 
                        type="button"
                        onClick={() => generatePDF()} 
                        disabled={generatingId !== null} 
                        className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {generatingId === 'current' ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-4 h-4 stroke-[2.5]"/>} 
                        <span>{generatingId === 'current' ? "MEMPROSES DOKUMEN PDF..." : "DOWNLOAD PDF SEKARANG"}</span>
                    </button>
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT SECTION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-4 pb-24 bg-slate-50 flex flex-col gap-4">
            
            {/* ARSIP LAPORAN HISTORIS (TERKUNCI / FROZEN REPORT) */}
            <div className="bg-white rounded-[28px] p-5 border-2 border-amber-200/90 shadow-[6px_6px_0px_0px] shadow-slate-900 space-y-3">
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-amber-600"/>
                        <h3 className="font-black text-brand-navy text-xs uppercase tracking-wider">
                            Arsip Laporan Historis (Terkunci)
                        </h3>
                    </div>
                    <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                        PERMANENT
                    </span>
                </div>

                <div className="space-y-2">
                    {archiveList.map((arc, i) => (
                        <div 
                            key={i} 
                            className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                                arc.isYearly 
                                    ? 'bg-amber-50/80 border-amber-300 shadow-[2px_2px_0px_0px] shadow-slate-900/40' 
                                    : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
                            }`}
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                                        Laporan {arc.label}
                                    </h4>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                    {arc.isYearly ? "Rekap Tahunan Lengkap" : `Arsip Bulanan Baku • ${arc.year}`}
                                </p>
                            </div>

                            <button 
                                type="button"
                                onClick={() => generatePDF(arc.month, arc.year, arc.isYearly)} 
                                disabled={generatingId !== null} 
                                className={`px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0px_0px] shadow-slate-900 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer ${
                                    generatingId === `archive_${arc.month}_${arc.year}_${arc.isYearly}` 
                                        ? 'bg-slate-200 text-slate-500' 
                                        : (arc.isYearly ? 'bg-brand-navy text-brand-gold' : 'bg-brand-gold text-brand-navy')
                                }`}
                            >
                                {generatingId === `archive_${arc.month}_${arc.year}_${arc.isYearly}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                ) : (
                                    <Download className="w-3.5 h-3.5 stroke-[2.5]"/>
                                )}
                                <span>PDF</span>
                            </button>
                        </div>
                    ))}

                    {archiveList.length === 0 && (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-4">
                            <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 font-bold">Belum ada arsip bulan lalu yang terkunci.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 6 BENTO CARDS: APA SAJA YANG ADA DI DALAM PDF */}
            <div className="space-y-2.5 pt-1">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <FileText className="w-4 h-4 text-amber-600"/> Komposisi Standar Dokumen PDF
                </h3>

                <div className="grid grid-cols-1 gap-2.5">
                    {[
                        { icon: Wallet, title: "Neraca Terpadu (Balance Sheet)", desc: "Rekap total Kas Likuid, Investasi, Valas, Saldo Tertahan, dan Hutang/Piutang.", color: "bg-sky-100 text-sky-800 border-sky-300" },
                        { icon: FileText, title: "Jurnal Arus Kas Murni (Cashflow)", desc: "Khusus mendata uang masuk dan keluar operasional murni periode laporan.", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
                        { icon: Briefcase, title: "Jadwal Portofolio Multi-Aset", desc: "Daftar instrumen saham, reksadana, crypto beserta harga rata-rata dan valuasi.", color: "bg-purple-100 text-purple-800 border-purple-300" },
                        { icon: Globe, title: "Detail Kepemilikan Valas Live", desc: "Tabel aset mata uang asing dikonversikan dengan kurs pasar penutupan.", color: "bg-cyan-100 text-cyan-800 border-cyan-300" },
                        { icon: HandCoins, title: "Jadwal Hutang & Piutang Aktif", desc: "Daftar pihak terkait, total nominal pokok, dan tanggal jatuh tempo.", color: "bg-rose-100 text-rose-800 border-rose-300" },
                        { icon: HeartHandshake, title: "Alokasi Amal & Sedekah", desc: "Pencatatan keberkahan sosial yang terpisah murni dari pos belanja rutin.", color: "bg-amber-100 text-amber-800 border-amber-300" },
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-[22px] border-2 border-amber-200/80 shadow-[3px_3px_0px_0px] shadow-slate-900/60 flex items-center gap-3.5">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${item.color}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-black text-slate-900 text-xs sm:text-sm">{item.title}</h4>
                                <p className="text-[11px] text-slate-500 font-bold leading-snug">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
      </div>
    </MobileLayout>
  );
}