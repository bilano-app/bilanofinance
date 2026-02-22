import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, Button, Input } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ShieldCheck, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    User
} from "firebase/auth";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true); 
  const [step, setStep] = useState<'form' | 'otp'>('form'); 
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  // DATA USER BARU
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0); 
  
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
      let timer: NodeJS.Timeout;
      if (resendCooldown > 0) {
          timer = setInterval(() => {
              setResendCooldown((prev) => prev - 1);
          }, 1000);
      }
      return () => clearInterval(timer);
  }, [resendCooldown]);

  const syncUserProfile = async (user: User) => {
      if (!isLogin && firstName) {
          try {
              await fetch("/api/user/profile", {
                  method: "PATCH",
                  headers: { 
                      "Content-Type": "application/json",
                      "x-user-email": user.email || "" 
                  },
                  body: JSON.stringify({ firstName, lastName })
              });
          } catch (e) {
              console.error("Gagal simpan nama:", e);
          }
      }
  };

  const handleSuccess = async (user: User) => {
      setLoading(true);
      await syncUserProfile(user); 

      localStorage.setItem("bilano_auth", "true");
      localStorage.setItem("bilano_email", user.email || "");
      
      toast({ title: "Berhasil Masuk!", description: `Selamat datang!` });
      
      // FIX UI: Menggunakan Hard Reload agar cache lama (guest) terhapus 100%
      window.location.href = "/"; 
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast({ title: "Isi semua data!", variant: "destructive" });
    
    if (!isLogin && (!firstName || !lastName)) {
        return toast({ title: "Lengkapi Nama", description: "Nama Depan & Belakang wajib diisi.", variant: "destructive" });
    }

    setLoading(true);
    setErrorMessage("");

    try {
        if (isLogin) {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            handleSuccess(cred.user);
        } else {
            await requestOtp();
        }
    } catch (error: any) {
        let msg = "Terjadi kesalahan.";
        if (error.code === 'auth/user-not-found') msg = "Akun tidak ditemukan.";
        if (error.code === 'auth/wrong-password') msg = "Password salah.";
        if (error.code === 'auth/email-already-in-use') msg = "Email sudah terdaftar. Silakan Login.";
        toast({ title: "Gagal", description: msg, variant: "destructive" });
        setLoading(false);
    } 
  };

  const requestOtp = async () => {
      try {
          const res = await fetch("/api/auth/send-otp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email })
          });
          const data = await res.json();
          
          if (res.ok) {
              setStep('otp'); 
              setResendCooldown(60); 
              toast({ title: "Kode Terkirim", description: "Cek inbox/spam email Anda." });
          } else {
              throw new Error(data.error || "Gagal kirim kode");
          }
      } catch (error: any) {
          throw error; 
      } finally {
          setLoading(false);
      }
  };

  const verifyOtpAndRegister = async () => {
      if(otpCode.length < 6) return;
      setLoading(true);
      setErrorMessage(""); 

      try {
          const res = await fetch("/api/auth/verify-otp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, code: otpCode })
          });
          
          if (!res.ok) {
              setErrorMessage("Kode OTP Salah! Coba cek lagi.");
              setLoading(false);
              return;
          }

          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await handleSuccess(cred.user);

      } catch (error: any) {
          console.error(error);
          setErrorMessage(error.message || "Gagal verifikasi.");
          toast({ title: "Error", description: "Gagal membuat akun Firebase", variant: "destructive" });
          setLoading(false);
      }
  };

  const handleGoogleLogin = async () => {
      try {
          const result = await signInWithPopup(auth, googleProvider);
          await handleSuccess(result.user);
      } catch (error: any) {
          toast({ title: "Gagal Google", description: error.message, variant: "destructive" });
      }
  };

  if (step === 'otp') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 shadow-xl bg-white text-center border-none animate-in zoom-in-95">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Verifikasi Email</h2>
                <p className="text-slate-500 text-sm mb-6">
                    Kode 6 digit dikirim ke <br/><strong>{email}</strong>
                </p>
                
                <div className="relative mb-2">
                    <Input 
                        className={`text-center text-2xl tracking-[0.5em] font-bold h-14 ${errorMessage ? "border-red-500 bg-red-50 focus:ring-red-200" : "border-slate-200"}`} 
                        maxLength={6} 
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => {
                            setOtpCode(e.target.value.replace(/[^0-9]/g, ''));
                            setErrorMessage(""); 
                        }}
                    />
                </div>

                {errorMessage && (
                    <div className="flex items-center justify-center gap-2 text-red-600 text-xs font-bold mb-4 animate-pulse">
                        <AlertCircle className="w-3 h-3" /> {errorMessage}
                    </div>
                )}

                <Button 
                    onClick={verifyOtpAndRegister} 
                    disabled={loading || otpCode.length < 6} 
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200"
                >
                    {loading ? <RefreshCw className="animate-spin"/> : "VERIFIKASI SEKARANG"}
                </Button>
                
                <div className="mt-6">
                    <p className="text-xs text-slate-400 mb-2">Tidak menerima kode?</p>
                    <button 
                        onClick={() => {
                            if(resendCooldown === 0) {
                                setLoading(true);
                                requestOtp().catch(() => setLoading(false));
                            }
                        }}
                        disabled={resendCooldown > 0 || loading}
                        className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${
                            resendCooldown > 0 
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        }`}
                    >
                        {resendCooldown > 0 ? `Tunggu ${resendCooldown} detik` : "KIRIM ULANG KODE"}
                    </button>
                </div>

                <button onClick={() => setStep('form')} className="mt-6 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                    <ArrowLeft className="w-3 h-3"/> Ganti Email
                </button>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <img 
            src="/bilano_logo_horiz.png" 
            alt="BILANO" 
            className="h-16 w-auto mx-auto mb-2 object-contain" 
          />
      </div>

      <Card className="w-full max-w-sm p-6 shadow-xl border-none bg-white animate-in zoom-in-95">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Masuk</button>
              <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Daftar</button>
          </div>

          <div className="space-y-4">
              <button onClick={handleGoogleLogin} className="w-full h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 group">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                  <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800">{isLogin ? "Masuk dengan Google" : "Daftar dengan Google"}</span>
              </button>

              <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-4 text-xs text-slate-400 font-bold uppercase">Atau Email</span><div className="flex-grow border-t border-slate-200"></div></div>

              <form onSubmit={handleAuth} className="space-y-4">
                  
                  {!isLogin && (
                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 ml-1">Nama Depan</label>
                          <Input type="text" placeholder="Budi" className="h-12" value={firstName} onChange={(e) => setFirstName(e.target.value)}/>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 ml-1">Nama Belakang</label>
                          <Input type="text" placeholder="Santoso" className="h-12" value={lastName} onChange={(e) => setLastName(e.target.value)}/>
                        </div>
                    </div>
                  )}

                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">Email</label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
                          <Input type="email" placeholder="nama@email.com" className="pl-10 h-12" value={email} onChange={(e) => setEmail(e.target.value)}/>
                      </div>
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">Password</label>
                      <div className="relative">
                          <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
                          <Input type="password" placeholder="••••••••" className="pl-10 h-12" value={password} onChange={(e) => setPassword(e.target.value)}/>
                      </div>
                  </div>

                  <Button disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold text-md shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                      {loading ? <RefreshCw className="animate-spin w-5 h-5"/> : (isLogin ? "MASUK SEKARANG" : "KIRIM KODE VERIFIKASI")}
                  </Button>
              </form>
          </div>
      </Card>
    </div>
  );
}