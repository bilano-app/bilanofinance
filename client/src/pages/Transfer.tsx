import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useUser } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRightLeft, Loader2, Plus, ArrowDown, ArrowUp, 
  Wallet, Check, ChevronDown, Sparkles, X, ArrowLeft,
  Landmark, CheckCircle2, ShieldCheck, HelpCircle, Coins
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import WalletSourceSelect from "@/components/WalletSourceSelect";
import { getWalletLogo } from "@/lib/wallet-sources";

const formatNumber = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
        clean = clean.replace(/^0+/, ''); 
    }
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const parseNumber = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;
const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");

export default function Transfer() {
  const { data: user, refetch: refetchUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [activeTab, setActiveTab] = useState<'transfer' | 'create_account'>('transfer');

  // Transfer State
  const [fromSource, setFromSource] = useState("");
  const [toSource, setToSource] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal selector states
  const [isFromModalOpen, setIsFromModalOpen] = useState(false);
  const [isToModalOpen, setIsToModalOpen] = useState(false);

  // Destination mode in transfer
  const [destinationMode, setDestinationMode] = useState<'existing' | 'new'>('existing');
  const [newSourceName, setNewSourceName] = useState("");
  const [isNewCustom, setIsNewCustom] = useState(false);

  // Create Direct Wallet Account State (Bisa mulai dari Rp 0 atau isi saldo awal)
  const [createAccountName, setCreateAccountName] = useState("");
  const [isCreateCustom, setIsCreateCustom] = useState(false);
  const [createInitialBalance, setCreateInitialBalance] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  const walletSources = (user?.walletSources as any[]) || [];
  const selectedFromWallet = walletSources.find(w => w.name === fromSource);
  const selectedToWallet = walletSources.find(w => w.name === toSource);

  const setPresetAmount = (val: number) => {
    setAmount(formatNumber(val.toString()));
  };

  const handleMaxAmount = () => {
    if (selectedFromWallet) {
      setAmount(formatNumber(selectedFromWallet.balance.toString()));
    }
  };

  // 🚀 FITUR 1: BUAT AKUN / SUMBER DANA BARU LANGSUNG (DENGAN SALDO AWAL OPSIONAL / RP 0)
  const handleCreateDirectAccount = async () => {
      const name = createAccountName.trim();
      if (!name) {
          toast({ title: "Nama Akun Kosong", description: "Pilih atau masukkan nama bank / dompet Anda.", variant: "destructive" });
          return;
      }

      const existing = walletSources.find(w => w.name.toLowerCase() === name.toLowerCase());
      if (existing) {
          toast({ title: "Akun Sudah Terdaftar", description: `Sumber dana ${name} sudah ada di daftar Anda.`, variant: "destructive" });
          return;
      }

      const initialBal = parseNumber(createInitialBalance);
      setIsCreatingAccount(true);

      try {
          const updatedSources = [
              ...walletSources,
              {
                  id: Date.now().toString(),
                  name: name,
                  isCustomSource: isCreateCustom,
                  currency: 'IDR',
                  balance: initialBal
              }
          ];

          const userEmail = localStorage.getItem("bilano_email") || "";
          const currentTotalCash = Number(user?.cashBalance || 0);
          const newTotalCash = currentTotalCash + initialBal;

          const res = await fetch("/api/user/wallet-sources", {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "x-user-email": userEmail
              },
              body: JSON.stringify({ 
                  walletSources: updatedSources,
                  cashBalance: newTotalCash
              })
          });

          if (res.ok) {
              await refetchUser();
              queryClient.invalidateQueries();
              toast({ 
                  title: "Akun Dompet Dibuat! 🎉", 
                  description: initialBal > 0 
                      ? `${name} berhasil dibuat dengan saldo awal ${formatRp(initialBal)} (menambah saldo kas).`
                      : `${name} berhasil didaftarkan (saldo Rp 0).`
              });
              setCreateAccountName("");
              setCreateInitialBalance("");
              setActiveTab('transfer');
          } else {
              toast({ title: "Gagal Menyimpan", variant: "destructive" });
          }
      } catch (e: any) {
          toast({ title: "Error Koneksi", description: e.message, variant: "destructive" });
      } finally {
          setIsCreatingAccount(false);
      }
  };
  
  // 🚀 FITUR 2: TRANSFER PINDAH SALDO ANTAR DOMPET
  const handleTransferSubmit = async () => {
      const numAmount = parseNumber(amount);
      const isAddingNew = destinationMode === 'new';
      const actualToSource = isAddingNew ? newSourceName.trim() : toSource;

      if (numAmount <= 0) {
          toast({ title: "Nominal Tidak Valid", description: "Masukkan jumlah uang yang ingin dipindahkan.", variant: "destructive" });
          return;
      }
      if (!fromSource || !actualToSource) {
          toast({ title: "Sumber Belum Lengkap", description: "Pastikan dompet asal dan tujuan transfer sudah ditentukan.", variant: "destructive" });
          return;
      }
      if (fromSource === actualToSource) {
          toast({ title: "Sumber Sama", description: "Dompet asal dan dompet tujuan tidak boleh sama.", variant: "destructive" });
          return;
      }

      const fromWallet = walletSources.find(w => w.name === fromSource);
      if (fromWallet && fromWallet.balance < numAmount) {
          toast({ title: "Saldo Tidak Cukup", description: `Saldo di ${fromSource} tidak mencukupi (${formatRp(fromWallet.balance)}).`, variant: "destructive" });
          return;
      }

      setIsSubmitting(true);
      const userEmail = localStorage.getItem("bilano_email") || "";
      const headers = { 
          "Content-Type": "application/json",
          "x-user-email": userEmail
      };

      try {
          // 1. Transaction Keluar (Dari)
          await fetch("/api/transactions", {
              method: "POST",
              headers,
              body: JSON.stringify({
                  type: "expense",
                  category: "Transfer Keluar",
                  amount: numAmount,
                  description: `Transfer ke ${actualToSource}: ${notes || 'Pindah Saldo'}`,
                  source: fromSource,
                  date: new Date().toISOString()
              })
          });

          // 2. Transaction Masuk (Ke)
          await fetch("/api/transactions", {
              method: "POST",
              headers,
              body: JSON.stringify({
                  type: "income",
                  category: "Transfer Masuk",
                  amount: numAmount,
                  description: `Terima dari ${fromSource}: ${notes || 'Pindah Saldo'}`,
                  source: actualToSource,
                  date: new Date().toISOString()
              })
          });

          // 3. Update / Create Wallet Sources
          if (walletSources.length > 0) {
              const updatedSources = [...walletSources];
              
              // Kurangi asal
              const fromIdx = updatedSources.findIndex(w => w.name === fromSource);
              if (fromIdx !== -1) {
                  updatedSources[fromIdx] = {
                      ...updatedSources[fromIdx],
                      balance: Math.max(0, updatedSources[fromIdx].balance - numAmount)
                  };
              }

              // Tambah tujuan
              const toIdx = updatedSources.findIndex(w => w.name === actualToSource);
              if (toIdx !== -1) {
                  updatedSources[toIdx] = {
                      ...updatedSources[toIdx],
                      balance: updatedSources[toIdx].balance + numAmount
                  };
              } else {
                  // Dompet Baru
                  updatedSources.push({
                      id: Date.now().toString(),
                      name: actualToSource,
                      isCustomSource: isNewCustom,
                      currency: 'IDR',
                      balance: numAmount
                  });
              }

              await fetch("/api/user/wallet-sources", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ walletSources: updatedSources })
              });
          }

          await refetchUser();
          queryClient.invalidateQueries();

          toast({ 
              title: "Pindah Saldo Berhasil! 🚀", 
              description: `Berhasil memindahkan dana ${formatRp(numAmount)} dari ${fromSource} ke ${actualToSource}.` 
          });

          setAmount("");
          setNotes("");
          setFromSource("");
          setToSource("");
          setNewSourceName("");
          setDestinationMode('existing');
      } catch (e: any) {
          toast({ title: "Transfer Gagal", description: e.message, variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  const fromLogo = getWalletLogo(fromSource);
  const toLogo = getWalletLogo(toSource);

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
                                    Mutasi Kas Internal
                                </p>
                            </div>
                            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                                Pindah Saldo & Akun
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="bg-brand-navy text-brand-gold text-[10px] font-black px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 border border-brand-gold/30">
                            WALLET HUB
                        </span>
                    </div>
                </div>

                {/* FLAGSHIP HERO CARD */}
                <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                    <ArrowRightLeft className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                    <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                                <Coins className="w-3 h-3 fill-current" /> MANAJEMEN DOMPET
                            </span>
                            <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                                {walletSources.length} Dompet Terdata
                            </span>
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1.5 leading-tight">
                            Pindah Saldo & Tambah Akun
                        </h2>
                        <p className="text-xs text-blue-100 font-medium leading-relaxed">
                            Atur perputaran dana antar bank, e-wallet, atau daftarkan akun rekening baru langsung dengan saldo awal.
                        </p>
                    </div>
                </div>

                {/* DUA TAB SWITCHER NEO-BRUTALIST */}
                <div className="grid grid-cols-2 gap-2 mt-4 bg-white/90 p-1.5 rounded-2xl border-2 border-amber-300 shadow-[3px_3px_0px_0px] shadow-slate-900/40">
                    <button
                        type="button"
                        onClick={() => setActiveTab('transfer')}
                        className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeTab === 'transfer'
                                ? 'bg-brand-navy text-brand-gold shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Pindah Saldo
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('create_account')}
                        className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeTab === 'create_account'
                                ? 'bg-brand-navy text-brand-gold shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" /> + Buat Akun Baru
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. BODY CONTENT SECTION */}
            {/* ========================================================================= */}
            <div className="px-5 pt-4 pb-28 bg-slate-50 flex flex-col gap-4">
                
                {/* TAB 1: PINDAH SALDO (TRANSFER) */}
                {activeTab === 'transfer' && (
                    <div className="space-y-4 animate-in fade-in">
                        
                        {/* 1. DARI SUMBER ASAL */}
                        <div className="bg-white p-5 rounded-[28px] border-2 border-amber-200/90 shadow-[5px_5px_0px_0px] shadow-slate-900 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300">
                                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                                    </div>
                                    Dari Dompet Asal (Tarik Dana)
                                </label>
                                {selectedFromWallet && (
                                    <span className="text-[11px] font-bold text-slate-500">
                                        Saldo: <strong className="text-slate-900">{formatRp(selectedFromWallet.balance)}</strong>
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsFromModalOpen(true)}
                                className="w-full h-15 bg-slate-50 hover:bg-white border-2 border-slate-200 rounded-2xl px-4 flex items-center justify-between transition-all text-left shadow-xs group active:scale-[0.99] cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                                        {fromLogo ? (
                                            <img src={fromLogo} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <Wallet className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        {fromSource ? (
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm text-slate-900 leading-tight">{fromSource}</span>
                                                {selectedFromWallet && (
                                                    <span className="text-[11px] font-bold text-emerald-700">{formatRp(selectedFromWallet.balance)}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-400">Sentuh untuk pilih dompet asal...</span>
                                        )}
                                    </div>
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            </button>
                        </div>

                        {/* 2. KE TUJUAN */}
                        <div className="bg-white p-5 rounded-[28px] border-2 border-amber-200/90 shadow-[5px_5px_0px_0px] shadow-slate-900 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
                                        <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                                    </div>
                                    Ke Dompet Tujuan (Terima Dana)
                                </label>
                            </div>

                            {/* Mode Toggle: Dompet Terdaftar vs Tambah Baru */}
                            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setDestinationMode('existing')}
                                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        destinationMode === 'existing'
                                            ? 'bg-brand-navy text-brand-gold shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Wallet className="w-3.5 h-3.5" /> Dompet Terdaftar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDestinationMode('new')}
                                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        destinationMode === 'new'
                                            ? 'bg-brand-navy text-brand-gold shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> + Sumber Baru
                                </button>
                            </div>

                            {destinationMode === 'existing' ? (
                                <div className="space-y-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsToModalOpen(true)}
                                        className="w-full h-15 bg-slate-50 hover:bg-white border-2 border-slate-200 rounded-2xl px-4 flex items-center justify-between transition-all text-left shadow-xs group active:scale-[0.99] cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                                                {toLogo ? (
                                                    <img src={toLogo} alt="Logo" className="w-full h-full object-contain" />
                                                ) : (
                                                    <Wallet className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                {toSource ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-sm text-slate-900 leading-tight">{toSource}</span>
                                                        {selectedToWallet && (
                                                            <span className="text-[11px] font-bold text-slate-500">{formatRp(selectedToWallet.balance)}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-400">Sentuh untuk pilih dompet tujuan...</span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 pt-1">
                                    <p className="text-[10px] text-brand-navy font-black uppercase tracking-wider">
                                        Pilih Bank / E-Wallet / Sekuritas Tujuan Baru:
                                    </p>
                                    <WalletSourceSelect
                                        value={newSourceName}
                                        isCustom={isNewCustom}
                                        onChange={(val, isCustom) => {
                                            setNewSourceName(val);
                                            setIsNewCustom(!!isCustom);
                                        }}
                                        placeholder="Pilih atau ketik nama dompet tujuan..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* 3. NOMINAL TRANSFER */}
                        <div className="bg-white p-5 rounded-[28px] border-2 border-amber-200/90 shadow-[5px_5px_0px_0px] shadow-slate-900 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-brand-navy uppercase tracking-wider">Nominal Pindah Dana (Rp)</label>
                                {selectedFromWallet && (
                                    <button
                                        type="button"
                                        onClick={handleMaxAmount}
                                        className="text-[11px] font-black text-brand-navy hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Sparkles className="w-3 h-3 text-amber-500 fill-current" /> Transfer Semua Saldo
                                    </button>
                                )}
                            </div>

                            <input 
                                type="tel"
                                placeholder="0" 
                                value={amount} 
                                onChange={(e) => setAmount(formatNumber(e.target.value))}
                                className="w-full h-15 px-4 font-black text-xl bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-amber-500 focus:bg-white text-slate-900 tabular-nums transition-all"
                            />

                            {/* Quick Preset Nominal Chips */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                {[50000, 100000, 250000, 500000, 1000000].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setPresetAmount(preset)}
                                        className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-200 active:scale-95 transition-all cursor-pointer"
                                    >
                                        +{preset >= 1000000 ? `${preset / 1000000} Jt` : `${preset / 1000} rb`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. CATATAN */}
                        <div className="bg-white p-5 rounded-[28px] border-2 border-amber-200/90 shadow-[5px_5px_0px_0px] shadow-slate-900 space-y-2">
                            <label className="text-xs font-black text-brand-navy uppercase tracking-wider block">Catatan Transfer (Opsional)</label>
                            <input 
                                placeholder="Cth: Pindah dana ke RDN untuk beli saham / top-up saldo" 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-12 px-4 font-bold text-xs bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all"
                            />
                        </div>

                        {/* SUBMIT BUTTON PINDAH DANA */}
                        <button 
                            type="button"
                            onClick={handleTransferSubmit} 
                            disabled={isSubmitting || !fromSource || (!toSource && destinationMode === 'existing') || (destinationMode === 'new' && !newSourceName.trim()) || !amount} 
                            className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                    <span>MEMPROSES PINDAH DANA...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                    <span>PROSES PINDAH DANA SEKARANG</span>
                                </>
                            )}
                        </button>

                    </div>
                )}

                {/* TAB 2: BUAT AKUN / DOMPET BARU (LANGSUNG DENGAN SALDO AWAL OPSIONAL) */}
                {activeTab === 'create_account' && (
                    <div className="space-y-4 animate-in fade-in">
                        
                        <div className="bg-white p-6 rounded-[28px] border-2 border-amber-200/90 shadow-[6px_6px_0px_0px] shadow-slate-900 space-y-4">
                            <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-brand-navy flex items-center justify-center border-2 border-amber-200">
                                    <Landmark className="w-6 h-6 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="font-black text-brand-navy text-sm uppercase tracking-wider">
                                        Pendaftaran Akun Dompet
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-bold">
                                        Buat akun bank/e-wallet baru langsung tanpa transfer.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">
                                    Pilih Bank / E-Wallet / Sekuritas
                                </label>
                                <WalletSourceSelect
                                    value={createAccountName}
                                    isCustom={isCreateCustom}
                                    onChange={(val, isCustom) => {
                                        setCreateAccountName(val);
                                        setIsCreateCustom(!!isCustom);
                                    }}
                                    placeholder="Pilih atau ketikkan nama akun dompet..."
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">
                                        Saldo Awal Saat Ini (Rp)
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-bold">Bisa diisi 0</span>
                                </div>
                                <input 
                                    type="tel"
                                    placeholder="0 (Atau isi saldo awal yang sudah ada)" 
                                    value={createInitialBalance} 
                                    onChange={(e) => setCreateInitialBalance(formatNumber(e.target.value))}
                                    className="w-full h-14 px-4 font-black text-lg bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-amber-500 focus:bg-white text-slate-900 tabular-nums transition-all"
                                />
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed px-1">
                                    💡 <em>Jika diisi &gt; 0, saldo awal ini akan langsung menambah Total Saldo Kas dan Kekayaan Bersih Anda tanpa dicatat sebagai pemasukan bulanan.</em>
                                </p>
                            </div>

                            <button 
                                type="button"
                                onClick={handleCreateDirectAccount} 
                                disabled={isCreatingAccount || !createAccountName.trim()} 
                                className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
                            >
                                {isCreatingAccount ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin"/>
                                        <span>MENDAFTARKAN AKUN DOMPET...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                        <span>SIMPAN AKUN DOMPET BARU</span>
                                    </>
                                )}
                            </button>
                        </div>

                    </div>
                )}

            </div>

            {/* MODAL POPUP: PILIH SUMBER ASAL DENGAN LOGO */}
            {isFromModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-[8px_8px_0px_0px] shadow-slate-900 border-2 border-slate-900 animate-in slide-in-from-bottom-5">
                        <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300">
                                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm">Pilih Dompet Asal</h3>
                                    <p className="text-[10px] text-slate-500 font-bold">Sumber dana yang akan ditarik</p>
                                </div>
                            </div>
                            <button onClick={() => setIsFromModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-slate-50">
                            {walletSources.map((wallet) => {
                                const logo = getWalletLogo(wallet.name);
                                const isSelected = fromSource === wallet.name;
                                return (
                                    <button
                                        key={wallet.name}
                                        type="button"
                                        onClick={() => {
                                            setFromSource(wallet.name);
                                            setIsFromModalOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left bg-white cursor-pointer ${
                                            isSelected 
                                                ? 'border-brand-navy shadow-[2px_2px_0px_0px] shadow-slate-900 ring-1 ring-brand-navy' 
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                                                {logo ? (
                                                    <img src={logo} alt={wallet.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Wallet className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 text-sm leading-tight">{wallet.name}</div>
                                                <div className="text-xs font-bold text-slate-500 mt-0.5">Saldo: {formatRp(wallet.balance)}</div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="w-6 h-6 rounded-full bg-brand-navy text-brand-gold flex items-center justify-center shrink-0 shadow-xs">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL POPUP: PILIH DOMPET TUJUAN DENGAN LOGO */}
            {isToModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-[8px_8px_0px_0px] shadow-slate-900 border-2 border-slate-900 animate-in slide-in-from-bottom-5">
                        <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
                                    <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm">Pilih Dompet Tujuan</h3>
                                    <p className="text-[10px] text-slate-500 font-bold">Dompet penerima saldo</p>
                                </div>
                            </div>
                            <button onClick={() => setIsToModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-slate-50">
                            {walletSources.filter(w => w.name !== fromSource).map((wallet) => {
                                const logo = getWalletLogo(wallet.name);
                                const isSelected = toSource === wallet.name;
                                return (
                                    <button
                                        key={wallet.name}
                                        type="button"
                                        onClick={() => {
                                            setToSource(wallet.name);
                                            setIsToModalOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left bg-white cursor-pointer ${
                                            isSelected 
                                                ? 'border-brand-navy shadow-[2px_2px_0px_0px] shadow-slate-900 ring-1 ring-brand-navy' 
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                                                {logo ? (
                                                    <img src={logo} alt={wallet.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Wallet className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 text-sm leading-tight">{wallet.name}</div>
                                                <div className="text-xs font-bold text-slate-500 mt-0.5">Saldo: {formatRp(wallet.balance)}</div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="w-6 h-6 rounded-full bg-brand-navy text-brand-gold flex items-center justify-center shrink-0 shadow-xs">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
      </div>
    </MobileLayout>
  );
}
