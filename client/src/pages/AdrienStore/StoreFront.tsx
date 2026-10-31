import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Clock, ArrowRight, ArrowDown, CheckCircle2, MessageCircle, Star, BookOpen, ShieldCheck, ChevronLeft, ChevronRight, X } from "lucide-react";

const REVIEW_ITEMS = [
  { id: 1, src: "/Akuntansi/Review_1.webp", fallback: "/Akuntansi/Review 1.jpg", alt: "Review Pembeli 1" },
  { id: 2, src: "/Akuntansi/Review_2.webp", fallback: "/Akuntansi/Review 2.jpg", alt: "Review Pembeli 2" },
  { id: 3, src: "/Akuntansi/Review_3.webp", fallback: "/Akuntansi/Review 3.jpg", alt: "Review Pembeli 3" },
  { id: 4, src: "/Akuntansi/Review_4.webp", fallback: "/Akuntansi/Review 4.jpg", alt: "Review Pembeli 4" },
  { id: 5, src: "/Akuntansi/Review_5.webp", fallback: "/Akuntansi/Review 5.jpg", alt: "Review Pembeli 5" },
  { id: 6, src: "/Akuntansi/Review_6.webp", fallback: "/Akuntansi/Review 6.jpg", alt: "Review Pembeli 6" },
  { id: 7, src: "/Akuntansi/Review_7.webp", fallback: "/Akuntansi/Review 7.jpg", alt: "Review Pembeli 7" },
];

interface Product {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  cover_url: string;
  promo_images: string[];
  regular_price: number;
  sale_price: number;
  sales_headline: string;
  sales_body: string;
  highlights: string[];
  scarcity_text: string;
  reader_count: number;
  whatsapp_number: string;
  has_pdf: boolean;
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 2,
    slug: "paket-bundling-3-buku",
    title: "Paket Bundling 3 Buku",
    subtitle: "",
    category: "SUPER HEMAT",
    cover_url: "/Akuntansi/Paket_Bundling_3_E-Book.webp",
    promo_images: [],
    regular_price: 205000,
    sale_price: 82000,
    sales_headline: "Kuasai Akuntansi Lengkap Sekaligus Lebih Hemat!",
    sales_body: "Dapatkan akses langsung ke 3 mahakarya akuntansi sekaligus.",
    highlights: [
      "Buku 1: Logika Akuntansi (Paham akar & logika debit-kredit)",
      "Buku 2: Akuntansi Lengkap (Siklus lengkap laporan keuangan bisnis)",
      "Buku 3: Gudang Soal Akuntansi (Ratusan studi kasus & solusi)",
      "Unduh masing-masing: Diberikan 3 file PDF resmi terpisah (434 Halaman)"
    ],
    scarcity_text: "",
    reader_count: 5120,
    whatsapp_number: "+6289688113210",
    has_pdf: true
  },
  {
    id: 1,
    slug: "logika-akuntansi",
    title: "Logika Akuntansi",
    subtitle: "Bukan hanya tahu, tapi juga menguasai alur berpikirnya dengan bahasa paling sederhana",
    category: "BEST SELLER",
    cover_url: "/Akuntansi/Mockup_Buku_Logika_Akuntansi.webp",
    promo_images: [],
    regular_price: 72000,
    sale_price: 46000,
    sales_headline: "Pahami Akuntansi dari Logikanya, Bukan dari Hafalan Rumusnya!",
    sales_body: "Buku Logika Akuntansi ini dirancang khusus untuk Anda yang ingin menguasai akuntansi dari akarnya dengan bahasa yang ramah pemula.",
    highlights: [
      "Paham alur & logika debit-kredit tanpa perlu menghafal aturan kaku",
      "Kuasai persamaan dasar akuntansi dan analisis transaksi riil",
      "Praktik langsung pencatatan jurnal umum bisnis & studi kasus",
      "Bahasa santai, mudah dicerna pemula, mahasiswa, dan pemilik usaha"
    ],
    scarcity_text: "",
    reader_count: 3420,
    whatsapp_number: "+6289688113210",
    has_pdf: true
  },
  {
    id: 3,
    slug: "full-accounting",
    title: "Akuntansi Lengkap",
    subtitle: "Panduan Lengkap Penyusunan Laporan Keuangan dari Nol",
    category: "PRAKTIS & LENGKAP",
    cover_url: "/Akuntansi/Mockup_Buku_Full_Accounting_Tebal.webp",
    promo_images: [],
    regular_price: 95000,
    sale_price: 75000,
    sales_headline: "Satu Buku untuk Semua Kebutuhan Pembukuan & Laporan Bisnis!",
    sales_body: "Mulai dari pencatatan bukti transaksi hingga neraca & laba rugi.",
    highlights: [
      "Panduan lengkap siklus akuntansi dari transaksi sampai neraca akhir",
      "Contoh riil neraca lajur, jurnal penyesuaian, dan penutup",
      "Template tabel & format laporan keuangan standar industri"
    ],
    scarcity_text: "",
    reader_count: 2890,
    whatsapp_number: "+6289688113210",
    has_pdf: true
  },
  {
    id: 4,
    slug: "gudang-akuntansi",
    title: "Gudang Soal Akuntansi",
    subtitle: "Ratusan Latihan Soal & Pembahasan Kasus Akuntansi Riil",
    category: "BANK SOAL",
    cover_url: "/Akuntansi/Mockup_Buku_Gudang_Soal_Akuntansi.webp",
    promo_images: [],
    regular_price: 38000,
    sale_price: 26000,
    sales_headline: "Asah Jam Terbang Akuntansi Anda dengan Ratusan Latihan Kasus Riil!",
    sales_body: "Kumpulan soal terlengkap dari tingkat dasar hingga kasus kompleks.",
    highlights: [
      "Ratusan bank soal latihan dari jurnal hingga laporan keuangan",
      "Kunci jawaban terperinci dan langkah demi langkah pengerjaan",
      "Sangat cocok untuk persiapan ujian, sertifikasi, atau tes kerja"
    ],
    scarcity_text: "",
    reader_count: 1940,
    whatsapp_number: "+6289688113210",
    has_pdf: true
  }
];

const DEFAULT_SLOT_IMAGES = [
  "/Akuntansi/DISPLAY_1.webp",
  "/Akuntansi/DISPLAY_2.webp",
  "/Akuntansi/DISPLAY_3.webp"
];

function resolveWebpUrl(url?: string): string {
  if (!url) return "";
  if (url.includes("DISPLAY 1") || url.includes("DISPLAY_1") || url.includes("DISPLAY%201")) {
    return "/Akuntansi/DISPLAY_1.webp";
  }
  if (url.includes("DISPLAY 2") || url.includes("DISPLAY_2") || url.includes("DISPLAY%202")) {
    return "/Akuntansi/DISPLAY_2.webp";
  }
  if (url.includes("DISPLAY 3") || url.includes("DISPLAY_3") || url.includes("DISPLAY%203")) {
    return "/Akuntansi/DISPLAY_3.webp";
  }
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

const STORE_CACHE_KEY = "af_store_cache_v12";

export default function StoreFront() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [activePayment, setActivePayment] = useState<any>(null);
  const reviewsScrollRef = useRef<HTMLDivElement>(null);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);

  const scrollReviews = (direction: "left" | "right") => {
    if (reviewsScrollRef.current) {
      const scrollAmount = direction === "left" ? -220 : 220;
      reviewsScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedReview(null);
    };
    if (selectedReview) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedReview]);

  // 🚀 Instant Frame-0 Load dari Cache LocalStorage atau Default Products (Mencegah Flashing / Bug Render)
  const [settings, setSettings] = useState<any>(() => {
    try {
      const cached = localStorage.getItem(STORE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.settings) return parsed.settings;
      }
    } catch (e) {}
    return {
      store_name: "Adrien Fandra Store",
      header_title: "Adrien Fandra",
      header_subtitle: "Edukator Akuntansi",
      header_hook: "siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet",
      header_image: "",
      header_badge: "Book Now",
      slot_images: DEFAULT_SLOT_IMAGES,
      whatsapp_number: "+6289688113210"
    };
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem(STORE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.products && Array.isArray(parsed.products) && parsed.products.length > 0) {
          return parsed.products;
        }
      }
    } catch (e) {}
    return DEFAULT_PRODUCTS;
  });

  const getVisitorId = () => {
    let id = localStorage.getItem("af_store_visitor_id");
    if (!id) {
      id = "v_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
      localStorage.setItem("af_store_visitor_id", id);
    }
    return id;
  };

  const trackEvent = (eventType: string, productId?: number, productTitle?: string) => {
    try {
      fetch("/api/adrienfandra/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          productId,
          productTitle,
          visitorId: getVisitorId(),
          referrer: document.referrer || window.location.href
        })
      }).catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
    // Record real storefront page view
    trackEvent("PAGE_VIEW");

    // SWR: Fetch data terbaru di background dan simpan ke cache
    fetch("/api/adrienfandra/store-data")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.settings) setSettings(data.settings);
          if (data.products && data.products.length > 0) setProducts(data.products);
          try {
            localStorage.setItem(STORE_CACHE_KEY, JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch(err => console.error("Error loading store data:", err))
      .finally(() => setLoading(false));

    // Cek apakah ada sesi pembayaran aktif yang belum kedaluwarsa (< 30 menit)
    try {
      const raw = localStorage.getItem("adrienfandra_active_payment");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt) {
          setActivePayment(parsed);
        } else if (parsed && parsed.expiresAt && Date.now() >= parsed.expiresAt) {
          localStorage.removeItem("adrienfandra_active_payment");
        }
      }
    } catch (e) {}
  }, []);

  const slotImages = Array.isArray(settings?.slot_images) && settings.slot_images.length === 3
    ? settings.slot_images.map((s: string, idx: number) => (s && s.trim().length > 0) ? s : DEFAULT_SLOT_IMAGES[idx])
    : DEFAULT_SLOT_IMAGES;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#1D3E72] selection:text-white pb-20">
      
      {/* ⚡ BANNER TRANSAKSI AKTIF (30 MENIT) */}
      {activePayment && (
        <div className="bg-[#1D3E72] text-white px-4 py-3 sticky top-0 z-50 shadow-md animate-in slide-in-from-top duration-200">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-300 animate-pulse flex-shrink-0" />
              <span>
                Pesanan <strong>{activePayment.orderId}</strong> sedang menunggu pembayaran (Aktif 30 Menit).
              </span>
            </div>
            <Link
              href={`/adrienfandra/checkout/${activePayment.productId || 1}`}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <span>Lanjutkan Pembayaran</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          1. HEADER HERO RESMI (PRESTIGIOUS CREATOR HERO SECTION)
          ========================================================================= */}
      <section className="relative w-full bg-gradient-to-b from-white via-slate-50/70 to-[#F8FAFC] border-b border-slate-200/60 overflow-hidden">
        {/* Subtle Ambient Radial Lighting Glow Biru & Kuning */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute top-1/4 right-10 w-80 h-80 bg-amber-100/35 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="max-w-4xl mx-auto px-4 pt-6 sm:pt-10 pb-6 sm:pb-8 relative z-10">
          
          {/* DESKTOP & TABLET LAYOUT (>= md): 2-Column Balanced Hero */}
          <div className="hidden md:flex items-center justify-between gap-8">
            
            {/* Kolom Kiri: Nama, Profesi, Aksen Biru-Kuning & Aksi */}
            <div className="flex-1 space-y-5 max-w-xl">
              
              {/* Badge Kategori dengan Aksen Biru & Kuning */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-[#1D3E72]">
                  E-Book Akuntansi Interaktif
                </span>
              </div>

              {/* Nama Adrien Fandra + Centang Biru */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-4xl lg:text-5xl font-black text-[#0F2247] tracking-tight leading-tight">
                    {settings.header_title?.replace(/\.id$/i, '') || 'Adrien Fandra'}
                  </h1>
                  <CheckCircle2 className="w-7 h-7 text-sky-500 fill-sky-100 flex-shrink-0" />
                </div>
                
                {/* Subtitle / Profesi */}
                <p className="text-base lg:text-lg font-extrabold text-[#1D3E72] tracking-tight">
                  {settings.header_subtitle || "Edukator Akuntansi"}
                </p>
              </div>

              {/* Action Buttons dengan Aksen Biru & Kuning */}
              <div className="flex items-center gap-3 pt-1">
                <a
                  href="#katalog-buku"
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-[#0F2247] hover:bg-[#1D3E72] text-white font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group"
                >
                  <span>{settings?.header_badge && settings.header_badge !== "Book Now" ? settings.header_badge : "Pilih E-Book Sekarang"}</span>
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold group-hover:bg-amber-300 transition-colors">
                    <ArrowDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                </a>

                <a
                  href={`https://wa.me/${(settings?.whatsapp_number || "+6289688113210").replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Halo Kak Adrien, saya ingin tanya seputar E-Book Akuntansi.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 hover:text-[#0F2247] font-bold text-sm shadow-2xs transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  <span>Tanya Admin</span>
                </a>
              </div>

            </div>

            {/* Kolom Kanan: Foto Resmi Adrien Fandra (Cutout Berdiri Memegang Tablet) */}
            <div className="relative flex-shrink-0 w-64 lg:w-72 flex items-end justify-center">
              {/* Backlight Ambient Glow Biru & Kuning */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/15 via-amber-300/20 to-transparent rounded-full blur-2xl -z-10" />
              
              <img
                src="/adrienfandra_photos.webp"
                alt={settings.header_title || "Adrien Fandra"}
                className="w-full h-auto max-h-[320px] lg:max-h-[360px] object-contain drop-shadow-[0_15px_25px_rgba(15,34,71,0.15)] select-none pointer-events-none transition-transform duration-500 hover:scale-102"
              />
            </div>

          </div>

          {/* MOBILE LAYOUT (< md): Bersih, Ringkas, Pas di HP */}
          <div className="md:hidden space-y-3.5">
            
            {/* Top Bar: Foto Profil + Identitas Singkat dengan Aksen Biru-Kuning */}
            <div className="flex items-center gap-3.5">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-3 ring-amber-400 shadow-sm bg-gradient-to-b from-blue-50 to-slate-100 flex-shrink-0">
                <img
                  src="/adrien_avatar.webp"
                  alt={settings.header_title || "Adrien Fandra"}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <h1 className="text-xl font-black text-[#0F2247] tracking-tight truncate">
                    {settings.header_title?.replace(/\.id$/i, '') || 'Adrien Fandra'}
                  </h1>
                  <CheckCircle2 className="w-4 h-4 text-sky-500 fill-sky-100 flex-shrink-0" />
                </div>
                <p className="text-xs font-bold text-[#1D3E72] truncate">
                  {settings.header_subtitle || "Edukator Akuntansi"}
                </p>
                <div className="pt-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1D3E72] bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300/60 inline-block">
                    E-Book Akuntansi
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons Mobile */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href="#katalog-buku"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#0F2247] active:bg-[#1D3E72] text-white font-black text-xs shadow-sm cursor-pointer"
              >
                <span>{settings?.header_badge && settings.header_badge !== "Book Now" ? settings.header_badge : "Lihat E-Book"}</span>
                <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
              </a>

              <a
                href={`https://wa.me/${(settings?.whatsapp_number || "+6289688113210").replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Halo Kak Adrien, saya ingin tanya seputar E-Book Akuntansi.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tanya Admin</span>
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* 📦 MAIN CONTENT CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* =========================================================================
            2. 3 GAMBAR DISPLAY (MENYATU DALAM SATU ALUR CERITA TANPA GARIS KOTAK KAKU)
            ========================================================================= */}
        <section className="w-full bg-white rounded-3xl p-4 sm:p-7 md:p-8 shadow-sm space-y-4 sm:space-y-6 overflow-hidden">
          {slotImages.map((rawUrl: string, slotIndex: number) => {
            const imgUrl = resolveWebpUrl(rawUrl) || DEFAULT_SLOT_IMAGES[slotIndex];
            return (
              <div
                key={slotIndex}
                className={`w-full flex items-center justify-center ${
                  slotIndex === 0
                    ? "-mx-1.5 sm:-mx-3 md:-mx-4 w-[calc(100%+0.75rem)] sm:w-[calc(100%+1.5rem)] md:w-[calc(100%+2rem)] scale-[1.04] sm:scale-[1.07] transform-gpu origin-center py-1 sm:py-1.5"
                    : ""
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`Display ${slotIndex + 1}`}
                  className={`w-full h-auto block object-contain mix-blend-multiply ${
                    slotIndex === 1 ? "rounded-2xl sm:rounded-3xl" : ""
                  }`}
                  loading="eager"
                  decoding="async"
                />
              </div>
            );
          })}
        </section>

        {/* =========================================================================
            3. KATALOG E-BOOK (BERSIH DARI IKON & GARIS BERLEBIH)
            ========================================================================= */}
        <section id="katalog-buku" className="space-y-4 sm:space-y-5 pt-1">
          
          {/* Header Section */}
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <span className="text-xs font-black text-[#1D3E72] bg-blue-50/80 px-3.5 py-1 rounded-full uppercase tracking-wider inline-block">
              PILIHAN E-BOOK TERBAIK
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F2247] tracking-tight">
              Investasi Leher ke Atas Terbaik Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Pilih paket atau panduan yang Anda butuhkan. Klik pada buku untuk melihat detail isi dan langsung melakukan pembelian.
            </p>
          </div>

          {/* Daftar Kartu Produk E-Book - Borderless & Seamless */}
          <div className="space-y-5 sm:space-y-6">
            {products.length > 0 ? (
              products.map((product, idx) => {
                const regularPriceNum = Number(product.regular_price) || 0;
                const salePriceNum = Number(product.sale_price) || 0;
                const discountPercent = regularPriceNum > salePriceNum
                  ? Math.round(((regularPriceNum - salePriceNum) / regularPriceNum) * 100)
                  : 0;

                const isBundling = Number(product.id) === 2 || 
                  product.slug === "paket-bundling-3-buku" || 
                  (product.title || "").toLowerCase().includes("bundling");

                // =========================================================================
                // 1. KHUSUS PAKET BUNDLING: Judul di Atas, Gambar Landscape di Tengah,
                //    Harga & Kedua Tombol di Bawah Gambar
                // =========================================================================
                if (isBundling) {
                  return (
                    <div key={product.id} className="space-y-4 sm:space-y-5">
                      <div
                        className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                      >
                        {/* Judul di Atas Gambar */}
                        <div className="pt-6 pb-2 px-5 sm:px-6 text-center space-y-1">
                          <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0F2247] tracking-tight leading-tight">
                            {product.title}
                          </h3>
                          {product.subtitle && (
                            <p className="text-xs sm:text-sm text-slate-500 font-semibold italic max-w-xl mx-auto leading-relaxed">
                              "{product.subtitle}"
                            </p>
                          )}
                        </div>

                        {/* Gambar Landscape di Bawah Judul */}
                        <div className="w-full px-4 sm:px-8 py-2 flex items-center justify-center relative">
                          <div
                            className="relative group cursor-pointer w-full max-w-[480px] sm:max-w-[560px] flex items-center justify-center py-2"
                            onClick={() => {
                              trackEvent("PRODUCT_CLICK", product.id, product.title);
                              setLocation(`/adrienfandra/p/${product.slug || product.id}`);
                            }}
                          >
                            <img
                              src={resolveWebpUrl(product.cover_url)}
                              alt={product.title}
                              loading={idx === 0 ? "eager" : "lazy"}
                              decoding="async"
                              className="w-full h-auto max-h-[240px] sm:max-h-[300px] object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-102"
                            />
                            {discountPercent > 0 && (
                              <div className="absolute top-1 right-2 sm:top-2 sm:right-4 bg-rose-600 text-white text-[11px] sm:text-xs font-black px-3 py-1 rounded-full shadow-sm">
                                HEMAT {discountPercent}%
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Box Harga & Kedua Tombol di Bawah Gambar */}
                        <div className="p-5 sm:p-7 pt-2 space-y-3.5 max-w-xl mx-auto w-full">
                          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 flex items-baseline justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-500 block mb-0.5">Harga Spesial Hari Ini:</span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-black text-[#1D3E72]">
                                  {formatCurrency(product.sale_price)}
                                </span>
                                {Number(product.regular_price) > Number(product.sale_price) && (
                                  <span className="text-sm font-semibold text-slate-400 line-through">
                                    {formatCurrency(product.regular_price)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <Link
                              href={`/adrienfandra/p/${product.slug || product.id}`}
                              onClick={() => trackEvent("PRODUCT_CLICK", product.id, product.title)}
                              className="w-full bg-slate-100 hover:bg-slate-200 text-[#1D3E72] font-black text-xs sm:text-sm py-3 px-4 rounded-xl transition-all flex items-center justify-center shadow-xs active:scale-98 text-center"
                            >
                              Lihat Detail Isi
                            </Link>
                            <Link
                              href={`/adrienfandra/checkout/${product.id}`}
                              onClick={() => trackEvent("PRODUCT_CLICK", product.id, product.title)}
                              className="w-full bg-[#1D3E72] hover:bg-[#0F2247] text-white font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-900/20 transition-all flex items-center justify-center active:scale-98 text-center"
                            >
                              Dapatkan Sekarang
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* 💬 SEKSI REVIEW PEMBELI (KATA MEREKA) - DI BAWAH PAKET BUNDLING */}
                      <div className="pt-0.5 pb-1">
                        {/* Pembatas Tidak Terlalu Menonjol */}
                        <div className="relative flex items-center justify-center my-3 sm:my-3.5">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-200/90" />
                          </div>
                          <div className="relative bg-[#F8FAFC] px-3.5 py-0.5 flex items-center gap-1.5 text-slate-500 font-extrabold text-xs tracking-wide select-none">
                            <span>Ini kata mereka</span>
                            <span className="text-sm">👇</span>
                          </div>
                        </div>

                        {/* List Foto Berjejer ke Kanan (Bisa Digulir Kanan Kiri, Ukuran Ringkas & Pas) */}
                        <div className="relative group/reviews">
                          {/* Tombol Gulir Desktop */}
                          <button
                            type="button"
                            onClick={() => scrollReviews("left")}
                            className="hidden md:flex absolute -left-2.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 border border-slate-200 shadow-md items-center justify-center text-slate-600 hover:text-[#1D3E72] hover:bg-slate-50 transition-all opacity-0 group-hover/reviews:opacity-100 cursor-pointer"
                            aria-label="Geser ke kiri"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollReviews("right")}
                            className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 border border-slate-200 shadow-md items-center justify-center text-slate-600 hover:text-[#1D3E72] hover:bg-slate-50 transition-all opacity-0 group-hover/reviews:opacity-100 cursor-pointer"
                            aria-label="Geser ke kanan"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          {/* Track Scroll Horizontal */}
                          <div
                            ref={reviewsScrollRef}
                            className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto scroll-smooth py-1 px-1 snap-x snap-mandatory"
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
                          >
                            {REVIEW_ITEMS.map((rev) => (
                              <div
                                key={rev.id}
                                onClick={() => setSelectedReview(rev.src)}
                                className="flex-shrink-0 w-28 sm:w-32 md:w-36 aspect-square rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer group/card snap-start relative"
                                title="Klik untuk memperbesar review"
                              >
                                <img
                                  src={rev.src}
                                  alt={rev.alt}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-104"
                                  onError={(e: any) => {
                                    if (e.target.src !== rev.fallback) {
                                      e.target.src = rev.fallback;
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-slate-900/0 group-hover/card:bg-slate-900/10 transition-colors flex items-center justify-center">
                                  <span className="opacity-0 group-hover/card:opacity-100 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs transition-opacity shadow-xs">
                                    Buka
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // =========================================================================
                // 2. SEMUA E-BOOK TUNGGAL (BUKAN BUNDLING):
                //    Gambar di Kiri, Judul di Bagian Kanan Beserta Kedua Tombol
                // =========================================================================
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-4 sm:p-6 md:p-7 flex flex-row items-center gap-3.5 sm:gap-6 md:gap-8">
                      
                      {/* GAMBAR DI KIRI */}
                      <div className="w-[36%] sm:w-[32%] md:w-[28%] flex-shrink-0 flex items-center justify-center relative">
                        <div
                          className="relative group cursor-pointer w-full flex items-center justify-center py-1"
                          onClick={() => {
                            trackEvent("PRODUCT_CLICK", product.id, product.title);
                            setLocation(`/adrienfandra/p/${product.slug || product.id}`);
                          }}
                        >
                          <img
                            src={resolveWebpUrl(product.cover_url)}
                            alt={product.title}
                            loading={idx === 0 ? "eager" : "lazy"}
                            decoding="async"
                            className="w-full h-auto max-h-[175px] sm:max-h-[220px] md:max-h-[260px] object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                          />
                          {discountPercent > 0 && (
                            <div className="absolute top-0 right-0 sm:top-1 sm:right-1 bg-rose-600 text-white text-[9px] sm:text-xs font-black px-1.5 sm:px-2.5 py-0.5 rounded-full shadow-xs">
                              HEMAT {discountPercent}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* JUDUL, HARGA, & KEDUA TOMBOL DI KANAN */}
                      <div className="w-[64%] sm:w-[68%] md:w-[72%] flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-3.5">
                        
                        {/* Judul & Subtitle */}
                        <div className="space-y-0.5 sm:space-y-1">
                          <h3 
                            onClick={() => {
                              trackEvent("PRODUCT_CLICK", product.id, product.title);
                              setLocation(`/adrienfandra/p/${product.slug || product.id}`);
                            }}
                            className="text-sm sm:text-xl md:text-2xl font-black text-[#0F2247] tracking-tight leading-snug cursor-pointer hover:text-[#1D3E72] transition-colors"
                          >
                            {product.title}
                          </h3>
                          {product.subtitle && (
                            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold italic line-clamp-2 leading-tight sm:leading-relaxed">
                              "{product.subtitle}"
                            </p>
                          )}
                        </div>

                        <div className="p-2 sm:p-3 rounded-xl bg-slate-50/90">
                          <span className="text-[9px] sm:text-xs font-bold text-slate-500 block leading-tight">Harga Spesial Hari Ini:</span>
                          <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5">
                            <span className="text-base sm:text-2xl font-black text-[#1D3E72]">
                              {formatCurrency(product.sale_price)}
                            </span>
                            {Number(product.regular_price) > Number(product.sale_price) && (
                              <span className="text-[11px] sm:text-sm font-semibold text-slate-400 line-through">
                                {formatCurrency(product.regular_price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Kedua Tombol */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2.5 pt-0.5">
                          <Link
                            href={`/adrienfandra/p/${product.slug || product.id}`}
                            onClick={() => trackEvent("PRODUCT_CLICK", product.id, product.title)}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-[#1D3E72] font-black text-[11px] sm:text-xs md:text-sm py-2 sm:py-2.5 md:py-3 px-2 sm:px-3 rounded-xl transition-all flex items-center justify-center shadow-xs active:scale-98 text-center"
                          >
                            Lihat Detail Isi
                          </Link>

                          <Link
                            href={`/adrienfandra/checkout/${product.id}`}
                            onClick={() => trackEvent("PRODUCT_CLICK", product.id, product.title)}
                            className="w-full bg-[#1D3E72] hover:bg-[#0F2247] text-white font-black text-[11px] sm:text-xs md:text-sm py-2 sm:py-2.5 md:py-3 px-2 sm:px-3 rounded-xl shadow-md shadow-blue-900/20 transition-all flex items-center justify-center active:scale-98 text-center"
                          >
                            Dapatkan Sekarang
                          </Link>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl shadow-sm p-8">
                <h3 className="font-bold text-slate-700">Katalog E-Book Sedang Disiapkan</h3>
                <p className="text-xs text-slate-400 mt-1">Silakan cek kembali beberapa saat lagi.</p>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* 📱 FOOTER */}
      <footer className="max-w-4xl mx-auto px-4 pt-12 text-center text-xs text-slate-400 space-y-2">
        <p className="font-semibold text-slate-600">
          &copy; 2026 {settings.store_name || "Adrien Fandra Store"}
        </p>
      </footer>

      {/* 🔍 LIGHTBOX MODAL PREVIEW REVIEW FULL-SCREEN */}
      {selectedReview && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="relative max-w-sm sm:max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-2.5 sm:p-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedReview(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
              aria-label="Tutup preview"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center max-h-[75vh]">
              <img
                src={selectedReview}
                alt="Detail Review Pembeli"
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>
            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-500 font-semibold">
                Sentuh di luar gambar atau tombol silang untuk menutup
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
