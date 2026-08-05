import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, ChevronRight, BookOpen, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-finance";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    // Menangkap parameter dari URL (ID Buku dan Nomor Bab)
    const [match, params] = useRoute("/academy/:ebookId/read/:chapterNum");
    const { data: user } = useUser();
    
    const ebookId = params?.ebookId;
    const chapterNum = parseInt(params?.chapterNum || "1");

    const [chapterData, setChapterData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const fetchChapter = async () => {
            setIsLoading(true);
            setErrorMsg("");
            try {
                const res = await fetch(`/api/ebooks/${ebookId}/chapters/${chapterNum}`);
                const result = await res.json();
                
                // Menangkap respon dari middleware jika user gratisan mencoba buka buku premium
                if (res.status === 402) {
                    setErrorMsg("Akses Premium Diperlukan. Silakan upgrade ke Bilano Pro untuk membaca koleksi elit ini.");
                    return;
                }

                if (result.success) {
                    setChapterData(result.data);
                } else {
                    setErrorMsg(result.error || "Gagal memuat isi bab.");
                }
            } catch (e) {
                setErrorMsg("Terjadi kesalahan koneksi saat memuat buku.");
            } finally {
                setIsLoading(false);
            }
        };
        
        if (ebookId && chapterNum) fetchChapter();
    }, [ebookId, chapterNum]);

    // Fungsi sederhana untuk merender teks terjemahan AI dengan pemisah paragraf
    const renderContent = (content: string) => {
        return content.split('\n').map((paragraph, idx) => (
            paragraph.trim() ? <p key={idx} className="mb-4 leading-relaxed text-slate-300">{paragraph}</p> : <br key={idx} />
        ));
    };

    return (
        <div className="min-h-screen bg-[#0B0F19] text-slate-200 flex flex-col font-sans">
            {/* Header Navigasi Atas */}
            <div className="sticky top-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-800 shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => setLocation("/academy")} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-300" />
                    </button>
                    <div>
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Bilano Reader</p>
                        <h1 className="font-extrabold text-white text-sm line-clamp-1 max-w-[200px]">
                            {chapterData ? chapterData.title : "Memuat..."}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Area Baca Konten */}
            <div className="px-5 py-8 max-w-2xl mx-auto w-full flex-1 flex flex-col">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                        <p className="text-sm font-medium">Membuka lembaran buku...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <BookOpen className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
                        <h2 className="text-lg font-bold text-white mb-2">Akses Ditolak</h2>
                        <p className="text-sm text-slate-400 max-w-[250px]">{errorMsg}</p>
                        <button onClick={() => setLocation("/paywall")} className="mt-6 px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-full text-sm active:scale-95 transition-transform">
                            Upgrade Sekarang
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <h2 className="text-2xl font-black text-white mb-8 border-b border-slate-800 pb-4">
                            {chapterData.title}
                        </h2>
                        <div className="text-[15px] font-medium tracking-wide">
                            {renderContent(chapterData.content)}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigasi Pindah Bab */}
            {!isLoading && !errorMsg && chapterData && (
                <div className="sticky bottom-0 bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-800 px-4 py-4 flex items-center justify-between">
                    <button 
                        onClick={() => setLocation(`/academy/${ebookId}/read/${chapterNum - 1}`)}
                        disabled={chapterNum <= 1}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${chapterNum <= 1 ? 'opacity-30 cursor-not-allowed text-slate-500' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                    >
                        <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    
                    <span className="text-xs font-bold text-slate-500">Bab {chapterNum}</span>

                    <button 
                        onClick={() => setLocation(`/academy/${ebookId}/read/${chapterNum + 1}`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm bg-amber-500 hover:bg-amber-600 text-slate-900 transition-colors shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}