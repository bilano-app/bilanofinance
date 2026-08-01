import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";

export default function VideoPreview() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setSkip] = useState(false);
  
  // State untuk timer durasi video (kanan atas)
  const [timeLeft, setTimeLeft] = useState(0);

  // Wajib true di awal agar fitur autoplay tidak diblokir browser
  const [isMuted, setIsMuted] = useState(true); 
  const videoRef = useRef<HTMLVideoElement>(null);

  // ⏱️ Logika Timer Skip (Tombol Bawah)
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

  // ⏱️ Fungsi untuk mengambil total durasi video saat pertama kali dimuat
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setTimeLeft(e.currentTarget.duration);
  };

  // ⏱️ Fungsi untuk mengupdate sisa waktu setiap kali video berputar
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const remaining = Math.max(0, video.duration - video.currentTime);
    setTimeLeft(remaining);
  };

  // 🛠️ Konversi detik ke format MM:SS (contoh: 00:33)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-[100dvh] bg-[#040814] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* ✨ Ambient Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* 📦 Kontainer Utama Video (Cinematic Frame Horizontal 16:9) */}
      <div className="w-full max-w-4xl aspect-video bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.7)] border border-white/5 relative mb-8">
        
        {/* 🎥 Background Video Player */}
        <div className="absolute inset-0 z-0">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline
            muted={isMuted}
            preload="auto"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleFinish}
            className="w-full h-full object-cover"
          >
            <source src="/Bilano-Preview.mp4" type="video/mp4" />
            Browser Anda tidak mendukung pemutar video.
          </video>
          {/* Lapisan Gradasi Tipis agar kontrol lebih jelas terbaca */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60"></div>
        </div>

        {/* ⏱️ FITUR: SISA DURASI VIDEO (KANAN ATAS) */}
        <div className="absolute top-6 right-6 z-30">
          <div className="bg-black/60 backdrop-blur-md text-white font-mono font-bold text-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-md">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* 🎛️ Header Video Controls (Kiri Atas) */}
        <div className="absolute top-6 left-6 z-30 flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setIsMuted(!isMuted)} 
            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-95 transition-transform hover:bg-black/60"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        {/* 🚀 Informasi Konten Bagian Kiri Bawah */}
        <div className="absolute bottom-6 left-6 z-30 flex flex-col gap-1 max-w-lg">
          <span className="text-xs font-black tracking-widest text-amber-400 uppercase drop-shadow">Eksklusif Preview</span>
          <h2 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md">Kawal Visi Finansialmu Bersama BILANO</h2>
          <p className="text-slate-300 text-sm font-medium leading-relaxed drop-shadow-sm hidden md:block">Lihat bagaimana BILANO membantu mengeksekusi target nominal besarmu secara otomatis.</p>
        </div>
      </div>

      {/* 🚀 Tombol Skip Aksi Utama (Bawah Frame Video) */}
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        {!canSkip ? (
          <div className="w-full text-center py-4 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl text-slate-400 font-bold text-xs tracking-widest uppercase shadow-inner">
            Mempersiapkan Sistem... <span className="text-amber-400 ml-1">{countdown}s</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0a1128] font-black text-sm md:text-base py-4 px-8 rounded-2xl shadow-[0_10px_40px_rgba(251,191,36,0.3)] hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 border-b-[5px] border-amber-600 animate-in zoom-in duration-300"
          >
            LEWATIKAN & LANJUTKAN <ArrowRight size={20} className="stroke-[3]" />
          </button>
        )}
      </div>

    </div>
  );
}