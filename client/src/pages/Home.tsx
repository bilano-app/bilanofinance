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
  HandCoins, RefreshCcw, FileText, LogOut, User, BarChart3, ChevronRight,
  MoreVertical, ShieldCheck, ScanLine, Crown, EyeOff, Eye, Lock, X, Loader2,
  BellRing, Mic, Camera, AlertTriangle, BookOpen, Rocket, CreditCard,
  Bot, CheckCircle2, HelpCircle, Notebook, HeartHandshake, Undo2, Lightbulb, Hourglass, ShieldAlert, Sparkles 
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/tracking";

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
    "Waktu di pasar saham jauh lebih penting daripada sekadar menebak waktu pasar (Time in the market > Timing the market).",
    "Pemasukan yang besar tanpa manajemen yang baik hanya akan menghasilkan kebangkrutan yang tertunda.",
    "Uang adalah majikan yang buruk, tetapi merupakan pelayan yang sangat baik.",
    "Aturan 50/30/20: 50% Kebutuhan, 30% Keinginan, 20% Tabungan & Investasi.",
    "Jika kamu membeli barang yang tidak kamu butuhkan, kelak kamu harus menjual barang yang kamu butuhkan.",
    "Pasar saham adalah alat untuk mentransfer uang dari orang yang tidak sabar kepada orang yang sabar.",
    "Pahami perbedaan antara 'Saya mampu membelinya' dan 'Saya mampu membayarnya tanpa mengorbankan masa depan'.",
    "Orang kaya membeli aset, orang miskin membeli liabilitas yang mereka pikir adalah aset.",
    "Inflasi adalah pencuri diam-diam. Jika uangmu hanya diam di bawah kasur, nilainya terus merosot setiap hari.",
    "Pendapatan pasif (Passive Income) adalah kunci menuju kebebasan finansial sejati.",
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
  const [pendingFeatureModal, setPendingFeatureModal] = useState<{title: string, desc: string} | null>(null);

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isRequestingPerms, setIsRequestingPerms] = useState(false);
  
  const [showGuideTooltip, setShowGuideTooltip] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  
  // 🔥 State Baru untuk pop-up penawaran paket premium
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);

  const [dueSub, setDueSub] = useState<any | null>(null);
  const [dynamicAmount, setDynamicAmount] = useState("");

  const [activeMenuPage, setActiveMenuPage] = useState(0);

  const [isLongLoading, setIsLongLoading] = useState(false);
  const [loadingTipIndex, setLoadingTipIndex] = useState(() => Math.floor(Math.random() * FINANCIAL_TIPS.length));
  
  const [showRetryButton, setShowRetryButton] = useState(false);

  const isStandalone = typeof window !== 'undefined' && 
      (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

  const rawEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  
  useEffect(() => {
      if (rawEmail && user && user.username === 'guest') {
          window.location.reload();
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

  // 🚀 LOGIKA PEMICU POP-UP PREMIUM & BUBBLE CHAT (URUTAN INSTAN)
  useEffect(() => {
      if (rawEmail && !isAnyDataLoading && user) {
          const premiumPromptSeen = localStorage.getItem(`bilano_premium_prompt_seen_${rawEmail}`);
          
          // 1. POP-UP PREMIUM MUNCUL PERTAMA KALI JIKA BELUM PRO & BELUM PERNAH LIHAT
          if (!user.isPro && !premiumPromptSeen) {
              setShowPremiumPrompt(true);
              return; // Tahan dulu bubble chat panduan agar tidak bertabrakan
          }

          // 2. BUBBLE CHAT PANDUAN (Baru muncul setelah Pop-up Premium diladeni)
          const guideSeen = localStorage.getItem(`bilano_guide_tooltip_seen_${rawEmail}`);
          const profileSeen = localStorage.getItem(`bilano_profile_tooltip_seen_${rawEmail}`);
          const startTimeAcc = new Date(user.createdAt || Date.now()).getTime();
          const isNewUser = (Date.now() - startTimeAcc) < (24 * 60 * 60 * 1000);

          if (isNewUser) {
              if (!guideSeen) {
                  // MUNCUL INSTAN TANPA DELAY 1.5s
                  setShowGuideTooltip(true);
                  return;
              } else if (guideSeen && !profileSeen && !user.profilePicture) {
                  const timer = setTimeout(() => setShowProfileTooltip(true), 1000);
                  return () => clearTimeout(timer);
              }
          }
      }
  }, [rawEmail, isAnyDataLoading, user]);

  // 🚀 FUNGSI TUTUP MODAL PREMIUM (TULIS FLAG KE STORAGE & LANGKAHKAN KE BUBBLE PANDUAN)
  const handleClosePremiumPrompt = () => {
      setShowPremiumPrompt(false);
      localStorage.setItem(`bilano_premium_prompt_seen_${rawEmail}`, "true"); // Kunci mati selamanya
      
      // Trigger bubble chat panduan secara instan setelah pop-up ditutup pengguna
      const guideSeen = localStorage.getItem(`bilano_guide_tooltip_seen_${rawEmail}`);
      if (!guideSeen) {
          setTimeout(() => setShowGuideTooltip(true), 400); // Beri jeda halus setelah modal hilang
      }
  };

  const dismissGuideTooltip = () => {
      setShowGuideTooltip(false);
      localStorage.setItem(`bilano_guide_tooltip_seen_${rawEmail}`, "true");
      
      const profileSeen = localStorage.getItem(`bilano_profile_tooltip_seen_${rawEmail}`);
      const startTimeAcc = new Date(user?.createdAt || Date.now()).getTime();
      const isNewUser = (Date.now() - startTimeAcc) < (24 * 60 * 60 * 1000);
      
      if (isNewUser && !profileSeen && !user?.profilePicture) {
          setTimeout(() => {
              setShowProfileTooltip(true);
          }, 600); 
      }
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
          window.location.reload(); 
      } catch (e: any) {
          toast({ title: "Gagal Undo", description: e.message, variant: "destructive" });
      }
  };

  const handleRefresh = () => {
      window.location.reload();
  };

  const userEmail = rawEmail || "Pengguna";
  const greetingName = user?.firstName ? user.firstName : userEmail.split("@")[0];

  const handleMenuScroll = (e: any) => {
      const scrollLeft = e.target.scrollLeft;
      const width = e.target.clientWidth;
      const pageIndex = Math.round(scrollLeft / width);
      setActiveMenuPage(pageIndex);
  };

  useEffect(() => {
      if (!subscriptions) return;
      const todayStr = new Date().toISOString().split('T')[0];
      
      const due = subscriptions.find((sub: any) => {
          if (!sub.isActive) return false; 
          
          const nextDate = new Date(sub.nextPaymentDate);
          const today = new Date();
          today.setHours(0,0,0,0);
          nextDate.setHours(0,0,0,0);
          
          if (nextDate > today) return false; 
          if (localStorage.getItem(`skip_sub_${sub.id}_${todayStr}`)) return false; 
          
          return true;
      });

      setDueSub(due || null);
  }, [subscriptions]);

  const handlePaySub = async () => {
      if (!dueSub) return;
      if (dueSub.category === 'dinamis' && !dynamicAmount) return;

      const amountToPay = dueSub.category === 'dinamis' ? parseFloat(dynamicAmount) : dueSub.price;

      try {
          await fetch("/api/transactions", {
              method: "POST", headers: { "Content-Type": "application/json", "x-user-email": rawEmail },
              body: JSON.stringify({ 
                  type: 'expense', 
                  amount: amountToPay, 
                  category: "Tagihan Bulanan", 
                  description: `Bayar Tagihan: ${dueSub.name}`,
                  date: new Date(dueSub.nextPaymentDate)
              })
          });

          const nextDate = new Date(dueSub.nextPaymentDate);
          if (dueSub.cycle === 'yearly') {
              nextDate.setFullYear(nextDate.getFullYear() + 1);
          } else {
              nextDate.setMonth(nextDate.getMonth() + 1);
          }

          await fetch(`/api/subscriptions/${dueSub.id}`, { method: "DELETE", headers: { "x-user-email": rawEmail } });
          await fetch("/api/subscriptions", {
              method: "POST", headers: { "Content-Type": "application/json", "x-user-email": rawEmail },
              body: JSON.stringify({ 
                  name: dueSub.name, 
                  price: dueSub.price, 
                  cost: dueSub.price, 
                  cycle: dueSub.cycle, 
                  nextPaymentDate: nextDate.toISOString(), 
                  nextBilling: nextDate.toISOString(), 
                  category: dueSub.category, 
                  isActive: true 
              })
          });

          toast({ title: "Tagihan Terekap!", description: "Pengeluaran berhasil dicatat ke laporan." });
          setDueSub(null); setDynamicAmount(""); refetchSubs();
      } catch (e) {
          toast({ title: "Gagal memproses", variant: "destructive" });
      }
  };

  const handleSkipSub = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(`skip_sub_${dueSub.id}_${todayStr}`, "true");
      setDueSub(null);
  };

  const handleStopSub = async () => {
      if (!confirm(`Berhenti berlangganan ${dueSub.name}? Statusnya akan diubah menjadi non-aktif.`)) return;
      try {
          await fetch(`/api/subscriptions/${dueSub.id}/status`, {
              method: "PATCH", 
              headers: { "Content-Type": "application/json", "x-user-email": rawEmail },
              body: JSON.stringify({ isActive: false })
          });
          toast({ title: "Langganan Dihentikan", description: "Layanan telah masuk ke daftar Non-Aktif." });
          setDueSub(null); setDynamicAmount(""); refetchSubs();
      } catch (e) {
          toast({ title: "Gagal memproses", variant: "destructive" });
      }
  };

  const isTargetEmpty = !isTargetLoading && target !== undefined && typeof target === 'object' && target !== null && Object.keys(target).length === 0;

  useEffect(() => {
      if (!isUserLoading && !isTargetLoading && target !== undefined) {
          if (isTargetEmpty) {
              setLocation("/target");
          }
      }
  }, [isTargetEmpty, isUserLoading, isTargetLoading, setLocation]);

  const requestAllPermissions = async () => {
      setIsRequestingPerms(true);
      try {
          const timeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Timeout dari Browser")), 4000)
          );

          if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
              await Promise.race([Notification.requestPermission(), timeout]).catch(() => {});
          }

          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              await Promise.race([
                  navigator.mediaDevices.getUserMedia({ video: true, audio: true }), 
                  timeout
              ]).catch(() => {});
          }

          try { 
              (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
              (window as any).OneSignalDeferred.push(function(OneSignal: any) {
                  OneSignal.Slidedown.promptPush();
              });
          } catch(e) {
              console.error("Gagal pancing OneSignal:", e);
          }

      } catch (e) {
          console.warn("Proses perizinan di-bypass karena terlalu lama.");
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
        const isDismissed = localStorage.getItem(`bilano_target_done_${target.id}`);
        if (!isDismissed) setShowTargetModal(true);
    }
  }, [target, totalBalance]);

  const dismissTargetModal = () => {
      if (target?.id) localStorage.setItem(`bilano_target_done_${target.id}`, "true");
      setShowTargetModal(false);
  };

  const handleLogout = async () => {
    try {
        await signOut(auth); 
        localStorage.clear();
        sessionStorage.clear();
        toast({ title: "Sesi Dibersihkan", description: "Berhasil keluar dari aplikasi." });
        window.location.href = "/auth"; 
    } catch (error) { 
        console.error(error); 
    }
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
      t.category !== 'Penyesuaian Sistem' && 
      t.category !== 'Pemutihan Hutang' &&
      t.category !== 'Cairkan Valas' &&
      t.category !== 'Investasi Valas' && 
      t.category !== 'Tukar Valas' &&
      t.category !== 'Jual Aset' &&
      !(t.category || '').includes('Dapat Pinjaman')
  );
  
  const baseExpenseTxs = thisMonthTx.filter(t => 
      (t.type === 'expense' || t.type === 'hutang_record') && 
      !(t.category || '').toLowerCase().includes('invest') && 
      !t.description?.includes('[Offset') && 
      !t.description?.includes('[WRITE_OFF]') && 
      !t.description?.includes('[Catat Awal]') && 
      !t.description?.includes('[Bayar Valas]') && 
      t.category !== 'Penyesuaian Sistem' && 
      t.category !== 'Penghapusan Piutang' &&
      t.category !== 'Tukar Valas' &&
      t.category !== 'Investasi Valas' && 
      t.category !== 'Cairkan Valas' &&
      !(t.category || '').includes('Bayar Hutang') &&
      !(t.category || '').includes('Beri Pinjaman')
  );

  const virtualPLTxs: any[] = [];
  thisMonthTx.filter(t => t.type === 'invest_sell').forEach(t => {
      if (t.description && t.description.includes('P/L:')) {
          const plString = t.description.split('P/L:')[1];
          if (plString) {
              const cleanString = plString.replace(/[^0-9-]/g, '');
              const plValue = parseInt(cleanString, 10);
              if (!isNaN(plValue) && plValue !== 0) {
                  virtualPLTxs.push({ amount: Math.abs(plValue), type: plValue > 0 ? 'income' : 'expense' });
              }
          }
      }
  });

  const income = baseIncomeTxs.reduce((acc, t) => acc + t.amount, 0) + virtualPLTxs.filter(v => v.type === 'income').reduce((acc, v) => acc + v.amount, 0);
  const expense = baseExpenseTxs.reduce((acc, t) => acc + t.amount, 0) + virtualPLTxs.filter(v => v.type === 'expense').reduce((acc, v) => acc + v.amount, 0);

  return (
    <MobileLayout>
      {/* 🔥 POPUP BARU: TAWARAN AKSES FITUR PREMIUM (DESAIN TAJAM EKSKLUSIF) */}
      {showPremiumPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-[#040814] rounded-[32px] w-full max-w-sm shadow-[0_0_50px_rgba(59,130,246,0.2)] relative animate-in zoom-in-95 text-center overflow-hidden border border-blue-500/30">
                  
                  {/* Background Nuansa Logo */}
                  <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none"></div>
                  
                  <div className="p-8 relative z-10">
                      <img 
                          src="/BILANO-PREMIUM.png" 
                          alt="Premium" 
                          className="w-32 h-32 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)] object-contain" 
                      />
                      
                      <h2 className="text-3xl font-black text-white mb-3 tracking-tighter italic">
                          BILANO <span className="text-amber-400">PREMIUM</span>
                      </h2>
                      
                      <p className="text-sm text-blue-100/70 mb-8 leading-relaxed font-medium">
                          Aktifkan <span className="text-white font-bold">Asisten AI Strategis</span>, buka laporan neraca mendalam, dan kuasai kontrol aset penuh sekarang.
                      </p>
                      
                      <div className="space-y-3">
                          <Button 
                              onClick={() => { handleClosePremiumPrompt(); setLocation('/paywall'); }} 
                              className="w-full h-14 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-slate-900 rounded-2xl font-black text-sm shadow-[0_10px_25px_rgba(251,191,36,0.3)] active:scale-95 transition-all border-b-4 border-amber-800"
                          >
                              PILIH PAKET AKSES
                          </Button>
                          
                          <button 
                              onClick={handleClosePremiumPrompt} 
                              className="text-[11px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
                          >
                              Mungkin Nanti
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* POPUP PENDING FEATURES */}
      {pendingFeatureModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 text-center overflow-hidden border border-indigo-500/30">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <button onClick={() => setPendingFeatureModal(null)} className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-rose-500 text-white rounded-full transition-colors z-10"><X className="w-5 h-5"/></button>
                  
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(251,191,36,0.3)] relative z-10 animate-bounce">
                      <Rocket className="w-10 h-10 text-amber-950"/>
                  </div>
                  
                  <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Segera Hadir! 🚀</h2>
                  <p className="text-sm text-indigo-200 mb-6 leading-relaxed px-2 font-medium">
                      Fitur <b className="text-amber-400">{pendingFeatureModal.title}</b> saat ini sedang dalam perakitan tahap akhir oleh tim kami. <br/><br/>
                      {pendingFeatureModal.desc}
                  </p>
                  
                  <Button onClick={() => setPendingFeatureModal(null)} className="w-full h-14 bg-white hover:bg-slate-100 text-indigo-950 rounded-full font-black text-[13px] shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 relative z-10">
                      <CheckCircle2 className="w-5 h-5"/> SAYA MENGERTI
                  </Button>
              </div>
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
                  <HelpCircle className="w-6 h-6 group-hover:animate-bounce" />
                  <span className="absolute right-full mr-3 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Pusat Bantuan
                  </span>
              </button>
          </Link>

          <Link href="/guide">
              <button onClick={dismissGuideTooltip} className="w-12 h-12 bg-sky-400 text-amber-900 rounded-full shadow-lg shadow-sky-200 flex items-center justify-center hover:bg-sky-500 hover:scale-105 active:scale-95 transition-all group relative">
                  <Notebook className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  <span className="absolute right-full mr-3 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Panduan Fitur
                  </span>
              </button>
          </Link>
      </div>

      {dueSub && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className={`bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative text-center border-t-8 ${dueSub.category === 'dinamis' ? 'border-orange-500' : 'border-indigo-500'}`}>
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${dueSub.category === 'dinamis' ? 'bg-orange-100 text-orange-500' : 'bg-indigo-100 text-indigo-500'}`}>
                    {dueSub.category === 'dinamis' ? <AlertTriangle className="w-8 h-8" /> : <RefreshCcw className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 mb-2">Tagihan Jatuh Tempo!</h3>
                
                {dueSub.category === 'dinamis' ? (
                    <>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Waktunya bayar tagihan <strong>{dueSub.name}</strong>. Berapa nominal yang Anda bayarkan bulan ini?
                        </p>
                        <Input 
                            type="number" 
                            placeholder="Masukkan nominal (Rp)..." 
                            value={dynamicAmount} 
                            onChange={e => setDynamicAmount(e.target.value)} 
                            className="h-14 font-bold text-lg mb-4 text-center bg-slate-50 border-transparent rounded-[20px]"
                        />
                    </>
                ) : (
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                        Tagihan <strong>{dueSub.name}</strong> sebesar <strong className="text-slate-800">{formatCurrency(dueSub.price)}</strong> telah jatuh tempo pada tanggal {new Date(dueSub.nextPaymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}. Catat pengeluaran ini sekarang?
                    </p>
                )}

                <div className="space-y-3">
                    <Button onClick={handlePaySub} className={`w-full h-14 rounded-full text-white font-extrabold shadow-lg active:scale-95 transition-transform ${dueSub.category === 'dinamis' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>
                        {dueSub.category === 'dinamis' ? 'BAYAR & CATAT SEKARANG' : 'YA, CATAT PENGELUARAN'}
                    </Button>
                    <Button variant="ghost" onClick={handleSkipSub} className="w-full h-12 rounded-full font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                        Nanti Saja (Lewati Hari Ini)
                    </Button>
                    {dueSub.cycle === 'yearly' && dueSub.category === 'statis' && (
                        <button onClick={handleStopSub} className="text-[11px] font-bold text-rose-400 hover:text-rose-600 hover:underline underline-offset-2 w-full pt-1">
                            Berhenti Berlangganan (Non-aktifkan)
                        </button>
                    )}
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
                          <div className="bg-blue-100 p-2.5 rounded-full text-blue-600"><BellRing className="w-5 h-5"/></div>
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
        {/* 🚀 HEADER AREA: Presisi, Elegan, Sesuai Nuansa UI */}
        <div className="flex items-center justify-between px-2 pt-2 relative">
            
            {/* BAGIAN KIRI: AVATAR & TEKS SAPAAN (LAYOUT PRESISI) */}
            <div className="flex items-center gap-3">
                <div onClick={() => setIsProfileZoomed(true)} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform active:scale-95 bg-slate-100 shrink-0">
                    {user?.profilePicture ? (
                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            {greetingName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                
                {/* 📝 Teks Stack: Mengikuti Contoh Adrien (Rapi & Tidak Wrapping) */}
                <div className="flex flex-col">
                    <p className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        Selamat datang
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <h2 className="text-lg font-extrabold text-slate-800 capitalize leading-tight truncate max-w-[130px]">
                            {greetingName}
                        </h2>
                        
                        {/* 💎 INDIKATOR STATUS PREMIUM (DINAMIS & ELEGAN) */}
                        {user ? (
                            user.isPro === true ? (
                                /* ✅ ✅ MUNCUL MAHKOTA JIKA SUDAH PREMIUM ✅ ✅ */
                                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                                /* ❌ ❌ GANTI TEKS 'UPGRADE' ELEGAN JIKA BELUM PREMIUM ❌ ❌ */
                                /* Diposisikan seperti mahkota, ukuran serasi, warna Soft Gold */
                                <Link href="/paywall">
                                    <span className="text-amber-500 font-bold text-[11px] leading-tight flex items-center hover:text-amber-600 transition-colors cursor-pointer shrink-0">
                                        UPGRADE
                                    </span>
                                </Link>
                            )
                        ) : null}
                    </div>
                </div>
            </div>

            {/* BAGIAN KANAN: TOMBOL AKSI (Bebas dari Tombol Upgrade Gede) */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleRefresh}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 text-indigo-500 hover:text-indigo-700 active:scale-90 transition-all shrink-0"
                    title="Refresh Aplikasi"
                >
                    <RefreshCcw className="w-4 h-4"/>
                </button>

                <button 
                    onClick={handleUndo}
                    disabled={undoTx.isPending}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 active:scale-90 transition-all shrink-0"
                    title="Batalkan Transaksi Terakhir"
                >
                    {undoTx.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Undo2 className="w-4 h-4"/>}
                </button>

                <div className="relative shrink-0">
                    <button 
                        onClick={() => { setIsMenuOpen(!isMenuOpen); dismissGuideTooltip(); }}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4"/>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-12 right-0 w-48 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 py-2 z-50 animate-in slide-in-from-top-2">
                            <Link href="/profile">
                                <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-3"><User className="w-4 h-4 text-slate-400"/> Edit Profil & Sandi</button>
                            </Link>
                            <Link href="/security">
                                <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-slate-400"/> Keamanan</button>
                            </Link>
                            <div className="h-px bg-slate-100 my-1 mx-2"></div>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-bold"><LogOut className="w-4 h-4 text-rose-500"/> Keluar</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* ... Lanjut ke blok SALDO KAS seperti biasa ... */}

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

        <div className="grid grid-cols-2 gap-3 px-1 mt-2">
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

        {/* ❌ BANNER OPSI 2 DI TENGAH SUDAH DIHAPUS TOTAL ❌ */}

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
                        <MenuIconBox href="/scan" icon={ScanLine} bg="bg-indigo-500" label="Scan" />
                    </div>
                </div>

                <div className="min-w-full flex-none snap-center px-1">
                    <div className="grid grid-cols-3 gap-y-6 gap-x-3">
                        <MenuIconBox href="/amal" icon={HeartHandshake} bg="bg-emerald-500" label="Amal" />
                        <MenuIconBox href="/retained" icon={Hourglass} bg="bg-amber-500" label="Tertahan" />
                        
                        <div onClick={() => setPendingFeatureModal({ title: "Manajemen Cicilan", desc: "Fitur kalkulator dan pemantau pembayaran cicilan e-commerce otomatis sedang dikembangkan." })} className="relative flex flex-col items-center justify-start gap-2 cursor-pointer active:scale-95 transition-transform group">
                            <div className={`bg-slate-800 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:shadow-lg transition-all relative`}>
                                <CreditCard className="w-6 h-6"/>
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 text-center whitespace-nowrap">Cicilan</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-1.5 mt-3">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${activeMenuPage === 0 ? 'bg-indigo-600 w-4' : 'bg-slate-200 w-1.5'}`}></div>
                <div className={`h-1.5 rounded-full transition-all duration-300 ${activeMenuPage === 1 ? 'bg-indigo-600 w-4' : 'bg-slate-200 w-1.5'}`}></div>
            </div>
        </div>

        <div className="px-1 mt-4 mb-2 space-y-3">
            <h3 className="font-bold text-slate-800 text-sm mb-1 px-1 uppercase tracking-widest text-[11px]">Eksklusif Premium</h3>
            
            {/* 🔥 NEW FEATURE: BILANO WEALTH BLUEPRINT (GACOR & VIP DESIGN) */}
            <Link href="/wealth-blueprint">
                <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 rounded-[24px] p-5 shadow-[0_8px_30px_rgba(30,41,59,0.2)] border border-indigo-500/20 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group mb-3">
                    <div className="absolute right-0 top-0 w-36 h-36 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:from-indigo-500/20 transition-colors"></div>
                    <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
                                <Sparkles className="w-6 h-6 text-slate-900 animate-pulse"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="font-black text-white text-base tracking-tight">Wealth Blueprint</h3>
                                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-emerald-500/30 uppercase tracking-wider">LIVE</span>
                                </div>
                                <p className="text-[11px] text-indigo-200/70 font-medium">Panduan Penghasilan & AI Peta Cuan</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all"/>
                    </div>
                </div>
            </Link>

            {/* BILANO ACADEMY */}
            <div onClick={() => setPendingFeatureModal({ title: "BILANO Academy", desc: "Materi eksklusif seputar pengelolaan portofolio, analisis bandarmologi, dan edukasi finansial profesional sedang disiapkan." })}>
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-700 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-amber-400"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-white text-base">BILANO Academy</h3>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium">E-Book & Panduan Finansial VIP</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors"/>
                    </div>
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
                            <BarChart3 className="w-6 h-6 text-orange-500"/>
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

function MenuIconBox({ href, icon: Icon, bg, label }: any) {
    return (
        <Link href={href}>
            <div className="relative flex flex-col items-center justify-start gap-2 cursor-pointer active:scale-95 transition-transform group">
                <div className={`${bg} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:shadow-lg transition-all relative`}>
                    <Icon className="w-6 h-6"/>
                </div>
                <span className="text-[11px] font-bold text-slate-700 text-center whitespace-nowrap">{label}</span>
            </div>
        </Link>
    );
}