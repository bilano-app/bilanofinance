import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  ArrowRight, Download, CheckCircle2, X, Target, Fingerprint, Activity, Radar 
} from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  
  // State untuk melacak posisi halaman: 0-3 (Pertanyaan), 4 (Summary), 5 (Pricing), 6 (Install PWA)
  const [step, setStep] = useState(0);
  const [fade, setFade] = useState(true);
  
  // Menyimpan jawaban pengguna
  const [answers, setAnswers] = useState({
    q1: "",
    q2: "",
    q3: "",
    q4: 0
  });

  // State untuk popup pricing
  const [selectedPlan, setSelectedPlan] = useState<"year" | "month" | null>(null);

  // =======================================================
  // 🚀 LOGIKA PWA INSTALLER NATIVE
  // =======================================================
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault(); 
      setDeferredPrompt(e); 
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('BILANO sedang diinstall...');
      }
      setDeferredPrompt(null);
    } else {
      alert("PEMBERITAHUAN:\n\nSistem perangkat Anda memblokir popup otomatis. Silakan buka menu browser (titik tiga atau ikon Share) lalu pilih 'Install App' atau 'Tambahkan ke Layar Utama' (Add to Home Screen) untuk memasang BILANO.");
    }
  };

  // =======================================================
  // 🚀 FUNGSI TRANSISI PERTANYAAN
  // =======================================================
  const handleAnswer = (key: string, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    
    // Trigger fade out
    setFade(false);
    
    // Ganti pertanyaan saat layar sedang transparan, lalu fade in lagi
    setTimeout(() => {
      setStep(prev => prev + 1);
      setFade(true);
    }, 300);
  };

  const handleBayar = () => {
    setSelectedPlan(null); // Tutup popup
    setFade(false);
    setTimeout(() => {
      setStep(6); // Lanjut ke halaman Install PWA
      setFade(true);
    }, 300);
  };

  // =======================================================
  // 🚀 MESIN DIAGNOSTIK PROFIL FINANSIAL
  // =======================================================
  const getAssessment = () => {
    const { q1, q2, q3, q4 } = answers;
    const score = Number(q4);
    const yesCount = [q1, q2, q3].filter(a => a === 'Ya').length;

    // KONDISI 1: Niat kuat, siap eksekusi
    if (yesCount === 3 && score >= 8) {
      return {
        title: "Profil: Eksekutor Visioner",
        desc: `Kalkulasi menunjukkan sinkronisasi sempurna antara visi dan kesiapan mental (Skor Urgensi: ${score}/10). Anda tidak butuh motivasi dasar; Anda butuh alat presisi. Bilano akan langsung bekerja sebagai sistem pemantauan brutal untuk memastikan aset Anda terakumulasi sesuai rencana, tanpa kompromi.`,
        icon: <Target className="w-8 h-8" />
      };
    } 
    // KONDISI 2: Kurang konsisten/jelas, tapi mau berusaha
    else if (yesCount >= 2 && score >= 6) {
      return {
        title: "Profil: Pembangun Sistem",
        desc: `Anda memiliki kesadaran finansial yang logis (Skor Urgensi: ${score}/10) dan kemauan membangun kebiasaan, meski visi masa depan Anda mungkin belum 100% presisi. Ini adalah pijakan ideal. Bilano akan bertindak sebagai kerangka otomatis Anda—mengunci pengeluaran impulsif dan menuntut Anda disiplin setiap hari.`,
        icon: <Fingerprint className="w-8 h-8" />
      };
    } 
    // KONDISI 3: Tahu penting (skor tinggi), tapi malas gerak (Q3 = Tidak)
    else if (q3 === 'Tidak' && score >= 7) {
      return {
        title: "Profil: Paradoks Analitis",
        desc: `Data menunjukkan anomali logis: Anda tahu target keuangan itu sangat penting (Skor: ${score}/10), tapi Anda menolak membangun kebiasaan kecil. Niat tanpa eksekusi adalah ilusi matematis. Bilano didesain untuk mendobrak kepasifan ini dengan menyajikan realita arus kas Anda secara brutal dan transparan.`,
        icon: <Activity className="w-8 h-8" />
      };
    } 
    // KONDISI 4: Skor rendah atau mayoritas Tidak
    else {
      return {
        title: "Profil: Pengamat Pasif",
        desc: `Skor kalkulasi Anda (${score}/10) menunjukkan Anda belum sepenuhnya menyadari bahaya kebocoran finansial, atau masih meraba-raba tujuan. Tidak masalah. Daripada menebak, gunakan Bilano sebagai cermin realita. Biarkan data murni yang membuktikan seberapa banyak uang Anda yang menguap tanpa jejak bulan ini.`,
        icon: <Radar className="w-8 h-8" />
      };
    }
  };

  const assessment = getAssessment();

  // =======================================================
  // 🚀 RENDERER HALAMAN
  // =======================================================
  return (
    <div className="min-h-[100dvh] bg-[#040814] w-full text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg z-10 flex flex-col items-center">
        
        {/* =========================================
            BAGIAN 1: PERTANYAAN KUIS (STEP 0 - 3)
        ========================================= */}
        {step < 4 && (
          <div className="w-full flex flex-col items-center">
            {/* Progress Bar (Model Garis) */}
            <div className="flex items-center gap-2 mb-10">
              {[0, 1, 2, 3].map((idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    step >= idx ? "w-8 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "w-4 bg-slate-700"
                  }`}
                />
              ))}
            </div>
            
            <span className="text-amber-400 font-bold text-sm tracking-widest mb-6 uppercase">
              Pertanyaan {step + 1} / 4
            </span>

            {/* Container Transisi */}
            <div className={`transition-opacity duration-300 w-full flex flex-col items-center text-center ${fade ? 'opacity-100' : 'opacity-0'}`}>
              
              {step === 0 && (
                <>
                  <h2 className="text-2xl md:text-3xl font-black leading-snug mb-10">
                    Apakah kamu ingin masa depan finansialmu lebih terencana dibanding sekarang?
                  </h2>
                  <div className="w-full space-y-4">
                    <button onClick={() => handleAnswer('q1', 'Ya')} className="w-full py-4 rounded-2xl bg-[#121c3a] border border-white/10 hover:border-amber-400/50 hover:bg-[#172447] text-lg font-bold transition-all active:scale-95">Ya</button>
                    <button onClick={() => handleAnswer('q1', 'Tidak')} className="w-full py-4 rounded-2xl bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 text-lg font-bold transition-all active:scale-95">Tidak</button>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="text-2xl md:text-3xl font-black leading-snug mb-10">
                    Apakah kamu termasuk orang yang ingin punya visi/arah keuangan yang jelas untuk masa depan?
                  </h2>
                  <div className="w-full space-y-4">
                    <button onClick={() => handleAnswer('q2', 'Ya')} className="w-full py-4 rounded-2xl bg-[#121c3a] border border-white/10 hover:border-amber-400/50 hover:bg-[#172447] text-lg font-bold transition-all active:scale-95">Ya</button>
                    <button onClick={() => handleAnswer('q2', 'Tidak')} className="w-full py-4 rounded-2xl bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 text-lg font-bold transition-all active:scale-95">Tidak</button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-2xl md:text-3xl font-black leading-snug mb-10">
                    Apakah kamu bersedia membangun kebiasaan kecil setiap hari demi tujuan finansialmu, dengan bantuan Bilano?
                  </h2>
                  <div className="w-full space-y-4">
                    <button onClick={() => handleAnswer('q3', 'Ya')} className="w-full py-4 rounded-2xl bg-[#121c3a] border border-white/10 hover:border-amber-400/50 hover:bg-[#172447] text-lg font-bold transition-all active:scale-95">Ya</button>
                    <button onClick={() => handleAnswer('q3', 'Tidak')} className="w-full py-4 rounded-2xl bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 text-lg font-bold transition-all active:scale-95">Tidak</button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="text-2xl md:text-3xl font-black leading-snug mb-4">
                    Seberapa penting bagi kamu untuk punya target keuangan yang jelas dan terarah?
                  </h2>
                  <p className="text-slate-400 mb-8 text-sm">Pilih skala 1 (Tidak Penting) hingga 10 (Sangat Penting)</p>
                  
                  <div className="flex flex-wrap justify-center gap-3 w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button 
                        key={num}
                        onClick={() => handleAnswer('q4', num)}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#121c3a] border border-white/10 text-white font-black text-lg hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all active:scale-90 flex items-center justify-center"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        {/* =========================================
            BAGIAN 2: RINGKASAN PERSONAL (STEP 4)
        ========================================= */}
        {step === 4 && (
          <div className={`transition-opacity duration-500 w-full flex flex-col items-center text-center bg-[#121c3a]/50 p-8 rounded-[32px] border border-white/10 backdrop-blur-md shadow-2xl ${fade ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-16 h-16 bg-amber-400/20 text-amber-400 rounded-full flex items-center justify-center mb-6">
              {assessment.icon}
            </div>
            <h2 className="text-2xl font-black mb-4">{assessment.title}</h2>
            <p className="text-slate-300 leading-relaxed mb-8 text-[15px]">
              {assessment.desc}
              <br/><br/>
              <span className="font-bold text-white">Mari kita eksekusi sistem ini sekarang.</span>
            </p>
            <button 
              onClick={() => {
                setFade(false);
                setTimeout(() => { setStep(5); setFade(true); }, 300);
              }}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-lg py-4 rounded-2xl shadow-[0_10px_30px_rgba(251,191,36,0.3)] active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              Dapatkan Bilano <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* =========================================
            BAGIAN 3: HALAMAN PRICING (STEP 5)
        ========================================= */}
        {step === 5 && (
          <div className={`transition-opacity duration-500 w-full flex flex-col items-center ${fade ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black mb-2">Investasi Masa Depan</h2>
              <p className="text-slate-400 text-sm">Pilih paket akses penuh untuk menggunakan Bilano.</p>
            </div>

            {/* Paket Utama (1 Tahun) */}
            <button 
              onClick={() => setSelectedPlan('year')}
              className="relative w-full bg-[#121c3a] border-2 border-amber-400/80 rounded-[28px] p-6 text-left hover:bg-[#172447] hover:border-amber-400 transition-all mb-6 group overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-amber-400 text-black text-[10px] font-black px-4 py-1.5 rounded-bl-xl rounded-tr-[24px] uppercase tracking-wider">
                Paling Hemat
              </div>
              <h3 className="text-xl font-black text-white mb-1">Paket Akses Setahun</h3>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-3xl font-black text-amber-400">Rp8.250</span>
                <span className="text-slate-400 text-sm mb-1">/ bulan</span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Akses penuh 12 Bulan</li>
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Fitur Asisten AI & Scanner</li>
              </ul>
            </button>

            {/* Opsi Coba Dulu (1 Bulan) */}
            <button 
              onClick={() => setSelectedPlan('month')}
              className="text-slate-400 text-sm font-semibold hover:text-white transition-colors underline decoration-slate-600 underline-offset-4"
            >
              "Saya mau coba dulu" (Paket Sebulan Rp14.900)
            </button>
          </div>
        )}

        {/* =========================================
            BAGIAN 4: INSTALASI PWA (STEP 6)
        ========================================= */}
        {step === 6 && (
          <div className={`transition-opacity duration-500 w-full flex flex-col items-center text-center ${fade ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black mb-4">Pembayaran Berhasil!</h2>
            <p className="text-slate-300 mb-10 leading-relaxed text-[15px]">
              Akses Premium Anda telah aktif. Silakan pasang aplikasi BILANO ke perangkat Anda sekarang untuk mulai mengelola keuangan.
            </p>

            <button
              onClick={handlePwaInstall}
              className="w-full max-w-[400px] bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-[1.2rem] tracking-wide py-5 px-6 rounded-[24px] shadow-[0_15px_40px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[5px] border-amber-600 active:border-b-0 active:translate-y-[5px]"
            >
              <Download strokeWidth={3} className="w-6 h-6 animate-bounce" />
              INSTALL BILANO SEKARANG
            </button>
          </div>
        )}

      </div>

      {/* =========================================
          MODAL POPUP DETAIL PEMBAYARAN
      ========================================= */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121c3a] border border-white/10 rounded-[32px] w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedPlan(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-xl font-black mb-6 pr-8">Konfirmasi Pembayaran</h3>
            
            <div className="bg-[#0a1128] rounded-2xl p-4 mb-6 border border-white/5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-400 text-sm">Paket Dipilih</span>
                <span className="font-bold text-white text-sm">
                  {selectedPlan === 'year' ? '12 Bulan' : '1 Bulan'}
                </span>
              </div>
              <div className="h-[1px] w-full bg-white/10 mb-3"></div>
              <div className="flex justify-between items-end">
                <span className="text-slate-300 font-medium">Total Tagihan</span>
                <span className="text-2xl font-black text-amber-400">
                  {selectedPlan === 'year' ? 'Rp99.000' : 'Rp14.900'}
                </span>
              </div>
            </div>

            <button 
              onClick={handleBayar}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              BAYAR SEKARANG
            </button>
          </div>
        </div>
      )}

    </div>
  );
}