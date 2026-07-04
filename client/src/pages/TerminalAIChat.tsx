import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minus, Send, Bot, User, Orbit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  sender: 'user' | 'model';
  text: string;
}

interface TerminalAIChatProps {
  financialContext: string;
}

export default function TerminalAIChat({ financialContext }: TerminalAIChatProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- LOGIKA DRAG & DROP ---
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Reset posisi saat di minimize
  useEffect(() => {
    if (isMinimized) setPosition({ x: 0, y: 0 });
  }, [isMinimized]);

  // Auto scroll ke bawah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userText = message;
    setMessage('');
    setHistory(prev => [...prev, { sender: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': localStorage.getItem('bilano_email') || 'guest'
        },
        body: JSON.stringify({
          message: userText,
          history: history,
          financialContext: financialContext
        })
      });

      const data = await res.json();
      if (data.reply) {
        setHistory(prev => [...prev, { sender: 'model', text: data.reply }]);
      } else {
        toast({ title: 'AI Error', description: 'Gagal mendapat respon.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Jaringan Error', description: 'Koneksi ke otak AI terputus.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-6 right-6 z-[9999] bg-[#00FF41] text-black rounded-full p-4 cursor-pointer shadow-[0_0_20px_rgba(0,255,65,0.4)] hover:scale-105 transition-transform"
        onClick={() => { setIsMinimized(false); setIsOpen(true); }}
      >
        <Bot className="w-6 h-6" />
      </div>
    );
  }

  return (
    <div 
      className="fixed z-[9999] w-80 md:w-96 bg-[#050505] border border-[#27272A] shadow-2xl overflow-hidden flex flex-col font-sans"
      style={{
        bottom: position.y === 0 ? '24px' : 'auto',
        right: position.x === 0 ? '24px' : 'auto',
        transform: (position.x !== 0 || position.y !== 0) ? `translate(${position.x}px, ${position.y}px)` : 'none',
        height: '500px',
        maxHeight: '80vh'
      }}
    >
      {/* HEADER - Area untuk Dragging */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="bg-[#111] p-3 border-b border-[#27272A] flex justify-between items-center cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#00E5FF]" />
          <div>
            <h3 className="text-white text-xs font-black uppercase tracking-widest">BILANO Expert AI</h3>
            <p className="text-[8px] text-[#00FF41] animate-pulse uppercase tracking-[0.2em]">Context-Aware Mode</p>
          </div>
        </div>
        <button onClick={() => setIsMinimized(true)} className="text-[#A1A1AA] hover:text-white transition-colors p-1">
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* AREA CHAT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#000]">
        {history.length === 0 && (
          <div className="text-center text-[#555] text-[10px] mt-10 uppercase tracking-widest font-mono">
            "Saya terhubung dengan portofolio, layar terminal, dan berita Anda. Apa yang ingin dianalisis?"
          </div>
        )}
        {history.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-6 h-6 rounded-sm flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-[#222]' : 'bg-[#00E5FF]/10 border border-[#00E5FF]/30'}`}>
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-[#00E5FF]" />}
            </div>
            <div className={`p-3 text-xs leading-relaxed max-w-[75%] ${msg.sender === 'user' ? 'bg-[#111] text-white rounded-l-lg rounded-br-lg border border-[#333]' : 'bg-transparent text-[#D4D4D8]'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-6 h-6 rounded-sm bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center shrink-0">
              <Orbit className="w-3.5 h-3.5 text-[#00E5FF] animate-spin" />
            </div>
            <p className="text-[10px] text-[#A1A1AA] font-mono animate-pulse uppercase tracking-widest">Menganalisis matriks...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <form onSubmit={handleSend} className="p-3 bg-[#050505] border-t border-[#27272A] flex gap-2">
        <input 
          type="text" 
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ketik instruksi atau pertanyaan..."
          className="flex-1 bg-[#111] border border-[#333] text-white text-xs px-3 py-2 outline-none focus:border-[#00E5FF] transition-colors rounded-sm"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !message.trim()}
          className="bg-[#00E5FF] hover:bg-[#00B3CC] disabled:bg-[#333] text-black p-2 rounded-sm transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}