import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { Download, FileText, Globe, Wallet, FileBarChart, Loader2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [forexRates, setForexRates] = useState<any>({});
  const [targetData, setTargetData] = useState<any>(null); // State tambahan untuk Target
  
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- FORMATTER ANGKA ---
  const formatRp = (val: number) => {
      const num = Number(val) || 0;
      return "Rp " + num.toLocaleString("id-ID");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ambil Data Serentak (Keuangan, Kurs Live, Target)
        const [resData, resRates, resTarget] = await Promise.all([
            fetch("/api/reports/data"),
            fetch("/api/forex/rates"),
            fetch("/api/target")
        ]);

        if (resData.ok) setData(await resData.json());
        if (resRates.ok) setForexRates(await resRates.json());
        if (resTarget.ok) setTargetData(await resTarget.json());

      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // --- GENERATOR PDF SUPER PREMIUM ---
  const generatePDF = async () => {
    if (!data) return;
    setIsGenerating(true);

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const user = data.user;
        
        // --- 1. HEADER (LOGO BILING & KOP SURAT) ---
        try {
            const img = new Image();
            img.src = '/bilano_logo_horiz.png';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
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

        // --- 2. BANNER JUDUL (INDIGO) ---
        doc.setFillColor(79, 70, 229); 
        doc.rect(14, 32, 182, 14, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("WEALTH MANAGEMENT REPORT", 20, 41);

        // --- PREPARE DATA ---
        const totalInvest = data.investments.reduce((acc: number, inv: any) => {
            const m = (inv.type === 'saham' || (inv.symbol.length === 4 && inv.type !== 'crypto')) ? 100 : 1;
            return acc + (inv.quantity * inv.avgPrice * m);
        }, 0);
        
        const totalDebt = data.debts.filter((d:any) => d.type === 'hutang' && !d.isPaid).reduce((acc: number, d: any) => acc + d.amount, 0);
        const totalPiutang = data.debts.filter((d:any) => d.type === 'piutang' && !d.isPaid).reduce((acc: number, d: any) => acc + d.amount, 0);
        
        let totalForexIDR = 0;
        const forexRows = data.forexAssets.map((f: any) => {
            const rate = forexRates[f.currency] || 0;
            const idrVal = f.amount * rate;
            totalForexIDR += idrVal;
            return [f.currency, f.amount.toLocaleString(), formatRp(rate), formatRp(idrVal)];
        });

        const totalAsset = user.cashBalance + totalInvest + totalForexIDR + totalPiutang;
        const netWorth = totalAsset - totalDebt;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentTx = data.transactions.filter((t:any) => new Date(t.date) >= thirtyDaysAgo);
        const totalIncome = recentTx.filter((t:any) => t.type === 'income').reduce((acc:number, t:any) => acc + t.amount, 0);
        const totalExpense = recentTx.filter((t:any) => t.type === 'expense').reduce((acc:number, t:any) => acc + t.amount, 0);

        // --- 3. HERO SECTION (BIG NUMBERS) ---
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11);
        doc.text("TOTAL KEKAYAAN BERSIH (NET WORTH)", 14, 60);
        
        doc.setTextColor(16, 185, 129); // Emerald Green
        doc.setFontSize(26);
        doc.text(formatRp(netWorth), 14, 70);

        // --- 4. ARUS KAS (CASHFLOW RINGKAS) ---
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 78, 196, 78);

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Ringkasan Arus Kas (30 Hari Terakhir)", 14, 88);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(16, 185, 129); 
        doc.text(`Pemasukan: + ${formatRp(totalIncome)}`, 14, 95);
        
        doc.setTextColor(244, 63, 94); 
        doc.text(`Pengeluaran: - ${formatRp(totalExpense)}`, 80, 95);

        // Variabel pelacak tinggi PDF (Y-Axis)
        let currentY = 108;

        // --- 5. PERFORMA TARGET (JIKA ADA) ---
        if (targetData && targetData.targetAmount > 0) {
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
                doc.setTextColor(244, 63, 94); // Merah
                doc.text(`Kekurangan: ${formatRp(sisa)}`, 14, currentY + 16);
            } else {
                doc.setTextColor(16, 185, 129); // Hijau
                doc.setFont("helvetica", "bold");
                doc.text(`Tercapai! Anda berhasil mencapai target.`, 14, currentY + 16);
            }

            // Draw Visual Progress Bar
            doc.setFillColor(226, 232, 240); // Base bar (abu-abu)
            doc.roundedRect(14, currentY + 20, 182, 4, 2, 2, 'F');
            
            if (progress > 0) {
                doc.setFillColor(16, 185, 129); // Progress bar (Hijau Emerald)
                const fillWidth = (progress / 100) * 182;
                doc.roundedRect(14, currentY + 20, fillWidth, 4, 2, 2, 'F');
            }

            currentY += 32; // Geser komponen berikutnya ke bawah
        }

        // --- 6. TABEL PORTFOLIO & ASET ---
        autoTable(doc, {
          startY: currentY,
          head: [['Rincian Aset & Kewajiban', 'Nominal (IDR)']],
          body: [
            ["Saldo Tunai Kas", formatRp(user.cashBalance)],
            ["Aset Investasi (Saham, Crypto, dll)", formatRp(totalInvest)],
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

        // --- 7. TABEL VALAS (JIKA ADA) ---
        if (forexRows.length > 0) {
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Detail Kepemilikan Valas (Live Rate)", 14, currentY);
            
            autoTable(doc, {
                startY: currentY + 5,
                head: [['Mata Uang', 'Jumlah', 'Kurs Saat Ini', 'Estimasi IDR']],
                body: forexRows,
                theme: 'striped',
                headStyles: { fillColor: [14, 165, 233] }, 
                columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // --- 8. TABEL TRANSAKSI TERAKHIR ---
        if (currentY > 230) {
            doc.addPage();
            currentY = 20;
        }

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Riwayat Transaksi Terakhir", 14, currentY);

        const txRows = data.transactions.slice(0, 20).map((t: any) => [
          new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
          t.type === 'income' ? 'Masuk' : 'Keluar',
          t.category,
          t.description || "-",
          formatRp(t.amount)
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Tanggal', 'Tipe', 'Kategori', 'Catatan', 'Nominal']],
          body: txRows,
          theme: 'grid',
          headStyles: { fillColor: [249, 115, 22] }, // Orange
          columnStyles: { 
              1: { halign: 'center', fontStyle: 'bold' }, 
              4: { halign: 'right', fontStyle: 'bold' } 
          },
          didParseCell: function (data) {
              if (data.section === 'body' && data.column.index === 1) {
                  if (data.cell.raw === 'Masuk') data.cell.styles.textColor = [16, 185, 129];
                  if (data.cell.raw === 'Keluar') data.cell.styles.textColor = [244, 63, 94];
              }
          }
        });

        // --- 9. FOOTER & DISCLAIMER ---
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.setFont("helvetica", "italic");
            doc.text("Dokumen ini di-generate secara otomatis oleh Sistem Aplikasi BILANO.", 14, 285);
            doc.text(`Halaman ${i} dari ${pageCount}`, 196, 285, { align: 'right' });
        }

        // --- SAVE ---
        const fileName = `Laporan_Keuangan_BILANO_${Date.now()}.pdf`;
        doc.save(fileName);
        toast({ title: "Berhasil Mengunduh!", description: "Laporan PDF Premium siap dilihat." });

    } catch (error) {
        toast({ title: "Gagal", description: "Terjadi kesalahan saat membuat PDF.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  if (loading) return <MobileLayout title="Memuat..."><div className="p-8 text-center text-slate-400">Loading...</div></MobileLayout>;

  return (
    <MobileLayout title="Pusat Laporan" showBack>
      <div className="space-y-6 pt-4 pb-20 px-2">
        
        {/* HERO CARD */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-200 text-center relative overflow-hidden">
            <div className="relative z-10">
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm border border-white/20">
                    <FileBarChart className="w-8 h-8 text-white"/>
                </div>
                <h2 className="text-2xl font-extrabold mb-2">Cetak Laporan</h2>
                <p className="text-indigo-100 text-xs mb-8 px-4 leading-relaxed opacity-90 font-medium">
                    Download laporan PDF profesional lengkap dengan neraca, arus kas, dan pencapaian target.
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

        {/* LIST ISI LAPORAN */}
        <div>
            <h3 className="font-extrabold text-slate-800 mb-4 text-sm flex items-center gap-2 px-2">
                <FileText className="w-5 h-5 text-indigo-500"/> Isi Laporan PDF:
            </h3>
            <div className="space-y-3">
                
                {/* Visual Tambahan Performa Target (jika pasang target) */}
                {targetData && targetData.targetAmount > 0 && (
                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                            <Target className="w-5 h-5"/>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-extrabold text-slate-800 text-sm">Pencapaian Target</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Progress bar dan kalkulasi target impianmu</p>
                        </div>
                    </div>
                )}

                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <Wallet className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm">Neraca Kekayaan</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Total Tunai + Investasi + Valas - Hutang</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm">Arus Kas & Riwayat</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Rekap Pemasukan & Pengeluaran terbaru</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                        <Globe className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm">Rincian Valas Live</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Tabel aset asing dikali kurs hari ini.</p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </MobileLayout>
  );
}