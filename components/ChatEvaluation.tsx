import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, ChevronLeft, Share2, Loader2, LayoutDashboard, Smartphone, Square, Clock, PenLine, Image as ImageIcon, MapPin, Building2, CheckCircle2, Sparkles, RefreshCw, Beaker } from 'lucide-react';
import { EvaluationFormData } from '../types';
import { LOCATIONS, ORGANIZERS, DURATIONS, EDUCATION_LEVELS, AGE_RANGES, PREMADE_COMMENTS, PREMADE_SUGGESTIONS, PROGRAM_VENUES } from '../constants';
import { submitEvaluation } from '../services/api';
import html2canvas from 'html2canvas';

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
  { 
    field: 'tempatProgram', 
    question: "Sila nyatakan TEMPAT spesifik program (Contoh: Dewan Hikmah).", 
    type: 'text', 
    uppercase: true,
    options: PROGRAM_VENUES 
  },
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
  
  // Logic States
  const [readyToSubmit, setReadyToSubmit] = useState(false); // New state for confirmation button
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Poster & Cert logic for Chatbot
  const posterRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posterRatio, setPosterRatio] = useState<'square' | 'story'>('square');
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentStep = STEPS[currentStepIndex];

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, readyToSubmit, isCompleted]);

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

    // 3. Move to next or Trigger Submit Confirmation
    if (currentStepIndex < STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      // Simulate Typing
      setMessages(prev => [...prev, { id: 'typing', sender: 'bot', text: '...', isTyping: true }]);
      
      const randomDelay = Math.floor(Math.random() * 800) + 800; // Slightly faster
      
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        addMessage('bot', STEPS[nextIndex].question);
      }, randomDelay);
    } else {
      // Last question answered. Ask for confirmation.
      setMessages(prev => [...prev, { id: 'typing', sender: 'bot', text: '...', isTyping: true }]);
      
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        addMessage('bot', "Terima kasih! Anda telah menjawab semua soalan. Sila tekan butang HANTAR di bawah untuk mengesahkan penilaian anda.");
        setReadyToSubmit(true);
      }, 1000);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setReadyToSubmit(false); // Hide the button
    
    // Add a fake "Submitting" message bubble
    addMessage('bot', <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14}/> Menghantar penilaian...</span>);

    try {
      await submitEvaluation(formData as EvaluationFormData);
      
      // Success!
      setIsCompleted(true);
      // Note: We don't add a text message here, we switch the UI to the Success View
      
    } catch (error) {
      setIsSubmitting(false);
      setReadyToSubmit(true); // Show button again
      addMessage('bot', "Maaf, ada ralat rangkaian. Sila cuba tekan Hantar sekali lagi.");
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
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
    setReadyToSubmit(true);
    addMessage('bot', "SANDBOX MODE: Data dummy dimuatkan. Sila tekan HANTAR.");
  };

  // --- SOCIAL SHARE LOGIC ---
  const handleSharePoster = async () => {
    if (!posterRef.current) return;
    setIsSharing(true);
    
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
        alert("Gambar disimpan! Sila upload ke Status WhatsApp anda.");
      }
    } catch (error) {
      console.error("Share failed", error);
      alert("Maaf, tidak dapat berkongsi. Sila cuba lagi.");
    } finally {
      setIsSharing(false);
    }
  };

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

  // --- UI RENDERERS ---

  const renderInputArea = () => {
    // 1. SUCCESS VIEW (Finished)
    if (isCompleted) {
      return (
        <div className="absolute inset-0 bg-white z-20 flex flex-col overflow-y-auto animate-in fade-in slide-in-from-bottom-10 duration-700">
           {/* Success Header */}
           <div className="bg-lime-400 p-8 pb-12 rounded-b-[3rem] shadow-glow relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-lime-600 mb-4 shadow-lg">
                    <CheckCircle2 size={32} strokeWidth={4} />
                 </div>
                 <h2 className="text-3xl font-black text-dark tracking-tight mb-2">Terima Kasih!</h2>
                 <p className="text-dark/80 font-bold text-sm max-w-xs leading-relaxed">
                   Kerana memberikan penilaian kepada Program Jabatan Agama Islam Sarawak.
                 </p>
              </div>
           </div>

           {/* Social Poster Section */}
           <div className="flex-1 p-6 flex flex-col items-center -mt-8">
              <div className="w-full max-w-sm">
                  <div className="bg-white rounded-3xl p-4 shadow-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-lime-100 rounded-lg text-lime-700">
                                <Sparkles size={14} fill="currentColor"/>
                            </div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kongsikan Di Media Sosial</span>
                        </div>
                        {/* Ratio Toggles */}
                        <div className="bg-gray-100 p-0.5 rounded-lg flex gap-1">
                            <button onClick={() => setPosterRatio('square')} className={`p-1 rounded-md ${posterRatio === 'square' ? 'bg-white shadow-sm text-dark' : 'text-gray-400'}`}><Square size={12} /></button>
                            <button onClick={() => setPosterRatio('story')} className={`p-1 rounded-md ${posterRatio === 'story' ? 'bg-white shadow-sm text-dark' : 'text-gray-400'}`}><Smartphone size={12} /></button>
                        </div>
                      </div>

                      {/* Poster Preview */}
                      <div className="flex justify-center mb-4">
                         <div 
                            ref={posterRef}
                            className={`
                                w-full bg-[#0F0F0F] rounded-[1.5rem] p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl border-[3px] border-lime-400
                                ${posterRatio === 'square' ? 'aspect-square max-w-[260px]' : 'aspect-[9/16] max-w-[180px]'}
                                transition-all duration-300
                            `}
                            >
                            {/* Background Accents */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-lime-400/20 rounded-full blur-2xl -mr-6 -mt-6"></div>
                            <div className="absolute bottom-0 left-0 w-20 h-20 bg-lime-400/10 rounded-full blur-2xl -ml-6 -mb-6"></div>
                            
                            <div className="relative z-10">
                                <div className="bg-lime-400 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mb-2">
                                    Tamat Program
                                </div>
                                <div className="flex items-center gap-1.5 text-lime-400 mb-1 opacity-90">
                                    <Building2 size={10} className="shrink-0"/>
                                    <span className="text-[9px] font-bold uppercase tracking-wider line-clamp-1">
                                    {formData.penganjurUtama || "PENGANJUR"}
                                    </span>
                                </div>
                                <h2 className={`text-white font-black uppercase leading-none tracking-tighter mb-2 break-words ${posterRatio === 'story' ? 'text-xl' : 'text-lg'}`}>
                                {formData.namaProgram || "PROGRAM"}
                                </h2>
                                <div className="space-y-1.5 mt-2 border-l-2 border-white/20 pl-2">
                                    <div className="flex items-center gap-1.5 text-gray-300">
                                        <MapPin size={10} className="text-white shrink-0"/>
                                        <span className="text-[9px] font-bold uppercase tracking-wide leading-tight line-clamp-2">
                                            {formData.tempatProgram || "LOKASI"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-300">
                                        <Clock size={10} className="text-white shrink-0"/>
                                        <span className="text-[9px] font-bold uppercase tracking-wide">
                                            {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10 pt-3 border-t border-white/10 mt-auto">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                                    <LayoutDashboard size={12} className="text-[#0F0F0F]"/>
                                    </div>
                                    <div>
                                    <div className="text-white font-bold text-[10px] leading-none mb-0.5">e-Penilaian JAIS</div>
                                    <div className="text-gray-500 text-[6px] uppercase tracking-widest font-bold">Sarawak</div>
                                    </div>
                                </div>
                            </div>
                         </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                         <button 
                            onClick={handleSharePoster}
                            disabled={isSharing}
                            className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all"
                         >
                            {isSharing ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                            Share WhatsApp Status
                         </button>
                         <button 
                            onClick={handleSaveToAlbum}
                            disabled={isSaving}
                            className="w-full bg-dark text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all"
                         >
                             {isSaving ? <Loader2 className="animate-spin text-lime-400" size={16} /> : <ImageIcon size={16} className="text-lime-400" />}
                            Simpan ke Album
                         </button>
                      </div>
                  </div>

                  <button 
                    onClick={onBack} 
                    className="w-full mt-6 text-gray-400 hover:text-dark font-bold text-xs py-2 flex items-center justify-center gap-2 transition-colors"
                  >
                     <RefreshCw size={14}/> Kembali ke Menu Utama
                  </button>
              </div>
           </div>
        </div>
      );
    }

    // 2. SUBMIT CONFIRMATION (Ready to Submit)
    if (readyToSubmit) {
       return (
         <div className="p-4 bg-white border-t border-gray-100">
             <div className="bg-lime-50 border border-lime-200 rounded-xl p-3 mb-3 text-xs text-lime-800 font-medium text-center">
                Semua soalan telah dijawab. Sila sahkan.
             </div>
             <button
               onClick={handleFinalSubmit}
               disabled={isSubmitting}
               className="w-full bg-lime-400 text-dark py-4 rounded-2xl font-black text-lg shadow-glow hover:bg-lime-500 active:scale-95 transition-all flex items-center justify-center gap-3"
             >
                {isSubmitting ? (
                   <>
                     <Loader2 className="animate-spin" size={24} />
                     MENGHANTAR...
                   </>
                ) : (
                   <>
                     HANTAR JAWAPAN <Send size={24} strokeWidth={2.5} />
                   </>
                )}
             </button>
         </div>
       );
    }
    
    // 3. SUBMITTING STATE (Block inputs)
    if (isSubmitting) return null;

    // 4. NORMAL INPUTS
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
           <form onSubmit={(e) => { 
             e.preventDefault(); 
             if(inputText) {
               handleNextStep(inputText); 
               setInputText('');
             }
           }} className="p-4 bg-white border-t border-gray-100 flex gap-2">
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

      default: // Text with potential datalist
        const datalistId = `list-${currentStep.field}`;
        return (
          <form onSubmit={handleTextSubmit} className="p-4 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value.toUpperCase())} // Force Upper
              placeholder="TAIP JAWAPAN..."
              className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-3 text-dark font-medium focus:ring-2 focus:ring-lime-400/50 uppercase placeholder:normal-case"
              autoFocus
              list={currentStep.options ? datalistId : undefined}
            />
            {currentStep.options && (
              <datalist id={datalistId}>
                {currentStep.options.map(opt => <option key={opt} value={opt} />)}
              </datalist>
            )}
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
      <div className="bg-[#1A1C1E] p-4 flex items-center justify-between text-white shadow-md z-10 shrink-0">
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
            {!isCompleted && !readyToSubmit && <button onClick={activateSandboxMode} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors" title="Sandbox"><Beaker size={20}/></button>}
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F2F2] pb-24">
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
        {!isCompleted && !readyToSubmit && (
          <div className="sticky bottom-0 left-0 right-0 flex justify-center pb-2 pointer-events-none">
             <div className="bg-black/10 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-gray-500">
               Soalan {currentStepIndex + 1} / {STEPS.length}
             </div>
          </div>
        )}
      </div>

      {/* Input Area (Sticky Bottom) */}
      <div className="shrink-0 bg-white border-t border-gray-100">
         {renderInputArea()}
      </div>
    </div>
  );
};