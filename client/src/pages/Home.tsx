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
  Bot, CheckCircle2, HelpCircle, Notebook, HeartHandshake, Undo2, Lightbulb, Hourglass, ShieldAlert, Sparkles, Banknote
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

  useEffect(() => {
      if (rawEmail && !isAnyDataLoading && user) {
          const premiumPromptSeen = localStorage.getItem(`bilano_premium_prompt_seen_${rawEmail}`);
          
          if (!user.isPro && !premiumPromptSeen) {
              setShowPremiumPrompt(true);
              return; 
          }

          const guideSeen = localStorage.getItem(`bilano_guide_tooltip_seen_${rawEmail}`);
          const profileSeen = localStorage.getItem(`bilano_profile_tooltip_seen_${rawEmail}`);
          const startTimeAcc = new Date(user.createdAt || Date.now()).getTime();
          const isNewUser = (Date.now() - startTimeAcc) < (24 * 60 * 60 * 1000);

          if (isNewUser) {
              if (!guideSeen) {
                  setShowGuideTooltip(true);
                  return;
              } else if (guideSeen && !profileSeen && !user.profilePicture) {
                  const timer = setTimeout(() => setShowProfileTooltip(true), 1000);
                  return () => clearTimeout(timer);
              }
          }
      }
  }, [rawEmail, isAnyDataLoading, user]);

  const handleClosePremiumPrompt = () => {
      setShowPremiumPrompt(false);
      localStorage.setItem(`bilano_premium_prompt_seen_${rawEmail}`, "true"); 
      
      const guideSeen = localStorage.getItem(`bilano_guide_tooltip_seen_${rawEmail}`);
      if (!guideSeen) {
          setTimeout(() => setShowGuideTooltip(true), 400); 
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
          } catch(e) {}

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
      {showPremiumPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-[#040814] rounded-[32px] w-full max-w-sm shadow-[0_0_50px_rgba(59,130,246,0.2)] relative animate-in zoom-in-95 text-center overflow-hidden border border-blue-500/30">
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

      <div className="flex flex-col gap-5">
        {/* --- HEADER: USER PROFILE & QUICK ACTIONS --- */}
        <div className="flex items-center justify-between px-1 pt-1 relative">
            <div className="flex items-center gap-3">
                <div 
                    onClick={() => setIsProfileZoomed(true)} 
                    className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200/70 cursor-pointer hover:scale-105 transition-all active:scale-95 bg-slate-100 shrink-0 flex items-center justify-center"
                >
                    {user?.profilePicture ? (
                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center text-white font-bold text-lg">
                            {greetingName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                
                <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                        Selamat Datang
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <h2 className="text-base font-bold text-slate-900 capitalize leading-tight truncate max-w-[140px]">
                            {greetingName}
                        </h2>
                        
                        {user ? (
                            user.isPro === true ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-[10px] font-bold tracking-tight shadow-xs">
                                    <Crown className="w-3 h-3 text-amber-500" />
                                    PRO
                                </span>
                            ) : (
                                <Link href="/paywall">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-600 font-bold text-[10px] tracking-wider hover:bg-indigo-100 transition-colors cursor-pointer shrink-0">
                                        UPGRADE
                                    </span>
                                </Link>
                            )
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <button 
                    onClick={handleRefresh}
                    className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-xs border border-slate-200/80 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 active:scale-95 transition-all shrink-0"
                    title="Refresh Aplikasi"
                >
                    <RefreshCcw className="w-4 h-4"/>
                </button>

                <button 
                    onClick={handleUndo}
                    disabled={undoTx.isPending}
                    className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-xs border border-slate-200/80 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 active:scale-95 transition-all shrink-0"
                    title="Batalkan Transaksi Terakhir"
                >
                    {undoTx.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Undo2 className="w-4 h-4"/>}
                </button>

                <div className="relative shrink-0">
                    <button 
                        onClick={() => { setIsMenuOpen(!isMenuOpen); dismissGuideTooltip(); }}
                        className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-xs border border-slate-200/80 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                        <MoreVertical className="w-4 h-4"/>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-11 right-0 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <Link href="/profile">
                                <button className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2.5 transition-colors">
                                    <User className="w-4 h-4 text-slate-400"/> Edit Profil & Sandi
                                </button>
                            </Link>
                            <Link href="/security">
                                <button className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2.5 transition-colors">
                                    <ShieldCheck className="w-4 h-4 text-slate-400"/> Keamanan
                                </button>
                            </Link>
                            <div className="h-px bg-slate-100 my-1 mx-2"></div>
                            <button onClick={handleLogout} className="w-full text-left px-3.5 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-bold transition-colors">
                                <LogOut className="w-4 h-4 text-rose-500"/> Keluar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* --- HERO BALANCE CARD: TACTILE FINTECH SURFACE --- */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] text-white p-6 shadow-xl border border-slate-700/60 transition-all hover:border-slate-600">
           {/* Ambient Lighting & Depth Highlights */}
           <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
           <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none"></div>
           <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent"></div>

           <div className="relative z-10 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">Saldo Kas Utama</span>
                  </div>
                  <button 
                      onClick={togglePrivacy} 
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10 active:scale-90"
                      title={isPrivacyMode ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                  >
                      {isPrivacyMode ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
              </div>
              
              <div className="flex items-baseline gap-1 my-1">
                 <h2 className={`${getBalanceTextSize(displayBalance)} font-black tracking-tight text-white drop-shadow-sm flex items-center whitespace-nowrap transition-all duration-300 font-mono`}>
                    {displayBalance}
                 </h2>
              </div>

              <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Status Arus Kas</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-slate-200">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Aktif & Terkendali</span>
                  </div>
              </div>
           </div>
        </div>

        {/* --- PEMASUKAN & PENGELUARAN MICRO CARDS --- */}
        <div className="grid grid-cols-2 gap-3">
           <Link href="/income">
               <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 cursor-pointer flex flex-col gap-2.5 active:scale-[0.98] transition-all group hover:border-emerald-200 hover:shadow-md relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pemasukan</span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform shadow-xs shrink-0">
                            <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-base font-bold text-slate-900 tracking-tight leading-none truncate font-mono">
                            {isPrivacyMode ? "••••••" : formatCurrency(income).split(",")[0]}
                        </p>
                    </div>
               </div>
           </Link>
           <Link href="/expense">
               <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 cursor-pointer flex flex-col gap-2.5 active:scale-[0.98] transition-all group hover:border-rose-200 hover:shadow-md relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pengeluaran</span>
                        <div className="w-7 h-7 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform shadow-xs shrink-0">
                            <TrendingUp className="w-3.5 h-3.5 rotate-180" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-base font-bold text-slate-900 tracking-tight leading-none truncate font-mono">
                            {isPrivacyMode ? "••••••" : formatCurrency(expense).split(",")[0]}
                        </p>
                    </div>
               </div>
           </Link>
        </div>

        {/* --- FITUR PILIHAN: UNIFIED SQUIRCLE TILES --- */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">Fitur Pilihan</h3>
                <span className="text-[11px] font-semibold text-slate-400">Navigasi Utama</span>
            </div>
            
            <div 
                className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-1 -mx-1"
                onScroll={handleMenuScroll}
            >
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
                
                <div className="min-w-full flex-none snap-center px-1">
                    <div className="grid grid-cols-3 gap-y-5 gap-x-3">
                        <MenuIconTile href="/forex" icon={DollarSign} label="Valas" accent="blue" />
                        <MenuIconTile href="/debts" icon={HandCoins} label="Hutang" accent="rose" />
                        <MenuIconTile href="/subscriptions" icon={RefreshCcw} label="Langganan" accent="teal" />
                        <MenuIconTile href="/investment" icon={TrendingUp} label="Investasi" accent="emerald" />
                        <MenuIconTile href="/reports" icon={FileText} label="Laporan" accent="amber" />
                        <MenuIconTile href="/scan" icon={ScanLine} label="Scan Struk" accent="indigo" />
                    </div>
                </div>

                <div className="min-w-full flex-none snap-center px-1">
                    <div className="grid grid-cols-3 gap-y-5 gap-x-3">
                        <MenuIconTile href="/amal" icon={HeartHandshake} label="Amal" accent="emerald" />
                        <MenuIconTile href="/retained" icon={Hourglass} label="Tertahan" accent="amber" />
                        
                        <div 
                            onClick={() => setPendingFeatureModal({ title: "Manajemen Cicilan", desc: "Fitur kalkulator dan pemantau pembayaran cicilan e-commerce otomatis sedang dikembangkan." })} 
                            className="flex flex-col items-center justify-start gap-2 cursor-pointer active:scale-95 transition-transform group"
                        >
                            <div className="w-13 h-13 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-center text-slate-700 shadow-xs group-hover:border-slate-300 group-hover:bg-slate-100/70 transition-all">
                                <CreditCard className="w-5 h-5 text-slate-600"/>
                            </div>
                            <span className="text-xs font-semibold text-slate-700 text-center whitespace-nowrap">Cicilan</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-1.5 mt-4">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${activeMenuPage === 0 ? 'bg-slate-900 w-5' : 'bg-slate-200 w-1.5'}`}></div>
                <div className={`h-1.5 rounded-full transition-all duration-300 ${activeMenuPage === 1 ? 'bg-slate-900 w-5' : 'bg-slate-200 w-1.5'}`}></div>
            </div>
        </div>

        {/* --- EKSKLUSIF PREMIUM: LUXURY OBSIDIAN CARDS --- */}
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Eksklusif Premium</h3>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80">VIP ACCESS</span>
            </div>
            
            <Link href="/wealth-blueprint">
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-4.5 shadow-md border border-slate-800 hover:border-indigo-500/40 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-36 h-36 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:from-emerald-500/20 transition-colors"></div>
                    <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xs shrink-0">
                                <Banknote className="w-5 h-5 text-slate-950"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="font-bold text-white text-sm tracking-tight">Pembimbing Penghasilan</h4>
                                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/30 uppercase tracking-wider">LIVE</span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium">Strategi & Peta Jalur Cuan AI</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0"/>
                    </div>
                </div>
            </Link>

            <Link href="/academy">
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-4.5 shadow-md border border-slate-800 hover:border-amber-500/30 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-amber-400"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="font-bold text-white text-sm tracking-tight">BILANO Academy</h4>
                                    <span className="bg-amber-400/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-amber-400/30 uppercase">E-BOOK</span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium">E-Book & Panduan Finansial VIP</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0"/>
                    </div>
                </div>
            </Link>
        </div>

        {/* --- BOTTOM ACTION TILES: UNIFIED SQUIRCLES --- */}
        <div className="flex flex-col gap-3">
            <Link href="/chat-ai">
                <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 hover:border-indigo-200 hover:shadow-md cursor-pointer flex items-center justify-between active:scale-[0.98] transition-all relative overflow-hidden group">
                    <div className="flex items-center gap-3.5 z-10">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs shrink-0">
                            <Bot className="w-5 h-5 text-indigo-600"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Tanya AI Assistant</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">Konsultasi cerdas & analisis finansial 24/7</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all z-10 shrink-0"/>
                </div>
            </Link>

            <Link href="/performance">
                <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 hover:border-slate-300 hover:shadow-md cursor-pointer flex items-center justify-between active:scale-[0.98] transition-all group">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs shrink-0">
                            <BarChart3 className="w-5 h-5 text-slate-700"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Analisa Performa</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">Pantau target kekayaan & grafik arus kas</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0"/>
                </div>
            </Link>
        </div>

        {/* --- FOOTER BRANDING --- */}
        <div className="mt-4 mb-6 flex flex-col items-center justify-center opacity-60 px-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Smart Wealth Management</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                © {new Date().getFullYear()} • Bilano Official
            </p>
        </div>
      </div>
    </MobileLayout>
  );
}

interface MenuIconTileProps {
    href: string;
    icon: any;
    label: string;
    accent?: "blue" | "rose" | "teal" | "emerald" | "amber" | "indigo" | "violet";
}

function MenuIconTile({ href, icon: Icon, label, accent = "indigo" }: MenuIconTileProps) {
    const accentStyles = {
        blue: "text-blue-600 bg-blue-50/80 border-blue-100 group-hover:border-blue-200",
        rose: "text-rose-600 bg-rose-50/80 border-rose-100 group-hover:border-rose-200",
        teal: "text-teal-600 bg-teal-50/80 border-teal-100 group-hover:border-teal-200",
        emerald: "text-emerald-600 bg-emerald-50/80 border-emerald-100 group-hover:border-emerald-200",
        amber: "text-amber-600 bg-amber-50/80 border-amber-100 group-hover:border-amber-200",
        indigo: "text-indigo-600 bg-indigo-50/80 border-indigo-100 group-hover:border-indigo-200",
        violet: "text-purple-600 bg-purple-50/80 border-purple-100 group-hover:border-purple-200",
    };

    return (
        <Link href={href}>
            <div className="flex flex-col items-center justify-start gap-2 cursor-pointer active:scale-95 transition-all group">
                <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:shadow-sm transition-all ${accentStyles[accent] || accentStyles.indigo}`}>
                    <Icon className="w-5 h-5"/>
                </div>
                <span className="text-xs font-semibold text-slate-700 text-center whitespace-nowrap group-hover:text-slate-900 transition-colors">{label}</span>
            </div>
        </Link>
    );
}