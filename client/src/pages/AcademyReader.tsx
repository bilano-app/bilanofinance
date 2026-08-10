import { useState, useEffect, useRef, useCallback } from "react";
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

    const lastChapterRef = useCallback((node: HTMLDivElement | null) => {
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

    // 🔥 ALGORITMA PAGINASI: Memecah teks bab panjang menjadi lembaran-lembaran statis (Maks ~1100 karakter per halaman)
    const paginateContent = (content: string) => {
        if (!content) return [];
        const lines = content.replace(/\*\*/g, '').split('\n').map(l => l.trim()).filter(l => l);
        
        const pages: string[][] = [];
        let currentPage: string[] = [];
        let currentLen = 0;
        const MAX_LEN = 1100; // Kapasitas ideal untuk tinggi kertas 650px

        for (const line of lines) {
            if (currentLen + line.length > MAX_LEN && currentPage.length > 0) {
                pages.push(currentPage);
                currentPage = [line];
                currentLen = line.length;
            } else {
                currentPage.push(line);
                currentLen += line.length;
            }
        }
        if (currentPage.length > 0) pages.push(currentPage);
        return pages;
    };

    const renderPageContent = (lines: string[]) => {
        return lines.map((trimmed, index) => {
            const lower = trimmed.toLowerCase();
            if (lower.includes("gutenberg") || lower.includes("produced by")) return null;

            if (/^(buku|book|part|volume)\s+([ivx0-9]+|one|two|three|four|five)\b/i.test(trimmed)) {
                return <h2 key={index} className="text-base md:text-lg font-black text-slate-900 text-center uppercase font-serif mt-2 mb-4 border-b-2 border-slate-800 pb-2">{trimmed}</h2>;
            }
            if (/^(bab|chapter|section)\s+([ivx0-9]+)\b/i.test(trimmed)) {
                return <h3 key={index} className="text-sm md:text-base font-extrabold text-slate-800 uppercase font-serif mt-2 mb-3 border-b border-slate-300 pb-1">{trimmed}</h3>;
            }
            if (/^(prakata|pendahuluan|intro|kesimpulan|daftar isi)\b/i.test(trimmed) || (trimmed.length < 80 && /^[A-Z]/.test(trimmed) && !trimmed.endsWith('.'))) {
                return <h4 key={index} className="text-xs md:text-sm font-bold italic text-slate-700 mt-2 mb-2 font-serif">{trimmed}</h4>;
            }
            return <p key={index} className="text-slate-800 text-[11px] md:text-xs leading-relaxed text-justify mb-2 font-serif indent-6">{trimmed}</p>;
        });
    };

    return (
        <div className="min-h-screen bg-slate-400 flex flex-col font-sans select-none">
            <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shadow-md">
                <button onClick={() => setLocation("/academy")} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full">
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
                        <p className="text-sm font-bold">{errorMsg}</p>
                    </div>
                ) : (
                    <>
                        {chapters.map((chap, chapIdx) => {
                            const pages = paginateContent(chap.content);
                            const isLastChap = chapIdx === chapters.length - 1;

                            return pages.map((pageContent, pageIdx) => {
                                const isLastPageOfLastChap = isLastChap && pageIdx === pages.length - 1;

                                return (
                                    <div
                                        key={`${chap.id}-${pageIdx}`}
                                        ref={isLastPageOfLastChap ? lastChapterRef : null}
                                        /* 🔥 UKURAN KERTAS DIKUNCI MATI (TIDAK BISA MELAR) */
                                        className="bg-[#FFFDF9] shadow-xl w-full max-w-[420px] h-[650px] p-6 md:p-8 rounded-sm border border-stone-300 flex flex-col justify-between font-serif overflow-hidden"
                                    >
                                        <div className="w-full text-center border-b border-stone-200 pb-2 text-[9px] text-stone-400 tracking-widest uppercase">
                                            {chap.title || "The Wealth of Nations"}
                                        </div>

                                        <div className="flex-1 my-3 select-text overflow-hidden">
                                            {renderPageContent(pageContent)}
                                        </div>

                                        <div className="w-full flex justify-between pt-3 text-[9px] text-stone-400 tracking-widest border-t border-stone-200">
                                            <span>BAGIAN {chap.chapter_number}</span>
                                            <span>HAL {pageIdx + 1} / {pages.length}</span>
                                        </div>
                                    </div>
                                );
                            });
                        })}
                        
                        {isFetchingMore && <Loader2 className="w-5 h-5 animate-spin text-slate-700 my-4" />}
                        {!hasMore && chapters.length > 0 && <div className="py-8 text-slate-700 italic text-xs">• Akhir Dokumen •</div>}
                    </>
                )}
            </div>
        </div>
    );
}