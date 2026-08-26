import { useState } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    CreditCard, Calendar, RefreshCcw, Power, Plus, Trash2, 
    CheckCircle2, AlertCircle, X, Loader2, Zap, ArrowLeft,
    Clock, Sparkles, Check, Edit3, ShieldAlert, Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/tracking";
import { formatCurrency } from "@/lib/utils";

interface Subscription {
  id: number;
  name: string;
  price?: number;
  cost?: number;
  cycle: string; 
  nextBilling?: string;
  nextPaymentDate?: string;
  next_payment_date?: string;
  category?: string;
  isActive: boolean;
}

const PRESET_SUBSCRIPTIONS = [
  { name: "Netflix", cost: 186000, icon: "🎬", category: "statis" },
  { name: "Spotify", cost: 54990, icon: "🎵", category: "statis" },
  { name: "YouTube Premium", cost: 59000, icon: "▶️", category: "statis" },
  { name: "ChatGPT Plus", cost: 350000, icon: "🤖", category: "statis" },
  { name: "WiFi / Internet", cost: 350000, icon: "📶", category: "statis" },
  { name: "Listrik PLN", cost: 0, icon: "⚡", category: "dinamis" },
  { name: "Air PDAM", cost: 0, icon: "💧", category: "dinamis" },
  { name: "iCloud / Google One", cost: 45000, icon: "☁️", category: "statis" },
  { name: "Gym & Fitness", cost: 400000, icon: "🏋️", category: "statis" },
  { name: "BPJS Kesehatan", cost: 150000, icon: "🏥", category: "statis" },
];

export default function Subscriptions() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cycle, setCycle] = useState("bulanan");
  const [nextDate, setNextDate] = useState("");
  const [billType, setBillType] = useState<"statis" | "dinamis">("statis");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  
  // Cek Status Setup & State Modal Pop-up
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;
  const getAuthHeaders = () => ({ "x-user-email": currentUserEmail });

  const formatNum = (val: string) => {
      if (!val) return "";
      let raw = val.replace(/\./g, "").replace(/[^0-9]/g, "");
      if (raw.length > 1) {
          raw = raw.replace(/^0+/, '');
      }
      return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNum = (val: string) => parseFloat(val.replace(/\./g, "")) || 0;

  const { data: subs = [], isLoading: loading, refetch: fetchSubs } = useQuery<Subscription[]>({
      queryKey: ['subscriptions', currentUserEmail],
      queryFn: async () => {
          const res = await fetch("/api/subscriptions", { headers: getAuthHeaders() });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const handleOpenAddModal = () => {
      setEditingSub(null);
      setName("");
      setPrice("");
      setCycle("bulanan");
      // Default tanggal jatuh tempo: 1 bulan dari hari ini
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 1);
      setNextDate(defaultDate.toISOString().split('T')[0]);
      setBillType("statis");
      setIsFormOpen(true);
  };

  const handleOpenEditModal = (sub: Subscription) => {
      setEditingSub(sub);
      setName(sub.name || "");
      const nominal = Number(sub.cost || sub.price || 0);
      setPrice(nominal > 0 ? formatNum(nominal.toString()) : "");
      setCycle(sub.cycle === 'yearly' || sub.cycle === 'tahunan' ? 'tahunan' : 'bulanan');
      
      const rawDate = sub.nextBilling || sub.nextPaymentDate || sub.next_payment_date;
      if (rawDate) {
          try {
              setNextDate(new Date(rawDate).toISOString().split('T')[0]);
          } catch(e) {
              setNextDate("");
          }
      } else {
          setNextDate("");
      }
      
      setBillType((sub.category === 'dinamis') ? 'dinamis' : 'statis');
      setIsFormOpen(true);
  };

  const handleApplyPreset = (preset: typeof PRESET_SUBSCRIPTIONS[0]) => {
      setName(preset.name);
      setBillType(preset.category as "statis" | "dinamis");
      if (preset.cost > 0) {
          setPrice(formatNum(preset.cost.toString()));
      } else {
          setPrice("");
      }
  };

  const handleSaveSub = async () => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      if (!name.trim()) {
          toast({ title: "Nama Tagihan Wajib Diisi", description: "Masukkan nama layanan atau tagihan.", variant: "destructive" });
          return;
      }
      if (!nextDate) {
          toast({ title: "Tanggal Tempo Wajib Diisi", description: "Pilih tanggal tagihan berikutnya.", variant: "destructive" });
          return;
      }

      const nominal = billType === 'dinamis' ? 0 : parseNum(price);
      
      try {
          if (editingSub) {
              // Edit mode: delete old and create new or update status
              await fetch(`/api/subscriptions/${editingSub.id}`, { method: "DELETE", headers: getAuthHeaders() });
          }

          const res = await fetch("/api/subscriptions", {
              method: "POST", 
              headers: { "Content-Type": "application/json", ...getAuthHeaders() },
              body: JSON.stringify({ 
                  name: name.trim(), 
                  price: nominal, 
                  cost: nominal, 
                  cycle: cycle === 'tahunan' ? 'yearly' : 'bulanan', 
                  nextBilling: new Date(nextDate),
                  nextPaymentDate: nextDate, 
                  category: billType, 
                  isActive: editingSub ? editingSub.isActive : true 
              })
          });

          if (res.ok) {
              trackEvent("subscription_added", { 
                  category: billType, 
                  cycle: cycle 
              });
              toast({ 
                  title: editingSub ? "Perubahan Disimpan! 🔄" : "Tagihan Berhasil Ditambahkan! 📋", 
                  description: `${name} telah masuk dalam daftar pengeluaran rutin.` 
              });
              setIsFormOpen(false);
              queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
              queryClient.invalidateQueries();
              fetchSubs();
          } else {
              toast({ title: "Gagal menyimpan tagihan", variant: "destructive" });
          }
      } catch (e) { 
          toast({ title: "Terjadi kesalahan jaringan", variant: "destructive" }); 
      }
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
          trackEvent("subscription_status_toggled", { 
              setToActive: !currentStatus 
          });
          toast({
              title: !currentStatus ? "Layanan Diaktifkan 🟢" : "Layanan Dinonaktifkan ⏸️",
              description: !currentStatus ? "Tagihan akan kembali dihitung dalam beban bulanan." : "Tagihan dijeda dan tidak dihitung dalam beban bulanan."
          });
          queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
          fetchSubs();
      } catch (e) {}
  };

  const deleteSub = async (id: number, subName: string) => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      if(!confirm(`Hapus layanan "${subName}" secara permanen dari daftar langganan?`)) return;
      try {
          await fetch(`/api/subscriptions/${id}`, { 
              method: "DELETE",
              headers: getAuthHeaders()
          });
          trackEvent("subscription_deleted", {});
          toast({ title: "Terhapus 🗑️", description: `Layanan ${subName} berhasil dihapus.` });
          queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
          fetchSubs();
      } catch (e) {}
  };

  const activeSubs = subs.filter((s: Subscription) => s.isActive !== false);
  const inactiveSubs = subs.filter((s: Subscription) => s.isActive === false);

  const displayedSubs = activeFilter === 'all' 
    ? subs 
    : activeFilter === 'active' 
      ? activeSubs 
      : inactiveSubs;

  const totalMonthly = activeSubs.reduce((acc: number, curr: any) => {
      if (curr.category === 'dinamis') return acc;
      const nominal = Number(curr.cost || curr.price || 0);
      const isYearly = curr.cycle === 'yearly' || curr.cycle === 'tahunan';
      return acc + (isYearly ? nominal / 12 : nominal);
  }, 0);

  const dynamicBillsCount = activeSubs.filter((s: any) => s.category === 'dinamis').length;

  const getDaysUntilDue = (dateStr?: string) => {
      if (!dateStr) return null;
      try {
          const due = new Date(dateStr);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          due.setHours(0, 0, 0, 0);
          const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays;
      } catch(e) {
          return null;
      }
  };

  if (loading) {
      return (
          <MobileLayout>
              <div className="min-h-[70vh] flex flex-col items-center justify-center">
                  <Loader2 className="w-9 h-9 animate-spin text-amber-500 mb-3"/>
                  <p className="text-xs font-bold text-slate-500 font-mono tracking-wider uppercase">Memuat Daftar Langganan...</p>
              </div>
          </MobileLayout>
      );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA BILANO SIGNATURE GOLD (#F59E0B) */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b-2 border-brand-gold">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(245,158,11,0.08)] flex items-center justify-between relative z-30 border-b border-amber-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            className="w-10 h-10 rounded-full bg-brand-navy hover:bg-slate-800 text-white shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                            title="Kembali ke Beranda"
                        >
                            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                        </button>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse"></span>
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                                Beban & Tagihan Rutin
                            </p>
                        </div>
                        <h1 className="text-base font-black text-brand-navy leading-tight tracking-tight">
                            Atur Langganan
                        </h1>
                    </div>
                </div>

                {/* Quick Add Action Pill */}
                <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-1.5 bg-brand-navy text-brand-gold px-3.5 py-1.5 rounded-full text-[10px] font-bold border border-brand-gold/30 shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5 text-brand-gold stroke-[2.5]" />
                    <span>TAMBAH</span>
                </button>
            </div>

            {/* FLAGSHIP HERO CARD - DENGAN SOLID SHADOW KHAS BILANO */}
            <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <RefreshCcw className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <RefreshCcw className="w-3 h-3 fill-current" /> RECURRING EXPENSES
                        </span>
                        <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                            {activeSubs.length} Layanan Aktif
                        </span>
                    </div>

                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Estimasi Beban Tetap Bulanan
                    </p>

                    <div className="flex items-baseline gap-2 mb-2">
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight tabular-nums">
                            {formatCurrency(totalMonthly).split(',')[0]}
                        </h2>
                        <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">/ Bulan</span>
                    </div>

                    <div className="pt-2.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-100 font-medium leading-relaxed">
                        <span>💡 {activeSubs.length} langganan aktif terjadwal otomatis</span>
                        {dynamicBillsCount > 0 && (
                            <span className="bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-400/30">
                                ⚡ +{dynamicBillsCount} Tagihan Dinamis
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT SECTION - CLEAN, CRISP & MODERN BILANO ELEVATION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-4">
            
            {/* Filter Tabs & Header Bar */}
            <div className="flex justify-between items-center px-1">
                <div className="flex bg-slate-200/80 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveFilter("all")}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${activeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Semua ({subs.length})
                    </button>
                    <button 
                        onClick={() => setActiveFilter("active")}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${activeFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Aktif ({activeSubs.length})
                    </button>
                    <button 
                        onClick={() => setActiveFilter("inactive")}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${activeFilter === 'inactive' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Jeda ({inactiveSubs.length})
                    </button>
                </div>

                <button
                    onClick={handleOpenAddModal}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Tambah
                </button>
            </div>

            {/* List of Subscriptions */}
            <div className="space-y-3">
                {displayedSubs.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 p-6 shadow-xs">
                        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                            <CreditCard className="w-8 h-8 opacity-70" />
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-sm mb-1">
                            {activeFilter === 'inactive' ? 'Tidak Ada Tagihan yang Dijeda' : 'Belum Ada Langganan Terdaftar'}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mb-5 max-w-xs mx-auto leading-relaxed">
                            {activeFilter === 'inactive'
                                ? 'Semua layanan langganan Anda saat ini berstatus aktif.'
                                : 'Catat pengeluaran rutin seperti Netflix, Spotify, WiFi, Listrik, atau cicilan bulanan agar keuangan Anda selalu terencana.'}
                        </p>
                        <button 
                            type="button"
                            onClick={handleOpenAddModal}
                            className="bg-brand-navy hover:bg-slate-800 text-brand-gold px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                        >
                            + TAMBAH LANGGANAN PERTAMA
                        </button>
                    </div>
                ) : (
                    displayedSubs.map((sub: Subscription) => {
                        const nominal = Number(sub.cost || sub.price || 0);
                        const rawDate = sub.nextBilling || sub.nextPaymentDate || sub.next_payment_date;
                        const validDate = rawDate ? new Date(rawDate) : null;
                        const daysRemaining = getDaysUntilDue(rawDate);
                        const isDynamic = sub.category === 'dinamis';
                        const isYearly = sub.cycle === 'yearly' || sub.cycle === 'tahunan';

                        return (
                            <div 
                                key={sub.id} 
                                className={`bg-white p-4.5 rounded-3xl border transition-all space-y-3 ${sub.isActive !== false ? 'border-slate-200/80 shadow-[3px_3px_0px_0px] shadow-slate-100 hover:border-amber-300 hover:shadow-sm' : 'border-slate-200 opacity-60 bg-slate-50/70'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border shrink-0 shadow-xs ${isDynamic ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {isDynamic ? <Zap className="w-5 h-5" /> : (sub.name?.[0]?.toUpperCase() || '📦')}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-slate-900 text-sm truncate">{sub.name}</h4>
                                                {sub.isActive === false && (
                                                    <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.2 rounded-full uppercase">
                                                        Dijeda
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {validDate && (
                                                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                        Tempo: <b className="text-slate-700">{validDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</b>
                                                    </span>
                                                )}
                                                
                                                {daysRemaining !== null && sub.isActive !== false && (
                                                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${daysRemaining <= 3 ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse' : daysRemaining <= 7 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                                                        {daysRemaining === 0 ? "Jatuh Tempo Hari Ini!" : daysRemaining < 0 ? `Lewat ${Math.abs(daysRemaining)} hari` : `${daysRemaining} hari lagi`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right shrink-0">
                                        {isDynamic ? (
                                            <div className="flex flex-col items-end">
                                                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                    Dinamis
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-medium mt-0.5">Sesuai Tagihan</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <p className="font-black text-slate-900 text-base tabular-nums">
                                                    {formatCurrency(nominal).split(',')[0]}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                    /{isYearly ? 'Tahun' : 'Bulan'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Action Bar */}
                                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => toggleStatus(sub.id, sub.isActive !== false)}
                                            className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${sub.isActive !== false ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
                                            title={sub.isActive !== false ? "Jeda Langganan" : "Aktifkan Kembali"}
                                        >
                                            <Power className="w-3 h-3" />
                                            <span>{sub.isActive !== false ? 'Jeda' : 'Aktifkan'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditModal(sub)}
                                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                            title="Edit Tagihan"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => deleteSub(sub.id, sub.name)}
                                        className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                        title="Hapus Tagihan"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Quick Presets Section */}
            <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/70 p-4.5 rounded-3xl border border-amber-200/80 shadow-xs mt-2">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                        Preset Tagihan Populer
                    </h3>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium mb-3">
                    Klik salah satu preset di bawah untuk mengisi formulir langganan secara instan:
                </p>

                <div className="flex flex-wrap gap-1.5">
                    {PRESET_SUBSCRIPTIONS.map((preset, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                handleApplyPreset(preset);
                                setIsFormOpen(true);
                            }}
                            className="bg-white hover:bg-amber-100/60 border border-amber-200/80 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-800 shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>{preset.icon}</span>
                            <span>{preset.name}</span>
                        </button>
                    ))}
                </div>
            </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL TAMBAH & EDIT TAGIHAN (BILANO SOLID DESIGN) */}
      {/* ========================================================================= */}
      {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom sm:zoom-in-95 max-h-[90vh] overflow-y-auto">
                  
                  {/* Modal Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
                      <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                              <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="font-black text-slate-900 text-base">
                                  {editingSub ? "Edit Tagihan / Langganan" : "Tambah Langganan Baru"}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  Pengeluaran Berkala
                              </p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setIsFormOpen(false)} 
                          className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer"
                      >
                          <X className="w-4 h-4" />
                      </button>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                      
                      {/* Tipe Nominal: Statis vs Dinamis */}
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                              Karakteristik Nominal
                          </label>
                          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                              <button 
                                  type="button"
                                  onClick={() => setBillType('statis')} 
                                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${billType === 'statis' ? 'bg-brand-navy text-brand-gold shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                              >
                                  <span>🔒</span> Nominal Tetap
                              </button>
                              <button 
                                  type="button"
                                  onClick={() => setBillType('dinamis')} 
                                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${billType === 'dinamis' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                              >
                                  <span>⚡</span> Berubah-ubah
                              </button>
                          </div>
                      </div>

                      {/* Nama Tagihan */}
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                              Nama Layanan / Tagihan <span className="text-rose-500">*</span>
                          </label>
                          <Input 
                              placeholder="Cth: Netflix, Spotify, WiFi Biznet, PLN" 
                              value={name} 
                              onChange={e => setName(e.target.value)} 
                              className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold text-sm focus:border-brand-gold focus:ring-2 focus:ring-amber-100"
                          />
                      </div>

                      {/* Nominal & Siklus (Hanya jika Statis) */}
                      {billType === 'statis' ? (
                          <div className="space-y-3 animate-in fade-in">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0">
                                  Nominal Pembayaran <span className="text-rose-500">*</span>
                              </label>
                              <div className="flex gap-2">
                                  <div className="relative flex-1">
                                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">Rp</span>
                                      <Input 
                                          type="text" 
                                          inputMode="numeric" 
                                          placeholder="50.000" 
                                          value={price} 
                                          onChange={e => setPrice(formatNum(e.target.value))} 
                                          className="h-12 pl-10 rounded-2xl bg-slate-50 border-slate-200 font-black text-base focus:border-brand-gold focus:ring-2 focus:ring-amber-100"
                                      />
                                  </div>
                                  <select 
                                      value={cycle} 
                                      onChange={e => setCycle(e.target.value)} 
                                      className="w-32 bg-slate-50 border border-slate-200 rounded-2xl px-3 font-bold text-slate-800 text-xs outline-none focus:border-brand-gold focus:ring-2 focus:ring-amber-100"
                                  >
                                      <option value="bulanan">/ Bulan</option>
                                      <option value="tahunan">/ Tahun</option>
                                  </select>
                              </div>
                          </div>
                      ) : (
                          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed font-medium animate-in fade-in flex items-start gap-2">
                              <span className="text-base">💡</span>
                              <p>
                                  Untuk tagihan dengan nominal berubah-ubah (seperti Listrik PLN atau Air PDAM), sistem akan mencatat jadwal jatuh tempo dan mengingatkan Anda untuk memasukkan nominal aktual saat jatuh tempo tiba.
                              </p>
                          </div>
                      )}

                      {/* Tanggal Tagihan Berikutnya */}
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                              Tanggal Jatuh Tempo Berikutnya <span className="text-rose-500">*</span>
                          </label>
                          <Input 
                              type="date" 
                              value={nextDate} 
                              onChange={e => setNextDate(e.target.value)} 
                              className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold text-sm text-slate-800 focus:border-brand-gold focus:ring-2 focus:ring-amber-100"
                          />
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 flex gap-2.5">
                          <button
                              type="button"
                              onClick={handleSaveSub}
                              className="flex-1 h-13 bg-brand-navy hover:bg-slate-800 text-brand-gold font-black rounded-2xl text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                          >
                              {editingSub ? "SIMPAN PERUBAHAN" : "SIMPAN LANGGANAN"}
                          </button>
                          <button
                              type="button"
                              onClick={() => setIsFormOpen(false)}
                              className="px-5 h-13 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                          >
                              BATAL
                          </button>
                      </div>

                  </div>
              </div>
          </div>
      )}

      {/* 🚀 Pop-up Penghalang Submit (Belum Setup) */}
      {showSetupPrompt && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-[32px] p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 border border-slate-100">
                  <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5">
                      <AlertCircle className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Aksi Tertahan</h2>
                  <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">
                      Untuk memastikan laporan tetap akurat, Anda harus menyelesaikan Setup Saldo Awal sebelum mencatat transaksi.
                  </p>
                  <div className="space-y-3">
                      <Button onClick={() => window.location.href = '/target'} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-full shadow-lg">LAKUKAN SETUP SEKARANG</Button>
                      <Button variant="ghost" onClick={() => setShowSetupPrompt(false)} className="w-full h-12 font-bold text-slate-400 hover:text-slate-600 rounded-full">Tutup</Button>
                  </div>
              </div>
          </div>
      )}

    </MobileLayout>
  );
}