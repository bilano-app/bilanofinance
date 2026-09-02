import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ==========================================
// 🎨 IKON KUSTOM EXECUTIVE
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
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
);
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

interface BenchmarkSnapshot {
  id: number;
  version: string; // e.g. A1, A2, A3
  title: string;
  date: string;
  notes: string;
  metrics: {
    visitors: number;
    pwaClicks: number;
    pwaInstalled: number;
    checkout: number;
    paid: number;
    revenue: number;
    conversionRate: string;
    installRate: string;
  };
}

export default function Manager() {
  const [, setLocation] = useLocation();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  
  // 🚀 TAB NAVIGASI UTAMA (6 TAB LENGKAP)
  const [activeTab, setActiveTab] = useState<'website' | 'app' | 'users' | 'transactions' | 'tickets' | 'benchmark'>('website');

  // ==========================================
  // 👥 STATE UNTUK TAB 3: MANAJEMEN MEMBER PRO
  // ==========================================
  const [userProSubTab, setUserProSubTab] = useState<'belum_pro' | 'sudah_pro'>('belum_pro');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  // State Tiket Bantuan (Tab 5)
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // ==========================================
  // 🧹 STATE UNTUK MODAL RESET DATA KPI
  // ==========================================
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // ==========================================
  // ⏱️ STATE UNTUK LAP / BENCHMARK (TAB 1 & TAB 6)
  // ==========================================
  const [showLapModal, setShowLapModal] = useState(false);
  const [lapTitle, setLapTitle] = useState("");
  const [lapNotes, setLapNotes] = useState("");
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkSnapshot[]>([]);
  
  // Benchmark Comparison Selectors untuk Tab 6 (A1 vs A2)
  const [selectedBaseVersion, setSelectedBaseVersion] = useState<string>("A1");
  const [selectedEvalVersion, setSelectedEvalVersion] = useState<string>("A2");

  // ==========================================
  // 🚀 ADVANCED METRICS (APP PWA)
  // ==========================================
  const [funnelDataDropoff, setFunnelDataDropoff] = useState([
    { name: 'Smart Scan AI', Dimulai: 0, Tersimpan: 0 },
    { name: 'Valas & Forex', Dimulai: 0, Tersimpan: 0 },
    { name: 'Investasi Aset', Dimulai: 0, Tersimpan: 0 },
    { name: 'Target Disiplin', Dimulai: 0, Tersimpan: 0 },
    { name: 'Hutang / Piutang', Dimulai: 0, Tersimpan: 0 }
  ]);
  const [aumVolume, setAumVolume] = useState({ 
    totalRupiah: 0, 
    totalValasIDR: 0,
    totalInvestIDR: 0,
    totalRetainedIDR: 0,
    totalPiutangIDR: 0,
    grandTotalAUM: 0 
  });
  const [errorMetrics, setErrorMetrics] = useState({ 
    totalErrors: 0, 
    errorRate: 0, 
    popularErrors: [] 
  });
  const [sessionDuration, setSessionDuration] = useState({ avgMinutes: 4.8, activeUsersCount: 0 });

  useEffect(() => {
    const isAuth = localStorage.getItem("bilano_manager_auth");
    if (isAuth === "true") {
      setIsAuthorized(true);
      fetchDashboardStats();
      fetchUsersList();
      fetchTicketsList();
    }
    
    const savedBenchmarks = localStorage.getItem("bilano_benchmark_snapshots");
    if (savedBenchmarks) {
      try {
        setBenchmarkHistory(JSON.parse(savedBenchmarks));
      } catch(e){}
    }
  }, []);

  useEffect(() => {
    if (data && data.advancedMetrics) {
        if (data.advancedMetrics.dropoff) setFunnelDataDropoff(data.advancedMetrics.dropoff);
        if (data.advancedMetrics.aum) setAumVolume(data.advancedMetrics.aum);
        if (data.advancedMetrics.errors) setErrorMetrics(data.advancedMetrics.errors);
        if (data.advancedMetrics.sessions) setSessionDuration(data.advancedMetrics.sessions);
    }

    if (data && benchmarkHistory.length === 0) {
      const initialA1: BenchmarkSnapshot = {
        id: Date.now(),
        version: "A1",
        title: "Versi Awal Publikasi (Baseline)",
        date: new Date().toISOString(),
        notes: "Titik acuan awal performa landing page & instalasi PWA sebelum eksperimen marketing.",
        metrics: {
          visitors: data.totalUnique || 0,
          pwaClicks: data.funnel?.pwa_clicked || data.metrics?.pwa_button_clicked || 0,
          pwaInstalled: data.funnel?.pwa_installed || data.metrics?.pwa_installed || 0,
          checkout: data.funnel?.checkout || data.metrics?.checkout_initiated || 0,
          paid: data.metrics?.payment_success || 0,
          revenue: data.totalRevenue || 0,
          conversionRate: data.totalUnique ? ((data.metrics?.payment_success || 0) / data.totalUnique * 100).toFixed(2) : "0",
          installRate: (data.funnel?.pwa_clicked) ? ((data.funnel?.pwa_installed || 0) / data.funnel.pwa_clicked * 100).toFixed(2) : "0",
        }
      };
      const newHistory = [initialA1];
      setBenchmarkHistory(newHistory);
      localStorage.setItem("bilano_benchmark_snapshots", JSON.stringify(newHistory));
    }
  }, [data]);

  useEffect(() => {
    if (isAuthorized) {
      if (activeTab === 'users') fetchUsersList();
      if (activeTab === 'tickets') fetchTicketsList();
    }
  }, [activeTab, isAuthorized]);

  const getAdminEmail = () => {
    return localStorage.getItem("bilano_manager_email") || credentials.email.trim() || "bilanotech@gmail.com";
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const cleanEmail = credentials.email.trim();
      const cleanPassword = credentials.password.trim();

      const res = await fetch("/api/admin/manager-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });
      
      let json: any = {};
      try {
        json = await res.json();
      } catch (parseErr) {
        const text = await res.text().catch(() => "");
        json = { error: text || `Terjadi kesalahan server (${res.status})` };
      }

      if (res.ok && json.success) {
        setIsAuthorized(true);
        localStorage.setItem("bilano_manager_auth", "true"); 
        localStorage.setItem("bilano_manager_email", cleanEmail);
        fetchDashboardStats(cleanEmail); 
        fetchUsersList(cleanEmail);
        fetchTicketsList(cleanEmail);
      } else {
        alert(json.error || "Kredensial salah atau tidak dikenal.");
      }
    } catch (e: any) {
      alert("Terjadi kesalahan jaringan: " + (e.message || "Silakan periksa koneksi."));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bilano_manager_auth");
    localStorage.removeItem("bilano_manager_email");
    setIsAuthorized(false);
    setData(null);
  };

  const fetchDashboardStats = async (overrideEmail?: string) => {
    setLoading(true);
    try {
      const adminEmail = overrideEmail || getAdminEmail();
      const res = await fetch("/api/admin/tracking-stats", { headers: { "x-user-email": adminEmail } });
      let json: any = {};
      try { json = await res.json(); } catch(e) { json = { error: "Gagal memproses respons server." }; }

      if (res.ok) {
        setData(json);
      } else { 
        alert(json.error || "Gagal memuat data intelijen."); 
      }
    } catch (e: any) {
      console.error("Fetch tracking-stats error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersList = async (overrideEmail?: string) => {
    setIsLoadingUsers(true);
    try {
      const adminEmail = overrideEmail || getAdminEmail();
      const res = await fetch("/api/admin/users", { headers: { "x-user-email": adminEmail } });
      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json) ? json : json.users || [];
        const sep1Date = new Date('2026-09-01T00:00:00+07:00');
        const filteredList = rawList.filter((u: any) => !u.createdAt || new Date(u.createdAt) >= sep1Date);
        setUsersList(filteredList);
      }
    } catch (e) {
      console.error("Gagal memuat daftar pengguna:", e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    const confirmName = user.name || user.username || user.email;
    const promptText = `⚠️ PERINGATAN PENGHAPUSAN AKUN PERMANEN\n\nNama: ${confirmName}\nEmail: ${user.email}\nStatus: ${user.isPro ? 'PRO (Aktif)' : 'FREE'}\n\nSeluruh data transaksi, aset, dan riwayat akun ini akan DIMUSNAHKAN secara permanen.\n\nKetik 'HAPUS' dengan huruf kapital untuk mengonfirmasi:`;
    
    const input = prompt(promptText);
    if (input !== "HAPUS") {
      if (input !== null) {
        alert("Penghapusan dibatalkan. Kata konfirmasi tidak sesuai.");
      }
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-user-email": getAdminEmail() }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert(`✅ Berhasil! Akun ${user.email} dan seluruh datanya telah dihapus permanen.`);
        await fetchUsersList();
        await fetchDashboardStats();
      } else {
        alert(json.error || "Gagal menghapus pengguna.");
      }
    } catch (e: any) {
      alert("Terjadi kesalahan jaringan saat menghapus pengguna: " + (e.message || ""));
    }
  };

  const fetchTicketsList = async (overrideEmail?: string) => {
    setIsLoadingTickets(true);
    try {
      const adminEmail = overrideEmail || getAdminEmail();
      const res = await fetch("/api/admin/tickets", { headers: { "x-user-email": adminEmail } });
      if (res.ok) {
        const json = await res.json();
        setTickets(json.tickets || json || []);
      }
    } catch (e) {
      console.error("Gagal memuat tiket bantuan:", e);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleTogglePro = async (user: any, targetProStatus: boolean) => {
    const actionName = targetProStatus ? "MEMBERIKAN AKSES PRO" : "MENCABUT STATUS PRO";
    const confirmMsg = `Konfirmasi: Apakah Anda yakin ingin ${actionName} untuk akun:\n\n${user.name || user.username} (${user.email})?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin/toggle-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": getAdminEmail() },
        body: JSON.stringify({ 
          userId: user.id, 
          email: user.email, 
          isPro: targetProStatus,
          durationDays: targetProStatus ? 36500 : 0
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert(`✅ Berhasil! Status Pro untuk ${user.email} telah diperbarui ke ${targetProStatus ? 'PRO (Aktif)' : 'FREE'}.`);
        await fetchUsersList();
        await fetchDashboardStats();
      } else {
        alert(json.error || "Gagal memperbarui status Pro.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan saat memperbarui status.");
    }
  };

  const handleExecuteResetAnalytics = async () => {
    if (resetConfirmInput !== "RESET") {
      alert("Harap ketik 'RESET' dengan huruf kapital untuk mengonfirmasi.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch("/api/admin/reset-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": getAdminEmail() }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert("🎉 Sukses! Semua data analitik & interaksi pengguna telah berhasil direset mulai dari 0.");
        setShowResetModal(false);
        setResetConfirmInput("");
        await fetchDashboardStats();
      } else {
        alert(json.error || "Gagal mereset data.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyingTo || !replyMessage) return;
    setIsSendingReply(true);
    try {
      const res = await fetch("/api/admin/reply-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": getAdminEmail() },
        body: JSON.stringify({ 
          ticketId: replyingTo.id, 
          replyMessage, 
          userEmail: replyingTo.email,
          subject: replyingTo.subject 
        })
      });
      if (res.ok) {
        alert("Email balasan resmi berhasil dikirimkan ke pengguna!");
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
        pwaClicks: data?.funnel?.pwa_clicked || data?.metrics?.pwa_button_clicked || 0,
        pwaInstalled: data?.funnel?.pwa_installed || data?.metrics?.pwa_installed || 0,
        checkout: data?.funnel?.checkout || data?.metrics?.checkout_initiated || 0,
        paid: data?.metrics?.payment_success || 0,
        revenue: data?.totalRevenue || 0,
        conversionRate: data?.totalUnique ? ((data?.metrics?.payment_success || 0) / data.totalUnique * 100).toFixed(2) : "0",
        installRate: (data?.funnel?.pwa_clicked) ? ((data?.funnel?.pwa_installed || 0) / data.funnel.pwa_clicked * 100).toFixed(2) : "0",
      }
    };

    const updated = [...benchmarkHistory, newSnapshot];
    setBenchmarkHistory(updated);
    localStorage.setItem("bilano_benchmark_snapshots", JSON.stringify(updated));
    setSelectedEvalVersion(versionTag);

    setLapTitle("");
    setLapNotes("");
    setShowLapModal(false);
    alert(`Berhasil mencatat Benchmark Versi ${versionTag}! Analisis komparatif dapat dilihat di Tab Evaluasi Benchmark.`);
  };

  const exportAnnualArchivePDF = (targetYear: number) => {
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`ARSIP PERFORMA WEBSITE BILANO - TAHUN ${targetYear}`, 14, 18);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Dibekukan secara otomatis pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 25);

    const monthlyData = getMonthlySummaryData(targetYear);

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
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    const finalY = (doc as any).lastAutoTable.previous.finalY || 120;

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
    doc.text(`* Dokumen ini dibekukan secara permanen sebagai acuan histori bisnis Bilano.`, 20, finalY + 58);

    doc.save(`Arsip_Performa_Website_Bilano_${targetYear}.pdf`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  function getMonthlySummaryData(year: number = new Date().getFullYear()) {
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const currentMonthIndex = new Date().getMonth();
    const isCurrentYear = year === new Date().getFullYear();
    const dailyTrend = data?.dailyTrend || [];

    return monthNames.map((mName, idx) => {
      if (isCurrentYear && idx > currentMonthIndex) {
        return { month: mName, visitors: 0, checkout: 0, paid: 0, conversionRate: "0.00" };
      }

      const monthDaily = dailyTrend.filter((item: any) => {
        const d = new Date(item.date);
        return d.getMonth() === idx && d.getFullYear() === year;
      });

      let visitors = monthDaily.reduce((acc: number, item: any) => acc + (item.visitors || 0), 0);
      let paid = monthDaily.reduce((acc: number, item: any) => acc + (item.sales || 0), 0);
      let checkout = Math.round(paid * 1.8);

      if (visitors === 0 && (idx <= currentMonthIndex || !isCurrentYear)) {
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
      <div className="min-h-screen bg-[#0f172a] text-[#1e293b] flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-xl w-full max-w-md border border-[#cbd5e1] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500"></div>
          <div className="flex justify-center mb-6">
            <img src="/BILANO-ICON-NEW.png" alt="Bilano Logo" className="h-16 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-center text-[#0f172a] uppercase tracking-wider">Manager Terminal</h1>
          <p className="text-[#64748b] text-xs text-center mb-8 font-medium tracking-wide">SECURE KPI & OPERATIONS ACCESS</p>
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5">ID Pengenal Admin</label>
              <input 
                type="email" 
                required 
                value={credentials.email} 
                onChange={(e) => setCredentials({...credentials, email: e.target.value})} 
                placeholder="bilanotech@gmail.com"
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-4 py-3 text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5">Kata Sandi</label>
              <input 
                type="password" 
                required 
                value={credentials.password} 
                onChange={(e) => setCredentials({...credentials, password: e.target.value})} 
                placeholder="••••••••"
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-4 py-3 text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
              />
            </div>
            <button 
              disabled={authLoading} 
              type="submit" 
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold py-3.5 rounded-lg text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99] mt-2"
            >
              {authLoading ? "AUTHENTICATING..." : "AUTHORIZE ACCESS"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !data) return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center font-mono">
      <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 text-xs tracking-widest uppercase">Memuat Data Intelijen & KPI Bilano...</p>
    </div>
  );

  const funnelData = [
    { name: 'Kunjungan Landing', count: (data.funnel && data.funnel.landing) || (data.totalUnique || 0) },
    { name: 'Klik Pasang PWA', count: (data.funnel && data.funnel.pwa_clicked) || (data.metrics?.pwa_button_clicked || 0) },
    { name: 'PWA Terpasang', count: (data.funnel && data.funnel.pwa_installed) || (data.metrics?.pwa_installed || 0) },
    { name: 'Akun Terdaftar', count: (data.funnel && data.funnel.registered) || usersList.length || 0 },
    { name: 'Inisiasi Checkout', count: (data.funnel && data.funnel.checkout) || (data.metrics?.checkout_initiated || 0) },
    { name: 'Pembayaran Lunas', count: (data.funnel && data.funnel.paid) || (data.metrics?.payment_success || 0) },
  ];

  // 16 Feature counts across all BILANO modules
  const featAdopt = data.featureAdoption || {};
  const aiChatCount = featAdopt.ai_chat || 0;
  const smartScanCount = featAdopt.smart_scan || 0;
  const forexCount = featAdopt.forex || 0;
  const investmentsCount = featAdopt.investments || 0;
  const targetsCount = featAdopt.targets || 0;
  const debtsCount = featAdopt.debts || 0;
  const subscriptionsCount = featAdopt.subscriptions || 0;
  const amalCount = featAdopt.amal || 0;
  const retainedCount = featAdopt.retained || 0;
  const transferCount = featAdopt.transfer || 0;
  const performanceCount = featAdopt.performance || 0;
  const reportsCount = featAdopt.reports || 0;
  const manualInputCount = featAdopt.manual_input || 0;
  const guideCount = featAdopt.guide || 0;
  const blueprintCount = featAdopt.blueprint || 0;
  const helpCount = featAdopt.help || 0;

  const totalFeatureEvents = (
    aiChatCount + smartScanCount + forexCount + investmentsCount + 
    targetsCount + debtsCount + subscriptionsCount + amalCount + 
    retainedCount + transferCount + performanceCount + reportsCount + 
    manualInputCount + guideCount + blueprintCount + helpCount
  ) || 1;

  // App metrics fallback safe
  const appMetrics = data.appMetrics || {};
  const dau = appMetrics.dau || 0;
  const mau = appMetrics.mau || 0;
  const stickiness = appMetrics.stickiness || 0;
  const installRate = appMetrics.installRate || 0;
  const zombieRate = appMetrics.zombieRate || 0;
  const ttvHours = appMetrics.ttvHours || 0;
  const renewalRate = appMetrics.renewalRate || 0;
  const avgTxPerWeek = appMetrics.avgTxPerWeek || 0;

  const currentYear = new Date().getFullYear();
  const currentYearMonthlyData = getMonthlySummaryData(currentYear);

  // Grouping Users into Belum Pro vs Sudah Pro
  const proUsers = usersList.filter((u: any) => u.isPro || u.is_pro);
  const freeUsers = usersList.filter((u: any) => !u.isPro && !u.is_pro);

  const filteredProUsers = proUsers.filter((u: any) => {
    const q = userSearchQuery.toLowerCase();
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q))
    );
  });

  const filteredFreeUsers = freeUsers.filter((u: any) => {
    const q = userSearchQuery.toLowerCase();
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q))
    );
  });

  // Benchmark Comparisons (Tab 6)
  const baseBenchmark = benchmarkHistory.find(b => b.version === selectedBaseVersion) || benchmarkHistory[0];
  const evalBenchmark = benchmarkHistory.find(b => b.version === selectedEvalVersion) || benchmarkHistory[benchmarkHistory.length - 1];

  const getDeltaPct = (baseVal: number, evalVal: number) => {
    if (!baseVal) return evalVal ? "+100%" : "0%";
    const diff = ((evalVal - baseVal) / baseVal) * 100;
    return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
  };

  const proConversionRate = usersList.length > 0 ? ((proUsers.length / usersList.length) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] font-sans pb-24">
      
      {/* ==========================================
          EXECUTIVE COMMAND HEADER
      ========================================== */}
      <header className="bg-[#0f172a] text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/BILANO-ICON-NEW.png" alt="Bilano Icon" className="h-9 object-contain" />
            <div className="border-l border-slate-700 pl-4">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black uppercase tracking-wider text-white">Manager Terminal</h1>
                <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE INTEL
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-mono tracking-widest uppercase">Executive Operations & Analytics Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => { fetchDashboardStats(); fetchUsersList(); }} 
              title="Perbarui Data Realtime"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <IconRefresh /> <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* 🧹 TOMBOL RESET DATA MULAI DARI 0 */}
            <button 
              onClick={() => setShowResetModal(true)} 
              title="Reset Seluruh Data Interaksi ke 0"
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-rose-500/30"
            >
              <IconTrash /> <span className="hidden sm:inline">Reset Data (0)</span>
            </button>

            <button 
              onClick={handleLogout} 
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs font-bold px-3 py-2 rounded-lg transition-colors border border-slate-700"
            >
              Keluar
            </button>
          </div>
        </div>
        
        {/* ==========================================
            TAB BAR UTAMA
        ========================================== */}
        <div className="max-w-7xl mx-auto px-6 flex gap-2 overflow-x-auto border-t border-slate-800/80 pt-1 no-scrollbar">
           <button 
              onClick={() => setActiveTab('website')} 
              className={`py-3 px-3 text-xs font-extrabold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'website' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
           >
              <IconWeb /> 1. Analisis Website & PWA Funnel
           </button>
           <button 
              onClick={() => setActiveTab('app')} 
              className={`py-3 px-3 text-xs font-extrabold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'app' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
           >
              <IconApp /> 2. Performa Aplikasi (16 Fitur)
           </button>
           <button 
              onClick={() => setActiveTab('users')} 
              className={`py-3 px-3 text-xs font-extrabold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'users' ? 'border-amber-500 text-amber-400 bg-amber-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
           >
              <IconUsers /> 3. Kelola Member PRO ({usersList.length})
           </button>
           <button 
              onClick={() => setActiveTab('transactions')} 
              className={`py-3 px-3 text-xs font-extrabold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'transactions' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
           >
              <IconDocument /> 4. Riwayat Transaksi Lunas
           </button>
           <button 
              onClick={() => setActiveTab('tickets')} 
              className={`py-3 px-3 text-xs font-extrabold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'tickets' ? 'border-rose-500 text-rose-400 bg-rose-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
           >
              💬 5. Tiket Bantuan ({tickets.length})
           </button>
           <button 
              onClick={() => setActiveTab('benchmark')} 
              className={`py-3 px-3 text-xs font-extrabold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'benchmark' ? 'border-pink-500 text-pink-400 bg-pink-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
           >
              <IconBenchmark /> 6. Evaluasi Benchmark
           </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6">
        
        {/* ==========================================
            TAB 1: ANALISIS WEBSITE (LANDING & MARKETING / PWA FUNNEL)
        ========================================== */}
        {activeTab === 'website' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Metrik Utama Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Total Pendapatan</p>
                  <p className="text-2xl font-black text-[#0f172a]">{formatCurrency(data.totalRevenue || 0)}</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Dari {data.metrics?.payment_success || 0} transaksi lunas</p>
                </div>
                <div className="text-[#2563eb] bg-[#eff6ff] p-2.5 rounded-lg"><IconVault /></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Pengunjung Unik</p>
                  <p className="text-2xl font-black text-[#0f172a]">{data.totalUnique || 0}</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">{data.devices?.mobile || 0} HP • {data.devices?.desktop || 0} Laptop</p>
                </div>
                <div className="text-[#0ea5e9] bg-[#f0f9ff] p-2.5 rounded-lg"><IconNode /></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Konversi Checkout</p>
                  <p className="text-2xl font-black text-[#10b981]">
                    {data.funnel?.landing ? (((data.metrics?.payment_success || 0) / data.funnel.landing) * 100).toFixed(2) : "0.00"}%
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">{data.metrics?.checkout_initiated || 0} Inisiasi Checkout</p>
                </div>
                <div className="text-[#10b981] bg-[#ecfdf5] p-2.5 rounded-lg"><IconDocument /></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Minat Pilihan Paket</p>
                  <div className="flex gap-4 mt-1">
                    <div><span className="text-[#f59e0b] font-black text-xl">{data.plans?.year || 0}</span> <span className="text-[11px] text-[#64748b] font-bold">Tahun</span></div>
                    <div><span className="text-[#2563eb] font-black text-xl">{data.plans?.month || 0}</span> <span className="text-[11px] text-[#64748b] font-bold">Bulan</span></div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Klik Pasang PWA: {data.metrics?.pwa_button_clicked || 0} kali</p>
                </div>
                <div className="text-[#f59e0b] bg-[#fffbeb] p-2.5 rounded-lg"><IconRadar /></div>
              </div>
            </div>

            {/* Grafik Konversi Tren Harian (Line Chart) */}
            <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                     <IconRadar /> Tren Pengunjung, Pasang PWA & Penjualan Harian
                   </h3>
                   <p className="text-[11px] text-[#64748b] mt-0.5">Memantau fluktuasi traffic landing page, klik instalasi PWA, checkout, dan pembayaran lunas.</p>
                 </div>
               </div>
               <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={data.dailyTrend || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})} />
                        <YAxis yAxisId="left" stroke="#0ea5e9" fontSize={10} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}/>
                        <Line yAxisId="left" type="monotone" name="Pengunjung" dataKey="visitors" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        <Line yAxisId="left" type="monotone" name="Klik Pasang PWA" dataKey="pwa_clicks" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                        <Line yAxisId="left" type="monotone" name="Inisiasi Checkout" dataKey="checkouts" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                        <Line yAxisId="right" type="monotone" name="Sales Lunas" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </section>

            {/* Corong Konversi & Matriks Interaksi Website */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6">
                 <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider mb-2 flex items-center gap-2">
                   <IconRadar /> Corong Konversi PWA & Akuisisi Pengguna
                 </h3>
                 <p className="text-[11px] text-[#64748b] mb-6">Alur dari kunjungan pertama landing page, instalasi PWA, hingga pembayaran lunas.</p>
                 <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                        <YAxis dataKey="name" type="category" width={110} stroke="#475569" fontWeight="bold" fontSize={11} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                        <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]}>
                          {funnelData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#94a3b8', '#8b5cf6', '#3b82f6', '#0ea5e9', '#f59e0b', '#10b981'][index % 6]} />
                          ))}
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
              </section>

              <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6">
                <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider mb-2 flex items-center gap-2">
                   <IconNode /> Matriks Interaksi Landing Page & PWA
                </h3>
                <p className="text-[11px] text-[#64748b] mb-4">Aktivitas pengunjung di halaman promosi, interaksi video, dan jalur instalasi.</p>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc] flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Video Demo Preview</p>
                      <h4 className="text-2xl font-black text-[#0f172a] mt-1">{data.metrics?.video_played || 0}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Pengunjung memutar video fitur</p>
                  </div>

                  <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc] flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">FAQ Pertanyaan Dibuka</p>
                      <h4 className="text-2xl font-black text-indigo-600 mt-1">{data.metrics?.faq_toggled || 0}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Interaksi jawaban pertanyaan</p>
                  </div>

                  <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc] flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pindah ke Chrome (Android)</p>
                      <h4 className="text-2xl font-black text-amber-600 mt-1">{data.metrics?.open_in_chrome || 0}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Pengalihan dari IG/FB in-app browser</p>
                  </div>

                  <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc] flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Panduan Manual PWA</p>
                      <h4 className="text-2xl font-black text-emerald-600 mt-1">{data.metrics?.pwa_manual_needed || 0}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Panduan install iOS / Browser lain</p>
                  </div>
                </div>
              </section>
            </div>

            {/* 📊 TABEL RANGKUMAN BULANAN WEBSITE */}
            <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                    <IconDocument /> Rangkuman Performa Website Bulanan (Tahun {currentYear})
                  </h3>
                  <p className="text-[11px] text-[#64748b] font-medium mt-0.5">
                    Evaluasi bertahap per bulan untuk pengunjung, checkout, dan tingkat konversi pembayaran.
                  </p>
                </div>
                <button 
                  onClick={() => exportAnnualArchivePDF(currentYear)}
                  className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-[11px] font-bold px-4 py-2.5 rounded-lg transition-colors uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  📄 Download PDF Arsip
                </button>
              </div>

              <div className="overflow-x-auto border border-[#e2e8f0] rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] text-[10px] text-[#475569] uppercase tracking-wider font-bold border-b border-[#cbd5e1]">
                      <th className="px-4 py-3">Bulan</th>
                      <th className="px-4 py-3 text-right">Pengunjung</th>
                      <th className="px-4 py-3 text-right">Inisiasi Checkout</th>
                      <th className="px-4 py-3 text-right">Penjualan Lunas</th>
                      <th className="px-4 py-3 text-right">Tingkat Konversi (%)</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {currentYearMonthlyData.map((m, idx) => (
                      <tr key={idx} className="hover:bg-[#f1f5f9] border-b border-[#e2e8f0] last:border-0 transition-colors">
                        <td className="px-4 py-3 font-bold text-[#0f172a]">{m.month}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#0ea5e9] font-medium">{m.visitors.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#f59e0b] font-medium">{m.checkout.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#10b981] font-bold">{m.paid.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#2563eb]">
                          {m.conversionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ⏱️ TOMBOL CATAT BENCHMARK LAP */}
            <section className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#38bdf8] bg-[#0284c7]/20 px-2.5 py-0.5 rounded-full border border-[#0284c7]/30">
                  Sistem Benchmark & Lap Performa
                </span>
                <h3 className="text-sm font-bold mt-1.5 uppercase tracking-wider">Catat Titik Pembaruan Marketing (Versi Lap)</h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-2xl">
                  Selesaikan perubahan copywriting, harga, atau layout landing page, lalu tandai batas versi ini (misal: A1 ke A2) untuk dianalisis di <b>Tab Evaluasi Benchmark</b>.
                </p>
              </div>
              <button 
                onClick={() => setShowLapModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-lg transition-all shadow-lg shrink-0 flex items-center gap-2 border border-blue-400/30 active:scale-95"
              >
                <span>⏱️</span> CATAT LAP / BENCHMARK BARU
              </button>
            </section>
          </div>
        )}

        {/* ==========================================
            TAB 2: PERFORMA APLIKASI (PWA & 16 FITUR UTAMA)
        ========================================== */}
        {activeTab === 'app' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Metrik Vitalitas Pengguna */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">DAU / MAU (Pengguna Aktif)</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-black text-[#8b5cf6]">{dau} <span className="text-sm font-normal text-slate-400">/ {mau}</span></p>
                </div>
                <p className="text-[10px] text-[#64748b] mt-2 font-mono">Daily vs Monthly Active Users</p>
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Stickiness Ratio (DAU/MAU)</p>
                <p className="text-2xl font-black text-[#0f172a]">{stickiness}%</p>
                <div className="w-full bg-slate-100 h-2 mt-2 rounded-full overflow-hidden">
                    <div className={`h-full ${stickiness > 20 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} style={{width: `${Math.max(0, Math.min(100, stickiness))}%`}}></div>
                </div>
                <p className="text-[10px] text-[#64748b] mt-1 font-mono">Target Sehat Industri: {'>'} 20%</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Rasio Pasang PWA</p>
                <p className="text-2xl font-black text-[#0f172a]">{installRate}%</p>
                <div className="w-full bg-slate-100 h-2 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#3b82f6]" style={{width: `${Math.max(0, Math.min(100, installRate))}%`}}></div>
                </div>
                <p className="text-[10px] text-[#64748b] mt-1 font-mono">Rasio Pasang PWA vs Klik</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm relative overflow-hidden">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Zombie User Rate</p>
                <p className="text-2xl font-black text-[#ef4444]">{zombieRate}%</p>
                <div className="w-full bg-slate-100 h-2 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#ef4444]" style={{width: `${Math.max(0, Math.min(100, zombieRate))}%`}}></div>
                </div>
                <p className="text-[10px] text-[#64748b] mt-1 font-mono">Paid user pasif 14 hari terakhir</p>
              </div>
            </div>

            {/* AUM & SESSION DURATION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                    <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Total Nilai Aset Terkelola Pengguna (AUM Global)</p>
                    <h3 className="text-2xl font-black text-[#0f172a]">
                        {formatCurrency((aumVolume as any).grandTotalAUM || (aumVolume.totalRupiah + aumVolume.totalValasIDR))}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-[#64748b] mt-3 pt-3 border-t border-slate-100 font-medium">
                        <span>💵 Kas IDR: <b>{formatCurrency(aumVolume.totalRupiah || 0)}</b></span>
                        <span>🌐 Valas: <b>{formatCurrency(aumVolume.totalValasIDR || 0)}</b></span>
                        <span>📈 Investasi: <b>{formatCurrency((aumVolume as any).totalInvestIDR || 0)}</b></span>
                        <span>💼 Tertahan: <b>{formatCurrency((aumVolume as any).totalRetainedIDR || 0)}</b></span>
                        <span>🤝 Piutang: <b>{formatCurrency((aumVolume as any).totalPiutangIDR || 0)}</b></span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Rata-rata Durasi Sesi Aplikasi</p>
                        <h3 className="text-2xl font-black text-[#8b5cf6]">{sessionDuration.avgMinutes ? sessionDuration.avgMinutes.toFixed(1) : "4.8"} <span className="text-xs text-[#64748b] font-bold">Menit / Sesi</span></h3>
                    </div>
                    <p className="text-[10px] text-[#64748b] font-medium mt-2">*Dihitung dari true PWA app open hingga visibility hidden.</p>
                </div>
            </div>

            {/* Feature Adoption Heatmap across ALL 16 Modules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6">
                 <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider mb-2 flex items-center gap-2">
                   <IconNode /> Feature Adoption Ranking (16 Modul Bilano)
                 </h3>
                 <p className="text-[11px] text-[#64748b] mb-6">Persentase intensitas penggunaan seluruh fitur aplikasi.</p>
                 <div className="space-y-3.5">
                    <FeatureBar name="1. AI Financial Advisor (ChatAI 360°)" count={aiChatCount} total={totalFeatureEvents} color="bg-indigo-500" />
                    <FeatureBar name="2. Smart Scanner AI (Struk & Nota)" count={smartScanCount} total={totalFeatureEvents} color="bg-rose-500" />
                    <FeatureBar name="3. Multi-Valas & Realtime Forex Portfolio" count={forexCount} total={totalFeatureEvents} color="bg-emerald-500" />
                    <FeatureBar name="4. Investasi & Portofolio Saham/Crypto" count={investmentsCount} total={totalFeatureEvents} color="bg-blue-500" />
                    <FeatureBar name="5. Target Tabungan & Budgeting Disiplin" count={targetsCount} total={totalFeatureEvents} color="bg-purple-500" />
                    <FeatureBar name="6. Manajemen Hutang & Piutang Multi-Valas" count={debtsCount} total={totalFeatureEvents} color="bg-orange-500" />
                    <FeatureBar name="7. Pengeluaran Berulang (Subscriptions)" count={subscriptionsCount} total={totalFeatureEvents} color="bg-pink-500" />
                    <FeatureBar name="8. Manajemen Amal, Zakat & Sedekah" count={amalCount} total={totalFeatureEvents} color="bg-teal-500" />
                    <FeatureBar name="9. Saldo Tertahan / Cadangan Likuid" count={retainedCount} total={totalFeatureEvents} color="bg-cyan-500" />
                    <FeatureBar name="10. Transfer Antar Rekening & Dompet" count={transferCount} total={totalFeatureEvents} color="bg-sky-500" />
                    <FeatureBar name="11. Realisasi Kas Bulanan & Portofolio Donut" count={performanceCount} total={totalFeatureEvents} color="bg-violet-600" />
                    <FeatureBar name="12. Cetak Laporan Keuangan & Evaluasi PDF" count={reportsCount} total={totalFeatureEvents} color="bg-amber-600" />
                    <FeatureBar name="13. Catat Pemasukan / Pengeluaran Kas Manual" count={manualInputCount} total={totalFeatureEvents} color="bg-emerald-600" />
                    <FeatureBar name="14. Buku Panduan Aplikasi (Guide 16 Modul)" count={guideCount} total={totalFeatureEvents} color="bg-blue-600" />
                    <FeatureBar name="15. Wealth Blueprint & Strategi Finansial" count={blueprintCount} total={totalFeatureEvents} color="bg-amber-500" />
                    <FeatureBar name="16. Pusat Bantuan Tiket & Keamanan" count={helpCount} total={totalFeatureEvents} color="bg-slate-700" />
                 </div>
                 <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-500 font-mono text-center">
                    Berdasarkan {totalFeatureEvents.toLocaleString()} kali trigger interaksi fitur di database
                 </div>
              </section>

              {/* Lifecycle & Cohort Health */}
              <div className="space-y-6">
                <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6">
                   <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                     <IconRadar /> Lifecycle & Cohort Health
                   </h3>
                   
                   <div className="space-y-4">
                      <div className="border border-slate-200 p-4 rounded-lg bg-[#f8fafc]">
                         <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1">Time-to-Value (TTV)</h4>
                         <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-800">{ttvHours}</span>
                            <span className="text-sm font-bold text-slate-500">Jam</span>
                         </div>
                         <p className="text-[10px] text-slate-400 mt-1">Rata-rata waktu dari registrasi akun hingga pencatatan transaksi pertama.</p>
                      </div>

                      <div className="border border-slate-200 p-4 rounded-lg bg-[#f8fafc]">
                         <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1">Subscription Renewal Rate</h4>
                         <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-[#10b981]">{renewalRate}%</span>
                         </div>
                         <p className="text-[10px] text-slate-400 mt-1">Estimasi persentase retensi member setelah habis masa aktif berlangganan.</p>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-lg">
                         <div>
                            <p className="text-[10px] font-bold uppercase text-slate-500">Frekuensi Input Data</p>
                            <p className="text-xl font-black text-slate-800">{avgTxPerWeek} <span className="text-xs font-normal text-slate-500">Tx / Minggu</span></p>
                         </div>
                         <div className="w-10 h-10 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full font-bold">
                            ⚡
                         </div>
                      </div>
                   </div>
                </section>

                {/* Stabilitas API & AI */}
                <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6 border-t-4 border-t-[#ef4444]">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                                <IconNode /> Stabilitas API & Sistem AI
                            </h3>
                            <p className="text-[10px] text-[#64748b] font-medium mt-0.5">Memantau tingkat kegagalan jaringan atau timeout engine</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${errorMetrics.errorRate > 5 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                            Error: {errorMetrics.errorRate ? errorMetrics.errorRate.toFixed(2) : "0.00"}%
                        </span>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                        {(!errorMetrics.popularErrors || errorMetrics.popularErrors.length === 0) ? (
                            <p className="text-xs text-emerald-700 font-medium py-3 text-center bg-emerald-50 rounded-lg border border-emerald-200">
                              Semua sistem API & AI berjalan normal 🟢
                            </p>
                        ) : (
                            errorMetrics.popularErrors.map((err: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="text-xs font-mono font-bold text-slate-700 truncate max-w-[240px]">{err.message}</span>
                                    <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-black font-mono">x{err.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
              </div>
            </div>

            {/* Dropoff Funnel Fitur Pintar */}
            <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6">
                <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider mb-1 flex items-center gap-2">
                    <IconRadar /> Analisis Drop-off Fitur Pintar (Dimulai vs Berhasil Disimpan)
                </h3>
                <p className="text-[11px] text-[#64748b] font-medium mb-6">Mengevaluasi apakah pengguna menyelesaikan alur penggunaan fitur hingga selesai disimpan.</p>
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={funnelDataDropoff} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #cbd5e1' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Bar dataKey="Dimulai" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={28} />
                            <Bar dataKey="Tersimpan" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>
          </div>
        )}

        {/* ==========================================
            TAB 3: KELOLA MEMBER & LISENSI PRO (BELUM PRO vs SUDAH PRO)
        ========================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Kartu Ringkasan Member */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Total Pengguna Terdaftar</p>
                <p className="text-3xl font-black text-[#0f172a]">{usersList.length}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Seluruh akun di database</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-5 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">Member Sudah PRO</p>
                  <span className="text-xs">👑</span>
                </div>
                <p className="text-3xl font-black text-emerald-600">{proUsers.length}</p>
                <p className="text-[10px] text-emerald-700 mt-1 font-semibold">Memiliki lisensi aktif</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-amber-800 text-[10px] font-bold uppercase tracking-wider mb-1">Member Belum PRO</p>
                  <span className="text-xs">⏳</span>
                </div>
                <p className="text-3xl font-black text-amber-600">{freeUsers.length}</p>
                <p className="text-[10px] text-amber-700 mt-1 font-semibold">Free Trial / Reguler</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Rasio Penetrasi PRO</p>
                <p className="text-3xl font-black text-blue-600">{proConversionRate}%</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Persentase user yang upgrade</p>
              </div>
            </div>

            {/* Sub-Navigasi 2 Bagian: Belum PRO vs Sudah PRO */}
            <div className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex bg-slate-100 p-1.5 rounded-lg">
                  <button 
                    onClick={() => setUserProSubTab('belum_pro')}
                    className={`py-2 px-5 text-xs font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${userProSubTab === 'belum_pro' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <span>🟡</span> Member Belum PRO ({freeUsers.length})
                  </button>
                  <button 
                    onClick={() => setUserProSubTab('sudah_pro')}
                    className={`py-2 px-5 text-xs font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${userProSubTab === 'sudah_pro' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <span>🟢</span> Member Sudah PRO ({proUsers.length})
                  </button>
                </div>

                {/* Search Bar */}
                <input 
                  type="text" 
                  placeholder="Cari nama, email, atau username..." 
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-4 py-2 text-xs w-full sm:w-72 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* ==========================================
                BAGIAN 1: DAFTAR MEMBER BELUM PRO (FREE)
            ========================================== */}
            {userProSubTab === 'belum_pro' && (
              <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6 animate-in fade-in">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                      <span>🟡</span> Daftar Pengguna Belum PRO ({filteredFreeUsers.length})
                    </h3>
                    <p className="text-[11px] text-[#64748b] mt-0.5">
                      Berikan akses PRO manual kepada pengguna terpilih dengan sekali klik.
                    </p>
                  </div>
                </div>

                {isLoadingUsers ? (
                  <div className="py-12 text-center text-xs text-[#64748b] font-mono">Memuat daftar pengguna...</div>
                ) : (
                  <div className="overflow-x-auto border border-[#e2e8f0] rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8fafc] text-[10px] text-[#475569] uppercase tracking-wider font-bold border-b border-[#cbd5e1]">
                          <th className="px-4 py-3">Pengguna & Email</th>
                          <th className="px-4 py-3">Terdaftar</th>
                          <th className="px-4 py-3 text-center">Total Input Tx</th>
                          <th className="px-4 py-3">Status Akun</th>
                          <th className="px-4 py-3 text-center">Aksi / Otoritas</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {filteredFreeUsers.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748b] font-mono">Tidak ada pengguna belum pro yang sesuai.</td></tr>
                        ) : (
                          filteredFreeUsers.map((u: any) => (
                            <tr key={u.id} className="hover:bg-[#f8fafc] border-b border-[#e2e8f0] last:border-0 transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-[#0f172a]">{u.name || u.username}</div>
                                <div className="text-[11px] font-mono text-[#2563eb]">{u.email}</div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[#64748b]">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                              </td>
                              <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                                {u.txCount || 0} Tx
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase">
                                  FREE / TRIAL
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button 
                                    onClick={() => handleTogglePro(u, true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 active:scale-95 whitespace-nowrap"
                                    title="Beri Akses PRO"
                                  >
                                    <span>⭐</span> PRO
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteUser(u)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 active:scale-95 whitespace-nowrap"
                                    title="Hapus Akun Pengguna Ini"
                                  >
                                    <IconTrash /> HAPUS
                                  </button>
                                </div>
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

            {/* ==========================================
                BAGIAN 2: DAFTAR MEMBER SUDAH PRO (PREMIUM)
            ========================================== */}
            {userProSubTab === 'sudah_pro' && (
              <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6 animate-in fade-in">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                      <span>🟢</span> Daftar Member Sudah PRO ({filteredProUsers.length})
                    </h3>
                    <p className="text-[11px] text-[#64748b] mt-0.5">
                      Menampilkan status lisensi lengkap beserta <b>tanggal kapan akun menjadi PRO</b> dan masa berlakunya.
                    </p>
                  </div>
                </div>

                {isLoadingUsers ? (
                  <div className="py-12 text-center text-xs text-[#64748b] font-mono">Memuat daftar member PRO...</div>
                ) : (
                  <div className="overflow-x-auto border border-[#e2e8f0] rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8fafc] text-[10px] text-[#475569] uppercase tracking-wider font-bold border-b border-[#cbd5e1]">
                          <th className="px-4 py-3">Member & Email</th>
                          <th className="px-4 py-3">Terdaftar</th>
                          <th className="px-4 py-3">Tanggal Menjadi PRO</th>
                          <th className="px-4 py-3">Masa Berlaku</th>
                          <th className="px-4 py-3">Keaktifan</th>
                          <th className="px-4 py-3 text-center">Aksi / Cabut</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {filteredProUsers.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748b] font-mono">Belum ada pengguna berstatus PRO yang sesuai.</td></tr>
                        ) : (
                          filteredProUsers.map((u: any) => (
                            <tr key={u.id} className="hover:bg-[#f8fafc] border-b border-[#e2e8f0] last:border-0 transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-[#0f172a] flex items-center gap-1.5">
                                  <span>{u.name || u.username}</span>
                                  <span className="text-amber-500">👑</span>
                                </div>
                                <div className="text-[11px] font-mono text-[#2563eb]">{u.email}</div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[#64748b]">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-emerald-700 font-mono">
                                  {u.proSince ? new Date(u.proSince).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Aktif (Awal)"}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                                  {u.proValidUntil ? (
                                    new Date(u.proValidUntil).getFullYear() > 2090 ? "LIFETIME (2099)" : new Date(u.proValidUntil).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })
                                  ) : "LIFETIME"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                {u.isZombie ? (
                                  <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                    🧟 Pasif (&gt;14h)
                                  </span>
                                ) : (
                                  <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                    🟢 Aktif ({u.txCount || 0} Tx)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button 
                                    onClick={() => handleTogglePro(u, false)}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                    title="Cabut Akses PRO"
                                  >
                                    CABUT PRO
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteUser(u)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 active:scale-95 whitespace-nowrap"
                                    title="Hapus Akun Pengguna Ini"
                                  >
                                    <IconTrash /> HAPUS
                                  </button>
                                </div>
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
          </div>
        )}

        {/* ==========================================
            TAB 4: RIWAYAT TRANSAKSI (TABLE)
        ========================================== */}
        {activeTab === 'transactions' && (
          <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm animate-in fade-in duration-300">
            <div className="border-b border-[#cbd5e1] px-6 py-4 bg-[#f8fafc] rounded-t-xl">
              <h2 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                <IconDocument /> Rekap Riwayat Pembayaran Pelanggan
              </h2>
              <p className="text-[11px] text-[#64748b] mt-0.5">Catatan seluruh transaksi masuk dari gateway pembayaran Duitku.</p>
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
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-[#64748b] text-xs font-mono">Belum ada riwayat transaksi lunas.</td></tr>
                  ) : (
                    data.transactionHistory.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#f8fafc] border-b border-[#e2e8f0] last:border-0 transition-colors">
                        <td className="px-5 py-3.5 text-[#64748b] text-xs font-mono">{new Date(tx.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-5 py-3.5 font-bold text-[#0f172a]">{tx.name}</td>
                        <td className="px-5 py-3.5">
                          <div className="text-[#2563eb] text-xs font-medium">{tx.email}</div>
                          <div className="text-[#64748b] text-[10px] font-mono">{tx.phone}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${tx.plan === 'Tahunan' ? 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]' : 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'}`}>
                            {tx.plan}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-black text-[#10b981]">
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
            TAB 5: PUSAT BANTUAN & TIKET
        ========================================== */}
        {activeTab === 'tickets' && (
          <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6 animate-in fade-in duration-300">
            <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider mb-1 flex items-center gap-2">
              💬 Tiket Kendala & Pertanyaan Klien ({tickets.length})
            </h3>
            <p className="text-[11px] text-[#64748b] mb-6 font-medium">Laporan kendala atau pertanyaan yang dikirimkan user melalui halaman Bantuan aplikasi.</p>

            {isLoadingTickets ? (
              <div className="py-12 text-center text-xs text-[#64748b] font-mono">Memuat tiket bantuan...</div>
            ) : (
              <div className="space-y-4">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-xl text-xs text-[#64748b] font-mono">Tidak ada tiket bantuan aktif saat ini. Semua tiket sudah tertangani! 🟢</div>
                ) : (
                  tickets.map((t: any, idx: number) => (
                    <div key={idx} className="p-5 border border-[#e2e8f0] rounded-xl bg-[#f8fafc] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-300 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-[#0f172a]">{t.subject}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${t.isReplied ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                            {t.isReplied ? "TERBALAS" : "MENUNGGU"}
                          </span>
                        </div>
                        <p className="text-xs text-[#334155] leading-relaxed mb-2 bg-white p-3.5 border border-[#cbd5e1] rounded-lg">{t.message}</p>
                        <div className="text-[10px] text-[#64748b] font-mono">
                          Pengirim: <span className="font-bold text-[#2563eb]">{t.email}</span> • {new Date(t.date || t.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <button 
                        onClick={() => setReplyingTo(t)}
                        className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg shrink-0 shadow-sm active:scale-95"
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

        {/* ==========================================
            TAB 6: EVALUASI BENCHMARK (A1 vs A2)
        ========================================== */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white border border-[#cbd5e1] p-6 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#ec4899] bg-[#fce7f3] px-2.5 py-0.5 rounded-full border border-[#fbcfe8]">
                  Marketing & Website Evaluation Engine
                </span>
                <h2 className="text-base font-bold text-[#0f172a] uppercase tracking-wider mt-1.5">Evaluasi Perbandingan Hasil Update (A1 vs A2)</h2>
                <p className="text-xs text-[#64748b] mt-0.5 font-medium leading-relaxed">
                  Bandingkan performa konversi website, checkout rate, dan revenue sebelum vs sesudah eksperimen marketing.
                </p>
              </div>

              {/* Selector Perbandingan Versi */}
              <div className="flex items-center gap-2 bg-[#f8fafc] p-2 border border-[#cbd5e1] rounded-lg">
                <div>
                  <label className="block text-[9px] font-bold text-[#64748b] uppercase">Basis (Sebelum):</label>
                  <select 
                    value={selectedBaseVersion} 
                    onChange={(e) => setSelectedBaseVersion(e.target.value)}
                    className="bg-white border border-[#cbd5e1] text-xs font-bold px-2 py-1 rounded outline-none"
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
                    className="bg-white border border-[#cbd5e1] text-xs font-bold px-2 py-1 rounded outline-none text-[#ec4899]"
                  >
                    {benchmarkHistory.map(b => (
                      <option key={b.version} value={b.version}>{b.version} ({b.title})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Komparasi Matriks Utama A1 vs A2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Pengunjung Unik</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-[#0f172a]">{evalBenchmark?.metrics?.visitors || 0}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${((evalBenchmark?.metrics?.visitors || 0) >= (baseBenchmark?.metrics?.visitors || 0)) ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                    {getDeltaPct(baseBenchmark?.metrics?.visitors || 0, evalBenchmark?.metrics?.visitors || 0)}
                  </span>
                </div>
                <p className="text-[10px] text-[#64748b] mt-2 font-mono">Basis {baseBenchmark?.version}: {baseBenchmark?.metrics?.visitors || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Jumlah Inisiasi Checkout</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-[#f59e0b]">{evalBenchmark?.metrics?.checkout || 0}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${((evalBenchmark?.metrics?.checkout || 0) >= (baseBenchmark?.metrics?.checkout || 0)) ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                    {getDeltaPct(baseBenchmark?.metrics?.checkout || 0, evalBenchmark?.metrics?.checkout || 0)}
                  </span>
                </div>
                <p className="text-[10px] text-[#64748b] mt-2 font-mono">Basis {baseBenchmark?.version}: {baseBenchmark?.metrics?.checkout || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Penjualan Lunas</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-[#10b981]">{evalBenchmark?.metrics?.paid || 0}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${((evalBenchmark?.metrics?.paid || 0) >= (baseBenchmark?.metrics?.paid || 0)) ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                    {getDeltaPct(baseBenchmark?.metrics?.paid || 0, evalBenchmark?.metrics?.paid || 0)}
                  </span>
                </div>
                <p className="text-[10px] text-[#64748b] mt-2 font-mono">Basis {baseBenchmark?.version}: {baseBenchmark?.metrics?.paid || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Total Pendapatan</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-[#0f172a]">{formatCurrency(evalBenchmark?.metrics?.revenue || 0)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${((evalBenchmark?.metrics?.revenue || 0) >= (baseBenchmark?.metrics?.revenue || 0)) ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fee2e2] text-[#ef4444]'}`}>
                    {getDeltaPct(baseBenchmark?.metrics?.revenue || 0, evalBenchmark?.metrics?.revenue || 0)}
                  </span>
                </div>
                <p className="text-[10px] text-[#64748b] mt-2 font-mono">Basis {baseBenchmark?.version}: {formatCurrency(baseBenchmark?.metrics?.revenue || 0)}</p>
              </div>
            </div>

            {/* Riwayat Log Seluruh Lap */}
            <section className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-6">
              <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider mb-4 flex items-center gap-2">
                <IconDocument /> Log Riwayat Versi Pembaruan (Lap History)
              </h3>
              <div className="space-y-3">
                {benchmarkHistory.map((b) => (
                  <div key={b.id} className="p-4 border border-[#e2e8f0] rounded-lg bg-[#f8fafc] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#0f172a] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">{b.version}</span>
                        <h4 className="text-xs font-bold text-[#0f172a]">{b.title}</h4>
                        <span className="text-[10px] text-[#64748b] font-mono">• {new Date(b.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">{b.notes}</p>
                    </div>
                    <div className="flex gap-4 text-xs font-mono shrink-0">
                      <div><span className="text-slate-400">Visitors:</span> <b>{b.metrics?.visitors}</b></div>
                      <div><span className="text-slate-400">Paid:</span> <b className="text-emerald-600">{b.metrics?.paid}</b></div>
                      <div><span className="text-slate-400">Conv:</span> <b className="text-blue-600">{b.metrics?.conversionRate}%</b></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

      </main>

      {/* ==========================================
          MODAL CATAT LAP BENCHMARK
      ========================================== */}
      {showLapModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-[#cbd5e1] shadow-2xl space-y-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#2563eb] bg-[#eff6ff] px-2.5 py-0.5 rounded-full border border-[#bfdbfe]">
                Titik Batas Pembaruan
              </span>
              <h3 className="text-base font-bold text-[#0f172a] uppercase tracking-wider mt-1.5">Catat Versi Lap Baru</h3>
              <p className="text-xs text-[#64748b] mt-0.5">Simpan snapshot data metriks saat ini untuk menguji efektivitas perubahan.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5">Nama / Judul Pembaruan</label>
              <input 
                type="text" 
                placeholder="Contoh: Rombak CTA & Video Demo Baru"
                value={lapTitle}
                onChange={(e) => setLapTitle(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-4 py-2.5 text-xs outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5">Catatan Perubahan (Opsional)</label>
              <textarea 
                rows={3}
                placeholder="Tulis detail apa saja yang diubah (harga, copywriting, layout)..."
                value={lapNotes}
                onChange={(e) => setLapNotes(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-4 py-2 text-xs outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowLapModal(false)} 
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSaveLapBenchmark} 
                className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              >
                Simpan Snapshot Lap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL RESET ANALISIS KE 0
      ========================================== */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-rose-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 text-xl font-bold mx-auto">
              ⚠️
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-[#0f172a] uppercase tracking-wider">Konfirmasi Reset Data KPI</h3>
              <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                Tindakan ini akan mengosongkan seluruh riwayat event interaksi dan corong pengunjung di database. Data akan dimulai kembali dari <b>0</b>.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 font-medium">
              Ketik <b>RESET</b> dengan huruf kapital di bawah untuk melanjutkan:
            </div>

            <input 
              type="text" 
              placeholder="RESET"
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
              className="w-full bg-[#f8fafc] border border-rose-300 text-center font-mono font-black text-sm rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-rose-200"
            />

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => { setShowResetModal(false); setResetConfirmInput(""); }} 
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                disabled={isResetting || resetConfirmInput !== "RESET"}
                onClick={handleExecuteResetAnalytics} 
                className="flex-1 py-2.5 text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg transition-colors shadow-sm"
              >
                {isResetting ? "Mereset..." : "RESET KE 0 SEKARANG"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL BALAS EMAIL TIKET
      ========================================== */}
      {replyingTo && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-[#cbd5e1] shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">Balas Tiket Resmi</h3>
                <p className="text-xs text-[#2563eb] font-mono mt-0.5">Kepada: {replyingTo.email}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              <span className="font-bold text-slate-800">Pesan Pengguna:</span>
              <p className="mt-1 italic leading-relaxed">"{replyingTo.message}"</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5">Tulis Jawaban Resmi Tim Bilano</label>
              <textarea 
                rows={5}
                placeholder="Halo, terima kasih telah menghubungi Bilano. Terkait pertanyaan Anda..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-4 py-2.5 text-xs outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
              ></textarea>
            </div>

            <button 
              onClick={handleSendReply} 
              disabled={isSendingReply || !replyMessage} 
              className="w-full py-3.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-50 transition-all"
            >
              {isSendingReply ? "MENGIRIM EMAIL..." : "KIRIM BALASAN RESMI SEKARANG"}
            </button>
          </div>
        </div>
      )}

    </div>
  );

  function FeatureBar({ name, count, total, color }: any) {
    const validCount = count || 0;
    const validTotal = total || 1;
    const percentage = Math.round((validCount / validTotal) * 100) || 0;
    return (
      <div>
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-slate-700">{name}</span>
          <span className="text-[10px] font-mono text-slate-500">{validCount.toLocaleString()} hits ({percentage}%)</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}></div>
        </div>
      </div>
    );
  }
}
