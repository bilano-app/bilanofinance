import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, BookOpen, Loader2 } from "lucide-react";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    
    // Tetap menggunakan route bawaan Bilano agar kamu tidak perlu merombak App.tsx
    const [, params] = useRoute("/academy/:ebookId/read/:chapterNum");

    const ebookId = params?.ebookId;

    const [ebook, setEbook] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const fetchEbook = async () => {
            if (!ebookId) return;
            setIsLoading(true);

            try {
                // Memanggil endpoint API untuk mengambil data detail buku (termasuk pdf_url)
                const res = await fetch(`/api/ebooks/${ebookId}`);
                
                // Menangani satpam premium dari backend
                if (res.status === 402) {
                    setErrorMsg("Akses Premium Diperlukan.");
                    setIsLoading(false);
                    return;
                }

                const result = await res.json();
                
                if (result.success && result.data) {
                    setEbook(result.data);
                } else {
                    setErrorMsg("Buku tidak ditemukan di perpustakaan.");
                }
            } catch (err) {
                setErrorMsg("Gagal memuat dokumen PDF.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEbook();
    }, [ebookId]);

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans select-none overflow-hidden">
            
            {/* Header Navbar Super Clean */}
            <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shadow-md border-b border-slate-800">
                <button 
                    onClick={() => setLocation("/academy")} 
                    className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 text-slate-300 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Bilano Academy</p>
                    <h1 className="font-bold text-xs line-clamp-1">{ebook?.title || "Memuat Dokumen..."}</h1>
                </div>
            </div>

            {/* Tampilan Konten PDF (Full Layar) */}
            <div className="flex-1 w-full h-[calc(100vh-60px)] bg-[#525659] flex flex-col items-center justify-center relative">
                {isLoading ? (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
                        <p className="text-xs text-slate-300 font-medium tracking-wide">Membuka lembaran buku...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="p-8 bg-slate-900 rounded-2xl text-center shadow-2xl border border-slate-800 max-w-sm mx-4">
                        <BookOpen className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-300 mb-6">{errorMsg}</p>
                        <button 
                            onClick={() => setLocation("/academy")}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors uppercase tracking-wider"
                        >
                            Kembali ke Rak Buku
                        </button>
                    </div>
                ) : (
                    // Iframe perender PDF. Tambahan toolbar=0 untuk menyembunyikan menu browser bawaan
                    <iframe 
                        src={`${ebook?.pdf_url}#toolbar=0&navpanes=0`} 
                        className="w-full h-full border-none"
                        title={ebook?.title}
                    />
                )}
            </div>
            
        </div>
    );
}