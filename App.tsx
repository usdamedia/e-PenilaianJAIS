
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Send, AlertCircle, Minus, Plus, ArrowRight, LayoutDashboard, ChevronDown, PieChart, Lock, Camera, X, Aperture, Loader2, Bot, FileText, Share2, Download, Award, Smartphone, Square, Clock, PenLine, Image as ImageIcon, MapPin, Building2 } from 'lucide-react';
import { EvaluationFormData } from './types';
import { LOCATIONS, ORGANIZERS, DURATIONS, EDUCATION_LEVELS, AGE_RANGES, PREMADE_COMMENTS, PREMADE_SUGGESTIONS, DAYS, MONTHS, YEARS, PROGRAM_VENUES } from './constants';
import { CADANGAN_NAMA_PROGRAM } from './NAMA_PROGRAM_CADANGAN';
import { Input } from './components/Input';
import { Select } from './components/Select';
import { RatingScale } from './components/RatingScale';
import { submitEvaluation } from './services/api';
import { AdminLogin } from './admin/AdminLogin';
import { AdminDashboard } from './admin/AdminDashboard';
import { ChatEvaluation } from './components/ChatEvaluation'; // Import Chat Component
import Tesseract from 'tesseract.js';
import html2canvas from 'html2canvas';

const INITIAL_DATA: EvaluationFormData = {
  namaProgram: '',
  bahagianProgram: '',
  tempatProgram: '',
  tarikhMula: '',
  tempohProgram: '',
  penganjurUtama: '',
  namaPenuh: '',
  jantina: '',
  umur: '',
  tarafPendidikan: '',
  ratingTarikhMasa: 0,
  ratingPengisian: 0,
  ratingJamuan: 0,
  ratingFasilitator: 0,
  ratingUrusetia: 0,
  ratingKeseluruhan: 0,
  komenProgram: '',
  cadanganProgram: '',
};

function App() {
  // Navigation State: 'form' | 'adminLogin' | 'adminPanel'
  const [view, setView] = useState<'form' | 'adminLogin' | 'adminPanel'>('form');
  
  // NEW: Flow Step State
  const [flowStep, setFlowStep] = useState<'modeSelection' | 'scanSelection' | 'filling'>('modeSelection');
  
  // NEW: Input Mode State ('standard' | 'chat')
  const [inputMode, setInputMode] = useState<'standard' | 'chat'>('chat');

  const [formData, setFormData] = useState<EvaluationFormData>(INITIAL_DATA);
  const [isLocked, setIsLocked] = useState(false); // Lock pre-filled fields
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // OCR / Camera States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Social Flex Poster Ref & State
  const posterRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posterRatio, setPosterRatio] = useState<'square' | 'story'>('square');
  
  // Date Picker Local State
  const [dateParts, setDateParts] = useState({ d: '', m: '', y: '' });

  // Sync Date State with FormData
  useEffect(() => {
    if (!formData.tarikhMula) {
      setDateParts({ d: '', m: '', y: '' });
    } else {
       const [y, m, d] = formData.tarikhMula.split('-');
       setDateParts({ d, m, y });
    }
  }, [formData.tarikhMula]);

  const handleDateChange = (part: 'd' | 'm' | 'y', val: string) => {
    const newParts = { ...dateParts, [part]: val };
    setDateParts(newParts);
    
    // Update main form data only if all parts are selected
    if (newParts.d && newParts.m && newParts.y) {
      setFormData(prev => ({
        ...prev,
        tarikhMula: `${newParts.y}-${newParts.m}-${newParts.d}`
      }));
    } else {
      // If user clears a part, clear the valid date string to ensure validation fails
      if (formData.tarikhMula) {
         setFormData(prev => ({ ...prev, tarikhMula: '' }));
      }
    }
  };
  
  // Font Size State: 0 = Normal, 1 = Large, 2 = Extra Large
  const [fontSizeLevel, setFontSizeLevel] = useState(0);

  const fontSizes = {
    base: ['text-sm', 'text-base', 'text-lg'],
    input: ['text-base', 'text-lg', 'text-xl'], // Minimum 16px for mobile inputs
    header: ['text-2xl', 'text-3xl', 'text-4xl'],
    subHeader: ['text-sm', 'text-base', 'text-lg'],
    label: ['text-sm', 'text-base', 'text-lg'],
    sectionTitle: ['text-lg', 'text-xl', 'text-2xl'],
  };

  const currentFontSize = (type: keyof typeof fontSizes) => fontSizes[type][fontSizeLevel];

  const handleFontSizeChange = (increment: boolean) => {
    setFontSizeLevel(prev => {
      const newValue = increment ? prev + 1 : prev - 1;
      return Math.min(Math.max(newValue, 0), 2);
    });
  };

  // Prevent body scroll when in chat mode or selection mode
  useEffect(() => {
    if ((inputMode === 'chat' || flowStep !== 'filling') && view === 'form') {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100dvh';
    } else {
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
    };
  }, [inputMode, view, flowStep]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (field: keyof EvaluationFormData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuickSelect = (field: 'komenProgram' | 'cadanganProgram', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      await submitEvaluation(formData);
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (error) {
      setErrorMessage("Maaf, terdapat masalah rangkaian. Sila cuba lagi sebentar lagi.");
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };



  const getTitleFontSize = (text: string) => {
    const length = text?.length || 0;
    if (length > 50) return 'text-[12px]';
    if (length > 35) return 'text-[16px]';
    if (length > 20) return 'text-[20px]';
    return 'text-[22px]';
  };

  // --- SOCIAL SHARE LOGIC ---
  const handleSharePoster = async () => {
    if (!posterRef.current) return;
    setIsSharing(true);
    
    try {
      // Small delay to ensure any text edits are rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate Image with High Quality Settings
      const canvas = await html2canvas(posterRef.current, {
        scale: 4, // 300 DPI Quality (High Res)
        backgroundColor: '#0F0F0F', // Explicit match to CSS bg
        logging: false,
        useCORS: true,
        allowTaint: true, // Handle cross-origin issues
        imageTimeout: 0,  // Wait for images to load
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
      if (!blob) throw new Error("Gagal menjana imej");

      const file = new File([blob], `Tamat_Kursus_${formData.namaProgram.replace(/\s+/g, '_')}.png`, { type: 'image/png' });

      // Web Share API
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Selesai Program',
          text: `Alhamdulillah, selesai program ${formData.namaProgram}! ✨`
        });
      } else {
        // Fallback Download
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png', 1.0);
        link.download = `Selesai_${formData.namaProgram.replace(/\s+/g, '_')}.png`;
        link.click();
        alert("Gambar disimpan ke galeri.");
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
      link.download = `Selesai_${formData.namaProgram.replace(/\s+/g, '_')}.png`;
      link.click();
      alert("Poster berjaya disimpan ke galeri!");
    } catch (error) {
      console.error("Save failed", error);
      alert("Gagal menyimpan gambar.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- CAMERA & OCR LOGIC ---

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer rear camera
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera Error:", err);
      alert("Gagal membuka kamera. Sila pastikan anda memberi kebenaran kamera.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setIsProcessingOCR(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessingOCR(true);

    // 1. Capture Image Frame
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    try {
      // 2. OCR using Tesseract.js (Native Client-side)
      const { data: { text } } = await Tesseract.recognize(
        imageData,
        'msa+eng', // Malay and English
        { 
          logger: m => console.log(m),
          errorHandler: err => console.error(err)
        }
      );

      console.log("OCR Raw Text:", text);

      if (text) {
        // 3. Heuristic Parsing of Raw Text
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        
        let foundName = '';
        let foundVenue = '';
        let foundOrganizer = '';
        let foundDate = '';

        // Heuristic: Program name is usually one of the first few lines with significant length
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
          const line = lines[i].toUpperCase();
          if (line.includes('PROGRAM') || line.includes('KURSUS') || line.includes('BENGKEL') || line.includes('SEMINAR')) {
            foundName = line;
            break;
          }
        }
        if (!foundName && lines.length > 0) foundName = lines[0].toUpperCase();

        // Match Venue
        for (const venue of PROGRAM_VENUES) {
          if (text.toUpperCase().includes(venue.toUpperCase())) {
            foundVenue = venue;
            break;
          }
        }

        // Match Organizer
        for (const org of ORGANIZERS) {
          if (text.toUpperCase().includes(org.toUpperCase())) {
            foundOrganizer = org;
            break;
          }
        }

        // Match Date (Simple DD/MM/YYYY or DD MONTH YYYY)
        const dateRegex = /(\d{1,2})[\/\-\s](JANUARI|FEBRUARI|MAC|APRIL|MEI|JUN|JULAI|OGOS|SEPTEMBER|OKTOBER|NOVEMBER|DISEMBER|\d{1,2})[\/\-\s](\d{4})/i;
        const dateMatch = text.toUpperCase().match(dateRegex);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          let month = dateMatch[2];
          const year = dateMatch[3];

          // Convert month name to number if needed
          const monthIdx = MONTHS.indexOf(month);
          if (monthIdx !== -1) {
            month = (monthIdx + 1).toString().padStart(2, '0');
          } else {
            month = month.padStart(2, '0');
          }
          
          foundDate = `${year}-${month}-${day}`;
        }

        // 4. Auto-fill Form
        setFormData(prev => ({
          ...prev,
          namaProgram: foundName || prev.namaProgram,
          tempatProgram: foundVenue || prev.tempatProgram,
          penganjurUtama: foundOrganizer || prev.penganjurUtama,
          tarikhMula: foundDate || prev.tarikhMula
        }));

        // Update date parts if date found
        if (foundDate) {
          const [y, m, d] = foundDate.split('-');
          setDateParts({ d, m, y });
        }

        stopCamera();
      } else {
        alert("Gagal mengimbas maklumat. Sila cuba lagi.");
        setIsProcessingOCR(false);
      }

    } catch (error) {
      console.error("OCR Error:", error);
      alert("Ralat semasa memproses imej. Sila isi secara manual.");
      setIsProcessingOCR(false);
    }
  };

  // Validation Logic
  const isFormValid = 
    formData.namaProgram.trim() !== '' &&
    formData.bahagianProgram !== '' &&
    formData.tempatProgram.trim() !== '' &&
    formData.tarikhMula !== '' &&
    formData.tempohProgram !== '' &&
    formData.penganjurUtama !== '' &&
    formData.jantina !== '' &&
    formData.umur !== '' &&
    formData.tarafPendidikan !== '' &&
    formData.ratingTarikhMasa > 0 &&
    formData.ratingPengisian > 0 &&
    formData.ratingUrusetia > 0 &&
    formData.ratingKeseluruhan > 0;

  // --- ROUTING LOGIC ---

  if (view === 'adminLogin') {
    return (
      <AdminLogin 
        onLogin={() => setView('adminPanel')} 
        onBack={() => setView('form')} 
      />
    );
  }

  if (view === 'adminPanel') {
    return <AdminDashboard onLogout={() => setView('form')} />;
  }

  // ROUTE: SUCCESS PAGE (Standard Form)
  if (submitted) {
    return (
      <div className="min-h-screen bg-dark-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col items-center">
          
          <div className="bg-white w-full rounded-[2rem] shadow-soft p-8 md:p-10 text-center relative overflow-hidden mb-6">
            <div className="w-16 h-16 bg-lime-400/20 text-lime-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-extrabold text-dark tracking-tight mb-2">Penilaian Dihantar!</h1>
            <p className="text-gray-500 text-sm">
              Terima kasih atas maklum balas anda.
            </p>
          </div>

          {/* SOCIAL FLEX POSTER PREVIEW */}
          <div className="w-full mb-6">
             <div className="flex justify-between items-end mb-3">
               <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                ✨ Kongsi Pencapaian Anda
               </p>
               {/* Ratio Toggles */}
               <div className="bg-gray-200 p-1 rounded-lg flex gap-1">
                  <button 
                    onClick={() => setPosterRatio('square')}
                    className={`p-1.5 rounded-md transition-all ${posterRatio === 'square' ? 'bg-white shadow-sm text-dark' : 'text-gray-400 hover:text-dark'}`}
                    title="Square 1:1"
                  >
                     <Square size={16} />
                  </button>
                  <button 
                    onClick={() => setPosterRatio('story')}
                    className={`p-1.5 rounded-md transition-all ${posterRatio === 'story' ? 'bg-white shadow-sm text-dark' : 'text-gray-400 hover:text-dark'}`}
                    title="Story 9:16"
                  >
                     <Smartphone size={16} />
                  </button>
               </div>
             </div>
            
            {/* EDITABLE NAME SECTION */}
            <div className="bg-white rounded-xl p-3 mb-4 shadow-sm border border-gray-100 flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <PenLine size={12}/> Edit Nama Program (Poster)
                </label>
                <input 
                    type="text" 
                    value={formData.namaProgram}
                    onChange={(e) => setFormData(prev => ({...prev, namaProgram: e.target.value.toUpperCase()}))}
                    className="w-full font-bold text-dark text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-lime-400 focus:outline-none uppercase"
                    placeholder="NAMA PROGRAM"
                />
            </div>

            {/* The Actual Poster to be Captured */}
            <div 
              ref={posterRef}
              className={`
                w-full bg-[#0F0F0F] rounded-[2rem] p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl border-[3px] border-lime-400
                ${posterRatio === 'square' ? 'aspect-square' : 'aspect-[9/16]'}
                transition-all duration-300
              `}
            >
              {/* Background Accents (Reference Style) */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-lime-400 rounded-full blur-[60px] opacity-20"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-lime-400 rounded-full blur-[60px] opacity-10"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  {/* Badge */}
                  <div className="inline-block bg-lime-400 text-[#0F0F0F] text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
                     Tamat Program
                  </div>
                  
                  {/* Organizer (NEW) */}
                  <div className="flex items-center gap-2 text-lime-400 mb-2 opacity-90">
                      <Building2 size={16} className="shrink-0"/>
                      <span className="text-[10px] font-bold uppercase tracking-wider line-clamp-1">
                      {formData.penganjurUtama || "PENGANJUR"}
                      </span>
                  </div>

                  {/* Title */}
                  <h2 
                    className={`text-white font-black uppercase leading-[0.9] tracking-tighter mb-4 break-words ${getTitleFontSize(formData.namaProgram || "")}`}
                    style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}
                  >
                    {formData.namaProgram || "NAMA PROGRAM"}
                  </h2>
                  
                  {/* Location & Date Group (UPDATED) */}
                  <div className="space-y-3 mt-4 border-l-2 border-white/20 pl-4">
                      {/* Location */}
                      <div className="flex items-center gap-3 text-gray-300">
                        <MapPin size={18} className="text-white shrink-0"/>
                        <span className="text-[10px] font-bold uppercase tracking-wide leading-tight line-clamp-2">
                           {formData.tempatProgram || "LOKASI PROGRAM"}
                        </span>
                      </div>
                      
                      {/* Date */}
                      <div className="flex items-center gap-3 text-gray-300">
                        <Clock size={18} className="text-white shrink-0"/>
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                        </span>
                      </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-6 border-t border-white/10 mt-auto">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                         <LayoutDashboard size={20} className="text-[#0F0F0F]"/>
                      </div>
                      <div>
                         <div className="text-white font-bold text-base leading-none mb-1">e-Penilaian JAIS</div>
                         <div className="text-gray-500 text-[8px] uppercase tracking-widest font-bold">Jabatan Agama Islam Sarawak</div>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="space-y-3 mt-4">
              {/* WhatsApp Share */}
              <button 
                onClick={handleSharePoster}
                disabled={isSharing}
                className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all"
              >
                {isSharing ? <Loader2 className="animate-spin" /> : <Share2 size={24} />}
                Share to WhatsApp Status
              </button>

              {/* Save to Album */}
              <button 
                onClick={handleSaveToAlbum}
                disabled={isSaving}
                className="w-full bg-[#1A1C1E] text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all border border-gray-800"
              >
                {isSaving ? <Loader2 className="animate-spin text-lime-400" /> : <ImageIcon size={24} className="text-lime-400" />}
                Simpan Poster (Album)
              </button>
            </div>
            
            <p className="text-center text-xs text-gray-400 mt-3">Simpan kenangan ini!</p>
          </div>

          <button 
            onClick={() => {
              setSubmitted(false);
              setFormData(INITIAL_DATA);
              setDateParts({ d: '', m: '', y: '' });
            }}
            className="text-gray-500 font-bold hover:text-dark transition-colors text-sm flex items-center gap-2 py-2"
          >
            <ArrowRight size={16} /> Kembali ke Borang Utama
          </button>

        </div>
      </div>
    );
  }

  // ROUTE: MAIN FORM
  return (
    <div className={`min-h-screen bg-[#F2F2F2] font-sans selection:bg-lime-400 selection:text-black pb-32 sm:pb-20`}>
      {/* CAMERA OVERLAY */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
             <h3 className="text-white font-bold text-lg">Imbas Info Program</h3>
             <button onClick={stopCamera} className="p-2 bg-white/20 rounded-full text-white backdrop-blur-md">
               <X size={24} />
             </button>
          </div>

          {/* Camera View */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            {/* Guide Frame */}
            <div className="absolute inset-8 border-2 border-lime-400/50 rounded-3xl pointer-events-none flex flex-col justify-between p-4">
               <div className="flex justify-between">
                  <div className="w-8 h-8 border-t-4 border-l-4 border-lime-400 rounded-tl-xl"></div>
                  <div className="w-8 h-8 border-t-4 border-r-4 border-lime-400 rounded-tr-xl"></div>
               </div>
               <div className="text-center">
                  {isProcessingOCR && (
                    <div className="bg-black/60 text-white px-4 py-2 rounded-xl backdrop-blur-md inline-flex items-center gap-2">
                       <Loader2 className="animate-spin text-lime-400" size={20}/> Memproses...
                    </div>
                  )}
               </div>
               <div className="flex justify-between">
                  <div className="w-8 h-8 border-b-4 border-l-4 border-lime-400 rounded-bl-xl"></div>
                  <div className="w-8 h-8 border-b-4 border-r-4 border-lime-400 rounded-br-xl"></div>
               </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="p-8 bg-black flex justify-center items-center pb-12">
             <button 
               onClick={captureAndScan}
               disabled={isProcessingOCR}
               className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/10 active:scale-95 transition-all"
             >
                <div className="w-16 h-16 rounded-full bg-white"></div>
             </button>
          </div>
          
          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}


      {/* Mobile-First Sticky Header */}
      <div className={`sticky top-0 z-40 bg-[#F2F2F2]/80 backdrop-blur-md border-b border-gray-200/50 sm:border-none sm:bg-transparent sm:backdrop-blur-none sm:static sm:pt-6 sm:mb-2 ${inputMode === 'chat' || flowStep !== 'filling' ? 'hidden sm:block' : 'block'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 sm:bg-white/80 sm:backdrop-blur-xl sm:rounded-full sm:shadow-soft sm:px-6 sm:py-3 flex flex-col sm:flex-row justify-between items-center gap-4 sm:border sm:border-white/50">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="bg-dark text-white p-2 rounded-xl sm:rounded-full shadow-md">
                 <LayoutDashboard size={18} />
              </div>
              <span className="font-bold text-dark text-sm sm:text-base tracking-tight leading-tight">
                e-Penilaian <span className="text-lime-600 block sm:inline">JAIS</span>
              </span>
            </div>

            {/* Admin & Font Controls (Mobile: Show on right of logo) */}
            <div className="flex items-center gap-2 sm:hidden">
               <button onClick={() => setView('adminLogin')} className="p-2 text-gray-400"><Lock size={16}/></button>
            </div>
          </div>
          
          {/* Center: MODE TOGGLE (Pill Option) */}
          {flowStep === 'filling' && (
            <div className="bg-gray-200/50 p-1 rounded-full flex relative w-full sm:w-auto">
               <button 
                  onClick={() => setInputMode('chat')}
                  className={`flex-1 sm:w-32 py-1.5 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${inputMode === 'chat' ? 'bg-dark text-lime-400 shadow-lg' : 'text-gray-500 hover:text-dark'}`}
               >
                  <Bot size={14}/> Chatbot
               </button>
               <button 
                  onClick={() => setInputMode('standard')}
                  className={`flex-1 sm:w-32 py-1.5 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${inputMode === 'standard' ? 'bg-white text-dark shadow-sm' : 'text-gray-500 hover:text-dark'}`}
               >
                  <FileText size={14}/> Borang
               </button>
            </div>
          )}
          
          {/* Desktop Controls */}
          <div className="hidden sm:flex items-center gap-2">
             <button
               onClick={() => setView('adminLogin')}
               className="p-2 text-gray-400 hover:text-dark transition-colors"
             >
               <Lock size={16} />
             </button>
             {inputMode === 'standard' && flowStep === 'filling' && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                  <button onClick={() => handleFontSizeChange(false)} disabled={fontSizeLevel === 0} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:text-lime-600 disabled:opacity-30"><Minus size={14} /></button>
                  <div className="w-6 text-center font-bold text-dark text-xs">A{fontSizeLevel > 0 && '+'}</div>
                  <button onClick={() => handleFontSizeChange(true)} disabled={fontSizeLevel === 2} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:text-lime-600 disabled:opacity-30"><Plus size={14} /></button>
                </div>
             )}
          </div>
        </div>
      </div>

      <div className={`max-w-4xl mx-auto transition-all duration-500 ${inputMode === 'chat' || flowStep !== 'filling' ? 'px-0 sm:px-6 pt-0 sm:pt-0' : 'px-3 sm:px-6 pt-4 sm:pt-0'}`}>
        
        {/* CONDITIONAL RENDERING: FLOW STEPS */}
        {flowStep === 'modeSelection' ? (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 max-w-md w-full"
            >
              <div className="w-20 h-20 bg-lime-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-glow">
                <Smartphone size={40} className="text-dark" />
              </div>
              <h2 className="text-3xl font-black text-dark mb-4 tracking-tight">Selamat Datang</h2>
              <p className="text-gray-500 font-medium mb-10">Sila pilih cara anda ingin mengisi borang penilaian ini.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => { setInputMode('chat'); setFlowStep('scanSelection'); }}
                  className="w-full bg-dark text-white p-6 rounded-2xl flex items-center justify-between group hover:bg-black transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-lime-400 rounded-xl text-dark group-hover:scale-110 transition-transform">
                      <Bot size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-black text-lg leading-none mb-1">Chatbot</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Interaksi AI</div>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-lime-400" />
                </button>

                <button 
                  onClick={() => { setInputMode('standard'); setFlowStep('scanSelection'); }}
                  className="w-full bg-white border-2 border-gray-100 text-dark p-6 rounded-2xl flex items-center justify-between group hover:border-lime-400 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-xl text-dark group-hover:bg-lime-100 group-hover:text-lime-600 transition-colors">
                      <FileText size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-black text-lg leading-none mb-1">Borang Klasik</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Input Manual</div>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-gray-300 group-hover:text-lime-500" />
                </button>
              </div>
            </motion.div>
          </div>
        ) : flowStep === 'scanSelection' ? (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 max-w-md w-full"
            >
              <div className="w-20 h-20 bg-dark rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                <Camera size={40} className="text-lime-400" />
              </div>
              <h2 className="text-3xl font-black text-dark mb-4 tracking-tight">Imbas Poster?</h2>
              <p className="text-gray-500 font-medium mb-10">Gunakan AI untuk mengisi maklumat program secara automatik daripada poster.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={startCamera}
                  className="w-full bg-lime-400 text-dark p-6 rounded-2xl flex items-center justify-between group hover:bg-lime-500 transition-all shadow-lg shadow-lime-400/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-dark rounded-xl text-lime-400">
                      <Aperture size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-black text-lg leading-none mb-1">Imbas Poster</div>
                      <div className="text-[10px] text-dark/50 uppercase tracking-widest font-bold">Bantuan AI</div>
                    </div>
                  </div>
                  <ArrowRight size={20} />
                </button>

                <button 
                  onClick={() => { setFlowStep('filling'); setIsLocked(false); }}
                  className="w-full bg-white border-2 border-gray-100 text-dark p-6 rounded-2xl flex items-center justify-between group hover:border-gray-300 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-xl text-dark">
                      <PenLine size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-black text-lg leading-none mb-1">Isi Sendiri</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Tanpa Imbasan</div>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-gray-300" />
                </button>

                <button 
                  onClick={() => setFlowStep('modeSelection')}
                  className="text-xs font-bold text-gray-400 hover:text-dark transition-colors uppercase tracking-widest mt-4"
                >
                  Kembali ke pilihan borang
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
        /* CONDITIONAL RENDERING: CHAT VS FORM */
        inputMode === 'chat' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 sm:pt-4">
             <ChatEvaluation 
               onBack={() => setFlowStep('modeSelection')} 
               programSuggestions={CADANGAN_NAMA_PROGRAM} 
               initialData={formData}
               isLocked={isLocked}
             />
          </div>
        ) : (
        <>
        {/* STANDARD FORM CONTENT */}
        <div className="mb-6 sm:mb-10 px-2">
          <h1 className={`${currentFontSize('header')} font-extrabold text-dark tracking-tighter leading-none mb-2`}>
            Penilaian Program
          </h1>
          <p className={`${currentFontSize('subHeader')} text-gray-500 font-medium`}>
            Jabatan Agama Islam Sarawak
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 mx-2 p-5 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-700 shadow-sm animate-pulse">
            <AlertCircle size={28} className="shrink-0" />
            <span className={`font-semibold ${currentFontSize('base')}`}>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          
          {/* SECTION A */}
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-sm sm:shadow-soft p-5 sm:p-10 border border-gray-100/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-lime-400 rounded-xl sm:rounded-2xl flex items-center justify-center text-dark font-bold text-lg sm:text-xl shadow-glow">A</div>
                <h2 className={`${currentFontSize('sectionTitle')} font-bold text-dark tracking-tight`}>
                  Maklumat Program
                </h2>
              </div>
              
              {/* Scan Button */}
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center gap-2 bg-dark text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-lime-400/10 hover:bg-black transition-all active:scale-95 self-start sm:self-auto"
              >
                <Camera size={16} className="text-lime-400" />
                Imbas info (AI)
              </button>
            </div>
            
            <div className="space-y-6 sm:space-y-8">
              {/* Alert Box */}
              <div className="bg-gray-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4 border border-gray-100">
                <div className="bg-white p-2 rounded-full text-orange-500 shadow-sm shrink-0 mt-0.5">
                   <AlertTriangle size={18} />
                </div>
                <div className={`text-dark-800 ${currentFontSize('base')}`}>
                  <p className="font-bold mb-1 text-sm sm:text-base">Perhatian Penting</p>
                  <p className="opacity-70 leading-relaxed text-xs sm:text-sm">
                    Masukkan <strong className="text-black bg-lime-300 px-1.5 rounded">NAMA PROGRAM</strong> (HURUF BESAR). Bukan nama anda.
                  </p>
                </div>
              </div>

              <div className={currentFontSize('input')}>
                <Input 
                  label="Nama program"
                  name="namaProgram"
                  value={formData.namaProgram}
                  onChange={handleChange}
                  placeholder="Contoh: Kursus Jenazah"
                  required
                  uppercase
                  suggestions={CADANGAN_NAMA_PROGRAM}
                  fontSizeClass={currentFontSize('input')}
                  labelSizeClass={currentFontSize('label')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                  <Select
                    label="Bahagian program"
                    name="bahagianProgram"
                    value={formData.bahagianProgram}
                    onChange={handleChange}
                    options={LOCATIONS}
                    required
                    fontSizeClass={currentFontSize('input')}
                    labelSizeClass={currentFontSize('label')}
                  />
                  
                  <Input 
                    label="Tempat program"
                    name="tempatProgram"
                    value={formData.tempatProgram}
                    onChange={handleChange}
                    placeholder="Dewan Serbaguna..."
                    helperText="Huruf besar"
                    uppercase
                    required
                    suggestions={PROGRAM_VENUES}
                    fontSizeClass={currentFontSize('input')}
                    labelSizeClass={currentFontSize('label')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                  {/* Custom Date Picker Logic */}
                  <div className="w-full">
                    <label className={`block font-bold text-dark mb-2 ${currentFontSize('label')}`}>
                      Tarikh mula <span className="text-lime-600">*</span>
                    </label>
                    <div className="flex gap-2">
                      {/* Day Select */}
                      <div className="relative group w-1/4">
                        <select
                          value={dateParts.d}
                          onChange={(e) => handleDateChange('d', e.target.value)}
                          className={`
                            w-full px-2 sm:px-4 py-3.5 pr-6 sm:pr-8 rounded-2xl appearance-none transition-all duration-300
                            text-dark bg-gray-50 border-2 border-transparent font-medium cursor-pointer
                            focus:outline-none focus:bg-white focus:border-lime-400 focus:shadow-glow
                            hover:bg-gray-100 text-center
                            ${currentFontSize('input')}
                          `}
                          required
                        >
                          <option value="" disabled className="text-gray-400">Hh</option>
                          {DAYS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                         <div className="absolute inset-y-0 right-0 flex items-center px-1 sm:px-2 pointer-events-none text-gray-400 group-hover:text-dark">
                          <ChevronDown size={16} strokeWidth={2.5} />
                        </div>
                      </div>

                      {/* Month Select */}
                      <div className="relative group w-2/4">
                        <select
                          value={dateParts.m}
                          onChange={(e) => handleDateChange('m', e.target.value)}
                          className={`
                            w-full px-2 sm:px-4 py-3.5 pr-6 sm:pr-8 rounded-2xl appearance-none transition-all duration-300
                            text-dark bg-gray-50 border-2 border-transparent font-medium cursor-pointer
                            focus:outline-none focus:bg-white focus:border-lime-400 focus:shadow-glow
                            hover:bg-gray-100
                            ${currentFontSize('input')}
                          `}
                          required
                        >
                          <option value="" disabled className="text-gray-400">Bulan</option>
                          {MONTHS.map((m, idx) => (
                            <option key={m} value={(idx + 1).toString().padStart(2, '0')}>{m}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-1 sm:px-2 pointer-events-none text-gray-400 group-hover:text-dark">
                          <ChevronDown size={16} strokeWidth={2.5} />
                        </div>
                      </div>

                      {/* Year Select */}
                      <div className="relative group w-1/4">
                        <select
                          value={dateParts.y}
                          onChange={(e) => handleDateChange('y', e.target.value)}
                          className={`
                            w-full px-2 sm:px-4 py-3.5 pr-6 sm:pr-8 rounded-2xl appearance-none transition-all duration-300
                            text-dark bg-gray-50 border-2 border-transparent font-medium cursor-pointer
                            focus:outline-none focus:bg-white focus:border-lime-400 focus:shadow-glow
                            hover:bg-gray-100 text-center
                            ${currentFontSize('input')}
                          `}
                          required
                        >
                          <option value="" disabled className="text-gray-400">Tttt</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-1 sm:px-2 pointer-events-none text-gray-400 group-hover:text-dark">
                          <ChevronDown size={16} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Select
                    label="Tempoh"
                    name="tempohProgramSelect"
                    value={DURATIONS.includes(formData.tempohProgram) ? formData.tempohProgram : (formData.tempohProgram ? 'LAIN-LAIN' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, tempohProgram: val }));
                    }}
                    options={DURATIONS}
                    required
                    fontSizeClass={currentFontSize('input')}
                    labelSizeClass={currentFontSize('label')}
                  />
                  
                  {(formData.tempohProgram === 'LAIN-LAIN' || (formData.tempohProgram && !DURATIONS.includes(formData.tempohProgram))) && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Input 
                        label="Sila nyatakan tempoh (hari)"
                        name="tempohProgram"
                        value={formData.tempohProgram === 'LAIN-LAIN' ? '' : formData.tempohProgram}
                        onChange={handleChange}
                        placeholder="Contoh: 15 hari"
                        required
                        uppercase
                        fontSizeClass={currentFontSize('input')}
                        labelSizeClass={currentFontSize('label')}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 sm:mt-6">
                  <Select
                    label="Penganjur utama"
                    name="penganjurUtama"
                    value={formData.penganjurUtama}
                    onChange={handleChange}
                    options={ORGANIZERS}
                    placeholder="Pilih Satu Sahaja"
                    required
                    fontSizeClass={currentFontSize('input')}
                    labelSizeClass={currentFontSize('label')}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* ... Rest of the form (Sections B, C, D) remain unchanged ... */}
          {/* Section B */}
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-sm sm:shadow-soft p-5 sm:p-10 border border-gray-100/50">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-lime-400 rounded-xl sm:rounded-2xl flex items-center justify-center text-dark font-bold text-lg sm:text-xl shadow-glow">B</div>
              <h2 className={`${currentFontSize('sectionTitle')} font-bold text-dark tracking-tight`}>
                Maklumat Peserta
              </h2>
            </div>
            
            <div className="space-y-6 sm:space-y-8">
              <div className="mb-4 sm:mb-6">
                <label className={`block font-bold text-dark mb-3 sm:mb-4 ${currentFontSize('label')}`}>
                  Jantina <span className="text-lime-600">*</span>
                </label>
                <div className="flex gap-3 sm:gap-4">
                  {['LELAKI', 'PEREMPUAN'].map((gender) => (
                    <label key={gender} className="relative cursor-pointer group flex-1">
                      <input
                        type="radio"
                        name="jantina"
                        value={gender}
                        checked={formData.jantina === gender}
                        onChange={handleChange}
                        className="peer sr-only"
                        required
                      />
                      <div className="px-2 py-3.5 sm:px-4 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-gray-100 bg-gray-50 text-center font-bold text-gray-500 text-sm sm:text-base transition-all peer-checked:border-lime-400 peer-checked:bg-lime-400 peer-checked:text-black hover:bg-gray-100">
                        {gender}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Select
                  label="Umur"
                  name="umur"
                  value={formData.umur}
                  onChange={handleChange}
                  options={AGE_RANGES}
                  required
                  fontSizeClass={currentFontSize('input')}
                  labelSizeClass={currentFontSize('label')}
                />

                <Select
                  label="Taraf pendidikan"
                  name="tarafPendidikan"
                  value={formData.tarafPendidikan}
                  onChange={handleChange}
                  options={EDUCATION_LEVELS}
                  required
                  fontSizeClass={currentFontSize('input')}
                  labelSizeClass={currentFontSize('label')}
                />
              </div>
            </div>
          </div>

          {/* Section C */}
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-sm sm:shadow-soft p-5 sm:p-10 border border-gray-100/50">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
               <div className="w-10 h-10 sm:w-12 sm:h-12 bg-lime-400 rounded-xl sm:rounded-2xl flex items-center justify-center text-dark font-bold text-lg sm:text-xl shadow-glow">C</div>
              <h2 className={`${currentFontSize('sectionTitle')} font-bold text-dark tracking-tight`}>
                Penilaian
              </h2>
            </div>
            
            <div>
              <div className="bg-dark rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-8 text-white">
                <h3 className={`font-bold mb-3 opacity-90 ${currentFontSize('base')}`}>Panduan Skala:</h3>
                <div className="flex justify-between items-center text-center gap-2">
                  <div className="text-[10px] sm:text-xs opacity-60">Amat Tidak Baik</div>
                  <div className="flex-1 h-0.5 sm:h-1 bg-gray-700 rounded-full mx-2"></div>
                  <div className="text-[10px] sm:text-xs font-bold text-lime-400">Amat Baik</div>
                </div>
                <div className="flex justify-between mt-1 sm:mt-2 font-mono font-bold text-base sm:text-lg">
                  <span>0</span>
                  <span>5</span>
                </div>
              </div>

              <div className="space-y-6 sm:space-y-8">
                <RatingScale
                  label="Bagaimana dengan logistik (tarikh/masa/tempat)?"
                  value={formData.ratingTarikhMasa}
                  onChange={(val) => handleRatingChange('ratingTarikhMasa', val)}
                  required
                  fontSizeClass={currentFontSize('label')}
                />
                
                <RatingScale
                  label="Bagaimana pula dengan pengisian program?"
                  value={formData.ratingPengisian}
                  onChange={(val) => handleRatingChange('ratingPengisian', val)}
                  required
                  fontSizeClass={currentFontSize('label')}
                />

                <RatingScale
                  label="Penilaian untuk jamuan (jika ada)?"
                  value={formData.ratingJamuan}
                  onChange={(val) => handleRatingChange('ratingJamuan', val)}
                  fontSizeClass={currentFontSize('label')}
                />
                {formData.ratingJamuan === 0 && (
                  <p className="text-xs text-gray-400 font-bold -mt-4 mb-4 uppercase tracking-wider">
                    * Tiada jamuan
                  </p>
                )}

                <RatingScale
                  label="Prestasi fasilitator/pembentang (jika ada)?"
                  value={formData.ratingFasilitator}
                  onChange={(val) => handleRatingChange('ratingFasilitator', val)}
                  fontSizeClass={currentFontSize('label')}
                />

                <RatingScale
                  label="Bagaimana layanan keurusetiaan?"
                  value={formData.ratingUrusetia}
                  onChange={(val) => handleRatingChange('ratingUrusetia', val)}
                  required
                  fontSizeClass={currentFontSize('label')}
                />

                <div className="h-px bg-gray-100 my-6 sm:my-8"></div>

                <div className="bg-lime-50 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-lime-100 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 sm:w-40 sm:h-40 bg-lime-300 rounded-full blur-3xl opacity-50"></div>
                  <div className="relative z-10">
                    <RatingScale
                      label="Penilaian Keseluruhan"
                      value={formData.ratingKeseluruhan}
                      onChange={(val) => handleRatingChange('ratingKeseluruhan', val)}
                      required
                      fontSizeClass={currentFontSize('subHeader')}
                      highlight
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section D */}
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-sm sm:shadow-soft p-5 sm:p-10 border border-gray-100/50">
             <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
               <div className="w-10 h-10 sm:w-12 sm:h-12 bg-lime-400 rounded-xl sm:rounded-2xl flex items-center justify-center text-dark font-bold text-lg sm:text-xl shadow-glow">D</div>
              <h2 className={`${currentFontSize('sectionTitle')} font-bold text-dark tracking-tight`}>
                Komen
              </h2>
            </div>
            
            <div className="space-y-6 sm:space-y-8">
              {/* Komen Program */}
              <div>
                <label className={`block font-bold text-dark mb-3 sm:mb-4 ${currentFontSize('label')}`}>
                  Komen program
                </label>
                
                {/* Horizontal Scroll Chips for Mobile */}
                <div className="flex overflow-x-auto pb-2 -mx-1 px-1 sm:flex-wrap gap-2 mb-2 no-scrollbar">
                  {PREMADE_COMMENTS.map((text, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickSelect('komenProgram', text)}
                      className={`
                        whitespace-nowrap flex-shrink-0 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border
                        ${formData.komenProgram === text 
                          ? 'bg-dark text-white border-dark shadow-lg' 
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-dark'
                        }
                      `}
                    >
                      {text}
                    </button>
                  ))}
                </div>

                <textarea
                  name="komenProgram"
                  value={formData.komenProgram}
                  onChange={handleChange}
                  placeholder="Taip komen anda di sini..."
                  rows={3}
                  className={`
                    w-full px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl bg-gray-50 border-2 border-transparent transition-all duration-300
                    text-dark placeholder-gray-400
                    focus:outline-none focus:bg-white focus:border-lime-400 focus:shadow-glow
                    ${currentFontSize('input')}
                  `}
                />
              </div>

              {/* Cadangan Program */}
              <div>
                <label className={`block font-bold text-dark mb-3 sm:mb-4 ${currentFontSize('label')}`}>
                  Cadangan program
                </label>
                
                <div className="flex overflow-x-auto pb-2 -mx-1 px-1 sm:flex-wrap gap-2 mb-2 no-scrollbar">
                  {PREMADE_SUGGESTIONS.map((text, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickSelect('cadanganProgram', text)}
                      className={`
                        whitespace-nowrap flex-shrink-0 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border
                        ${formData.cadanganProgram === text 
                          ? 'bg-dark text-white border-dark shadow-lg' 
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-dark'
                        }
                      `}
                    >
                      {text}
                    </button>
                  ))}
                </div>

                <textarea
                  name="cadanganProgram"
                  value={formData.cadanganProgram}
                  onChange={handleChange}
                  placeholder="Taip cadangan anda di sini..."
                  rows={3}
                  className={`
                    w-full px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl bg-gray-50 border-2 border-transparent transition-all duration-300
                    text-dark placeholder-gray-400
                    focus:outline-none focus:bg-white focus:border-lime-400 focus:shadow-glow
                    ${currentFontSize('input')}
                  `}
                />
              </div>

            </div>
          </div>
        </form>

        {/* Floating Bottom Action Bar for Mobile (Standard Only) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-gray-200 shadow-up z-50 md:static md:bg-transparent md:border-none md:shadow-none md:p-0 md:pt-4 md:pb-20">
            <div className="max-w-4xl mx-auto flex justify-end">
                <button
                onClick={(e) => handleSubmit(e)}
                disabled={isSubmitting || !isFormValid}
                className={`
                    flex items-center gap-2 sm:gap-3 px-6 py-4 sm:px-10 sm:py-5 rounded-2xl sm:rounded-[2rem] font-bold text-base sm:text-lg shadow-xl transform transition-all w-full md:w-auto justify-center
                    ${(isSubmitting || !isFormValid)
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none' 
                    : 'bg-dark text-lime-400 hover:bg-black active:scale-[0.98]'
                    }
                `}
                >
                {isSubmitting ? (
                    <span className={currentFontSize('base')}>Sedang menghantar...</span>
                ) : (
                    <>
                    <Send size={20} className={(isSubmitting || !isFormValid) ? "text-gray-500" : "text-lime-400"} />
                    <span className={`tracking-wide`}>{!isFormValid ? "Lengkapkan borang" : "Hantar penilaian"}</span>
                    </>
                )}
                </button>
            </div>
        </div>
        </>
        )
        )}
      </div>
    </div>
  );
}

export default App;
