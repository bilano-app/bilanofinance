import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useUser } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { 
    User, Camera, Save, Loader2, X, Check, ZoomIn, 
    KeyRound, ArrowLeft, Sparkles, ShieldCheck, Mail, Crown,
    AlertCircle, CheckCircle2
} from "lucide-react";
import Cropper from "react-easy-crop"; 
import { trackEvent } from "@/lib/tracking";

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function Profile() {
  const { data: user, isLoading, refetch } = useUser();
  const { toast } = useToast();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoUrl, setPhotoUrl] = useState(""); 
  
  // State Password Baru
  const [newPassword, setNewPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhotoUrl(user.profilePicture || "");
    }
  }, [user]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
          toast({ title: "Foto Terlalu Besar", description: "Maksimal ukuran file foto adalah 5MB.", variant: "destructive" });
          return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || "");
        setIsCropping(true); 
        setZoom(1);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = async () => {
    try {
      if (imageSrc && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        setPhotoUrl(croppedImage); 
        setIsCropping(false); 
        setImageSrc(null); 
      }
    } catch (e) {
      toast({ title: "Gagal Memotong", description: "Gagal memproses gambar.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Simpan Nama & Foto Profil
      const resProfile = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { 
            "Content-Type": "application/json",
            "x-user-email": localStorage.getItem("bilano_email") || "" 
        },
        body: JSON.stringify({ firstName, lastName, profilePicture: photoUrl })
      });

      if (!resProfile.ok) throw new Error("Gagal menyimpan biodata profil.");

      // 2. Update Password Permanen jika diisi
      if (newPassword.trim().length > 0) {
          if (newPassword.trim().length < 6) {
              throw new Error("Password permanen minimal 6 karakter.");
          }
          const resPass = await fetch("/api/user/set-permanent-password", {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "x-user-email": localStorage.getItem("bilano_email") || "" 
              },
              body: JSON.stringify({ newPassword: newPassword.trim() })
          });
          if (!resPass.ok) throw new Error("Gagal menyimpan password baru.");
      }

      toast({ title: "Berhasil! ✨", description: "Biodata profil & pengaturan keamanan berhasil diperbarui." });
      await refetch();
      
      setTimeout(() => { window.location.href = "/"; }, 800);
      
    } catch (e: any) {
      toast({ title: "Gagal Menyimpan", description: e.message || "Cek koneksi server.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <img src="/BILANO-ICON-NEW.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-brand-navy font-black text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-gold"/>
                  <span>Memuat Profil Pengguna...</span>
              </div>
          </div>
      );
  }

  const isUserPro = user?.isPro || (typeof window !== "undefined" && localStorage.getItem("bilano_pro") === "true");

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA BILANO NAVY & GOLD */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b-2 border-amber-400">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(29,62,114,0.08)] flex items-center justify-between relative z-30 border-b border-amber-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            type="button"
                            className="w-10 h-10 rounded-full bg-brand-navy hover:bg-[#152e55] text-brand-gold shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                            title="Kembali ke Beranda"
                        >
                            <ArrowLeft className="w-5 h-5 text-brand-gold" strokeWidth={2.5} />
                        </button>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                                Akun & Keamanan
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                            Pengaturan Profil
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="bg-brand-navy text-brand-gold text-[10px] font-black px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 border border-brand-gold/30">
                        {isUserPro ? "👑 BILANO PRO" : "STANDARD"}
                    </span>
                </div>
            </div>

            {/* AVATAR UPLOAD SECTION DI ATAS KARTU HEADER */}
            <div className="flex flex-col items-center mt-5">
                <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="relative group cursor-pointer active:scale-95 transition-transform"
                >
                    <div className="w-28 h-28 rounded-full border-4 border-white bg-slate-100 shadow-[5px_5px_0px_0px] shadow-slate-900 overflow-hidden flex items-center justify-center">
                        {photoUrl ? (
                            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-14 h-14 text-slate-400" />
                        )}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-brand-navy p-2.5 rounded-full text-brand-gold shadow-[2px_2px_0px_0px] shadow-slate-900 border-2 border-white group-hover:bg-[#152e55] transition-colors">
                        <Camera className="w-4 h-4" />
                    </div>
                </div>

                <p className="text-xs font-black text-slate-800 mt-2.5">
                    {firstName ? `${firstName} ${lastName}`.trim() : "Pengguna BILANO"}
                </p>
                <p className="text-[11px] font-bold text-slate-500">
                    {user?.email || localStorage.getItem("bilano_email")}
                </p>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT SECTION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-4 pb-24 bg-slate-50 flex flex-col gap-4">
            
            {/* CROPPER MODAL */}
            {isCropping && imageSrc && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in">
                    <div className="relative flex-1 bg-black w-full">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            cropShape="round"
                            showGrid={false}
                        />
                    </div>
                    <div className="bg-slate-900 p-5 pb-8 space-y-4 border-t border-slate-800">
                        <div className="flex items-center gap-3 px-2">
                            <ZoomIn className="text-slate-400 w-5 h-5" />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-gold"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button 
                                type="button"
                                onClick={() => { setIsCropping(false); setImageSrc(null); }} 
                                className="flex-1 h-12 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4 inline mr-1"/> Batal
                            </button>
                            <button 
                                type="button"
                                onClick={showCroppedImage} 
                                className="flex-1 h-12 rounded-2xl bg-brand-gold text-brand-navy font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
                            >
                                <Check className="w-4 h-4 inline mr-1"/> Terapkan Foto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />

            {/* CARD 1: INFORMASI BIODATA */}
            <div className="bg-white rounded-[28px] p-5 border-2 border-amber-200/90 shadow-[6px_6px_0px_0px] shadow-slate-900 space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2.5">
                    <User className="w-4 h-4 text-amber-600" />
                    <h3 className="font-black text-brand-navy text-xs uppercase tracking-wider">
                        Informasi Biodata Diri
                    </h3>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Nama Depan
                    </label>
                    <input 
                        type="text" 
                        placeholder="Nama Depan" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Nama Belakang
                    </label>
                    <input 
                        type="text" 
                        placeholder="Nama Belakang" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* CARD 2: PENGATURAN PASSWORD PERMANEN */}
            <div className="bg-white rounded-[28px] p-5 border-2 border-amber-200/90 shadow-[6px_6px_0px_0px] shadow-slate-900 space-y-3.5">
                <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <h3 className="font-black text-brand-navy text-xs uppercase tracking-wider">
                        Keamanan & Password Akun
                    </h3>
                </div>

                {user?.isCustomPasswordSet === false && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-3 rounded-2xl leading-relaxed flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>Saat ini Anda masuk menggunakan kode 6 digit. Buat password permanen agar lebih mudah masuk di berbagai perangkat.</span>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Password Baru (Opsional)
                    </label>
                    <input 
                        type="password" 
                        placeholder="Masukkan minimal 6 karakter..." 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* TOMBOL SIMPAN */}
            <button 
                type="button"
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
            >
                {isSaving ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>MENYIMPAN PERUBAHAN...</span>
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4 stroke-[2.5]" />
                        <span>SIMPAN PERUBAHAN PROFIL</span>
                    </>
                )}
            </button>

        </div>
      </div>
    </MobileLayout>
  );
}