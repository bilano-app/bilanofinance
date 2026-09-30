import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { 
  CheckCircle2, Download, BookOpen, MessageCircle, 
  Mail, ShieldCheck, ArrowRight, Sparkles, RefreshCw, FileText
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
}

export default function OrderSuccess() {
  const [, params] = useRoute("/adrienfandra/order/:orderId");
  const orderId = params?.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
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

  const handleDownload = () => {
    if (!orderId) return;
    setDownloading(true);
    const link = document.createElement("a");
    link.href = `/api/adrienfandra/download/${orderId}`;
    link.download = order?.pdf_filename || "Ebook.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1500);
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

  const whatsappNum = (order.whatsapp_number || "+6289688113210").replace(/[^0-9]/g, "");

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-slate-900 font-sans selection:bg-[#1D3E72] selection:text-white py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* 🏆 CARD UTAMA SUKSES */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl text-center space-y-5 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500"></div>

          {/* Ikon Centang Hijau */}
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-100 mt-2">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              TRANSAKSI BERHASIL & LUNAS
            </span>
            <h1 className="text-2xl font-black text-[#0F2247] tracking-tight">
              Selamat, E-Book Anda Siap! 📚
            </h1>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Terima kasih <strong className="text-slate-800">{order.customer_name}</strong>, pembayaran telah kami verifikasi. Anda dapat langsung mengunduh dan membaca e-book sekarang.
            </p>
          </div>

          {/* 📥 TOMBOL UTAMA: DOWNLOAD PDF */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full bg-gradient-to-r from-[#1D3E72] via-[#2563EB] to-[#1D3E72] hover:opacity-95 text-white font-black text-sm py-4 rounded-2xl shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <Download className={`w-5 h-5 ${downloading ? "animate-bounce" : ""}`} />
              <span>{downloading ? "Mengunduh File PDF..." : "DOWNLOAD E-BOOK (PDF)"}</span>
            </button>

            <Link
              href={`/adrienfandra/read/${order.merchant_order_id}`}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Buka & Baca Online Sekarang</span>
            </Link>
          </div>

          {/* ✉️ NOTIFIKASI PENGIRIMAN EMAIL */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/60 text-left space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Salinan Otomatis Telah Dikirim ke Email</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              File PDF e-book juga telah dikirimkan ke <strong className="text-slate-800">{order.customer_email}</strong>. Silakan cek Inbox atau folder Spam email Anda.
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
                <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">{order.product_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Dibayar:</span>
                <span className="font-black text-[#1D3E72]">{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode:</span>
                <span className="font-bold text-emerald-700">Duitku (Lunas)</span>
              </div>
            </div>
          </div>

          {/* 💬 BANTUAN WHATSAPP */}
          <div className="pt-2 border-t border-slate-100">
            <a
              href={`https://wa.me/${whatsappNum}?text=Halo%20Mas%20Adrien%2C%20saya%20sudah%20membeli%20${encodeURIComponent(order.product_title)}%20dengan%20Order%20ID%20${order.merchant_order_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl transition-colors w-full justify-center"
            >
              <MessageCircle className="w-4 h-4 fill-emerald-500 text-emerald-500" />
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
