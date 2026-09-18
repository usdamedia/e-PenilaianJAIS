import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, Bot, ChevronLeft, ChevronRight, Share2, Loader2, Square, Smartphone, 
  Clock, PenLine, Image as ImageIcon, MapPin, Building2, CheckCircle2, 
  Sparkles, RefreshCw, X, Check, ArrowRight, Mail, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EvaluationFormData } from '../types';
import { 
  LOCATIONS, ORGANIZERS, DURATIONS, EDUCATION_LEVELS, AGE_RANGES, 
  PREMADE_COMMENTS, PREMADE_SUGGESTIONS, PROGRAM_VENUES 
} from '../constants';
import { CADANGAN_NAMA_PROGRAM } from '../NAMA_PROGRAM_CADANGAN';
import { submitEvaluation } from '../services/api';
import html2canvas from 'html2canvas';
import LogoImage from './LogoImage';

interface ChatEvaluationProps {
  onBack: () => void;
  onSubmitSuccess?: () => void;
  onOpenRefleksi?: () => void;
  programSuggestions?: string[];
  initialData?: Partial<EvaluationFormData>;
  isLocked?: boolean;
}

type QuestionStep = {
  field: keyof EvaluationFormData;
  question: string;
  type: 'text' | 'options' | 'date' | 'rating' | 'textarea' | 'select' | 'netflix-profile' | 'email';
  options?: string[];
  uppercase?: boolean;
  lowercase?: boolean;
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
    question: "Assalamualaikum & hai! Saya e-Penilaian Program JAIS. Jom mulakan. Boleh berikan nama program yang anda hadiri?", 
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
  {
    field: 'emel',
    question: "Sila masukkan alamat emel anda (e-sijil penyertaan rasmi akan dihantar ke emel ini selepas kelulusan pentadbir):",
    type: 'email',
    lowercase: true
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
  onOpenRefleksi,
  programSuggestions = [],
  initialData = {},
  isLocked = false
}) => {
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

  const [formData, setFormData] = useState<Partial<EvaluationFormData>>(initialData);
  const [inputText, setInputText] = useState('');

  // Logic States
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poster & Cert logic
  const posterRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posterRatio, setPosterRatio] = useState<'square' | 'story'>('square');

  const [isEditing, setIsEditing] = useState(false);

  const currentStep = steps[currentStepIndex];

  // Sync initial step
  useEffect(() => {
    let startIndex = 0;
    if (isLocked) {
      while (startIndex < steps.length && formData[steps[startIndex].field]) {
        startIndex++;
      }
    }
    if (startIndex < steps.length) {
      setCurrentStepIndex(startIndex);
    } else {
      setIsReviewing(true);
      setReadyToSubmit(true);
    }
  }, [steps, isLocked]);

  // Sync inputText when changing step
  useEffect(() => {
    if (steps[currentStepIndex]) {
      const field = steps[currentStepIndex].field;
      const val = formData[field];
      if (val !== undefined && val !== null && val !== '-') {
        setInputText(String(val));
      } else {
        setInputText('');
      }
    }
  }, [currentStepIndex, steps, formData]);

  const handleNextStep = async (value: any) => {
    const updatedData = { ...formData, [currentStep.field]: value };
    setFormData(updatedData);

    if (isEditing) {
      setIsEditing(false);
      setIsReviewing(true);
      setReadyToSubmit(true);
      return;
    }

    if (currentStepIndex < steps.length - 1) {
      let nextIndex = currentStepIndex + 1;

      // Skip namaPenuh and emel if adaSijil is TIADA
      while (
        steps[nextIndex] && 
        (steps[nextIndex].field === 'namaPenuh' || steps[nextIndex].field === 'emel') && 
        updatedData.adaSijil === 'TIADA'
      ) {
        if (steps[nextIndex].field === 'namaPenuh') updatedData.namaPenuh = '-';
        if (steps[nextIndex].field === 'emel') updatedData.emel = '-';
        setFormData(updatedData);
        nextIndex++;
      }

      // Skip prefilled steps if locked
      if (isLocked) {
        while (nextIndex < steps.length && updatedData[nextIndex] && updatedData[steps[nextIndex].field]) {
          nextIndex++;
        }
      }

      if (nextIndex < steps.length) {
        setCurrentStepIndex(nextIndex);
      } else {
        setReadyToSubmit(true);
        handleFinalSubmit(updatedData);
      }
    } else {
      setReadyToSubmit(true);
      handleFinalSubmit(updatedData);
    }
  };

  const handlePrevStep = () => {
    if (isReviewing) {
      setIsReviewing(false);
      return;
    }

    if (currentStepIndex > 0) {
      let prevIndex = currentStepIndex - 1;

      // Skip namaPenuh and emel backward if adaSijil is TIADA
      while (
        prevIndex >= 0 && 
        (steps[prevIndex].field === 'namaPenuh' || steps[prevIndex].field === 'emel') && 
        formData.adaSijil === 'TIADA'
      ) {
        prevIndex--;
      }

      // Skip locked pre-filled steps backward
      if (isLocked) {
        while (prevIndex >= 0 && initialData[steps[prevIndex].field]) {
          prevIndex--;
        }
      }

      if (prevIndex >= 0) {
        setCurrentStepIndex(prevIndex);
        setIsEditing(false);
        setReadyToSubmit(false);
      } else {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleFinalSubmit = async (overrideData?: Partial<EvaluationFormData>) => {
    const dataToSubmit = overrideData || formData;
    setIsSubmitting(true);
    setReadyToSubmit(false);
    setCountdown(20);

    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await submitEvaluation(dataToSubmit as EvaluationFormData);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(null);
      setIsSubmitting(false);
      setIsCompleted(true);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error) {
      console.error("Submission error:", error);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(null);
      setIsSubmitting(false);
      setReadyToSubmit(true);
      alert("Gagal menghantar borang. Sila cuba lagi.");
    }
  };

  // Helper validation
  const isCurrentStepValid = (): boolean => {
    if (!currentStep) return false;
    const field = currentStep.field;
    const val = formData[field];

    if (currentStep.type === 'textarea') {
      return true; // Textarea input is optional (defaults to TIADA if blank)
    }

    if (currentStep.type === 'email' || currentStep.field === 'emel') {
      const emailToCheck = (inputText.trim() || String(val || '').trim()).toLowerCase();
      if (!emailToCheck || emailToCheck === '-') return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToCheck);
    }

    if (currentStep.type === 'text' || currentStep.type === 'date') {
      if (inputText.trim().length > 0) return true;
      if (val !== undefined && val !== null && String(val).trim().length > 0 && val !== '-') return true;
      return false;
    }

    if (currentStep.type === 'rating') {
      return typeof val === 'number' && val >= 1 && val <= 5;
    }
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentStep.type === 'email' || currentStep.field === 'emel') {
      const cleaned = inputText.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        return;
      }
      handleNextStep(cleaned);
      return;
    }
    if (!inputText.trim()) return;
    const finalVal = currentStep.uppercase ? inputText.toUpperCase() : (currentStep.lowercase ? inputText.toLowerCase().trim() : inputText);
    handleNextStep(finalVal);
  };

  // Social share poster handlers
  const handleSharePoster = async () => {
    if (!posterRef.current) return;
    setIsSharing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        backgroundColor: '#0F0F0F',
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        removeContainer: true,
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
      if (!blob) throw new Error("Gagal menjana imej");

      const fileName = `Tamat_Kursus_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Selesai Program',
          text: `Alhamdulillah, selesai program ${formData.namaProgram}! ✨`
        });
      } else {
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

  const getTitleFontSize = (text: string) => {
    const length = text?.length || 0;
    if (length > 50) return 'text-[12px]';
    if (length > 35) return 'text-[16px]';
    if (length > 20) return 'text-[20px]';
    return 'text-[22px]';
  };

  // Progress percentage calculation
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  // Render question inputs
  const renderQuestionInput = () => {
    if (!currentStep) return null;

    const currentValue = formData[currentStep.field];

    switch (currentStep.type) {
      case 'netflix-profile':
        return (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
            {/* ADA Option */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNextStep('ADA')}
              className={`
                min-h-[58px] sm:min-h-[64px] p-4 rounded-2xl border font-bold text-sm sm:text-base flex items-center justify-between transition-all ios-press
                ${currentValue === 'ADA' 
                  ? 'bg-green-500/10 border-green-500 text-gray-900 ring-2 ring-green-500/20 shadow-ios' 
                  : 'bg-[#F2F2F7] border-black/[0.04] text-[#1C1C1E] hover:bg-[#E5E5EA]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentValue === 'ADA' ? 'bg-[#34C759] text-white shadow-xs' : 'bg-white text-gray-500 border border-black/[0.06]'}`}>
                  <Check size={16} strokeWidth={2.8} />
                </div>
                <span className="font-semibold tracking-tight">Ada</span>
              </div>
              {currentValue === 'ADA' && <CheckCircle2 size={18} className="text-[#34C759] shrink-0" />}
            </motion.button>

            {/* TIADA Option */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNextStep('TIADA')}
              className={`
                min-h-[58px] sm:min-h-[64px] p-4 rounded-2xl border font-bold text-sm sm:text-base flex items-center justify-between transition-all ios-press
                ${currentValue === 'TIADA' 
                  ? 'bg-red-500/10 border-red-500 text-gray-900 ring-2 ring-red-500/20 shadow-ios' 
                  : 'bg-[#F2F2F7] border-black/[0.04] text-[#1C1C1E] hover:bg-[#E5E5EA]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentValue === 'TIADA' ? 'bg-[#FF3B30] text-white shadow-xs' : 'bg-white text-gray-500 border border-black/[0.06]'}`}>
                  <X size={16} strokeWidth={2.8} />
                </div>
                <span className="font-semibold tracking-tight">Tiada</span>
              </div>
              {currentValue === 'TIADA' && <CheckCircle2 size={18} className="text-[#FF3B30] shrink-0" />}
            </motion.button>
          </div>
        );

      case 'options':
        const isShortList = (currentStep.options?.length || 0) <= 4 && currentStep.options?.every(o => o.length <= 15);
        return (
          <div className={`pt-1 ${isShortList ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-2'}`}>
            {currentStep.options?.map((opt) => {
              const isSelected = currentValue === opt;
              return (
                <motion.button
                  key={opt}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNextStep(opt)}
                  className={`
                    min-h-[52px] sm:min-h-[56px] px-4 py-3 rounded-2xl border transition-all text-left font-semibold text-sm sm:text-base flex items-center justify-between shadow-2xs group ios-press
                    ${isSelected 
                      ? 'bg-lime-400/15 border-lime-500 text-[#1C1C1E] ring-2 ring-lime-400/30' 
                      : 'bg-[#F2F2F7] border-black/[0.04] text-[#1C1C1E] hover:bg-[#E5E5EA]'
                    }
                  `}
                >
                  <span className="leading-snug pr-2 tracking-tight">{opt}</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-lime-400 text-black shadow-xs' : 'border border-black/20 bg-white group-hover:border-black/40'}`}>
                    {isSelected ? <Check size={13} strokeWidth={3} /> : null}
                  </div>
                </motion.button>
              );
            })}
          </div>
        );

      case 'select':
        return (
          <div className="pt-1 space-y-3">
            <div className="relative">
              <select
                value={String(currentValue || '')}
                onChange={(e) => {
                  if (e.target.value) {
                    handleNextStep(e.target.value);
                  }
                }}
                className="w-full min-h-[54px] bg-[#F2F2F7] border border-black/[0.06] rounded-2xl px-4 py-3 text-[#1C1C1E] font-semibold text-sm sm:text-base focus:bg-white focus:ring-4 focus:ring-lime-400/20 focus:border-lime-500 transition-all appearance-none cursor-pointer shadow-2xs"
              >
                <option value="" disabled>-- Sila pilih dari senarai --</option>
                {currentStep.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronLeft size={18} className="-rotate-90" />
              </div>
            </div>

            {/* Quick Option Cards for top organizers */}
            {currentStep.options && currentStep.options.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-500 tracking-tight px-1">Atau pilih penganjur popular:</p>
                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {currentStep.options.slice(0, 8).map((opt) => {
                    const isSelected = currentValue === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleNextStep(opt)}
                        className={`
                          px-3.5 py-2 rounded-xl border text-left text-xs font-semibold transition-all flex items-center gap-1.5 ios-press
                          ${isSelected 
                            ? 'bg-lime-400 text-black border-lime-500 font-bold shadow-xs' 
                            : 'bg-[#F2F2F7] border-black/[0.04] text-gray-700 hover:bg-[#E5E5EA]'
                          }
                        `}
                      >
                        <span>{opt}</span>
                        {isSelected && <CheckCircle2 size={13} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'rating':
        return (
          <div className="pt-1 space-y-3">
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
              {[1, 2, 3, 4, 5].map((num) => {
                const isSelected = currentValue === num;
                return (
                  <motion.button
                    key={num}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleNextStep(num)}
                    className={`
                      min-h-[56px] sm:min-h-[64px] rounded-2xl border flex flex-col items-center justify-center transition-all ios-press
                      ${isSelected 
                        ? 'bg-lime-400 border-lime-500 text-black font-extrabold ring-4 ring-lime-400/25 shadow-ios scale-[1.02]' 
                        : 'bg-[#F2F2F7] border-black/[0.04] text-[#1C1C1E] font-bold hover:bg-[#E5E5EA]'
                      }
                    `}
                  >
                    <span className="text-xl sm:text-2xl leading-none tracking-tight">{num}</span>
                    <span className="text-[10px] font-medium opacity-75 mt-1 tracking-tight">
                      {num === 1 ? 'Rendah' : num === 5 ? 'Cemerlang' : `Skala ${num}`}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-xs font-medium text-gray-500 px-1 pt-1">
              <span>1 = Rendah</span>
              <span>5 = Cemerlang (Wajib Pilih)</span>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="pt-1 space-y-3">
            <input 
              type="date" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full min-h-[54px] bg-[#F2F2F7] border border-black/[0.06] rounded-2xl px-4 py-3 text-[#1C1C1E] font-bold text-base focus:bg-white focus:ring-4 focus:ring-lime-400/20 focus:border-lime-500 transition-all shadow-2xs"
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="pt-1 space-y-3">
            <div className="relative">
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(currentStep.uppercase ? e.target.value.toUpperCase() : e.target.value)}
                placeholder="Taip jawapan atau maklum balas anda di sini..."
                className="w-full bg-[#F2F2F7] border border-black/[0.06] rounded-2xl p-4 text-[#1C1C1E] font-medium text-sm sm:text-base focus:bg-white focus:ring-4 focus:ring-lime-400/20 focus:border-lime-500 transition-all shadow-2xs resize-none min-h-[105px]"
              />
              {inputText && (
                <button 
                  type="button" 
                  onClick={() => setInputText('')} 
                  className="absolute right-3 top-3 p-1.5 bg-black/10 hover:bg-black/15 rounded-full text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Chips */}
            {currentStep.options && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 tracking-tight px-1">Pilihan Pantas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentStep.options.map((opt) => (
                    <button 
                      key={opt} 
                      type="button"
                      onClick={() => {
                        setInputText(opt);
                        handleNextStep(opt);
                      }}
                      className="px-3.5 py-2 bg-[#F2F2F7] border border-black/[0.04] hover:bg-[#E5E5EA] rounded-xl text-xs font-semibold text-[#1C1C1E] transition-all ios-press text-left"
                    >
                      {opt}
                    </button>
                  ))}
                  <button 
                    type="button"
                    onClick={() => {
                      setInputText('TIADA');
                      handleNextStep('TIADA');
                    }} 
                    className="px-3.5 py-2 bg-[#E5E5EA] hover:bg-gray-300 rounded-xl text-xs font-bold text-gray-800 transition-all ios-press"
                  >
                    Tiada
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'email': {
        const emailValue = inputText.trim().toLowerCase();
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

        return (
          <div className="pt-1 space-y-3">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={inputText}
                onChange={(e) => setInputText(e.target.value.toLowerCase().trim())}
                placeholder="contoh: peserta@gmail.com"
                className={`w-full min-h-[54px] bg-[#F2F2F7] border rounded-2xl pl-11 pr-10 py-3 text-[#1C1C1E] font-semibold text-sm sm:text-base focus:bg-white focus:ring-4 transition-all shadow-2xs ${
                  inputText.length > 0 && !isValidEmail 
                    ? 'border-amber-400 focus:ring-amber-400/20 focus:border-amber-500' 
                    : 'border-black/[0.06] focus:ring-lime-400/20 focus:border-lime-500'
                }`}
                autoFocus
              />
              {inputText && (
                <button 
                  type="button" 
                  onClick={() => setInputText('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/10 hover:bg-black/15 rounded-full text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {inputText.length > 0 && !isValidEmail && (
              <motion.p 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-semibold text-amber-600 px-1 flex items-center gap-1.5"
              >
                <AlertCircle size={13} className="shrink-0" />
                <span>Sila masukkan format emel yang sah (cth: nama@email.com)</span>
              </motion.p>
            )}

            {isValidEmail && (
              <motion.p 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-semibold text-emerald-600 px-1 flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                <span>Format emel sah. Sedia untuk menerima e-sijil.</span>
              </motion.p>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2.5">
              <Mail size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Pautan muat turun e-sijil penyertaan rasmi JAIS akan dihantar ke alamat emel ini selepas disahkan oleh urus setia program.
              </p>
            </div>
          </div>
        );
      }

      default: // 'text'
        const upperInputText = inputText.toUpperCase();
        const filteredOptions = currentStep.options?.filter(opt => 
          inputText.length > 0 && opt.toUpperCase().includes(upperInputText)
        ) || [];

        return (
          <div className="pt-1 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(currentStep.uppercase ? e.target.value.toUpperCase() : e.target.value)}
                placeholder="Taip jawapan anda..."
                className="w-full min-h-[54px] bg-[#F2F2F7] border border-black/[0.06] rounded-2xl px-4 py-3 pr-10 text-[#1C1C1E] font-semibold text-sm sm:text-base focus:bg-white focus:ring-4 focus:ring-lime-400/20 focus:border-lime-500 transition-all shadow-2xs"
                autoFocus
              />
              {inputText && (
                <button 
                  type="button" 
                  onClick={() => setInputText('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/10 hover:bg-black/15 rounded-full text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtered Search Results */}
            {filteredOptions.length > 0 && (
              <div className="bg-white border border-black/[0.08] rounded-2xl shadow-ios-sheet max-h-48 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                {filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setInputText(opt);
                      handleNextStep(opt);
                    }}
                    className="w-full text-left p-3 hover:bg-[#F2F2F7] text-xs sm:text-sm font-semibold text-[#1C1C1E] transition-colors flex items-center justify-between"
                  >
                    <span className="pr-2">{opt}</span>
                    <ArrowRight size={14} className="text-lime-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Default Quick Options */}
            {currentStep.options && inputText.length === 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 tracking-tight px-1">Cadangan Nama/Lokasi:</p>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {currentStep.options.slice(0, 10).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setInputText(opt);
                        handleNextStep(opt);
                      }}
                      className="px-3.5 py-2 bg-[#F2F2F7] border border-black/[0.04] hover:bg-[#E5E5EA] rounded-xl text-xs font-semibold text-[#1C1C1E] transition-all ios-press text-left"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 w-full max-w-2xl mx-auto bg-[#F2F2F7] text-[#1C1C1E] relative overflow-x-hidden">
      {/* 1. STICKY HEADER - Apple Frosted Glass Nav Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] shadow-2xs px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          {/* Bot Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white rounded-2xl p-1.5 shadow-2xs border border-black/[0.06] flex items-center justify-center">
              <LogoImage />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-[#1C1C1E] text-sm sm:text-base tracking-tight leading-none">e-Penilaian JAIS</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]"></span>
                  Aktif
                </span>
              </div>
            </div>
          </div>

          {/* Step Count Badge & Back/Close */}
          <div className="flex items-center gap-1.5">
            {!isCompleted && !isReviewing && (
              <div className="flex items-center gap-1.5">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsReviewing(true)}
                    className="text-xs font-semibold text-gray-700 bg-black/5 hover:bg-black/10 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ios-press"
                    title="Semak semua jawapan"
                  >
                    <PenLine size={12} />
                    <span>Semak</span>
                  </button>
                )}
                <span className="text-xs font-semibold text-gray-500 bg-black/[0.04] px-2.5 py-1 rounded-full">
                  {currentStepIndex + 1} / {steps.length}
                </span>
              </div>
            )}
            <button 
              type="button"
              onClick={onBack} 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-gray-500 hover:text-[#1C1C1E] transition-colors ios-press"
              title="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Apple Segmented Progress Bar */}
        {!isCompleted && !isReviewing && (
          <div className="space-y-1.5">
            <div className="w-full bg-black/[0.06] h-1.5 rounded-full overflow-hidden">
              <motion.div 
                className="bg-lime-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-medium text-gray-400 px-0.5">
              <span>{progressPercent}% selesai</span>
              <span>Langkah {currentStepIndex + 1} daripada {steps.length}</span>
            </div>
          </div>
        )}
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 pb-32 justify-start max-w-2xl mx-auto w-full">
        {/* SUCCESS VIEW */}
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center space-y-6"
          >
            {/* Header Box */}
            <div className="w-full bg-gradient-to-b from-lime-400 to-lime-500 p-8 rounded-3xl text-center shadow-ios-card relative overflow-hidden text-black space-y-3">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#34C759] mx-auto shadow-ios">
                <CheckCircle2 size={36} strokeWidth={2.6} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Terima Kasih!</h2>
              <p className="text-sm font-semibold text-black/80 max-w-sm mx-auto leading-relaxed">
                Penilaian anda terhadap Program Jabatan Agama Islam Sarawak telah berjaya dihantar.
              </p>
            </div>

            {/* Refleksi Harian Card */}
            <div className="w-full bg-white rounded-3xl p-5 sm:p-6 border border-black/[0.06] shadow-ios-card space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Sparkles size={24} />
              </div>
              <div>
                <p className="font-bold text-base text-[#1C1C1E] tracking-tight">Refleksi Harian JAIS</p>
                <p className="text-sm text-gray-500 font-medium">Jana dan kongsikan kata-kata refleksi harian secara visual.</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button 
                  onClick={() => {
                    if (onOpenRefleksi) {
                      onOpenRefleksi();
                    }
                  }}
                  className="w-full bg-[#1C1C1E] text-lime-400 py-3.5 rounded-2xl font-bold text-sm shadow-xs flex items-center justify-center gap-2 hover:bg-black ios-press transition-all"
                >
                  Buka Modul Refleksi Harian
                </button>
              </div>
            </div>

            <button 
              onClick={onBack} 
              className="text-gray-500 hover:text-[#1C1C1E] font-semibold text-sm py-2 flex items-center gap-2 transition-colors ios-press"
            >
              <RefreshCw size={14}/> Kembali ke Halaman Utama
            </button>
          </motion.div>
        )}

        {/* REVIEW OVERLAY */}
        {!isCompleted && isReviewing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/[0.06] shadow-ios-card flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1C1C1E] tracking-tight">Semakan Jawapan</h2>
                <p className="text-xs text-gray-500 font-medium">Sila semak semula jawapan anda sebelum menghantar.</p>
              </div>
              <button 
                onClick={() => setIsReviewing(false)}
                className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-gray-500 hover:text-black transition-colors ios-press"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div 
                  key={step.field} 
                  className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-2xs flex justify-between items-center gap-3"
                >
                  <div className="space-y-0.5 flex-1 pr-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Soalan {idx + 1} • {step.field.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-xs font-semibold text-gray-600 line-clamp-1">{step.question}</p>
                    <p className="text-sm font-bold text-[#1C1C1E] pt-0.5">
                      {step.field === 'ratingJamuan' && formData[step.field] === 0 
                        ? 'Tiada jamuan' 
                        : (formData[step.field]?.toString() || <span className="text-gray-400 italic font-normal">Tiada jawapan</span>)}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setCurrentStepIndex(idx);
                      setIsReviewing(false);
                      setReadyToSubmit(false);
                      setIsEditing(true);
                    }}
                    className="px-3 py-1.5 bg-black/5 text-[#1C1C1E] rounded-xl font-semibold text-xs hover:bg-black/10 transition-all flex items-center gap-1 shrink-0 ios-press"
                  >
                    <PenLine size={12} />
                    <span>Edit</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#1C1C1E] text-white py-4 rounded-2xl font-bold text-base shadow-ios hover:bg-black ios-press transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin text-lime-400" size={20} /> : <Send size={20} className="text-lime-400" />}
                <span>Sahkan & Hantar Sekarang</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ACTIVE QUESTION STEP (Conversational Survey Card) */}
        {!isCompleted && !isReviewing && currentStep && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${currentStepIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-4 pt-2"
            >
              {/* Question Card - Apple Inset Grouped Card */}
              <div className="bg-white rounded-3xl border border-black/[0.06] shadow-ios-card p-6 sm:p-8 space-y-4">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F2F7] text-gray-700 text-xs font-semibold border border-black/[0.04]">
                    <Sparkles size={12} className="text-lime-600" />
                    Soalan {currentStepIndex + 1} daripada {steps.length}
                  </span>
                  {formData[currentStep.field] && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-500/10 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 size={12} className="text-[#34C759]" /> Dijawab
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <h2 className="text-xl sm:text-2xl font-bold text-[#1C1C1E] leading-snug tracking-tight">
                  {currentStep.question}
                </h2>

                {/* Instruction Hint */}
                <p className="text-xs sm:text-sm font-medium text-gray-500">
                  {currentStep.type === 'rating' ? 'Sila pilih skala penilaian dari 0 hingga 5' :
                   currentStep.type === 'options' || currentStep.type === 'netflix-profile' ? 'Sila pilih satu daripada pilihan berikut:' :
                   currentStep.type === 'select' ? 'Sila pilih dari senarai penganjur:' :
                   currentStep.type === 'date' ? 'Sila masukkan tarikh berkenaan:' :
                   currentStep.type === 'email' ? 'Sila masukkan alamat emel aktif anda:' :
                   'Taip atau pilih jawapan anda di bawah:'}
                </p>

                {/* Options / Input Component */}
                {renderQuestionInput()}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* 3. STICKY FOOTER NAVIGATION - Apple Floating Toolbar */}
      {!isCompleted && !isReviewing && (
        <footer 
          className="fixed bottom-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-t border-black/[0.06] px-4 py-3 sm:px-6 sm:py-3.5 shadow-ios"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex items-center gap-3 max-w-2xl mx-auto w-full">
            {/* Back Button */}
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex-1 min-h-[50px] px-4 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] font-semibold text-sm sm:text-base hover:bg-[#E5E5EA] ios-press transition-all flex items-center justify-center gap-1.5 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
              <span>Kembali</span>
            </button>

            {/* Next / Submit Button */}
            <button
              type="button"
              onClick={() => {
                let valToSave: any = undefined;
                if (currentStep.type === 'email') {
                  const cleanedEmail = (inputText.trim() || String(formData[currentStep.field] || '').trim()).toLowerCase();
                  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
                    valToSave = cleanedEmail;
                  }
                } else if (currentStep.type === 'text' || currentStep.type === 'date' || currentStep.type === 'textarea') {
                  if (inputText.trim()) {
                    valToSave = currentStep.uppercase ? inputText.toUpperCase() : inputText;
                  } else if (formData[currentStep.field]) {
                    valToSave = formData[currentStep.field];
                  } else if (currentStep.type === 'textarea') {
                    valToSave = 'TIADA';
                  }
                } else {
                  valToSave = formData[currentStep.field];
                }

                if (valToSave !== undefined && valToSave !== null && valToSave !== '') {
                  handleNextStep(valToSave);
                } else if (currentStepIndex === steps.length - 1 || readyToSubmit) {
                  handleFinalSubmit();
                }
              }}
              disabled={!isCurrentStepValid() || isSubmitting}
              className="flex-[2] min-h-[50px] px-4 py-3 rounded-2xl bg-[#1C1C1E] text-white font-bold text-sm sm:text-base hover:bg-black shadow-ios ios-press transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin text-lime-400" size={18} />
                  <span>Menghantar...</span>
                </>
              ) : (
                <>
                  <span>
                    {readyToSubmit || currentStepIndex === steps.length - 1 ? 'Hantar Penilaian' : 'Seterusnya'}
                  </span>
                  {readyToSubmit || currentStepIndex === steps.length - 1 ? (
                    <Send size={18} className="text-lime-400" />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </>
              )}
            </button>
          </div>
        </footer>
      )}

      {/* 4. COUNTDOWN OVERLAY DURING SUBMISSION */}
      <AnimatePresence>
        {isSubmitting && countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-gray-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="text-center"
            >
              {/* Circular SVG Timer */}
              <div className="relative w-36 h-36 mx-auto mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="70" cy="70" r="62"
                    fill="none"
                    stroke="#a3e635"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 62}
                    strokeDashoffset={2 * Math.PI * 62 * (1 - (countdown / 20))}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl font-black text-white tabular-nums">{countdown}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 mb-3">
                <Loader2 className="animate-spin text-lime-400" size={22} />
                <span className="text-white font-bold text-xl tracking-tight">Menghantar penilaian</span>
              </div>

              <p className="text-gray-400 text-sm font-medium">
                ...sedang menyimpan penilaian kepada pangkalan data...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
