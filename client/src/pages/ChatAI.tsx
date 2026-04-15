import { useState, useEffect, useRef } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { Send, Bot, User, Loader2, Trash2, Sparkles, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { 
    useUser, useTransactions, useForexAssets, 
    useInvestments, useTarget 
} from "@/hooks/use-finance"; 
import { useToast } from "@/hooks/use-toast";

interface Message {
    id: number;
    sender: 'user' | 'ai';
    text: string;
    time: string;
}

export default function ChatAI() {
    const { data: user, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    
    const isPro = user?.isPro || false;
    const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;
    
    const MAX_FREE_CHATS = 3;
    const [chatCount, setChatCount] = useState<number>(0);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    // 🚀 1. LOGIKA RIWAYAT PERMANEN (Load & Save ke LocalStorage per User)
    useEffect(() => {
        if (currentUserEmail) {
            const savedHistory = localStorage.getItem(`bilano_chat_history_${currentUserEmail}`);
            if (savedHistory) {
                setMessages(JSON.parse(savedHistory));
            } else {
                // Pesan sambutan jika riwayat kosong
                setMessages([{
                    id: Date.now(),
                    sender: 'ai',
                    text: `Halo Bos **${user?.firstName || 'Adrien'}**! Saya Varen, mentor finansial pribadi Anda. Ada yang bisa saya bantu analisis hari ini?`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            }

            const count = localStorage.getItem(`bilano_chat_count_${currentUserEmail}`);
            if (count) setChatCount(parseInt(count));
        }
    }, [currentUserEmail, user?.firstName]);

    useEffect(() => {
        if (currentUserEmail && messages.length > 0) {
            localStorage.setItem(`bilano_chat_history_${currentUserEmail}`, JSON.stringify(messages));
        }
        scrollToBottom();
    }, [messages, currentUserEmail]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleClearChat = () => {
        if (confirm("Hapus seluruh riwayat obrolan?")) {
            setMessages([]);
            localStorage.removeItem(`bilano_chat_history_${currentUserEmail}`);
            toast({ title: "Bersih!", description: "Riwayat obrolan telah dihapus." });
        }
    };

    // 🚀 2. LOGIKA KIRIM PESAN DENGAN MEMORI (HISTORY)
    const handleSend = async () => {
        if (!inputText.trim() || isTyping) return;

        // Cek limit untuk pengguna gratis
        if (!isPro && chatCount >= MAX_FREE_CHATS) {
            toast({
                title: "Limit Chat Habis",
                description: "Upgrade ke PRO untuk chat tanpa batas dengan Mentor AI.",
                variant: "destructive"
            });
            return;
        }

        const userMsg: Message = { 
            id: Date.now(), 
            sender: 'user', 
            text: inputText, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };

        const currentHistory = [...messages];
        setMessages(prev => [...prev, userMsg]);
        setInputText("");
        setIsTyping(true);

        try {
            const res = await fetch("/api/chat/ask", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-user-email": currentUserEmail 
                },
                // Mengirim pesan sekarang + riwayat sebelumnya agar AI nyambung
                body: JSON.stringify({ 
                    message: userMsg.text,
                    history: currentHistory.map(m => ({ sender: m.sender, text: m.text }))
                })
            });

            const data = await res.json();
            
            const aiMsg: Message = { 
                id: Date.now() + 1, 
                sender: 'ai', 
                text: data.reply || "Maaf Bos, saya sedang kehilangan fokus. Bisa ulangi?", 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            };

            setMessages(prev => [...prev, aiMsg]);

            if (!isPro) {
                const newCount = chatCount + 1;
                setChatCount(newCount);
                localStorage.setItem(`bilano_chat_count_${currentUserEmail}`, newCount.toString());
            }
        } catch (error) {
            toast({ title: "Error", description: "Gagal terhubung ke pusat otak AI.", variant: "destructive" });
        } finally {
            setIsTyping(false);
        }
    };

    const isLocked = !isPro && isTrialExpired;
    const placeholderText = isLocked ? "Akses Terkunci (Trial Habis)" : "Tanya Mentor Varen...";

    return (
        <MobileLayout title="Mentor Intelligence" showBack>
            <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50">
                
                {/* Header Info */}
                <div className="px-4 py-3 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800 tracking-tight">VAREN AI</p>
                            <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> ONLINE
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isPro && (
                            <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                {MAX_FREE_CHATS - chatCount} Sisa Chat
                            </div>
                        )}
                        <button onClick={handleClearChat} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`max-w-[85%] flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.sender === 'user' ? 'bg-slate-800' : 'bg-white border border-slate-100'}`}>
                                    {msg.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-600" />}
                                </div>
                                <div className={`relative p-4 rounded-[24px] text-sm shadow-sm ${
                                    msg.sender === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                }`}>
                                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-inherit">
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                    <p className={`text-[9px] mt-2 font-medium opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                        {msg.time}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Varen sedang berpikir...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className={`p-4 bg-white border-t border-slate-100 pb-8 md:pb-4 ${isLocked ? 'bg-slate-50' : ''}`}>
                    <div className="relative flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <Input 
                            value={inputText} 
                            onChange={e => setInputText(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={placeholderText}
                            disabled={isLocked || isTyping}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium h-12 px-4 shadow-none"
                        />
                        <Button 
                            onClick={handleSend} 
                            disabled={!inputText.trim() || isLocked || isTyping} 
                            className={`w-12 h-12 p-0 rounded-full shadow-lg transition-transform active:scale-90 ${isLocked ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                    </div>
                    {!isPro && (
                        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
                            <Sparkles className="w-3 h-3 inline mr-1 mb-0.5" /> 
                            Gunakan BILANO PRO untuk fitur Analisis Deep-Wealth tanpa batas.
                        </p>
                    )}
                </div>

            </div>
        </MobileLayout>
    );
}