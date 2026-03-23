import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  useUser, useTransactions, useTarget, 
  useForexAssets, useSubscriptions 
} from "@/hooks/use-finance"; 
import { formatCurrency } from "@/lib/utils";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
  ArrowUpCircle, ArrowDownCircle, 
  TrendingUp, Sparkles, DollarSign, 
  HandCoins, RefreshCcw, FileText, LogOut, User, BarChart3, ChevronRight,
  MoreVertical, ShieldCheck, ScanLine, Crown, EyeOff, Eye, Lock, X, Loader2,
  BellRing, Mic, Camera, AlertTriangle, BookOpen, Rocket
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: transactions, isLoading: isTxLoading } = useTransactions();
  const { data: forexAssets, isLoading: isFxLoading } = useForexAssets(); 
  const { data: target, isLoading: isTargetLoading } = useTarget(); 
  const { data: subscriptions, isLoading: isSubLoading, refetch: refetchSubs } = useSubscriptions();

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileZoomed, setIsProfileZoomed] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false); 
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isRequestingPerms, setIsRequestingPerms] = useState(false);

  const [showProWelcome, setShowProWelcome] = useState(false);
  const [showFomoModal, setShowFomoModal] = useState(false); 

  const [dueDynamicSub, setDueDynamicSub] = useState<any | null>(null);
  const [dynamicAmount, setDynamicAmount] = useState("");

  const rawEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  
  useEffect(() => {
      if (rawEmail && user && user.username === 'guest') {
          console.warn("⚠️ KTP Tertinggal! Sesi membaca akun Guest. Melakukan reload kilat...");
          window.location.reload();
      }
  }, [user, rawEmail]);

  const { data: forexRates = {}, isLoading: isRatesLoading } = useQuery({
      queryKey: ['forexRates', rawEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": rawEmail } });
          return res.json();
      },
      enabled: !!rawEmail
  });

  useEffect(() => {
      setIsPrivacyMode(localStorage.getItem("bilano_privacy") === "true");
      const savedPin = localStorage.getItem("bilano_app_pin");
      const isUnlockedSession = sessionStorage.getItem("bilano_session_unlocked") === "true";
      
      if (savedPin && !isUnlockedSession) setIsLocked(true);

      const hasPrompted = localStorage.getItem("bilano_permissions_prompted");
      if (!hasPrompted) setShowPermissionPrompt(true);
  }, []);

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

  const userEmail = rawEmail || "Pengguna";
  const greetingName = user?.firstName ? user.firstName : userEmail.split("@")[0];
  const isUserPro = user?.isPro || user?.plan === 'pro' || localStorage.getItem("bilano_pro") === "true";

  const handleFomoClick = () => {
      if (isUserPro) {
          toast({ 
              title: "Akses VIP Terjamin! 👑", 
              description: "Karena Anda member PRO, fitur ini akan otomatis terbuka GRATIS saat rilis nanti!" 
          });
      } else {
          setShowFomoModal(true);
      }
  };

  useEffect(() => {
      if (!rawEmail) return;

      (window as any).median_onesignal_info = async function(info: any) {
          const playerId = info?.oneSignalUserId || info?.userId; 
          if (playerId) {
              try {
                  await fetch("/api/user/onesignal", {
                      method: "POST",
                      headers: {
                          "Content-Type": "application/json",
                          "x-user-email": rawEmail
                      },
                      body: JSON.stringify({ onesignalId: playerId })
                  });
              } catch (e) {}
          }
      };

      const timer = setTimeout(() => {
          if (typeof window !== 'undefined' && (window as any).median) {
              (window as any).median.onesignal.info({'callback': 'median_onesignal_info'});
          }
      }, 3000);

      return () => clearTimeout(timer);
  }, [rawEmail]);

  useEffect(() => {
      if (isUserPro && rawEmail) {
          const welcomeKey = `bilano_welcomed_pro_${rawEmail}`;
          if (!localStorage.getItem(welcomeKey)) {
              setTimeout(() => setShowProWelcome(true), 500);
          }
      }
  }, [isUserPro, rawEmail]);

  const handleTutupWelcomePro = () => {
      const welcomeKey = `bilano_welcomed_pro_${rawEmail}`;
      localStorage.setItem(welcomeKey, "true"); 
      setShowProWelcome(false);
  };

  useEffect(() => {
      if (!subscriptions) return;
      const todayStr = new Date().toISOString().split('T')[0];
      
      const due = subscriptions.find(sub => {
          if (!sub.isActive || sub.category !== 'dinamis') return false;
          
          const nextDate = new Date(sub.nextPaymentDate);
          const today = new Date();
          today.setHours(0,0,0,0);
          nextDate.setHours(0,0,0,0);
          
          if (nextDate > today) return false; 
          if (localStorage.getItem(`skip_sub_${sub.id}_${todayStr}`)) return false; 
          
          return true;
      });

      setDueDynamicSub(due || null);
  }, [subscriptions]);

  const handlePayDynamic = async () => {
      if (!dueDynamicSub || !dynamicAmount) return;
      try {
          await fetch("/api/transactions", {
              method: "POST", headers: { "Content-Type": "application/json", "x-user-email": rawEmail },
              body: JSON.stringify({ 
                  type: 'expense', 
                  amount: parseFloat(dynamicAmount), 
                  category: "Tagihan Bulanan", 
                  description: `Bayar Tagihan: ${dueDynamicSub.name}`,
                  date: new Date()
              })
          });

          const nextDate = new Date(dueDynamicSub.nextPaymentDate);
          if (dueDynamicSub.cycle === 'yearly') {
              nextDate.setFullYear(nextDate.getFullYear() + 1);
          } else {
              nextDate.setMonth(nextDate.getMonth() + 1);
          }

          await fetch(`/api/subscriptions/${dueDynamicSub.id}`, { method: "DELETE", headers: { "x-user-email": rawEmail } });
          await fetch("/api/subscriptions", {
              method: "POST", headers: { "Content-Type": "application/json", "x-user-email": rawEmail },
              body: JSON.stringify({ 
                  name: dueDynamicSub.name, 
                  price: dueDynamicSub.price, 
                  cost: dueDynamicSub.price, 
                  cycle: dueDynamicSub.cycle, 
                  nextPaymentDate: nextDate.toISOString(), 
                  nextBilling: nextDate.toISOString(), 
                  category: dueDynamicSub.category, 
                  isActive: true 
              })
          });

          toast({ title: "Tagihan Lunas!", description: "Pengeluaran berhasil dicatat." });
          setDueDynamicSub(null); setDynamicAmount(""); refetchSubs();
      } catch (e) {
          toast({ title: "Gagal memproses", variant: "destructive" });
      }
  };

  const handleSkipDynamic = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(`skip_sub_${dueDynamicSub.id}_${todayStr}`, "true");
      setDueDynamicSub(null);
  };

  useEffect(() => {
      if (isUserPro || !user) return;
      
      const startTime = new Date(user.createdAt || Date.now()).getTime();
      const daysPassed = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
      const TRIAL_DURATION_DAYS = 3; 

      if (daysPassed >= TRIAL_DURATION_DAYS) {
          setTrialDaysLeft(0);
      } else {
          setTrialDaysLeft(Math.ceil(TRIAL_DURATION_DAYS - daysPassed));
      }
  }, [isUserPro, user]);

  useEffect(() => {
      if (!isUserLoading && !isTargetLoading) {
          if (target !== undefined && target !== null && typeof target === 'object' && Object.keys(target).length === 0) {
              setLocation("/target");
          }
      }
  }, [target, isUserLoading, isTargetLoading, setLocation]);

  const requestAllPermissions = async () => {
      setIsRequestingPerms(true);
      try {
          if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
              await Notification.requestPermission();
          }
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => {});
          }
          
          if (typeof window !== 'undefined' && (window as any).median) {
              (window as any).median.onesignal.register();
          }

      } catch (e) {
      } finally {
          localStorage.setItem("bilano_permissions_prompted", "true");
          setShowPermissionPrompt(false);
          setIsRequestingPerms(false);
          toast({ title: "Terima Kasih!", description: "Sistem pengingat otomatis telah diaktifkan." });
      }
  };

  const skipPermissions = () => {
      localStorage.setItem("bilano_permissions_prompted", "true");
      setShowPermissionPrompt(false);
  };

  const cashRupiah = (user?.cashBalance || 0); 
  const forexValue = (forexAssets || []).reduce((acc, asset) => acc + (asset.amount * (forexRates[asset.currency] || 0)), 0);
  const totalBalance = cashRupiah + forexValue;

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
        localStorage.removeItem("bilano_auth");
        localStorage.removeItem("bilano_email");
        sessionStorage.removeItem("bilano_session_unlocked");
        localStorage.removeItem("bilano_trial_expired"); 
        localStorage.removeItem("bilano_pro"); 
        
        toast({ title: "Berhasil Keluar", description: "Sampai jumpa lagi!" });
        setLocation("/auth"); 
    } catch (error) { console.error(error); }
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const income = transactions?.filter(t => {
      const d = new Date(t.date);
      return t.type === 'income' && (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
  }).reduce((acc, t) => acc + t.amount, 0) || 0;

  const expense = transactions?.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
  }).reduce((acc, t) => acc + t.amount, 0) || 0;
  
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

  if (isUserLoading || isTargetLoading || isRatesLoading || isTxLoading || isFxLoading || isSubLoading || !user || !transactions || (user && user.username === 'guest')) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span>Menyiapkan Dasbor...</span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 mt-4 max-w-[200px] text-center animate-pulse">Menyinkronkan data dengan aman...</p>
          </div>
      );
  }

  return (
    <MobileLayout>

      {/* 🚀 MODAL RANJAU FOMO (KONTEN DIUBAH MENJADI 100% JUJUR) */}
      {showFomoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 text-center overflow-hidden border-[3px] border-amber-100">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-100 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <button onClick={() => setShowFomoModal(false)} className="absolute top-4 right-4 p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors z-10"><X className="w-5 h-5"/></button>
                  
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(251,191,36,0.4)] relative z-10">
                      <Rocket className="w-10 h-10 text-amber-950"/>
                  </div>
                  
                  {/* 🚀 TEKS FOMO YANG JUJUR (ROADMAP) */}
                  <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Misi Selanjutnya! 🚀</h2>
                  <p className="text-sm text-slate-500 mb-5 leading-relaxed px-2">
                      Fitur <b>BILANO Academy (E-Book Premium)</b> adalah salah satu inovasi besar yang masuk dalam rencana pengembangan (roadmap) kami ke depan.
                  </p>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-4 mb-6 text-left relative z-10 shadow-inner">
                      <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600"/>
                          <span className="text-xs font-extrabold text-amber-800 uppercase tracking-widest">PERHATIAN PENTING</span>
                      </div>
                      <p className="text-[12px] text-amber-700 leading-relaxed font-medium">
                          Begitu fitur eksklusif ini diluncurkan nanti, harga langganan pengguna baru pasti akan <b className="text-rose-600">DINAIKKAN</b>. <br/><br/>
                          Kabar baiknya: Kunci harga Anda di <b>Rp 99.000/tahun HARI INI</b>, dan Anda akan mendapatkan fitur ini secara <b>GRATIS</b> seumur hidup saat rilis nanti tanpa biaya tambahan!
                      </p>
                  </div>
                  
                  <Button onClick={() => { setShowFomoModal(false); setLocation('/paywall'); }} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-black text-[13px] shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 relative z-10">
                      <Lock className="w-4 h-4"/> AMANKAN HARGA SAYA ➔
                  </Button>
              </div>
          </div>
      )}

      {dueDynamicSub && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative text-center border-t-8 border-orange-500">
                <div className="w-16 h-16 mx-auto bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8" />
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

                    <Button 
                        onClick={handleTutupWelcomePro}
                        className="w-full h-14 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-950 font-black text-[15px] rounded-full shadow-xl shadow-amber-500/20 active:scale-95 transition-transform"
                    >
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
        <div className="flex items-center justify-between px-2 pt-2">
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
                            <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-3">
                                <User className="w-4 h-4 text-slate-400"/> Edit Profil
                            </button>
                        </Link>
                        <Link href="/security">
                            <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-3">
                                <ShieldCheck className="w-4 h-4 text-slate-400"/> Keamanan
                            </button>
                        </Link>
                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                        <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-bold">
                            <LogOut className="w-4 h-4 text-rose-500"/> Keluar
                        </button>
                    </div>
                )}
            </div>
        </div>

        {!isUserPro && trialDaysLeft !== null && (
            <div className={`mx-1 mt-[-10px] rounded-[20px] p-4 shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 ${trialDaysLeft === 0 ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white' : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950'}`}>
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                        {trialDaysLeft === 0 ? <Lock className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-widest mb-0.5">
                            {trialDaysLeft === 0 ? "MASA COBA HABIS" : "Masa Coba Gratis"}
                        </p>
                        <p className="text-xs font-medium opacity-90">
                            {trialDaysLeft === 0 ? "Fungsi aplikasi dikunci." : <span>Sisa waktu: <b>{trialDaysLeft} Hari</b></span>}
                        </p>
                    </div>
                </div>
                <Link href="/paywall">
                    <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-[10px] font-extrabold backdrop-blur-sm transition-all active:scale-95 shadow-sm">
                        {trialDaysLeft === 0 ? "BUKA KUNCI" : "UPGRADE PRO"}
                    </button>
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
                  {forexValue > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-100 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                          <span>Valas:</span> <span className="font-bold text-white">{isPrivacyMode ? "•••" : formatCurrency(forexValue).split(",")[0]}</span>
                      </div>
                  )}
              </div>
           </div>
           <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/5 rounded-tl-full pointer-events-none"></div>
           <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
           <div className="absolute left-0 bottom-0 w-24 h-24 bg-blue-400/20 rounded-tr-full blur-xl pointer-events-none"></div>
        </div>

        <div className="grid grid-cols-2 gap-4 px-1">
           <Link href="/income">
               <div className="bg-white p-4 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 cursor-pointer flex flex-col justify-between h-28 active:scale-95 transition-all group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2 group-hover:bg-emerald-100 transition-colors">
                        <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pemasukan</p>
                        <p className="text-base font-extrabold text-slate-800 leading-tight">{isPrivacyMode ? "••••••" : formatCurrency(income).split(",")[0]}</p>
                    </div>
               </div>
           </Link>
           <Link href="/expense">
               <div className="bg-white p-4 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 cursor-pointer flex flex-col justify-between h-28 active:scale-95 transition-all group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mb-2 group-hover:bg-rose-100 transition-colors">
                        <ArrowUpCircle className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pengeluaran</p>
                        <p className="text-base font-extrabold text-slate-800 leading-tight">{isPrivacyMode ? "••••••" : formatCurrency(expense).split(",")[0]}</p>
                    </div>
               </div>
           </Link>
        </div>

        <div className="px-1 mt-2">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Fitur Pilihan</h3>
            <div className="grid grid-cols-3 gap-y-6 gap-x-3">
                <MenuIconBox href="/forex" icon={DollarSign} bg="bg-blue-500" label="Valas" />
                <MenuIconBox href="/debts" icon={HandCoins} bg="bg-pink-500" label="Hutang" />
                <MenuIconBox href="/subscriptions" icon={RefreshCcw} bg="bg-teal-400" label="Langganan" />
                <MenuIconBox href="/investment" icon={TrendingUp} bg="bg-emerald-500" label="Investasi" />
                <MenuIconBox href="/reports" icon={FileText} bg="bg-orange-400" label="Laporan" />
                <MenuIconBox href="/scan" icon={ScanLine} bg="bg-indigo-500" label="Scan" />
            </div>
        </div>

        {/* ======================================================== */}
        {/* 🚀 BANNER FOMO: E-BOOK (BILANO ACADEMY) NATIVE-LOOK      */}
        {/* ======================================================== */}
        <div className="px-1 mt-6 mb-2">
            <div onClick={handleFomoClick} className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-700 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group">
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
        {/* ======================================================== */}

        <div className="flex flex-col gap-4 mt-2 px-1">
            <Link href="/chat-ai">
                <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 cursor-pointer flex items-center justify-between active:scale-[0.98] transition-all relative overflow-hidden group">
                    <div className="flex items-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles className="w-6 h-6 text-indigo-600"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Tanya AI Assistant</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Konsultasi cerdas 24/7</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 z-10"/>
                    <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-indigo-50 to-transparent pointer-events-none"></div>
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

        <div className="mt-8 mb-6 flex flex-col items-center justify-center opacity-60">
            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Smart Wealth Management</p>
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
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
            <div className="flex flex-col items-center justify-start gap-2 cursor-pointer active:scale-95 transition-transform group">
                <div className={`${bg} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:shadow-lg transition-all`}>
                    <Icon className="w-6 h-6"/>
                </div>
                <span className="text-[11px] font-bold text-slate-700 text-center">{label}</span>
            </div>
        </Link>
    )
}