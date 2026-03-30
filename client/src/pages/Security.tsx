import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { ShieldCheck, KeyRound, EyeOff, Lock, ChevronRight, X, AlertCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/UIComponents";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function Security() {
    const { toast } = useToast();
    const [privacyMode, setPrivacyMode] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    
    // State untuk Modal PIN
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinAction, setPinAction] = useState<'create' | 'confirm' | 'remove'>('create');
    const [tempPin, setTempPin] = useState("");
    const [pinInput, setPinInput] = useState("");

    // State untuk Hapus Akun
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setPrivacyMode(localStorage.getItem("bilano_privacy") === "true");
        setHasPin(!!localStorage.getItem("bilano_app_pin"));
    }, []);

    const togglePrivacy = () => {
        const newValue = !privacyMode;
        setPrivacyMode(newValue);
        localStorage.setItem("bilano_privacy", newValue.toString());
        toast({ title: newValue ? "Mode Privasi Aktif" : "Mode Privasi Dimatikan", description: newValue ? "Saldo akan disensor di halaman utama." : "Saldo akan ditampilkan normal." });
    };

    const handlePinPress = (num: string) => {
        if (pinInput.length < 6) {
            const newVal = pinInput + num;
            setPinInput(newVal);
            
            if (newVal.length === 6) {
                setTimeout(() => processPinCompleted(newVal), 100);
            }
        }
    };

    const processPinCompleted = (enteredPin: string) => {
        if (pinAction === 'create') {
            setTempPin(enteredPin);
            setPinInput("");
            setPinAction('confirm');
        } else if (pinAction === 'confirm') {
            if (enteredPin === tempPin) {
                localStorage.setItem("bilano_app_pin", enteredPin);
                setHasPin(true);
                setShowPinModal(false);
                toast({ title: "PIN Berhasil Dibuat!", description: "Aplikasi Anda sekarang dilindungi PIN." });
            } else {
                setPinInput("");
                toast({ title: "PIN Tidak Cocok", description: "Silakan coba konfirmasi lagi.", variant: "destructive" });
            }
        } else if (pinAction === 'remove') {
            const savedPin = localStorage.getItem("bilano_app_pin");
            if (enteredPin === savedPin) {
                localStorage.removeItem("bilano_app_pin");
                setHasPin(false);
                setShowPinModal(false);
                toast({ title: "PIN Dihapus", description: "Kunci aplikasi telah dimatikan." });
            } else {
                setPinInput("");
                toast({ title: "PIN Salah", description: "Masukkan PIN Anda yang benar untuk mematikan kunci.", variant: "destructive" });
            }
        }
    };

    const deletePinChar = () => setPinInput(p => p.slice(0, -1));

    const openCreatePin = () => {
        setPinAction('create');
        setPinInput("");
        setTempPin("");
        setShowPinModal(true);
    };

    const openRemovePin = () => {
        setPinAction('remove');
        setPinInput("");
        setShowPinModal(true);
    };

    // 🚀 FUNGSI HAPUS AKUN PERMANEN (CASCADE DELETE)
    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const email = localStorage.getItem("bilano_email") || "";
            
            // 1. Eksekusi pemusnahan data di Database (PostgreSQL)
            await fetch("/api/user/account", {
                method: "DELETE",
                headers: { "x-user-email": email }
            });

            // 2. Cabut sesi Firebase & bersihkan cache
            await signOut(auth);
            localStorage.clear(); 
            window.location.href = "/auth";
        } catch (error) {
            setIsDeleting(false);
            toast({ title: "Gagal Menghapus Akun", description: "Periksa koneksi internet Anda.", variant: "destructive" });
        }
    };

    return (
        <MobileLayout title="Keamanan" showBack>
            <div className="p-4 space-y-6">
                
                {/* Header Info */}
                <div className="bg-indigo-600 text-white p-6 rounded-[24px] flex items-center gap-4 shadow-lg shadow-indigo-200">
                    <div className="bg-white/20 p-3 rounded-full">
                        <ShieldCheck className="w-8 h-8"/>
                    </div>
                    <div>
                        <h2 className="text-lg font-extrabold">Pusat Keamanan</h2>
                        <p className="text-indigo-100 text-xs mt-1 font-medium">Lindungi data finansial Anda dari akses yang tidak sah.</p>
                    </div>
                </div>

                {/* Toggles */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                    
                    {/* Mode Privasi */}
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={togglePrivacy}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${privacyMode ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                <EyeOff className="w-5 h-5"/>
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-sm">Mode Privasi Saldo</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Sensor uang Anda di tempat umum.</p>
                            </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${privacyMode ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${privacyMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </div>

                    {/* App PIN Lock */}
                    <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={hasPin ? openRemovePin : openCreatePin}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasPin ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                <KeyRound className="w-5 h-5"/>
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-sm">Kunci PIN Aplikasi</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Minta PIN 6-angka setiap kali dibuka.</p>
                            </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${hasPin ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${hasPin ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-[20px] p-4 flex gap-3 text-amber-800">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5"/>
                    <p className="text-xs font-medium leading-relaxed">
                        Perhatian: PIN Anda tersimpan dengan aman di dalam perangkat (HP) ini. Jika Anda lupa PIN, Anda harus menghapus data browser/aplikasi dan login ulang melalui Email OTP.
                    </p>
                </div>

                {/* 🚀 ZONA BERBAHAYA (HAPUS AKUN PERMANEN) */}
                <div className="mt-8 border-t border-rose-100 pt-6">
                    <h3 className="text-sm font-extrabold text-rose-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4"/> Zona Berbahaya
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Tindakan ini akan memusnahkan seluruh data transaksi, hutang, target, dan investasi Anda di server secara permanen. Data tidak dapat dipulihkan.
                    </p>
                    <Button 
                        onClick={() => setShowDeleteModal(true)} 
                        className="w-full h-12 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold shadow-none border border-rose-200 rounded-[16px]"
                    >
                        HAPUS AKUN SAYA PERMANEN
                    </Button>
                </div>

            </div>

            {/* MODAL PIN PAD */}
            {showPinModal && (
                <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center text-white animate-in slide-in-from-bottom-8">
                    <button onClick={() => setShowPinModal(false)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <X className="w-6 h-6"/>
                    </button>
                    
                    <Lock className="w-12 h-12 text-indigo-400 mb-4" />
                    <h2 className="text-xl font-bold mb-2">
                        {pinAction === 'create' ? "Buat PIN Baru" : pinAction === 'confirm' ? "Konfirmasi PIN Baru" : "Masukkan PIN Saat Ini"}
                    </h2>
                    <p className="text-sm text-slate-400 mb-8">
                        {pinAction === 'create' ? "Masukkan 6 angka untuk mengunci aplikasi" : pinAction === 'confirm' ? "Ketik ulang PIN yang sama" : "Untuk mematikan fitur keamanan"}
                    </p>

                    {/* Dots Indicator */}
                    <div className="flex gap-4 mb-12">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full transition-colors ${pinInput.length > i ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                        ))}
                    </div>

                    {/* Keypad */}
                    <div className="grid grid-cols-3 gap-6 max-w-xs mx-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button key={num} onClick={() => handlePinPress(num.toString())} className="w-16 h-16 rounded-full bg-slate-800 text-2xl font-bold hover:bg-slate-700 active:bg-slate-600 transition-colors">
                                {num}
                            </button>
                        ))}
                        <div />
                        <button onClick={() => handlePinPress('0')} className="w-16 h-16 rounded-full bg-slate-800 text-2xl font-bold hover:bg-slate-700 active:bg-slate-600 transition-colors">0</button>
                        <button onClick={deletePinChar} className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 active:bg-slate-600 transition-colors">
                            <X className="w-8 h-8"/>
                        </button>
                    </div>
                </div>
            )}

            {/* 🚀 MODAL KONFIRMASI HAPUS AKUN */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8"/>
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-2">Yakin Hapus Akun?</h3>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Semua catatan keuangan, saldo, dan target Anda akan dihapus permanen dari server. Tindakan ini tidak bisa dibatalkan!
                        </p>
                        <div className="space-y-3">
                            <Button 
                                onClick={handleDeleteAccount} 
                                disabled={isDeleting}
                                className="w-full h-12 bg-rose-600 hover:bg-rose-700 font-bold text-white shadow-md rounded-full"
                            >
                                {isDeleting ? "MEMUSNAHKAN DATA..." : "YA, HAPUS SEMUANYA"}
                            </Button>
                            <Button 
                                variant="ghost" 
                                onClick={() => setShowDeleteModal(false)} 
                                disabled={isDeleting}
                                className="w-full h-12 font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full"
                            >
                                BATAL
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </MobileLayout>
    );
}