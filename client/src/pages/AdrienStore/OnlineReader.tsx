import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Download, BookOpen, RefreshCw, ZoomIn, ZoomOut, AlertCircle } from "lucide-react";

export default function OnlineReader() {
  const [, params] = useRoute("/adrienfandra/read/:orderId");
  const orderId = params?.orderId;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/adrienfandra/order/${orderId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.order) {
          setOrder(data.order);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-300">Membuka Reader E-Book...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-black mb-2">Dokumen Tidak Ditemukan</h2>
        <Link href="/adrienfandra" className="text-xs text-blue-400 underline">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const pdfUrl = `/api/adrienfandra/read-pdf/${orderId}`;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Reader Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link
            href={`/adrienfandra/order/${orderId}`}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white line-clamp-1 max-w-[240px] sm:max-w-md">
              {order.product_title}
            </h1>
            <p className="text-[10px] text-slate-400">Pembaca: {order.customer_name}</p>
          </div>
        </div>

        <a
          href={`/api/adrienfandra/download/${orderId}`}
          download
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1D3E72] hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-full transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download PDF</span>
        </a>
      </header>

      {/* PDF Iframe Viewport */}
      <div className="flex-1 w-full bg-slate-800 flex items-center justify-center relative">
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          title={order.product_title}
          className="w-full h-[calc(100vh-60px)] border-0"
        />
      </div>
    </div>
  );
}
