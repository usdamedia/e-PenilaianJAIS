import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, Bot, ChevronLeft, ChevronRight, Share2, Loader2, Square, Smartphone, 
  Clock, PenLine, Image as ImageIcon, MapPin, Building2, CheckCircle2, 
  Sparkles, RefreshCw, X, Check, ArrowRight, Calendar
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
  programSuggestions?: string[];
  initialData?: Partial<EvaluationFormData>;
  isLocked?: boolean;
}

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

      // Skip namaPenuh if adaSijil is TIADA
      if (steps[nextIndex] && steps[nextIndex].field === 'namaPenuh' && updatedData.adaSijil === 'TIADA') {
        updatedData.namaPenuh = '-';
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

      // Skip namaPenuh backward if adaSijil is TIADA
      if (steps[prevIndex] && steps[prevIndex].field === 'namaPenuh' && formData.adaSijil === 'TIADA') {
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

    if (currentStep.type === 'text' || currentStep.type === 'date') {
      if (inputText.trim().length > 0) return true;
      if (val !== undefined && val !== null && String(val).trim().length > 0 && val !== '-') return true;
      return false;
    }

    if (val !== undefined && val !== null && val !== '') return true;
    return false;
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const finalVal = currentStep.uppercase ? inputText.toUpperCase() : inputText;
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
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNextStep('ADA')}
              className={`
                min-h-[56px] sm:min-h-[64px] p-4 rounded-xl sm:rounded-2xl border-2 font-bold text-sm sm:text-base flex items-center justify-between transition-all shadow-xs
                ${currentValue === 'ADA' 
                  ? 'bg-green-50/90 border-green-500 text-green-900 ring-2 ring-green-500/20' 
                  : 'bg-white border-gray-200 text-gray-800 hover:border-green-400 hover:bg-green-50/30'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentValue === 'ADA' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'}`}>
                  <Check size={18} strokeWidth={3} />
                </div>
                <span>Ada</span>
              </div>
              {currentValue === 'ADA' && <CheckCircle2 size={20} className="text-green-600 shrink-0" />}
            </motion.button>

            {/* TIADA Option */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNextStep('TIADA')}
              className={`
                min-h-[56px] sm:min-h-[64px] p-4 rounded-xl sm:rounded-2xl border-2 font-bold text-sm sm:text-base flex items-center justify-between transition-all shadow-xs
                ${currentValue === 'TIADA' 
                  ? 'bg-red-50/90 border-red-500 text-red-900 ring-2 ring-red-500/20' 
                  : 'bg-white border-gray-200 text-gray-800 hover:border-red-300 hover:bg-red-50/20'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentValue === 'TIADA' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-500'}`}>
                  <X size={18} strokeWidth={3} />
                </div>
                <span>Tiada</span>
              </div>
              {currentValue === 'TIADA' && <CheckCircle2 size={20} className="text-red-500 shrink-0" />}
            </motion.button>
          </div>
        );

      case 'options':
        const optLength = currentStep.options?.length || 0;
        const allShort = currentStep.options?.every(o => o.length <= 22);
        const useGrid = (optLength <= 4 && currentStep.options?.every(o => o.length <= 15)) || (optLength > 4 && allShort);
        return (
          <div className={`pt-1 touch-pan-y ${useGrid ? 'grid grid-cols-2 gap-2 sm:gap-2.5' : 'flex flex-col gap-2.5'}`}>
            {currentStep.options?.map((opt) => {
              const isSelected = currentValue === opt;
              return (
                <motion.button
                  key={opt}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleNextStep(opt)}
                  className={`
                    min-h-[48px] sm:min-h-[54px] px-3.5 py-2.5 rounded-xl sm:rounded-2xl border transition-all text-left font-bold text-xs sm:text-sm flex items-center justify-between shadow-xs group active:scale-95 touch-manipulation cursor-pointer
                    ${isSelected 
                      ? 'bg-lime-50 border-lime-500 text-lime-950 ring-2 ring-lime-400/30' 
                      : 'bg-white border-gray-200 text-gray-800 hover:border-lime-400 hover:bg-lime-50/20'
                    }
                  `}
                >
                  <span className="leading-tight pr-1.5 break-words line-clamp-2">{opt}</span>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-lime-500 text-black' : 'border border-gray-300 group-hover:border-lime-400'}`}>
                    {isSelected ? <Check size={12} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-lime-400 transition-colors" />}
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
                className="w-full min-h-[54px] bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl px-4 py-3 text-[#17201B] font-bold text-sm sm:text-base focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 transition-all appearance-none cursor-pointer shadow-xs"
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
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Atau pilih penganjur popular:</p>
                <div className="grid gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {currentStep.options.slice(0, 8).map((opt) => {
                    const isSelected = currentValue === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleNextStep(opt)}
                        className={`
                          p-3 rounded-xl border text-left text-xs sm:text-sm font-bold transition-all flex items-center justify-between
                          ${isSelected 
                            ? 'bg-lime-50 border-lime-500 text-lime-950' 
                            : 'bg-white border-gray-200 text-gray-700 hover:border-lime-400 hover:bg-lime-50/20'
                          }
                        `}
                      >
                        <span className="truncate pr-2">{opt}</span>
                        {isSelected && <CheckCircle2 size={16} className="text-lime-600 shrink-0" />}
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
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
              {[0, 1, 2, 3, 4, 5].map((num) => {
                const isSelected = currentValue === num;
                return (
                  <motion.button
                    key={num}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNextStep(num)}
                    className={`
                      min-h-[52px] sm:min-h-[60px] rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center transition-all shadow-xs
                      ${isSelected 
                        ? 'bg-lime-400 border-lime-500 text-black font-black ring-2 ring-lime-400/30' 
                        : 'bg-white border-gray-200 text-gray-800 font-bold hover:border-lime-400 hover:bg-lime-50/30'
                      }
                    `}
                  >
                    <span className="text-lg sm:text-xl leading-none">{num}</span>
                    <span className="text-[9px] sm:text-[10px] font-semibold opacity-75 mt-0.5">
                      {num === 0 ? 'Tiada' : num === 5 ? 'Cemerlang' : `Skala ${num}`}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[11px] font-medium text-gray-500 px-1 pt-1">
              <span>0 = Tidak Berkenaan / Rendah</span>
              <span>5 = Cemerlang</span>
            </div>
          </div>
        );

      case 'date':
        // Calculate date presets (Today, Yesterday)
        const todayObj = new Date();
        const todayStr = todayObj.toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        // Format selected date nicely in Malay
        let formattedDatePreview = '';
        if (inputText) {
          const parts = inputText.split('-');
          if (parts.length === 3) {
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            const d = Number(parts[2]);
            if (y && m && d) {
              const dateObj = new Date(y, m - 1, d);
              formattedDatePreview = dateObj.toLocaleDateString('ms-MY', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }).toUpperCase();
            }
          }
        }

        return (
          <div className="pt-1 space-y-3">
            {/* Main Styled Date Input Card */}
            <div className="bg-white border-2 border-gray-200 focus-within:border-lime-500 focus-within:ring-4 focus-within:ring-lime-400/20 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 transition-all shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center shrink-0 border border-lime-300/60 shadow-2xs">
                  <Calendar size={20} strokeWidth={2.5} />
                </div>
                <div className="flex-1 relative">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-0.5">
                    Pilih Tarikh Mula Program
                  </label>
                  <input 
                    type="date" 
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      handleNextStep(e.target.value);
                    }}
                    className="w-full bg-transparent text-gray-900 font-extrabold text-base sm:text-lg focus:outline-none cursor-pointer"
                  />
                </div>
                {inputText && (
                  <button 
                    type="button" 
                    onClick={() => setInputText('')} 
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    title="Kosongkan"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Formatted Date Banner Preview */}
              {formattedDatePreview && (
                <div className="bg-lime-50 border border-lime-200/80 rounded-xl p-2.5 flex items-center gap-2 text-lime-950 font-bold text-xs sm:text-sm animate-in fade-in duration-200">
                  <CheckCircle2 size={16} className="text-lime-600 shrink-0" />
                  <span>{formattedDatePreview}</span>
                </div>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Pilihan Pantas Tarikh:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputText(todayStr);
                    handleNextStep(todayStr);
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 touch-manipulation cursor-pointer ${
                    inputText === todayStr
                      ? 'bg-lime-400 text-black font-extrabold shadow-sm'
                      : 'bg-white border border-gray-200 hover:border-lime-400 hover:bg-lime-50 text-gray-800'
                  }`}
                >
                  <Sparkles size={13} className={inputText === todayStr ? 'text-black' : 'text-lime-600'} />
                  <span>Hari Ini ({todayObj.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInputText(yesterdayStr);
                    handleNextStep(yesterdayStr);
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 touch-manipulation cursor-pointer ${
                    inputText === yesterdayStr
                      ? 'bg-lime-400 text-black font-extrabold shadow-sm'
                      : 'bg-white border border-gray-200 hover:border-lime-400 hover:bg-lime-50 text-gray-800'
                  }`}
                >
                  <Clock size={13} className={inputText === yesterdayStr ? 'text-black' : 'text-gray-500'} />
                  <span>Semalam ({yesterdayDate.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })})</span>
                </button>
              </div>
            </div>
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
                className="w-full bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 text-gray-900 font-medium text-sm sm:text-base focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 transition-all shadow-xs resize-none min-h-[100px]"
              />
              {inputText && (
                <button 
                  type="button" 
                  onClick={() => setInputText('')} 
                  className="absolute right-3 top-3 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Chips */}
            {currentStep.options && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Pilihan Pantas:</p>
                <div className="flex flex-wrap gap-2">
                  {currentStep.options.map((opt) => (
                    <button 
                      key={opt} 
                      type="button"
                      onClick={() => {
                        setInputText(opt);
                        handleNextStep(opt);
                      }}
                      className="px-3.5 py-2 bg-white border border-gray-200 hover:border-lime-400 hover:bg-lime-50 rounded-xl text-xs sm:text-sm font-bold text-gray-800 transition-all shadow-xs text-left"
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
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs sm:text-sm font-extrabold text-gray-700 transition-all"
                  >
                    Tiada
                  </button>
                </div>
              </div>
            )}
          </div>
        );

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
                className="w-full min-h-[54px] bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl px-4 py-3 pr-10 text-gray-900 font-bold text-sm sm:text-base focus:ring-2 focus:ring-lime-400/50 focus:border-lime-500 transition-all shadow-xs"
                autoFocus
              />
              {inputText && (
                <button 
                  type="button" 
                  onClick={() => setInputText('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtered Search Results */}
            {filteredOptions.length > 0 && (
              <div className="bg-white border-2 border-lime-400/50 rounded-xl sm:rounded-2xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                {filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setInputText(opt);
                      handleNextStep(opt);
                    }}
                    className="w-full text-left p-3 hover:bg-lime-50 text-xs sm:text-sm font-bold text-gray-800 transition-colors flex items-center justify-between"
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
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Cadangan Nama/Lokasi:</p>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {currentStep.options.slice(0, 10).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setInputText(opt);
                        handleNextStep(opt);
                      }}
                      className="px-3.5 py-2 bg-white border border-gray-200 hover:border-lime-400 hover:bg-lime-50 rounded-xl text-xs font-bold text-gray-800 transition-all shadow-xs text-left"
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
    <div className="flex flex-col h-dvh max-h-dvh w-full max-w-2xl mx-auto bg-[#F6F8F7] text-[#17201B] relative overflow-hidden">
      {/* 1. STICKY HEADER */}
      <header className="shrink-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E4E9E6] shadow-xs px-4 py-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          {/* Bot Branding */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-lime-400 rounded-xl flex items-center justify-center text-black shadow-xs border border-lime-500/20">
                <Bot size={18} sm:size={20} strokeWidth={2.5} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border-2 border-white"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-gray-900 text-sm sm:text-base tracking-tight leading-none">e-Penilaian Program JAIS</h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Aktif
                </span>
              </div>
            </div>
          </div>

          {/* Step Count Badge & Back/Close */}
          <div className="flex items-center gap-2">
            {!isCompleted && !isReviewing && (
              <div className="flex items-center gap-1.5">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsReviewing(true)}
                    className="text-xs font-bold text-lime-800 bg-lime-100 hover:bg-lime-200 px-2.5 py-1 rounded-lg border border-lime-300/80 transition-all flex items-center gap-1"
                    title="Semak semua jawapan"
                  >
                    <PenLine size={12} />
                    <span>Semak</span>
                  </button>
                )}
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200/80">
                  Soalan {currentStepIndex + 1} / {steps.length}
                </span>
              </div>
            )}
            <button 
              type="button"
              onClick={onBack} 
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {!isCompleted && !isReviewing && (
          <div className="space-y-1">
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200/50">
              <motion.div 
                className="bg-lime-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 px-0.5">
              <span>{progressPercent}% lengkap</span>
              <span>Langkah {currentStepIndex + 1} daripada {steps.length}</span>
            </div>
          </div>
        )}
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-6 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* SUCCESS VIEW */}
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center my-auto space-y-6"
          >
            {/* Header Box */}
            <div className="w-full bg-gradient-to-b from-lime-400 to-lime-500 p-8 rounded-3xl text-center shadow-lg relative overflow-hidden text-black space-y-3">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-green-600 mx-auto shadow-md">
                <CheckCircle2 size={36} strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Terima Kasih!</h2>
              <p className="text-sm font-bold text-black/80 max-w-sm mx-auto leading-relaxed">
                Penilaian anda terhadap Program Jabatan Agama Islam Sarawak telah berjaya dihantar.
              </p>
            </div>

            {/* Poster / Certificate card */}
            <div className="w-full bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-lime-100 text-lime-700 rounded-xl">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-gray-900">Kongsikan Poster</p>
                    <p className="text-xs text-gray-500 font-medium">Sijil penyertaan & tamat program</p>
                  </div>
                </div>
                <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                  <button onClick={() => setPosterRatio('square')} className={`p-1.5 rounded-lg text-xs font-bold transition-all ${posterRatio === 'square' ? 'bg-white shadow-xs text-black' : 'text-gray-400'}`}><Square size={14} /></button>
                  <button onClick={() => setPosterRatio('story')} className={`p-1.5 rounded-lg text-xs font-bold transition-all ${posterRatio === 'story' ? 'bg-white shadow-xs text-black' : 'text-gray-400'}`}><Smartphone size={14} /></button>
                </div>
              </div>

              {/* Poster Preview Frame */}
              <div className="flex justify-center bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div 
                  ref={posterRef}
                  className={`
                    w-full bg-[#0F0F0F] rounded-[1.5rem] p-5 flex flex-col justify-between relative overflow-hidden shadow-xl border-[3px] border-lime-400
                    ${posterRatio === 'square' ? 'aspect-square max-w-[260px]' : 'aspect-[9/16] max-w-[190px]'}
                    transition-all duration-300
                  `}
                >
                  <div className="relative z-10">
                    <div className="bg-lime-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider inline-block mb-2">
                      Tamat Program
                    </div>
                    <div className="flex items-center gap-1 text-lime-400 mb-1">
                      <Building2 size={10} className="shrink-0"/>
                      <span className="text-[10px] font-bold line-clamp-1">
                        {formData.penganjurUtama || "Penganjur"}
                      </span>
                    </div>
                    <h3 className={`text-white font-black leading-tight tracking-tight mb-2 break-words ${getTitleFontSize(formData.namaProgram || "")}`}>
                      {formData.namaProgram || "Program"}
                    </h3>
                    <div className="space-y-1 border-l-2 border-white/20 pl-2 mt-2">
                      <div className="flex items-center gap-1 text-gray-300">
                        <MapPin size={10} className="text-white shrink-0"/>
                        <span className="text-[10px] font-medium line-clamp-1">
                          {formData.tempatProgram || "Lokasi"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-300">
                        <Clock size={10} className="text-white shrink-0"/>
                        <span className="text-[10px] font-medium">
                          {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10 pt-2 border-t border-white/10 mt-auto flex items-center gap-2">
                    <div className="w-5 h-5 bg-white rounded flex items-center justify-center p-0.5">
                      <LogoImage />
                    </div>
                    <span className="text-white font-bold text-[9px]">e-Penilaian JAIS</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button 
                  onClick={handleSharePoster}
                  disabled={isSharing}
                  className="w-full bg-[#25D366] text-white py-3.5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all"
                >
                  {isSharing ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                  Kongsi ke WhatsApp Status
                </button>
                <button 
                  onClick={handleSaveToAlbum}
                  disabled={isSaving}
                  className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all"
                >
                  {isSaving ? <Loader2 className="animate-spin text-lime-400" size={18} /> : <ImageIcon size={18} className="text-lime-400" />}
                  Simpan Gambar
                </button>
              </div>
            </div>

            <button 
              onClick={onBack} 
              className="text-gray-500 hover:text-gray-800 font-bold text-sm py-2 flex items-center gap-2 transition-colors"
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
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Semakan Jawapan</h2>
                <p className="text-xs text-gray-500 font-medium">Sila semak semula jawapan anda sebelum menghantar.</p>
              </div>
              <button 
                onClick={() => setIsReviewing(false)}
                className="p-2 bg-gray-100 rounded-xl text-gray-500 hover:text-black transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              {steps.map((step, idx) => (
                <div 
                  key={step.field} 
                  className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex justify-between items-center gap-3"
                >
                  <div className="space-y-0.5 flex-1 pr-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Soalan {idx + 1} • {step.field.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-xs font-semibold text-gray-600 line-clamp-1">{step.question}</p>
                    <p className="text-sm font-black text-gray-900 pt-0.5">
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
                    className="px-3 py-1.5 bg-lime-50 text-lime-800 rounded-xl font-bold text-xs border border-lime-200 hover:bg-lime-400 hover:text-black transition-all flex items-center gap-1 shrink-0"
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
                className="w-full bg-lime-400 text-black py-4 rounded-2xl font-black text-base shadow-md hover:bg-lime-500 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
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
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-4 my-auto"
            >
              {/* Question Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E9E6] shadow-sm p-5 sm:p-7 space-y-4">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-100 text-lime-800 text-xs font-extrabold border border-lime-200">
                    <Sparkles size={12} />
                    Soalan {currentStepIndex + 1} daripada {steps.length}
                  </span>
                  {formData[currentStep.field] && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                      <CheckCircle2 size={12} /> Dijawab
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <h2 className="text-lg sm:text-xl font-extrabold text-[#17201B] leading-snug tracking-tight">
                  {currentStep.question}
                </h2>

                {/* Instruction Hint */}
                <p className="text-xs sm:text-sm font-medium text-[#66736B]">
                  {currentStep.type === 'rating' ? 'Sila pilih skala penilaian dari 0 hingga 5' :
                   currentStep.type === 'options' || currentStep.type === 'netflix-profile' ? 'Sila pilih satu daripada pilihan berikut:' :
                   currentStep.type === 'select' ? 'Sila pilih dari senarai penganjur:' :
                   currentStep.type === 'date' ? 'Sila masukkan tarikh berkenaan:' :
                   'Taip atau pilih jawapan anda di bawah:'}
                </p>

                {/* Options / Input Component */}
                {renderQuestionInput()}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* 3. STICKY FOOTER NAVIGATION */}
      {!isCompleted && !isReviewing && (
        <footer 
          className="shrink-0 z-20 bg-white border-t border-[#E4E9E6] px-4 py-3 sm:px-6 sm:py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex items-center gap-3 max-w-2xl mx-auto w-full">
            {/* Back Button */}
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex-1 min-h-[48px] sm:min-h-[52px] px-4 py-3 rounded-xl sm:rounded-2xl border border-gray-200 text-[#17201B] font-bold text-sm sm:text-base hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
              <span>Kembali</span>
            </button>

            {/* Next / Submit Button */}
            <button
              type="button"
              onClick={() => {
                let valToSave: any = undefined;
                if (currentStep.type === 'text' || currentStep.type === 'date' || currentStep.type === 'textarea') {
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
              className="flex-[2] min-h-[48px] sm:min-h-[52px] px-4 py-3 rounded-xl sm:rounded-2xl bg-lime-400 text-[#17201B] font-extrabold text-sm sm:text-base hover:bg-lime-500 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:active:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Menghantar...</span>
                </>
              ) : (
                <>
                  <span>
                    {readyToSubmit || currentStepIndex === steps.length - 1 ? 'Hantar Penilaian' : 'Seterusnya'}
                  </span>
                  {readyToSubmit || currentStepIndex === steps.length - 1 ? (
                    <Send size={18} />
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
