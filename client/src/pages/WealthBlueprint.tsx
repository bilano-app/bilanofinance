import React, { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  useWealthMachine, 
  StateId, 
  RecommendationIdea, 
  MaterialItem 
} from "@/hooks/use-wealth-machine";
import { wealthApiService } from "@/services/wealth-api";

// Komponen Modular Pendukung
import DynamicStepCard from "@/components/wealth-blueprint/DynamicStepCard";
import BoundedChatMarketing from "@/components/wealth-blueprint/BoundedChatMarketing";
import FinanceSafetyBanner from "@/components/wealth-blueprint/FinanceSafetyBanner";

// Ikon pendukung estetika premium
import { 
  Brain, Target, ArrowRight, Loader2, Info, 
  ChevronRight, CheckCircle2, Trash2, PlusCircle, BarChart3, Rocket
} from "lucide-react";

export default function WealthBlueprint() {
  const { toast } = useToast();
  const { state, dispatch, calculateFeasibility } = useWealthMachine();

  // Buffer lokal untuk input interaktif PWA
  const [textBuffer, setTextBuffer] = useState("");
  const [multiSelectBuffer, setMultiSelectBuffer] = useState<string[]>([]);
  const [inputGroupBuffer, setInputGroupBuffer] = useState<Record<string, string>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReviewNote, setAiReviewNote] = useState<string | null>(null);

  // Mock functions for missing handlers
  const triggerPerformanceReview = async () => {};
  const handleCommitRevenueLog = async () => {};

  const generatePDF = () => {};

  // Buffer input untuk rekap omset harian (S15)
  const [revAmount, setRevAmount] = useState("");
  const [revNote, setRevNote] = useState("");

  // Sinkronisasi buffer harga saat item materials di state berubah
  useEffect(() => {
    if (state.materials.length > 0) {
      const updatedInputs: Record<string, string> = { ...inputGroupBuffer };
      state.materials.forEach(m => {
        if (updatedInputs[`${m.id}_price`] === undefined) {
          updatedInputs[`${m.id}_price`] = String(m.price);
        }
        updatedInputs[`${m.id}_name`] = m.name;
      });
      setInputGroupBuffer(updatedInputs);
    }
  }, [state.materials]);

  // Helper transisi state deterministik
  const transitionTo = (nextState: StateId) => {
    dispatch({ type: 'SET_STATE', payload: nextState });
  };

  // =========================================================================
  // ⚡ HANDLERS CORE STATE MACHINE DENGAN FILTER STRICT (S1 - S15)
  // =========================================================================

  const handleStatusSelect = (status: string) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: { status } });
    transitionTo('S2_Q_TUJUAN');
  };

  const handleTujuanSelect = (tujuan: string) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: { tujuan } });
    transitionTo('S3_Q_POLA_KERJA');
  };

  const handlePolaKerjaSelect = (polaKerja: string) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: { polaKerja } });
    transitionTo('S4_Q_LATAR_BELAKANG');
  };

  const handleLatarBelakangSubmit = () => {
    if (!textBuffer.trim()) return;
    dispatch({ type: 'UPDATE_PROFILE', payload: { latarBelakang: textBuffer } });
    setTextBuffer("");
    transitionTo('S5_Q_KEAHLIAN');
  };

  const toggleMultiSelect = (value: string) => {
    setMultiSelectBuffer(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleKeahlianSubmit = () => {
    dispatch({ type: 'UPDATE_PROFILE', payload: { keahlian: multiSelectBuffer, keahlianBebas: textBuffer } });
    setMultiSelectBuffer([]);
    setTextBuffer("");
    transitionTo('S6_Q_ASET');
  };

  const handleAsetSubmit = () => {
    dispatch({ type: 'UPDATE_PROFILE', payload: { aset: multiSelectBuffer } });
    setMultiSelectBuffer([]);
    transitionTo('S7_Q_KONSTRAIN_WAKTU');
  };

  const handleKonstrainWaktuSubmit = async () => {
    const numericVal = Number(textBuffer);
    if (!textBuffer.trim() || isNaN(numericVal) || numericVal <= 0) {
      toast({ title: "Input Tidak Valid", description: "Masukkan angka durasi jam yang valid.", variant: "destructive" });
      return;
    }

    const updatedProfile = {
      ...state.profileData,
      konstrainWaktu: { 
        jam_per_minggu: numericVal,
        urgensi: state.profileData.status === 'BELUM_BEKERJA' ? 'TINGGI_MENDESAK' : 'NORMAL'
      }
    };

    dispatch({ type: 'UPDATE_PROFILE', payload: { konstrainWaktu: updatedProfile.konstrainWaktu } });
    setTextBuffer("");
    
    // 🛡️ AMAN: 100% Lewat Service Layer untuk Mengaktifkan Filter Anti-Generik
    setIsAiLoading(true);
    transitionTo('S8_GENERATE_REKOMENDASI');

    try {
      const data = await wealthApiService.generateRecommendations(updatedProfile, state.financialSnapshot);
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: data });
      transitionTo('S9_PILIH_IDE');
    } catch (err: any) {
      toast({ title: "Koneksi AI Terputus", description: err.message || "Gagal memuat rekomendasi spesifik.", variant: "destructive" });
      transitionTo('S7_Q_KONSTRAIN_WAKTU');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleIdeaSelection = async (idea: RecommendationIdea) => {
    dispatch({ type: 'SELECT_IDEA', payload: idea });
    setIsAiLoading(true);
    transitionTo('S8_GENERATE_REKOMENDASI');

    try {
      const builtMaterials = await wealthApiService.fetchDraftMaterials(idea);
      dispatch({ type: 'SET_MATERIALS', payload: builtMaterials });
      transitionTo('S10_RENCANA_BAHAN');
    } catch (err: any) {
      toast({ title: "Gagal menyusun modul eksekusi", description: err.message, variant: "destructive" });
      transitionTo('S9_PILIH_IDE');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFeasibilityCheck = async () => {
    // Jalankan kalkulator logika deterministik kode dari hook
    const verdict = calculateFeasibility();

    if (verdict === 'CUKUP_AMAN') {
      triggerSellingChatInit();
    } else {
      setIsAiLoading(true);
      transitionTo('S8_GENERATE_REKOMENDASI');
      try {
        const options = await wealthApiService.fetchCapitalStrategies(
          state.totalCost,
          state.financialSnapshot?.sisa_dana_aman || 0,
          state.profileData,
          state.selectedIdea!
        );
        dispatch({ type: 'SET_CAPITAL_STRATEGIES', payload: options });
        transitionTo('S13_STRATEGI_MODAL');
      } catch (err: any) {
        toast({ title: "Gagal memproses alternatif modal", description: err.message, variant: "destructive" });
        transitionTo('S10_RENCANA_BAHAN');
      } finally {
        setIsAiLoading(false);
      }
    }
  };

  const triggerSellingChatInit = async () => {
    setIsAiLoading(true);
    transitionTo('S8_GENERATE_REKOMENDASI');
    try {
      const reply = await wealthApiService.sendSellingChatMessage(state.selectedIdea!, state.profileData, [], "");
      dispatch({ type: 'SET_CHAT_HISTORY', payload: [{ sender: 'ai', text: reply }] });
      transitionTo('S14_STRATEGI_JUAL');
    } catch (err: any) {
      toast({ title: "Gagal membuka sistem pemasaran", description: err.message, variant: "destructive" });
      transitionTo('S10_RENCANA_BAHAN');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSendMarketingMessage = async (msg: string) => {
    const userMsg = { sender: 'user' as const, text: msg };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });
    setIsAiLoading(true);

    try {
      const nextHistory = [...state.chatHistory, userMsg];
      const reply = await wealthApiService.sendSellingChatMessage(state.selectedIdea!, state.profileData, nextHistory, msg);
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { sender: 'ai', text: reply } });
    } catch (err: any) {
      toast({ title: "Mentor gagal merespons", description: err.message, variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setInputGroupBuffer(prev => ({ ...prev, [id]: value }));
    
    if (id.endsWith('_price')) {
      const itemId = id.replace('_price', '');
      dispatch({ type: 'UPDATE_MATERIAL_PRICE', payload: { id: itemId, price: Number(value) || 0 } });
    }
  };

  // Get opsi dinamis S2 berdasarkan status hasil S1 (PENAJAMAN PERCABANGAN)
  const getTujuanOptions = () => {
    const status = state.profileData.status;
    if (status === 'PELAJAR') {
      return [
        { value: 'UANG_JAJAN', label: 'Uang Jajan Pribadi Tambahan' },
        { value: 'MENABUNG_TUJUAN', label: 'Menabung buat Gadget / Keperluan Sekolah' },
        { value: 'BELAJAR_MANDIRI', label: 'Belajar Cari Uang Sendiri sejak Dini' }
      ];
    }
    if (status === 'MAHASISWA') {
      return [
        { value: 'UANG_SAKU', label: 'Tambahan Uang Saku Kuliah Harian' },
        { value: 'BIAYA_KULIAH', label: 'Membantu UKT / Kos / Kebutuhan Buku' },
        { value: 'PORTOFOLIO_KARIR', label: 'Mencari Pengalaman Kerja & Portofolio' }
      ];
    }
    if (status === 'PEKERJA') {
      return [
        { value: 'PENGHASILAN_TAMBAHAN', label: 'Penghasilan Sampingan di Luar Gaji' },
        { value: 'GAJI_KURANG', label: 'Gaji Utama Kurang Mencukupi Kebutuhan' },
        { value: 'RENCANA_JANGKA_PANJANG', label: 'Mempersiapkan Usaha Mandiri untuk Resign' }
      ];
    }
    // Opsi khusus untuk status BELUM_BEKERJA (Tercapai & Tajam)
    return [
      { value: 'PENGHASILAN_SEMENTARA', label: 'Penghasilan Sementara Sambil Cari Kerja Tetap' },
      { value: 'PIVOT_KE_USAHA', label: 'Sudah Mantap Ingin Full-time Berwirausaha' },
      { value: 'EKSPLORASI', label: 'Melihat Peluang Usaha Mikro yang Paling Cocok' }
    ];
  };

  // Framing teks konseptual untuk ketersediaan waktu S7 (PENAJAMAN KOGNITIF)
  const getWaktuFramingText = () => {
    const status = state.profileData.status;
    if (status === 'PEKERJA') return "Secara realistis di luar jam kantor utama, berapa jam dalam seminggu Anda siap fokus?";
    if (status === 'BELUM_BEKERJA') return "Karena waktu Anda leluasa, berapa jam seminggu yang ingin Anda targetkan penuh untuk alokasi produktif ini?";
    return "Secara realistis di luar jadwal sekolah/kuliah, berapa jam dalam seminggu yang bisa Anda luangkan?";
  };

  return (
    <MobileLayout title="Panduan Penghasilan" showBack>
      <div className="min-h-screen bg-slate-50 pt-2 pb-36">

        {/* S0: Mulai Landing */}
        {state.currentState === 'S0_LANDING' && (
          <div className="flex flex-col items-center justify-center pt-12 px-6 text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 rounded-[28px] flex items-center justify-center shadow-2xl mb-6 border border-indigo-500/20">
              <Brain className="w-12 h-12 text-amber-400" />
            </div>
            <div className="bg-amber-100 text-amber-900 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest mb-3 border border-amber-200">
              VIP ACCESS PLATINUM
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Panduan Penghasilan</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10 max-w-xs">
              Bukan sekadar saran motivasi umum. Mesin kecerdasan buatan akan meracik strategi bisnis riil berdasarkan aset, keahlian, dan <span className="font-bold text-slate-700">kondisi kas aktualmu</span>.
            </p>
            <Button 
              onClick={() => transitionTo('S1_Q_STATUS')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-full font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              MULAI ANALISIS KOGNITIF <ArrowRight className="w-5 h-5"/>
            </Button>
          </div>
        )}

        {/* S1: Status Pengguna */}
        {state.currentState === 'S1_Q_STATUS' && (
          <div className="px-4">
            <DynamicStepCard
              title="Identifikasi Profil"
              color_variant="primary"
              sections={[{
                type: 'choice_single',
                label: "Kamu saat ini berstatus sebagai apa?",
                options: [
                  { value: 'PELAJAR', label: 'Pelajar (SMP/SMA/SMK)' },
                  { value: 'MAHASISWA', label: 'Mahasiswa Aktif' },
                  { value: 'PEKERJA', label: 'Sudah Bekerja (Tetap/Kontrak)' },
                  { value: 'BELUM_BEKERJA', label: 'Sedang Mencari Pekerjaan' }
                ]
              }]}
              selectedValue={state.profileData.status}
              onSelectSingle={handleStatusSelect}
            />
          </div>
        )}

        {/* S2: Tujuan Finansial (Dinamis & Tajam) */}
        {state.currentState === 'S2_Q_TUJUAN' && (
          <div className="px-4">
            <DynamicStepCard
              title="Tujuan Finansial"
              color_variant="accent"
              sections={[{
                type: 'choice_single',
                label: "Apa tujuan utama kamu mencari penghasilan tambahan saat ini?",
                options: getTujuanOptions()
              }]}
              selectedValue={state.profileData.tujuan}
              onSelectSingle={handleTujuanSelect}
            />
          </div>
        )}

        {/* S3: Komitmen Pola Kerja */}
        {state.currentState === 'S3_Q_POLA_KERJA' && (
          <div className="px-4">
            <DynamicStepCard
              title="Komitmen Pola Kerja"
              color_variant="primary"
              sections={[{
                type: 'choice_single',
                label: state.profileData.status === 'PEKERJA' 
                  ? "Karena kamu sudah punya kerja utama, mau jadwal sampingan yang pasti atau benar-benar fleksibel?"
                  : "Sesuaikan dengan ritme rutinitas harianmu, komitmen sistem kerja yang kamu inginkan:",
                options: [
                  { value: 'RUTIN_TERJADWAL', label: 'Rutin Terjadwal (Butuh Komitmen Waktu Pasti)' },
                  { value: 'FLEKSIBEL', label: 'Fleksibel (Kapanpun Ada Waktu Senggang)' }
                ]
              }]}
              selectedValue={state.profileData.polaKerja}
              onSelectSingle={handlePolaKerjaSelect}
            />
          </div>
        )}

        {/* S4: Latar Belakang */}
        {state.currentState === 'S4_Q_LATAR_BELAKANG' && (
          <div className="px-4 w-full max-w-sm mx-auto space-y-4">
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500"/> Latar Belakang Fokus
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Tuliskan program studi, bidang kejuruan, atau posisi pekerjaan terakhirmu saat ini untuk pencocokan skill modular:
              </p>
              <Input
                placeholder={state.profileData.status === 'PELAJAR' ? "Misal: SMK Tata Boga / SMA IPS" : "Misal: S1 Akuntansi Semester 5"}
                value={textBuffer}
                onChange={(e) => setTextBuffer(e.target.value)}
                className="bg-slate-50 h-12 rounded-xl text-xs"
              />
              <Button
                disabled={!textBuffer.trim()}
                onClick={handleLatarBelakangSubmit}
                className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                SIMPAN & LANJUTKAN
              </Button>
            </div>
          </div>
        )}

        {/* S5: Inventaris Keahlian */}
        {state.currentState === 'S5_Q_KEAHLIAN' && (
          <div className="px-4 space-y-4 max-w-sm mx-auto">
            <DynamicStepCard
              title="Inventaris Keahlian"
              color_variant="primary"
              selectedValues={multiSelectBuffer}
              sections={[{
                type: 'choice_multi',
                label: "Pilih kelompok keahlian utama yang kamu kuasai (Bisa pilih lebih dari satu):",
                options: [
                  { value: 'KREATIF', label: 'Kreatif (Desain Grafis, Content Writing, Video Editing)' },
                  { value: 'DIGITAL_TEKNIS', label: 'Digital Teknis (Coding, Riset Web, Excel Data)' },
                  { value: 'KULINER', label: 'Kuliner (Memasak, Baking Kue, Ritel Pangan)' },
                  { value: 'INTERPERSONAL', label: 'Interpersonal (Sales, Mengajar, Public Speaking)' }
                ]
              }]}
              onSelectMulti={toggleMultiSelect}
            />
            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-3">
              <p className="text-xs font-bold text-slate-600">Punya keahlian spesifik lainnya? Ketik bebas di sini:</p>
              <Input
                placeholder="Contoh: Bisa edit cepat di CapCut, paham Pivot Table"
                value={textBuffer}
                onChange={(e) => setTextBuffer(e.target.value)}
                className="bg-slate-50 h-11 rounded-xl text-xs mb-2"
              />
              <Button
                disabled={multiSelectBuffer.length === 0 && !textBuffer.trim()}
                onClick={handleKeahlianSubmit}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl"
              >
                SIMPAN KEAHLIAN
              </Button>
            </div>
          </div>
        )}

        {/* S6: Aset Fisik */}
        {state.currentState === 'S6_Q_ASET' && (
          <div className="px-4 space-y-4 max-w-sm mx-auto">
            <DynamicStepCard
              title="Aset Pendukung"
              color_variant="accent"
              selectedValues={multiSelectBuffer}
              sections={[{
                type: 'choice_multi',
                label: "Pilih aset fisik pendukung yang sudah siap kamu gunakan saat ini:",
                options: [
                  { value: 'LAPTOP_PC', label: 'Laptop / Komputer PC Memadai' },
                  { value: 'HP_KAMERA_BAGUS', label: 'Smartphone dengan Kamera Jernih' },
                  { value: 'KENDARAAN', label: 'Motor / Mobil Pribadi' },
                  { value: 'RUANG_USAHA', label: 'Dapur Luas / Garasi / Kamar Kosong Terbuka' }
                ]
              }]}
              onSelectMulti={toggleMultiSelect}
            />
            <Button
              onClick={handleAsetSubmit}
              className="w-full max-w-sm mx-auto block h-12 bg-slate-900 text-white font-black text-xs rounded-xl"
            >
              SIMPAN ASET & LANJUT
            </Button>
          </div>
        )}

        {/* S7: Konstrain Waktu */}
        {state.currentState === 'S7_Q_KONSTRAIN_WAKTU' && (
          <div className="px-4 max-w-sm mx-auto">
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500"/> Ketersediaan Waktu
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {getWaktuFramingText()}
              </p>
              <Input
                type="number"
                placeholder="Contoh: 12 jam"
                value={textBuffer}
                onChange={(e) => setTextBuffer(e.target.value)}
                className="bg-slate-50 h-14 rounded-xl text-center font-black text-lg text-slate-800 focus:ring-slate-900"
              />
              <Button
                disabled={!textBuffer.trim() || isNaN(Number(textBuffer))}
                onClick={handleKonstrainWaktuSubmit}
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-xs rounded-xl tracking-wider shadow-lg flex items-center justify-center gap-2"
              >
                PROSES DENGAN BILANO AI <ArrowRight className="w-4 h-4"/>
              </Button>
            </div>
          </div>
        )}

        {/* S8: Global AI Brain Loading */}
        {state.currentState === 'S8_GENERATE_REKOMENDASI' && (
          <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100"></div>
              <div className="w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
              <Brain className="w-6 h-6 text-indigo-600 absolute top-5 left-5 animate-pulse"/>
            </div>
            <h3 className="font-black text-slate-800 text-xl mb-1">Membuka Jalur Kognitif...</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
              Kecerdasan buatan sedang melakukan analisis mendalam cross-reference profil dan sisa saldo kas aman mutasi Anda.
            </p>
          </div>
        )}

        {/* S9: Pilih Ide Usaha */}
        {state.currentState === 'S9_PILIH_IDE' && (
          <div className="px-4 space-y-4 animate-in slide-in-from-bottom-6 duration-500 max-w-md mx-auto">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-[28px] text-white shadow-xl flex items-start gap-4 border border-indigo-500/20">
              <Rocket className="w-8 h-8 text-amber-400 shrink-0 mt-1"/>
              <div>
                <h3 className="font-black text-lg text-amber-400">Peta Jalur Cuan Ditemukan</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed mt-0.5">
                  Ini rekomendasi opsi usaha spesifik berbasis kapasitas modal aman dan keahlian riil yang Anda miliki:
                </p>
              </div>
            </div>

            {state.recommendations.map((rec) => (
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
                
                <div className="bg-indigo-50/40 border border-indigo-100 p-4 rounded-2xl mb-5">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5"/> Kenapa Ini Sangat Cocok?
                  </p>
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

        {/* S10 & S11: Kalkulator Riset Bahan Interaktif */}
        {(state.currentState === 'S10_RENCANA_BAHAN' || state.currentState === 'S11_RISET_HARGA') && (
          <div className="px-4 space-y-4 max-w-sm mx-auto">
            
            {/* KOTAK INDIKATOR TUGAS ABU-ABU TEBAL GAYA GAMBAR REFERENSI */}
            <div className="bg-[#2FD1F7] text-slate-900 rounded-[32px] p-6 shadow-md text-center border-4 border-slate-950 relative overflow-hidden">
              <h2 className="text-lg font-black tracking-tight mb-4 uppercase leading-tight font-sans">
                BAIK, BERIKUT ADALAH TUGAS SELANJUTNYA:
              </h2>
              <div className="bg-black/10 py-2.5 px-4 rounded-xl mb-3 text-xs font-black tracking-wide uppercase border border-black/5">
                CARI BAHAN-BAHAN YANG DIPERLUKAN
              </div>
              <div className="bg-black/10 py-2.5 px-4 rounded-xl text-xs font-black tracking-wide uppercase border border-black/5">
                TULISKAN HARGA MASING-MASING DARI SETIAP BAHANNYA:
              </div>
            </div>

            {/* LIST EDITOR RAB PWA INTEGRATED */}
            <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl space-y-4">
              <h3 className="font-black text-base text-amber-400">Rencana Anggaran Biaya</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Ubah harga item menjadi 0 jika alat penunjang sudah Anda miliki atau bisa meminjam cadangan.
              </p>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {state.materials.map((item) => (
                  <div key={item.id} className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                    <div className="flex items-center gap-2">
                      <input 
                        value={inputGroupBuffer[`${item.id}_name`] ?? item.name}
                        onChange={(e) => handleInputChange(`${item.id}_name`, e.target.value)}
                        className="flex-1 bg-transparent border-none text-white text-xs font-bold focus:ring-0 p-1"
                      />
                      <div className="flex items-center bg-black/40 rounded-xl px-2.5 border border-white/10 w-24 h-9">
                        <span className="text-[10px] text-slate-400 font-bold mr-1">Rp</span>
                        <input
                          type="number"
                          value={inputGroupBuffer[`${item.id}_price`] ?? ""}
                          onChange={(e) => handleInputChange(`${item.id}_price`, e.target.value)}
                          className="w-full bg-transparent border-none text-white text-xs font-black text-right p-0 focus:ring-0"
                        />
                      </div>
                      <button 
                        onClick={() => dispatch({ type: 'REMOVE_MATERIAL', payload: item.id })}
                        className="p-1.5 text-rose-400 hover:bg-white/10 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                    {item.note && <p className="text-[9px] text-amber-400/80 font-medium px-1">💡 Alternatif: {item.note}</p>}
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {
                  const id = Math.random().toString(36).substring(2, 9);
                  dispatch({ type: 'ADD_MANUAL_MATERIAL', payload: { id, name: "Bahan Baru", price: 0 } });
                }}
                className="text-xs font-black text-amber-400 flex items-center gap-1 hover:underline pt-1 px-1"
              >
                <PlusCircle className="w-4 h-4"/> TAMBAH ITEM PENGELUARAN BARU
              </button>
            </div>

            {/* DUSTBOARD TOTAL ANGGARAN & UJI KELAYAKAN DETEKSI KAS */}
            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Kebutuhan Modal Eksekusi:</span>
                <span className="text-xl font-black text-slate-800">
                  {formatCurrency(state.materials.reduce((acc, m) => acc + (Number(m.price) || 0), 0)).split(',')[0]}
                </span>
              </div>
              <Button
                onClick={handleFeasibilityCheck}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-lg tracking-wider animate-bounce"
              >
                UJI KELAYAKAN TERHADAP SALDO KAS
              </Button>
            </div>
          </div>
        )}

        {/* S13: Strategi Mitigasi Modal */}
        {state.currentState === 'S13_STRATEGI_MODAL' && (
          <div className="px-4 space-y-4 max-w-sm mx-auto animate-in zoom-in-95 duration-300">
            <div className="bg-rose-50 border border-rose-100 p-5 rounded-[32px] text-center">
              <h3 className="font-black text-rose-900 text-lg mb-1">Batas Aman Kas Terlampaui</h3>
              <p className="text-xs text-rose-700 font-medium leading-relaxed max-w-xs mx-auto">
                Total alokasi biaya modal melebihi batas dana darurat aman operasional Bilano Anda.
              </p>
            </div>

            <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest px-2">
              Solusi Taktis Finansial AI:
            </h4>

            {state.capitalStrategies.map((opt, idx) => (
              <div key={idx} className="bg-white p-5 rounded-[26px] border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <h5 className="font-black text-slate-800 text-sm flex-1 pr-2 leading-tight">{opt.title}</h5>
                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full shrink-0">{opt.estimated_effort}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{opt.description}</p>
                <Button
                  onClick={triggerSellingChatInit}
                  className="w-full bg-slate-900 text-white h-10 rounded-xl text-xs font-bold"
                >
                  SAYA SETUJU & LANJUT TAHAPAN
                </Button>
              </div>
            ))}

            <Button 
              onClick={() => transitionTo('S10_RENCANA_BAHAN')}
              className="w-full h-12 bg-slate-200 text-slate-600 rounded-full font-bold text-xs"
            >
              KEMBALI MODIFIKASI ANGGARAN BAHAN
            </Button>

            <FinanceSafetyBanner />
          </div>
        )}

        {/* S14: Bounded Discussion Chat Pemasaran (Strategi Jual) */}
        {state.currentState === 'S14_STRATEGI_JUAL' && (
          <div className="px-4">
            <BoundedChatMarketing
              ideaTitle={state.selectedIdea?.title || "Strategi Promosi Baru"}
              chatHistory={state.chatHistory}
              isProcessing={isAiLoading}
              onSendMessage={handleSendMarketingMessage}
              onCompleteDiscussion={() => transitionTo('S15_TRACKING_OMSET')}
            />
            <FinanceSafetyBanner />
          </div>
        )}

        {/* S15: Operasional Berjalan & Logging Omset Berkala */}
        {state.currentState === 'S15_TRACKING_OMSET' && (
          <div className="px-4 max-w-md mx-auto space-y-4 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">OPERASIONAL BISNIS AKTIF</p>
              <h2 className="text-xl font-black mb-1 tracking-tight">{state.selectedIdea?.title}</h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">{state.selectedIdea?.pitch}</p>
              
              <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Total Akumulasi Cuan</p>
                  <p className="text-3xl font-black text-emerald-400">
                    {formatCurrency(state.revenueLogs.reduce((acc, r) => acc + r.amount, 0)).split(',')[0]}
                  </p>
                </div>
                <Button 
                  onClick={triggerPerformanceReview}
                  disabled={isAiLoading || state.revenueLogs.length === 0}
                  className="bg-white hover:bg-slate-100 text-slate-950 font-black text-xs h-10 px-4 rounded-full shadow-md flex items-center gap-1.5 transition-all"
                >
                  {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <><BarChart3 className="w-3.5 h-3.5"/> EVALUASI PROGRES AI</>}
                </Button>
              </div>
            </div>

            {/* Analisis Dinamis Evaluatif dari Gemini */}
            {aiReviewNote && (
              <div className="bg-indigo-950 text-indigo-100 border border-indigo-500/20 p-5 rounded-[26px] shadow-sm animate-in zoom-in-95">
                <h4 className="font-black text-amber-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-amber-400"/> Tinjauan Pengembang Bisnis AI:
                </h4>
                <p className="text-xs leading-relaxed text-indigo-200 font-medium whitespace-pre-line">{aiReviewNote}</p>
              </div>
            )}

            {/* Form Input Rekap Penjualan Harian */}
            <div className="bg-white p-5 rounded-[26px] border border-slate-100 shadow-sm space-y-3">
              <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider px-1">Input Catatan Omset Harian</h4>
              <div className="flex gap-2">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 flex-1 h-12">
                  <span className="text-xs font-bold text-slate-400 mr-1">Rp</span>
                  <input 
                    type="number"
                    placeholder="Nominal Penjualan"
                    value={revAmount}
                    onChange={(e) => setRevAmount(e.target.value)}
                    className="bg-transparent border-none text-xs w-full font-black focus:ring-0 p-0 text-slate-800"
                  />
                </div>
                <Input 
                  placeholder="Keterangan (Misal: Jual 6 box)"
                  value={revNote}
                  onChange={(e) => setRevNote(e.target.value)}
                  className="bg-slate-50 text-xs border-transparent shadow-inner flex-1 h-12 rounded-xl"
                />
              </div>
              <Button 
                onClick={handleCommitRevenueLog}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black h-12 rounded-xl text-xs uppercase tracking-wider"
              >
                MASUKKAN REKAP PENJUALAN
              </Button>
            </div>

            {/* Buku Kas Penjualan */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-400 text-[10px] px-2 uppercase tracking-widest">Buku Kas Penjualan</h4>
              {state.revenueLogs.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-10 bg-white rounded-2xl border-2 border-dashed border-slate-100 font-medium">
                  Belum ada omset penjualan yang dimasukkan minggu ini.
                </p>
              ) : (
                state.revenueLogs.map((log) => (
                  <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-xs animate-in slide-in-from-top-2">
                    <div>
                      <p className="font-black text-xs text-slate-800">{log.note}</p>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">{log.date}</p>
                    </div>
                    <p className="font-black text-emerald-600 text-sm">+ {formatCurrency(log.amount).split(',')[0]}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}