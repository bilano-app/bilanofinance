import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  useUser, useTransactions, useTarget, 
  useForexAssets, useSubscriptions, useUndoTransaction 
} from "@/hooks/use-finance"; 
import { formatCurrency } from "@/lib/utils";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
  TrendingUp, DollarSign, 
  RefreshCcw, FileText, LogOut, User, BarChart, ChevronRight,
  MoreVertical, Shield, Maximize, Crown, EyeOff, Eye, Lock, X, Loader2,
  Bell, Mic, Camera, AlertCircle, BookOpen, Rocket, CreditCard,
  Bot, Check, Info, Book, Heart, CornerUpLeft, Clock, Zap, HandCoins
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const FINANCIAL_TIPS = [
    "Bunga majemuk (Compound Interest) adalah keajaiban dunia kedelapan. - Albert Einstein",
    "Jangan menabung apa yang tersisa setelah belanja, tapi belanjalah dari apa yang tersisa setelah menabung.",
    "Aset menaruh uang di saku Anda, Liabilitas mengeluarkan uang dari saku Anda.",
    "Pengeluaran kecil yang bocor bisa menenggelamkan kapal yang sangat besar.",
    "Investasi terbaik yang bisa Anda lakukan adalah investasi pada diri Anda sendiri.",
    "Dana Darurat adalah payung Anda saat badai finansial turun tiba-tiba.",
    "Diversifikasi: Jangan pernah menaruh semua telurmu dalam satu keranjang.",
    "Hutang konsumtif merampok masa depanmu, hutang produktif membangun masa depanmu.",
    "Kekayaan sejati bukanlah seberapa banyak uang yang dihasilkan, tapi seberapa banyak yang disimpan.",
    "Waktu di pasar saham jauh lebih penting daripada sekadar menebak waktu pasar.",
    "Pemasukan yang besar tanpa manajemen yang baik hanya akan menghasilkan kebangkrutan.",
    "Aturan 50/30/20: 50% Kebutuhan, 30% Keinginan, 20% Tabungan & Investasi.",
    "Jika kamu membeli barang yang tidak kamu butuhkan, kelak kamu harus menjual barang yang kamu butuhkan.",
    "Orang kaya membeli aset, orang miskin membeli liabilitas yang mereka pikir adalah aset.",
    "Catat setiap rupiah yang keluar. Kesadaran adalah langkah pertama menuju kendali finansial penuh."
];

export default function Home() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: transactions, isLoading: isTxLoading } = useTransactions();
  const { data: forexAssets, isLoading: isFxLoading } = useForexAssets(); 
  const { data: target, isLoading: isTargetLoading } = useTarget(); 
  const { data: subscriptions, isLoading: isSubLoading, refetch: refetchSubs } = useSubscriptions();
  const undoTx = useUndoTransaction(); 

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileZoomed, setIsProfileZoomed] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false); 
  const [isTrialExpiredState, setIsTrialExpiredState] = useState(false); // Untuk UI
  const [milestoneTxProgress, setMilestoneTxProgress] = useState(0); // Untuk Progress Banner

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isRequestingPerms, setIsRequestingPerms] = useState(false);
  const [showProWelcome, setShowProWelcome] = useState(false);
  const [milestonePopup, setMilestonePopup] = useState<string | null>(null); 
  
  const [showGuideTooltip, setShowGuideTooltip] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  
  const [fomoFeature, setFomoFeature] = useState<{title: string, desc: string} | null>(null);
  const [proFeatureModal, setProFeatureModal] = useState<{title: string, desc: string} | null>(null);

  const [dueDynamicSub, setDueDynamicSub] = useState<any | null>(null);
  const [dynamicAmount, setDynamicAmount] = useState("");

  const [activeMenuPage, setActiveMenuPage] = useState(0);

  const [isLongLoading, setIsLongLoading] = useState(false);
  const [loadingTipIndex, setLoadingTipIndex] = useState(() => Math.floor(Math.random() * FINANCIAL_TIPS.length));
  const [showRetryButton, setShowRetryButton] = useState(false);

  const [aiResultModal, setAiResultModal] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStrategies, setAiStrategies] = useState<{title: string, description: string}[] | null>(null);

  const isStandalone = typeof window !== 'undefined' && 
      (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

  const rawEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const isUserPro = user?.isPro === true; 
  const isBalanceEstimated = localStorage.getItem(`bilano_is_balance_estimated_${rawEmail}`) === "true";
  const txCount = transactions?.length || 0;
  
  // 🚀 UPDATE LOKAL CACHE TRANSAKSI UNTUK PERHITUNGAN TRIAL
  useEffect(() => {
      if (rawEmail && transactions !== undefined) {
          localStorage.setItem(`bilano_tx_count_${rawEmail}`, txCount.toString());
          setMilestoneTxProgress(Math.min(10, txCount));
      }
  }, [transactions, rawEmail, txCount]);

  useEffect(() => {
      if (rawEmail && user && user.username === 'guest') {
          localStorage.removeItem("bilano_auth");
          localStorage.removeItem("bilano_email");
          window.location.href = "/auth";
      }
  }, [user, rawEmail]);

  useEffect(() => {
      setIsPrivacyMode(localStorage.getItem("bilano_privacy") === "true");
      const savedPin = localStorage.getItem("bilano_app_pin");
      const isUnlockedSession = sessionStorage.getItem("bilano_session_unlocked") === "true";
      
      if (savedPin && !isUnlockedSession) setIsLocked(true);

      const hasPrompted = localStorage.getItem("bilano_permissions_prompted");
      if (!hasPrompted) setShowPermissionPrompt(true);
  }, []);

  useEffect(() => {
      if (!rawEmail || isTxLoading) return;
      const checkMilestone = (count: number, message: string) => {
          const key = `bilano_milestone_${count}_${rawEmail}`;
          if (txCount >= count && !localStorage.getItem(key)) {
              setTimeout(() => setMilestonePopup(message), 1500);
              localStorage.setItem(key, "true");
          }
      };

      checkMilestone(1, "Langkah pertama! 🎉 Satu transaksi sudah lebih baik dari nol.");
      checkMilestone(5, "Hebat! Kamu mulai punya gambaran nyata tentang keuanganmu.");
      checkMilestone(20, "20 Transaksi! Kamu sedang membangun kebiasaan finansial yang luar biasa.");
  }, [txCount, rawEmail, isTxLoading]);

  const isAnyDataLoading = isUserLoading || isTargetLoading || isTxLoading || isFxLoading || isSubLoading;

  useEffect(() => {
      let timerLongLoad: any;
      let timerRetry: any;
      let intervalTips: any;

      if (isAnyDataLoading) {
          timerLongLoad = setTimeout(() => setIsLongLoading(true), 2500);
          timerRetry = setTimeout(() => setShowRetryButton(true), 12000); 

          intervalTips = setInterval(() => {
              setLoadingTipIndex(prev => (prev + 1) % FINANCIAL_TIPS.length);
          }, 4500);
      } else {
          setIsLongLoading(false);
          setShowRetryButton(false);
      }

      return () => {
          clearTimeout(timerLongLoad);
          clearTimeout(timerRetry);
          clearInterval(intervalTips);
      };
  }, [isAnyDataLoading]);

  useEffect(() => {
      if (rawEmail && !isAnyDataLoading && user) {
          const guideSeen = localStorage.getItem(`bilano_guide_tooltip_seen_${rawEmail}`);
          const profileSeen = localStorage.getItem(`bilano_profile_tooltip_seen_${rawEmail}`);
          const startTimeAcc = new Date(user.createdAt || Date.now()).getTime();
          const isNewUser = (Date.now() - startTimeAcc) < (24 * 60 * 60 * 1000);

          if (isNewUser) {
              if (!guideSeen) {
                  const timer = setTimeout(() => setShowGuideTooltip(true), 1500);
                  return () => clearTimeout(timer);
              } else if (guideSeen && !profileSeen && !user.profilePicture) {
                  const timer = setTimeout(() => setShowProfileTooltip(true), 1000);
                  return () => clearTimeout(timer);
              }
          }
      }
  }, [rawEmail, isAnyDataLoading, user]);

  const dismissGuideTooltip = () => {
      setShowGuideTooltip(false);
      localStorage.setItem(`bilano_guide_tooltip_seen_${rawEmail}`, "true");
  };

  const dismissProfileTooltip = () => {
      setShowProfileTooltip(false);
      localStorage.setItem(`bilano_profile_tooltip_seen_${rawEmail}`, "true");
  };

  const handlePinUnlock = (num: string) => {
      setPinError(false);
      const newVal = pinInput + num;
      setPinInput(newVal);
      if (newVal.length === 6) {
          const savedPin = localStorage.getItem("bilano_app_pin");
          if (newVal === savedPin) {
              sessionStorage.setItem("bilano_session_unlocked", "true");
              setIsLocked(false);
          } else {
              setPinError(true);
              setTimeout(() => setPinInput(""), 300);
          }
      }
  };

  const togglePrivacy = () => {
      const newVal = !isPrivacyMode;
      setIsPrivacyMode(newVal);
      localStorage.setItem("bilano_privacy", newVal.toString());
  };

  const handleUndo = async () => {
      if (!confirm("Ingin membatalkan transaksi paling terakhir? Saldo Kas, Valas, dan Investasi akan diputar balik otomatis.")) return;
      try {
          await undoTx.mutateAsync();
          toast({ title: "Berhasil!", description: "Transaksi terakhir telah dibatalkan." });
      } catch (e: any) {
          toast({ title: "Gagal Undo", description: e.message, variant: "destructive" });
      }
  };

  const handleFomoClick = (title: string, desc: string) => {
      if (isUserPro) setProFeatureModal({ title, desc });
      else setFomoFeature({ title, desc });
  };

  const handleMenuScroll = (e: any) => {
      const scrollLeft = e.target.scrollLeft;
      const width = e.target.clientWidth;
      setActiveMenuPage(Math.round(scrollLeft / width));
  };

  useEffect(() => {
      if (isUserPro && rawEmail) {
          const welcomeKey = `bilano_welcomed_pro_${rawEmail}`;
          if (!localStorage.getItem(welcomeKey)) setTimeout(() => setShowProWelcome(true), 500);
      }
  }, [isUserPro, rawEmail]);

  const handleTutupWelcomePro = () => {
      localStorage.setItem(`bilano_welcomed_pro_${rawEmail}`, "true"); 
      setShowProWelcome(false);
  };

  useEffect(() => {
      if (isUserPro || !user) return;
      // Sinkronisasi status expired UI dengan logika dari App.tsx
      const expiredStatus = localStorage.getItem(`bilano_trial_expired_${rawEmail}`) === "true";
      setIsTrialExpiredState(expiredStatus);
  }, [isUserPro, user, rawEmail]);

  const isTargetEmpty = !isTargetLoading && (!target || (typeof target === 'object' && Object.keys(target).length === 0));
  
  const startTimeAcc = new Date(user?.createdAt || Date.now()).getTime();
  const isNewAccount = user && (Date.now() - startTimeAcc) < (15 * 60 * 1000); 
  const hasRedirected = rawEmail ? localStorage.getItem(`bilano_welcomed_paywall_${rawEmail}`) === "true" : false;
  
  const needsPaywallRedirect = isStandalone && !isUserPro && isNewAccount && !hasRedirected && !isTargetEmpty;

  useEffect(() => {
      if (!isUserLoading && !isTargetLoading && target !== undefined) {
          if (isTargetEmpty) {
              setLocation("/target");
          } else if (needsPaywallRedirect) {
              localStorage.setItem(`bilano_welcomed_paywall_${rawEmail}`, "true");
              setLocation("/paywall");
          }
      }
  }, [isTargetEmpty, needsPaywallRedirect, isUserLoading, isTargetLoading, setLocation, rawEmail]);

  const requestAllPermissions = async () => { 
      setIsRequestingPerms(true);
      try {
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout dari Browser")), 4000));
          if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
              await Promise.race([Notification.requestPermission(), timeout]).catch(() => {});
          }
      } catch (e) {
      } finally {
          localStorage.setItem("bilano_permissions_prompted", "true");
          setShowPermissionPrompt(false);
          setIsRequestingPerms(false);
          toast({ title: "Siap Digunakan!", description: "Pengaturan telah disesuaikan." });
      }
  };

  const skipPermissions = () => {
      localStorage.setItem("bilano_permissions_prompted", "true");
      setShowPermissionPrompt(false);
  };

  const handleLogout = async () => {
      try {
          await signOut(auth); 
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/auth"; 
      } catch (error) { console.error(error); }
  };

  const fetchAiStrategy = async () => {
      setAiResultModal(true); 
      if (aiStrategies) return; 
      
      setIsGeneratingAi(true); 
      try {
          const txData = transactions || [];
          if (txData.length < 5) {
              setAiStrategies([
                  { title: "BUTUH LEBIH BANYAK DATA", description: "BILA AI membutuhkan minimal 5 transaksi nyata untuk bisa menemukan pola keuanganmu. Yuk catat lebih banyak pengeluaran dan pemasukan!" }
              ]);
              setIsGeneratingAi(false);
              return;
          }

          const res = await fetch("/api/ai/strategy", {
              method: "POST", 
              headers: { "Content-Type": "application/json", "x-user-email": rawEmail }
          });
          
          let responseData;
          try {
              responseData = await res.json();
          } catch (e) {
              throw new Error("Gagal membaca balasan dari server. (Timeout/Restart)");
          }

          if (!res.ok || !responseData.success) {
              throw new Error(responseData.error || "Terjadi kesalahan internal server.");
          }
          
          setAiStrategies(responseData.data);
      } catch (e: any) {
          setAiStrategies([
              {
                  title: "KONEKSI AI GAGAL",
                  description: `Pesan Error: ${e.message}\n\nPastikan API Key sudah benar dan server tidak mengalami Timeout.`
              }
          ]);
      } finally {
          setIsGeneratingAi(false); 
      }
  };

  const cashRupiah = (user?.cashBalance || 0); 
  const totalBalance = cashRupiah;
  const displayBalance = isPrivacyMode ? "Rp •••••••" : formatCurrency(totalBalance).split(",")[0];
  const getBalanceTextSize = (text: string) => {
      if (text.length >= 20) return "text-2xl"; 
      if (text.length >= 15) return "text-3xl"; 
      return "text-4xl"; 
  };

  useEffect(() => {
    if (target && target.targetAmount > 0 && totalBalance >= target.targetAmount) {
        if (!localStorage.getItem(`bilano_target_done_${target.id}`)) setShowTargetModal(true);
    }
  }, [target, totalBalance]);

  const dismissTargetModal = () => {
      if (target?.id) localStorage.setItem(`bilano_target_done_${target.id}`, "true");
      setShowTargetModal(false);
  };

  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthTx = transactions?.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  }) || [];

  const baseIncomeTxs = thisMonthTx.filter(t => 
      (t.type === 'income' || t.type === 'piutang_record') && 
      !t.description?.includes('[Offset') && 
      !t.description?.includes('[WRITE_OFF]') && 
      !t.description?.includes('[Catat Awal]') && 
      !t.description?.includes('[Bayar Valas]') && 
      !['Penyesuaian Sistem', 'Pemutihan Hutang', 'Cairkan Valas', 'Investasi Valas', 'Tukar Valas', 'Jual Aset'].includes(t.category) &&
      !(t.category || '').includes('Dapat Pinjaman')
  );
  
  const baseExpenseTxs = thisMonthTx.filter(t => 
      (t.type === 'expense' || t.type === 'hutang_record') && 
      !(t.category || '').toLowerCase().includes('invest') && 
      !t.description?.includes('[Offset') && 
      !t.description?.includes('[WRITE_OFF]') && 
      !t.description?.includes('[Catat Awal]') && 
      !t.description?.includes('[Bayar Valas]') && 
      !['Penyesuaian Sistem', 'Penghapusan Piutang', 'Tukar Valas', 'Investasi Valas', 'Cairkan Valas'].includes(t.category) &&
      !(t.category || '').includes('Bayar Hutang') &&
      !(t.category || '').includes('Beri Pinjaman')
  );

  const virtualPLTxs: any[] = [];
  thisMonthTx.filter(t => t.type === 'invest_sell').forEach(t => {
      if (t.description && t.description.includes('P/L:')) {
          const plValue = parseInt(t.description.split('P/L:')[1].replace(/[^0-9-]/g, ''), 10);
          if (!isNaN(plValue) && plValue !== 0) virtualPLTxs.push({ amount: Math.abs(plValue), type: plValue > 0 ? 'income' : 'expense' });
      }
  });

  const income = baseIncomeTxs.reduce((acc, t) => acc + t.amount, 0) + virtualPLTxs.filter(v => v.type === 'income').reduce((acc, v) => acc + v.amount, 0);
  const expense = baseExpenseTxs.reduce((acc, t) => acc + t.amount, 0) + virtualPLTxs.filter(v => v.type === 'expense').reduce((acc, v) => acc + v.amount, 0);
  
  if (isAnyDataLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 relative">
              <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm mb-2">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span>Menyiapkan Dasbor...</span>
              </div>
              
              <div className={`transition-all duration-1000 max-w-[280px] text-center mt-4 ${isLongLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 h-0 overflow-hidden'}`}>
                  <p className="text-[10px] font-black text-amber-500 mb-2 uppercase tracking-widest flex items-center justify-center gap-1.5 bg-amber-50 py-1 px-3 rounded-full w-max mx-auto shadow-sm">
                      <Zap className="w-3.5 h-3.5"/> BILANO Tips
                  </p>
                  <p key={loadingTipIndex} className="text-[13px] font-bold text-slate-600 italic leading-relaxed animate-in fade-in duration-500 text-balance">
                      "{FINANCIAL_TIPS[loadingTipIndex]}"
                  </p>
              </div>

              {showRetryButton && (
                  <div className="absolute bottom-16 animate-in fade-in slide-in-from-bottom-4">
                      <Button onClick={() => window.location.reload()} className="bg-white border-2 border-rose-200 text-rose-600 font-bold shadow-lg hover:bg-rose-50 rounded-full h-12 px-6">
                          Server Terlalu Lama? Muat Ulang ➔
                      </Button>
                  </div>
              )}
          </div>
      );
  }

  if (!user && !isUserLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center relative z-[999]">
              <AlertCircle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
              <h2 className="text-xl font-extrabold text-slate-800 mb-2">Sesi Terputus</h2>
              <p className="text-sm text-slate-500 mb-8 max-w-xs">Terjadi kendala saat memuat profil Anda dari server. Silakan masuk ulang.</p>
              <Button onClick={handleLogout} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full h-14 px-8 shadow-lg">
                  LOGOUT & COBA LAGI
              </Button>
          </div>
      );
  }

  if (isTargetEmpty) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
              <h2 className="text-lg font-bold text-slate-800">Mengarahkan...</h2>
              <p className="text-sm text-slate-500 text-center">Membuka pengaturan profil finansial pertama Anda.</p>
          </div>
      );
  }

  if (needsPaywallRedirect) {
       return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
              <h2 className="text-lg font-bold text-slate-800">Tunggu Sebentar...</h2>
              <p className="text-sm text-slate-500 text-center">Menyiapkan penawaran eksklusif BILANO untuk Anda.</p>
          </div>
      );
  }

  if (isLocked) { 
      return (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center text-white">
            <Lock className={`w-12 h-12 mb-4 ${pinError ? 'text-rose-500 animate-bounce' : 'text-indigo-500'}`} />
            <h2 className="text-xl font-bold mb-2">BILANO Terkunci</h2>
            <p className="text-sm text-slate-400 mb-8">{pinError ? "PIN Salah. Coba lagi." : "Masukkan PIN Keamanan"}</p>
            <div className={`flex gap-4 mb-12 ${pinError ? 'animate-pulse' : ''}`}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-colors ${pinInput.length > i ? (pinError ? 'bg-rose-500' : 'bg-indigo-500') : 'bg-slate-700'}`} />
                ))}
            </div>
            <div className="grid grid-cols-3 gap-6 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} onClick={() => handlePinUnlock(num.toString())} className="w-16 h-16 rounded-full bg-slate-800 text-2xl font-bold hover:bg-slate-700 active:bg-slate-600 transition-colors">{num}</button>
                ))}
                <div />
                <button onClick={() => handlePinUnlock('0')} className="w-16 h-16 rounded-full bg-slate-800 text-2xl font-bold hover:bg-slate-700 active:bg-slate-600 transition-colors">0</button>
                <button onClick={() => setPinInput(p => p.slice(0, -1))} className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 active:bg-slate-600 transition-colors">
                    <X className="w-8 h-8"/>
                </button>
            </div>
        </div>
      );
  }

  const userEmail = rawEmail || "Pengguna";
  const greetingName = user?.firstName ? user.firstName : userEmail.split("@")[0];

  return (
    <MobileLayout>

      {/* 🚀 MODAL HASIL AI STRATEGI DENGAN DATA DINAMIS & OTAK BILA */}
      {aiResultModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
              <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative border-t-8 border-indigo-600 max-h-[85vh] overflow-y-auto custom-scrollbar">
                  <button onClick={() => setAiResultModal(false)} className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><X className="w-4 h-4"/></button>
                  
                  <div className="w-16 h-16 mx-auto bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                      {isGeneratingAi ? <Loader2 className="w-8 h-8 animate-spin" /> : <Bot className="w-8 h-8" />}
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-800 mb-1 text-center">BILA Intelligence</h3>
                  <p className="text-[11px] text-slate-500 mb-5 text-center font-medium">Analisa mendalam dari seluruh rekam jejak finansialmu</p>
                  
                  <div className="space-y-4 mb-6">
                      {isGeneratingAi ? (
                          <div className="space-y-4 animate-pulse">
                              <div className="h-28 bg-slate-100 rounded-[20px]"></div>
                              <div className="h-28 bg-slate-100 rounded-[20px]"></div>
                          </div>
                      ) : aiStrategies ? (
                          aiStrategies.map((strat, idx) => (
                              <div key={idx} className={`p-5 rounded-[24px] border relative shadow-sm ${
                                  idx === 0 ? 'bg-slate-50 border-slate-200' : 
                                  idx === 1 ? 'bg-rose-50 border-rose-100' :
                                  idx % 2 === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'
                              }`}>
                                  <h4 className={`text-[13px] font-black mb-3 pb-2 border-b ${
                                      idx === 0 ? 'text-slate-800 border-slate-200' : 
                                      idx === 1 ? 'text-rose-800 border-rose-200' :
                                      idx % 2 === 0 ? 'text-emerald-900 border-emerald-200' : 'text-blue-900 border-blue-200'
                                  }`}>
                                      {strat.title}
                                  </h4>
                                  <div className={`text-[11.5px] leading-relaxed font-medium whitespace-pre-line ${
                                      idx === 0 ? 'text-slate-600' : 
                                      idx === 1 ? 'text-rose-700' :
                                      idx % 2 === 0 ? 'text-emerald-800' : 'text-blue-800'
                                  }`}>
                                      {strat.description.replace(/\*\*/g, '')} 
                                  </div>
                              </div>
                          ))
                      ) : null}
                  </div>
                  
                  {!isGeneratingAi && (
                      <Link href="/chat-ai">
                          <Button onClick={() => setAiResultModal(false)} className="w-full h-14 rounded-[16px] bg-slate-900 hover:bg-slate-800 text-white font-extrabold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                              <Bot className="w-4 h-4"/> TANYA BILA LEBIH LANJUT
                          </Button>
                      </Link>
                  )}
              </div>
          </div>
      )}

      {milestonePopup && (
          <div className="fixed top-4 left-4 right-4 z-[999999] bg-indigo-600 text-white p-4 rounded-[20px] shadow-2xl flex items-start gap-3 animate-in slide-in-from-top-10 fade-in duration-500">
              <div className="bg-white/20 p-2 rounded-full shrink-0"><Check className="w-6 h-6"/></div>
              <div className="flex-1">
                  <h4 className="font-extrabold text-sm mb-0.5">Pencapaian Baru! 🏆</h4>
                  <p className="text-xs font-medium leading-relaxed">{milestonePopup}</p>
              </div>
              <button onClick={() => setMilestonePopup(null)} className="shrink-0 p-1 bg-black/10 hover:bg-black/20 rounded-full transition-colors"><X className="w-4 h-4"/></button>
          </div>
      )}

      <div className="fixed bottom-[88px] right-4 flex flex-col gap-3 z-40 animate-in slide-in-from-bottom-10 fade-in">
          
          {showGuideTooltip && (
              <div className="absolute right-[60px] bottom-0 w-[260px] bg-white border-2 border-slate-900 p-4 rounded-[20px] shadow-[6px_6px_0px_#0f172a] animate-in fade-in zoom-in slide-in-from-right-4 duration-500 z-50">
                  <button onClick={dismissGuideTooltip} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
                      <X className="w-4 h-4" />
                  </button>
                  <p className="text-[13px] font-black mb-1.5 text-slate-900 flex items-center gap-1.5">
                      👋 Bingung Mulai dari Mana?
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-bold pr-2">
                      Baru pertama kali pakai BILANO? Klik buku pintar ini untuk melihat panduan lengkap cara memaksimalkan seluruh fitur canggih kami!
                  </p>
                  <div className="absolute bottom-[14px] -right-[10px] w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[10px] border-l-slate-900"></div>
                  <div className="absolute bottom-[16px] -right-[7px] w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-white"></div>
              </div>
          )}

          <Link href="/help">
              <button className="w-12 h-12 bg-yellow-400 text-emerald-900 rounded-full shadow-lg shadow-yellow-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group relative">
                  <Info className="w-6 h-6 group-hover:animate-bounce" />
                  <span className="absolute right-full mr-3 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Pusat Bantuan
                  </span>
              </button>
          </Link>

          <Link href="/guide">
              <button onClick={dismissGuideTooltip} className="w-12 h-12 bg-sky-400 text-amber-900 rounded-full shadow-lg shadow-sky-200 flex items-center justify-center hover:bg-sky-500 hover:scale-105 active:scale-95 transition-all group relative">
                  <Book className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  <span className="absolute right-full mr-3 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Panduan Fitur
                  </span>
              </button>
          </Link>
      </div>

      {proFeatureModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 text-center overflow-hidden border border-indigo-500/30">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                  <button onClick={() => setProFeatureModal(null)} className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-rose-500 text-white rounded-full transition-colors z-10"><X className="w-5 h-5"/></button>
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(251,191,36,0.3)] relative z-10">
                      <Crown className="w-10 h-10 text-amber-950"/>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Akses VIP Terjamin! 👑</h2>
                  <p className="text-sm text-indigo-200 mb-6 leading-relaxed px-2 font-medium">
                      Fitur <b className="text-amber-400">{proFeatureModal.title}</b> saat ini sedang dalam tahap akhir pengembangan oleh tim kami. <br/><br/>
                      Sebagai pengguna <b>PRO</b>, Anda tidak perlu membayar biaya tambahan apapun. Fitur ini akan otomatis terbuka untuk Anda begitu dirilis!
                  </p>
                  <Button onClick={() => setProFeatureModal(null)} className="w-full h-14 bg-white hover:bg-slate-100 text-indigo-950 rounded-full font-black text-[13px] shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 relative z-10">
                      <Check className="w-5 h-5"/> SAYA MENGERTI
                  </Button>
              </div>
          </div>
      )}

      {fomoFeature && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 text-center overflow-hidden border-[3px] border-amber-100">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-100 rounded-full blur-3xl pointer-events-none"></div>
                  <button onClick={() => setFomoFeature(null)} className="absolute top-4 right-4 p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors z-10"><X className="w-5 h-5"/></button>
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(251,191,36,0.4)] relative z-10">
                      <Rocket className="w-10 h-10 text-amber-950"/>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Misi Selanjutnya! 🚀</h2>
                  <p className="text-sm text-slate-500 mb-5 leading-relaxed px-2">
                      Fitur <b>{fomoFeature.title}</b> adalah salah satu inovasi besar yang masuk dalam rencana pengembangan (roadmap) kami ke depan.<br/><br/>
                      <span className="text-[11px] bg-slate-100 px-2 py-1 rounded-lg">"{fomoFeature.desc}"</span>
                  </p>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-4 mb-6 text-left relative z-10 shadow-inner">
                      <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-amber-600"/>
                          <span className="text-xs font-extrabold text-amber-800 uppercase tracking-widest">PERHATIAN PENTING</span>
                      </div>
                      <p className="text-[12px] text-amber-700 leading-relaxed font-medium">
                          Begitu fitur eksklusif ini diluncurkan nanti, harga langganan pengguna baru berpotensi akan <b className="text-rose-600">DINAIKKAN</b>. <br/><br/>
                          <b>Garansi Harga Tetap:</b> Kunci harga Anda di <b>Rp 99.000/tahun HARI INI</b>. Maka harga perpanjangan Anda tahun depan dan seterusnya akan <b>TERKUNCI SELAMANYA</b> di angka tersebut. Anda otomatis menikmati fitur baru ini tanpa perlu membayar selisih kenaikan harga!
                      </p>
                  </div>
                  
                  <Button onClick={() => { setFomoFeature(null); setLocation('/paywall'); }} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-black text-[13px] shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 relative z-10">
                      <Lock className="w-4 h-4"/> AMANKAN HARGA SAYA ➔
                  </Button>
              </div>
          </div>
      )}

      {dueDynamicSub && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative text-center border-t-8 border-orange-500">
                <div className="w-16 h-16 mx-auto bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 mb-2">Tagihan Jatuh Tempo!</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    Waktunya bayar tagihan <strong>{dueDynamicSub.name}</strong>. Berapa nominal yang Anda bayarkan bulan ini?
                </p>
                <Input 
                    type="number" 
                    placeholder="Masukkan nominal (Rp)..." 
                    value={dynamicAmount} 
                    onChange={e => setDynamicAmount(e.target.value)} 
                    className="h-14 font-bold text-lg mb-4 text-center bg-slate-50 border-transparent rounded-[20px]"
                />
                <div className="space-y-3">
                    <Button onClick={handlePayDynamic} className="w-full h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-lg shadow-emerald-200 active:scale-95 transition-transform">
                        BAYAR & CATAT SEKARANG
                    </Button>
                    <Button variant="ghost" onClick={handleSkipDynamic} className="w-full h-12 rounded-full font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                        Nanti Saja (Lewati Hari Hari Ini)
                    </Button>
                </div>
            </div>
        </div>
      )}

      {showProWelcome && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-[32px] p-1 w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 relative overflow-hidden border border-indigo-500/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 p-6 text-center">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(251,191,36,0.4)] animate-bounce">
                        <Crown className="w-10 h-10 text-amber-950" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                        Selamat Datang di <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">BILANO PRO!</span> 🎉
                    </h2>
                    <p className="text-indigo-200 text-sm mb-8 leading-relaxed font-medium px-2">
                        Luar biasa! Seluruh fitur eksklusif, analisa tanpa batas, laporan premium, dan asisten AI kini sepenuhnya terbuka untuk Anda.
                    </p>
                    <Button onClick={handleTutupWelcomePro} className="w-full h-14 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-950 font-black text-[15px] rounded-full shadow-xl shadow-amber-500/20 active:scale-95 transition-transform">
                        AYO MULAI SEKARANG! 🚀
                    </Button>
                </div>
            </div>
        </div>
      )}

      {showPermissionPrompt && (
          <div className="fixed inset-0 z-[99997] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 border border-slate-100">
                  <div className="text-center mb-6 pt-2">
                      <img src="/BILANO-ICON.png" alt="BILANO" className="w-20 h-20 object-contain mx-auto mb-5 drop-shadow-xl" />
                      <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Satu Langkah Lagi!</h2>
                      <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">Biar BILANO makin pintar bantu kelola uangmu, kami butuh sedikit izin untuk fitur ini:</p>
                  </div>

                  <div className="space-y-4 mb-8">
                      <div className="flex gap-4 items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                          <div className="bg-blue-100 p-2.5 rounded-full text-blue-600"><Bell className="w-5 h-5"/></div>
                          <div>
                              <h4 className="font-bold text-slate-800 text-sm">Notifikasi Pengingat</h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">Biar kamu gak lupa catat jajan hari ini.</p>
                          </div>
                      </div>
                      <div className="flex gap-4 items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                          <div className="bg-rose-100 p-2.5 rounded-full text-rose-600"><Mic className="w-5 h-5"/></div>
                          <div>
                              <h4 className="font-bold text-slate-800 text-sm">Akses Mikrofon</h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">Catat cepat pakai perintah suara AI.</p>
                          </div>
                      </div>
                      <div className="flex gap-4 items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                          <div className="bg-emerald-100 p-2.5 rounded-full text-emerald-600"><Camera className="w-5 h-5"/></div>
                          <div>
                              <h4 className="font-bold text-slate-800 text-sm">Akses Kamera</h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">Biar bisa scan struk belanja otomatis.</p>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <Button 
                          onClick={requestAllPermissions} 
                          disabled={isRequestingPerms} 
                          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-extrabold rounded-full shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                      >
                          {isRequestingPerms ? <Loader2 className="w-6 h-6 animate-spin"/> : "IZINKAN SEMUA"}
                      </Button>
                      <Button 
                          variant="ghost" 
                          onClick={skipPermissions} 
                          className="w-full h-12 font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full"
                      >
                          Nanti Saja
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {showTargetModal && (
          <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 border-4 border-emerald-100">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Crown className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Target Tercapai! 🎉</h2>
                  <p className="text-slate-500 text-sm mb-8">Luar biasa! Saldo kamu sudah melebihi impian yang kamu targetkan. Ingin membuat target baru?</p>
                  <div className="space-y-3">
                      <Button onClick={() => { dismissTargetModal(); setLocation('/target'); }} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-full text-lg shadow-lg shadow-emerald-200">BUAT TARGET BARU</Button>
                      <Button variant="ghost" onClick={dismissTargetModal} className="w-full h-14 font-bold text-slate-400 hover:text-slate-600 rounded-full">BIARKAN SAJA</Button>
                  </div>
              </div>
          </div>
      )}

      {isProfileZoomed && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsProfileZoomed(false)}>
            <div className="relative animate-in fade-in zoom-in duration-200">
                {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile Large" className="max-w-full max-h-[80vh] rounded-full border-4 border-white shadow-2xl" />
                ) : (
                    <div className="w-64 h-64 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-6xl border-4 border-white">
                        {greetingName.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2 pt-2 relative">
            <div className="flex items-center gap-3">
                <div onClick={() => setIsProfileZoomed(true)} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform active:scale-95 bg-slate-100">
                    {user?.profilePicture ? (
                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            {greetingName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-slate-500">Selamat datang,</p>
                        {isUserPro && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-800 capitalize leading-tight">{greetingName}</h2>
                </div>
            </div>

            {showProfileTooltip && (
                <div className="absolute top-[65px] left-2 w-[260px] bg-white border-2 border-indigo-600 p-4 rounded-[20px] shadow-[6px_6px_0px_#4f46e5] animate-in fade-in zoom-in slide-in-from-left-4 duration-500 z-50">
                    <div className="absolute -top-[10px] left-[20px] w-0 h-0 border-b-[10px] border-b-indigo-600 border-r-[10px] border-r-transparent border-l-[10px] border-l-transparent"></div>
                    <div className="absolute -top-[7px] left-[22px] w-0 h-0 border-b-[8px] border-b-white border-r-[8px] border-r-transparent border-l-[8px] border-l-transparent"></div>
                    
                    <p className="text-[13px] font-black mb-1.5 text-indigo-900 flex items-center gap-1.5">
                        📸 Pasang Foto Profil!
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-bold mb-4">
                        Biar makin keren, yuk pasang foto profilmu! Tekan ikon avatar di atas untuk mengubahnya.
                    </p>
                    <div className="flex items-center gap-2">
                        <button onClick={dismissProfileTooltip} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold py-2.5 rounded-xl text-[10px] transition-colors">
                            Nanti Saja
                        </button>
                        <Link href="/profile" className="flex-1">
                            <button onClick={dismissProfileTooltip} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-[10px] transition-colors shadow-sm">
                                Pasang Sekarang
                            </button>
                        </Link>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <button 
                    onClick={handleUndo}
                    disabled={undoTx.isPending}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 active:scale-90 transition-all"
                    title="Batalkan Transaksi Terakhir"
                >
                    {undoTx.isPending ? <Loader2 className="w-5 h-5 animate-spin"/> : <CornerUpLeft className="w-5 h-5"/>}
                </button>

                <div className="relative">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                    >
                        <MoreVertical className="w-5 h-5"/>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-12 right-0 w-48 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 py-2 z-50 animate-in slide-in-from-top-2">
                            <Link href="/profile">
                                <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-3"><User className="w-4 h-4 text-slate-400"/> Edit Profil</button>
                            </Link>
                            <Link href="/security">
                                <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-3"><Shield className="w-4 h-4 text-slate-400"/> Keamanan</button>
                            </Link>
                            <div className="h-px bg-slate-100 my-1 mx-2"></div>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-bold"><LogOut className="w-4 h-4 text-rose-500"/> Keluar</button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {isBalanceEstimated && (
            <div className="mx-1 mt-[-10px] rounded-[20px] p-4 shadow-sm bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 flex items-center justify-between animate-in slide-in-from-top-4">
                <div className="flex items-center gap-3 pr-2">
                    <div className="bg-orange-100 p-2.5 rounded-full shrink-0">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-widest mb-0.5 text-orange-800">Saldo Masih Estimasi</p>
                        <p className="text-[10px] font-medium opacity-90 text-orange-700 leading-tight">Lengkapi data aset & rekening untuk hasil akurat.</p>
                    </div>
                </div>
                <Link href="/target">
                    <button className="bg-orange-500 hover:bg-orange-600 px-4 py-2.5 rounded-full text-[10px] font-extrabold text-white transition-all active:scale-95 shadow-md shrink-0">LENGKAPI</button>
                </Link>
            </div>
        )}

        {/* 🚀 BANNER TRIAL DI DASHBOARD (Sesuai Logika Milestone App.tsx) */}
        {!isUserPro && isStandalone && (
            <div className={`mx-1 mt-[-10px] rounded-[20px] p-4 shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 ${isTrialExpiredState ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white' : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950'}`}>
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                        {isTrialExpiredState ? <Lock className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-widest mb-0.5">{isTrialExpiredState ? "MASA COBA HABIS" : "Milestone Trial"}</p>
                        <p className="text-xs font-medium opacity-90">
                            {isTrialExpiredState ? "Fungsi aplikasi dikunci." : <span>Misi: <b>{milestoneTxProgress}/10 Transaksi</b></span>}
                        </p>
                    </div>
                </div>
                <Link href="/paywall">
                    <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-[10px] font-extrabold backdrop-blur-sm transition-all active:scale-95 shadow-sm">{isTrialExpiredState ? "BUKA KUNCI" : "UPGRADE PRO"}</button>
                </Link>
            </div>
        )}
        
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden group transition-all hover:scale-[1.01]">
           <div className="relative z-10 flex flex-col pt-2 pb-4">
              <div className="flex justify-between items-center mb-1">
                  <p className="text-[11px] font-bold text-blue-100 uppercase tracking-widest">Saldo Kas</p>
                  <button onClick={togglePrivacy} className="p-1 hover:bg-white/10 rounded-full transition-colors text-blue-200">
                      {isPrivacyMode ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
              </div>
              
              <h2 className={`${getBalanceTextSize(displayBalance)} font-extrabold tracking-tight text-white mb-6 drop-shadow-sm flex items-center h-10 whitespace-nowrap transition-all duration-300`}>
                 {displayBalance}
              </h2>

              <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-blue-100 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                      <span>IDR:</span> <span className="font-bold text-white">{isPrivacyMode ? "•••" : formatCurrency(cashRupiah).split(",")[0]}</span>
                  </div>
              </div>
           </div>
           <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/5 rounded-tl-full pointer-events-none"></div>
           <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
           <div className="absolute left-0 bottom-0 w-24 h-24 bg-blue-400/20 rounded-tr-full blur-xl pointer-events-none"></div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-1">
           <Link href="/income">
               <div className="bg-white p-4 rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 cursor-pointer flex flex-col gap-2 active:scale-95 transition-all group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
                    <div className="absolute -right-3 -bottom-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                        <img src="https://api.iconify.design/solar/round-arrow-left-down-bold.svg?color=%2310b981" className="w-16 h-16" alt="income bg" />
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors shadow-sm shrink-0">
                            <img src="https://api.iconify.design/solar/round-arrow-left-down-bold.svg?color=%2310b981" className="w-4 h-4" alt="Income" />
                        </div>
                        <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider truncate">Pemasukan</p>
                    </div>
                    <div className="relative z-10 mt-1">
                        <p className="text-lg font-black text-slate-800 leading-none truncate">{isPrivacyMode ? "••••••" : formatCurrency(income).split(",")[0]}</p>
                    </div>
               </div>
           </Link>
           <Link href="/expense">
               <div className="bg-white p-4 rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 cursor-pointer flex flex-col gap-2 active:scale-95 transition-all group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
                    <div className="absolute -right-3 -bottom-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                        <img src="https://api.iconify.design/solar/round-arrow-right-up-bold.svg?color=%23f43f5e" className="w-16 h-16" alt="expense bg" />
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors shadow-sm shrink-0">
                            <img src="https://api.iconify.design/solar/round-arrow-right-up-bold.svg?color=%23f43f5e" className="w-4 h-4" alt="Expense" />
                        </div>
                        <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider truncate">Pengeluaran</p>
                    </div>
                    <div className="relative z-10 mt-1">
                        <p className="text-lg font-black text-slate-800 leading-none truncate">{isPrivacyMode ? "••••••" : formatCurrency(expense).split(",")[0]}</p>
                    </div>
               </div>
           </Link>
        </div>

        <div className="px-1 mt-3">
            <div className="bg-gradient-to-br from-white to-indigo-50/40 border border-indigo-100 rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden group">
                {!isUserPro && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 text-[9px] font-black px-3 py-1.5 rounded-bl-[16px] z-10 flex items-center gap-1 shadow-sm">
                        <Lock className="w-3 h-3" /> EKSKLUSIF PRO
                    </div>
                )}
                {isUserPro && txCount >= 30 && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white text-[9px] font-black px-3 py-1.5 rounded-bl-[16px] z-10 flex items-center gap-1 shadow-sm">
                        SIAP DIBACA
                    </div>
                )}
                <div className="flex items-start gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 shadow-inner">
                        <Bot className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="w-full">
                        <h3 className="font-extrabold text-slate-800 text-sm mb-1">AI Strategi Penghasilan</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium mb-3">
                            {isUserPro && txCount >= 30 
                                ? "Data sudah lengkap! AI kami telah selesai meracik strategi khusus untukmu."
                                : "Berdasarkan pola transaksi, AI akan meracik strategi penghasilan tambahan khusus untukmu."}
                        </p>
                        
                        {(!isUserPro || txCount < 30) ? (
                            <div className="space-y-1.5 w-full">
                                <div className="flex justify-between text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest">
                                    <span>Mengumpulkan Data</span>
                                    <span>{Math.min(30, txCount)} / 30 Transaksi</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (txCount / 30) * 100)}%` }}></div>
                                </div>
                            </div>
                        ) : null}

                        {!isUserPro && (
                            <Link href="/paywall">
                                <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] py-2.5 rounded-[12px] transition-colors flex items-center justify-center gap-2 shadow-md">
                                    Buka Akses (Mulai Rp 500/hari) <ChevronRight className="w-3 h-3"/>
                                </button>
                            </Link>
                        )}

                        {isUserPro && txCount >= 30 && (
                            <button onClick={fetchAiStrategy} className="mt-3 w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-[11px] py-3 rounded-[12px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(79,70,229,0.3)] animate-pulse">
                                LIHAT HASIL ANALISA SEKARANG <ChevronRight className="w-4 h-4"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="px-1 mt-2">
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-bold text-slate-800 text-sm">Fitur Pilihan</h3>
            </div>
            
            <div 
                className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-2 pt-4 -mt-4 -mx-1"
                onScroll={handleMenuScroll}
            >
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
                
                <div className="min-w-full flex-none snap-center px-1">
                    <div className="grid grid-cols-3 gap-y-6 gap-x-3">
                        <MenuIconBox href="/forex" icon={DollarSign} bg="bg-blue-500" label="Valas" />
                        <MenuIconBox href="/debts" icon={HandCoins} bg="bg-pink-500" label="Hutang" />
                        <MenuIconBox href="/subscriptions" icon={RefreshCcw} bg="bg-teal-400" label="Langganan" />
                        <MenuIconBox href="/investment" icon={TrendingUp} bg="bg-emerald-500" label="Investasi" />
                        <MenuIconBox href="/reports" icon={FileText} bg="bg-orange-400" label="Laporan" />
                        <MenuIconBox href="/scan" icon={Maximize} bg="bg-indigo-500" label="Scan" />
                    </div>
                </div>

                <div className="min-w-full flex-none snap-center px-1">
                    <div className="grid grid-cols-3 gap-y-6 gap-x-3">
                        <MenuIconBox href="/amal" icon={Heart} bg="bg-emerald-500" label="Amal" />
                        <MenuIconBox href="/retained" icon={Clock} bg="bg-amber-500" label="Tertahan" />
                        <MenuIconBox 
                            onClick={() => handleFomoClick("Manajemen Cicilan", "Fitur khusus untuk mencatat dan mengatur semua cicilan Anda secara otomatis setiap bulan agar tidak menumpuk.")} 
                            icon={CreditCard} bg="bg-slate-800" label="Cicilan" badge="SEGERA" 
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-1.5 mt-3">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${activeMenuPage === 0 ? 'bg-indigo-600 w-4' : 'bg-slate-200 w-1.5'}`}></div>
                <div className={`h-1.5 rounded-full transition-all duration-300 ${activeMenuPage === 1 ? 'bg-indigo-600 w-4' : 'bg-slate-200 w-1.5'}`}></div>
            </div>
        </div>

        <div className="px-1 mt-4 mb-2">
            <h3 className="font-bold text-slate-800 text-sm mb-2 px-1 uppercase tracking-widest text-[11px]">Eksklusif Segera Hadir</h3>
            <div onClick={() => handleFomoClick("BILANO Academy", "Kumpulan E-Book Premium dan panduan mengelola uang serta investasi dari pakar finansial.")} className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-700 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-amber-400"/>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-black text-white text-base">BILANO Academy</h3>
                                <span className="text-[9px] font-extrabold bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse shadow-sm">Segera</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">E-Book & Panduan Finansial VIP</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors"/>
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-4 mt-2 px-1">
            <Link href="/chat-ai">
                <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 cursor-pointer flex items-center justify-between active:scale-[0.98] transition-all relative overflow-hidden group">
                    <div className="flex items-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-900 via-indigo-800 to-blue-950 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-blue-900/20">
                            <Bot className="w-6 h-6 text-blue-100"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Tanya AI Assistant</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Konsultasi cerdas 24/7</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 z-10"/>
                </div>
            </Link>

            <Link href="/performance">
                <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 cursor-pointer flex items-center justify-between active:scale-[0.98] transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart className="w-6 h-6 text-orange-500"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Analisa Performa</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Pantau target & grafikmu</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300"/>
                </div>
            </Link>
        </div>

        <div className="mt-8 mb-6 flex flex-col items-center justify-center opacity-60 px-4 text-center">
            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Smart Wealth Management</p>
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                © {new Date().getFullYear()} • Bilano Official
            </p>
        </div>

      </div>
    </MobileLayout>
  );
}

function MenuIconBox({ href, icon: Icon, bg, label, onClick, badge }: any) {
    const content = (
        <div className="relative flex flex-col items-center justify-start gap-2 cursor-pointer active:scale-95 transition-transform group">
            <div className={`${bg} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:shadow-lg transition-all relative`}>
                <Icon className="w-6 h-6"/>
                {badge && (
                    <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full z-10 animate-pulse border border-white shadow-sm">
                        {badge}
                    </span>
                )}
            </div>
            <span className="text-[11px] font-bold text-slate-700 text-center whitespace-nowrap">{label}</span>
        </div>
    );

    if (onClick) {
        return <div onClick={onClick}>{content}</div>;
    }
    return <Link href={href}>{content}</Link>;
}