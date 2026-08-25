import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    Send, Bot, User, Loader2, Trash2, AlertCircle, 
    ArrowLeft, Sparkles, Zap, ChevronRight, MessageSquare, 
    ShieldCheck, TrendingUp, Wallet, Check, Crown
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";
import { 
    useUser, useTransactions, useForexAssets, 
    useInvestments, useTarget 
} from "@/hooks/use-finance"; 
import { formatCurrency } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking";

const DEFAULT_RATES: Record<string, number> = {
    "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
    "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
};

interface Message {
    id: number;
    sender: 'user' | 'ai';
    text: string;
    time: string;
}

const QUICK_PROMPTS = [
    { label: "Evaluasi Arus Kas", prompt: "Tolong evaluasi arus kas dan rasio kesehatan pengeluaran saya bulan ini secara mendalam." },
    { label: "Analisis Kekayaan Bersih", prompt: "Berapa total kekayaan bersih saya saat ini dan bagaimana alokasi aset idealnya?" },
    { label: "Strategi Tabung & Investasi", prompt: "Berikan strategi konkret untuk meningkatkan tabungan dan investasi saya berdasarkan data keuangan saat ini." },
    { label: "Audit Kebocoran Pengeluaran", prompt: "Tolong periksa apakah ada pengeluaran saya yang berpotensi bocor atau melebihi anggaran." }
];

export default function ChatAI() {
    const { data: user, isLoading: isUserLoading } = useUser();
    const { data: transactions } = useTransactions();
    const { data: forexAssetsData } = useForexAssets();
    const { data: investments } = useInvestments();
    const { data: target } = useTarget();

    const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    
    // Ambil data Valas, Hutang, dan Tertahan
    const { data: forexRates = {} } = useQuery({
        queryKey: ['forexRates', currentUserEmail],
        queryFn: async () => {
            const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": currentUserEmail } });
            return res.json();
        },
        enabled: !!currentUserEmail
    });

    const { data: debtsData = [] } = useQuery({
        queryKey: ['debts', currentUserEmail],
        queryFn: async () => {
            const res = await fetch(`/api/debts`, { headers: { "x-user-email": currentUserEmail } });
            return res.json();
        },
        enabled: !!currentUserEmail
    });

    const { data: retainedData = [] } = useQuery({
        queryKey: ['retained', currentUserEmail],
        queryFn: async () => {
            const res = await fetch(`/api/retained`, { headers: { "x-user-email": currentUserEmail } });
            return res.json();
        },
        enabled: !!currentUserEmail
    });

    const isPro = user?.isPro || false;
    const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;
    
    const MAX_FREE_CHATS = 3;
    const [chatCount, setChatCount] = useState<number>(() => {
        const count = typeof window !== 'undefined' ? localStorage.getItem(`bilano_chat_usage_${currentUserEmail}`) : null;
        return count ? parseInt(count, 10) : 0;
    });

    const isOutOfQuota = !isPro && chatCount >= MAX_FREE_CHATS;
    const isLocked = !isPro && (isTrialExpired || isOutOfQuota);

    const [messages, setMessages] = useState<Message[]>(() => {
        const savedChat = typeof window !== 'undefined' ? localStorage.getItem(`bilano_chat_history_${currentUserEmail}`) : null;
        if (savedChat) {
            return JSON.parse(savedChat);
        } else {
            return [{ 
                id: 1, 
                sender: 'ai', 
                text: "Halo! Saya **BILANO Intelligence** 🤖\n\nSaya telah terhubung langsung dengan seluruh data aset, kas, hutang, dan laporan transaksi Anda. Ada strategi keuangan atau portofolio yang ingin kita evaluasi hari ini?", 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }];
        }
    });

    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentUserEmail) {
            localStorage.setItem(`bilano_chat_history_${currentUserEmail}`, JSON.stringify(messages));
        }
        scrollToBottom();
    }, [messages, currentUserEmail]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleConfirmClear = () => {
        const defaultMsg: Message[] = [{ 
            id: Date.now(), 
            sender: 'ai', 
            text: "Riwayat percakapan telah dibersihkan. Silakan ajukan pertanyaan atau pilih topik di bawah ini! 🚀", 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }];
        setMessages(defaultMsg);
        if (currentUserEmail) localStorage.setItem(`bilano_chat_history_${currentUserEmail}`, JSON.stringify(defaultMsg));
        setShowClearModal(false);
    };

    const handleSend = async (customPrompt?: string) => {
        const textToSend = customPrompt || inputText;
        if (isLocked) {
            window.dispatchEvent(new Event('trigger-paywall-lock'));
            return;
        }

        if (!textToSend.trim()) return;

        const userMsg: Message = {
            id: Date.now(),
            sender: 'user',
            text: textToSend,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const currentMessages = [...messages, userMsg];
        setMessages(currentMessages);
        if (!customPrompt) setInputText("");
        setIsTyping(true);

        if (!isPro) {
            const newCount = chatCount + 1;
            setChatCount(newCount);
            if (currentUserEmail) localStorage.setItem(`bilano_chat_usage_${currentUserEmail}`, newCount.toString());
        }

        trackEvent("ai_chat_used", { 
            isProUser: isPro,
            promptLength: textToSend.length 
        });

        // 🚀 KALKULASI DATA LIVE YANG SANGAT AKURAT
        const cashReal = (user?.cashBalance || 0); 
        const forexValue = Array.isArray(forexAssetsData) ? forexAssetsData.reduce((acc: number, asset: any) => {
            const curr = asset.currency;
            const rate = forexRates[curr] || DEFAULT_RATES[curr] || 15000;
            return acc + (asset.amount * rate);
        }, 0) : 0;

        const investmentReal = Array.isArray(investments) ? investments.reduce((acc, inv) => {
            const parts = (inv.symbol || "").split('|');
            const sym = parts[0] || "";
            const curr = parts[1];
            const actualCurr = curr || 'IDR';
            const rate = actualCurr === 'IDR' ? 1 : (forexRates[actualCurr] || DEFAULT_RATES[actualCurr] || 15000);
            const isSaham = inv.type === 'saham' || (!inv.type && sym.length === 4 && inv.type !== 'crypto');
            const m = (isSaham && actualCurr === 'IDR') ? 100 : 1;
            return acc + (inv.quantity * inv.avgPrice * m * rate);
        }, 0) : 0;

        const retainedReal = Array.isArray(retainedData) ? retainedData.reduce((acc: number, r: any) => {
            const curr = r.currency;
            const rate = curr === 'IDR' ? 1 : (forexRates[curr] || DEFAULT_RATES[curr] || 15000);
            return acc + (r.amount * rate);
        }, 0) : 0;

        let piutangReal = 0; let hutangReal = 0;
        if (Array.isArray(debtsData)) {
            debtsData.forEach((d: any) => {
                if (d.isPaid) return;
                const curr = (d.name || "").split('|')[1] || 'IDR';
                const rate = curr === 'IDR' ? 1 : (forexRates[curr] || DEFAULT_RATES[curr] || 15000);
                if (d.type === 'piutang') piutangReal += (d.amount * rate);
                else if (d.type === 'hutang') hutangReal += (d.amount * rate);
            });
        }

        const currentWealth = cashReal + investmentReal + forexValue + retainedReal + piutangReal - hutangReal;

        const now = new Date();
        const currentMonthIdx = now.getMonth();
        const currentYear = now.getFullYear();
        const thisMonthTx = Array.isArray(transactions) ? transactions.filter(t => new Date(t.date).getMonth() === currentMonthIdx && new Date(t.date).getFullYear() === currentYear) : [];

        const totalAmal = thisMonthTx.filter(t => t.category === 'Amal').reduce((acc, t) => acc + t.amount, 0);

        const baseIncomeTxs = thisMonthTx.filter(t => (t.type === 'income' || t.type === 'piutang_record') && !t.description?.includes('[Offset') && !t.description?.includes('[WRITE_OFF]') && !t.description?.includes('[Catat Awal]') && !t.description?.includes('[Valas Masuk') && t.category !== 'Penyesuaian Sistem' && t.category !== 'Pemutihan Hutang' && !t.category?.includes('Sistem:') && !t.category?.includes('Beli Aset') && !t.category?.includes('Jual Aset') && !(t.category || '').includes('Piutang Dibayar') && !(t.category || '').includes('Dapat Pinjaman'));
        const baseExpenseTxs = thisMonthTx.filter(t => (t.type === 'expense' || t.type === 'hutang_record') && !(t.category || '').toLowerCase().includes('invest') && !t.description?.includes('[Offset') && !t.description?.includes('[WRITE_OFF]') && !t.description?.includes('[Catat Awal]') && !t.description?.includes('[Valas Keluar') && t.category !== 'Penyesuaian Sistem' && t.category !== 'Penghapusan Piutang' && !t.category?.includes('Sistem:') && !t.category?.includes('Beli Aset') && !t.category?.includes('Jual Aset') && t.category !== 'Amal' && !(t.category || '').includes('Bayar Hutang') && !(t.category || '').includes('Beri Pinjaman'));

        const virtualPLTxs: any[] = [];
        thisMonthTx.filter(t => t.type === 'invest_sell' || t.type === 'forex_sell').forEach(t => {
            if (t.description && t.description.includes('P/L:')) {
                const plString = t.description.split('P/L:')[1];
                if (plString) {
                    const plValue = parseInt(plString.replace(/[^0-9-]/g, ''), 10);
                    if (!isNaN(plValue) && plValue !== 0) virtualPLTxs.push({ amount: Math.abs(plValue), type: plValue > 0 ? 'income' : 'expense' });
                }
            }
        });

        const monthlyIncome = baseIncomeTxs.reduce((acc, t) => acc + t.amount, 0) + virtualPLTxs.filter(v => v.type === 'income').reduce((acc, v) => acc + v.amount, 0);
        const monthlyExpense = baseExpenseTxs.reduce((acc, t) => acc + t.amount, 0) + virtualPLTxs.filter(v => v.type === 'expense').reduce((acc, v) => acc + v.amount, 0);

        // Menyiapkan Data Konteks Lengkap untuk LLM
        const activeDebts = Array.isArray(debtsData) ? debtsData.filter((d: any) => !d.isPaid) : [];
        const hutangList = activeDebts.filter((d: any) => d.type === 'hutang').map((d: any) => `- ${d.name.split('|')[0]} (${d.name.split('|')[1] || 'IDR'}): ${d.amount.toLocaleString('id-ID')} (Jatuh tempo: ${d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : 'Tidak diset'})`).join('\n');
        const piutangList = activeDebts.filter((d: any) => d.type === 'piutang').map((d: any) => `- ${d.name.split('|')[0]} (${d.name.split('|')[1] || 'IDR'}): ${d.amount.toLocaleString('id-ID')} (Jatuh tempo: ${d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : 'Tidak diset'})`).join('\n');

        const invList = Array.isArray(investments) ? investments.map((i: any) => `- ${i.symbol.split('|')[0]} (${i.symbol.split('|')[1] || 'IDR'}): ${i.quantity} lot/unit @ ${i.avgPrice}`).join('\n') : '';
        const forexList = Array.isArray(forexAssetsData) ? forexAssetsData.map((f: any) => `- ${f.currency}: ${f.amount}`).join('\n') : '';

        const financialContext = `
        [DATA KESELURUHAN (TOTAL HARTAMU SAAT INI)]
        - Kekayaan Bersih (Net Worth): Rp ${currentWealth.toLocaleString('id-ID')}
        - Kas Tunai (Uang Likuid): Rp ${cashReal.toLocaleString('id-ID')}
        - Aset Investasi: Rp ${investmentReal.toLocaleString('id-ID')}
        - Valuta Asing (Valas): Rp ${forexValue.toLocaleString('id-ID')}
        - Saldo Tertahan: Rp ${retainedReal.toLocaleString('id-ID')}
        - Total Piutang: Rp ${piutangReal.toLocaleString('id-ID')}
        - Total Hutang: Rp ${hutangReal.toLocaleString('id-ID')}

        [RINCIAN HUTANG & PIUTANG AKTIF]
        Hutang (Kewajiban kepada pihak lain):
        ${hutangList || '- Tidak ada hutang'}
        
        Piutang (Uang di pihak lain):
        ${piutangList || '- Tidak ada piutang'}

        [RINCIAN ASET & VALAS]
        Investasi Berjalan:
        ${invList || '- Tidak ada aset investasi'}
        
        Valas Berjalan:
        ${forexList || '- Tidak ada aset valas'}

        [DATA BULAN INI KHUSUS (${now.toLocaleDateString('id-ID', { month:'long', year:'numeric' })})]
        - Pemasukan Murni Bulan Ini: Rp ${monthlyIncome.toLocaleString('id-ID')}
        - Pengeluaran Murni Bulan Ini: Rp ${monthlyExpense.toLocaleString('id-ID')}
        - Pengeluaran Amal/Sedekah Bulan Ini: Rp ${totalAmal.toLocaleString('id-ID')}
        - Net Cashflow Bulan Ini: Rp ${(monthlyIncome - monthlyExpense).toLocaleString('id-ID')}
        - Sisa Target Budget Pengeluaran: Rp ${target?.monthlyBudget ? (target.monthlyBudget - monthlyExpense).toLocaleString('id-ID') : 'Tanpa batas'}
        `;

        const historyToSend = currentMessages.slice(-6).map(m => ({ role: m.sender, text: m.text }));

        try {
            const res = await fetch("/api/chat/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                body: JSON.stringify({ message: textToSend, history: historyToSend, financialContext }) 
            });

            if (!res.ok) throw new Error("Server Error");

            const data = await res.json();

            const aiMsg: Message = {
                id: Date.now() + 1,
                sender: 'ai',
                text: data.reply || "Maaf, mesin AI saya sedang sibuk sebentar.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            
            setMessages(prev => [...prev, aiMsg]);

        } catch (e: any) {
            setMessages(prev => [...prev, { 
                id: Date.now(), 
                sender: 'ai', 
                text: "⚠️ Maaf, Asisten AI sedang mengalami gangguan jaringan. Mohon coba ulangi kembali pertanyaannya.", 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }]);
            
            if (!isPro) {
                const revertCount = chatCount;
                setChatCount(revertCount);
                if (currentUserEmail) localStorage.setItem(`bilano_chat_usage_${currentUserEmail}`, revertCount.toString());
            }
        } finally {
            setIsTyping(false);
        }
    };

    if (isUserLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <img src="/BILANO-ICON-NEW.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
                <div className="flex items-center gap-2 text-blue-600 font-black text-sm bg-blue-50 px-4 py-2 rounded-full shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600"/>
                    <span>Menghubungkan ke AI Engine...</span>
                </div>
            </div>
        );
    }

    let placeholderText = "Tanya seputar strategi keuangan...";
    if (isLocked) {
        if (isTrialExpired) placeholderText = "🔒 Masa Coba Telah Berakhir";
        else if (isOutOfQuota) placeholderText = "🔒 Kuota Chat Gratis Habis";
    } else if (!isPro) {
        placeholderText = `Ketik pertanyaan (${MAX_FREE_CHATS - chatCount} kuota gratis tersisa)...`; 
    }

    return (
        <MobileLayout>
            <div className="flex flex-col h-[100dvh] -mx-5 -mt-5 bg-gradient-to-b from-[#F0F6FD] via-[#E4EFFB] to-[#D8E8F9] select-none relative overflow-hidden">
                
                {/* ========================================================================= */}
                {/* 1. TOP HEADER BANNER DENGAN TEMA DOMINAN BIRU (#1D3E72 & #2563EB) */}
                {/* ========================================================================= */}
                <header className="px-5 pt-5 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_20px_rgba(29,62,114,0.08)] flex items-center justify-between relative z-30 border-b border-blue-100">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <button 
                                className="w-10 h-10 rounded-full bg-[#1D3E72] hover:bg-[#152e55] text-white shadow-[2px_2px_0px_0px] shadow-[#0A162B] active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                                title="Kembali ke Beranda"
                            >
                                <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                        </Link>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                <span className="text-[10px] font-black text-[#1D3E72] uppercase tracking-widest">
                                    ASISTEN PINTAR 24/7
                                </span>
                            </div>
                            <h1 className="text-lg font-black text-slate-900 leading-tight">
                                Tanya AI
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isPro ? (
                            <div className="flex items-center gap-1 bg-[#1D3E72] text-white px-3 py-1.5 rounded-full shadow-xs border border-blue-400/30">
                                <Crown className="w-3.5 h-3.5 text-blue-300 fill-current" />
                                <span className="text-[10px] font-black tracking-wider uppercase">PRO UNLIMITED</span>
                            </div>
                        ) : (
                            <Link href="/paywall">
                                <div className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-[#0A162B] transition-all cursor-pointer">
                                    <Zap className="w-3.5 h-3.5 text-blue-200 fill-current" />
                                    <span className="text-[10px] font-black tracking-wider uppercase">
                                        {MAX_FREE_CHATS - chatCount} GRATIS
                                    </span>
                                </div>
                            </Link>
                        )}

                        <button 
                            onClick={() => setShowClearModal(true)}
                            className="w-10 h-10 rounded-full bg-blue-50 hover:bg-rose-50 text-blue-800 hover:text-rose-600 border border-blue-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="Bersihkan Percakapan"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* ========================================================================= */}
                {/* 2. CHAT SCROLL AREA */}
                {/* ========================================================================= */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
                    
                    {/* HERO CARD AI OVERVIEW — PERSIS SESUAI DESAIN CARD TANYA AI DI HOME */}
                    <div className="relative rounded-[28px] overflow-hidden border-2 border-blue-200/90 shadow-[6px_6px_0px_0px] shadow-[#1D3E72] bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0D244A] text-white p-5">
                        <div className="absolute right-0 bottom-0 w-36 h-36 bg-blue-400/15 rounded-tl-full pointer-events-none blur-xl" />
                        <div className="absolute -right-6 -top-6 w-28 h-28 bg-blue-300/10 rounded-full blur-lg pointer-events-none" />

                        <div className="relative z-10 flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-blue-500/25 border border-blue-300/40 text-blue-100 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    SYNCHRONIZED WITH YOUR DATA
                                </span>
                            </div>

                            <div className="flex items-center gap-3.5 mb-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center p-2 shrink-0 shadow-md">
                                    <Bot className="w-7 h-7 text-blue-200" />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-base leading-tight">
                                        Analitik Finansial Cerdas
                                    </h3>
                                    <p className="text-xs text-blue-200/80 font-semibold mt-0.5">
                                        Evaluasi kas, investasi, hutang & rasio hemat secara real-time.
                                    </p>
                                </div>
                            </div>

                            {/* Mini Snapshot Data Bar */}
                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/15">
                                <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                                    <span className="text-[9px] font-black text-blue-200 uppercase tracking-wider block">Saldo Kas Aktif</span>
                                    <span className="text-xs font-black text-white">{formatCurrency(user?.cashBalance || 0).split(',')[0]}</span>
                                </div>
                                <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                                    <span className="text-[9px] font-black text-blue-200 uppercase tracking-wider block">Status Portofolio</span>
                                    <span className="text-xs font-black text-blue-200 flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5 text-blue-300" /> Aktif Sinkron
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SUGGESTED QUICK PROMPTS CHIPS */}
                    {messages.length <= 2 && (
                        <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-[10px] font-black text-blue-900/70 uppercase tracking-widest px-1">
                                Topik Rekomendasi
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                {QUICK_PROMPTS.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(item.prompt)}
                                        className="bg-white hover:bg-blue-50/90 text-left p-3.5 rounded-2xl border-2 border-blue-200/90 shadow-[3px_3px_0px_0px] shadow-[#1D3E72] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-between group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs shrink-0">
                                                💡
                                            </div>
                                            <span className="text-xs font-black text-slate-800 group-hover:text-blue-700 transition-colors">
                                                {item.label}
                                            </span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DAFTAR BUBBLE PERCAKAPAN */}
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className={`flex gap-2.5 max-w-[88%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden border ${
                                    msg.sender === 'user' 
                                        ? 'bg-blue-600 border-blue-700 text-white' 
                                        : 'bg-[#1D3E72] border-blue-400/40 text-blue-200'
                                }`}>
                                    {msg.sender === 'user' ? (
                                        user?.profilePicture ? (
                                            <img src={user.profilePicture} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-white" />
                                        )
                                    ) : (
                                        <Bot className="w-4 h-4 text-blue-200" />
                                    )}
                                </div>
                                
                                {/* Isi Bubble Chat */}
                                <div className={`px-4 py-3.5 rounded-[24px] text-xs sm:text-sm leading-relaxed select-text shadow-sm ${
                                    msg.sender === 'user' 
                                        ? 'bg-[#1D3E72] text-white rounded-tr-none shadow-[3px_3px_0px_0px] shadow-[#0A162B] border border-blue-400/30' 
                                        : 'bg-white border-2 border-blue-200/90 text-slate-800 rounded-tl-none shadow-[4px_4px_0px_0px] shadow-[#1D3E72]'
                                }`}>
                                    {msg.sender === 'user' ? (
                                        <p className="whitespace-pre-wrap font-bold">{msg.text}</p>
                                    ) : (
                                        <div className="markdown-container">
                                            <ReactMarkdown 
                                                components={{
                                                    strong: ({node, ...props}) => <span className="font-black text-[#1D3E72] bg-blue-50 px-1 py-0.5 rounded border border-blue-200/60" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2 space-y-1 text-slate-700" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal ml-4 my-2 space-y-1 text-slate-700" {...props} />,
                                                    li: ({node, ...props}) => <li className="pl-0.5" {...props} />,
                                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-slate-800 font-medium" {...props} />
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                    <p className={`text-[9px] mt-1.5 text-right font-bold ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {msg.time}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* TYPING INDICATOR */}
                    {isTyping && (
                        <div className="flex justify-start animate-in fade-in pl-1">
                            <div className="bg-white border-2 border-blue-200 p-3 rounded-[20px] rounded-tl-none flex items-center gap-2.5 shadow-[3px_3px_0px_0px] shadow-[#1D3E72]">
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                <span className="text-xs text-blue-900 font-black italic">Menganalisis data portofolio...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* ========================================================================= */}
                {/* 3. BOTTOM FLOATING INPUT BAR DENGAN SOLID SHADOW */}
                {/* ========================================================================= */}
                <div className="p-3.5 bg-white/95 backdrop-blur-md border-t-2 border-blue-100 shadow-[0_-8px_24px_rgba(29,62,114,0.08)] z-40">
                    <div className="flex gap-2 items-center">
                        <Input 
                            value={inputText} 
                            onChange={e => setInputText(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={placeholderText}
                            disabled={isLocked || isTyping}
                            className={`flex-1 h-13 rounded-2xl px-4 text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 border-2 transition-all ${
                                isLocked 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-slate-50 border-blue-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-400/20'
                            }`}
                        />
                        <button 
                            onClick={() => handleSend()} 
                            disabled={!inputText.trim() || isLocked || isTyping} 
                            className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px] shadow-[#0A162B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px] transition-all cursor-pointer shrink-0 ${
                                isLocked || !inputText.trim() || isTyping
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                                    : 'bg-gradient-to-r from-blue-600 to-[#1D3E72] hover:from-blue-700 hover:to-[#152e55] text-white'
                            }`}
                            title="Kirim Pertanyaan"
                        >
                            <Send className="w-5 h-5 stroke-[2.5]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 🗑️ MODAL KONFIRMASI BERSIHKAN CHAT */}
            {/* ========================================================================= */}
            {showClearModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl text-center border-4 border-blue-600 relative overflow-hidden animate-in zoom-in-95">
                        <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mb-4 shadow-md">
                            <Trash2 className="w-8 h-8" />
                        </div>

                        <h3 className="text-lg font-black text-slate-900 mb-1">
                            Hapus Riwayat Chat?
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold mb-5 leading-relaxed">
                            Percakapan ini akan dibersihkan dan Anda dapat memulai topik konsultasi baru.
                        </p>

                        <div className="space-y-2">
                            <Button 
                                onClick={handleConfirmClear}
                                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px] shadow-[#0A162B] active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                            >
                                Ya, Bersihkan Chat
                            </Button>
                            <button 
                                onClick={() => setShowClearModal(false)}
                                className="w-full h-10 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MobileLayout>
    );
}