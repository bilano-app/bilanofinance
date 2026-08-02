import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Volume2, VolumeX, Play } from "lucide-react";

export default function VideoPreview() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setSkip] = useState(false);
  
  // State untuk kontrol play dan transisi
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  // Sisa durasi video (kanan atas)
  const [timeLeft, setTimeLeft] = useState(0);

  // Default mute dihapus karena user akan interaksi via tombol play
  const [isMuted, setIsMuted] = useState(false); 
  const videoRef = useRef<HTMLVideoElement>(null);

  // ⏱️ Logika Timer Skip: Hanya berjalan JIKA isPlaying true
  useEffect(() => {
    if (isPlaying && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isPlaying && countdown === 0) {
      setSkip(true);
    }
  }, [countdown, isPlaying]);

  // Transisi mulus saat video selesai atau di-skip
  const handleFinish = () => {
    setIsExiting(true); // Memicu animasi fade-out
    setTimeout(() => {
      setLocation('/onboarding');
    }, 500); // Tunggu 500ms sampai animasi CSS selesai
  };

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      videoRef.current.muted = false; // Pastikan suara nyala
      setIsMuted(false);
      setIsPlaying(true);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setTimeLeft(e.currentTarget.duration);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const remaining = Math.max(0, video.duration - video.currentTime);
    setTimeLeft(remaining);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={`min-h-[100dvh] bg-[#040814] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-opacity duration-500 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* ✨ Ambient Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-4xl z-10 flex flex-col gap-2 mb-6 text-center md:text-left">
        <span className="text-xs font-black tracking-widest text-amber-400 uppercase drop-shadow">Eksklusif Preview</span>
        <h2 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-md">Kawal Visi Finansialmu Bersama BILANO</h2>
        <p className="text-slate-300 text-sm font-medium leading-relaxed drop-shadow-sm">Lihat bagaimana BILANO membantu mengeksekusi target nominal besarmu secara otomatis.</p>
      </div>

      <div className="w-full max-w-4xl aspect-video bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.7)] border border-white/5 relative mb-8">
        
        {/* 🎥 Video Player (Hilangkan autoPlay, biarkan script yang handle) */}
        <div className="absolute inset-0 z-0">
          <video 
            ref={videoRef}
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
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 via-transparent to-transparent h-24 z-10 pointer-events-none"></div>
        </div>

        {/* 🚀 OVERLAY TOMBOL PLAY (Hilang saat isPlaying = true) */}
        {!isPlaying && (
          <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center transition-all">
            <button 
              onClick={handlePlayVideo}
              className="w-20 h-20 bg-amber-400 text-[#0a1128] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.4)] hover:scale-110 hover:bg-amber-300 active:scale-95 transition-all mb-4"
            >
              <Play fill="currentColor" size={36} className="ml-2" />
            </button>
            <p className="text-white font-bold tracking-widest text-sm drop-shadow-md">TETAP TEKAN UNTUK MEMULAI</p>
          </div>
        )}

        <div className="absolute top-6 right-6 z-30">
          <div className="bg-black/60 backdrop-blur-md text-white font-mono font-bold text-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-md">
            <span className={`w-2 h-2 bg-red-500 rounded-full ${isPlaying ? 'animate-pulse' : ''}`}></span>
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="absolute top-6 left-6 z-30 flex items-center gap-2">
          <button 
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }} 
            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-95 transition-transform hover:bg-black/60"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm z-10">
        {!canSkip ? (
          <div className="w-full text-center py-4 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl text-slate-400 font-bold text-xs tracking-widest uppercase shadow-inner">
            {isPlaying ? (
              <>Bisa Dilewati Dalam... <span className="text-amber-400 ml-1">{countdown}s</span></>
            ) : (
              "Menunggu Video Dimulai..."
            )}
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