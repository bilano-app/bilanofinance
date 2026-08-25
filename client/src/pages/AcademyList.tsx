import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import {
    BookOpen, Lock, Loader2, ChevronRight, Sparkles, Search,
    Bookmark, Crown, ArrowLeft, BookMarked, CheckCircle2, Star
} from "lucide-react";
import { useUser } from "@/hooks/use-finance";

interface Ebook {
    id: number;
    title: string;
    author: string;
    description: string;
    is_premium?: boolean;
    cover_url?: string;
    pdf_url?: string;
    category?: string;
}

const CATEGORIES = [
    { id: "all", label: "Semua Buku" },
    { id: "finansial", label: "Dasar Finansial" },
    { id: "investasi", label: "Investasi & Pasar" },
    { id: "psikologi", label: "Psikologi Uang" },
    { id: "mindset", label: "Mindset Sukses" },
];

export default function AcademyList() {
    const [, setLocation] = useLocation();
    const { data: user } = useUser();

    const [ebooks, setEbooks] = useState<Ebook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [coverErrors, setCoverErrors] = useState<Record<number, boolean>>({});
    const [userBookmarks, setUserBookmarks] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchEbooks = async () => {
            try {
                const response = await fetch("/api/ebooks");
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setEbooks(result.data);

                    // Ambil semua bookmark yang tersimpan di localStorage
                    const bms: Record<string, string> = {};
                    result.data.forEach((b: Ebook) => {
                        const saved = localStorage.getItem(`bookmark_bilano_${b.title}`);
                        if (saved) bms[b.title] = saved;
                    });
                    setUserBookmarks(bms);
                }
            } catch (error) {
                console.error("Gagal mengambil data buku:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEbooks();
    }, []);

    const filteredEbooks = useMemo(() => {
        return ebooks.filter(book => {
            const matchesSearch = 
                book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (book.description && book.description.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (selectedCategory === "all") return true;
            
            const titleLower = book.title.toLowerCase();
            const descLower = (book.description || "").toLowerCase();

            if (selectedCategory === "finansial") {
                return titleLower.includes("wealth") || titleLower.includes("money") || descLower.includes("finansial") || descLower.includes("kekayaan");
            }
            if (selectedCategory === "investasi") {
                return titleLower.includes("lombard") || titleLower.includes("market") || titleLower.includes("pasar") || descLower.includes("investasi");
            }
            if (selectedCategory === "psikologi") {
                return titleLower.includes("delusion") || titleLower.includes("crowd") || descLower.includes("psikologi") || descLower.includes("massa");
            }
            if (selectedCategory === "mindset") {
                return titleLower.includes("science") || titleLower.includes("getting rich") || descLower.includes("pikiran") || descLower.includes("sukses");
            }

            return true;
        });
    }, [ebooks, searchQuery, selectedCategory]);

    return (
        <MobileLayout>
            <div className="flex flex-col -mx-5 -mt-5">
                
                {/* 1. TOP HEADER GRADIENT BANNER DENGAN NUANSA GOLD & NAVY */}
                <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#FEF6E4] via-[#FDECC8] to-[#FCE0A2] flex flex-col relative z-10 border-b-2 border-brand-gold">
                    
                    {/* Header Nav Bar */}
                    <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(29,62,114,0.06)] flex items-center justify-between relative z-30 border-b border-amber-100">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <button 
                                    className="w-10 h-10 rounded-full bg-brand-gold hover:bg-brand-goldDark text-brand-navy shadow-[2px_2px_0px_0px] shadow-brand-navy active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                                    title="Kembali ke Beranda"
                                >
                                    <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                            </Link>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse"></span>
                                    <p className="text-[10px] font-black text-brand-navy uppercase tracking-widest">
                                        Perpustakaan VIP
                                    </p>
                                </div>
                                <h1 className="text-lg font-black text-slate-900 leading-tight">
                                    BILANO Academy
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {user?.isPro ? (
                                <div className="flex items-center gap-1 bg-brand-navy text-brand-gold px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 border border-brand-gold/30">
                                    <Crown className="w-3.5 h-3.5 fill-current" />
                                    <span className="text-[10px] font-black tracking-wider uppercase">VIP PRO</span>
                                </div>
                            ) : (
                                <Link href="/paywall">
                                    <div className="flex items-center gap-1 bg-brand-gold hover:bg-brand-goldDark text-brand-navy px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-brand-navy transition-all cursor-pointer">
                                        <Crown className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black tracking-wider uppercase">AKSES VIP</span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* 2. HERO CARD — GOLD DOMINANT DENGAN AKSEN NAVY (SESUAI CARD HOME) */}
                    <div className="bg-brand-gold text-brand-navy p-5 rounded-[28px] border-l-[6px] border-l-brand-navy shadow-[6px_6px_0px_0px] shadow-brand-navy relative overflow-hidden mt-4">
                        {/* Background Watermarks */}
                        <BookOpen className="absolute -right-4 -bottom-4 w-32 h-32 text-brand-navy/10 rotate-12 pointer-events-none" strokeWidth={1} />
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 rounded-full blur-xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-brand-navy text-brand-gold text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                                    KOMPILASI EKSKLUSIF
                                </span>
                                <span className="text-[11px] font-bold text-brand-navy/80 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-brand-navy" /> E-Book Pilihan
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-brand-navy flex items-center justify-center shrink-0 overflow-hidden shadow-md border-2 border-white/20">
                                    <img src="/EBOOK.png" alt="BILANO Academy" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="font-black text-brand-navy text-lg leading-tight tracking-tight">
                                        Mahakarya Finansial
                                    </h2>
                                    <p className="text-xs text-brand-navy/85 font-semibold mt-0.5 leading-snug">
                                        Panduan literasi keuangan, psikologi investasi & akumulasi aset teruji.
                                    </p>
                                </div>
                            </div>

                            {/* Mini Highlights */}
                            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-brand-navy/15 text-center">
                                <div className="bg-white/40 rounded-xl py-1.5 px-2 backdrop-blur-xs">
                                    <p className="text-[9px] font-black text-brand-navy/70 uppercase">Format</p>
                                    <p className="text-[11px] font-black text-brand-navy">E-Book PDF</p>
                                </div>
                                <div className="bg-white/40 rounded-xl py-1.5 px-2 backdrop-blur-xs">
                                    <p className="text-[9px] font-black text-brand-navy/70 uppercase">Bahasa</p>
                                    <p className="text-[11px] font-black text-brand-navy">Indonesia</p>
                                </div>
                                <div className="bg-white/40 rounded-xl py-1.5 px-2 backdrop-blur-xs">
                                    <p className="text-[9px] font-black text-brand-navy/70 uppercase">Akses</p>
                                    <p className="text-[11px] font-black text-brand-navy">Unlimited</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. SEARCH & CATEGORY FILTER SECTION */}
                <div className="px-5 pt-5 pb-2 bg-slate-50 flex flex-col gap-3">
                    
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-navy/60" />
                        <input
                            type="text"
                            placeholder="Cari judul buku, penulis, atau topik..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-11 pr-4 bg-white rounded-2xl border-2 border-amber-200/80 text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-gold/30 shadow-[3px_3px_0px_0px_rgba(29,62,114,0.1)] transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Category Scroll Bar */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
                        {CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                        isSelected
                                            ? "bg-brand-gold text-brand-navy shadow-[3px_3px_0px_0px] shadow-brand-navy border border-brand-navy translate-x-[-1px] translate-y-[-1px]"
                                            : "bg-white text-slate-600 border border-slate-200 hover:border-amber-300 active:scale-95 shadow-xs"
                                    }`}
                                >
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-brand-navy"></span>}
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 4. MAIN BOOK CATALOG GRID */}
                <div className="px-5 pt-3 pb-16 bg-slate-50 flex flex-col gap-4 min-h-[50vh]">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-black text-slate-900 text-sm flex items-center uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-brand-gold mr-2"></span>
                            Daftar E-Book ({filteredEbooks.length})
                        </h3>
                        {Object.keys(userBookmarks).length > 0 && (
                            <span className="text-[11px] font-bold text-brand-navy flex items-center gap-1 bg-amber-100 border border-brand-gold/40 px-2.5 py-0.5 rounded-full">
                                <Bookmark className="w-3 h-3 text-brand-gold fill-current" />
                                {Object.keys(userBookmarks).length} Tersimpan
                            </span>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[28px] shadow-[4px_4px_0px_0px] shadow-brand-navy/20 border-2 border-amber-100">
                            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                                <Loader2 className="w-7 h-7 animate-spin text-brand-navy" />
                            </div>
                            <p className="text-sm font-black text-brand-navy">Membuka Rak Buku VIP...</p>
                            <p className="text-xs text-slate-400 font-medium mt-1">Menyiapkan dokumen resolusi tinggi</p>
                        </div>
                    ) : filteredEbooks.length === 0 ? (
                        <div className="text-center py-16 px-6 bg-white rounded-[28px] shadow-[4px_4px_0px_0px] shadow-brand-navy/15 border-2 border-slate-100">
                            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                <BookOpen className="w-8 h-8 text-brand-gold" />
                            </div>
                            <h3 className="text-base font-black text-slate-800">Tidak Menemukan Buku</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs mx-auto">
                                Coba gunakan kata kunci pencarian lain atau pilih kategori Semua Buku.
                            </p>
                            <button
                                onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                                className="mt-4 px-5 py-2.5 bg-brand-gold text-brand-navy rounded-xl font-black text-xs shadow-[3px_3px_0px_0px] shadow-brand-navy active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                            >
                                Tampilkan Semua Buku
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3.5">
                            {filteredEbooks.map((ebook) => {
                                const savedPage = userBookmarks[ebook.title];

                                return (
                                    <div
                                        key={ebook.id}
                                        onClick={() => setLocation(`/academy/${ebook.id}/read/1`)}
                                        className="group flex flex-col bg-white rounded-[24px] border-2 border-amber-200/90 shadow-[5px_5px_0px_0px] shadow-brand-navy hover:shadow-[6px_6px_0px_0px] hover:shadow-brand-navy active:shadow-[2px_2px_0px_0px] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-200 cursor-pointer overflow-hidden relative"
                                    >
                                        {/* Cover Image Container (Rasio 2:3 buku standar) */}
                                        <div className="w-full aspect-[2/3] relative overflow-hidden bg-slate-900 border-b border-amber-100">
                                            {ebook.cover_url && !coverErrors[ebook.id] ? (
                                                <img
                                                    src={ebook.cover_url}
                                                    alt={ebook.title}
                                                    onError={() => setCoverErrors((prev) => ({ ...prev, [ebook.id]: true }))}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                // Fallback Cover Estetik Bilano Gold & Navy
                                                <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-br from-[#1D3E72] via-[#163360] to-[#0d1e38] text-white relative overflow-hidden">
                                                    <div className="absolute right-0 top-0 w-24 h-24 bg-brand-gold/15 rounded-full blur-lg pointer-events-none" />
                                                    <div className="flex justify-between items-start relative z-10">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-gold">
                                                            BILANO
                                                        </span>
                                                        <BookOpen className="w-3.5 h-3.5 text-brand-gold/70" />
                                                    </div>

                                                    <div className="my-auto relative z-10">
                                                        <h4 className="font-serif font-black text-amber-100 text-xs sm:text-sm leading-tight drop-shadow-md line-clamp-3">
                                                            {ebook.title}
                                                        </h4>
                                                        <p className="text-[9px] text-blue-200/80 font-medium mt-1 truncate">
                                                            {ebook.author}
                                                        </p>
                                                    </div>

                                                    <div className="pt-2 border-t border-white/10 relative z-10 flex justify-between items-center text-[8px] font-bold text-amber-200">
                                                        <span>VIP ACADEMY</span>
                                                        <span>PDF</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Gradient Overlay Lembut */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                                            {/* Badge Status VIP */}
                                            <div className="absolute top-2.5 right-2.5 z-10">
                                                <span className="bg-brand-gold text-brand-navy text-[8px] font-black px-2 py-0.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-950 uppercase tracking-wider flex items-center gap-1 border border-brand-navy/30">
                                                    <Crown className="w-2.5 h-2.5 fill-current" /> VIP
                                                </span>
                                            </div>

                                            {/* Badge Bookmark jika ada progres baca */}
                                            {savedPage && (
                                                <div className="absolute bottom-2 left-2 z-10">
                                                    <span className="bg-brand-navy/95 text-brand-gold text-[9px] font-black px-2 py-0.5 rounded-lg backdrop-blur-md shadow-md flex items-center gap-1 border border-brand-gold/40">
                                                        <Bookmark className="w-2.5 h-2.5 fill-current" /> Hal {savedPage}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Area Detail Info Buku */}
                                        <div className="p-3.5 flex flex-col flex-grow bg-white">
                                            <h3 className="font-black text-slate-900 text-xs md:text-sm leading-snug line-clamp-2 mb-1 group-hover:text-brand-navy transition-colors">
                                                {ebook.title}
                                            </h3>
                                            <p className="text-[10px] text-slate-500 font-bold mb-2 truncate">
                                                {ebook.author}
                                            </p>

                                            {/* Tombol Baca Sekarang Khas Bilano Gold */}
                                            <div className="mt-auto pt-2">
                                                <div className="w-full h-9 rounded-xl bg-brand-gold group-hover:bg-brand-goldDark text-brand-navy font-black text-[11px] shadow-[3px_3px_0px_0px] shadow-brand-navy active:shadow-[1px_1px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-1 transition-all">
                                                    <span>{savedPage ? "Lanjut Baca" : "Baca Sekarang"}</span>
                                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer Info */}
                    <div className="mt-4 mb-2 flex flex-col items-center justify-center opacity-70 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            BILANO ACADEMY • VIP WEALTH LIBRARY
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                            Koleksi buku diperbarui berkala untuk anggota Bilano.
                        </p>
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
}