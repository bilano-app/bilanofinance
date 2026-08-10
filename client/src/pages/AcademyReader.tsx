import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, BookOpen, Loader2 } from "lucide-react";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    const [, params] = useRoute("/academy/:ebookId/read/:chapterNum");

    const ebookId = params?.ebookId;
    const initialChapterNum = parseInt(params?.chapterNum || "1");

    const [chapters, setChapters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    const [nextChapterNum, setNextChapterNum] = useState(initialChapterNum);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const observer = useRef<IntersectionObserver | null>(null);

    // Infinite Scroll
    const lastPageRef = useCallback((node: HTMLDivElement | null) => {
        if (isFetchingMore || !hasMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setNextChapterNum((prev) => prev + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [isFetchingMore, hasMore]);

    useEffect(() => {
        const fetchChapter = async () => {
            if (!ebookId || !hasMore) return;
            chapters.length === 0 ? setIsLoading(true) : setIsFetchingMore(true);

            try {
                const res = await fetch(`/api/ebooks/${ebookId}/chapters/${nextChapterNum}`);
                if (res.status === 402) {
                    if (chapters.length === 0) setErrorMsg("Akses Premium Diperlukan.");
                    setHasMore(false);
                    return;
                }
                const result = await res.json();
                if (result.success && result.data) {
                    setChapters((prev) => prev.some(c => c.chapter_number === result.data.chapter_number) ? prev : [...prev, result.data]);
                } else {
                    setHasMore(false);
                }
            } catch (err) {
                if (chapters.length === 0) setErrorMsg("Gagal memuat dokumen.");
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setIsFetchingMore(false);
            }
        };
        fetchChapter();
    }, [ebookId, nextChapterNum]);

    // 🔥 ALGORITMA PAGINASI GLOBAL (KERTAS MUTLAK)
    // Menyatukan seluruh bab menjadi aliran air, lalu memotongnya kaku berdasarkan ukuran kertas
    const pages = useMemo(() => {
        const MAX_CAPACITY = 1400; // Kapasitas "berat" ideal teks untuk kertas 650px
        const allPages: any[][] = [];
        let currentPage: any[] = [];
        let currentCapacity = 0;

        chapters.forEach((chap) => {
            const lines = chap.content.replace(/\*\*/g, '').split('\n').map((l: string) => l.trim()).filter((l: string) => l);

            lines.forEach((line: string) => {
                const lower = line.toLowerCase();
                if (lower.includes("gutenberg") || lower.includes("produced by")) return;

                // Deteksi gaya teks
                const isMainBook = /^(buku|book|part|volume)\s+([ivx0-9]+|one|two|three|four|five)\b/i.test(line);
                const isChapter = /^(bab|chapter|section)\s+([ivx0-9]+)\b/i.test(line);
                const isSub = /^(prakata|pendahuluan|intro|kesimpulan|daftar isi)\b/i.test(line) || (line.length < 80 && /^[A-Z]/.test(line) && !line.endsWith('.'));

                // Teks tebal/besar memakan lebih banyak ruang di kertas, jadi kita beri bobot lebih
                let weight = line.length;
                if (isMainBook) weight += 250; 
                else if (isChapter) weight += 150;
                else if (isSub) weight += 100;
                else weight += 20; // spasi antar paragraf

                // Jika batas kertas tercapai, tutup halaman ini dan buat lembar baru
                if (currentCapacity + weight > MAX_CAPACITY && currentPage.length > 0) {
                    allPages.push(currentPage);
                    currentPage = [];
                    currentCapacity = 0;
                }

                // Masukkan teks ke kertas saat ini
                currentPage.push({
                    text: line,
                    isMainBook,
                    isChapter,
                    isSub,
                    chapterTitle: chap.title,
                    chapterNum: chap.chapter_number
                });
                currentCapacity += weight;
            });
        });

        // Sisa teks terakhir dimasukkan ke halaman penutup
        if (currentPage.length > 0) allPages.push(currentPage);
        return allPages;
    }, [chapters]);

    return (
        <div className="min-h-screen bg-slate-400 flex flex-col font-sans select-none">
            {/* Header Sticky Atas */}
            <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shadow-md">
                <button onClick={() => setLocation("/academy")} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Bilano Academy</p>
                    <h1 className="font-bold text-xs line-clamp-1">{chapters[0]?.title || "Memuat..."}</h1>
                </div>
            </div>

            {/* CONTAINER VERTICAL SCROLL */}
            <div className="flex-1 flex flex-col items-center p-4 md:p-6 gap-6 md:gap-8">
                {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-800 mt-20" />
                ) : errorMsg ? (
                    <div className="mt-20 p-6 bg-white rounded-xl text-center shadow-xl">
                        <BookOpen className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-700">{errorMsg}</p>
                    </div>
                ) : (
                    <>
                        {pages.map((pageContent, pageIdx) => {
                            const isLastPage = pageIdx === pages.length - 1;
                            
                            // Mengambil referensi header/footer dari paragraf pertama yang merajai halaman ini
                            const dominantChapterNum = pageContent[0]?.chapterNum;
                            const dominantChapterTitle = pageContent[0]?.chapterTitle || "Bilano Academy";

                            return (
                                <div
                                    key={`page-${pageIdx}`}
                                    ref={isLastPage ? lastPageRef : null}
                                    /* 🔥 KERTAS MUTLAK: Tinggi dan Lebar Terkunci Permanen */
                                    className="bg-[#FFFDF9] shadow-xl w-full max-w-[420px] h-[650px] p-6 md:p-8 rounded-sm border border-stone-300 flex flex-col justify-between font-serif overflow-hidden relative"
                                >
                                    {/* Running Header Kertas */}
                                    <div className="w-full text-center border-b border-stone-200 pb-2 text-[9px] text-stone-400 tracking-widest uppercase line-clamp-1">
                                        {dominantChapterTitle}
                                    </div>

                                    {/* Konten Utama - Mengisi Sisa Ruang Kertas secara Otomatis */}
                                    <div className="flex-1 my-3 select-text overflow-hidden">
                                        {pageContent.map((item, idx) => {
                                            if (item.isMainBook) {
                                                return <h2 key={idx} className="text-base md:text-lg font-black text-slate-900 text-center uppercase font-serif mt-2 mb-4 border-b-2 border-slate-800 pb-2">{item.text}</h2>;
                                            }
                                            if (item.isChapter) {
                                                return <h3 key={idx} className="text-sm md:text-base font-extrabold text-slate-800 uppercase font-serif mt-2 mb-3 border-b border-slate-300 pb-1">{item.text}</h3>;
                                            }
                                            if (item.isSub) {
                                                return <h4 key={idx} className="text-xs md:text-sm font-bold italic text-slate-700 mt-2 mb-2 font-serif">{item.text}</h4>;
                                            }
                                            return <p key={idx} className="text-slate-800 text-[11px] md:text-xs leading-relaxed text-justify mb-2 font-serif indent-6">{item.text}</p>;
                                        })}
                                    </div>

                                    {/* Footer Halaman Kertas */}
                                    <div className="w-full flex justify-between pt-3 text-[9px] text-stone-400 tracking-widest border-t border-stone-200">
                                        <span>BAGIAN {dominantChapterNum}</span>
                                        <span>HAL {pageIdx + 1}</span>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {isFetchingMore && <Loader2 className="w-5 h-5 animate-spin text-slate-700 my-4" />}
                        {!hasMore && chapters.length > 0 && <div className="py-8 text-slate-700 italic text-xs font-serif">• Akhir Dokumen •</div>}
                    </>
                )}
            </div>
        </div>
    );
}