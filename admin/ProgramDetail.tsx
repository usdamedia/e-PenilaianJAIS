import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  ArrowLeft, MessageSquare, Lightbulb, MapPin, Building2, 
  Calendar, FileDown, TrendingUp, AlertCircle, Users, UserCheck, Filter, Award, Star,
  Sparkles, Bot, Loader2, RefreshCw, Plus, Minus, Image as ImageIcon, Save, CheckCircle2,
  Copy, Share2, Search, X, Check, Bookmark, FileText, ChevronRight, SlidersHorizontal, Trash2
} from 'lucide-react';
import { DashboardData } from '../dashboard/types';
import html2canvas from 'html2canvas';
import { pdf } from '@react-pdf/renderer';
import ProgramReportPDF from './ProgramReportPDF';
import { MONTHS } from '../constants';

interface ProgramDetailProps {
  programName: string;
  data: DashboardData[];
  onBack: () => void;
  onRefresh: () => void;
  initialFilters?: {
    year?: string;
    month?: string;
    quarter?: string;
    date?: string;
    bahagian?: string;
    location?: string;
    penganjur?: string;
  };
}

interface ProgramVariantOption {
  id: string;
  year: string;
  month: string;
  quarter: string;
  date: string;
  bahagian: string;
  location: string;
  penganjur: string;
  totalRespondents: number;
}

interface StoredFeedbackHighlights {
  commentIndexes: number[];
  suggestionIndexes: number[];
  commentSignature: string;
  suggestionSignature: string;
  savedAt: string;
}

const COLORS = {
  lime: '#D0F240',
  dark: '#111827',
  limeDark: '#84A600',
  gray: '#F3F4F6',
  white: '#FFFFFF'
};

const HIGHLIGHT_STORAGE_PREFIX = 'ePenilaian:programDetailHighlights:v1';

const createFeedbackSignature = (items: string[]) => {
  return items.map((item, index) => `${index}:${item}`).join('\u001F');
};

const setsAreEqual = (first: Set<number>, second: Set<number>) => {
  if (first.size !== second.size) return false;
  for (const value of first) {
    if (!second.has(value)) return false;
  }
  return true;
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

const getVariantSummaryLabel = (variant: ProgramVariantOption) => {
  const parts = [
    variant.date !== '-' ? variant.date : '',
    variant.month !== '-' ? (MONTHS[Number(variant.month)] || variant.month) : '',
    variant.year !== '-' ? variant.year : '',
    variant.location !== '-' ? variant.location : '',
    variant.penganjur !== '-' ? variant.penganjur : '',
  ].filter(Boolean);

  return parts.join(' • ');
};

const getScoreRating = (score: number) => {
  if (score >= 4.5) return { label: 'Cemerlang', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  if (score >= 4.0) return { label: 'Sangat Baik', color: 'bg-lime-100 text-lime-800 border-lime-200' };
  if (score >= 3.0) return { label: 'Baik', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  return { label: 'Perlu Perhatian', color: 'bg-rose-100 text-rose-800 border-rose-200' };
};

export const ProgramDetail: React.FC<ProgramDetailProps> = ({ programName, data, onBack, onRefresh, initialFilters }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  
  // Ref for capturing the report content
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  }, []);

  // AI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  // Display Scale State (50% to 150%)
  const [appendixScale, setAppendixScale] = useState(1);

  // Active sticky nav section
  const [activeSection, setActiveSection] = useState<string>('section-summary');

  // WYSIWYG EDITABLE STATES
  const [editableProgramName, setEditableProgramName] = useState<string>(
    programName && programName !== 'UNKNOWN' && programName !== 'SEMUA' ? programName : ''
  );
  const [editablePenganjur, setEditablePenganjur] = useState('');
  const [editableAnalysis, setEditableAnalysis] = useState<string | null>(null);
  const [editableComments, setEditableComments] = useState<string[]>([]);
  const [editableSuggestions, setEditableSuggestions] = useState<string[]>([]);
  const [highlightedCommentIndexes, setHighlightedCommentIndexes] = useState<Set<number>>(new Set<number>());
  const [highlightedSuggestionIndexes, setHighlightedSuggestionIndexes] = useState<Set<number>>(new Set<number>());
  const [savedHighlightedCommentIndexes, setSavedHighlightedCommentIndexes] = useState<Set<number>>(new Set<number>());
  const [savedHighlightedSuggestionIndexes, setSavedHighlightedSuggestionIndexes] = useState<Set<number>>(new Set<number>());
  const [highlightSavedAt, setHighlightSavedAt] = useState<string | null>(null);

  // Feedback section search and filter states
  const [feedbackTab, setFeedbackTab] = useState<'all' | 'comments' | 'suggestions' | 'saved'>('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'highlighted' | 'unhighlighted'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (programName && programName !== 'UNKNOWN' && programName !== 'SEMUA') {
      setEditableProgramName(programName);
    } else {
      const found = data.find(d => d.programName && d.programName !== '-' && d.programName !== 'SEMUA');
      if (found?.programName) {
        setEditableProgramName(found.programName);
      }
    }
  }, [programName, data]);

  useEffect(() => {
    if (aiAnalysisResult) {
      setEditableAnalysis(aiAnalysisResult);
    }
  }, [aiAnalysisResult]);

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>('SEMUA');
  const [selectedMonth, setSelectedMonth] = useState<string>('SEMUA');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('SEMUA');
  const [selectedDate, setSelectedDate] = useState<string>('SEMUA');
  const [selectedBahagian, setSelectedBahagian] = useState<string>('SEMUA');
  const [selectedLocation, setSelectedLocation] = useState<string>('SEMUA');
  const [selectedPenganjur, setSelectedPenganjur] = useState<string>('SEMUA');

  useEffect(() => {
    setSelectedYear(initialFilters?.year || 'SEMUA');
    setSelectedMonth(initialFilters?.month || 'SEMUA');
    setSelectedQuarter(initialFilters?.quarter || 'SEMUA');
    setSelectedDate(initialFilters?.date || 'SEMUA');
    setSelectedBahagian(initialFilters?.bahagian || 'SEMUA');
    setSelectedLocation(initialFilters?.location || 'SEMUA');
    setSelectedPenganjur(initialFilters?.penganjur || 'SEMUA');
  }, [programName, initialFilters]);

  // RAW DATA (Base Set for this Program)
  const allProgramData = useMemo(() => {
    return data.filter(d => {
      const dataName = d.programName || "UNKNOWN";
      const isProgramMatch = dataName === programName;
      const isNotHeader = d.programName !== 'NAMA PROGRAM' && d.tarafPendidikan !== 'TARAF PENDIDIKAN TERTINGGI';
      return isProgramMatch && isNotHeader;
    });
  }, [data, programName]);

  const programVariants = useMemo<ProgramVariantOption[]>(() => {
    const groups: Record<string, ProgramVariantOption> = {};

    allProgramData.forEach((item) => {
      const year = String(item.filterTahun || '').trim() || '-';
      const month = (() => {
        const parsed = new Date(item.programDate);
        return isNaN(parsed.getTime()) ? '-' : String(parsed.getMonth());
      })();
      const quarter = String(item.quarter || '').trim().toUpperCase() || '-';
      const date = formatDateKey(item.programDate);
      const bahagian = item.bahagian || '-';
      const location = item.tempat || '-';
      const penganjur = item.penganjur || '-';
      const key = [year, month, quarter, date, bahagian, location, penganjur].join('|');

      if (!groups[key]) {
        groups[key] = {
          id: key,
          year,
          month,
          quarter,
          date,
          bahagian,
          location,
          penganjur,
          totalRespondents: 0,
        };
      }

      groups[key].totalRespondents += 1;
    });

    return Object.values(groups).sort((a, b) => {
      const aDate = a.date && a.date !== '-' ? new Date(a.date.split('/').reverse().join('-')).getTime() : 0;
      const bDate = b.date && b.date !== '-' ? new Date(b.date.split('/').reverse().join('-')).getTime() : 0;
      if (bDate !== aDate) return bDate - aDate;
      return b.year.localeCompare(a.year);
    });
  }, [allProgramData]);

  // DYNAMIC FILTER OPTIONS
  const uniqueYears = useMemo(() => {
    const set = new Set(
      allProgramData
        .map(d => String(d.filterTahun || '').trim())
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [allProgramData]);

  const uniqueMonths = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') {
      source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    }

    const set = new Set(
      source
        .map(d => {
          const parsed = new Date(d.programDate);
          return isNaN(parsed.getTime()) ? '' : String(parsed.getMonth());
        })
        .filter(Boolean)
    );

    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [allProgramData, selectedYear]);

  const uniqueQuarters = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') {
      source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    }
    if (selectedMonth !== 'SEMUA') {
      source = source.filter(d => {
        const parsed = new Date(d.programDate);
        return !isNaN(parsed.getTime()) && String(parsed.getMonth()) === selectedMonth;
      });
    }

    const set = new Set(
      source
        .map(d => String(d.quarter || '').trim().toUpperCase())
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [allProgramData, selectedYear, selectedMonth]);

  const uniqueDates = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') {
      source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    }
    if (selectedMonth !== 'SEMUA') {
      source = source.filter(d => {
        const parsed = new Date(d.programDate);
        return !isNaN(parsed.getTime()) && String(parsed.getMonth()) === selectedMonth;
      });
    }
    if (selectedQuarter !== 'SEMUA') {
      source = source.filter(d => String(d.quarter || '').trim().toUpperCase() === selectedQuarter);
    }

    const dates = source.map(d => ({
        iso: d.programDate,
        label: formatDateKey(d.programDate)
    }));
    
    const unique = Array.from(new Set(dates.map(d => d.label)))
        .map(label => {
            return dates.find(d => d.label === label);
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b!.iso).getTime() - new Date(a!.iso).getTime());

    return unique as { iso: string, label: string }[];
  }, [allProgramData, selectedYear, selectedMonth, selectedQuarter]);

  const uniqueBahagian = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    if (selectedMonth !== 'SEMUA') source = source.filter(d => {
      const parsed = new Date(d.programDate);
      return !isNaN(parsed.getTime()) && String(parsed.getMonth()) === selectedMonth;
    });
    if (selectedQuarter !== 'SEMUA') source = source.filter(d => String(d.quarter || '').trim().toUpperCase() === selectedQuarter);
    if (selectedDate !== 'SEMUA') source = source.filter(d => formatDateKey(d.programDate) === selectedDate);
    const set = new Set(source.map(d => d.bahagian).filter(Boolean));
    return Array.from(set).sort();
  }, [allProgramData, selectedYear, selectedMonth, selectedQuarter, selectedDate]);

  const uniqueLocations = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    if (selectedMonth !== 'SEMUA') source = source.filter(d => {
      const parsed = new Date(d.programDate);
      return !isNaN(parsed.getTime()) && String(parsed.getMonth()) === selectedMonth;
    });
    if (selectedQuarter !== 'SEMUA') source = source.filter(d => String(d.quarter || '').trim().toUpperCase() === selectedQuarter);
    if (selectedDate !== 'SEMUA') source = source.filter(d => formatDateKey(d.programDate) === selectedDate);
    if (selectedBahagian !== 'SEMUA') source = source.filter(d => d.bahagian === selectedBahagian);
    
    const set = new Set(source.map(d => d.tempat).filter(Boolean));
    return Array.from(set).sort();
  }, [allProgramData, selectedYear, selectedMonth, selectedQuarter, selectedDate, selectedBahagian]);

  const uniquePenganjur = useMemo(() => {
    let source = allProgramData;
    if (selectedYear !== 'SEMUA') source = source.filter(d => String(d.filterTahun || '').trim() === selectedYear);
    if (selectedMonth !== 'SEMUA') source = source.filter(d => {
      const parsed = new Date(d.programDate);
      return !isNaN(parsed.getTime()) && String(parsed.getMonth()) === selectedMonth;
    });
    if (selectedQuarter !== 'SEMUA') source = source.filter(d => String(d.quarter || '').trim().toUpperCase() === selectedQuarter);
    if (selectedDate !== 'SEMUA') source = source.filter(d => formatDateKey(d.programDate) === selectedDate);
    if (selectedBahagian !== 'SEMUA') source = source.filter(d => d.bahagian === selectedBahagian);
    if (selectedLocation !== 'SEMUA') source = source.filter(d => d.tempat === selectedLocation);

    const set = new Set(source.map(d => d.penganjur).filter(Boolean));
    return Array.from(set).sort();
  }, [allProgramData, selectedYear, selectedMonth, selectedQuarter, selectedDate, selectedBahagian, selectedLocation]);

  useEffect(() => {
    if (selectedMonth !== 'SEMUA' && !uniqueMonths.includes(selectedMonth)) setSelectedMonth('SEMUA');
    if (selectedQuarter !== 'SEMUA' && !uniqueQuarters.includes(selectedQuarter)) setSelectedQuarter('SEMUA');
    if (selectedDate !== 'SEMUA' && !uniqueDates.some(d => d.label === selectedDate)) setSelectedDate('SEMUA');
    if (selectedBahagian !== 'SEMUA' && !uniqueBahagian.includes(selectedBahagian)) setSelectedBahagian('SEMUA');
    if (selectedLocation !== 'SEMUA' && !uniqueLocations.includes(selectedLocation)) setSelectedLocation('SEMUA');
    if (selectedPenganjur !== 'SEMUA' && !uniquePenganjur.includes(selectedPenganjur)) setSelectedPenganjur('SEMUA');
  }, [selectedYear, selectedMonth, selectedQuarter, selectedDate, selectedBahagian, selectedLocation, selectedPenganjur, uniqueMonths, uniqueQuarters, uniqueDates, uniqueBahagian, uniqueLocations, uniquePenganjur]);

  const selectedVariantId = useMemo(() => {
    if (
      selectedYear === 'SEMUA' ||
      selectedMonth === 'SEMUA' ||
      selectedQuarter === 'SEMUA' ||
      selectedDate === 'SEMUA' ||
      selectedBahagian === 'SEMUA' ||
      selectedLocation === 'SEMUA' ||
      selectedPenganjur === 'SEMUA'
    ) {
      return 'SEMUA';
    }

    const match = programVariants.find((variant) =>
      variant.year === selectedYear &&
      variant.month === selectedMonth &&
      variant.quarter === selectedQuarter &&
      variant.date === selectedDate &&
      variant.bahagian === selectedBahagian &&
      variant.location === selectedLocation &&
      variant.penganjur === selectedPenganjur
    );

    return match?.id || 'SEMUA';
  }, [programVariants, selectedYear, selectedMonth, selectedQuarter, selectedDate, selectedBahagian, selectedLocation, selectedPenganjur]);

  const handleVariantSelect = (variantId: string) => {
    if (variantId === 'SEMUA') {
      setSelectedYear('SEMUA');
      setSelectedMonth('SEMUA');
      setSelectedQuarter('SEMUA');
      setSelectedDate('SEMUA');
      setSelectedBahagian('SEMUA');
      setSelectedLocation('SEMUA');
      setSelectedPenganjur('SEMUA');
      return;
    }

    const variant = programVariants.find((item) => item.id === variantId);
    if (!variant) return;

    setSelectedYear(variant.year !== '-' ? variant.year : 'SEMUA');
    setSelectedMonth(variant.month !== '-' ? variant.month : 'SEMUA');
    setSelectedQuarter(variant.quarter !== '-' ? variant.quarter : 'SEMUA');
    setSelectedDate(variant.date !== '-' ? variant.date : 'SEMUA');
    setSelectedBahagian(variant.bahagian !== '-' ? variant.bahagian : 'SEMUA');
    setSelectedLocation(variant.location !== '-' ? variant.location : 'SEMUA');
    setSelectedPenganjur(variant.penganjur !== '-' ? variant.penganjur : 'SEMUA');
  };

  // FINAL FILTERED DATA
  const filteredData = useMemo(() => {
    return allProgramData.filter(d => {
      const matchYear = selectedYear === 'SEMUA' || String(d.filterTahun || '').trim() === selectedYear;
      const matchMonth = selectedMonth === 'SEMUA' || (() => {
        const parsed = new Date(d.programDate);
        return !isNaN(parsed.getTime()) && String(parsed.getMonth()) === selectedMonth;
      })();
      const matchQuarter = selectedQuarter === 'SEMUA' || String(d.quarter || '').trim().toUpperCase() === selectedQuarter;
      const matchDate = selectedDate === 'SEMUA' || formatDateKey(d.programDate) === selectedDate;
      const matchBahagian = selectedBahagian === 'SEMUA' || d.bahagian === selectedBahagian;
      const matchLocation = selectedLocation === 'SEMUA' || d.tempat === selectedLocation;
      const matchPenganjur = selectedPenganjur === 'SEMUA' || d.penganjur === selectedPenganjur;
      return matchYear && matchMonth && matchQuarter && matchDate && matchBahagian && matchLocation && matchPenganjur;
    });
  }, [allProgramData, selectedYear, selectedMonth, selectedQuarter, selectedDate, selectedBahagian, selectedLocation, selectedPenganjur]);

  // DERIVE LOCATION & PENGANJUR AUTOMATICALLY
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

  const displayedProgramDate = useMemo(() => {
    if (selectedDate !== 'SEMUA') return selectedDate;
    if (uniqueDates.length === 0) return '-';
    if (uniqueDates.length === 1) return uniqueDates[0]?.label || '-';
    return `${uniqueDates.length} TARIKH BERBEZA`;
  }, [selectedDate, uniqueDates]);

  const effectiveProgramName = useMemo(() => {
    if (editableProgramName && editableProgramName.trim() && editableProgramName !== 'UNKNOWN' && editableProgramName !== 'SEMUA' && editableProgramName !== '-') {
      return editableProgramName.trim();
    }
    if (programName && programName !== 'UNKNOWN' && programName !== 'SEMUA' && programName !== '-') {
      return programName;
    }
    const found = filteredData.find(d => d.programName && d.programName !== '-' && d.programName !== 'SEMUA');
    return found?.programName || 'PROGRAM TIDAK DINYATAKAN';
  }, [editableProgramName, programName, filteredData]);

  const effectiveProgramDate = useMemo(() => {
    if (selectedDate !== 'SEMUA') return selectedDate;
    if (uniqueDates.length === 1 && uniqueDates[0]?.label) return uniqueDates[0].label;
    if (filteredData.length > 0 && filteredData[0].programDate) {
      return formatDateKey(filteredData[0].programDate);
    }
    return displayedProgramDate !== '-' ? displayedProgramDate : 'Tidak Dinyatakan';
  }, [selectedDate, uniqueDates, filteredData, displayedProgramDate]);

  const effectiveLocation = useMemo(() => {
    if (selectedLocation !== 'SEMUA') return selectedLocation;
    const locations = Array.from(new Set(filteredData.map(d => d.tempat).filter(t => t && t !== '-')));
    if (locations.length === 1) return locations[0];
    if (locations.length > 1) return locations.join(', ');
    return displayedLocation !== '-' ? displayedLocation : 'Tidak Dinyatakan';
  }, [filteredData, selectedLocation, displayedLocation]);

  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const whatsappText = useMemo(() => {
    return `Assalamualaikum/ Salam Sejahtera \n\nTuan/Puan Dilampirkan Laporan Penilaian ${effectiveProgramName}\nTarikh ${effectiveProgramDate}\nTempat Program ${effectiveLocation}\nBilangan Responden ${filteredData.length}`;
  }, [effectiveProgramName, effectiveProgramDate, effectiveLocation, filteredData.length]);

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsappText);
    setCopiedWhatsApp(true);
    showToast('Ayat WhatsApp berjaya disalin!');
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // ANALISIS COMPUTATION
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

  // DEMOGRAFI COMPUTATION
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

  const demographics = useMemo(() => {
    const rawUmur = getCounts('umur');
    // Sort age brackets logically
    const sortedUmur = [...rawUmur].sort((a, b) => {
      const getNum = (str: string) => {
        const match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : 999;
      };
      if (a.name.includes('BAWAH') || a.name.includes('<')) return -1;
      if (b.name.includes('BAWAH') || b.name.includes('<')) return 1;
      return getNum(a.name) - getNum(b.name);
    });

    return {
      jantina: getCounts('jantina'),
      umur: sortedUmur,
      pendidikan: getCounts('tarafPendidikan')
    };
  }, [filteredData]);

  // COMMENTS & SUGGESTIONS LISTS
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

  const commentSignature = useMemo(() => createFeedbackSignature(commentList), [commentList]);
  const suggestionSignature = useMemo(() => createFeedbackSignature(suggestionList), [suggestionList]);

  const highlightStorageKey = useMemo(() => {
    const context = {
      programName,
      selectedYear,
      selectedMonth,
      selectedQuarter,
      selectedDate,
      selectedBahagian,
      selectedLocation,
      selectedPenganjur,
    };

    return `${HIGHLIGHT_STORAGE_PREFIX}:${JSON.stringify(context)}`;
  }, [
    programName,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    selectedDate,
    selectedBahagian,
    selectedLocation,
    selectedPenganjur,
  ]);

  const hasUnsavedHighlights = useMemo(() => {
    return (
      !setsAreEqual(highlightedCommentIndexes, savedHighlightedCommentIndexes) ||
      !setsAreEqual(highlightedSuggestionIndexes, savedHighlightedSuggestionIndexes)
    );
  }, [
    highlightedCommentIndexes,
    highlightedSuggestionIndexes,
    savedHighlightedCommentIndexes,
    savedHighlightedSuggestionIndexes,
  ]);

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

  useEffect(() => {
    const emptyComments = new Set<number>();
    const emptySuggestions = new Set<number>();

    try {
      const storedValue = window.localStorage.getItem(highlightStorageKey);
      if (!storedValue) {
        setHighlightedCommentIndexes(emptyComments);
        setHighlightedSuggestionIndexes(emptySuggestions);
        setSavedHighlightedCommentIndexes(emptyComments);
        setSavedHighlightedSuggestionIndexes(emptySuggestions);
        setHighlightSavedAt(null);
        return;
      }

      const storedHighlights = JSON.parse(storedValue) as StoredFeedbackHighlights;
      const isSameFeedbackList =
        storedHighlights.commentSignature === commentSignature &&
        storedHighlights.suggestionSignature === suggestionSignature;

      if (!isSameFeedbackList) {
        setHighlightedCommentIndexes(emptyComments);
        setHighlightedSuggestionIndexes(emptySuggestions);
        setSavedHighlightedCommentIndexes(emptyComments);
        setSavedHighlightedSuggestionIndexes(emptySuggestions);
        setHighlightSavedAt(null);
        return;
      }

      const validCommentIndexes = new Set(
        (storedHighlights.commentIndexes || []).filter((index) => index >= 0 && index < commentList.length)
      );
      const validSuggestionIndexes = new Set(
        (storedHighlights.suggestionIndexes || []).filter((index) => index >= 0 && index < suggestionList.length)
      );

      setHighlightedCommentIndexes(validCommentIndexes);
      setHighlightedSuggestionIndexes(validSuggestionIndexes);
      setSavedHighlightedCommentIndexes(new Set(validCommentIndexes));
      setSavedHighlightedSuggestionIndexes(new Set(validSuggestionIndexes));
      setHighlightSavedAt(storedHighlights.savedAt || null);
    } catch (error) {
      console.error('Failed to load feedback highlights:', error);
      setHighlightedCommentIndexes(emptyComments);
      setHighlightedSuggestionIndexes(emptySuggestions);
      setSavedHighlightedCommentIndexes(emptyComments);
      setSavedHighlightedSuggestionIndexes(emptySuggestions);
      setHighlightSavedAt(null);
    }
  }, [highlightStorageKey, commentSignature, suggestionSignature, commentList.length, suggestionList.length]);

  const toggleHighlightedIndex = (
    index: number,
    type: 'comment' | 'suggestion'
  ) => {
    if (type === 'comment') {
      setHighlightedCommentIndexes((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
          showToast('Komen dikeluarkan daripada pilihan PDF.');
        } else {
          next.add(index);
          showToast('Komen disimpan untuk PDF.');
        }
        return next;
      });
    } else {
      setHighlightedSuggestionIndexes((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
          showToast('Cadangan dikeluarkan daripada pilihan PDF.');
        } else {
          next.add(index);
          showToast('Cadangan disimpan untuk PDF.');
        }
        return next;
      });
    }
  };

  const handleSaveFeedbackHighlights = () => {
    const savedAt = new Date().toISOString();
    const storedHighlights: StoredFeedbackHighlights = {
      commentIndexes: (Array.from(highlightedCommentIndexes) as number[]).sort((a, b) => a - b),
      suggestionIndexes: (Array.from(highlightedSuggestionIndexes) as number[]).sort((a, b) => a - b),
      commentSignature,
      suggestionSignature,
      savedAt,
    };

    try {
      window.localStorage.setItem(highlightStorageKey, JSON.stringify(storedHighlights));
      setSavedHighlightedCommentIndexes(new Set(storedHighlights.commentIndexes));
      setSavedHighlightedSuggestionIndexes(new Set(storedHighlights.suggestionIndexes));
      setHighlightSavedAt(savedAt);
      showToast('Highlight maklum balas berjaya disimpan!');
    } catch (error) {
      console.error('Failed to save feedback highlights:', error);
      alert('Maaf, highlight gagal disimpan sementara. Sila cuba lagi.');
    }
  };

  const handleClearHighlights = () => {
    setHighlightedCommentIndexes(new Set());
    setHighlightedSuggestionIndexes(new Set());
    try {
      window.localStorage.removeItem(highlightStorageKey);
      setSavedHighlightedCommentIndexes(new Set());
      setSavedHighlightedSuggestionIndexes(new Set());
      setHighlightSavedAt(null);
      showToast('Semua highlight telah dikosongkan.');
      setShowClearConfirm(false);
    } catch (e) {
      console.error('Failed to clear highlights:', e);
    }
  };

  // AI LOGIC
  const handleGenerateAI = async () => {
    setAiAnalysisResult("Analisis AI telah dinyahaktifkan untuk menjimatkan penggunaan token. Sila semak data secara manual.");
  };

  // JPEG DOWNLOAD LOGIC
  const handleGenerateJPEG = async () => {
    if (!reportRef.current) return;
    setIsDownloadingImage(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: 1200
      });

      const image = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `Laporan_${programName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Imej JPEG berjaya dimuat turun!');

    } catch (error) {
      console.error("JPEG Export Error:", error);
      alert("Gagal menjana imej. Sila cuba lagi.");
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // PDF GENERATION LOGIC
  const handleGeneratePDF = async () => {
    if (hasUnsavedHighlights) {
      alert('Sila tekan "Simpan Sementara" dahulu supaya komen/cadangan yang di-highlight dibawa masuk ke PDF.');
      return;
    }

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
          : selectedQuarter !== 'SEMUA'
            ? `SUKU ${selectedQuarter}`
          : selectedMonth !== 'SEMUA'
            ? `${MONTHS[Number(selectedMonth)] || selectedMonth} ${selectedYear !== 'SEMUA' ? selectedYear : ''}`.trim()
          : selectedYear !== 'SEMUA'
            ? `TAHUN ${selectedYear}`
            : (uniqueDates.length > 1 ? `PELBAGAI TARIKH (${uniqueDates.length})` : (uniqueDates[0]?.label || '-')),
        totalRespondents: analysis?.totalRespondents || 0,
        avgScore: Number(analysis?.avgTotal.toFixed(2)) || 0,
        radarData: analysis?.spiderData || [],
        demographics: demographics,
        rawComments: editableComments,
        rawSuggestions: editableSuggestions,
        highlightedCommentIndexes: Array.from(savedHighlightedCommentIndexes),
        highlightedSuggestionIndexes: Array.from(savedHighlightedSuggestionIndexes),
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
        selectedMonth !== 'SEMUA' ? (MONTHS[Number(selectedMonth)] || selectedMonth) : '',
        selectedQuarter !== 'SEMUA' ? selectedQuarter : '',
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
      showToast('Laporan PDF berjaya dimuat turun!');

    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Maaf, ralat berlaku semasa menjana PDF profesional. Sila cuba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Scroll to Section Helper
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -125;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Combined Feedback List for Filtering
  const filteredFeedbackList = useMemo(() => {
    let items: Array<{ text: string; index: number; type: 'comment' | 'suggestion'; isHighlighted: boolean }> = [];

    if (feedbackTab === 'all' || feedbackTab === 'comments') {
      commentList.forEach((text, idx) => {
        items.push({
          text,
          index: idx,
          type: 'comment',
          isHighlighted: highlightedCommentIndexes.has(idx),
        });
      });
    }

    if (feedbackTab === 'all' || feedbackTab === 'suggestions') {
      suggestionList.forEach((text, idx) => {
        items.push({
          text,
          index: idx,
          type: 'suggestion',
          isHighlighted: highlightedSuggestionIndexes.has(idx),
        });
      });
    }

    if (feedbackTab === 'saved') {
      commentList.forEach((text, idx) => {
        if (highlightedCommentIndexes.has(idx)) {
          items.push({ text, index: idx, type: 'comment', isHighlighted: true });
        }
      });
      suggestionList.forEach((text, idx) => {
        if (highlightedSuggestionIndexes.has(idx)) {
          items.push({ text, index: idx, type: 'suggestion', isHighlighted: true });
        }
      });
    }

    // Filter by Search
    if (feedbackSearch.trim()) {
      const q = feedbackSearch.toLowerCase();
      items = items.filter(item => item.text.toLowerCase().includes(q));
    }

    // Filter by Highlight status
    if (feedbackFilter === 'highlighted') {
      items = items.filter(item => item.isHighlighted);
    } else if (feedbackFilter === 'unhighlighted') {
      items = items.filter(item => !item.isHighlighted);
    }

    return items;
  }, [commentList, suggestionList, highlightedCommentIndexes, highlightedSuggestionIndexes, feedbackTab, feedbackSearch, feedbackFilter]);

  if (allProgramData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-md w-full">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Data Tidak Dijumpai</h2>
          <p className="text-xs text-gray-500 mt-2">Tiada rekod penilaian untuk program ini.</p>
          <button 
            onClick={onBack} 
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all cursor-pointer"
          >
            <ArrowLeft size={16} /> Kembali ke Analisis
          </button>
        </div>
      </div>
    );
  }

  const scoreRating = analysis ? getScoreRating(analysis.avgTotal) : null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-gray-900 pb-16">
      
      {/* Toast Notification Floating Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[100] bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-lime-400/40 flex items-center gap-3 text-xs font-bold"
          >
            <CheckCircle2 size={18} className="text-lime-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Clearing Highlights */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center"
            >
              <Trash2 size={36} className="mx-auto text-rose-500 mb-3" />
              <h3 className="text-base font-bold text-gray-900">Kosongkan Semua Highlight?</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Tindakan ini akan memadamkan semua tanda pilihan komen dan cadangan untuk PDF.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleClearHighlights}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Ya, Kosongkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TASK 1: STICKY TOOLBAR ATAS */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-6 py-2.5 transition-all print:hidden shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Top Bar / Row 1 */}
          <div className="flex items-center justify-between md:justify-start gap-3 min-w-0">
            {/* Kembali Button */}
            <motion.button 
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack} 
              className="flex items-center gap-2 text-gray-700 hover:text-black font-bold text-xs transition-all bg-gray-100 hover:bg-gray-200/80 px-3.5 py-2 rounded-xl border border-gray-200/60 min-h-[44px] cursor-pointer shrink-0"
              title="Kembali ke Analisis Dashboard"
            >
              <ArrowLeft size={16} />
              <span className="inline">Kembali ke Analisis</span>
            </motion.button>

            <div className="h-6 w-px bg-gray-200 hidden lg:block shrink-0"></div>

            {/* Program Name Display - Sticky Context */}
            <div className="hidden sm:flex flex-col min-w-0 max-w-[280px] lg:max-w-[420px]">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">SEDANG DILIHAT</span>
              <span className="text-xs font-bold text-gray-900 truncate" title={editableProgramName}>
                {editableProgramName || 'PROGRAM TIDAK DINYATAKAN'}
              </span>
            </div>
          </div>

          {/* Right Action Bar / Row 2 */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 shrink-0 border-t md:border-t-0 border-gray-100 pt-2 md:pt-0">
            
            {/* Display Scale Control */}
            <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl border border-gray-200/70 min-h-[44px]">
              <span className="text-[10px] font-bold text-gray-500 uppercase px-2 hidden lg:inline">Skala Paparan:</span>
              <button 
                onClick={() => setAppendixScale(prev => Math.max(0.5, parseFloat((prev - 0.1).toFixed(1))))}
                disabled={appendixScale <= 0.5}
                className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-50 rounded-lg border border-gray-200/80 text-gray-700 disabled:opacity-30 transition-all cursor-pointer shadow-2xs"
                title="Kurangkan Skala Paparan"
              >
                <Minus size={13} />
              </button>
              <span className="w-11 text-center font-bold text-xs text-gray-900">
                {Math.round(appendixScale * 100)}%
              </span>
              <button 
                onClick={() => setAppendixScale(prev => Math.min(1.5, parseFloat((prev + 0.1).toFixed(1))))}
                disabled={appendixScale >= 1.5}
                className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-50 rounded-lg border border-gray-200/80 text-gray-700 disabled:opacity-30 transition-all cursor-pointer shadow-2xs"
                title="Tambah Skala Paparan"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>

            {/* Refresh Button */}
            <motion.button 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.4 }}
              onClick={onRefresh} 
              className="p-2.5 bg-gray-100 hover:bg-lime-100/70 text-gray-700 hover:text-lime-800 rounded-xl border border-gray-200/80 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center" 
              title="Muat Semula Data"
            >
              <RefreshCw size={16} />
            </motion.button>

            {/* Export JPEG Button */}
            <motion.button 
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerateJPEG} 
              disabled={isDownloadingImage} 
              className="bg-white border border-gray-200/90 text-gray-800 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-gray-50 hover:border-lime-400 transition-all shadow-2xs disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {isDownloadingImage ? <Loader2 size={15} className="animate-spin text-lime-600"/> : <ImageIcon size={15} className="text-lime-600" />}
              <span>Muat Turun JPEG</span>
            </motion.button>

            {/* Export PDF Button (Primary Action) */}
            <motion.button 
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGeneratePDF} 
              disabled={isDownloading} 
              className="bg-gray-900 text-lime-400 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-black transition-all shadow-md shadow-gray-900/10 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {isDownloading ? <Loader2 size={15} className="animate-spin text-lime-400"/> : <FileDown size={15} className="text-lime-400" />}
              <span>Muat Turun PDF</span>
            </motion.button>
          </div>

        </div>
      </nav>

      {/* TASK 6: IN-PAGE STICKY NAVIGATION TABS */}
      <nav data-html2canvas-ignore className="sticky top-[61px] z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/70 px-4 sm:px-6 py-1.5 print:hidden shadow-2xs">
        <div className="max-w-[1500px] mx-auto flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => scrollToSection('section-summary')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'section-summary' 
                ? 'bg-gray-900 text-lime-400 shadow-2xs' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Ringkasan Eksekutif
          </button>
          <button
            onClick={() => scrollToSection('section-analysis')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'section-analysis' 
                ? 'bg-gray-900 text-lime-400 shadow-2xs' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Analisis Radar
          </button>
          <button
            onClick={() => scrollToSection('section-profile')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSection === 'section-profile' 
                ? 'bg-gray-900 text-lime-400 shadow-2xs' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Profil Peserta
          </button>
          <button
            onClick={() => scrollToSection('section-feedback')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'section-feedback' 
                ? 'bg-gray-900 text-lime-400 shadow-2xs' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>Komen & Cadangan</span>
            <span className="px-1.5 py-0.5 rounded-md bg-lime-400/20 text-lime-700 text-[10px] font-black">
              {commentList.length + suggestionList.length}
            </span>
          </button>
        </div>
      </nav>

      {/* MAIN REPORT VIEW CONTAINER (Captured by html2canvas for JPEG) */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-[1500px] mx-auto w-full">
        <div 
          ref={reportRef} 
          className="w-full bg-white shadow-xl shadow-gray-200/60 rounded-2xl sm:rounded-3xl border border-gray-200/80 flex flex-col overflow-hidden transition-all"
        >
          
          {/* TASK 2: REDESIGN HEADER PROGRAM */}
          <div className="bg-[#111827] text-white p-6 sm:p-8 md:p-10 relative overflow-hidden">
            {/* Subtle Gradient Highlights */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20"></div>
            
            <div className="relative z-10 space-y-6">
              
              {/* Breadcrumb / Eyebrow */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">
                <span className="text-lime-400 font-black">ANALISIS DATA</span>
                <span>/</span>
                <span>PROGRAM DETAIL</span>
                <span className="bg-lime-400/20 text-lime-300 text-[10px] px-2.5 py-0.5 rounded-md font-black ml-2 border border-lime-400/30">
                  ID: {filteredData[0]?.id || 'N/A'}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3 max-w-5xl">
                <textarea
                  value={editableProgramName}
                  onChange={(e) => setEditableProgramName(e.target.value)}
                  className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-white drop-shadow-xs w-full bg-transparent border-none focus:ring-0 resize-none p-0 placeholder:text-white/30 selection:bg-lime-400/40 font-sans tracking-tight"
                  placeholder="NAMA PROGRAM TIDAK DINYATAKAN"
                  spellCheck={false}
                  rows={1}
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

                <div className="flex items-center gap-2 text-lime-400 text-sm font-bold pt-1">
                  <Award size={16} className="shrink-0 text-lime-400" />
                  <input
                    type="text"
                    value={editablePenganjur}
                    onChange={(e) => setEditablePenganjur(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 p-0 w-full text-lime-300 font-bold placeholder:text-lime-400/30 text-sm tracking-wide"
                    placeholder="PENGANJUR TIDAK DINYATAKAN"
                  />
                </div>
              </div>

              {/* Metadata Chips Bar */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
                <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-200 backdrop-blur-xs">
                  <Building2 size={14} className="text-lime-400" />
                  <span>{selectedBahagian !== 'SEMUA' ? selectedBahagian : `${uniqueBahagian.length} Bahagian`}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-200 backdrop-blur-xs">
                  <MapPin size={14} className="text-lime-400" />
                  <span className="truncate max-w-[200px]" title={displayedLocation}>{displayedLocation}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-200 backdrop-blur-xs">
                  <Calendar size={14} className="text-lime-400" />
                  <span>{displayedProgramDate}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-lime-400/20 border border-lime-400/40 px-3 py-1.5 rounded-xl text-xs font-extrabold text-lime-300 backdrop-blur-xs">
                  <Users size={14} className="text-lime-400" />
                  <span>{filteredData.length} Responden Sah</span>
                </div>
              </div>

              {/* Collapsible WhatsApp Quick Share Card */}
              <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-sm print:hidden shadow-md mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <MessageSquare size={15} className="text-emerald-400 shrink-0" />
                    <span>Salin Laporan WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                        copiedWhatsApp 
                          ? 'bg-lime-400 text-black' 
                          : 'bg-emerald-500 hover:bg-emerald-400 text-white hover:text-black'
                      }`}
                    >
                      {copiedWhatsApp ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                      <span>{copiedWhatsApp ? 'Disalin!' : 'Salin WhatsApp'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Buka terus di WhatsApp"
                    >
                      <Share2 size={13} />
                      <span>Buka App</span>
                    </button>
                  </div>
                </div>

                <div className="bg-black/60 border border-emerald-500/20 rounded-xl p-3 font-mono text-xs text-emerald-200/90 whitespace-pre-wrap leading-relaxed select-all">
                  {whatsappText}
                </div>
              </div>

              {/* Compact Filter Bar */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Filter size={13} className="text-lime-400" />
                  <span>Penapis Maklumat Penilaian</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                  {/* Year */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Tahun</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none cursor-pointer hover:bg-white/15 focus:border-lime-400 focus:ring-0 transition-all truncate"
                    >
                      <option value="SEMUA" className="text-gray-900 bg-white">Semua Tahun</option>
                      {uniqueYears.map(y => <option key={y} value={y} className="text-gray-900 bg-white">{y}</option>)}
                    </select>
                  </div>

                  {/* Month */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Bulan</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none cursor-pointer hover:bg-white/15 focus:border-lime-400 focus:ring-0 transition-all truncate"
                    >
                      <option value="SEMUA" className="text-gray-900 bg-white">Semua Bulan</option>
                      {uniqueMonths.map(m => <option key={m} value={m} className="text-gray-900 bg-white">{MONTHS[Number(m)] || m}</option>)}
                    </select>
                  </div>

                  {/* Quarter */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Suku</span>
                    <select
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none cursor-pointer hover:bg-white/15 focus:border-lime-400 focus:ring-0 transition-all truncate"
                    >
                      <option value="SEMUA" className="text-gray-900 bg-white">Semua Suku</option>
                      {uniqueQuarters.map(q => <option key={q} value={q} className="text-gray-900 bg-white">{q}</option>)}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Tarikh</span>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none cursor-pointer hover:bg-white/15 focus:border-lime-400 focus:ring-0 transition-all truncate"
                    >
                      <option value="SEMUA" className="text-gray-900 bg-white">Semua Tarikh</option>
                      {uniqueDates.map(d => <option key={d.label} value={d.label} className="text-gray-900 bg-white">{d.label}</option>)}
                    </select>
                  </div>

                  {/* Bahagian */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Bahagian</span>
                    <select
                      value={selectedBahagian}
                      onChange={(e) => setSelectedBahagian(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none cursor-pointer hover:bg-white/15 focus:border-lime-400 focus:ring-0 transition-all truncate"
                    >
                      <option value="SEMUA" className="text-gray-900 bg-white">Semua Bahagian</option>
                      {uniqueBahagian.map(b => <option key={b} value={b} className="text-gray-900 bg-white">{b}</option>)}
                    </select>
                  </div>

                  {/* Location */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Lokasi</span>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none cursor-pointer hover:bg-white/15 focus:border-lime-400 focus:ring-0 transition-all truncate"
                    >
                      <option value="SEMUA" className="text-gray-900 bg-white">Semua Lokasi</option>
                      {uniqueLocations.map(l => <option key={l} value={l} className="text-gray-900 bg-white">{l}</option>)}
                    </select>
                  </div>

                  {/* Penganjur */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Penganjur</span>
                    <select
                      value={selectedPenganjur}
                      onChange={(e) => setSelectedPenganjur(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none cursor-pointer hover:bg-white/15 focus:border-lime-400 focus:ring-0 transition-all truncate"
                    >
                      <option value="SEMUA" className="text-gray-900 bg-white">Semua Penganjur</option>
                      {uniquePenganjur.map(p => <option key={p} value={p} className="text-gray-900 bg-white">{p}</option>)}
                    </select>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {!analysis ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
              <AlertCircle size={36} className="text-gray-300"/>
              <p className="text-sm font-bold text-gray-600">Tiada data untuk gabungan tapisan ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              
              {/* TASK 3: RINGKASAN EKSEKUTIF (KPI CARDS) */}
              <section id="section-summary" className="p-6 sm:p-8 bg-white">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-lime-100 rounded-lg text-lime-700">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900 tracking-tight">Ringkasan Eksekutif</h2>
                    <p className="text-xs text-gray-500 font-medium">Metrik prestasi utama laporan penilaian program</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Purata Skor Card */}
                  <div className="bg-gradient-to-br from-lime-50/80 to-white p-4 sm:p-5 rounded-2xl border border-lime-200/80 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-lime-800 uppercase tracking-wider">Purata Skor</span>
                      <div className="p-2 bg-lime-400/30 rounded-xl text-lime-900">
                        <Star size={18} fill="currentColor" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{analysis.avgTotal.toFixed(2)}</span>
                        <span className="text-xs font-bold text-gray-400">/ 5.00</span>
                      </div>
                      {scoreRating && (
                        <div className={`mt-2 inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${scoreRating.color}`}>
                          Prestasi: {scoreRating.label}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Jumlah Responden Card */}
                  <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Jumlah Responden</span>
                      <div className="p-2 bg-white rounded-xl text-gray-700 shadow-2xs">
                        <Users size={18} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{analysis.totalRespondents}</div>
                      <p className="text-[11px] font-semibold text-gray-500 mt-1">Maklum balas sah</p>
                    </div>
                  </div>

                  {/* Bilangan Bahagian Card */}
                  <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Bahagian</span>
                      <div className="p-2 bg-white rounded-xl text-gray-700 shadow-2xs">
                        <Building2 size={18} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{uniqueBahagian.length}</div>
                      <p className="text-[11px] font-semibold text-gray-500 mt-1 truncate" title={selectedBahagian !== 'SEMUA' ? selectedBahagian : 'Bahagian Terlibat'}>
                        {selectedBahagian !== 'SEMUA' ? selectedBahagian : 'Bahagian Terlibat'}
                      </p>
                    </div>
                  </div>

                  {/* Lokasi Program Card */}
                  <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Lokasi / Tarikh</span>
                      <div className="p-2 bg-white rounded-xl text-gray-700 shadow-2xs">
                        <MapPin size={18} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{uniqueLocations.length}</div>
                      <p className="text-[11px] font-semibold text-gray-500 mt-1 truncate" title={displayedLocation}>
                        {uniqueDates.length} Tarikh Berbeza
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* TASK 4 & 5: SUSUNAN ANALISIS RADAR DAN PROFIL PESERTA */}
              <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 bg-white">
                
                {/* TASK 4: ANALISIS RADAR (60% Width on Desktop) */}
                <section id="section-analysis" className="lg:col-span-3 p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-lime-100 rounded-lg text-lime-800">
                          <TrendingUp size={16} />
                        </div>
                        <h3 className="text-base font-extrabold text-gray-900">Analisis Radar</h3>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Prestasi mengikut 5 komponen penilaian utama</p>
                    </div>
                  </div>

                  {/* Radar Chart Container (Controlled Height & Preserved ID for PDF capture) */}
                  <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-4 flex items-center justify-center relative min-h-[360px] max-h-[440px]">
                    <div className="w-full h-[360px] relative" id="radar-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={analysis.spiderData} outerRadius={115}>
                          <PolarGrid stroke="#E5E7EB" strokeWidth={1.5} />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fontSize: 11, fontWeight: 800, fill: '#374151' }} 
                          />
                          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                          <Radar 
                            name="Skor Purata" 
                            dataKey="A" 
                            stroke={COLORS.limeDark} 
                            fill={COLORS.lime} 
                            fillOpacity={0.5} 
                            strokeWidth={3} 
                            animationDuration={1000}
                          />
                          <Tooltip 
                            contentStyle={{
                              borderRadius: '14px', 
                              border: '1px solid #E5E7EB', 
                              boxShadow: '0 10px 25px rgba(0,0,0,0.08)', 
                              padding: '10px 14px'
                            }} 
                            itemStyle={{ fontWeight: '800', color: '#111827', fontSize: '13px' }} 
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>

                {/* TASK 5: PROFIL PESERTA (40% Width on Desktop) */}
                <section id="section-profile" className="lg:col-span-2 p-6 sm:p-8 bg-gray-50/30">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-1.5 bg-gray-100 rounded-lg text-gray-700">
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900">Profil Peserta</h3>
                      <p className="text-xs text-gray-500 font-medium">Demografi responden program ({analysis.totalRespondents})</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    
                    {/* 1. JANTINA */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
                      <div className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3">
                        Pecahan Jantina
                      </div>
                      <div className="space-y-2.5">
                        {demographics.jantina.length > 0 ? demographics.jantina.map((item, idx) => {
                          const pct = analysis.totalRespondents > 0 ? ((item.value / analysis.totalRespondents) * 100).toFixed(1) : '0.0';
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-800">{item.name}</span>
                                <span className="font-extrabold text-gray-900">{item.value} <span className="text-gray-400 font-medium">({pct}%)</span></span>
                              </div>
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-lime-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        }) : <p className="text-xs text-gray-400 italic">Tiada data jantina</p>}
                      </div>
                    </div>

                    {/* 2. KUMPULAN UMUR */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
                      <div className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3">
                        Kumpulan Umur
                      </div>
                      <div className="space-y-2.5">
                        {demographics.umur.length > 0 ? demographics.umur.map((item, idx) => {
                          const pct = analysis.totalRespondents > 0 ? ((item.value / analysis.totalRespondents) * 100).toFixed(1) : '0.0';
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-800 truncate pr-2">{item.name}</span>
                                <span className="font-extrabold text-gray-900 shrink-0">{item.value} <span className="text-gray-400 font-medium">({pct}%)</span></span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        }) : <p className="text-xs text-gray-400 italic">Tiada data umur</p>}
                      </div>
                    </div>

                    {/* 3. TARAF PENDIDIKAN */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
                      <div className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3">
                        Taraf Pendidikan
                      </div>
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                        {demographics.pendidikan.length > 0 ? demographics.pendidikan.map((item, idx) => {
                          const pct = analysis.totalRespondents > 0 ? ((item.value / analysis.totalRespondents) * 100).toFixed(1) : '0.0';
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-800 truncate pr-2" title={item.name}>{item.name}</span>
                                <span className="font-extrabold text-gray-900 shrink-0">{item.value} <span className="text-gray-400 font-medium">({pct}%)</span></span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-gray-800 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        }) : <p className="text-xs text-gray-400 italic">Tiada data pendidikan</p>}
                      </div>
                    </div>

                  </div>
                </section>

              </div>

              {/* GEMINI AI ANALYSIS CARD */}
              <div className="p-6 sm:p-8 bg-white">
                <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-black text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-gray-800">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-lime-400/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-lime-400" />
                        <span className="text-lime-400 font-black text-xs uppercase tracking-wider">Gemini AI Intelligence</span>
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-tight">Analisis Pintar Program</h3>
                      <p className="text-gray-400 text-xs mt-1 max-w-xl font-medium leading-relaxed">
                        Rumusan automatik mengenai kekuatan, kelemahan, dan cadangan penambahbaikan program.
                      </p>
                    </div>

                    {!aiAnalysisResult && !isAnalyzing && (
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerateAI}
                        className="bg-lime-400 text-black px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-lime-300 transition-all cursor-pointer shadow-md shrink-0"
                      >
                        <Bot size={16} /> JANA ANALISIS
                      </motion.button>
                    )}
                  </div>

                  {aiAnalysisResult && (
                    <div className="bg-white/10 border border-white/10 rounded-2xl p-5 text-gray-200 text-xs leading-relaxed backdrop-blur-xs">
                      {aiAnalysisResult}
                    </div>
                  )}
                </div>
              </div>

              {/* TASK 7: KOMEN DAN CADANGAN PESERTA */}
              <section id="section-feedback" className="p-6 sm:p-8 bg-white">
                
                {/* Section Header */}
                <div className="mb-6 border-b border-gray-100 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-lime-700 tracking-widest block mb-1">LAMPIRAN MAKLUM BALAS</span>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Komen dan Cadangan Peserta</h2>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      Tekan ikon bintang pada mana-mana maklum balas untuk tanda sebagai perlu perhatian bagi laporan PDF.
                    </p>
                  </div>

                  {/* Highlight Actions */}
                  <div className="flex flex-wrap items-center gap-2" data-html2canvas-ignore>
                    <button
                      onClick={handleSaveFeedbackHighlights}
                      className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        hasUnsavedHighlights
                          ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-sm animate-pulse'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {hasUnsavedHighlights ? <Save size={14} /> : <CheckCircle2 size={14} className="text-emerald-600" />}
                      <span>{hasUnsavedHighlights ? 'Simpan Sementara' : 'Highlight Disimpan'}</span>
                    </button>

                    {(highlightedCommentIndexes.size > 0 || highlightedSuggestionIndexes.size > 0) && (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Kosongkan Semua Highlight"
                      >
                        <Trash2 size={14} />
                        <span>Kosongkan</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback Controls Bar: Tabs + Search + Filter */}
                <div className="space-y-4 mb-6" data-html2canvas-ignore>
                  
                  {/* Row 1: Main Tabs */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
                    <button
                      onClick={() => setFeedbackTab('all')}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        feedbackTab === 'all' 
                          ? 'bg-gray-900 text-white shadow-2xs' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Semua ({commentList.length + suggestionList.length})
                    </button>

                    <button
                      onClick={() => setFeedbackTab('comments')}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        feedbackTab === 'comments' 
                          ? 'bg-lime-500 text-black font-extrabold shadow-2xs' 
                          : 'bg-lime-50 text-lime-900 hover:bg-lime-100'
                      }`}
                    >
                      <MessageSquare size={13} />
                      <span>Komen Peserta ({commentList.length})</span>
                    </button>

                    <button
                      onClick={() => setFeedbackTab('suggestions')}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        feedbackTab === 'suggestions' 
                          ? 'bg-orange-500 text-white font-extrabold shadow-2xs' 
                          : 'bg-orange-50 text-orange-900 hover:bg-orange-100'
                      }`}
                    >
                      <Lightbulb size={13} />
                      <span>Cadangan Peserta ({suggestionList.length})</span>
                    </button>

                    <button
                      onClick={() => setFeedbackTab('saved')}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        feedbackTab === 'saved' 
                          ? 'bg-amber-400 text-black font-extrabold shadow-2xs' 
                          : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                      }`}
                    >
                      <Star size={13} fill="currentColor" />
                      <span>Disimpan untuk PDF ({highlightedCommentIndexes.size + highlightedSuggestionIndexes.size})</span>
                    </button>
                  </div>

                  {/* Row 2: Search Box & Filter Toggle */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        placeholder="Cari dalam komen & cadangan..."
                        className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-gray-900 focus:ring-0 transition-all"
                      />
                      {feedbackSearch && (
                        <button 
                          onClick={() => setFeedbackSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Filter Segmented Control */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0 text-xs font-bold">
                      <button
                        onClick={() => setFeedbackFilter('all')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          feedbackFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        Semua Status
                      </button>
                      <button
                        onClick={() => setFeedbackFilter('highlighted')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          feedbackFilter === 'highlighted' ? 'bg-amber-400 text-black shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        Ditanda Sahaja
                      </button>
                    </div>

                  </div>

                </div>

                {/* Feedback List Grid */}
                <div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  style={{ transform: `scale(${appendixScale})`, transformOrigin: 'top left', width: `${100 / appendixScale}%` }}
                >
                  {filteredFeedbackList.length > 0 ? filteredFeedbackList.map((item, keyIdx) => {
                    const isComment = item.type === 'comment';
                    return (
                      <div
                        key={`${item.type}-${item.index}-${keyIdx}`}
                        onClick={() => toggleHighlightedIndex(item.index, item.type)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group relative ${
                          item.isHighlighted 
                            ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300/80 shadow-xs' 
                            : 'bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-2xs'
                        }`}
                      >
                        <div>
                          {/* Header badge & star */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-400">#{String(item.index + 1).padStart(2, '0')}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                                isComment ? 'bg-lime-100 text-lime-900 border border-lime-200' : 'bg-orange-100 text-orange-900 border border-orange-200'
                              }`}>
                                {isComment ? 'Komen' : 'Cadangan'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleHighlightedIndex(item.index, item.type);
                              }}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                item.isHighlighted ? 'text-amber-500 bg-amber-100' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-100'
                              }`}
                              title={item.isHighlighted ? 'Buang dari PDF' : 'Tanda untuk PDF'}
                            >
                              <Star size={16} fill={item.isHighlighted ? 'currentColor' : 'none'} />
                            </button>
                          </div>

                          {/* Text content */}
                          <p className="text-xs text-gray-700 leading-relaxed font-medium">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="col-span-full py-12 text-center text-gray-400 text-xs font-medium italic bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      Tiada maklum balas dijumpai mengikut tapisan semasa.
                    </div>
                  )}
                </div>

              </section>

            </div>
          )}

        </div>
      </main>

    </div>
  );
};
