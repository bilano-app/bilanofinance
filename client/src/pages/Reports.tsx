import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { Download, FileText, Globe, Wallet, FileBarChart, Loader2, Briefcase, HandCoins, Archive, HeartHandshake } from "lucide-react";
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

  const formatRp = (val: number) => {
      const num = Number(val) || 0;
      return "Rp " + Math.round(num).toLocaleString("id-ID");
  };

  const formatRpPendek = (val: number) => {
      const num = Math.abs(Number(val) || 0);
      const sign = val < 0 ? "-" : "";
      if (num >= 1000000) return sign + (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return sign + (num / 1000).toFixed(0) + 'k';
      return sign + num.toString();
  };

  const getRate = (curr: string) => {
      if (!curr || curr === 'IDR') return 1;
      return forexRates[curr] || DEFAULT_RATES[curr] || 15000;
  };

  useEffect(() => {
    try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                setLogoBase64(canvas.toDataURL("image/png"));
            }
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

        if (resData.ok) setData(await resData.json());
        if (resRates.ok) setForexRates(await resRates.json());
        if (resTarget.ok) setTargetData(await resTarget.json());
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getArchiveMonths = () => {
      if (!data) return [];
      let firstDate = new Date();
      if (userProfile && userProfile.createdAt) {
          firstDate = new Date(userProfile.createdAt);
      } else if (data.transactions && data.transactions.length > 0) {
          const minTime = Math.min(...data.transactions.map((t:any) => new Date(t.date).getTime()));
          firstDate = new Date(minTime);
      }

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
      
      for (let y = firstDate.getFullYear(); y < now.getFullYear(); y++) {
          archives.push({ isYearly: true, month: 11, year: y, label: `Tahunan ${y}` });
      }

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
      doc.setFontSize(10); doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "bold");
      doc.text(title, startX, startY - 3);

      let maxVal = Math.max(...chartData.map(d => d.value), 0);
      let minVal = Math.min(...chartData.map(d => d.value), 0);
      if (maxVal > 0) maxVal = maxVal * 1.3; 
      if (maxVal === minVal) { maxVal = maxVal === 0 ? 100 : maxVal * 1.5; minVal = minVal > 0 ? 0 : minVal; }
      let range = maxVal - minVal; if (range === 0) range = 1;

      const zeroY = startY + chartHeight - ((0 - minVal) / range) * chartHeight;
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(startX, zeroY, startX + chartWidth, zeroY);

      const pointGap = chartWidth / Math.max(1, chartData.length - 1); 
      doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
      doc.setFillColor(lineColor[0], lineColor[1], lineColor[2]); doc.setLineWidth(0.8);

      let prevX = -1, prevY = -1;
      chartData.forEach((item, i) => {
          const x = startX + (i * pointGap);
          const valH = ((item.value - minVal) / range) * chartHeight;
          const y = startY + chartHeight - valH;

          if (prevX !== -1) doc.line(prevX, prevY, x, y); 
          doc.circle(x, y, 1.2, 'FD');

          doc.setFontSize(5); doc.setTextColor(lineColor[0], lineColor[1], lineColor[2]); doc.setFont("helvetica", "bold");
          doc.text(formatRpPendek(item.value), x, y - 2.5, { align: 'center' });

          doc.setFontSize(6); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal");
          doc.text(item.label, x, startY + chartHeight + 6, { align: 'center' });
          prevX = x; prevY = y;
      });
      return startY + chartHeight + 15;
  };

  const drawLollipopChart = (doc: jsPDF, title: string, chartData: any[], startY: number, color: number[]) => {
      const chartHeight = 35; const chartWidth = 170; const startX = 20;
      doc.setFontSize(10); doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "bold");
      doc.text(title, startX, startY - 3);

      let maxVal = Math.max(...chartData.map(d => d.value), 0);
      let minVal = Math.min(...chartData.map(d => d.value), 0);
      if (maxVal > 0) maxVal = maxVal * 1.3; 
      if (maxVal === minVal) { maxVal = maxVal === 0 ? 100 : maxVal * 1.5; minVal = minVal > 0 ? 0 : minVal; }
      let range = maxVal - minVal; if (range === 0) range = 1;

      const zeroY = startY + chartHeight - ((0 - minVal) / range) * chartHeight;
      const pointGap = chartWidth / Math.max(1, chartData.length - 1); 

      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); 
      doc.line(startX, zeroY, startX + chartWidth, zeroY);

      chartData.forEach((item, i) => {
          const x = startX + (i * pointGap);
          const valH = ((item.value - minVal) / range) * chartHeight;
          const y = startY + chartHeight - valH;

          doc.setDrawColor(color[0], color[1], color[2]); 
          doc.setLineWidth(1.2); doc.line(x, zeroY, x, y); 
          doc.setFillColor(color[0], color[1], color[2]); doc.circle(x, y, 1.8, 'FD'); 

          doc.setFontSize(5); doc.setTextColor(color[0], color[1], color[2]); doc.setFont("helvetica", "bold");
          const textY = item.value >= 0 ? y - 3 : y + 4;
          doc.text(formatRpPendek(item.value), x, textY, { align: 'center' });

          doc.setFontSize(6); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal");
          doc.text(item.label, x, startY + chartHeight + 6, { align: 'center' });
      });
      return startY + chartHeight + 15;
  };

  const drawBarChart = (doc: jsPDF, title: string, chartData: any[], startY: number, barColor: number[]) => {
      const chartHeight = 35; const chartWidth = 170; const startX = 20;
      doc.setFontSize(10); doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "bold");
      doc.text(title, startX, startY - 3);

      let maxVal = Math.max(...chartData.map(d => d.value), 0);
      let minVal = Math.min(...chartData.map(d => d.value), 0);
      if (maxVal > 0) maxVal = maxVal * 1.3; 
      if (maxVal === minVal) { maxVal = maxVal === 0 ? 100 : maxVal * 1.5; minVal = minVal > 0 ? 0 : minVal; }
      let range = maxVal - minVal; if (range === 0) range = 1;

      const zeroY = startY + chartHeight - ((0 - minVal) / range) * chartHeight;
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(startX, zeroY, startX + chartWidth, zeroY); 

      const barGap = 3; const barWidth = (chartWidth / Math.max(1, chartData.length)) - barGap;

      chartData.forEach((item, i) => {
          const x = startX + (i * (barWidth + barGap)) + barGap / 2;
          const valH = (Math.abs(item.value) / range) * chartHeight;
          const barY = item.value >= 0 ? zeroY - valH : zeroY;

          if (title.includes("Arus Kas")) doc.setFillColor(item.value >= 0 ? 16 : 244, item.value >= 0 ? 185 : 63, item.value >= 0 ? 129 : 94);
          else doc.setFillColor(barColor[0], barColor[1], barColor[2]);
          doc.rect(x, barY, barWidth, valH, 'F');

          doc.setFontSize(5); doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "bold");
          const textY = item.value >= 0 ? barY - 2 : barY + valH + 3;
          doc.text(formatRpPendek(item.value), x + (barWidth / 2), textY, { align: 'center' });

          doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
          doc.text(item.label, x + (barWidth / 2), startY + chartHeight + 6, { align: 'center' });
      });
      return startY + chartHeight + 15;
  };

  const generatePDF = (targetMonth?: number, targetYear?: number, isYearly: boolean = false) => {
    const isPro = userProfile?.isPro || localStorage.getItem("bilano_pro") === "true";
    if (!isPro) {
        toast({ title: "Fitur Premium 👑", description: "Cetak laporan PDF eksklusif untuk pengguna BILANO PRO. Silakan upgrade!", variant: "destructive" });
        setTimeout(() => { setLocation('/paywall'); }, 1000);
        return;
    }

    if (!data || !data.user) {
        toast({ title: "Data Belum Siap ⏳", description: "Sistem masih memuat data. Mohon tunggu sesaat dan klik lagi.", variant: "default" });
        return;
    }
    
    const processId = targetMonth !== undefined ? `archive_${targetMonth}_${targetYear}_${isYearly}` : 'current';
    setGeneratingId(processId);

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const user = data.user || {};
        const allTxs = data.transactions || [];
        const allInvestments = data.investments || [];
        const allDebts = data.debts || [];
        const allForexAssets = data.forexAssets || [];
        
        // ====================================================================
        // TITIK AWAL ABSOLUT (APP START DATE)
        // ====================================================================
        let appStartDate = new Date();
        if (user.createdAt) appStartDate = new Date(user.createdAt);
        else if (allTxs && allTxs.length > 0) {
            appStartDate = new Date(Math.min(...allTxs.map((t:any) => new Date(t.date).getTime())));
        }

        // INTELEJEN TANGGAL ASET (Pelacak transaksi pertama jika createdAt kosong)
        const getAssetStartDate = (asset: any, type: 'debt'|'forex'|'invest') => {
            if (asset.createdAt) return new Date(asset.createdAt);
            let firstDate = Date.now();
            allTxs.forEach((t:any) => {
                const txTime = new Date(t.date).getTime();
                if (type === 'debt' && (t.description || "").includes((asset.name || "").split('|')[0]) && txTime < firstDate) firstDate = txTime;
                else if (type === 'forex' && ((t.category || "").includes(asset.currency) || (t.description || "").includes(asset.currency)) && txTime < firstDate) firstDate = txTime;
                else if (type === 'invest' && (t.description || "").includes((asset.symbol || "").split('|')[0]) && txTime < firstDate) firstDate = txTime;
            });
            if (firstDate < appStartDate.getTime()) firstDate = appStartDate.getTime();
            return new Date(firstDate);
        };

        const liveCash = Number(user.cashBalance || 0);

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

        const now = new Date();
        const safeTargetYear = targetYear !== undefined ? targetYear : now.getFullYear();
        const nowForReport = (targetMonth !== undefined && targetYear !== undefined) ? new Date(targetYear, targetMonth, 1) : new Date();
        const reportDateEnd = isYearly ? new Date(safeTargetYear, 11, 31, 23, 59, 59) : new Date(safeTargetYear, nowForReport.getMonth() + 1, 0, 23, 59, 59);

        // ====================================================================
        // THE PURE ROLLBACK ALGORITHM (Sesuai Logika Matematika Bos)
        // ====================================================================
        const getSnapshotAt = (targetDate: Date) => {
            let snapCash = liveCash; 
            
            // 1. ROLLBACK KAS (HANYA DARI TRANSAKSI YANG MEMINDAHKAN UANG)
            allTxs.filter((t:any) => new Date(t.date) > targetDate).forEach((t:any) => {
                const amt = Number(t.amount) || 0;
                const isNonCash = t.description?.includes('[WRITE_OFF]') || t.description?.includes('[Catat Awal]');
                if (!isNonCash) {
                    // Jika di masa depan ada uang masuk, kurangi dari saldo
                    if (['income', 'debt_borrow', 'debt_receive', 'invest_sell', 'forex_sell'].includes(t.type)) snapCash -= amt; 
                    // Jika di masa depan ada uang keluar, tambahkan ke saldo
                    else if (['expense', 'debt_lend', 'debt_pay', 'invest_buy', 'forex_buy'].includes(t.type)) snapCash += amt;
                }
            });

            // 2. ROLLBACK HUTANG/PIUTANG PER ASET (Anti-Ghost)
            let snapPiutang = 0; let snapDebt = 0;
            allDebts.forEach((d:any) => {
                const created = getAssetStartDate(d, 'debt');
                if (created <= targetDate) { 
                    const rate = getRate((d.name || "").split('|')[1] || 'IDR');
                    const displayName = (d.name || "").split('|')[0];
                    let currentVal = d.isPaid ? 0 : Number(d.amount) * rate; 
                    
                    allTxs.filter((t:any) => new Date(t.date) > targetDate).forEach((t:any) => {
                        if ((t.description || "").includes(displayName)) {
                            const amt = Number(t.amount) || 0;
                            if (d.type === 'hutang') {
                                if (t.type === 'debt_pay' || t.category === 'Pemutihan Hutang') currentVal += amt;
                                if (t.type === 'debt_borrow' || t.type === 'hutang_record') currentVal -= amt; 
                            }
                            if (d.type === 'piutang') {
                                if (t.type === 'debt_receive' || t.category === 'Penghapusan Piutang') currentVal += amt;
                                if (t.type === 'debt_lend' || t.type === 'piutang_record') currentVal -= amt;
                            }
                        }
                    });
                    if (d.type === 'hutang') snapDebt += Math.max(0, currentVal);
                    if (d.type === 'piutang') snapPiutang += Math.max(0, currentVal);
                }
            });

            // 3. ROLLBACK VALAS PER ASET (Anti-Ghost)
            let snapForex = 0;
            allForexAssets.forEach((f:any) => {
                const created = getAssetStartDate(f, 'forex');
                if (created <= targetDate) { 
                    let currentVal = (Number(f.amount) || 0) * getRate(f.currency);
                    allTxs.filter((t:any) => new Date(t.date) > targetDate).forEach((t:any) => {
                        if ((t.category || "").includes(f.currency) || (t.description || "").includes(f.currency)) {
                            const amt = Number(t.amount) || 0;
                            if (t.type === 'forex_sell') currentVal += amt;
                            if (t.type === 'forex_buy') currentVal -= amt;
                        }
                    });
                    snapForex += Math.max(0, currentVal);
                }
            });

            // 4. ROLLBACK INVESTASI PER ASET (Anti-Ghost)
            let snapInvest = 0;
            allInvestments.forEach((inv:any) => {
                const created = getAssetStartDate(inv, 'invest');
                if (created <= targetDate) { 
                    const [sym, curr] = (inv.symbol || "").split('|');
                    const rate = getRate(curr); 
                    const isSaham = inv.type === 'saham' || (!inv.type && sym.length === 4 && inv.type !== 'crypto');
                    const m = (isSaham && (!curr || curr === 'IDR')) ? 100 : 1;
                    
                    let currentVal = (Number(inv.quantity) || 0) * (Number(inv.avgPrice) || 0) * m * rate;
                    allTxs.filter((t:any) => new Date(t.date) > targetDate).forEach((t:any) => {
                        if ((t.description || "").includes(sym)) {
                            const amt = Number(t.amount) || 0;
                            if (t.type === 'invest_buy') currentVal -= amt;
                            if (t.type === 'invest_sell') {
                                let c = amt;
                                if (t.description?.includes('P/L:')) {
                                    const pl = parseInt(t.description.split('P/L:')[1].replace(/[^0-9-]/g, ''), 10);
                                    if (!isNaN(pl)) c = t.description.includes('P/L: -') ? amt + Math.abs(pl) : Math.max(0, amt - Math.abs(pl));
                                }
                                currentVal += c;
                            }
                        }
                    });
                    snapInvest += Math.max(0, currentVal);
                }
            });

            return {
                cash: snapCash, 
                invest: snapInvest, forex: snapForex, piutang: snapPiutang, debt: snapDebt,
                netWorth: snapCash + snapInvest + snapForex + snapPiutang - snapDebt
            };
        };

        const archiveSnap = getSnapshotAt(reportDateEnd);
        const archiveCash = archiveSnap.cash;
        const archiveInvest = archiveSnap.invest;
        const archiveForex = archiveSnap.forex;
        const archivePiutang = archiveSnap.piutang;
        const archiveDebt = archiveSnap.debt;
        const archiveNetWorth = archiveSnap.netWorth;

        const periodName = isYearly ? `Tahun ${safeTargetYear}` : `Bulan ${nowForReport.toLocaleDateString('id-ID', { month: 'long' })} ${safeTargetYear}`;
        const isTargetInPeriod = (d: Date) => isYearly ? d.getFullYear() === safeTargetYear : d.getMonth() === nowForReport.getMonth() && d.getFullYear() === safeTargetYear;

        const pureTransactions = allTxs.filter((t:any) => {
            const isExcludedCat = ['Penyesuaian Sistem', 'Penghapusan Piutang', 'Pemutihan Hutang', 'Cairkan Valas', 'Tukar Valas', 'Investasi Valas', 'Piutang Valas Dibayar', 'Bayar Hutang Valas'].includes(t.category);
            if (isExcludedCat) return false;
            // 🚀 Pelunasan Piutang dan Hutang masuk ke Arus Kas Utama!
            return ['income', 'expense', 'debt_receive', 'debt_pay', 'debt_borrow', 'debt_lend'].includes(t.type);
        });

        const currentPeriodTx = pureTransactions.filter((t:any) => isTargetInPeriod(new Date(t.date)));
        const totalIncome = currentPeriodTx.filter((t:any) => ['income', 'debt_receive', 'debt_borrow'].includes(t.type)).reduce((acc:number, t:any) => acc + (Number(t.amount) || 0), 0);
        const totalExpense = currentPeriodTx.filter((t:any) => ['expense', 'debt_pay', 'debt_lend'].includes(t.type) && t.category !== 'Amal').reduce((acc:number, t:any) => acc + (Number(t.amount) || 0), 0);

        const writeOffTransactions = allTxs.filter((t:any) => t.category === 'Penghapusan Piutang' && new Date(t.date) <= reportDateEnd);
        const totalWriteOffLoss = writeOffTransactions.reduce((sum: number, t:any) => sum + (Number(t.amount) || 0), 0);
        const pemutihanTransactions = allTxs.filter((t:any) => t.category === 'Pemutihan Hutang' && new Date(t.date) <= reportDateEnd);
        const totalPemutihanGain = pemutihanTransactions.reduce((sum: number, t:any) => sum + (Number(t.amount) || 0), 0);

        let currentY = 108;
        const checkPageBreak = (neededSpace: number) => { if (currentY + neededSpace > 280) { doc.addPage(); currentY = 20; } };

        doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.text("TOTAL KEKAYAAN BERSIH (NET WORTH)", 14, 60);
        doc.setTextColor(16, 185, 129); doc.setFontSize(26); doc.text(formatRp(archiveNetWorth), 14, 70);
        doc.setDrawColor(226, 232, 240); doc.line(14, 78, 196, 78);
        
        doc.setTextColor(50, 50, 50); doc.setFontSize(10); doc.setFont("helvetica", "bold");
        doc.text(`Ringkasan Arus Kas Murni (${periodName})`, 14, 88);
        doc.setFont("helvetica", "normal"); doc.setTextColor(16, 185, 129); doc.text(`Pemasukan: + ${formatRp(totalIncome)}`, 14, 95);
        doc.setTextColor(244, 63, 94); doc.text(`Pengeluaran: - ${formatRp(totalExpense)}`, 80, 95);

        if (!isYearly && targetData && targetData.targetAmount > 0) {
            checkPageBreak(40); doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Performa Pencapaian Target", 14, currentY);
            const progress = Math.min(100, Math.max(0, (archiveNetWorth / targetData.targetAmount) * 100)) || 0;
            const sisa = targetData.targetAmount - archiveNetWorth;
            doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
            doc.text(`Target Impian: ${formatRp(targetData.targetAmount)}`, 14, currentY + 6);
            doc.text(`Terkumpul saat ini: ${formatRp(archiveNetWorth)} (${progress.toFixed(1)}%)`, 14, currentY + 11);
            if (sisa > 0) { doc.setTextColor(244, 63, 94); doc.text(`Kekurangan: ${formatRp(sisa)}`, 14, currentY + 16); } 
            else { doc.setTextColor(16, 185, 129); doc.setFont("helvetica", "bold"); doc.text(`Tercapai! Anda berhasil mencapai target.`, 14, currentY + 16); }
            doc.setFillColor(226, 232, 240); doc.roundedRect(14, currentY + 20, 182, 4, 2, 2, 'F');
            if (progress > 0) { doc.setFillColor(16, 185, 129); doc.roundedRect(14, currentY + 20, (progress / 100) * 182, 4, 2, 2, 'F'); }
            currentY += 32; 
        }

        checkPageBreak(50);
        autoTable(doc, {
          startY: currentY, head: [['Rincian Aset & Kewajiban (Neraca Akhir)', 'Estimasi Nominal (IDR)']],
          body: [
            ["Saldo Tunai Kas", formatRp(archiveCash)],
            ["Aset Investasi (Saham, Crypto, Emas, dll)", formatRp(archiveInvest)],
            ["Aset Mata Uang Asing (Valas)", formatRp(archiveForex)],
            ["Piutang Aktif (Uang di Pihak Lain)", formatRp(archivePiutang)],
            ["Hutang (Kewajiban)", `(${formatRp(archiveDebt)})`]
          ],
          theme: 'grid', headStyles: { fillColor: [79, 70, 229], fontSize: 10 }, columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }, alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;

        // 🚀 TABEL VALAS PDF DENGAN ROLLBACK
        const forexRows = allForexAssets.map((f: any) => {
            const created = getAssetStartDate(f, 'forex');
            if (created > reportDateEnd) return null;
            let currentVal = (Number(f.amount) || 0);
            allTxs.filter((t:any) => new Date(t.date) > reportDateEnd).forEach((t:any) => {
                if ((t.category || "").includes(f.currency) || (t.description || "").includes(f.currency)) {
                    if (t.type === 'forex_sell') currentVal += (Number(t.amount) || 0);
                    if (t.type === 'forex_buy') currentVal -= (Number(t.amount) || 0);
                }
            });
            if (currentVal <= 0) return null;
            const rate = getRate(f.currency); const idrVal = currentVal * rate;
            return [f.currency, currentVal.toLocaleString(), formatRp(rate), formatRp(idrVal)];
        }).filter(Boolean);

        if (forexRows.length > 0) {
            checkPageBreak(40); doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Detail Kepemilikan Valas (Berdasarkan Kurs Live)", 14, currentY);
            autoTable(doc, { startY: currentY + 5, head: [['Mata Uang', 'Jumlah Kepemilikan', 'Kurs Saat Ini', 'Estimasi Nilai IDR']], body: forexRows, theme: 'striped', headStyles: { fillColor: [14, 165, 233] }, columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } } });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // 🚀 TABEL INVESTASI PDF DENGAN ROLLBACK
        const invRows = allInvestments.map((inv: any) => {
            const created = getAssetStartDate(inv, 'invest');
            if (created > reportDateEnd) return null;
            const sym = (inv.symbol || "").split('|')[0];
            const rate = getRate((inv.symbol || "").split('|')[1] || 'IDR'); 
            const isSaham = inv.type === 'saham' || (!inv.type && sym.length === 4 && inv.type !== 'crypto');
            const m = (isSaham && !(inv.symbol || "").split('|')[1]) ? 100 : 1;
            
            let currentVal = (Number(inv.quantity) || 0) * (Number(inv.avgPrice) || 0) * m * rate;
            allTxs.filter((t:any) => new Date(t.date) > reportDateEnd).forEach((t:any) => {
                if ((t.description || "").includes(sym)) {
                    const amt = Number(t.amount) || 0;
                    if (t.type === 'invest_buy') currentVal -= amt;
                    if (t.type === 'invest_sell') {
                        let c = amt;
                        if (t.description?.includes('P/L:')) {
                            const pl = parseInt(t.description.split('P/L:')[1].replace(/[^0-9-]/g, ''), 10);
                            if (!isNaN(pl)) c = t.description.includes('P/L: -') ? amt + Math.abs(pl) : Math.max(0, amt - Math.abs(pl));
                        }
                        currentVal += c;
                    }
                }
            });
            if (currentVal <= 0) return null;
            return [created.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), 'Kepemilikan Aset', sym, formatRp(currentVal)];
        }).filter(Boolean);

        if (invRows.length > 0) {
            checkPageBreak(40); doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`Detail Kepemilikan Investasi`, 14, currentY);
            autoTable(doc, { startY: currentY + 5, head: [['Tanggal Masuk', 'Tindakan', 'Detail Aset', 'Total Nilai (IDR)']], body: invRows, theme: 'grid', headStyles: { fillColor: [16, 185, 129] }, columnStyles: { 1: { halign: 'center', fontStyle: 'bold' }, 3: { halign: 'right', fontStyle: 'bold' } } });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // 🚀 TABEL HUTANG/PIUTANG PDF DENGAN ROLLBACK
        const debtRows = allDebts.map((d: any) => {
            const created = getAssetStartDate(d, 'debt');
            if (created > reportDateEnd) return null;
            const displayName = (d.name || "").split('|')[0];
            const actualCurr = (d.name || "").split('|')[1] || 'IDR';
            const rate = getRate(actualCurr); 
            
            let currentVal = d.isPaid ? 0 : Number(d.amount) * rate;
            allTxs.filter((t:any) => new Date(t.date) > reportDateEnd).forEach((t:any) => {
                if ((t.description || "").includes(displayName)) {
                    const amt = Number(t.amount) || 0;
                    if (d.type === 'hutang') {
                        if (t.type === 'debt_pay' || t.category === 'Pemutihan Hutang') currentVal += amt;
                        if (t.type === 'debt_borrow' || t.type === 'hutang_record') currentVal -= amt; 
                    }
                    if (d.type === 'piutang') {
                        if (t.type === 'debt_receive' || t.category === 'Penghapusan Piutang') currentVal += amt;
                        if (t.type === 'debt_lend' || t.type === 'piutang_record') currentVal -= amt;
                    }
                }
            });
            const remaining = Math.max(0, currentVal);
            if (remaining <= 0 && d.isPaid) return null; // Sembunyikan jika sudah lunas di masa lalu
            return [d.type === 'hutang' ? 'HUTANG' : 'PIUTANG', displayName, actualCurr !== 'IDR' ? `${actualCurr} (Sisa: ${formatRp(remaining)})` : formatRp(remaining), d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : 'Tanpa Tenggat', remaining <= 0 ? 'LUNAS' : 'Belum Lunas']
        }).filter(Boolean);

        if (debtRows.length > 0) {
            checkPageBreak(40); doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Daftar Rincian Hutang & Piutang Berjalan", 14, currentY);
            autoTable(doc, { startY: currentY + 5, head: [['Kategori', 'Nama Pihak', 'Total Nominal', 'Tenggat Waktu', 'Status']], body: debtRows, theme: 'grid', headStyles: { fillColor: [236, 72, 153] }, columnStyles: { 0: { fontStyle: 'bold' }, 2: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'center' } } });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        const currentPeriodAmal = currentPeriodTx.filter((t:any) => t.category === 'Amal');
        if (currentPeriodAmal.length > 0) {
            checkPageBreak(40); doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`Catatan Amal & Sedekah (${periodName})`, 14, currentY);
            const amalRows = currentPeriodAmal.map((t: any) => [ new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), "Kebaikan", t.description || "Amal / Sedekah", formatRp(Number(t.amount) || 0) ]);
            autoTable(doc, { startY: currentY + 5, head: [['Tanggal', 'Tipe', 'Tujuan / Catatan', 'Nominal']], body: amalRows, theme: 'grid', headStyles: { fillColor: [16, 185, 129] }, columnStyles: { 1: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }, 3: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] } } });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        checkPageBreak(40); doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`Riwayat Transaksi Arus Kas Murni (${periodName})`, 14, currentY);
        const txRows = currentPeriodTx.filter((t:any) => t.category !== 'Amal').map((t: any) => [
          new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
          (['income', 'debt_receive', 'debt_borrow'].includes(t.type)) ? 'Masuk' : 'Keluar', t.category || "-", t.description || "-", formatRp(Number(t.amount) || 0)
        ]);

        if (txRows.length === 0) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(150, 150, 150); doc.text("Tidak ada catatan pengeluaran/pemasukan murni di periode ini.", 14, currentY + 10); currentY += 20;
        } else {
            autoTable(doc, { startY: currentY + 5, head: [['Tanggal', 'Arus', 'Kategori', 'Catatan', 'Nominal']], body: txRows, theme: 'grid', headStyles: { fillColor: [249, 115, 22] }, columnStyles: { 1: { halign: 'center', fontStyle: 'bold' }, 4: { halign: 'right', fontStyle: 'bold' } }, didParseCell: function (data) { if (data.section === 'body' && data.column.index === 1) { if (data.cell.raw === 'Masuk') data.cell.styles.textColor = [16, 185, 129]; if (data.cell.raw === 'Keluar') data.cell.styles.textColor = [244, 63, 94]; } } });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        doc.addPage(); let graphY = 20;
        doc.setTextColor(50, 50, 50); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(isYearly ? `Analisis Grafik Performa Keuangan (${safeTargetYear})` : "Analisis Grafik Performa Keuangan (12 Bulan)", 14, graphY);
        graphY += 15;

        if (totalWriteOffLoss > 0) {
            doc.setFillColor(254, 226, 226); doc.setDrawColor(248, 113, 113); doc.rect(14, graphY, 182, 22, 'FD');
            doc.setTextColor(225, 29, 72); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Pencatatan Kerugian (Penghapusan Piutang Tak Tertagih)", 18, graphY + 7);
            doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 50, 50); doc.text(`Total Piutang Diikhlaskan: ${formatRp(totalWriteOffLoss)}`, 18, graphY + 13);
            doc.setFontSize(8); doc.text("*Nilai ini telah dikurangkan dari Net Worth dan dicatat sebagai beban kerugian (Non-Kas).", 18, graphY + 18);
            graphY += 30;
        }

        if (totalPemutihanGain > 0) {
            doc.setFillColor(209, 250, 229); doc.setDrawColor(52, 211, 153); doc.rect(14, graphY, 182, 22, 'FD');
            doc.setTextColor(5, 150, 105); doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Pencatatan Keuntungan (Pemutihan Hutang)", 18, graphY + 7);
            doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(6, 95, 70); doc.text(`Total Hutang Diputihkan / Dibebaskan: ${formatRp(totalPemutihanGain)}`, 18, graphY + 13);
            doc.setFontSize(8); doc.text("*Nilai ini telah ditambahkan ke Net Worth sebagai keuntungan pembebasan hutang (Non-Kas).", 18, graphY + 18);
            graphY += 35;
        }

        // 🚀 LOOP GRAFIK (MEMULAI TEPAT DARI BULAN PENDAFTARAN)
        let chartStartMonth = new Date(appStartDate.getFullYear(), appStartDate.getMonth(), 1);
        const paddedData = [];
        let iterDate = new Date(nowGraph.getFullYear(), nowGraph.getMonth(), 1); 
        
        while (iterDate >= chartStartMonth) {
            const mIdx = iterDate.getMonth(); const yIdx = iterDate.getFullYear();
            const endOfMonth = new Date(yIdx, mIdx + 1, 0, 23, 59, 59);
            const label = iterDate.toLocaleDateString('id-ID', {month:'short', year:'2-digit'});
            const snap = getSnapshotAt(endOfMonth);
            
            let pureIn = 0; let pureOut = 0; 
            allTxs.forEach((t:any) => {
                const d = new Date(t.date);
                if(d.getMonth() === mIdx && d.getFullYear() === yIdx) {
                    const isExcludedCat = ['Penyesuaian Sistem', 'Penghapusan Piutang', 'Pemutihan Hutang', 'Cairkan Valas', 'Tukar Valas', 'Investasi Valas', 'Piutang Valas Dibayar', 'Bayar Hutang Valas'].includes(t.category);
                    if (!isExcludedCat) {
                        if (['income', 'debt_receive', 'debt_borrow'].includes(t.type)) pureIn += (Number(t.amount) || 0);
                        if (['expense', 'debt_pay', 'debt_lend'].includes(t.type)) pureOut += (Number(t.amount) || 0);
                    }
                }
            });
            
            if (iterDate <= nowGraph) {
                paddedData.unshift({ label, netFlow: pureIn - pureOut, cash: snap.cash, asset: snap.netWorth });
            }
            iterDate.setMonth(iterDate.getMonth() - 1);
        }

        let futureDate = new Date(nowGraph.getFullYear(), nowGraph.getMonth(), 1);
        while (paddedData.length < 12) {
            futureDate.setMonth(futureDate.getMonth() + 1);
            paddedData.push({ label: futureDate.toLocaleDateString('id-ID', {month:'short', year:'2-digit'}), netFlow: 0, cash: 0, asset: 0 }); 
        }

        const chartAsset = paddedData.map(d => ({ label: d.label, value: d.asset || 0 }));
        const chartCash = paddedData.map(d => ({ label: d.label, value: d.cash || 0 }));
        const chartNetFlow = paddedData.map(d => ({ label: d.label, value: d.netFlow || 0 }));

        graphY = drawLineChart(doc, "1. Grafik Kekayaan Bersih (Line Chart) - Akumulasi", chartAsset, graphY, [79, 70, 229]); graphY += 10;
        graphY = drawLollipopChart(doc, "2. Grafik Kas Tunai (Lollipop Chart) - Akumulasi", chartCash, graphY, [14, 165, 233]); graphY += 10;
        drawBarChart(doc, isYearly ? `3. Arus Kas Bersih Tahunan (Bar Chart)` : "3. Arus Kas Bersih Bulanan (Bar Chart)", chartNetFlow, graphY, [16, 185, 129]);

        for (let i = 1; i <= (doc as any).internal.getNumberOfPages(); i++) {
            doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "italic");
            doc.text("Dokumen ini di-generate secara otomatis oleh Sistem Aplikasi BILANO.", 14, 285);
            doc.text(`Halaman ${i} dari ${(doc as any).internal.getNumberOfPages()}`, 196, 285, { align: 'right' });
        }

        doc.save(isYearly ? `Laporan_Tahunan_BILANO_${safeTargetYear}.pdf` : `Laporan_Keuangan_BILANO_${nowForReport.toLocaleDateString('id-ID', { month: 'long' })}_${safeTargetYear}.pdf`);
        toast({ title: "Berhasil Mengunduh!", description: "Laporan PDF Premium siap dilihat." });
        setGeneratingId(null); 
    } catch (error: any) {
        console.error("PDF Engine Error:", error);
        toast({ title: "Gagal Memproses PDF", description: "Terjadi kesalahan internal.", variant: "destructive" });
        setGeneratingId(null);
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <img src="/BILANO-ICON.png" alt="Loading" className="w-24 h-24 mb-6 animate-pulse object-contain" />
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full"><Loader2 className="w-4 h-4 animate-spin"/><span>Memuat Data...</span></div>
          </div>
      );
  }

  const archiveList = getArchiveMonths();

  return (
    <MobileLayout title="Pusat Laporan" showBack>
      <div className="space-y-6 pt-4 pb-20 px-2 animate-in fade-in">
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-200 text-center relative overflow-hidden">
            <div className="relative z-10">
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm border border-white/20"><FileBarChart className="w-8 h-8 text-white"/></div>
                <h2 className="text-2xl font-extrabold mb-2">Cetak Laporan Bulan Ini</h2>
                <p className="text-indigo-100 text-xs mb-8 px-4 leading-relaxed font-medium">Download laporan PDF profesional lengkap dengan neraca, arus kas, hutang, dan riwayat investasi terkini.</p>
                <Button onClick={() => generatePDF()} disabled={generatingId !== null} className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold shadow-xl border-none h-14 rounded-full text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    {generatingId === 'current' ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>} {generatingId === 'current' ? "MEMPROSES PDF..." : "DOWNLOAD PDF SEKARANG"}
                </Button>
            </div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
            <div className="flex items-center gap-2 mb-6"><Archive className="w-5 h-5 text-indigo-500"/><h3 className="font-extrabold text-slate-800 text-lg">Arsip & Laporan Tahunan</h3></div>
            <div className="space-y-0">
                {archiveList.map((arc, i) => (
                    <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between py-5 border-b border-slate-100 last:border-0 gap-4 ${arc.isYearly ? 'bg-indigo-50/50 -mx-6 px-6 border-indigo-100' : ''}`}>
                        <div>
                            <h4 className={`font-bold text-sm ${arc.isYearly ? 'text-indigo-700' : 'text-slate-800'}`}>Laporan Keuangan {arc.label}</h4>
                            <p className="text-[11px] text-slate-400 mt-1 font-medium">PDF Document - {arc.year}</p>
                        </div>
                        <button onClick={() => generatePDF(arc.month, arc.year, arc.isYearly)} disabled={generatingId !== null} className={`flex items-center justify-center gap-2 font-bold text-xs px-5 py-2.5 rounded-full transition-colors ${generatingId === `archive_${arc.month}_${arc.year}_${arc.isYearly}` ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : (arc.isYearly ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white')}`}>
                            {generatingId === `archive_${arc.month}_${arc.year}_${arc.isYearly}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>} Download
                        </button>
                    </div>
                ))}
                {archiveList.length === 0 && (
                    <div className="text-center py-8"><div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><Archive className="w-5 h-5 text-slate-300"/></div><p className="text-sm text-slate-400 font-medium">Belum ada arsip laporan bulan lalu.</p></div>
                )}
            </div>
        </div>

        <div>
            <h3 className="font-extrabold text-slate-800 mb-4 text-sm flex items-center gap-2 px-2"><FileText className="w-5 h-5 text-indigo-500"/> Apa saja yang ada di dalam PDF?</h3>
            <div className="space-y-3">
                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Wallet className="w-5 h-5"/></div><div className="flex-1"><h4 className="font-extrabold text-slate-800 text-sm">Neraca Kekayaan Terpadu</h4><p className="text-[11px] text-slate-500 mt-0.5 font-medium">Rekap total Kas, Investasi, Valas, dan Hutang/Piutang.</p></div></div>
                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Briefcase className="w-5 h-5"/></div><div className="flex-1"><h4 className="font-extrabold text-slate-800 text-sm">Riwayat Mutasi Investasi</h4><p className="text-[11px] text-slate-500 mt-0.5 font-medium">Data harga beli aset, total nominal, serta kalkulasi P/L.</p></div></div>
                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-pink-600"><HandCoins className="w-5 h-5"/></div><div className="flex-1"><h4 className="font-extrabold text-slate-800 text-sm">Detail Hutang & Piutang</h4><p className="text-[11px] text-slate-500 mt-0.5 font-medium">Daftar pihak terkait, total nominal, dan jatuh temponya.</p></div></div>
            </div>
        </div>
      </div>
    </MobileLayout>
  );
}