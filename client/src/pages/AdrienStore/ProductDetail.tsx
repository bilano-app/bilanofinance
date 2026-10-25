import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { 
  ArrowLeft, MessageCircle, Zap, CheckCircle2, Star, 
  ShieldCheck, Clock, Users, BookOpen, ChevronRight,
  Flame, Award, Sparkles, Share2, Check, AlertCircle, ArrowRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Testimonial {
  name: string;
  role?: string;
  comment: string;
  rating?: number;
  avatar?: string;
}

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
  testimonials: Testimonial[];
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
    testimonials: [],
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
    testimonials: [],
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
    testimonials: [],
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
    testimonials: [],
    scarcity_text: "",
    reader_count: 1940,
    whatsapp_number: "+6289688113210",
    has_pdf: true
  }
];

export default function ProductDetail() {
  const [, params] = useRoute("/adrienfandra/p/:id");
  const [, setLocation] = useLocation();
  const productIdOrSlug = params?.id;
  
  // 🚀 Instant Frame-0 Load dari Cache atau Fallback Produk (Menghilangkan Loading Spinner)
  const [product, setProduct] = useState<Product | null>(() => {
    if (!productIdOrSlug) return null;
    try {
      const cached = localStorage.getItem("af_store_cache_v9") || localStorage.getItem("af_store_cache_v8") || localStorage.getItem("af_store_cache_v7");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.products) {
          const found = parsed.products.find((p: any) => 
            String(p.id) === String(productIdOrSlug) || p.slug === productIdOrSlug
          );
          if (found) return found;
        }
      }
    } catch (e) {}
    return DEFAULT_PRODUCTS.find(p => String(p.id) === String(productIdOrSlug) || p.slug === productIdOrSlug) || null;
  });

  const [loading, setLoading] = useState(() => !product);
  const [activeSlide, setActiveSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activePayment, setActivePayment] = useState<any>(null);

  const getVisitorId = () => {
    let id = localStorage.getItem("af_store_visitor_id");
    if (!id) {
      id = "v_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
      localStorage.setItem("af_store_visitor_id", id);
    }
    return id;
  };

  const trackEvent = (eventType: string, pId?: number, pTitle?: string) => {
    try {
      fetch("/api/adrienfandra/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          productId: pId,
          productTitle: pTitle,
          visitorId: getVisitorId(),
          referrer: document.referrer || window.location.href
        })
      }).catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!productIdOrSlug) return;
    if (!product) setLoading(true);

    fetch(`/api/adrienfandra/products/${productIdOrSlug}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.product) {
          setProduct(data.product);
          trackEvent("PRODUCT_CLICK", data.product.id, data.product.title);
        }
      })
      .catch(err => console.error("Error loading product detail:", err))
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
  }, [productIdOrSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-600">Memuat Detail E-Book...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">E-Book Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 mb-6">Produk ini mungkin telah dinonaktifkan atau tautan yang Anda buka tidak sesuai.</p>
        <Link href="/adrienfandra" className="bg-[#1D3E72] text-white px-6 py-2.5 rounded-full font-bold text-xs">
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  const whatsappNum = (product.whatsapp_number || "+6289688113210").replace(/[^0-9]/g, "");
  const regularPriceNum = Number(product.regular_price) || 0;
  const salePriceNum = Number(product.sale_price) || 0;
  const discountPercent = regularPriceNum > salePriceNum
    ? Math.round(((regularPriceNum - salePriceNum) / regularPriceNum) * 100)
    : 0;

  const isBundling = Number(product.id) === 2 || product.slug === "paket-bundling-3-buku";

  const resolveWebpUrl = (url: string) => {
    if (!url) return "";
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
    return url;
  };

  // Daftar slide visual (cover + promo images tambahan)
  const slides = [
    resolveWebpUrl(product.cover_url || "/placeholder-cover"),
    ...(product.promo_images || [])
  ].filter(Boolean);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: product.subtitle || product.title,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappShareText = encodeURIComponent(
    `Halo Mas Adrien, saya tertarik dengan e-book "${product.title}" (${formatCurrency(product.sale_price)}) di bilano.app/adrienfandra. Boleh tanya lebih lanjut?`
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#1D3E72] selection:text-white pb-28">
      
      {/* 🧭 TOP APP BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/adrienfandra"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <span className="font-extrabold text-xs text-slate-700 tracking-tight line-clamp-1 max-w-[200px]">
            {product.title}
          </span>

          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors relative"
            title="Bagikan Tautan"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ⚡ BANNER TRANSAKSI AKTIF (30 MENIT) */}
      {activePayment && (
        <div className="bg-[#1D3E72] text-white px-4 py-2.5 sticky top-[57px] z-30 shadow-md animate-in slide-in-from-top duration-200">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="w-3.5 h-3.5 text-amber-300 animate-pulse flex-shrink-0" />
              <span className="truncate">Tagihan aktif ({activePayment.orderId})</span>
            </div>
            <Link
              href={`/adrienfandra/checkout/${activePayment.productId || 1}`}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-colors flex-shrink-0"
            >
              <span>Bayar</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* 📱 DETAIL SALES LETTER CONTAINER */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-6">
        
        {/* =========================================================================
            1. JUDUL PRODUK & HOOK UTAMA
            ========================================================================= */}
        <div className="text-left space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-[#0F2247] tracking-tight leading-tight">
            {product.title}
          </h1>
          {product.subtitle && !isBundling && (
            <p className="text-xs text-slate-500 font-medium">
              {product.subtitle}
            </p>
          )}
        </div>

        {/* =========================================================================
            2. IMAGE GALLERY / SLIDER (DENGAN INDIKATOR TITIK 4 TITIK SEPERTI REFERENSI)
            ========================================================================= */}
        <div className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 p-4 sm:p-6 flex items-center justify-center min-h-[300px] sm:min-h-[380px] shadow-sm">
            
            {/* Slide Visual */}
            {slides.length > 0 && slides[activeSlide] !== "/placeholder-cover" ? (
              <img
                src={slides[activeSlide]}
                alt={`${product.title} slide ${activeSlide + 1}`}
                loading="eager"
                decoding="async"
                className="max-h-72 sm:max-h-[360px] md:max-h-[400px] w-auto max-w-full object-contain mix-blend-multiply transition-all duration-300 hover:scale-102"
              />
            ) : (
              /* High-Converting Book Cover Visual */
              <div className="w-full flex flex-col items-center justify-center text-center py-4 space-y-4">
                <div className="w-56 sm:w-64 md:w-72 h-80 sm:h-96 md:h-[420px] bg-gradient-to-br from-[#1D3E72] via-[#2563EB] to-[#0F2247] rounded-3xl shadow-2xl p-7 text-white flex flex-col justify-between relative overflow-hidden border-2 border-white/20">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/20 border-r border-white/10"></div>
                  
                  <div className="relative z-10 pl-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#F6B93B] block">BILANO E-BOOK</span>
                    <span className="text-xs font-bold text-blue-200 uppercase">{product.category || "EDISI RESMI"}</span>
                  </div>

                  <div className="relative z-10 pl-2 my-auto">
                    <h4 className="font-black text-xl sm:text-2xl leading-snug line-clamp-3 text-white">
                      {product.title}
                    </h4>
                    {product.subtitle && (
                      <p className="text-xs text-blue-100 line-clamp-2 mt-2 opacity-90">
                        {product.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 pl-2 text-xs text-blue-200 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="font-semibold">Adrien Fandra</span>
                    <span className="font-extrabold text-[#F6B93B]">PDF HD</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Panah Navigasi Slide jika lebih dari 1 */}
            {slides.length > 1 && (
              <>
                <button
                  onClick={() => setActiveSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 flex items-center justify-center shadow-md text-xs font-bold"
                >
                  ‹
                </button>
                <button
                  onClick={() => setActiveSlide((prev) => (prev < slides.length - 1 ? prev + 1 : 0))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 flex items-center justify-center shadow-md text-xs font-bold"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Dots Indicator Pagination */}
          <div className="flex items-center justify-center gap-1.5 py-1">
            {(slides.length > 0 ? slides : [1, 2, 3, 4]).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`transition-all duration-300 rounded-full ${
                  activeSlide === idx 
                    ? "w-5 h-2 bg-[#1D3E72]" 
                    : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        </div>

        {/* =========================================================================
            3. COPYWRITING TEKS GEDE & PENJELASAN (PERSIS SEPERTI GAMBAR REFERENSI 2)
            ========================================================================= */}
        <div className="space-y-4 text-center">
          <div className="space-y-2">
            {product.sales_headline ? (
              <h2 className="text-base sm:text-lg font-black text-[#0F2247] leading-snug">
                {product.sales_headline}
              </h2>
            ) : (
              <>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                  <span className="font-black text-[#0F2247]">{product.title}</span> ini dibuat buat lo yang
                </h2>
                <div className="text-sm sm:text-base font-bold text-slate-800 leading-snug">
                  Sebenernya punya bisnis/kerja tapi sering ngerasa pembukuan & laporan keuangan{" "}
                  <span className="bg-rose-600 text-white px-2 py-0.5 rounded-sm font-black whitespace-nowrap">
                    Pusing & Berantakan!
                  </span>
                </div>
              </>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
            {product.sales_body || "Lewat e-book ini, lo gak cuma belajar teori akuntansi membosankan, tapi diajak praktek langsung: dari mencatat transaksi harian hingga menyusun laporan laba rugi dan neraca keuangan yang rapi dan akurat."}
          </p>

          {/* 🟡 KOTAK KUNING HIGHLIGHT (PERSIS SEPERTI GAMBAR 2) */}
          <div className="bg-[#FFEB3B] text-slate-950 p-4 rounded-xl text-left space-y-2 shadow-sm font-bold text-xs sm:text-sm">
            {(product.highlights && product.highlights.length > 0 ? product.highlights : [
              "Paham debit & kredit serta susun jurnal umum tanpa bingung",
              "Bisa susun Laporan Laba Rugi & Neraca dalam hitungan menit",
              "Deteksi kebocoran uang kas & operasional bisnis sejak dini",
              "Template spreadsheet & studi kasus riil siap contek langsung pakai"
            ]).map((hl, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-900 text-base leading-none">•</span>
                <span>{hl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* =========================================================================
            4. SOCIAL PROOF / TESTIMONIALS (HANYA MUNCUL JIKA ADA ULASAN ASLI)
            ========================================================================= */}
        {product.testimonials && product.testimonials.length > 0 && (
          <section className="pt-4 border-t border-slate-100 space-y-4 text-center">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-600">
                Ulasan Pembaca
              </h3>
              <div className="text-lg font-black text-[#0F2247]">
                Apa Kata Mereka yang Sudah Membaca
              </div>
            </div>

            {/* Testimonial Bubbles */}
            <div className="space-y-3 text-left">
              {product.testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-[#1D3E72] font-black text-[10px] flex items-center justify-center">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-800 block leading-tight">{t.name}</span>
                        {t.role && <span className="text-[10px] text-slate-400 font-medium">{t.role}</span>}
                      </div>
                    </div>
                    {t.rating && (
                      <div className="flex text-amber-400">
                        {[...Array(t.rating)].map((_, s) => (
                          <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 italic leading-relaxed">
                    "{t.comment}"
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            5. KOTAK HARGA & RINCIAN (SUBTOTAL, DISKON, TOTAL)
            ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xs">
          <span className="text-xs font-black text-[#1D3E72] bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
            Rincian Harga Spesial
          </span>
          
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-left">
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 font-semibold">
              <span>Subtotal (Harga Normal)</span>
              <span className="line-through text-slate-400 font-bold">{formatCurrency(product.regular_price)}</span>
            </div>
            {regularPriceNum > salePriceNum && (
              <div className="flex items-center justify-between text-xs sm:text-sm text-rose-600 font-bold">
                <span>Diskon Spesial {discountPercent > 0 ? `(${discountPercent}%)` : ""}</span>
                <span>-{formatCurrency(regularPriceNum - salePriceNum)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
              <div>
                <span className="text-xs sm:text-sm font-black text-[#0F2247] block">Total Pembayaran</span>
                {regularPriceNum > salePriceNum && (
                  <span className="text-[10px] text-emerald-600 font-bold">Hemat {formatCurrency(regularPriceNum - salePriceNum)}</span>
                )}
              </div>
              <span className="text-2xl sm:text-3xl font-black text-[#1D3E72]">{formatCurrency(product.sale_price)}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center pt-1">
            File PDF dikirim otomatis ke email & bisa langsung diunduh setelah pembayaran.
          </p>
        </div>

      </main>

      {/* =========================================================================
          🚀 STICKY BOTTOM ACTION BAR (SESUAI REQUEST USER: WHATSAPP + BUY NOW TANPA KERANJANG)
          ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-2xl p-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          
          {/* Tombol WhatsApp (Ikon Hijau) */}
          <a
            href={`https://wa.me/${whatsappNum}?text=${whatsappShareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-13 h-13 rounded-2xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center flex-shrink-0 transition-colors shadow-sm active:scale-95"
            title="Chat WhatsApp"
          >
            <MessageCircle className="w-6 h-6 fill-emerald-500 text-emerald-500" />
          </a>

          {/* Tombol BUY NOW (Langsung ke Checkout - Tanpa Keranjang Sesuai Instruksi User) */}
          <Link
            href={`/adrienfandra/checkout/${product.id}`}
            className="flex-1 h-13 bg-gradient-to-r from-[#1D3E72] via-[#2563EB] to-[#1D3E72] hover:opacity-95 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-900/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <span>BUY NOW</span>
            <span className="text-xs text-blue-200 font-bold">• {formatCurrency(product.sale_price)}</span>
            {Number(product.regular_price) > Number(product.sale_price) && (
              <span className="text-[11px] text-blue-300 line-through">
                {formatCurrency(product.regular_price)}
              </span>
            )}
          </Link>

        </div>
      </div>

    </div>
  );
}
