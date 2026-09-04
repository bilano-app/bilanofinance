import { useState } from "react";
import { Coffee, Utensils, Fuel, X, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { recordTrialExpense, getTrialData } from "@/lib/trial-data";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TrialSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (expenseNote: string, amount: number) => void;
}

const PRESETS = [
  {
    icon: Coffee,
    label: "Kopi Susu",
    amount: 25000,
    category: "Makanan",
    source: "GoPay",
    note: "Segelas Kopi Susu Gula Aren",
    color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-400/40",
  },
  {
    icon: Utensils,
    label: "Makan Siang",
    amount: 45000,
    category: "Makanan",
    source: "BCA",
    note: "Makan Siang Nasi Padang",
    color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-400/40",
  },
  {
    icon: Fuel,
    label: "Bensin Motor",
    amount: 30000,
    category: "Transportasi",
    source: "Cash",
    note: "Bahan Bakar Bensin Motor",
    color: "from-sky-500/20 to-blue-500/10 text-sky-400 border-sky-400/40",
  },
];

export default function TrialSimulationModal({ isOpen, onClose, onSuccess }: TrialSimulationModalProps) {
  const { toast } = useToast();
  const trialData = getTrialData();

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [selectedSource, setSelectedSource] = useState<string>("GoPay");
  const [customAmount, setCustomAmount] = useState<string>("25.000");
  const [note, setNote] = useState<string>("Segelas Kopi Susu Gula Aren");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = PRESETS[idx];
    setCustomAmount(formatNumber(String(p.amount)));
    setSelectedSource(p.source);
    setNote(p.note);
  };

  const formatNumber = (val: string) => {
    let clean = val.replace(/\D/g, "");
    if (clean.length > 1) {
      clean = clean.replace(/^0+/, "");
    }
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumber = (val: string) => parseFloat(val.replace(/\./g, "")) || 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setCustomAmount(formatted);
    setSelectedPresetIndex(-1);
  };

  const handleSubmit = () => {
    const amt = parseNumber(customAmount);
    if (amt <= 0) {
      toast({
        title: "Nominal Kosong",
        description: "Silakan masukkan nominal pengeluaran simulasi.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const category =
      selectedPresetIndex >= 0 ? PRESETS[selectedPresetIndex].category : "Lainnya";

    recordTrialExpense(amt, category, selectedSource, note || "Pengeluaran Simulasi");

    // Invalidate all react-queries so UI updates instantaneously
    queryClient.invalidateQueries();

    toast({
      title: "⚡ Pengeluaran Berhasil Dicatat!",
      description: `Rp ${formatNumber(String(amt))} dipotong dari ${selectedSource}. Saldo Kas terupdate otomatis.`,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess(note || "Pengeluaran", amt);
      onClose();
    }, 400);
  };

  const currentSources = trialData.user.walletSources || [];

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-[#0c142c] border border-amber-400/40 rounded-t-[32px] sm:rounded-[32px] w-full max-w-md p-6 relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300 shadow-2xl text-white overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-hide"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge & Title */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Simulasi 1-Sentuhan
          </span>
        </div>

        <h3 className="text-xl font-black text-white tracking-tight leading-snug mb-1.5">
          Coba Catat Transaksi Pertamamu!
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-5">
          Pilih salah satu jajan santai hari ini. Lihat bagaimana BILANO langsung memperbarui
          seluruh posisi kas, sisa anggaran, dan laju targetmu secara otomatis.
        </p>

        {/* 1-Tap Quick Presets */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {PRESETS.map((p, idx) => {
            const Icon = p.icon;
            const isSelected = selectedPresetIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(idx)}
                className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                  isSelected
                    ? "bg-amber-400/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-1 ring-amber-400"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-gradient-to-br ${p.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black text-white leading-tight">
                  {p.label}
                </span>
                <span className="text-[10px] font-bold text-amber-300 mt-0.5">
                  Rp {formatNumber(String(p.amount))}
                </span>
              </button>
            );
          })}
        </div>

        {/* Input Nominal & Catatan */}
        <div className="space-y-3.5 mb-5">
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 block">
              Nominal Pengeluaran (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={customAmount}
                onChange={handleAmountChange}
                placeholder="25.000"
                className="w-full bg-[#131f3f] border border-white/15 rounded-2xl py-3 pl-12 pr-4 text-white font-black text-lg focus:outline-hidden focus:border-amber-400 transition-colors tabular-nums shadow-inner"
              />
            </div>
          </div>

          {/* Sumber Dana Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 block">
              Sumber Dana (Tersedia):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {currentSources.map((source) => {
                const isSelected = selectedSource.toLowerCase() === source.name.toLowerCase();
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => setSelectedSource(source.name)}
                    className={`py-2 px-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-400/20 border-amber-400 ring-1 ring-amber-400"
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-black text-white">{source.name}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium tabular-nums mt-0.5 truncate">
                      {formatCurrency(source.balance).split(",")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-sm tracking-wide py-4 px-5 rounded-2xl shadow-[0_10px_25px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-amber-600 cursor-pointer disabled:opacity-50"
        >
          <span>⚡ CATAT TRANSAKSI (SIMULASI)</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>

        <button
          onClick={onClose}
          type="button"
          className="w-full mt-3 py-2 text-center text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          Nanti saja, saya ingin lihat-lihat dulu →
        </button>
      </div>
    </div>
  );
}
