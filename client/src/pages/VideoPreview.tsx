import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Play, Volume2, VolumeX, Maximize } from "lucide-react";

export default function VideoPreview() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ⏱️ Logika Timer Skip
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setSkip(true);
    }
  }, [countdown]);

  const handleFinish = () => {
    setLocation('/onboarding');
  };

  return (
    <div className="min-h-[100dvh] bg-[#040814] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* ✨ Ambient Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-5xl z-10 flex flex-col items-center gap-8">
        
        {/* 🎬 Header Info */}
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
            Intip Arsitektur <span className="text-amber-400">Visi Kekayaanmu</span>
          </h2>
          <p className="text-slate-400 text-sm md:text-base font-medium">
            Sistem Bilano bekerja dalam hitungan detik untuk masa depan bertahun-tahun.
          </p>
        </div>

        {/* 🎥 Video Player Container (Cinematic Frame) */}
        <div className="relative w-full aspect-video bg-black rounded-[32px] overflow-hidden border-[6px] border-white/5 shadow-2xl shadow-blue-900/20 group">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            onEnded={handleFinish}
            className="w-full h-full object-cover"
          >
            {/* Ganti URL ini dengan link video Bilano asli Anda (mp4/webm) */}
            <source src="https://path-to-your-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Overlay Controls */}
          <div className="absolute bottom-6 left-6 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={() => setIsMuted(!isMuted)} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>

        {/* 🚀 Skip Action (Engaging Version) */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {!canSkip ? (
            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-slate-400 font-bold text-xs tracking-widest uppercase">
              Mempersiapkan Sistem... <span className="text-amber-400 text-lg w-4">{countdown}</span>
            </div>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0a1128] font-black text-sm md:text-base py-4 px-8 rounded-2xl shadow-[0_10px_40px_rgba(251,191,36,0.3)] hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3 border-b-[5px] border-amber-600 animate-in zoom-in duration-300"
            >
              KONFIRMASI EKSEKUSI VISI <ArrowRight className="w-5 h-5" />
            </button>
          )}
          
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase text-center">
            Preview: Dashboard & AI Intelligence Bilano
          </p>
        </div>

      </div>
    </div>
  );
}