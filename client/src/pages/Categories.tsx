import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance"; // 🚀 FIX: Import ini

interface CategoryItem {
    id: number;
    name: string;
    type: 'income' | 'expense';
}

export default function Categories() {
    const { toast } = useToast();
    const { data: user } = useUser(); // 🚀 FIX: Ambil status user
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [newCat, setNewCat] = useState("");
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [loading, setLoading] = useState(true);

    const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;
    const isLocked = !user?.isPro && isTrialExpired;

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/categories");
            if (res.ok) setCategories(await res.json());
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const handleAdd = async () => {
        // 🚀 FIX: Gembok Elegan
        if (isLocked) { window.dispatchEvent(new Event('trigger-paywall-lock')); return; }

        if (!newCat) return;
        try {
            const res = await fetch("/api/categories", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCat, type: activeTab })
            });
            if (res.ok) {
                toast({ title: "Berhasil", description: "Kategori ditambahkan" });
                setNewCat(""); fetchCategories();
            }
        } catch (e) {}
    };

    const handleDelete = async (id: number) => {
        // 🚀 FIX: Gembok Elegan
        if (isLocked) { window.dispatchEvent(new Event('trigger-paywall-lock')); return; }

        try {
            await fetch(`/api/categories/${id}`, { method: "DELETE" });
            fetchCategories();
        } catch (e) {}
    };

    const filtered = categories.filter(c => c.type === activeTab);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
                <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin"/>
                    <span>Memuat Data...</span>
                </div>
            </div>
        );
    }

    return (
        <MobileLayout title="Kategori" showBack>
            <div className="pt-4 pb-24 space-y-6 px-1">
                
                {/* TABS */}
                <div className="flex bg-slate-100 p-1.5 rounded-full shadow-inner">
                    <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3.5 rounded-full text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${activeTab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <ArrowUpCircle className="w-4 h-4"/> PENGELUARAN
                    </button>
                    <button onClick={() => setActiveTab('income')} className={`flex-1 py-3.5 rounded-full text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${activeTab === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <ArrowDownCircle className="w-4 h-4"/> PEMASUKAN
                    </button>
                </div>

                {/* FORM TAMBAH */}
                <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex gap-2">
                    <Input 
                        placeholder={`Kategori ${activeTab === 'expense' ? 'Pengeluaran' : 'Pemasukan'} Baru...`} 
                        value={newCat} 
                        onChange={(e) => setNewCat(e.target.value)} 
                        className="flex-1 text-sm h-12 bg-slate-50 border-transparent rounded-[16px] font-bold"
                    />
                    <Button onClick={handleAdd} className={`h-12 w-12 rounded-[16px] flex items-center justify-center flex-shrink-0 shadow-md ${activeTab === 'expense' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'}`}>
                        <Plus className="w-6 h-6 text-white"/>
                    </Button>
                </div>

                {/* LIST KATEGORI */}
                <div className="space-y-3">
                    <h3 className="font-extrabold text-slate-400 uppercase tracking-widest text-[11px] ml-2">Daftar Kategori Custom</h3>
                    {filtered.length === 0 && <div className="text-center text-xs font-medium text-slate-400 py-8 bg-white border border-dashed border-slate-200 rounded-[24px]">Belum ada kategori kustom.</div>}
                    
                    {filtered.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-[20px] border border-slate-100 flex justify-between items-center shadow-sm">
                            <span className="font-extrabold text-slate-700">{item.name}</span>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                </div>

            </div>
        </MobileLayout>
    );
}