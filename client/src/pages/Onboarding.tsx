import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  ArrowRight, CheckCircle2, X, Sparkles, 
  Crown, Gift, Loader2, ShieldCheck, ChevronRight,
  Sun, Sunset, Moon, HeartHandshake, Check,
  Magnet, Filter, Scissors, Sprout, LifeBuoy,
  Footprints, Wand2, Orbit, Gauge, Milestone,
  Flame, Crosshair, Coffee, Mountain, Cpu, Zap
} from "lucide-react";
import { Button } from "@/components/UIComponents";
import { setStoredUserGoal, UserGoal } from "@/lib/welcome-deal";
import { saveUserCommitment } from "@/lib/trial-manager";
import { useUser } from "@/hooks/use-finance";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const userEmail = localStorage.getItem("bilano_email") || user?.email || "";

  const [step, setStep] = useState<1 | 2 | 3 | "analyzing" | "result" | "commitment">(1);

  const getEmotionalProfile = (goal: UserGoal) => {
    switch (goal) {
      case "income":
        return {
          title: "Potensi Skala Besar Terdeteksi",
          description: "Anda memiliki mentalitas pertumbuhan yang luar biasa. Ketidakpuasan pada stagnasi penghasilan saat ini adalah bahan bakar terbaik. Anda siap mendobrak batasan.",
          highlight: "Sangat Cocok untuk Akselerasi",
          emotion: "Ambisius & Proaktif",
          score: 94
        };
      case "leakage":
        return {
          title: "Kesadaran Finansial Tingkat Tinggi",
          description: "Mengakui adanya kebocoran halus butuh kedewasaan finansial yang besar. Anda telah mengambil langkah krusial pertama menuju ketenangan batin dan kontrol total atas uang Anda.",
          highlight: "Siap Memegang Kendali Penuh",
          emotion: "Lega & Berdaya",
          score: 90
        };
      case "debt":
        return {
          title: "Mentalitas Pejuang Finansial",
          description: "Membawa beban cicilan memang melelahkan, tetapi tekad Anda untuk memutus rantai ini jauh lebih kuat. Anda berada di titik balik sempurna untuk membalikkan posisi menjadi pemilik aset.",
          highlight: "Fokus & Bertekad Baja",
          emotion: "Tangguh & Terfokus",
          score: 96
        };
      case "invest":
        return {
          title: "Visi Investor & Compounder Sejati",
          description: "Anda menyadari bahwa kerja keras harus diimbangi dengan uang yang bekerja untuk Anda. Membangun portofolio multi-aset adalah tiket tercepat menuju kebebasan waktu dan finansial.",
          highlight: "Mentalitas Pemilik Aset",
          emotion: "Visioner & Terencana",
          score: 93
        };
      case "emergency":
        return {
          title: "Pondasi Ketahanan Fortress Kuat",
          description: "Membangun benteng keamanan sebelum ekspansi adalah tanda kedewasaan finansial tertinggi. Ketenangan pikiran Anda akan menjadi fondasi kokoh bagi seluruh impian masa depan.",
          highlight: "Pilar Pertahanan Kokoh",
          emotion: "Tenang & Penuh Perhitungan",
          score: 91
        };
      default:
        return {
          title: "Potensi Skala Besar Terdeteksi",
          description: "Anda memiliki mentalitas pertumbuhan yang luar biasa. Ketidakpuasan pada stagnasi penghasilan saat ini adalah bahan bakar terbaik. Anda siap mendobrak batasan.",
          highlight: "Sangat Cocok untuk Akselerasi",
          emotion: "Ambisius & Proaktif",
          score: 92
        };
    }
  };
  const [selectedGoal, setSelectedGoal] = useState<UserGoal>("income");
  const [selectedChallenge, setSelectedChallenge] = useState<string>("Sering lupa & ga sadar uang habis ke mana");
  const [selectedPace, setSelectedPace] = useState<string>("Fokus & Terarah (1 - 3 Bulan ke Depan)");

  // State untuk Halaman Komitmen + Trial Notice
  const [selectedReminder, setSelectedReminder] = useState<"pagi" | "siang" | "malam">("malam");
  const [isCommitted, setIsCommitted] = useState<boolean>(true);
  const [isSubmittingCommitment, setIsSubmittingCommitment] = useState<boolean>(false);

  // Ketika masuk step "analyzing", beri delay 1.5 detik agar terasa diproses oleh AI
  useEffect(() => {
    if (step === "analyzing") {
      const timer = setTimeout(() => {
        setStoredUserGoal(selectedGoal, userEmail);
        setStep("result");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, selectedGoal, userEmail]);

  const handleSkip = () => {
    setStoredUserGoal(selectedGoal, userEmail);
    saveUserCommitment({ reminderTime: selectedReminder, userEmail });
    setLocation("/setup-balance");
  };

  const handleNextStep1 = (goal: UserGoal) => {
    setSelectedGoal(goal);
    setStep(2);
  };

  const handleNextStep2 = (challenge: string) => {
    setSelectedChallenge(challenge);
    setStep(3);
  };

  const handleNextStep3 = (pace: string) => {
    setSelectedPace(pace);
    setStep("analyzing");
  };

  const handleStartTrial = async () => {
    setIsSubmittingCommitment(true);
    try {
      setStoredUserGoal(selectedGoal, userEmail);
      await saveUserCommitment({
        reminderTime: selectedReminder,
        userEmail
      });
      setLocation("/setup-balance");
    } catch (err) {
      setLocation("/setup-balance");
    } finally {
      setIsSubmittingCommitment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1128] via-[#0f1d40] to-[#0a1128] text-white flex flex-col items-center justify-between p-4 sm:p-5">
      
      {/* HEADER / NAVIGATION BAR */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1.5 shadow-sm shrink-0">
            <img src="/BILANO-ICON-NEW.png" alt="BILANO" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs font-black tracking-widest text-slate-200 uppercase">
            BILANO ONBOARDING
          </span>
        </div>

        {/* TOMBOL LEWATI */}
        <button
          onClick={handleSkip}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
        >
          <span>Lewati</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* STEP 1: TUJUAN UTAMA (5 PILIHAN DENGAN IKON KHAS) */}
      {step === 1 && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center py-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-2">
            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
              Langkah 1 dari 3
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-2 mb-1.5 leading-tight">
            Apa target finansial terbesarmu saat ini?
          </h1>
          <p className="text-xs text-slate-400 mb-4 font-medium leading-relaxed">
            Pilih satu fokus utama agar BILANO dapat menyesuaikan arsitektur sistem dan rekomendasi blueprint akun Anda.
          </p>

          <div className="space-y-2.5">
            {/* 1. INCOME */}
            <button
              onClick={() => handleNextStep1("income")}
              className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-amber-400/20 hover:to-white/10 border border-white/10 hover:border-amber-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-xs">
                  <Magnet className="w-5 h-5 text-amber-300" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors truncate">
                    Cari Pemasukan & Cuan Baru
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                    Buka aliran cuan sampingan & lipatgandakan kas masuk
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-300 transition-colors shrink-0 ml-2" />
            </button>

            {/* 2. LEAKAGE */}
            <button
              onClick={() => handleNextStep1("leakage")}
              className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-emerald-500/20 hover:to-white/10 border border-white/10 hover:border-emerald-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-xs">
                  <Filter className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300 transition-colors truncate">
                    Stop Kebocoran Kas Halus
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                    Gaji sering numpang lewat, amankan dana bocor & perkuat tabungan
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-300 transition-colors shrink-0 ml-2" />
            </button>

            {/* 3. DEBT */}
            <button
              onClick={() => handleNextStep1("debt")}
              className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-sky-500/20 hover:to-white/10 border border-white/10 hover:border-sky-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0 shadow-xs">
                  <Scissors className="w-5 h-5 text-sky-300" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-sky-300 transition-colors truncate">
                    Bebas Utang & Pelunasan Cepat
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                    Pangkas cicilan lebih awal dengan strategi kalkulasi terarah
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-300 transition-colors shrink-0 ml-2" />
            </button>

            {/* 4. INVEST */}
            <button
              onClick={() => handleNextStep1("invest")}
              className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-purple-500/20 hover:to-white/10 border border-white/10 hover:border-purple-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-xs">
                  <Sprout className="w-5 h-5 text-purple-300" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-purple-300 transition-colors truncate">
                    Kembangkan Portofolio & Investasi
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                    Putar modal ke saham, valas & instrumen bertumbuh
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-300 transition-colors shrink-0 ml-2" />
            </button>

            {/* 5. EMERGENCY */}
            <button
              onClick={() => handleNextStep1("emergency")}
              className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-rose-500/20 hover:to-white/10 border border-white/10 hover:border-rose-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0 shadow-xs">
                  <LifeBuoy className="w-5 h-5 text-rose-300" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-rose-300 transition-colors truncate">
                    Bentuk Dana Darurat & Proteksi
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                    Siapkan bantalan kas 3-6 bulan untuk ketenangan batin mutlak
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-300 transition-colors shrink-0 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TANTANGAN TERBESAR (5 PILIHAN DENGAN IKON KHAS) */}
      {step === 2 && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center py-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-2">
            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
              Langkah 2 dari 3
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-2 mb-1.5 leading-tight">
            Apa kendala terbesarmu saat mengelola uang?
          </h1>
          <p className="text-xs text-slate-400 mb-4 font-medium leading-relaxed">
            BILANO memiliki mesin otomatisasi cerdas untuk menuntaskan titik rawan ini.
          </p>

          <div className="space-y-2.5">
            {[
              { 
                title: "Sering lupa & ga sadar uang habis ke mana", 
                desc: "Butuh radar deteksi kebocoran otomatis & audit realtime", 
                icon: Footprints, 
                color: "text-amber-300 bg-amber-400/20 border-amber-400/30" 
              },
              { 
                title: "Malas & ribet mencatat struk belanja manual", 
                desc: "Butuh Smart Scanner OCR & Dikte Suara instan", 
                icon: Wand2, 
                color: "text-sky-300 bg-sky-500/20 border-sky-400/30" 
              },
              { 
                title: "Punya tabungan tapi bingung cara memutarnya", 
                desc: "Perlu panduan alokasi 50/30/20 & strategi portofolio", 
                icon: Orbit, 
                color: "text-purple-300 bg-purple-500/20 border-purple-400/30" 
              },
              { 
                title: "Sering overbudget karena belanja impulsif", 
                desc: "Perlu batas limit harian/bulanan ketat & alarm defisit", 
                icon: Gauge, 
                color: "text-rose-300 bg-rose-500/20 border-rose-400/30" 
              },
              { 
                title: "Belum punya roadmap & milestone masa depan", 
                desc: "Butuh Blueprint langkah demi langkah kebebasan finansial", 
                icon: Milestone, 
                color: "text-emerald-300 bg-emerald-500/20 border-emerald-400/30" 
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleNextStep2(item.title)}
                  className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/10 hover:border-brand-gold/60 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors truncate">
                        {item.title}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-300 transition-colors shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: KOMITMEN WAKTU (5 PILIHAN DENGAN IKON KHAS) */}
      {step === 3 && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center py-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-2">
            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
              Langkah 3 dari 3
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-2 mb-1.5 leading-tight">
            Seberapa cepat kamu ingin melihat perubahan finansial?
          </h1>
          <p className="text-xs text-slate-400 mb-4 font-medium leading-relaxed">
            Pilih ritme yang paling selaras dengan gaya hidup dan kesiapan komitmenmu.
          </p>

          <div className="space-y-2.5">
            {[
              { 
                title: "Akselerasi Kilat (1 Bulan Pertama)", 
                desc: "Siap gaspol disiplin penuh, pangkas pemborosan & coba peluang cuan baru", 
                badge: "Ultra Fast",
                icon: Flame,
                color: "text-amber-300 bg-amber-400/20 border-amber-400/30"
              },
              { 
                title: "Fokus & Terarah (1 - 3 Bulan ke Depan)", 
                desc: "Komitmen konsisten membangun kebiasaan sehat dan akumulasi kas nyata", 
                badge: "Direkomendasikan",
                icon: Crosshair,
                color: "text-emerald-300 bg-emerald-500/20 border-emerald-400/30"
              },
              { 
                title: "Santai & Bertahap (3 - 6 Bulan)", 
                desc: "Mulai pelan-pelan dari pencatatan dasar tanpa tekanan berlebih", 
                badge: "Fleksibel",
                icon: Coffee,
                color: "text-sky-300 bg-sky-500/20 border-sky-400/30"
              },
              { 
                title: "Jangka Panjang & Fondasi Kokoh (> 6 Bulan)", 
                desc: "Fokus compounding aset, pembentukan dividen & stabilitas berkelanjutan", 
                badge: "Sustainable",
                icon: Mountain,
                color: "text-purple-300 bg-purple-500/20 border-purple-400/30"
              },
              { 
                title: "Sesuai Ritme Dinamis (Adaptif)", 
                desc: "Biarkan AI BILANO menyesuaikan target fleksibel mengikuti arus kas Anda", 
                badge: "Smart AI Mode",
                icon: Cpu,
                color: "text-indigo-300 bg-indigo-500/20 border-indigo-400/30"
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleNextStep3(item.title)}
                  className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/10 hover:border-brand-gold/60 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.2 rounded-md">
                          {item.badge}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors mt-0.5 truncate">
                        {item.title}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-300 transition-colors shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP: ANALYZING ANIMATION */}
      {step === "analyzing" && (
        <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-brand-gold/20 border-2 border-brand-gold flex items-center justify-center mb-6 animate-spin">
            <Sparkles className="w-8 h-8 text-brand-gold" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">
            Menganalisis Profil Finansial Anda...
          </h2>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Menyusun formula alokasi kas, kalkulasi risiko, dan menyiapkan rekomendasi blueprint personal.
          </p>
        </div>
      )}

      {/* STEP: RESULT (EMOTIONAL VALIDATION) */}
      {step === "result" && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={2.25} />
            </div>
            <h2 className="text-2xl font-black text-white leading-tight mb-2 tracking-tight">
              {getEmotionalProfile(selectedGoal).title}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-medium px-1">
              {getEmotionalProfile(selectedGoal).description}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 mb-6 shadow-md relative">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/10">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                  Karakter Finansial Anda
                </span>
                <p className="text-[11px] text-slate-400 font-semibold">
                  Analisis profil mental & kesiapan
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="bg-black/25 rounded-2xl p-3.5 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                    State Psikologis
                  </p>
                  <p className="text-sm font-black text-white">
                    {getEmotionalProfile(selectedGoal).emotion}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                  <Zap className="w-4 h-4 text-amber-300" />
                </div>
              </div>

              <div className="bg-black/25 rounded-2xl p-3.5 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                    Status Kesiapan
                  </p>
                  <p className="text-sm font-black text-emerald-400">
                    {getEmotionalProfile(selectedGoal).highlight}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl shrink-0">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Skor</span>
                  <span className="text-sm font-black text-emerald-300 font-mono">{getEmotionalProfile(selectedGoal).score}</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setStep("commitment")}
            className="w-full h-14 rounded-2xl text-xs font-black tracking-widest flex items-center justify-center gap-2 bg-white text-brand-navy hover:bg-slate-100 shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <span>LANJUTKAN & AMBIL KOMITMEN</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Button>
        </div>
      )}

      {/* STEP: [BARU] HALAMAN KOMITMEN + TRIAL NOTICE (SATU HALAMAN, DUA BAGIAN) */}
      {step === "commitment" && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-500 py-2 space-y-5">
          
          {/* BAGIAN A — KOMITMEN IMPLEMENTASI */}
          <div className="bg-gradient-to-b from-[#14234b]/90 to-[#0c1735]/90 border-2 border-brand-gold/60 rounded-3xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <HeartHandshake className="w-3 h-3" />
                KOMITMEN PRIBADI
              </span>
            </div>

            <h2 className="text-base font-black text-white mb-1.5 leading-snug">
              Banyak orang niat rutin catat keuangan, tapi cuma sedikit yang benar-benar bertahan.
            </h2>
            <p className="text-xs text-amber-300 font-bold mb-4 leading-relaxed">
              Kamu mau jadi salah satu yang berhasil membangun kebiasaan ini?
            </p>

            {/* Implementation Intention: Jam Reminder */}
            <div className="space-y-2 mb-2">
              <label className="text-[11px] font-black text-slate-200 uppercase tracking-wide block">
                Jam berapa paling pas buat diingatkan mencatat tiap hari?
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "pagi", label: "Pagi", time: "08:00", icon: Sun, desc: "Rencana kas hari ini" },
                  { id: "siang", label: "Siang", time: "13:00", icon: Sunset, desc: "Evaluasi makan siang" },
                  { id: "malam", label: "Malam", time: "20:00", icon: Moon, desc: "Rekap total belanja", rec: true },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedReminder === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedReminder(item.id as any)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-amber-400/20 border-amber-400 text-white shadow-md shadow-amber-400/10 scale-102"
                          : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
                      }`}
                    >
                      {item.rec && (
                        <span className="absolute -top-2 left-2 bg-amber-400 text-brand-navy text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Pilihan Pas
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-1.5 mt-0.5">
                        <Icon className={`w-4 h-4 ${isSelected ? "text-amber-300" : "text-slate-400"}`} />
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-xs font-black leading-none">{item.label}</p>
                        <p className="text-[10px] text-amber-300 font-mono font-bold mt-0.5">{item.time}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BAGIAN B — TRIAL NOTICE (HADIAH KOMITMEN) */}
          <div className="bg-white/5 border border-emerald-400/30 rounded-3xl p-5 shadow-lg relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Gift className="w-3 h-3 text-emerald-300" />
                HADIAH KOMITMEN
              </span>
            </div>

            <h3 className="text-base font-black text-white mb-1.5 leading-snug">
              Akses Penuh 7 Hari Aktif untuk Anda
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-3.5 font-medium">
              Selama <strong>7 hari ke depan</strong>, semua fitur BILANO — <strong className="text-amber-300 font-black">TERMASUK yang biasanya premium</strong> — bisa kamu coba 100% gratis tanpa biaya.
            </p>

            {/* Checklist Fitur yang Terbuka Selama Trial */}
            <div className="bg-black/25 rounded-2xl p-3 border border-white/5 space-y-1.5 mb-3 text-[11px]">
              <div className="flex items-center gap-2 text-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>AI Smart Scanner Struk & Suara (Unlimited)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Portofolio Investasi Saham, Kripto & Valas Multi-Mata Uang</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Chat AI Konsultan Finansial 24/7 & Laporan Arus Kas</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Akses Seluruh Koleksi 5 E-Book Finansial Academy</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tanpa tagihan diam-diam • Langsung pakai tanpa kartu kredit</span>
            </p>
          </div>

          {/* CTA ACTION BUTTON */}
          <div className="space-y-2 pt-1">
            <Button
              disabled={isSubmittingCommitment}
              onClick={handleStartTrial}
              className="w-full h-14 rounded-2xl text-xs font-black tracking-widest flex items-center justify-center gap-2 bg-gradient-to-r from-brand-gold to-[#f5d77a] text-brand-navy hover:from-[#f2ce5d] hover:to-brand-gold shadow-xl cursor-pointer"
            >
              {isSubmittingCommitment ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>MULAI AKSES PENUH 7 HARI</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="w-full max-w-md text-center py-2">
        <p className="text-[10px] text-slate-500 font-semibold">
          BILANO Finance App • Privasi & Data Terenkripsi
        </p>
      </div>
    </div>
  );
}