
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, CheckCircle2, ArrowRight, RefreshCw, ChevronLeft } from 'lucide-react';
import { EvaluationFormData } from '../types';
import { LOCATIONS, ORGANIZERS, DURATIONS, EDUCATION_LEVELS, AGE_RANGES, PREMADE_COMMENTS, PREMADE_SUGGESTIONS } from '../constants';
import { submitEvaluation } from '../services/api';

interface ChatEvaluationProps {
  onBack: () => void;
}

type Message = {
  id: string;
  sender: 'bot' | 'user';
  text: React.ReactNode;
  isTyping?: boolean;
};

type QuestionStep = {
  field: keyof EvaluationFormData;
  question: string;
  type: 'text' | 'options' | 'date' | 'rating' | 'textarea';
  options?: string[];
  uppercase?: boolean;
};

const STEPS: QuestionStep[] = [
  { field: 'namaProgram', question: "Assalamualaikum & Hai! Saya AI JAIS. Jom mulakan. Boleh berikan NAMA PROGRAM yang anda hadiri? (Ringkas & Huruf Besar)", type: 'text', uppercase: true },
  { field: 'bahagianProgram', question: "Di BAHAGIAN mana program ini diadakan?", type: 'options', options: LOCATIONS },
  { field: 'tempatProgram', question: "Sila nyatakan TEMPAT spesifik program (Contoh: Dewan Hikmah).", type: 'text', uppercase: true },
  { field: 'tarikhMula', question: "Bilakah TARIKH MULA program ini?", type: 'date' },
  { field: 'tempohProgram', question: "Berapa lama TEMPOH program berjalan?", type: 'options', options: DURATIONS },
  { field: 'penganjurUtama', question: "Siapakah PENGANJUR UTAMA program ini?", type: 'options', options: ORGANIZERS },
  { field: 'jantina', question: "Terima kasih. Sedikit info diri. JANTINA anda?", type: 'options', options: ['LELAKI', 'PEREMPUAN'] },
  { field: 'umur', question: "Kategori UMUR anda?", type: 'options', options: AGE_RANGES },
  { field: 'tarafPendidikan', question: "TARAF PENDIDIKAN tertinggi?", type: 'options', options: EDUCATION_LEVELS },
  { field: 'ratingTarikhMasa', question: "Sekarang sesi penilaian (Skala 1-5). Bagaimana dengan LOGISTIK (Tarikh/Masa/Tempat)?", type: 'rating' },
  { field: 'ratingPengisian', question: "Bagaimana pula dengan PENGISIAN PROGRAM?", type: 'rating' },
  { field: 'ratingJamuan', question: "Penilaian untuk JAMUAN (Jika ada)?", type: 'rating' },
  { field: 'ratingFasilitator', question: "Prestasi FASILITATOR/PEMBENTANG (Jika ada)?", type: 'rating' },
  { field: 'ratingUrusetia', question: "Bagaimana layanan KEURUSETIAAN?", type: 'rating' },
  { field: 'ratingKeseluruhan', question: "Secara KESELURUHAN, berapa bintang anda beri?", type: 'rating' },
  { field: 'komenProgram', question: "Hampir siap! Ada sebarang KOMEN tambahan?", type: 'textarea', options: PREMADE_COMMENTS },
  { field: 'cadanganProgram', question: "Terakhir, ada CADANGAN penambahbaikan?", type: 'textarea', options: PREMADE_SUGGESTIONS },
];

export const ChatEvaluation: React.FC<ChatEvaluationProps> = ({ onBack }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: STEPS[0].question }
  ]);
  const [formData, setFormData] = useState<Partial<EvaluationFormData>>({});
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentStep = STEPS[currentStepIndex];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (sender: 'bot' | 'user', text: React.ReactNode) => {
    const newMsg: Message = { id: Date.now().toString(), sender, text };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleNextStep = async (value: any, displayValue?: string) => {
    // 1. Add User Response
    addMessage('user', displayValue || value.toString());

    // 2. Update Data
    const updatedData = { ...formData, [currentStep.field]: value };
    setFormData(updatedData);

    // 3. Move to next or Submit
    if (currentStepIndex < STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      // Simulate Typing
      setMessages(prev => [...prev, { id: 'typing', sender: 'bot', text: '...', isTyping: true }]);
      
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        addMessage('bot', STEPS[nextIndex].question);
      }, 600);
    } else {
      // Submit
      setIsSubmitting(true);
      setMessages(prev => [...prev, { id: 'typing', sender: 'bot', text: 'Sedang menghantar...', isTyping: true }]);
      
      try {
        await submitEvaluation(updatedData as EvaluationFormData);
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        addMessage('bot', "Terima kasih! Maklum balas anda telah berjaya direkodkan.");
        setIsCompleted(true);
      } catch (error) {
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        addMessage('bot', "Maaf, ada ralat rangkaian. Sila cuba lagi.");
        setIsSubmitting(false);
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    // We already force uppercase on change, but this acts as a final safeguard
    const finalVal = inputText.toUpperCase(); 
    handleNextStep(finalVal);
    setInputText('');
  };

  // --- RENDER HELPERS ---

  const renderInputArea = () => {
    if (isCompleted) {
      return (
        <div className="p-4 bg-white border-t border-gray-100 flex justify-center">
          <button onClick={onBack} className="bg-dark text-lime-400 px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform">
            <RefreshCw size={18} /> Isi Semula / Kembali
          </button>
        </div>
      );
    }

    if (isSubmitting) return null;

    switch (currentStep.type) {
      case 'options':
        return (
          <div className="p-3 bg-gray-50 border-t border-gray-100 overflow-x-auto whitespace-nowrap space-x-2 no-scrollbar">
            {currentStep.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => handleNextStep(opt)}
                className="inline-block px-4 py-3 bg-white border border-gray-200 rounded-2xl text-dark text-sm font-bold shadow-sm hover:border-lime-400 hover:bg-lime-50 transition-all active:scale-95"
              >
                {opt}
              </button>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className="p-4 bg-white border-t border-gray-100 flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => handleNextStep(num)}
                className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-xl font-bold text-dark hover:bg-lime-400 hover:border-lime-400 hover:text-black transition-all shadow-sm active:scale-90"
              >
                {num}
              </button>
            ))}
          </div>
        );

      case 'date':
        return (
           <form onSubmit={(e) => { e.preventDefault(); if(inputText) handleNextStep(inputText); }} className="p-4 bg-white border-t border-gray-100 flex gap-2">
              <input 
                type="date" 
                required
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark font-medium focus:outline-none focus:border-lime-400"
                onChange={(e) => setInputText(e.target.value)}
              />
              <button type="submit" className="bg-dark text-lime-400 p-3 rounded-xl disabled:opacity-50" disabled={!inputText}>
                <Send size={20} />
              </button>
           </form>
        );

      case 'textarea':
        return (
          <div className="bg-white border-t border-gray-100">
             {/* Quick Chips */}
             <div className="flex overflow-x-auto p-2 gap-2 no-scrollbar bg-gray-50/50">
                {currentStep.options?.map((opt) => (
                   <button 
                     key={opt} 
                     onClick={() => handleNextStep(opt)}
                     className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:text-dark hover:border-lime-400 whitespace-nowrap"
                   >
                     {opt}
                   </button>
                ))}
                <button onClick={() => handleNextStep('TIADA')} className="px-3 py-1.5 bg-gray-200 rounded-lg text-xs font-bold text-gray-600">TIADA</button>
             </div>
             <form onSubmit={handleTextSubmit} className="p-2 flex gap-2 items-end">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.toUpperCase())} // Force Upper
                  placeholder="TAIP JAWAPAN ANDA..."
                  className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-3 text-dark focus:ring-2 focus:ring-lime-400/50 resize-none uppercase placeholder:normal-case"
                />
                <button type="submit" className="bg-dark text-lime-400 p-3 rounded-xl mb-1 shadow-lg hover:bg-black transition-transform active:scale-95">
                  <Send size={20} />
                </button>
             </form>
          </div>
        );

      default: // Text
        return (
          <form onSubmit={handleTextSubmit} className="p-4 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value.toUpperCase())} // Force Upper
              placeholder="TAIP JAWAPAN..."
              className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-3 text-dark font-medium focus:ring-2 focus:ring-lime-400/50 uppercase placeholder:normal-case"
              autoFocus
            />
            <button type="submit" className="bg-dark text-lime-400 p-3 rounded-xl shadow-lg hover:bg-black transition-transform active:scale-95" disabled={!inputText.trim()}>
              <Send size={20} />
            </button>
          </form>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[600px] w-full max-w-lg mx-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 relative">
      {/* Chat Header */}
      <div className="bg-[#1A1C1E] p-4 flex items-center justify-between text-white shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center text-black shadow-glow">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">e-JAIS Chatbot</h3>
            <div className="flex items-center gap-1.5">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] text-gray-400 font-medium">Online</span>
            </div>
          </div>
        </div>
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
           <ChevronLeft size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F2F2]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm relative
                ${msg.sender === 'user' 
                  ? 'bg-[#1A1C1E] text-white rounded-tr-none' 
                  : 'bg-white text-dark rounded-tl-none border border-gray-100'
                }
              `}
            >
               {msg.isTyping ? (
                 <div className="flex gap-1 h-5 items-center px-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                 </div>
               ) : msg.text}
            </div>
          </div>
        ))}
        {/* Progress Bar */}
        {!isCompleted && (
          <div className="sticky bottom-0 left-0 right-0 flex justify-center pb-2 pointer-events-none">
             <div className="bg-black/10 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-gray-500">
               Soalan {currentStepIndex + 1} / {STEPS.length}
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      {renderInputArea()}
    </div>
  );
};
