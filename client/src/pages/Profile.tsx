import { useState, useEffect, useRef, useCallback } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useUser } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { User, Camera, Save, Loader2, X, Check, ZoomIn } from "lucide-react";
import Cropper from "react-easy-crop"; 

// --- UTILITY CROP GAMBAR ---
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

  // Kompresi kualitas gambar ke 0.8 (80%) agar tidak terlalu berat
  return canvas.toDataURL("image/jpeg", 0.8);
}

export default function Profile() {
  const { data: user, isLoading, refetch } = useUser();
  const { toast } = useToast();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoUrl, setPhotoUrl] = useState(""); 
  const [isSaving, setIsSaving] = useState(false);

  // State Cropping
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
      
      // Validasi Ukuran (Max 5MB)
      if (file.size > 5 * 1024 * 1024) {
          toast({ title: "Foto Terlalu Besar", description: "Maksimal ukuran 5MB", variant: "destructive" });
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
      toast({ title: "Error", description: "Gagal memproses gambar.", variant: "destructive" });
    }
  };

  // --- FUNGSI SIMPAN YANG LEBIH AMAN ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log("Mengirim data profil...", { firstName, lastName, photoLength: photoUrl?.length });

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { 
            "Content-Type": "application/json",
            "x-user-email": localStorage.getItem("bilano_email") || "" 
        },
        body: JSON.stringify({ firstName, lastName, profilePicture: photoUrl })
      });

      if (res.ok) {
        toast({ title: "Berhasil", description: "Profil berhasil diperbarui!" });
        await refetch(); // Update data di aplikasi
        
        // Pindah halaman SETELAH sukses
        setTimeout(() => {
            window.location.href = "/";
        }, 1000);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal update profil");
      }
    } catch (e: any) {
      console.error("Error Save:", e);
      toast({ 
          title: "Gagal Menyimpan", 
          description: e.message || "Cek koneksi server.", 
          variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading data...</div>;

  return (
    <MobileLayout title="Edit Profil" showBack>
      <div className="space-y-8 pt-8 px-1 relative">
        
        {/* MODAL CROPPER */}
        {isCropping && imageSrc && (
            <div className="fixed inset-0 z-[60] bg-black flex flex-col">
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
                <div className="bg-slate-900 p-6 pb-10 space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <ZoomIn className="text-slate-400 w-5 h-5" />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                    <div className="flex gap-4">
                        <Button variant="secondary" onClick={() => { setIsCropping(false); setImageSrc(null); }} className="flex-1 bg-slate-800 text-white border border-slate-700">
                            <X className="w-4 h-4 mr-2"/> Batal
                        </Button>
                        <Button onClick={showCroppedImage} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                            <Check className="w-4 h-4 mr-2"/> Pakai Foto
                        </Button>
                    </div>
                </div>
            </div>
        )}

        <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />

        {/* AREA FOTO PROFIL */}
        <div className="flex flex-col items-center gap-4">
            <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer active:scale-95 transition-transform">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                    {photoUrl ? (
                        <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-16 h-16 text-slate-300" />
                    )}
                </div>
                <div className="absolute bottom-1 right-1 bg-indigo-600 p-3 rounded-full text-white shadow-lg border-4 border-slate-50 group-hover:bg-indigo-700 transition-colors">
                    <Camera className="w-5 h-5" />
                </div>
            </div>
        </div>

        {/* FORM INPUT */}
        <div className="space-y-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nama Depan</label>
                <Input placeholder="Nama Depan" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="font-bold text-slate-800"/>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nama Belakang</label>
                <Input placeholder="Nama Belakang" value={lastName} onChange={(e) => setLastName(e.target.value)} className="font-bold text-slate-800"/>
            </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-xl text-base rounded-2xl">
            {isSaving ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : <Save className="w-5 h-5 mr-2"/>}
            {isSaving ? "Menyimpan..." : "SIMPAN PERUBAHAN"}
        </Button>

      </div>
    </MobileLayout>
  );
}