import { useState, useEffect, useRef } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { Send, Bot, User, Sparkles, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useUser } from "@/hooks/use-finance"; 

interface Message {
    id: number;
    sender: 'user' | 'ai';
    text: string;
    time: string;
}

export default function ChatAI() {
    const { data: user, isLoading } = useUser();

    const [messages, setMessages] = useState<Message[]>(() => {
        const savedChat = localStorage.getItem("bilano_chat_history");
        if (savedChat) {
            return JSON.parse(savedChat);
        } else {
            return [{ 
                id: 1, 
                sender: 'ai', 
                text: "Halo Bos! 👋\nSaya BILANO. Riwayat chat ini akan tersimpan otomatis. Mau bahas apa hari ini?", 
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
            }];
        }
    });

    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem("bilano_chat_history", JSON.stringify(messages));
        scrollToBottom();
    }, [messages]);

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
            localStorage.setItem("bilano_chat_history", JSON.stringify(defaultMsg));
        }
    };

    const handleSend = async () => {
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

        try {
            const res = await fetch("/api/chat/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg.text })
            });

            if (!res.ok) throw new Error("Server Error");

            const data = await res.json();

            const aiMsg: Message = {
                id: Date.now() + 1,
                sender: 'ai',
                text: data.reply || "Maaf, saya mengantuk sebentar.",
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            };
            
            setMessages(prev => [...prev, aiMsg]);

        } catch (e: any) {
            setMessages(prev => [...prev, { 
                id: Date.now(), 
                sender: 'ai', 
                text: "⚠️ Koneksi ke otak AI terputus. Pastikan internet Anda lancar dan API Key sudah disetel di Vercel.", 
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    // === LOADING SCREEN KUSTOM BILANO ===
    if (isLoading) {
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

            <div className="flex flex-col h-[calc(100vh-140px)] mt-2 bg-slate-50">
                <div className="flex-1 overflow-y-auto space-y-4 p-4 pb-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden ${msg.sender === 'user' ? 'bg-white border border-slate-200' : 'bg-gradient-to-br from-indigo-600 to-purple-700'}`}>
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
                                
                                {/* FIX COPY TEXT: Ditambahkan class "select-text" dan "cursor-text" agar teks bisa ditahan dan disalin */}
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
                                <span className="text-xs text-slate-400 italic">Sedang mengetik...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-slate-100 shadow-lg z-10">
                    <div className="flex gap-2">
                        <Input 
                            value={inputText} 
                            onChange={e => setInputText(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Tanya..." 
                            className="flex-1 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all h-11"
                        />
                        <Button onClick={handleSend} disabled={!inputText || isTyping} className="bg-indigo-600 hover:bg-indigo-700 w-12 h-11 px-0 shadow-md transition-transform active:scale-95">
                            <Send className="w-5 h-5"/>
                        </Button>
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
}