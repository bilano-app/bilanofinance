import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { WifiOff, RefreshCw, Lock, AlertOctagon } from "lucide-react"; 
import { useNotifications } from "./hooks/useNotifications"; 
import { useUser } from "./hooks/use-finance"; 

// =========================================================================
// 🚀 KUNCI MEMORI AGAR ANGKA TIDAK BERKEDIP
// =========================================================================
queryClient.setDefaultOptions({
  queries: {
    refetchOnWindowFocus: true, 
    refetchOnMount: true,       
    refetchOnReconnect: true,
    staleTime: 1000 * 60 * 5,   
    retry: 1                    
  },
});

// =========================================================================
// 🛡️ INTERCEPTOR API: INJEKSI HEADER & DETEKSI BLOKIR DARI BACKEND
// =========================================================================
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input as Request).url;
  const email = localStorage.getItem("bilano_email");

  const newHeaders = new Headers(init.headers);
  if (email && url.includes('/api')) {
    if (!newHeaders.has('x-user-email')) {
      newHeaders.set('x-user-email', email);
    }
  }
  init.headers = newHeaders;

  try {
    const response = await originalFetch(input, init);
    // TANGKAP PENOLAKAN DARI SATPAM BACKEND (402 EXPIRED)
    if (response.status === 402) {
        window.dispatchEvent(new Event('trigger-expired-lock'));
    }
    return response;
  } catch (error) {
    return Promise.reject(error);
  }
};

const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

// @ts-ignore
XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
    (this as any)._url = url;
    return originalXhrOpen.apply(this, [method, url, ...args] as any);
};

// @ts-ignore
XMLHttpRequest.prototype.send = function(...args: any[]) {
    if ((this as any)._url && typeof (this as any)._url === 'string' && (this as any)._url.includes('/api')) {
        const email = localStorage.getItem("bilano_email");
        if (email) {
            this.setRequestHeader('x-user-email', email);
        }
    }
    return originalXhrSend.apply(this, args as any);
};

// =========================================================================
// 🚀 GATEKEEPER KHUSUS TERMINAL EXPERT (Blokir akses dari HP)
// =========================================================================
function DesktopRequiredGate({ children }: { children: React.ReactNode }) {
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
  
  if (isMobileScreen) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-center p-6 text-slate-300">
        <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
           <Lock className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Gunakan PC/Laptop</h2>
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-8">
          BILANO Expert Terminal membutuhkan layar lebar untuk merender chart dan analisis skala besar secara optimal. Buka akun Anda melalui browser PC.
        </p>
        <button onClick={() => window.location.href = '/'} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors">
          Kembali ke Versi Mobile
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

import NotFound from "@/pages/not-found";
import Security from "./pages/Security";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing"; 
import Target from "@/pages/Target";
import Income from "@/pages/Income";
import Expense from "@/pages/Expense";
import Reports from "@/pages/Reports";
import Investment from "@/pages/Investment";
import Forex from "@/pages/Forex";
import Subscriptions from "@/pages/Subscriptions";
import Categories from "@/pages/Categories";
import Auth from "@/pages/Auth";
import ChatAI from "@/pages/ChatAI";
import Profile from "@/pages/Profile";
import Performance from "@/pages/Performance";
import Paywall from "@/pages/Paywall";
import Debts from "@/pages/Debts"; 
import SmartScan from "@/pages/SmartScan"; 
import AdminPremium from "@/pages/AdminPremium";
import Help from "@/pages/Help";
import Guide from "@/pages/Guide";
import Amal from "@/pages/Amal"; 
import Retained from "@/pages/Retained";
import ExpertTerminal from "@/pages/ExpertTerminal"; 
import Onboarding from "@/pages/Onboarding"; 
import VideoPreview from "@/pages/VideoPreview"; 
import Checkout from "@/pages/Checkout";
import Manager from "@/pages/Manager"; 

function Router() {
  const [location, setLocation] = useLocation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // State peringatan jika masa aktif langganan (+3 Hari) habis
  const [showExpiredWarning, setShowExpiredWarning] = useState(false);
  const [isSessionRefreshing, setIsSessionRefreshing] = useState(false); 

  const isStandalone = typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from_notif') === 'true') {
        window.history.replaceState(null, '', '/');
        setLocation('/');
        setTimeout(() => { window.location.reload(); }, 100);
    }
  }, [setLocation]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
         queryClient.invalidateQueries();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const { data: user } = useUser();

  // 🛡️ FRONTEND GATEKEEPER: Cek secara pasif jika tanggal terlewat
  useEffect(() => {
    if (user && user.proValidUntil) {
       const today = new Date();
       const validUntil = new Date(user.proValidUntil);
       
       // Tambahkan 3 hari toleransi dari tanggal kedaluwarsa
       validUntil.setDate(validUntil.getDate() + 3);

       const isExpired = today > validUntil;
       
       // Rute yang diizinkan saat kadaluarsa (Hanya Kas & Profil)
       const allowedRoutes = ["/", "/income", "/expense", "/profile", "/auth", "/onboarding"];
       const currentPath = location.endsWith('/') && location !== '/' ? location.slice(0, -1) : location;

       if (isExpired && !allowedRoutes.includes(currentPath)) {
           setShowExpiredWarning(true);
           setLocation("/"); // Lempar kembali ke beranda
       } else {
           setShowExpiredWarning(false);
       }
    }
  }, [user, location, setLocation]);

  useNotifications();

  useEffect(() => {
    const isAuth = localStorage.getItem("bilano_auth");
    
    // Daftar rute publik yang bebas diakses
    const publicRoutes = ["/", "/auth", "/terminal", "/onboarding", "/preview", "/checkout", "/manager"]; 
    const normalizedLocation = location.endsWith('/') && location !== '/' ? location.slice(0, -1) : location;

    if (!isAuth) {
      if (isStandalone && normalizedLocation !== "/auth") {
        setLocation("/auth");
      } else if (!isStandalone && !publicRoutes.includes(normalizedLocation)) {
        setLocation("/auth");
      }
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Event Listener dari respon Backend (402 Expired)
    const handleExpiredLock = () => setShowExpiredWarning(true);
    window.addEventListener('trigger-expired-lock', handleExpiredLock);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('trigger-expired-lock', handleExpiredLock);
    };
  }, [location, setLocation, isStandalone]);

  if (isSessionRefreshing) {
    return (
      <div className="fixed inset-0 z-[999999] bg-slate-900 flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
         <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
         <h2 className="text-2xl font-extrabold mb-2 tracking-tight">Menyegarkan Sesi...</h2>
         <p className="text-sm text-slate-400 font-medium">Sinkronisasi data terbaru Anda.</p>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="bg-slate-50 py-4 text-center w-full flex justify-center items-center">
            <img alt="BILANO" src="/Bilano_horiz_rbg.png" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center -mt-16 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-rose-100 p-5 rounded-full mb-6 shadow-sm">
              <WifiOff className="w-10 h-10 text-rose-600" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Koneksi Terputus</h2>
          <p className="text-slate-500 text-sm mb-8 max-w-[260px] leading-relaxed font-medium">
              Aplikasi tidak dapat memuat data. Periksa jaringan internet Anda dan coba lagi.
          </p>
          <button 
              onClick={() => window.location.reload()} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full text-sm font-extrabold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center"
          >
              COBA LAGI
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/">
          {isStandalone ? <Home /> : <Landing />}
        </Route>
        
        <Route path="/terminal">
           <DesktopRequiredGate>
              <ExpertTerminal />
           </DesktopRequiredGate>
        </Route>
        
        <Route path="/dashboard" component={Home} />
        <Route path="/target" component={Target} />
        <Route path="/income" component={Income} />
        <Route path="/expense" component={Expense} />
        <Route path="/reports" component={Reports} />
        <Route path="/investment" component={Investment} />
        <Route path="/debts" component={Debts} />
        <Route path="/forex" component={Forex} />
        <Route path="/subscriptions" component={Subscriptions} />
        <Route path="/categories" component={Categories} />
        <Route path="/auth" component={Auth} />
        <Route path="/chat-ai" component={ChatAI} />
        <Route path="/profile" component={Profile} />
        <Route path="/performance" component={Performance} />
        <Route path="/scan" component={SmartScan} />
        <Route path="/paywall" component={Paywall} />
        <Route path="/security" component={Security} />
        <Route path="/admin-premium" component={AdminPremium} />
        <Route path="/help" component={Help} />
        <Route path="/guide" component={Guide} />
        <Route path="/amal" component={Amal} /> 
        <Route path="/retained" component={Retained} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/preview" component={VideoPreview} /> 
        <Route path="/checkout" component={Checkout} />
        <Route path="/manager" component={Manager} />

        <Route component={NotFound} />
      </Switch>

      {/* 🔴 MODAL PERINGATAN KADALUARSA + 3 HARI MASA TENGGANG */}
      {showExpiredWarning && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative text-center border-t-8 border-rose-500">
            <div className="w-16 h-16 mx-auto bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Akses Terkunci</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Masa aktif langganan Anda (termasuk 3 hari toleransi) telah berakhir. Anda hanya dapat menggunakan BILANO untuk mencatat Kas Masuk & Keluar manual.
            </p>
            <button 
              onClick={() => { setShowExpiredWarning(false); setLocation('/onboarding'); }}
              className="w-full h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black shadow-lg shadow-rose-200 active:scale-95 transition-transform mb-3"
            >
              PERPANJANG SEKARANG
            </button>
            <button 
              onClick={() => setShowExpiredWarning(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 underline underline-offset-2"
            >
              Saya Paham
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;