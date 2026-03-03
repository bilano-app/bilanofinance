import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { Download, FileText, Globe, Wallet, FileBarChart, Loader2, Target, Briefcase, HandCoins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [forexRates, setForexRates] = useState<any>({});
  const [targetData, setTargetData] = useState<any>(null); 
  
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // FIX: Status Paywall
  const isTrialExpired = localStorage.getItem("bilano_trial_expired") === "true";

  const formatRp = (val: number) => {
      const num = Number(val) || 0;
      return "Rp " + Math.round(num).toLocaleString("id-ID");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userEmail = localStorage.getItem("bilano_email") || "";
        const fetchOpts = { 
            headers: { "x-user-email": userEmail },
            cache: "no-store" as RequestCache
        };

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

  // FUNGSI BARU: Menggambar Grafik Batang di dalam PDF
  const drawBarChart = (doc: jsPDF, title: string, chartData: any[], startX: number, startY: number, width: number, height: number) => {
      doc.setFontSize(10); doc.setTextColor(50,50,50); doc.setFont("helvetica", "bold");
      doc.text(title, startX, startY - 5);
      
      let maxVal = Math.max(...chartData.map(d => d.value), 0);
      let minVal = Math.min(...chartData.map(d => d.value), 0);
      let range = maxVal - minVal; 
      if (range === 0) range = 1; // Mencegah pembagian dengan nol
      
      const chartH = height - 15;
      const zeroY = startY + chartH - ((0 - minVal) / range) * chartH;
      
      // Garis Horizontal Nol (0)
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
      doc.line(startX, zeroY, startX + width, zeroY); 
      
      const barW = (width / chartData.length) * 0.6;
      const gap = (width / chartData.length) * 0.4;
      
      chartData.forEach((d, i) => {
          const barX = startX + (i * (barW + gap)) + gap/2;
          const valH = (Math.abs(d.value) / range) * chartH;
          const barY = d.value >= 0 ? zeroY - valH : zeroY;
          
          // Pewarnaan Spesifik sesuai jenis grafik
          if (title.includes("Net Flow")) doc.setFillColor(d.value >= 0 ? 16 : 244, d.value >= 0 ? 185 : 63, d.value >= 0 ? 129 : 94); // Hijau (Untung) / Merah (Rugi)
          else if (title.includes("Aset")) doc.setFillColor(79, 70, 229); // Indigo
          else doc.setFillColor(14, 165, 233); // Biru (Kas)
          
          doc.rect(barX, barY, barW, valH, 'F');
          
          // Label Bulan di Bawah Batang
          doc.setFontSize(6); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal");
          doc.text(d.label, barX + barW/2, startY + chartH + 5, { align: "center" });
      });
  };

  const generatePDF = async () => {
    // FIX: Cegah Download jika Trial Habis
    if (isTrialExpired) {
        if(confirm("Masa Coba Habis! Download PDF Laporan eksklusif untuk member Premium. Buka kunci sekarang?")) window.location.href = "/paywall";
        return;
    }

    if (!data) return;
    setIsGenerating(true);

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const user = data.user;
        
        try {
            const img = new Image();
            img.src = '/bilano_logo_horiz.png';
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
            doc.addImage(img, 'PNG', 14, 10, 35, 12);
        } catch (e) {
            doc.setTextColor(79, 70, 229);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text("BILANO", 14, 18);
        }

        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 196, 14, { align: 'right' });
        doc.text(`Dicetak Oleh: ${user.firstName} ${user.lastName || ''}`, 196, 19, { align: 'right' });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 26, 196, 26);

        doc.setFillColor(79, 70, 229); 
        doc.rect(14, 32, 182, 14, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("WEALTH MANAGEMENT REPORT", 20, 41);

        // === KALKULASI NET WORTH PDF DENGAN KURS LIVE ===
        const totalInvest = data.investments.reduce((acc: number, inv: any) => {
            const [sym, curr] = (inv.symbol || "").split('|');
            const rate = (curr && curr !== 'IDR') ? (forexRates[curr] || 1) : 1;
            const isSaham = inv.type === 'saham' || (!inv.type && sym.length === 4 && inv.type !== 'crypto');
            const m = (isSaham && (!curr || curr === 'IDR')) ? 100 : 1;
            return acc + (inv.quantity * inv.avgPrice * m * rate);
        }, 0);
        
        const totalDebt = data.debts.filter((d:any) => d.type === 'hutang' && !d.isPaid).reduce((acc: number, d: any) => {
            const [, curr] = (d.name || "").split('|');
            const rate = (curr && curr !== 'IDR') ? (forexRates[curr] || 1) : 1;
            return acc + (d.amount * rate);
        }, 0);
        
        const totalPiutang = data.debts.filter((d:any) => d.type === 'piutang' && !d.isPaid).reduce((acc: number, d: any) => {
            const [, curr] = (d.name || "").split('|');
            const rate = (curr && curr !== 'IDR') ? (forexRates[curr] || 1) : 1;
            return acc + (d.amount * rate);
        }, 0);
        
        let totalForexIDR = 0;
        const forexRows = data.forexAssets.map((f: any) => {
            const rate = forexRates[f.currency] || 0;
            const idrVal = f.amount * rate;
            totalForexIDR += idrVal;
            return [f.currency, f.amount.toLocaleString(), formatRp(rate), formatRp(idrVal)];
        });

        const totalAsset = user.cashBalance + totalInvest + totalForexIDR + totalPiutang;
        const netWorth = totalAsset - totalDebt;

        const pureTransactions = data.transactions.filter((t:any) => t.type === 'income' || t.type === 'expense');
        const investTransactions = data.transactions.filter((t:any) => t.type === 'invest_buy' || t.type === 'invest_sell');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentPureTx = pureTransactions.filter((t:any) => new Date(t.date) >= thirtyDaysAgo);
        
        const totalIncome = recentPureTx.filter((t:any) => t.type === 'income').reduce((acc:number, t:any) => acc + t.amount, 0);
        const totalExpense = recentPureTx.filter((t:any) => t.type === 'expense').reduce((acc:number, t:any) => acc + t.amount, 0);

        let currentY = 108;
        const checkPageBreak = (neededSpace: number) => {
            if (currentY + neededSpace > 280) {
                doc.addPage();
                currentY = 20;
            }
        };

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11);
        doc.text("TOTAL KEKAYAAN BERSIH (NET WORTH)", 14, 60);
        doc.setTextColor(16, 185, 129); 
        doc.setFontSize(26);
        doc.text(formatRp(netWorth), 14, 70);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 78, 196, 78);

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Ringkasan Arus Kas Murni (30 Hari Terakhir)", 14, 88);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(16, 185, 129); 
        doc.text(`Pemasukan: + ${formatRp(totalIncome)}`, 14, 95);
        doc.setTextColor(244, 63, 94); 
        doc.text(`Pengeluaran: - ${formatRp(totalExpense)}`, 80, 95);

        if (targetData && targetData.targetAmount > 0) {
            checkPageBreak(40);
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Performa Pencapaian Target", 14, currentY);

            const progress = Math.min(100, Math.max(0, (netWorth / targetData.targetAmount) * 100));
            const sisa = targetData.targetAmount - netWorth;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(`Target Impian: ${formatRp(targetData.targetAmount)}`, 14, currentY + 6);
            doc.text(`Terkumpul saat ini: ${formatRp(netWorth)} (${progress.toFixed(1)}%)`, 14, currentY + 11);
            
            if (sisa > 0) {
                doc.setTextColor(244, 63, 94); doc.text(`Kekurangan: ${formatRp(sisa)}`, 14, currentY + 16);
            } else {
                doc.setTextColor(16, 185, 129); doc.setFont("helvetica", "bold"); doc.text(`Tercapai! Anda berhasil mencapai target.`, 14, currentY + 16);
            }

            doc.setFillColor(226, 232, 240); doc.roundedRect(14, currentY + 20, 182, 4, 2, 2, 'F');
            if (progress > 0) { doc.setFillColor(16, 185, 129); doc.roundedRect(14, currentY + 20, (progress / 100) * 182, 4, 2, 2, 'F'); }
            currentY += 32; 
        }

        // ========================================================
        // TAMBAHAN BARU: LOGIKA GRAFIK 12 BULAN (REVERSE CALCULATION)
        // ========================================================
        const now = new Date();
        let runningCash = user.cashBalance;
        let runningAsset = totalAsset; 
        
        const tempData = [];
        
        // Kita hitung mundur 12 bulan
        for (let i = 0; i < 12; i++) {
            const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mIdx = targetMonthDate.getMonth();
            const yIdx = targetMonthDate.getFullYear();
            const label = targetMonthDate.toLocaleDateString('id-ID', {month:'short', year:'2-digit'});

            let inMonth = 0; let outMonth = 0;
            data.transactions.forEach((t:any) => {
                const d = new Date(t.date);
                if(d.getMonth() === mIdx && d.getFullYear() === yIdx) {
                    if (t.type.includes('income') || t.type.includes('receive') || t.type === 'debt_borrow') inMonth += t.amount;
                    else if (t.type.includes('expense') || t.type.includes('pay') || t.type.includes('buy') || t.type === 'debt_lend') outMonth += t.amount;
                }
            });
            
            const netFlow = inMonth - outMonth;
            
            // Masukkan data dari depan agar urutannya dari terlama -> terbaru
            tempData.unshift({ label, netFlow, cash: runningCash, asset: runningAsset });
            
            // Kurangi dengan netFlow untuk mencari saldo di awal bulan tersebut
            runningCash -= netFlow;
            runningAsset -= netFlow; 
        }

        const chartNetFlow = tempData.map(d => ({ label: d.label, value: d.netFlow }));
        const chartCash = tempData.map(d => ({ label: d.label, value: d.cash }));
        const chartAsset = tempData.map(d => ({ label: d.label, value: d.asset }));

        // BUAT HALAMAN BARU KHUSUS UNTUK GRAFIK
        doc.addPage();
        drawBarChart(doc, "1. Akumulasi Total Aset (12 Bulan Terakhir)", chartAsset, 14, 20, 182, 60);
        drawBarChart(doc, "2. Akumulasi Total Kas Tunai (12 Bulan Terakhir)", chartCash, 14, 100, 182, 60);
        drawBarChart(doc, "3. Net Cash Flow (Pemasukan - Pengeluaran per Bulan)", chartNetFlow, 14, 180, 182, 60);
        
        // KEMBALI KE HALAMAN BARU UNTUK MELANJUTKAN TABEL BAWAAN
        doc.addPage();
        currentY = 20;
        // ========================================================

        checkPageBreak(50);
        autoTable(doc, {
          startY: currentY,
          head: [['Rincian Aset & Kewajiban (Neraca)', 'Estimasi Nominal (IDR)']],
          body: [
            ["Saldo Tunai Kas", formatRp(user.cashBalance)],
            ["Aset Investasi (Saham, Crypto, Emas, dll)", formatRp(totalInvest)],
            ["Aset Mata Uang Asing (Valas)", formatRp(totalForexIDR)],
            ["Piutang (Uang di Pihak Lain)", formatRp(totalPiutang)],
            ["Hutang (Kewajiban)", `(${formatRp(totalDebt)})`]
          ],
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229], fontSize: 10 }, 
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;

        if (forexRows.length > 0) {
            checkPageBreak(40);
            doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold");
            doc.text("Detail Kepemilikan Valas (Berdasarkan Kurs Live)", 14, currentY);
            
            autoTable(doc, {
                startY: currentY + 5,
                head: [['Mata Uang', 'Jumlah Kepemilikan', 'Kurs Saat Ini', 'Estimasi Nilai IDR']],
                body: forexRows,
                theme: 'striped',
                headStyles: { fillColor: [14, 165, 233] }, 
                columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        if (investTransactions.length > 0) {
            checkPageBreak(40);
            doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold");
            doc.text("Riwayat Transaksi Investasi (Capital & Yield)", 14, currentY);

            const invRows = investTransactions.map((t: any) => [
                new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
                t.type === 'invest_buy' ? 'Beli Aset' : 'Jual Aset',
                t.description, 
                formatRp(t.amount)
            ]);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Tanggal', 'Tindakan', 'Detail Aset (Volume & Harga/Unit)', 'Total Nilai (IDR)']],
                body: invRows,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] }, 
                columnStyles: { 1: { halign: 'center', fontStyle: 'bold' }, 3: { halign: 'right', fontStyle: 'bold' } },
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        if (data.debts && data.debts.length > 0) {
            checkPageBreak(40);
            doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold");
            doc.text("Daftar Rincian Hutang & Piutang", 14, currentY);

            const debtRows = data.debts.map((d: any) => {
                const [displayName, curr] = (d.name || "").split('|');
                const actualCurr = curr || 'IDR';
                const rate = actualCurr === 'IDR' ? 1 : (forexRates[actualCurr] || 1);
                const valIDR = d.amount * rate;
                
                return [
                    d.type === 'hutang' ? 'HUTANG' : 'PIUTANG',
                    displayName,
                    actualCurr !== 'IDR' ? `${actualCurr} ${d.amount.toLocaleString()} (≈ ${formatRp(valIDR)})` : formatRp(d.amount),
                    d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : 'Tanpa Tenggat',
                    d.isPaid ? 'LUNAS' : 'Belum Lunas'
                ]
            });

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Kategori', 'Nama Pihak', 'Total Nominal', 'Tenggat Waktu', 'Status']],
                body: debtRows,
                theme: 'grid',
                headStyles: { fillColor: [236, 72, 153] }, 
                columnStyles: { 0: { fontStyle: 'bold' }, 2: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'center' } },
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        checkPageBreak(40);
        doc.setTextColor(50, 50, 50); doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text("Riwayat Transaksi Arus Kas Murni (Pemasukan & Pengeluaran)", 14, currentY);

        const txRows = pureTransactions.slice(0, 30).map((t: any) => [
          new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
          t.type === 'income' ? 'Masuk' : 'Keluar',
          t.category,
          t.description || "-",
          formatRp(t.amount)
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Tanggal', 'Arus', 'Kategori', 'Catatan', 'Nominal']],
          body: txRows,
          theme: 'grid',
          headStyles: { fillColor: [249, 115, 22] }, 
          columnStyles: { 1: { halign: 'center', fontStyle: 'bold' }, 4: { halign: 'right', fontStyle: 'bold' } },
          didParseCell: function (data) {
              if (data.section === 'body' && data.column.index === 1) {
                  if (data.cell.raw === 'Masuk') data.cell.styles.textColor = [16, 185, 129];
                  if (data.cell.raw === 'Keluar') data.cell.styles.textColor = [244, 63, 94];
              }
          }
        });

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.setFont("helvetica", "italic");
            doc.text("Dokumen ini di-generate secara otomatis oleh Sistem Aplikasi BILANO.", 14, 285);
            doc.text(`Halaman ${i} dari ${pageCount}`, 196, 285, { align: 'right' });
        }

        const fileName = `Laporan_Keuangan_BILANO_${Date.now()}.pdf`;
        doc.save(fileName);
        toast({ title: "Berhasil Mengunduh!", description: "Laporan PDF Premium siap dilihat." });

    } catch (error) {
        toast({ title: "Gagal", description: "Terjadi kesalahan saat membuat PDF.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  if (loading) {
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
    <MobileLayout title="Pusat Laporan" showBack>
      <div className="space-y-6 pt-4 pb-20 px-2">
        
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-200 text-center relative overflow-hidden">
            <div className="relative z-10">
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm border border-white/20">
                    <FileBarChart className="w-8 h-8 text-white"/>
                </div>
                <h2 className="text-2xl font-extrabold mb-2">Cetak Laporan</h2>
                <p className="text-indigo-100 text-xs mb-8 px-4 leading-relaxed opacity-90 font-medium">
                    Download laporan PDF profesional lengkap dengan neraca, arus kas, hutang, dan riwayat investasi.
                </p>
                <Button 
                    onClick={generatePDF} 
                    disabled={isGenerating}
                    className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold shadow-xl border-none h-14 rounded-full text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>}
                    {isGenerating ? "MEMPROSES PDF..." : "DOWNLOAD PDF SEKARANG"}
                </Button>
            </div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
        </div>

        <div>
            <h3 className="font-extrabold text-slate-800 mb-4 text-sm flex items-center gap-2 px-2">
                <FileText className="w-5 h-5 text-indigo-500"/> Apa saja yang ada di dalam PDF?
            </h3>
            <div className="space-y-3">
                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <Wallet className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm">Neraca Kekayaan Terpadu</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Rekap total Kas, Investasi, Valas, dan Hutang/Piutang.</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm">Arus Kas Murni (Cashflow)</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Khusus mendata uang masuk/keluar operasional sehari-hari.</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                        <Briefcase className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm">Riwayat Mutasi Investasi</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Data harga beli aset, total nominal, serta kalkulasi P/L.</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                        <HandCoins className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm">Detail Hutang & Piutang</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Daftar pihak terkait, total nominal, dan jatuh temponya.</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                        <Globe className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm">Estimasi Valas Live</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Tabel aset mata uang asing dikali kurs pertukaran hari ini.</p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </MobileLayout>
  );
}