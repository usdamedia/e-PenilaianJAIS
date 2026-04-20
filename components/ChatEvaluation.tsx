import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Bot, ChevronLeft, Share2, Loader2, LayoutDashboard, Smartphone, Square, Clock, PenLine, Image as ImageIcon, MapPin, Building2, CheckCircle2, Sparkles, RefreshCw, X, User, Camera, Aperture } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EvaluationFormData } from '../types';
import { LOCATIONS, ORGANIZERS, DURATIONS, EDUCATION_LEVELS, AGE_RANGES, PREMADE_COMMENTS, PREMADE_SUGGESTIONS, PROGRAM_VENUES, MONTHS } from '../constants';
import { CADANGAN_NAMA_PROGRAM } from '../NAMA_PROGRAM_CADANGAN';
import { submitEvaluation } from '../services/api';
import html2canvas from 'html2canvas';

interface ChatEvaluationProps {
  onBack: () => void;
  onSubmitSuccess?: () => void;
  programSuggestions?: string[];
  initialData?: Partial<EvaluationFormData>;
  isLocked?: boolean;
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
  type: 'text' | 'options' | 'date' | 'rating' | 'textarea' | 'select' | 'netflix-profile';
  options?: string[];
  uppercase?: boolean;
  prefill?: string;
  hideSuggestions?: boolean;
};

const STEPS: QuestionStep[] = [
  { 
    field: 'adaSijil', 
    question: "Adakah program ini menyediakan sijil penyertaan?", 
    type: 'netflix-profile', 
    options: ['Ada', 'Tiada'] 
  },
  { 
    field: 'namaProgram', 
    question: "Assalamualaikum & hai! Saya AI JAIS. Jom mulakan. Boleh berikan nama program yang anda hadiri?", 
    type: 'text', 
    uppercase: true,
    options: CADANGAN_NAMA_PROGRAM
  },
  { field: 'bahagianProgram', question: "Di bahagian mana program ini diadakan?", type: 'options', options: LOCATIONS },
  { 
    field: 'tempatProgram', 
    question: "Sila nyatakan tempat spesifik program (contoh: dewan hikmah).", 
    type: 'text', 
    uppercase: true,
    options: PROGRAM_VENUES 
  },
  { field: 'tarikhMula', question: "Bilakah tarikh mula program ini?", type: 'date' },
  { field: 'tempohProgram', question: "Berapa lama tempoh program berjalan?", type: 'options', options: DURATIONS },
  { field: 'penganjurUtama', question: "Siapakah penganjur utama program ini?", type: 'select', options: ORGANIZERS },
  { 
    field: 'namaPenuh', 
    question: "Boleh berikan nama penuh anda? (Sila rujuk e-sijil penganjur jika ada)", 
    type: 'text', 
    uppercase: true 
  },
  { field: 'jantina', question: "Terima kasih. Sedikit info diri. Jantina anda?", type: 'options', options: ['Lelaki', 'Perempuan'] },
  { field: 'umur', question: "Kategori umur anda?", type: 'options', options: AGE_RANGES },
  { field: 'tarafPendidikan', question: "Taraf pendidikan tertinggi?", type: 'options', options: EDUCATION_LEVELS },
  { field: 'ratingTarikhMasa', question: "Sekarang sesi penilaian (skala 0-5). Bagaimana dengan logistik (tarikh/masa/tempat)?", type: 'rating' },
  { field: 'ratingPengisian', question: "Bagaimana pula dengan pengisian program?", type: 'rating' },
  { field: 'ratingJamuan', question: "Penilaian untuk jamuan (jika ada)?", type: 'rating' },
  { field: 'ratingFasilitator', question: "Prestasi fasilitator/pembentang (jika ada)?", type: 'rating' },
  { field: 'ratingUrusetia', question: "Bagaimana layanan keurusetiaan?", type: 'rating' },
  { field: 'ratingKeseluruhan', question: "Secara keseluruhan, berapa bintang anda beri?", type: 'rating' },
  { field: 'komenProgram', question: "Hampir siap! Ada sebarang komen tambahan?", type: 'textarea', options: PREMADE_COMMENTS },
  { field: 'cadanganProgram', question: "Terakhir, ada cadangan penambahbaikan?", type: 'textarea', options: PREMADE_SUGGESTIONS },
];

export const ChatEvaluation: React.FC<ChatEvaluationProps> = ({ 
  onBack, 
  onSubmitSuccess,
  programSuggestions = [],
  initialData = {},
  isLocked = false
}) => {
  const [showInitialChoice, setShowInitialChoice] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Dynamic Steps based on suggestions
  const steps = useMemo(() => {
    const newSteps = [...STEPS];
    if (programSuggestions.length > 0) {
      const progStep = newSteps.find(s => s.field === 'namaProgram');
      if (progStep) {
        progStep.options = programSuggestions;
      }
    }
    return newSteps;
  }, [programSuggestions]);

  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    if (!showInitialChoice && messages.length === 0) {
      let startIndex = 0;
      
      // If locked, skip pre-filled steps
      if (isLocked) {
        while (startIndex < steps.length && formData[steps[startIndex].field]) {
          startIndex++;
        }
      }
      
      if (startIndex < steps.length) {
        setCurrentStepIndex(startIndex);
        setMessages([{ id: '1', sender: 'bot', text: steps[startIndex].question }]);
      } else {
        setIsReviewing(true);
        setReadyToSubmit(true);
      }
    }
  }, [showInitialChoice, steps, isLocked]);
  const [formData, setFormData] = useState<Partial<EvaluationFormData>>(initialData);
  const [inputText, setInputText] = useState('');
  
  // Logic States
  const [readyToSubmit, setReadyToSubmit] = useState(false); // New state for confirmation button
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Poster & Cert logic for Chatbot
  const posterRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posterRatio, setPosterRatio] = useState<'square' | 'story'>('square');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false); // New state for edit mode

  const currentStep = steps[currentStepIndex];

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

    // 3. Check if Editing
    if (isEditing) {
       setIsEditing(false);
       setIsReviewing(true); // Go back to review immediately to show the update
       setReadyToSubmit(true);
       
       // Add a confirmation message from the bot
       setMessages(prev => [...prev, { id: 'typing', sender: 'bot', text: '...', isTyping: true }]);
       
       setTimeout(() => {
         setMessages(prev => prev.filter(m => m.id !== 'typing'));
         addMessage('bot', "Jawapan telah dikemaskini. Sila semak semula.");
       }, 600);
       return;
    }

    // 4. Move to next or Trigger Submit Confirmation
    if (currentStepIndex < steps.length - 1) {
      let nextIndex = currentStepIndex + 1;
      
      // Logic to skip namaPenuh if adaSijil is TIADA
      // We check if the NEXT step is 'namaPenuh' and if the user previously selected 'TIADA' for 'adaSijil'
      if (steps[nextIndex] && steps[nextIndex].field === 'namaPenuh' && updatedData.adaSijil === 'TIADA') {
         // Skip namaPenuh by setting a default value and incrementing the index
         updatedData.namaPenuh = '-';
         setFormData(updatedData);
         nextIndex++;
      }

      // Skip pre-filled steps if locked
      if (isLocked) {
        while (nextIndex < steps.length && updatedData[steps[nextIndex].field]) {
          nextIndex++;
        }
      }

      if (nextIndex < steps.length) {
        setCurrentStepIndex(nextIndex);
        
        // Simulate Typing
        setMessages(prev => [...prev, { id: 'typing', sender: 'bot', text: '...', isTyping: true }]);
        
        const randomDelay = Math.floor(Math.random() * 800) + 800; // Slightly faster
        
        setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== 'typing'));
          addMessage('bot', steps[nextIndex].question);
        }, randomDelay);
      } else {
        // No more steps after skipping
        setMessages(prev => [...prev, { id: 'typing', sender: 'bot', text: '...', isTyping: true }]);
        
        setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== 'typing'));
          addMessage('bot', "Terima kasih! Anda telah menjawab semua soalan. Sila semak jawapan anda atau terus tekan butang HANTAR.");
          setReadyToSubmit(true);
        }, 1000);
      }
    } else {
      // Last question answered. Ask for confirmation.
      setMessages(prev => [...prev, { id: 'typing', sender: 'bot', text: '...', isTyping: true }]);
      
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        addMessage('bot', "Terima kasih! Anda telah menjawab semua soalan. Sila semak jawapan anda atau terus tekan butang HANTAR.");
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
      if (onSubmitSuccess) onSubmitSuccess();
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



  // --- SOCIAL SHARE LOGIC ---
  const handleSharePoster = async () => {
    if (!posterRef.current) return;
    setIsSharing(true);
    
    try {
      // Give UI time to update
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(posterRef.current, {
        scale: 2, // Reduced scale for better compatibility/performance
        backgroundColor: '#0F0F0F',
        logging: false,
        useCORS: true,
        allowTaint: false, // Changed to false for better security/compatibility
        foreignObjectRendering: false,
        removeContainer: true,
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
      if (!blob) throw new Error("Gagal menjana imej");

      const fileName = `Tamat_Kursus_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Check for Web Share API support with files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Selesai Program',
          text: `Alhamdulillah, selesai program ${formData.namaProgram}! ✨`
        });
      } else {
        // Fallback to download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("Gambar telah dimuat turun! Sila kongsikan ke Status WhatsApp anda secara manual.");
      }
    } catch (error) {
      console.error("Share failed", error);
      alert("Maaf, tidak dapat menjana gambar. Sila cuba lagi.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveToAlbum = async () => {
    if (!posterRef.current) return;
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        backgroundColor: '#0F0F0F',
        logging: false,
        useCORS: true,
        allowTaint: false,
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Selesai_${formData.namaProgram?.substring(0, 20).replace(/\s+/g, '_') || "Program"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Small delay to show success
      setTimeout(() => {
        alert("Poster berjaya dimuat turun!");
      }, 500);
    } catch (error) {
      console.error("Save failed", error);
      alert("Gagal menyimpan gambar. Sila cuba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- CAMERA & OCR LOGIC ---
  const getTitleFontSize = (text: string) => {
    const length = text?.length || 0;
    if (length > 50) return 'text-[12px]';
    if (length > 35) return 'text-[16px]';
    if (length > 20) return 'text-[20px]';
    return 'text-[22px]';
  };

  // --- UI RENDERERS ---

  const renderInputArea = () => {
    // 1. SUCCESS VIEW (Finished)
    if (isCompleted) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0 bg-gray-50 z-20 flex flex-col overflow-y-auto"
        >
           {/* Success Header */}
           <div className="bg-lime-400 p-8 pb-16 rounded-b-[3rem] shadow-glow relative overflow-hidden shrink-0">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16"
              ></motion.div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-0 left-0 w-32 h-32 bg-lime-300/50 rounded-full blur-2xl -ml-10 -mb-10"
              ></motion.div>
              
              <div className="relative z-10 flex flex-col items-center text-center mt-4">
                 <motion.div 
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                   className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-lime-600 mb-6 shadow-xl"
                 >
                    <CheckCircle2 size={40} strokeWidth={4} />
                 </motion.div>
                 <motion.h2 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.4 }}
                   className="text-[22px] font-black text-dark tracking-tight mb-2"
                 >
                   Terima Kasih!
                 </motion.h2>
                 <motion.p 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.6 }}
                   className="text-dark/80 font-bold text-[10pt] max-w-xs leading-relaxed"
                 >
                   Kerana memberikan penilaian kepada Program Jabatan Agama Islam Sarawak.
                 </motion.p>
              </div>
           </div>

           {/* Social Poster Section */}
           <div className="flex-1 px-6 pb-12 flex flex-col items-center -mt-10 relative z-20">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="w-full max-w-sm"
              >
                  <div className="bg-white rounded-[2rem] p-5 shadow-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-6 px-1">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-lime-100 rounded-xl text-lime-700">
                                <Sparkles size={16} fill="currentColor"/>
                            </div>
                            <div>
                               <p className="text-[14pt] font-black text-dark tracking-wide">Kongsikan</p>
                               <p className="text-[10pt] font-bold text-gray-400 uppercase tracking-wider">Media sosial</p>
                            </div>
                        </div>
                        {/* Ratio Toggles */}
                        <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                            <button onClick={() => setPosterRatio('square')} className={`p-1.5 rounded-lg transition-all ${posterRatio === 'square' ? 'bg-white shadow-sm text-dark' : 'text-gray-400 hover:text-gray-600'}`}><Square size={14} /></button>
                            <button onClick={() => setPosterRatio('story')} className={`p-1.5 rounded-lg transition-all ${posterRatio === 'story' ? 'bg-white shadow-sm text-dark' : 'text-gray-400 hover:text-gray-600'}`}><Smartphone size={14} /></button>
                        </div>
                      </div>

                      {/* Poster Preview */}
                      <div className="flex justify-center mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100 inner-shadow">
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
                                <div className="bg-lime-400 text-black text-[10pt] font-black px-2 py-0.5 rounded-full tracking-wider inline-block mb-2">
                                    Tamat program
                                </div>
                                <div className="flex items-center gap-1.5 text-lime-400 mb-1 opacity-90">
                                    <Building2 size={10} className="shrink-0"/>
                                    <span className="text-[10px] font-bold tracking-wider line-clamp-1">
                                    {formData.penganjurUtama || "Penganjur"}
                                    </span>
                                </div>
                                <h2 className={`text-white font-black leading-none tracking-tighter mb-2 break-words ${getTitleFontSize(formData.namaProgram || "")}`}>
                                {formData.namaProgram || "Program"}
                                </h2>
                                <div className="space-y-1.5 mt-2 border-l-2 border-white/20 pl-2">
                                    <div className="flex items-center gap-1.5 text-gray-300">
                                        <MapPin size={10} className="text-white shrink-0"/>
                                        <span className="text-[10px] font-bold tracking-wide leading-tight line-clamp-2">
                                            {formData.tempatProgram || "Lokasi"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-300">
                                        <Clock size={10} className="text-white shrink-0"/>
                                        <span className="text-[10px] font-bold uppercase tracking-wide">
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
                                    <div className="text-gray-500 text-[8px] uppercase tracking-widest font-bold">Sarawak</div>
                                    </div>
                                </div>
                            </div>
                         </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2.5">
                         <button 
                            onClick={handleSharePoster}
                            disabled={isSharing}
                            className="w-full bg-[#25D366] text-white py-3.5 rounded-xl font-bold text-[10pt] shadow-md flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all"
                         >
                            {isSharing ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                            Share WhatsApp Status
                         </button>
                         <button 
                            onClick={handleSaveToAlbum}
                            disabled={isSaving}
                            className="w-full bg-dark text-white py-3.5 rounded-xl font-bold text-[10pt] shadow-md flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all"
                         >
                             {isSaving ? <Loader2 className="animate-spin text-lime-400" size={18} /> : <ImageIcon size={18} className="text-lime-400" />}
                            Simpan ke Album
                         </button>
                      </div>
                  </div>

                  <button 
                    onClick={onBack} 
                    className="w-full mt-8 text-gray-400 hover:text-dark font-bold text-[10pt] py-2 flex items-center justify-center gap-2 transition-colors"
                  >
                     <RefreshCw size={14}/> Kembali ke Menu Utama
                  </button>
              </motion.div>
           </div>
        </motion.div>
      );
    }

    // 2. REVIEW OVERLAY (Priority over confirmation)
    if (isReviewing) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="absolute inset-0 bg-white z-30 flex flex-col"
        >
           <div className="bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-lime-100 rounded-2xl flex items-center justify-center text-lime-600">
                    <PenLine size={20} />
                 </div>
                 <div>
                    <h2 className="text-[14pt] font-black text-dark tracking-tight leading-none">Semak jawapan</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Pastikan semua betul</p>
                 </div>
              </div>
              <button 
                onClick={() => setIsReviewing(false)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-dark transition-all active:scale-95"
              >
                <X size={24} />
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
              <div className="grid gap-3">
                {steps.map((step, idx) => (
                  <motion.div 
                    key={step.field} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white rounded-2xl p-4 border border-gray-100 hover:border-lime-400 transition-colors relative shadow-sm"
                  >
                    <div className="pr-10">
                      <p className="text-[10pt] font-black text-gray-400 tracking-widest mb-1">
                        {step.field.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-[10pt] font-bold text-dark leading-snug">
                        {step.field === 'ratingJamuan' && formData[step.field] === 0 
                          ? 'Tiada jamuan' 
                          : (formData[step.field]?.toString() || <span className="text-gray-300 italic">Tiada jawapan</span>)}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setCurrentStepIndex(idx);
                        setIsReviewing(false);
                        setReadyToSubmit(false);
                        setIsEditing(true); // Enable edit mode
                        addMessage('bot', `Sila masukkan jawapan baharu untuk: ${step.question}`);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-50 rounded-xl text-lime-600 hover:bg-lime-600 hover:text-white transition-all active:scale-95 flex items-center gap-2 border border-gray-100"
                    >
                      <PenLine size={14} />
                      <span className="text-[10pt] font-black uppercase tracking-wider">Edit</span>
                    </button>
                  </motion.div>
                ))}
              </div>
           </div>

           <div className="p-6 bg-white border-t border-gray-100">
              <button
                onClick={() => setIsReviewing(false)}
                className="w-full bg-dark text-white py-4 rounded-2xl font-black text-[14pt] shadow-xl hover:bg-black active:scale-95 transition-all"
              >
                Selesai semak
              </button>
           </div>
        </motion.div>
      );
    }

    // 3. SUBMIT CONFIRMATION (Ready to Submit)
    if (readyToSubmit) {
       return (
         <div className="p-4 bg-white border-t border-gray-100 space-y-3">
             <div className="bg-lime-50 border border-lime-200 rounded-xl p-3 text-[10pt] text-lime-800 font-medium text-center">
                Semua soalan telah dijawab. Sila semak jawapan anda sebelum menghantar.
             </div>
             <div className="flex gap-2">
                <button
                  onClick={() => setIsReviewing(true)}
                  className="flex-1 bg-gray-100 text-dark py-4 rounded-2xl font-bold text-[10pt] hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                   <PenLine size={18} /> Semak & edit
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex-[2] bg-lime-400 text-dark py-4 rounded-2xl font-black text-[14pt] shadow-glow hover:bg-lime-500 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                   {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        ...
                      </>
                   ) : (
                      <>
                        Hantar <Send size={20} strokeWidth={2.5} />
                      </>
                   )}
                </button>
             </div>
         </div>
       );
    }
    
    // 3. SUBMITTING STATE (Block inputs)
    if (isSubmitting) return null;

    // 4. NORMAL INPUTS
    switch (currentStep.type) {
      case 'netflix-profile':
        return (
          <div className="p-4 sm:p-6">
             <div className="flex items-center justify-center gap-2 mb-6">
               <Sparkles size={16} className="text-green-600" />
               <span className="text-[10pt] font-black text-gray-500 uppercase tracking-widest">Sila Pilih Status Sijil</span>
             </div>
             <div className="flex justify-center gap-4 sm:gap-8">
                {/* ADA Option */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNextStep('ADA')}
                  className="w-28 h-28 sm:w-36 sm:h-36 bg-white rounded-2xl border-2 border-transparent hover:border-green-400 flex flex-col items-center justify-center gap-3 transition-all group shadow-sm"
                >
                   <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-50 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={24} className="text-green-600 sm:w-8 sm:h-8" />
                   </div>
                   <span className="text-[10pt] sm:text-[10pt] font-black text-dark tracking-wide group-hover:text-green-700">Ada</span>
                </motion.button>

                {/* TIADA Option */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNextStep('TIADA')}
                  className="w-28 h-28 sm:w-36 sm:h-36 bg-white rounded-2xl border-2 border-transparent hover:border-red-400 flex flex-col items-center justify-center gap-3 transition-all group shadow-sm"
                >
                   <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-50 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <X size={24} className="text-red-500 sm:w-8 sm:h-8" />
                   </div>
                   <span className="text-[10pt] sm:text-[10pt] font-black text-dark tracking-wide group-hover:text-red-600">Tiada</span>
                </motion.button>
             </div>
             <div className="mt-6 text-center">
                <p className="text-[10pt] font-bold text-gray-400 italic">
                   *Sila rujuk kaunter urussetia program
                </p>
             </div>
          </div>
        );

      case 'select':
        return (
          <div className="p-2 sm:p-3 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Sparkles size={12} className="text-green-600" />
              <span className="text-[10pt] font-black text-gray-500 tracking-widest">Sila pilih dari senarai</span>
            </div>
            <div className="relative group">
              <select
                className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-dark font-bold focus:ring-2 focus:ring-green-400/50 transition-all text-[10pt] appearance-none cursor-pointer shadow-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    handleNextStep(e.target.value);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>-- Sila pilih penganjur --</option>
                {currentStep.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronLeft size={20} className="-rotate-90" />
              </div>
            </div>
          </div>
        );

      case 'options':
        return (
          <div className="p-2">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Sparkles size={12} className="text-green-600" />
              <span className="text-[10pt] font-black text-gray-500 tracking-widest">Sila pilih satu</span>
            </div>
            <div className="p-2 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
              {currentStep.options?.map((opt, idx) => (
                <motion.button
                  key={opt}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleNextStep(opt)}
                  className="shrink-0 px-5 py-3 bg-white border border-gray-200 rounded-full text-dark text-[10pt] sm:text-[10pt] font-bold shadow-sm hover:border-green-400 hover:bg-green-50 transition-all active:scale-95 flex items-center gap-2 group"
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 'rating':
        return (
          <div className="p-3">
            <div className="flex items-center justify-center gap-2 py-1.5 mb-2">
              <span className="text-[10pt] font-black text-gray-500 tracking-widest">Skala penilaian (0-5)</span>
            </div>
            <div className="flex justify-center gap-2 sm:gap-3">
              {[0, 1, 2, 3, 4, 5].map((num, idx) => (
                <motion.button
                  key={num}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleNextStep(num)}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-gray-200 text-[18px] sm:text-[20px] font-black text-dark hover:bg-green-500 hover:border-green-500 hover:text-white transition-all shadow-sm active:scale-90 flex items-center justify-center group"
                >
                  {num}
                </motion.button>
              ))}
            </div>
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
           }} className="flex gap-2 items-center">
              <input 
                type="date" 
                required
                className="flex-1 bg-white border border-gray-200 rounded-full px-5 py-3 text-dark font-bold focus:ring-2 focus:ring-green-400/50 transition-all text-[10pt] shadow-sm"
                onChange={(e) => setInputText(e.target.value)}
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit" 
                className="bg-green-500 text-white w-12 h-12 rounded-full shadow-md flex items-center justify-center shrink-0 disabled:opacity-50" 
                disabled={!inputText}
              >
                <Send size={20} strokeWidth={2.5} />
              </motion.button>
           </form>
        );
      case 'textarea':
        return (
          <div className="space-y-2">
             {/* Quick Chips */}
             {currentStep.options && (
               <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
                  {currentStep.options.map((opt, idx) => (
                     <motion.button 
                       key={opt} 
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: idx * 0.05 }}
                       onClick={() => handleNextStep(opt)}
                       className="shrink-0 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10pt] font-bold text-dark hover:border-green-400 hover:bg-green-50 transition-all shadow-sm max-w-[240px] truncate"
                     >
                       {opt}
                     </motion.button>
                  ))}
                  <button onClick={() => handleNextStep('TIADA')} className="shrink-0 px-4 py-2 bg-gray-200 rounded-full text-[10pt] font-black text-gray-600">Tiada</button>
               </div>
             )}
             <form onSubmit={handleTextSubmit} className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value.toUpperCase())}
                    placeholder="Taip komen anda..."
                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 pr-10 text-dark font-bold focus:ring-2 focus:ring-green-400/50 resize-none text-[10pt] transition-all min-h-[46px] max-h-32 shadow-sm"
                    style={{ fieldSizing: 'content' } as any}
                  />
                  {inputText && (
                    <button type="button" onClick={() => setInputText('')} className="absolute right-3 top-3 p-1 bg-gray-100 rounded-full text-gray-400">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit" 
                  className="bg-green-500 text-white w-12 h-12 rounded-full shadow-md flex items-center justify-center shrink-0"
                >
                  <Send size={20} strokeWidth={2.5} />
                </motion.button>
             </form>
          </div>
        );

      default: // Text with potential suggestions
        const upperInputText = inputText.toUpperCase();
        const filteredOptions = currentStep.options?.filter(opt => 
          inputText.length > 0 && opt.toUpperCase().includes(upperInputText)
        ) || [];

        return (
          <div className="relative space-y-2">
            {/* Google Search Style Autocomplete */}
            {filteredOptions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 shadow-xl max-h-60 overflow-y-auto z-50 rounded-2xl animate-in fade-in slide-in-from-bottom-2">
                {filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      handleNextStep(opt);
                      setInputText('');
                    }}
                    className="w-full text-left p-3 hover:bg-green-50 border-b border-gray-50 last:border-0 transition-colors flex items-center gap-3"
                  >
                    <div className="text-[10pt] font-bold text-dark leading-snug truncate">{opt}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Static Suggestions */}
            {currentStep.options && inputText.length === 0 && (
              <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
                {currentStep.options.slice(0, 10).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleNextStep(opt)}
                    className="shrink-0 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10pt] font-bold text-dark hover:border-green-400 hover:bg-green-50 transition-all shadow-sm max-w-[200px] truncate"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleTextSubmit} className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.toUpperCase())}
                  placeholder="Taip jawapan anda..."
                  className="w-full bg-white border border-gray-200 rounded-full px-5 py-3 pr-10 text-dark font-bold focus:ring-2 focus:ring-green-400/50 text-[10pt] transition-all shadow-sm"
                  autoFocus
                />
                {inputText && (
                  <button type="button" onClick={() => setInputText('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full text-gray-400">
                    <X size={12} />
                  </button>
                )}
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit" 
                className="bg-green-500 text-white w-12 h-12 rounded-full shadow-md flex items-center justify-center shrink-0 disabled:opacity-50" 
                disabled={!inputText.trim()}
              >
                <Send size={20} strokeWidth={2.5} />
              </motion.button>
            </form>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-dvh sm:h-[680px] w-full max-w-lg mx-auto bg-white sm:rounded-[2rem] shadow-2xl overflow-hidden sm:border border-gray-100 relative">
      {/* Chat Header */}
      <div className="bg-white/90 backdrop-blur-xl p-3 sm:p-4 flex items-center justify-between border-b border-gray-100 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.div 
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            className="relative"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-lime-400 rounded-xl sm:rounded-2xl flex items-center justify-center text-black shadow-lg shadow-lime-400/20 rotate-3 transition-transform hover:rotate-0 border border-lime-500/20">
              <Bot size={22} sm:size={26} strokeWidth={2.5} />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3 sm:h-4 sm:w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-green-500 border-2 border-white"></span>
            </span>
          </motion.div>
          <div>
            <h3 className="font-black text-dark text-[10pt] tracking-tight leading-none">AI JAIS</h3>
            <div className="flex items-center gap-1 mt-1 sm:mt-1">
               <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 animate-pulse"></div>
               <p className="text-[10pt] sm:text-[10pt] text-gray-400 font-bold tracking-wider">Aktif</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack} 
              className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-dark transition-all"
            >
              <X size={20} />
            </motion.button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-white scroll-smooth no-scrollbar sm:custom-scrollbar overscroll-contain relative pb-32"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`flex items-end gap-1 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[85%] px-3 py-2 sm:px-4 sm:py-2.5 text-[10pt] leading-relaxed shadow-sm relative group transition-all
                  ${msg.sender === 'user' 
                    ? 'bg-lime-400 text-dark rounded-2xl rounded-tr-none' 
                    : 'bg-gray-100 text-dark rounded-2xl rounded-tl-none'
                  }
                `}
              >
                {msg.isTyping ? (
                  <div className="flex gap-1 h-4 items-center px-1">
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-1 h-1 bg-gray-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 h-1 bg-gray-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 h-1 bg-gray-400 rounded-full" />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-medium text-[10pt] sm:text-[10pt]">{msg.text}</div>
                )}
                
                <div className="flex justify-end mt-1">
                  <span className={`text-[10pt] font-medium ${msg.sender === 'user' ? 'text-gray-400' : 'text-gray-400'}`}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Floating Progress Indicator */}
        {!isCompleted && !readyToSubmit && (
          <div className="sticky bottom-2 left-0 right-0 flex justify-center pointer-events-none z-10">
             <div className="bg-white/90 backdrop-blur shadow-md border border-gray-100 px-3 py-1 rounded-full flex items-center gap-1.5">
               <div className="flex gap-0.5">
                  {STEPS.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-1 h-1 rounded-full transition-all ${idx === currentStepIndex ? 'bg-green-500 scale-125' : idx < currentStepIndex ? 'bg-green-200' : 'bg-gray-200'}`}
                    />
                  ))}
               </div>
               <span className="text-[14px] font-black text-gray-400 ml-1 border-l border-gray-200 pl-1">
                 {Math.round(((currentStepIndex + 1) / STEPS.length) * 100)}%
               </span>
             </div>
          </div>
        )}
      </div>

      {/* Input Area (Fixed/Sticky Bottom) */}
      <div className="flex-none bg-white dark:bg-[#111b21] p-2 sm:p-3 border-t border-gray-100 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
        {renderInputArea()}
      </div>
    </div>
  );
};