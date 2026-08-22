import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useUser } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, Loader2, Plus, ArrowDown, ArrowUp, Wallet, Check } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const formatNumber = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
        clean = clean.replace(/^0+/, ''); 
    }
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const parseNumber = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;

export default function Transfer() {
  const { data: user } = useUser();
  const { toast } = useToast();
  
  const [fromSource, setFromSource] = useState("");
  const [toSource, setToSource] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Source State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  
  const walletSources = (user?.walletSources as any[]) || [];
  
  const handleSubmit = async () => {
      const numAmount = parseNumber(amount);
      if (numAmount <= 0) {
          toast({ title: "Nominal tidak valid", description: "Masukkan jumlah uang yang ingin ditransfer.", variant: "destructive" });
          return;
      }
      if (!fromSource || (!toSource && !isAddingNew) || (isAddingNew && !newSourceName.trim())) {
          toast({ title: "Sumber belum dipilih", description: "Pastikan sumber asal dan tujuan sudah dipilih.", variant: "destructive" });
          return;
      }
      if (fromSource === toSource && !isAddingNew) {
          toast({ title: "Sumber sama", description: "Sumber asal dan tujuan tidak boleh sama.", variant: "destructive" });
          return;
      }

      const fromWallet = walletSources.find(w => w.name === fromSource);
      if (fromWallet && fromWallet.balance < numAmount) {
          toast({ title: "Saldo tidak cukup", description: `Saldo di ${fromSource} tidak mencukupi.`, variant: "destructive" });
          return;
      }

      setIsSubmitting(true);
      try {
          const actualToSource = isAddingNew ? newSourceName.trim() : toSource;

          // 1. Transaction Keluar (Dari)
          await fetch("/api/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  type: "expense",
                  amount: numAmount,
                  category: "Transfer Keluar",
                  description: `Ke ${actualToSource} ${notes ? `(${notes})` : ""}`,
                  source: fromSource
              })
          });

          // 2. Transaction Masuk (Ke)
          await fetch("/api/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  type: "income",
                  amount: numAmount,
                  category: "Transfer Masuk",
                  description: `Dari ${fromSource} ${notes ? `(${notes})` : ""}`,
                  source: actualToSource
              })
          });

          // 3. Update dompet jika menambah baru (karena jika dompet baru tidak ada di transaksi awal)
          if (isAddingNew) {
              const updatedSources = [...walletSources, {
                  id: Date.now().toString(),
                  name: actualToSource,
                  isCustomSource: true,
                  currency: fromWallet?.currency || 'IDR',
                  balance: 0 // Will be added by the transaction logic in backend (Wait, transaction logic adds it? Let's send a full sync)
              }];
              // We should just refetch user, backend route handles the wallet update if sourceName is provided!
          }

          toast({ title: "Transfer Berhasil", description: `Dana dipindahkan ke ${actualToSource}.` });
          
          setAmount("");
          setNotes("");
          setIsAddingNew(false);
          setNewSourceName("");
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      } catch (e: any) {
          toast({ title: "Terjadi Kesalahan", description: "Gagal memproses transfer.", variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <MobileLayout title="Transfer Dana" showBack>
        <div className="p-4 pb-32 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-[#0a1128] to-[#121c3a] p-6 rounded-[32px] text-white relative overflow-hidden shadow-xl border border-blue-500/20">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
                <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black mb-1">Pindah Dana</h2>
                        <p className="text-sm text-slate-300 font-medium max-w-[200px]">Atur perpindahan saldo antar dompet atau rekeningmu sendiri.</p>
                    </div>
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shrink-0">
                        <ArrowRightLeft className="w-8 h-8 text-emerald-400" />
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white p-5 rounded-[28px] shadow-[0_8px_30px_rgb(15,23,42,0.04)] border border-slate-100 space-y-5">
                
                {/* Dari Sumber */}
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                            <ArrowUp className="w-3 h-3 text-rose-600" />
                        </div>
                        Dari Sumber (Tarik Dana)
                    </label>
                    <select
                        value={fromSource}
                        onChange={(e) => setFromSource(e.target.value)}
                        className="w-full h-14 bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                    >
                        <option value="">-- Pilih Sumber Asal --</option>
                        {walletSources.map((w) => (
                            <option key={w.name} value={w.name}>{w.name} (Saldo: {w.balance.toLocaleString('id-ID')})</option>
                        ))}
                    </select>
                </div>

                {/* Ke Tujuan */}
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <ArrowDown className="w-3 h-3 text-emerald-600" />
                        </div>
                        Ke Tujuan (Terima Dana)
                    </label>
                    
                    {!isAddingNew ? (
                        <div className="space-y-3">
                            <select
                                value={toSource}
                                onChange={(e) => setToSource(e.target.value)}
                                className="w-full h-14 bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                            >
                                <option value="">-- Pilih Tujuan --</option>
                                {walletSources.filter(w => w.name !== fromSource).map((w) => (
                                    <option key={w.name} value={w.name}>{w.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={() => setIsAddingNew(true)}
                                className="w-full flex items-center justify-center gap-2 h-12 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors text-sm"
                            >
                                <Plus className="w-4 h-4" /> TAMBAH SUMBER BARU
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-indigo-800">Buat Dompet Baru</span>
                                <button onClick={() => setIsAddingNew(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Batal</button>
                            </div>
                            <Input 
                                placeholder="Misal: BNI / Rekening Istri / Celengan" 
                                value={newSourceName} 
                                onChange={(e) => setNewSourceName(e.target.value)}
                                className="h-12 font-bold bg-white border-indigo-200 text-sm"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <div className="h-px w-full bg-slate-100 my-4" />

                {/* Nominal */}
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Nominal Transfer</label>
                    <div className="relative flex items-center">
                        <span className="absolute left-4 font-black text-slate-400">Rp</span>
                        <Input 
                            type="tel"
                            placeholder="0" 
                            value={amount} 
                            onChange={(e) => setAmount(formatNumber(e.target.value))}
                            className="h-16 pl-12 font-black text-2xl bg-slate-50 border-slate-200 rounded-2xl focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Catatan (Opsional)</label>
                    <Input 
                        placeholder="Misal: Pindah ke RDN untuk beli saham" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)}
                        className="h-14 font-medium text-sm bg-slate-50 border-slate-200 rounded-2xl"
                    />
                </div>
            </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-safe">
            <div className="max-w-md mx-auto">
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !fromSource || (!toSource && !isAddingNew) || !amount} 
                    className="w-full h-14 bg-brand-navy hover:bg-slate-800 text-brand-gold text-base font-black rounded-full shadow-[5px_5px_0px_0px] shadow-slate-300 active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : <span className="flex items-center gap-2">PROSES TRANSFER <Check className="w-5 h-5" /></span>}
                </Button>
            </div>
        </div>
    </MobileLayout>
  );
}
