import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { WifiOff, RefreshCw } from "lucide-react"; 
import { useNotifications } from "./hooks/useNotifications"; 

queryClient.setDefaultOptions({
  queries: {
    refetchOnWindowFocus: true, 
    refetchOnMount: true,       
    refetchOnReconnect: true,
    staleTime: 1000 * 60 * 5,   
    retry: 1                    
  },
});

// Tetap pertahankan injeksi Header x-user-email, tapi hapus blokir Paywall
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input as Request).url;
  const email = localStorage.getItem("bilano_email");

  const newHeaders = new Headers(init.headers);
  if (email && url.includes('/api')) {
    newHeaders.set('x-user-email', email);
  }
  init.headers = newHeaders;
  return originalFetch(input, init);
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
import Debts from "@/pages/Debts"; 
import SmartScan from "@/pages/SmartScan"; 
import AdminPremium from "@/pages/AdminPremium";
import Help from "@/pages/Help";
import Guide from "@/pages/Guide";
import Amal from "@/pages/Amal"; 
import Retained from "@/pages/Retained";

function Router() {
  const [location, setLocation] = useLocation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSessionRefreshing] = useState(false); 

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

  useNotifications();

  useEffect(() => {
    const isAuth = localStorage.getItem("bilano_auth");
    
    if (!isAuth && location !== "/auth") {
      if (isStandalone) {
        setLocation("/auth");
      } else if (location !== "/") {
        setLocation("/auth");
      }
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
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
            <img alt="BILANO" src="/bilano_logo_horiz.png" className="h-8 w-auto object-contain" />
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
    <Switch>
      <Route path="/">{isStandalone ? <Home /> : <Landing />}</Route>
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
      <Route path="/security" component={Security} />
      <Route path="/admin-premium" component={AdminPremium} />
      <Route path="/help" component={Help} />
      <Route path="/guide" component={Guide} />
      <Route path="/amal" component={Amal} /> 
      <Route path="/retained" component={Retained} />
      <Route component={NotFound} />
    </Switch>
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