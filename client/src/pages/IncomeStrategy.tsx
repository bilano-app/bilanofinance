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
  PiggyBank, ShoppingBag, Compass, Lightbulb, Clock, Layers, RefreshCcw, 
  ArrowRight, Bot, User as UserIcon, ShieldAlert, PieChart, Coins, TrendingUp, 
  History, Lock, Target, ShoppingCart, ArrowLeft, ChevronLeft,
  Banknote, Flame, AlertCircle
} from "lucide-react";
import {
  useIncomeProfile, useGenerateQuestions, useSaveIncomeProfile, useGenerateRecommendations,
  useIncomeAttempts, useCreateAttempt, useUpdateMaterials, useCheckFeasibility,
  useCapitalStrategy, useUpdateAttemptState, useSellingChat, useAddFinanceLog, useEvaluateAttempt, useStopAttempt
} from "@/hooks/use-income-strategy";

// =========================================================================
// KONSTAN & DATA STATUS
// =========================================================================
const STATUS_OPTIONS = [
  { value: "PELAJAR", label: "Pelajar", sub: "SMP / SMA / SMK", icon: GraduationCap, color: "from-sky-500 to-blue-600" },
  { value: "MAHASISWA", label: "Mahasiswa", sub: "Sedang kuliah", icon: BookOpen, color: "from-violet-500 to-indigo-600" },
  { value: "PEKERJA", label: "Pekerja", sub: "Karyawan / kontrak", icon: Briefcase, color: "from-emerald-500 to-teal-700" },
  { value: "BELUM_BEKERJA", label: "Belum Bekerja", sub: "Mencari peluang baru", icon: Search, color: "from-amber-500 to-orange-600" },
];

const formatRp = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return "Rp 0";
  return formatCurrency(val).split(",")[0];
};

const CAPITAL_BADGE: Record<string, string> = {
  TANPA_MODAL: "bg-emerald-50 text-emerald-800 border-emerald-200",
  MODAL_KECIL: "bg-amber-50 text-amber-800 border-amber-200",
  MODAL_SEDANG: "bg-rose-50 text-rose-800 border-rose-200",
};

const CAPITAL_LABEL: Record<string, string> = { 
  TANPA_MODAL: "Tanpa Modal", 
  MODAL_KECIL: "Modal Kecil", 
  MODAL_SEDANG: "Modal Sedang" 
};

const DIFFICULTY_BADGE: Record<string, string> = {
  MUDAH: "bg-emerald-50 text-emerald-800 border-emerald-200",
  SEDANG: "bg-amber-50 text-amber-800 border-amber-200",
  MENANTANG: "bg-rose-50 text-rose-800 border-rose-200",
};

const STATE_BADGE: Record<string, { label: string; className: string }> = {
  MATERIALS: { label: "1. Rencana Bahan", className: "bg-slate-100 text-slate-700 border-slate-200" },
  CAPITAL: { label: "2. Kumpul Modal", className: "bg-amber-50 text-amber-800 border-amber-200" },
  SELLING: { label: "3. Strategi Jual", className: "bg-blue-50 text-blue-800 border-blue-200" },
  TRACKING: { label: "4. Pantau Omset", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

// =========================================================================
// KOMPONEN UI PENDUKUNG
// =========================================================================
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.min(100, Math.round((step / total) * 100));
  return (
    <div className="mb-5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex justify-between text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">
        <span>Langkah {Math.min(step, total)} dari {total}</span>
        <span className="text-amber-600 font-extrabold">{pct}% Selesai</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <div 
          className="h-full bg-gradient-to-r from-brand-gold to-amber-500 rounded-full transition-all duration-500" 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  );
}

function OptionButton({ label, selected, onClick, checkbox }: { label: string; selected: boolean; onClick: () => void; checkbox?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 active:scale-[0.98] cursor-pointer ${
        selected 
          ? "border-brand-navy bg-amber-50/80 shadow-xs" 
          : "border-slate-200/80 bg-white hover:border-slate-300 shadow-xs"
      }`}
    >
      <span className={`text-xs sm:text-sm font-bold ${selected ? "text-brand-navy font-extrabold" : "text-slate-800"}`}>
        {label}
      </span>
      {checkbox ? (
        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
          selected ? "border-brand-navy bg-brand-gold text-brand-navy" : "border-slate-300 bg-slate-50"
        }`}>
          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      ) : (
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
          selected ? "border-brand-navy bg-brand-gold text-brand-navy" : "border-slate-300 bg-slate-50"
        }`}>
          {selected && <div className="w-2 h-2 bg-brand-navy rounded-full" />}
        </div>
      )}
    </button>
  );
}

function DisclaimerBanner() {
  return (
    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex gap-2.5 items-start mb-4 shadow-xs">
      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
      <p className="text-[11px] text-amber-950 font-medium leading-relaxed">
        Ini adalah simulasi strategi bisnis taktis. Pertimbangkan kesiapan waktu & risiko sebelum mengeluarkan modal riil.
      </p>
    </div>
  );
}

function LockedScreen() {
  return (
    <MobileLayout title="Ide & Pembimbing Penghasilan" showBack>
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center -mx-5 -mt-5 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] p-6">
        <div className="w-20 h-20 bg-brand-gold text-brand-navy rounded-3xl flex items-center justify-center mb-5 shadow-sm border border-brand-navy">
          <Crown className="w-10 h-10" />
        </div>
        <span className="bg-brand-navy text-brand-gold text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-xs">
          FITUR EKSKLUSIF BILANO PRO
        </span>
        <h2 className="text-2xl font-black text-brand-navy mb-2 tracking-tight">
          Buka Akses Peta Cuan AI
        </h2>
        <p className="text-xs text-amber-950 font-medium mb-6 max-w-xs leading-relaxed">
          Dapatkan bimbingan langkah demi langkah dari AI untuk membedah modal, keahlian, dan mengeksekusi bisnis nyata.
        </p>
        <Link href="/paywall">
          <button className="w-full max-w-xs h-14 bg-brand-navy hover:bg-[#152e55] text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer">
            UPGRADE KE BILANO PRO
          </button>
        </Link>
      </div>
    </MobileLayout>
  );
}

function CooldownScreen({ dateStr }: { dateStr: string }) {
  const formatted = new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <MobileLayout title="Masa Jeda Evaluasi" showBack>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 -mx-5 -mt-5 p-6">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-4 border border-amber-300 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Masa Jeda Evaluasi Berjalan</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed font-medium max-w-xs">
          Anda baru saja menghentikan operasional bisnis sebelumnya. Sistem menahan pembuatan ide baru agar Anda fokus mengevaluasi catatan keuangan. Fitur terbuka kembali pada <strong>{formatted}</strong>.
        </p>
        <Link href="/">
          <button className="w-full max-w-xs h-12 bg-brand-navy hover:bg-[#152e55] text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer">
            Kembali ke Beranda
          </button>
        </Link>
      </div>
    </MobileLayout>
  );
}

// =========================================================================
// FASE 1 — IDENTIFIKASI
// =========================================================================
function IdentifyFlow({ onComplete, onBackToIntro }: { onComplete: (status: string, answers: any) => Promise<void> | void; onBackToIntro: () => void }) {
  const { toast } = useToast();
  const generateQuestions = useGenerateQuestions();

  const [status, setStatus] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [stepIndex, setStepIndex] = useState(0); 
  const [answers, setAnswers] = useState<any>({});
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [textValue, setTextValue] = useState("");
  const [keahlianLainnya, setKeahlianLainnya] = useState("");
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [asetLainnya, setAsetLainnya] = useState("");

  const totalSteps = 8; 
  const currentQuestion = stepIndex >= 1 ? questions[stepIndex - 1] : null;

  const handlePickStatus = async (value: string) => {
    setStatus(value);
    setIsFetchingQuestions(true);
    trackEvent("income_strategy_status_selected", { status: value });
    try {
      const result = await generateQuestions.mutateAsync(value);
      setQuestions(result.questions || []);
      setStepIndex(1);
    } catch (e: any) {
      toast({ title: "Gagal memuat pertanyaan", description: e.message, variant: "destructive" });
    } finally {
      setIsFetchingQuestions(false);
    }
  };

  const advance = async (fieldKeyCamel: string, value: any) => {
    const nextAnswers = { ...answers, [fieldKeyCamel]: value };
    setAnswers(nextAnswers);
    
    if (stepIndex >= questions.length) {
      setIsSubmitting(true);
      try {
        await onComplete(status as string, nextAnswers);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setMultiSelected([]);
      setTextValue("");
      setStepIndex((s) => s + 1);
    }
  };

  const handleStepBack = () => {
    if (stepIndex > 1) {
      setStepIndex((s) => s - 1);
    } else if (stepIndex === 1) {
      setStepIndex(0);
      setStatus(null);
    } else {
      onBackToIntro();
    }
  };

  const fieldMap: Record<string, string> = {
    tujuan: "tujuan", 
    pola_kerja: "polaKerja", 
    jejaring_sosial: "jejaringSosial",
    preferensi_kerja: "preferensiKerja",
    latar_belakang: "latarBelakang",
    keahlian: "keahlian", 
    aset: "aset", 
    konstrain_waktu: "konstrainWaktu",
  };

  if (stepIndex === 0) {
    return (
      <div className="pt-2 pb-24 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <button 
            type="button"
            onClick={onBackToIntro}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-amber-600 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali
          </button>
        </div>

        <ProgressBar step={0} total={totalSteps} />

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">
            Status Aktivitas Utama Saat Ini?
          </h2>
          <p className="text-xs text-slate-500 font-medium mb-4">
            BILANO akan menyesuaikan seluruh rekomendasi dan pertanyaan taktis sesuai kapasitas harian Anda.
          </p>
          
          <div className="grid grid-cols-2 gap-2.5">
            {STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handlePickStatus(opt.value)}
                  disabled={isFetchingQuestions}
                  className="bg-white border border-slate-200/80 hover:border-amber-400 rounded-2xl p-4 shadow-xs hover:shadow-sm active:scale-[0.98] flex flex-col items-center text-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${opt.color} flex items-center justify-center shadow-xs text-white group-hover:scale-105 transition-transform`}>
                    {isFetchingQuestions && status === opt.value ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{opt.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{opt.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="pt-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-brand-gold" />
        <p className="text-xs font-bold text-brand-navy">Menyiapkan pertanyaan strategis...</p>
      </div>
    );
  }

  const camelKey = fieldMap[currentQuestion.field_key] || currentQuestion.field_key;

  return (
    <div className="pt-2 pb-24 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <button 
          type="button"
          onClick={handleStepBack}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-amber-600 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Langkah Sebelumnya
        </button>
      </div>

      <ProgressBar step={stepIndex} total={totalSteps} />

      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
          {currentQuestion.question_text}
        </h2>

        {currentQuestion.type === "single" && (
          <div className="space-y-2.5">
            {(currentQuestion.options || []).map((opt: any) => (
              <OptionButton 
                key={opt.value} 
                label={opt.label} 
                selected={false} 
                onClick={() => advance(camelKey, opt.value)} 
              />
            ))}
          </div>
        )}

        {currentQuestion.type === "multi" && (
          <div className="space-y-2.5">
            {(currentQuestion.options || []).map((opt: any) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                checkbox
                selected={multiSelected.includes(opt.value)}
                onClick={() => setMultiSelected((prev) => (prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]))}
              />
            ))}
            {currentQuestion.field_key === "keahlian" && (
              <input
                value={keahlianLainnya}
                onChange={(e) => setKeahlianLainnya(e.target.value)}
                placeholder="Tulis keahlian lain (opsional)..."
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium focus:border-amber-500 outline-none"
              />
            )}
            {currentQuestion.field_key === "aset" && (
              <input
                value={asetLainnya}
                onChange={(e) => setAsetLainnya(e.target.value)}
                placeholder="Tulis alat/aset pendukung lain (opsional)..."
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium focus:border-amber-500 outline-none"
              />
            )}
            <button
              type="button"
              onClick={async () => {
                const next = { 
                  ...answers, 
                  [camelKey]: multiSelected, 
                  keahlianLainnya: currentQuestion.field_key === "keahlian" ? keahlianLainnya || null : answers.keahlianLainnya,
                  asetLainnya: currentQuestion.field_key === "aset" ? asetLainnya || null : answers.asetLainnya 
                };
                setAnswers(next);
                
                if (stepIndex >= questions.length) {
                  setIsSubmitting(true);
                  try {
                    await onComplete(status as string, next);
                  } finally {
                    setIsSubmitting(false);
                  }
                } else {
                  setMultiSelected([]);
                  setTextValue("");
                  setStepIndex((s) => s + 1);
                }
              }}
              disabled={multiSelected.length === 0 || isSubmitting}
              className="w-full h-13 bg-brand-navy hover:bg-[#152e55] disabled:bg-slate-200 disabled:text-slate-400 text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "LANJUTKAN PERTANYAAN"}
            </button>
          </div>
        )}

        {currentQuestion.type === "text" && (
          <div className="space-y-3">
            <textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={currentQuestion.placeholder || "Tuliskan jawaban Anda secara singkat..."}
              rows={3}
              disabled={isSubmitting}
              className="w-full p-4 rounded-xl border border-slate-200 text-xs font-medium focus:border-amber-500 outline-none resize-none"
            />
            <button
              type="button"
              onClick={() => advance(camelKey, textValue.trim())}
              disabled={!textValue.trim() || isSubmitting}
              className="w-full h-13 bg-brand-navy hover:bg-[#152e55] disabled:bg-slate-200 disabled:text-slate-400 text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "LANJUTKAN PERTANYAAN"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// FASE 2 — REKOMENDASI
// =========================================================================
function RecommendationCard({ rec, onSelect, isSelecting }: { rec: any; onSelect: () => void; isSelecting: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-brand-navy flex items-center justify-center shrink-0 shadow-xs">
          <Lightbulb className="w-5 h-5 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-slate-900 text-base leading-snug">{rec.title}</h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">{rec.pitch}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {rec.capital_level && (
          <span className={`text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border ${CAPITAL_BADGE[rec.capital_level] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
            {CAPITAL_LABEL[rec.capital_level] || rec.capital_level}
          </span>
        )}
        {rec.difficulty && (
          <span className={`text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border ${DIFFICULTY_BADGE[rec.difficulty] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
            {rec.difficulty}
          </span>
        )}
        {rec.estimated_time_to_first_income && (
          <span className="text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {rec.estimated_time_to_first_income}
          </span>
        )}
      </div>

      <button 
        type="button"
        onClick={() => setExpanded((v) => !v)} 
        className="text-xs font-bold text-slate-700 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
      >
        {expanded ? "▲ Sembunyikan analisis lapangan" : "▼ Lihat Analisis Kelayakan & Taktik"}
      </button>

      {expanded && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2 animate-in fade-in">
          <p className="text-xs text-slate-800 leading-relaxed font-medium">
            <strong className="text-slate-900">Kesesuaian Profil:</strong> {rec.why_it_fits}
          </p>
          {rec.needs_upskilling && rec.upskilling_note && (
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              <strong className="text-amber-800">Langkah Belajar Cepat:</strong> {rec.upskilling_note}
            </p>
          )}
          {rec.risk_note && (
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              <strong className="text-rose-700">Risiko Utama Pasar:</strong> {rec.risk_note}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onSelect}
        disabled={isSelecting}
        className="w-full h-13 bg-brand-navy hover:bg-[#152e55] disabled:opacity-60 text-brand-gold font-bold rounded-2xl text-xs uppercase tracking-wider shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isSelecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Eksekusi Taktik Ini <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

function RecommendView({ profile, attempts, onResume, onSelect, selectingId, localRecs, isGenerating, handleGenerate, onReIdentify }: any) {
  const activeAttempts = (attempts || []).filter((a: any) => a.status === 'ACTIVE');
  const stoppedAttempts = (attempts || []).filter((a: any) => a.status === 'STOPPED');

  return (
    <div className="pt-2 pb-24 space-y-5">
      
      {/* OPERASIONAL AKTIF JIKA ADA */}
      {activeAttempts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-600" /> Operasional Sedang Berjalan
          </h3>
          <div className="space-y-2.5">
            {activeAttempts.map((att: any) => {
              const badge = STATE_BADGE[att.state] || STATE_BADGE.MATERIALS;
              return (
                <button 
                  key={att.id} 
                  type="button"
                  onClick={() => onResume(att)} 
                  className="w-full bg-brand-navy text-white rounded-3xl p-4.5 border-l-[6px] border-l-brand-gold shadow-sm flex items-center justify-between gap-3 active:scale-[0.98] transition-transform text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-white text-sm truncate">{att.recommendation?.title || "Percobaan Usaha"}</p>
                    <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-brand-gold shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ARSIP RIWAYAT USAHA */}
      {stoppedAttempts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Arsip Riwayat Bisnis
          </h3>
          <div className="space-y-2 opacity-75">
            {stoppedAttempts.map((att: any) => (
              <div key={att.id} className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between text-left shadow-xs">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-xs truncate">{att.recommendation?.title}</p>
                  <span className="inline-block mt-0.5 text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">Dihentikan</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DAFTAR REKOMENDASI TAKTIK */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-600" />
            Peta Rekomendasi Taktis
          </h3>
          <button 
            type="button"
            onClick={onReIdentify}
            className="text-[10px] font-bold text-slate-600 hover:text-amber-600 transition-colors cursor-pointer"
          >
            Audit Ulang Profil
          </button>
        </div>

        {localRecs.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 text-center shadow-xs space-y-3">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-brand-navy shadow-xs">
              <RefreshCcw className="w-7 h-7 text-amber-700" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Pindai Radar Ide Baru</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Sistem BILANO siap memindai dan merumuskan taktik penghasilan baru untuk Anda.
            </p>
            <button 
              type="button"
              onClick={handleGenerate} 
              disabled={isGenerating} 
              className="w-full h-13 bg-brand-navy hover:bg-[#152e55] disabled:opacity-70 text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyusun Peta...</> : <><RefreshCcw className="w-4 h-4" /> Jalankan Pemindaian Radar</>}
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
              type="button"
              onClick={handleGenerate} 
              disabled={isGenerating} 
              className="w-full h-12 bg-white border border-amber-300 hover:bg-amber-50 text-brand-navy font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />} Pindai Alternatif Lain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// FASE 3 — EKSEKUSI (STEP 1 SAMPAI 4)
// =========================================================================
function MaterialsStep({ attempt, onUpdated }: { attempt: any; onUpdated: (partial: any) => void }) {
  const { toast } = useToast();
  const updateMaterials = useUpdateMaterials(attempt.id);
  const checkFeasibility = useCheckFeasibility(attempt.id);
  const [materials, setMaterials] = useState<any[]>(attempt.materials || []);
  const [isChecking, setIsChecking] = useState(false);
  const [clarification, setClarification] = useState<any[] | null>(null);
  const [manualExpense, setManualExpense] = useState("");
  const [dependents, setDependents] = useState("");
  const [verdictResult, setVerdictResult] = useState<any>(null);

  const total = materials.reduce((a, m) => a + (Number(m.price) || 0), 0);

  const updateRow = (idx: number, field: string, value: any) => {
    setMaterials((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };
  const addRow = () => setMaterials((prev) => [...prev, { id: String(prev.length + 1).padStart(4, "0"), name: "", price: 0, note: null }]);
  const removeRow = (idx: number) => setMaterials((prev) => prev.filter((_, i) => i !== idx));

  const runFeasibility = async (extra?: any) => {
    setIsChecking(true);
    try {
      await updateMaterials.mutateAsync(materials);
      const result = await checkFeasibility.mutateAsync(extra);
      if (result.needs_clarification) {
        setClarification(result.clarification_questions);
      } else {
        setClarification(null);
        setVerdictResult(result);
        onUpdated({ state: result.state, feasibilityVerdict: result.verdict, totalCost: result.total_cost });
      }
    } catch (e: any) {
      toast({ title: "Gagal cek kelayakan", description: e.message, variant: "destructive" });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="pt-2 pb-24 space-y-4">
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-amber-600" />
          Rencana Anggaran Biaya Awal (RAB)
        </h3>
        
        <div className="space-y-2">
          {materials.map((m, idx) => (
            <div key={m.id || idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-2">
              <input 
                value={m.name} 
                onChange={(e) => updateRow(idx, "name", e.target.value)} 
                placeholder="Nama bahan / kebutuhan..." 
                className="flex-1 min-w-0 text-xs font-medium bg-transparent outline-none text-slate-800" 
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-slate-400 font-medium">Rp</span>
                <input 
                  type="number" 
                  value={m.price || ""} 
                  onChange={(e) => updateRow(idx, "price", Number(e.target.value))} 
                  placeholder="0" 
                  className="w-24 text-xs font-bold text-right bg-transparent outline-none text-slate-900" 
                />
              </div>
              <button 
                type="button"
                onClick={() => removeRow(idx)} 
                className="p-1 text-slate-300 hover:text-rose-500 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <button 
            type="button"
            onClick={addRow} 
            className="w-full h-12 border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 rounded-2xl text-brand-navy font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-700" /> Tambah Kebutuhan Bahan
          </button>
        </div>

        <div className="bg-brand-navy rounded-2xl p-3.5 flex items-center justify-between border border-brand-gold/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Total Proyeksi Anggaran</span>
          <span className="text-base font-black text-brand-gold tabular-nums">{formatRp(total)}</span>
        </div>

        {clarification && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3 animate-in fade-in">
            <p className="text-xs font-bold text-amber-900">Audit Batas Aman Finansial:</p>
            {clarification.map((q: any) =>
              q.type === "text" ? (
                <input 
                  key={q.field_key} 
                  value={manualExpense} 
                  onChange={(e) => setManualExpense(e.target.value)} 
                  placeholder={q.placeholder} 
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 text-xs font-medium outline-none focus:border-amber-500 bg-white" 
                />
              ) : (
                <div key={q.field_key} className="space-y-2">
                  <p className="text-xs text-slate-700 font-medium">{q.question_text}</p>
                  {q.options.map((opt: any) => (
                    <OptionButton key={opt.value} label={opt.label} selected={dependents === opt.value} onClick={() => setDependents(opt.value)} />
                  ))}
                </div>
              )
            )}
            <button
              type="button"
              onClick={() => runFeasibility({ manualMonthlyExpense: manualExpense, hasDependents: dependents })}
              disabled={!manualExpense || !dependents || isChecking}
              className="w-full h-12 bg-brand-navy text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              {isChecking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "KONFIRMASI INTEGRASI KAS"}
            </button>
          </div>
        )}

        {verdictResult && !clarification && (
          <div className={`rounded-2xl p-4 border ${verdictResult.verdict === "CUKUP_AMAN" ? "bg-emerald-50 border-emerald-300" : verdictResult.verdict === "CUKUP_TAPI_RISIKO" ? "bg-amber-50 border-amber-300" : "bg-rose-50 border-rose-300"}`}>
            <div className="flex items-center gap-2 mb-1">
              {verdictResult.verdict === "CUKUP_AMAN" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className={`w-5 h-5 ${verdictResult.verdict === "KURANG" ? "text-rose-600" : "text-amber-600"}`} />}
              <h4 className={`font-bold text-xs uppercase tracking-wider ${verdictResult.verdict === "CUKUP_AMAN" ? "text-emerald-800" : verdictResult.verdict === "CUKUP_TAPI_RISIKO" ? "text-amber-800" : "text-rose-800"}`}>
                {verdictResult.verdict === "CUKUP_AMAN" ? "Skala Anggaran Aman" : verdictResult.verdict === "CUKUP_TAPI_RISIKO" ? "Beresiko Mengganggu Dana Cadangan" : "Defisit Sisa Saldo"}
              </h4>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Saldo kas aktif: {formatRp(verdictResult.saldo_saat_ini)} · Batas proteksi: {formatRp(verdictResult.sisa_dana_aman)}
              {verdictResult.verdict === "KURANG" && <> · Selisih kurang: {formatRp(verdictResult.selisih)}</>}
            </p>
          </div>
        )}

        {!clarification && !verdictResult && (
          <button 
            type="button"
            onClick={() => runFeasibility()} 
            disabled={isChecking}
            className="w-full h-13 bg-brand-navy hover:bg-[#152e55] disabled:bg-slate-200 disabled:text-slate-400 text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Wallet className="w-4 h-4" /> KALIBRASI STRATEGI MODAL</>}
          </button>
        )}
      </div>
    </div>
  );
}

function CapitalStep({ attempt, onUpdated }: { attempt: any; onUpdated: (partial: any) => void }) {
  const { toast } = useToast();
  const capitalStrategy = useCapitalStrategy(attempt.id);
  const checkFeasibility = useCheckFeasibility(attempt.id);
  const [plan, setPlan] = useState<any>(attempt.capitalPlan || null);
  const [context, setContext] = useState("");
  const [isLoadingPlan, setIsLoadingPlan] = useState(!attempt.capitalPlan);
  const [isRechecking, setIsRechecking] = useState(false);

  useEffect(() => {
    if (!attempt.capitalPlan) {
      capitalStrategy.mutateAsync(undefined).then((res) => { setPlan(res); onUpdated({ capitalPlan: res }); }).catch((e) => toast({ title: "Gagal memuat strategi modal", description: e.message, variant: "destructive" })).finally(() => setIsLoadingPlan(false));
    }
  }, []); 

  const handleRegenerate = async () => {
    setIsLoadingPlan(true);
    try {
      const res = await capitalStrategy.mutateAsync(context);
      setPlan(res);
      onUpdated({ capitalPlan: res });
    } catch (e: any) { toast({ title: "Gagal memuat strategi modal", description: e.message, variant: "destructive" }); }
    finally { setIsLoadingPlan(false); }
  };

  const handleReady = async () => {
    setIsRechecking(true);
    try {
      const result = await checkFeasibility.mutateAsync({ manualMonthlyExpense: 0 });
      onUpdated({ state: result.state, feasibilityVerdict: result.verdict, totalCost: result.total_cost });
    } catch (e: any) { toast({ title: "Gagal memproses permodalan", description: e.message, variant: "destructive" }); }
    finally { setIsRechecking(false); }
  };

  return (
    <div className="pt-2 pb-24 space-y-4">
      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Solusi Pendanaan & Modal Awal</h3>
      <DisclaimerBanner />

      {isLoadingPlan ? (
        <div className="flex flex-col items-center py-10 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin mb-2 text-brand-gold" />
          <p className="text-xs font-bold text-brand-navy">Merakit alternatif bootstrapping...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(plan?.options || []).map((opt: any, idx: number) => (
            <div key={idx} className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <PiggyBank className="w-4 h-4 text-amber-600" />
                <h4 className="font-extrabold text-slate-900 text-sm">{opt.title}</h4>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mb-1">{opt.description}</p>
              {opt.estimated_time_or_effort && <p className="text-[10px] text-amber-700 font-bold">Kapasitas: {opt.estimated_time_or_effort}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
        <input 
          value={context} 
          onChange={(e) => setContext(e.target.value)} 
          placeholder="Ajukan alternatif aset pendukung lain..." 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-amber-500" 
        />
        <button 
          type="button"
          onClick={handleRegenerate} 
          disabled={isLoadingPlan} 
          className="w-full h-11 bg-white border border-amber-300 text-brand-navy font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCcw className="w-3.5 h-3.5 text-amber-600" /> Kalkulasi Ulang Bootstrapping
        </button>
      </div>

      <button 
        type="button"
        onClick={handleReady} 
        disabled={isRechecking} 
        className="w-full h-14 bg-brand-navy hover:bg-[#152e55] disabled:opacity-70 text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
      >
        {isRechecking ? <Loader2 className="w-5 h-5 animate-spin" /> : "SAYA SIAP EKSEKUSI OPERASIONAL"}
      </button>
    </div>
  );
}

function SellingStep({ attempt, onUpdated }: { attempt: any; onUpdated: (partial: any) => void }) {
  const { toast } = useToast();
  const sellingChat = useSellingChat(attempt.id);
  const updateState = useUpdateAttemptState(attempt.id);
  
  const [notes, setNotes] = useState<any[]>((attempt.sellingNotes || []).filter((n: any) => n.sender !== "evaluation"));
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [missionDone, setMissionDone] = useState(false);

  useEffect(() => {
    if (notes.length > 0 && notes[notes.length - 1].sender === "ai") {
      setMissionDone(false);
    }
  }, [notes]);

  useEffect(() => {
    if (notes.length === 0) {
      setIsSending(true);
      sellingChat.mutateAsync(undefined).then((res) => {
        setNotes(res.sellingNotes.filter((n: any) => n.sender !== "evaluation"));
      }).finally(() => setIsSending(false));
    }
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    const text = message.trim();
    setMessage("");
    setNotes((prev) => [...prev, { sender: "user", text, at: new Date().toISOString() }]);
    setIsSending(true);
    try {
      const res = await sellingChat.mutateAsync(text);
      setNotes(res.sellingNotes.filter((n: any) => n.sender !== "evaluation"));
    } catch (e: any) { 
      toast({ title: "Gagal mengirim laporan", description: e.message, variant: "destructive" }); 
    } finally { 
      setIsSending(false); 
    }
  };

  const handleAdvance = async () => {
    setIsAdvancing(true);
    try {
      await updateState.mutateAsync("TRACKING");
      onUpdated({ state: "TRACKING" });
    } catch (e: any) { 
      toast({ title: "Gagal membuka dasbor", description: e.message, variant: "destructive" }); 
    } finally { 
      setIsAdvancing(false); 
    }
  };

  const toggleMission = () => {
    setMissionDone(!missionDone);
    if (!missionDone) {
      setMessage("Misi eksekusi selesai. Laporannya: ");
    } else {
      setMessage("");
    }
  };

  let lastAiIndex = -1;
  for (let i = notes.length - 1; i >= 0; i--) {
    if (notes[i].sender === "ai") {
      lastAiIndex = i;
      break;
    }
  }

  return (
    <div className="pt-2 pb-24 flex flex-col space-y-4" style={{ minHeight: "65vh" }}>
      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Taktik Pemasaran Lapangan</h3>
      
      <div className="flex-1 space-y-4 mb-2">
        {notes.map((n, idx) => {
          const isLastAi = idx === lastAiIndex;

          if (isLastAi && !isSending) {
            return (
              <div key={idx} className="bg-amber-50/70 border border-amber-300 rounded-3xl p-5 shadow-xs relative mt-4 transition-all">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-navy text-brand-gold text-[9px] font-bold uppercase tracking-widest px-3.5 py-0.5 rounded-full shadow-sm flex items-center gap-1.5 whitespace-nowrap border border-brand-gold/30">
                  <Target className="w-3.5 h-3.5" /> MISI HARI INI
                </div>
                
                <div className="flex items-start gap-3 mt-2 mb-4">
                  <div className="w-9 h-9 rounded-2xl bg-brand-navy text-brand-gold flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {n.text}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleMission}
                  className={`w-full py-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer ${
                    missionDone 
                      ? "bg-emerald-100 border-emerald-400 text-emerald-800" 
                      : "bg-white border-amber-300 text-brand-navy hover:bg-amber-50 shadow-xs"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    missionDone ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-slate-50"
                  }`}>
                    {missionDone && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                  {missionDone ? "MISI SELESAI! TULIS LAPORAN DI BAWAH." : "TANDAI SELESAI & LAPOR HASIL"}
                </button>
              </div>
            );
          }

          return (
            <div key={idx} className={`flex gap-2.5 ${n.sender === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${n.sender === "user" ? "bg-brand-gold text-brand-navy font-bold text-xs" : "bg-brand-navy text-brand-gold"}`}>
                {n.sender === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed shadow-xs ${
                n.sender === "user" 
                  ? "bg-brand-navy text-white rounded-tr-none border border-brand-gold/30" 
                  : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
              }`}>
                {n.text}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex gap-2 mt-2 animate-in fade-in">
            <div className="w-8 h-8 rounded-2xl bg-brand-navy flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4 text-brand-gold" />
            </div>
            <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span className="text-xs font-medium text-slate-400">Merumuskan evaluasi lapangan...</span>
            </div>
          </div>
        )}
      </div>

      {/* INPUT CHAT MISI */}
      <div className="flex items-center gap-2 sticky bottom-20 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200/80 shadow-sm z-10">
        <input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && handleSend()} 
          placeholder={missionDone ? "Ketikkan hasil lapanganmu di sini..." : "Tuntaskan misi di atas sebelum melapor..."} 
          className="flex-1 px-3 py-2 text-xs font-medium outline-none bg-transparent text-slate-800 placeholder:text-slate-400" 
        />
        <button 
          type="button"
          onClick={handleSend} 
          disabled={isSending || !message.trim()} 
          className="w-10 h-10 rounded-xl bg-brand-navy text-brand-gold flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      <button 
        type="button"
        onClick={handleAdvance} 
        disabled={isAdvancing} 
        className="w-full h-14 bg-brand-navy hover:bg-[#152e55] text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
      >
        {isAdvancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShoppingCart className="w-4 h-4" /> BUKA DASBOR ARUS KAS</>}
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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);

  const totalOmset = log.filter(l => l.type === 'income' || !l.type).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const totalHPP = log.filter(l => l.type === 'expense').reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const netProfit = totalOmset - totalHPP;

  const handleAdd = async () => {
    const amt = Math.round(Number(amount));
    if (!amt || amt <= 0) return;
    setIsSaving(true);
    try {
      const res = await addFinanceLog.mutateAsync({ amount: amt, note: note.trim() || undefined, type: activeTab });
      setLog(res.revenueLog);
      setAmount("");
      setNote("");
      toast({ title: "Kas Tercatat! 💵", description: `Arus kas operasional ${activeTab === 'income' ? 'pemasukan' : 'beban usaha'} tersimpan.` });
    } catch (e: any) { toast({ title: "Gagal mencatat kas", description: e.message, variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      const res = await evaluateAttempt.mutateAsync();
      setEvaluation(res.evaluation);
    } catch (e: any) { toast({ title: "Gagal memicu audit", description: e.message, variant: "destructive" }); }
    finally { setIsEvaluating(false); }
  };

  return (
    <div className="pt-2 pb-24 space-y-4">
      {/* HERO CARD LABA BERSIH (SATU-SATUNYA SOLID SHADOW) */}
      <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] rounded-3xl p-5 text-white shadow-[6px_6px_0px_0px] shadow-slate-900 border-l-[6px] border-l-brand-gold relative overflow-hidden">
        <Coins className="absolute -right-4 -bottom-4 w-32 h-32 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
        <p className="text-[10px] uppercase tracking-widest font-bold text-amber-200 mb-1">
          Laba Bersih Operasional
        </p>
        <p className={`text-3xl font-black tabular-nums ${netProfit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
          {formatRp(netProfit)}
        </p>
        <div className="flex justify-between border-t border-white/15 pt-3 mt-4 text-xs font-bold">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-300">Total Omset</p>
            <p className="font-black text-white tabular-nums">{formatRp(totalOmset)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-slate-300">Beban / HPP</p>
            <p className="font-black text-rose-300 tabular-nums">{formatRp(totalHPP)}</p>
          </div>
        </div>
      </div>

      {/* FORM PENCATATAN OPERASIONAL */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex bg-slate-100 rounded-2xl p-1 text-xs font-bold">
          <button 
            type="button"
            onClick={() => setActiveTab('income')} 
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${activeTab === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'}`}
          >
            + Omset Masuk
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('expense')} 
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${activeTab === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500'}`}
          >
            - HPP / Pengeluaran
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="0" 
              className="w-full pl-12 pr-4 h-12 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-slate-800" 
            />
          </div>
          <input 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            placeholder="Catatan transaksi (cth: jual 2 porsi, beli packaging)..." 
            className="w-full px-4 h-11 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-500 outline-none text-slate-800" 
          />
        </div>

        <button 
          type="button"
          onClick={handleAdd} 
          disabled={isSaving || !amount} 
          className={`w-full h-12 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xs active:scale-[0.98] transition-all cursor-pointer ${
            activeTab === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : activeTab === 'income' ? 'JURNAL OMSET MASUK' : 'JURNAL BEBAN USAHA'}
        </button>
      </div>

      {evaluation && (
        <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 flex gap-3 shadow-xs">
          <PieChart className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-800 leading-relaxed font-medium">{evaluation}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button 
          type="button"
          onClick={handleEvaluate} 
          disabled={isEvaluating || log.length === 0} 
          className="flex-1 h-12 bg-brand-navy hover:bg-[#152e55] disabled:opacity-50 text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
        >
          {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PieChart className="w-4 h-4" />} Audit Finansial AI
        </button>
        <button 
          type="button"
          onClick={onStop} 
          className="flex-1 h-12 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          Tutup Usaha Ini
        </button>
      </div>

      {log.length > 0 && (
        <div className="pt-2 space-y-2">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
            <History className="w-3.5 h-3.5 text-amber-600"/> Buku Jurnal Kas Operasional
          </h4>
          <div className="space-y-2">
            {[...log].reverse().map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-xs">
                <div className="min-w-0">
                  <p className={`text-xs sm:text-sm font-bold tabular-nums ${entry.type === 'expense' ? 'text-rose-600' : 'text-slate-900'}`}>
                    {entry.type === 'expense' ? '-' : '+'}{formatRp(entry.amount)}
                  </p>
                  {entry.note && <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{entry.note}</p>}
                </div>
                <p className="text-[10px] text-slate-400 font-medium shrink-0">{new Date(entry.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</p>
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
    <div className="pt-2 pb-4 space-y-3">
      {attempt.state !== "TRACKING" && (
        <button 
          type="button"
          onClick={onBack} 
          className="text-xs font-bold text-slate-600 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali ke Radar Pilihan
        </button>
      )}

      {/* HEADER CARD OPERASIONAL AKTIF (SATU-SATUNYA SOLID SHADOW KHAS BILANO) */}
      <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] rounded-3xl p-5 text-white shadow-[6px_6px_0px_0px] shadow-slate-900 border-l-[6px] border-l-brand-gold relative overflow-hidden">
        <Coins className="absolute -right-4 -bottom-4 w-32 h-32 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
        <div className="relative z-10 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
              <Coins className="w-3 h-3 fill-current" /> OPERASIONAL AKTIF
            </span>
            <span className="text-[9px] font-bold text-amber-200 uppercase bg-black/40 px-2 py-0.5 rounded-md border border-white/20">
              {STATE_BADGE[attempt.state]?.label || "Eksekusi"}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black leading-snug tracking-tight text-white">
            {attempt.recommendation?.title}
          </h2>
        </div>
      </div>

      {attempt.state === "MATERIALS" && <MaterialsStep attempt={attempt} onUpdated={onUpdated} />}
      {attempt.state === "CAPITAL" && <CapitalStep attempt={attempt} onUpdated={onUpdated} />}
      {attempt.state === "SELLING" && <SellingStep attempt={attempt} onUpdated={onUpdated} />}
      {attempt.state === "TRACKING" && <TrackingStep attempt={attempt} onStop={onStop} />}
    </div>
  );
}

// =========================================================================
// INTRO VIEW (DENGAN IKON /IDEA.PNG YANG RAPI & SESUAI HOME)
// =========================================================================
function IntroView({ onStart }: { onStart: () => void }) {
  return (
    <div className="pt-2 pb-24 space-y-4">
      {/* FLAGSHIP HERO CARD NAVY & GOLD (SATU-SATUNYA SOLID SHADOW KHAS BILANO) */}
      <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden">
        <Banknote className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
        <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
              <Crown className="w-3 h-3 fill-current" /> MODUL VIP
            </span>
            <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
              AI Powered
            </span>
          </div>

          {/* ICON CONTAINER /IDEA.PNG RAPI & TIDAK OFFSIDE */}
          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-gold flex items-center justify-center shrink-0 overflow-hidden shadow-md border border-black/10 p-1">
              <img 
                src="/IDEA.png" 
                alt="Ide & Pembimbing Penghasilan" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white leading-tight">
                Ide & Pembimbing Penghasilan
              </h1>
              <p className="text-xs text-blue-200/80 font-bold mt-0.5">
                Strategi & Peta Jalur Cuan Terarah
              </p>
            </div>
          </div>

          <p className="text-xs text-blue-100 font-medium leading-relaxed pt-2 border-t border-white/15">
            Dibimbing langkah demi langkah oleh <strong>BILANO Intelligence</strong> untuk membedah modal, keahlian terpendam, serta melacak laba operasional riil.
          </p>
        </div>
      </div>

      {/* TIGA FITUR UNGGULAN */}
      <div className="space-y-2.5">
        {[
          { icon: Compass, title: "Audit Kapasitas & Modal Sosial", desc: "Diagnosis mendalam profil psikologis & jejaring modal sosial Anda." },
          { icon: RefreshCcw, title: "Peta Taktik Hiper-Lokal", desc: "Rekomendasi taktis berbasis ekosistem pasar terdekat di Indonesia." },
          { icon: Layers, title: "Dasbor Laba Bersih Absolut", desc: "Hitung HPP berjalan secara transparan agar tidak terjebak ilusi omset." },
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
            <div className="w-11 h-11 bg-amber-50 text-brand-navy rounded-2xl flex items-center justify-center shrink-0 border border-amber-200">
              <item.icon className="w-5 h-5 text-amber-800" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{item.title}</p>
              <p className="text-[11px] text-slate-500 font-medium leading-snug">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button 
        type="button"
        onClick={onStart} 
        className="w-full h-14 bg-brand-navy hover:bg-[#152e55] text-brand-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        MULAI AUDIT STRATEGI PENGHASILAN <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// =========================================================================
// MAIN COMPONENT ENGINE
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
  const [profileOverride, setProfileOverride] = useState<any | null>(null);
  const [localRecs, setLocalRecs] = useState<any[]>(profile?.recommendations || []);
  const [isGenerating, setIsGenerating] = useState(false);

  const isPro = user?.isPro || (typeof window !== "undefined" && localStorage.getItem("bilano_pro") === "true");
  const startTime = new Date(user?.createdAt || Date.now()).getTime();
  const daysPassed = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
  const isTrialExpired = daysPassed >= 3;
  const locked = !isUserLoading && !isPro && isTrialExpired;

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
  }, [isAttemptsLoading, isProfileLoading, profile, attempts]);

  if (isUserLoading || isProfileLoading || isAttemptsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
        <img src="/BILANO-ICON-NEW.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
        <div className="flex items-center gap-2 text-brand-navy font-bold text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
          <Loader2 className="w-4 h-4 animate-spin text-brand-gold" />
          <span>Sinkronisasi Pembimbing...</span>
        </div>
      </div>
    );
  }

  if (locked) return <LockedScreen />;

  const handleIdentifyComplete = async (status: string, answers: any) => {
    const payload = {
      status,
      tujuan: answers.tujuan,
      polaKerja: answers.polaKerja, 
      jejaringSosial: answers.jejaringSosial,
      preferensiKerja: answers.preferensiKerja,
      latarBelakang: answers.latarBelakang,
      keahlian: answers.keahlian || [],
      keahlianLainnya: answers.keahlianLainnya || null,
      aset: answers.aset || [],
      asetLainnya: answers.asetLainnya || null,
      konstrainWaktu: { text: answers.konstrainWaktu },
    };
    try {
      toast({ 
        title: "Sedang Merumuskan Taktik...", 
        description: "BILANO Intelligence sedang memetakan strategi terbaik..." 
      });
      
      await saveProfile.mutateAsync(payload);
      setProfileOverride(payload);
      
      const resRecs = await generateRecs.mutateAsync();
      setLocalRecs(resRecs.recommendations || []);
      
      setView("recommend");
      await refetchProfile();
    } catch (e: any) {
      toast({ title: "Gagal menyimpan identifikasi", description: e.message, variant: "destructive" });
    }
  };

  const handleGenerateRecs = async () => {
    setIsGenerating(true);
    try {
      const result = await generateRecs.mutateAsync();
      setLocalRecs(result.recommendations || []);
    } catch (e: any) {
      toast({ title: "Gagal memindai alternatif", description: e.message, variant: "destructive" });
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
    } catch (e: any) {
      toast({ title: "Gagal memproses pilihan", description: e.message, variant: "destructive" });
    } finally {
      setSelectingId(null);
    }
  };

  const handleStopBusiness = async () => {
    if (!confirm("Yakin ingin menghentikan operasional bisnis aktif ini? Fitur akan terkunci dari pembuatan ide baru selama 1 bulan sebagai fase jeda evaluasi kas.")) return;
    try {
      await stopAttemptAPI.mutateAsync(activeAttempt.id);
      toast({ title: "Operasional Dihentikan", description: "Masa jeda 30 hari berjalan." });
      await refetchProfile();
      await refetchAttempts();
      setView("cooldown");
    } catch (e: any) {
      toast({ title: "Gagal memproses", description: e.message, variant: "destructive" });
    }
  };

  const effectiveProfile = profile && profile.status ? profile : profileOverride;

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA BILANO NAVY & GOLD */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-8 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b border-amber-300/60">
          
          <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(29,62,114,0.06)] flex items-center justify-between relative z-30 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Link href="/">
                <button 
                  type="button"
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                  title="Kembali ke Beranda"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-800" strokeWidth={2.5} />
                </button>
              </Link>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <p className="text-[10px] font-bold text-amber-900 uppercase tracking-widest">
                    Strategi & Jalur Cuan
                  </p>
                </div>
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                  {view === "execute" ? "Pusat Operasional" : "Ide & Pembimbing"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-brand-navy text-brand-gold px-3 py-1.5 rounded-full border border-brand-gold/30 shadow-xs text-[10px] font-bold">
                <Compass className="w-3.5 h-3.5 text-brand-gold" />
                <span>AI BLUEPRINT</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT ROUTER */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col">
          {view === "intro" && <IntroView onStart={() => setView("identify")} />}
          {view === "identify" && (
            <IdentifyFlow 
              onComplete={handleIdentifyComplete} 
              onBackToIntro={() => setView("intro")} 
            />
          )}
          {view === "recommend" && (
            <RecommendView 
              profile={effectiveProfile} 
              attempts={attempts} 
              onResume={(att: any) => { setActiveAttempt(att); setView("execute"); }} 
              onSelect={handleSelectRecommendation} 
              selectingId={selectingId} 
              localRecs={localRecs} 
              isGenerating={isGenerating} 
              handleGenerate={handleGenerateRecs}
              onReIdentify={() => setView("identify")}
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
          {view === "cooldown" && profile?.cooldownUntil && (
            <CooldownScreen dateStr={profile.cooldownUntil} />
          )}
        </div>
      </div>
    </MobileLayout>
  );
}