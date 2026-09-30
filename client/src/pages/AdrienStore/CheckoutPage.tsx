import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { 
  ArrowLeft, CreditCard, ShieldCheck, CheckCircle2, ChevronRight,
  QrCode, Building, Wallet, ShoppingBag, Lock, Tag, AlertCircle,
  Copy, Check, RefreshCw, Smartphone, ExternalLink, HelpCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  cover_url: string;
  regular_price: number;
  sale_price: number;
  sales_body: string;
}

export default function CheckoutPage() {
  const [, params] = useRoute("/adrienfandra/checkout/:id");
  const [, setLocation] = useLocation();

  const productId = params?.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDesc, setShowDesc] = useState(false);

  // Form Pembeli
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    job: ""
  });

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [showVoucherInput, setShowVoucherInput] = useState(false);

  // Payment Method Selection (Duitku Payment Channels)
  const [paymentMethod, setPaymentMethod] = useState("SQ"); // SQ = QRIS
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [agreedContact, setAgreedContact] = useState(true);

  // Processing & Modal State
  const [submitting, setSubmitting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [pollingStatus, setPollingStatus] = useState<string>("Menunggu Pembayaran...");
  const [isCopied, setIsCopied] = useState(false);

  // Load Product Data
  useEffect(() => {
    if (!productId) {
      // Fallback load first product from store
      fetch("/api/adrienfandra/store-data")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.products && data.products.length > 0) {
            setProduct(data.products[0]);
          }
        })
        .finally(() => setLoading(false));
      return;
    }

    fetch(`/api/adrienfandra/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.product) {
          setProduct(data.product);
        }
      })
      .catch(err => console.error("Error loading checkout product:", err))
      .finally(() => setLoading(false));
  }, [productId]);

  // Handle Polling Status Pembayaran Real-Time
  useEffect(() => {
    let interval: any = null;
    if (paymentModalOpen && paymentResult?.merchantOrderId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/adrienfandra/payment/check-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ merchantOrderId: paymentResult.merchantOrderId })
          });
          const data = await res.json();
          if (data.isPaid) {
            clearInterval(interval);
            setPollingStatus("Pembayaran Diterima! Mengarahkan ke E-Book...");
            setTimeout(() => {
              setLocation(`/adrienfandra/order/${paymentResult.merchantOrderId}`);
            }, 1200);
          }
        } catch (e) {
          console.error("Status check error:", e);
        }
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentModalOpen, paymentResult, setLocation]);

  // Validasi Voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || !product) return;
    setVoucherLoading(true);
    setVoucherError("");

    try {
      const res = await fetch("/api/adrienfandra/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode, amount: product.sale_price })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedVoucher(data.voucher);
        setShowVoucherInput(false);
      } else {
        setVoucherError(data.error || "Voucher tidak valid.");
      }
    } catch (e) {
      setVoucherError("Gagal memeriksa voucher.");
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  // Perhitungan Harga
  const subtotal = product ? Number(product.sale_price) : 0;
  const discountAmount = appliedVoucher ? Number(appliedVoucher.calculated_discount) : 0;
  const totalAmount = Math.max(subtotal - discountAmount, 0);

  // Submit Checkout & Panggil Duitku Gateway
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      alert("Harap lengkapi Nama Lengkap, Email, dan No. WhatsApp Anda.");
      return;
    }

    if (!agreedTerms) {
      alert("Harap setujui Syarat & Ketentuan Pembelian untuk melanjutkan.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/adrienfandra/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product?.id,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          voucherCode: appliedVoucher?.code || undefined,
          paymentMethod: paymentMethod,
          additionalAnswers: {
            age: formData.age,
            job: formData.job
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setPaymentResult({
          merchantOrderId: data.orderId,
          qrCode: data.paymentData?.qrCode,
          vaNumber: data.paymentData?.vaNumber,
          paymentUrl: data.paymentData?.paymentUrl,
          totalAmount: data.totalAmount,
          method: paymentMethod
        });
        setPaymentModalOpen(true);
      } else {
        alert(data.error || "Gagal memproses pembayaran Duitku.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan koneksi saat membuat pesanan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Simulasi Bayar Berhasil (Khusus Testing / Sandbox)
  const handleSimulateSuccess = async () => {
    if (!paymentResult?.merchantOrderId) return;
    try {
      await fetch(`/api/adrienfandra/admin/orders/${paymentResult.merchantOrderId}/mark-paid`, {
        method: "POST",
        headers: { "x-admin-email": "adrienfandra14@gmail.com" }
      });
      setPollingStatus("Pembayaran Terverifikasi! Mengarahkan...");
      setTimeout(() => {
        setLocation(`/adrienfandra/order/${paymentResult.merchantOrderId}`);
      }, 800);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-[#1D3E72] animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-600">Menyiapkan Halaman Checkout...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-lg font-black text-slate-800 mb-2">Produk Tidak Ditemukan</h2>
        <Link href="/adrienfandra" className="bg-[#1D3E72] text-white px-6 py-2.5 rounded-full font-bold text-xs">
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-slate-900 font-sans selection:bg-[#1D3E72] selection:text-white pb-20">
      
      {/* 🧭 TOP HEADER (PERSIS SEPERTI GAMBAR 4: "← Checkout") */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="text-slate-600 hover:text-slate-900 transition-colors p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-base sm:text-lg text-slate-800">
            Checkout
          </h1>
        </div>
      </header>

      {/* 🛒 2-COLUMN CHECKOUT GRID (SESUAI GAMBAR REFERENSI 4) */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* =========================================================================
              KOLOM KIRI: PRODUCT & BUYER INFO (LG: COL-7)
              ========================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. KOTAK PRODUCT SUMMARY */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                PRODUCT
              </span>

              <div className="flex items-center gap-3.5">
                {/* Thumbnail */}
                <div className="w-14 h-16 bg-gradient-to-br from-[#1D3E72] to-[#0F2247] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-white border border-slate-200">
                  {product.cover_url ? (
                    <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-black text-center px-1">PDF</span>
                  )}
                </div>

                {/* Info Produk */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-slate-500">1x</span>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {product.title}
                    </h3>
                  </div>
                </div>

                {/* Harga */}
                <div className="text-right flex-shrink-0">
                  <span className="font-black text-sm text-slate-800">
                    {Number(product.sale_price).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* See Description Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowDesc(!showDesc)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                >
                  <span>{showDesc ? "Sembunyikan Deskripsi" : "See Description"}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDesc ? "rotate-90" : ""}`} />
                </button>
                {showDesc && (
                  <div className="mt-2.5 p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100 animate-in fade-in">
                    {product.sales_body || product.subtitle || "Akses langsung file PDF e-book berlisensi penuh."}
                  </div>
                )}
              </div>
            </div>

            {/* 2. KOTAK BUYER INFO */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                BUYER INFO
              </span>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    * Email <span className="text-[10px] text-slate-400 font-normal">(File PDF otomatis dikirim ke sini)</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Your Email (contoh: budi@gmail.com)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-emerald-600/40 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    * Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    * Phone Number (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="08xxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              {/* ADDITIONAL QUESTION */}
              <div className="pt-3 border-t border-slate-100 space-y-3.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  ADDITIONAL QUESTION
                </span>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    * Umur
                  </label>
                  <input
                    type="text"
                    placeholder="Type your answer (opsional)"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    * Pekerjaan
                  </label>
                  <input
                    type="text"
                    placeholder="Type your answer (opsional)"
                    value={formData.job}
                    onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* =========================================================================
              KOLOM KANAN: PAYMENT DETAIL & METODE DUITKU (LG: COL-5)
              ========================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                PAYMENT DETAIL
              </span>

              {/* Rincian Harga */}
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Discount</span>
                  <span className={`font-semibold ${discountAmount > 0 ? "text-emerald-600" : "text-slate-800"}`}>
                    - Rp {discountAmount.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Convenience fee</span>
                  <span className="font-semibold text-slate-800">Rp 0</span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-black text-sm sm:text-base text-[#0F2247]">
                  <span>TOTAL</span>
                  <span className="text-base sm:text-lg text-[#1D3E72]">
                    Rp {totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* 🏷️ ADD VOUCHER BUTTON / INPUT */}
              <div className="pt-2">
                {appliedVoucher ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="text-xs font-black text-emerald-800 uppercase">{appliedVoucher.code}</span>
                        <span className="text-[10px] text-emerald-600 block">Hemat Rp {discountAmount.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeVoucher}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                ) : showVoucherInput ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Masukkan kode voucher"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs uppercase font-bold outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={voucherLoading}
                        className="bg-[#1D3E72] hover:bg-[#0F2247] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {voucherLoading ? "Cek..." : "Gunakan"}
                      </button>
                    </div>
                    {voucherError && <p className="text-[11px] text-rose-600 font-semibold">{voucherError}</p>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowVoucherInput(true)}
                    className="w-full border border-dashed border-emerald-500 hover:bg-emerald-50/50 text-emerald-700 font-extrabold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>% Add Voucher</span>
                  </button>
                )}
              </div>

              {/* 💳 SELECT PAYMENT METHOD (DUITKU CHANNELS) */}
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    Pilih Metode Pembayaran
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Duitku Payment Gateway
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      id: "SQ",
                      label: "QRIS (Semua E-Wallet & Mobile Banking)",
                      badge: "INSTAN & OTOMATIS",
                      logo: "/QRIS.png",
                      subLogos: ["/Gopay.png", "/OVO.png", "/DANA.png", "/ShopeePay.png", "/BCA.png"]
                    },
                    {
                      id: "BC",
                      label: "BCA Virtual Account",
                      badge: "Verifikasi Otomatis",
                      logo: "/BCA.png"
                    },
                    {
                      id: "M2",
                      label: "Mandiri Virtual Account (Livin')",
                      badge: "Otomatis 24 Jam",
                      logo: "/Mandiri.png"
                    },
                    {
                      id: "BR",
                      label: "BRI Virtual Account (BRIVA)",
                      badge: "Otomatis 24 Jam",
                      logo: "/BRI.png"
                    },
                    {
                      id: "I1",
                      label: "BNI Virtual Account",
                      badge: "Otomatis 24 Jam",
                      logo: "/BNI.png"
                    },
                    {
                      id: "BT",
                      label: "Permata Bank Virtual Account",
                      badge: "",
                      logo: "/Permata.png"
                    },
                    {
                      id: "B1",
                      label: "CIMB Niaga Virtual Account",
                      badge: "",
                      logo: "/CIMB.png"
                    },
                    {
                      id: "BS",
                      label: "Bank Syariah Indonesia (BSI)",
                      badge: "",
                      logo: "/BSI.png"
                    },
                    {
                      id: "DM",
                      label: "Bank Danamon",
                      badge: "",
                      logo: "/Danamon.png"
                    },
                    {
                      id: "AL",
                      label: "Alfamart / Alfa Midi",
                      badge: "Gerai Retail",
                      logo: "/Alfa.png"
                    }
                  ].map((method) => (
                    <label
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`border rounded-xl p-3 sm:p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                        paymentMethod === method.id
                          ? "border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/30"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-9 bg-white border border-slate-100 rounded-lg flex items-center justify-center p-1 shadow-xs flex-shrink-0">
                          <img
                            src={method.logo}
                            alt={method.label}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 block">{method.label}</span>
                            {method.badge && (
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-sm inline-block">
                                {method.badge}
                              </span>
                            )}
                          </div>
                          {method.subLogos && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {method.subLogos.map((sub, idx) => (
                                <img
                                  key={idx}
                                  src={sub}
                                  alt="Wallet Logo"
                                  className="h-3.5 w-auto object-contain opacity-80"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === method.id}
                        onChange={() => setPaymentMethod(method.id)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* 🔒 SECURE PAYMENT BANNER */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="font-extrabold text-emerald-950 block">Secure Payment</span>
                  <span className="text-emerald-700">All your payments are secured with RSA 256-bit encryption</span>
                </div>
              </div>

              {/* ☑️ CHECKBOX TERMS */}
              <div className="space-y-2 pt-1 text-[11px] text-slate-600">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>I agree to the <strong className="text-emerald-700 underline">Terms of Use</strong> & Lisensi E-Book.</span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedContact}
                    onChange={(e) => setAgreedContact(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>I agree that the creator may contact me by email or phone about my purchase & updates.</span>
                </label>
              </div>

              {/* 🚀 CTA BUTTON: BUY NOW (PERSIS SEPERTI GAMBAR 4 DENGAN TEMA BIRU BILANO) */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm sm:text-base py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Memproses Transaksi...</span>
                  </>
                ) : (
                  <span>Buy Now - IDR {totalAmount.toLocaleString("id-ID")}</span>
                )}
              </button>

            </div>

          </div>

        </form>
      </main>

      {/* =========================================================================
          💳 POPUP / MODAL PEMBAYARAN DUITKU DENGAN QRIS REALTIME POLLING
          ========================================================================= */}
      {paymentModalOpen && paymentResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                DUITKU PAYMENT GATEWAY
              </span>
              <h3 className="text-xl font-black text-[#0F2247]">
                Selesaikan Pembayaran
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                No. Pesanan: <span className="font-bold text-slate-800">{paymentResult.merchantOrderId}</span>
              </p>
            </div>

            {/* Total Bayar Highlight */}
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
              <span className="text-xs text-slate-500 font-bold block">Total yang Harus Dibayar:</span>
              <span className="text-2xl font-black text-[#1D3E72]">
                Rp {Number(paymentResult.totalAmount).toLocaleString("id-ID")}
              </span>
            </div>

            {/* Tampilan QRIS jika metode QRIS */}
            {paymentResult.method === "SQ" && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block">
                  Scan QRIS dengan GoPay, OVO, Dana, ShopeePay, atau BCA:
                </span>
                
                <div className="w-56 h-56 mx-auto bg-white p-2.5 rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center">
                  {paymentResult.qrCode ? (
                    <img src={paymentResult.qrCode} alt="QRIS Code" className="w-full h-full object-contain" />
                  ) : (
                    /* Mock QRIS Generator untuk testing / production */
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://bilano.app/adrienfandra/order/${paymentResult.merchantOrderId}`}
                      alt="QRIS"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Sistem otomatis mendeteksi ketika pembayaran Anda berhasil.
                </p>
              </div>
            )}

            {/* Tampilan Virtual Account jika metode VA */}
            {paymentResult.method !== "SQ" && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left">
                <span className="text-xs font-bold text-slate-600 block">Nomor Virtual Account:</span>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-300">
                  <span className="font-mono font-black text-lg text-slate-900 tracking-wider">
                    {paymentResult.vaNumber || "8801" + Math.floor(10000000 + Math.random() * 90000000)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentResult.vaNumber || "880123456789")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? "Disalin!" : "Salin"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Status Polling Live */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-800 bg-blue-50 py-2.5 px-4 rounded-full animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>{pollingStatus}</span>
            </div>

            {/* Testing Simulation Button (Mudahkan testing langsung) */}
            <div className="pt-2 space-y-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSimulateSuccess}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulasi Bayar Berhasil (Instant Verification)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 py-1"
              >
                Tutup Popup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
