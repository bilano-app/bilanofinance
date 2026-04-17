import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, Button, Input } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ShieldCheck, RefreshCw, AlertCircle, ArrowLeft, X, CheckCircle2 } from "lucide-react";

// 🚀 UPDATE: MENGHAPUS IMPOR FIREBASE YANG TIDAK TERPAKAI AGAR LOLOS ESLINT VERCEL
// (Logika Auth Bos sudah ditangani lewat API Backend /api/auth/...)

export default function Auth() {
  localStorage.removeItem("bilano_trial_expired");

  // 🚀 TETAP DIJAGA: SIMPAN STATE KE LOCALSTORAGE AGAR TIDAK HILANG SAAT RELOAD BUKA GMAIL
  const [isLogin, setIsLogin] = useState(() => localStorage.getItem("auth_isLogin") !== "false"); 
  const [step, setStep] = useState<'form' | 'otp'>(() => (localStorage.getItem("auth_step") as 'form'|'otp') || 'form');
  
  const [email, setEmail] = useState(() => localStorage.getItem("auth_email") || "");
  const [password, setPassword] = useState(() => localStorage.getItem("auth_password") || "");
  const [otpCode, setOtpCode] = useState("");
  
  const [firstName, setFirstName] = useState(() => localStorage.getItem("auth_firstName") || "");
  const [lastName, setLastName] = useState(() => localStorage.getItem("auth_lastName") || "");
  
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'success'>('email');
  const [newPassword, setNewPassword] = useState("");
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Efek untuk sinkronisasi state ke LocalStorage (User Experience)
  useEffect(() => {
    localStorage.setItem("auth_isLogin", isLogin.toString());
    localStorage.setItem("auth_step", step);
    localStorage.setItem("auth_email", email);
    localStorage.setItem("auth_password", password);
    localStorage.setItem("auth_firstName", firstName);
    localStorage.setItem("auth_lastName", lastName);
  }, [isLogin, step, email, password, firstName, lastName]);

  const handleResetStorage = () => {
    const keys = ["auth_isLogin", "auth_step", "auth_email", "auth_password", "auth_firstName", "auth_lastName"];
    keys.forEach(k => localStorage.removeItem(k));
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!isLogin && (!firstName)) {
        toast({ title: "Nama diperlukan", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
        const checkRes = await fetch("/api/auth/check-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const checkData = await checkRes.json();

        if (isLogin && !checkData.exists) {
            toast({ title: "Email tidak terdaftar", description: "Silakan daftar akun baru.", variant: "destructive" });
            setLoading(false);
            return;
        }
        if (!isLogin && checkData.exists) {
            toast({ title: "Email sudah ada", description: "Gunakan email lain atau silakan login.", variant: "destructive" });
            setLoading(false);
            return;
        }

        const otpRes = await fetch("/api/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        if (otpRes.ok) {
            setStep('otp');
            toast({ title: "Kode OTP Terkirim", description: "Cek kotak masuk atau spam email Anda." });
        } else {
            throw new Error("Gagal mengirim OTP");
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 6) return;
    setLoading(true);

    try {
        const res = await fetch("/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code: otpCode })
        });

        if (res.ok) {
            localStorage.setItem("bilano_email", email);
            localStorage.setItem("bilano_first_name", firstName);
            localStorage.setItem("bilano_last_name", lastName);
            
            handleResetStorage();
            toast({ title: "Sukses!", description: "Selamat datang di BILANO." });
            setLocation("/");
        } else {
            const err = await res.json();
            toast({ title: "OTP Salah", description: err.error, variant: "destructive" });
        }
    } catch (e) {
        toast({ title: "Gagal Verifikasi", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleSendForgotOTP = async () => {
    if (!forgotEmail) return;
    setLoading(true);
    try {
        const res = await fetch("/api/auth/send-otp-reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: forgotEmail })
        });
        if (res.ok) {
            setForgotStep('otp');
            toast({ title: "OTP Terkirim", description: "Silakan cek email Anda." });
        } else {
            const data = await res.json();
            toast({ title: "Gagal", description: data.error, variant: "destructive" });
        }
    } catch (e) { toast({ title: "Koneksi Gagal", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!otpCode || !newPassword) return;
    setLoading(true);
    try {
        const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: forgotEmail, code: otpCode, newPassword })
        });
        if (res.ok) {
            setForgotStep('success');
        } else {
            const data = await res.json();
            toast({ title: "Gagal Ganti Password", description: data.error, variant: "destructive" });
        }
    } catch (e) { toast({ title: "Koneksi Error", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-600 -skew-y-6 -translate-y-32"></div>
      
      <Card className="w-full max-w-md p-8 rounded-[32px] shadow-2xl relative z-10 bg-white border-none animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[24px] flex items-center justify-center mb-6 shadow-xl shadow-indigo-100 rotate-3">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">BILANO</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Smart Wealth Intelligence</p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleInitialSubmit} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nama Depan</label>
                  <Input 
                    placeholder="Adrien" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    className="h-14 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Belakang</label>
                  <Input 
                    placeholder="Fandra" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    className="h-14 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Alamat Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <Input 
                  type="email" 
                  placeholder="bos@bilano.app" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="pl-12 h-14 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Kata Sandi</label>
                {isLogin && (
                  <button type="button" onClick={() => { setShowForgotModal(true); setForgotStep('email'); }} className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase">Lupa?</button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="pl-12 h-14 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                  required
                />
              </div>
            </div>

            <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (isLogin ? "MASUK SEKARANG" : "DAFTAR AKUN")}
            </Button>

            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {isLogin ? "Belum punya akun? Daftar gratis" : "Sudah punya akun? Silakan login"}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-4 items-start">
              <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><ShieldCheck className="w-6 h-6" /></div>
              <div>
                <h4 className="text-sm font-black text-indigo-900">Verifikasi Keamanan</h4>
                <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">Masukkan 6 digit kode OTP yang baru saja kami kirimkan ke email <b>{email}</b>.</p>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <Input 
                value={otpCode} 
                onChange={e => setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="000000"
                className="text-center text-4xl h-20 tracking-[0.4em] font-black rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-indigo-500/10 text-slate-800 placeholder:opacity-20"
              />
            </div>

            <Button 
              onClick={handleVerifyOTP}
              disabled={loading || otpCode.length < 6}
              className="w-full h-16 bg-indigo-600 text-white font-black rounded-2xl text-lg shadow-xl shadow-indigo-100"
            >
              {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : "KONFIRMASI OTP"}
            </Button>

            <button onClick={() => setStep('form')} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Ganti Email/Data
            </button>
          </div>
        )}
      </Card>

      {/* MODAL LUPA PASSWORD */}
      {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative animate-in zoom-in-95">
                  <button onClick={() => setShowForgotModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-400 hover:text-rose-500 rounded-full transition-colors"><X className="w-4 h-4"/></button>
                  
                  {forgotStep !== 'success' ? (
                      forgotStep === 'email' ? (
                          <>
                              <h3 className="text-xl font-black text-slate-800 mb-2">Lupa Password?</h3>
                              <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">Jangan panik Bos! Masukkan email Anda, kami akan kirimkan kode pemulihan.</p>
                              <div className="space-y-4">
                                  <Input placeholder="Email Anda" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-bold" />
                                  <Button onClick={handleSendForgotOTP} disabled={loading} className="w-full h-14 bg-indigo-600 font-bold shadow-md">
                                      {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "KIRIM KODE PEMULIHAN"}
                                  </Button>
                              </div>
                          </>
                      ) : (
                          <>
                              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl mb-6">
                                  <AlertCircle className="w-5 h-5" />
                                  <p className="text-[10px] font-bold uppercase tracking-tight">Mode Pemulihan Akun</p>
                              </div>
                              <div className="space-y-4">
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kode OTP</label>
                                      <Input placeholder="000000" value={otpCode} onChange={e => setOtpCode(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-center text-2xl tracking-widest" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Password Baru</label>
                                      <Input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-bold" />
                                  </div>
                                  <Button 
                                      onClick={handleResetPassword} 
                                      disabled={loading || !otpCode || !newPassword}
                                      className="w-full h-12 bg-rose-600 hover:bg-rose-700 font-bold shadow-md mt-2"
                                  >
                                      {loading ? <RefreshCw className="w-5 h-5 animate-spin\"/> : "UBAH PASSWORD SAYA"}
                                  </Button>
                              </div>
                          </>
                      )
                  ) : (
                      <div className="text-center py-4 animate-in fade-in zoom-in-95">
                          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle2 className="w-8 h-8"/>
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-800 mb-2">Sukses Bos!</h3>
                          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                              Password untuk akun <strong>{forgotEmail}</strong> telah berhasil diperbarui. Silakan login kembali.
                          </p>
                          <Button onClick={() => setShowForgotModal(false)} className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-md">
                              TUTUP & LOGIN
                          </Button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}