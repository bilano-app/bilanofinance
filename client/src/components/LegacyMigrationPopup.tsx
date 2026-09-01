import { useState, useMemo } from "react";
import { Button, Input } from "@/components/UIComponents";
import { Wallet, Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import WalletSourceSelect from "@/components/WalletSourceSelect";

const formatNumber = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 1) clean = clean.replace(/^0+/, ''); 
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const parseNumber = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;
const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

export default function LegacyMigrationPopup({ onComplete }: { onComplete: () => void }) {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([
    { id: Date.now().toString(), source: "BCA", isCustomSource: false, balance: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTotal = user?.cashBalance || 0;

  const handleAddEntry = () => {
    setEntries([...entries, { id: Date.now().toString(), source: "GoPay", isCustomSource: false, balance: "" }]);
  };
  const handleRemoveEntry = (id: string) => { setEntries(entries.filter(e => e.id !== id)); };
  
  const updateEntry = (id: string, field: string, value: any) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        if (field === 'source' && value === 'custom') {
          updated.isCustomSource = true;
          updated.source = '';
        }
        return updated;
      }
      return e;
    }));
  };

  const distributedTotal = useMemo(() => entries.reduce((sum, e) => sum + (parseNumber(e.balance) || 0), 0), [entries]);
  const remainingTotal = currentTotal - distributedTotal;

  const handleSubmit = async () => {
    const invalidEntries = entries.filter(e => !e.source.trim() || parseNumber(e.balance) <= 0);
    if (invalidEntries.length > 0) {
      toast({ title: "Form Belum Lengkap", description: "Pastikan semua sumber dan saldo terisi dengan benar (tidak boleh 0).", variant: "destructive" });
      return;
    }
    if (remainingTotal < 0) {
        toast({ title: "Total Melebihi Kas", description: "Jumlah rincian tidak boleh melebihi total kas lama Anda.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
        const walletSources = entries.map(e => ({
            id: e.id,
            name: e.source,
            isCustomSource: e.isCustomSource,
            currency: 'IDR',
            balance: parseNumber(e.balance)
        }));

        // Jika masih ada sisa (remainingTotal > 0), masukkan ke "Cash (Lainnya)"
        if (remainingTotal > 0) {
            walletSources.push({
                id: Date.now().toString() + "_remaining",
                name: "Cash (Lainnya)",
                isCustomSource: true,
                currency: 'IDR',
                balance: remainingTotal
            });
        }

        // We use the new endpoint
        const res = await fetch("/api/user/wallet-sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletSources })
        });
        
        if (!res.ok) throw new Error("Gagal menyimpan data sumber dana.");
        
        localStorage.setItem("bilano_migration_completed", "true");
        toast({ title: "Migrasi Selesai", description: "Rincian dompet berhasil disimpan." });
        onComplete();
    } catch (e: any) {
        toast({ title: "Terjadi Kesalahan", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="p-6 bg-brand-navy text-white text-center rounded-t-[32px] border-b-[6px] border-brand-gold relative">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <Wallet className="w-8 h-8 text-brand-gold" />
                </div>
                <h2 className="text-xl font-black mb-1">Rincikan Dompetmu</h2>
                <p className="text-xs text-blue-100/80 font-medium">
                    Sistem baru BILANO kini mendukung Multi-Sumber Uang! Rincikan total kas lama-mu (<strong className="text-white">{formatRp(currentTotal)}</strong>) ke berbagai dompet di bawah.
                </p>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-slate-50">
                
                <div className={`sticky top-0 z-10 mb-4 p-3 rounded-2xl flex justify-between items-center text-sm font-bold shadow-sm ${remainingTotal === 0 ? 'bg-emerald-100 text-emerald-700' : remainingTotal < 0 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                    <span>Sisa untuk dirincikan:</span>
                    <span className="text-lg">{formatRp(remainingTotal)}</span>
                </div>

                <div className="space-y-4">
                    {entries.map((entry, index) => (
                    <div key={entry.id} className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-200 relative">
                        {entries.length > 1 && (
                        <button onClick={() => handleRemoveEntry(entry.id)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                        )}
                        <div className="mb-3 pr-8">
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Dompet {index + 1}</label>
                            <WalletSourceSelect
                                value={entry.source}
                                isCustom={entry.isCustomSource}
                                onChange={(val, isCustom) => {
                                    setEntries(entries.map(e => {
                                        if (e.id === entry.id) {
                                            return { ...e, source: val, isCustomSource: !!isCustom };
                                        }
                                        return e;
                                    }));
                                }}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Saldo di Dalamnya</label>
                            <Input type="tel" placeholder="0" value={entry.balance} onChange={(e) => updateEntry(entry.id, 'balance', formatNumber(e.target.value))} className="h-12 font-black text-lg bg-slate-50 border-slate-200 rounded-xl focus:border-indigo-500" />
                        </div>
                    </div>
                    ))}
                </div>

                <button onClick={handleAddEntry} className="w-full flex items-center justify-center gap-2 h-12 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-[20px] hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 mt-4">
                    <Plus className="w-5 h-5" /> TAMBAH SUMBER
                </button>
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
                <Button onClick={handleSubmit} disabled={isSubmitting || remainingTotal < 0} className="w-full h-14 bg-brand-navy hover:bg-slate-800 text-brand-gold font-black rounded-full shadow-[4px_4px_0px_0px] shadow-slate-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px] transition-all">
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : <span className="flex items-center gap-2">SIMPAN PERUBAHAN <ArrowRight className="w-4 h-4" /></span>}
                </Button>
            </div>
        </div>
    </div>
  );
}
