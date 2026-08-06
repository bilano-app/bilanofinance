import React from "react";
import { AlertCircle } from "lucide-react";

interface FinanceSafetyBannerProps {
  className?: string;
}

export default function FinanceSafetyBanner({ className = "" }: FinanceSafetyBannerProps) {
  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 animate-in slide-in-from-bottom-8 duration-500 ${className}`}
    >
      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex gap-3 items-start shadow-sm max-w-md mx-auto">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-amber-800 font-black leading-relaxed uppercase tracking-wider">
            Disclaimer Eksekusi Finansial
          </p>
          <p className="text-xs text-amber-700 font-medium leading-relaxed font-sans">
            Ini adalah saran simulasi dan *advisory* kognitif, bukan keputusan mutlak. Kondisi lapangan dan keuangan tiap orang berbeda — pertimbangkan secara matang dan seluruh risiko eksekusi berada di tangan Anda.
          </p>
        </div>
      </div>
    </div>
  );
}