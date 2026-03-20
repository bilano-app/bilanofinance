import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card, Button, Input } from "@/components/UIComponents";
import { 
    CreditCard, Calendar, RefreshCcw, Power, Plus, Trash2, 
    CheckCircle2, AlertCircle, X, Loader2, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Subscription {
  id: number;
  name: string;
  price: number;
  cycle: string; 
  nextPaymentDate: string;
  category: string;
  isActive: boolean;
}

export default function Subscriptions() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [nextDate, setNextDate] = useState("");
  const [billType, setBillType] = useState("statis"); 

  const { toast } = useToast();

  const currentUserEmail = localStorage.getItem("bilano_email") || "";
  const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;
  const getAuthHeaders = () => ({ "x-user-email": currentUserEmail });

  const { data: subs = [], isLoading: loading, refetch: fetchSubs } = useQuery({
      queryKey: ['subscriptions', currentUserEmail],
      queryFn: async () => {
          const res = await fetch("/api/subscriptions", { headers: getAuthHeaders() });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const handleAdd = async () => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      if (!name || !nextDate) return;
      
      try {
          const res = await fetch("/api/subscriptions", {
              method: "POST", 
              headers: { "Content-Type": "application/json", ...getAuthHeaders() },
              body: JSON.stringify({ 
                  name, 
                  price: parseFloat(price) || 0, 
                  cost: parseFloat(price) || 0, 
                  cycle, 
                  nextBilling: nextDate,
                  nextPaymentDate: nextDate, 
                  category: billType, 
                  isActive: true 
              })
          });
          if (res.ok) {
              toast({ title: "Berhasil Disimpan!", description: "Layanan telah aktif." });
              setIsFormOpen(false); setName(""); setPrice(""); setNextDate(""); setBillType("statis");
              fetchSubs();
          } else {
              toast({ title: "Gagal menyimpan", variant: "destructive" });
          }
      } catch (e) { toast({ title: "Error sistem", variant: "destructive" }); }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }
      try {
          await fetch(`/api/subscriptions/${id}/status`, {
              method: "PATCH", 
              headers: { "Content-Type": "application/json", ...getAuthHeaders() },
              body: JSON.stringify({ isActive: !currentStatus })
          });
          fetchSubs();
      } catch (e) {}
  };

  const deleteSub = async (id: number) => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      if(!confirm("Hapus layanan ini secara permanen dari daftar?")) return;
      try {
          await fetch(`/api/subscriptions/${id}`, { 
              method: "DELETE",
              headers: getAuthHeaders()
          });
          toast({ title: "Terhapus", description: "Layanan berhasil dihapus." });
          fetchSubs();
      } catch (e) {}
  };

  const activeSubs = subs.filter((s: Subscription) => s.isActive);
  const inactiveSubs = subs.filter((s: Subscription) => !s.isActive);

  const totalMonthly = activeSubs.reduce((acc: number, curr: Subscription) => {
      if (curr.category === 'dinamis') return acc;
      return acc + (curr.cycle === 'yearly' ? curr.price / 12 : curr.price);
  }, 0);

  const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

  if (loading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4"/>
              <p className="text-sm font-bold text-slate-500">Memuat Data...</p>
          </div>
      );
  }

  return (
    <MobileLayout title="Atur Langganan" showBack>
      <div className="space-y-6 pt-4 pb-24 px-1">
        
        <div className="bg-slate-900 text-white p-7 rounded-[32px] shadow-xl relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 text-emerald-400"/> Estimasi Beban Tetap
                </p>
                <h2 className="text-4xl font-extrabold tracking-tight">{formatRp(totalMonthly)}</h2>
                <p className="text-[10px] text-slate-400 mt-2">*Tidak termasuk tagihan dinamis (Listrik, Air, dll)</p>
            </div>
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-500/10 rounded-tl-full pointer-events-none blur-xl"></div>
        </div>

        {!isFormOpen ? (
            <Button onClick={() => setIsFormOpen(true)} className="w-full h-14 rounded-full font-extrabold text-slate-800 bg-white border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:bg-slate-50 transition-transform active:scale-95">
                <Plus className="w-5 h-5 mr-2 text-indigo-600"/> TAMBAH LANGGANAN / TAGIHAN
            </Button>
        ) : (
            <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-extrabold text-slate-800">Tagihan Baru</h3>
                    <button onClick={() => setIsFormOpen(false)} className="p-1.5 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500"><X className="w-5 h-5"/></button>
                </div>
                <div className="space-y-4">
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setBillType('statis')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold ${billType === 'statis' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500'}`}>Nominal Tetap</button>
                        <button onClick={() => setBillType('dinamis')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold ${billType === 'dinamis' ? 'bg-orange-500 text-white shadow' : 'text-slate-500'}`}>Berubah-ubah</button>
                    </div>

                    <Input placeholder="Nama (Cth: Netflix, PLN)" value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-[20px] bg-slate-50 border-transparent font-bold"/>
                    
                    {billType === 'statis' ? (
                        <div className="flex gap-2 animate-in fade-in">
                            <Input type="number" placeholder="Harga (Rp)" value={price} onChange={e => setPrice(e.target.value)} className="flex-1 h-14 rounded-[20px] bg-slate-50 border-transparent font-bold"/>
                            <select value={cycle} onChange={e => setCycle(e.target.value)} className="w-1/3 bg-slate-50 border-transparent rounded-[20px] px-3 font-bold text-slate-700 text-sm outline-none">
                                <option value="monthly">/ Bln</option>
                                <option value="yearly">/ Thn</option>
                            </select>
                        </div>
                    ) : (
                        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 animate-in fade-in">
                            <p className="text-[11px] text-orange-800 font-medium leading-relaxed">Sistem akan mengingatkan Anda untuk memasukkan nominal tagihan secara manual setiap kali tanggal jatuh tempo tiba.</p>
                        </div>
                    )}

                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1 ml-1">Tanggal Tagihan Berikutnya</label>
                        <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="h-14 rounded-[20px] bg-slate-50 border-transparent font-bold text-slate-700"/>
                    </div>
                    <Button onClick={handleAdd} className="w-full h-14 rounded-full font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 mt-2">SIMPAN</Button>
                </div>
            </div>
        )}

        <div className="space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm px-1 mb-1">Tagihan Aktif</h3>
            {activeSubs.length === 0 && <div className="text-center py-8 text-slate-400 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm text-sm font-medium">Belum ada layanan aktif.</div>}
            
            {activeSubs.map((sub: Subscription) => (
                <div key={sub.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex justify-between items-center transition-all hover:shadow-md">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-lg border ${sub.category === 'dinamis' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                            {sub.category === 'dinamis' ? <Zap className="w-5 h-5"/> : sub.name[0].toUpperCase()}
                        </div>
                        <div>
                            <h4 className="font-extrabold text-slate-800 text-base">{sub.name}</h4>
                            <p className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3"/> Tempo: {new Date(sub.nextPaymentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-right mr-1">
                            {sub.category === 'dinamis' ? (
                                <p className="font-extrabold text-orange-500 text-[11px] uppercase tracking-wider">Berubah-ubah</p>
                            ) : (
                                <>
                                    <p className="font-extrabold text-slate-800 text-sm">{formatRp(sub.price)}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">/{sub.cycle === 'monthly' ? 'Bulan' : 'Tahun'}</p>
                                </>
                            )}
                        </div>
                        <button onClick={() => deleteSub(sub.id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-[14px] hover:bg-rose-100 transition-colors" title="Hapus Permanen"><Trash2 className="w-4 h-4"/></button>
                        <button onClick={() => toggleStatus(sub.id, true)} className="p-2.5 bg-slate-100 text-slate-500 rounded-[14px] hover:bg-slate-200 transition-colors" title="Non-aktifkan Sementara"><Power className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
        </div>

        {inactiveSubs.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="font-extrabold text-slate-400 text-sm px-1 mb-1">Riwayat / Berhenti</h3>
                <div className="space-y-3 opacity-70 hover:opacity-100 transition-opacity">
                    {inactiveSubs.map((sub: Subscription) => (
                        <div key={sub.id} className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-200 text-slate-500 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold">{sub.name[0].toUpperCase()}</div>
                                <div><h4 className="font-bold text-slate-600 text-sm">{sub.name}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Non-Aktif</p></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => toggleStatus(sub.id, false)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-[14px] hover:bg-emerald-100" title="Aktifkan Lagi"><RefreshCcw className="w-4 h-4"/></button>
                                <button onClick={() => deleteSub(sub.id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-[14px] hover:bg-rose-100" title="Hapus Permanen"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </MobileLayout>
  );
}