import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { 
  ArrowLeft, ShieldCheck, ChevronRight, ChevronDown, ChevronUp,
  Tag, Copy, Check, RefreshCw, ExternalLink,
  Clock, AlertCircle, Sparkles
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

const DEFAULT_CHECKOUT_PRODUCTS: Product[] = [
  {
    id: 2,
    slug: "paket-bundling-3-buku",
    title: "Paket Bundling 3 Buku",
    subtitle: "",
    cover_url: "/Akuntansi/Paket_Bundling_3_E-Book.webp",
    regular_price: 205000,
    sale_price: 82000,
    sales_body: "Dapatkan ketiga e-book terpisah lengkap (3 file PDF) yang dapat diunduh masing-masing."
  },
  {
    id: 1,
    slug: "logika-akuntansi",
    title: "Logika Akuntansi",
    subtitle: "Kuasai Pondasi Logika & Alur Berpikir Akuntansi Modern dengan Bahasa Sederhana",
    cover_url: "/Akuntansi/Mockup_Buku_Logika_Akuntansi.webp",
    regular_price: 72000,
    sale_price: 46000,
    sales_body: "Buku Logika Akuntansi dirancang khusus untuk Anda yang ingin menguasai alur berpikir akuntansi dari akarnya secara ramah pemula."
  },
  {
    id: 3,
    slug: "full-accounting",
    title: "Akuntansi Lengkap",
    subtitle: "Panduan Komprehensif Siklus Akuntansi & Laporan Keuangan Perusahaan",
    cover_url: "/Akuntansi/Mockup_Buku_Full_Accounting_Tebal.webp",
    regular_price: 95000,
    sale_price: 75000,
    sales_body: "Bedah tuntas siklus akuntansi lengkap dan laporan keuangan bisnis."
  },
  {
    id: 4,
    slug: "gudang-akuntansi",
    title: "Gudang Soal Akuntansi",
    subtitle: "Kumpulan Studi Kasus, Latihan Soal, & Pembahasan Praktis Siap Uji",
    cover_url: "/Akuntansi/Mockup_Buku_Gudang_Soal_Akuntansi.webp",
    regular_price: 38000,
    sale_price: 26000,
    sales_body: "Ratusan soal latihan akuntansi lengkap dengan pembahasan logis."
  }
];

function resolveWebpUrl(url?: string): string {
  if (!url) return "";
  if (url.includes("Bundling") || url.includes("bundling") || url.includes("Interaktif")) {
    return "/Akuntansi/Paket_Bundling_3_E-Book.webp";
  }
  if (url.includes("Logika") || url.includes("logika") || url.includes("Bayi") || url.includes("bayi")) {
    return "/Akuntansi/Mockup_Buku_Logika_Akuntansi.webp";
  }
  if (url.includes("Lengkap") || url.includes("lengkap") || url.includes("Full") || url.includes("full") || url.includes("Tuntas") || url.includes("tuntas")) {
    return "/Akuntansi/Mockup_Buku_Full_Accounting_Tebal.webp";
  }
  if (url.includes("Gudang") || url.includes("gudang") || url.includes("Soal") || url.includes("soal")) {
    return "/Akuntansi/Mockup_Buku_Gudang_Soal_Akuntansi.webp";
  }
  if (url.endsWith(".png") && url.includes("/Akuntansi/")) {
    return url.replace(/\.png$/, ".webp").replace(/\s+/g, "_");
  }
  return url;
}

interface PaymentMethodOption {
  id: string;
  label: string;
  logo: string;
  subLogos?: string[];
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: "SQ",
    label: "QRIS (Semua E-Wallet & Mobile Banking)",
    logo: "/QRIS.png",
    subLogos: ["/Gopay.png", "/OVO.png", "/DANA.png", "/ShopeePay.png", "/BCA.png"]
  },
  {
    id: "BC",
    label: "BCA Virtual Account",
    logo: "/BCA.png"
  },
  {
    id: "M2",
    label: "Mandiri Virtual Account (Livin')",
    logo: "/Mandiri.png"
  },
  {
    id: "BR",
    label: "BRI Virtual Account (BRIVA)",
    logo: "/BRI.png"
  },
  {
    id: "I1",
    label: "BNI Virtual Account",
    logo: "/BNI.png"
  },
  {
    id: "BT",
    label: "Permata Bank Virtual Account",
    logo: "/Permata.png"
  },
  {
    id: "B1",
    label: "CIMB Niaga Virtual Account",
    logo: "/CIMB.png"
  },
  {
    id: "BS",
    label: "Bank Syariah Indonesia (BSI)",
    logo: "/BSI.png"
  },
  {
    id: "DM",
    label: "Bank Danamon",
    logo: "/Danamon.png"
  },
  {
    id: "AL",
    label: "Alfamart / Alfa Midi",
    logo: "/Alfa.png"
  }
];

const SESSION_PAYMENT_KEY = "adrienfandra_active_payment";
const SESSION_DRAFT_KEY = "adrienfandra_checkout_draft";

export default function CheckoutPage() {
  const [, params] = useRoute("/adrienfandra/checkout/:id");
  const [, setLocation] = useLocation();

  const productId = params?.id;

  const [product, setProduct] = useState<Product | null>(() => {
    try {
      const cached = localStorage.getItem("af_store_cache_v12") || localStorage.getItem("af_store_cache_v11") || localStorage.getItem("af_store_cache_v10");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (productId) {
            const found = parsed.find((p: any) => String(p.id) === String(productId) || p.slug === productId);
            if (found) return found;
          } else {
            return parsed[0];
          }
        }
      }
    } catch (e) {}

    if (productId) {
      const foundDef = DEFAULT_CHECKOUT_PRODUCTS.find(p => String(p.id) === String(productId) || p.slug === productId);
      if (foundDef) return foundDef;
    }
    return DEFAULT_CHECKOUT_PRODUCTS[0];
  });

  const [loading, setLoading] = useState(false);
  const [showDesc, setShowDesc] = useState(false);

  // Form Pembeli
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [showVoucherInput, setShowVoucherInput] = useState(false);

  // Payment Method Selection
  const [paymentMethod, setPaymentMethod] = useState("SQ"); // SQ = QRIS
  const [showAllPaymentMethods, setShowAllPaymentMethods] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [agreedContact, setAgreedContact] = useState(true);

  // Processing & Modal State
  const [submitting, setSubmitting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [pollingStatus, setPollingStatus] = useState<string>("Menunggu Pembayaran...");
  const [isCopied, setIsCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60);
  const [checkingManual, setCheckingManual] = useState(false);

  // Track checkout page view in analytics
  useEffect(() => {
    if (product) {
      try {
        let visitorId = localStorage.getItem("af_store_visitor_id");
        if (!visitorId) {
          visitorId = "v_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
          localStorage.setItem("af_store_visitor_id", visitorId);
        }
        fetch("/api/adrienfandra/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "CHECKOUT_OPEN",
            productId: product.id,
            productTitle: product.title,
            visitorId,
            referrer: document.referrer || window.location.href
          })
        }).catch(() => {});
      } catch (e) {}
    }
  }, [product?.id]);

  // 1. Pulihkan Draft Formulir & Sesi Transaksi Aktif (< 30 menit)
  useEffect(() => {
    window.scrollTo(0, 0);
    // Pulihkan input formulir pembeli jika ada
    try {
      const savedDraft = localStorage.getItem(SESSION_DRAFT_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.name || parsed.email || parsed.phone) {
          setFormData(prev => ({
            name: parsed.name || prev.name,
            email: parsed.email || prev.email,
            phone: parsed.phone || prev.phone
          }));
        }
      }
    } catch (e) {}

    // Pulihkan sesi pembayaran aktif yang belum kedaluwarsa (< 30 menit)
    try {
      const activeRaw = localStorage.getItem(SESSION_PAYMENT_KEY);
      if (activeRaw) {
        const active = JSON.parse(activeRaw);
        const now = Date.now();
        if (active && active.expiresAt && now < active.expiresAt && active.paymentResult) {
          setPaymentResult(active.paymentResult);
          if (active.paymentMethod) setPaymentMethod(active.paymentMethod);
          if (active.customerName || active.customerEmail || active.customerPhone) {
            setFormData({
              name: active.customerName || "",
              email: active.customerEmail || "",
              phone: active.customerPhone || ""
            });
          }
          setPaymentModalOpen(true);
          const remainingSecs = Math.max(0, Math.floor((active.expiresAt - now) / 1000));
          setTimeLeft(remainingSecs);

          // Cek seketika apakah sudah dibayar saat berada di luar browser
          fetch("/api/adrienfandra/payment/check-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ merchantOrderId: active.paymentResult.merchantOrderId })
          })
            .then(res => res.json())
            .then(data => {
              if (data.isPaid) {
                localStorage.removeItem(SESSION_PAYMENT_KEY);
                setPollingStatus("Pembayaran Berhasil! Mengarahkan ke E-Book...");
                setTimeout(() => {
                  setLocation(`/adrienfandra/order/${active.paymentResult.merchantOrderId}`);
                }, 800);
              }
            })
            .catch(() => {});
        } else if (active && active.expiresAt && now >= active.expiresAt) {
          localStorage.removeItem(SESSION_PAYMENT_KEY);
        }
      }
    } catch (e) {
      console.error("Gagal memulihkan sesi transaksi:", e);
    }
  }, [setLocation]);

  // 2. Simpan input draft secara otomatis
  useEffect(() => {
    if (formData.name || formData.email || formData.phone) {
      try {
        localStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(formData));
      } catch (e) {}
    }
  }, [formData]);

  // 3. Load Data Produk
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

  // 4. Hitung mundur 30 menit secara konsisten terhadap waktu kadaluarsa tersimpan
  useEffect(() => {
    if (!paymentResult) return;

    const tick = () => {
      try {
        const activeRaw = localStorage.getItem(SESSION_PAYMENT_KEY);
        if (activeRaw) {
          const active = JSON.parse(activeRaw);
          if (active.expiresAt) {
            const remaining = Math.max(0, Math.floor((active.expiresAt - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
              setPollingStatus("Waktu pembayaran 30 menit telah berakhir.");
            }
            return remaining;
          }
        }
      } catch (e) {}
      return 0;
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [paymentResult]);

  // 5. Polling Status Pembayaran Real-Time (Setiap 2.5 Detik selama belum lunas & waktu belum habis)
  useEffect(() => {
    let interval: any = null;
    if (paymentModalOpen && paymentResult?.merchantOrderId && timeLeft > 0) {
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
            try {
              localStorage.removeItem(SESSION_PAYMENT_KEY);
            } catch (e) {}
            setPollingStatus("Pembayaran Berhasil! Mengarahkan ke E-Book...");
            setTimeout(() => {
              setLocation(`/adrienfandra/order/${paymentResult.merchantOrderId}`);
            }, 800);
          }
        } catch (e) {
          console.error("Status check error:", e);
        }
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentModalOpen, paymentResult, timeLeft, setLocation]);

  // 6. ⚡ RADAR RE-ENTRY: Cek seketika saat pengguna kembali dari m-Banking / E-Wallet
  useEffect(() => {
    const handleReEntry = () => {
      if (document.visibilityState === "visible" && paymentResult?.merchantOrderId && timeLeft > 0) {
        setPollingStatus("Mengecek status pembayaran terbaru...");
        fetch("/api/adrienfandra/payment/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantOrderId: paymentResult.merchantOrderId })
        })
          .then(res => res.json())
          .then(data => {
            if (data.isPaid) {
              try {
                localStorage.removeItem(SESSION_PAYMENT_KEY);
              } catch (e) {}
              setPollingStatus("Pembayaran Berhasil! Mengarahkan ke E-Book...");
              setTimeout(() => {
                setLocation(`/adrienfandra/order/${paymentResult.merchantOrderId}`);
              }, 600);
            } else {
              setPollingStatus("Menunggu Pembayaran...");
            }
          })
          .catch(() => {
            setPollingStatus("Menunggu Pembayaran...");
          });
      }
    };

    document.addEventListener("visibilitychange", handleReEntry);
    window.addEventListener("focus", handleReEntry);
    return () => {
      document.removeEventListener("visibilitychange", handleReEntry);
      window.removeEventListener("focus", handleReEntry);
    };
  }, [paymentResult, timeLeft, setLocation]);

  // 7. 🛡️ Cegah reload browser / penutupan tab tidak sengaja selama transaksi berlangsung
  useEffect(() => {
    if (!paymentResult || timeLeft <= 0) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Pembayaran Anda sedang berjalan. Sesi pembayaran aman disimpan selama 30 menit.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [paymentResult, timeLeft]);

  // 8. 🛡️ Tangkap gesture Back browser / HP agar tidak keluar secara tidak sengaja
  useEffect(() => {
    if (!paymentModalOpen) return;

    window.history.pushState({ afPaymentModal: true }, "");

    const handlePopState = () => {
      const confirmCancel = window.confirm(
        "Pembayaran Anda sedang berjalan dan tersimpan aman selama 30 menit.\n\nApakah Anda yakin ingin membatalkan transaksi ini dan kembali?"
      );
      if (confirmCancel) {
        try {
          localStorage.removeItem(SESSION_PAYMENT_KEY);
        } catch (e) {}
        setPaymentModalOpen(false);
        setPaymentResult(null);
      } else {
        window.history.pushState({ afPaymentModal: true }, "");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [paymentModalOpen]);

  // Validasi Voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || !product) return;
    setVoucherLoading(true);
    setVoucherError("");

    try {
      const res = await fetch("/api/adrienfandra/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: voucherCode, 
          amount: product.sale_price,
          productId: product.id 
        })
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

  // Perhitungan Harga: Subtotal fokus pada Harga Coret (Regular Price), Diskon sebagai pengurang, Total adalah Harga Kini
  const regularPrice = product ? Number(product.regular_price || product.sale_price) : 0;
  const salePrice = product ? Number(product.sale_price) : 0;
  const productDiscount = Math.max(regularPrice - salePrice, 0);
  const voucherDiscount = appliedVoucher ? Number(appliedVoucher.calculated_discount || 0) : 0;
  const totalDiscount = productDiscount + voucherDiscount;
  const subtotal = regularPrice;
  const totalAmount = Math.max(salePrice - voucherDiscount, 0);
  const isBundling = product ? (
    Number(product.id) === 2 || 
    product.slug === "paket-bundling-3-buku" || 
    (product.title || "").toLowerCase().includes("bundling")
  ) : false;
  const discountPercent = regularPrice > salePrice
    ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
    : 0;

  // Submit Checkout & Panggil Payment Gateway
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert("Harap lengkapi Nama Lengkap dan Email Anda.");
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
          customerName: formData.name.trim(),
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone?.trim() || "-",
          voucherCode: appliedVoucher?.code || undefined,
          paymentMethod: paymentMethod
        })
      });

      const data = await res.json();
      if (data.success) {
        const result = {
          merchantOrderId: data.orderId,
          qrCode: data.paymentData?.qrCode,
          vaNumber: data.paymentData?.vaNumber,
          paymentUrl: data.paymentData?.paymentUrl,
          totalAmount: data.totalAmount,
          method: paymentMethod
        };
        setPaymentResult(result);
        setPaymentModalOpen(true);

        // Simpan sesi aktif 30 Menit ke localStorage
        const now = Date.now();
        const expiresAt = now + 30 * 60 * 1000; // 30 Menit
        setTimeLeft(30 * 60);

        const sessionData = {
          orderId: data.orderId,
          productId: product?.id,
          productTitle: product?.title,
          customerName: formData.name.trim(),
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone.trim(),
          voucherCode: appliedVoucher?.code || null,
          paymentMethod: paymentMethod,
          paymentResult: result,
          createdAt: now,
          expiresAt: expiresAt
        };
        try {
          localStorage.setItem(SESSION_PAYMENT_KEY, JSON.stringify(sessionData));
        } catch (e) {}
      } else {
        alert(data.error || "Gagal memproses pesanan.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan koneksi saat membuat pesanan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualCheck = async () => {
    if (!paymentResult?.merchantOrderId || checkingManual) return;
    setCheckingManual(true);
    setPollingStatus("Mengecek verifikasi pembayaran...");
    try {
      const res = await fetch("/api/adrienfandra/payment/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantOrderId: paymentResult.merchantOrderId })
      });
      const data = await res.json();
      if (data.isPaid) {
        try {
          localStorage.removeItem(SESSION_PAYMENT_KEY);
        } catch (e) {}
        setPollingStatus("Pembayaran Berhasil! Mengarahkan ke E-Book...");
        setTimeout(() => {
          setLocation(`/adrienfandra/order/${paymentResult.merchantOrderId}`);
        }, 600);
      } else {
        setPollingStatus("Pembayaran belum masuk. Silakan selesaikan di aplikasi bank.");
      }
    } catch (e) {
      setPollingStatus("Gagal mengecek status.");
    } finally {
      setTimeout(() => setCheckingManual(false), 1200);
    }
  };

  const handleCancelPayment = () => {
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin membatalkan transaksi ini dan memilih metode lain?"
    );
    if (confirmed) {
      try {
        localStorage.removeItem(SESSION_PAYMENT_KEY);
      } catch (e) {}
      setPaymentModalOpen(false);
      setPaymentResult(null);
    }
  };

  const handleTopBack = () => {
    if (paymentModalOpen && paymentResult) {
      const confirmCancel = window.confirm(
        "Pembayaran Anda sedang berjalan dan tersimpan selama 30 menit.\n\nApakah Anda yakin ingin membatalkan transaksi ini dan kembali?"
      );
      if (!confirmCancel) return;
      try {
        localStorage.removeItem(SESSION_PAYMENT_KEY);
      } catch (e) {}
      setPaymentModalOpen(false);
      setPaymentResult(null);
    }
    window.history.back();
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
      
      {/* 🧭 TOP HEADER */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleTopBack}
            className="text-slate-600 hover:text-slate-900 transition-colors p-1 cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-base sm:text-lg text-slate-800">
            Checkout
          </h1>
        </div>
      </header>

      {/* ⚡ BANNER LANJUTKAN TRANSAKSI (JIKA MODAL DISEMBUNYIKAN) */}
      {paymentResult && !paymentModalOpen && timeLeft > 0 && (
        <div className="bg-[#1D3E72] text-white px-4 py-3 sticky top-[57px] z-25 shadow-md animate-in slide-in-from-top duration-200">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-300 animate-pulse flex-shrink-0" />
              <span>
                Transaksi <strong>{paymentResult.merchantOrderId}</strong> sedang aktif. Sisa waktu:{" "}
                <strong className="text-amber-300 font-mono text-sm">{formatCountdown(timeLeft)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                className="bg-white hover:bg-blue-50 text-[#1D3E72] font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Buka QRIS / Bayar
              </button>
              <button
                type="button"
                onClick={handleCancelPayment}
                className="text-blue-200 hover:text-white text-xs underline font-semibold cursor-pointer"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛒 2-COLUMN CHECKOUT GRID */}
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

              {isBundling ? (
                /* KHUSUS PAKET BUNDLING: TAMPILAN GAMBAR BESAR & LEBAR (LANDSCAPE) */
                <div className="space-y-3.5">
                  {/* Info Header Produk */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-[#1D3E72] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">1x</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                          {product.title}
                        </h3>
                        {discountPercent > 0 && (
                          <span className="bg-rose-600 text-white text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                            HEMAT {discountPercent}%
                          </span>
                        )}
                      </div>
                      {product.subtitle && (
                        <p className="text-xs text-slate-500 font-medium">
                          {product.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Harga Ringkas */}
                    <div className="sm:text-right flex-shrink-0">
                      <span className="font-black text-lg sm:text-xl text-[#1D3E72] block">
                        Rp {Number(product.sale_price).toLocaleString("id-ID")}
                      </span>
                      {Number(product.regular_price) > Number(product.sale_price) && (
                        <span className="text-xs font-semibold text-slate-400 line-through block">
                          Rp {Number(product.regular_price).toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DISPLAY GAMBAR BUNDLING BESAR & LEBAR */}
                  <div className="w-full bg-slate-50/70 rounded-2xl p-3 sm:p-5 flex items-center justify-center border border-slate-200/80 shadow-2xs">
                    <img 
                      src={resolveWebpUrl(product.cover_url)} 
                      alt={product.title} 
                      className="w-full max-w-[480px] sm:max-w-[560px] h-auto max-h-[220px] sm:max-h-[280px] object-contain mix-blend-multiply transition-transform hover:scale-102" 
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </div>
              ) : (
                /* E-BOOK SINGLE (PORTRAIT): TAMPILAN THUMBNAIL BERSIH */
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-24 sm:w-24 sm:h-28 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/90 shadow-sm p-1.5">
                    {product.cover_url ? (
                      <img 
                        src={resolveWebpUrl(product.cover_url)} 
                        alt={product.title} 
                        className="w-full h-full object-contain mix-blend-multiply" 
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-[10px] font-black text-[#1D3E72] text-center px-1">PDF E-BOOK</span>
                    )}
                  </div>

                  {/* Info Produk */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-black text-[#1D3E72] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">1x</span>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-2">
                        {product.title}
                      </h3>
                    </div>
                    {product.subtitle && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {product.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Harga */}
                  <div className="text-right flex-shrink-0">
                    <span className="font-black text-sm sm:text-base text-[#1D3E72] block">
                      Rp {Number(product.sale_price).toLocaleString("id-ID")}
                    </span>
                    {Number(product.regular_price) > Number(product.sale_price) && (
                      <span className="text-[11px] font-semibold text-slate-400 line-through block">
                        Rp {Number(product.regular_price).toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* See Description Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowDesc(!showDesc)}
                  className="text-xs font-bold text-[#1D3E72] hover:text-[#0F2247] flex items-center gap-1 transition-colors cursor-pointer"
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
                    className="w-full bg-white border border-slate-400 hover:border-slate-500 focus:border-[#1D3E72] focus:ring-1 focus:ring-[#1D3E72] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
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
                    className="w-full bg-white border border-slate-400 hover:border-slate-500 focus:border-[#1D3E72] focus:ring-1 focus:ring-[#1D3E72] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* =========================================================================
              KOLOM KANAN: PAYMENT DETAIL & METODE PEMBAYARAN (LG: COL-5)
              ========================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                PAYMENT DETAIL
              </span>

              {/* Rincian Harga: Subtotal dari harga coret, diskon sebagai pengurang, total harga kini */}
              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Harga Normal)</span>
                  <span className="font-semibold text-slate-800">Rp {regularPrice.toLocaleString("id-ID")}</span>
                </div>

                {productDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Diskon Promo</span>
                    <span className="font-bold text-emerald-700">
                      - Rp {productDiscount.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                {appliedVoucher && voucherDiscount > 0 && (
                  <div className="flex justify-between text-blue-700 font-medium">
                    <span>Diskon Voucher ({appliedVoucher.code})</span>
                    <span className="font-bold text-blue-700">
                      - Rp {voucherDiscount.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Biaya Layanan</span>
                  <span className="font-bold text-emerald-600">Gratis</span>
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex justify-between items-baseline font-black text-sm sm:text-base text-[#0F2247]">
                  <span>TOTAL PEMBAYARAN</span>
                  <span className="text-base sm:text-lg text-[#1D3E72]">
                    Rp {totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>

                {/* 💡 Dorongan Investasi Calon Pembeli */}
                <div className="mt-2.5 p-2.5 sm:p-3 bg-gradient-to-r from-blue-50/90 via-slate-50 to-amber-50/80 rounded-xl border border-blue-100/90 flex items-start gap-2 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px] sm:text-xs font-bold text-[#1D3E72] leading-snug">
                    Satu kali investasi untuk aset pengetahuan yang akan menguntungkan Anda seumur hidup
                  </span>
                </div>
              </div>

              {/* 🏷️ ADD VOUCHER BUTTON / INPUT */}
              <div className="pt-2">
                {appliedVoucher ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[#1D3E72] uppercase">{appliedVoucher.code}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                            {appliedVoucher.discount_type === "PERCENT" ? `Diskon ${appliedVoucher.discount_value}%` : "Diskon Spesial"}
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-800 block font-bold">Hemat Rp {voucherDiscount.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeVoucher}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
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
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs uppercase font-bold outline-none focus:border-[#1D3E72]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={voucherLoading}
                        className="bg-[#1D3E72] hover:bg-[#0F2247] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
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
                    className="w-full border border-dashed border-[#1D3E72]/40 hover:bg-blue-50/50 text-[#1D3E72] font-extrabold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>% Add Voucher</span>
                  </button>
                )}
              </div>

              {/* 💳 SELECT PAYMENT METHOD */}
              <div className="pt-2 space-y-2.5">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  Pilih Metode Pembayaran
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  {(showAllPaymentMethods ? PAYMENT_METHODS : PAYMENT_METHODS.slice(0, 5)).map((method) => (
                    <label
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`border rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        paymentMethod === method.id
                          ? "border-[#1D3E72] bg-blue-50/50 shadow-xs ring-1 ring-[#1D3E72]/30"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                        <div className="w-14 h-11 sm:w-16 sm:h-12 bg-white border border-slate-200/80 rounded-xl flex items-center justify-center p-1 sm:p-1.5 shadow-2xs flex-shrink-0">
                          <img
                            src={method.logo}
                            alt={method.label}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-bold text-slate-800 block truncate">{method.label}</span>
                          {method.subLogos && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                              {method.subLogos.map((sub, idx) => (
                                <img
                                  key={idx}
                                  src={sub}
                                  alt="Wallet Logo"
                                  className="h-4 sm:h-4.5 w-auto object-contain opacity-95"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right-aligned radio */}
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="w-4 h-4 text-[#1D3E72] focus:ring-[#1D3E72] cursor-pointer"
                        />
                      </div>
                    </label>
                  ))}
                </div>

                {/* Tombol Lihat Lebih Banyak */}
                <button
                  type="button"
                  onClick={() => setShowAllPaymentMethods(!showAllPaymentMethods)}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-bold text-[#1D3E72] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{showAllPaymentMethods ? "Lihat Lebih Sedikit" : "Lihat Lebih Banyak"}</span>
                  {showAllPaymentMethods ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[#1D3E72]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#1D3E72]" />
                  )}
                </button>
              </div>

              {/* 🔒 SECURE PAYMENT BANNER */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#1D3E72] flex-shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="font-extrabold text-slate-900 block">Secure Payment</span>
                  <span className="text-slate-500">All your payments are secured with RSA 256-bit encryption</span>
                </div>
              </div>

              {/* ☑️ CHECKBOX TERMS */}
              <div className="space-y-2 pt-1 text-[11px] text-slate-600">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 rounded text-[#1D3E72] focus:ring-[#1D3E72]"
                  />
                  <span>I agree to the <strong className="text-[#1D3E72] underline">Terms of Use</strong> & Lisensi E-Book.</span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedContact}
                    onChange={(e) => setAgreedContact(e.target.checked)}
                    className="mt-0.5 rounded text-[#1D3E72] focus:ring-[#1D3E72]"
                  />
                  <span>I agree that the creator may contact me by email about my purchase & updates.</span>
                </label>
              </div>

              {/* 🚀 CTA BUTTON: GET NOW */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#1D3E72] hover:bg-[#0F2247] text-white font-black text-sm sm:text-base py-4 rounded-xl shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Memproses Transaksi...</span>
                  </>
                ) : (
                  <span>Get Now - IDR {totalAmount.toLocaleString("id-ID")}</span>
                )}
              </button>

            </div>

          </div>

        </form>
      </main>

      {/* =========================================================================
          💳 POPUP / MODAL PEMBAYARAN RESMI DENGAN QRIS REALTIME POLLING (30 MENIT)
          ========================================================================= */}
      {paymentModalOpen && paymentResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center border border-slate-100 max-h-[92vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#1D3E72] bg-blue-50 px-3 py-1 rounded-full border border-blue-200/70 inline-block">
                PEMBAYARAN RESMI
              </span>
              <h3 className="text-xl font-black text-[#0F2247]">
                Selesaikan Pembayaran
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                No. Pesanan: <span className="font-bold text-slate-800">{paymentResult.merchantOrderId}</span>
              </p>
            </div>

            {/* ⏱️ HITUNG MUNDUR 30 MENIT */}
            {timeLeft > 0 ? (
              <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between text-slate-800 shadow-xs">
                <div className="flex items-center gap-2 text-left">
                  <Clock className="w-4 h-4 text-[#1D3E72] animate-pulse flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">Sisa Waktu Pembayaran</span>
                    <span className="text-[10px] text-slate-500">Berlaku selama 30 menit</span>
                  </div>
                </div>
                <div className="font-mono font-black text-lg text-[#1D3E72] bg-white px-3 py-1 rounded-xl shadow-xs border border-blue-100">
                  {formatCountdown(timeLeft)}
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-rose-700 font-bold text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Waktu Pembayaran (30 Menit) Telah Habis</span>
                </div>
                <p className="text-[11px] text-rose-600">
                  Kode QRIS / Virtual Account ini sudah kedaluwarsa.
                </p>
              </div>
            )}

            {/* Total Bayar Highlight */}
            <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100">
              <span className="text-xs text-slate-500 font-bold block">Total yang Harus Dibayar:</span>
              <span className="text-2xl font-black text-[#1D3E72]">
                Rp {Number(paymentResult.totalAmount).toLocaleString("id-ID")}
              </span>
            </div>

            {timeLeft > 0 ? (
              <>
                {/* Tampilan QRIS jika metode QRIS */}
                {paymentResult.method === "SQ" && (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 block">
                      Scan QRIS dengan GoPay, OVO, Dana, ShopeePay, atau BCA:
                    </span>
                    
                    <div className="w-56 h-56 mx-auto bg-white p-2.5 rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center">
                      {paymentResult.qrCode ? (
                        paymentResult.qrCode.startsWith("http") || paymentResult.qrCode.startsWith("data:") ? (
                          <img src={paymentResult.qrCode} alt="QRIS Code" className="w-full h-full object-contain" />
                        ) : (
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentResult.qrCode)}`}
                            alt="QRIS Code"
                            className="w-full h-full object-contain"
                          />
                        )
                      ) : paymentResult.paymentUrl ? (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentResult.paymentUrl)}`}
                          alt="QRIS"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://bilano.app/adrienfandra/order/${paymentResult.merchantOrderId}`)}`}
                          alt="QRIS"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>

                    {paymentResult.paymentUrl && (
                      <a
                        href={paymentResult.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#1D3E72] hover:text-[#0F2247] bg-white border border-slate-200 px-4 py-2 rounded-xl transition-all shadow-xs"
                      >
                        <span>Buka Halaman Pembayaran</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
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
                        className="text-xs font-bold text-[#1D3E72] hover:text-[#0F2247] flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-[#1D3E72]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? "Disalin!" : "Salin"}</span>
                      </button>
                    </div>
                    {paymentResult.paymentUrl && (
                      <a
                        href={paymentResult.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#1D3E72] hover:bg-[#0F2247] px-4 py-2.5 rounded-xl transition-all shadow-sm"
                      >
                        <span>Instruksi & Bayar Online</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* 🛡️ REASSURANCE BANNER (AMAN DITINGGAL KE M-BANKING) */}
                <div className="text-[11px] text-slate-600 bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 flex items-start gap-2.5 text-left leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Aman Ditinggal:</strong> Halaman ini tidak akan ter-reset saat Anda membuka m-Banking atau E-Wallet. Cukup kembali ke sini dan status otomatis terverifikasi.
                  </span>
                </div>

                {/* Status Polling Live + Manual Trigger */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#1D3E72] bg-blue-50/80 border border-blue-200/60 py-2.5 px-4 rounded-full">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1D3E72]" />
                    <span>{pollingStatus}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualCheck}
                    disabled={checkingManual}
                    className="text-xs font-bold text-slate-600 hover:text-[#1D3E72] underline cursor-pointer disabled:opacity-50"
                  >
                    {checkingManual ? "Mengecek ke Bank..." : "Sudah bayar? Cek Status Sekarang"}
                  </button>
                </div>
              </>
            ) : (
              /* State jika waktu 30 menit sudah habis */
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCancelPayment}
                  className="w-full bg-[#1D3E72] text-white font-bold text-xs py-3 rounded-xl shadow-md cursor-pointer hover:bg-[#0F2247]"
                >
                  Ulangi / Buat Pembayaran Baru
                </button>
              </div>
            )}

            {/* Tombol Aksi Bawah */}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {timeLeft > 0 && (
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="w-full text-xs font-bold text-slate-600 hover:text-slate-900 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Sembunyikan Sementara (Tetap Aktif 30 Menit)
                </button>
              )}
              <button
                type="button"
                onClick={handleCancelPayment}
                className="w-full text-xs font-bold text-rose-600 hover:text-rose-800 py-1.5 transition-colors cursor-pointer"
              >
                Batalkan Transaksi / Ganti Metode
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
