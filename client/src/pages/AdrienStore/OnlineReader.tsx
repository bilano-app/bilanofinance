import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Download, BookOpen, RefreshCw, AlertCircle } from "lucide-react";

export default function OnlineReader() {
  const [, params] = useRoute("/adrienfandra/read/:orderId");
  const orderId = params?.orderId;

  // Cek parameter ?book= dari URL
  const [activeBook, setActiveBook] = useState<string>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const b = search.get("book") || "";
      if (b === "full" || b === "tuntas" || b === "2") return "tuntas";
      if (b === "gudang" || b === "soal" || b === "3") return "gudang";
      return "bayi";
    } catch (e) {
      return "bayi";
    }
  });

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

  const isBundle = Boolean(
    order.is_bundle || 
    Number(order.product_id) === 2 || 
    (order.product_title || "").toLowerCase().includes("bundling")
  );

  const bundleTabs = [
    { key: "bayi", label: "📗 Logika Akuntansi", title: "Logika Akuntansi" },
    { key: "tuntas", label: "📘 Akuntansi Lengkap", title: "Akuntansi Lengkap" },
    { key: "gudang", label: "📙 Gudang Soal", title: "Gudang Soal Akuntansi" }
  ];

  const currentBookTitle = isBundle 
    ? (bundleTabs.find(t => t.key === activeBook)?.title || order.product_title)
    : order.product_title;

  const pdfUrl = isBundle
    ? `/api/adrienfandra/read-pdf/${orderId}?book=${activeBook}`
    : `/api/adrienfandra/read-pdf/${orderId}`;

  const [downloading, setDownloading] = useState(false);

  const downloadBlob = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const fname = isBundle ? `${activeBook}_Akuntansi.pdf` : (order.pdf_filename || "Ebook_Akuntansi.pdf");
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error("Gagal mengambil file");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 4000);
    } catch (e) {
      window.open(downloadUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveBook(key);
    const newUrl = `${window.location.pathname}?book=${key}`;
    window.history.replaceState(null, "", newUrl);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Reader Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link
            href={`/adrienfandra/order/${orderId}`}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
            title="Kembali ke Ringkasan Pesanan"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white line-clamp-1 max-w-[200px] sm:max-w-md">
              {currentBookTitle}
            </h1>
            <p className="text-[10px] text-slate-400">
              Pembaca: {order.customer_name} {isBundle ? "• Paket Bundling 3 Buku" : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadBlob}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1D3E72] hover:bg-blue-600 text-white px-3.5 py-1.5 rounded-full transition-colors shadow-sm cursor-pointer disabled:opacity-75"
        >
          <Download className={`w-3.5 h-3.5 ${downloading ? "animate-bounce" : ""}`} />
          <span className="hidden sm:inline">{downloading ? "Mengunduh..." : "Download PDF Ini"}</span>
        </button>
      </header>

      {/* 📑 Tab Switcher untuk Paket Bundling 3 Buku */}
      {isBundle && (
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 hidden sm:inline flex-shrink-0">
            PILIH BUKU:
          </span>
          <div className="flex items-center gap-1.5">
            {bundleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeBook === tab.key
                    ? "bg-[#1D3E72] text-white shadow-md shadow-blue-900/30 ring-1 ring-blue-400/30"
                    : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDF Iframe Viewport */}
      <div className="flex-1 w-full bg-slate-800 flex items-center justify-center relative">
        <iframe
          key={`${orderId}-${activeBook}`}
          src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          title={currentBookTitle}
          className="w-full h-[calc(100vh-105px)] border-0"
        />
      </div>
    </div>
  );
}
