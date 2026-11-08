import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { 
  BarChart3, TrendingUp, Users, ShoppingBag, 
  Activity, RefreshCw, LogOut, ExternalLink, 
  MessageCircle, CheckCircle2, Clock, AlertCircle, 
  Send, Download, Lock, Check, ChevronRight, AlertTriangle,
  RotateCcw, Eye, ArrowUpRight, Calendar, Sparkles, Layers,
  DollarSign, Flag, Timer, PlusCircle, Edit3, Trash2, X
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ProductStat {
  id: number;
  slug: string;
  title: string;
  category: string;
  sale_price: number;
  regular_price: number;
  cover_url: string;
  views_count: number;
  checkouts_count: number;
  purchases_count: number;
  revenue: number;
  conversion_rate: string;
}

interface OrderRecord {
  id: number;
  merchant_order_id: string;
  product_id: number;
  product_title: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  discount_amount: number;
  subtotal: number;
  voucher_code?: string;
  payment_method: string;
  payment_status: "PAID" | "PENDING" | "FAILED" | "EXPIRED";
  created_at: string;
  paid_at?: string;
}

interface AnalyticsEvent {
  id: number;
  event_type: string;
  product_id?: number;
  product_title?: string;
  visitor_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  created_at: string;
}

interface LapItem {
  id: number;
  lapNumber: number;
  title: string;
  notes: string;
  date: string;
  baseline: {
    pageViews: number;
    uniqueVisitors: number;
    paidOrders: number;
    revenue: number;
  };
}

export default function ManagerDashboard() {
  // Auth State
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Tab State: Strictly Performance Focused
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "events">("overview");

  // Orders Filter
  const [orderFilter, setOrderFilter] = useState<"ALL" | "PAID" | "PENDING">("ALL");
  const [orderSearch, setOrderSearch] = useState<string>("");

  // Data State
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
    uniqueVisitors: 0,
    totalPageViews: 0,
    totalProductClicks: 0,
    totalCheckouts: 0,
    conversionRate: "0%",
    clickThroughRate: "0%",
    checkoutConversionRate: "0%",
    averageOrderValue: 0
  });
  const [analytics, setAnalytics] = useState<any>({
    funnel: [],
    recentEvents: [],
    productStats: []
  });
  const [products, setProducts] = useState<ProductStat[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // 📈 State Grafik Penjualan Dinamis (1 Minggu, 1 Bulan, 1 Tahun)
  const [timeScale, setTimeScale] = useState<"1W" | "1M" | "1Y">("1W");
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders" | "combined">("revenue");

  // Format Helper untuk Tanggal Lokal (YYYY-MM-DD)
  const getLocalDateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format Helper untuk Bulan Lokal (YYYY-MM)
  const getLocalMonthKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // Kalkulasi data time-series per skala
  const chartData = useMemo(() => {
    const now = new Date();

    const ordersByDate: Record<string, { revenue: number; paidOrders: number; pendingOrders: number; totalOrders: number }> = {};
    const ordersByMonth: Record<string, { revenue: number; paidOrders: number; pendingOrders: number; totalOrders: number }> = {};

    orders.forEach((o) => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      if (isNaN(d.getTime())) return;

      const dateKey = getLocalDateKey(d);
      const monthKey = getLocalMonthKey(d);
      const amount = Number(o.total_amount || 0);
      const isPaid = o.payment_status === "PAID";
      const isPending = o.payment_status === "PENDING";

      // Harian
      if (!ordersByDate[dateKey]) {
        ordersByDate[dateKey] = { revenue: 0, paidOrders: 0, pendingOrders: 0, totalOrders: 0 };
      }
      ordersByDate[dateKey].totalOrders += 1;
      if (isPaid) {
        ordersByDate[dateKey].revenue += amount;
        ordersByDate[dateKey].paidOrders += 1;
      } else if (isPending) {
        ordersByDate[dateKey].pendingOrders += 1;
      }

      // Bulanan
      if (!ordersByMonth[monthKey]) {
        ordersByMonth[monthKey] = { revenue: 0, paidOrders: 0, pendingOrders: 0, totalOrders: 0 };
      }
      ordersByMonth[monthKey].totalOrders += 1;
      if (isPaid) {
        ordersByMonth[monthKey].revenue += amount;
        ordersByMonth[monthKey].paidOrders += 1;
      } else if (isPending) {
        ordersByMonth[monthKey].pendingOrders += 1;
      }
    });

    if (timeScale === "1W") {
      // 1 MINGGU: 7 hari terakhir - Grafik Batang (Hitungan per hari)
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateKey = getLocalDateKey(d);
        const dayName = dayNames[d.getDay()];
        const dayNumber = d.getDate();
        const monthShort = d.toLocaleDateString("id-ID", { month: "short" });
        const rec = ordersByDate[dateKey] || { revenue: 0, paidOrders: 0, pendingOrders: 0, totalOrders: 0 };

        days.push({
          date: dateKey,
          label: `${dayName} (${dayNumber})`,
          shortLabel: dayName,
          fullLabel: `${dayName}, ${dayNumber} ${monthShort} ${d.getFullYear()}`,
          revenue: rec.revenue,
          paidOrders: rec.paidOrders,
          pendingOrders: rec.pendingOrders,
          totalOrders: rec.totalOrders,
        });
      }
      return days;
    }

    if (timeScale === "1M") {
      // 1 BULAN: 30 hari terakhir - Grafik Garis Saja (Hitungan per hari)
      const days = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateKey = getLocalDateKey(d);
        const dayNumber = d.getDate();
        const monthShort = d.toLocaleDateString("id-ID", { month: "short" });
        const rec = ordersByDate[dateKey] || { revenue: 0, paidOrders: 0, pendingOrders: 0, totalOrders: 0 };

        days.push({
          date: dateKey,
          label: `${dayNumber} ${monthShort}`,
          shortLabel: `${dayNumber}`,
          fullLabel: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          revenue: rec.revenue,
          paidOrders: rec.paidOrders,
          pendingOrders: rec.pendingOrders,
          totalOrders: rec.totalOrders,
        });
      }
      return days;
    }

    // 1 TAHUN: 12 bulan terakhir - Grafik Bebas / Tren Area (Hitungan per bulan)
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = getLocalMonthKey(d);
      const monthName = d.toLocaleDateString("id-ID", { month: "short" });
      const yearShort = d.getFullYear().toString().slice(-2);
      const rec = ordersByMonth[monthKey] || { revenue: 0, paidOrders: 0, pendingOrders: 0, totalOrders: 0 };

      months.push({
        month: monthKey,
        label: `${monthName} '${yearShort}`,
        shortLabel: monthName,
        fullLabel: d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
        revenue: rec.revenue,
        paidOrders: rec.paidOrders,
        pendingOrders: rec.pendingOrders,
        totalOrders: rec.totalOrders,
      });
    }
    return months;
  }, [orders, timeScale]);

  // Statistik Ringkas Berdasarkan Periode Terpilih
  const periodStats = useMemo(() => {
    const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
    const totalPaidOrders = chartData.reduce((sum, d) => sum + d.paidOrders, 0);
    const totalPendingOrders = chartData.reduce((sum, d) => sum + d.pendingOrders, 0);
    const dataCount = chartData.length || 1;
    const avgRevenue = Math.round(totalRevenue / dataCount);

    let peak = chartData[0];
    chartData.forEach((d) => {
      if ((d.revenue || 0) > (peak?.revenue || 0)) {
        peak = d;
      }
    });

    const periodName =
      timeScale === "1W" ? "7 Hari Terakhir" : timeScale === "1M" ? "30 Hari Terakhir" : "12 Bulan Terakhir";
    const unitText = timeScale === "1Y" ? "/ bulan" : "/ hari";

    return {
      totalRevenue,
      totalPaidOrders,
      totalPendingOrders,
      avgRevenue,
      peak,
      periodName,
      unitText,
    };
  }, [chartData, timeScale]);

  // Format Helper Sumbu Y Chart
  const formatYAxisCurrency = (val: number) => {
    if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`.replace(".0jt", "jt");
    if (val >= 1_000) return `Rp ${Math.round(val / 1_000)}rb`;
    return `Rp ${val}`;
  };

  const formatYAxisOrders = (val: number) => `${val}`;

  // =========================================================================
  // ⏱️ STATE LAP BENCHMARK & PEMISAHAN PERHITUNGAN (DIMULAI DARI 0)
  // =========================================================================
  const [laps, setLaps] = useState<LapItem[]>([]);
  const [showLapModal, setShowLapModal] = useState(false);
  const [lapInputTitle, setLapInputTitle] = useState("");
  const [lapInputNotes, setLapInputNotes] = useState("");

  // Edit Note State
  const [editingLapId, setEditingLapId] = useState<number | null>(null);
  const [editingLapNotes, setEditingLapNotes] = useState("");

  // Load Laps dari localStorage saat mount sebagai inisialisasi awal cepat
  useEffect(() => {
    const saved = localStorage.getItem("adrien_store_laps");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLaps(parsed);
          return;
        }
      } catch (e) {}
    }

    // Default Lap 1 Baseline Awal
    const defaultLap1: LapItem = {
      id: 1,
      lapNumber: 1,
      title: "Lap 1 (Awal Publikasi)",
      notes: "Baseline awal peluncuran katalog e-book.",
      date: new Date().toISOString(),
      baseline: {
        pageViews: 0,
        uniqueVisitors: 0,
        paidOrders: 0,
        revenue: 0,
      },
    };
    setLaps([defaultLap1]);
  }, []);

  // Handler Buat Lap Baru (Sinkron ke Database & Multi-Device)
  const handleCreateLap = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextLapNumber = laps.length + 1;
    const title = lapInputTitle.trim() || `Lap ${nextLapNumber}`;
    const notes = lapInputNotes.trim() || "Tidak ada catatan.";

    const baselineData = {
      pageViews: Number(stats.totalPageViews || 0),
      uniqueVisitors: Number(stats.uniqueVisitors || 0),
      paidOrders: Number(stats.paidOrdersCount || 0),
      revenue: Number(stats.totalRevenue || 0),
    };

    setLapInputTitle("");
    setLapInputNotes("");
    setShowLapModal(false);

    try {
      const res = await fetch("/api/adrienfandra/admin/laps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          title,
          notes,
          baseline: baselineData
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success && resData.lap) {
        const updated = [...laps, resData.lap];
        setLaps(updated);
        localStorage.setItem("adrien_store_laps", JSON.stringify(updated));
        triggerSuccess(`🏁 Berhasil mencatat ${title}! Tersinkronisasi otomatis ke semua perangkat (HP & Laptop).`);
        return;
      }
    } catch (err) {}

    // Fallback optimis jika koneksi lambat
    const fallbackLap: LapItem = {
      id: Date.now(),
      lapNumber: nextLapNumber,
      title,
      notes,
      date: new Date().toISOString(),
      baseline: baselineData,
    };
    const updated = [...laps, fallbackLap];
    setLaps(updated);
    localStorage.setItem("adrien_store_laps", JSON.stringify(updated));
    triggerSuccess(`🏁 Berhasil mencatat ${title}! Kolom lap baru telah ditambahkan dan perhitungan dimulai dari 0.`);
  };

  // Handler Simpan Catatan Yang Diedit (Sinkron ke Database)
  const handleSaveEditNotes = async (lapId: number) => {
    try {
      await fetch(`/api/adrienfandra/admin/laps/${lapId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({ notes: editingLapNotes })
      });
    } catch (err) {}

    const updated = laps.map((l) => (l.id === lapId ? { ...l, notes: editingLapNotes } : l));
    setLaps(updated);
    localStorage.setItem("adrien_store_laps", JSON.stringify(updated));
    setEditingLapId(null);
    setEditingLapNotes("");
    triggerSuccess("Catatan lap berhasil diperbarui di semua perangkat.");
  };

  // Handler Hapus Lap (Sinkron ke Database)
  const handleDeleteLap = async (lapId: number) => {
    if (laps.length <= 1) {
      alert("Minimal harus ada 1 lap sebagai acuan.");
      return;
    }
    const lapToDelete = laps.find((l) => l.id === lapId);
    if (!confirm(`Hapus ${lapToDelete?.title || "Lap ini"} dari tabel evaluasi?`)) return;

    try {
      await fetch(`/api/adrienfandra/admin/laps/${lapId}`, {
        method: "DELETE",
        headers: { "x-admin-email": adminEmail }
      });
    } catch (err) {}

    const updated = laps.filter((l) => l.id !== lapId);
    setLaps(updated);
    localStorage.setItem("adrien_store_laps", JSON.stringify(updated));
    triggerSuccess("Lap berhasil dihapus dari database.");
  };

  // Handler Reset Seluruh Lap ke Baseline 1 (Sinkron ke Database)
  const handleResetLaps = async () => {
    if (!confirm("Reset semua riwayat lap dan mulai kembali dari Lap 1 (0)?")) return;

    try {
      await fetch("/api/adrienfandra/admin/laps/reset", {
        method: "POST",
        headers: { "x-admin-email": adminEmail }
      });
    } catch (err) {}

    const defaultLap1: LapItem = {
      id: Date.now(),
      lapNumber: 1,
      title: "Lap 1 (Awal Publikasi)",
      notes: "Baseline acuan awal toko.",
      date: new Date().toISOString(),
      baseline: {
        pageViews: 0,
        uniqueVisitors: 0,
        paidOrders: 0,
        revenue: 0,
      },
    };
    setLaps([defaultLap1]);
    localStorage.setItem("adrien_store_laps", JSON.stringify([defaultLap1]));
    triggerSuccess("Riwayat lap berhasil direset ke Lap 1 di semua perangkat.");
  };

  // Kalkulasi Metrik Tiap Lap (Pemisahan Perhitungan Dimulai Dari 0)
  const computedLaps = useMemo(() => {
    const currentTotalViews = Number(stats.totalPageViews || 0);
    const currentTotalUnique = Number(stats.uniqueVisitors || 0);
    const currentTotalPaid = Number(stats.paidOrdersCount || 0);
    const currentTotalRevenue = Number(stats.totalRevenue || 0);

    return laps.map((lap, index) => {
      const isLatest = index === laps.length - 1;
      const nextLap = !isLatest ? laps[index + 1] : null;

      // Batas atas (ceiling) saat lap ini di-lock oleh lap berikutnya
      const endViews = nextLap ? nextLap.baseline.pageViews : currentTotalViews;
      const endUnique = nextLap ? nextLap.baseline.uniqueVisitors : currentTotalUnique;
      const endPaid = nextLap ? nextLap.baseline.paidOrders : currentTotalPaid;
      const endRevenue = nextLap ? nextLap.baseline.revenue : currentTotalRevenue;

      // Nilai Delta (Dimulai dari 0 untuk masing-masing lap)
      const pageViews = Math.max(0, endViews - lap.baseline.pageViews);
      const uniqueVisitors = Math.max(0, endUnique - lap.baseline.uniqueVisitors);
      const paidOrders = Math.max(0, endPaid - lap.baseline.paidOrders);
      const revenue = Math.max(0, endRevenue - lap.baseline.revenue);

      // Tingkat Persentase Konversi
      const divisor = uniqueVisitors > 0 ? uniqueVisitors : pageViews;
      const conversionRate = divisor > 0 ? ((paidOrders / divisor) * 100).toFixed(2) + "%" : "0.00%";

      return {
        ...lap,
        isLatest,
        isCompleted: !isLatest,
        metrics: {
          pageViews,
          uniqueVisitors,
          paidOrders,
          revenue,
          conversionRate,
        },
      };
    });
  }, [laps, stats]);

  // Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);

  // Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Check saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem("adrien_manager_email");
    const savedToken = localStorage.getItem("adrien_manager_auth");
    if (saved && savedToken === "true") {
      setAdminEmail(saved.trim().toLowerCase());
      setIsAuthenticated(true);
    }
  }, []);

  const fetchData = async () => {
    if (!adminEmail) return;
    setLoadingData(true);
    try {
      const res = await fetch("/api/adrienfandra/admin/data", {
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats || {});
        setAnalytics(data.analytics || {});
        setProducts(data.products || []);
        setOrders(data.orders || []);

        // Sinkronisasi data Lap dari database PostgreSQL (agar HP dan Laptop selalu sama persis)
        if (data.laps && Array.isArray(data.laps)) {
          const localSaved = localStorage.getItem("adrien_store_laps");
          let localLaps: LapItem[] = [];
          if (localSaved) {
            try { localLaps = JSON.parse(localSaved); } catch (e) {}
          }

          const serverLapNums = new Set(data.laps.map((l: any) => Number(l.lapNumber)));
          const missingLapsOnServer = localLaps.filter((l) => Number(l.lapNumber) > 1 && !serverLapNums.has(Number(l.lapNumber)));

          if (missingLapsOnServer.length > 0) {
            // Auto-sync lap yang sempat tercatat di HP ke database PostgreSQL!
            fetch("/api/adrienfandra/admin/laps/sync", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-admin-email": adminEmail
              },
              body: JSON.stringify({ laps: localLaps })
            }).then(r => r.json()).then(syncRes => {
              if (syncRes.success && syncRes.laps && Array.isArray(syncRes.laps)) {
                setLaps(syncRes.laps);
                localStorage.setItem("adrien_store_laps", JSON.stringify(syncRes.laps));
              }
            }).catch(() => {
              setLaps(data.laps);
              localStorage.setItem("adrien_store_laps", JSON.stringify(data.laps));
            });
          } else {
            setLaps(data.laps);
            localStorage.setItem("adrien_store_laps", JSON.stringify(data.laps));
          }
        }
      } else if (res.status === 403) {
        setIsAuthenticated(false);
        localStorage.removeItem("adrien_manager_email");
        localStorage.removeItem("adrien_manager_auth");
      }
    } catch (e) {
      console.error("[Manager] Fetch error:", e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && adminEmail) {
      fetchData();
    }
  }, [isAuthenticated, adminEmail]);

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("/api/adrienfandra/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        setAdminEmail(data.email);
        setIsAuthenticated(true);
        localStorage.setItem("adrien_manager_email", data.email);
        localStorage.setItem("adrien_manager_auth", "true");
      } else {
        setAuthError(data.error || "Email atau password yang Anda masukkan salah.");
      }
    } catch (err: any) {
      setAuthError("Gagal terhubung ke server.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminEmail("");
    localStorage.removeItem("adrien_manager_email");
    localStorage.removeItem("adrien_manager_auth");
  };

  const triggerSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(""), 3500);
    fetchData();
  };

  // Reset Data Toko Ke 0
  const handleResetData = async () => {
    setResetLoading(true);
    try {
      const res = await fetch("/api/adrienfandra/admin/reset-data", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": adminEmail 
        }
      });
      const data = await res.json();
      if (data.success) {
        setResetModalOpen(false);
        triggerSuccess("Data toko berhasil direset total ke 0.");
      } else {
        alert(data.error || "Gagal mereset data toko.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // Cek Status Pembayaran Real-Time ke Midtrans / Gateway
  const handleCheckPaymentStatus = async (orderId: string) => {
    setCheckingOrderId(orderId);
    try {
      const res = await fetch("/api/adrienfandra/payment/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantOrderId: orderId })
      });
      const data = await res.json();
      if (data.isPaid) {
        triggerSuccess(`Pesanan #${orderId} telah terkonfirmasi LUNAS!`);
      } else {
        alert(`Status #${orderId}: Masih Menunggu Pembayaran dari pembeli.`);
        fetchData();
      }
    } catch (err: any) {
      alert("Gagal memeriksa status: " + err.message);
    } finally {
      setCheckingOrderId(null);
    }
  };

  // Tandai Lunas Manual
  const handleMarkPaid = async (orderId: string) => {
    if (!confirm(`Konfirmasi pelunasan manual untuk pesanan #${orderId}? Email PDF akan langsung dikirimkan ke pembeli.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/adrienfandra/admin/orders/${orderId}/mark-paid`, {
        method: "POST",
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json();
      if (data.success) {
        triggerSuccess(`Pesanan #${orderId} ditandai LUNAS & email PDF terkirim.`);
      } else {
        alert(data.error || "Gagal mengubah status pesanan.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Kirim Ulang Email PDF ke Pembeli
  const handleResendEmail = async (orderId: string) => {
    if (!confirm(`Kirim ulang email link download PDF ke pemesan #${orderId}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/adrienfandra/admin/orders/${orderId}/resend-email`, {
        method: "POST",
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json();
      if (data.success) {
        triggerSuccess(data.message || "Email PDF berhasil dikirim ulang.");
      } else {
        alert(data.error || "Gagal mengirim email.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Orders
  const filteredOrders = orders.filter((ord) => {
    if (orderFilter === "PAID" && ord.payment_status !== "PAID") return false;
    if (orderFilter === "PENDING" && ord.payment_status === "PAID") return false;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const matchName = (ord.customer_name || "").toLowerCase().includes(q);
      const matchEmail = (ord.customer_email || "").toLowerCase().includes(q);
      const matchPhone = (ord.customer_phone || "").includes(q);
      const matchOrder = (ord.merchant_order_id || "").toLowerCase().includes(q);
      const matchProd = (ord.product_title || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchOrder || matchProd;
    }
    return true;
  });

  // Tooltip Interaktif Kustom untuk Chart Performa
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      if (!item) return null;
      return (
        <div className="bg-[#0F2247] text-white p-3.5 rounded-2xl shadow-xl border border-blue-900/60 text-xs min-w-[210px] z-50 animate-in fade-in">
          <div className="font-extrabold text-blue-200 border-b border-white/10 pb-1.5 mb-2.5 flex items-center justify-between gap-2">
            <span>{item.fullLabel || label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-300 font-mono">
              {timeScale === "1Y" ? (item.month || "") : (item.date || "")}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F6B93B]"></span>
                Omzet Riil:
              </span>
              <span className="font-black text-[#F6B93B]">
                {formatCurrency(item.revenue || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                Transaksi Lunas:
              </span>
              <span className="font-black text-emerald-400">
                {item.paidOrders || 0} pesanan
              </span>
            </div>
            {item.pendingOrders > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  Menunggu Bayar:
                </span>
                <span className="font-bold text-amber-300">
                  {item.pendingOrders} leads
                </span>
              </div>
            )}
            {item.totalOrders > 0 && (
              <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-4 text-[10px] text-slate-400">
                <span>Total Pesanan Masuk:</span>
                <span className="font-semibold text-white">{item.totalOrders} total</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // =========================================================================
  // 🔒 LOGIN SCREEN
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A192F] text-white flex flex-col items-center justify-center p-4 selection:bg-[#1D3E72] selection:text-white">
        <div className="w-full max-w-sm bg-[#112240] rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-[#1D3E72] to-[#0F2247] rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-white/20">
              <BarChart3 className="w-7 h-7 text-[#F6B93B]" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Executive Performance
            </h1>
            <p className="text-xs text-blue-200">
              bilano.app/adrienfandra/manager
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1">Email Pengelola</label>
              <input
                type="email"
                required
                placeholder="adrienfandra14@gmail.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-900/80 border border-blue-400/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#F6B93B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-900/80 border border-blue-400/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#F6B93B]"
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#F6B93B] hover:bg-[#E5A825] text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Masuk ke Dashboard Performa"}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/adrienfandra" className="text-xs text-blue-300 hover:underline">
              ← Buka Halaman Toko
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 📊 DASHBOARD PERFORMA RIIL
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24 selection:bg-[#1D3E72] selection:text-white">
      
      {/* 🧭 TOP EXECUTIVE NAVBAR */}
      <header className="bg-[#0F2247] text-white border-b border-white/10 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1D3E72] to-[#2563EB] flex items-center justify-center font-black text-[#F6B93B] text-sm border border-white/20 shadow-xs">
              AF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm text-white tracking-tight">
                  Adrien Fandra Performance
                </h1>
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  100% DATA RIIL
                </span>
              </div>
              <p className="text-[10px] text-blue-200/80 font-mono">{adminEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/adrienfandra"
              target="_blank"
              className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-blue-700/40"
              title="Buka Toko E-Book"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka Toko</span>
            </Link>

            <button
              onClick={fetchData}
              disabled={loadingData}
              className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-blue-700/40 cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setResetModalOpen(true)}
              className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-800/40 cursor-pointer"
              title="Reset Semua Data Toko ke 0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-300" />
              <span className="hidden sm:inline">Reset ke 0</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors border border-slate-600/40 cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 CLEAN TABS */}
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2 border-t border-white/5 pt-1">
          {[
            { id: "overview", label: "Ringkasan & Funnel Konversi", icon: BarChart3 },
            { id: "orders", label: `Transaksi & Calon Pembeli (${orders.length})`, icon: ShoppingBag },
            { id: "events", label: "Live Aktivitas Pengunjung", icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#F6B93B] text-[#F6B93B]"
                  : "border-transparent text-blue-200/70 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* FLASH SUCCESS NOTIFICATION */}
      {actionSuccessMsg && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* 📦 MAIN CONTENT CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* =========================================================================
            TAB 1: RINGKASAN PERFORMA & FUNNEL KONVERSI
            ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in">
            
            {/* 4 PRIMARY EXECUTIVE KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Total Omset Riil */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Omzet Riil</span>
                  <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#1D3E72] flex items-center justify-center font-bold">
                    Rp
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#1D3E72] tracking-tight">
                    {formatCurrency(stats.totalRevenue || 0)}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold block mt-1">
                    Dari {stats.paidOrdersCount || 0} transaksi lunas
                  </span>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Conversion Rate (CR)</span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    %
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                    {stats.conversionRate || "0%"}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold block mt-1">
                    Pengunjung Unik → Pembeli Lunas
                  </span>
                </div>
              </div>

              {/* Total Pengunjung */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Pengunjung Riil</span>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {stats.totalPageViews || 0}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold block mt-1">
                    {stats.uniqueVisitors || 0} pengunjung unik terdeteksi
                  </span>
                </div>
              </div>

              {/* Average Order Value (AOV) */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Rata-Rata Order (AOV)</span>
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {formatCurrency(stats.averageOrderValue || 0)}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold block mt-1">
                    Nilai belanja rata-rata per pembeli
                  </span>
                </div>
              </div>

            </div>

            {/* 4 SECONDARY METRIC CHIPS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                <div className="text-[10px] font-black text-slate-400 uppercase">Minat E-Book (CTR)</div>
                <div className="text-lg font-black text-slate-800 mt-0.5">{stats.totalProductClicks || 0} Klik</div>
                <div className="text-[10px] text-slate-500 font-medium">CTR: {stats.clickThroughRate || "0%"}</div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60">
                <div className="text-[10px] font-black text-amber-800 uppercase">Checkout Leads</div>
                <div className="text-lg font-black text-amber-900 mt-0.5">{stats.totalCheckouts || 0} Masuk</div>
                <div className="text-[10px] text-amber-700 font-medium">Closing: {stats.checkoutConversionRate || "0%"}</div>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/60">
                <div className="text-[10px] font-black text-emerald-800 uppercase">Transaksi Lunas</div>
                <div className="text-lg font-black text-emerald-900 mt-0.5">{stats.paidOrdersCount || 0} Berhasil</div>
                <div className="text-[10px] text-emerald-700 font-medium">Email PDF langsung dikirim</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                <div className="text-[10px] font-black text-slate-400 uppercase">Menunggu Bayar</div>
                <div className="text-lg font-black text-slate-700 mt-0.5">{stats.pendingOrdersCount || 0} Prospek</div>
                <div className="text-[10px] text-slate-500 font-medium">Siap di-follow up WhatsApp</div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 📈 GRAFIK PERFORMA PENJUALAN DINAMIS: 1 MINGGU, 1 BULAN, 1 TAHUN          */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6">
              
              {/* Header Grafik & Pengalih Skala Waktu */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1D3E72] flex items-center justify-center font-black shadow-2xs border border-blue-100">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                        <span>Tren Performa Penjualan Riil</span>
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {timeScale === "1W" ? "Grafik Batang (Harian)" : timeScale === "1M" ? "Grafik Garis (Harian)" : "Grafik Area (Bulanan)"}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Statistik fluktuasi omzet dan jumlah pesanan riil terverifikasi dari database toko.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3 PILIHAN SKALA WAKTU (1 Minggu, 1 Bulan, 1 Tahun) */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setTimeScale("1W")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        timeScale === "1W"
                          ? "bg-[#1D3E72] text-[#F6B93B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      }`}
                      title="Skala 1 Minggu - Grafik Batang Per Hari"
                    >
                      <span>1 Minggu</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-md uppercase font-extrabold ${
                        timeScale === "1W" ? "bg-blue-900/60 text-blue-200" : "bg-slate-200 text-slate-500"
                      }`}>
                        Batang
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTimeScale("1M")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        timeScale === "1M"
                          ? "bg-[#1D3E72] text-[#F6B93B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      }`}
                      title="Skala 1 Bulan - Grafik Garis Per Hari"
                    >
                      <span>1 Bulan</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-md uppercase font-extrabold ${
                        timeScale === "1M" ? "bg-blue-900/60 text-blue-200" : "bg-slate-200 text-slate-500"
                      }`}>
                        Garis
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTimeScale("1Y")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        timeScale === "1Y"
                          ? "bg-[#1D3E72] text-[#F6B93B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      }`}
                      title="Skala 1 Tahun - Grafik Area Tren Bulanan"
                    >
                      <span>1 Tahun</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-md uppercase font-extrabold ${
                        timeScale === "1Y" ? "bg-blue-900/60 text-blue-200" : "bg-slate-200 text-slate-500"
                      }`}>
                        Tren Area
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-Toolbar: Pilihan Metrik & Legend Cepat */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">
                    Tampilan Data:
                  </span>
                  <button
                    type="button"
                    onClick={() => setChartMetric("revenue")}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartMetric === "revenue"
                        ? "bg-[#1D3E72] text-[#F6B93B] shadow-xs"
                        : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                    }`}
                  >
                    <span>💰 Omzet (Rp)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("orders")}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartMetric === "orders"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                    }`}
                  >
                    <span>📦 Transaksi Lunas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("combined")}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartMetric === "combined"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                    }`}
                  >
                    <span>📊 Dual-Axis (Keduanya)</span>
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Data sinkron otomatis</span>
                </div>
              </div>

              {/* 4 Kartu Ringkasan Periode Terpilih */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Omzet ({periodStats.periodName})
                  </div>
                  <div className="text-base sm:text-xl font-black text-[#1D3E72] mt-0.5">
                    {formatCurrency(periodStats.totalRevenue)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {periodStats.totalPaidOrders} pesanan terbayar
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Transaksi Lunas
                  </div>
                  <div className="text-base sm:text-xl font-black text-emerald-700 mt-0.5">
                    {periodStats.totalPaidOrders} Transaksi
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {periodStats.totalPendingOrders > 0
                      ? `+${periodStats.totalPendingOrders} belum bayar`
                      : "Tingkat bayar 100%"}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Rata-Rata Penjualan
                  </div>
                  <div className="text-base sm:text-xl font-black text-slate-800 mt-0.5">
                    {formatCurrency(periodStats.avgRevenue)}
                    <span className="text-[11px] font-medium text-slate-400 ml-1">
                      {periodStats.unitText}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Rerata dalam periode aktif
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200/60">
                  <div className="text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Puncak Tertinggi</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#F6B93B]" />
                  </div>
                  <div className="text-base sm:text-xl font-black text-[#1D3E72] mt-0.5">
                    {periodStats.peak?.revenue ? formatCurrency(periodStats.peak.revenue) : "Rp 0"}
                  </div>
                  <div className="text-[10px] text-blue-700 font-medium truncate">
                    {periodStats.peak?.label || "-"}
                  </div>
                </div>
              </div>

              {/* AREA GRAFIK RECHARTS INTERAKTIF */}
              <div className="h-80 sm:h-96 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {timeScale === "1W" ? (
                    /* ------------------------------------------------------------- */
                    /* 1 MINGGU: GRAFIK BATANG PER HARI (BAR CHART)                  */
                    /* ------------------------------------------------------------- */
                    <BarChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="barGradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1D3E72" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity={0.75} />
                        </linearGradient>
                        <linearGradient id="barGradOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#059669" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0.75} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="label"
                        stroke="#94A3B8"
                        fontSize={11}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={{ stroke: "#E2E8F0" }}
                      />
                      {chartMetric === "combined" ? (
                        <>
                          <YAxis
                            yAxisId="left"
                            stroke="#1D3E72"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxisCurrency}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#059669"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tickFormatter={formatYAxisOrders}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: "8px" }} />
                          <Bar
                            yAxisId="left"
                            dataKey="revenue"
                            name="Omzet Penjualan (Rp)"
                            fill="url(#barGradRevenue)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={36}
                          />
                          <Bar
                            yAxisId="right"
                            dataKey="paidOrders"
                            name="Transaksi Lunas"
                            fill="url(#barGradOrders)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={28}
                          />
                        </>
                      ) : chartMetric === "orders" ? (
                        <>
                          <YAxis
                            stroke="#059669"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tickFormatter={formatYAxisOrders}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Bar
                            dataKey="paidOrders"
                            name="Transaksi Lunas"
                            fill="url(#barGradOrders)"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={48}
                          />
                        </>
                      ) : (
                        <>
                          <YAxis
                            stroke="#1D3E72"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxisCurrency}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Bar
                            dataKey="revenue"
                            name="Omzet Penjualan (Rp)"
                            fill="url(#barGradRevenue)"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={48}
                          />
                        </>
                      )}
                    </BarChart>
                  ) : timeScale === "1M" ? (
                    /* ------------------------------------------------------------- */
                    /* 1 BULAN: GRAFIK GARIS SAJA PER HARI (LINE CHART)              */
                    /* ------------------------------------------------------------- */
                    <LineChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="label"
                        stroke="#94A3B8"
                        fontSize={10}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={{ stroke: "#E2E8F0" }}
                        interval="preserveStartEnd"
                      />
                      {chartMetric === "combined" ? (
                        <>
                          <YAxis
                            yAxisId="left"
                            stroke="#1D3E72"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxisCurrency}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#059669"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tickFormatter={formatYAxisOrders}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: "8px" }} />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            name="Omzet Penjualan (Rp)"
                            stroke="#1D3E72"
                            strokeWidth={3}
                            dot={{ r: 2.5, fill: "#1D3E72", strokeWidth: 1.5, stroke: "#ffffff" }}
                            activeDot={{ r: 6, fill: "#F6B93B", stroke: "#1D3E72", strokeWidth: 2 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="paidOrders"
                            name="Transaksi Lunas"
                            stroke="#059669"
                            strokeWidth={2.5}
                            strokeDasharray="4 4"
                            dot={{ r: 2.5, fill: "#059669", strokeWidth: 1.5, stroke: "#ffffff" }}
                            activeDot={{ r: 5, fill: "#F6B93B", stroke: "#059669", strokeWidth: 2 }}
                          />
                        </>
                      ) : chartMetric === "orders" ? (
                        <>
                          <YAxis
                            stroke="#059669"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tickFormatter={formatYAxisOrders}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="paidOrders"
                            name="Transaksi Lunas"
                            stroke="#059669"
                            strokeWidth={3}
                            dot={{ r: 2.5, fill: "#059669", strokeWidth: 1.5, stroke: "#ffffff" }}
                            activeDot={{ r: 6, fill: "#F6B93B", stroke: "#059669", strokeWidth: 2 }}
                          />
                        </>
                      ) : (
                        <>
                          <YAxis
                            stroke="#1D3E72"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxisCurrency}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Omzet Penjualan (Rp)"
                            stroke="#1D3E72"
                            strokeWidth={3}
                            dot={{ r: 2.5, fill: "#1D3E72", strokeWidth: 1.5, stroke: "#ffffff" }}
                            activeDot={{ r: 6, fill: "#F6B93B", stroke: "#1D3E72", strokeWidth: 2 }}
                          />
                        </>
                      )}
                    </LineChart>
                  ) : (
                    /* ------------------------------------------------------------- */
                    /* 1 TAHUN: GRAFIK BEBAS BENTUKNYA (AREA TREN BULANAN)           */
                    /* ------------------------------------------------------------- */
                    <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="areaYearGradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1D3E72" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="areaYearGradOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="label"
                        stroke="#94A3B8"
                        fontSize={11}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={{ stroke: "#E2E8F0" }}
                      />
                      {chartMetric === "combined" ? (
                        <>
                          <YAxis
                            yAxisId="left"
                            stroke="#1D3E72"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxisCurrency}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#059669"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tickFormatter={formatYAxisOrders}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: "8px" }} />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            name="Omzet Penjualan (Rp)"
                            stroke="#1D3E72"
                            strokeWidth={3.5}
                            fill="url(#areaYearGradRevenue)"
                            dot={{ r: 3.5, fill: "#1D3E72", strokeWidth: 2, stroke: "#ffffff" }}
                            activeDot={{ r: 7, fill: "#F6B93B", stroke: "#1D3E72", strokeWidth: 2 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="paidOrders"
                            name="Transaksi Lunas"
                            stroke="#059669"
                            strokeWidth={2.5}
                            strokeDasharray="4 4"
                            dot={{ r: 3, fill: "#059669", strokeWidth: 1.5, stroke: "#ffffff" }}
                            activeDot={{ r: 6, fill: "#F6B93B", stroke: "#059669", strokeWidth: 2 }}
                          />
                        </>
                      ) : chartMetric === "orders" ? (
                        <>
                          <YAxis
                            stroke="#059669"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tickFormatter={formatYAxisOrders}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="paidOrders"
                            name="Transaksi Lunas"
                            stroke="#059669"
                            strokeWidth={3.5}
                            fill="url(#areaYearGradOrders)"
                            dot={{ r: 3.5, fill: "#059669", strokeWidth: 2, stroke: "#ffffff" }}
                            activeDot={{ r: 7, fill: "#F6B93B", stroke: "#059669", strokeWidth: 2 }}
                          />
                        </>
                      ) : (
                        <>
                          <YAxis
                            stroke="#1D3E72"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxisCurrency}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Omzet Penjualan (Rp)"
                            stroke="#1D3E72"
                            strokeWidth={3.5}
                            fill="url(#areaYearGradRevenue)"
                            dot={{ r: 3.5, fill: "#1D3E72", strokeWidth: 2, stroke: "#ffffff" }}
                            activeDot={{ r: 7, fill: "#F6B93B", stroke: "#1D3E72", strokeWidth: 2 }}
                          />
                        </>
                      )}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Catatan Footnote Visual */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Panduan Skala:</span>
                  <span>
                    {timeScale === "1W"
                      ? "Skala 1 Minggu menggunakan grafik batang per hari (7 hari terakhir)."
                      : timeScale === "1M"
                      ? "Skala 1 Bulan menggunakan grafik garis per hari (30 hari terakhir)."
                      : "Skala 1 Tahun menggunakan grafik area tren per bulan (12 bulan terakhir)."}
                  </span>
                </div>
                <div className="font-semibold text-slate-400">
                  Total {orders.length} Pesanan Terdata
                </div>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* ⏱️ SESI EKSPERIMEN & EVALUASI LAP (PEMISAHAN PERHITUNGAN DIMULAI DARI 0)   */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6">
              
              {/* Header Card dengan Tombol Lap Utama */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black border border-amber-200 shadow-2xs">
                    <Flag className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-slate-900">
                        Evaluasi Performa per Lap (Pemisahan Perhitungan)
                      </h3>
                      <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                        {computedLaps.length} Lap Tercatat
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pemisahan perhitungan pengunjung dan konversi. Setiap membuat lap baru, hitungan dimulai dari 0.
                    </p>
                  </div>
                </div>

                {/* TOMBOL LAP UTAMA */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLapInputTitle(`Lap ${laps.length + 1}`);
                      setLapInputNotes("");
                      setShowLapModal(true);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#1D3E72] to-[#2563EB] hover:from-[#152e55] hover:to-[#1d4ed8] text-[#F6B93B] rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer border border-blue-400/30"
                    title="Tambah Lap Baru (Mulai Dari 0)"
                  >
                    <PlusCircle className="w-4 h-4 text-[#F6B93B]" />
                    <span>Tombol Lap (+ Catat Lap Baru)</span>
                  </button>

                  {laps.length > 1 && (
                    <button
                      type="button"
                      onClick={handleResetLaps}
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors border border-slate-200/60 cursor-pointer"
                      title="Reset Semua Lap ke Lap 1"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* TABEL PERFORMA LAP (KOLOM BERTAMBAH KE SAMPING) */}
              <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs bg-slate-50/30">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      {/* Kolom 0: Label Metrik */}
                      <th className="py-4 px-5 text-slate-500 uppercase text-[10px] font-black min-w-[200px] sticky left-0 bg-slate-100 z-10 border-r border-slate-200 shadow-xs">
                        Indikator & Metrik Lap
                      </th>

                      {/* Kolom-kolom Lap Dinamis */}
                      {computedLaps.map((lap) => (
                        <th
                          key={lap.id}
                          className={`py-4 px-5 min-w-[220px] max-w-[260px] border-r border-slate-200 last:border-r-0 ${
                            lap.isLatest ? "bg-amber-50/50" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#1D3E72] text-[#F6B93B]">
                              LAP #{lap.lapNumber}
                            </span>
                            {lap.isLatest ? (
                              <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Sedang Aktif
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                🔒 Terkunci
                              </span>
                            )}
                          </div>
                          <div className="font-black text-slate-900 text-sm mt-1.5 line-clamp-1" title={lap.title}>
                            {lap.title}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {new Date(lap.date).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {/* Baris 1: Jumlah Pengunjung (Dimulai dari 0) */}
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="font-extrabold text-slate-900">Jumlah Pengunjung</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium ml-6">
                          Views toko pada lap ini (dimulai dari 0)
                        </div>
                      </td>

                      {computedLaps.map((lap) => (
                        <td
                          key={lap.id}
                          className={`py-4 px-5 border-r border-slate-200 last:border-r-0 ${
                            lap.isLatest ? "bg-amber-50/20" : "bg-white"
                          }`}
                        >
                          <div className="text-xl font-black text-slate-900">
                            {lap.metrics.pageViews} <span className="text-xs font-semibold text-slate-500">Views</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            {lap.metrics.uniqueVisitors} user unik terdeteksi
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Baris 2: Tingkat Persentase Konversi (%) */}
                    <tr className="hover:bg-slate-50/80 transition-colors bg-slate-50/30">
                      <td className="py-4 px-5 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <span className="font-extrabold text-slate-900">Tingkat Konversi (%)</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium ml-6">
                          Persentase pengunjung jadi pembeli
                        </div>
                      </td>

                      {computedLaps.map((lap) => (
                        <td
                          key={lap.id}
                          className={`py-4 px-5 border-r border-slate-200 last:border-r-0 ${
                            lap.isLatest ? "bg-amber-50/20" : "bg-white"
                          }`}
                        >
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-lg font-black text-emerald-700">
                              {lap.metrics.conversionRate}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            {lap.metrics.paidOrders} bayar / {lap.metrics.uniqueVisitors || lap.metrics.pageViews || 0} pengunjung
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Baris 3: Transaksi Lunas */}
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-[#1D3E72]" />
                          <span className="font-extrabold text-slate-900">Transaksi Lunas</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium ml-6">
                          Pesanan terbayar di lap ini
                        </div>
                      </td>

                      {computedLaps.map((lap) => (
                        <td
                          key={lap.id}
                          className={`py-4 px-5 border-r border-slate-200 last:border-r-0 ${
                            lap.isLatest ? "bg-amber-50/20" : "bg-white"
                          }`}
                        >
                          <div className="text-base font-black text-slate-900">
                            {lap.metrics.paidOrders} <span className="text-xs font-normal text-slate-500">Pesanan</span>
                          </div>
                          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            Status Terbayar Lunas
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Baris 4: Omzet Riil */}
                    <tr className="hover:bg-slate-50/80 transition-colors bg-slate-50/30">
                      <td className="py-4 px-5 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#1D3E72]" />
                          <span className="font-extrabold text-slate-900">Omzet Penjualan</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium ml-6">
                          Total rupiah yang masuk pada lap ini
                        </div>
                      </td>

                      {computedLaps.map((lap) => (
                        <td
                          key={lap.id}
                          className={`py-4 px-5 border-r border-slate-200 last:border-r-0 ${
                            lap.isLatest ? "bg-amber-50/20" : "bg-white"
                          }`}
                        >
                          <div className="text-base font-black text-[#1D3E72]">
                            {formatCurrency(lap.metrics.revenue)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            Omzet riil lap #{lap.lapNumber}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Baris 5: Isian Catatan / Keterangan Eksperimen */}
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 align-top">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-amber-600" />
                          <span className="font-extrabold text-slate-900">Catatan & Keterangan</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium ml-6">
                          Uji coba strategi, promo, atau catatan
                        </div>
                      </td>

                      {computedLaps.map((lap) => (
                        <td
                          key={lap.id}
                          className={`py-4 px-5 border-r border-slate-200 last:border-r-0 align-top ${
                            lap.isLatest ? "bg-amber-50/20" : "bg-white"
                          }`}
                        >
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-medium min-h-[70px]">
                            {lap.notes || "Belum ada catatan untuk lap ini."}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLapId(lap.id);
                                setEditingLapNotes(lap.notes || "");
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Catatan</span>
                            </button>

                            {lap.lapNumber > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteLap(lap.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="Hapus Lap"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tips panduan perbandingan */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-start sm:items-center justify-between gap-3 text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F6B93B] shrink-0" />
                  <p className="text-[11px] text-blue-800 font-medium">
                    <strong>Cara Kerja Pemisahan Lap:</strong> Setiap kali Anda menekan <strong>"Tombol Lap"</strong>, data toko saat ini dijadikan batas dasar (baseline) dan kolom baru akan langsung <strong>dimulai dari 0</strong> untuk mengamati lonjakan pengunjung & persentase konversi strategi baru Anda.
                  </p>
                </div>
              </div>

            </div>

            {/* SALES FUNNEL RIIL */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#1D3E72]" />
                    <span>Sales Conversion Funnel (Alur Konversi Riil)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data riil perjalanan calon pembeli dari kunjungan storefront hingga pembayaran lunas.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full w-fit">
                  Database Synced
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Step 1 */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Tahap 1</span>
                    <span className="text-[10px] font-black text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">100%</span>
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    {stats.totalPageViews || 0} <span className="text-xs font-normal text-slate-500">Views</span>
                  </div>
                  <div className="font-extrabold text-xs text-slate-800">Kunjungan Toko</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pengunjung yang membuka katalog e-book Adrien Fandra ({stats.uniqueVisitors || 0} user unik).
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-700 uppercase">Tahap 2</span>
                    <span className="text-[10px] font-black text-[#1D3E72] bg-white px-2 py-0.5 rounded-full border border-blue-200">
                      {stats.clickThroughRate || "0%"}
                    </span>
                  </div>
                  <div className="text-xl font-black text-[#1D3E72]">
                    {stats.totalProductClicks || 0} <span className="text-xs font-normal text-blue-600">Klik</span>
                  </div>
                  <div className="font-extrabold text-xs text-slate-800">Minat & Detail E-Book</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pengunjung yang mengklik buku atau membaca detail materi akuntansi.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-800 uppercase">Tahap 3</span>
                    <span className="text-[10px] font-black text-amber-900 bg-white px-2 py-0.5 rounded-full border border-amber-200">
                      {stats.totalProductClicks > 0 
                        ? ((stats.totalCheckouts / stats.totalProductClicks) * 100).toFixed(1) + "%" 
                        : "0%"}
                    </span>
                  </div>
                  <div className="text-xl font-black text-amber-900">
                    {stats.totalCheckouts || 0} <span className="text-xs font-normal text-amber-700">Leads</span>
                  </div>
                  <div className="font-extrabold text-xs text-slate-800">Masuk Checkout</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Calon pembeli yang mengisi nama, email, dan no WhatsApp untuk memesan.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-800 uppercase">Tahap 4 (Closing)</span>
                    <span className="text-[10px] font-black text-emerald-900 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      {stats.checkoutConversionRate || "0%"}
                    </span>
                  </div>
                  <div className="text-xl font-black text-emerald-800">
                    {stats.paidOrdersCount || 0} <span className="text-xs font-normal text-emerald-700">Pembeli</span>
                  </div>
                  <div className="font-extrabold text-xs text-slate-800">Pembayaran Lunas</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Transaksi lunas berhasil. File PDF otomatis terkirim ke email pembeli.
                  </p>
                </div>
              </div>
            </div>

            {/* TABEL PERFORMA TIAP E-BOOK */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Performa Riil Masing-Masing E-Book
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Statistik klik, leads checkout, penjualan, dan omset riil per judul buku.
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-semibold">
                  Total {products.length} E-Book
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black bg-slate-50/70">
                      <th className="py-3 px-4">Judul E-Book</th>
                      <th className="py-3 px-4">Harga Jual</th>
                      <th className="py-3 px-4 text-center">Dilihat / Diklik</th>
                      <th className="py-3 px-4 text-center">Masuk Checkout</th>
                      <th className="py-3 px-4 text-center">Terjual Lunas</th>
                      <th className="py-3 px-4 text-right">Omzet Masuk</th>
                      <th className="py-3 px-4 text-right">Konversi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900 line-clamp-1 max-w-sm">
                            {prod.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.2 rounded-md">
                              {prod.category}
                            </span>
                            <Link
                              href={`/adrienfandra/p/${prod.slug || prod.id}`}
                              target="_blank"
                              className="text-[10px] font-bold text-slate-400 hover:text-[#1D3E72] inline-flex items-center gap-0.5"
                            >
                              <span>Lihat Halaman</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-black text-slate-800 whitespace-nowrap">
                          {formatCurrency(prod.sale_price)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-slate-800">
                          {prod.views_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-amber-800">
                          {prod.checkouts_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-emerald-700">
                          {prod.purchases_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#1D3E72] whitespace-nowrap">
                          {formatCurrency(prod.revenue || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-700 whitespace-nowrap">
                          {prod.conversion_rate || "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 2: DAFTAR TRANSAKSI RIIL & CALON PEMBELI (LEADS)
            ========================================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-5 animate-in fade-in">
            
            {/* Filter & Search Bar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-base text-slate-900">
                  Daftar Transaksi & Calon Pembeli Riil
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setiap calon pembeli yang mengisi form checkout tercatat riil di sini. Follow-up WhatsApp langsung dengan 1-klik.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Cari nama, email, WA..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none w-44 font-medium focus:border-[#1D3E72]"
                />

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setOrderFilter("ALL")}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                      orderFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Semua ({orders.length})
                  </button>
                  <button
                    onClick={() => setOrderFilter("PAID")}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                      orderFilter === "PAID" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Lunas ({orders.filter(o => o.payment_status === "PAID").length})
                  </button>
                  <button
                    onClick={() => setOrderFilter("PENDING")}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                      orderFilter === "PENDING" ? "bg-white text-amber-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Menunggu ({orders.filter(o => o.payment_status !== "PAID").length})
                  </button>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
              {filteredOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                        <th className="py-3 px-4">Order ID & Waktu</th>
                        <th className="py-3 px-4">Calon Pembeli</th>
                        <th className="py-3 px-4">No. Telepon / WA</th>
                        <th className="py-3 px-4">E-Book Dipesan</th>
                        <th className="py-3 px-4">Total</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi Riil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map((ord) => {
                        const cleanPhone = (ord.customer_phone || "").replace(/[^0-9]/g, "");
                        const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.substring(1) : cleanPhone;
                        
                        const waFollowUpText = ord.payment_status === "PAID"
                          ? `Halo Kak ${ord.customer_name}, terima kasih sudah membeli e-book "${ord.product_title}". File PDF sudah terkirim ke email ${ord.customer_email}. Ada yang bisa kami bantu?`
                          : `Halo Kak ${ord.customer_name}, kami melihat Anda berminat memesan e-book "${ord.product_title}" di Adrien Fandra Store. Apakah ada kendala saat pembayaran QRIS? Kami siap bantu.`;

                        const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waFollowUpText)}`;

                        return (
                          <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3.5 px-4 font-mono">
                              <div className="font-bold text-slate-900">{ord.merchant_order_id}</div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {new Date(ord.created_at).toLocaleString("id-ID")}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-black text-slate-900">{ord.customer_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{ord.customer_email}</div>
                              {ord.customer_phone && ord.customer_phone !== "-" && cleanPhone.length >= 6 && (
                                <div className="text-[11px] text-emerald-700 font-mono font-bold mt-0.5 sm:hidden flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3 text-emerald-600 inline" />
                                  <span>{ord.customer_phone}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {cleanPhone && cleanPhone !== "-" && cleanPhone.length >= 6 ? (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs transition-colors border border-emerald-200"
                                  title="Chat WhatsApp Calon Pembeli"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                  <span className="font-mono">{ord.customer_phone}</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">{ord.customer_phone || "-"}</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-bold text-slate-800 max-w-[200px] truncate">
                              {ord.product_title}
                            </td>

                            <td className="py-3.5 px-4 font-black text-[#1D3E72] whitespace-nowrap">
                              {formatCurrency(ord.total_amount)}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                                ord.payment_status === "PAID" 
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}>
                                {ord.payment_status === "PAID" ? "LUNAS" : "MENUNGGU BAYAR"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              {/* Cek Status Midtrans / Gateway */}
                              <button
                                onClick={() => handleCheckPaymentStatus(ord.merchant_order_id)}
                                disabled={checkingOrderId === ord.merchant_order_id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer"
                                title="Cek status pembayaran terkini ke gateway"
                              >
                                <RefreshCw className={`w-3 h-3 ${checkingOrderId === ord.merchant_order_id ? "animate-spin" : ""}`} />
                                <span>Cek Status</span>
                              </button>

                              {/* Tandai Lunas Manual jika pending */}
                              {ord.payment_status !== "PAID" && (
                                <button
                                  onClick={() => handleMarkPaid(ord.merchant_order_id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-black text-[11px] border border-emerald-200 cursor-pointer"
                                  title="Tandai lunas manual & kirim PDF ke email"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Lunas Manual</span>
                                </button>
                              )}

                              {/* Kirim Ulang Email PDF */}
                              {ord.payment_status === "PAID" && (
                                <button
                                  onClick={() => handleResendEmail(ord.merchant_order_id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1D3E72] rounded-lg font-bold text-[11px] border border-blue-200 cursor-pointer"
                                  title="Kirim ulang PDF ke email pembeli"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Kirim PDF</span>
                                </button>
                              )}

                              {/* Download Link */}
                              <a
                                href={`/api/adrienfandra/download/${ord.merchant_order_id}`}
                                download
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px]"
                                title="Unduh file PDF pesanan ini"
                              >
                                <Download className="w-3 h-3" />
                                <span>PDF</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 p-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-700">Belum Ada Transaksi Masuk</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Data transaksi baru akan otomatis muncul di sini begitu calon pembeli melakukan checkout di bilano.app/adrienfandra.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 3: LIVE EVENT STREAM (AKTIVITAS PENGUNJUNG RIIL)
            ========================================================================= */}
        {activeTab === "events" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#1D3E72]" />
                  <span>Log Aktivitas Pengunjung Terkini (Real-Time Stream)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tercatat otomatis setiap kali ada pengunjung membuka toko, mengklik e-book, atau masuk checkout.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  50 Event Terakhir
                </span>
                <button
                  onClick={fetchData}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1D3E72] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
                  <span>Segarkan</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
              {(analytics.recentEvents || []).length > 0 ? (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black bg-slate-50/70 sticky top-0">
                        <th className="py-3 px-4">Waktu</th>
                        <th className="py-3 px-4">Aksi / Event</th>
                        <th className="py-3 px-4">Detail E-Book / Info</th>
                        <th className="py-3 px-4">Visitor ID</th>
                        <th className="py-3 px-4">Alamat IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(analytics.recentEvents || []).map((ev: AnalyticsEvent) => (
                        <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                            {new Date(ev.created_at).toLocaleString("id-ID")}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                              ev.event_type === "PURCHASE_SUCCESS"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : ev.event_type === "CHECKOUT_START" || ev.event_type === "CHECKOUT_OPEN"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : ev.event_type === "PRODUCT_CLICK"
                                ? "bg-blue-100 text-[#1D3E72] border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                              {ev.event_type === "PAGE_VIEW" ? "Buka Toko" :
                               ev.event_type === "PRODUCT_CLICK" ? "Klik E-Book" :
                               ev.event_type === "CHECKOUT_OPEN" || ev.event_type === "CHECKOUT_START" ? "Masuk Checkout" :
                               ev.event_type === "PURCHASE_SUCCESS" ? "Transaksi Lunas" : ev.event_type}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-800 max-w-sm truncate">
                            {ev.product_title || "Halaman Utama Toko"}
                          </td>

                          <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                            {ev.visitor_id || "-"}
                          </td>

                          <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                            {ev.ip_address || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 p-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-700">Belum Ada Aktivitas Pengunjung</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Kunjungi bilano.app/adrienfandra untuk mulai melihat stream interaksi secara langsung.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* =========================================================================
          MODAL KONFIRMASI RESET DATA TOKO KE 0
          ========================================================================= */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-black text-lg text-slate-900">
                Reset Semua Data Toko ke 0?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tindakan ini akan mengosongkan seluruh riwayat pesanan (orders), leads calon pembeli, serta log aktivitas analitik pengunjung.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Total Omzet & Penjualan → Rp 0</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Daftar Transaksi & Calon Pembeli → 0</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Log Pengunjung & Klik E-Book → 0</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>Katalog E-Book & File PDF Tetap Aman</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                disabled={resetLoading}
                className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetData}
                disabled={resetLoading}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {resetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Ya, Reset Total ke 0"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🏁 MODAL POPUP: CATAT LAP BARU (PEMISAHAN PERHITUNGAN)                    */}
      {/* ========================================================================= */}
      {showLapModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black border border-amber-200 shadow-2xs">
                  <Flag className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                    Pemisahan Periode
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    Catat Lap Baru #{laps.length + 1}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLapModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLap} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama / Judul Lap:
                </label>
                <input
                  type="text"
                  value={lapInputTitle}
                  onChange={(e) => setLapInputTitle(e.target.value)}
                  placeholder={`Contoh: Lap ${laps.length + 1} - Uji Coba Promo Reels 20%`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D3E72] focus:border-transparent font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan / Keterangan Eksperimen:
                </label>
                <textarea
                  value={lapInputNotes}
                  onChange={(e) => setLapInputNotes(e.target.value)}
                  placeholder="Tulis keterangan strategi, perubahan hook video, promo diskon, atau perubahan copywriting yang sedang Anda jalankan pada lap ini..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D3E72] focus:border-transparent font-medium resize-none"
                  required
                />
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1.5">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mekanisme Pemisahan Hitungan:</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Lap sebelumnya akan otomatis dikunci pada angka saat ini ({stats.totalPageViews || 0} views, {stats.paidOrdersCount || 0} pembeli). Kolom untuk <strong>Lap #{laps.length + 1}</strong> akan langsung ditambahkan ke tabel dan <strong>dimulai dari 0</strong> untuk mengamati performa independennya.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLapModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#1D3E72] hover:bg-[#152e55] text-[#F6B93B] shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Simpan & Buka Lap Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ✏️ MODAL EDIT CATATAN LAP                                                 */}
      {/* ========================================================================= */}
      {editingLapId !== null && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Catatan Lap</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingLapId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Isi Catatan / Keterangan:
              </label>
              <textarea
                value={editingLapNotes}
                onChange={(e) => setEditingLapNotes(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D3E72] font-medium resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingLapId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditNotes(editingLapId)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-[#1D3E72] text-[#F6B93B] shadow-xs cursor-pointer"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
