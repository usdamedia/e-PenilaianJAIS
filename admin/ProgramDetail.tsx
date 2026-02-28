
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  ArrowLeft, MessageSquare, Lightbulb, MapPin, Building2, 
  Calendar, FileDown, TrendingUp, AlertCircle, Quote, Users, UserCheck, Filter, Award, Star,
  Sparkles, Bot, Loader2, RefreshCw, Plus, Minus, Layers, Image as ImageIcon, XCircle, PenLine
} from 'lucide-react';
import { DashboardData } from '../dashboard/types';
import { GoogleGenAI } from "@google/genai";
import html2canvas from 'html2canvas';
import { pdf } from '@react-pdf/renderer';
import ProgramReportPDF from './ProgramReportPDF';

interface ProgramDetailProps {
  programName: string;
  data: DashboardData[];
  onBack: () => void;
  onRefresh: () => void;
}

const COLORS = {
  lime: '#D0F240',
  dark: '#1A1C1E',
  limeDark: '#9AB820',
  gray: '#F3F4F6',
  white: '#FFFFFF'
};

// Interface untuk struktur data kumpulan AI
interface GroupedFeedback {
  category: string;
  items: string[];
}

// Helper untuk format tarikh (ISO -> DD/MM/YYYY)
const formatDateKey = (isoString: string) => {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return '-';
  }
};

export const ProgramDetail: React.FC<ProgramDetailProps> = ({ programName, data, onBack, onRefresh }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  
  // Ref for capturing the report content
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Font Size State: 0 = Normal, 1 = Large, 2 = Extra Large
  const [fontSizeLevel, setFontSizeLevel] = useState(0);

  // AI States for General Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  // AI States for Grouping Feedback
  const [isGrouping, setIsGrouping] = useState(false);
  const [groupedFeedback, setGroupedFeedback] = useState<GroupedFeedback[] | null>(null);

  // --- WYSIWYG EDITABLE STATES ---
  const [editableProgramName, setEditableProgramName] = useState(programName);
  const [editablePenganjur, setEditablePenganjur] = useState('');
  const [editableAnalysis, setEditableAnalysis] = useState<string | null>(null);
  const [editableComments, setEditableComments] = useState<string[]>([]);
  const [editableSuggestions, setEditableSuggestions] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    setEditableProgramName(programName);
  }, [programName]);

  useEffect(() => {
    if (aiAnalysisResult) {
      setEditableAnalysis(aiAnalysisResult);
    }
  }, [aiAnalysisResult]);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>('SEMUA');
  const [selectedBahagian, setSelectedBahagian] = useState<string>('SEMUA');
  // Removed selectedTempat state as requested

  // --- FONT SIZE LOGIC ---
  const fontSizes = {
    headerTitle: ['text-3xl sm:text-4xl', 'text-4xl sm:text-5xl', 'text-5xl sm:text-6xl'],
    sectionTitle: ['text-xl', 'text-2xl', 'text-3xl'],
    subHeader: ['text-xs', 'text-sm', 'text-base'],
    body: ['text-sm', 'text-base', 'text-lg'],
    bodySmall: ['text-xs', 'text-sm', 'text-base'],
    kpiValue: ['text-4xl', 'text-5xl', 'text-6xl'],
    kpiLabel: ['text-[10px]', 'text-xs', 'text-sm'],
  };

  const fs = (type: keyof typeof fontSizes) => fontSizes[type][fontSizeLevel];

  const handleFontSizeChange = (increment: boolean) => {
    setFontSizeLevel(prev => {
      const newValue = increment ? prev + 1 : prev - 1;
      return Math.min(Math.max(newValue, 0), 2);
    });
  };

  // 1. RAW DATA (Base Set for this Program)
  const allProgramData = useMemo(() => {
    return data.filter(d => {
      const isProgramMatch = d.programName === programName;
      const isNotHeader = d.programName !== 'NAMA PROGRAM' && d.tarafPendidikan !== 'TARAF PENDIDIKAN TERTINGGI';
      return isProgramMatch && isNotHeader;
    });
  }, [data, programName]);

  // 2. DYNAMIC FILTER OPTIONS

  // A. Unique Dates (Level 1)
  const uniqueDates = useMemo(() => {
    const dates = allProgramData.map(d => ({
        iso: d.programDate,
        label: formatDateKey(d.programDate)
    }));
    
    // Remove duplicates based on label
    const unique = Array.from(new Set(dates.map(d => d.label)))
        .map(label => {
            return dates.find(d => d.label === label);
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b!.iso).getTime() - new Date(a!.iso).getTime()); // Sort Descending

    return unique as { iso: string, label: string }[];
  }, [allProgramData]);

  // B. Unique Bahagian (Level 2 - Depends on Date)
  const uniqueBahagian = useMemo(() => {
    let source = allProgramData;
    if (selectedDate !== 'SEMUA') {
        source = source.filter(d => formatDateKey(d.programDate) === selectedDate);
    }
    const set = new Set(source.map(d => d.bahagian).filter(Boolean));
    return Array.from(set).sort();
  }, [allProgramData, selectedDate]);

  // Reset Filters logic when parent filter changes
  useEffect(() => {
    if (selectedDate !== 'SEMUA') {
        // If current bahagian not in new valid list, reset
        if (selectedBahagian !== 'SEMUA' && !uniqueBahagian.includes(selectedBahagian)) {
            setSelectedBahagian('SEMUA');
        }
    }
  }, [selectedDate, uniqueBahagian, selectedBahagian]);


  // 3. FINAL FILTERED DATA (Now excludes Tempat filter)
  const filteredData = useMemo(() => {
    return allProgramData.filter(d => {
      const matchDate = selectedDate === 'SEMUA' || formatDateKey(d.programDate) === selectedDate;
      const matchBahagian = selectedBahagian === 'SEMUA' || d.bahagian === selectedBahagian;
      return matchDate && matchBahagian;
    });
  }, [allProgramData, selectedDate, selectedBahagian]);

  // 4. DERIVE LOCATION AUTOMATICALLY (Based on filteredData)
  const displayedLocation = useMemo(() => {
    if (filteredData.length === 0) return '-';
    const locations = Array.from(new Set(filteredData.map(d => d.tempat).filter(Boolean)));
    
    if (locations.length === 0) return '-';
    if (locations.length === 1) return locations[0];
    return `${locations.length} LOKASI BERBEZA`; // Or list them e.g. "LOKASI A, LOKASI B..."
  }, [filteredData]);

  // 5. ANALISIS COMPUTATION
  const analysis = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const count = filteredData.length;
    const sum = (key: keyof DashboardData) => filteredData.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    const safeAvg = (total: number) => parseFloat((total / count).toFixed(2));

    const spiderData = [
      { subject: 'Urusetia', A: safeAvg(sum('skorUrusetia')), fullMark: 5 },
      { subject: 'Logistik', A: safeAvg(sum('skorLogistik')), fullMark: 5 }, 
      { subject: 'Pengisian', A: safeAvg(sum('skorPengisian')), fullMark: 5 }, 
      { subject: 'Fasilitator', A: safeAvg(sum('skorFasilitator')), fullMark: 5 }, 
      { subject: 'Jamuan', A: safeAvg(sum('skorJamuan')), fullMark: 5 }, 
    ];

    const avgTotal = safeAvg(sum('skorKeseluruhan'));

    return { 
      spiderData, 
      avgTotal, 
      totalRespondents: count 
    };
  }, [filteredData]);

  // 6. DEMOGRAFI COMPUTATION
  const getCounts = (key: keyof DashboardData) => {
    const counts: Record<string, number> = {};
    filteredData.forEach(item => {
      const val = String(item[key] || 'TIADA MAKLUMAT').toUpperCase();
      if (val === 'TARAF PENDIDIKAN TERTINGGI' || val === 'UMUR' || val === 'JANTINA') return;
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const demographics = useMemo(() => ({
    jantina: getCounts('jantina'),
    umur: getCounts('umur'),
    pendidikan: getCounts('tarafPendidikan')
  }), [filteredData]);

  // 7. COMMENTS & SUGGESTIONS LISTS
  const commentList = useMemo(() => {
    return filteredData
      .filter(d => d.komen && d.komen.trim().length > 2 && d.komen !== 'KOMEN PROGRAM')
      .map(d => d.komen!.trim());
  }, [filteredData]);

  const suggestionList = useMemo(() => {
    return filteredData
      .filter(d => d.cadangan && d.cadangan.trim().length > 2 && d.cadangan !== 'CADANGAN PROGRAM')
      .map(d => d.cadangan!.trim());
  }, [filteredData]);

  // Initialize editable states when data changes
  useEffect(() => {
    const penganjur = filteredData.length > 0 ? filteredData[0].penganjur : (allProgramData.length > 0 ? allProgramData[0].penganjur : "PENGANJUR TIDAK DINYATAKAN");
    setEditablePenganjur(penganjur);
  }, [filteredData, allProgramData]);

  useEffect(() => {
    setEditableComments(commentList);
  }, [commentList]);

  useEffect(() => {
    setEditableSuggestions(suggestionList);
  }, [suggestionList]);

  const displayInfo = filteredData.length > 0 ? filteredData[0] : allProgramData[0];
  const displayPenganjur = displayInfo?.penganjur || "PENGANJUR TIDAK DINYATAKAN";

  // --- AI LOGIC (S.M.A.R.T GOALS FRAMEWORK) ---
  const handleGenerateAI = async () => {
    if (!analysis) return;
    setIsAnalyzing(true);
    setAiAnalysisResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Constructing detailed context for the AI
      const breakdown = analysis.spiderData.map(s => `- ${s.subject}: ${s.A.toFixed(2)}`).join('\n');
      const topSuggestions = suggestionList.slice(0, 5).join('; ');

      const context = `
        PROGRAM: ${programName}
        PENGANJUR: ${displayPenganjur}
        SKOR KESELURUHAN: ${analysis.avgTotal.toFixed(2)} / 5.00
        JUMLAH RESPONDEN: ${analysis.totalRespondents}
        
        PECAHAN PRESTASI:
        ${breakdown}

        SAMPEL CADANGAN PESERTA:
        ${topSuggestions || "Tiada cadangan spesifik."}
      `;

      const prompt = `
        Anda adalah Perunding Strategik Kanan untuk JAIS. Sediakan ringkasan eksekutif (TL;DR) untuk pembentangan kepada Pengarah.
        
        ARAHAN:
        1. Jangan buat karangan panjang. Gunakan "Bullet Points".
        2. Gunakan Bahasa Melayu profesional, padat, dan "action-oriented".
        
        FORMAT JAWAPAN (WAJIB IKUT STRUKTUR INI):
        
        **📌 STATUS TERKINI**
        (Satu ayat ringkas merumuskan prestasi program ini. Sebutkan jika cemerlang atau perlu perhatian.)

        **🚀 PENAMBAHBAIKAN S.M.A.R.T**
        (Pilih SATU aspek paling kritikal untuk ditambah baik berdasarkan data di atas)
        
        - **Specific (Spesifik):** [Apa isu sebenar? Contoh: Audio sistem lemah]
        - **Measurable (Boleh Diukur):** [Sasaran KPI baru. Contoh: Tingkatkan skor logistik > 4.5]
        - **Achievable (Boleh Dicapai):** [Langkah kerja nyata. Contoh: Lantik kontraktor audio bertauliah]
        - **Relevant (Relevan):** [Kenapa penting? Contoh: Menjamin fokus peserta]
        - **Time-bound (Masa):** [Bila pelaksanaannya? Contoh: Program siri akan datang]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: context }, { text: prompt }] }],
      });
      setAiAnalysisResult(response.text);
    } catch (error) {
      alert("AI Service Unavailable. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGroupFeedbackWithAI = async () => {
      if (commentList.length === 0 && suggestionList.length === 0) {
        alert("Tiada komen atau cadangan untuk dianalisis.");
        return;
      }

      setIsGrouping(true);
      try {
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         const prompt = `
            Analisis senarai maklum balas berikut daripada peserta program "${programName}".
            Kelompokkan mereka kepada kategori utama (contoh: Logistik, Pengisian, Makanan, Fasilitator, Lain-lain).
            Abaikan komen yang tidak bermakna seperti "Tiada", "Bagus", "Mantap". Ambil yang ada isi penting sahaja.
            
            KOMEN: ${JSON.stringify(commentList)}
            CADANGAN: ${JSON.stringify(suggestionList)}

            Format Output (JSON Array sahaja, tiada markdown):
            [
              { "category": "Nama Kategori", "items": ["item 1", "item 2"] }
            ]
         `;

         const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
         });

         const text = response.text;
         if (text) {
             const data = JSON.parse(text);
             setGroupedFeedback(data);
         }
      } catch (e) {
         console.error(e);
         alert("Gagal mengelompokkan isu. Sila cuba lagi.");
      } finally {
         setIsGrouping(false);
      }
  };

  // --- JPEG DOWNLOAD LOGIC (New) ---
  const handleGenerateJPEG = async () => {
    if (!reportRef.current) return;
    setIsDownloadingImage(true);
    
    try {
      // Small delay to ensure rendering is stable
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Higher scale for better quality (Retina/Presentation)
        useCORS: true, // Allow loading external images if any
        backgroundColor: '#FFFFFF', // Ensure background is white
        logging: false,
        windowWidth: 1200 // Force desktop width for consistency
      });

      const image = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `Laporan_${programName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("JPEG Export Error:", error);
      alert("Gagal menjana imej. Sila cuba lagi.");
    } finally {
      setIsDownloadingImage(false);
    }
  };


  // --- PDF GENERATION LOGIC (Professional @react-pdf/renderer) ---
  const handleGeneratePDF = async () => {
    setIsDownloading(true);

    try {
      // 1. Capture Radar Chart as Image
      const radarElement = document.getElementById('radar-chart');
      let radarImage = '';
      if (radarElement) {
        const canvas = await html2canvas(radarElement, {
          scale: 2,
          backgroundColor: '#FFFFFF',
          logging: false,
        });
        radarImage = canvas.toDataURL('image/png');
      }

      // 2. Prepare Data for PDF
      const pdfProps = {
        programName: editableProgramName,
        penganjur: editablePenganjur,
        location: displayedLocation,
        date: selectedDate === 'SEMUA' ? (uniqueDates[0]?.label || '-') : selectedDate,
        totalRespondents: analysis?.totalRespondents || 0,
        avgScore: Number(analysis?.avgTotal.toFixed(2)) || 0,
        radarData: analysis?.spiderData || [],
        demographics: demographics,
        // Pass raw comments and suggestions for the new grid layout
        rawComments: editableComments,
        rawSuggestions: editableSuggestions,
        // Pass AI grouped feedback as well
        groupedComments: groupedFeedback || [],
        groupedSuggestions: [], 
        totalComments: editableComments.length,
        totalSuggestions: editableSuggestions.length,
      };

      // 3. Generate PDF Blob
      const blob = await pdf(<ProgramReportPDF {...pdfProps} />).toBlob();
      
      // 4. Trigger Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_Eksekutif_${editableProgramName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Maaf, ralat berlaku semasa menjana PDF profesional. Sila cuba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };


  if (allProgramData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-dark">Data Tidak Dijumpai</h2>
          <button onClick={onBack} className="text-lime-600 font-bold hover:underline mt-4">Kembali</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen flex flex-col font-sans">
      {/* Top Action Bar - Sticky */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 flex justify-between items-center shadow-sm print:hidden">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-dark font-bold text-xs sm:text-sm transition-all hover:bg-gray-100 px-3 py-2 rounded-lg">
              <ArrowLeft size={18} /> <span className="hidden sm:inline">KEMBALI</span>
            </button>

            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

            {/* FONT SIZE CONTROLS - Reduced visuals */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button onClick={() => handleFontSizeChange(false)} disabled={fontSizeLevel === 0} className="p-1.5 hover:bg-white rounded disabled:opacity-30"><Minus size={14}/></button>
                <span className="text-[10px] font-bold w-4 text-center text-gray-500">A</span>
                <button onClick={() => handleFontSizeChange(true)} disabled={fontSizeLevel === 2} className="p-1.5 hover:bg-white rounded disabled:opacity-30"><Plus size={14}/></button>
            </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditMode(!isEditMode)} 
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${isEditMode ? 'bg-lime-400 text-dark shadow-glow' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-white'}`}
          >
            <PenLine size={18} />
            <span>{isEditMode ? 'MOD WYSIWYG' : 'EDIT LAPORAN'}</span>
          </button>

          <button onClick={onRefresh} className="p-2.5 bg-gray-50 hover:bg-lime-50 text-gray-600 hover:text-lime-600 rounded-xl border border-gray-200 transition-all" title="Refresh">
             <RefreshCw size={18} />
          </button>
          
          {/* JPEG Button */}
          <button 
            onClick={handleGenerateJPEG} 
            disabled={isDownloadingImage} 
            className="bg-white border border-gray-200 text-dark px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 hover:border-lime-400 transition-all active:scale-95"
          >
            {isDownloadingImage ? <Loader2 size={18} className="animate-spin"/> : <ImageIcon size={18} />}
            <span className="hidden sm:inline">JPEG</span>
          </button>

          {/* PDF Button */}
          <button onClick={handleGeneratePDF} disabled={isDownloading} className="bg-[#1A1C1E] text-lime-400 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-all active:scale-95">
            {isDownloading ? <Loader2 size={18} className="animate-spin"/> : <FileDown size={18} />}
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </nav>

      {/* Main Report Container */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        {/* Added ref here to capture this container */}
        <div ref={reportRef} className="w-full max-w-6xl bg-white shadow-xl shadow-gray-200/50 rounded-none sm:rounded-3xl overflow-hidden min-h-[297mm]">
          
          {/* MODERN HEADER SECTION - Principle: Hierarchy & Clarity */}
          <div className="bg-[#1A1C1E] text-white p-10 sm:p-16 relative overflow-hidden">
             {/* Abstract Background */}
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-400/10 rounded-full blur-[120px] pointer-events-none -mr-32 -mt-32"></div>
             
             <div className="relative z-10 flex flex-col gap-8">
                {/* Meta Tag */}
                <div className="flex items-center gap-3">
                  <div className="bg-lime-400 text-black text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">
                     Laporan Program
                  </div>
                  <span className="text-gray-500 text-[10px] font-mono tracking-wider">
                     ID: {filteredData[0]?.id || 'N/A'}
                  </span>
                </div>
                
                {/* Title & Organizer */}
                <div>
                  {isEditMode ? (
                    <textarea
                      value={editableProgramName}
                      onChange={(e) => setEditableProgramName(e.target.value.toUpperCase())}
                      className="w-full bg-white/10 text-white font-black uppercase leading-tight tracking-tight break-words mb-4 p-2 rounded-xl border border-white/20 focus:outline-none focus:border-lime-400 text-3xl sm:text-4xl"
                      rows={2}
                    />
                  ) : (
                    <h1 className={`${fs('headerTitle')} font-black uppercase leading-tight tracking-tight break-words mb-4 text-white`}>
                      {editableProgramName}
                    </h1>
                  )}
                  
                  <div className="flex items-center gap-2 text-lime-400/90 border-l-2 border-lime-400 pl-3">
                     {isEditMode ? (
                       <input 
                        type="text"
                        value={editablePenganjur}
                        onChange={(e) => setEditablePenganjur(e.target.value.toUpperCase())}
                        className="bg-white/10 text-lime-400 font-bold uppercase tracking-wide opacity-90 p-1 rounded border border-white/10 focus:outline-none focus:border-lime-400 w-full"
                       />
                     ) : (
                       <p className={`${fs('subHeader')} font-bold uppercase tracking-wide opacity-90`}>
                         {editablePenganjur}
                       </p>
                     )}
                  </div>
                </div>
                
                {/* Info Grid - Refined for Scanning */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/10 mt-2">
                   {/* Date Filter - DYNAMIC */}
                   <div>
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tarikh</span>
                       <div className="relative">
                          {uniqueDates.length > 1 ? (
                            <>
                                <select 
                                  value={selectedDate}
                                  onChange={(e) => setSelectedDate(e.target.value)}
                                  className="bg-white/5 text-white border border-white/10 rounded-lg px-2 py-1.5 w-full text-sm font-medium appearance-none cursor-pointer hover:bg-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all pr-8 truncate"
                                >
                                  <option value="SEMUA" className="text-dark bg-white">SEMUA TARIKH ({uniqueDates.length})</option>
                                  {uniqueDates.map(d => (
                                    <option key={d.label} value={d.label} className="text-dark bg-white">{d.label}</option>
                                  ))}
                                </select>
                                <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                            </>
                          ) : (
                             <div className="flex items-center gap-2 text-white font-bold text-sm py-1.5">
                                <Calendar size={14} className="text-lime-500" />
                                {uniqueDates[0]?.label || '-'}
                             </div>
                          )}
                       </div>
                   </div>

                   {/* Location Display - READ ONLY */}
                   <div>
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Lokasi (Auto)</span>
                       <div className="relative">
                          <div className="flex items-center gap-2 text-white font-bold text-sm py-1.5 truncate">
                            <MapPin size={14} className="text-lime-500 shrink-0" />
                            <span className="truncate" title={displayedLocation}>{displayedLocation}</span>
                          </div>
                       </div>
                   </div>

                   {/* Division Filter - DYNAMIC */}
                   <div>
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Bahagian</span>
                       <div className="relative">
                          {uniqueBahagian.length > 1 ? (
                            <>
                              <select 
                                value={selectedBahagian}
                                onChange={(e) => setSelectedBahagian(e.target.value)}
                                className="bg-white/5 text-white border border-white/10 rounded-lg px-2 py-1.5 w-full text-sm font-medium appearance-none cursor-pointer hover:bg-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all pr-8 truncate"
                              >
                                <option value="SEMUA" className="text-dark bg-white">SEMUA BAHAGIAN ({uniqueBahagian.length})</option>
                                {uniqueBahagian.map(b => (
                                  <option key={b} value={b} className="text-dark bg-white">{b}</option>
                                ))}
                              </select>
                              <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                            </>
                          ) : (
                             <div className="flex items-center gap-2 text-white font-bold text-sm py-1.5">
                                <Building2 size={14} className="text-lime-500" />
                                {uniqueBahagian[0] || '-'}
                             </div>
                          )}
                       </div>
                   </div>
                </div>
             </div>
          </div>

          {!analysis ? (
             <div className="p-16 text-center text-gray-400 flex flex-col items-center gap-4">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                 <Filter size={24} className="opacity-20"/>
               </div>
               <p className="text-sm font-medium">Tiada data untuk gabungan filter ini.</p>
             </div>
          ) : (
          <>
            {/* 1. EXECUTIVE SUMMARY (KPIs) - High Visibility */}
            <div className="border-b border-gray-100 bg-white p-6 sm:p-8">
               <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-6">Ringkasan Eksekutif</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-lime-50 rounded-2xl p-6 border border-lime-100 flex items-center justify-between group hover:shadow-md transition-all">
                      <div>
                        <div className={`${fs('kpiLabel')} font-bold text-lime-700 uppercase tracking-wider mb-1`}>Purata Skor</div>
                        <div className="flex items-baseline gap-2">
                           <span className={`${fs('kpiValue')} font-black text-dark tracking-tighter`}>{analysis.avgTotal.toFixed(2)}</span>
                           <span className="text-gray-400 font-bold text-sm">/ 5.0</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-full text-lime-500 shadow-sm">
                         <Star size={24} fill="currentColor" />
                      </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
                      <div>
                        <div className={`${fs('kpiLabel')} font-bold text-gray-500 uppercase tracking-wider mb-1`}>Jumlah Responden</div>
                        <div className={`${fs('kpiValue')} font-black text-dark tracking-tighter`}>{analysis.totalRespondents}</div>
                      </div>
                      <div className="bg-white p-3 rounded-full text-gray-400 shadow-sm">
                         <Users size={24} />
                      </div>
                  </div>
               </div>
            </div>

            {/* 2. VISUAL ANALYSIS - Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 border-b border-gray-100">
              
              {/* Radar Chart (3/5 Width) */}
              <div className="lg:col-span-3 p-8 border-b lg:border-b-0 lg:border-r border-gray-50">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className={`${fs('sectionTitle')} font-bold text-dark flex items-center gap-2`}>
                        <TrendingUp size={20} className="text-lime-500"/> Analisis Radar
                     </h3>
                  </div>
                  <div className="h-[350px] w-full relative" id="radar-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={analysis.spiderData} outerRadius={110}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                        <Radar name="Skor" dataKey="A" stroke={COLORS.limeDark} fill={COLORS.lime} fillOpacity={0.5} strokeWidth={3} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '10px 15px'}} itemStyle={{fontWeight: 'bold', color: '#111'}} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Demographics Summary (2/5 Width) */}
              <div className="lg:col-span-2 p-8 bg-gray-50/50">
                  <h3 className={`${fs('sectionTitle')} font-bold text-dark mb-6 flex items-center gap-2`}>
                     <UserCheck size={20} className="text-lime-500"/> Profil Peserta
                  </h3>
                  
                  <div className="space-y-6">
                     {/* Jantina Section */}
                     <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Jantina</div>
                        <div className="space-y-2">
                            {demographics.jantina.length > 0 ? demographics.jantina.map((item, idx) => (
                                <div key={idx} className="bg-white border border-gray-100 p-3 rounded-xl flex justify-between items-center shadow-sm hover:border-lime-300 transition-colors">
                                <span className="font-bold text-sm text-dark">{item.name}</span>
                                <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded-md font-bold">{item.value}</span>
                                </div>
                            )) : <div className="text-gray-400 text-xs italic">Tiada data</div>}
                        </div>
                     </div>

                     {/* Umur Section */}
                     <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Umur</div>
                        <div className="space-y-2">
                            {demographics.umur.length > 0 ? demographics.umur.map((item, idx) => (
                                <div key={idx} className="bg-white border border-gray-100 p-3 rounded-xl flex justify-between items-center shadow-sm hover:border-lime-300 transition-colors">
                                <span className="font-bold text-sm text-dark truncate pr-2">{item.name}</span>
                                <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded-md font-bold">{item.value}</span>
                                </div>
                            )) : <div className="text-gray-400 text-xs italic">Tiada data</div>}
                        </div>
                     </div>

                     {/* Pendidikan Section */}
                     <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Taraf Pendidikan</div>
                         <div className="space-y-2">
                            {demographics.pendidikan.length > 0 ? demographics.pendidikan.map((item, idx) => (
                                <div key={idx} className="bg-white border border-gray-100 p-3 rounded-xl flex justify-between items-center shadow-sm hover:border-lime-300 transition-colors">
                                <span className="font-bold text-sm text-dark truncate pr-2">{item.name}</span>
                                <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded-md font-bold">{item.value}</span>
                                </div>
                            )) : <div className="text-gray-400 text-xs italic">Tiada data</div>}
                        </div>
                     </div>
                  </div>
              </div>
            </div>

            {/* 3. AI PREMIUM ANALYSIS CARD - Light Mode */}
            <div className="p-8 sm:p-12 bg-white">
              <div className="bg-white rounded-3xl overflow-hidden relative shadow-xl shadow-gray-100 border border-gray-200">
                  {/* Decorative Gradient - Lighter for white bg */}
                  <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-gray-50 to-transparent"></div>
                  <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-lime-100 rounded-full blur-[80px] opacity-60"></div>

                  <div className="relative z-10 p-8 sm:p-10">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                           <div className="flex items-center gap-2 mb-2">
                              <Sparkles size={16} className="text-lime-500 fill-lime-500 animate-pulse" />
                              <span className="text-lime-600 font-bold text-xs uppercase tracking-widest">Gemini AI Intelligence</span>
                           </div>
                           <h3 className="text-2xl font-black text-gray-900">Analisis Pintar Program</h3>
                           <p className="text-gray-500 text-sm mt-1 max-w-lg">
                              Dapatkan rumusan automatik mengenai kekuatan, kelemahan, dan cadangan penambahbaikan berdasarkan data.
                           </p>
                        </div>

                        {!aiAnalysisResult && !isAnalyzing && (
                           <button 
                              onClick={handleGenerateAI}
                              className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg hover:bg-gray-800"
                           >
                              <Bot size={18} /> JANA ANALISIS (TL;DR)
                           </button>
                        )}
                     </div>

                     {isAnalyzing && (
                        <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50">
                           <Loader2 size={32} className="text-lime-500 animate-spin mb-3" />
                           <p className="text-gray-500 font-medium">Sedang memproses data...</p>
                        </div>
                     )}

                      {aiAnalysisResult && (
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                           {isEditMode ? (
                             <textarea 
                                value={editableAnalysis || ''}
                                onChange={(e) => setEditableAnalysis(e.target.value)}
                                className="w-full min-h-[300px] p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-lime-400 font-medium text-gray-700 leading-relaxed"
                             />
                           ) : (
                             <div className={`prose prose-stone max-w-none prose-p:text-gray-600 prose-headings:text-gray-900 prose-strong:text-gray-900 ${fs('body')}`}>
                                {(editableAnalysis || aiAnalysisResult).split('\n').map((line, idx) => {
                                   if (line.trim().startsWith('**') || line.trim().startsWith('#')) 
                                      return <h4 key={idx} className="text-lime-600 font-bold text-lg mt-4 mb-2 uppercase tracking-wide">{line.replace(/\*\*/g, '').replace(/#/g, '')}</h4>;
                                   if (line.trim().startsWith('-')) 
                                      return <li key={idx} className="ml-4 text-gray-700 mb-1 list-disc marker:text-lime-500">{line.replace('-', '')}</li>;
                                   return <p key={idx} className="mb-2 leading-relaxed">{line}</p>;
                                })}
                             </div>
                           )}
                            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100" data-html2canvas-ignore>
                              <button onClick={handleGenerateAI} className="text-xs font-bold text-gray-400 hover:text-dark flex items-center gap-1 transition-colors"><RefreshCw size={12}/> JANA SEMULA</button>
                           </div>
                        </div>
                     )}
                  </div>
              </div>
            </div>

            {/* 4. FEEDBACK SECTION */}
            <div className="p-8 sm:p-12 bg-[#F9FAFB] border-t border-gray-100">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <h3 className={`${fs('sectionTitle')} font-black text-dark`}>Suara Peserta</h3>
                  
                  <div className="flex items-center gap-2" data-html2canvas-ignore>
                    {groupedFeedback && (
                         <button 
                            onClick={() => setGroupedFeedback(null)}
                            className="text-red-500 hover:text-red-700 px-3 py-2 text-xs font-bold flex items-center gap-2 transition-all"
                        >
                            <XCircle size={14}/> Reset View
                        </button>
                    )}
                    
                    {!groupedFeedback && !isGrouping && (commentList.length > 0 || suggestionList.length > 0) && (
                        <button 
                            onClick={handleGroupFeedbackWithAI}
                            className="bg-white border border-gray-200 text-dark hover:border-lime-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Layers size={14} className="text-lime-600"/> Kelompokkan Isu (AI)
                        </button>
                    )}
                    
                    {isGrouping && (
                        <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm text-lime-600">
                             <Loader2 size={14} className="animate-spin"/> Mengelompokkan...
                        </div>
                    )}
                  </div>
               </div>
               
               {/* Conditional Rendering: Grouped vs Raw Lists */}
               {groupedFeedback ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                    {groupedFeedback.map((group, idx) => (
                        <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-lime-300 transition-all">
                            <h4 className="font-black text-lime-700 uppercase text-xs tracking-wider border-b border-gray-100 pb-3 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-lime-400"></span>
                                {group.category}
                            </h4>
                            <ul className="space-y-3">
                                {group.items.map((item, i) => (
                                    <li key={i} className="text-sm text-gray-600 leading-relaxed pl-3 border-l-2 border-gray-100 text-xs sm:text-sm">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                 </div>
               ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Comments */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-lime-700">
                            <MessageSquare size={18} fill="currentColor" className="opacity-20"/>
                            <span className="font-bold text-sm uppercase tracking-wider">Komen ({commentList.length})</span>
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {editableComments.length > 0 ? (
                            editableComments.map((c, i) => (
                                <div key={i} className="group relative">
                                    {isEditMode ? (
                                        <textarea 
                                            value={c}
                                            onChange={(e) => {
                                                const newComments = [...editableComments];
                                                newComments[i] = e.target.value;
                                                setEditableComments(newComments);
                                            }}
                                            className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-sm text-gray-600 leading-relaxed focus:outline-none focus:border-lime-400"
                                            rows={2}
                                        />
                                    ) : (
                                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-sm text-gray-600 leading-relaxed">
                                            "{c}"
                                        </div>
                                    )}
                                    {isEditMode && (
                                        <button 
                                            onClick={() => setEditableComments(editableComments.filter((_, idx) => idx !== i))}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <XCircle size={12}/>
                                        </button>
                                    )}
                                </div>
                            ))
                            ) : (
                            <div className="text-gray-400 text-sm italic">Tiada komen.</div>
                            )}
                            {isEditMode && (
                                <button 
                                    onClick={() => setEditableComments([...editableComments, ''])}
                                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-lime-600 hover:border-lime-400 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                                    data-html2canvas-ignore
                                >
                                    <Plus size={14}/> TAMBAH KOMEN
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Suggestions */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-orange-600">
                            <Lightbulb size={18} fill="currentColor" className="opacity-20"/>
                            <span className="font-bold text-sm uppercase tracking-wider">Cadangan ({editableSuggestions.length})</span>
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {editableSuggestions.length > 0 ? (
                            editableSuggestions.map((c, i) => (
                                <div key={i} className="group relative">
                                    {isEditMode ? (
                                        <textarea 
                                            value={c}
                                            onChange={(e) => {
                                                const newSugg = [...editableSuggestions];
                                                newSugg[i] = e.target.value;
                                                setEditableSuggestions(newSugg);
                                            }}
                                            className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-sm text-gray-600 leading-relaxed border-l-4 border-l-orange-300 focus:outline-none focus:border-lime-400"
                                            rows={2}
                                        />
                                    ) : (
                                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-sm text-gray-600 leading-relaxed border-l-4 border-l-orange-300">
                                            {c}
                                        </div>
                                    )}
                                    {isEditMode && (
                                        <button 
                                            onClick={() => setEditableSuggestions(editableSuggestions.filter((_, idx) => idx !== i))}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                            data-html2canvas-ignore
                                        >
                                            <XCircle size={12}/>
                                        </button>
                                    )}
                                </div>
                            ))
                            ) : (
                            <div className="text-gray-400 text-sm italic">Tiada cadangan.</div>
                            )}
                            {isEditMode && (
                                <button 
                                    onClick={() => setEditableSuggestions([...editableSuggestions, ''])}
                                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-orange-600 hover:border-orange-400 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                                    data-html2canvas-ignore
                                >
                                    <Plus size={14}/> TAMBAH CADANGAN
                                </button>
                            )}
                        </div>
                    </div>
                </div>
               )}
            </div>

          </>
          )}
          
        </div>
      </div>
    </div>
  );
};
