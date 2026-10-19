import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  BarChart3, TrendingUp, Users, ShoppingBag, 
  Activity, RefreshCw, LogOut, ExternalLink, 
  MessageCircle, CheckCircle2, Clock, AlertCircle, 
  Send, Download, Lock, Check, ChevronRight, AlertTriangle,
  RotateCcw, Eye, ArrowUpRight
} from "lucide-react";
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
                        <th className="py-3 px-4">WhatsApp (Follow-up)</th>
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
                            </td>

                            <td className="py-3.5 px-4">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs transition-colors border border-emerald-200"
                                title="Chat WhatsApp Calon Pembeli"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{ord.customer_phone}</span>
                              </a>
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

    </div>
  );
}
