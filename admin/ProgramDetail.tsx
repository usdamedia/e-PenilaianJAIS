
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  ArrowLeft, MessageSquare, Lightbulb, MapPin, Building2, 
  Calendar, FileDown, TrendingUp, AlertCircle, Quote, Users, UserCheck, Filter, Award, Star,
  Sparkles, Bot, Loader2, RefreshCw, Plus, Minus, Image as ImageIcon
} from 'lucide-react';
import { DashboardData } from '../dashboard/types';
import html2canvas from 'html2canvas';
import { pdf } from '@react-pdf/renderer';
import ProgramReportPDF from './ProgramReportPDF';

interface ProgramDetailProps {
  programName: string;
  data: DashboardData[];
  onBack: () => void;
  onRefresh: () => void;
  initialFilters?: {
    year?: string;
    date?: string;
    bahagian?: string;
    location?: string;
    penganjur?: string;
  };
}

const COLORS = {
  lime: '#D0F240',
  dark: '#1A1C1E',
  limeDark: '#9AB820',
  gray: '#F3F4F6',
  white: '#FFFFFF'
};

// Helper untuk format tarikh (ISO -> DD/MM/YYYY)
const formatDateKey = (isoString: string) => {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return '-';
  }
};

export const ProgramDetail: React.FC<ProgramDetailProps> = ({ programName, data, onBack, onRefresh, initialFilters }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  
  // Ref for capturing the report content
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Font Size State: 0 = Normal, 1 = Large, 2 = Extra Large
  const [fontSizeLevel, setFontSizeLevel] = useState(0);

  // AI States for General Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  // NEW: Appendix Scale State (0.5 to 1.5)
  const [appendixScale, setAppendixScale] = useState(1);

  // --- WYSIWYG EDITABLE STATES ---
  const [editableProgramName, setEditableProgramName] = useState(programName);
  const [editablePenganjur, setEditablePenganjur] = useState('');
  const [editableAnalysis, setEditableAnalysis] = useState<string | null>(null);
  const [editableComments, setEditableComments] = useState<string[]>([]);
  const [editableSuggestions, setEditableSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Handle "UNKNOWN" case: Set to empty string to trigger fallback text
    setEditableProgramName(programName === 'UNKNOWN' ? '' : programName);
  }, [programName]);

  useEffect(() => {
    if (aiAnalysisResult) {
      setEditableAnalysis(aiAnalysisResult);
    }
  }, [aiAnalysisResult]);

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>('SEMUA');
  const [selectedDate, setSelectedDate] = useState<string>('SEMUA');
  const [selectedBahagian, setSelectedBahagian] = useState<string>('SEMUA');
  const [selectedLocation, setSelectedLocation] = useState<string>('SEMUA');
  const [selectedPenganjur, setSelectedPenganjur] = useState<string>('SEMUA');

  useEffect(() => {
    setSelectedYear(initialFilters?.year || 'SEMUA');
    setSelectedDate(initialFilters?.date || 'SEMUA');
    setSelectedBahagian(initialFilters?.bahagian || 'SEMUA');
    setSelectedLocation(initialFilters?.location || 'SEMUA');
    setSelectedPenganjur(initialFilters?.penganjur || 'SEMUA');
  }, [programName, initialFilters]);

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
      // Handle "UNKNOWN" case from Dashboard to match empty/null data
      const dataName = d.programName || "UNKNOWN";
      const isProgramMatch = dataName === programName;
      
      const isNotHeader = d.programName !== 'NAMA PROGRAM' && d.tarafPendidikan !== 'TARAF PENDIDIKAN TERTINGGI';
      return isProgramMatch && isNotHeader;
    });
  }, [data, programName]);

  // 2. DYNAMIC FILTER OPTIONS

  // A. Unique Years (Level 1)
  const uniqueYears = useMemo(() => {
    const set = new Set(
      allProgramData
        .map(d => String(d.filterTahun || '').trim())
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [allProgramData]);

  // B. Unique Dates (Level 2 - Depends on Year)
  const uniqueDates = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') {
      source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    }

    const dates = source.map(d => ({
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
  }, [allProgramData, selectedYear]);

  // C. Unique Bahagian (Level 3 - Depends on Year & Date)
  const uniqueBahagian = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') {
        source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    }
    if (selectedDate !== 'SEMUA') {
        source = source.filter(d => formatDateKey(d.programDate) === selectedDate);
    }
    const set = new Set(source.map(d => d.bahagian).filter(Boolean));
    return Array.from(set).sort();
  }, [allProgramData, selectedYear, selectedDate]);

  // D. Unique Locations (Level 4 - Depends on Year, Date & Bahagian)
  const uniqueLocations = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    if (selectedDate !== 'SEMUA') source = source.filter(d => formatDateKey(d.programDate) === selectedDate);
    if (selectedBahagian !== 'SEMUA') source = source.filter(d => d.bahagian === selectedBahagian);
    
    const set = new Set(source.map(d => d.tempat).filter(Boolean));
    return Array.from(set).sort();
  }, [allProgramData, selectedYear, selectedDate, selectedBahagian]);

  // E. Unique Penganjur (Level 5 - Depends on Year, Date, Bahagian & Location)
  const uniquePenganjur = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    if (selectedDate !== 'SEMUA') source = source.filter(d => formatDateKey(d.programDate) === selectedDate);
    if (selectedBahagian !== 'SEMUA') source = source.filter(d => d.bahagian === selectedBahagian);
    if (selectedLocation !== 'SEMUA') source = source.filter(d => d.tempat === selectedLocation);

    const set = new Set(source.map(d => d.penganjur).filter(Boolean));
    return Array.from(set).sort();
  }, [allProgramData, selectedYear, selectedDate, selectedBahagian, selectedLocation]);

  // Reset Filters logic when parent filter changes
  useEffect(() => {
    if (selectedDate !== 'SEMUA' && !uniqueDates.some(d => d.label === selectedDate)) setSelectedDate('SEMUA');
    if (selectedBahagian !== 'SEMUA' && !uniqueBahagian.includes(selectedBahagian)) setSelectedBahagian('SEMUA');
    if (selectedLocation !== 'SEMUA' && !uniqueLocations.includes(selectedLocation)) setSelectedLocation('SEMUA');
    if (selectedPenganjur !== 'SEMUA' && !uniquePenganjur.includes(selectedPenganjur)) setSelectedPenganjur('SEMUA');
  }, [selectedYear, selectedDate, selectedBahagian, selectedLocation, selectedPenganjur, uniqueDates, uniqueBahagian, uniqueLocations, uniquePenganjur]);

  useEffect(() => {
      if (selectedBahagian !== 'SEMUA') {
          if (selectedLocation !== 'SEMUA' && !uniqueLocations.includes(selectedLocation)) setSelectedLocation('SEMUA');
          if (selectedPenganjur !== 'SEMUA' && !uniquePenganjur.includes(selectedPenganjur)) setSelectedPenganjur('SEMUA');
      }
  }, [selectedBahagian, uniqueLocations, selectedLocation, uniquePenganjur, selectedPenganjur]);

  useEffect(() => {
      if (selectedLocation !== 'SEMUA') {
          if (selectedPenganjur !== 'SEMUA' && !uniquePenganjur.includes(selectedPenganjur)) setSelectedPenganjur('SEMUA');
      }
  }, [selectedLocation, uniquePenganjur, selectedPenganjur]);


  // 3. FINAL FILTERED DATA
  const filteredData = useMemo(() => {
    return allProgramData.filter(d => {
      const matchYear = selectedYear === 'SEMUA' || String(d.filterTahun || '').trim() === selectedYear;
      const matchDate = selectedDate === 'SEMUA' || formatDateKey(d.programDate) === selectedDate;
      const matchBahagian = selectedBahagian === 'SEMUA' || d.bahagian === selectedBahagian;
      const matchLocation = selectedLocation === 'SEMUA' || d.tempat === selectedLocation;
      const matchPenganjur = selectedPenganjur === 'SEMUA' || d.penganjur === selectedPenganjur;
      return matchYear && matchDate && matchBahagian && matchLocation && matchPenganjur;
    });
  }, [allProgramData, selectedYear, selectedDate, selectedBahagian, selectedLocation, selectedPenganjur]);

  // 4. DERIVE LOCATION & PENGANJUR AUTOMATICALLY (Based on filteredData)
  const displayedLocation = useMemo(() => {
    if (selectedLocation !== 'SEMUA') return selectedLocation;
    if (filteredData.length === 0) return '-';
    const locations = Array.from(new Set(filteredData.map(d => d.tempat).filter(Boolean)));
    
    if (locations.length === 0) return '-';
    if (locations.length === 1) return locations[0];
    return `${locations.length} LOKASI BERBEZA`;
  }, [filteredData, selectedLocation]);

  const displayedPenganjur = useMemo(() => {
    if (selectedPenganjur !== 'SEMUA') return selectedPenganjur;
    if (filteredData.length === 0) return '-';
    const penganjurs = Array.from(new Set(filteredData.map(d => d.penganjur).filter(Boolean)));
    
    if (penganjurs.length === 0) return '-';
    if (penganjurs.length === 1) return penganjurs[0];
    return `${penganjurs.length} PENGANJUR BERBEZA`;
  }, [filteredData, selectedPenganjur]);

  const activeFilterSummary = useMemo(() => {
    const yearLabel = selectedYear !== 'SEMUA'
      ? selectedYear
      : uniqueYears.length === 1
        ? uniqueYears[0]
        : `${uniqueYears.length} TAHUN`;

    const dateLabel = selectedDate !== 'SEMUA'
      ? selectedDate
      : uniqueDates.length === 1
        ? (uniqueDates[0]?.label || '-')
        : `${uniqueDates.length} TARIKH`;

    const bahagianLabel = selectedBahagian !== 'SEMUA'
      ? selectedBahagian
      : uniqueBahagian.length === 1
        ? (uniqueBahagian[0] || '-')
        : `${uniqueBahagian.length} BAHAGIAN`;

    const locationLabel = selectedLocation !== 'SEMUA'
      ? selectedLocation
      : displayedLocation;

    const penganjurLabel = selectedPenganjur !== 'SEMUA'
      ? selectedPenganjur
      : displayedPenganjur;

    return [
      { label: 'Tahun', value: yearLabel },
      { label: 'Tarikh', value: dateLabel },
      { label: 'Bahagian', value: bahagianLabel },
      { label: 'Lokasi', value: locationLabel },
      { label: 'Penganjur', value: penganjurLabel }
    ];
  }, [
    selectedYear,
    uniqueYears,
    selectedDate,
    uniqueDates,
    selectedBahagian,
    uniqueBahagian,
    selectedLocation,
    displayedLocation,
    selectedPenganjur,
    displayedPenganjur
  ]);

  // 5. ANALISIS COMPUTATION
  const analysis = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const count = filteredData.length;
    const sum = (key: keyof DashboardData) => filteredData.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    const safeAvg = (total: number) => parseFloat((total / count).toFixed(2));

    const spiderData = [
      { subject: 'Keurusetiaan', A: safeAvg(sum('skorUrusetia')), fullMark: 5 },
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
    setEditablePenganjur(displayedPenganjur);
  }, [displayedPenganjur]);

  useEffect(() => {
    setEditableComments(commentList);
  }, [commentList]);

  useEffect(() => {
    setEditableSuggestions(suggestionList);
  }, [suggestionList]);

  const displayInfo = filteredData.length > 0 ? filteredData[0] : allProgramData[0];
  const displayPenganjur = displayInfo?.penganjur || "PENGANJUR TIDAK DINYATAKAN";

  // --- AI LOGIC (DISABLED TO SAVE TOKENS) ---
  const handleGenerateAI = async () => {
    setAiAnalysisResult("Analisis AI telah dinyahaktifkan untuk menjimatkan penggunaan token. Sila semak data secara manual.");
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
        bahagian: selectedBahagian !== 'SEMUA' ? selectedBahagian : (uniqueBahagian.length > 1 ? `PELBAGAI BAHAGIAN (${uniqueBahagian.length})` : (uniqueBahagian[0] || '-')),
        date: selectedDate !== 'SEMUA'
          ? selectedDate
          : selectedYear !== 'SEMUA'
            ? `TAHUN ${selectedYear}`
            : (uniqueDates.length > 1 ? `PELBAGAI TARIKH (${uniqueDates.length})` : (uniqueDates[0]?.label || '-')),
        totalRespondents: analysis?.totalRespondents || 0,
        avgScore: Number(analysis?.avgTotal.toFixed(2)) || 0,
        radarData: analysis?.spiderData || [],
        demographics: demographics,
        // Pass raw comments and suggestions for the new grid layout
        rawComments: editableComments,
        rawSuggestions: editableSuggestions,
        totalComments: editableComments.length,
        totalSuggestions: editableSuggestions.length,
        aiAnalysis: editableAnalysis || aiAnalysisResult,
        appendixScale: appendixScale,
      };

      // 3. Generate PDF Blob
      const blob = await pdf(<ProgramReportPDF {...pdfProps} />).toBlob();
      
      // 4. Trigger Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const exportContext = [
        selectedYear !== 'SEMUA' ? selectedYear : '',
        selectedDate !== 'SEMUA' ? selectedDate : '',
        selectedBahagian !== 'SEMUA' ? selectedBahagian : '',
        selectedLocation !== 'SEMUA' ? selectedLocation : '',
        selectedPenganjur !== 'SEMUA' ? selectedPenganjur : ''
      ]
        .filter(Boolean)
        .join('_')
        .replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Laporan_Eksekutif_${editableProgramName.replace(/[^a-zA-Z0-9]/g, '_')}${exportContext ? `_${exportContext}` : ''}.pdf`;
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
    <div className="bg-[#F8F9FA] h-screen flex flex-col font-sans overflow-hidden">
      {/* Top Action Bar - Sticky */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-8 py-4 flex justify-between items-center shadow-sm print:hidden">
        <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack} 
              className="flex items-center gap-2 text-gray-500 hover:text-dark font-bold text-xs sm:text-sm transition-all hover:bg-gray-100 px-4 py-2.5 rounded-xl border border-transparent hover:border-gray-200"
            >
              <ArrowLeft size={18} /> <span className="hidden sm:inline">KEMBALI</span>
            </motion.button>

            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

            {/* Program Name Display - Sticky Context */}
            <div className="hidden lg:flex flex-col max-w-[300px] xl:max-w-[500px]">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">SEDANG DILIHAT</span>
               <span className="text-xs font-black text-dark uppercase truncate">
                  {editableProgramName || 'PROGRAM TIDAK DINYATAKAN'}
               </span>
            </div>

            <div className="h-8 w-px bg-gray-200 hidden lg:block"></div>

            {/* FONT SIZE CONTROLS */}
            <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl border border-gray-200">
                <button 
                  onClick={() => handleFontSizeChange(false)} 
                  disabled={fontSizeLevel === 0} 
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-30 transition-all"
                >
                  <Minus size={14}/>
                </button>
                <div className="px-2 flex flex-col items-center">
                  <span className="text-[10px] font-black text-gray-400 leading-none mb-0.5">SAIZ</span>
                  <span className="text-[10px] font-bold text-dark leading-none">{fontSizeLevel + 1}</span>
                </div>
                <button 
                  onClick={() => handleFontSizeChange(true)} 
                  disabled={fontSizeLevel === 2} 
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-30 transition-all"
                >
                  <Plus size={14}/>
                </button>
            </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            onClick={onRefresh} 
            className="p-3 bg-gray-50 hover:bg-lime-50 text-gray-600 hover:text-lime-600 rounded-xl border border-gray-200 transition-all shadow-sm" 
            title="Refresh"
          >
             <RefreshCw size={18} />
          </motion.button>
          
          <div className="h-8 w-px bg-gray-200 hidden sm:block mx-1"></div>

          {/* JPEG Button */}
          <motion.button 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGenerateJPEG} 
            disabled={isDownloadingImage} 
            className="bg-white border border-gray-200 text-dark px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 hover:border-lime-400 transition-all shadow-sm disabled:opacity-50"
          >
            {isDownloadingImage ? <Loader2 size={18} className="animate-spin"/> : <ImageIcon size={18} className="text-lime-500" />}
            <span className="hidden sm:inline">JPEG</span>
          </motion.button>

          {/* PDF Button */}
          <motion.button 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGeneratePDF} 
            disabled={isDownloading} 
            className="bg-dark text-lime-400 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-lime-900/10 disabled:opacity-50"
          >
            {isDownloading ? <Loader2 size={18} className="animate-spin"/> : <FileDown size={18} />}
            <span className="hidden sm:inline">PDF</span>
          </motion.button>
        </div>
      </nav>

      {/* Main Report Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center custom-scrollbar">
        {/* Added ref here to capture this container */}
        <div ref={reportRef} className="w-full max-w-6xl bg-white shadow-xl shadow-gray-200/50 rounded-none sm:rounded-3xl min-h-[297mm] flex flex-col">
          
          {/* MODERN HEADER SECTION - Principle: Hierarchy & Clarity */}
          <div className="bg-[#1A1C1E] text-white p-12 sm:p-20 relative overflow-hidden rounded-t-none sm:rounded-t-[2.5rem]">
             {/* Abstract Background */}
             <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lime-400/10 rounded-full blur-[150px] pointer-events-none -mr-40 -mt-40"></div>
             <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-lime-400/5 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20"></div>
             
             <div className="relative z-10 flex flex-col gap-10">
                {/* Meta Tag */}
                <div className="flex items-center gap-4">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-lime-400 text-black text-[11px] font-black px-6 py-2 rounded-full tracking-[0.3em] uppercase shadow-xl shadow-lime-400/30"
                  >
                     LAPORAN: {editableProgramName || 'PROGRAM'}
                  </motion.div>
                  <div className="h-px w-8 bg-white/20"></div>
                  <span className="text-gray-500 text-[10px] font-black tracking-[0.2em] uppercase">
                     ID: {filteredData[0]?.id || 'N/A'}
                  </span>
                </div>
                
                {/* Title & Organizer */}
                <div className="max-w-4xl">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="max-h-[400px] overflow-y-auto custom-scrollbar pr-6 mb-6 group"
                    >
                      <textarea
                        value={editableProgramName}
                        onChange={(e) => setEditableProgramName(e.target.value)}
                        className={`${fs('headerTitle')} font-black uppercase leading-[1.1] tracking-tight text-white drop-shadow-2xl w-full bg-transparent border-none focus:ring-0 resize-none p-0 placeholder:text-white/20 selection:bg-lime-400/30`}
                        placeholder="NAMA PROGRAM TIDAK DINYATAKAN"
                        spellCheck={false}
                        rows={1}
                        onFocus={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          }
                        }}
                      />
                    </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3 text-lime-400 border-l-4 border-lime-400 pl-5 py-1 group"
                  >
                       <input
                         type="text"
                         value={editablePenganjur}
                         onChange={(e) => setEditablePenganjur(e.target.value)}
                         className={`${fs('subHeader')} font-black uppercase tracking-[0.1em] opacity-90 bg-transparent border-none focus:ring-0 p-0 w-full placeholder:text-lime-400/30`}
                         placeholder="PENGANJUR TIDAK DINYATAKAN"
                       />
                  </motion.div>
                </div>
                
                {/* Filter Section Header - Principle: Interactive Analysis */}
                <div className="flex items-center gap-3 mt-12 mb-6">
                   <div className="p-1.5 bg-lime-400/10 rounded-lg">
                      <Filter size={14} className="text-lime-400" />
                   </div>
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Tapis Mengikut Keperluan</span>
                </div>

                {/* Info Grid - Refined for Scanning */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 pb-10 border-b border-white/10">
                   {/* Year Filter - DYNAMIC */}
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Tahun</span>
                       <div className="relative">
                          {uniqueYears.length > 1 ? (
                            <div className="group">
                                <select
                                  value={selectedYear}
                                  onChange={(e) => setSelectedYear(e.target.value)}
                                  className="bg-white/5 text-white border border-white/10 rounded-xl px-4 py-2.5 w-full text-xs font-black appearance-none cursor-pointer hover:bg-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all pr-10 truncate uppercase tracking-wider"
                                >
                                  <option value="SEMUA" className="text-dark bg-white">SEMUA TAHUN ({uniqueYears.length})</option>
                                  {uniqueYears.map(year => (
                                    <option key={year} value={year} className="text-dark bg-white">{year}</option>
                                  ))}
                                </select>
                                <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-lime-400 transition-colors" />
                            </div>
                          ) : (
                             <div className="flex items-center gap-3 text-white font-black text-xs py-2.5 bg-white/5 px-4 rounded-xl border border-white/5">
                                <Calendar size={16} className="text-lime-400" />
                                <span className="uppercase tracking-wider">{uniqueYears[0] || '-'}</span>
                             </div>
                          )}
                       </div>
                   </motion.div>

                   {/* Date Filter - DYNAMIC */}
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Tarikh</span>
                       <div className="relative">
                          {uniqueDates.length > 1 ? (
                            <div className="group">
                                <select 
                                  value={selectedDate}
                                  onChange={(e) => setSelectedDate(e.target.value)}
                                  className="bg-white/5 text-white border border-white/10 rounded-xl px-4 py-2.5 w-full text-xs font-black appearance-none cursor-pointer hover:bg-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all pr-10 truncate uppercase tracking-wider"
                                >
                                  <option value="SEMUA" className="text-dark bg-white">SEMUA TARIKH ({uniqueDates.length})</option>
                                  {uniqueDates.map(d => (
                                    <option key={d.label} value={d.label} className="text-dark bg-white">{d.label}</option>
                                  ))}
                                </select>
                                <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-lime-400 transition-colors" />
                            </div>
                          ) : (
                             <div className="flex items-center gap-3 text-white font-black text-xs py-2.5 bg-white/5 px-4 rounded-xl border border-white/5">
                                <Calendar size={16} className="text-lime-400" />
                                <span className="uppercase tracking-wider">{uniqueDates[0]?.label || '-'}</span>
                             </div>
                          )}
                       </div>
                   </motion.div>

                   {/* Bahagian Filter - DYNAMIC */}
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Bahagian</span>
                       <div className="relative">
                          {uniqueBahagian.length > 1 ? (
                            <>
                              <select 
                                value={selectedBahagian}
                                onChange={(e) => setSelectedBahagian(e.target.value)}
                                className="bg-white/5 text-white border border-white/10 rounded-xl px-4 py-2.5 w-full text-xs font-black appearance-none cursor-pointer hover:bg-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all pr-10 truncate uppercase tracking-wider"
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
                   </motion.div>

                   {/* Location Filter - DYNAMIC */}
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Lokasi</span>
                       <div className="relative">
                          {uniqueLocations.length > 1 ? (
                            <>
                              <select 
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="bg-white/5 text-white border border-white/10 rounded-xl px-4 py-2.5 w-full text-xs font-black appearance-none cursor-pointer hover:bg-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all pr-10 truncate uppercase tracking-wider"
                              >
                                <option value="SEMUA" className="text-dark bg-white">SEMUA LOKASI ({uniqueLocations.length})</option>
                                {uniqueLocations.map(l => (
                                  <option key={l} value={l} className="text-dark bg-white">{l}</option>
                                ))}
                              </select>
                              <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                            </>
                          ) : (
                             <div className="flex items-center gap-2 text-white font-bold text-sm py-1.5 truncate">
                                <MapPin size={14} className="text-lime-500 shrink-0" />
                                <span className="truncate" title={uniqueLocations[0]}>{uniqueLocations[0] || '-'}</span>
                             </div>
                          )}
                       </div>
                   </motion.div>

                   {/* Penganjur Filter - DYNAMIC */}
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Penganjur</span>
                       <div className="relative">
                          {uniquePenganjur.length > 1 ? (
                            <>
                              <select 
                                value={selectedPenganjur}
                                onChange={(e) => setSelectedPenganjur(e.target.value)}
                                className="bg-white/5 text-white border border-white/10 rounded-xl px-4 py-2.5 w-full text-xs font-black appearance-none cursor-pointer hover:bg-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all pr-10 truncate uppercase tracking-wider"
                              >
                                <option value="SEMUA" className="text-dark bg-white">SEMUA PENGANJUR ({uniquePenganjur.length})</option>
                                {uniquePenganjur.map(p => (
                                  <option key={p} value={p} className="text-dark bg-white">{p}</option>
                                ))}
                              </select>
                              <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                            </>
                          ) : (
                             <div className="flex items-center gap-2 text-white font-bold text-sm py-1.5 truncate">
                                <Award size={14} className="text-lime-500 shrink-0" />
                                <span className="truncate" title={uniquePenganjur[0]}>{uniquePenganjur[0] || '-'}</span>
                             </div>
                          )}
                       </div>
                   </motion.div>
                </div>

                <div className="flex flex-wrap gap-3 pt-6">
                  {activeFilterSummary.map((item) => (
                    <div
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/85"
                    >
                      <span className="text-gray-500">{item.label}</span>
                      <span className="text-lime-400 truncate max-w-[220px]" title={item.value}>{item.value || '-'}</span>
                    </div>
                  ))}
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
            <div className="border-b border-gray-100 bg-white p-8 sm:p-10">
               <div className="flex items-center gap-3 mb-8">
                  <div className="h-px flex-1 bg-gray-100"></div>
                  <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.4em] bg-gray-50 px-6 py-2 rounded-full border border-gray-100 shadow-sm">Ringkasan Eksekutif</h3>
                  <div className="h-px flex-1 bg-gray-100"></div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-lime-50 to-white rounded-[2.5rem] p-8 border border-lime-100 flex items-center justify-between group hover:shadow-xl hover:shadow-lime-900/5 transition-all duration-500"
                  >
                      <div>
                        <div className={`${fs('kpiLabel')} font-black text-lime-700 uppercase tracking-widest mb-2 opacity-70`}>Purata Skor</div>
                        <div className="flex items-baseline gap-2">
                           <span className={`${fs('kpiValue')} font-black text-dark tracking-tighter`}>{analysis.avgTotal.toFixed(2)}</span>
                           <span className="text-gray-400 font-bold text-lg">/ 5.0</span>
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-3xl text-lime-500 shadow-sm group-hover:scale-110 transition-transform duration-500">
                         <Star size={32} fill="currentColor" />
                      </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-gray-50 to-white rounded-[2.5rem] p-8 border border-gray-100 flex items-center justify-between group hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-500"
                  >
                      <div>
                        <div className={`${fs('kpiLabel')} font-black text-gray-500 uppercase tracking-widest mb-2 opacity-70`}>Jumlah Responden</div>
                        <div className={`${fs('kpiValue')} font-black text-dark tracking-tighter`}>{analysis.totalRespondents}</div>
                      </div>
                      <div className="bg-white p-5 rounded-3xl text-gray-400 shadow-sm group-hover:scale-110 transition-transform duration-500">
                         <Users size={32} />
                      </div>
                  </motion.div>
               </div>
            </div>

            {/* 2. VISUAL ANALYSIS - Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 border-b border-gray-100 bg-white">
              
              {/* Radar Chart (3/5 Width) */}
              <div className="lg:col-span-3 p-10 border-b lg:border-b-0 lg:border-r border-gray-100">
                  <div className="flex justify-between items-center mb-10">
                     <h3 className={`${fs('sectionTitle')} font-black text-dark flex items-center gap-3`}>
                        <div className="p-2 bg-lime-100 rounded-xl text-lime-600">
                           <TrendingUp size={20}/>
                        </div>
                        Analisis Radar
                     </h3>
                  </div>
                  <div className="h-[400px] w-full relative" id="radar-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={analysis.spiderData} outerRadius={130}>
                        <PolarGrid stroke="#F3F4F6" strokeWidth={2} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 800, fill: '#6B7280', letterSpacing: '0.05em' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                        <Radar 
                          name="Skor" 
                          dataKey="A" 
                          stroke={COLORS.limeDark} 
                          fill={COLORS.lime} 
                          fillOpacity={0.4} 
                          strokeWidth={4} 
                          animationDuration={2000}
                        />
                        <Tooltip 
                          contentStyle={{
                            borderRadius: '20px', 
                            border: '1px solid #F3F4F6', 
                            boxShadow: '0 20px 50px rgba(0,0,0,0.08)', 
                            padding: '12px 20px'
                          }} 
                          itemStyle={{fontWeight: '900', color: '#111', fontSize: '14px'}} 
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Demographics Summary (2/5 Width) */}
              <div className="lg:col-span-2 p-10 bg-gray-50/30">
                  <h3 className={`${fs('sectionTitle')} font-black text-dark mb-8 flex items-center gap-3`}>
                     <div className="p-2 bg-gray-100 rounded-xl text-gray-600">
                        <UserCheck size={20}/>
                     </div>
                     Profil Peserta
                  </h3>
                  
                  <div className="space-y-8">
                     {/* Jantina Section */}
                     <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Jantina</div>
                        <div className="space-y-3">
                            {demographics.jantina.length > 0 ? demographics.jantina.map((item, idx) => (
                                <div key={idx} className="bg-white border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm hover:border-lime-300 hover:shadow-md transition-all duration-300">
                                <span className="font-bold text-sm text-dark">{item.name}</span>
                                <span className="bg-lime-50 text-lime-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-lime-100">{item.value}</span>
                                </div>
                            )) : <div className="text-gray-400 text-xs italic">Tiada data</div>}
                        </div>
                     </motion.div>

                     {/* Umur Section */}
                     <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Umur</div>
                        <div className="space-y-3">
                            {demographics.umur.length > 0 ? demographics.umur.map((item, idx) => (
                                <div key={idx} className="bg-white border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm hover:border-lime-300 hover:shadow-md transition-all duration-300">
                                <span className="font-bold text-sm text-dark truncate pr-2">{item.name}</span>
                                <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-3 py-1.5 rounded-lg border border-gray-200">{item.value}</span>
                                </div>
                            )) : <div className="text-gray-400 text-xs italic">Tiada data</div>}
                        </div>
                     </motion.div>

                     {/* Pendidikan Section */}
                     <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Taraf Pendidikan</div>
                         <div className="space-y-3">
                            {demographics.pendidikan.length > 0 ? demographics.pendidikan.map((item, idx) => (
                                <div key={idx} className="bg-white border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm hover:border-lime-300 hover:shadow-md transition-all duration-300">
                                <span className="font-bold text-sm text-dark truncate pr-2">{item.name}</span>
                                <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-3 py-1.5 rounded-lg border border-gray-200">{item.value}</span>
                                </div>
                            )) : <div className="text-gray-400 text-xs italic">Tiada data</div>}
                        </div>
                     </motion.div>
                  </div>
              </div>
            </div>

            {/* 3. AI PREMIUM ANALYSIS CARD - Light Mode */}
            <div className="p-8 sm:p-12 bg-white">
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-white rounded-[3rem] overflow-hidden relative shadow-2xl shadow-gray-200/50 border border-gray-100"
              >
                  {/* Decorative Gradient */}
                  <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l from-lime-50/50 to-transparent"></div>
                  <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-lime-100/40 rounded-full blur-[100px]"></div>

                  <div className="relative z-10 p-10 sm:p-14">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
                        <div>
                           <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-lime-400 rounded-lg shadow-lg shadow-lime-400/20">
                                 <Sparkles size={16} className="text-black fill-black animate-pulse" />
                              </div>
                              <span className="text-lime-600 font-black text-[10px] uppercase tracking-[0.2em]">Gemini AI Intelligence</span>
                           </div>
                           <h3 className="text-3xl font-black text-gray-900 tracking-tight">Analisis Pintar Program</h3>
                           <p className="text-gray-500 text-sm mt-2 max-w-xl font-medium leading-relaxed">
                              Rumusan automatik mengenai kekuatan, kelemahan, dan cadangan penambahbaikan yang dijana secara pintar daripada maklum balas peserta.
                           </p>
                        </div>

                        {!aiAnalysisResult && !isAnalyzing && (
                           <motion.button 
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleGenerateAI}
                              className="bg-black text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl hover:bg-gray-800"
                           >
                              <Bot size={20} className="text-lime-400" /> JANA ANALISIS (TL;DR)
                           </motion.button>
                        )}
                     </div>

                     {isAnalyzing && (
                        <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
                           <div className="relative">
                              <Loader2 size={48} className="text-lime-500 animate-spin mb-4" />
                              <Sparkles size={16} className="absolute top-0 right-0 text-lime-400 animate-bounce" />
                           </div>
                           <p className="text-gray-500 font-black text-xs uppercase tracking-widest">Sedang memproses data...</p>
                        </div>
                     )}

                      {aiAnalysisResult && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-[2rem] p-8 sm:p-10 border border-gray-100 shadow-sm relative group"
                        >
                             <div className={`prose prose-stone max-w-none prose-p:text-gray-600 prose-headings:text-gray-900 prose-strong:text-gray-900 ${fs('body')}`}>
                                {(editableAnalysis || aiAnalysisResult).split('\n').map((line, idx) => {
                                   if (line.trim().startsWith('**') || line.trim().startsWith('#')) 
                                      return <h4 key={idx} className="text-lime-600 font-black text-lg mt-8 mb-4 uppercase tracking-wide flex items-center gap-2">
                                         <span className="w-1.5 h-6 bg-lime-400 rounded-full"></span>
                                         {line.replace(/\*\*/g, '').replace(/#/g, '')}
                                      </h4>;
                                   if (line.trim().startsWith('-')) 
                                      return <li key={idx} className="ml-6 text-gray-700 mb-2 list-disc marker:text-lime-500 font-medium">{line.replace('-', '')}</li>;
                                   return <p key={idx} className="mb-4 leading-relaxed font-medium">{line}</p>;
                                })}
                             </div>
                            <div className="flex justify-end mt-8 pt-6 border-t border-gray-50" data-html2canvas-ignore>
                              <button 
                                onClick={handleGenerateAI} 
                                className="text-[10px] font-black text-gray-400 hover:text-lime-600 flex items-center gap-2 transition-all uppercase tracking-widest"
                              >
                                <RefreshCw size={14}/> Jana Semula Analisis
                              </button>
                           </div>
                        </motion.div>
                       )}
                   </div>
               </motion.div>
            </div>

            {/* 5. APPENDIX - RAW DATA TABLES (SIDE BY SIDE) */}
            <div className="p-10 sm:p-16 bg-white border-t border-gray-100 break-before-page">
               <div className="mb-12 border-b border-gray-100 pb-8 flex flex-col md:flex-row justify-between items-end gap-6">
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-3">Lampiran Maklum Balas</h3>
                    <h2 className={`${fs('sectionTitle')} font-black text-dark tracking-tight`}>Senarai Penuh Komen & Cadangan</h2>
                  </div>
                  
                  {/* Scale Control */}
                  <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100" data-html2canvas-ignore>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Skala Kandungan:</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setAppendixScale(prev => Math.max(0.5, prev - 0.1))}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm hover:text-lime-600 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="w-12 text-center font-black text-dark text-xs">
                        {Math.round(appendixScale * 100)}%
                      </div>
                      <button 
                        onClick={() => setAppendixScale(prev => Math.min(1.5, prev + 0.1))}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm hover:text-lime-600 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
               </div>

               <div 
                 className="grid grid-cols-1 lg:grid-cols-2 gap-12"
                 style={{ transform: `scale(${appendixScale})`, transformOrigin: 'top left', width: `${100 / appendixScale}%` }}
               >
                  {/* Raw Comments Column */}
                  <div className="flex flex-col h-full">
                     <div className="flex items-center gap-3 mb-6 p-4 bg-lime-50 rounded-2xl border border-lime-100">
                        <div className="p-2 bg-white rounded-lg text-lime-600 shadow-sm">
                           <MessageSquare size={18} />
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest text-lime-800">Komen Peserta</span>
                     </div>
                     <div className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm flex-1 bg-white">
                        <table className="w-full text-left border-collapse">
                           <tbody className="divide-y divide-gray-50">
                              {editableComments.length > 0 ? editableComments.map((c, i) => (
                                 <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-[10px] font-black text-gray-300 w-12 align-top pt-5">{String(i + 1).padStart(2, '0')}</td>
                                    <td className="px-6 py-4 text-xs sm:text-sm text-gray-600 italic leading-relaxed align-top font-medium">
                                        "{c}"
                                    </td>
                                 </tr>
                              )) : (
                                 <tr>
                                    <td colSpan={2} className="px-8 py-20 text-center text-gray-400 text-xs font-medium italic">Tiada komen direkodkan.</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  {/* Raw Suggestions Column */}
                  <div className="flex flex-col h-full">
                     <div className="flex items-center gap-3 mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                        <div className="p-2 bg-white rounded-lg text-orange-600 shadow-sm">
                           <Lightbulb size={18} />
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest text-orange-800">Cadangan Peserta</span>
                     </div>
                     <div className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm flex-1 bg-white">
                        <table className="w-full text-left border-collapse">
                           <tbody className="divide-y divide-gray-50">
                              {editableSuggestions.length > 0 ? editableSuggestions.map((s, i) => (
                                 <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-[10px] font-black text-gray-300 w-12 align-top pt-5">{String(i + 1).padStart(2, '0')}</td>
                                    <td className="px-6 py-4 text-xs sm:text-sm text-gray-600 leading-relaxed align-top font-medium">
                                        {s}
                                    </td>
                                 </tr>
                              )) : (
                                 <tr>
                                    <td colSpan={2} className="px-8 py-20 text-center text-gray-400 text-xs font-medium italic">Tiada cadangan direkodkan.</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            </div>


          </>
          )}
          
        </div>
      </div>
    </div>
  );
};
