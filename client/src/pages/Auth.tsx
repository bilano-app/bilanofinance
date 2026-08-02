import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, Button, Input } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, RefreshCw, AlertCircle, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
    getRedirectResult,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    User
} from "firebase/auth";

export default function Auth() {
  localStorage.removeItem("bilano_trial_expired");

  const [email, setEmail] = useState(() => localStorage.getItem("auth_email") || "");
  const [password, setPassword] = useState(() => localStorage.getItem("auth_password") || "");
  
  const [authError, setAuthError] = useState("");
  const [forgotError, setForgotError] = useState("");
  
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotSuccess, setIsForgotSuccess] = useState(false); 
  
  const [showPaywallRedirect, setShowPaywallRedirect] = useState(false);

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
              await handleSuccess(result.user);
          }
          setLoading(false);
      }).catch((error) => {
          setLoading(false);
      });
  }, []);

  const handleSuccess = async (user: User) => {
      setLoading(true);

      const cleanEmail = (user.email || "").trim().toLowerCase();
      localStorage.setItem("bilano_auth", "true");
      localStorage.setItem("bilano_email", cleanEmail);
      
      clearAuthCache(); 

      toast({ title: "Berhasil!", description: "Selamat datang kembali di BILANO." });
      
      window.location.href = "/"; 
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(""); 
    setShowPaywallRedirect(false);
    
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) return setAuthError("Email dan Password wajib diisi!");

    setLoading(true);

    try {
        // 1. Cek ke Database Bilano (Untuk validasi langganan & Kode Akses)
        const checkRes = await fetch("/api/auth/login-with-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, password: password })
        });

        // JIKA AKUN BELUM TERDAFTAR / BELUM BERLANGGANAN (Status 454)
        if (checkRes.status === 454) {
            setAuthError("Email ini belum berlangganan BILANO.");
            setShowPaywallRedirect(true);
            setLoading(false);
            return;
        }

        const checkData = await checkRes.json().catch(() => ({}));

        // 2. Coba validasi password menggunakan Firebase Auth
        let firebaseSuccess = false;
        let fbUser = null;
        try {
            const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
            fbUser = cred.user;
            firebaseSuccess = true;
        } catch (fbErr) {
            firebaseSuccess = false; // Firebase gagal, kita akan cek apakah DB berhasil
        }

        // 3. Evaluasi Hasil: Izinkan masuk jika Firebase benar ATAU Kode Akses DB benar
        if (firebaseSuccess) {
            // Password Firebase valid
            await handleSuccess(fbUser as User);
            return;
        } else if (checkRes.ok && checkData.success) {
            // Kode akses Database valid
            await handleSuccess({ email: cleanEmail } as any);
            return;
        } else {
            // Keduanya gagal (Password & Kode Akses salah)
            setAuthError(checkData.error || "Password atau Kode Akses salah. Silakan coba lagi.");
            setLoading(false);
            return;
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <img src="/Bilano_horiz_rbg.png" alt="BILANO" className="h-16 w-auto mx-auto mb-2 object-contain" />
      </div>

      <Card className="w-full max-w-sm p-6 shadow-xl border-none bg-white animate-in zoom-in-95">
          
          <div className="text-center mb-6">
              <h2 className="text-xl font-black text-slate-800">Selamat Datang</h2>
              <p className="text-xs text-slate-500 mt-1">Masukkan Email dan Password/Kode Akses Anda.</p>
          </div>

          {/* 🔴 TOMBOL REDIRECT PEMBAYARAN JIKA BELUM TERDAFTAR */}
          {showPaywallRedirect && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col items-center text-center gap-2 mb-6 animate-in zoom-in-95">
                  <ShieldCheck className="w-8 h-8 text-rose-500" />
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Email <span className="font-bold text-slate-800">{email}</span> belum memiliki akses premium BILANO.
                  </p>
                
                  <button 
                      type="button"
                      onClick={() => {
                          const targetUrl = 'https://bilano.app/onboarding';
                        
                        // Trik 1: Gunakan Google Redirect URL untuk menipu PWA Scope.
                        // Karena domain mengarah ke google.com, PWA TERPAKSA melemparkannya ke browser utama (Chrome/Safari)
                          const googleRedirectUrl = `https://www.google.com/url?q=${encodeURIComponent(targetUrl)}`;
                        
                        // Trik 2: Eksekusi menggunakan detasemen window.open khusus browser luar
                          const externalWindow = window.open(googleRedirectUrl, '_system');
                        
                        // Fallback jika pop-up diblokir: paksa lewat link dengan rel khusus di luar PWA window
                          if (!externalWindow) {
                              const shadowLink = document.createElement('a');
                              shadowLink.href = googleRedirectUrl;
                              shadowLink.target = '_blank';
                              shadowLink.rel = 'noopener noreferrer external';
                              document.body.appendChild(shadowLink);
                              shadowLink.click();
                              document.body.removeChild(shadowLink);
                          }
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 mt-2 rounded-xl flex items-center justify-center text-sm shadow-md transition-all active:scale-[0.98]"
                  >
                      DAFTAR & LANGGANAN
                  </button>
              </div>
          )}

          <div className="space-y-4">
              <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">Email</label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
                          <Input type="email" placeholder="nama@email.com" className="pl-10 h-12" value={email} onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}/>
                      </div>
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 ml-1">Password / Kode Akses</label>
                      <div className="relative"><Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><Input type="password" placeholder="••••••••" className="pl-10 h-12" value={password} onChange={(e) => setPassword(e.target.value)}/></div>
                      
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
                  </div>
                  
                  {authError && !showPaywallRedirect && (
                      <div className="flex items-center gap-1.5 text-rose-500 bg-rose-50 p-3 rounded-xl text-[11px] font-bold leading-tight animate-in fade-in">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <p>{authError}</p>
                      </div>
                  )}

                  <Button disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold text-md shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mt-2 transition-transform active:scale-95">
                      {loading ? <RefreshCw className="animate-spin w-5 h-5"/> : "MASUK SEKARANG"}
                  </Button>
              </form>
          </div>
      </Card>

      {/* MODAL LUPA PASSWORD (TETAP SAMA SEPERTI ASLINYA) */}
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