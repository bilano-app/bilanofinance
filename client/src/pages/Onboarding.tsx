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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-between p-4 sm:p-5 relative overflow-hidden">
      
      {/* DEKORASI BACKGROUND ATAS (SERASI DENGAN HOME) */}
      <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7]/40 to-transparent pointer-events-none" />

      {/* HEADER / NAVIGATION BAR */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 mb-4 relative z-10">
        <div className="flex items-center gap-2.5 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-xs">
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-1 shadow-xs shrink-0 border border-slate-100">
            <img src="/BILANO-ICON-NEW.png" alt="BILANO" className="w-full h-full object-contain" />
          </div>
          <span className="text-[11px] font-black tracking-wider text-slate-800 uppercase">
            BILANO ONBOARDING
          </span>
        </div>

        {/* TOMBOL LEWATI */}
        <button
          onClick={handleSkip}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1.5 px-3.5 rounded-full bg-white hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/90 shadow-xs active:scale-95"
        >
          <span>Lewati</span>
          <X className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* STEP 1: TUJUAN UTAMA (5 PILIHAN DENGAN STYLE HOME TERANG & ELEGAN) */}
      {step === 1 && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center py-2 animate-in fade-in slide-in-from-bottom-4 duration-300 relative z-10">
          <div className="mb-2">
            <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-widest bg-amber-100/90 px-3 py-1 rounded-full border border-amber-300/60 shadow-xs">
              Langkah 1 dari 3
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 mb-1.5 leading-tight tracking-tight">
            Apa target finansial terbesarmu saat ini?
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 mb-4 font-medium leading-relaxed">
            Pilih satu fokus utama agar BILANO dapat menyesuaikan arsitektur sistem dan rekomendasi blueprint akun Anda.
          </p>

          <div className="space-y-2.5">
            {/* 1. INCOME */}
            <button
              onClick={() => handleNextStep1("income")}
              className="w-full bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-[0.98] shadow-xs hover:shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-amber-100 transition-colors">
                  <Magnet className="w-5 h-5 text-amber-700" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-950 transition-colors truncate">
                    Cari Pemasukan & Cuan Baru
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    Buka aliran cuan sampingan & lipatgandakan kas masuk
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors shrink-0 ml-2" />
            </button>

            {/* 2. LEAKAGE */}
            <button
              onClick={() => handleNextStep1("leakage")}
              className="w-full bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-[0.98] shadow-xs hover:shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-amber-100 transition-colors">
                  <Filter className="w-5 h-5 text-amber-700" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-950 transition-colors truncate">
                    Stop Kebocoran Kas Halus
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    Gaji sering numpang lewat, amankan dana bocor & perkuat tabungan
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors shrink-0 ml-2" />
            </button>

            {/* 3. DEBT */}
            <button
              onClick={() => handleNextStep1("debt")}
              className="w-full bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-[0.98] shadow-xs hover:shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-amber-100 transition-colors">
                  <Scissors className="w-5 h-5 text-amber-700" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-950 transition-colors truncate">
                    Bebas Utang & Pelunasan Cepat
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    Pangkas cicilan lebih awal dengan strategi kalkulasi terarah
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors shrink-0 ml-2" />
            </button>

            {/* 4. INVEST */}
            <button
              onClick={() => handleNextStep1("invest")}
              className="w-full bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-[0.98] shadow-xs hover:shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-amber-100 transition-colors">
                  <Sprout className="w-5 h-5 text-amber-700" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-950 transition-colors truncate">
                    Kembangkan Portofolio & Investasi
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    Putar modal ke saham, valas & instrumen bertumbuh
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors shrink-0 ml-2" />
            </button>

            {/* 5. EMERGENCY */}
            <button
              onClick={() => handleNextStep1("emergency")}
              className="w-full bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-[0.98] shadow-xs hover:shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-amber-100 transition-colors">
                  <LifeBuoy className="w-5 h-5 text-amber-700" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-950 transition-colors truncate">
                    Bentuk Dana Darurat & Proteksi
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    Siapkan bantalan kas 3-6 bulan untuk ketenangan batin mutlak
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors shrink-0 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TANTANGAN TERBESAR */}
      {step === 2 && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center py-2 animate-in fade-in slide-in-from-bottom-4 duration-300 relative z-10">
          <div className="mb-2">
            <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-widest bg-amber-100/90 px-3 py-1 rounded-full border border-amber-300/60 shadow-xs">
              Langkah 2 dari 3
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 mb-1.5 leading-tight tracking-tight">
            Apa kendala terbesarmu saat mengelola uang?
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 mb-4 font-medium leading-relaxed">
            BILANO memiliki mesin otomatisasi cerdas untuk menuntaskan titik rawan ini.
          </p>

          <div className="space-y-2.5">
            {[
              { 
                title: "Sering lupa & ga sadar uang habis ke mana", 
                desc: "Butuh radar deteksi kebocoran otomatis & audit realtime", 
                icon: Footprints
              },
              { 
                title: "Malas & ribet mencatat struk belanja manual", 
                desc: "Butuh Smart Scanner OCR & Dikte Suara instan", 
                icon: Wand2
              },
              { 
                title: "Punya tabungan tapi bingung cara memutarnya", 
                desc: "Perlu panduan alokasi 50/30/20 & strategi portofolio", 
                icon: Orbit
              },
              { 
                title: "Sering overbudget karena belanja impulsif", 
                desc: "Perlu batas limit harian/bulanan ketat & alarm defisit", 
                icon: Gauge
              },
              { 
                title: "Belum punya roadmap & milestone masa depan", 
                desc: "Butuh Blueprint langkah demi langkah kebebasan finansial", 
                icon: Milestone
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleNextStep2(item.title)}
                  className="w-full bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-[0.98] shadow-xs hover:shadow-md flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-amber-100 transition-colors">
                      <Icon className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="truncate">
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-950 transition-colors truncate">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: KOMITMEN WAKTU */}
      {step === 3 && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center py-2 animate-in fade-in slide-in-from-bottom-4 duration-300 relative z-10">
          <div className="mb-2">
            <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-widest bg-amber-100/90 px-3 py-1 rounded-full border border-amber-300/60 shadow-xs">
              Langkah 3 dari 3
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 mb-1.5 leading-tight tracking-tight">
            Seberapa cepat kamu ingin melihat perubahan finansial?
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 mb-4 font-medium leading-relaxed">
            Pilih ritme yang paling selaras dengan gaya hidup dan kesiapan komitmenmu.
          </p>

          <div className="space-y-2.5">
            {[
              { 
                title: "Akselerasi Kilat (1 Bulan Pertama)", 
                desc: "Siap gaspol disiplin penuh, pangkas pemborosan & coba peluang cuan baru", 
                badge: "Ultra Fast",
                icon: Flame
              },
              { 
                title: "Fokus & Terarah (1 - 3 Bulan ke Depan)", 
                desc: "Komitmen konsisten membangun kebiasaan sehat dan akumulasi kas nyata", 
                badge: "Direkomendasikan",
                icon: Crosshair
              },
              { 
                title: "Santai & Bertahap (3 - 6 Bulan)", 
                desc: "Mulai pelan-pelan dari pencatatan dasar tanpa tekanan berlebih", 
                badge: "Fleksibel",
                icon: Coffee
              },
              { 
                title: "Jangka Panjang & Fondasi Kokoh (> 6 Bulan)", 
                desc: "Fokus compounding aset, pembentukan dividen & stabilitas berkelanjutan", 
                badge: "Sustainable",
                icon: Mountain
              },
              { 
                title: "Sesuai Ritme Dinamis (Adaptif)", 
                desc: "Biarkan AI BILANO menyesuaikan target fleksibel mengikuti arus kas Anda", 
                badge: "Smart AI Mode",
                icon: Cpu
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleNextStep3(item.title)}
                  className="w-full bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3 sm:p-3.5 text-left transition-all group cursor-pointer active:scale-[0.98] shadow-xs hover:shadow-md flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-amber-100 transition-colors">
                      <Icon className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300/60 px-2 py-0.5 rounded-md">
                          {item.badge}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-950 transition-colors mt-0.5 truncate">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP: ANALYZING ANIMATION */}
      {step === "analyzing" && (
        <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 relative z-10">
          <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center mb-6 shadow-md animate-spin">
            <Sparkles className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Menganalisis Profil Finansial Anda...
          </h2>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
            Menyusun formula alokasi kas, kalkulasi risiko, dan menyiapkan rekomendasi blueprint personal.
          </p>
        </div>
      )}

      {/* STEP: RESULT (EMOTIONAL VALIDATION) */}
      {step === "result" && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 py-4 relative z-10">
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={2.25} />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight mb-1.5 tracking-tight">
              {getEmotionalProfile(selectedGoal).title}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed font-medium px-1">
              {getEmotionalProfile(selectedGoal).description}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-5 shadow-xs relative">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest block">
                  Karakter Finansial Anda
                </span>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Analisis profil mental & kesiapan
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                    State Psikologis
                  </p>
                  <p className="text-sm font-extrabold text-slate-900">
                    {getEmotionalProfile(selectedGoal).emotion}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-amber-100/60 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                    Status Kesiapan
                  </p>
                  <p className="text-sm font-extrabold text-emerald-700">
                    {getEmotionalProfile(selectedGoal).highlight}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shrink-0">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Skor</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">{getEmotionalProfile(selectedGoal).score}</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setStep("commitment")}
            className="w-full h-14 rounded-2xl text-xs font-black tracking-widest flex items-center justify-center gap-2 bg-brand-gold hover:bg-[#e5a825] text-brand-navy shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <span>LANJUTKAN & AMBIL KOMITMEN</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Button>
        </div>
      )}

      {/* STEP: HALAMAN KOMITMEN + TRIAL NOTICE */}
      {step === "commitment" && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-500 py-2 space-y-4 relative z-10">
          
          {/* BAGIAN A — KOMITMEN IMPLEMENTASI */}
          <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-brand-navy text-brand-gold text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <HeartHandshake className="w-3 h-3" />
                KOMITMEN PRIBADI
              </span>
            </div>

            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mb-1 leading-snug">
              Banyak orang niat rutin catat keuangan, tapi cuma sedikit yang benar-benar bertahan.
            </h2>
            <p className="text-xs text-amber-800 font-bold mb-3.5 leading-relaxed">
              Kamu mau jadi salah satu yang berhasil membangun kebiasaan ini?
            </p>

            {/* Implementation Intention: Jam Reminder */}
            <div className="space-y-2 mb-1">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
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
                          ? "bg-amber-50 border-amber-500 text-slate-900 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {item.rec && (
                        <span className="absolute -top-2 left-2 bg-brand-navy text-brand-gold text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-xs">
                          Paling Pas
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-1.5 mt-0.5">
                        <Icon className={`w-4 h-4 ${isSelected ? "text-amber-700" : "text-slate-400"}`} />
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-xs font-black leading-none">{item.label}</p>
                        <p className="text-[10px] text-amber-800 font-mono font-bold mt-0.5">{item.time}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BAGIAN B — TRIAL NOTICE (HADIAH KOMITMEN) */}
          <div className="bg-white border border-emerald-300 rounded-3xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Gift className="w-3 h-3 text-emerald-700" />
                HADIAH KOMITMEN
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mb-1 leading-snug">
              Akses Penuh 7 Hari Aktif untuk Anda
            </h3>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-3 font-medium">
              Selama <strong>7 hari ke depan</strong>, semua fitur BILANO — <strong className="text-amber-800 font-black">TERMASUK yang biasanya premium</strong> — bisa kamu coba 100% gratis tanpa biaya.
            </p>

            {/* Checklist Fitur yang Terbuka Selama Trial */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 space-y-1.5 mb-3 text-[11px]">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>AI Smart Scanner Struk & Suara (Unlimited)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Portofolio Investasi Saham, Kripto & Valas Multi-Mata Uang</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Chat AI Konsultan Finansial 24/7 & Laporan Arus Kas</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Akses Seluruh Koleksi 5 E-Book Finansial Academy</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tanpa tagihan diam-diam • Langsung pakai tanpa kartu kredit</span>
            </p>
          </div>

          {/* CTA ACTION BUTTON */}
          <div className="space-y-2 pt-1">
            <Button
              disabled={isSubmittingCommitment}
              onClick={handleStartTrial}
              className="w-full h-14 rounded-2xl text-xs font-black tracking-widest flex items-center justify-center gap-2 bg-brand-gold hover:bg-[#e5a825] text-brand-navy shadow-md active:scale-98 transition-all cursor-pointer"
            >
              {isSubmittingCommitment ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>MULAI AKSES PENUH 7 HARI</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="w-full max-w-md text-center py-2 relative z-10">
        <p className="text-[10px] text-slate-400 font-semibold">
          BILANO Finance App • Privasi & Data Terenkripsi
        </p>
      </div>
    </div>
  );
}