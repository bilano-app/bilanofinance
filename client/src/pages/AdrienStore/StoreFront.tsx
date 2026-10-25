import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Clock, ArrowRight } from "lucide-react";

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
    regular_price: 204000,
    sale_price: 99000,
    sales_headline: "Kuasai Akuntansi Lengkap Sekaligus Lebih Hemat!",
    sales_body: "Dapatkan akses langsung ke 3 mahakarya akuntansi sekaligus.",
    highlights: [
      "Buku 1: Akuntansi pakai Bahasa Bayi (Paham akar & logika debit-kredit)",
      "Buku 2: Akuntansi Tuntas (Siklus lengkap laporan keuangan bisnis)",
      "Buku 3: Gudang Soal Akuntansi (Ratusan studi kasus & solusi)",
      "Unduh masing-masing: Diberikan 3 file PDF resmi terpisah"
    ],
    scarcity_text: "",
    reader_count: 5120,
    whatsapp_number: "+6289688113210",
    has_pdf: true
  },
  {
    id: 1,
    slug: "logika-akuntansi",
    title: "Akuntansi pakai Bahasa Bayi",
    subtitle: "Bukan hanya tahu, tapi juga menguasai alur berpikirnya dengan bahasa paling sederhana",
    category: "BEST SELLER",
    cover_url: "/Akuntansi/Akuntansi_pakai_Bahasa_Bayi.webp",
    promo_images: [],
    regular_price: 77000,
    sale_price: 59000,
    sales_headline: "Pahami Akuntansi dari Logikanya, Bukan dari Hafalan Rumusnya!",
    sales_body: "Buku ini dirancang khusus untuk Anda yang ingin menguasai akuntansi dari akarnya dengan bahasa yang ramah pemula.",
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
    title: "Akuntansi Tuntas",
    subtitle: "Panduan Lengkap Penyusunan Laporan Keuangan dari Nol",
    category: "PRAKTIS & LENGKAP",
    cover_url: "/Akuntansi/Akuntansi_Tuntas.webp",
    promo_images: [],
    regular_price: 93000,
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
    cover_url: "/Akuntansi/Gudang_Soal_Akuntansi.webp",
    promo_images: [],
    regular_price: 34000,
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
  if (url.includes("Bahasa Bayi") || url.includes("Bahasa_Bayi") || url.includes("bayi")) {
    return "/Akuntansi/Akuntansi_pakai_Bahasa_Bayi.webp";
  }
  if (url.includes("Tuntas") || url.includes("tuntas")) {
    return "/Akuntansi/Akuntansi_Tuntas.webp";
  }
  if (url.includes("Gudang Soal") || url.includes("Gudang_Soal") || url.includes("gudang")) {
    return "/Akuntansi/Gudang_Soal_Akuntansi.webp";
  }
  if (url.includes("Bundling") || url.includes("bundling") || url.includes("E-Book") || url.includes("Interaktif")) {
    return "/Akuntansi/Paket_Bundling_3_E-Book.webp";
  }
  if (url.includes("Logika")) {
    return "/Akuntansi/Akuntansi_pakai_Bahasa_Bayi.webp";
  }
  if (url.includes("Full")) {
    return "/Akuntansi/Akuntansi_Tuntas.webp";
  }
  if (url.endsWith(".png") && url.includes("/Akuntansi/")) {
    return url.replace(/\.png$/, ".webp").replace(/\s+/g, "_");
  }
  return url;
}

const STORE_CACHE_KEY = "af_store_cache_v7";

export default function StoreFront() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [activePayment, setActivePayment] = useState<any>(null);

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
          1. HEADER ATAS SEPERTI REFERENSI (SCREENSHOT 4) - BISA DIUBAH DI MANAGER
          ========================================================================= */}
      <section className="relative w-full bg-white shadow-xs overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 relative">
          
          {/* Background Image / Banner Area jika ada */}
          {settings.header_image ? (
            <div className="absolute inset-0 z-0 opacity-25">
              <img src={settings.header_image} alt="Header Banner" className="w-full h-full object-cover object-right" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
            </div>
          ) : (
            /* Default Subtle Speaking Stage / Seminar Backdrop */
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-15 pointer-events-none hidden sm:block">
              <div className="w-full h-full bg-gradient-to-l from-slate-400/30 to-transparent"></div>
            </div>
          )}

          {/* Konten Teks Header */}
          <div className="relative z-10 max-w-xl space-y-3">
            
            {/* Logo / Brand Header */}
            <div className="inline-flex items-center text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              <span>{settings.header_title?.replace(/\.id$/i, '') || 'Adrien Fandra'}</span>
            </div>

            {/* Subtitle / Nama & Profesi */}
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
              {settings.header_subtitle || "Edukator Akuntansi"}
            </h2>

            {/* Hook Text */}
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-sm">
              {settings.header_hook || "siap bantu lo semua untuk kuasai akuntansi & laporan keuangan bisnis tanpa ribet"}
            </p>
          </div>

          {/* Floating Badge di Kanan Bawah Header (Seperti "Book Now" pada Referensi) */}
          <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-6 z-10">
            <a
              href="#katalog-buku"
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-slate-950 text-white flex flex-col items-center justify-center text-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              <span className="font-extrabold text-[11px] sm:text-xs leading-tight">
                {settings.header_badge || "Book Now"}
              </span>
            </a>
          </div>

        </div>
      </section>

      {/* 📦 MAIN CONTENT CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* =========================================================================
            2. 3 GAMBAR DISPLAY (MENYATU DALAM SATU ALUR CERITA TANPA GARIS KOTAK KAKU)
            ========================================================================= */}
        <section className="w-full bg-white rounded-3xl p-4 sm:p-7 md:p-8 shadow-sm space-y-4 sm:space-y-6">
          {slotImages.map((rawUrl: string, slotIndex: number) => {
            const imgUrl = resolveWebpUrl(rawUrl) || DEFAULT_SLOT_IMAGES[slotIndex];
            return (
              <div
                key={slotIndex}
                className="w-full flex items-center justify-center"
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
                    <div
                      key={product.id}
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
                            Beli Sekarang
                          </Link>
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

                        {/* Box Harga */}
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
                            Beli Sekarang
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
    </div>
  );
}
