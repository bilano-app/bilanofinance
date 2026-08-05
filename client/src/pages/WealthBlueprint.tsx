import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useUser, useTransactions } from "@/hooks/use-finance";
import { 
    Brain, Rocket, Target, ArrowRight, Loader2, Info, ChevronRight, 
    CheckCircle2, Sparkles, BookOpen, AlertCircle, Plus, Trash2, ShieldAlert
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// ==========================================
// TYPES & STATE DEFINITIONS
// ==========================================
type Phase = 'S0_LANDING' | 'S1_STATUS' | 'S2_TUJUAN' | 'S3_POLA' | 'S4_LATAR' | 'S5_KEAHLIAN' | 'S6_ASET' | 'S7_WAKTU' | 'S8_LOADING_AI' | 'S9_PILIH_IDE' | 'S10_BAHAN' | 'S11_HARGA' | 'S12_KELAYAKAN' | 'S13_MODAL' | 'S14_JUAL';

export default function WealthBlueprint() {
    const { data: user } = useUser();
    const { data: transactions } = useTransactions();
    const { toast } = useToast();

    // Core State Machine
    const [phase, setPhase] = useState<Phase>('S0_LANDING');
    
    // User Profile Storage (S1 - S7)
    const [profile, setProfile] = useState<any>({
        status: '', tujuan: '', polaKerja: '', latarBelakang: {},
        keahlian: [], keahlianBebas: '', aset: [], konstrainWaktu: {}
    });

    // Income Attempt Storage (S8 - S15)
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<any>(null);
    const [materials, setMaterials] = useState<{id: string, name: string, price: number}[]>([]);
    
    // UI States
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [multiSelectBuffer, setMultiSelectBuffer] = useState<string[]>([]);
    const [textBuffer, setTextBuffer] = useState("");

    // ==========================================
    // LOGIKA PERHITUNGAN FINANSIAL (Auto-Pull)
    // ==========================================
    const getFinancialSnapshot = () => {
        const cash = user?.cashBalance || 0;
        // Mockup rata-rata pengeluaran (Idealkan diambil dari hooks transaksi)
        const avgExpense = 1500000; 
        const bufferBulan = 1; 
        const sisaDanaAman = Math.max(0, cash - (avgExpense * bufferBulan));

        return {
            saldo_saat_ini: cash,
            rata2_pengeluaran_bulanan: avgExpense,
            sisa_dana_aman: sisaDanaAman,
            data_cukup_representatif: true
        };
    };

    // ==========================================
    // FASE 1: PERCABANGAN LOGIKA (S1 - S7)
    // ==========================================
    const renderFase1Card = () => {
        const handleNext = (nextPhase: Phase, dataToMerge?: any) => {
            if (dataToMerge) setProfile((prev: any) => ({ ...prev, ...dataToMerge }));
            setPhase(nextPhase);
        };

        switch (phase) {
            case 'S1_STATUS':
                return (
                    <StepCard title="Identifikasi Profil" icon={<Brain className="w-5 h-5"/>} color="primary">
                        <ChoiceSingle 
                            label="Kamu saat ini berstatus sebagai apa?"
                            options={[
                                { value: 'PELAJAR', label: 'Pelajar (SMP/SMA/SMK)' },
                                { value: 'MAHASISWA', label: 'Mahasiswa Aktif' },
                                { value: 'PEKERJA', label: 'Sudah Bekerja (Tetap/Kontrak)' },
                                { value: 'BELUM_BEKERJA', label: 'Sedang Mencari Pekerjaan' }
                            ]}
                            onSelect={(val) => handleNext('S2_TUJUAN', { status: val })}
                        />
                    </StepCard>
                );

            case 'S2_TUJUAN':
                let opsiTujuan = [];
                if (profile.status === 'PELAJAR') {
                    opsiTujuan = [
                        { value: 'UANG_JAJAN', label: 'Uang Jajan Pribadi' },
                        { value: 'MENABUNG_TUJUAN', label: 'Nabung Beli Barang Impian' }
                    ];
                } else if (profile.status === 'MAHASISWA') {
                    opsiTujuan = [
                        { value: 'BIAYA_KULIAH', label: 'Bantu UKT / Kos' },
                        { value: 'PORTOFOLIO_KARIR', label: 'Cari Pengalaman Kerja/Portofolio' }
                    ];
                } else {
                    opsiTujuan = [
                        { value: 'PENGHASILAN_TAMBAHAN', label: 'Penghasilan Tambahan (Extra)' },
                        { value: 'PIVOT_KE_USAHA', label: 'Rencana Pivot Jadi Usaha Utama' }
                    ];
                }

                return (
                    <StepCard title="Tujuan Finansial" icon={<Target className="w-5 h-5"/>} color="accent">
                        <ChoiceSingle 
                            label="Apa tujuan utama kamu mencari penghasilan ini?"
                            options={opsiTujuan}
                            onSelect={(val) => handleNext('S3_POLA', { tujuan: val })}
                        />
                    </StepCard>
                );

            case 'S3_POLA':
                const polaLabel = profile.status === 'PEKERJA' 
                    ? "Karena sudah bekerja, kamu mau jadwal yang pasti (misal: tiap jam 7 malam) atau fleksibel?"
                    : "Pilih komitmen waktu kerjamu:";
                return (
                    <StepCard title="Komitmen Waktu" icon={<BookOpen className="w-5 h-5"/>} color="primary">
                        <ChoiceSingle 
                            label={polaLabel}
                            options={[
                                { value: 'RUTIN_TERJADWAL', label: 'Rutin Terjadwal (Perlu Komitmen)' },
                                { value: 'FLEKSIBEL', label: 'Fleksibel (Kapanpun Ada Waktu Luang)' }
                            ]}
                            onSelect={(val) => handleNext('S4_LATAR', { polaKerja: val })}
                        />
                    </StepCard>
                );

            case 'S4_LATAR':
                return (
                    <StepCard title="Latar Belakang" icon={<Brain className="w-5 h-5"/>} color="accent">
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-800">Ceritakan sedikit background studimu/pekerjaanmu agar saran lebih relevan:</p>
                            <Input 
                                placeholder={profile.status === 'PEKERJA' ? "Contoh: Staff Admin / Sales" : "Contoh: Akuntansi Semester 5"}
                                value={textBuffer}
                                onChange={(e) => setTextBuffer(e.target.value)}
                                className="bg-slate-50 border-slate-200"
                            />
                            <Button 
                                disabled={!textBuffer.trim()}
                                onClick={() => {
                                    handleNext('S5_KEAHLIAN', { latarBelakang: { detail: textBuffer } });
                                    setTextBuffer(""); // reset
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                            >
                                LANJUTKAN
                            </Button>
                        </div>
                    </StepCard>
                );

            case 'S5_KEAHLIAN':
                return (
                    <StepCard title="Inventaris Keahlian" icon={<Sparkles className="w-5 h-5"/>} color="primary">
                        <ChoiceMulti 
                            label="Pilih keahlian yang kamu miliki (Bisa lebih dari 1):"
                            options={[
                                { value: 'KREATIF', label: 'Desain, Nulis, Video, Foto' },
                                { value: 'DIGITAL_TEKNIS', label: 'Coding, Excel, Olah Data' },
                                { value: 'KULINER', label: 'Memasak, Baking, Racik Minuman' },
                                { value: 'INTERPERSONAL', label: 'Jualan, Ngajar, Ngobrol' }
                            ]}
                            selected={multiSelectBuffer}
                            onChange={setMultiSelectBuffer}
                        />
                        <div className="mt-4">
                            <Input 
                                placeholder="Atau ketik keahlian lainnya..."
                                value={textBuffer} onChange={(e) => setTextBuffer(e.target.value)}
                                className="text-sm border-slate-200 mb-4"
                            />
                            <Button 
                                disabled={multiSelectBuffer.length === 0 && !textBuffer.trim()}
                                onClick={() => {
                                    handleNext('S6_ASET', { keahlian: multiSelectBuffer, keahlianBebas: textBuffer });
                                    setMultiSelectBuffer([]); setTextBuffer("");
                                }}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
                            >
                                SIMPAN KEAHLIAN
                            </Button>
                        </div>
                    </StepCard>
                );

            case 'S6_ASET':
                return (
                    <StepCard title="Aset Tersedia" icon={<CheckCircle2 className="w-5 h-5"/>} color="accent">
                        <ChoiceMulti 
                            label="Apa saja alat yang sudah ADA di tanganmu saat ini? (Kita tidak bahas uang tunai dulu)"
                            options={[
                                { value: 'LAPTOP_PC', label: 'Laptop / PC Memadai' },
                                { value: 'HP_KAMERA', label: 'HP dengan Kamera Bagus' },
                                { value: 'KENDARAAN', label: 'Motor / Mobil Pribadi' },
                                { value: 'RUANG_USAHA', label: 'Garasi / Dapur / Kamar Kosong' }
                            ]}
                            selected={multiSelectBuffer}
                            onChange={setMultiSelectBuffer}
                        />
                        <Button 
                            onClick={() => {
                                handleNext('S7_WAKTU', { aset: multiSelectBuffer });
                                setMultiSelectBuffer([]);
                            }}
                            className="w-full bg-indigo-600 text-white font-bold rounded-xl mt-6"
                        >
                            SELANJUTNYA
                        </Button>
                    </StepCard>
                );

            case 'S7_WAKTU':
                return (
                    <StepCard title="Komitmen Akhir" icon={<Target className="w-5 h-5"/>} color="primary">
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-800">
                                Berapa jam dalam <b>satu minggu</b> yang benar-benar bisa kamu luangkan untuk ini?
                            </p>
                            <Input 
                                type="number"
                                placeholder="Misal: 10"
                                value={textBuffer}
                                onChange={(e) => setTextBuffer(e.target.value)}
                                className="bg-slate-50 border-slate-200"
                            />
                            <Button 
                                disabled={!textBuffer.trim()}
                                onClick={() => {
                                    setProfile((prev: any) => ({ ...prev, konstrainWaktu: { jam_per_minggu: textBuffer } }));
                                    fetchAiRecommendations(); // Trigger AI
                                }}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200"
                            >
                                MULAI ANALISA AI
                            </Button>
                        </div>
                    </StepCard>
                );
        }
        return null;
    };

    // ==========================================
    // FASE 2: AI RECOMMENDATIONS (S8 - S9)
    // ==========================================
    const fetchAiRecommendations = async () => {
        setPhase('S8_LOADING_AI');
        setIsAiLoading(true);

        try {
            const res = await fetch('/api/wealth/recommendations', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email || 'guest' },
                body: JSON.stringify({ profile, financialSnapshot: getFinancialSnapshot() })
            });

            if (!res.ok) throw new Error();
            const { data } = await res.json();
            setRecommendations(data.recommendations);
            setPhase('S9_PILIH_IDE');
        } catch (e) {
            toast({ title: "Gagal Menghubungi AI", description: "Coba lagi nanti.", variant: "destructive" });
            setPhase('S7_WAKTU'); // Rollback
        } finally {
            setIsAiLoading(false);
        }
    };

    // ==========================================
    // FASE 3: EKSEKUSI & KALKULATOR (S10 - S14)
    // ==========================================
    const generateDraftMaterials = async (idea: any) => {
        setSelectedIdea(idea);
        setPhase('S8_LOADING_AI'); // Reuse loading screen
        try {
            const res = await fetch('/api/wealth/draft-materials', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email || 'guest' },
                body: JSON.stringify({ recommendation: idea })
            });
            const { data } = await res.json();
            
            // Transform data AI agar aman dimasukkan ke State
            const safeMaterials = data.draft_items.map((item: any) => ({
                id: item.id || Math.random().toString(),
                name: item.name,
                price: item.price || 0
            }));
            
            setMaterials(safeMaterials);
            setPhase('S10_BAHAN');
        } catch (e) {
            toast({ title: "Gagal memuat draft", variant: "destructive" });
            setPhase('S9_PILIH_IDE');
        }
    };

    const updateMaterialPrice = (id: string, price: number) => {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, price } : m));
    };

    const addManualMaterial = () => {
        setMaterials(prev => [...prev, { id: Math.random().toString(), name: "Bahan Baru", price: 0 }]);
    };

    const checkFeasibility = () => {
        const totalCost = materials.reduce((acc, m) => acc + (Number(m.price) || 0), 0);
        const { sisa_dana_aman, saldo_saat_ini } = getFinancialSnapshot();

        if (totalCost <= sisa_dana_aman) {
            setPhase('S14_JUAL'); // Aman banget
        } else if (totalCost <= saldo_saat_ini) {
            toast({ title: "Menggunakan Dana Darurat!", description: "Hati-hati, ini memakan batas aman kasmu." });
            setPhase('S14_JUAL'); // Cukup tapi berisiko
        } else {
            setPhase('S13_MODAL'); // Tidak cukup
        }
    };


    // ==========================================
    // RENDER UTAMA
    // ==========================================
    return (
        <MobileLayout title="Wealth Blueprint" showBack>
            <div className="min-h-screen bg-slate-50 pt-2 pb-28 relative">
                
                {/* STATE 0: LANDING */}
                {phase === 'S0_LANDING' && (
                    <div className="flex flex-col items-center justify-center pt-8 px-6 text-center animate-in zoom-in-95">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl flex items-center justify-center shadow-xl mb-6 border border-indigo-500/20">
                            <BookOpen className="w-12 h-12 text-amber-400" />
                        </div>
                        <div className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3">
                            Eksklusif Premium
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Peta Jalur Cuan</h2>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10">
                            Bukan sekadar saran motivasi generik. AI akan memetakan strategi usaha spesifik berdasarkan skill, aset, dan <span className="font-bold text-slate-700">saldo kas aktualmu</span> saat ini.
                        </p>
                        <Button 
                            onClick={() => setPhase('S1_STATUS')}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-full font-black shadow-2xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            MULAI ANALISA <ArrowRight className="w-5 h-5"/>
                        </Button>
                    </div>
                )}

                {/* RENDER FASE 1 */}
                <div className="px-4">
                    {renderFase1Card()}
                </div>

                {/* FASE 2: LOADING S8 */}
                {phase === 'S8_LOADING_AI' && (
                    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-100 mb-6"></div>
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
                            <Brain className="w-6 h-6 text-indigo-600 absolute top-5 left-5 animate-pulse"/>
                        </div>
                        <h3 className="font-black text-slate-800 text-xl mb-2">Sistem Sedang Berpikir...</h3>
                        <p className="text-sm text-slate-500 max-w-[250px] leading-relaxed">
                            Menganalisa persilangan antara keahlianmu, waktu luang, dan data kas dari dompetmu.
                        </p>
                    </div>
                )}

                {/* FASE 2: HASIL REKOMENDASI S9 */}
                {phase === 'S9_PILIH_IDE' && (
                    <div className="px-4 space-y-4 animate-in slide-in-from-bottom-6">
                        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-5 rounded-[24px] text-amber-950 shadow-lg mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Rocket className="w-6 h-6"/>
                                <h3 className="font-black text-lg">Cetak Biru Ditemukan!</h3>
                            </div>
                            <p className="text-xs font-medium opacity-90 leading-relaxed">Ini adalah blueprint bisnis paling realistis untuk dieksekusi berdasarkan kondisimu HARI INI.</p>
                        </div>

                        {recommendations.map((rec) => (
                            <div key={rec.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute right-0 top-0 bg-slate-900 text-amber-400 text-[9px] font-black px-4 py-1.5 rounded-bl-xl tracking-widest uppercase">
                                    {rec.difficulty}
                                </div>
                                <h4 className="font-black text-slate-800 text-xl mb-2 pr-16">{rec.title}</h4>
                                <p className="text-sm text-slate-500 mb-5 leading-relaxed">{rec.pitch}</p>
                                
                                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl mb-6">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3"/> Kenapa ini cocok?</p>
                                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{rec.why_it_fits}</p>
                                </div>

                                <Button 
                                    onClick={() => generateDraftMaterials(rec)}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-full font-bold shadow-lg shadow-emerald-200 transition-transform active:scale-95"
                                >
                                    BEDAH KEBUTUHAN MODAL
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* FASE 3: DRAFT BAHAN & RISET HARGA (S10-S11 Gabungan) */}
                {(phase === 'S10_BAHAN' || phase === 'S11_HARGA') && (
                    <div className="px-4 animate-in fade-in">
                        <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl mb-6 relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
                            <h3 className="font-black text-xl mb-1 relative z-10">Kalkulator Riset Harga</h3>
                            <p className="text-xs text-slate-400 font-medium relative z-10 mb-6">Tulis estimasi harga barang di pasar saat ini. Biarkan nol jika kamu meminjam/sudah punya.</p>
                            
                            <div className="space-y-3 relative z-10">
                                {materials.map((item) => (
                                    <div key={item.id} className="flex gap-2 items-center bg-white/5 p-2 rounded-2xl border border-white/10">
                                        <Input 
                                            value={item.name} 
                                            onChange={(e) => setMaterials(prev => prev.map(m => m.id === item.id ? {...m, name: e.target.value} : m))}
                                            className="flex-1 bg-transparent border-none text-white text-sm focus:ring-0 px-2"
                                        />
                                        <div className="flex items-center gap-1 bg-black/20 rounded-xl px-2 border border-white/5 w-32">
                                            <span className="text-[10px] text-slate-400 font-bold">Rp</span>
                                            <Input 
                                                type="number" value={item.price || ""} 
                                                onChange={(e) => updateMaterialPrice(item.id, Number(e.target.value))}
                                                className="w-full bg-transparent border-none text-white text-sm focus:ring-0 text-right px-1"
                                            />
                                        </div>
                                        <button onClick={() => setMaterials(prev => prev.filter(m => m.id !== item.id))} className="p-2 text-rose-400 hover:bg-white/10 rounded-xl">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <button onClick={addManualMaterial} className="mt-4 text-[11px] font-bold text-amber-400 flex items-center gap-1 hover:underline">
                                <Plus className="w-3 h-3"/> TAMBAH ITEM LAIN
                            </button>
                        </div>

                        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-sm font-bold text-slate-500 uppercase">Total Modal:</span>
                                <span className="text-2xl font-black text-slate-800">{formatCurrency(materials.reduce((acc, m) => acc + (Number(m.price)||0), 0)).split(',')[0]}</span>
                            </div>
                            <Button 
                                onClick={checkFeasibility}
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black shadow-lg"
                            >
                                UJI KELAYAKAN FINANSIAL
                            </Button>
                        </div>
                    </div>
                )}

                {/* FASE 3: KEPUTUSAN KURANG MODAL (S13) ATAU AMAN (S14) */}
                {phase === 'S13_MODAL' && (
                    <div className="px-4 animate-in zoom-in-95">
                        <div className="bg-rose-50 border border-rose-200 p-6 rounded-[32px] text-center mb-6">
                            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                            <h3 className="font-black text-rose-900 text-xl mb-2">Modal Kas Tidak Cukup</h3>
                            <p className="text-xs text-rose-700 font-medium leading-relaxed">
                                Total modal yang dibutuhkan melebihi saldo kas aman Anda. Menarik sisa saldo akan mengganggu dana darurat dan biaya hidup Anda bulan ini.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-bold text-slate-800 text-sm px-2">Saran Pivot:</h4>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="font-bold text-slate-700 mb-1">1. Kurangi Skala Awal</p>
                                <p className="text-xs text-slate-500">Beli bahan setengah dari rencana, atau coret alat yang masih bisa dipinjam.</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="font-bold text-slate-700 mb-1">2. Menabung Bertahap</p>
                                <p className="text-xs text-slate-500">Gunakan fitur 'Target' Bilano untuk mengumpulkan modal ini secara perlahan.</p>
                            </div>
                            <Button onClick={() => setPhase('S10_BAHAN')} className="w-full bg-slate-900 text-white h-12 mt-4 rounded-full font-bold">KEMBALI EDIT BAHAN</Button>
                        </div>
                    </div>
                )}

                {phase === 'S14_JUAL' && (
                    <div className="px-4 animate-in slide-in-from-bottom-8 text-center pt-10">
                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2">Modal Siap.</h2>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-[250px] mx-auto mb-8 font-medium">
                            Secara finansial, kas Anda kuat untuk mengeksekusi rencana ini hari ini juga. 
                        </p>
                        <Button onClick={() => window.location.href = '/dashboard'} className="w-full bg-emerald-500 text-white h-14 rounded-full font-black text-sm shadow-xl shadow-emerald-200">
                            EKSEKUSI & MULAI CATAT PENGHASILAN
                        </Button>
                    </div>
                )}

                {/* DISCLAIMER GUARDRAIL PERMANENT */}
                {['S13_MODAL', 'S14_JUAL', 'S10_BAHAN', 'S11_HARGA'].includes(phase) && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-50">
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex gap-3 items-start shadow-sm">
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[9px] text-amber-800 font-bold leading-relaxed uppercase tracking-wider">
                                INI ADALAH ANALISA SIMULASI, BUKAN INSTRUKSI MUTLAK. RISIKO EKSEKUSI BISNIS SEPENUHNYA BERADA DI TANGAN ANDA.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}

// ==========================================
// KOMPONEN RENDERER STEP CARD GENERIK
// ==========================================
function StepCard({ title, icon, color, children }: { title: string, icon: React.ReactNode, color: 'primary'|'accent', children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-right-8">
            <div className={`px-6 py-4 flex items-center gap-2 ${color === 'primary' ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
                <div className="text-white opacity-90">{icon}</div>
                <h3 className="text-white font-black text-sm">{title}</h3>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}

function ChoiceSingle({ label, options, onSelect }: { label: string, options: {value: string, label: string}[], onSelect: (val: string) => void }) {
    return (
        <div>
            <p className="text-sm font-bold text-slate-800 mb-4">{label}</p>
            <div className="space-y-3">
                {options.map((opt) => (
                    <div 
                        key={opt.value} onClick={() => onSelect(opt.value)}
                        className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all flex justify-between items-center group"
                    >
                        <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">{opt.label}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500"/>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ChoiceMulti({ label, options, selected, onChange }: { label: string, options: {value: string, label: string}[], selected: string[], onChange: (vals: string[]) => void }) {
    const toggle = (val: string) => {
        if (selected.includes(val)) onChange(selected.filter(i => i !== val));
        else onChange([...selected, val]);
    };

    return (
        <div>
            <p className="text-sm font-bold text-slate-800 mb-4">{label}</p>
            <div className="space-y-3">
                {options.map((opt) => {
                    const isSelected = selected.includes(opt.value);
                    return (
                        <div 
                            key={opt.value} onClick={() => toggle(opt.value)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-300'}`}
                        >
                            <span className={`font-bold text-sm ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>{opt.label}</span>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}