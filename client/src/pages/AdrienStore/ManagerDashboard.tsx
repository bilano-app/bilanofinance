import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Plus, Trash2, Edit3, Image, Upload, FileText, 
  CheckCircle2, AlertCircle, RefreshCw, LogOut, Lock, 
  DollarSign, ShoppingBag, Tag, ExternalLink, Eye, Send, Download
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
  const [activeTab, setActiveTab] = useState<"overview" | "header_slots" | "products" | "orders" | "vouchers" | "settings">("overview");

  // Data State
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [stats, setStats] = useState<any>({ totalOrders: 0, paidOrdersCount: 0, totalRevenue: 0, conversionRate: "0%" });
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
        triggerSuccess("Header dan 3 Ruang Gambar berhasil disimpan.");
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
      if (data.success) triggerSuccess("Pesanan ditandai LUNAS.");
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

  // =========================================================================
  // 🔒 SCREEN LOGIN KHUSUS ADMIN (EMAIL TIDAK DITULIS / DIBOCORKAN)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F2247] text-white flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
        <div className="w-full max-w-sm bg-[#1D3E72]/85 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-white/20">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Manager Login
            </h1>
            <p className="text-xs text-blue-200">
              Silakan masukkan email dan password admin Anda untuk mengakses panel pengelola.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="Masukkan email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-[#0F2247] border border-blue-400/30 focus:border-blue-400 rounded-xl px-4 py-3 text-sm text-white placeholder:text-blue-300/40 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Masukkan password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-[#0F2247] border border-blue-400/30 focus:border-blue-400 rounded-xl px-4 py-3 text-sm text-white placeholder:text-blue-300/40 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#F6B93B] hover:bg-[#e2a832] text-[#0F2247] font-black text-sm py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Masuk ke Dashboard</span>}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/adrienfandra" className="text-xs text-blue-300 hover:text-white underline">
              ← Kembali ke Toko
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const slotImages = Array.isArray(settings.slot_images) ? settings.slot_images : ["", "", ""];

  // =========================================================================
  // 🎛️ DASHBOARD MANAGER
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#1D3E72] selection:text-white pb-24">
      
      {/* 🧭 NAVBAR MANAGER */}
      <header className="bg-[#0F2247] text-white sticky top-0 z-40 border-b border-blue-900/50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1D3E72] flex items-center justify-center text-[#F6B93B] font-black text-sm border border-blue-400/30">
              AF
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2">
                <span>Manager Adrien Fandra</span>
              </h1>
              <p className="text-[11px] text-blue-200 line-clamp-1">{adminEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/adrienfandra"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-200 hover:text-white bg-blue-900/40 border border-blue-700/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lihat Toko</span>
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-900/30 hover:bg-rose-900/50 border border-rose-700/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar border-t border-blue-900/40">
          {[
            { id: "overview", label: "Ringkasan Penjualan", icon: DollarSign },
            { id: "header_slots", label: "Header & 3 Gambar Ke Bawah", icon: Image },
            { id: "products", label: "Kelola E-Book", icon: FileText },
            { id: "orders", label: "Pesanan & PDF", icon: ShoppingBag },
            { id: "vouchers", label: "Kupon Diskon", icon: Tag },
            { id: "settings", label: "Pengaturan & Password", icon: Lock }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-3.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 ${
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
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* 📦 MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* =========================================================================
            TAB 1: OVERVIEW
            ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Omset</span>
                <div className="text-xl sm:text-2xl font-black text-[#1D3E72]">
                  {formatCurrency(stats.totalRevenue || 0)}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">E-Book Terjual</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-600">
                  {stats.paidOrdersCount || 0}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Checkout</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {stats.totalOrders || 0}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Konversi</span>
                <div className="text-xl sm:text-2xl font-black text-blue-600">
                  {stats.conversionRate || "0%"}
                </div>
              </div>
            </div>

            {/* Stream Pesanan Terbaru */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800">Pesanan Masuk Terbaru</h3>
                <button onClick={() => setActiveTab("orders")} className="text-xs text-blue-600 font-bold hover:underline">
                  Semua Pesanan →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Pembeli</th>
                      <th className="py-2.5 px-3">Produk</th>
                      <th className="py-2.5 px-3">Total</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.slice(0, 5).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{ord.merchant_order_id}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{ord.customer_name}</td>
                        <td className="py-3 px-3 font-medium text-slate-700 max-w-[180px] truncate">{ord.product_title}</td>
                        <td className="py-3 px-3 font-black text-[#1D3E72]">{formatCurrency(ord.total_amount)}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                            ord.payment_status === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {ord.payment_status}
                          </span>
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
            TAB 2: HEADER BANNER & 3 GAMBAR KE BAWAH
            ========================================================================= */}
        {activeTab === "header_slots" && (
          <div className="space-y-6 animate-in fade-in">
            <form onSubmit={handleSaveHeaderAndSlots} className="space-y-6">
              
              {/* 1. EDITOR HEADER HERO ATAS (SCREENSHOT 4) */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div>
                  <h2 className="font-black text-base text-slate-800">1. Editor Header Hero Paling Atas (Seperti Referensi)</h2>
                  <p className="text-xs text-slate-500">
                    Atur teks logo brand, nama profesi, hook copywriting, teks tombol bulat, dan background banner hero.
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

              {/* 2. 3 RUANG GAMBAR KE BAWAH (SLOT 1, SLOT 2, SLOT 3) */}
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
            TAB 3: KELOLA E-BOOK
            ========================================================================= */}
        {activeTab === "products" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200">
              <div>
                <h2 className="font-black text-base text-slate-800">Katalog Produk E-Book</h2>
                <p className="text-xs text-slate-500">
                  Kelola cover buku, harga promo, harga coret, slide foto tambahan, dan file PDF.
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
                      <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
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
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/adrienfandra/p/${prod.slug || prod.id}`}
                      target="_blank"
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
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
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
            TAB 4: PESANAN
            ========================================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-black text-base text-slate-800">Daftar Transaksi Pembeli</h2>
                <p className="text-xs text-slate-500">Kirim ulang email PDF dan unduh berkas pesanan.</p>
              </div>

              <button
                onClick={fetchData}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Segarkan
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Pembeli</th>
                      <th className="py-3 px-4">Produk</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{ord.merchant_order_id}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{ord.customer_name}</div>
                          <div className="text-[11px] text-slate-500">{ord.customer_email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700 max-w-[200px] truncate">{ord.product_title}</td>
                        <td className="py-3.5 px-4 font-black text-[#1D3E72]">{formatCurrency(ord.total_amount)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                            ord.payment_status === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {ord.payment_status}
                          </span>
                          {ord.payment_status !== "PAID" && (
                            <button
                              onClick={() => handleMarkPaid(ord.merchant_order_id)}
                              className="block text-[10px] text-blue-600 hover:underline font-bold mt-1"
                            >
                              Tandai Lunas
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleResendEmail(ord.merchant_order_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px]"
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: KUPON DISKON
            ========================================================================= */}
        {activeTab === "vouchers" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-black text-base text-slate-800">Kupon Diskon</h2>
                <p className="text-xs text-slate-500">Buat kode promo diskon untuk pembeli.</p>
              </div>

              <button
                onClick={() => setVoucherModalOpen(true)}
                className="bg-[#1D3E72] hover:bg-[#0F2247] text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                + Buat Kupon
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {vouchers.map((v) => (
                <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-[#1D3E72] bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                      {v.code}
                    </span>
                    <span className="text-xs font-black text-emerald-600">
                      {v.discount_type === "PERCENT" ? `${v.discount_value}% OFF` : `Rp ${Number(v.discount_value).toLocaleString("id-ID")}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: PENGATURAN & PASSWORD ADMIN
            ========================================================================= */}
        {activeTab === "settings" && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in shadow-xs">
            <div>
              <h2 className="font-black text-lg text-slate-800">Pengaturan Toko & Password</h2>
              <p className="text-xs text-slate-500">Sesuaikan password login admin dan kontak WhatsApp.</p>
            </div>

            <form onSubmit={handleSaveHeaderAndSlots} className="space-y-4 text-xs">
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
                <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp Support</label>
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
                    className="w-full bg-slate-50 border border-emerald-500 rounded-xl px-3 py-2 text-xs outline-none font-bold text-emerald-800"
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
                    <div className="text-[11px] font-semibold text-emerald-700">
                      File: {editingProduct.pdf_filename || "PDF Default"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Promo Slides Tambahan */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Foto Tambahan / Slide Tulisan Gede</span>
                  <label className="cursor-pointer bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold text-[10px] hover:bg-blue-100">
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
                  className="flex-1 py-3 border border-slate-300 rounded-xl font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-[#1D3E72] hover:bg-[#0F2247] text-white rounded-xl font-bold"
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
                <button type="button" onClick={() => setVoucherModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold">Batal</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-[#1D3E72] text-white rounded-xl font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
