import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";

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

export default function StoreFront() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({
    store_name: "Adrien Fandra Store",
    header_title: "AdrienFandra.id",
    header_subtitle: "Adrien Fandra | Tips & Praktik Akuntansi Bisnis",
    header_hook: "siap bantu lo semua untuk jago akuntansi & kuasai laporan keuangan tanpa ribet",
    header_image: "",
    header_badge: "Book Now",
    slot_images: ["", "", ""],
    whatsapp_number: "+6289688113210"
  });
  const [products, setProducts] = useState<Product[]>([]);

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

    fetch("/api/adrienfandra/store-data")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.settings) setSettings(data.settings);
          if (data.products) setProducts(data.products);
        }
      })
      .catch(err => console.error("Error loading store data:", err))
      .finally(() => setLoading(false));
  }, []);

  const slotImages = Array.isArray(settings.slot_images) ? settings.slot_images : ["", "", ""];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#1D3E72] selection:text-white pb-20">
      
      {/* =========================================================================
          1. HEADER ATAS SEPERTI REFERENSI (SCREENSHOT 4) - BISA DIUBAH DI MANAGER
          ========================================================================= */}
      <section className="relative w-full bg-white border-b border-slate-200 overflow-hidden">
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
              <span>{settings.header_title?.replace('.id', '') || 'AdrienFandra'}</span>
              <span className="bg-[#F6B93B] text-slate-950 px-1.5 py-0.5 rounded-sm ml-1 text-2xl sm:text-3xl">
                .id
              </span>
            </div>

            {/* Subtitle / Nama & Profesi */}
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
              {settings.header_subtitle || "Adrien Fandra | Praktisi & Konsultan Akuntansi"}
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
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-8">
        
        {/* =========================================================================
            2. 3 RUANG KOTAK GAMBAR HORIZONTAL KE BAWAH (SLOT 1, SLOT 2, SLOT 3)
            (Sesuai Instruksi: 3 ke bawah, Gambar 1 di atas, Gambar 2 di bawahnya, dst. dan kosongkan)
            ========================================================================= */}
        <section className="space-y-4">
          {[0, 1, 2].map((slotIndex) => {
            const imgUrl = slotImages[slotIndex];
            return (
              <div
                key={slotIndex}
                className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-white transition-all duration-300 min-h-[120px] sm:min-h-[160px] flex items-center justify-center shadow-xs"
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={`Gambar ${slotIndex + 1}`}
                    className="w-full h-auto max-h-[300px] object-cover"
                  />
                ) : (
                  /* Kotak Kosong Bersih Siap Pasang Gambar */
                  <div className="w-full h-28 sm:h-36 bg-slate-50 border-2 border-dashed border-slate-200/80 rounded-2xl flex items-center justify-center">
                    <span className="text-[11px] font-bold text-slate-300">
                      Ruang Gambar #{slotIndex + 1}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* =========================================================================
            3. KATALOG E-BOOK (BERSIH DARI IKON BERLEBIH)
            ========================================================================= */}
        <section id="katalog-buku" className="space-y-6 pt-2">
          
          {/* Header Section Tanpa Ikon */}
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <span className="text-xs font-extrabold text-[#1D3E72] bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full uppercase tracking-wider">
              PILIHAN E-BOOK TERBAIK
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F2247] tracking-tight">
              Investasi Leher ke Atas Terbaik Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Pilih paket atau panduan yang Anda butuhkan. Klik pada buku untuk melihat detail isi dan langsung melakukan pembelian.
            </p>
          </div>

          {/* Daftar Kartu Produk E-Book */}
          <div className="space-y-6">
            {products.length > 0 ? (
              products.map((product) => {
                const discountPercent = product.regular_price > product.sale_price
                  ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
                  : 0;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    {/* Bagian Atas Kartu: Hook Tulisan Gede */}
                    <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100 text-center space-y-2">
                      <h3 className="text-2xl sm:text-4xl font-black text-[#0F2247] tracking-tight leading-tight">
                        {product.title}
                      </h3>

                      {product.subtitle && (
                        <p className="text-sm sm:text-base text-slate-600 font-semibold italic max-w-2xl mx-auto leading-relaxed">
                          "{product.subtitle}"
                        </p>
                      )}
                    </div>

                    {/* Tampilan Visual Buku / 3D Mockup Box */}
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 bg-white">
                      
                      {/* Visual Mockup */}
                      <div className="w-full md:w-1/2 flex items-center justify-center">
                        <div
                          className="relative group cursor-pointer"
                          onClick={() => {
                            trackEvent("PRODUCT_CLICK", product.id, product.title);
                            setLocation(`/adrienfandra/p/${product.slug || product.id}`);
                          }}
                        >
                          {product.cover_url ? (
                            <img
                              src={product.cover_url}
                              alt={product.title}
                              className="max-h-64 sm:max-h-72 w-auto object-contain rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            /* Dummy Book 3D Mockup */
                            <div className="w-52 sm:w-64 h-72 sm:h-80 bg-gradient-to-br from-[#1D3E72] via-[#2563EB] to-[#0F2247] rounded-2xl shadow-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden border-2 border-white/20 group-hover:scale-105 transition-transform duration-300">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                              <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/20 border-r border-white/10"></div>
                              
                              <div className="relative z-10 pl-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#F6B93B] block">BILANO E-BOOK</span>
                                <span className="text-xs font-bold text-blue-200">EDISI SPESIAL</span>
                              </div>

                              <div className="relative z-10 pl-2 my-auto">
                                <h4 className="font-extrabold text-lg sm:text-xl leading-snug line-clamp-3 text-white">
                                  {product.title}
                                </h4>
                              </div>

                              <div className="relative z-10 pl-2 text-[11px] text-blue-200 flex items-center justify-between border-t border-white/10 pt-3">
                                <span>Adrien Fandra</span>
                                <span className="font-bold text-[#F6B93B]">PDF HD</span>
                              </div>
                            </div>
                          )}

                          {discountPercent > 0 && (
                            <div className="absolute -top-3 -right-3 bg-rose-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border-2 border-white">
                              HEMAT {discountPercent}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Detail Ringkas & Tombol Beli */}
                      <div className="w-full md:w-1/2 space-y-5">
                        {/* Highlight Keunggulan */}
                        {product.highlights && product.highlights.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Keunggulan Utama:</h4>
                            <ul className="space-y-1.5 text-xs sm:text-sm font-semibold text-slate-700">
                              {product.highlights.slice(0, 3).map((hl: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-blue-600 font-bold">•</span>
                                  <span>{hl}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Box Harga */}
                        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-baseline justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-500 block">Harga Spesial Hari Ini:</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl sm:text-3xl font-black text-[#1D3E72]">
                                {formatCurrency(product.sale_price)}
                              </span>
                              {product.regular_price > product.sale_price && (
                                <span className="text-sm font-semibold text-slate-400 line-through">
                                  {formatCurrency(product.regular_price)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tombol Aksi */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <Link
                            href={`/adrienfandra/p/${product.slug || product.id}`}
                            className="w-full bg-white hover:bg-slate-50 text-[#1D3E72] font-black text-xs sm:text-sm py-3.5 px-4 rounded-xl border-2 border-[#1D3E72] transition-all flex items-center justify-center shadow-sm active:scale-98 text-center"
                          >
                            Lihat Detail Isi
                          </Link>

                          <Link
                            href={`/adrienfandra/checkout/${product.id}`}
                            className="w-full bg-[#1D3E72] hover:bg-[#0F2247] text-white font-black text-xs sm:text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center active:scale-98 text-center"
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
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
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
