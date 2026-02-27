import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    Users, ArrowUpRight, ArrowDownLeft, Calendar, 
    CheckCircle2, Trash2, Plus, HandCoins, AlertCircle, X, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DebtItem {
  id: number;
  type: 'hutang' | 'piutang';
  name: string; // Trik Sandi: Budi|USD
  amount: number;
  dueDate: string;
  description: string;
  isPaid: boolean;
}

export default function Debts() {
  const [items, setItems] = useState<DebtItem[]>([]);
  const [forexRates, setForexRates] = useState<Record<string, number>>({});
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hutang' | 'piutang'>('piutang'); 

  // FORM STATES
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [dueDate, setDueDate] = useState("");
  const [desc, setDesc] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { toast } = useToast();

  const fetchData = async () => {
      try {
          const userEmail = localStorage.getItem("bilano_email") || "";
          const t = Date.now();
          const [resDebts, resRates] = await Promise.all([
              fetch(`/api/debts?t=${t}`, { headers: { "x-user-email": userEmail } }),
              fetch(`/api/forex/rates?t=${t}`, { headers: { "x-user-email": userEmail } })
          ]);
          
          if(resDebts.ok) setItems(await resDebts.json());
          if(resRates.ok) {
              const rates = await resRates.json();
              setForexRates(rates);
              setAvailableCurrencies(Object.keys(rates));
          }
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
      if(!name || !amount) return;
      try {
          // TRIK SANDI: Gabungkan nama dan mata uang dengan separator "|"
          const nameWithCurrency = `${name}|${currency}`;
          const res = await fetch("/api/debts", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": localStorage.getItem("bilano_email") || "" },
              body: JSON.stringify({ type: activeTab, name: nameWithCurrency, amount: parseFloat(amount), dueDate, description: desc })
          });
          if(res.ok) {
              toast({ title: "Tersimpan", description: "Catatan berhasil ditambahkan." });
              setIsFormOpen(false); setName(""); setAmount(""); setDueDate(""); setDesc(""); setCurrency("IDR");
              fetchData();
          }
      } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleMarkPaid = async (id: number, type: string, displayName: string) => {
      if(!confirm(`Tandai Lunas untuk ${displayName}? Saldo akan otomatis disesuaikan.`)) return;
      try {
          const res = await fetch(`/api/debts/${id}/pay`, { 
              method: "POST", 
              headers: { "x-user-email": localStorage.getItem("bilano_email") || "" } 
          });
          if(res.ok) {
              toast({ title: "Lunas!", description: "Saldo kas telah diupdate." });
              fetchData();
          }
      } catch (e) {}
  };

  const handleDelete = async (id: number) => {
      if(!confirm("Hapus catatan ini secara permanen?")) return;
      try {
          await fetch(`/api/debts/${id}`, { 
              method: "DELETE", 
              headers: { "x-user-email": localStorage.getItem("bilano_email") || "" } 
          });
          fetchData();
      } catch (e) {}
  };

  const filteredItems = items.filter(i => i.type === activeTab);
  
  // Kalkulasi Total dengan Live Rate
  const totalAmountIDR = filteredItems.filter(i => !i.isPaid).reduce((acc, item) => {
      const parts = (item.name || "").split('|');
      const curr = parts[1] || 'IDR';
      const rate = curr === 'IDR' ? 1 : (forexRates[curr] || 1);
      return acc + (item.amount * rate);
  }, 0);

  const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>;

  return (
    <MobileLayout title="Hutang & Piutang" showBack>
      <div className="space-y-6 pt-4 pb-24 px-1">
        
        {/* HEADER CARD */}
        <div className={`p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden transition-colors duration-500 ${activeTab === 'piutang' ? 'bg-gradient-to-br from-emerald-500 to-teal-700' : 'bg-gradient-to-br from-rose-500 to-pink-700'}`}>
            <div className="relative z-10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-1 flex items-center gap-2">
                    {activeTab === 'piutang' ? <HandCoins className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                    Total {activeTab === 'piutang' ? 'Uang di Orang (Piutang)' : 'Kewajiban (Hutang)'}
                </p>
                <h2 className="text-4xl font-extrabold tracking-tight">{formatRp(totalAmountIDR)}</h2>
                <p className="text-[10px] mt-2 opacity-80">*Mengikuti kurs live harian</p>
            </div>
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-tl-full pointer-events-none"></div>
        </div>

        {/* TABS */}
        <div className="flex bg-slate-100 p-1.5 rounded-full">
            <button onClick={() => setActiveTab('piutang')} className={`flex-1 py-3.5 rounded-full text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${activeTab === 'piutang' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <ArrowUpRight className="w-4 h-4"/> PIUTANG (Uang Kita)
            </button>
            <button onClick={() => setActiveTab('hutang')} className={`flex-1 py-3.5 rounded-full text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${activeTab === 'hutang' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <ArrowDownLeft className="w-4 h-4"/> HUTANG (Pinjaman)
            </button>
        </div>

        {/* FAB / TOMBOL TAMBAH */}
        {!isFormOpen ? (
            <Button onClick={() => setIsFormOpen(true)} className={`w-full h-14 rounded-full font-extrabold shadow-lg transition-transform active:scale-95 ${activeTab === 'piutang' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-200 shadow-rose-100'}`}>
                <Plus className="w-5 h-5 mr-2"/> CATAT {activeTab.toUpperCase()} BARU
            </Button>
        ) : (
            <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-extrabold text-slate-800">Form {activeTab === 'hutang' ? 'Hutang' : 'Piutang'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="p-1.5 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500"><X className="w-5 h-5"/></button>
                </div>
                <div className="space-y-4">
                    <Input placeholder="Nama Pihak (Cth: Budi)" value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-[20px] bg-slate-50 border-transparent font-bold"/>
                    
                    <div className="flex gap-2">
                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-24 px-3 bg-indigo-50 text-indigo-700 font-bold border-transparent rounded-[20px] outline-none text-sm">
                            <option value="IDR">IDR</option>
                            {availableCurrencies.filter(c => c !== 'IDR').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <Input type="number" placeholder="Nominal" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 h-14 rounded-[20px] bg-slate-50 border-transparent font-bold text-lg"/>
                    </div>
                    
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-14 rounded-[20px] bg-slate-50 border-transparent text-sm"/>
                    <Input placeholder="Catatan Tambahan (Opsional)" value={desc} onChange={e => setDesc(e.target.value)} className="h-14 rounded-[20px] bg-slate-50 border-transparent text-sm"/>
                    <Button onClick={handleAdd} className={`w-full h-14 rounded-full font-extrabold text-white mt-2 shadow-lg ${activeTab === 'piutang' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`}>SIMPAN</Button>
                </div>
            </div>
        )}

        {/* LIST */}
        <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm ml-2 px-1">Daftar Belum Lunas</h3>
            {filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm">
                    <p className="text-slate-400 text-sm font-medium">Yeay! Tidak ada {activeTab} tercatat.</p>
                </div>
            ) : (
                filteredItems.map(item => {
                    const parts = (item.name || "").split('|');
                    const displayName = parts[0];
                    const curr = parts[1] || 'IDR';
                    const rate = curr === 'IDR' ? 1 : (forexRates[curr] || 1);
                    const isForeign = curr !== 'IDR';
                    const totalIDR = item.amount * rate;

                    return (
                        <div key={item.id} className={`bg-white p-5 rounded-[24px] border shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex justify-between items-center transition-all ${item.isPaid ? 'opacity-60 border-slate-100' : (activeTab === 'piutang' ? 'border-emerald-50' : 'border-rose-50')}`}>
                            <div className="flex-1 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${item.isPaid ? 'bg-slate-100 text-slate-500' : (activeTab === 'piutang' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}`}>
                                        {item.isPaid ? 'LUNAS' : 'BELUM LUNAS'}
                                    </span>
                                    <span className="font-extrabold text-slate-800 text-base">{displayName}</span>
                                </div>
                                
                                <div className="mt-1">
                                    {isForeign ? (
                                        <>
                                            <p className={`font-extrabold text-lg ${item.isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                {curr} {item.amount.toLocaleString()}
                                            </p>
                                            <p className="text-xs font-bold text-slate-500">≈ {formatRp(totalIDR)}</p>
                                        </>
                                    ) : (
                                        <p className={`font-extrabold text-lg ${item.isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            {formatRp(item.amount)}
                                        </p>
                                    )}
                                </div>

                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-2">
                                    <Calendar className="w-3 h-3"/> Tempo: {item.dueDate || "-"} 
                                    {item.description && <span className="ml-1 text-slate-400 truncate max-w-[120px]">• {item.description}</span>}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                {!item.isPaid ? (
                                    <button onClick={() => handleMarkPaid(item.id, item.type, displayName)} className={`p-3 rounded-[16px] text-white shadow-md active:scale-95 transition-transform flex flex-col items-center justify-center ${activeTab === 'hutang' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                                        <CheckCircle2 className="w-5 h-5 mb-0.5"/>
                                        <span className="text-[9px] font-extrabold uppercase tracking-wider">{activeTab === 'hutang' ? 'Bayar' : 'Tagih'}</span>
                                    </button>
                                ) : (
                                    <button onClick={() => handleDelete(item.id)} className="p-3 bg-slate-50 text-slate-400 rounded-[16px] hover:bg-rose-50 hover:text-rose-500 transition-colors">
                                        <Trash2 className="w-5 h-5"/>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })
            )}
        </div>

      </div>
    </MobileLayout>
  );
}