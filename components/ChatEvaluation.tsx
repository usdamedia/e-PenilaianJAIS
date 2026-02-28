import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Bot, ChevronLeft, Share2, Loader2, LayoutDashboard, Smartphone, Square, Clock, PenLine, Image as ImageIcon, MapPin, Building2, CheckCircle2, Sparkles, RefreshCw, Beaker, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EvaluationFormData } from '../types';
import { LOCATIONS, ORGANIZERS, DURATIONS, EDUCATION_LEVELS, AGE_RANGES, PREMADE_COMMENTS, PREMADE_SUGGESTIONS, PROGRAM_VENUES } from '../constants';
import { CADANGAN_NAMA_PROGRAM } from '../NAMA_PROGRAM_CADANGAN';
import { submitEvaluation } from '../services/api';
import html2canvas from 'html2canvas';

interface ChatEvaluationProps {
  onBack: () => void;
  programSuggestions?: string[];
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
  type: 'text' | 'options' | 'date' | 'rating' | 'textarea' | 'select';
  options?: string[];
  uppercase?: boolean;
  prefill?: string;
  hideSuggestions?: boolean;
};

const STEPS: QuestionStep[] = [
  { 
    field: 'namaProgram', 
    question: "Assalamualaikum & Hai! Saya AI JAIS. Jom mulakan. Boleh berikan NAMA PROGRAM yang anda hadiri? (Ringkas & Huruf Besar)", 
    type: 'text', 
    uppercase: true,
    options: CADANGAN_NAMA_PROGRAM
  },
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
  { field: 'penganjurUtama', question: "Siapakah PENGANJUR UTAMA program ini?", type: 'select', options: ORGANIZERS },
  { 
    field: 'namaPenuh', 
    question: "Boleh berikan NAMA PENUH ANDA? (Sila Rujuk - Jika Penganjur Menyediakan Sijil)", 
    type: 'text', 
    uppercase: true 
  },
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

export const ChatEvaluation: React.FC<ChatEvaluationProps> = ({ onBack, programSuggestions = [] }) => {
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

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: steps[0].question }
  ]);
  const [formData, setFormData] = useState<Partial<EvaluationFormData>>({});
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
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      // Simulate Typing
      setMessages(prev => [...prev, { id: 'typing', sender: 'bot', text: '...', isTyping: true }]);
      
      const randomDelay = Math.floor(Math.random() * 800) + 800; // Slightly faster
      
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        addMessage('bot', steps[nextIndex].question);
      }, randomDelay);
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
      namaPenuh: 'AHMAD BIN ABDULLAH',
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
                   className="text-3xl font-black text-dark tracking-tight mb-2"
                 >
                   Terima Kasih!
                 </motion.h2>
                 <motion.p 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.6 }}
                   className="text-dark/80 font-bold text-sm max-w-xs leading-relaxed"
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
                               <p className="text-xs font-black text-dark uppercase tracking-wide">Kongsikan</p>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Media Sosial</p>
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
                      <div className="space-y-2.5">
                         <button 
                            onClick={handleSharePoster}
                            disabled={isSharing}
                            className="w-full bg-[#25D366] text-white py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all"
                         >
                            {isSharing ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                            Share WhatsApp Status
                         </button>
                         <button 
                            onClick={handleSaveToAlbum}
                            disabled={isSaving}
                            className="w-full bg-dark text-white py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all"
                         >
                             {isSaving ? <Loader2 className="animate-spin text-lime-400" size={18} /> : <ImageIcon size={18} className="text-lime-400" />}
                            Simpan ke Album
                         </button>
                      </div>
                  </div>

                  <button 
                    onClick={onBack} 
                    className="w-full mt-8 text-gray-400 hover:text-dark font-bold text-xs py-2 flex items-center justify-center gap-2 transition-colors"
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
                    <h2 className="text-lg font-black text-dark tracking-tight leading-none">Semak Jawapan</h2>
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
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        {step.field.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm font-bold text-dark leading-snug">
                        {formData[step.field]?.toString() || <span className="text-gray-300 italic">Tiada jawapan</span>}
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
                      <span className="text-[10px] font-black uppercase tracking-wider">Edit</span>
                    </button>
                  </motion.div>
                ))}
              </div>
           </div>

           <div className="p-6 bg-white border-t border-gray-100">
              <button
                onClick={() => setIsReviewing(false)}
                className="w-full bg-dark text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-black active:scale-95 transition-all"
              >
                SELESAI SEMAK
              </button>
           </div>
        </motion.div>
      );
    }

    // 3. SUBMIT CONFIRMATION (Ready to Submit)
    if (readyToSubmit) {
       return (
         <div className="p-4 bg-white border-t border-gray-100 space-y-3">
             <div className="bg-lime-50 border border-lime-200 rounded-xl p-3 text-xs text-lime-800 font-medium text-center">
                Semua soalan telah dijawab. Sila semak jawapan anda sebelum menghantar.
             </div>
             <div className="flex gap-2">
                <button
                  onClick={() => setIsReviewing(true)}
                  className="flex-1 bg-gray-100 text-dark py-4 rounded-2xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                   <PenLine size={18} /> SEMAK & EDIT
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex-[2] bg-lime-400 text-dark py-4 rounded-2xl font-black text-lg shadow-glow hover:bg-lime-500 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                   {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        ...
                      </>
                   ) : (
                      <>
                        HANTAR <Send size={20} strokeWidth={2.5} />
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
      case 'select':
        return (
          <div className="bg-white border-t border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Sparkles size={12} className="text-lime-600" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sila Pilih Dari Senarai</span>
            </div>
            <div className="relative group">
              <select
                className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-4 text-dark font-bold focus:ring-2 focus:ring-lime-400/50 focus:bg-white transition-all text-sm appearance-none cursor-pointer"
                onChange={(e) => {
                  if (e.target.value) {
                    handleNextStep(e.target.value);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>-- SILA PILIH PENGANJUR --</option>
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
          <div className="bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/50 border-b border-gray-100">
              <Sparkles size={12} className="text-lime-600" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sila Pilih Satu</span>
            </div>
            <div className="p-3 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
              {currentStep.options?.map((opt, idx) => (
                <motion.button
                  key={opt}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleNextStep(opt)}
                  className="shrink-0 px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-dark text-sm font-black shadow-sm hover:border-lime-400 hover:bg-lime-50 transition-all active:scale-95 flex items-center gap-2 group"
                >
                  <div className="w-2 h-2 rounded-full bg-gray-200 group-hover:bg-lime-500 transition-colors"></div>
                  {opt}
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 'rating':
        return (
          <div className="bg-white border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 py-2 bg-gray-50/50 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skala Penilaian (1-5)</span>
            </div>
            <div className="p-4 flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((num, idx) => (
                <motion.button
                  key={num}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleNextStep(num)}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border-2 border-gray-100 text-xl sm:text-2xl font-black text-dark hover:bg-lime-400 hover:border-lime-400 hover:text-black transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-90 flex items-center justify-center group"
                >
                  <span className="group-hover:scale-110 transition-transform">{num}</span>
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
           }} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
              <input 
                type="date" 
                required
                className="flex-1 bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-5 py-4 text-dark font-bold focus:ring-0 focus:border-lime-400 focus:bg-white transition-all text-sm uppercase shadow-inner"
                onChange={(e) => setInputText(e.target.value)}
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit" 
                className="bg-dark text-lime-400 w-14 h-14 rounded-[1.5rem] shadow-lg flex items-center justify-center shrink-0 disabled:opacity-50 disabled:grayscale" 
                disabled={!inputText}
              >
                <Send size={24} strokeWidth={2.5} className="ml-1" />
              </motion.button>
           </form>
        );

      case 'textarea':
        return (
          <div className="bg-white border-t border-gray-100">
             {/* Quick Chips */}
             <div className="flex flex-col p-3 gap-2 bg-gray-50/50 border-b border-gray-100">
                <div className="flex items-center gap-2 px-1">
                  <Sparkles size={12} className="text-lime-600 animate-pulse" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cadangan Pantas</span>
                </div>
                <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                   {currentStep.options?.map((opt, idx) => (
                      <motion.button 
                        key={opt} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleNextStep(opt)}
                        className="shrink-0 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-dark hover:border-lime-400 hover:bg-lime-50 transition-all active:scale-95 shadow-sm max-w-[280px] text-left line-clamp-2 leading-tight"
                      >
                        {opt}
                      </motion.button>
                   ))}
                   <button 
                     onClick={() => handleNextStep('TIADA')} 
                     className="shrink-0 px-4 py-2.5 bg-gray-100 border border-transparent rounded-xl text-xs font-black text-gray-500 hover:bg-gray-200 transition-all active:scale-95"
                   >
                     TIADA
                   </button>
                </div>
             </div>
             <form onSubmit={handleTextSubmit} className="p-3 flex gap-2 items-end bg-white">
                <div className="flex-1 relative group">
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value.toUpperCase())} // Force Upper
                    placeholder="TAIP KOMEN ANDA..."
                    className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-5 py-4 pr-12 text-dark font-bold focus:ring-0 focus:border-lime-400 focus:bg-white resize-none uppercase placeholder:normal-case placeholder:font-medium text-sm transition-all min-h-[56px] max-h-32 shadow-inner"
                    style={{ fieldSizing: 'content' } as any}
                  />
                  {inputText && (
                    <button 
                      type="button" 
                      onClick={() => setInputText('')}
                      className="absolute right-3 top-3 p-1.5 bg-gray-200 rounded-full text-gray-500 hover:bg-gray-300 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit" 
                  className="bg-dark text-lime-400 w-14 h-14 rounded-[1.5rem] shadow-lg flex items-center justify-center shrink-0"
                >
                  <Send size={24} strokeWidth={2.5} className="ml-1" />
                </motion.button>
             </form>
          </div>
        );

      default: // Text with potential suggestions
        const filteredOptions = currentStep.options?.filter(opt => 
          inputText.length > 0 && opt.toUpperCase().includes(inputText.toUpperCase())
        ) || [];

        return (
          <div className="bg-white border-t border-gray-100 relative">
            {/* Google Search Style Autocomplete */}
            {filteredOptions.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl max-h-60 overflow-y-auto z-50 rounded-2xl animate-in fade-in slide-in-from-bottom-2">
                <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2 sticky top-0 backdrop-blur-md">
                  <Sparkles size={12} className="text-lime-600 animate-pulse" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Padanan Dijumpai</span>
                </div>
                {filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      handleNextStep(opt);
                      setInputText('');
                    }}
                    className="w-full text-left p-3.5 hover:bg-lime-50 border-b border-gray-50 last:border-0 transition-colors flex items-start gap-3 group"
                  >
                    <div className="mt-0.5 p-1.5 bg-gray-100 rounded-lg group-hover:bg-lime-200 transition-colors">
                      <RefreshCw size={12} className="text-gray-400 group-hover:text-lime-700 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-dark leading-snug">
                        {/* Highlight matching part */}
                        {opt.split(new RegExp(`(${inputText})`, 'gi')).map((part, i) => (
                          part.toUpperCase() === inputText.toUpperCase() 
                            ? <span key={i} className="text-lime-700 bg-lime-200/50 px-0.5 rounded">{part}</span>
                            : <span key={i}>{part}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Static Suggestions (only when input is empty) */}
            {currentStep.options && inputText.length === 0 && (
              <div className="flex flex-col p-3 gap-2 bg-gray-50/50 border-b border-gray-100">
                <div className="flex items-center gap-2 px-1">
                  <Sparkles size={12} className="text-lime-600 animate-pulse" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cadangan Pantas</span>
                </div>
                <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                  {currentStep.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleNextStep(opt)}
                      className="shrink-0 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-dark hover:border-lime-400 hover:bg-lime-50 transition-all active:scale-95 shadow-sm max-w-[280px] text-left line-clamp-2 leading-tight"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleTextSubmit} className="p-2 sm:p-3 flex gap-2 items-center bg-white">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.toUpperCase())} // Force Upper
                  onFocus={(e) => e.target.select()}
                  placeholder="TAIP JAWAPAN ANDA..."
                  className="w-full bg-gray-100 border-0 rounded-[1.5rem] px-4 py-3 sm:px-5 sm:py-4 pr-12 text-dark font-bold focus:ring-2 focus:ring-lime-400/50 focus:bg-white uppercase placeholder:normal-case placeholder:font-medium text-sm transition-all"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {inputText && (
                    <button 
                      type="button" 
                      onClick={() => setInputText('')}
                      className="p-1.5 bg-gray-200 rounded-full text-gray-500 hover:bg-gray-300 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <button 
                type="submit" 
                className="bg-dark text-lime-400 w-12 h-12 sm:w-14 sm:h-14 rounded-[1.5rem] shadow-lg hover:bg-black hover:scale-105 transition-all active:scale-90 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:grayscale disabled:scale-100" 
                disabled={!inputText.trim()}
              >
                <Send size={20} sm:size={24} strokeWidth={2.5} className="ml-1" />
              </button>
            </form>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-dvh sm:h-[680px] w-full max-w-lg mx-auto bg-white sm:rounded-[2rem] shadow-2xl overflow-hidden sm:border border-gray-100 relative transition-all duration-500">
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
            <h3 className="font-black text-dark text-sm tracking-tight leading-none uppercase">AI JAIS</h3>
            <div className="flex items-center gap-1 mt-1 sm:mt-1">
               <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 animate-pulse"></div>
               <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">Aktif</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
            {!isCompleted && !readyToSubmit && (
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={activateSandboxMode} 
                className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-lime-600 transition-all" 
                title="Sandbox Mode"
              >
                <Beaker size={18}/>
              </motion.button>
            )}
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-6 bg-white sm:bg-gray-50/50 pb-4 sm:pb-32 scroll-smooth no-scrollbar sm:custom-scrollbar overscroll-contain">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'bot' && (
                <div className="w-8 h-8 rounded-xl bg-lime-400 flex items-center justify-center text-black shrink-0 shadow-sm mb-1 border border-lime-500/20">
                  <Bot size={18} />
                </div>
              )}

              <div
                className={`
                  max-w-[85%] px-4 py-3 sm:px-5 sm:py-3.5 text-sm leading-relaxed shadow-sm relative group transition-all
                  ${msg.sender === 'user' 
                    ? 'bg-dark text-white rounded-2xl rounded-br-none hover:shadow-md' 
                    : 'bg-gray-100 sm:bg-white text-dark rounded-2xl rounded-bl-none border-0 sm:border border-gray-100 hover:border-gray-200 hover:shadow-md'
                  }
                `}
              >
                {msg.isTyping ? (
                  <div className="flex gap-1.5 h-5 items-center px-1">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
                )}
                
                {/* Subtle timestamp or indicator could go here */}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 shrink-0 shadow-sm mb-1 border border-gray-300/20">
                  <User size={18} />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Floating Progress Indicator */}
        {!isCompleted && !readyToSubmit && (
          <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10">
             <div className="bg-white/90 backdrop-blur shadow-lg border border-gray-100 px-4 py-1.5 rounded-full flex items-center gap-2">
               <div className="flex gap-1">
                  {STEPS.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentStepIndex ? 'bg-lime-500 scale-125' : idx < currentStepIndex ? 'bg-lime-200' : 'bg-gray-200'}`}
                    />
                  ))}
               </div>
               <span className="text-[10px] font-black text-gray-400 ml-2 border-l border-gray-200 pl-2">
                 {Math.round(((currentStepIndex + 1) / STEPS.length) * 100)}%
               </span>
             </div>
          </div>
        )}
      </div>

      {/* Input Area (Sticky Bottom) */}
      <div className="shrink-0 bg-white border-t sm:border-t border-gray-100 pb-5 sm:pb-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] sm:shadow-none">
         {renderInputArea()}
      </div>
    </div>
  );
};