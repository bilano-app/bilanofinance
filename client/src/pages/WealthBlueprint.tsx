import { useState, useEffect, useRef } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useUser, useTransactions } from "@/hooks/use-finance";
import { 
    Brain, Rocket, Target, ArrowRight, Loader2, Info, ChevronRight, 
    CheckCircle2, Sparkles, BookOpen, AlertCircle, Plus, Trash2, ShieldAlert,
    Send, Bot, User, BarChart3, PlusCircle, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// =========================================================================
// 📐 TYPE DEFINITIONS & STATE MACHINE CONTRACT (S0 - S15)
// =========================================================================
type StateId = 
  | 'S0_LANDING' 
  | 'S1_Q_STATUS' 
  | 'S2_Q_TUJUAN' 
  | 'S3_Q_POLA_KERJA' 
  | 'S4_Q_LATAR_BELAKANG' 
  | 'S5_Q_KEAHLIAN' 
  | 'S6_Q_ASET' 
  | 'S7_Q_KONSTRAIN_WAKTU' 
  | 'S8_GENERATE_REKOMENDASI' 
  | 'S9_PILIH_IDE' 
  | 'S10_RENCANA_BAHAN' 
  | 'S11_RISET_HARGA' 
  | 'S12_CEK_KELAYAKAN' 
  | 'S13_STRATEGI_MODAL' 
  | 'S14_STRATEGI_JUAL' 
  | 'S15_TRACKING_OMSET';

interface OptionItem {
    value: string;
    label: string;
}

interface StepCardSection {
    type: 'choice_single' | 'choice_multi' | 'input_group' | 'info';
    id?: string;
    label: string;
    options?: OptionItem[];
    fields?: { id: string; placeholder: string; input_type: 'text' | 'number' }[];
}

interface GenericStepCard {
    type: 'step_card';
    header: { title: string; color_variant: 'primary' | 'accent' };
    sections: StepCardSection[];
}

interface RecommendationIdea {
    id: string;
    title: string;
    pitch: string;
    why_it_fits: string;
    capital_level: 'TANPA_MODAL' | 'MODAL_KECIL' | 'MODAL_SEDANG';
    needs_upskilling: boolean;
    upskilling_note: string | null;
    difficulty: 'MUDAH' | 'SEDANG' | 'MENANTANG';
    estimated_time_to_first_income: string;
    risk_note: string;
}

interface MaterialItem {
    id: string;
    name: string;
    price: number;
    note?: string | null;
}

interface RevenueLog {
    id: string;
    date: string;
    amount: number;
    note: string;
}

export default function WealthBlueprint() {
    const { data: user } = useUser();
    const { data: transactions } = useTransactions();
    const { toast } = useToast();

    // Core State Machine Engine
    const [currentState, setCurrentState] = useState<StateId>('S0_LANDING');
    
    // Data Storage Dokumen Kontrak (.md)
    const [profileData, setProfileData] = useState<any>({
        status: '', tujuan: '', polaKerja: '', latarBelakang: {},
        keahlian: [], keahlianBebas: '', aset: [], konstrainWaktu: {}
    });
    
    const [recommendations, setRecommendations] = useState<RecommendationIdea[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<RecommendationIdea | null>(null);
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [capitalStrategies, setCapitalStrategies] = useState<any[]>([]);
    const [revenueLogs, setRevenueLogs] = useState<RevenueLog[]>([]);

    // UI Buffers & Interaction States
    const [textInputBuffer, setTextBuffer] = useState("");
    const [multiSelectBuffer, setMultiSelectBuffer] = useState<string[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
    const [isAiProcessing, setIsAiLoading] = useState(false);
    const [aiVerdictNote, setAiVerdictNote] = useState<string | null>(null);
    
    // Revenue entry inputs (S15)
    const [revAmount, setRevAmount] = useState("");
    const [revNote, setRevNote] = useState("");

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isAiProcessing]);

    // =========================================================================
    // 📊 PRINSIP 3: AUTO-PULL DATA FINANSIAL AKTUAL TANPA BERTANYA REPETITIF
    // =========================================================================
    const pullFinancialSnapshot = () => {
        const currentCash = user?.cashBalance || 0;
        
        // Kalkulasi pengeluaran bulanan rata-rata dari mutasi riil database
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const monthlyExpenseTxs = transactions?.filter(t => {
            const d = new Date(t.date);
            return t.type === 'expense' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }) || [];
        
        const totalExpenseThisMonth = monthlyExpenseTxs.reduce((acc, t) => acc + Number(t.amount), 0);
        const baselineExpense = totalExpenseThisMonth > 0 ? totalExpenseThisMonth : 1500000;

        return {
            saldo_saat_ini: currentCash,
            rata2_pengeluaran_bulanan: baselineExpense,
            sisa_dana_aman: Math.max(0, currentCash - baselineExpense), // buffer 1 bulan proteksi cashflow
            data_cukup_representatif: (transactions?.length || 0) >= 5
        };
    };

    // =========================================================================
    // ⚙️ RENDERER ENGINE GENERIK UNTUK STEP_CARD (PRINSIP ARSITEKTUR #6)
    // =========================================================================
    const processFase1Choice = (field: string, value: string, nextState: StateId) => {
        setProfileData((prev: any) => ({ ...prev, [field]: value }));
        setCurrentState(nextState);
    };

    const processFase1Multi = (field: string, values: string[], nextState: StateId) => {
        setProfileData((prev: any) => ({ ...prev, [field]: values }));
        setCurrentState(nextState);
    };

    const renderDynamicStepCard = () => {
        switch (currentState) {
            case 'S1_Q_STATUS':
                return (
                    <StepCardWrapper title="Identifikasi Profil" color_variant="primary" icon={<Brain className="w-5 h-5"/>}>
                        <p className="text-sm font-bold text-slate-800 mb-4">Kamu saat ini berstatus sebagai apa?</p>
                        <div className="space-y-3">
                            {[
                                { v: 'PELAJAR', l: 'Pelajar (SMP/SMA/SMK)' },
                                { v: 'MAHASISWA', l: 'Mahasiswa Aktif' },
                                { v: 'PEKERJA', l: 'Sudah Bekerja (Tetap/Kontrak)' },
                                { v: 'BELUM_BEKERJA', l: 'Sedang Mencari Pekerjaan' }
                            ].map(opt => (
                                <div key={opt.v} onClick={() => processFase1Choice('status', opt.v, 'S2_Q_TUJUAN')} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 cursor-pointer transition-all flex justify-between items-center group">
                                    <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">{opt.l}</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500"/>
                                </div>
                            ))}
                        </div>
                    </StepCardWrapper>
                );

            case 'S2_Q_TUJUAN':
                let targetOptions: OptionItem[] = [];
                if (profileData.status === 'PELAJAR') {
                    targetOptions = [
                        { value: 'UANG_JAJAN', label: 'Uang Jajan Pribadi' },
                        { value: 'MENABUNG_TUJUAN', label: 'Menabung buat Sesuatu (Gadget/Liburan)' },
                        { value: 'BELAJAR_MANDIRI', label: 'Belajar Cari Uang Sendiri sejak Dini' }
                    ];
                } else if (profileData.status === 'MAHASISWA') {
                    targetOptions = [
                        { value: 'UANG_SAKU', label: 'Tambahan Uang Saku Kuliah' },
                        { value: 'BIAYA_KULIAH', label: 'Membantu UKT / Kos / Buku' },
                        { value: 'PORTOFOLIO_KARIR', label: 'Mencari Pengalaman Kerja & Portofolio' }
                    ];
                } else if (profileData.status === 'PEKERJA') {
                    targetOptions = [
                        { value: 'PENGHASILAN_TAMBAHAN', label: 'Penghasilan Sampingan di Luar Gaji' },
                        { value: 'GAJI_KURANG', label: 'Gaji Utama Kurang Mencukupi Kebutuhan' },
                        { value: 'RENCANA_JANGKA_PANJANG', label: 'Mempersiapkan Modal Bisnis untuk Resign' }
                    ];
                } else {
                    targetOptions = [
                        { value: 'PENGHASILAN_SEMENTARA', label: 'Penghasilan Sementara Sambil Cari Kerja' },
                        { value: 'PIVOT_KE_USAHA', label: 'Sudah Mantap Ingin Full-time Berwirausaha' },
                        { value: 'EKSPLORASI', label: 'Sekadar Melihat-lihat Peluang yang Cocok' }
                    ];
                }

                return (
                    <StepCardWrapper title="Tujuan Finansial" color_variant="accent" icon={<Target className="w-5 h-5"/>}>
                        <p className="text-sm font-bold text-slate-800 mb-4">Apa tujuan utama kamu mencari penghasilan tambahan saat ini?</p>
                        <div className="space-y-3">
                            {targetOptions.map(opt => (
                                <div key={opt.value} onClick={() => processFase1Choice('tujuan', opt.value, 'S3_Q_POLA_KERJA')} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/50 cursor-pointer transition-all flex justify-between items-center group">
                                    <span className="font-bold text-sm text-slate-700 group-hover:text-emerald-700">{opt.label}</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500"/>
                                </div>
                            ))}
                        </div>
                    </StepCardWrapper>
                );

            case 'S3_Q_POLA_KERJA':
                let framingText = "Pilih komitmen waktu kerjamu:";
                if (profileData.status === 'PEKERJA') {
                    framingText = "Karena kamu sudah punya kerja utama, kamu mau jadwal yang pasti (rutin) atau benar-benar fleksibel?";
                } else if (profileData.status === 'MAHASISWA') {
                    framingText = "Sesuaikan dengan jadwal kuliahmu, sistem preferensi kerja yang kamu inginkan:";
                }

                return (
                    <StepCardWrapper title="Komitmen Pola Kerja" color_variant="primary" icon={<BookOpen className="w-5 h-5"/>}>
                        <p className="text-sm font-bold text-slate-800 mb-4">{framingText}</p>
                        <div className="space-y-3">
                            {[
                                { v: 'RUTIN_TERJADWAL', l: 'Rutin Terjadwal (Butuh Komitmen Waktu Pasti)' },
                                { v: 'FLEKSIBEL', l: 'Fleksibel (Kapanpun Ada Waktu Senggang)' }
                            ].map(opt => (
                                <div key={opt.v} onClick={() => processFase1Choice('polaKerja', opt.v, 'S4_Q_LATAR_BELAKANG')} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 cursor-pointer transition-all flex justify-between items-center group">
                                    <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">{opt.l}</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500"/>
                                </div>
                            ))}
                        </div>
                    </StepCardWrapper>
                );

            case 'S4_Q_LATAR_BELAKANG':
                let placeholderInput = "Misalnya: Akuntansi Semester 5";
                if (profileData.status === 'PEKERJA') placeholderInput = "Misalnya: Staff Administrasi / Sales Executive";
                if (profileData.status === 'PELAJAR') placeholderInput = "Misalnya: SMK Jurusan Multimedia";

                return (
                    <StepCardWrapper title="Latar Belakang Studi/Kerja" color_variant="accent" icon={<Brain className="w-5 h-5"/>}>
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-800">Tuliskan program studi, jurusan, atau posisi pekerjaanmu saat ini untuk pencocokan skill:</p>
                            <Input 
                                placeholder={placeholderInput}
                                value={textInputBuffer}
                                onChange={(e) => setTextBuffer(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-12 rounded-xl"
                            />
                            <Button 
                                disabled={!textInputBuffer.trim()}
                                onClick={() => {
                                    setProfileData((prev: any) => ({ ...prev, latarBelakang: { detail: textInputBuffer } }));
                                    setTextBuffer("");
                                    setCurrentState('S5_Q_KEAHLIAN');
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-12"
                            >
                                LANJUTKAN
                            </Button>
                        </div>
                    </StepCardWrapper>
                );

            case 'S5_Q_KEAHLIAN':
                return (
                    <StepCardWrapper title="Inventaris Keahlian" color_variant="primary" icon={<Sparkles className="w-5 h-5"/>}>
                        <p className="text-sm font-bold text-slate-800 mb-4">Pilih kelompok keahlian yang kamu kuasai (Bisa pilih lebih dari satu):</p>
                        <div className="space-y-3">
                            {[
                                { v: 'KREATIF', l: 'Kreatif (Desain Grafis, Penulisan Content, Editing Video/Foto)' },
                                { v: 'DIGITAL_TEKNIS', l: 'Digital Teknis (Coding, Riset Web, Analisa Data Excel)' },
                                {v: 'KULINER', l: 'Kuliner (Memasak, Baking Kue, Meracik Minuman)'},
                                {v: 'INTERPERSONAL', l: 'Interpersonal (Jualan/Sales, Mengajar, Public Speaking)'},
                                {v: 'KERAJINAN_TANGAN', l: 'Kerajinan Tangan (Menjahit, Crafting, Membuat Aksesoris)'},
                                {v: 'FISIK_JASA', l: 'Fisik & Jasa (Bersih-bersih, Packing Logistik, Otomotif)'}
                            ].map(opt => {
                                const isSelected = multiSelectBuffer.includes(opt.v);
                                return (
                                    <div 
                                        key={opt.v} 
                                        onClick={() => {
                                            if (isSelected) setMultiSelectBuffer((prev: any[]) => prev.filter(i => i !== opt.v));
                                            else setMultiSelectBuffer((prev: any[]) => [...prev, opt.v]);
                                        }}
                                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <span className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.l}</span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 mb-2">Punya keahlian spesifik lainnya? Ketik di sini:</p>
                            <Input 
                                placeholder="Contoh: Mengerti rumus Pivot Table Excel, bisa edit CapCut cepat"
                                value={textInputBuffer}
                                onChange={(e) => setTextBuffer(e.target.value)}
                                className="text-sm border-slate-200 mb-4 h-12 rounded-xl"
                            />
                            <Button 
                                disabled={multiSelectBuffer.length === 0 && !textInputBuffer.trim()}
                                onClick={() => {
                                    processFase1Multi('keahlian', multiSelectBuffer, 'S6_Q_ASET');
                                    setProfileData((prev: any) => ({ ...prev, keahlianBebas: textInputBuffer }));
                                    setMultiSelectBuffer([]); setTextBuffer("");
                                }}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-12 shadow-md shadow-emerald-100"
                            >
                                SIMPAN KEAHLIAN
                            </Button>
                        </div>
                    </StepCardWrapper>
                );

            case 'S6_Q_ASET':
                return (
                    <StepCardWrapper title="Aset Fisik Pendukung" color_variant="accent" icon={<CheckCircle2 className="w-5 h-5"/>}>
                        <p className="text-sm font-bold text-slate-800 mb-4">Pilih aset pendukung yang sudah kamu miliki di tangan saat ini:</p>
                        <div className="space-y-3">
                            {[
                                { v: 'LAPTOP_PC', l: 'Laptop / Komputer PC Memadai' },
                                { v: 'HP_KAMERA_BAGUS', l: 'Smartphone dengan Kamera Jernih' },
                                { v: 'KENDARAAN', l: 'Motor / Mobil Pribadi' },
                                { v: 'RUANG_USAHA', l: 'Ruang Kosong (Dapur / Garasi / Kamar Kosong)' },
                                { v: 'PERALATAN_DAPUR', l: 'Peralatan Memasak/Baking Lengkap' }
                            ].map(opt => {
                                const isSelected = multiSelectBuffer.includes(opt.v);
                                return (
                                    <div 
                                        key={opt.v} 
                                        onClick={() => {
                                            if (isSelected) setMultiSelectBuffer((prev: any[]) => prev.filter(i => i !== opt.v));
                                            else setMultiSelectBuffer((prev: any[]) => [...prev, opt.v]);
                                        }}
                                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <span className={`font-bold text-sm ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>{opt.l}</span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <Button 
                            onClick={() => {
                                processFase1Multi('aset', multiSelectBuffer, 'S7_Q_KONSTRAIN_WAKTU');
                                setMultiSelectBuffer([]);
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-12 mt-6"
                        >
                            SIMPAN ASET & LANJUT
                        </Button>
                    </StepCardWrapper>
                );

            case 'S7_Q_KONSTRAIN_WAKTU':
                return (
                    <StepCardWrapper title="Ketersediaan Waktu Luang" color_variant="primary" icon={<Target className="w-5 h-5"/>}>
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-800">Secara realistis, berapa jam dalam **satu minggu** yang bisa kamu luangkan penuh untuk fokus mengeksekusi ini?</p>
                            <Input 
                                type="number"
                                placeholder="Contoh: 15"
                                value={textInputBuffer}
                                onChange={(e) => setTextBuffer(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-12 rounded-xl text-center font-bold text-lg"
                            />
                            <Button 
                                disabled={!textInputBuffer.trim() || isNaN(Number(textInputBuffer))}
                                onClick={() => {
                                    const hours = Number(textInputBuffer);
                                    setProfileData((prev: any) => ({ ...prev, konstrainWaktu: { jam_per_minggu: hours } }));
                                    setTextBuffer("");
                                    executeFase2AiRecommendations({ ...profileData, konstrainWaktu: { jam_per_minggu: hours } });
                                }}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl h-14 shadow-lg shadow-emerald-100 text-sm flex items-center justify-center gap-2"
                            >
                                ANALISIS DENGAN BILANO AI <ArrowRight className="w-4 h-4"/>
                            </Button>
                        </div>
                    </StepCardWrapper>
                );
        }
        return null;
    };

    // =========================================================================
    // 🧠 FASE 2: MEMANGGIL AI JEMBATAN KOGNITIF PUSAT (S8 -> S9)
    // =========================================================================
    const executeFase2AiRecommendations = async (fullProfile: any) => {
        setCurrentState('S8_GENERATE_REKOMENDASI');
        setIsAiLoading(true);
        try {
            const res = await fetch('/api/wealth/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile: fullProfile, financialSnapshot: pullFinancialSnapshot() })
            });
            if (!res.ok) throw new Error();
            const { data } = await res.json();
            setRecommendations(data.recommendations || []);
            setCurrentState('S9_PILIH_IDE');
        } catch (err) {
            toast({ title: "Koneksi Otak AI Terputus", description: "Mengembalikan ke form komitmen.", variant: "destructive" });
            setCurrentState('S7_Q_KONSTRAIN_WAKTU');
        } finally {
            setIsAiLoading(false);
        }
    };

    // =========================================================================
    // 🛠️ FASE 3: S10 - DRAFT BAHAN DAN STRATEGI EKSEKUSI (REASONING PROCESS)
    // =========================================================================
    const handleIdeaSelection = async (idea: RecommendationIdea) => {
        setSelectedIdea(idea);
        setCurrentState('S8_GENERATE_REKOMENDASI');
        setIsAiLoading(true);
        try {
            const res = await fetch('/api/wealth/draft-materials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recommendation: idea })
            });
            if (!res.ok) throw new Error();
            const { data } = await res.json();
            const builtMaterials = data.draft_items.map((item: any) => ({
                id: item.id || Math.random().toString(),
                name: item.name,
                price: item.price || 0,
                note: item.note || ""
            }));
            setMaterials(builtMaterials);
            setCurrentState('S10_RENCANA_BAHAN');
        } catch (err) {
            toast({ title: "Gagal menyusun modul bahan", variant: "destructive" });
            setCurrentState('S9_PILIH_IDE');
        } finally {
            setIsAiLoading(false);
        }
    };

    // =========================================================================
    // 📐 FASE 3: S12 - LOGIKA UTAMA CEK KELAYAKAN FINANSIAL DIKONTROL PENUH KODE
    // =========================================================================
    const executeFinancialFeasibilityCheck = async () => {
        const totalCalculatedCost = materials.reduce((acc, m) => acc + (Number(m.price) || 0), 0);
        const { sisa_dana_aman, saldo_saat_ini } = pullFinancialSnapshot();

        if (totalCalculatedCost <= sisaDanaAmanLogic(sisa_dana_aman)) {
            // Sisa Kas Aman Berlebih -> Langsung Alur Pemasaran (S14)
            executeTriggerSellingStrategy();
        } else {
            // Kas Tidak Mencukupi Batas Aman -> Panggil AI Pengatur S13 (Strategi Modal)
            setCurrentState('S8_GENERATE_REKOMENDASI');
            setIsAiLoading(true);
            try {
                const res = await fetch('/api/wealth/capital-strategy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        totalCost: totalCalculatedCost, 
                        sisaDanaAman: sisa_dana_aman, 
                        profile: profileData, 
                        selectedIdea 
                    })
                });
                if (!res.ok) throw new Error();
                const { data } = await res.json();
                setCapitalStrategies(data.options || []);
                setCurrentState('S13_STRATEGI_MODAL');
            } catch (err) {
                toast({ title: "Gagal memproses strategi mitigasi modal", variant: "destructive" });
                setCurrentState('S10_RENCANA_BAHAN');
            } finally {
                setIsAiLoading(false);
            }
        }
    };

    const sisaDanaAmanLogic = (baseAman: number) => {
        return baseAman > 0 ? baseAman : 500000; // fallback minimal limit safety threshold
    };

    // =========================================================================
    // 💬 FASE 3: S14 - BOUNDED CHAT STRATEGI MARKETEER (INTERAKTIF TERBATAS)
    // =========================================================================
    const executeTriggerSellingStrategy = async () => {
        setCurrentState('S8_GENERATE_REKOMENDASI');
        setIsAiLoading(true);
        try {
            const res = await fetch('/api/wealth/selling-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedIdea, profile: profileData, chatHistory: [], userMessage: "" })
            });
            if (!res.ok) throw new Error();
            const { reply } = await res.json();
            setChatHistory([{ sender: 'ai', text: reply }]);
            setCurrentState('S14_STRATEGI_JUAL');
        } catch (err) {
            toast({ title: "Gagal memuat sistem marketing", variant: "destructive" });
            setCurrentState('S10_RENCANA_BAHAN');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSendSellingChat = async () => {
        if (!chatInput.trim()) return;
        const userMsg = { sender: 'user' as const, text: chatInput };
        const nextHistory = [...chatHistory, userMsg];
        setChatHistory(nextHistory);
        setChatInput("");
        setIsAiLoading(true);

        try {
            const res = await fetch('/api/wealth/selling-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedIdea, profile: profileData, chatHistory: nextHistory, userMessage: chatInput })
            });
            if (!res.ok) throw new Error();
            const { reply } = await res.json();
            setChatHistory((prev: any[]) => [...prev, { sender: 'ai', text: reply }]);
        } catch (err) {
            toast({ title: "Gagal memproses pesan", variant: "destructive" });
        } finally {
            setIsAiLoading(false);
        }
    };

    // =========================================================================
    // 📈 FASE 3: S15 - LOG REVENUE & EVALUASI STRATEGIS BERKELANJUTAN
    // =========================================================================
    const handleCommitRevenueLog = () => {
        if (!revAmount || isNaN(Number(revAmount)) || Number(revAmount) <= 0) return;
        const logEntry: RevenueLog = {
            id: Math.random().toString(),
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            amount: Number(revAmount),
            note: revNote.trim() || "Omset Penjualan"
        };
        setRevenueLogs((prev: any[]) => [logEntry, ...prev]);
        setRevAmount(""); setRevNote("");
        toast({ title: "Omset Tercatat!", description: "Data otomatis terintegrasi ke sistem cashflow." });
    };

    const requestAiPerformanceReview = async () => {
        setIsEvaluating(true);
        try {
            const res = await fetch('/api/wealth/evaluate-revenue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedIdea, revenueLog: revenueLogs })
            });
            if (!res.ok) throw new Error();
            const { evaluation } = await res.json();
            setAiVerdictNote(evaluation);
        } catch (err) {
            toast({ title: "Gagal memuat evaluasi", variant: "destructive" });
        } finally {
            setIsEvaluating(false);
        }
    };
    const [isEvaluating, setIsEvaluating] = useState(false);

    // =========================================================================
    // 🎨 UI VIEW LAYER & RENDERING LOGIC
    // =========================================================================
    return (
        <MobileLayout title="Panduan Penghasilan" showBack>
            <div className="min-h-screen bg-slate-50 pt-2 pb-32">
                
                {/* STATE 0: S0 LANDING */}
                {currentState === 'S0_LANDING' && (
                    <div className="flex flex-col items-center justify-center pt-12 px-6 text-center animate-in zoom-in-95 duration-300">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 rounded-[28px] flex items-center justify-center shadow-2xl mb-6 border border-indigo-500/20">
                            <Sparkles className="w-12 h-12 text-amber-400 animate-pulse" />
                        </div>
                        <div className="bg-amber-100 text-amber-900 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest mb-3 border border-amber-200">
                            VIP ACCESS PLATINUM
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Panduan Penghasilan</h2>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10 max-w-xs">
                            Bukan sekadar saran motivasi umum. Mesin kecerdasan buatan akan meracik strategi bisnis riil berdasarkan aset, keahlian, dan <span className="font-bold text-slate-700">kondisi kas aktualmu</span>.
                        </p>
                        <Button 
                            onClick={() => setCurrentState('S1_Q_STATUS')}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-full font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            MULAI ANALISIS KOGNITIF <ArrowRight className="w-5 h-5"/>
                        </Button>
                    </div>
                )}

                {/* FASE 1 CORE QUESTIONS INJECTOR */}
                <div className="px-4">
                    {renderDynamicStepCard()}
                </div>

                {/* GLOBAL MACHINE LOADING INDICATOR */}
                {currentState === 'S8_GENERATE_REKOMENDASI' && (
                    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
                        <div className="relative mb-6">
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-100"></div>
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent anonymity-pulse animate-spin absolute top-0 left-0"></div>
                            <Brain className="w-6 h-6 text-indigo-600 absolute top-5 left-5 animate-pulse"/>
                        </div>
                        <h3 className="font-black text-slate-800 text-xl mb-1">Membuka Jalur Kognitif...</h3>
                        <p className="text-xs text-slate-400 max-w-[24px] leading-relaxed font-medium">
                            Kecerdasan buatan sedang melakukan cross-referencing data profil dan saldo kas aman Anda.
                        </p>
                    </div>
                )}

                {/* STATE 9: PILIH IDE BISNIS */}
                {currentState === 'S9_PILIH_IDE' && (
                    <div className="px-4 space-y-4 animate-in slide-in-from-bottom-6 duration-500">
                        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-5 rounded-[28px] text-white shadow-xl flex items-start gap-4 border border-indigo-500/20">
                            <Rocket className="w-8 h-8 text-amber-400 shrink-0 mt-1"/>
                            <div>
                                <h3 className="font-black text-lg text-amber-400">Peta Jalur Cuan Ditemukan</h3>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed mt-0.5">Berdasarkan data kas, waktu luang, dan aset yang ada, ini opsi usaha terbaik untuk Anda:</p>
                            </div>
                        </div>

                        {recommendations.map((rec) => (
                            <div key={rec.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute right-0 top-0 bg-slate-900 text-amber-400 text-[9px] font-black px-4 py-1.5 rounded-bl-xl tracking-widest uppercase">
                                    {rec.difficulty}
                                </div>
                                <h4 className="font-black text-slate-800 text-xl mb-1 pr-16 leading-tight">{rec.title}</h4>
                                <div className="flex gap-2 mb-3">
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{rec.estimated_time_to_first_income}</span>
                                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md">{rec.capital_level.replace('_', ' ')}</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">{rec.pitch}</p>
                                
                                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl mb-5">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> Kenapa Ini Sangat Cocok?</p>
                                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{rec.why_it_fits}</p>
                                </div>

                                {rec.needs_upskilling && rec.upskilling_note && (
                                    <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl mb-5 flex gap-2">
                                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                                        <p className="text-[11px] text-amber-800 font-medium leading-relaxed"><b>Rekomendasi Upskilling:</b> {rec.upskilling_note}</p>
                                    </div>
                                )}

                                <Button 
                                    onClick={() => handleIdeaSelection(rec)}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-full font-black text-xs shadow-lg shadow-emerald-100"
                                >
                                    BEDAH KEBUTUHAN MODAL & BAHAN
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* STATE 10 & 11: KALKULATOR RISET BAHAN INTERAKTIF */}
                {(currentState === 'S10_RENCANA_BAHAN' || currentState === 'S11_HARGA') && (
                    <div className="px-4 animate-in fade-in duration-300 space-y-4">
                        {/* KOTAK TUGAS VISUAL PREMIUM (SESUAI GAMBAR REFERENSI USER) */}
                        <div className="bg-[#2FD1F7] text-slate-900 rounded-[32px] p-6 shadow-xl text-center font-bold border-4 border-slate-950 relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-20 h-24 bg-white/10 rounded-full blur-xl"></div>
                            <h2 className="text-xl font-black tracking-tight mb-4 uppercase">BAIK, BERIKUT ADALAH TUGAS SELANJUTNYA:</h2>
                            <div className="bg-black/10 py-2.5 px-4 rounded-xl mb-3 text-sm tracking-wide uppercase border border-black/5">
                                CARI BAHAN-BAHAN YANG DIPERLUKAN
                            </div>
                            <div className="bg-black/10 py-2.5 px-4 rounded-xl text-sm tracking-wide uppercase border border-black/5">
                                TULISKAN HARGA MASING-MASING DARI SETIAP BAHANNYA:
                            </div>
                        </div>

                        {/* LIST EDITOR */}
                        <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl relative overflow-hidden">
                            <h3 className="font-black text-lg mb-1">Rencana Anggaran Biaya</h3>
                            <p className="text-[11px] text-slate-400 font-medium mb-6">Sesuaikan rancangan item atau biarkan nol jika alat sudah kamu miliki/pinjam.</p>
                            
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                {materials.map((item) => (
                                    <div key={item.id} className="space-y-1 bg-white/5 p-3 rounded-2xl border border-white/10">
                                        <div className="flex gap-2 items-center">
                                            <Input 
                                                value={item.name} 
                                                onChange={(e) => setMaterials((prev: any[]) => prev.map((m: any) => m.id === item.id ? {...m, name: e.target.value} : m))}
                                                className="flex-1 bg-transparent border-none text-white text-sm focus:ring-0 px-1 font-bold h-8"
                                            />
                                            <div className="flex items-center gap-1 bg-black/40 rounded-xl px-2.5 border border-white/10 w-28 h-9">
                                                <span className="text-[10px] text-slate-400 font-bold">Rp</span>
                                                <Input 
                                                    type="number" value={item.price || ""} 
                                                    onChange={(e) => updateMaterialPrice(item.id, Number(e.target.value))}
                                                    className="w-full bg-transparent border-none text-white text-xs focus:ring-0 text-right px-0 font-black"
                                                />
                                            </div>
                                            <button onClick={() => setMaterials((prev: any[]) => prev.filter((m: any) => m.id !== item.id))} className="p-2 text-rose-400 hover:bg-white/10 rounded-xl shrink-0">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                        {item.note && <p className="text-[10px] text-amber-400/80 font-medium px-1">💡 Alternatif: {item.note}</p>}
                                    </div>
                                ))}
                            </div>

                            <button onClick={addManualMaterial} className="mt-4 text-xs font-black text-amber-400 flex items-center gap-1 hover:underline px-1">
                                <PlusCircle className="w-4 h-4"/> TAMBAH ITEM PENGELUARAN BARU
                            </button>
                        </div>

                        {/* TOTAL COST COUNTER PANEL */}
                        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-6 px-1">
                                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Kebutuhan Modal Eksekusi:</span>
                                <span className="text-2xl font-black text-slate-800">{formatCurrency(materials.reduce((acc, m) => acc + (Number(m.price)||0), 0)).split(',')[0]}</span>
                            </div>
                            <Button 
                                onClick={executeFinancialFeasibilityCheck}
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black shadow-xl"
                            >
                                UJI KELAYAKAN TERHADAP SALDO KAS
                            </Button>
                        </div>
                    </div>
                )}

                {/* STATE 13: STRATEGI MITIGASI MODAL (S13) */}
                {currentState === 'S13_MODAL' && (
                    <div className="px-4 animate-in zoom-in-95 duration-300 space-y-4">
                        <div className="bg-rose-50 border border-rose-200 p-6 rounded-[32px] text-center">
                            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                            <h3 className="font-black text-rose-900 text-xl mb-1">Batas Aman Kas Terlampaui</h3>
                            <p className="text-xs text-rose-700 font-medium leading-relaxed max-w-xs mx-auto">
                                Total biaya melampaui sisa dana aman dompetmu. Menggunakan dana ini berisiko mengganggu kestabilan operasional bulananmu.
                            </p>
                        </div>

                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider px-2">Rencana Alokasi & Solusi dari AI:</h4>

                        {capitalStrategies.map((opt) => (
                            <div key={opt.id} className="bg-white p-5 rounded-[26px] border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-black text-slate-800 text-base">{opt.title}</h5>
                                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{opt.estimated_effort}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">{opt.description}</p>
                                <Button 
                                    onClick={executeTriggerSellingStrategy}
                                    className="w-full bg-slate-900 text-white h-10 rounded-xl text-xs font-bold"
                                >
                                    SAYA SETUJU & LANJUTKAN TAHAPAN
                                </Button>
                            </div>
                        ))}

                        <Button onClick={() => setCurrentState('S10_RENCANA_BAHAN')} className="w-full bg-slate-200 text-slate-700 h-12 rounded-full font-bold text-xs">
                            KEMBALI MODIFIKASI ANGGARAN BAHAN
                        </Button>
                    </div>
                )}

                {/* STATE 14: BOUNDED DISCUSSION STRATEGI PEMASARAN */}
                {currentState === 'S14_STRATEGI_JUAL' && (
                    <div className="px-4 animate-in slide-in-from-bottom-8 duration-500 space-y-4">
                        <div className="bg-slate-900 text-white p-5 rounded-[28px] shadow-lg flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-base text-amber-400">Kanal Pemasaran & Penjualan</h3>
                                <p className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{selectedIdea?.title}</p>
                            </div>
                            <Button 
                                onClick={() => setCurrentState('S15_TRACKING_OMSET')}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-5 h-11 rounded-full shadow-md shadow-emerald-900/20"
                            >
                                SELESAI DISKUSI & BUKA LAPAK <ArrowRight className="w-4 h-4 ml-1.5"/>
                            </Button>
                        </div>

                        {/* DISKUSI ENGINE VIEW */}
                        <div className="bg-white border border-slate-100 rounded-[28px] p-4 min-h-[380px] flex flex-col justify-between shadow-sm">
                            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed font-medium ${msg.sender === 'user' ? 'bg-slate-800 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isAiProcessing && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600"/> Mentor AI sedang merumuskan jawaban taktis...
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                <Input 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Tanyakan langkah promosi pertama atau negosiasi..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendSellingChat()}
                                    disabled={isAiProcessing}
                                    className="bg-slate-50 text-xs border-slate-200 h-11 rounded-xl"
                                />
                                <Button 
                                    onClick={handleSendSellingChat} 
                                    disabled={isAiProcessing || !chatInput.trim()}
                                    className="bg-indigo-600 text-white h-11 w-11 p-0 rounded-xl shrink-0 shadow-md shadow-indigo-100"
                                >
                                    <Send className="w-4 h-4"/>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STATE 15: PRODUKSI BERJALAN & LOGGING OMSET EVALUATIF */}
                {currentState === 'S15_TRACKING_OMSET' && (
                    <div className="px-4 animate-in fade-in duration-500 space-y-4">
                        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden border border-white/5">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">OPERASIONAL BISNIS AKTIF</p>
                            <h2 className="text-2xl font-black mb-1 tracking-tight">{selectedIdea?.title}</h2>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">{selectedIdea?.pitch}</p>
                            
                            <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Total Akumulasi Cuan</p>
                                    <p className="text-3xl font-black text-emerald-400">{formatRp(revenueLogs.reduce((acc, r) => acc + r.amount, 0))}</p>
                                </div>
                                <Button 
                                    onClick={requestAiPerformanceReview}
                                    disabled={isEvaluating || revenueLogs.length === 0}
                                    className="bg-white hover:bg-slate-100 text-slate-950 font-black text-xs h-10 px-5 rounded-full shadow-md flex items-center gap-1.5"
                                >
                                    {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin"/> : <><BarChart3 className="w-3.5 h-3.5"/> EVALUASI PROGRES AI</>}
                                </Button>
                            </div>
                        </div>

                        {/* CORE FEEDBACK PANEL AI */}
                        {aiVerdictNote && (
                            <div className="bg-indigo-950 text-indigo-100 border border-indigo-500/20 p-5 rounded-[26px] shadow-sm animate-in zoom-in-95">
                                <h4 className="font-black text-amber-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 animate-pulse text-amber-400"/> Analisis Dinamis Pengembang Bisnis AI:
                                </h4>
                                <p className="text-xs leading-relaxed text-indigo-200 font-medium whitespace-pre-line">{aiVerdictNote}</p>
                            </div>
                        )}

                        {/* LOG PANEL FORM */}
                        <div className="bg-white p-5 rounded-[26px] border border-slate-100 shadow-sm space-y-3">
                            <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider px-1">Input Catatan Omset Harian</h4>
                            <div className="flex gap-2">
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 flex-1 h-12">
                                    <span className="text-xs font-bold text-slate-400 mr-1.5">Rp</span>
                                    <input 
                                        type="number"
                                        placeholder="Nominal Penjualan"
                                        value={revAmount}
                                        onChange={(e) => setRevAmount(e.target.value)}
                                        className="bg-transparent border-none text-sm w-full font-bold focus:ring-0 p-0 text-slate-800"
                                    />
                                </div>
                                <Input 
                                    placeholder="Keterangan (Misal: Jual 4 pack)"
                                    value={revNote}
                                    onChange={(e) => setRevNote(e.target.value)}
                                    className="bg-slate-50 text-xs border-slate-200 flex-1 h-12 rounded-xl"
                                />
                            </div>
                            <Button onClick={handleCommitRevenueLog} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black h-12 rounded-xl text-xs uppercase tracking-wider">
                                MASUKKAN REKAP PENJUALAN
                            </Button>
                        </div>

                        {/* HISTORY LOGS */}
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-400 text-[10px] px-2 uppercase tracking-widest">Buku Kas Penjualan</h4>
                            {revenueLogs.length === 0 ? (
                                <p className="text-center text-xs text-slate-400 py-10 bg-white rounded-2xl border-2 border-dashed border-slate-100 font-medium">
                                    Belum ada omset penjualan yang dimasukkan minggu ini.
                                </p>
                            ) : (
                                revenueLogs.map((log) => (
                                    <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-xs animate-in slide-in-from-top-2">
                                        <div>
                                            <p className="font-black text-sm text-slate-800">{log.note}</p>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{log.date}</p>
                                        </div>
                                        <p className="font-black text-emerald-600 text-base">+ {formatRp(log.amount)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* PRINSIP ARSITEKTUR 2 & GUARDRAIL 8: HARDCODED DISCLAIMER PERMANEN DI UI KODE */}
                {['S10_RENCANA_BAHAN', 'S11_HARGA', 'S13_MODAL', 'S14_STRATEGI_JUAL', 'S15_TRACKING_OMSET'].includes(currentState) && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-50">
                        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex gap-3 items-start shadow-sm">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[9px] text-amber-800 font-black leading-relaxed uppercase tracking-wider">
                                DISCLAIMER PERMANEN: INI ADALAH ANALISA SIMULASI DAN ADVISORY KOGNITIF, BUKAN INSTRUKSI FINANSIAL MENGIKAT. SEALA BENTUK RISIKO BISNIS DAN EKSEKUSI DI LAPANGAN SEPENHNYA MENJADI TANGGUNG JAWAB PENGGUNA.
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </MobileLayout>
    );
}

// =========================================================================
// 🍱 COMPONENT SUB-RENDERER EXTRA (PREVENT REPETITIVE REDUNDANCY)
// =========================================================================
function StepCardWrapper({ title, color_variant, icon, children }: { title: string; color_variant: 'primary' | 'accent'; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-[32px] shadow-xs border border-slate-100 overflow-hidden animate-in slide-in-from-right-8 duration-300">
            <div className={`px-6 py-4 flex items-center gap-2.5 ${color_variant === 'primary' ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
                <div className="text-white opacity-95">{icon}</div>
                <h3 className="text-white font-black text-sm uppercase tracking-wider">{title}</h3>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}