import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Plus, Trash2, Edit3, Image, Upload, FileText, 
  CheckCircle2, AlertCircle, RefreshCw, LogOut, Lock, 
  DollarSign, ShoppingBag, Tag, ExternalLink, Eye, Send, Download,
  Users, Activity, TrendingUp, MousePointerClick, MessageCircle,
  HelpCircle, BarChart3, Check, Clock, ChevronRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ManagerDashboard() {
  const [, setLocation] = useLocation();

  // Auth State
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "header_slots" | "products" | "orders" | "vouchers" | "settings">("overview");

  // Filter Pesanan State
  const [orderFilter, setOrderFilter] = useState<"ALL" | "PAID" | "PENDING">("ALL");

  // Data State
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [stats, setStats] = useState<any>({ 
    totalPageViews: 0,
    uniqueVisitors: 0,
    totalProductClicks: 0,
    totalCheckouts: 0,
    paidOrdersCount: 0, 
    totalRevenue: 0, 
    conversionRate: "0%",
    checkoutConversionRate: "0%"
  });
  const [analytics, setAnalytics] = useState<any>({
    recentEvents: [],
    productStats: []
  });
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    store_name: "Adrien Fandra Store",
    header_title: "AdrienFandra.id",
    header_subtitle: "Adrien Fandra | Tips & Praktik Akuntansi Bisnis",
    header_hook: "siap bantu lo semua untuk jago akuntansi & kuasai laporan keuangan tanpa ribet",
    header_image: "",
    header_badge: "Book Now",
    slot_images: ["", "", ""],
    whatsapp_number: "+6289688113210",
    support_email: "adrienfandra14@gmail.com"
  });

  // Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  // Check saved session
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
        setVouchers(data.vouchers || []);
        if (data.settings) setSettings(data.settings);
      } else if (res.status === 403) {
        setIsAuthenticated(false);
        localStorage.removeItem("adrien_manager_email");
        localStorage.removeItem("adrien_manager_auth");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && adminEmail) {
      fetchData();
    }
  }, [isAuthenticated, adminEmail]);

  // Login dengan Email & Password 'Adrien1401'
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

  // Simpan Pengaturan Header & 3 Slot Gambar
  const handleSaveHeaderAndSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/adrienfandra/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-email": adminEmail },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        triggerSuccess("Pengaturan Header & Ruang Gambar berhasil disimpan.");
      } else {
        alert(data.error || "Gagal menyimpan perubahan.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Upload Slot Image
  const handleSlotImageUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      const currentSlots = Array.isArray(settings.slot_images) ? [...settings.slot_images] : ["", "", ""];
      currentSlots[index] = b64;
      setSettings({ ...settings, slot_images: currentSlots });
    };
    reader.readAsDataURL(file);
  };

  const removeSlotImage = (index: number) => {
    const currentSlots = Array.isArray(settings.slot_images) ? [...settings.slot_images] : ["", "", ""];
    currentSlots[index] = "";
    setSettings({ ...settings, slot_images: currentSlots });
  };

  // Upload Header Background Image
  const handleHeaderImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSettings({ ...settings, header_image: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/adrienfandra/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-email": adminEmail },
        body: JSON.stringify(editingProduct)
      });
      const data = await res.json();
      if (data.success) {
        setProductModalOpen(false);
        triggerSuccess("E-Book berhasil disimpan.");
      } else {
        alert(data.error || "Gagal menyimpan e-book.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Yakin ingin menghapus e-book ini?")) return;
    try {
      const res = await fetch(`/api/adrienfandra/admin/products/${id}`, {
        method: "DELETE",
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json();
      if (data.success) triggerSuccess("E-Book berhasil dihapus.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Resend Email PDF to Customer
  const handleResendEmail = async (orderId: string) => {
    if (!confirm(`Kirim ulang email PDF ke pemesan #${orderId}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/adrienfandra/admin/orders/${orderId}/resend-email`, {
        method: "POST",
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json();
      if (data.success) triggerSuccess(data.message);
      else alert(data.error || "Gagal mengirim email.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Paid Manually
  const handleMarkPaid = async (orderId: string) => {
    if (!confirm(`Tandai pesanan #${orderId} LUNAS dan kirimkan email PDF?`)) return;
    try {
      const res = await fetch(`/api/adrienfandra/admin/orders/${orderId}/mark-paid`, {
        method: "POST",
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json();
      if (data.success) triggerSuccess("Pesanan ditandai LUNAS & PDF dikirim.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Upload Helpers for Product
  const handleCoverUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setEditingProduct((prev: any) => ({ ...prev, cover_url: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handlePdfUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setEditingProduct((prev: any) => ({
        ...prev,
        pdf_filename: file.name,
        pdf_data_base64: e.target?.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddPromoImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setEditingProduct((prev: any) => ({
        ...prev,
        promo_images: [...(prev.promo_images || []), b64]
      }));
    };
    reader.readAsDataURL(file);
  };

  // Filtered Orders List
  const filteredOrders = orders.filter(ord => {
    if (orderFilter === "PAID") return ord.payment_status === "PAID";
    if (orderFilter === "PENDING") return ord.payment_status !== "PAID";
    return true;
  });

  // =========================================================================
  // 🔒 SCREEN LOGIN KHUSUS ADMIN
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F2247] text-white flex flex-col items-center justify-center p-4 selection:bg-[#1D3E72] selection:text-white">
        <div className="w-full max-w-sm bg-[#1D3E72]/85 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-[#1D3E72] to-[#0F2247] rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-white/20">
              <Lock className="w-7 h-7 text-[#F6B93B]" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Manager Login
            </h1>
            <p className="text-xs text-blue-200">
              Kelola E-Book, Analitik Real-Time & Penjualan
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
                className="w-full bg-slate-900/60 border border-blue-400/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#F6B93B]"
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
                className="w-full bg-slate-900/60 border border-blue-400/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#F6B93B]"
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
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Masuk ke Manager"}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/adrienfandra" className="text-xs text-blue-300 hover:underline">
              ← Kembali ke Toko E-Book
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const slotImages = Array.isArray(settings.slot_images) ? settings.slot_images : ["", "", ""];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20 selection:bg-[#1D3E72] selection:text-white">
      
      {/* 🧭 TOP NAVBAR MANAGER */}
      <header className="bg-[#0F2247] text-white border-b border-white/10 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1D3E72] flex items-center justify-center font-black text-[#F6B93B] text-sm border border-white/10">
              AF
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-2">
                <span>Adrien Fandra Manager</span>
                <span className="text-[9px] font-black uppercase text-[#F6B93B] bg-blue-900/80 px-2 py-0.5 rounded-full border border-blue-700/50">
                  REAL-TIME
                </span>
              </h1>
              <p className="text-[10px] text-blue-200">{adminEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/adrienfandra"
              target="_blank"
              className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-blue-700/40"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka Toko</span>
            </Link>

            <button
              onClick={fetchData}
              disabled={loadingData}
              className="p-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-100 rounded-xl text-xs transition-colors border border-blue-700/40"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-200 rounded-xl text-xs transition-colors border border-rose-800/40"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-white/5 pt-1">
          {[
            { id: "overview", label: "Ringkasan", icon: BarChart3 },
            { id: "analytics", label: "Analitik Real-Time", icon: TrendingUp },
            { id: "header_slots", label: "Header & Ruang Gambar", icon: Image },
            { id: "products", label: "Kelola E-Book & PDF", icon: FileText },
            { id: "orders", label: "Pesanan & Calon Pembeli", icon: ShoppingBag },
            { id: "vouchers", label: "Kupon Diskon", icon: Tag },
            { id: "settings", label: "Pengaturan & Kontak", icon: Lock }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-3.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#F6B93B] text-[#F6B93B]"
                  : "border-transparent text-blue-200 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* FLASH SUCCESS MESSAGE */}
      {actionSuccessMsg && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-[#1D3E72] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-[#1D3E72] flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* 📦 MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* =========================================================================
            TAB 1: OVERVIEW (RINGKASAN CEPAT)
            ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in">
            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Omset (Lunas)</span>
                <div className="text-xl sm:text-2xl font-black text-[#1D3E72]">
                  {formatCurrency(stats.totalRevenue || 0)}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold block">Dari {stats.paidOrdersCount || 0} pembelian berhasil</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Pengunjung Toko</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {stats.totalPageViews || 0}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold block">{stats.uniqueVisitors || 0} Pengunjung Unik</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Klik Detail E-Book</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {stats.totalProductClicks || 0}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold block">Interaksi pembaca pada buku</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Checkout & Leads</span>
                <div className="text-xl sm:text-2xl font-black text-[#1D3E72]">
                  {stats.totalCheckouts || 0}
                </div>
                <span className="text-[10px] text-[#1D3E72] font-bold block">Konversi: {stats.conversionRate || "0%"}</span>
              </div>
            </div>

            {/* Quick Funnel Summary */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Alur Konversi Pembeli (Sales Funnel)</h3>
                  <p className="text-xs text-slate-500">Data riil perjalanan calon pembeli dari buka toko hingga transaksi lunas.</p>
                </div>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className="text-xs font-bold text-[#1D3E72] hover:underline flex items-center gap-1"
                >
                  <span>Lihat Detail Analitik</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">1. Buka Toko</span>
                  <div className="text-lg font-black text-slate-900">{stats.totalPageViews || 0} View</div>
                  <span className="text-[10px] text-slate-500 font-semibold">{stats.uniqueVisitors || 0} User Unik</span>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                  <span className="text-[10px] font-black uppercase text-[#1D3E72] block">2. Klik E-Book</span>
                  <div className="text-lg font-black text-[#1D3E72]">{stats.totalProductClicks || 0} Klik</div>
                  <span className="text-[10px] text-slate-500 font-semibold">Minat membaca isi</span>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-800 block">3. Masuk Checkout</span>
                  <div className="text-lg font-black text-amber-900">{stats.totalCheckouts || 0} Leads</div>
                  <span className="text-[10px] text-slate-500 font-semibold">Mengisi form nama & WA</span>
                </div>

                <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-[#1D3E72] block">4. Pembayaran Lunas</span>
                  <div className="text-lg font-black text-[#1D3E72]">{stats.paidOrdersCount || 0} Pembeli</div>
                  <span className="text-[10px] text-[#1D3E72] font-black">{stats.conversionRate || "0%"} Konversi</span>
                </div>
              </div>
            </div>

            {/* Stream Pesanan & Calon Pembeli Terbaru */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Calon Pembeli & Pesanan Masuk</h3>
                  <p className="text-xs text-slate-500">Daftar calon pembeli yang mengisi data checkout.</p>
                </div>
                <button onClick={() => setActiveTab("orders")} className="text-xs text-[#1D3E72] font-bold hover:underline">
                  Semua Pesanan & Leads →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Pembeli</th>
                      <th className="py-2.5 px-3">WhatsApp</th>
                      <th className="py-2.5 px-3">Produk</th>
                      <th className="py-2.5 px-3">Total</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.slice(0, 8).map((ord) => {
                      const cleanPhone = (ord.customer_phone || "").replace(/[^0-9]/g, "");
                      const waLink = `https://wa.me/${cleanPhone.startsWith("0") ? "62" + cleanPhone.substring(1) : cleanPhone}?text=Halo%20Kak%20${encodeURIComponent(ord.customer_name)}%2C%20terkait%20pesanan%20e-book%20${encodeURIComponent(ord.product_title)}%20di%20AdrienFandra.id...`;

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">{ord.merchant_order_id}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{ord.customer_name}</div>
                            <div className="text-[11px] text-slate-400">{ord.customer_email}</div>
                          </td>
                          <td className="py-3 px-3">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#1D3E72] hover:underline font-bold"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#1D3E72]" />
                              <span>{ord.customer_phone}</span>
                            </a>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700 max-w-[180px] truncate">{ord.product_title}</td>
                          <td className="py-3 px-3 font-black text-[#1D3E72]">{formatCurrency(ord.total_amount)}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                              ord.payment_status === "PAID" 
                                ? "bg-blue-100 text-[#1D3E72] border border-blue-200" 
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}>
                              {ord.payment_status === "PAID" ? "LUNAS" : "MENUNGGU BAYAR"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: ANALITIK REAL-TIME LENGKAP
            ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header Analitik */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="font-black text-base text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#1D3E72]" />
                  <span>Analitik Real-Time Pengunjung & Penjualan</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Data otomatis tercatat setiap kali pengunjung membuka halaman toko, mengklik e-book, atau melakukan checkout.
                </p>
              </div>

              <button
                onClick={fetchData}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#1D3E72] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
                <span>Segarkan Data</span>
              </button>
            </div>

            {/* Performa Tiap E-Book (Table Breakdown) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-slate-800">
                Performa Klik & Penjualan Masing-Masing E-Book
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black bg-slate-50/70">
                      <th className="py-3 px-4">E-Book</th>
                      <th className="py-3 px-4">Harga</th>
                      <th className="py-3 px-4 text-center">Total Dilihat / Diklik</th>
                      <th className="py-3 px-4 text-center">Masuk Checkout</th>
                      <th className="py-3 px-4 text-center">Berhasil Beli (Lunas)</th>
                      <th className="py-3 px-4 text-right">Total Omset</th>
                      <th className="py-3 px-4 text-right">Konversi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 line-clamp-1 max-w-xs">{p.title}</div>
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold uppercase">{p.category}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{formatCurrency(p.sale_price)}</td>
                        <td className="py-3.5 px-4 text-center font-black text-slate-800">
                          {p.views_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-amber-800">
                          {p.checkouts_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-[#1D3E72]">
                          {p.purchases_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#1D3E72]">
                          {formatCurrency(p.revenue || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-blue-700">
                          {p.conversion_rate || "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Activity Feed (Log Aktivitas Pengunjung Terkini) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800">
                  Log Aktivitas Pengunjung Terkini (Real-Time Stream)
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">50 Aktivitas Terakhir</span>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black bg-slate-50/50 sticky top-0">
                      <th className="py-2.5 px-3">Waktu</th>
                      <th className="py-2.5 px-3">Aksi / Event</th>
                      <th className="py-2.5 px-3">E-Book / Info</th>
                      <th className="py-2.5 px-3">Visitor ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(analytics.recentEvents || []).map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(ev.created_at).toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${
                            ev.event_type === "PURCHASE_SUCCESS"
                              ? "bg-blue-100 text-[#1D3E72]"
                              : ev.event_type === "CHECKOUT_START"
                              ? "bg-amber-100 text-amber-800"
                              : ev.event_type === "PRODUCT_CLICK"
                              ? "bg-blue-50 text-[#1D3E72]"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {ev.event_type === "PAGE_VIEW" ? "Buka Toko" :
                             ev.event_type === "PRODUCT_CLICK" ? "Klik E-Book" :
                             ev.event_type === "CHECKOUT_START" ? "Masuk Checkout" :
                             ev.event_type === "PURCHASE_SUCCESS" ? "Lunas" : ev.event_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-xs truncate">
                          {ev.product_title || "Halaman Beranda Toko"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                          {ev.visitor_id || "-"}
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
            TAB 3: HEADER BANNER & 3 GAMBAR KE BAWAH
            ========================================================================= */}
        {activeTab === "header_slots" && (
          <div className="space-y-6 animate-in fade-in">
            <form onSubmit={handleSaveHeaderAndSlots} className="space-y-6">
              
              {/* 1. EDITOR HEADER HERO ATAS */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div>
                  <h2 className="font-black text-base text-slate-800">1. Editor Header Hero Paling Atas</h2>
                  <p className="text-xs text-slate-500">
                    Atur judul logo brand, nama profesi, hook copywriting, teks tombol bulat, dan background banner hero.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Judul / Logo Brand</label>
                    <input
                      type="text"
                      value={settings.header_title || ""}
                      onChange={(e) => setSettings({ ...settings, header_title: e.target.value })}
                      placeholder="AdrienFandra.id"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subtitle / Profesi</label>
                    <input
                      type="text"
                      value={settings.header_subtitle || ""}
                      onChange={(e) => setSettings({ ...settings, header_subtitle: e.target.value })}
                      placeholder="Adrien Fandra | Praktisi & Konsultan Akuntansi"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs outline-none font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Hook Kalimat Header</label>
                    <textarea
                      rows={2}
                      value={settings.header_hook || ""}
                      onChange={(e) => setSettings({ ...settings, header_hook: e.target.value })}
                      placeholder="siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Teks Badge Bulat Kanan Bawah</label>
                    <input
                      type="text"
                      value={settings.header_badge || ""}
                      onChange={(e) => setSettings({ ...settings, header_badge: e.target.value })}
                      placeholder="Book Now"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Upload Gambar Background Header</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleHeaderImageUpload(e.target.files[0])}
                      className="text-[11px] text-slate-500 mb-1"
                    />
                    <input
                      type="text"
                      placeholder="Atau masukkan URL gambar..."
                      value={settings.header_image || ""}
                      onChange={(e) => setSettings({ ...settings, header_image: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. 3 RUANG GAMBAR KE BAWAH */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div>
                  <h2 className="font-black text-base text-slate-800">2. Tiga Ruang Gambar Horizontal (Urutan Ke Bawah)</h2>
                  <p className="text-xs text-slate-500">
                    Upload gambar untuk Gambar 1 (atas), Gambar 2 (tengah), dan Gambar 3 (bawah). Jika dikosongkan, di storefront akan tampil ruang bersih.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {[0, 1, 2].map((idx) => {
                    const img = slotImages[idx];
                    return (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800 text-xs">
                            Gambar #{idx + 1} {idx === 0 ? "(Paling Atas)" : idx === 1 ? "(Urutan Kedua)" : "(Urutan Ketiga)"}
                          </span>
                          {img && (
                            <button
                              type="button"
                              onClick={() => removeSlotImage(idx)}
                              className="text-xs font-bold text-rose-600 hover:underline"
                            >
                              Kosongkan Gambar Ini
                            </button>
                          )}
                        </div>

                        {img ? (
                          <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300 bg-white">
                            <img src={img} alt={`Slot ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full h-24 bg-white border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 font-semibold text-xs">
                            Ruang Gambar #{idx + 1} Masih Kosong
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleSlotImageUpload(idx, e.target.files[0])}
                            className="text-[11px] text-slate-500 flex-1"
                          />
                          <input
                            type="text"
                            placeholder="Atau tempel URL gambar..."
                            value={img || ""}
                            onChange={(e) => {
                              const newSlots = [...slotImages];
                              newSlots[idx] = e.target.value;
                              setSettings({ ...settings, slot_images: newSlots });
                            }}
                            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs outline-none flex-1"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-[#1D3E72] hover:bg-[#0F2247] text-white font-bold text-xs py-4 rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                {actionLoading ? "Menyimpan..." : "Simpan Header & 3 Ruang Gambar"}
              </button>

            </form>
          </div>
        )}

        {/* =========================================================================
            TAB 4: KELOLA E-BOOK & PDF
            ========================================================================= */}
        {activeTab === "products" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200">
              <div>
                <h2 className="font-black text-base text-slate-800">Katalog Produk E-Book</h2>
                <p className="text-xs text-slate-500">
                  Kelola cover buku, harga promo, harga coret, slide foto tambahan, dan file PDF asli.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct({
                    title: "",
                    subtitle: "",
                    category: "BUNDLING 4 IN 1 AKUNTANSI",
                    cover_url: "",
                    promo_images: [],
                    regular_price: 145000,
                    sale_price: 99000,
                    sales_headline: "",
                    sales_body: "",
                    highlights: [
                      "Paham debit & kredit serta susun jurnal umum tanpa bingung",
                      "Bisa susun Laporan Laba Rugi & Neraca dalam hitungan menit",
                      "Deteksi kebocoran uang kas & operasional bisnis sejak dini",
                      "Template spreadsheet & studi kasus riil siap contek langsung pakai"
                    ],
                    testimonials: [],
                    scarcity_text: "Ingat Paket ini TERBATAS - Hanya Untuk 10 Orang",
                    reader_count: 4000,
                    whatsapp_number: "+6289688113210",
                    pdf_filename: "Ebook_Akuntansi.pdf",
                    is_active: true,
                    sort_order: products.length + 1
                  });
                  setProductModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#1D3E72] hover:bg-[#0F2247] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah E-Book Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-28 bg-gradient-to-br from-[#1D3E72] to-[#0F2247] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-white border border-slate-200">
                      {prod.cover_url ? (
                        <img src={prod.cover_url} alt={prod.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-center px-1">PDF COVER</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#1D3E72] bg-blue-50 px-2 py-0.5 rounded-md">
                        {prod.category}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                        {prod.title}
                      </h3>
                      
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-base font-black text-[#1D3E72]">
                          {formatCurrency(prod.sale_price)}
                        </span>
                        {prod.regular_price > prod.sale_price && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatCurrency(prod.regular_price)}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-500 font-semibold pt-0.5 flex items-center gap-2">
                        <span>👁️ {prod.views_count || 0} views</span>
                        <span>•</span>
                        <span className="text-[#1D3E72] font-bold">🛒 {prod.purchases_count || 0} terjual</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/adrienfandra/p/${prod.slug || prod.id}`}
                      target="_blank"
                      className="text-xs font-bold text-[#1D3E72] hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingProduct({ ...prod });
                          setProductModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-[#1D3E72] hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: PESANAN & CALON PEMBELI (LEADS)
            ========================================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="font-black text-base text-slate-800">Daftar Transaksi & Calon Pembeli</h2>
                <p className="text-xs text-slate-500">
                  Data semua pembeli yang masuk checkout, follow up langsung via WhatsApp, kirim ulang PDF atau verifikasi manual.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setOrderFilter("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    orderFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semua ({orders.length})
                </button>
                <button
                  onClick={() => setOrderFilter("PAID")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    orderFilter === "PAID" ? "bg-white text-[#1D3E72] shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Lunas ({orders.filter(o => o.payment_status === "PAID").length})
                </button>
                <button
                  onClick={() => setOrderFilter("PENDING")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    orderFilter === "PENDING" ? "bg-white text-amber-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Menunggu ({orders.filter(o => o.payment_status !== "PAID").length})
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Pembeli & Email</th>
                      <th className="py-3 px-4">WhatsApp (Follow-up)</th>
                      <th className="py-3 px-4">Produk</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((ord) => {
                      const cleanPhone = (ord.customer_phone || "").replace(/[^0-9]/g, "");
                      const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.substring(1) : cleanPhone;
                      
                      const waFollowUpText = ord.payment_status === "PAID"
                        ? `Halo Kak ${ord.customer_name}, terima kasih sudah membeli e-book "${ord.product_title}". File PDF sudah terkirim ke email Anda. Ada yang bisa kami bantu?`
                        : `Halo Kak ${ord.customer_name}, kami melihat Anda berminat memesan e-book "${ord.product_title}" di AdrienFandra.id. Apakah ada kendala saat pembayaran? Kami siap bantu.`;

                      const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waFollowUpText)}`;

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            <div>{ord.merchant_order_id}</div>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {new Date(ord.created_at).toLocaleDateString("id-ID")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{ord.customer_name}</div>
                            <div className="text-[11px] text-slate-500">{ord.customer_email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1D3E72] rounded-lg font-bold text-xs transition-colors border border-blue-200"
                              title="Chat WhatsApp Calon Pembeli"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#1D3E72]" />
                              <span>{ord.customer_phone}</span>
                            </a>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700 max-w-[180px] truncate">{ord.product_title}</td>
                          <td className="py-3.5 px-4 font-black text-[#1D3E72]">{formatCurrency(ord.total_amount)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                              ord.payment_status === "PAID" 
                                ? "bg-blue-100 text-[#1D3E72] border border-blue-200" 
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}>
                              {ord.payment_status === "PAID" ? "LUNAS" : "MENUNGGU BAYAR"}
                            </span>
                            {ord.payment_status !== "PAID" && (
                              <button
                                onClick={() => handleMarkPaid(ord.merchant_order_id)}
                                className="block text-[10px] text-[#1D3E72] hover:underline font-bold mt-1 cursor-pointer"
                              >
                                Tandai Lunas Manual
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleResendEmail(ord.merchant_order_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1D3E72] rounded-lg font-bold text-[11px] cursor-pointer"
                              title="Kirim ulang PDF ke email pembeli"
                            >
                              <Send className="w-3 h-3" />
                              <span>Kirim PDF</span>
                            </button>
                            <a
                              href={`/api/adrienfandra/download/${ord.merchant_order_id}`}
                              download
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px]"
                            >
                              <Download className="w-3 h-3" />
                              <span>Unduh</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: KUPON DISKON
            ========================================================================= */}
        {activeTab === "vouchers" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
              <div>
                <h2 className="font-black text-base text-slate-800">Kupon Diskon Toko</h2>
                <p className="text-xs text-slate-500">Buat kode promo diskon untuk meningkatkan konversi checkout.</p>
              </div>

              <button
                onClick={() => setVoucherModalOpen(true)}
                className="bg-[#1D3E72] hover:bg-[#0F2247] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                + Buat Kupon
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {vouchers.map((v) => (
                <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-[#1D3E72] bg-blue-50 px-2 py-0.5 rounded-md uppercase border border-blue-200">
                      {v.code}
                    </span>
                    <span className="text-xs font-black text-[#1D3E72]">
                      {v.discount_type === "PERCENT" ? `${v.discount_value}% OFF` : `Rp ${Number(v.discount_value).toLocaleString("id-ID")}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: PENGATURAN & PASSWORD ADMIN
            ========================================================================= */}
        {activeTab === "settings" && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in shadow-xs">
            <div>
              <h2 className="font-black text-lg text-slate-800">Pengaturan Toko & Password</h2>
              <p className="text-xs text-slate-500">Sesuaikan password login admin dan kontak WhatsApp.</p>
            </div>

            <form onSubmit={handleSaveHeaderAndSlots} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Toko</label>
                <input
                  type="text"
                  value={settings.store_name || "Adrien Fandra Store"}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Akses Manager</label>
                <input
                  type="text"
                  value={settings.admin_password || "Adrien1401"}
                  onChange={(e) => setSettings({ ...settings, admin_password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp Support / Penjualan</label>
                <input
                  type="text"
                  value={settings.whatsapp_number || "+6289688113210"}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Notifikasi Pengirim</label>
                <input
                  type="email"
                  value={settings.support_email || "adrienfandra14@gmail.com"}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-[#1D3E72] hover:bg-[#0F2247] text-white font-bold text-xs py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                {actionLoading ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* =========================================================================
          MODAL PRODUK E-BOOK
          ========================================================================= */}
      {productModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-lg text-slate-800">
              {editingProduct.id ? "Edit E-Book" : "Tambah E-Book"}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Judul E-Book *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.title || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subjudul</label>
                  <input
                    type="text"
                    value={editingProduct.subtitle || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, subtitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori / Badge</label>
                  <input
                    type="text"
                    value={editingProduct.category || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Asli (Coret)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.regular_price || 145000}
                    onChange={(e) => setEditingProduct({ ...editingProduct, regular_price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Promo (Jual)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.sale_price || 99000}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sale_price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-blue-500 rounded-xl px-3 py-2 text-xs outline-none font-bold text-[#1D3E72]"
                  />
                </div>
              </div>

              {/* Upload Cover & PDF */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cover E-Book (Upload / URL)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                      className="text-[11px] text-slate-500 mb-1"
                    />
                    <input
                      type="text"
                      placeholder="Atau tempel URL cover..."
                      value={editingProduct.cover_url || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, cover_url: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Upload File PDF Asli *</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0])}
                      className="text-[11px] text-slate-500 mb-1"
                    />
                    <div className="text-[11px] font-semibold text-[#1D3E72]">
                      File Terpasang: {editingProduct.pdf_filename || "PDF Default"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Promo Slides Tambahan */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Foto Tambahan / Slide Tulisan Gede</span>
                  <label className="cursor-pointer bg-blue-50 text-[#1D3E72] px-2.5 py-1 rounded-lg font-bold text-[10px] hover:bg-blue-100">
                    + Upload Slide
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleAddPromoImage(e.target.files[0])}
                    />
                  </label>
                </div>

                <div className="flex gap-2 overflow-x-auto py-1">
                  {(editingProduct.promo_images || []).map((imgUrl: string, idx: number) => (
                    <div key={idx} className="relative w-20 h-24 rounded-lg overflow-hidden border border-slate-300 flex-shrink-0 bg-white">
                      <img src={imgUrl} alt="Slide" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingProduct.promo_images.filter((_: any, i: number) => i !== idx);
                          setEditingProduct({ ...editingProduct, promo_images: updated });
                        }}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Copywriting */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Copywriting Sales Letter</label>
                  <textarea
                    rows={3}
                    value={editingProduct.sales_body || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sales_body: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teks Kelangkaan (Urgency)</label>
                  <input
                    type="text"
                    value={editingProduct.scarcity_text || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, scarcity_text: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-[#1D3E72] hover:bg-[#0F2247] text-white rounded-xl font-bold cursor-pointer"
                >
                  {actionLoading ? "Menyimpan..." : "Simpan E-Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VOUCHER */}
      {voucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-black text-base text-slate-800">Buat Kupon Diskon</h3>
            <form
              onSubmit={async (e: any) => {
                e.preventDefault();
                const code = e.target.code.value;
                const discount_type = e.target.discount_type.value;
                const discount_value = e.target.discount_value.value;
                setActionLoading(true);
                try {
                  const res = await fetch("/api/adrienfandra/admin/vouchers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-admin-email": adminEmail },
                    body: JSON.stringify({ code, discount_type, discount_value })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setVoucherModalOpen(false);
                    triggerSuccess("Kupon diskon dibuat.");
                  }
                } catch (err: any) {
                  alert(err.message);
                } finally {
                  setActionLoading(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kode *</label>
                <input type="text" name="code" required placeholder="HEMAT10" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 uppercase font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipe</label>
                <select name="discount_type" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
                  <option value="PERCENT">Persen (%)</option>
                  <option value="FIXED">Nominal Rp</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nilai Diskon</label>
                <input type="number" name="discount_value" required placeholder="10" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setVoucherModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold cursor-pointer">Batal</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-[#1D3E72] text-white rounded-xl font-bold cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
