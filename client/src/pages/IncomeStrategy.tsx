// @ts-nocheck
import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { useUser } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/tracking";
import {
  Crown, GraduationCap, BookOpen, Briefcase, Search, ChevronRight,
  Loader2, Check, Plus, Trash2, Wallet, Send, AlertTriangle, CheckCircle2,
  PiggyBank, Target, Radar, Crosshair, Activity, LogOut, FileWarning, ShoppingCart, Lock, ShieldAlert
} from "lucide-react";
import {
  useIncomeProfile, useGenerateQuestions, useSaveIncomeProfile, useGenerateRecommendations,
  useIncomeAttempts, useCreateAttempt, useUpdateMaterials, useCheckFeasibility,
  useCapitalStrategy, useUpdateAttemptState, useSellingChat, useAddFinanceLog, useEvaluateAttempt, useStopAttempt
} from "@/hooks/use-income-strategy";

// =========================================================================
// KONSTAN (value tetap dikontrol kode — lihat dokumen desain sistem)
// =========================================================================
const STATUS_OPTIONS = [
  { value: "PELAJAR", label: "Pelajar", sub: "SMP / SMA / SMK", icon: GraduationCap, color: "from-sky-400 to-blue-600" },
  { value: "MAHASISWA", label: "Mahasiswa", sub: "Sedang kuliah", icon: BookOpen, color: "from-violet-400 to-indigo-600" },
  { value: "PEKERJA", label: "Pekerja", sub: "Karyawan / kontrak", icon: Briefcase, color: "from-emerald-400 to-teal-600" },
  { value: "BELUM_BEKERJA", label: "Belum Bekerja", sub: "Sedang mencari kerja", icon: Search, color: "from-amber-400 to-orange-600" },
];

const formatRp = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return "Rp 0";
  return formatCurrency(val).split(",")[0];
};

const CAPITAL_BADGE: Record<string, string> = {
  TANPA_MODAL: "bg-emerald-100 text-emerald-700",
  MODAL_KECIL: "bg-amber-100 text-amber-700",
  MODAL_SEDANG: "bg-rose-100 text-rose-700",
};

const CAPITAL_LABEL: Record<string, string> = {
  TANPA_MODAL: "Tanpa modal",
  MODAL_KECIL: "Modal kecil",
  MODAL_SEDANG: "Modal sedang",
};

const DIFFICULTY_BADGE: Record<string, string> = {
  MUDAH: "bg-emerald-100 text-emerald-700",
  SEDANG: "bg-amber-100 text-amber-700",
  MENANTANG: "bg-rose-100 text-rose-700",
};

const STATE_BADGE: Record<string, { label: string; className: string }> = {
  MATERIALS: { label: "Penyusunan RAB", className: "bg-slate-100 text-slate-600" },
  CAPITAL: { label: "Strategi Permodalan", className: "bg-amber-100 text-amber-700" },
  SELLING: { label: "Eksekusi Penjualan", className: "bg-indigo-100 text-indigo-700" },
  TRACKING: { label: "Dasbor Arus Kas", className: "bg-emerald-100 text-emerald-700" },
};

// =========================================================================
// PENDUKUNG UI (Bukan bawaan AI generik)
// =========================================================================
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.min(100, Math.round((step / total) * 100));
  return (
    <div className="mb-5">
      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        <span>Pertanyaan {Math.min(step, total)} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-slate-900 rounded-full transition-all duration-500" 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  );
}

function OptionButton({ label, selected, onClick, checkbox }: { label: string; selected: boolean; onClick: () => void; checkbox?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-[16px] border-2 transition-all flex items-center justify-between gap-3 active:scale-[0.99] ${
        selected 
          ? "border-slate-800 bg-slate-50 shadow-sm" 
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span className={`text-sm font-bold ${selected ? "text-slate-900" : "text-slate-600"}`}>{label}</span>
      {checkbox ? (
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          selected ? "border-slate-800 bg-slate-800" : "border-slate-300"
        }`}>
          {selected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
      ) : (
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          selected ? "border-slate-800 bg-slate-800" : "border-slate-300"
        }`}>
          {selected && <div className="w-2 h-2 bg-white rounded-full" />}
        </div>
      )}
    </button>
  );
}

function LockedScreen() {
  return (
    <MobileLayout title="Pembimbing Penghasilan" showBack>
      <div className="relative min-h-[70vh] overflow-hidden">
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(251,191,36,0.4)]">
            <Crown className="w-10 h-10 text-amber-950" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Eksklusif BILANO PRO</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-xs leading-relaxed font-medium">
            Fitur perancang dan pembimbing strategi pemasukan gerilya terikat pada modul intelijen premium.
          </p>
          <Link href="/paywall">
            <button className="w-full max-w-xs h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full shadow-2xl transition-transform active:scale-95">
              AKTIVASI AKSES PREMIUM
            </button>
          </Link>
        </div>
      </div>
    </MobileLayout>
  );
}

function CooldownScreen({ dateStr }: { dateStr: string }) {
  const formatted = new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <MobileLayout title="Pembimbing Terkunci" showBack>
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-6 mt-6">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-5 border border-slate-200 shadow-inner">
          <Lock className="w-9 h-9 text-slate-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Fase Jeda & Evaluasi Bisnis</h2>
        <p className="text-sm text-slate-600 mb-8 leading-relaxed font-medium max-w-md">
          Anda baru saja menutup operasional usaha. Untuk melatih kedisiplinan dan mencegah keputusan impulsif, sistem menahan pembuatan ide baru. Manfaatkan waktu ini untuk mengevaluasi arus kas sebelumnya. Penguncian terbuka pada <b>{formatted}</b>.
        </p>
        <Link href="/dashboard">
          <button className="w-full max-w-xs h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full shadow-lg transition-transform active:scale-95">
            KEMBALI KE BERANDA
          </button>
        </Link>
      </div>
    </MobileLayout>
  );
}

// =========================================================================
// FASE 1: IDENTIFIKASI
// =========================================================================
function IdentifyFlow({ onComplete }: { onComplete: (status: string, answers: any) => void }) {
  const { toast } = useToast();
  const generateQuestions = useGenerateQuestions();
  
  const [status, setStatus] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [textValue, setTextValue] = useState("");
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);

  const handlePickStatus = async (value: string) => {
    setStatus(value);
    setIsFetchingQuestions(true);
    try {
      const result = await generateQuestions.mutateAsync(value);
      setQuestions(result.questions || []);
      setStepIndex(1);
    } catch (e: any) {
      toast({ title: "Gagal memproses profil", description: e.message, variant: "destructive" });
    } finally {
      setIsFetchingQuestions(false);
    }
  };

  const handleNext = () => {
    const currentQuestion = questions[stepIndex - 1];
    if (!currentQuestion) return;

    let value: any;
    if (currentQuestion.type === "multi") {
      value = multiSelected;
    } else if (currentQuestion.type === "text") {
      value = textValue.trim();
      if (!value) return;
    }

    advance(currentQuestion.field_key, value);
  };

  const advance = (fieldKey: string, value: any) => {
    const keyParts = fieldKey.split('_');
    const camelKey = keyParts[0] + keyParts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    
    const nextAnswers = { ...answers, [camelKey]: value };
    setAnswers(nextAnswers);
    
    setMultiSelected([]);
    setTextValue("");

    if (stepIndex >= questions.length) {
      onComplete(status as string, nextAnswers);
    } else {
      setStepIndex((s) => s + 1);
    }
  };

  if (stepIndex === 0) {
    return (
      <div className="pt-2 pb-24">
        <ProgressBar step={0} total={9} />
        <h2 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">Status Finansial Anda?</h2>
        <p className="text-sm text-slate-500 mb-6 font-medium">Digunakan untuk penyesuaian regulasi taktik di lapangan.</p>
        <div className="grid grid-cols-2 gap-3">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => handlePickStatus(opt.value)}
                disabled={isFetchingQuestions}
                className="bg-white border-2 border-slate-100 hover:border-slate-200 rounded-[24px] p-5 flex flex-col items-center text-center gap-3 active:scale-95 transition-all disabled:opacity-50"
              >
                <div className="w-14 h-14 rounded-full bg-slate-950 flex items-center justify-center shadow-md">
                  {isFetchingQuestions && status === opt.value ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Icon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-extrabold text-slate-800 text-sm tracking-tight">{opt.label}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{opt.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[stepIndex - 1];
  if (!currentQuestion) return <div className="pt-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-800" /></div>;

  return (
    <div className="pt-2 pb-24">
      <ProgressBar step={stepIndex} total={9} />
      <h2 className="text-xl font-black text-slate-800 mb-5 leading-snug tracking-tight">{currentQuestion.question_text}</h2>
      
      {currentQuestion.type === "single" && (
        <div className="space-y-2.5">
          {(currentQuestion.options || []).map((opt: any) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={false}
              onClick={() => advance(currentQuestion.field_key, opt.value)}
            />
          ))}
        </div>
      )}

      {currentQuestion.type === "multi" && (
        <div className="space-y-2.5">
          {(currentQuestion.options || []).map((opt: any) => {
            const isSel = multiSelected.includes(opt.value);
            return (
              <OptionButton
                key={opt.value}
                label={opt.label}
                checkbox
                selected={isSel}
                onClick={() => {
                  if (isSel) setMultiSelected(multiSelected.filter(v => v !== opt.value));
                  else setMultiSelected([...multiSelected, opt.value]);
                }}
              />
            );
          })}
          <button
            onClick={handleNext}
            disabled={multiSelected.length === 0}
            className="w-full h-14 bg-slate-900 text-white font-extrabold rounded-full transition-transform active:scale-95 mt-4 disabled:opacity-30"
          >
            KONFIRMASI PILIHAN
          </button>
        </div>
      )}

      {currentQuestion.type === "text" && (
        <div className="space-y-3">
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder={currentQuestion.placeholder || "Tulis jawaban di sini..."}
            rows={4}
            className="w-full px-5 py-4 rounded-[16px] border-2 border-slate-200 text-sm font-semibold focus:border-slate-800 outline-none resize-none transition-colors"
          />
          <button
            onClick={handleNext}
            disabled={!textValue.trim()}
            className="w-full h-14 bg-slate-900 text-white font-extrabold rounded-full transition-transform active:scale-95 disabled:opacity-30"
          >
            LANJUTKAN
          </button>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// FASE 2: REKOMENDASI RADAR
// =========================================================================
function RecommendationCard({ rec, onSelect, isSelecting }: { rec: any; onSelect: () => void; isSelecting: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border-2 border-slate-100 hover:border-slate-200 rounded-[24px] p-5 shadow-sm transition-all">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-amber-400" />
        </div>
        <h3 className="font-black text-slate-800 text-base leading-snug pt-1 tracking-tight flex-1">{rec.title}</h3>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4 font-medium pl-1">{rec.pitch}</p>
      
      <div className="flex flex-wrap gap-1.5 mb-3.5 pl-1">
        {rec.capital_level && (
          <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full ${CAPITAL_BADGE[rec.capital_level] || "bg-slate-100 text-slate-600"}`}>
            {CAPITAL_LABEL[rec.capital_level] || rec.capital_level}
          </span>
        )}
        {rec.difficulty && (
          <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full ${DIFFICULTY_BADGE[rec.difficulty] || "bg-slate-100 text-slate-600"}`}>
            Tingkat: {rec.difficulty}
          </span>
        )}
        {rec.estimated_time_to_first_income && (
          <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            Hasil: {rec.estimated_time_to_first_income}
          </span>
        )}
      </div>

      <button 
        onClick={() => setOpen(!open)} 
        className="text-xs font-bold text-slate-400 hover:text-slate-700 mb-4 flex items-center gap-1 border-b border-dashed pb-0.5 ml-1 transition-colors"
      >
        {open ? "Sembunyikan bedah internal" : "Lihat Analisis Taktik Kelayakan"}
      </button>

      {open && (
        <div className="bg-slate-50 border border-slate-100 rounded-[16px] p-4 mb-4 space-y-2.5 ml-1 animate-fade-in">
          <p className="text-xs text-slate-700 leading-relaxed">
            <b className="text-slate-900 block mb-0.5">Analisis Penyelarasan:</b> 
            {rec.why_it_fits}
          </p>
          {rec.risk_note && (
            <p className="text-xs text-slate-700 leading-relaxed">
              <b className="text-rose-700 block mb-0.5">Risiko Utama Lapangan:</b> 
              {rec.risk_note}
            </p>
          )}
          {rec.upskilling_note && (
            <p className="text-xs text-slate-700 leading-relaxed">
              <b className="text-indigo-900 block mb-0.5">Catatan Akselerasi Skill:</b> 
              {rec.upskilling_note}
            </p>
          )}
        </div>
      )}

      <button
        onClick={onSelect}
        disabled={isSelecting}
        className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {isSelecting ? <Loader2 className="w-5 h-5 animate-spin" /> : "EKSEKUSI TAKTIK INI"}
      </button>
    </div>
  );
}

function RecommendView({ profile, attempts, onSelect, selectingId, localRecs, isGenerating, handleGenerate }: any) {
  const archived = (attempts || []).filter((a: any) => a.status === 'STOPPED');
  
  return (
    <div className="pt-2 pb-24 space-y-7">
      {archived.length > 0 && (
        <div>
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 pl-1">Arsip Operasional</h4>
          <div className="space-y-2">
            {archived.map((att: any) => (
              <div key={att.id} className="bg-slate-50 border-2 border-slate-100 rounded-[20px] p-4 flex items-center justify-between opacity-60">
                <div className="min-w-0 pr-2">
                  <p className="font-extrabold text-slate-700 text-sm truncate">{att.recommendation?.title}</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Dihentikan pada fase: {STATE_BADGE[att.state]?.label || att.state}</p>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-200 text-slate-600 flex-shrink-0">Terminasi</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 pl-1">Rekomendasi Radar AI</h4>
        {localRecs.length === 0 ? (
          <div className="bg-white border-2 border-slate-100 rounded-[28px] p-6 text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Radar className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="font-black text-slate-800 text-lg mb-1 tracking-tight">Radar Belum Diaktifkan</h3>
            <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed px-2">
              Sistem membutuhkan pemindaian penuh untuk mendekomposisi modal sosial dan keahlian Anda menjadi strategi gerilya lokal.
            </p>
            <button 
              onClick={handleGenerate} 
              disabled={isGenerating} 
              className="w-full h-14 bg-slate-900 text-white font-extrabold rounded-full shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  MEMINDAI DATA STRATEGIS...
                </>
              ) : (
                <>
                  <Radar className="w-5 h-5" />
                  AKTIFKAN RADAR PEMINDAI
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {localRecs.map((rec: any) => (
              <RecommendationCard 
                key={rec.id || rec.title} 
                rec={rec} 
                onSelect={() => onSelect(rec)} 
                isSelecting={selectingId === (rec.id || rec.title)} 
              />
            ))}
            <button 
              onClick={handleGenerate} 
              disabled={isGenerating} 
              className="w-full h-14 bg-white border-2 border-slate-200 text-slate-700 font-extrabold rounded-full text-sm flex items-center justify-center gap-2 active:scale-95 transition-all mt-2"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pindai Strategi Alternatif Baru"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// FASE 3: EKSEKUSI (LANGKAH-LANGKAH OPERASIONAL)
// =========================================================================

function MaterialsStep({ attempt, onUpdated }: { attempt: any; onUpdated: (partial: any) => void }) {
  const { toast } = useToast();
  const updateMaterials = useUpdateMaterials(attempt.id);
  const checkFeasibility = useCheckFeasibility(attempt.id);
  
  const [materials, setMaterials] = useState<any[]>(attempt.materials || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const totalRAB = materials.reduce((sum, m) => sum + (Number(m.price) || 0), 0);

  const editRow = (idx: number, field: string, value: any) => {
    setMaterials(materials.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };
  
  const addRow = () => {
    setMaterials([...materials, { id: String(materials.length + 1).padStart(4, "0"), name: "", price: 0, note: null }]);
  };

  const removeRow = (idx: number) => {
    setMaterials(materials.filter((_, i) => i !== idx));
  };

  const executeCalibration = async () => {
    setIsProcessing(true);
    try {
      await updateMaterials.mutateAsync(materials);
      const res = await checkFeasibility.mutateAsync({});
      onUpdated({ state: res.state, feasibilityVerdict: res.verdict, totalCost: res.total_cost });
    } catch (e: any) {
      toast({ title: "Gagal memproses RAB", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pt-1 pb-24">
      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-0.5">Rencana Anggaran Biaya (RAB Gerilya)</h4>
      <div className="space-y-2.5 mb-5">
        {materials.map((m, idx) => (
          <div key={m.id || idx} className="bg-white border-2 border-slate-100 rounded-[18px] p-3.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <input 
                value={m.name} 
                onChange={(e) => editRow(idx, "name", e.target.value)} 
                placeholder="Nama keperluan modal..." 
                className="w-full text-sm font-bold outline-none text-slate-800 bg-transparent"
              />
              {m.note && <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{m.note}</p>}
            </div>
            <div className="flex items-center gap-1 border-l pl-3 border-slate-100 flex-shrink-0">
              <span className="text-xs text-slate-400 font-bold">Rp</span>
              <input 
                type="number" 
                value={m.price || ""} 
                onChange={(e) => editRow(idx, "price", Number(e.target.value))} 
                placeholder="0" 
                className="w-20 text-sm font-black text-right outline-none text-slate-800 bg-transparent"
              />
            </div>
            <button onClick={() => removeRow(idx)} className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button 
          onClick={addRow} 
          className="w-full h-13 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-[18px] text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" /> TAMBAH BARIS KEBUTUHAN
        </button>
      </div>

      <div className="bg-slate-900 rounded-[22px] p-5 flex items-center justify-between mb-6 shadow-md">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proyeksi Awal Anggaran</span>
        <span className="text-xl font-black text-white tracking-tight">{formatRp(totalRAB)}</span>
      </div>

      <button
        onClick={executeCalibration}
        disabled={isProcessing || materials.length === 0 || totalRAB === 0}
        className="w-full h-14 bg-slate-900 text-white font-extrabold rounded-full shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-20"
      >
        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Crosshair className="w-5 h-5" /> KALIBRASI KECUKUPAN DANA</>}
      </button>
    </div>
  );
}

function CapitalStep({ attempt, onUpdated }: { attempt: any; onUpdated: (partial: any) => void }) {
  const { toast } = useToast();
  const checkFeasibility = useCheckFeasibility(attempt.id);
  const capitalStrategy = useCapitalStrategy(attempt.id);

  const [context, setContext] = useState("");
  const [plan, setPlan] = useState<any>(attempt.capitalPlan);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);

  const fetchStrategy = async () => {
    setLoadingPlan(true);
    try {
      const res = await capitalStrategy.mutateAsync(context);
      setPlan(res);
    } catch (e: any) {
      toast({ title: "Gagal memuat alternatif", description: e.message, variant: "destructive" });
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleBypass = async () => {
    setLoadingNext(true);
    try {
      const res = await checkFeasibility.mutateAsync({ manualMonthlyExpense: 0 }); // Bypass force state
      onUpdated({ state: res.state, feasibilityVerdict: res.verdict });
    } catch (e: any) {
      toast({ title: "Gagal melanjutkan", description: e.message, variant: "destructive" });
    } finally {
      setLoadingNext(false);
    }
  };

  return (
    <div className="pt-1 pb-24 space-y-5">
      <div className="bg-rose-50 border-2 border-rose-100 rounded-[24px] p-5 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h4 className="font-black text-rose-900 text-base tracking-tight mb-1">Peringatan: Defisit Batas Aman Kas</h4>
        <p className="text-xs text-rose-700 font-medium leading-relaxed max-w-sm mx-auto">
          Anggaran modal total sebesar <b>{formatRp(attempt.totalCost)}</b> terdeteksi menembus kas cadangan rutin harian Anda. Lakukan optimalisasi permodalan non-utang.
        </p>
      </div>

      {plan ? (
        <div className="space-y-3">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Rekomendasi Pendanaan Alternatif</h4>
          {(plan.options || []).map((opt: any, idx: number) => (
            <div key={idx} className="bg-white border-2 border-slate-100 rounded-[20px] p-4.5 shadow-sm">
              <p className="font-extrabold text-slate-800 text-sm tracking-tight mb-1">{opt.title}</p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">{opt.description}</p>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">Estimasi: {opt.estimated_time_or_effort}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-100 rounded-[24px] p-5">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-2">Bantuan Solusi Bootstrapping AI</h4>
          <input 
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Ada alat/bahan yang bisa dipinjam atau barter? Tulis di sini..." 
            className="w-full h-13 px-4 rounded-[14px] border border-slate-200 text-xs font-semibold focus:border-slate-800 outline-none mb-3"
          />
          <button
            onClick={fetchStrategy}
            disabled={loadingPlan}
            className="w-full h-12 bg-slate-900 text-white text-xs font-black rounded-xl active:scale-95 transition-transform flex items-center justify-center"
          >
            {loadingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : "RACIK STRATEGI PENDANAAN NON-PINJOL"}
          </button>
        </div>
      )}

      <button
        onClick={handleBypass}
        disabled={loadingNext}
        className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        {loadingNext ? <Loader2 className="w-5 h-5 animate-spin" /> : "SAYA SUDAH MENUTUPI MODAL & SIAP EKSEKUSI"}
      </button>
    </div>
  );
}

function SellingStep({ attempt, onUpdated }: { attempt: any; onUpdated: (partial: any) => void }) {
  const sellingChat = useSellingChat(attempt.id);
  const updateState = useUpdateAttemptState(attempt.id);

  const [notes, setNotes] = useState<any[]>((attempt.sellingNotes || []).filter((n: any) => n.sender !== "evaluation"));
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (notes.length === 0) {
      setIsSending(true);
      sellingChat.mutateAsync(undefined)
        .then((res) => setNotes(res.sellingNotes.filter((n: any) => n.sender !== "evaluation")))
        .finally(() => setIsSending(false));
    }
  }, []); // eslint-disable-line

  const handleSend = async () => {
    if (!message.trim()) return;
    const currentMsg = message.trim();
    setMessage("");
    setNotes((prev) => [...prev, { sender: "user", text: currentMsg, at: new Date().toISOString() }]);
    setIsSending(true);
    try {
      const res = await sellingChat.mutateAsync(currentMsg);
      setNotes(res.sellingNotes.filter((n: any) => n.sender !== "evaluation"));
    } catch (e: any) {} finally {
      setIsSending(false);
    }
  };

  const startOperationalPhase = async () => {
    await updateState.mutateAsync("TRACKING");
    onUpdated({ state: "TRACKING" });
  };

  return (
    <div className="pt-1 pb-24 flex flex-col" style={{ minHeight: "55vh" }}>
      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-0.5">Panduan Taktik Penjualan</h4>
      
      <div className="flex-1 space-y-4 mb-5">
        {notes.map((n, idx) => (
          <div key={idx} className={`flex flex-col ${n.sender === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] px-4 py-3.5 rounded-[18px] text-xs font-semibold leading-relaxed shadow-sm ${
              n.sender === "user" 
                ? "bg-slate-950 text-white rounded-tr-xs" 
                : "bg-white border-2 border-slate-100 text-slate-800 rounded-tl-xs"
            }`}>
              {n.text}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex items-start">
            <div className="bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-[18px] rounded-tl-xs">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sticky bottom-20 bg-transparent py-2">
        <input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Laporkan progres lapangan..." 
          className="flex-1 h-14 px-5 rounded-full border-2 border-slate-200 text-xs font-bold outline-none focus:border-slate-800 bg-white shadow-sm transition-all"
        />
        <button 
          onClick={handleSend}
          disabled={isSending || !message.trim()}
          className="w-14 h-14 bg-slate-950 disabled:bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-md active:scale-95 transition-all"
        >
          <Send className="w-4 h-4 text-white ml-0.5" />
        </button>
      </div>

      <button
        onClick={startOperationalPhase}
        className="w-full h-14 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-full shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all tracking-wide mt-4 flex-shrink-0"
      >
        <ShoppingCart className="w-5 h-5" /> BUKA DASBOR ARUS KAS USAHA
      </button>
    </div>
  );
}

function TrackingStep({ attempt, onStop }: { attempt: any; onStop: () => void }) {
  const { toast } = useToast();
  const addFinanceLog = useAddFinanceLog(attempt.id);
  const evaluateAttempt = useEvaluateAttempt(attempt.id);

  const [log, setLog] = useState<any[]>(attempt.revenueLog || []);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [isSaving, setIsSaving] = useState(false);
  const [auditText, setAuditText] = useState<string | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const totalOmset = log.filter(l => l.type === 'income').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalHPP = log.filter(l => l.type === 'expense').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const netProfit = totalOmset - totalHPP;

  const handleCommitLog = async () => {
    const parsedAmt = Math.round(Number(amount));
    if (!parsedAmt || parsedAmt <= 0) return;
    
    setIsSaving(true);
    try {
      const res = await addFinanceLog.mutateAsync({ amount: parsedAmt, note: note.trim() || undefined, type: activeTab });
      setLog(res.revenueLog);
      setAmount("");
      setNote("");
      toast({ title: "Buku Kas Diperbarui", description: `Transaksi ${activeTab === 'income' ? 'omset' : 'beban'} berhasil dicatat.` });
    } catch (e: any) {
      toast({ title: "Gagal menyimpan log", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const triggerAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await evaluateAttempt.mutateAsync();
      setAuditText(res.evaluation);
    } catch (e: any) {
      toast({ title: "Gagal memuat audit", description: e.message, variant: "destructive" });
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="pt-1 pb-24 space-y-6">
      <div className="bg-slate-900 rounded-[24px] p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 mb-1">Laba Bersih Operasional</p>
        <h2 className={`text-4xl font-black mb-5 tracking-tight transition-colors ${netProfit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
          {formatRp(netProfit)}
        </h2>
        <div className="flex justify-between border-t border-slate-800 pt-4">
          <div>
            <p className="text-[10px] text-slate-500 font-bold mb-0.5">Total Omset Masuk</p>
            <p className="text-sm font-black text-slate-200">{formatRp(totalOmset)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-bold mb-0.5">Total HPP & Beban</p>
            <p className="text-sm font-black text-rose-300">{formatRp(totalHPP)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-[24px] p-5 shadow-sm">
        <div className="flex bg-slate-50 border border-slate-200/60 rounded-xl p-1 mb-4">
          <button 
            onClick={() => { setActiveTab('income'); setAmount(""); }} 
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'income' ? 'bg-white shadow-sm text-emerald-600 border border-slate-100' : 'text-slate-400'}`}
          >
            Omset Masuk
          </button>
          <button 
            onClick={() => { setActiveTab('expense'); setAmount(""); }} 
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'expense' ? 'bg-white shadow-sm text-rose-600 border border-slate-100' : 'text-slate-400'}`}
          >
            HPP / Beban Harian
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-sm font-black text-slate-400">Rp</span>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            placeholder="0" 
            className="flex-1 text-2xl font-black outline-none text-slate-800 bg-transparent"
          />
        </div>
        <input 
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Keterangan transaksi operasional..." 
          className="w-full text-xs font-semibold outline-none border-t border-slate-100 pt-3 text-slate-600 bg-transparent"
        />

        <button
          onClick={handleCommitLog}
          disabled={isSaving || !amount}
          className={`w-full h-13 mt-4 disabled:opacity-30 text-white font-black rounded-full text-xs tracking-wider active:scale-[0.99] transition-all shadow-sm ${
            activeTab === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `KONFIRMASI ${activeTab === 'income' ? 'OMSET MASUK' : 'PENGELUARAN PABRIK'}`}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={triggerAudit}
          disabled={loadingAudit || log.length === 0}
          className="flex-1 h-13 bg-slate-50 border-2 border-slate-200 text-slate-700 font-extrabold rounded-full text-[11px] uppercase tracking-wider active:scale-95 transition-all disabled:opacity-40"
        >
          {loadingAudit ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "AUDIT MARGIN AI"}
        </button>
        <button
          onClick={onStop}
          className="flex-1 h-13 bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 font-extrabold rounded-full text-[11px] uppercase tracking-wider active:scale-95 transition-all"
        >
          TUTUP USAHA INI
        </button>
      </div>

      {auditText && (
        <div className="bg-slate-50 border-2 border-slate-100 rounded-[20px] p-5 space-y-2 animate-fade-in">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-indigo-600" /> Hasil Telaah Kelayakan Arus Kas
          </p>
          <p className="text-xs text-slate-700 leading-relaxed font-semibold">{auditText}</p>
        </div>
      )}

      {log.length > 0 && (
        <div>
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 pl-1">Jurnal Arus Kas Buku</h4>
          <div className="space-y-2">
            {[...log].reverse().map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white border-2 border-slate-100 rounded-[16px] px-4 py-3.5 shadow-xs">
                <div className="min-w-0 pr-2">
                  <p className={`text-sm font-black ${entry.type === 'expense' ? 'text-rose-600' : 'text-slate-800'}`}>
                    {entry.type === 'expense' ? '-' : '+'}{formatRp(entry.amount)}
                  </p>
                  {entry.note && <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{entry.note}</p>}
                </div>
                <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">
                  {new Date(entry.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExecuteView({ attempt, onBack, onUpdated, onStop }: { attempt: any; onBack: () => void; onUpdated: (partial: any) => void; onStop: () => void }) {
  return (
    <div className="pt-1 pb-4">
      {attempt.state !== "TRACKING" && (
        <button 
          onClick={onBack} 
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1 hover:text-slate-700 transition-colors"
        >
          ← Kembali ke Radar Pilihan
        </button>
      )}
      
      <div className="bg-slate-900 rounded-[24px] p-5.5 text-white mb-5 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-bl-full pointer-events-none" />
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${STATE_BADGE[attempt.state]?.className || "bg-slate-800 text-white"}`}>
            {STATE_BADGE[attempt.state]?.label || attempt.state}
          </span>
        </div>
        <h2 className="text-lg font-black leading-tight tracking-tight mt-1">{attempt.recommendation?.title}</h2>
      </div>

      {attempt.state === "MATERIALS" && <MaterialsStep attempt={attempt} onUpdated={onUpdated} />}
      {attempt.state === "CAPITAL" && <CapitalStep attempt={attempt} onUpdated={onUpdated} />}
      {attempt.state === "SELLING" && <SellingStep attempt={attempt} onUpdated={onUpdated} />}
      {attempt.state === "TRACKING" && <TrackingStep attempt={attempt} onStop={onStop} />}
    </div>
  );
}

// =========================================================================
// INTRO PUSAT OPERASIONAL
// =========================================================================
function IntroView({ onStart }: { onStart: () => void }) {
  return (
    <div className="pt-2 pb-24">
      <div className="bg-slate-900 text-white p-7 rounded-[32px] shadow-xl relative overflow-hidden mb-8">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-5">
            <Crown className="w-3 h-3" /> Modul Intelijen Bisnis
          </span>
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-[22px] flex items-center justify-center mb-5 shadow-inner">
            <Target className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black mb-3.5 tracking-tighter leading-none">
            Pembimbing <br/><span className="text-slate-400">Penghasilan.</span>
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed font-semibold max-w-sm">
            Bukan sekadar rekomendasi digital template klise. Sistem taktis ini meraba aset terpendam, alokasi waktu luang, serta sirkel modal sosial Anda untuk mengarsiteki peta cuan gerilya nyata.
          </p>
        </div>
      </div>
      <button 
        onClick={onStart} 
        className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all text-sm tracking-wide"
      >
        MULAI DIAGNOSIS RADAR <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// =========================================================================
// KOMPONEN UTAMA HALAMAN
// =========================================================================
export default function IncomeStrategy() {
  const { toast } = useToast();
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useIncomeProfile();
  const { data: attempts = [], isLoading: isAttemptsLoading, refetch: refetchAttempts } = useIncomeAttempts();
  
  const saveProfile = useSaveIncomeProfile();
  const generateRecs = useGenerateRecommendations();
  const createAttempt = useCreateAttempt();
  const stopAttemptAPI = useStopAttempt();

  const [view, setView] = useState<"intro" | "identify" | "recommend" | "execute" | "cooldown">("intro");
  const [activeAttempt, setActiveAttempt] = useState<any | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [localRecs, setLocalRecs] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const isPro = user?.isPro || (typeof window !== "undefined" && localStorage.getItem("bilano_pro") === "true");
  const startTime = new Date(user?.createdAt || Date.now()).getTime();
  const daysPassed = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
  const isTrialExpired = daysPassed >= 3;
  const locked = !isUserLoading && !isPro && isTrialExpired;

  // Persistence Engine (Menjaga halaman stay di progress berjalan)
  useEffect(() => {
    if (!isAttemptsLoading && !isProfileLoading) {
      if (profile?.cooldownUntil && new Date(profile.cooldownUntil) > new Date()) {
        setView("cooldown");
        return;
      }
      
      const active = (attempts || []).find((a: any) => a.status === 'ACTIVE');
      if (active) {
        setActiveAttempt(active);
        setView("execute");
      } else if (profile && profile.status && view === "intro") {
        setLocalRecs(profile.recommendations || []);
        setView("recommend");
      }
    }
  }, [isAttemptsLoading, isProfileLoading, profile, attempts]); // eslint-disable-line

  const handleIdentifyComplete = async (status: string, answers: any) => {
    try {
      await saveProfile.mutateAsync({ status, ...answers });
      await refetchProfile();
      setView("recommend");
      toast({ title: "Profil Disimpan", description: "Radar siap memproses database taktik lokal." });
    } catch (e: any) {
      toast({ title: "Gagal memproses", description: e.message, variant: "destructive" });
    }
  };

  const handleGenerateRecs = async () => {
    setIsGenerating(true);
    try {
      const result = await generateRecs.mutateAsync();
      setLocalRecs(result.recommendations || []);
      toast({ title: "Pemindaian Selesai", description: "Berhasil memetakan taktik gerilya hiper-lokal." });
    } catch (e: any) {
      toast({ title: "Gagal memindai", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectRecommendation = async (rec: any) => {
    setSelectingId(rec.id || rec.title);
    try {
      const attempt = await createAttempt.mutateAsync(rec);
      setActiveAttempt(attempt);
      setView("execute");
      trackEvent("income_recommendation_selected", { title: rec.title });
    } catch (e: any) {
      toast({ title: "Gagal memulai taktik", description: e.message, variant: "destructive" });
    } finally {
      setSelectingId(null);
    }
  };

  const handleStopBusiness = async () => {
    if (!confirm("Konfirmasi pembekuan operasional usaha ini? Peta taktik akan dikunci selama 1 bulan ke depan untuk melatih evaluasi objektif pasca-kegagalan.")) return;
    try {
      await stopAttemptAPI.mutateAsync(activeAttempt.id);
      toast({ title: "Operasional Dihentikan", description: "Masa jeda evaluasi 1 bulan aktif." });
      await refetchProfile();
      await refetchAttempts();
      setView("cooldown");
    } catch (e: any) {
      toast({ title: "Gagal memproses", description: e.message, variant: "destructive" });
    }
  };

  if (isUserLoading || isProfileLoading || isAttemptsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
      </div>
    );
  }

  if (locked) return <LockedScreen />;
  if (view === "cooldown") return <CooldownScreen dateStr={profile?.cooldownUntil} />;

  return (
    <MobileLayout title={view === "execute" ? "Pusat Operasional" : "Pembimbing Penghasilan"} showBack>
      <div className="px-1">
        {view === "intro" && <IntroView onStart={() => setView("identify")} />}
        {view === "identify" && <IdentifyFlow onComplete={handleIdentifyComplete} />}
        {view === "recommend" && (
          <RecommendView 
            profile={profile} 
            attempts={attempts} 
            onSelect={handleSelectRecommendation} 
            selectingId={selectingId} 
            localRecs={localRecs} 
            isGenerating={isGenerating} 
            handleGenerate={handleGenerateRecs} 
          />
        )}
        {view === "execute" && activeAttempt && (
          <ExecuteView 
            attempt={activeAttempt} 
            onBack={() => setView("recommend")} 
            onUpdated={(p) => setActiveAttempt((prev: any) => ({ ...prev, ...p }))} 
            onStop={handleStopBusiness} 
          />
        )}
      </div>
    </MobileLayout>
  );
}