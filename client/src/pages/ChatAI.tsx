import { useState, useEffect, useRef } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { 
    useUser, useTransactions, useForexAssets, 
    useInvestments, useTarget 
} from "@/hooks/use-finance"; 

interface Message {
    id: number;
    sender: 'user' | 'ai';
    text: string;
    time: string;
}

export default function ChatAI() {
    const { data: user, isLoading: isUserLoading } = useUser();
    const { data: transactions } = useTransactions();
    const { data: forexAssets } = useForexAssets();
    const { data: investments } = useInvestments();
    const { data: target } = useTarget();

    const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    
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
                text: "Halo Bos! 👋\nSaya BILANO Intelligence. Mau bahas strategi keuangan, analisa portofolio, atau butuh panduan aplikasi hari ini?", 
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
            }];
        }
    });

    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
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

    const clearHistory = () => {
        if (confirm("Hapus semua riwayat chat?")) {
            const defaultMsg: Message[] = [{ 
                id: Date.now(), 
                sender: 'ai', 
                text: "Chat telah dibersihkan. Silakan mulai topik baru! 🚀", 
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
            }];
            setMessages(defaultMsg);
            if (currentUserEmail) localStorage.setItem(`bilano_chat_history_${currentUserEmail}`, JSON.stringify(defaultMsg));
        }
    };

    const handleSend = async () => {
        if (isLocked) {
            window.dispatchEvent(new Event('trigger-paywall-lock'));
            return;
        }

        if (!inputText.trim()) return;

        const userMsg: Message = {
            id: Date.now(),
            sender: 'user',
            text: inputText,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText("");
        setIsTyping(true);

        if (!isPro) {
            const newCount = chatCount + 1;
            setChatCount(newCount);
            if (currentUserEmail) localStorage.setItem(`bilano_chat_usage_${currentUserEmail}`, newCount.toString());
        }

        const totalCash = user?.cashBalance || 0;
        const txSummary = transactions?.slice(0, 10).map(t => `${new Date(t.date).toISOString().split('T')[0]} - ${t.type} - ${t.category}: Rp${t.amount}`).join(" | ") || "Belum ada transaksi";
        const forexSummary = forexAssets?.map(f => `${f.amount} ${f.currency}`).join(", ") || "Tidak ada valas";
        const investSummary = investments?.map(i => `${i.quantity} ${i.symbol}`).join(", ") || "Tidak ada investasi";
        const targetSummary = target ? `Target: Rp${target.targetAmount}, Limit Keluar: Rp${target.monthlyBudget} (${target.budgetType})` : "Tidak ada target";

        // 🚀 FIX: DOKTRIN LOGIKA AKUNTANSI DIMASUKKAN!
        const bilanoKnowledgeBase = `
        [PANDUAN LOGIKA KEUANGAN BILANO - WAJIB PATUH 1000%]
        1. KAS vs KEKAYAAN BERSIH: 
           - "Saldo Kas" = Uang tunai riil (IDR) yang likuid.
           - "Kekayaan Bersih" = Kas + Valas + Investasi + Piutang - Hutang.
        2. LOGIKA PIUTANG (Write-off): 
           - Piutang itu BUKAN Kas. 
           - Jika pengguna mengikhlaskan (write-off) piutang, Saldo Kas TETAP (TIDAK BERKURANG). Yang berkurang adalah Kekayaan Bersih (karena dicatat sebagai kerugian/Beban Penghapusan Piutang).
        3. LOGIKA VALAS/INVESTASI:
           - Naik turunnya harga aset Valas/Saham di pasar TIDAK mengubah Kas, hanya mengubah Kekayaan Bersih. Kas hanya berubah jika aset dijual (Kas naik) atau dibeli (Kas turun).
        `;

        const systemContext = `[ATURAN MUTLAK SISTEM AI]
        Kamu adalah BILANO Intelligence, konsultan keuangan elit.
        
        PERATURAN SIKAP:
        1. FOKUS 100% pada analisis keuangan, strategi finansial, evaluasi kelayakan belanja, dan kesehatan dompet user.
        2. DILARANG KERAS MENGGURU MENGENAI CARA PAKAI APLIKASI KECUALI DITANYA SECARA EKSPLISIT.

        ${bilanoKnowledgeBase}

        DATA RINGKAS USER: 
        - Kas Tunai IDR: Rp ${totalCash.toLocaleString('id-ID')}
        - Valas: ${forexSummary}
        - Investasi: ${investSummary}
        - Target: ${targetSummary}
        - History Tx Terakhir: ${txSummary}

        Pertanyaan User: ${userMsg.text}`;

        try {
            const res = await fetch("/api/chat/ask", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-user-email": currentUserEmail
                },
                body: JSON.stringify({ message: systemContext }) 
            });

            if (!res.ok) throw new Error("Server Error");

            const data = await res.json();

            const aiMsg: Message = {
                id: Date.now() + 1,
                sender: 'ai',
                text: data.reply || "Maaf, mesin AI saya sedang sibuk sebentar.",
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            };
            
            setMessages(prev => [...prev, aiMsg]);

        } catch (e: any) {
            setMessages(prev => [...prev, { 
                id: Date.now(), 
                sender: 'ai', 
                text: "⚠️ Maaf Bos, Asisten AI sedang sangat sibuk atau mengalami gangguan koneksi. Mohon coba lagi dalam beberapa saat ya! 🙏", 
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
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
                <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
                <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin"/>
                    <span>Memuat Data...</span>
                </div>
            </div>
        );
    }

    let placeholderText = "Tanya AI Assistant...";
    if (isLocked) {
        if (isTrialExpired) placeholderText = "🔒 Masa Coba Habis";
        else if (isOutOfQuota) placeholderText = "🔒 Kuota Chat Habis";
    } else if (!isPro) {
        placeholderText = `Ketik pesan...`; 
    }

    return (
        <MobileLayout title="BILANO Intelligence" showBack>
            <div className="absolute top-4 right-4 z-50">
                <button 
                    onClick={clearHistory}
                    className="p-2 bg-white/80 rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors"
                    title="Hapus Riwayat Chat"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="flex flex-col h-[calc(100dvh-75px)] -mx-4 -mb-4 bg-slate-50 relative">
                
                <div className="flex-1 overflow-y-auto space-y-4 p-4 pb-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden ${msg.sender === 'user' ? 'bg-white border border-slate-200' : 'bg-gradient-to-br from-blue-900 via-indigo-800 to-blue-950'}`}>
                                    {msg.sender === 'user' ? (
                                        user?.profilePicture ? (
                                            <img src={user.profilePicture} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5 text-slate-600"/>
                                        )
                                    ) : (
                                        <Bot className="w-5 h-5 text-white"/>
                                    )}
                                </div>
                                
                                <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm leading-relaxed select-text cursor-text ${
                                    msg.sender === 'user' 
                                    ? 'bg-slate-800 text-white rounded-tr-none' 
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                }`}>
                                    {msg.sender === 'user' ? (
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    ) : (
                                        <div className="markdown-container">
                                            <ReactMarkdown 
                                                components={{
                                                    strong: ({node, ...props}) => <span className="font-bold text-indigo-700" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2 space-y-1" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal ml-4 my-2 space-y-1" {...props} />,
                                                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                    <p className={`text-[9px] mt-1.5 text-right opacity-70`}>{msg.time}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div className="flex justify-start animate-in fade-in pl-1">
                            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
                                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin"/>
                                <span className="text-xs text-slate-400 italic">Sedang menganalisa...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className={`p-3 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 pb-4 md:pb-3 ${isLocked ? 'bg-slate-50' : ''}`}>
                    <div className="flex gap-2">
                        <Input 
                            value={inputText} 
                            onChange={e => setInputText(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={placeholderText}
                            disabled={isLocked || isTyping}
                            className={`flex-1 transition-all h-12 rounded-full px-4 ${isLocked ? 'bg-slate-200 border-slate-300 text-slate-500 font-bold opacity-70 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500'}`}
                        />
                        <Button 
                            onClick={handleSend} 
                            disabled={!inputText || isLocked || isTyping} 
                            className={`w-12 h-12 px-0 rounded-full shadow-md transition-transform active:scale-95 ${isLocked ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            <Send className="w-5 h-5"/>
                        </Button>
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
}