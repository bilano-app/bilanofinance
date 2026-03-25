import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, Button, Input } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ShieldCheck, RefreshCw, AlertCircle, ArrowLeft, X, CheckCircle2 } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { 
    signInWithRedirect, 
    getRedirectResult,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    User
} from "firebase/auth";

export default function Auth() {
  localStorage.removeItem("bilano_trial_expired");

  const [isLogin, setIsLogin] = useState(true); 
  const [step, setStep] = useState<'form' | 'otp'>('form');
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0); 
  
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isForgotSuccess, setIsForgotSuccess] = useState(false); 

  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
      setLoading(true);
      getRedirectResult(auth).then(async (result) => {
          if (result?.user) {
              await handleSuccess(result.user);
          }
          setLoading(false);
      }).catch((error) => {
          console.error("Google Redirect Error:", error);
          if (error.code !== 'auth/redirect-cancelled-by-user') {
              toast({ title: "Gagal Google", description: error.message, variant: "destructive" });
          }
          setLoading(false);
      });
  }, []);

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
                  headers: { "Content-Type": "application/json", "x-user-email": user.email || "" },
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
      window.location.href = "/"; 
  };

  // 🚀 FIX: LOGIKA LOGIN ANTI JEBAKAN FIREBASE
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
            // LANGKAH 1: Mata-mata cek ke Backend apakah Email terdaftar
            try {
                const checkRes = await fetch("/api/auth/check-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (!checkData.exists) {
                        toast({ title: "Akun Belum Terdaftar", description: "Email ini belum terdaftar di BILANO. Silakan Daftar (Sign Up) terlebih dahulu.", variant: "destructive" });
                        setIsLogin(false); // Otomatis lempar ke tab Daftar
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) {
                // Biarkan lanjut ke Firebase kalau backend error
            }

            // LANGKAH 2: Jika email ADA, paksa login. 
            const cred = await signInWithEmailAndPassword(auth, email, password);
            handleSuccess(cred.user);
        } else {
            await requestOtp();
        }
    } catch (error: any) {
        // Karena di Langkah 1 sudah dicek emailnya ADA, berarti error disini PASTI PASSWORD SALAH!
        toast({ title: "Password Salah", description: "Password yang Anda masukkan salah. Coba lagi atau gunakan fitur Lupa Password.", variant: "destructive" });
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
              toast({ title: "Cek Kode OTP", description: data.dev_otp ? `Kode Anda: ${data.dev_otp}` : "Kode Terkirim ke Email!" });
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

  const handleSendOtpReset = async () => {
      if (!forgotEmail) return toast({ title: "Email Kosong", description: "Isi email dulu Bos!", variant: "destructive" });
      setLoading(true);
      
      try {
          const res = await fetch("/api/auth/send-otp-reset", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: forgotEmail })
          });
          const data = await res.json();
          
          if (res.ok) {
              setForgotStep('otp');
              toast({ title: "OTP Terkirim!", description: "Cek kotak masuk Gmail Anda sekarang." });
          } else {
              toast({ title: "Gagal", description: data.error, variant: "destructive" });
          }
      } catch (e) {
          toast({ title: "Error", description: "Gagal terhubung ke server.", variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  // 🚀 FIX: TOMBOL RESET PASSWORD YANG SUPER KOKOH (ANTI ERROR TERSEMBUNYI)
  const handleResetPassword = async () => {
      if (forgotOtp.length < 6 || newPassword.length < 6) {
          return toast({ title: "Data Kurang", description: "OTP 6 digit dan Password Baru (min. 6 karakter) wajib diisi.", variant: "destructive" });
      }
      setLoading(true);
      
      try {
          const res = await fetch("/api/auth/reset-password", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: forgotEmail, code: forgotOtp, newPassword })
          });
          const data = await res.json();
          
          if (res.ok) {
              setIsForgotSuccess(true);
          } else {
              toast({ title: "Gagal", description: data.error || "Gagal mengubah password", variant: "destructive" });
          }
      } catch (e) {
          toast({ title: "Error", description: "Gagal terhubung ke server.", variant: "destructive" });
      } finally {
          setLoading(false);
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
                <p className="text-slate-500 text-sm mb-6">Kode 6 digit dikirim ke <br/><strong>{email}</strong></p>
                
                <div className="relative mb-2">
                    <Input 
                        className={`text-center text-2xl tracking-[0.5em] font-bold h-14 ${errorMessage ? "border-red-500 bg-red-50 focus:ring-red-200" : "border-slate-200"}`} 
                        maxLength={6} 
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => { setOtpCode(e.target.value.replace(/[^0-9]/g, '')); setErrorMessage(""); }}
                    />
                </div>

                {errorMessage && (
                    <div className="flex items-center justify-center gap-2 text-red-600 text-xs font-bold mb-4 animate-pulse">
                        <AlertCircle className="w-3 h-3" /> {errorMessage}
                    </div>
                )}

                <Button onClick={verifyOtpAndRegister} disabled={loading || otpCode.length < 6} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200">
                    {loading ? <RefreshCw className="animate-spin"/> : "VERIFIKASI SEKARANG"}
                </Button>
                
                <div className="mt-6">
                    <p className="text-xs text-slate-400 mb-2">Tidak menerima kode?</p>
                    <button onClick={() => { if(resendCooldown === 0) { setLoading(true); requestOtp().catch(() => setLoading(false)); } }} disabled={resendCooldown > 0 || loading} className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${resendCooldown > 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}>
                        {resendCooldown > 0 ? `Tunggu ${resendCooldown} detik` : "KIRIM ULANG KODE"}
                    </button>
                </div>
                <button onClick={() => setStep('form')} className="mt-6 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600"><ArrowLeft className="w-3 h-3"/> Ganti Email</button>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <img src="/Bilano_horiz_rbg.png" alt="BILANO" className="h-16 w-auto mx-auto mb-2 object-contain" />
      </div>

      <Card className="w-full max-w-sm p-6 shadow-xl border-none bg-white animate-in zoom-in-95">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Masuk</button>
              <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Daftar</button>
          </div>

          <div className="space-y-4">
              <form onSubmit={handleAuth} className="space-y-4">
                  {!isLogin && (
                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 ml-1">Nama Depan</label><Input type="text" placeholder="Budi" className="h-12" value={firstName} onChange={(e) => setFirstName(e.target.value)}/></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 ml-1">Nama Belakang</label><Input type="text" placeholder="Santoso" className="h-12" value={lastName} onChange={(e) => setLastName(e.target.value)}/></div>
                    </div>
                  )}
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">Email</label>
                      <div className="relative"><Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><Input type="email" placeholder="nama@email.com" className="pl-10 h-12" value={email} onChange={(e) => setEmail(e.target.value)}/></div>
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">Password</label>
                      <div className="relative"><Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><Input type="password" placeholder="••••••••" className="pl-10 h-12" value={password} onChange={(e) => setPassword(e.target.value)}/></div>
                      
                      {isLogin && (
                          <div className="flex justify-end pt-1">
                              <button 
                                type="button" 
                                onClick={() => { 
                                    setShowForgotModal(true); 
                                    setIsForgotSuccess(false);
                                    setForgotStep('email');
                                    setForgotOtp("");
                                    setNewPassword("");
                                    setForgotEmail(""); 
                                }} 
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                  Lupa Password?
                              </button>
                          </div>
                      )}
                  </div>
                  
                  <Button disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold text-md shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mt-2">
                      {loading ? <RefreshCw className="animate-spin w-5 h-5"/> : (isLogin ? "MASUK SEKARANG" : "DAFTAR SEKARANG")}
                  </Button>
              </form>
          </div>
      </Card>

      {/* POP-UP LUPA PASSWORD */}
      {showForgotModal && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-in zoom-in-95">
                  <button onClick={() => setShowForgotModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5"/>
                  </button>

                  {!isForgotSuccess ? (
                      forgotStep === 'email' ? (
                          <>
                              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                                  <Lock className="w-6 h-6"/>
                              </div>
                              <h3 className="text-lg font-extrabold text-slate-800 mb-1">Reset Password</h3>
                              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                                  Masukkan email Anda. Kami akan mengirimkan OTP langsung ke kotak masuk (Inbox) Anda.
                              </p>
                              
                              <div className="space-y-4">
                                  <div className="relative">
                                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
                                      <Input 
                                          type="email" 
                                          placeholder="Masukkan email Anda..." 
                                          className="pl-10 h-12 border-slate-200" 
                                          value={forgotEmail} 
                                          onChange={(e) => setForgotEmail(e.target.value)}
                                      />
                                  </div>
                                  <Button onClick={handleSendOtpReset} disabled={loading || !forgotEmail} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md">
                                      {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "KIRIM OTP RESET"}
                                  </Button>
                              </div>
                          </>
                      ) : (
                          <>
                              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
                                  <ShieldCheck className="w-6 h-6"/>
                              </div>
                              <h3 className="text-lg font-extrabold text-slate-800 mb-1">Buat Password Baru</h3>
                              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                                  Masukkan 6 digit kode OTP dari email beserta password baru Anda (min. 6 karakter).
                              </p>
                              
                              <div className="space-y-3">
                                  <Input 
                                      className="text-center tracking-[0.5em] font-bold h-12 border-slate-200" 
                                      maxLength={6} 
                                      placeholder="000000"
                                      value={forgotOtp}
                                      onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                  />
                                  <div className="relative">
                                      <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
                                      <Input 
                                          type="password" 
                                          placeholder="Ketik Password Baru..." 
                                          className="pl-10 h-12 border-slate-200" 
                                          value={newPassword} 
                                          onChange={(e) => setNewPassword(e.target.value)}
                                      />
                                  </div>
                                  <Button 
                                      onClick={handleResetPassword} 
                                      disabled={loading || forgotOtp.length < 6 || newPassword.length < 6} 
                                      className="w-full h-12 bg-rose-600 hover:bg-rose-700 font-bold shadow-md mt-2"
                                  >
                                      {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "UBAH PASSWORD SAYA"}
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