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
  PiggyBank, ShoppingBag, Compass, Lightbulb, Clock, Layers, RefreshCcw, 
  ArrowRight, Bot, User as UserIcon, ShieldAlert, PieChart, Coins, TrendingUp, History, Lock, Target, ShoppingCart
} from "lucide-react";
import {
  useIncomeProfile, useGenerateQuestions, useSaveIncomeProfile, useGenerateRecommendations,
  useIncomeAttempts, useCreateAttempt, useUpdateMaterials, useCheckFeasibility,
  useCapitalStrategy, useUpdateAttemptState, useSellingChat, useAddFinanceLog, useEvaluateAttempt, useStopAttempt
} from "@/hooks/use-income-strategy";

// =========================================================================
// KONSTAN
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
  MODAL_SEDANG: "Modal sedang" 
};

const DIFFICULTY_BADGE: Record<string, string> = {
  MUDAH: "bg-emerald-100 text-emerald-700",
  SEDANG: "bg-amber-100 text-amber-700",
  MENANTANG: "bg-rose-100 text-rose-700",
};

const STATE_BADGE: Record<string, { label: string; className: string }> = {
  MATERIALS: { label: "Rencana Bahan", className: "bg-slate-100 text-slate-600" },
  CAPITAL: { label: "Kumpul Modal", className: "bg-amber-100 text-amber-700" },
  SELLING: { label: "Strategi Jual", className: "bg-indigo-100 text-indigo-700" },
  TRACKING: { label: "Pantau Omset", className: "bg-emerald-100 text-emerald-700" },
};

// =========================================================================
// KOMPONEN UI PENDUKUNG
// =========================================================================
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.min(100, Math.round((step / total) * 100));
  return (
    <div className="mb-5">
      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        <span>Langkah {Math.min(step, total)} dari {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OptionButton({ label, selected, onClick, checkbox }: { label: string; selected: boolean; onClick: () => void; checkbox?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-[20px] border-2 transition-all flex items-center justify-between gap-3 active:scale-[0.98] ${
        selected ? "border-indigo-500 bg-indigo-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span className={`text-sm font-bold ${selected ? "text-indigo-700" : "text-slate-700"}`}>{label}</span>
      {checkbox ? (
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-indigo-500 bg-indigo-500" : "border-slate-300"}`}>
          {selected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
      ) : (
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-indigo-500 bg-indigo-500" : "border-slate-300"}`}>
          {selected && <div className="w-2 h-2 bg-white rounded-full" />}
        </div>
      )}
    </button>
  );
}

function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-[20px] p-4 flex gap-3 items-start mb-5">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 font-semibold leading-relaxed">
        Ini saran, bukan keputusan. Kondisi keuangan tiap orang beda — pertimbangkan baik-baik sebelum bertindak.
      </p>
    </div>
  );
}

function LockedScreen() {
  return (
    <MobileLayout title="Strategi Pemasukan" showBack>
      <div className="relative min-h-[70vh] overflow-hidden">
        <div className="p-4 space-y-5 blur-md opacity-40 select-none pointer-events-none mt-2">
          <div className="bg-gradient-to-br from-blue-600 to-violet-800 h-40 rounded-[32px] w-full" />
          <div className="bg-white h-24 rounded-[24px] w-full border border-slate-200" />
        </div>
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(251,191,36,0.4)]">
            <Crown className="w-10 h-10 text-amber-950" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Fitur Khusus BILANO PRO</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-xs leading-relaxed font-medium">
            Strategi Pemasukan adalah fitur premium untuk menemukan dan mengeksekusi sumber penghasilan baru.
          </p>
          <Link href="/paywall">
            <button className="w-full max-w-xs h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full shadow-2xl transition-transform active:scale-95">
              LIHAT PAKET BILANO PRO
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
    <MobileLayout title="Fitur Ditangguhkan" showBack>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 mt-6">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
          <Lock className="w-7 h-7 text-slate-500" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Masa Jeda Evaluasi Berjalan</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed font-medium max-w-xs">
          Kamu baru saja menghentikan operasional bisnis sebelumnya. Sistem menahan pembuatan ide baru agar kamu fokus mengevaluasi catatan keuangan berjalan. Fitur terbuka kembali pada <b>{formatted}</b>.
        </p>
        <Link href="/dashboard">
          <button className="w-full max-w-xs h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-transform active:scale-95 text-xs tracking-wide">
            KEMBALI KE BERANDA
          </button>
        </Link>
      </div>
    </MobileLayout>
  );
}

// =========================================================================
// FASE 1 — IDENTIFIKASI
// =========================================================================
function IdentifyFlow({ onComplete }: { onComplete: (status: string, answers: any) => Promise<void> | void }) {
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
  const [asetLainnya, setAsetLainnya] = useState(""); //

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
      <div className="pt-2 pb-24">
        <ProgressBar step={0} total={totalSteps} />
        <h2 className="text-xl font-black text-slate-800 mb-1">Kamu saat ini berstatus sebagai apa?</h2>
        <p className="text-sm text-slate-500 mb-6">Ini membantu BILANO menyesuaikan seluruh pertanyaan berikutnya untukmu.</p>
        <div className="grid grid-cols-2 gap-3">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => handlePickStatus(opt.value)}
                disabled={isFetchingQuestions}
                className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] flex flex-col items-center text-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
              >
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${opt.color} flex items-center justify-center shadow-md`}>
                  {isFetchingQuestions && status === opt.value ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Icon className="w-7 h-7 text-white" />}
                </div>
                <div>
                  <p className="font-extrabold text-slate-800 text-sm">{opt.label}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{opt.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="pt-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
        <p className="text-sm font-bold">Menyiapkan pertanyaan strategis...</p>
      </div>
    );
  }

  const camelKey = fieldMap[currentQuestion.field_key] || currentQuestion.field_key;

  return (
    <div className="pt-2 pb-24">
      <ProgressBar step={stepIndex} total={totalSteps} />
      <h2 className="text-xl font-black text-slate-800 mb-6 leading-snug">{currentQuestion.question_text}</h2>

      {currentQuestion.type === "single" && (
        <div className="space-y-3">
          {(currentQuestion.options || []).map((opt: any) => (
            <OptionButton key={opt.value} label={opt.label} selected={false} onClick={() => advance(camelKey, opt.value)} />
          ))}
        </div>
      )}

      {currentQuestion.type === "multi" && (
        <div className="space-y-3">
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
              placeholder="Keahlian lain (opsional)"
              disabled={isSubmitting}
              className="w-full px-5 py-4 rounded-[20px] border-2 border-slate-200 text-sm font-semibold focus:border-indigo-400 outline-none disabled:opacity-60"
            />
          )}
          {currentQuestion.field_key === "aset" && (
            <input
              value={asetLainnya}
              onChange={(e) => setAsetLainnya(e.target.value)}
              placeholder="Aset/alat lain yang dimiliki (opsional)"
              disabled={isSubmitting}
              className="w-full px-5 py-4 rounded-[20px] border-2 border-slate-200 text-sm font-semibold focus:border-indigo-400 outline-none disabled:opacity-60"
            />
          )}
          <button
            onClick={async () => {
              const next = { ...answers, [camelKey]: multiSelected, 
              keahlianLainnya: currentQuestion.field_key === "keahlian" ? keahlianLainnya || null : answers.keahlianLainnya,
              asetLainnya: currentQuestion.field_key === "aset" ? asetLainnya || null : answers.asetLainnya };
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
            className="w-full h-14 bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-full shadow-lg shadow-indigo-200 disabled:shadow-none transition-all active:scale-95 mt-2 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "LANJUT"}
          </button>
        </div>
      )}

      {currentQuestion.type === "text" && (
        <div className="space-y-3">
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder={currentQuestion.placeholder || ""}
            rows={3}
            disabled={isSubmitting}
            className="w-full px-5 py-4 rounded-[20px] border-2 border-slate-200 text-sm font-semibold focus:border-indigo-400 outline-none resize-none disabled:opacity-60"
          />
          <button
            onClick={() => advance(camelKey, textValue.trim())}
            disabled={!textValue.trim() || isSubmitting}
            className="w-full h-14 bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-full shadow-lg shadow-indigo-200 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "LANJUT"}
          </button>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// FASE 2 — REKOMENDASI
// =========================================================================
function RecommendationCard({ rec, onSelect, isSelecting }: { rec: any; onSelect: () => void; isSelecting: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-indigo-500" />
        </div>
        <h3 className="font-extrabold text-slate-800 text-base leading-snug pt-1.5">{rec.title}</h3>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">{rec.pitch}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {rec.capital_level && <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${CAPITAL_BADGE[rec.capital_level] || "bg-slate-100 text-slate-600"}`}>{CAPITAL_LABEL[rec.capital_level] || rec.capital_level}</span>}
        {rec.difficulty && <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${DIFFICULTY_BADGE[rec.difficulty] || "bg-slate-100 text-slate-600"}`}>{rec.difficulty}</span>}
        {rec.estimated_time_to_first_income && (
          <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {rec.estimated_time_to_first_income}
          </span>
        )}
      </div>

      <button onClick={() => setExpanded((v) => !v)} className="text-xs font-bold text-indigo-600 mb-3">
        {expanded ? "Sembunyikan analisis lapangan" : "Lihat Analisis Kelayakan & Taktik"}
      </button>

      {expanded && (
        <div className="bg-indigo-50/50 rounded-[16px] p-3.5 mb-3 space-y-2">
          <p className="text-xs text-indigo-800 leading-relaxed"><b>Kesesuaian Profil:</b> {rec.why_it_fits}</p>
          {rec.needs_upskilling && rec.upskilling_note && (
            <p className="text-xs text-indigo-800 leading-relaxed"><b>Langkah Belajar Cepat:</b> {rec.upskilling_note}</p>
          )}
          {rec.risk_note && <p className="text-xs text-indigo-800 leading-relaxed"><b>Risiko Utama Pasar:</b> {rec.risk_note}</p>}
        </div>
      )}

      <button
        onClick={onSelect}
        disabled={isSelecting}
        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold rounded-full text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {isSelecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Eksekusi Taktik Gerilya Ini <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

function RecommendView({ profile, attempts, onResume, onSelect, selectingId, localRecs, isGenerating, handleGenerate }: any) {
  const activeAttempts = (attempts || []).filter((a: any) => a.status === 'ACTIVE');
  const stoppedAttempts = (attempts || []).filter((a: any) => a.status === 'STOPPED');

  return (
    <div className="pt-2 pb-24 space-y-6">
      {activeAttempts.length > 0 && (
        <div>
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Operasional Berjalan</h3>
          <div className="space-y-2.5">
            {activeAttempts.map((att: any) => {
              const badge = STATE_BADGE[att.state] || STATE_BADGE.MATERIALS;
              return (
                <button key={att.id} onClick={() => onResume(att)} className="w-full bg-white border border-slate-100 rounded-[20px] p-4 flex items-center justify-between gap-3 shadow-[0_4px_20px_rgb(0,0,0,0.03)] active:scale-[0.98] transition-transform text-left">
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-800 text-sm truncate">{att.recommendation?.title || "Percobaan usaha"}</p>
                    <span className={`inline-block mt-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stoppedAttempts.length > 0 && (
        <div>
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Arsip Riwayat Bisnis</h3>
          <div className="space-y-2.5 opacity-60">
            {stoppedAttempts.map((att: any) => (
              <div key={att.id} className="w-full bg-slate-50 border border-slate-100 rounded-[20px] p-4 flex items-center justify-between text-left">
                <div className="min-w-0">
                  <p className="font-bold text-slate-700 text-sm truncate">{att.recommendation?.title}</p>
                  <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">Dihentikan</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Rekomendasi Pilihan</h3>
        {localRecs.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 text-center shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <RefreshCcw className="w-7 h-7 text-indigo-500" />
            </div>
            <p className="text-sm text-slate-600 font-semibold mb-4 leading-relaxed">Sistem siap melakukan pemindaian taktik cerdas untuk kapasitasmu.</p>
            <button onClick={handleGenerate} disabled={isGenerating} className="w-full h-14 bg-indigo-600 disabled:opacity-70 text-white font-extrabold rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all">
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyusun peta...</> : <><RefreshCcw className="w-4 h-4" /> Jalankan Pemindaian Radar</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {localRecs.map((rec: any) => (
              <RecommendationCard key={rec.id || rec.title} rec={rec} onSelect={() => onSelect(rec)} isSelecting={selectingId === (rec.id || rec.title)} />
            ))}
            <button onClick={handleGenerate} disabled={isGenerating} className="w-full h-12 bg-white border-2 border-slate-200 text-slate-600 font-extrabold rounded-full text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />} Pindai Opsi Baru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// FASE 3 — EKSEKUSI
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
    <div className="pt-2 pb-24">
      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Rencana Anggaran Biaya (RAB Gerilya)</h3>
      <div className="space-y-2.5 mb-4">
        {materials.map((m, idx) => (
          <div key={m.id || idx} className="bg-white border border-slate-100 rounded-[18px] p-3 flex items-center gap-2 shadow-[0_2px_10px_rgb(0,0,0,0.03)]">
            <input value={m.name} onChange={(e) => updateRow(idx, "name", e.target.value)} placeholder="Nama bahan/alat" className="flex-1 min-w-0 text-sm font-semibold outline-none" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-slate-400 font-bold">Rp</span>
              <input type="number" value={m.price || ""} onChange={(e) => updateRow(idx, "price", Number(e.target.value))} placeholder="0" className="w-24 text-sm font-bold text-right outline-none" />
            </div>
            <button onClick={() => removeRow(idx)} className="text-slate-300 hover:text-rose-500 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={addRow} className="w-full h-12 border-2 border-dashed border-slate-200 rounded-[18px] text-slate-400 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <Plus className="w-4 h-4" /> Tambah Kebutuhan
        </button>
      </div>

      <div className="bg-slate-800 rounded-[20px] p-4 flex items-center justify-between mb-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Total Proyeksi Anggaran</span>
        <span className="text-lg font-black text-white">{formatRp(total)}</span>
      </div>

      {clarification && (
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-[20px] p-4 mb-4 space-y-3">
          <p className="text-xs font-bold text-indigo-700">Audit Batas Aman Finansial:</p>
          {clarification.map((q: any) =>
            q.type === "text" ? (
              <input key={q.field_key} value={manualExpense} onChange={(e) => setManualExpense(e.target.value)} placeholder={q.placeholder} className="w-full px-4 py-3 rounded-[14px] border-2 border-slate-200 text-sm font-semibold outline-none focus:border-indigo-400" />
            ) : (
              <div key={q.field_key} className="space-y-2">
                <p className="text-xs text-slate-600 font-semibold">{q.question_text}</p>
                {q.options.map((opt: any) => (
                  <OptionButton key={opt.value} label={opt.label} selected={dependents === opt.value} onClick={() => setDependents(opt.value)} />
                ))}
              </div>
            )
          )}
          <button
            onClick={() => runFeasibility({ manualMonthlyExpense: manualExpense, hasDependents: dependents })}
            disabled={!manualExpense || !dependents || isChecking}
            className="w-full h-12 bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-full text-sm active:scale-95 transition-all"
          >
            {isChecking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "KONFIRMASI INTEGRASI"}
          </button>
        </div>
      )}

      {verdictResult && !clarification && (
        <div className={`rounded-[20px] p-4 mb-5 border-2 ${verdictResult.verdict === "CUKUP_AMAN" ? "bg-emerald-50 border-emerald-200" : verdictResult.verdict === "CUKUP_TAPI_RISIKO" ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {verdictResult.verdict === "CUKUP_AMAN" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className={`w-5 h-5 ${verdictResult.verdict === "KURANG" ? "text-rose-600" : "text-amber-600"}`} />}
            <h4 className={`font-extrabold text-sm ${verdictResult.verdict === "CUKUP_AMAN" ? "text-emerald-700" : verdictResult.verdict === "CUKUP_TAPI_RISIKO" ? "text-amber-700" : "text-rose-700"}`}>
              {verdictResult.verdict === "CUKUP_AMAN" ? "Skala Anggaran Aman" : verdictResult.verdict === "CUKUP_TAPI_RISIKO" ? "Beresiko Menggangu Arus Cadangan" : "Defisit Sisa Saldo"}
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Saldo kas aktif: {formatRp(verdictResult.saldo_saat_ini)} · Batas proteksi: {formatRp(verdictResult.sisa_dana_aman)}
            {verdictResult.verdict === "KURANG" && <> · Selisih kurang: {formatRp(verdictResult.selisih)}</>}
          </p>
        </div>
      )}

      {!clarification && !verdictResult && (
        <button 
          onClick={() => runFeasibility()} 
          disabled={isChecking} // 👇 DIUBAH: Pengguna kini bebas lanjut meski bahan kosong/0
          className="w-full h-14 bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-full shadow-lg shadow-indigo-200 disabled:shadow-none flex items-center justify-center gap-2 active:scale-95 transition-all">
          {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wallet className="w-5 h-5" /> KALIBRASI STRATEGI MODAL</>}
        </button>
      )}
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
    <div className="pt-2 pb-24">
      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Solusi Defisit Anggaran</h3>
      <DisclaimerBanner />

      {isLoadingPlan ? (
        <div className="flex flex-col items-center py-10 text-slate-400"><Loader2 className="w-7 h-7 animate-spin mb-2 text-indigo-500" /><p className="text-xs font-bold">Merakit rencana permodalan...</p></div>
      ) : (
        <div className="space-y-3 mb-4">
          {(plan?.options || []).map((opt: any, idx: number) => (
            <div key={idx} className="bg-white border border-slate-100 rounded-[20px] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-1.5">
                <PiggyBank className="w-4 h-4 text-indigo-500" />
                <h4 className="font-extrabold text-slate-800 text-sm">{opt.title}</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-1.5">{opt.description}</p>
              {opt.estimated_time_or_effort && <p className="text-[11px] text-indigo-500 font-bold">Kapasitas: {opt.estimated_time_or_effort}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-[20px] p-4 mb-5 space-y-2.5">
        <input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Ajukan alternatif aset pendukung..." className="w-full px-4 py-3 rounded-[14px] border-2 border-slate-200 text-xs font-semibold outline-none focus:border-indigo-400" />
        <button onClick={handleRegenerate} disabled={isLoadingPlan} className="w-full h-11 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-full text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all">
          <RefreshCcw className="w-3.5 h-3.5" /> Kalkulasi Ulang Bootstrapping
        </button>
      </div>

      <button onClick={handleReady} disabled={isRechecking} className="w-full h-14 bg-indigo-600 disabled:opacity-70 text-white font-extrabold rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all">
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
    <div className="pt-2 pb-24 flex flex-col" style={{ minHeight: "65vh" }}>
      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Taktik Pemasaran Lapangan</h3>
      
      <div className="flex-1 space-y-4 mb-4">
        {notes.map((n, idx) => {
          const isLastAi = idx === lastAiIndex;

          if (isLastAi && !isSending) {
            return (
              <div key={idx} className="bg-amber-50 border-2 border-amber-300 rounded-[24px] p-5 shadow-[0_8px_30px_rgb(251,191,36,0.15)] relative mt-6 transition-all">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 whitespace-nowrap">
                  <Target className="w-3.5 h-3.5" /> MISI HARI INI
                </div>
                
                <div className="flex items-start gap-3 mt-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {n.text}
                  </div>
                </div>

                <button
                  onClick={toggleMission}
                  className={`w-full py-3.5 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-2.5 transition-all active:scale-95 ${
                    missionDone 
                      ? "bg-emerald-100 border-emerald-500 text-emerald-700 shadow-inner" 
                      : "bg-white border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-700 shadow-sm"
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
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
            <div key={idx} className={`flex gap-2 opacity-60 scale-[0.98] ${n.sender === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${n.sender === "user" ? "bg-indigo-600" : "bg-slate-800"}`}>
                {n.sender === "user" ? <UserIcon className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className={`max-w-[78%] px-4 py-2.5 rounded-[18px] text-sm font-medium leading-relaxed ${
                n.sender === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-slate-100 text-slate-700 rounded-tl-sm"
              }`}>
                {n.text}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex gap-2 mt-4 animate-in fade-in">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-100 px-5 py-3.5 rounded-[18px] rounded-tl-sm flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 sticky bottom-20 bg-white py-3 border-t border-slate-100 z-10">
        <input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && handleSend()} 
          placeholder={missionDone ? "Ketikan hasil lapanganmu di sini..." : "Tuntaskan misi di atas sebelum melapor..."} 
          className={`flex-1 px-4 py-3.5 rounded-full border-2 text-sm font-semibold outline-none transition-colors ${
            missionDone ? "border-amber-400 focus:border-amber-500 bg-amber-50/30" : "border-slate-200 focus:border-indigo-400 bg-slate-50"
          }`} 
        />
        <button 
          onClick={handleSend} 
          disabled={isSending || !message.trim()} 
          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-all shadow-md ${
            message.trim() && missionDone ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 disabled:bg-slate-200"
          }`}
        >
          <Send className="w-4.5 h-4.5 text-white" />
        </button>
      </div>

      <button onClick={handleAdvance} disabled={isAdvancing} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center justify-center gap-2 active:scale-95 transition-all flex-shrink-0">
        {isAdvancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShoppingCart className="w-5 h-5" /> BUKA DASBOR ARUS KAS</>}
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
      toast({ title: "Kas Tercatat!", description: `Arus operasional ${activeTab === 'income' ? 'pemasukan' : 'beban/HPP'} berhasil masuk jurnal.` });
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
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[24px] p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-100 mb-1">Laba Bersih Operasional</p>
        <p className={`text-3xl font-black ${netProfit < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{formatRp(netProfit)}</p>
        <div className="flex justify-between border-t border-white/10 pt-3 mt-4 text-xs font-semibold">
          <div><p className="text-[10px] text-indigo-200">Total Omset</p><p className="font-bold text-white">{formatRp(totalOmset)}</p></div>
          <div className="text-right"><p className="text-[10px] text-indigo-200">Beban / HPP</p><p className="font-bold text-rose-200">{formatRp(totalHPP)}</p></div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[20px] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="flex bg-slate-100 rounded-lg p-1 mb-3 text-[11px] font-bold">
          <button onClick={() => setActiveTab('income')} className={`flex-1 py-1.5 rounded-md transition-all ${activeTab === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Omset Masuk</button>
          <button onClick={() => setActiveTab('expense')} className={`flex-1 py-1.5 rounded-md transition-all ${activeTab === 'expense' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400'}`}>HPP / Pengeluaran</button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-slate-400">Rp</span>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="flex-1 text-sm font-bold outline-none bg-transparent" />
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan transaksi operasional..." className="w-full text-xs font-medium outline-none border-t border-slate-100 pt-2.5 bg-transparent" />
        <button onClick={handleAdd} disabled={isSaving || !amount} className={`w-full h-11 mt-3 disabled:opacity-40 text-white font-extrabold rounded-full text-xs tracking-wide active:scale-95 transition-all ${activeTab === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : activeTab === 'income' ? 'JURNAL OMSET MASUK' : 'JURNAL BEBAN USAHA'}
        </button>
      </div>

      {evaluation && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-[20px] p-4 flex gap-3">
          <PieChart className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-900 leading-relaxed font-semibold">{evaluation}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleEvaluate} disabled={isEvaluating || log.length === 0} className="flex-1 h-12 bg-white border-2 border-slate-200 disabled:opacity-50 text-slate-600 font-extrabold rounded-full text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all">
          {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PieChart className="w-4 h-4" />} Audit Finansial AI
        </button>
        <button onClick={onStop} className="flex-1 h-12 bg-white border-2 border-rose-100 text-rose-600 font-extrabold rounded-full text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all">
          Tutup Bisnis Ini
        </button>
      </div>

      {log.length > 0 && (
        <div className="pt-2">
          <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1"><History className="w-3.5 h-3.5"/> Buku Jurnal Kas</h4>
          <div className="space-y-2">
            {[...log].reverse().map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 rounded-[16px] px-4 py-3 shadow-sm">
                <div className="min-w-0">
                  <p className={`text-sm font-black ${entry.type === 'expense' ? 'text-rose-600' : 'text-slate-800'}`}>
                    {entry.type === 'expense' ? '-' : '+'}{formatRp(entry.amount)}
                  </p>
                  {entry.note && <p className="text-[11px] text-slate-400 truncate mt-0.5">{entry.note}</p>}
                </div>
                <p className="text-[10px] text-slate-300 font-bold flex-shrink-0">{new Date(entry.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</p>
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
    <div className="pt-2 pb-4">
      {attempt.state !== "TRACKING" && (
        <button onClick={onBack} className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1">
          ← Kembali ke radar pilihan
        </button>
      )}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[24px] p-5 text-white mb-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-20 h-20 bg-white/5 rounded-bl-full pointer-events-none" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-200 mb-1 flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-amber-400"/> Operasional Aktif
        </p>
        <h2 className="text-lg font-black leading-snug tracking-tight">{attempt.recommendation?.title}</h2>
      </div>

      {attempt.state === "MATERIALS" && <MaterialsStep attempt={attempt} onUpdated={onUpdated} />}
      {attempt.state === "CAPITAL" && <CapitalStep attempt={attempt} onUpdated={onUpdated} />}
      {attempt.state === "SELLING" && <SellingStep attempt={attempt} onUpdated={onUpdated} />}
      {attempt.state === "TRACKING" && <TrackingStep attempt={attempt} onStop={onStop} />}
    </div>
  );
}

// =========================================================================
// INTRO
// =========================================================================
function IntroView({ onStart }: { onStart: () => void }) {
  return (
    <div className="pt-2 pb-24">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-800 text-white p-7 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest mb-4">
            <Crown className="w-3 h-3" /> Modul Premium
          </span>
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mb-4">
            <Compass className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-2 tracking-tight">Pembimbing Penghasilan</h1>
          <p className="text-sm text-indigo-100 leading-relaxed font-medium">
            Dibimbing langkah demi langkah oleh BILANO Intelligence untuk membedah modal sosial, keahlian terpendam, serta melacak laba bersih operasional riil.
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { icon: Compass, title: "Audit Kapasitas Diri", desc: "Diagnosis mendalam profil psikologis & jejaring modal sosial." },
          { icon: RefreshCcw, title: "Peta Taktik Hiper-Lokal", desc: "Rekomendasi taktis berbasis ekosistem sirkel terdekat di Indonesia." },
          { icon: Layers, title: "Dasbor Laba Bersih Absolut", desc: "Hitung HPP berjalan secara transparan agar tidak terjebak ilusi omset." },
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-100 rounded-[20px] p-4 flex items-center gap-3.5 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <div className="w-11 h-11 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">{item.title}</p>
              <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onStart} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all">
        MULAI AUDIT KREATIVITAS <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// =========================================================================
// PAGE MAIN ENGINE
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
        <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
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
        title: "Sedang Memproses...", 
        description: "BILANO Intelligence sedang merumuskan taktik. Tunggu sebentar..." 
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
    if (!confirm("Yakin ingin menghentikan operasional bisnis aktif ini? Fitur akan terkunci dari pembuatan ide baru selama 1 bulan penuh sebagai fase jeda evaluasi kas.")) return;
    try {
      await stopAttemptAPI.mutateAsync(activeAttempt.id);
      toast({ title: "Operasional Dihentikan", description: "Masa penangguhan 30 hari berjalan." });
      await refetchProfile();
      await refetchAttempts();
      setView("cooldown");
    } catch (e: any) {
      toast({ title: "Gagal memproses", description: e.message, variant: "destructive" });
    }
  };

  const effectiveProfile = profile && profile.status ? profile : profileOverride;

  return (
    <MobileLayout title={view === "execute" ? "Pusat Operasional" : "Pembimbing Penghasilan"} showBack>
      <div className="px-1">
        {view === "intro" && <IntroView onStart={() => setView("identify")} />}
        {view === "identify" && <IdentifyFlow onComplete={handleIdentifyComplete} />}
        {view === "recommend" && (
          <RecommendView profile={effectiveProfile} attempts={attempts} onResume={(att: any) => { setActiveAttempt(att); setView("execute"); }} onSelect={handleSelectRecommendation} selectingId={selectingId} localRecs={localRecs} isGenerating={isGenerating} handleGenerate={handleGenerateRecs} />
        )}
        {view === "execute" && activeAttempt && (
          <ExecuteView attempt={activeAttempt} onBack={() => setView("recommend")} onUpdated={(p) => setActiveAttempt((prev: any) => ({ ...prev, ...p }))} onStop={handleStopBusiness} />
        )}
        {view === "cooldown" && profile?.cooldownUntil && (
          <CooldownScreen dateStr={profile.cooldownUntil} />
        )}
      </div>
    </MobileLayout>
  );
}