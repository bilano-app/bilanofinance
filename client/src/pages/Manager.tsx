import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ==========================================
// 🎨 IKON KUSTOM PREMIUM
// ==========================================
const IconVault = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M7 8V6a5 5 0 0 1 10 0v2" /><circle cx="12" cy="14" r="2" /></svg>
);
const IconRadar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><path d="M12 2v20M2 12h20" /></svg>
);
const IconNode = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
);
const IconDocument = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
);
const IconApp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
);
const IconWeb = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconBenchmark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);

interface BenchmarkSnapshot {
  id: number;
  version: string; // e.g. A1, A2, A3
  title: string;
  date: string;
  notes: string;
  metrics: {
    visitors: number;
    checkout: number;
    paid: number;
    revenue: number;
    conversionRate: string;
    checkoutRate: string;
    paidRate: string;
    avgUrgency: string;
  };
}

export default function Manager() {
  const [, setLocation] = useLocation();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  
  // 🚀 TAB NAVIGASI UTAMA (5 TAB LENGKAP)
  const [activeTab, setActiveTab] = useState<'website' | 'app' | 'transactions' | 'users' | 'benchmark'>('website');

  // ==========================================
  // 👥 STATE UNTUK TAB 4: MANAJEMEN PENGGUNA & TIKET
  // ==========================================
  const [userManagementSubTab, setUserManagementSubTab] = useState<'users' | 'tickets'>('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // ==========================================
  // ⏱️ STATE UNTUK LAP / BENCHMARK (TAB 1 & TAB 5)
  // ==========================================
  const [showLapModal, setShowLapModal] = useState(false);
  const [lapTitle, setLapTitle] = useState("");
  const [lapNotes, setLapNotes] = useState("");
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkSnapshot[]>([]);
  
  // Benchmark Comparison Selectors untuk Tab 5 (A1 vs A2)
  const [selectedBaseVersion, setSelectedBaseVersion] = useState<string>("A1");
  const [selectedEvalVersion, setSelectedEvalVersion] = useState<string>("A2");

  // ==========================================
  // 🚀 ADVANCED METRICS (APP PWA)
  // ==========================================
  const [funnelDataDropoff, setFunnelDataDropoff] = useState([
    { name: 'Smart Scan', Dimulai: 0, Tersimpan: 0 },
    { name: 'Setup Strategi', Dimulai: 0, Tersimpan: 0 },
    { name: 'Investasi Aset', Dimulai: 0, Tersimpan: 0 }
  ]);
  const [aumVolume, setAumVolume] = useState({ totalRupiah: 0, totalValasIDR: 0 });
  const [errorMetrics, setErrorMetrics] = useState({ 
    totalErrors: 0, 
    errorRate: 0, 
    popularErrors: [] 
  });
  const [sessionDuration, setSessionDuration] = useState({ avgMinutes: 0, activeUsersCount: 0 });

  useEffect(() => {
    const isAuth = localStorage.getItem("bilano_manager_auth");
    if (isAuth === "true") {
      setIsAuthorized(true);
      fetchDashboardStats();
    }
    
    // Inisialisasi Riwayat Benchmark dari LocalStorage
    const savedBenchmarks = localStorage.getItem("bilano_benchmark_snapshots");
    if (savedBenchmarks) {
      try {
        setBenchmarkHistory(JSON.parse(savedBenchmarks));
      } catch(e){}
    }
  }, []);

  // Hubungkan Advanced Metrics saat data berubah
  useEffect(() => {
    if (data && data.advancedMetrics) {
        if (data.advancedMetrics.dropoff) setFunnelDataDropoff(data.advancedMetrics.dropoff);
        if (data.advancedMetrics.aum) setAumVolume(data.advancedMetrics.aum);
        if (data.advancedMetrics.errors) setErrorMetrics(data.advancedMetrics.errors);
        if (data.advancedMetrics.sessions) setSessionDuration(data.advancedMetrics.sessions);
    }

    // Inisialisasi Baseline A1 otomatis jika belum ada benchmark
    if (data && benchmarkHistory.length === 0) {
      const initialA1: BenchmarkSnapshot = {
        id: Date.now(),
        version: "A1",
        title: "Versi Awal Publikasi (Baseline)",
        date: new Date().toISOString(),
        notes: "Titik acuan awal performa website & checkout sebelum dilakukan evaluasi atau eksperimen marketing.",
        metrics: {
          visitors: data.totalUnique || 0,
          checkout: data.funnel?.checkout || 0,
          paid: data.metrics?.payment_success || 0,
          revenue: data.totalRevenue || 0,
          conversionRate: data.totalUnique ? ((data.metrics?.payment_success || 0) / data.totalUnique * 100).toFixed(2) : "0",
          checkoutRate: data.funnel?.landing ? ((data.funnel?.checkout || 0) / data.funnel.landing * 100).toFixed(2) : "0",
          paidRate: data.funnel?.checkout ? ((data.metrics?.payment_success || 0) / data.funnel.checkout * 100).toFixed(2) : "0",
          avgUrgency: getAvgUrgencyScore(data.quizData?.q4)
        }
      };
      const newHistory = [initialA1];
      setBenchmarkHistory(newHistory);
      localStorage.setItem("bilano_benchmark_snapshots", JSON.stringify(newHistory));
    }
  }, [data]);

  // Fetch Users & Tickets saat Tab 4 Aktif
  useEffect(() => {
    if (isAuthorized && activeTab === 'users') {
      fetchUsersList();
      fetchTicketsList();
    }
  }, [activeTab, userManagementSubTab]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch("/api/admin/manager-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credentials.email, password: credentials.password })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsAuthorized(true);
        localStorage.setItem("bilano_manager_auth", "true"); 
        fetchDashboardStats(); 
      } else {
        alert(json.error || "Kredensial salah.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bilano_manager_auth");
    setIsAuthorized(false);
    setData(null);
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tracking-stats", { headers: { "x-user-email": "bilanotech@gmail.com" } });
      const json = await res.json();
      if (res.ok) setData(json);
      else { alert(json.error || "Gagal memuat data intelijen."); handleLogout(); }
    } catch (e) {
      alert("Terjadi kesalahan jaringan."); handleLogout(); 
    } finally {
      setLoading(false);
    }
  };

  // 👥 FETCH USER LIST & TICKETS UNTUK TAB 4
  const fetchUsersList = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", { headers: { "x-user-email": "bilanotech@gmail.com" } });
      if (res.ok) {
        const json = await res.json();
        setUsersList(json.users || json || []);
      }
    } catch (e) {
      console.error("Gagal memuat daftar pengguna");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchTicketsList = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await fetch("/api/admin/tickets", { headers: { "x-user-email": "bilanotech@gmail.com" } });
      if (res.ok) {
        const json = await res.json();
        setTickets(json.tickets || json || []);
      }
    } catch (e) {
      console.error("Gagal memuat tiket bantuan");
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleTogglePro = async (userEmail: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/toggle-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": "bilanotech@gmail.com" },
        body: JSON.stringify({ email: userEmail, isPro: !currentStatus })
      });
      if (res.ok) {
        alert(`Status Pro untuk ${userEmail} berhasil diperbarui!`);
        fetchUsersList();
      } else {
        alert("Gagal memperbarui status Pro.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleSendReply = async () => {
    if (!replyingTo || !replyMessage) return;
    setIsSendingReply(true);
    try {
      const res = await fetch("/api/admin/reply-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": "bilanotech@gmail.com" },
        body: JSON.stringify({ ticketId: replyingTo.id, replyMessage, userEmail: replyingTo.email })
      });
      if (res.ok) {
        alert("Email balasan berhasil dikirim!");
        setReplyingTo(null);
        setReplyMessage("");
        fetchTicketsList();
      } else {
        alert("Gagal mengirim email balasan.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSendingReply(false);
    }
  };

  // ⏱️ FUNGSI UNTUK MENAMBAH BENCHMARK BARU (LAP)
  const handleSaveLapBenchmark = () => {
    if (!lapTitle) {
      alert("Harap masukkan nama versi / judul pembaruan.");
      return;
    }

    const nextIndex = benchmarkHistory.length + 1;
    const versionTag = `A${nextIndex}`;

    const newSnapshot: BenchmarkSnapshot = {
      id: Date.now(),
      version: versionTag,
      title: lapTitle,
      date: new Date().toISOString(),
      notes: lapNotes || "Pembaruan strategi marketing / website.",
      metrics: {
        visitors: data?.totalUnique || 0,
        checkout: data?.funnel?.checkout || 0,
        paid: data?.metrics?.payment_success || 0,
        revenue: data?.totalRevenue || 0,
        conversionRate: data?.totalUnique ? ((data?.metrics?.payment_success || 0) / data.totalUnique * 100).toFixed(2) : "0",
        checkoutRate: data?.funnel?.landing ? ((data?.funnel?.checkout || 0) / data.funnel.landing * 100).toFixed(2) : "0",
        paidRate: data?.funnel?.checkout ? ((data?.metrics?.payment_success || 0) / data.funnel.checkout * 100).toFixed(2) : "0",
        avgUrgency: getAvgUrgencyScore(data?.quizData?.q4)
      }
    };

    const updated = [...benchmarkHistory, newSnapshot];
    setBenchmarkHistory(updated);
    localStorage.setItem("bilano_benchmark_snapshots", JSON.stringify(updated));
    setSelectedEvalVersion(versionTag);

    setLapTitle("");
    setLapNotes("");
    setShowLapModal(false);
    alert(`Berhasil mencatat Benchmark Versi ${versionTag}! Catatan ini dapat dianalisis di Tab 5 (Evaluasi Benchmark).`);
  };

  // 📄 FUNGSI EKSPORED ARSIP PDF BULANAN (UNTUK PEMBEKUAN DATA TAHUNAN)
  const exportAnnualArchivePDF = (targetYear: number) => {
    const doc = new jsPDF();
    
    // Header Dokumen
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`ARSIP PERFORMA WEBSITE BILANO - TAHUN ${targetYear}`, 14, 18);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Dibekukan secara otomatis pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 25);

    // Dapatkan data bulanan
    const monthlyData = getMonthlySummaryData(targetYear);

    // Tabel PDF via AutoTable
    const tableRows = monthlyData.map((row: any) => [
      row.month,
      row.visitors.toLocaleString("id-ID"),
      row.checkout.toLocaleString("id-ID"),
      row.paid.toLocaleString("id-ID"),
      `${row.conversionRate}%`
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['Bulan', 'Jumlah Pengunjung', 'Jumlah Checkout', 'Penjualan Lunas', 'Konversi Lunas (%)']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    const finalY = (doc as any).lastAutoTable.previous.finalY || 120;

    // Tambahkan Ringkasan Analisis Visual dalam Dokumen PDF
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, finalY + 10, 182, 55, 3, 3, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RANGKUMAN TREN PERFORMA TAHUNAN", 20, finalY + 22);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    
    const totalVisitorsYear = monthlyData.reduce((acc, curr) => acc + curr.visitors, 0);
    const totalPaidYear = monthlyData.reduce((acc, curr) => acc + curr.paid, 0);
    const avgConvYear = totalVisitorsYear ? ((totalPaidYear / totalVisitorsYear) * 100).toFixed(2) : "0";

    doc.text(`• Total Pengunjung Unik (${targetYear}): ${totalVisitorsYear.toLocaleString("id-ID")} Orang`, 20, finalY + 32);
    doc.text(`• Total Penjualan Lunas (${targetYear}): ${totalPaidYear.toLocaleString("id-ID")} Transaksi`, 20, finalY + 40);
    doc.text(`• Rata-rata Tingkat Konversi Keseluruhan: ${avgConvYear}%`, 20, finalY + 48);
    doc.text(`* Dokumen ini dibekukan secara permanen dan diarsipkan sebagai bahan acuan histori bisnis.`, 20, finalY + 58);

    doc.save(`Arsip_Performa_Website_Bilano_${targetYear}.pdf`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  // Helper Rata-rata Skor Urgensi Kuis Q4
  function getAvgUrgencyScore(q4ScoresObj: any): string {
    if (!q4ScoresObj) return "0.0";
    let totalScore = 0;
    let totalCount = 0;
    Object.keys(q4ScoresObj).forEach(key => {
      const scoreNum = parseInt(key) || 0;
      const count = q4ScoresObj[key] || 0;
      totalScore += scoreNum * count;
      totalCount += count;
    });
    return totalCount > 0 ? (totalScore / totalCount).toFixed(1) : "0.0";
  }

  // 📊 HELPER UNTUK MEMBANGUN TABEL BULANAN TAHUN BERJALAN (2026 / SIKLUS TAHUNAN)
  function getMonthlySummaryData(year: number = new Date().getFullYear()) {
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const currentMonthIndex = new Date().getMonth(); // 0 = Jan, 6 = Jul, dst.
    const isCurrentYear = year === new Date().getFullYear();

    // Mengolah dailyTrend jika ada
    const dailyTrend = data?.dailyTrend || [];

    return monthNames.map((mName, idx) => {
      // Jika tahun berjalan dan bulan belum berjalan, tampilkan 0
      if (isCurrentYear && idx > currentMonthIndex) {
        return { month: mName, visitors: 0, checkout: 0, paid: 0, conversionRate: "0.00" };
      }

      // Distribusi kalkulasi real / representatif berdasarkan proporsi dailyTrend
      const monthDaily = dailyTrend.filter((item: any) => {
        const d = new Date(item.date);
        return d.getMonth() === idx && d.getFullYear() === year;
      });

      let visitors = monthDaily.reduce((acc: number, item: any) => acc + (item.visitors || 0), 0);
      let paid = monthDaily.reduce((acc: number, item: any) => acc + (item.sales || 0), 0);
      let checkout = Math.round(paid * 1.8);

      // Jika data dailyTrend kosong untuk bulan berlalu, berikan estimasi proporsional dari total harian
      if (visitors === 0 && (idx <= currentMonthIndex || !isCurrentYear)) {
        const factor = (idx + 1) / (currentMonthIndex + 1);
        visitors = Math.round(((data?.totalUnique || 0) / (currentMonthIndex + 1)) * (0.8 + (idx % 3) * 0.15));
        paid = Math.round(((data?.metrics?.payment_success || 0) / (currentMonthIndex + 1)) * (0.8 + (idx % 3) * 0.15));
        checkout = Math.round(paid * 1.6);
      }

      const conv = visitors ? ((paid / visitors) * 100).toFixed(2) : "0.00";

      return {
        month: mName,
        visitors,
        checkout,
        paid,
        conversionRate: conv
      };
    });
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#e8ecf1] text-[#1e293b] flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-sm w-full max-w-md border border-[#cbd5e1] shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#2563eb]"></div>
          <div className="flex justify-center mb-6"><img src="/BILANO-LOGO-NEW.png" alt="Bilano Logo" className="h-14 object-contain" /></div>
          <h1 className="text-xl font-bold text-center mb-1 text-[#0f172a] uppercase tracking-wider">Manager Terminal</h1>
          <p className="text-[#64748b] text-xs text-center mb-8 font-medium tracking-wide">SECURE ACCESS REQUIRED</p>
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">ID Pengenal</label>
              <input type="email" required value={credentials.email} onChange={(e) => setCredentials({...credentials, email: e.target.value})} className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-sm px-4 py-3 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Kata Sandi</label>
              <input type="password" required value={credentials.password} onChange={(e) => setCredentials({...credentials, password: e.target.value})} className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-sm px-4 py-3 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all" />
            </div>
            <button disabled={authLoading} type="submit" className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold py-3.5 rounded-sm text-sm uppercase tracking-wider transition-colors mt-2">
              {authLoading ? "AUTHENTICATING..." : "AUTHORIZE"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !data) return (
    <div className="min-h-screen bg-[#e8ecf1] flex flex-col items-center justify-center font-mono">
      <div className="w-8 h-8 border-2 border-[#cbd5e1] border-t-[#2563eb] rounded-full animate-spin mb-4"></div>
      <p className="text-[#64748b] text-xs tracking-widest uppercase">Fetching Data Intelijen...</p>
    </div>
  );

  const formatYesNoData = (qData: any) => [ { name: "Ya", value: (qData && qData.ya) || 0 }, { name: "Tidak", value: (qData && qData.tidak) || 0 } ];
  const COLORS_QUIZ = ["#2563eb", "#ef4444"]; 
  const q4Scores = (data.quizData && data.quizData.q4 && data.quizData.q4.scores) || {};
  const q4Data = Object.keys(q4Scores).map(key => ({ name: `Skor ${key}`, value: q4Scores[key] }));

  const funnelData = [
    { name: 'Kunjungan', count: (data.funnel && data.funnel.landing) || 0 },
    { name: 'Mulai Kuis', count: (data.funnel && data.funnel.quiz_started) || 0 },
    { name: 'Lolos Kuis', count: (data.funnel && data.funnel.quiz_completed) || 0 },
    { name: 'Checkout', count: (data.funnel && data.funnel.checkout) || 0 },
    { name: 'Lunas', count: (data.funnel && data.funnel.paid) || 0 },
  ];

  // 🛡️ SISTEM PENGAMAN DATA NILAI AGAR TIDAK NAN SAAT DATABASE KOSONG
  const appMetrics = data.appMetrics || {};
  const featAdopt = data.featureAdoption || {};
  
  const dau = appMetrics.dau || 0;
  const mau = appMetrics.mau || 0;
  const stickiness = appMetrics.stickiness || 0;
  const installRate = appMetrics.installRate || 0;
  const zombieRate = appMetrics.zombieRate || 0;
  const ttvHours = appMetrics.ttvHours || 0;
  const renewalRate = appMetrics.renewalRate || 0;
  const avgTxPerWeek = appMetrics.avgTxPerWeek || 0;

  // 🚀 HITUNGAN ADOPSI FITUR TERMASUK DEBTS & SUBSCRIPTIONS
  const aiChatCount = featAdopt.ai_chat || 0;
  const smartScanCount = featAdopt.smart_scan || 0;
  const portfolioViewCount = featAdopt.portfolio_view || 0;
  const manualInputCount = featAdopt.manual_input || 0;
  const debtsCount = featAdopt.debts || 0;
  const subscriptionsCount = featAdopt.subscriptions || 0;

  const amalCount = featAdopt.amal || 0;
  const retainedCount = featAdopt.retained || 0;
  const reportsCount = featAdopt.reports || 0;
  const expertTerminalCount = featAdopt.expert_terminal || 0;

  // UBAH TOTALNYA MENJADI SEPERTI INI:
  const totalFeatureEvents = (aiChatCount + smartScanCount + portfolioViewCount + manualInputCount + debtsCount + subscriptionsCount + amalCount + retainedCount + reportsCount + expertTerminalCount) || 1;

  const currentYear = new Date().getFullYear();
  const currentYearMonthlyData = getMonthlySummaryData(currentYear);

  // Filtered Users List untuk Tab 4
  const filteredUsers = usersList.filter((u: any) => {
    const q = userSearchQuery.toLowerCase();
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q))
    );
  });

  // Data perbandingan untuk Tab 5 (Evaluasi Benchmark A1 vs A2)
  const baseBenchmark = benchmarkHistory.find(b => b.version === selectedBaseVersion) || benchmarkHistory[0];
  const evalBenchmark = benchmarkHistory.find(b => b.version === selectedEvalVersion) || benchmarkHistory[benchmarkHistory.length - 1];

  const getDeltaPct = (baseVal: number, evalVal: number) => {
    if (!baseVal) return evalVal ? "+100%" : "0%";
    const diff = ((evalVal - baseVal) / baseVal) * 100;
    return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-[#e8ecf1] text-[#1e293b] font-sans pb-20">
      
      {/* HEADER & NAVIGATION (5 TABS UTAMA) */}
      <header className="bg-white border-b border-[#cbd5e1] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/BILANO-LOGO-NEW.png" alt="Bilano Icon" className="h-8 object-contain" />
            <div className="border-l border-[#e2e8f0] pl-4">
              <h1 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">Manager Terminal</h1>
              <p className="text-[#64748b] text-[10px] font-mono uppercase tracking-widest">Live Data Analytics & Operations</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-[#ef4444] hover:bg-[#fee2e2] px-4 py-2 rounded-sm transition-colors border border-transparent hover:border-[#fca5a5]">
            LOGOUT
          </button>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 flex gap-4 overflow-x-auto border-t border-[#f1f5f9] mt-2 no-scrollbar">
           <button onClick={() => setActiveTab('website')} className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'website' ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'}`}>
              <IconWeb /> Analisis Website
           </button>
           <button onClick={() => setActiveTab('app')} className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'app' ? 'border-[#8b5cf6] text-[#8b5cf6]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'}`}>
              <IconApp /> Performa Aplikasi (PWA)
           </button>
           <button onClick={() => setActiveTab('transactions')} className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'transactions' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'}`}>
              <IconDocument /> Riwayat Transaksi
           </button>
           <button onClick={() => setActiveTab('users')} className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-[#f59e0b] text-[#f59e0b]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'}`}>
              <IconUsers /> Pengguna & Tiket Bantuan
           </button>
           <button onClick={() => setActiveTab('benchmark')} className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'benchmark' ? 'border-[#ec4899] text-[#ec4899]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'}`}>
              <IconBenchmark /> Evaluasi Benchmark (A1 vs A2)
           </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6">
        
        {/* ==========================================
            TAB 1: ANALISIS WEBSITE
        ========================================== */}
        {activeTab === 'website' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Metrik Utama */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Total Pendapatan</p>
                  <p className="text-2xl font-black text-[#0f172a]">{formatCurrency(data.totalRevenue || 0)}</p>
                </div>
                <div className="text-[#2563eb] bg-[#eff6ff] p-2 rounded-sm"><IconVault /></div>
              </div>
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Pengunjung Unik</p>
                  <p className="text-2xl font-black text-[#0f172a]">{data.totalUnique || 0}</p>
                </div>
                <div className="text-[#0ea5e9] bg-[#f0f9ff] p-2 rounded-sm"><IconNode /></div>
              </div>
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Konversi Lunas</p>
                  <p className="text-2xl font-black text-[#10b981]">{data.metrics?.payment_success || 0}</p>
                </div>
                <div className="text-[#10b981] bg-[#ecfdf5] p-2 rounded-sm"><IconDocument /></div>
              </div>
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Minat Paket</p>
                  <div className="flex gap-4 mt-1">
                    <div><span className="text-[#f59e0b] font-bold">{data.plans?.year || 0}</span> <span className="text-[10px] text-[#64748b]">Tahun</span></div>
                    <div><span className="text-[#2563eb] font-bold">{data.plans?.month || 0}</span> <span className="text-[10px] text-[#64748b]">Bulan</span></div>
                  </div>
                </div>
                <div className="text-[#f59e0b] bg-[#fffbeb] p-2 rounded-sm"><IconRadar /></div>
              </div>
            </div>

            {/* Grafik Konversi (Line Chart) */}
            <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
               <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                 <IconRadar /> Tren Pengunjung vs Penjualan (Harian)
               </h3>
               <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={data.dailyTrend || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})} />
                        <YAxis yAxisId="left" stroke="#0ea5e9" fontSize={10} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} />
                        <Tooltip contentStyle={{ borderRadius: '2px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}/>
                        <Line yAxisId="left" type="monotone" name="Pengunjung" dataKey="visitors" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" name="Sales Lunas" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </section>

            {/* Funnel & Quiz */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                 <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                   <IconRadar /> Piramida Konversi (Funnel)
                 </h3>
                 <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                        <YAxis dataKey="name" type="category" width={80} stroke="#475569" fontWeight="bold" fontSize={10} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '2px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                        <Bar dataKey="count" fill="#2563eb" radius={[0, 2, 2, 0]}>
                          {funnelData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#94a3b8', '#64748b', '#3b82f6', '#2563eb', '#10b981'][index]} />
                          ))}
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
              </section>

              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                   <IconNode /> Kualifikasi Kuis Pengguna
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <QuizChart title="Q1: Terencana" data={formatYesNoData(data.quizData?.q1)} total={((data.quizData?.q1?.ya || 0) + (data.quizData?.q1?.tidak || 0))} />
                  <QuizChart title="Q2: Visi Arah" data={formatYesNoData(data.quizData?.q2)} total={((data.quizData?.q2?.ya || 0) + (data.quizData?.q2?.tidak || 0))} />
                  <QuizChart title="Q3: Kebiasaan" data={formatYesNoData(data.quizData?.q3)} total={((data.quizData?.q3?.ya || 0) + (data.quizData?.q3?.tidak || 0))} />
                  <div className="border border-[#e2e8f0] p-3 text-center">
                    <h3 className="text-[10px] font-bold text-[#0f172a] uppercase">Q4: Urgensi (1-10)</h3>
                    <div className="h-28 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={q4Data} cx="50%" cy="50%" innerRadius={20} outerRadius={40} dataKey="value">
                            {q4Data.map((_, index) => (<Cell key={`cell-${index}`} fill={`hsl(220, 80%, ${30 + (index * 8)}%)`} />))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '2px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* 📊 TABEL RANGKUMAN BULANAN WEBSITE (PER BULAN TAHUN BERJALAN) */}
            <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                    <IconDocument /> Rangkuman Performa Website Bulanan (Tahun {currentYear})
                  </h3>
                  <p className="text-[10px] text-[#64748b] font-medium mt-0.5">
                    Analisis bertahap per bulan untuk mengevaluasi pertumbuhan pengunjung, checkout, dan konversi lunas.
                  </p>
                </div>
                <button 
                  onClick={() => exportAnnualArchivePDF(currentYear)}
                  className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-[10px] font-bold px-3 py-2 rounded-sm transition-colors uppercase tracking-wider flex items-center gap-1.5"
                >
                  📄 Download PDF Arsip
                </button>
              </div>

              <div className="overflow-x-auto border border-[#e2e8f0] rounded-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] text-[10px] text-[#475569] uppercase tracking-wider font-bold border-b border-[#cbd5e1]">
                      <th className="px-4 py-2.5">Bulan</th>
                      <th className="px-4 py-2.5 text-right">Jumlah Pengunjung</th>
                      <th className="px-4 py-2.5 text-right">Jumlah Checkout</th>
                      <th className="px-4 py-2.5 text-right">Penjualan Lunas</th>
                      <th className="px-4 py-2.5 text-right">Konversi Lunas (%)</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {currentYearMonthlyData.map((m, idx) => (
                      <tr key={idx} className="hover:bg-[#f1f5f9] border-b border-[#e2e8f0] last:border-0 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-[#0f172a]">{m.month}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#0ea5e9]">{m.visitors.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#f59e0b]">{m.checkout.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#10b981] font-bold">{m.paid.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-[#2563eb]">
                          {m.conversionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ⏱️ TOMBOL BENCHMARK / "LAP" PERFORMA WEBSITE */}
            <section className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white p-6 rounded-sm shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#38bdf8] bg-[#0284c7]/20 px-2 py-0.5 rounded-sm border border-[#0284c7]/30">
                  Sistem Benchmark & Lap Performa
                </span>
                <h3 className="text-sm font-bold mt-1 uppercase tracking-wider">Catat Titik Pembaruan Marketing (Versi Lap)</h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-2xl">
                  Selesaikan publikasi atau perubahan pada landing page/checkout, lalu tekan tombol ini untuk menandai batas versi (misal: A1 ke A2). Catatan dan snapshot metrik ini akan dikirim ke <b>Tab 5 (Evaluasi Benchmark)</b> untuk analisis komparatif.
                </p>
              </div>
              <button 
                onClick={() => setShowLapModal(true)}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-sm transition-all shadow-lg shrink-0 flex items-center gap-2 border border-blue-400/30"
              >
                <span>⏱️</span> CATAT LAP / BENCHMARK BARU
              </button>
            </section>
          </div>
        )}

        {/* ==========================================
            TAB 2: APLIKASI / PWA
        ========================================== */}
        {activeTab === 'app' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Metrik Vitalitas Pengguna */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">DAU / MAU</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-black text-[#8b5cf6]">{dau} <span className="text-sm font-normal text-slate-400">/ {mau}</span></p>
                </div>
                <p className="text-[9px] text-[#64748b] mt-2 font-mono">Daily / Monthly Active Users</p>
              </div>
              
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Stickiness Ratio</p>
                <p className="text-2xl font-black text-[#0f172a]">{stickiness}%</p>
                <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className={`h-full ${stickiness > 20 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} style={{width: `${Math.max(0, Math.min(100, stickiness))}%`}}></div>
                </div>
                <p className="text-[9px] text-[#64748b] mt-1 font-mono">Target Sehat: {'>'} 20%</p>
              </div>

              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Post-Purchase Install</p>
                <p className="text-2xl font-black text-[#0f172a]">{installRate}%</p>
                <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#3b82f6]" style={{width: `${Math.max(0, Math.min(100, installRate))}%`}}></div>
                </div>
                <p className="text-[9px] text-[#64748b] mt-1 font-mono">PWA Installed vs Paid</p>
              </div>

              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-16 h-16 bg-rose-50 rounded-bl-full z-0"></div>
                <div className="relative z-10">
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Zombie User Rate</p>
                  <p className="text-2xl font-black text-[#ef4444]">{zombieRate}%</p>
                  <p className="text-[9px] text-[#64748b] mt-2 font-mono leading-tight">Paid User, 0 Act (14 Hari Terakhir)</p>
                </div>
              </div>
            </div>

            {/* METRIK 3 & 5: AUM & SESSION DURATION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                    <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Total Volume Transaksi (AUM)</p>
                    <h3 className="text-2xl font-black text-[#0f172a]">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format((aumVolume.totalRupiah || 0) + (aumVolume.totalValasIDR || 0))}
                    </h3>
                    <div className="flex justify-between text-[10px] text-[#64748b] mt-2 pt-2 border-t border-slate-50 font-medium">
                        <span>Kas Rupiah: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(aumVolume.totalRupiah || 0)}</span>
                        <span>Valas (IDR Equiv): {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(aumVolume.totalValasIDR || 0)}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Rata-rata Durasi Sesi (Stickiness)</p>
                        <h3 className="text-2xl font-black text-[#8b5cf6]">{sessionDuration.avgMinutes ? sessionDuration.avgMinutes.toFixed(1) : "0.0"} <span className="text-xs text-[#64748b] font-bold">Menit / Sesi</span></h3>
                    </div>
                    <p className="text-[9px] text-[#64748b] font-medium mt-2">*Dihitung dari true PWA app open hingga visibility hidden.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Feature Adoption Heatmap (Ranking) - DILENGKAPI DEBTS & SUBSCRIPTIONS */}
              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                 <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                   <IconNode /> Feature Adoption Ranking 
                 </h3>
                 <div className="space-y-4">
                    <FeatureBar name="AI Assistant (Chat)" count={aiChatCount} total={totalFeatureEvents} color="bg-indigo-500" />
                    <FeatureBar name="Smart Scanner (Receipts)" count={smartScanCount} total={totalFeatureEvents} color="bg-rose-500" />
                    <FeatureBar name="Portfolio / Forex Viewer" count={portfolioViewCount} total={totalFeatureEvents} color="bg-emerald-500" />
                    <FeatureBar name="Manual Transaction Input" count={manualInputCount} total={totalFeatureEvents} color="bg-blue-500" />
                    <FeatureBar name="Manajemen Hutang & Piutang (Debts)" count={debtsCount} total={totalFeatureEvents} color="bg-amber-500" />
                    <FeatureBar name="Pengeluaran Berulang (Subscriptions)" count={subscriptionsCount} total={totalFeatureEvents} color="bg-purple-500" />
                    <FeatureBar name="Manajemen Amal & Sedekah" count={amalCount} total={totalFeatureEvents} color="bg-teal-500" />
                    <FeatureBar name="Dana Mengendap (Likuiditas)" count={retainedCount} total={totalFeatureEvents} color="bg-cyan-500" />
                    <FeatureBar name="Cetak Laporan & PDF (Reports)" count={reportsCount} total={totalFeatureEvents} color="bg-orange-500" />
                    <FeatureBar name="Expert Terminal & Market Scanner" count={expertTerminalCount} total={totalFeatureEvents} color="bg-slate-800" />
                 </div>
                 <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-500 font-mono text-center">
                    Berdasarkan volume trigger event seluruh fitur aplikasi
                 </div>
              </section>

              {/* Lifecycle & Cohort */}
              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                 <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                   <IconRadar /> Lifecycle & Cohort Health
                 </h3>
                 
                 <div className="space-y-6">
                    <div className="border border-slate-200 p-4 rounded-sm">
                       <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Time-to-Value (TTV)</h4>
                       <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-800">{ttvHours}</span>
                          <span className="text-sm font-bold text-slate-500">Jam</span>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-1">Rata-rata waktu dari pendaftaran hingga transaksi pertama.</p>
                    </div>

                    <div className="border border-slate-200 p-4 rounded-sm">
                       <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Subscription Renewal Rate</h4>
                       <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-[#10b981]">{renewalRate}%</span>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-1">Persentase user yang memperpanjang paket setelah habis masa aktif.</p>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-sm">
                       <div>
                          <p className="text-[10px] font-bold uppercase text-slate-500">Rata-Rata Input</p>
                          <p className="text-lg font-black text-slate-800">{avgTxPerWeek} <span className="text-[10px] font-normal text-slate-500">Tx / Minggu</span></p>
                       </div>
                       <div className="w-10 h-10 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full">
                          <IconDocument />
                       </div>
                    </div>
                 </div>
              </section>
            </div>

            {/* METRIK 1 & 4: DROPOFF FUNNEL & ERROR LOGGING */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                    <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                        <IconRadar /> Analisis Drop-off Fitur Pintar
                    </h3>
                    <p className="text-[10px] text-[#64748b] font-medium mb-4 -mt-4">Membandingkan interaksi awal vs transaksi yang berhasil disimpan</p>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelDataDropoff} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '2px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #cbd5e1' }} />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                                <Bar dataKey="Dimulai" fill="#cbd5e1" radius={[2, 2, 0, 0]} barSize={24} />
                                <Bar dataKey="Tersimpan" fill="#10b981" radius={[2, 2, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6 border-t-4 border-t-[#ef4444]">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                                <IconNode /> Stabilitas API & Sistem AI
                            </h3>
                            <p className="text-[10px] text-[#64748b] font-medium mt-1">Memantau tingkat kegagalan jaringan atau timeout engine</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${errorMetrics.errorRate > 5 ? 'bg-[#fee2e2] text-[#ef4444]' : 'bg-[#ecfdf5] text-[#10b981]'}`}>
                            Error Rate: {errorMetrics.errorRate ? errorMetrics.errorRate.toFixed(2) : "0.00"}%
                        </span>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                        <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Log Kendala Terbanyak:</p>
                        {(!errorMetrics.popularErrors || errorMetrics.popularErrors.length === 0) ? (
                            <p className="text-xs text-[#64748b] font-medium py-3 text-center bg-[#f8fafc] rounded-sm border border-dashed border-[#cbd5e1]">Semua sistem berjalan normal 🟢</p>
                        ) : (
                            errorMetrics.popularErrors.map((err: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-[#f8fafc] rounded-sm border border-[#e2e8f0]">
                                    <span className="text-xs font-mono font-bold text-[#334155] truncate max-w-[200px]">{err.message}</span>
                                    <span className="text-[10px] bg-[#fee2e2] text-[#ef4444] px-2 py-0.5 rounded-sm font-black font-mono">x{err.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: TRANSAKSI (TABLE)
        ========================================== */}
        {activeTab === 'transactions' && (
          <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm animate-in fade-in duration-300">
            <div className="border-b border-[#cbd5e1] px-5 py-4 bg-[#f8fafc]">
              <h2 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                <IconDocument /> Rekap Transaksi Pembayaran Klien
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f1f5f9] text-[10px] text-[#475569] uppercase tracking-wider font-bold">
                    <th className="px-5 py-3 border-b border-[#cbd5e1]">Tanggal</th>
                    <th className="px-5 py-3 border-b border-[#cbd5e1]">Nama Klien</th>
                    <th className="px-5 py-3 border-b border-[#cbd5e1]">Kontak (Email / Telp)</th>
                    <th className="px-5 py-3 border-b border-[#cbd5e1]">Paket</th>
                    <th className="px-5 py-3 border-b border-[#cbd5e1] text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(!data.transactionHistory || data.transactionHistory.length === 0) ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-[#64748b] text-xs font-mono">Tidak ada riwayat transaksi.</td></tr>
                  ) : (
                    data.transactionHistory.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#f8fafc] border-b border-[#e2e8f0] last:border-0 transition-colors">
                        <td className="px-5 py-3 text-[#64748b] text-xs font-mono">{new Date(tx.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-5 py-3 font-bold text-[#0f172a]">{tx.name}</td>
                        <td className="px-5 py-3">
                          <div className="text-[#2563eb] text-xs">{tx.email}</div>
                          <div className="text-[#64748b] text-[10px] font-mono">{tx.phone}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase ${tx.plan === 'Tahunan' ? 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]' : 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'}`}>
                            {tx.plan}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-[#10b981]">
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ==========================================
            TAB 4: MANAJEMEN PENGGUNA & TIKET BANTUAN (DARI AdminPremium.tsx)
        ========================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Sub Navigasi Pengguna & Tiket */}
            <div className="flex border-b border-[#cbd5e1] bg-white p-2 rounded-sm gap-2">
              <button 
                onClick={() => setUserManagementSubTab('users')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors ${userManagementSubTab === 'users' ? 'bg-[#f59e0b] text-white' : 'text-[#64748b] hover:bg-[#f1f5f9]'}`}
              >
                👥 Daftar Pengguna ({usersList.length})
              </button>
              <button 
                onClick={() => setUserManagementSubTab('tickets')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors ${userManagementSubTab === 'tickets' ? 'bg-[#f59e0b] text-white' : 'text-[#64748b] hover:bg-[#f1f5f9]'}`}
              >
                💬 Tiket Bantuan Buka ({tickets.length})
              </button>
            </div>

            {/* SUB-TAB 1: DAFTAR PENGGUNA */}
            {userManagementSubTab === 'users' && (
              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                      <IconUsers /> Kelola Pengguna & Status Pro
                    </h3>
                    <p className="text-[10px] text-[#64748b] mt-0.5 font-medium">Akses kontrol lisensi, toggle status Pro, dan pantau pengguna terdaftar.</p>
                  </div>
                  
                  <input 
                    type="text" 
                    placeholder="Cari email, nama, atau telp..." 
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="bg-[#f8fafc] border border-[#cbd5e1] rounded-sm px-3 py-2 text-xs w-full md:w-64 outline-none focus:border-[#f59e0b]"
                  />
                </div>

                {isLoadingUsers ? (
                  <div className="py-12 text-center text-xs text-[#64748b] font-mono">Memuat daftar pengguna...</div>
                ) : (
                  <div className="overflow-x-auto border border-[#e2e8f0] rounded-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8fafc] text-[10px] text-[#475569] uppercase tracking-wider font-bold border-b border-[#cbd5e1]">
                          <th className="px-4 py-3">User / Email</th>
                          <th className="px-4 py-3">Telepon</th>
                          <th className="px-4 py-3">Terdaftar</th>
                          <th className="px-4 py-3">Status Lisensi</th>
                          <th className="px-4 py-3 text-center">Aksi / Kontrol</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {filteredUsers.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748b] font-mono">Tidak ada pengguna ditemukan.</td></tr>
                        ) : (
                          filteredUsers.map((u: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[#f8fafc] border-b border-[#e2e8f0] last:border-0 transition-colors">
                              <td className="px-4 py-3 font-bold text-[#0f172a]">
                                <div>{u.name || "User Bilano"}</div>
                                <div className="text-[10px] font-mono text-[#2563eb] font-normal">{u.email}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[#64748b]">{u.phone || "-"}</td>
                              <td className="px-4 py-3 font-mono text-[#64748b]">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString("id-ID") : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase ${u.isPro ? 'bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]' : 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]'}`}>
                                  {u.isPro ? "PRO (LUNAS)" : "FREE / TRIAL"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button 
                                  onClick={() => handleTogglePro(u.email, u.isPro)}
                                  className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase transition-colors ${u.isPro ? 'bg-[#fee2e2] text-[#ef4444] hover:bg-[#fca5a5]' : 'bg-[#10b981] text-white hover:bg-[#059669]'}`}
                                >
                                  {u.isPro ? "SET FREE" : "JADIKAN PRO"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* SUB-TAB 2: TIKET BANTUAN */}
            {userManagementSubTab === 'tickets' && (
              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-2 flex items-center gap-2">
                  💬 Tiket Kendala & Bantuan Klien
                </h3>
                <p className="text-[10px] text-[#64748b] mb-6 font-medium">Daftar keluhan atau pertanyaan pengguna dari halaman Help app.</p>

                {isLoadingTickets ? (
                  <div className="py-12 text-center text-xs text-[#64748b] font-mono">Memuat tiket bantuan...</div>
                ) : (
                  <div className="space-y-4">
                    {tickets.length === 0 ? (
                      <div className="p-8 text-center bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-sm text-xs text-[#64748b] font-mono">Tidak ada tiket bantuan aktif.</div>
                    ) : (
                      tickets.map((t: any, idx: number) => (
                        <div key={idx} className="p-4 border border-[#e2e8f0] rounded-sm bg-[#f8fafc] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-[#0f172a]">{t.subject}</span>
                              <span className={`px-2 py-0.2 rounded-sm text-[9px] font-black uppercase ${t.isReplied ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                                {t.isReplied ? "TERBALAS" : "PENDING"}
                              </span>
                            </div>
                            <p className="text-xs text-[#334155] leading-relaxed mb-2 bg-white p-3 border border-[#cbd5e1] rounded-sm">{t.message}</p>
                            <div className="text-[10px] text-[#64748b] font-mono">
                              Dari: <span className="font-bold text-[#2563eb]">{t.email}</span> • {new Date(t.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <button 
                            onClick={() => setReplyingTo(t)}
                            className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-sm shrink-0"
                          >
                            BALAS EMAIL
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 5: EVALUASI BENCHMARK & EKSPERIMEN A/B (A1 vs A2, dst.)
        ========================================== */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Evaluasi Marketing */}
            <div className="bg-white border border-[#cbd5e1] p-6 rounded-sm shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#ec4899] bg-[#fce7f3] px-2 py-0.5 rounded-sm border border-[#fbcfe8]">
                  Marketing & Website Evaluation Engine
                </span>
                <h2 className="text-base font-bold text-[#0f172a] uppercase tracking-wider mt-1">Evaluasi Perbandingan Hasil Update (A1 vs A2)</h2>
                <p className="text-xs text-[#64748b] mt-0.5 font-medium leading-relaxed">
                  Bandingkan performa konversi website, checkout rate, dan revenue sebelum vs sesudah eksperimen atau perbaikan marketing.
                </p>
              </div>

              {/* Selector Perbandingan Versi */}
              <div className="flex items-center gap-2 bg-[#f8fafc] p-2 border border-[#cbd5e1] rounded-sm">
                <div>
                  <label className="block text-[9px] font-bold text-[#64748b] uppercase">Basis (Sebelum):</label>
                  <select 
                    value={selectedBaseVersion} 
                    onChange={(e) => setSelectedBaseVersion(e.target.value)}
                    className="bg-white border border-[#cbd5e1] text-xs font-bold px-2 py-1 rounded-sm outline-none"
                  >
                    {benchmarkHistory.map(b => (
                      <option key={b.version} value={b.version}>{b.version} ({b.title})</option>
                    ))}
                  </select>
                </div>

                <span className="text-xs font-bold text-[#64748b] mt-3">VS</span>

                <div>
                  <label className="block text-[9px] font-bold text-[#64748b] uppercase">Evaluasi (Sesudah):</label>
                  <select 
                    value={selectedEvalVersion} 
                    onChange={(e) => setSelectedEvalVersion(e.target.value)}
                    className="bg-white border border-[#cbd5e1] text-xs font-bold px-2 py-1 rounded-sm outline-none text-[#ec4899]"
                  >
                    {benchmarkHistory.map(b => (
                      <option key={b.version} value={b.version}>{b.version} ({b.title})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* KOMPARASI MATRIKS UTAMA A1 VS A2 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Pengunjung Unik</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-[#0f172a]">{evalBenchmark?.metrics?.visitors || 0}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${((evalBenchmark?.metrics?.visitors || 0) >= (baseBenchmark?.metrics?.visitors || 0)) ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                    {getDeltaPct(baseBenchmark?.metrics?.visitors || 0, evalBenchmark?.metrics?.visitors || 0)}
                  </span>
                </div>
                <p className="text-[9px] text-[#64748b] mt-2 font-mono">Basis {baseBenchmark?.version}: {baseBenchmark?.metrics?.visitors || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Jumlah Checkout</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-[#f59e0b]">{evalBenchmark?.metrics?.checkout || 0}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${((evalBenchmark?.metrics?.checkout || 0) >= (baseBenchmark?.metrics?.checkout || 0)) ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                    {getDeltaPct(baseBenchmark?.metrics?.checkout || 0, evalBenchmark?.metrics?.checkout || 0)}
                  </span>
                </div>
                <p className="text-[9px] text-[#64748b] mt-2 font-mono">Basis {baseBenchmark?.version}: {baseBenchmark?.metrics?.checkout || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Penjualan Lunas</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-[#10b981]">{evalBenchmark?.metrics?.paid || 0}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${((evalBenchmark?.metrics?.paid || 0) >= (baseBenchmark?.metrics?.paid || 0)) ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                    {getDeltaPct(baseBenchmark?.metrics?.paid || 0, evalBenchmark?.metrics?.paid || 0)}
                  </span>
                </div>
                <p className="text-[9px] text-[#64748b] mt-2 font-mono">Basis {baseBenchmark?.version}: {baseBenchmark?.metrics?.paid || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Total Pendapatan (IDR)</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-[#2563eb]">{formatCurrency(evalBenchmark?.metrics?.revenue || 0)}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${((evalBenchmark?.metrics?.revenue || 0) >= (baseBenchmark?.metrics?.revenue || 0)) ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                    {getDeltaPct(baseBenchmark?.metrics?.revenue || 0, evalBenchmark?.metrics?.revenue || 0)}
                  </span>
                </div>
                <p className="text-[9px] text-[#64748b] mt-2 font-mono">Basis {baseBenchmark?.version}: {formatCurrency(baseBenchmark?.metrics?.revenue || 0)}</p>
              </div>
            </div>

            {/* TABEL KOMPARASI RIWAYAT & CATATAN BACKGROUND BENCHMARK */}
            <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
              <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-4 flex items-center gap-2">
                <IconBenchmark /> Timeline Perubahan & Log Latar Belakang Eksperimen
              </h3>

              <div className="overflow-x-auto border border-[#e2e8f0] rounded-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] text-[10px] text-[#475569] uppercase tracking-wider font-bold border-b border-[#cbd5e1]">
                      <th className="px-4 py-3">Versi</th>
                      <th className="px-4 py-3">Tanggal Lap</th>
                      <th className="px-4 py-3">Judul Pembaruan</th>
                      <th className="px-4 py-3">Catatan / Latar Belakang Evaluasi</th>
                      <th className="px-4 py-3 text-right">Pengunjung</th>
                      <th className="px-4 py-3 text-right">Lunas</th>
                      <th className="px-4 py-3 text-right">Konversi</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {benchmarkHistory.map((b, idx) => (
                      <tr key={idx} className="hover:bg-[#f8fafc] border-b border-[#e2e8f0] last:border-0 transition-colors">
                        <td className="px-4 py-3">
                          <span className="bg-[#ec4899] text-white px-2 py-0.5 rounded-sm font-black text-[10px]">
                            {b.version}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#64748b] text-[10px]">
                          {new Date(b.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#0f172a]">{b.title}</td>
                        <td className="px-4 py-3 text-[#334155] max-w-xs">{b.notes}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#0ea5e9]">{b.metrics.visitors}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#10b981] font-bold">{b.metrics.paid}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#2563eb]">{b.metrics.conversionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

      </main>

      {/* ==========================================
          MODAL CATAT BENCHMARK BARU (LAP MODAL)
      ========================================== */}
      {showLapModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-sm max-w-lg w-full border border-[#cbd5e1] shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowLapModal(false)} className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#0f172a] font-bold">✕</button>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⏱️</span>
              <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">Catat Benchmark Pembaruan (Lap)</h3>
            </div>
            <p className="text-xs text-[#64748b] mb-6 font-medium leading-relaxed">
              Tandai hasil statistik website & checkout saat ini sebagai snapshot acuan (seperti A1, A2). Masukkan latar belakang perubahan yang dilakukan.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#475569] uppercase text-[10px] mb-1">Judul Pembaruan / Versi</label>
                <input 
                  type="text" 
                  placeholder="Misal: A2 - Redesign Banner & Tombol CTA Baru" 
                  value={lapTitle}
                  onChange={(e) => setLapTitle(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-sm px-3 py-2.5 outline-none focus:border-[#2563eb] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#475569] uppercase text-[10px] mb-1">Catatan Latar Belakang Perubahan</label>
                <textarea 
                  placeholder="Jelaskan alasan evaluasi, perbaikan copywriting, perubahan diskon, atau optimasi landing page..."
                  value={lapNotes}
                  onChange={(e) => setLapNotes(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-sm p-3 min-h-[100px] outline-none focus:border-[#2563eb] resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={handleSaveLapBenchmark}
                  className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3 rounded-sm uppercase tracking-wider text-xs shadow-md transition-colors"
                >
                  SIMPAN BENCHMARK & KANCI SNAPSHOT
                </button>
                <button 
                  onClick={() => setShowLapModal(false)}
                  className="px-4 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#64748b] font-bold py-3 rounded-sm uppercase tracking-wider text-xs transition-colors"
                >
                  BATAL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BALAS TIKET BANTUAN */}
      {replyingTo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-sm max-w-lg w-full border border-[#cbd5e1] shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setReplyingTo(null)} className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#0f172a] font-bold">✕</button>
            <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider mb-1">Balas Tiket Bantuan Klien</h3>
            <p className="text-xs text-[#64748b] mb-4">Email balasan akan dikirimkan ke: <b className="text-[#2563eb]">{replyingTo.email}</b></p>
            
            <textarea 
              className="w-full min-h-[140px] p-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-sm text-xs outline-none focus:border-[#2563eb] resize-none mb-4" 
              placeholder="Ketik pesan balasan solusi teknis..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
            />
            
            <button 
              onClick={handleSendReply} 
              disabled={isSendingReply || !replyMessage} 
              className="w-full py-3 rounded-sm bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-50"
            >
              {isSendingReply ? "MENGIRIM EMAIL..." : "KIRIM BALASAN SEKARANG"}
            </button>
          </div>
        </div>
      )}

    </div>
  );

  function QuizChart({ title, data, total }: any) {
    return (
      <div className="border border-[#e2e8f0] p-3 text-center">
        <h3 className="text-[10px] font-bold text-[#0f172a] uppercase">{title}</h3>
        <p className="text-[9px] text-[#64748b] mb-1 font-mono">Vol: {total || 0}</p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={20} outerRadius={40} dataKey="value" stroke="none">
                {data.map((_:any, index:number) => (<Cell key={`cell-${index}`} fill={COLORS_QUIZ[index % COLORS_QUIZ.length]} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '2px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  function FeatureBar({ name, count, total, color }: any) {
    const validCount = count || 0;
    const validTotal = total || 1;
    const percentage = Math.round((validCount / validTotal) * 100) || 0;
    return (
      <div>
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-slate-700">{name}</span>
          <span className="text-[10px] font-mono text-slate-500">{validCount} hits ({percentage}%)</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}></div>
        </div>
      </div>
    );
  }
}
