import { useState, useEffect, useRef } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { Send, Bot, User, Loader2, Trash2, Sparkles } from "lucide-react";
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
    // 🚀 TETAP DIJAGA: Seluruh hooks data finansial asli
    const { data: user, isLoading: isUserLoading } = useUser();
    const { data: transactions } = useTransactions();
    const { data: forexAssets } = useForexAssets();
    const { data: investments } = useInvestments();
    const { data: target } = useTarget();
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    
    const isPro = user?.isPro || false;
    const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;
    
    const MAX_FREE_CHATS = 3;

    // 🚀 TETAP DIJAGA: Logika asli penentuan chatCount
    const [chatCount, setChatCount] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const count = localStorage.getItem(`bilano_chat_count_${currentUserEmail}`);
            return count ? parseInt(count) : 0;
        }
        return 0;
    });

    // 🚀 FITUR BARU: Riwayat Chat Permanen (Dimuat dari LocalStorage)
    const [messages, setMessages] = useState<Message[]>(() => {
        if (typeof window !== 'undefined' && currentUserEmail) {
            const saved = localStorage.getItem(`bilano_chat_history_${currentUserEmail}`);
            if (saved) return JSON.parse(saved);
        }
        return [{
            id: Date.now(),
            sender: 'ai',
            text: `Halo Bos **${user?.firstName || 'Adrien'}**! Saya Varen, asisten cerdas Anda. Ada strategi keuangan yang ingin kita bahas hari ini?`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];
    });

    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    // 🚀 FITUR BARU: Simpan riwayat setiap kali ada pesan baru
    useEffect(() => {
        if (currentUserEmail && messages.length > 0) {
            localStorage.setItem(`bilano_chat_history_${currentUserEmail}`, JSON.stringify(messages));
        }
        scrollToBottom();
    }, [messages, currentUserEmail]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // 🚀 FITUR BARU: Hapus Riwayat Manual (Opsional)
    const handleClearChat = () => {
        if (confirm("Hapus seluruh obrolan dengan Varen?")) {
            const resetMsg = [{
                id: Date.now(),
                sender: 'ai',
                text: "Riwayat telah dibersihkan. Mari mulai lembaran keuangan baru, Bos!",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }];
            setMessages(resetMsg);
            localStorage.setItem(`bilano_chat_history_${currentUserEmail}`, JSON.stringify(resetMsg));
        }
    };

    // 🚀 FITUR BARU: handleSend yang mengirim Context/History agar nyambung
    const handleSend = async () => {
        if (!inputText.trim() || isTyping) return;

        if (!isPro && chatCount >= MAX_FREE_CHATS) {
            toast({
                title: "Limit Chat Habis",
                description: "Upgrade ke PRO untuk akses Mentor Intelligence tanpa batas.",
                variant: "destructive"
            });
            return;
        }

        const newUserMsg: Message = { 
            id: Date.now(), 
            sender: 'user', 
            text: inputText, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };

        const currentHistory = [...messages]; 
        setMessages(prev => [...prev, newUserMsg]);
        setInputText("");
        setIsTyping(true);

        try {
            const res = await fetch("/api/chat/ask", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-user-email": currentUserEmail 
                },
                // 🚀 MENGIRIM HISTORY agar AI bisa nyambung (Contextual)
                body: JSON.stringify({ 
                    message: newUserMsg.text,
                    history: currentHistory.map(m => ({ sender: m.sender, text: m.text }))
                })
            });

            const data = await res.json();
            const newAiMsg: Message = { 
                id: Date.now() + 1, 
                sender: 'ai', 
                text: data.reply || "Maaf Bos, sinyal saya agak terganggu. Bisa diulang?", 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            };
            
            setMessages(prev => [...prev, newAiMsg]);
            
            if (!isPro) {
                const newCount = chatCount + 1;
                setChatCount(newCount);
                localStorage.setItem(`bilano_chat_count_${currentUserEmail}`, newCount.toString());
            }

        } catch (error) {
            toast({ title: "Error", description: "Gagal terhubung ke jaringan Mentor AI.", variant: "destructive" });
        } finally {
            setIsTyping(false);
        }
    };

    const isLocked = !isPro && isTrialExpired;
    const placeholderText = isLocked ? "Akses Terkunci (Trial Habis)" : "Tanya Mentor Varen...";

    return (
        <MobileLayout title="Mentor Intelligence" showBack>
            <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50">
                
                {/* Header Chat */}
                <div className="px-4 py-3 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800 tracking-tight uppercase">Varen AI</p>
                            <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> ONLINE
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
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

                {/* Chat Display */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`max-w-[85%] flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.sender === 'user' ? 'bg-slate-800' : 'bg-white border border-slate-100'}`}>
                                    {msg.sender === 'user' ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-indigo-600" />}
                                </div>
                                <div className={`p-4 rounded-[24px] text-sm shadow-sm ${
                                    msg.sender === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                }`}>
                                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-inherit">
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                    <p className={`text-[8px] mt-2 font-bold opacity-40 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                        {msg.time}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mentor sedang menganalisis...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Section */}
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
                            {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                    </div>
                    {!isPro && (
                        <p className="text-center text-[10px] text-slate-400 mt-2 font-bold">
                            <Sparkles className="w-3 h-3 inline mr-1 mb-0.5" /> 
                            Gunakan BILANO PRO untuk fitur Mentor tanpa batas.
                        </p>
                    )}
                </div>

            </div>
        </MobileLayout>
    );
}