import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { 
  ArrowLeft, MessageCircle, Zap, CheckCircle2, Star, 
  ShieldCheck, Clock, Users, BookOpen, ChevronRight,
  Flame, Award, Sparkles, Share2, Check, AlertCircle
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

export default function ProductDetail() {
  const [, params] = useRoute("/adrienfandra/p/:id");
  const [, setLocation] = useLocation();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [copied, setCopied] = useState(false);

  const productIdOrSlug = params?.id;

  useEffect(() => {
    if (!productIdOrSlug) return;
    setLoading(true);
    fetch(`/api/adrienfandra/products/${productIdOrSlug}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.product) {
          setProduct(data.product);
        }
      })
      .catch(err => console.error("Error loading product detail:", err))
      .finally(() => setLoading(false));
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
  const discountPercent = product.regular_price > product.sale_price
    ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
    : 0;

  // Daftar slide visual (cover + promo images tambahan)
  const slides = [
    product.cover_url || "/placeholder-cover",
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
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
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

      {/* 📱 DETAIL SALES LETTER CONTAINER */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-6">
        
        {/* =========================================================================
            1. JUDUL PRODUK & HOOK UTAMA
            ========================================================================= */}
        <div className="text-left space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-[#0F2247] tracking-tight leading-tight">
            {product.title}
          </h1>
          {product.subtitle && (
            <p className="text-xs text-slate-500 font-medium">
              {product.subtitle}
            </p>
          )}
        </div>

        {/* =========================================================================
            2. IMAGE GALLERY / SLIDER (DENGAN INDIKATOR TITIK 4 TITIK SEPERTI REFERENSI)
            ========================================================================= */}
        <div className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 p-6 flex items-center justify-center min-h-[300px] shadow-xs">
            
            {/* Slide Visual */}
            {slides.length > 0 && slides[activeSlide] !== "/placeholder-cover" ? (
              <img
                src={slides[activeSlide]}
                alt={`${product.title} slide ${activeSlide + 1}`}
                className="max-h-72 w-auto object-contain rounded-xl shadow-lg transition-all duration-300"
              />
            ) : (
              /* High-Converting Dummy Book Cover Visual */
              <div className="w-full flex flex-col items-center justify-center text-center py-4 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-rose-600 tracking-widest bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                    EDISI SPESIAL LENGKAP
                  </span>
                  <h3 className="text-3xl font-black text-[#0F2247] tracking-tight">
                    Paket <span className="text-rose-600">Bundling</span>
                  </h3>
                  <div className="text-5xl font-black text-slate-900 tracking-tighter">
                    4 in 1
                  </div>
                  <p className="text-xs italic font-bold text-slate-600 max-w-[260px]">
                    Dari nol pencatatan jurnal sampai bisa bikin Laporan Keuangan <span className="font-black text-[#0F2247] uppercase">RAPI & PROFESIONAL</span>
                  </p>
                </div>

                {/* 4 Dummy Book Spine Representation (Akuntansi) */}
                <div className="flex items-end justify-center gap-1.5 pt-2">
                  {[
                    { title: "Dasar Akuntansi & Jurnal Umum", bg: "bg-slate-800 text-white" },
                    { title: "Buku Besar & Neraca Saldo", bg: "bg-slate-900 text-[#F6B93B]" },
                    { title: "Laba Rugi & Arus Kas Bisnis", bg: "bg-blue-900 text-white" },
                    { title: "Analisis Keuangan & Pajak UMKM", bg: "bg-[#0F2247] text-white" }
                  ].map((bk, i) => (
                    <div key={i} className={`w-14 sm:w-16 h-24 sm:h-28 rounded-t-md p-1.5 shadow-md flex flex-col justify-between text-left text-[8px] font-black border border-white/20 ${bk.bg}`}>
                      <span className="line-clamp-2 leading-tight">{bk.title}</span>
                      <span className="text-[6px] opacity-70">VOL.{i+1}</span>
                    </div>
                  ))}
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
                    ? "w-5 h-2 bg-emerald-500" 
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
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
              <span className="font-black text-[#0F2247]">{product.title.split(":")[0] || "E-Book"}</span> ini dibuat buat lo yang
            </h2>
            <div className="text-sm sm:text-base font-bold text-slate-800 leading-snug">
              Sebenernya punya bisnis/kerja tapi sering ngerasa pembukuan & laporan keuangan{" "}
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded-sm font-black whitespace-nowrap">
                Pusing & Berantakan!
              </span>
            </div>
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
            4. SOCIAL PROOF / TESTIMONIALS (PERSIS SEPERTI GAMBAR REFERENSI 3)
            ========================================================================= */}
        <section className="pt-4 border-t border-slate-100 space-y-4 text-center">
          
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-600">
              Mereka Sudah Membuktikan
            </h3>
            <div className="text-lg font-black text-[#0F2247]">
              Sekarang Giliran lo !
            </div>
          </div>

          {/* Testimonial Bubbles */}
          <div className="space-y-3 text-left">
            {(product.testimonials && product.testimonials.length > 0 ? product.testimonials : [
              {
                name: "Arif Hady",
                comment: "Buku akuntansi paling praktis yang pernah saya baca! Pembukuan usaha kuliner saya langsung rapi dan gak bocor lagi. Makasih ilmunya bang! 🔥🔥",
                role: "Owner Bisnis Kuliner & Entrepreneur"
              },
              {
                name: "Fadhil R.",
                comment: "Penjelasan debit-kreditnya simpel banget, langsung paham alur laporan keuangan tahunan dan closing bulanan jadi cepet.",
                role: "Finance & Accounting Officer"
              },
              {
                name: "Dedi A.",
                comment: "Dulu buta angka keuangan bisnis, sekarang bisa bikin neraca dan tahu profit bersih riil tiap bulan tanpa bingung.",
                role: "UMKM Founder"
              },
              {
                name: "Zahra N.",
                comment: "Sangat aplikatif buat mahasiswa & staf akuntansi pemula, ada template spreadsheet siap contek yang kepake banget di kantor!",
                role: "Junior Accountant"
              }
            ]).map((t, idx) => (
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
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  "{t.comment}"
                </p>
              </div>
            ))}
          </div>

          {/* Stat Pembaca Counter (Image 3) */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-left">
            <div>
              <span className="text-xs font-bold text-slate-700 block">
                Buku ini Sudah Di Baca oleh
              </span>
              <span className="text-base font-black text-[#1D3E72]">
                {(product.reader_count || 4310).toLocaleString("id-ID")}+ Pembaca
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Lifetime Orders</span>
              <span className="text-sm font-black text-slate-700">4,310</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. KOTAK HARGA & AKSES LANGSUNG
            ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-2 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Harga E-Book
          </span>
          <div className="text-3xl font-black text-[#1D3E72]">
            {formatCurrency(product.sale_price)}
          </div>
          {product.regular_price > product.sale_price && (
            <div className="text-xs font-bold text-slate-400 line-through">
              {formatCurrency(product.regular_price)}
            </div>
          )}
          <p className="text-[11px] text-slate-500 pt-1">
            File PDF dikirim otomatis ke email & bisa langsung diunduh setelah pembayaran.
          </p>
        </div>

      </main>

      {/* =========================================================================
          🚀 STICKY BOTTOM ACTION BAR (SESUAI REQUEST USER: WHATSAPP + BUY NOW TANPA KERANJANG)
          ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-2xl p-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          
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
          </Link>

        </div>
      </div>

    </div>
  );
}
