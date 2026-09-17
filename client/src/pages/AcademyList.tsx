import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import {
    BookOpen, Lock, Loader2, ChevronRight, Sparkles, Search,
    Bookmark, Crown, ArrowLeft, BookMarked, CheckCircle2, Star, Clock
} from "lucide-react";
import { useUser } from "@/hooks/use-finance";
import { useWelcomeCountdown } from "@/lib/welcome-deal";
import EbookPaywallScreen from "@/components/EbookPaywallScreen";
import { TrialFeatureNotice } from "@/components/TrialFeatureNotice";
import { getTrialInfo } from "@/lib/trial-manager";

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

    const trial = getTrialInfo(user);
    const welcomeCountdown = useWelcomeCountdown(user?.email || "");
    const isProMember = Boolean(user?.isPro || user?.hasEbookAccess || (!welcomeCountdown.isExpired && trial.isTrialExpired));
    const isExploration = trial.isTrialActive && !isProMember;
    const hasAccess = isProMember || isExploration;

    const [lockedEbookModal, setLockedEbookModal] = useState<{ isOpen: boolean; title: string }>({ isOpen: false, title: "" });

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
            <TrialFeatureNotice featureKey="academy" featureName="BILANO Academy" />
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

                    {!hasAccess ? (
                        <EbookPaywallScreen user={user} email={user?.email || ""} />
                    ) : (
                        /* 2. HERO CARD — GOLD DOMINANT DENGAN AKSEN NAVY (SESUAI CARD HOME) */
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
                                    <BookOpen className="w-3 h-3 text-brand-navy" /> E-Book Pilihan
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
                                        {isExploration ? "Akses Eksplorasi 24 Jam: 1 E-Book gratis dibuka untuk Anda." : "Panduan literasi keuangan, psikologi investasi & akumulasi aset teruji."}
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
                                    <p className="text-[11px] font-black text-brand-navy">{isExploration ? "1 Buku Pilihan" : "Unlimited"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                </div>

                {hasAccess && (
                    <>
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
                                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${isSelected
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
                            {filteredEbooks.map((ebook, idx) => {
                                const savedPage = userBookmarks[ebook.title];
                                // Dalam Mode Eksplorasi 24 Jam, hanya buku pertama (idx === 0) yang terbuka
                                const isBookLocked = isExploration && idx > 0;

                                return (
                                    <div
                                        key={ebook.id}
                                        onClick={() => {
                                            if (isBookLocked) {
                                                setLockedEbookModal({ isOpen: true, title: ebook.title });
                                            } else {
                                                setLocation(`/academy/${ebook.id}/read/1`);
                                            }
                                        }}
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

                                            {/* Badge Status VIP / Eksplorasi */}
                                            <div className="absolute top-2.5 right-2.5 z-10">
                                                {isBookLocked ? (
                                                    <span className="bg-slate-900/90 text-amber-300 text-[8px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1 border border-amber-400/40">
                                                        <Lock className="w-2.5 h-2.5" /> VIP
                                                    </span>
                                                ) : isExploration ? (
                                                    <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1 border border-white/30">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> EKSPLORASI
                                                    </span>
                                                ) : (
                                                    <span className="bg-brand-gold text-brand-navy text-[8px] font-black px-2 py-0.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-950 uppercase tracking-wider flex items-center gap-1 border border-brand-navy/30">
                                                        <Crown className="w-2.5 h-2.5 fill-current" /> VIP
                                                    </span>
                                                )}
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

                                            {/* Tombol Baca Sekarang / Buka Akses */}
                                            <div className="mt-auto pt-2">
                                                {isBookLocked ? (
                                                    <div className="w-full h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[11px] border border-slate-200 flex items-center justify-center gap-1 transition-all">
                                                        <Lock className="w-3 h-3 text-amber-600" />
                                                        <span>Terkunci (VIP)</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-9 rounded-xl bg-brand-gold group-hover:bg-brand-goldDark text-brand-navy font-black text-[11px] shadow-[3px_3px_0px_0px] shadow-brand-navy active:shadow-[1px_1px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-1 transition-all">
                                                        <span>{savedPage ? "Lanjut Baca" : "Baca Sekarang"}</span>
                                                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* 📖 KOTAK: E-BOOK LAINNYA SEDANG DALAM PROSES */}
                            {selectedCategory === "all" && !searchQuery && (
                                <div className="flex flex-col bg-gradient-to-b from-[#FFFDF8] via-[#FFF9EE] to-[#FEF5E2] rounded-[24px] border-2 border-dashed border-amber-300 shadow-[5px_5px_0px_0px] shadow-amber-200/70 overflow-hidden relative group transition-all duration-200">
                                    {/* Visual Header / Placeholder Mockup matching aspect-[2/3] */}
                                    <div className="w-full aspect-[2/3] relative overflow-hidden bg-gradient-to-br from-amber-100/70 via-amber-50 to-orange-50/50 border-b border-dashed border-amber-200 flex flex-col items-center justify-center p-3.5 text-center">
                                        {/* Ambient background decoration */}
                                        <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-brand-gold/20 rounded-full blur-xl pointer-events-none" />
                                        <div className="absolute -left-4 -top-4 w-24 h-24 bg-amber-200/40 rounded-full blur-lg pointer-events-none" />

                                        {/* Status Badge */}
                                        <div className="absolute top-2.5 right-2.5 z-10">
                                            <span className="bg-brand-navy text-brand-gold text-[8px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider flex items-center gap-1 border border-brand-gold/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-ping"></span>
                                                PROSES
                                            </span>
                                        </div>

                                        {/* Glowing Icon Centerpiece */}
                                        <div className="w-13 h-13 rounded-2xl bg-white border-2 border-amber-200 text-brand-navy flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(217,119,6,0.15)] relative mb-2.5 group-hover:scale-105 transition-transform">
                                            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                                        </div>

                                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300/70">
                                            Sedang Dicurasi
                                        </span>

                                        <p className="font-serif font-black text-slate-800 text-xs mt-2 leading-tight px-1">
                                            Koleksi Mahakarya Berikutnya
                                        </p>
                                        <p className="text-[9px] text-slate-500 font-semibold mt-1 leading-snug px-1">
                                            Dalam tahap penulisan & alih bahasa
                                        </p>
                                    </div>

                                    {/* Area Detail Info Buku */}
                                    <div className="p-3.5 flex flex-col flex-grow bg-white/90 backdrop-blur-xs justify-between">
                                        <div>
                                            <h3 className="font-black text-slate-800 text-xs md:text-sm leading-snug line-clamp-2 mb-1">
                                                E-Book Lainnya Sedang Dalam Proses
                                            </h3>
                                            <p className="text-[10px] text-amber-700 font-bold mb-2 truncate">
                                                Tim Riset & Editorial Bilano
                                            </p>
                                        </div>

                                        {/* Status Button Placeholder */}
                                        <div className="mt-auto pt-2">
                                            <div className="w-full h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-black text-[10px] flex items-center justify-center gap-1.5 shadow-xs">
                                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                <span>Segera Hadir</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 mb-2 flex flex-col items-center justify-center opacity-70 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            BILANO ACADEMY • VIP WEALTH LIBRARY
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                            Koleksi buku diperbarui berkala untuk anggota Bilano.
                        </p>
                    </div>
                </div>
                </>
                )}
            </div>

            {/* 🔒 MODAL POPUP KHUSUS E-BOOK TERKUNCI SAAT MODE EKSPLORASI */}
            {lockedEbookModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border-2 border-brand-gold relative overflow-hidden animate-in zoom-in-95 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-brand-navy flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Lock className="w-8 h-8 text-amber-600" />
                        </div>

                        <span className="bg-brand-navy text-brand-gold text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                            E-BOOK EKSKLUSIF VIP
                        </span>

                        <h3 className="text-lg font-black text-slate-900 leading-tight mb-2">
                            Buka Akses Seluruh 5 E-Book
                        </h3>

                        <p className="text-xs text-slate-600 leading-relaxed mb-5 font-medium">
                            Selama <strong className="text-slate-900">Akses Eksplorasi 24 Jam</strong>, Anda mendapatkan 1 E-Book gratis. Seluruh koleksi lengkap 5 Mahakarya Finansial dapat dibuka dengan upgrade ke Paket VIP atau promo penawaran spesial.
                        </p>

                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setLockedEbookModal({ isOpen: false, title: "" });
                                    setLocation("/paywall");
                                }}
                                className="w-full bg-brand-gold hover:bg-brand-goldDark text-brand-navy font-black text-xs py-3.5 px-4 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Crown className="w-4 h-4" />
                                <span>Buka Semua E-Book (Upgrade VIP)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setLockedEbookModal({ isOpen: false, title: "" })}
                                className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MobileLayout>
    );
}