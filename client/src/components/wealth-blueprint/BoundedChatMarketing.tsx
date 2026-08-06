import React, { useState, useRef, useEffect } from "react";
import { Button, Input } from "@/components/UIComponents";
import { Send, Bot, ArrowRight, Loader2, Rocket } from "lucide-react";

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

interface BoundedChatMarketingProps {
  ideaTitle: string;
  chatHistory: ChatMessage[];
  isProcessing: boolean;
  onSendMessage: (message: string) => void;
  onCompleteDiscussion: () => void;
}

export default function BoundedChatMarketing({
  ideaTitle,
  chatHistory,
  isProcessing,
  onSendMessage,
  onCompleteDiscussion
}: BoundedChatMarketingProps) {
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isProcessing]);

  const handleSend = () => {
    if (!inputValue.trim() || isProcessing) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in slide-in-from-bottom-8 duration-500">
      {/* 🟦 HEADER DISKUSI */}
      <div className="bg-slate-900 text-white p-5 rounded-[28px] shadow-lg flex justify-between items-center border border-slate-800">
        <div className="flex-1 pr-2 overflow-hidden">
          <h3 className="font-black text-base text-amber-400 flex items-center gap-2">
            <Rocket className="w-4 h-4" /> Strategi Pemasaran
          </h3>
          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
            {ideaTitle}
          </p>
        </div>
        <Button 
          onClick={onCompleteDiscussion}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] px-4 h-10 rounded-full shadow-md shadow-emerald-900/20 shrink-0"
        >
          BUKA LAPAK <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* ⬜ AREA CHAT */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-4 min-h-[380px] flex flex-col justify-between shadow-sm">
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
          {chatHistory.length === 0 && !isProcessing && (
             <div className="text-center text-slate-400 text-xs py-10 font-medium px-4">
               Mentor AI siap mendiskusikan target pasar dan cara promosi yang paling cocok untuk Anda.
             </div>
          )}

          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
              )}
              <div 
                className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed font-medium ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-100' 
                    : 'bg-slate-50 text-slate-700 rounded-bl-none border border-slate-100'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Indikator AI sedang mengetik */}
          {isProcessing && (
            <div className="flex justify-start">
               <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mr-2 shrink-0 self-end mb-1">
                  <Bot className="w-4 h-4 text-indigo-600 animate-pulse" />
                </div>
              <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-none text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Mentor AI sedang menganalisis...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 🟩 INPUT CHAT */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
          <Input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tanya cara promosi atau negosiasi..."
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            className="bg-slate-50 text-xs border-transparent focus:border-indigo-200 focus:bg-white h-12 rounded-xl flex-1 shadow-inner transition-colors"
          />
          <Button 
            onClick={handleSend} 
            disabled={isProcessing || !inputValue.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 w-12 p-0 rounded-xl shrink-0 shadow-md shadow-indigo-200 transition-transform active:scale-95"
          >
            <Send className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}