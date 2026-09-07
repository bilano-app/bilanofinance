import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { getTrialInfo, hasSeenTrialFeatureTip, markTrialFeatureTipSeen } from "@/lib/trial-manager";
import { useUser } from "@/hooks/use-finance";

interface TrialFeatureNoticeProps {
  featureKey: string;
  featureName?: string;
  className?: string;
}

export function TrialFeatureNotice({ featureKey, featureName, className = "" }: TrialFeatureNoticeProps) {
  const { data: user } = useUser();
  const trial = getTrialInfo(user);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trial.isTrialActive && !hasSeenTrialFeatureTip(featureKey)) {
      setIsVisible(true);
      markTrialFeatureTipSeen(featureKey);

      // Auto dismiss after 8 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [trial.isTrialActive, featureKey]);

  if (!isVisible || !trial.isTrialActive) return null;

  return (
    <div className={`w-full animate-in fade-in slide-in-from-top-2 duration-300 mb-3 ${className}`}>
      <div className="bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-transparent border border-amber-400/30 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          </div>
          <p className="text-[11px] font-bold text-slate-700 leading-snug">
            Fitur ini biasanya premium — <span className="text-amber-700 font-extrabold">gratis untukmu</span> sampai {trial.formattedEndDate || "7 hari ke depan"}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors shrink-0"
          title="Tutup"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default TrialFeatureNotice;
