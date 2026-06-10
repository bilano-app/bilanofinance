import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { Download, FileText, Globe, Wallet, FileBarChart, Loader2, Briefcase, HandCoins, Archive, HeartHandshake, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useUser } from "@/hooks/use-finance"; 
import { useLocation } from "wouter";

const DEFAULT_RATES: Record<string, number> = {
    "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
    "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
};

export default function Reports() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: userProfile } = useUser(); 
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
      if (num >= 1000000) return sign + (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return sign + (num / 1000).toFixed(0) + 'k';
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
        img.src = '/bilano_logo_horiz.png';
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
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const generateFrozenData = (targetMonth: number, targetYear: number, isYearly: boolean, dbData: any) => {
      const user = dbData.user || {};
      const allTxs = dbData.transactions || [];
      const allInvestments = dbData.investments || [];
      const allDebts = dbData.debts || [];
      const allForexAssets = dbData.forexAssets || [];
      const allRetained = dbData.retained || []; 

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

      const getSnapshotAt = (targetDate: Date) => {
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
                  snapForex += Math.max(0, liveAmt) * getRate(curr);
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
                  snapInvest += Math.max(0, liveAmt);
              }
          });

          return { cash: Math.max(0, snapCash), invest: snapInvest, forex: snapForex, piutang: snapPiutang, debt: snapDebt, netWorth: Math.max(0, snapCash) + snapInvest + snapForex + snapPiutang - snapDebt };
      };

      const archiveSnap = getSnapshotAt(reportDateEnd);
      const isTargetInPeriod = (d: Date) => isYearly ? d.getFullYear() === safeTargetYear : d.getMonth() === targetMonth && d.getFullYear() === safeTargetYear;
      
      const thisPeriodTxs = allTxs.filter((t:any) => isTargetInPeriod(new Date(t.date)));

      const pureTransactions = thisPeriodTxs.filter((t:any) => 
          !['Penyesuaian Sistem', 'Sistem: Auto-Fix Valas', 'Penghapusan Piutang', 'Pemutihan Hutang', 'Cairkan Valas', 'Tukar Valas', 'Investasi Valas', 'Piutang Valas Dibayar', 'Bayar Hutang Valas', 'Beli Aset Valas', 'Jual Aset Valas'].includes(t.category) 
          && ['income', 'expense', 'debt_receive', 'debt_pay', 'debt_borrow', 'debt_lend'].includes(t.type) 
          && !(t.description||'').includes('[Valas ')
          && !(t.description||'').includes('(Potong Dompet Valas)')
      );
      
      const totalIncome = pureTransactions.filter((t:any) => ['income', 'debt_receive', 'debt_borrow'].includes(t.type)).reduce((acc:number, t:any) => acc + (Number(t.amount) || 0), 0);
      const totalExpense = pureTransactions.filter((t:any) => ['expense', 'debt_pay', 'debt_lend'].includes(t.type) && t.category !== 'Amal').reduce((acc:number, t:any) => acc + (Number(t.amount) || 0), 0);
      
      const writeOffTransactions = allTxs.filter((t:any) => t.category === 'Penghapusan Piutang' && new Date(t.date) <= reportDateEnd);
      const totalWriteOffLoss = writeOffTransactions.reduce((sum: number, t:any) => sum + (Number(t.amount) || 0), 0);
      const pemutihanTransactions = allTxs.filter((t:any) => t.category === 'Pemutihan Hutang' && new Date(t.date) <= reportDateEnd);
      const totalPemutihanGain = pemutihanTransactions.reduce((sum: number, t:any) => sum + (Number(t.amount) || 0), 0);

      const snapRetained = allRetained.reduce((acc: number, r:any) => {
          const rate = r.currency === 'IDR' ? 1 : getRate(r.currency);
          return acc + (r.amount * rate);
      }, 0);

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
                  const mutMatch = desc.match(/\[Valas (Masuk|Keluar)\s+([0-9.]+)\s+([A-Z]{3})\]/i);
                  if (mutMatch && mutMatch[3].toUpperCase() === curr) txQty = parseFloat(mutMatch[2]);
              }
              
              if (t.type === 'forex_sell' || t.category === 'Jual Aset Valas' || (t.type === 'expense' && desc.includes('[Valas Keluar'))) liveAmt += txQty;
              if (t.type === 'forex_buy' || t.category === 'Beli Aset Valas' || (t.type === 'income' && desc.includes('[Valas Masuk'))) liveAmt -= txQty;
          });
          if (liveAmt <= 0.001) return null; 
          const rate = getRate(curr);
          return [curr, liveAmt.toLocaleString('id-ID', {maximumFractionDigits: 2}), rate, liveAmt * rate];
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
          return [new Date(firstDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), 'Kepemilikan Aset', sym, liveAmt];
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
          return [isHutang ? 'HUTANG' : 'PIUTANG', name.split('|')[0], actualCurr, liveAmt, relatedDebts[0].dueDate];
      }).filter(Boolean);

      const amalRows = thisPeriodTxs.filter((t:any) => t.category === 'Amal').map((t: any) => [ new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), "Kebaikan", t.description || "Amal / Sedekah", t.amount ]);
      const txRows = pureTransactions.map((t: any) => [ new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), (['income', 'debt_receive', 'debt_borrow'].includes(t.type)) ? 'Masuk' : 'Keluar', t.category || "-", t.description || "-", t.amount ]);
      
      const invTxRows = thisPeriodTxs.filter((t:any) => ['invest_buy', 'invest_sell', 'forex_buy', 'forex_sell'].includes(t.type)).map((t: any) => {
          let action = t.type.includes('buy') ? 'Beli Aset' : 'Jual Aset';
          if (t.type.includes('forex')) action = t.type.includes('buy') ? 'Beli Valas' : 'Jual Valas';
          return [ new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), action, t.description, t.amount ];
      });

      return {
          archiveCash: archiveSnap.cash, archiveInvest: archiveSnap.invest, archiveForex: archiveSnap.forex, archivePiutang: archiveSnap.piutang, archiveDebt: archiveSnap.debt, archiveRetained: snapRetained, archiveNetWorth: archiveSnap.netWorth + snapRetained,
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

  const drawLineChart = (doc: jsPDF, title: string, chartData: any[], startY: number, lineColor: number[]) => {
      const chartHeight = 35; const chartWidth = 170; const startX = 20;
      doc.setFontSize(10); doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "bold"); doc.text(title, startX, startY - 3);

      let maxVal = Math.max(...chartData.map(d => d.value), 0);
      let minVal = Math.min(...chartData.map(d => d.value), 0);
      if (maxVal > 0) maxVal = maxVal * 1.3; 
      if (maxVal === minVal) { maxVal = maxVal === 0 ? 100 : maxVal * 1.5; minVal = minVal > 0 ? 0 : minVal; }
      let range = maxVal - minVal; if (range === 0) range = 1;

      const zeroY = startY + chartHeight - ((0 - minVal) / range) * chartHeight;
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(startX, zeroY, startX + chartWidth, zeroY);

      const pointGap = chartWidth / Math.max(1, chartData.length - 1); 
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]); doc.setFillColor(lineColor[0], lineColor[1], lineColor[2]); doc.setLineWidth(0.8);

      let prevX = -1, prevY = -1;
      chartData.forEach((item, i) => {
          const x = startX + (i * pointGap); const valH = ((item.value - minVal) / range) * chartHeight; const y = startY + chartHeight - valH;
          if (prevX !== -1) doc.line(prevX, prevY, x, y); 
          doc.circle(x, y, 1.2, 'FD');
          doc.setFontSize(5); doc.setTextColor(lineColor[0], lineColor[1], lineColor[2]); doc.setFont("helvetica", "bold"); doc.text(formatRpPendek(item.value), x, y - 2.5, { align: 'center' });
          doc.setFontSize(6); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal"); doc.text(item.label, x, startY + chartHeight + 6, { align: 'center' });
          prevX = x; prevY = y;
      });
      return startY + chartHeight + 15;
  };

  const drawLollipopChart = (doc: jsPDF, title: string, chartData: any[], startY: number, color: number[]) => {
      const chartHeight = 35; const chartWidth = 170; const startX = 20;
      doc.setFontSize(10); doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "bold"); doc.text(title, startX, startY - 3);

      let maxVal = Math.max(...chartData.map(d => d.value), 0);
      let minVal = Math.min(...chartData.map(d => d.value), 0);
      if (maxVal > 0) maxVal = maxVal * 1.3; 
      if (maxVal === minVal) { maxVal = maxVal === 0 ? 100 : maxVal * 1.5; minVal = minVal > 0 ? 0 : minVal; }
      let range = maxVal - minVal; if (range === 0) range = 1;

      const zeroY = startY + chartHeight - ((0 - minVal) / range) * chartHeight;
      const pointGap = chartWidth / Math.max(1, chartData.length - 1); 

      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(startX, zeroY, startX + chartWidth, zeroY);

      chartData.forEach((item, i) => {
          const x = startX + (i * pointGap); const valH = ((item.value - minVal) / range) * chartHeight; const y = startY + chartHeight - valH;
          doc.setDrawColor(color[0], color[1], color[2]); doc.setLineWidth(1.2); doc.line(x, zeroY, x, y); 
          doc.setFillColor(color[0], color[1], color[2]); doc.circle(x, y, 1.8, 'FD'); 
          doc.setFontSize(5); doc.setTextColor(color[0], color[1], color[2]); doc.setFont("helvetica", "bold"); doc.text(formatRpPendek(item.value), x, item.value >= 0 ? y - 3 : y + 4, { align: 'center' });
          doc.setFontSize(6); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal"); doc.text(item.label, x, startY + chartHeight + 6, { align: 'center' });
      });
      return startY + chartHeight + 15;
  };

  const drawBarChart = (doc: jsPDF, title: string, chartData: any[], startY: number, barColor: number[]) => {
      const chartHeight = 35; const chartWidth = 170; const startX = 20;
      doc.setFontSize(10); doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "bold"); doc.text(title, startX, startY - 3);

      let maxVal = Math.max(...chartData.map(d => d.value), 0);
      let minVal = Math.min(...chartData.map(d => d.value), 0);
      if (maxVal > 0) maxVal = maxVal * 1.3; 
      if (maxVal === minVal) { maxVal = maxVal === 0 ? 100 : maxVal * 1.5; minVal = minVal > 0 ? 0 : minVal; }
      let range = maxVal - minVal; if (range === 0) range = 1;

      const zeroY = startY + chartHeight - ((0 - minVal) / range) * chartHeight;
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(startX, zeroY, startX + chartWidth, zeroY); 

      const barGap = 3; const barWidth = (chartWidth / Math.max(1, chartData.length)) - barGap;

      chartData.forEach((item, i) => {
          const x = startX + (i * (barWidth + barGap)) + barGap / 2; const valH = (Math.abs(item.value) / range) * chartHeight; const barY = item.value >= 0 ? zeroY - valH : zeroY;
          if (title.includes("Arus Kas")) doc.setFillColor(item.value >= 0 ? 16 : 244, item.value >= 0 ? 185 : 63, item.value >= 0 ? 129 : 94);
          else doc.setFillColor(barColor[0], barColor[1], barColor[2]);
          doc.rect(x, barY, barWidth, valH, 'F');
          doc.setFontSize(5); doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "bold"); doc.text(formatRpPendek(item.value), x + (barWidth / 2), item.value >= 0 ? barY - 2 : barY + valH + 3, { align: 'center' });
          doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100); doc.text(item.label, x + (barWidth / 2), startY + chartHeight + 6, { align: 'center' });
      });
      return startY + chartHeight + 15;
  };

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const isSetupCompleted = localStorage.getItem(`bilano_setup_completed_${userEmail}`) === "true";

  const generatePDF = async (targetMonth?: number, targetYear?: number, isYearly: boolean = false) => {
    
    if (!userProfile?.isPro && localStorage.getItem("bilano_pro") !== "true") {
        toast({ title: "Fitur Premium 👑", description: "Cetak laporan PDF eksklusif untuk pengguna BILANO PRO.", variant: "destructive" });
        setTimeout(() => { setLocation('/paywall'); }, 1000); return;
    }

    if (!data || !data.user) {
        toast({ title: "Data Belum Siap ⏳", description: "Sistem masih memuat data.", variant: "default" }); return;
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
                toast({ title: "Membuka Arsip Terkunci", description: "Menampilkan Laporan Offline Permanen..." });
            } else {
                snapData = generateFrozenData(nowForReport.getMonth(), safeTargetYear, isYearly, data);
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
                    const endOfMonth = new Date(yIdx, mIdx + 1, 0, 23, 59, 59);
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

            try {
                if (logoBase64) doc.addImage(logoBase64, 'PNG', 14, 10, 35, 12);
                else { doc.setTextColor(79, 70, 229); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("BILANO", 14, 20); }
            } catch (e) {
                doc.setTextColor(79, 70, 229); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("BILANO", 14, 20);
            }

            doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
            doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 196, 14, { align: 'right' });
            doc.text(`Dicetak Oleh: ${user.firstName || 'Pengguna'} ${user.lastName || ''}`, 196, 19, { align: 'right' });

            doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5); doc.line(14, 26, 196, 26);
            doc.setFillColor(79, 70, 229); doc.rect(14, 32, 182, 14, 'F');
            doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
            doc.text(isYearly ? "ANNUAL WEALTH MANAGEMENT REPORT" : "WEALTH MANAGEMENT REPORT", 20, 41);

            let currentY = 108;
            const checkPageBreak = (neededSpace: number) => { if (currentY + neededSpace > 280) { doc.addPage(); currentY = 20; } };

            doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.text("TOTAL KEKAYAAN BERSIH (NET WORTH)", 14, 60);
            doc.setTextColor(16, 185, 129); doc.setFontSize(26); doc.text(formatRp(snapData.archiveNetWorth), 14, 70);
            doc.setDrawColor(226, 232, 240); doc.line(14, 78, 196, 78);
            
            doc.setTextColor(50, 50, 50); doc.setFontSize(10); doc.setFont("helvetica", "bold");
            doc.text(`Ringkasan Arus Kas Murni (${periodName})`, 14, 88);
            doc.setFont("helvetica", "normal"); doc.setTextColor(16, 185, 129); doc.text(`Pemasukan: + ${formatRp(snapData.totalIncome)}`, 14