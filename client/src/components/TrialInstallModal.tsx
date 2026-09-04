import { useLocation } from "wouter";
import { Download, Sparkles, X, ShieldCheck, Zap, Target, ArrowRight } from "lucide-react";
import { triggerPwaInstallOrGuide } from "@/lib/trial-data";

interface TrialInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function TrialInstallModal({
  isOpen,
  onClose,
  title = "Ambil Kendali Finansial Nyatamu Sekarang!",
  description = "Kamu sudah merasakan betapa tajam dan cepatnya BILANO menganalisis arus kas, portofolio aset, dan laju targetmu. Sekarang saatnya mengelola uang aslimu!",
}: TrialInstallModalProps) {
  const [, setLocation] = useLocation();

  if (!isOpen) return null;

  const handleInstallClick = () => {
    triggerPwaInstallOrGuide(setLocation);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="bg-[#0b1329] border border-amber-400/50 rounded-t-[36px] sm:rounded-[36px] w-full max-w-md p-6 sm:p-7 relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 shadow-2xl text-white overflow-hidden max-h-[92vh] overflow-y-auto scrollbar-hide"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon & Tag */}
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0a1128] rounded-[14px] flex items-center justify-center">
              <img
                src="/BILANO-ICON-NEW.png"
                alt="Bilano Icon"
                className="w-10 h-10 object-contain"
              />
            </div>
          </div>
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
              <Sparkles className="w-3 h-3 animate-spin" />
              Langkah Terakhir
            </span>
            <h4 className="text-sm font-black text-white tracking-wide mt-0.5">
              BILANO PRO APPS
            </h4>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div className="relative z-10 mb-5">
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mb-2">
            {title}
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-medium">
            {description}
          </p>
        </div>

        {/* Benefits Checklist */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 mb-6 relative z-10">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30 mt-0.5">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Pasang Langsung ke Layar HP</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Hemat kuota & memori, tanpa repot unduh file Play Store yang berat.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-400/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/30 mt-0.5">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Setup Saldo Asli 1 Halaman</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Hanya 1 menit untuk mengatur saldo kas dan sumber danamu secara ringkas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-sky-400/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/30 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">100% Privat & Aman Tersimpan</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Data keuangan aslimu terenkripsi dan tidak terhubung saldo bank luar.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="space-y-3 relative z-10">
          <button
            onClick={handleInstallClick}
            type="button"
            className="w-full bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-sm tracking-wide py-4 px-5 rounded-2xl shadow-[0_12px_30px_rgba(251,191,36,0.35)] active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-amber-600 cursor-pointer"
          >
            <Download strokeWidth={3} className="w-4 h-4 animate-bounce" />
            <span>INSTALL BILANO & BUAT AKUN SEKARANG</span>
          </button>

          <button
            onClick={onClose}
            type="button"
            className="w-full py-2.5 text-center text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Lanjut eksplorasi demo dulu →
          </button>
        </div>
      </div>
    </div>
  );
}
