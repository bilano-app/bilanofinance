import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";

export default function VideoPreview() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setSkip] = useState(false);
  
  // 🔥 Diubah ke true secara default agar fitur autoplay tidak diblokir oleh browser HP/Sistem
  const [isMuted, setIsMuted] = useState(true); 
  const videoRef = useRef<HTMLVideoElement>(null);

  // ⏱️ Logika Timer Skip (5 Detik)
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
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* 📦 Kontainer Utama Video (Cinematic Frame HP 9:16) */}
      <div className="w-full max-w-sm aspect-[9/16] bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.7)] border border-white/5 relative mb-6 flex flex-col justify-between p-6">
        
        {/* 🎥 Background Video Player */}
        <div className="absolute inset-0 z-0">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            muted={isMuted} // Wajib mengikuti state untuk bypass kebijakan autoplay browser
            preload="auto"   // Menginstruksikan browser mem-buffer video lebih awal agar cepat dimuat
            onEnded={handleFinish}
            className="w-full h-full object-cover"
          >
            {/* Mengambil file dari direktori public aplikasi */}
            <source src="/Bilano-Preview.mp4" type="video/mp4" />
            Browser Anda tidak mendukung pemutar video.
          </video>
          {/* Lapisan Gradasi Gelap agar Teks di Atas Video Mudah Dibaca */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70"></div>
        </div>

        {/* ⏱️ FITUR: COUNTDOWN TIMER DI KANAN ATAS VIDEO (MELAYANG) */}
        <div className="absolute top-4 right-4 z-30">
          {!canSkip ? (
            <div className="bg-black/60 backdrop-blur-md text-white font-mono font-bold text-xs px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-md animate-in fade-in duration-300">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
              Skip dalam {countdown}s
            </div>
          ) : (
            <div className="bg-emerald-500/80 backdrop-blur-md text-white font-bold text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full border border-emerald-400/20 shadow-md animate-in zoom-in duration-300">
              Siap Lewati
            </div>
          )}
        </div>

        {/* 🎛️ Header Video Controls (Kiri Atas) */}
        <div className="w-full flex justify-between items-center z-10 relative">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setIsMuted(!isMuted)} 
              className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-95 transition-transform"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>

        {/* 🚀 Informasi Konten Bagian Bawah Jendela Video */}
        <div className="w-full z-10 relative flex flex-col gap-1">
          <span className="text-xs font-black tracking-widest text-amber-400 uppercase drop-shadow">Eksklusif Preview</span>
          <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md">Kawal Visi Finansialmu Bersama BILANO</h2>
          <p className="text-slate-300 text-xs font-medium leading-relaxed drop-shadow-sm">Lihat bagaimana BILANO membantu mengeksekusi target nominal besarmu secara otomatis.</p>
        </div>
      </div>

      {/* 🚀 Tombol Skip Aksi Utama (Berada di Bawah/Luar Frame Video) */}
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        {!canSkip ? (
          <div className="w-full text-center py-4 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl text-slate-400 font-bold text-xs tracking-widest uppercase">
            Mempersiapkan Sistem...
          </div>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0a1128] font-black text-sm md:text-base py-4 px-8 rounded-2xl shadow-[0_10px_40px_rgba(251,191,36,0.3)] hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 border-b-[5px] border-amber-600 toggle-skip-btn"
          >
            LEWATIKAN & LANJUTKAN <ArrowRight size={20} className="stroke-[3]" />
          </button>
        )}
      </div>

    </div>
  );
}