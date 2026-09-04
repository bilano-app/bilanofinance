import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, Button, Input } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, RefreshCw, AlertCircle, X, CheckCircle2, ShieldCheck, User as UserIcon } from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
    getRedirectResult,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    updateProfile,
    User
} from "firebase/auth";

export default function Auth() {
  localStorage.removeItem("bilano_trial_expired");

  const [isSignUp, setIsSignUp] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.search.includes("mode=signup") || window.location.hash === "#signup";
  });
  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState(() => localStorage.getItem("auth_email") || "");
  const [password, setPassword] = useState(() => localStorage.getItem("auth_password") || "");
  
  const [authError, setAuthError] = useState("");
  const [forgotError, setForgotError] = useState("");
  
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotSuccess, setIsForgotSuccess] = useState(false); 

  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
      localStorage.setItem("auth_email", email);
      localStorage.setItem("auth_password", password);
  }, [email, password]);

  const clearAuthCache = () => {
      localStorage.removeItem("auth_email");
      localStorage.removeItem("auth_password");
  };

  useEffect(() => {
      setLoading(true);
      getRedirectResult(auth).then(async (result) => {
          if (result?.user) {
              await handleSuccess(result.user, false);
          }
          setLoading(false);
      }).catch((error) => {
          setLoading(false);
      });
  }, []);

  const handleSuccess = async (user: User, isNewUser: boolean = false) => {
      setLoading(true);

      const cleanEmail = (user.email || "").trim().toLowerCase();
      localStorage.setItem("bilano_auth", "true");
      localStorage.setItem("bilano_email", cleanEmail);
      
      clearAuthCache(); 
      setLoading(false);

      if (isNewUser) {
          toast({ title: "Registrasi Berhasil!", description: "Mari atur saldo awal dan portofoliomu." });
          setLocation("/setup-balance"); // Pindah langsung ke setup saldo awal
      } else {
          const isStandalone = typeof window !== 'undefined' && 
              (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
          window.location.href = isStandalone ? "/" : "/dashboard"; 
      }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(""); 
    
    const cleanEmail = email.trim().toLowerCase();

    if (isSignUp && !fullName.trim()) return setAuthError("Nama Lengkap wajib diisi!");
    if (!cleanEmail || !password) return setAuthError("Email dan Password wajib diisi!");

    setLoading(true);

    try {
        if (isSignUp) {
            // Flow Registrasi Baru
            if (password.length < 6) {
                setAuthError("Password minimal 6 karakter!");
                setLoading(false);
                return;
            }

            try {
                // 1. Buat Akun Firebase
                const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
                await updateProfile(cred.user, { displayName: fullName.trim() });
                
                // 2. Simpan Profil ke Database BILANO
                const nameParts = fullName.trim().split(" ");
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(" ");
                
                await fetch("/api/user/profile", {
                    method: "PATCH",
                    headers: { 
                        "Content-Type": "application/json",
                        "x-user-email": cleanEmail 
                    },
                    body: JSON.stringify({ firstName, lastName })
                });

                // 3. Simpan Password ke Database (Untuk opsi login DB)
                await fetch("/api/user/set-permanent-password", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "x-user-email": cleanEmail 
                    },
                    body: JSON.stringify({ newPassword: password })
                });

                await handleSuccess(cred.user, true);
            } catch (err: any) {
                if (err.code === 'auth/email-already-in-use') {
                    setAuthError("Email sudah terdaftar. Silakan masuk.");
                    setIsSignUp(false); // Kembalikan ke mode login jika ternyata sudah terdaftar
                } else {
                    setAuthError("Gagal mendaftar: " + err.message);
                }
                setLoading(false);
            }

        } else {
            // Flow Login yang sudah ada
            const checkRes = await fetch("/api/auth/login-with-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: cleanEmail, password: password })
            });

            // 🚀 PERUBAHAN DISINI: Jika email belum ada (status 454), ubah form jadi Sign Up
            if (checkRes.status === 454) {
                setAuthError("Email belum terdaftar. Silakan daftar akun terlebih dahulu.");
                setIsSignUp(true); // Otomatis pindah ke mode daftar
                setLoading(false);
                return;
            }

            const checkData = await checkRes.json().catch(() => ({}));

            let firebaseSuccess = false;
            let fbUser = null;
            try {
                const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
                fbUser = cred.user;
                firebaseSuccess = true;
            } catch (fbErr) {
                firebaseSuccess = false; 
            }

            if (firebaseSuccess) {
                await handleSuccess(fbUser as User, false);
                return;
            } else if (checkRes.ok && checkData.success) {
                await handleSuccess({ email: cleanEmail } as any, false);
                return;
            } else {
                setAuthError(checkData.error || "Password atau Kode Akses salah. Silakan coba lagi.");
                setLoading(false);
                return;
            }
        }
    } catch (error: any) {
        setAuthError("Gagal terhubung ke server autentikasi. Periksa koneksi Anda.");
        setLoading(false);
    } 
  };

  const handleResetPasswordLink = async () => {
      setForgotError("");
      const cleanForgotEmail = forgotEmail.trim().toLowerCase();
      if (!cleanForgotEmail) return setForgotError("Isi email Anda terlebih dahulu!");
      
      setLoading(true);
      
      try {
          await sendPasswordResetEmail(auth, cleanForgotEmail);
          setIsForgotSuccess(true);
      } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
              setForgotError("Email ini tidak terdaftar di sistem kami.");
          } else if (error.code === 'auth/invalid-email') {
              setForgotError("Format email tidak valid.");
          } else {
              setForgotError("Gagal mengirim link. Coba sesaat lagi.");
          }
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen w-full max-w-[430px] mx-auto bg-slate-50 flex flex-col items-center justify-center p-4 relative shadow-2xl border-x border-slate-200/80">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <img src="/BILANO-LOGO-NEW.png" alt="BILANO" className="h-16 w-auto mx-auto mb-2 object-contain" />
      </div>

      <Card className="w-full max-w-sm p-6 shadow-xl border-none bg-white animate-in zoom-in-95">
          
          <div className="text-center mb-6">
              <h2 className="text-xl font-black text-slate-800">{isSignUp ? "Daftar Akun Baru" : "Selamat Datang"}</h2>
              <p className="text-xs text-slate-500 mt-1">
                  {isSignUp ? "Lengkapi data untuk mengamankan aksesmu." : "Masukkan Email dan Password/Kode Akses Anda."}
              </p>
          </div>

          <div className="space-y-4">
              <form onSubmit={handleAuth} className="space-y-4">
                  {isSignUp && (
                      <div className="space-y-1 animate-in fade-in duration-300">
                          <label className="text-xs font-bold text-slate-500 ml-1">Nama Lengkap</label>
                          <div className="relative">
                              <UserIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
                              <Input type="text" placeholder="Nama lengkap Anda" className="pl-10 h-12" value={fullName} onChange={(e) => setFullName(e.target.value)}/>
                          </div>
                      </div>
                  )}

                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">Email</label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
                          <Input type="email" placeholder="nama@email.com" className="pl-10 h-12" value={email} onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}/>
                      </div>
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">{isSignUp ? "Password" : "Password / Kode Akses"}</label>
                      <div className="relative"><Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><Input type="password" placeholder="••••••••" className="pl-10 h-12" value={password} onChange={(e) => setPassword(e.target.value)}/></div>
                      
                      {!isSignUp && (
                          <div className="flex justify-end pt-1">
                              <button 
                                type="button" 
                                onClick={() => { 
                                    setShowForgotModal(true); 
                                    setIsForgotSuccess(false);
                                    setForgotEmail(""); 
                                    setForgotError("");
                                }} 
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                  Lupa Password?
                              </button>
                          </div>
                      )}
                  </div>
                  
                  {authError && (
                      <div className="flex items-center gap-1.5 text-rose-500 bg-rose-50 p-3 rounded-xl text-[11px] font-bold leading-tight animate-in fade-in">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <p>{authError}</p>
                      </div>
                  )}

                  <Button disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold text-md shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mt-2 transition-transform active:scale-95">
                      {loading ? <RefreshCw className="animate-spin w-5 h-5"/> : (isSignUp ? "DAFTAR SEKARANG" : "MASUK SEKARANG")}
                  </Button>
              </form>

              <div className="text-center pt-2">
                  <button 
                      onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); }}
                      className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                      {isSignUp ? "Sudah punya akun? Masuk di sini" : "Belum punya akun? Daftar di sini"}
                  </button>
              </div>
          </div>
      </Card>

      {showForgotModal && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-in zoom-in-95">
                  <button onClick={() => setShowForgotModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5"/>
                  </button>

                  {!isForgotSuccess ? (
                      <>
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                              <Lock className="w-6 h-6"/>
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-800 mb-1">Reset Password</h3>
                          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                              Masukkan email Anda. Kami akan mengirimkan Tautan (Link) khusus untuk mereset password Anda dengan mudah.
                          </p>
                          
                          <div className="space-y-4">
                              <div className="relative">
                                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
                                  <Input 
                                      type="email" 
                                      placeholder="Masukkan email terdaftar..." 
                                      className="pl-10 h-12 border-slate-200" 
                                      value={forgotEmail} 
                                      onChange={(e) => { setForgotEmail(e.target.value.trim().toLowerCase()); setForgotError(""); }}
                                  />
                              </div>
                              
                              {forgotError && (
                                  <div className="flex items-center gap-1.5 text-rose-500 bg-rose-50 p-2.5 rounded-xl text-[10px] font-bold leading-tight">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      <p>{forgotError}</p>
                                  </div>
                              )}

                              <Button onClick={handleResetPasswordLink} disabled={loading || !forgotEmail} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md">
                                  {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : "KIRIM LINK RESET"}
                              </Button>
                          </div>
                      </>
                  ) : (
                      <div className="text-center py-4 animate-in fade-in zoom-in-95">
                          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle2 className="w-8 h-8"/>
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-800 mb-2">Terkirim!</h3>
                          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                              Silakan cek kotak masuk (atau folder spam) di email <strong>{forgotEmail.trim().toLowerCase()}</strong> Anda. Klik link di dalamnya untuk membuat password baru.
                          </p>
                          <Button onClick={() => setShowForgotModal(false)} className="w-full h-12 bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-md">
                              TUTUP
                          </Button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}