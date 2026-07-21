import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle, ShieldCheck, Mail, KeyRound } from "lucide-react";
import { trackEvent } from "@/lib/tracking";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPaywallRedirect, setShowPaywallRedirect] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Email dan Password/Kode wajib diisi.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setShowPaywallRedirect(false);

    try {
      // 🚀 Hit API Login Custom Kita (Mengarah ke Firebase Admin atau Database)
      const res = await fetch('/api/auth/login-with-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Set state ke LocalStorage
        localStorage.setItem("bilano_auth", "true");
        localStorage.setItem("bilano_email", email.trim().toLowerCase());
        trackEvent("user_logged_in", { method: "email_code" });
        
        // Arahkan ke Target untuk melengkapi nama
        setLocation("/target");
      } else {
        // Deteksi apakah user memang belum bayar/terdaftar
        if (data.error?.includes("tidak ditemukan") || data.error?.includes("belum terdaftar")) {
            setErrorMsg("Email ini belum berlangganan BILANO.");
            setShowPaywallRedirect(true);
        } else {
            setErrorMsg(data.error || "Password atau Kode akses salah.");
        }
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#040814] w-full text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/50 mb-8 border border-white/10 p-2">
            <img src="/Bilano_horiz_rbg.png" alt="BILANO" className="w-full h-auto object-contain" />
        </div>

        <h2 className="text-2xl font-black mb-2 tracking-tight">Selamat Datang Kembali</h2>
        <p className="text-sm text-slate-400 mb-8 text-center px-4 leading-relaxed">
            Masukkan Email yang Anda gunakan saat pembayaran beserta Kode Akses atau Password.
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
            
            {errorMsg && !showPaywallRedirect && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3 animate-in shake">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-200 leading-relaxed font-medium">{errorMsg}</p>
                </div>
            )}

            {/* 🔴 TOMBOL REDIRECT PEMBAYARAN JIKA BELUM TERDAFTAR */}
            {showPaywallRedirect && (
                <div className="bg-[#121c3a] border border-amber-500/30 p-5 rounded-2xl flex flex-col items-center text-center gap-3 animate-in zoom-in-95 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                    <ShieldCheck className="w-8 h-8 text-amber-400" />
                    <p className="text-sm text-amber-100 font-medium leading-relaxed">
                        Email <span className="font-bold text-white">{email}</span> belum terdaftar di sistem premium BILANO.
                    </p>
                    <button 
                        type="button"
                        onClick={() => setLocation('/onboarding')}
                        className="w-full bg-gradient-to-b from-yellow-400 to-amber-500 text-black font-black py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all mt-2"
                    >
                        DAFTAR & LANGGANAN SEKARANG
                    </button>
                </div>
            )}

            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 block">Email Akun</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="contoh@gmail.com"
                        className="w-full bg-[#121c3a] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 block flex justify-between">
                    <span>Password / Kode Akses</span>
                </label>
                <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="6 Digit Kode atau Password"
                        className="w-full bg-[#121c3a] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-6"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "MASUK KE BILANO"}
            </button>
        </form>

        <p className="text-[10px] text-slate-500 mt-8 text-center max-w-[260px]">
            Jika Anda melupakan password dan kode akses pertama hilang, harap hubungi Admin BILANO.
        </p>
      </div>
    </div>
  );
}