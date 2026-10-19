import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { 
  CheckCircle2, Download, BookOpen, MessageCircle, 
  Mail, ShieldCheck, ArrowRight, Sparkles, RefreshCw, FileText, Check
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BundleItem {
  id: number;
  key: string;
  title: string;
  subtitle: string;
  filename: string;
  coverUrl: string;
  downloadUrl: string;
  readUrl: string;
}

interface OrderDetail {
  id: number;
  merchant_order_id: string;
  product_id: number;
  product_title: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  email_sent: boolean;
  cover_url?: string;
  pdf_filename?: string;
  whatsapp_number?: string;
  is_bundle?: boolean;
  bundle_items?: BundleItem[];
}

const DEFAULT_BUNDLE_ITEMS: BundleItem[] = [
  {
    id: 1,
    key: "logika",
    title: "Logika Akuntansi",
    subtitle: "Kuasai Pondasi Logika & Alur Berpikir Akuntansi Modern Tanpa Hafalan",
    filename: "LOGIKA AKUNTANSI - Adrien Fandra.pdf",
    coverUrl: "/Akuntansi/Mockup_Buku_Logika_Akuntansi.webp",
    downloadUrl: "",
    readUrl: ""
  },
  {
    id: 2,
    key: "full",
    title: "Full Accounting",
    subtitle: "Panduan Komprehensif Siklus Akuntansi Penuh & Laporan Keuangan",
    filename: "FULL ACCOUNTING - Adrien Fandra.pdf",
    coverUrl: "/Akuntansi/Mockup_Buku_Full_Accounting_Tebal.webp",
    downloadUrl: "",
    readUrl: ""
  },
  {
    id: 3,
    key: "gudang",
    title: "Gudang Soal Akuntansi",
    subtitle: "Kumpulan Studi Kasus, Latihan Soal, & Pembahasan Praktis Siap Uji",
    filename: "Gudang Soal Akuntansi - Adrien Fandra.pdf",
    coverUrl: "/Akuntansi/Mockup_Buku_Gudang_Soal_Akuntansi.webp",
    downloadUrl: "",
    readUrl: ""
  }
];

export default function OrderSuccess() {
  const [, params] = useRoute("/adrienfandra/order/:orderId");
  const orderId = params?.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingSingle, setDownloadingSingle] = useState(false);
  const [downloadingBookKey, setDownloadingBookKey] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState<string>("");

  useEffect(() => {
    // Bersihkan sesi pembayaran aktif karena transaksi sudah sukses
    try {
      localStorage.removeItem("adrienfandra_active_payment");
      localStorage.removeItem("adrienfandra_checkout_draft");
    } catch (e) {}

    if (!orderId) return;
    fetch(`/api/adrienfandra/order/${orderId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.order) {
          setOrder(data.order);
        }
      })
      .catch(err => console.error("Error fetching order:", err))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Download satu file untuk produk non-bundling
  const handleDownloadSingle = () => {
    if (!orderId) return;
    setDownloadingSingle(true);
    const link = document.createElement("a");
    link.href = `/api/adrienfandra/download/${orderId}`;
    link.download = order?.pdf_filename || "Ebook.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadingSingle(false), 1500);
  };

  // Download salah satu buku spesifik dalam paket bundling
  const handleDownloadBook = (bookKey: string, filename: string) => {
    if (!orderId) return;
    setDownloadingBookKey(bookKey);
    const link = document.createElement("a");
    link.href = `/api/adrienfandra/download/${orderId}?book=${bookKey}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadingBookKey(null), 1500);
  };

  // Download ke-3 buku sekaligus secara berurutan (3 file PDF terpisah, tidak digabung)
  const handleDownloadAllBundle = async (items: BundleItem[]) => {
    if (!orderId || downloadingAll) return;
    setDownloadingAll(true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setDownloadAllProgress(`Mengunduh (${i + 1}/${items.length}) ${item.title}...`);
      
      const link = document.createElement("a");
      link.href = `/api/adrienfandra/download/${orderId}?book=${item.key}`;
      link.download = item.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Jeda agar browser tidak memblokir multiple download otomatis
      await new Promise(r => setTimeout(r, 900));
    }

    setDownloadAllProgress("Semua 3 file e-book berhasil diunduh!");
    setTimeout(() => {
      setDownloadingAll(false);
      setDownloadAllProgress("");
    }, 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-[#1D3E72] animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-600">Menyiapkan E-Book Anda...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-black text-slate-800 mb-2">Pesanan Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 mb-6">Nomor transaksi tidak terdaftar dalam database kami.</p>
        <Link href="/adrienfandra" className="bg-[#1D3E72] text-white px-6 py-2.5 rounded-full font-bold text-xs">
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  const isBundle = Boolean(
    order.is_bundle || 
    Number(order.product_id) === 2 || 
    (order.product_title || "").toLowerCase().includes("bundling")
  );

  const bundleList = (order.bundle_items && order.bundle_items.length > 0)
    ? order.bundle_items
    : DEFAULT_BUNDLE_ITEMS;

  const whatsappNum = (order.whatsapp_number || "+6289688113210").replace(/[^0-9]/g, "");

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-slate-900 font-sans selection:bg-[#1D3E72] selection:text-white py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* 🏆 CARD UTAMA SUKSES */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#1D3E72] via-[#2563EB] to-[#F6B93B]"></div>

          {/* Ikon Centang Navy */}
          <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 text-[#1D3E72] border border-blue-200/60 flex items-center justify-center shadow-lg shadow-blue-100 mt-2">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-black uppercase text-[#1D3E72] bg-blue-50 px-3 py-1 rounded-full border border-blue-200 inline-block">
              TRANSAKSI BERHASIL & LUNAS
            </span>
            <h1 className="text-2xl font-black text-[#0F2247] tracking-tight">
              {isBundle ? "Selamat, 3 E-Book Anda Siap! 📚" : "Selamat, E-Book Anda Siap! 📚"}
            </h1>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
              Terima kasih <strong className="text-slate-800">{order.customer_name}</strong>, pembayaran telah kami verifikasi. {isBundle ? "Anda mendapatkan 3 e-book lengkap terpisah (3 file PDF) yang dapat diunduh masing-masing di bawah ini." : "Anda dapat langsung mengunduh dan membaca e-book sekarang."}
            </p>
          </div>

          {/* =========================================================================
              KONTEN KHUSUS: PAKET BUNDLING 3 BUKU (UNDUH MASING-MASING)
              ========================================================================= */}
          {isBundle ? (
            <div className="space-y-4 pt-1 text-left">
              
              {/* Tombol Unduh Semua Sekaligus */}
              <button
                type="button"
                onClick={() => handleDownloadAllBundle(bundleList)}
                disabled={downloadingAll}
                className="w-full bg-gradient-to-r from-[#1D3E72] to-[#2563EB] hover:from-[#0F2247] hover:to-[#1D4ED8] text-white font-extrabold text-xs sm:text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-75"
              >
                <Download className={`w-4 h-4 ${downloadingAll ? "animate-bounce" : ""}`} />
                <span>
                  {downloadingAll 
                    ? (downloadAllProgress || "Memproses Unduhan 3 Buku...") 
                    : "UNDUH SEMUA 3 E-BOOK SEKALIGUS (3 FILE PDF)"}
                </span>
              </button>

              <div className="flex items-center gap-2 pt-2">
                <span className="h-px bg-slate-200 flex-1"></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  ATAU UNDUH / BACA MASING-MASING
                </span>
                <span className="h-px bg-slate-200 flex-1"></span>
              </div>

              {/* Daftar 3 Buku Terpisah */}
              <div className="space-y-3">
                {bundleList.map((item, idx) => (
                  <div 
                    key={item.key || idx}
                    className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white hover:shadow-md hover:border-blue-200"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Cover Thumbnail */}
                      <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-[#1D3E72] to-[#0F2247] overflow-hidden flex-shrink-0 border border-slate-200 shadow-xs flex items-center justify-center">
                        <img 
                          src={item.coverUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover" 
                          loading="eager"
                        />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-black text-[#1D3E72] bg-blue-100/70 px-1.5 py-0.5 rounded-sm">
                            BUKU {idx + 1}
                          </span>
                          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Tombol Aksi Per Buku */}
                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleDownloadBook(item.key, item.filename)}
                        disabled={downloadingBookKey === item.key}
                        className="flex-1 sm:flex-initial bg-[#1D3E72] hover:bg-[#0F2247] text-white text-xs font-bold py-2.5 px-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Download className={`w-3.5 h-3.5 ${downloadingBookKey === item.key ? "animate-bounce" : ""}`} />
                        <span>{downloadingBookKey === item.key ? "Mengunduh..." : "Download (PDF)"}</span>
                      </button>

                      <Link
                        href={`/adrienfandra/read/${order.merchant_order_id}?book=${item.key}`}
                        className="flex-1 sm:flex-initial bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#1D3E72]" />
                        <span>Baca</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            /* =========================================================================
               KONTEN PRODUK TUNGGAL
               ========================================================================= */
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleDownloadSingle}
                disabled={downloadingSingle}
                className="w-full bg-[#1D3E72] hover:bg-[#0F2247] text-white font-black text-sm py-4 rounded-2xl shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Download className={`w-5 h-5 ${downloadingSingle ? "animate-bounce" : ""}`} />
                <span>{downloadingSingle ? "Mengunduh File PDF..." : "DOWNLOAD E-BOOK (PDF)"}</span>
              </button>

              <Link
                href={`/adrienfandra/read/${order.merchant_order_id}`}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-4 h-4 text-[#1D3E72]" />
                <span>Buka & Baca Online Sekarang</span>
              </Link>
            </div>
          )}

          {/* ✉️ NOTIFIKASI PENGIRIMAN EMAIL */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/60 text-left space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Salinan Otomatis Telah Dikirim ke Email</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isBundle ? (
                <>Ke-3 file PDF e-book terpisah juga telah dikirimkan ke <strong className="text-slate-800">{order.customer_email}</strong>. Silakan cek Inbox atau folder Spam email Anda.</>
              ) : (
                <>File PDF e-book juga telah dikirimkan ke <strong className="text-slate-800">{order.customer_email}</strong>. Silakan cek Inbox atau folder Spam email Anda.</>
              )}
            </p>
          </div>

          {/* 📋 DETAIL NOTA TRANSAKSI */}
          <div className="border-t border-slate-100 pt-4 space-y-2 text-left text-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              RINGKASAN PESANAN
            </span>

            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-800">{order.merchant_order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Produk:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[240px]">{order.product_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Dibayar:</span>
                <span className="font-black text-[#1D3E72]">{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode:</span>
                <span className="font-bold text-[#1D3E72]">Pembayaran Terverifikasi (Lunas)</span>
              </div>
            </div>
          </div>

          {/* 💬 BANTUAN WHATSAPP */}
          <div className="pt-2 border-t border-slate-100">
            <a
              href={`https://wa.me/${whatsappNum}?text=Halo%20Mas%20Adrien%2C%20saya%20sudah%20membeli%20${encodeURIComponent(order.product_title)}%20dengan%20Order%20ID%20${order.merchant_order_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#1D3E72] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition-colors w-full justify-center"
            >
              <MessageCircle className="w-4 h-4 fill-[#1D3E72] text-[#1D3E72]" />
              <span>Butuh Bantuan? Hubungi WhatsApp (+6289688113210)</span>
            </a>
          </div>

        </div>

        {/* Link Kembali ke Toko */}
        <div className="text-center">
          <Link href="/adrienfandra" className="text-xs font-bold text-slate-400 hover:text-[#1D3E72] transition-colors">
            ← Kembali ke Beranda E-Book
          </Link>
        </div>

      </div>
    </div>
  );
}
