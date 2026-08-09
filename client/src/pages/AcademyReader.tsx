import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, ChevronRight, BookOpen, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-finance";

interface PageChunk {
    pageNumber: number;
    chapterTitle: string;
    paragraphs: string[];
}

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    const [, params] = useRoute("/academy/:ebookId/read/:chapterNum");
    const { data: user } = useUser();
    
    const ebookId = params?.ebookId;

    const [chapters, setChapters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // Fetch seluruh bab e-book
    useEffect(() => {
        const fetchAllChapters = async () => {
            if (!ebookId) return;
            setIsLoading(true);
            setErrorMsg("");

            try {
                let allChaps: any[] = [];
                let chapNum = 1;
                let hasMore = true;

                while (hasMore && chapNum <= 50) {
                    const res = await fetch(`/api/ebooks/${ebookId}/chapters/${chapNum}`);
                    
                    if (res.status === 402) {
                        if (allChaps.length === 0) setErrorMsg("Akses Premium Diperlukan. Silakan upgrade ke Bilano Pro.");
                        hasMore = false;
                        break;
                    }

                    const result = await res.json();
                    if (result.success && result.data) {
                        allChaps.push(result.data);
                        chapNum++;
                    } else {
                        hasMore = false;
                    }
                }

                setChapters(allChaps);
            } catch (e) {
                setErrorMsg("Gagal memuat dokumen e-book.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllChapters();
    }, [ebookId]);

    // 🔥 ALGORITMA PAGINASI A5 PERSISI (1500 Karakter / Halaman A5 Statis)
    const pages = useMemo(() => {
        if (chapters.length === 0) return [];

        const CHARS_PER_A5_PAGE = 1200;
        const pageList: PageChunk[] = [];
        let globalPageNum = 1;

        chapters.forEach((chap) => {
            const rawParagraphs = chap.content.split('\n\n');
            let currentParagraphs: string[] = [];
            let currentLength = 0;

            rawParagraphs.forEach((p: string) => {
                const cleanP = p.trim();
                if (!cleanP) return;

                if (currentLength + cleanP.length > CHARS_PER_A5_PAGE && currentParagraphs.length > 0) {
                    pageList.push({
                        pageNumber: globalPageNum++,
                        chapterTitle: chap.title,
                        paragraphs: currentParagraphs
                    });
                    currentParagraphs = [cleanP];
                    currentLength = cleanP.length;
                } else {
                    currentParagraphs.push(cleanP);
                    currentLength += cleanP.length;
                }
            });

            if (currentParagraphs.length > 0) {
                pageList.push({
                    pageNumber: globalPageNum++,
                    chapterTitle: chap.title,
                    paragraphs: currentParagraphs
                });
            }
        });

        return pageList;
    }, [chapters]);

    // Render Paragraf dengan Hirarki Typography Profesional
    const renderParagraph = (text: string, idx: number) => {
        const isHeader = /^(BOOK|BUKU|CHAPTER|BAB|PART|SECTION)\s+[IVXLCDM0-9]+/i.test(text);

        if (isHeader) {
            return (
                <h2 
                    key={idx} 
                    className="text-base font-black text-slate-900 uppercase font-serif tracking-tight text-center my-4 border-b-2 border-slate-900 pb-2"
                >
                    {text}
                </h2>
            );
        }

        const isSubHeader = text.length < 80 && !text.endsWith('.') && /^[A-Z0-9\s\-\:]+$/.test(text);
        if (isSubHeader) {
            return (
                <h3 
                    key={idx} 
                    className="text-xs font-bold text-slate-800 uppercase font-serif tracking-normal text-left my-3 border-b border-slate-200 pb-1"
                >
                    {text}
                </h3>
            );
        }

        return (
            <p 
                key={idx} 
                className="text-[12px] leading-relaxed text-slate-800 font-serif text-justify indent-6 mb-3 tracking-tight"
            >
                {text}
            </p>
        );
    };

    const currentPage = pages[currentPageIndex];

    return (
        <div className="min-h-screen bg-slate-500 flex flex-col font-sans select-none items-center">
            {/* Header Navigasi Atas */}
            <div className="w-full bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shadow-md">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setLocation("/academy")} 
                        className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Bilano Academy Reader</p>
                        <h1 className="font-bold text-xs line-clamp-1 max-w-[200px] text-slate-100">
                            {chapters.length > 0 ? chapters[0].title : "Memuat E-Book..."}
                        </h1>
                    </div>
                </div>

                {pages.length > 0 && (
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                        {currentPageIndex + 1} / {pages.length}
                    </span>
                )}
            </div>

            {/* AREA UTAMA PEMBACA (STANDAR KERTAS A5 MUTLAK) */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 w-full">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/80">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
                        <p className="text-xs font-semibold uppercase tracking-wider">Mempaginasi Kertas A5...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl p-6 max-w-sm shadow-2xl">
                        <BookOpen className="w-12 h-12 text-rose-500 mb-3 opacity-60" />
                        <h2 className="text-base font-black text-slate-800 mb-1">Akses Terkunci</h2>
                        <p className="text-xs text-slate-600 mb-4">{errorMsg}</p>
                        <button 
                            onClick={() => setLocation("/paywall")} 
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-full text-xs transition-transform active:scale-95"
                        >
                            Upgrade Ke Pro
                        </button>
                    </div>
                ) : currentPage ? (
                    <div className="flex flex-col items-center gap-4">
                        {/* 📄 LEMBAR KERTAS A5 FISIK (UKURAN DIKUNCI MUTLAK) */}
                        <div className="bg-[#FFFDF9] shadow-2xl w-[92vw] max-w-[460px] h-[650px] p-8 rounded-sm border border-stone-300 relative flex flex-col justify-between font-serif overflow-hidden">
                            {/* Running Header */}
                            <div className="w-full text-center border-b border-stone-200/60 pb-2 text-[9px] text-stone-400 font-sans tracking-widest uppercase line-clamp-1">
                                {currentPage.chapterTitle || chapters[0]?.title}
                            </div>

                            {/* Isi Teks Lembaran Halaman */}
                            <div className="flex-1 my-4 overflow-hidden select-text">
                                {currentPage.paragraphs.map((p, idx) => renderParagraph(p, idx))}
                            </div>

                            {/* Footer Nomor Halaman Kertas */}
                            <div className="w-full text-center pt-2 text-[9px] text-stone-400 font-sans tracking-widest border-t border-stone-200/60">
                                — {currentPage.pageNumber} —
                            </div>
                        </div>

                        {/* Kontrol Navigasi Halaman (Prev / Next) */}
                        <div className="flex items-center gap-4 mt-2">
                            <button
                                onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
                                disabled={currentPageIndex === 0}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 active:scale-95 transition-all shadow-md"
                            >
                                <ChevronLeft className="w-4 h-4" /> Sebelum
                            </button>

                            <span className="text-xs font-semibold text-slate-200 font-mono">
                                Hal {currentPageIndex + 1} dari {pages.length}
                            </span>

                            <button
                                onClick={() => setCurrentPageIndex(p => Math.min(pages.length - 1, p + 1))}
                                disabled={currentPageIndex === pages.length - 1}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 active:scale-95 transition-all shadow-md"
                            >
                                Sesudah <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}