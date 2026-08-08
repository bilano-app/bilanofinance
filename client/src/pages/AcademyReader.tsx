import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, BookOpen, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-finance";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    const [match, params] = useRoute("/academy/:ebookId/read/:chapterNum");
    const { data: user } = useUser();
    
    const ebookId = params?.ebookId;
    const initialChapterNum = parseInt(params?.chapterNum || "1");

    const [chapters, setChapters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    
    const [nextChapter, setNextChapter] = useState(initialChapterNum);
    const [hasMore, setHasMore] = useState(true);
    const [isFetching, setIsFetching] = useState(false);

    const observer = useRef<IntersectionObserver | null>(null);
    
    // 🔥 INFINITE SCROLL: Memicu pemanggilan bab berikutnya saat mencapai akhir kertas
    const lastElementRef = useCallback((node: any) => {
        if (isFetching || !hasMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setNextChapter(prev => prev + 1);
            }
        });
        
        if (node) observer.current.observe(node);
    }, [isFetching, hasMore]);

    useEffect(() => {
        const fetchChapter = async () => {
            if (!ebookId || !hasMore) return;
            
            setIsFetching(true);
            try {
                const res = await fetch(`/api/ebooks/${ebookId}/chapters/${nextChapter}`);
                const result = await res.json();
                
                if (res.status === 402) {
                    if (chapters.length === 0) setErrorMsg("Akses Premium Diperlukan. Silakan upgrade ke Bilano Pro.");
                    setHasMore(false);
                    return;
                }

                if (result.success && result.data) {
                    setChapters(prev => {
                        // Mencegah duplikasi data jika di-render ulang
                        if (prev.some(c => c.chapter_number === result.data.chapter_number)) return prev;
                        return [...prev, result.data];
                    });
                } else {
                    setHasMore(false);
                }
            } catch (e) {
                if (chapters.length === 0) setErrorMsg("Terjadi kesalahan koneksi saat memuat buku.");
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setIsFetching(false);
            }
        };
        
        fetchChapter();
    }, [ebookId, nextChapter]);

    // 🔥 PARSER PINTAR: Merapikan format teks, judul, tebal/miring, dan spasi
    const renderContent = (content: string) => {
        if (!content) return null;

        // Memisahkan berdasarkan enter ganda
        const blocks = content.split(/\n\s*\n/);

        return blocks.map((block, idx) => {
            let trimmed = block.trim();
            if (!trimmed) return null;

            // Jika itu adalah Judul/Sub-judul (dimulai dengan #)
            if (/^#{1,6}\s+/.test(trimmed)) {
                const cleanTitle = trimmed.replace(/^#{1,6}\s*/, '');
                return (
                    <h3 key={`h-${idx}`} className="text-lg font-bold text-slate-900 mt-6 mb-3 border-b border-slate-200 pb-2 font-serif">
                        {cleanTitle}
                    </h3>
                );
            }

            // Ubah kode Markdown menjadi HTML sesungguhnya
            let formattedHtml = trimmed
                .replace(/</g, "&lt;").replace(/>/g, "&gt;") // Keamanan dasar
                .replace(/!\[([^\]]*)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-6 max-w-full rounded shadow-sm mx-auto border border-slate-200" />')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-600 underline">$1</a>');

            return (
                <p key={`p-${idx}`} 
                   className="mb-4 text-slate-800 text-justify"
                   // Ukuran font sudah dikecilkan (10.5pt) agar lebih nyaman dibaca
                   style={{ fontSize: '10.5pt', lineHeight: '1.65' }}
                   dangerouslySetInnerHTML={{ __html: formattedHtml }}
                />
            );
        });
    };

    return (
        <div className="min-h-screen bg-slate-300 flex flex-col font-sans">
            {/* Header Navigasi */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-300 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setLocation("/academy")} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Bilano PDF Reader</p>
                        <h1 className="font-extrabold text-slate-900 text-sm line-clamp-1 max-w-[200px]">
                            {chapters.length > 0 ? chapters[0].title : "Memuat dokumen..."}
                        </h1>
                    </div>
                </div>
            </div>

            {/* 🔥 AREA BACA: Layout tumpukan lembar kertas A4 */}
            <div className="flex-1 flex flex-col items-center p-4 md:p-8 gap-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                        <p className="text-sm font-medium text-slate-600">Menyiapkan dokumen...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <BookOpen className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Akses Ditolak</h2>
                        <p className="text-sm text-slate-600 max-w-[250px]">{errorMsg}</p>
                        <button onClick={() => setLocation("/paywall")} className="mt-6 px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-full text-sm active:scale-95 transition-transform">
                            Upgrade Sekarang
                        </button>
                    </div>
                ) : (
                    <>
                        {chapters.map((chap, index) => {
                            const isLastElement = chapters.length === index + 1;
                            
                            return (
                                <div 
                                    key={chap.id || index}
                                    ref={isLastElement ? lastElementRef : null}
                                    // Setelan ukuran persis kertas A4 dengan bayangan (Shadow)
                                    className="bg-white shadow-xl w-full max-w-[794px] min-h-[1123px] px-8 py-12 md:px-16 md:py-16 relative"
                                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                                >
                                    {/* Indikator Halaman / Bab di ujung bawah kertas */}
                                    <div className="absolute bottom-6 right-8 text-xs text-slate-400 font-sans">
                                        Bagian {chap.chapter_number}
                                    </div>

                                    {!/^Bagian \d+$/i.test(chap.title) && (
                                        <h2 className="text-xl font-bold text-black mb-8 border-b border-black pb-2 text-center">
                                            {chap.title}
                                        </h2>
                                    )}
                                    
                                    <div className="tracking-wide">
                                        {renderContent(chap.content)}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Status Loading di bawah saat auto-fetch halaman berikutnya */}
                        {isFetching && hasMore && (
                            <div className="py-6 flex flex-col items-center">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mb-2" />
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Memuat halaman berikutnya...</p>
                            </div>
                        )}

                        {/* Indikator Buku Tamat */}
                        {!hasMore && chapters.length > 0 && (
                            <div className="py-10 text-slate-400 italic text-sm font-serif border-t border-slate-300/50 mt-4 w-full text-center max-w-[794px]">
                                - Akhir dari Dokumen -
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}