
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, CheckCircle2, ArrowRight, RefreshCw, ChevronLeft, Share2, Loader2, LayoutDashboard, Award, Smartphone, Square, Clock, Beaker, PenLine, Image as ImageIcon } from 'lucide-react';
import { EvaluationFormData } from '../types';
import { LOCATIONS, ORGANIZERS, DURATIONS, EDUCATION_LEVELS, AGE_RANGES, PREMADE_COMMENTS, PREMADE_SUGGESTIONS } from '../constants';
import { submitEvaluation } from '../services/api';
import html2canvas from 'html2canvas';
import { GoogleGenAI } from "@google/genai";

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
  
  // Poster & Cert logic for Chatbot
  const posterRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posterRatio, setPosterRatio] = useState<'square' | 'story'>('square');
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentStep = STEPS[currentStepIndex];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isCompleted]); // Trigger scroll when completed too

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
      
      // GENERATE RANDOM DELAY (1s - 2s)
      const randomDelay = Math.floor(Math.random() * 1000) + 1000;
      
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        addMessage('bot', STEPS[nextIndex].question);
      }, randomDelay);
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

  // --- SANDBOX MODE (FOR TESTING) ---
  const activateSandboxMode = () => {
    const sandboxData: EvaluationFormData = {
      namaProgram: 'DAURAH KITAB TURATH SIRI 1',
      bahagianProgram: 'KUCHING',
      tempatProgram: 'MASJID JAMEK NEGERI SARAWAK',
      tarikhMula: new Date().toISOString().split('T')[0],
      tempohProgram: '1 HARI',
      penganjurUtama: 'BAHAGIAN DAKWAH (HQ)',
      jantina: 'LELAKI',
      umur: '31-40 TAHUN',
      tarafPendidikan: 'IJAZAH SARJANA MUDA',
      ratingTarikhMasa: 5,
      ratingPengisian: 5,
      ratingJamuan: 5,
      ratingFasilitator: 5,
      ratingUrusetia: 5,
      ratingKeseluruhan: 5,
      komenProgram: 'Sandbox Test Data',
      cadanganProgram: 'Sandbox Test Data',
    };
    setFormData(sandboxData);
    setIsCompleted(true);
    addMessage('bot', "SANDBOX MODE ACTIVATED. Data dummy telah dimuatkan.");
  };

  // --- SOCIAL SHARE LOGIC ---
  const handleSharePoster = async () => {
    if (!posterRef.current) return;
    setIsSharing(true);
    
    try {
      // Small delay to ensure any text edits are rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(posterRef.current, {
        scale: 4, // 300 DPI Quality (High Res)
        backgroundColor: '#0F0F0F',
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
      if (!blob) throw new Error("Gagal menjana imej");

      const file = new File([blob], `Tamat_Kursus_${Date.now()}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Selesai Program',
          text: `Alhamdulillah, selesai program ${formData.namaProgram}! ✨`
        });
      } else {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png', 1.0);
        link.download = `Selesai_${formData.namaProgram?.replace(/\s+/g, '_') || "Program"}.png`;
        link.click();
        alert("Gambar berkualiti tinggi disimpan! Sila upload ke Status WhatsApp anda.");
      }
    } catch (error) {
      console.error("Share failed", error);
      alert("Maaf, tidak dapat berkongsi. Sila cuba lagi.");
    } finally {
      setIsSharing(false);
    }
  };

  // --- SAVE TO ALBUM LOGIC ---
  const handleSaveToAlbum = async () => {
    if (!posterRef.current) return;
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(posterRef.current, {
        scale: 4,
        backgroundColor: '#0F0F0F',
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png', 1.0);
      link.download = `Selesai_${formData.namaProgram?.replace(/\s+/g, '_') || "Program"}.png`;
      link.click();
      alert("Poster berjaya disimpan ke galeri!");
    } catch (error) {
      console.error("Save failed", error);
      alert("Gagal menyimpan gambar.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDER HELPERS ---

  const renderInputArea = () => {
    if (isCompleted) {
      return (
        <div className="p-4 bg-white border-t border-gray-100 flex flex-col items-center">
          
           {/* SOCIAL FLEX POSTER PREVIEW */}
           <div className="w-full mb-4">
             <div className="flex justify-between items-end mb-2 px-2">
               <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                ✨ Poster Kenangan
               </p>
               {/* Ratio Toggles */}
               <div className="bg-gray-100 p-0.5 rounded-lg flex gap-1">
                  <button 
                    onClick={() => setPosterRatio('square')}
                    className={`p-1 rounded-md transition-all ${posterRatio === 'square' ? 'bg-white shadow-sm text-dark' : 'text-gray-400 hover:text-dark'}`}
                    title="Square"
                  >
                     <Square size={12} />
                  </button>
                  <button 
                    onClick={() => setPosterRatio('story')}
                    className={`p-1 rounded-md transition-all ${posterRatio === 'story' ? 'bg-white shadow-sm text-dark' : 'text-gray-400 hover:text-dark'}`}
                    title="Story"
                  >
                     <Smartphone size={12} />
                  </button>
               </div>
             </div>
             
             {/* EDITABLE NAME SECTION */}
            <div className="bg-white rounded-lg p-2 mb-3 shadow-sm border border-gray-100 flex flex-col gap-1 w-full max-w-[280px] mx-auto">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <PenLine size={10}/> Edit Nama (Poster)
                </label>
                <input 
                    type="text" 
                    value={formData.namaProgram}
                    onChange={(e) => setFormData(prev => ({...prev, namaProgram: e.target.value.toUpperCase()}))}
                    className="w-full font-bold text-dark text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-lime-400 focus:outline-none uppercase"
                    placeholder="NAMA PROGRAM"
                />
            </div>
            
            {/* The Actual Poster to be Captured */}
            <div 
              ref={posterRef}
              className={`
                w-full mx-auto bg-[#0F0F0F] rounded-[1.5rem] p-6 flex flex-col justify-between relative overflow-hidden shadow-lg border-2 border-lime-400
                ${posterRatio === 'square' ? 'aspect-square max-w-[280px]' : 'aspect-[9/16] max-w-[200px]'}
                transition-all duration-300
              `}
            >
              {/* Background Accents */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-lime-400/20 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-lime-400/10 rounded-full blur-2xl -ml-6 -mb-6"></div>
              
              <div className="relative z-10">
                <div className="bg-lime-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mb-3">
                    Tamat Program
                </div>
                <h2 
                    className={`text-white font-black uppercase leading-none tracking-tighter mb-2 break-words ${posterRatio === 'story' ? 'text-2xl' : 'text-xl'}`}
                    style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}
                >
                  {formData.namaProgram || "PROGRAM"}
                </h2>
                <div className="mt-2 flex items-center gap-1.5 text-gray-400">
                  <Clock size={12} className="text-lime-400"/>
                  <span className="text-[10px] font-bold uppercase tracking-wide">
                     {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="relative z-10 pt-4 border-t border-white/10 mt-auto">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                       <LayoutDashboard size={14} className="text-[#0F0F0F]"/>
                    </div>
                    <div>
                       <div className="text-white font-bold text-xs leading-none mb-0.5">e-Penilaian JAIS</div>
                       <div className="text-gray-500 text-[8px] uppercase tracking-widest font-bold">Sarawak</div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="mt-3 space-y-2 w-full max-w-[280px] mx-auto">
              <button 
                onClick={handleSharePoster}
                disabled={isSharing}
                className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all"
              >
                {isSharing ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                Share to WhatsApp
              </button>

              <button 
                onClick={handleSaveToAlbum}
                disabled={isSaving}
                className="w-full bg-[#1A1C1E] text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all border border-gray-800"
              >
                {isSaving ? <Loader2 className="animate-spin text-lime-400" size={16} /> : <ImageIcon size={16} className="text-lime-400" />}
                Simpan Poster (Album)
              </button>
            </div>

          </div>

          <button onClick={onBack} className="bg-white text-gray-500 border border-gray-200 px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-sm hover:scale-105 transition-transform text-sm">
            <RefreshCw size={16} /> Isi Semula / Kembali
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
            <h3 className="font-bold text-sm leading-tight">e-JAIS Penilaian Chatbot</h3>
            <div className="flex items-center gap-1.5">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] text-gray-400 font-medium">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center">
            {!isCompleted && <button onClick={activateSandboxMode} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors" title="Sandbox"><Beaker size={20}/></button>}
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
            </button>
        </div>
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
