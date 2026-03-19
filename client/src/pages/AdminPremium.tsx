import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { ShieldAlert, Crown, Search, CheckCircle2, XCircle, Calendar, Mail, User as UserIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function AdminPremium() {
    const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    const isAdmin = ["adrienfandra14@gmail.com", "bilanotech@gmail.com"].includes(currentUserEmail);
    
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: users = [], isLoading, refetch } = useQuery({
        queryKey: ['admin_users', currentUserEmail],
        queryFn: async () => {
            const res = await fetch("/api/admin/users", { headers: { "x-user-email": currentUserEmail } });
            if (!res.ok) throw new Error("Akses Ditolak");
            return res.json();
        },
        enabled: isAdmin
    });

    const handleUpdatePro = async (userId: number, currentEmail: string, grantPro: boolean) => {
        const actionText = grantPro ? "MEMBERIKAN" : "MENCABUT";
        if (!confirm(`Yakin ingin ${actionText} akses Premium untuk user: ${currentEmail}?`)) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}/pro`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                body: JSON.stringify({ isPro: grantPro })
            });

            if (res.ok) {
                toast({ title: "Berhasil!", description: `Status Pro user ${currentEmail} telah diperbarui.` });
                refetch();
            } else {
                toast({ title: "Gagal", variant: "destructive" });
            }
        } catch (e) {
            toast({ title: "Error Jaringan", variant: "destructive" });
        }
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-rose-500/20 p-6 rounded-full mb-6">
                    <ShieldAlert className="w-20 h-20 text-rose-500 animate-pulse" />
                </div>
                <h1 className="text-3xl font-black mb-2 text-rose-500 tracking-tight">AKSES DITOLAK</h1>
                <p className="text-slate-400 text-sm max-w-[250px] leading-relaxed">Area ini dikhususkan untuk Super Admin BILANO. Penyusup dilarang masuk!</p>
                <Button onClick={() => window.location.href='/'} className="mt-8 bg-white hover:bg-slate-200 text-slate-900 rounded-full h-14 px-8 font-extrabold shadow-lg transition-transform active:scale-95">
                    KEMBALI KE HOME
                </Button>
            </div>
        );
    }

    const filteredUsers = users.filter((u: any) => 
        (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.username || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPro = users.filter((u: any) => u.isPro).length;

    if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>;

    return (
        <MobileLayout title="Command Center" showBack>
            <div className="space-y-6 pt-4 pb-24 px-2">
                
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-amber-500/20 rounded-full"><Crown className="w-6 h-6 text-amber-400"/></div>
                            <h2 className="text-xl font-black tracking-tight">Admin Premium</h2>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-white/10 p-4 rounded-[20px] flex-1 border border-white/5 backdrop-blur-sm">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total User</p>
                                <p className="text-3xl font-black">{users.length}</p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 p-4 rounded-[20px] flex-1 border border-amber-500/20 backdrop-blur-sm">
                                <p className="text-[10px] text-amber-200 font-bold uppercase tracking-widest mb-1">User Premium</p>
                                <p className="text-3xl font-black text-amber-400">{totalPro}</p>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                <div className="relative">
                    <Search className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                    <Input 
                        placeholder="Cari email pengguna..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-14 rounded-[24px] bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="font-extrabold text-slate-800 text-sm ml-2 px-1">Daftar Pengguna ({filteredUsers.length})</h3>
                    
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-10 bg-white rounded-[24px] border border-dashed border-slate-200 text-slate-400 text-sm font-medium">Pengguna tidak ditemukan.</div>
                    )}

                    {filteredUsers.map((u: any) => (
                        <div key={u.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col gap-4 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3 items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${u.isPro ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {u.email ? u.email[0].toUpperCase() : <UserIcon className="w-5 h-5"/>}
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-slate-800 text-sm truncate max-w-[180px]">{u.email || u.username}</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(u.createdAt).toLocaleDateString('id-ID')}</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${u.isPro ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {u.isPro ? 'Premium' : 'Free Trial'}
                                </span>
                            </div>

                            {u.isPro && u.proValidUntil && (
                                <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-[16px] flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Kadaluarsa:</span>
                                    <span className="text-xs font-black text-amber-600">{new Date(u.proValidUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                </div>
                            )}

                            <div className="pt-2 border-t border-slate-50 flex gap-2">
                                {!u.isPro ? (
                                    <Button onClick={() => handleUpdatePro(u.id, u.email, true)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-[16px] h-12 shadow-sm shadow-amber-200 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4"/> BERI PREMIUM
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={() => handleUpdatePro(u.id, u.email, false)} className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-extrabold rounded-[16px] h-12 flex items-center gap-2">
                                        <XCircle className="w-4 h-4"/> CABUT AKSES
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </MobileLayout>
    );
}