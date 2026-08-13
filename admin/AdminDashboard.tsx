
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, FileText, Settings as SettingsIcon, LogOut, Bell, Menu, Shield, RefreshCw, Filter, 
  Calendar, Building, Search, Star, Activity, Award, TrendingUp, MapPin, ChevronDown, X, PieChart, Trophy, Medal,
  CalendarDays, Check, SlidersHorizontal, Layers, FileDown, Loader2, Bot, MessageSquare, AlertCircle, Sparkles, CheckCircle2, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPie, Pie, Cell, Legend, LabelList 
} from 'recharts';
import { pdf } from '@react-pdf/renderer';
import ProgramReportPDF from './ProgramReportPDF';
import { useDashboardData } from '../dashboard/hooks/useDashboardData';
import { StatCard } from '../dashboard/components/StatCard';
import { SubmissionTable, ProgramSummary } from './SubmissionTable';
import { ProgramDetail } from './ProgramDetail';
import { ReportBSC } from './ReportBSC';
import { CommentsPage } from './CommentsPage';
import { ChangelogPage } from './ChangelogPage';
import BSCReportPDF from './BSCReportPDF';
import { DashboardData } from '../dashboard/types';
import { MONTHS } from '../constants';
import LogoImage from '../components/LogoImage';

interface AdminDashboardProps {
  onLogout: () => void;
}

const COLORS = {
  lime: '#D0F240',
  dark: '#1A1C1E',
  limeDark: '#9AB820',
  gray: '#F3F4F6', // Lighter gray for backgrounds
  textPrimary: '#111827',
  textSecondary: '#6B7280'
};

// Golden Ratio Typography Helper Classes (Approximate mapping)
// Base 16px. Ratio 1.618
// xs: 10px | sm: 13px | base: 16px | lg: 26px | xl: 42px
const TYPO = {
  micro: "text-[10px] leading-tight tracking-widest font-bold uppercase",
  small: "text-[13px] leading-normal font-medium",
  body: "text-[16px] leading-relaxed font-medium",
  h3: "text-[20px] sm:text-[22px] leading-tight font-bold tracking-tight", // Adjusted for dashboard density
  h2: "text-[26px] sm:text-[32px] leading-tight font-extrabold tracking-tight",
  h1: "text-[32px] sm:text-[42px] leading-none font-black tracking-tighter"
};

const CHART_COLORS = [COLORS.lime, '#FFFFFF', COLORS.limeDark, '#555555', '#333333'];

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1C1E] p-4 rounded-xl shadow-2xl border border-gray-700 text-white min-w-[180px] z-50">
        <p className={`${TYPO.micro} text-gray-400 border-b border-gray-700 pb-2 mb-3`}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-sm mb-1.5 last:mb-0">
            <span style={{ color: entry.color }} className="font-medium capitalize text-xs">
              {entry.name}
            </span>
            <span className="font-bold font-mono text-lime-400">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Helper to determine quarter label
const getQuarterLabel = (q: string) => {
  switch(q) {
    case 'Q1': return 'Suku 1';
    case 'Q2': return 'Suku 2';
    case 'Q3': return 'Suku 3';
    case 'Q4': return 'Suku 4';
    default: return q;
  }
};

const formatProgramDateLabel = (isoString: string) => {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return '-';
  }
};

interface ProgramSelectionState {
  programName: string;
  initialFilters?: {
    year?: string;
    quarter?: string;
    date?: string;
    bahagian?: string;
    location?: string;
    penganjur?: string;
  };
}

interface ProgramVariantSummary {
  id: string;
  year: string;
  quarter: string;
  date: string;
  bahagian: string;
  tempat: string;
  penganjur: string;
  totalRespondents: number;
  averageScore: number;
}

const getVariantPreviewLabel = (item: DashboardData) => {
  const parts = [
    formatProgramDateLabel(item.programDate) !== '-' ? formatProgramDateLabel(item.programDate) : '',
    item.tempat && item.tempat !== '-' ? item.tempat : '',
    item.penganjur && item.penganjur !== '-' ? item.penganjur : '',
  ].filter(Boolean);

  return parts.join(' • ');
};

const getProgramVariantChoice = (item: DashboardData) => {
  const date = formatProgramDateLabel(item.programDate);
  const year = item.filterTahun || '-';
  const quarter = String(item.quarter || '').trim().toUpperCase() || '-';
  const bahagian = item.bahagian || '-';
  const location = item.tempat || '-';
  const penganjur = item.penganjur || '-';
  const id = [year, quarter, date, bahagian, location, penganjur].join('|');
  const label = [
    date !== '-' ? date : '',
    year !== '-' ? year : '',
    quarter !== '-' ? getQuarterLabel(quarter) : '',
    location !== '-' ? location : '',
    penganjur !== '-' ? penganjur : '',
  ].filter(Boolean).join(' • ');

  return {
    id,
    label: label || 'Variasi program',
    initialFilters: {
      year: year !== '-' ? year : undefined,
      quarter: quarter !== '-' ? quarter : undefined,
      date: date !== '-' ? date : undefined,
      bahagian: bahagian !== '-' ? bahagian : undefined,
      location: location !== '-' ? location : undefined,
      penganjur: penganjur !== '-' ? penganjur : undefined,
    },
  };
};

// NavItem Component Definition
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 font-bold text-sm group relative overflow-hidden ${
      active
        ? 'bg-lime-400 text-[#171A18] shadow-xs'
        : 'text-gray-300 hover:bg-white/10 hover:text-white'
    }`}
  >
    {active && (
      <motion.div 
        layoutId="nav-active-bg"
        className="absolute inset-0 bg-lime-400 z-0"
        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      />
    )}
    <div className={`relative z-10 transition-transform duration-200 ${active ? 'scale-105' : 'group-hover:scale-105'}`}>
      {icon}
    </div>
    <span className="relative z-10 tracking-tight text-xs sm:text-sm">{label}</span>
    {active && (
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute right-3 w-2 h-2 rounded-full bg-[#171A18] z-10"
      />
    )}
  </button>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { rawData: dashboardRawData, loading, refreshData, lastFetchTime } = useDashboardData(); 
  const rawData = dashboardRawData || [];
  const [currentTab, setCurrentTab] = useState<'analysis' | 'bsc' | 'comments' | 'changelog'>('analysis');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramSelectionState | null>(null);

  // Lock body scroll when mobile menu drawer is active
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobileMenuOpen]);

  // Handle ESC key press to close drawer & dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsYearDropdownOpen(false);
        setIsMonthDropdownOpen(false);
        setIsQuarterDropdownOpen(false);
        setIsOrganizerDropdownOpen(false);
        setIsProgramNameDropdownOpen(false);
        setIsPlaceDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [programVariantPicker, setProgramVariantPicker] = useState<string | null>(null);

  // --- FILTER STATES & REFS (Updated for Custom Dropdowns) ---
  
  // Year (Multi-select)
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Month (Single Select Custom UI)
  const [selectedMonth, setSelectedMonth] = useState<string>('SEMUA'); 
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // Quarter (Single Select Custom UI)
  const [selectedQuarter, setSelectedQuarter] = useState<string>('SEMUA');
  const [isQuarterDropdownOpen, setIsQuarterDropdownOpen] = useState(false);
  const quarterDropdownRef = useRef<HTMLDivElement>(null);

  // Organizer (Single Select Custom UI)
  const [selectedOrganizer, setSelectedOrganizer] = useState<string>('SEMUA');
  const [isOrganizerDropdownOpen, setIsOrganizerDropdownOpen] = useState(false);
  const organizerDropdownRef = useRef<HTMLDivElement>(null);

  // Program Name (Single Select Custom UI)
  const [selectedProgramName, setSelectedProgramName] = useState<string>('SEMUA');
  const [isProgramNameDropdownOpen, setIsProgramNameDropdownOpen] = useState(false);
  const [programNameSearchTerm, setProgramNameSearchTerm] = useState('');
  const programNameDropdownRef = useRef<HTMLDivElement>(null);

  // Place (Single Select Custom UI)
  const [selectedPlace, setSelectedPlace] = useState<string>('SEMUA');
  const [isPlaceDropdownOpen, setIsPlaceDropdownOpen] = useState(false);
  const [placeSearchTerm, setPlaceSearchTerm] = useState('');
  const placeDropdownRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // --- AUTOCOMPLETE SEARCH REFS & STATES ---
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const summaryPanelRef = useRef<HTMLDivElement>(null);
  const kpiSectionRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRecentlySelected, setIsRecentlySelected] = useState(false);

  // Unified "Click Outside" Handler to close any open dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(target)) {
        setIsSearchFocused(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(target)) {
        setIsYearDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(target)) {
        setIsMonthDropdownOpen(false);
      }
      if (quarterDropdownRef.current && !quarterDropdownRef.current.contains(target)) {
        setIsQuarterDropdownOpen(false);
      }
      if (organizerDropdownRef.current && !organizerDropdownRef.current.contains(target)) {
        setIsOrganizerDropdownOpen(false);
      }
      if (programNameDropdownRef.current && !programNameDropdownRef.current.contains(target)) {
        setIsProgramNameDropdownOpen(false);
      }
      if (placeDropdownRef.current && !placeDropdownRef.current.contains(target)) {
        setIsPlaceDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [yearDropdownRef, monthDropdownRef, quarterDropdownRef, organizerDropdownRef]);

  // --- AUTOCOMPLETE DATA & SEARCH LOGIC ---
  const allProgramNames = useMemo(() => {
    const names = new Set<string>();
    rawData.forEach(item => {
      if (item.programName && item.programName !== '-' && item.programName !== 'PROGRAM TIDAK DINYATAKAN') {
        names.add(item.programName);
      }
    });
    return Array.from(names).sort();
  }, [rawData]);

  // Matching suggestions for autocomplete
  const searchResults = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return [];
    const query = searchTerm.trim().toLowerCase();
    const matches = allProgramNames.filter(p => p.toLowerCase().includes(query));
    return matches.slice(0, 8); // Max 8 suggestions
  }, [allProgramNames, searchTerm]);

  // Highlight matching string
  const highlightMatch = (text: string, match: string) => {
    if (!match.trim()) return text;
    const parts = text.split(new RegExp(`(${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === match.toLowerCase() ? (
            <mark key={i} className="bg-lime-300 text-lime-950 font-extrabold px-1 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Sync state with URL Query Parameters
  const updateUrlParams = useCallback((overrides?: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    
    const prog = overrides && 'program' in overrides ? overrides.program : (selectedProgramName !== 'SEMUA' ? selectedProgramName : null);
    if (prog) params.set('program', prog); else params.delete('program');

    const yr = overrides && 'year' in overrides ? overrides.year : (selectedYears.length > 0 ? selectedYears.join(',') : null);
    if (yr) params.set('year', yr); else params.delete('year');

    const mo = overrides && 'month' in overrides ? overrides.month : (selectedMonth !== 'SEMUA' ? selectedMonth : null);
    if (mo) params.set('month', mo); else params.delete('month');

    const qt = overrides && 'quarter' in overrides ? overrides.quarter : (selectedQuarter !== 'SEMUA' ? selectedQuarter : null);
    if (qt) params.set('quarter', qt); else params.delete('quarter');

    const org = overrides && 'organizer' in overrides ? overrides.organizer : (selectedOrganizer !== 'SEMUA' ? selectedOrganizer : null);
    if (org) params.set('organizer', org); else params.delete('organizer');

    const newSearch = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, '', newSearch);
  }, [selectedProgramName, selectedYears, selectedMonth, selectedQuarter, selectedOrganizer]);

  // Restore filter values from URL params on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlProgram = params.get('program');
    const urlYear = params.get('year');
    const urlMonth = params.get('month');
    const urlQuarter = params.get('quarter');
    const urlOrganizer = params.get('organizer');

    if (urlProgram) {
      setSelectedProgramName(urlProgram);
      setSearchTerm(urlProgram);
    }
    if (urlYear) {
      setSelectedYears(urlYear.split(','));
    }
    if (urlMonth) {
      setSelectedMonth(urlMonth);
    }
    if (urlQuarter) {
      setSelectedQuarter(urlQuarter);
    }
    if (urlOrganizer) {
      setSelectedOrganizer(urlOrganizer);
    }
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlProgram = params.get('program') || 'SEMUA';
      setSelectedProgramName(urlProgram);
      setSearchTerm(urlProgram !== 'SEMUA' ? urlProgram : '');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Program selection handler with smooth scroll & feedback
  const selectProgramFromSearch = (progName: string) => {
    setSelectedProgramName(progName);
    setSearchTerm(progName);
    setIsSearchFocused(false);
    setHighlightedSuggestionIndex(-1);

    updateUrlParams({ program: progName });

    setToastMessage(`Analisis program berjaya dipaparkan.`);
    setTimeout(() => setToastMessage(null), 3500);

    setIsRecentlySelected(true);
    setTimeout(() => setIsRecentlySelected(false), 1200);

    setTimeout(() => {
      if (summaryPanelRef.current) {
        summaryPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (kpiSectionRef.current) {
        kpiSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Keyboard navigation inside search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isSearchFocused) setIsSearchFocused(true);
      if (searchResults.length > 0) {
        setHighlightedSuggestionIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setHighlightedSuggestionIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        const targetProg = highlightedSuggestionIndex >= 0 ? searchResults[highlightedSuggestionIndex] : searchResults[0];
        if (targetProg) {
          selectProgramFromSearch(targetProg);
        }
      } else if (searchTerm.trim()) {
        const match = allProgramNames.find(p => p.toLowerCase().includes(searchTerm.trim().toLowerCase()));
        if (match) {
          selectProgramFromSearch(match);
        } else {
          setToastMessage('Tiada program ditemui untuk carian ini.');
          setTimeout(() => setToastMessage(null), 3000);
        }
      }
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
    }
  };

  // Details of Selected Program for Summary Panel
  const selectedProgramDetails = useMemo(() => {
    if (selectedProgramName === 'SEMUA') return null;
    const programRecords = rawData.filter(i => i.programName === selectedProgramName);
    if (programRecords.length === 0) {
      return {
        name: selectedProgramName,
        tempat: 'Tidak Dinyatakan',
        penganjur: 'Tidak Dinyatakan',
        tahun: selectedYears.length > 0 ? selectedYears.join(', ') : 'Semua Tahun',
        tarikh: null,
        totalRespondents: 0
      };
    }

    const first = programRecords[0];
    const uniquePlaces = Array.from(new Set(programRecords.map(r => r.tempat).filter(t => t && t !== '-'))).join(', ');
    const uniqueOrganizers = Array.from(new Set(programRecords.map(r => r.penganjur).filter(p => p && p !== '-'))).join(', ');
    const uniqueYears = Array.from(new Set(programRecords.map(r => r.filterTahun).filter(y => y))).join(', ');
    const dateFormatted = formatProgramDateLabel(first.programDate);

    return {
      name: selectedProgramName,
      tempat: uniquePlaces || first.tempat || 'Tidak Dinyatakan',
      penganjur: uniqueOrganizers || first.penganjur || 'Tidak Dinyatakan',
      tahun: uniqueYears || 'Semua Tahun',
      tarikh: dateFormatted !== '-' ? dateFormatted : null,
      totalRespondents: programRecords.length
    };
  }, [rawData, selectedProgramName, selectedYears]);

  // Data Processing - Generate Options
  const { years, months, quarters, organizers } = useMemo(() => {
    const uniqueYears = new Set<string>();
    const uniqueMonths = new Set<number>(); 
    const uniqueQuarters = new Set<string>();
    const uniqueOrganizers = new Set<string>();

    rawData.forEach(item => {
      // 1. TAHUN: Ambil terus dari column 'FILTER TAHUN' (item.filterTahun)
      if (item.filterTahun && item.filterTahun !== '') {
          uniqueYears.add(item.filterTahun);
      }

      // 2. BULAN: Masih perlu parsing tarikh program
      try {
        const d = new Date(item.programDate);
        if (!isNaN(d.getTime())) {
          uniqueMonths.add(d.getMonth());
        }
      } catch (e) { console.log(e) }

      // 3. QUARTER: Ambil terus dari column 'quarter' yang telah dimap
      if (item.quarter && item.quarter !== '') {
          uniqueQuarters.add(item.quarter);
      }
      
      if (item.penganjur && item.penganjur !== '-') uniqueOrganizers.add(item.penganjur);
    });

    return {
      years: Array.from(uniqueYears).sort().reverse(),
      months: Array.from(uniqueMonths).sort((a, b) => a - b),
      quarters: Array.from(uniqueQuarters).sort(),
      organizers: Array.from(uniqueOrganizers).sort()
    };
  }, [rawData]);

  // Base Filter Logic (tanpa Nama Program)
  const baseFilteredData = useMemo(() => {
    return rawData.filter(item => {
      // 1. Filter Tahun: Bandingkan dengan column 'filterTahun'
      let matchYear = true;
      if (selectedYears.length > 0) {
        // Jika item.filterTahun ada dalam array selectedYears, maka TRUE
        matchYear = selectedYears.includes(item.filterTahun);
      }

      let matchMonth = true;
      if (selectedMonth !== 'SEMUA') {
        const d = new Date(item.programDate);
        if (!isNaN(d.getTime())) {
           matchMonth = d.getMonth().toString() === selectedMonth;
        } else {
           matchMonth = false;
        }
      }

      let matchQuarter = true;
      if (selectedQuarter !== 'SEMUA') {
        matchQuarter = item.quarter === selectedQuarter;
      }

      let matchOrg = true;
      if (selectedOrganizer !== 'SEMUA') {
        matchOrg = item.penganjur === selectedOrganizer;
      }

      return matchYear && matchMonth && matchQuarter && matchOrg;
    });
  }, [rawData, selectedYears, selectedMonth, selectedQuarter, selectedOrganizer]);

  // Senarai Nama Program Dynamic
  const programNames = useMemo(() => {
    const uniquePrograms = new Set<string>();
    const data = selectedPlace !== 'SEMUA' ? baseFilteredData.filter(i => i.tempat === selectedPlace) : baseFilteredData;
    data.forEach(item => {
      if (item.programName && item.programName !== '-') {
        uniquePrograms.add(item.programName);
      }
    });
    return Array.from(uniquePrograms).sort();
  }, [baseFilteredData, selectedPlace]);

  // Senarai Tempat Program Dynamic
  const placeNames = useMemo(() => {
    const uniquePlaces = new Set<string>();
    const data = selectedProgramName !== 'SEMUA' ? baseFilteredData.filter(i => i.programName === selectedProgramName) : baseFilteredData;
    data.forEach(item => {
      if (item.tempat && item.tempat !== '-') {
        uniquePlaces.add(item.tempat);
      }
    });
    return Array.from(uniquePlaces).sort();
  }, [baseFilteredData, selectedProgramName]);

  // Main Filter Logic (termasuk Nama Program dan Tempat Program)
  const filteredData = useMemo(() => {
    return baseFilteredData.filter(item => {
      let matchProgramName = true;
      if (selectedProgramName !== 'SEMUA') {
        matchProgramName = item.programName === selectedProgramName;
      }
      let matchPlace = true;
      if (selectedPlace !== 'SEMUA') {
        matchPlace = item.tempat === selectedPlace;
      }
      return matchProgramName && matchPlace;
    });
  }, [baseFilteredData, selectedProgramName, selectedPlace]);

  const toggleYear = (year: string) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        return prev.filter(y => y !== year);
      } else {
        return [...prev, year];
      }
    });
  };

  // --- DYNAMIC STATS CALCULATION (LINKED TO FILTERS) ---
  const stats = useMemo(() => {
    // Sekiranya tiada data selepas filter
    if (filteredData.length === 0) return { 
        totalRespondents: 0, 
        totalPrograms: 0,
        avgKeseluruhan: "0.00",
        avgFormula: "0.00",
        avgPengisian: "0.00",
        avgFasilitator: "0.00" 
    };

    const sum = (key: keyof DashboardData) => filteredData.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    
    // Count Distinct Programs (Berdasarkan filteredData)
    const uniquePrograms = new Set(
        filteredData
        .map(item => item.programName)
        .filter(name => name !== 'PROGRAM TIDAK DINYATAKAN')
    ).size;

    const count = filteredData.length;

    return {
      totalRespondents: count, // Ini akan berubah mengikut filter
      totalPrograms: uniquePrograms, // Ini juga berubah mengikut filter
        avgKeseluruhan: (sum('skorKeseluruhan') / count).toFixed(2),
        avgFormula: (sum('skorFormula') / count).toFixed(2),
        avgPengisian: (sum('skorPengisian') / count).toFixed(2),
        avgFasilitator: (sum('skorFasilitator') / count).toFixed(2),
      };
    }, [filteredData]); 


  // Stats & Charts Calculations for Visuals
  const topPlaces = useMemo(() => {
      if (filteredData.length === 0) return [];
      const counts: Record<string, number> = {};
      filteredData.forEach(item => {
        const place = (item.tempat || '-').toUpperCase().trim();
        if (place === '-' || place === '' || place === 'TIADA') return;
        counts[place] = (counts[place] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
  }, [filteredData]);

  const charts = useMemo(() => {
    if (filteredData.length === 0) return { scores: [], jantina: [], umur: [], bahagian: [] };

    const countBy = (key: keyof DashboardData) => {
      const counts: Record<string, number> = {};
      filteredData.forEach(item => {
        const val = String(item[key] || 'Tidak Dinyatakan').toUpperCase();
        if (val === '-' || val === '') return;
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    };

    const sum = (key: keyof DashboardData) => filteredData.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    const avg = (key: keyof DashboardData) => parseFloat((sum(key) / filteredData.length).toFixed(2));

    const scores = [
      { name: 'Keseluruhan', value: avg('skorKeseluruhan') },
      { name: 'Formula (AE)', value: avg('skorFormula') },
      { name: 'Logistik', value: avg('skorLogistik') },
      { name: 'Pengisian', value: avg('skorPengisian') },
      { name: 'Fasilitator', value: avg('skorFasilitator') },
      { name: 'Keurusetiaan', value: avg('skorUrusetia') },
    ];

    // New: Calculate Formula by Bahagian
    const bahagianFormula: Record<string, { sum: number, count: number }> = {};
    filteredData.forEach(item => {
      const b = (item.bahagian || 'UMUM').toUpperCase();
      if (!bahagianFormula[b]) bahagianFormula[b] = { sum: 0, count: 0 };
      bahagianFormula[b].sum += Number(item.skorFormula) || 0;
      bahagianFormula[b].count += 1;
    });

    const formulaByBahagian = Object.entries(bahagianFormula)
      .map(([name, data]) => ({
        name,
        value: parseFloat((data.sum / data.count).toFixed(2))
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const countGenerasi = () => {
      const counts: Record<string, number> = {
        'Gen Z': 0,
        'Millennials': 0,
        'Gen X': 0,
        'Boomers': 0,
      };
      
      filteredData.forEach(item => {
        const umurStr = String(item.umur || '');
        if (!umurStr || umurStr === '-') return;
        
        // Cari nombor pertama dalam string umur
        const match = umurStr.match(/\d+/);
        if (match) {
          const age = parseInt(match[0], 10);
          if (age <= 25) counts['Gen Z']++;
          else if (age <= 40) counts['Millennials']++;
          else if (age <= 55) counts['Gen X']++;
          else counts['Boomers']++;
        }
      });
      
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0);
    };

    return { 
        scores, 
        formulaByBahagian,
        jantina: countBy('jantina'), 
        umur: countBy('umur'),
        generasi: countGenerasi(),
        bahagian: countBy('bahagian')
    };
  }, [filteredData]);

  const programSummaries = useMemo<ProgramSummary[]>(() => {
    const groups: Record<string, {
      programName: string;
      bahagian: string;
      tempat: string;
      penganjur: string;
      variants: Set<string>;
      variantChoices: Map<string, ReturnType<typeof getProgramVariantChoice> & { totalScore: number, count: number, penganjur: string, bahagian: string, tempat: string }>;
      variantPreview: string[];
      totalScore: number;
      count: number;
      timestamps: string[];
    }> = {};

    filteredData.forEach(item => {
      const key = item.programName || "UNKNOWN";
      if (!groups[key]) {
        groups[key] = {
          programName: key,
          bahagian: item.bahagian, 
          tempat: item.tempat,
          penganjur: item.penganjur,
          variants: new Set<string>(),
          variantChoices: new Map(),
          variantPreview: [],
          totalScore: 0,
          count: 0,
          timestamps: []
        };
      }
      const variantChoice = getProgramVariantChoice(item);
      groups[key].variants.add(variantChoice.id);
      
      let existingVariant = groups[key].variantChoices.get(variantChoice.id);
      if (!existingVariant) {
        existingVariant = {
          ...variantChoice,
          totalScore: 0,
          count: 0,
          penganjur: item.penganjur,
          bahagian: item.bahagian,
          tempat: item.tempat
        };
        groups[key].variantChoices.set(variantChoice.id, existingVariant);
      }
      existingVariant.count += 1;
      existingVariant.totalScore += item.skorKeseluruhan;

      const previewLabel = getVariantPreviewLabel(item);
      if (previewLabel && !groups[key].variantPreview.includes(previewLabel) && groups[key].variantPreview.length < 3) {
        groups[key].variantPreview.push(previewLabel);
      }
      groups[key].totalScore += item.skorKeseluruhan;
      groups[key].count += 1;
      groups[key].timestamps.push(item.timestamp);
    });

    const summaries = Object.values(groups).map((group, idx) => ({
      id: `PROG-${idx}`,
      programName: group.programName,
      bahagian: group.bahagian,
      tempat: group.tempat,
      penganjur: group.penganjur,
      variantCount: group.variants.size,
      variantPreview: group.variantPreview,
      variants: Array.from(group.variantChoices.values()).map(v => ({
        ...v,
        totalRespondents: v.count,
        averageScore: v.count > 0 ? (v.totalScore / v.count) : 0
      })),
      totalRespondents: group.count,
      averageScore: group.count > 0 ? (group.totalScore / group.count) : 0,
      lastUpdated: 'Live'
    }));

    if (!searchTerm) return summaries;
    const lowerSearch = searchTerm.toLowerCase();
    return summaries.filter(s => 
       (s.programName || '').toLowerCase().includes(lowerSearch) ||
       (s.bahagian || '').toLowerCase().includes(lowerSearch) ||
       (s.tempat || '').toLowerCase().includes(lowerSearch)
    );
  }, [filteredData, searchTerm]);

  const handleProgramSelect = (programName: string, initialFilters?: Record<string, string | undefined>) => {
    const mergedFilters = initialFilters || {
      year: selectedYears.length === 1 ? selectedYears[0] : undefined,
      month: selectedMonth !== 'SEMUA' ? selectedMonth : undefined,
      quarter: selectedQuarter !== 'SEMUA' ? selectedQuarter : undefined,
      location: selectedPlace !== 'SEMUA' ? selectedPlace : undefined,
      penganjur: selectedOrganizer !== 'SEMUA' ? selectedOrganizer : undefined,
    };
    setSelectedProgram({ programName, initialFilters: mergedFilters });
    setProgramVariantPicker(null);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const selectedProgramVariants = useMemo<ProgramVariantSummary[]>(() => {
    if (!programVariantPicker) return [];

    const variantGroups: Record<string, {
      year: string;
      quarter: string;
      date: string;
      bahagian: string;
      tempat: string;
      penganjur: string;
      totalScore: number;
      count: number;
    }> = {};

    rawData
      .filter(item => (item.programName || "UNKNOWN") === programVariantPicker)
      .forEach(item => {
        const year = item.filterTahun || '-';
        const quarter = String(item.quarter || '').trim().toUpperCase() || '-';
        const date = formatProgramDateLabel(item.programDate);
        const bahagian = item.bahagian || '-';
        const tempat = item.tempat || '-';
        const penganjur = item.penganjur || '-';
        const key = [year, quarter, date, bahagian, tempat, penganjur].join('|');

        if (!variantGroups[key]) {
          variantGroups[key] = {
            year,
            quarter,
            date,
            bahagian,
            tempat,
            penganjur,
            totalScore: 0,
            count: 0
          };
        }

        variantGroups[key].totalScore += Number(item.skorKeseluruhan) || 0;
        variantGroups[key].count += 1;
      });

    return Object.values(variantGroups)
      .map((variant, idx) => ({
        id: `VAR-${idx}`,
        year: variant.year,
        quarter: variant.quarter,
        date: variant.date,
        bahagian: variant.bahagian,
        tempat: variant.tempat,
        penganjur: variant.penganjur,
        totalRespondents: variant.count,
        averageScore: variant.count > 0 ? variant.totalScore / variant.count : 0
      }))
      .sort((a, b) => {
        const dateDiff = new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime();
        return Number.isNaN(dateDiff) ? b.year.localeCompare(a.year) : dateDiff;
      });
  }, [programVariantPicker, rawData]);

  // --- PDF EXPORT LOGIC ---
  
  const handleExportProgramPDF = async (programName: string) => {
    setIsExporting(true);
    try {
      // 1. Filter data for this specific program
      const programData = rawData.filter(d => (d.programName || "UNKNOWN") === programName);
      
      if (programData.length === 0) return;

      // 2. Calculate Stats (Same logic as ProgramDetail)
      const count = programData.length;
      const sum = (key: keyof DashboardData) => programData.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
      const safeAvg = (total: number) => parseFloat((total / count).toFixed(2));

      const radarData = [
        { subject: 'Keurusetiaan', A: safeAvg(sum('skorUrusetia')) },
        { subject: 'Logistik', A: safeAvg(sum('skorLogistik')) }, 
        { subject: 'Pengisian', A: safeAvg(sum('skorPengisian')) }, 
        { subject: 'Fasilitator', A: safeAvg(sum('skorFasilitator')) }, 
        { subject: 'Jamuan', A: safeAvg(sum('skorJamuan')) }, 
      ];

      const getCounts = (key: keyof DashboardData) => {
        const counts: Record<string, number> = {};
        programData.forEach(item => {
          const val = String(item[key] || 'TIADA MAKLUMAT').toUpperCase();
          if (val === 'TARAF PENDIDIKAN TERTINGGI' || val === 'UMUR' || val === 'JANTINA') return;
          counts[val] = (counts[val] || 0) + 1;
        });
        return Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
      };

      const demographics = {
        jantina: getCounts('jantina'),
        umur: getCounts('umur'),
        pendidikan: getCounts('tarafPendidikan')
      };

      const commentList = programData
        .filter(d => d.komen && d.komen.trim().length > 2 && d.komen !== 'KOMEN PROGRAM')
        .map(d => d.komen!.trim());

      const suggestionList = programData
        .filter(d => d.cadangan && d.cadangan.trim().length > 2 && d.cadangan !== 'CADANGAN PROGRAM')
        .map(d => d.cadangan!.trim());

      // 3. Prepare PDF Props
      const pdfProps = {
        programName: programName === 'UNKNOWN' ? 'PROGRAM TIDAK DINYATAKAN' : programName,
        penganjur: programData[0]?.penganjur || '-',
        location: programData[0]?.tempat || '-',
        bahagian: programData[0]?.bahagian || '-',
        date: programData[0]?.programDate ? new Date(programData[0].programDate).toLocaleDateString('ms-MY') : '-',
        totalRespondents: count,
        avgScore: safeAvg(sum('skorKeseluruhan')),
        radarData,
        demographics,
        rawComments: commentList,
        rawSuggestions: suggestionList,
        totalComments: commentList.length,
        totalSuggestions: suggestionList.length,
      };

      // 4. Generate and Download
      const blob = await pdf(<ProgramReportPDF {...pdfProps} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_${programName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Ralat semasa menjana PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDashboardPDF = async () => {
    setIsExporting(true);
    try {
      // 1. Prepare Summary Data from filteredData
      const count = filteredData.length;
      if (count === 0) return;

      const sum = (key: keyof DashboardData) => filteredData.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
      const safeAvg = (total: number) => parseFloat((total / count).toFixed(2));

      const radarData = [
        { subject: 'Keurusetiaan', A: safeAvg(sum('skorUrusetia')) },
        { subject: 'Logistik', A: safeAvg(sum('skorLogistik')) }, 
        { subject: 'Pengisian', A: safeAvg(sum('skorPengisian')) }, 
        { subject: 'Fasilitator', A: safeAvg(sum('skorFasilitator')) }, 
        { subject: 'Jamuan', A: safeAvg(sum('skorJamuan')) }, 
      ];

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

      const demographics = {
        jantina: getCounts('jantina'),
        umur: getCounts('umur'),
        pendidikan: getCounts('tarafPendidikan')
      };

      const commentList = filteredData
        .filter(d => d.komen && d.komen.trim().length > 2 && d.komen !== 'KOMEN PROGRAM')
        .map(d => d.komen!.trim());

      const suggestionList = filteredData
        .filter(d => d.cadangan && d.cadangan.trim().length > 2 && d.cadangan !== 'CADANGAN PROGRAM')
        .map(d => d.cadangan!.trim());

      // 2. Determine Title based on filters
      let reportTitle = "RINGKASAN EKSEKUTIF";
      if (selectedYears.length > 0) reportTitle += ` - ${selectedYears.join(', ')}`;
      if (selectedMonth !== 'SEMUA') reportTitle += ` - ${MONTHS[parseInt(selectedMonth)]}`;
      if (selectedQuarter !== 'SEMUA') reportTitle += ` - ${getQuarterLabel(selectedQuarter)}`;

      // 3. Prepare PDF Props
      const pdfProps = {
        programName: reportTitle,
        penganjur: selectedOrganizer !== 'SEMUA' ? selectedOrganizer : "PELBAGAI PENGANJUR",
        location: "PELBAGAI LOKASI",
        bahagian: "PELBAGAI BAHAGIAN",
        date: "DATA TERAPIS",
        totalRespondents: count,
        avgScore: safeAvg(sum('skorKeseluruhan')),
        radarData,
        demographics,
        rawComments: commentList.slice(0, 100), // Limit for summary
        rawSuggestions: suggestionList.slice(0, 100),
        totalComments: commentList.length,
        totalSuggestions: suggestionList.length,
      };

      // 4. Generate and Download
      const blob = await pdf(<ProgramReportPDF {...pdfProps} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ringkasan_Dashboard_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Dashboard PDF Export Error:', error);
      alert('Ralat semasa menjana PDF Ringkasan.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBSCPDF = async () => {
    if (filteredData.length === 0) return;
    setIsExporting(true);

    try {
      const BSC_CATEGORIES = [
        "1. AMAT TIDAK BAIK / SESUAI",
        "2. TIDAK BAIK / SESUAI",
        "3. SEDERHANA BAIK / SESUAI",
        "4. BAIK / SESUAI",
        "5. AMAT BAIK / SESUAI",
        "6. TIDAK BERKENAAN"
      ];
      
      const BSC_COLORS = ['#EF4444', '#F97316', '#FACC15', '#A3E635', '#22C55E', '#94A3B8'];

      const counts: Record<string, number> = {};
      BSC_CATEGORIES.forEach(cat => counts[cat] = 0);

      filteredData.forEach(item => {
        const score = Number(item.skorFormula);
        const raw = (item.rawSkorFormula || '').toUpperCase();
        let category = "";
        if (score === 1 || raw.includes("AMAT TIDAK BAIK")) category = BSC_CATEGORIES[0];
        else if (score === 2 || raw.includes("TIDAK BAIK") && !raw.includes("AMAT")) category = BSC_CATEGORIES[1];
        else if (score === 3 || raw.includes("SEDERHANA")) category = BSC_CATEGORIES[2];
        else if (score === 4 || raw.includes("BAIK") && !raw.includes("AMAT")) category = BSC_CATEGORIES[3];
        else if (score === 5 || raw.includes("AMAT BAIK")) category = BSC_CATEGORIES[4];
        else category = BSC_CATEGORIES[5];
        counts[category]++;
      });

      const chartData = BSC_CATEGORIES.map((name, index) => ({
        name,
        count: counts[name],
        color: BSC_COLORS[index]
      }));

      const avgScore = filteredData.length > 0
        ? filteredData.reduce((acc, curr) => acc + (Number(curr.skorFormula) || 0), 0) / filteredData.length
        : 0;

      const pdfProps = {
        reportDate: new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }),
        filters: {
          year: selectedYears.length > 0 ? selectedYears.join(', ') : "Semua Tahun",
          month: selectedMonth !== 'SEMUA' ? MONTHS[parseInt(selectedMonth)] : "Semua Bulan",
          organizer: selectedOrganizer !== 'SEMUA' ? selectedOrganizer : "Semua Penganjur"
        },
        totalRespondents: filteredData.length,
        avgScore: avgScore,
        chartData
      };

      const blob = await pdf(<BSCReportPDF {...pdfProps} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_BSC_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('BSC PDF Export Error:', error);
      alert('Ralat semasa menjana PDF Laporan BSC.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = selectedYears.length > 0 || selectedMonth !== 'SEMUA' || selectedQuarter !== 'SEMUA' || selectedOrganizer !== 'SEMUA' || selectedProgramName !== 'SEMUA' || selectedPlace !== 'SEMUA' || searchTerm !== '';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-lime-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold animate-pulse text-sm tracking-wide">MEMUATKAN DATA...</p>
      </div>
    </div>
  );

  if (rawData.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-lg w-full bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 text-center">
        <AlertCircle size={44} className="mx-auto text-orange-400 mb-4" />
        <h2 className="text-xl font-black text-dark mb-2">Data dashboard tidak dapat dimuatkan</h2>
        <p className="text-sm text-gray-500 font-medium mb-6">
          Sumber data Google Script tidak memulangkan rekod. Semak sambungan internet atau tekan kemaskini semula.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={refreshData}
            className="flex-1 px-5 py-3 rounded-2xl bg-lime-400 text-dark text-sm font-black hover:bg-lime-500 transition-all"
          >
            Kemaskini Semula
          </button>
          <button
            onClick={onLogout}
            className="flex-1 px-5 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-black hover:bg-gray-200 transition-all"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );

  if (selectedProgram) {
    return (
      <ProgramDetail 
        programName={selectedProgram.programName}
        data={rawData} 
        initialFilters={selectedProgram.initialFilters}
        onBack={() => {
          setSelectedProgram(null);
          setProgramVariantPicker(null);
        }}
        onRefresh={refreshData}
      />
    );
  }

  if (programVariantPicker) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex font-sans text-dark">
        <main className="flex-1 overflow-y-auto h-screen relative">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8 sm:py-10">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <p className={`${TYPO.micro} text-lime-600 mb-3`}>Pilih Variasi Program</p>
                <h1 className={TYPO.h2}>{programVariantPicker}</h1>
                <p className="text-sm text-gray-500 font-medium mt-3 max-w-2xl">
                  Nama program ini mempunyai beberapa sesi. Pilih satu variasi di bawah supaya paparan detail dan PDF export ikut sesi yang anda mahu.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshData}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:text-dark hover:border-lime-300 inline-flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Kemaskini
                </button>
                <button
                  onClick={() => setProgramVariantPicker(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:text-dark hover:border-gray-300"
                >
                  Kembali
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {selectedProgramVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => {
                    setSelectedProgram({
                      programName: programVariantPicker,
                      initialFilters: {
                        year: variant.year !== '-' ? variant.year : undefined,
                        quarter: variant.quarter !== '-' ? variant.quarter : undefined,
                        date: variant.date !== '-' ? variant.date : undefined,
                        bahagian: variant.bahagian !== '-' ? variant.bahagian : undefined,
                        location: variant.tempat !== '-' ? variant.tempat : undefined,
                        penganjur: variant.penganjur !== '-' ? variant.penganjur : undefined,
                      }
                    });
                    setProgramVariantPicker(null);
                    window.scrollTo(0, 0);
                  }}
                  className="text-left bg-white rounded-[28px] border border-gray-100 shadow-sm hover:shadow-xl hover:border-lime-200 transition-all p-7"
                >
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="inline-flex items-center rounded-full bg-lime-50 border border-lime-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-lime-700 mb-4">
                        {variant.year}
                      </div>
                      <h3 className="text-xl font-black text-dark tracking-tight">{variant.date}</h3>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{variant.quarter}</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full text-gray-600 font-black text-[10px]">
                      <Users size={12} />
                      {variant.totalRespondents} Responden
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <Building size={16} className="text-lime-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Bahagian</div>
                        <div className="font-bold text-dark">{variant.bahagian}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-lime-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Lokasi</div>
                        <div className="font-bold text-dark">{variant.tempat}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Award size={16} className="text-lime-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Penganjur</div>
                        <div className="font-bold text-dark">{variant.penganjur}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Purata Skor</span>
                    <span className="text-base font-black text-dark">Skor {variant.averageScore.toFixed(2)} — {variant.totalRespondents} responden</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F6] flex font-sans text-dark overflow-x-hidden">
      {/* Sidebar Desktop & Mobile */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-[#171A18] text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-8 mt-1">
            <div className="w-10 h-10 bg-white rounded-xl p-1 flex items-center justify-center shadow-xs">
              <LogoImage />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight block leading-none text-white">JAIS</span>
              <span className="text-[10px] text-lime-400 uppercase tracking-widest font-extrabold">Admin Panel</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem 
              icon={<LayoutDashboard size={18} />} 
              label="Analisis Data" 
              active={currentTab === 'analysis'} 
              onClick={() => {
                setCurrentTab('analysis');
                setSelectedProgram(null);
                setProgramVariantPicker(null);
                setIsMobileMenuOpen(false);
                window.scrollTo(0,0);
              }}
            />
            <NavItem 
              icon={<PieChart size={18} />} 
              label="Report BSC" 
              active={currentTab === 'bsc'} 
              onClick={() => {
                setCurrentTab('bsc');
                setSelectedProgram(null);
                setProgramVariantPicker(null);
                setIsMobileMenuOpen(false);
                window.scrollTo(0,0);
              }}
            />
            <NavItem 
              icon={<MessageSquare size={18} />} 
              label="Komen" 
              active={currentTab === 'comments'} 
              onClick={() => {
                setCurrentTab('comments');
                setSelectedProgram(null);
                setProgramVariantPicker(null);
                setIsMobileMenuOpen(false);
                window.scrollTo(0,0);
              }}
            />
            <NavItem 
              icon={<Sparkles size={18} />} 
              label="Penambahbaikan App" 
              active={currentTab === 'changelog'} 
              onClick={() => {
                setCurrentTab('changelog');
                setSelectedProgram(null);
                setProgramVariantPicker(null);
                setIsMobileMenuOpen(false);
                window.scrollTo(0,0);
              }}
            />
          </nav>

          <div className="pt-6 border-t border-gray-800/60 space-y-3">
            <button 
              onClick={onLogout}
              className="flex items-center gap-2.5 px-4 py-3 text-red-400 hover:bg-white/5 rounded-xl transition-all w-full text-xs font-bold group"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              Log Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative min-w-0">
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E6EAE7]">
          <div className="flex items-center gap-3">
            <button 
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 lg:hidden text-dark"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Buka Menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#171A18] tracking-tight">
                {currentTab === 'analysis' ? 'Analisis Program' : currentTab === 'bsc' ? 'Laporan BSC' : currentTab === 'comments' ? 'Komen Peserta' : 'Sejarah Penambahbaikan Aplikasi'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                {currentTab === 'analysis' 
                  ? 'Dashboard prestasi dan maklum balas masa nyata' 
                  : currentTab === 'bsc' 
                    ? 'Analisis strategik Penilaian Keseluruhan Program'
                    : currentTab === 'comments'
                      ? 'Maklum balas jujur dan cadangan daripada peserta'
                      : 'Log kemaskini rasmi, penambahbaikan ciri & kelajuan sistem'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
             <button 
                onClick={handleExportDashboardPDF}
                disabled={isExporting || filteredData.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171A18] text-lime-400 hover:bg-black transition-all text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50"
             >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                <span>Export PDF</span>
             </button>

             <button 
                onClick={() => refreshData()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E6EAE7] hover:border-lime-400 hover:bg-lime-50 transition-all text-xs font-bold text-gray-700 shadow-xs active:scale-95 group"
             >
                <RefreshCw size={14} className="group-hover:animate-spin text-lime-600" />
                <span>Kemas Kini</span>
             </button>

            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-black font-extrabold text-xs border border-lime-500/30">
              AD
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 xl:p-8 space-y-6 max-w-[1600px] w-full mx-auto pb-20 min-w-0">
          
            {/* FILTER BAR - Floating Card Design */}
            <div className="space-y-2">
              {/* BARIS ATAS: Carian, Tahun, Bulan & Reset */}
              <div className="bg-white p-2 rounded-[24px] shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-2">
                
                {/* Search Bar - Autocomplete Enabled */}
                <div className="relative flex-1 w-full group" ref={searchDropdownRef}>
                   <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                         <Search size={18} className="text-gray-400 group-focus-within:text-lime-600 transition-colors" />
                      </div>
                      <input 
                         ref={searchInputRef}
                         type="text"
                         value={searchTerm}
                         onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsSearchFocused(true);
                            setHighlightedSuggestionIndex(-1);
                         }}
                         onFocus={() => setIsSearchFocused(true)}
                         onKeyDown={handleSearchKeyDown}
                         placeholder="Cari nama program, tempat atau bahagian..."
                         className="w-full pl-11 pr-28 py-3.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white rounded-2xl text-xs sm:text-sm font-semibold text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 transition-all border border-transparent shadow-2xs"
                      />

                      <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1 z-10">
                         {searchTerm && (
                            <button
                               type="button"
                               onClick={() => {
                                  setSearchTerm('');
                                  setSelectedProgramName('SEMUA');
                                  setIsSearchFocused(false);
                                  updateUrlParams({ program: null });
                               }}
                               className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
                               title="Kosongkan carian"
                            >
                               <X size={15} />
                            </button>
                         )}

                         <button
                            type="button"
                            onClick={() => {
                               if (searchResults.length > 0) {
                                  const targetProg = highlightedSuggestionIndex >= 0 ? searchResults[highlightedSuggestionIndex] : searchResults[0];
                                  selectProgramFromSearch(targetProg);
                               } else if (searchTerm.trim()) {
                                  const match = allProgramNames.find(p => p.toLowerCase().includes(searchTerm.trim().toLowerCase()));
                                  if (match) {
                                     selectProgramFromSearch(match);
                                  } else {
                                     setToastMessage('Tiada program ditemui untuk carian ini.');
                                     setTimeout(() => setToastMessage(null), 3000);
                                  }
                               }
                            }}
                            className="px-3.5 py-2 bg-[#171A18] hover:bg-black text-lime-400 font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                         >
                            <span>Cari</span>
                         </button>
                      </div>
                   </div>

                   {/* Autocomplete Dropdown List */}
                   {isSearchFocused && searchTerm.trim().length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                         <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <span>Cadangan Program ({searchResults.length})</span>
                            <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">Guna ↑↓ & Enter</span>
                         </div>

                         {searchResults.length > 0 ? (
                            <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                               {searchResults.map((progName, idx) => {
                                  const isHighlighted = idx === highlightedSuggestionIndex;
                                  return (
                                     <button
                                        key={progName}
                                        type="button"
                                        onClick={() => selectProgramFromSearch(progName)}
                                        onMouseEnter={() => setHighlightedSuggestionIndex(idx)}
                                        className={`
                                           w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer text-xs
                                           ${isHighlighted ? 'bg-lime-50 text-black font-bold' : 'hover:bg-gray-50 text-gray-700'}
                                        `}
                                     >
                                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isHighlighted ? 'bg-lime-400 text-black' : 'bg-gray-100 text-gray-500'}`}>
                                           <FileText size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                           <div className="font-semibold text-xs leading-snug">
                                              {highlightMatch(progName, searchTerm)}
                                           </div>
                                        </div>
                                        <Check size={14} className={`shrink-0 mt-1 ${selectedProgramName === progName ? 'text-lime-600 opacity-100' : 'opacity-0'}`} />
                                     </button>
                                  );
                               })}
                            </div>
                         ) : (
                            <div className="p-6 text-center text-xs text-gray-500 space-y-1">
                               <p className="font-bold text-gray-700">Tiada program ditemui</p>
                               <p className="text-[11px] text-gray-400">Sila semak ejaan nama program atau kata kunci carian anda.</p>
                            </div>
                         )}
                      </div>
                   )}
                </div>

                {/* Filters - Pills (Custom Dropdowns) */}
                <div className="flex flex-wrap items-center gap-2 px-1">
                    
                    {/* 1. Filter: Year (Multi-select) */}
                    <div className="relative" ref={yearDropdownRef}>
                       <button
                          onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                          className={`
                             h-[50px] px-5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border min-w-[140px] justify-between
                             ${isYearDropdownOpen || selectedYears.length > 0
                                ? 'bg-dark text-white border-dark shadow-lg shadow-gray-200' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                             }
                          `}
                       >
                          <div className="flex items-center gap-2">
                             <Calendar size={16} className={selectedYears.length > 0 ? "text-lime-400" : "text-gray-400"} />
                             <span className="truncate max-w-[100px]">
                               {selectedYears.length === 0 ? "Tahun" : `${selectedYears.length} Dipilih`}
                             </span>
                          </div>
                          <ChevronDown size={14} className="opacity-50" />
                       </button>

                       {isYearDropdownOpen && (
                          <div className="absolute top-full right-0 sm:left-0 mt-2 w-[220px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                             <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Tahun</div>
                             <div className="max-h-[250px] overflow-y-auto space-y-1 custom-scrollbar">
                                <button onClick={() => setSelectedYears([])} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedYears.length === 0 ? 'text-lime-600 bg-lime-50' : 'text-gray-600'}`}>Semua Tahun {selectedYears.length === 0 && <Check size={14}/>}</button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                {years.map(y => (
                                   <button key={y} onClick={() => toggleYear(y)} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedYears.includes(y) ? 'text-dark bg-gray-100' : 'text-gray-600'}`}>{y} {selectedYears.includes(y) && <Check size={14} className="text-lime-500"/>}</button>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>

                    {/* 2. Filter: Month (Custom Dropdown) */}
                    <div className="relative" ref={monthDropdownRef}>
                       <button
                          onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                          className={`
                             h-[50px] px-5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border min-w-[140px] justify-between
                             ${isMonthDropdownOpen || selectedMonth !== 'SEMUA'
                                ? 'bg-lime-100 text-lime-900 border-lime-200' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                             }
                          `}
                       >
                          <div className="flex items-center gap-2">
                             <CalendarDays size={16} className={selectedMonth !== 'SEMUA' ? "text-lime-700" : "text-gray-400"} />
                             <span className="truncate max-w-[100px]">
                               {selectedMonth === 'SEMUA' ? "Bulan" : MONTHS[parseInt(selectedMonth)]}
                             </span>
                          </div>
                          <ChevronDown size={14} className="opacity-50" />
                       </button>

                       {isMonthDropdownOpen && (
                          <div className="absolute top-full right-0 sm:left-0 mt-2 w-[200px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                             <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Bulan</div>
                             <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
                                <button onClick={() => {setSelectedMonth('SEMUA'); setIsMonthDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedMonth === 'SEMUA' ? 'text-lime-600 bg-lime-50' : 'text-gray-600'}`}>Semua Bulan {selectedMonth === 'SEMUA' && <Check size={14}/>}</button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                {months.map(mIndex => (
                                   <button key={mIndex} onClick={() => {setSelectedMonth(mIndex.toString()); setIsMonthDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedMonth === mIndex.toString() ? 'text-dark bg-gray-100' : 'text-gray-600'}`}>{MONTHS[mIndex]} {selectedMonth === mIndex.toString() && <Check size={14} className="text-lime-500"/>}</button>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>

                    {/* Reset Action (dipindahkan ke atas) */}
                    {hasActiveFilters && (
                      <button 
                        onClick={() => { setSelectedYears([]); setSelectedMonth('SEMUA'); setSelectedQuarter('SEMUA'); setSelectedOrganizer('SEMUA'); setSelectedProgramName('SEMUA'); setProgramNameSearchTerm(''); setSelectedPlace('SEMUA'); setPlaceSearchTerm(''); setSearchTerm(''); }}
                        className="h-[50px] px-4 text-red-500 font-bold text-xs hover:bg-red-50 rounded-2xl transition-colors ml-auto xl:ml-0"
                      >
                        Reset
                      </button>
                    )}
                </div>
              </div>

              {/* BARIS BAWAH: Suku, Penganjur, Nama Program (Grid 3 Komponen) */}
              <div className="bg-white p-2 rounded-[24px] shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-2">

                    {/* 3. Filter: Quarter (Custom Dropdown) */}
                    <div className="relative w-full" ref={quarterDropdownRef}>
                       <button
                          onClick={() => setIsQuarterDropdownOpen(!isQuarterDropdownOpen)}
                          className={`
                             h-[50px] px-5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border w-full justify-between
                             ${isQuarterDropdownOpen || selectedQuarter !== 'SEMUA'
                                ? 'bg-lime-100 text-lime-900 border-lime-200' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                             }
                          `}
                       >
                          <div className="flex items-center gap-2">
                             <PieChart size={16} className={selectedQuarter !== 'SEMUA' ? "text-lime-700" : "text-gray-400"} />
                             <span className="truncate max-w-[100px]">
                               {selectedQuarter === 'SEMUA' ? "Suku" : getQuarterLabel(selectedQuarter)}
                             </span>
                          </div>
                          <ChevronDown size={14} className="opacity-50" />
                       </button>

                       {isQuarterDropdownOpen && (
                          <div className="absolute top-full right-0 sm:left-0 mt-2 w-[180px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                             <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Suku</div>
                             <button onClick={() => {setSelectedQuarter('SEMUA'); setIsQuarterDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedQuarter === 'SEMUA' ? 'text-lime-600 bg-lime-50' : 'text-gray-600'}`}>Semua Suku {selectedQuarter === 'SEMUA' && <Check size={14}/>}</button>
                             <div className="h-px bg-gray-100 my-1"></div>
                             {quarters.map(q => (
                                <button key={q} onClick={() => {setSelectedQuarter(q); setIsQuarterDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedQuarter === q ? 'text-dark bg-gray-100' : 'text-gray-600'}`}>{getQuarterLabel(q)} {selectedQuarter === q && <Check size={14} className="text-lime-500"/>}</button>
                             ))}
                          </div>
                       )}
                    </div>

                    {/* 4. Filter: Organizer (Custom Dropdown) */}
                    <div className="relative w-full" ref={organizerDropdownRef}>
                       <button
                          onClick={() => setIsOrganizerDropdownOpen(!isOrganizerDropdownOpen)}
                          className={`
                             h-[50px] px-5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border w-full justify-between
                             ${isOrganizerDropdownOpen || selectedOrganizer !== 'SEMUA'
                                ? 'bg-lime-100 text-lime-900 border-lime-200' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                             }
                          `}
                       >
                          <div className="flex items-center gap-2 overflow-hidden">
                             <Building size={16} className={selectedOrganizer !== 'SEMUA' ? "text-lime-700 shrink-0" : "text-gray-400 shrink-0"} />
                             <span className="truncate">
                               {selectedOrganizer === 'SEMUA' ? "Penganjur" : selectedOrganizer}
                             </span>
                          </div>
                          <ChevronDown size={14} className="opacity-50 shrink-0" />
                       </button>

                       {isOrganizerDropdownOpen && (
                          <div className="absolute top-full right-0 mt-2 w-[280px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                             <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Penganjur</div>
                             <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
                                <button onClick={() => {setSelectedOrganizer('SEMUA'); setIsOrganizerDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedOrganizer === 'SEMUA' ? 'text-lime-600 bg-lime-50' : 'text-gray-600'}`}>Semua Penganjur {selectedOrganizer === 'SEMUA' && <Check size={14}/>}</button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                {organizers.map(o => (
                                   <button key={o} onClick={() => {setSelectedOrganizer(o); setIsOrganizerDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedOrganizer === o ? 'text-dark bg-gray-100' : 'text-gray-600'}`}>
                                      <span className="truncate">{o}</span>
                                      {selectedOrganizer === o && <Check size={14} className="text-lime-500 shrink-0"/>}
                                   </button>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>

                    {/* 5. Filter: Nama Program (Custom Dropdown) */}
                    <div className="relative w-full" ref={programNameDropdownRef}>
                       <button
                          onClick={() => setIsProgramNameDropdownOpen(!isProgramNameDropdownOpen)}
                          className={`
                             h-[50px] px-5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border w-full justify-between
                             ${isProgramNameDropdownOpen || selectedProgramName !== 'SEMUA'
                                ? 'bg-lime-100 text-lime-900 border-lime-200' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                             }
                          `}
                       >
                          <div className="flex items-center gap-2 overflow-hidden">
                             <FileText size={16} className={selectedProgramName !== 'SEMUA' ? "text-lime-700 shrink-0" : "text-gray-400 shrink-0"} />
                             <span className="truncate">
                               {selectedProgramName === 'SEMUA' ? "Nama Program" : selectedProgramName}
                             </span>
                          </div>
                          <ChevronDown size={14} className="opacity-50 shrink-0" />
                       </button>

                       {isProgramNameDropdownOpen && (
                          <div className="absolute top-full right-0 mt-2 w-[320px] bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                             <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between items-center">
                               Pilih Program
                             </div>
                             <div className="px-2 mb-2">
                                <input 
                                   type="text" 
                                   placeholder="Taip nama program..." 
                                   value={programNameSearchTerm}
                                   onChange={(e) => setProgramNameSearchTerm(e.target.value)}
                                   className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-lime-400 focus:bg-white transition-all text-dark"
                                   onClick={(e) => e.stopPropagation()}
                                />
                             </div>
                             <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
                                <button onClick={() => {setSelectedProgramName('SEMUA'); setIsProgramNameDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedProgramName === 'SEMUA' ? 'text-lime-600 bg-lime-50' : 'text-gray-600'}`}>Semua Program {selectedProgramName === 'SEMUA' && <Check size={14}/>}</button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                {programNames.filter(p => p.toLowerCase().includes(programNameSearchTerm.toLowerCase())).map(p => (
                                   <button key={p} onClick={() => {setSelectedProgramName(p); setIsProgramNameDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedProgramName === p ? 'text-dark bg-gray-100' : 'text-gray-600'}`}>
                                      <span className="truncate" title={p}>{p}</span>
                                      {selectedProgramName === p && <Check size={14} className="text-lime-500 shrink-0"/>}
                                   </button>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>
              </div>

              {/* BARIS KETIGA: Tempat Program */}
              <div className="bg-white p-2 rounded-[24px] shadow-sm border border-gray-100">
                 {/* 6. Filter: Tempat Program (Custom Dropdown) */}
                 <div className="relative w-full" ref={placeDropdownRef}>
                    <button
                       onClick={() => setIsPlaceDropdownOpen(!isPlaceDropdownOpen)}
                       className={`
                          h-[50px] px-5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border w-full justify-between
                          ${isPlaceDropdownOpen || selectedPlace !== 'SEMUA'
                             ? 'bg-lime-100 text-lime-900 border-lime-200' 
                             : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }
                       `}
                    >
                       <div className="flex items-center gap-2 overflow-hidden">
                          <MapPin size={16} className={selectedPlace !== 'SEMUA' ? "text-lime-700 shrink-0" : "text-gray-400 shrink-0"} />
                          <span className="truncate">
                            {selectedPlace === 'SEMUA' ? "Tempat Program Dilaksana" : selectedPlace}
                          </span>
                       </div>
                       <ChevronDown size={14} className="opacity-50 shrink-0" />
                    </button>

                    {isPlaceDropdownOpen && (
                       <div className="absolute top-full right-0 left-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between items-center">
                            Pilih Tempat
                          </div>
                          <div className="px-2 mb-2">
                             <input 
                                type="text" 
                                placeholder="Taip tempat program..." 
                                value={placeSearchTerm}
                                onChange={(e) => setPlaceSearchTerm(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-lime-400 focus:bg-white transition-all text-dark"
                                onClick={(e) => e.stopPropagation()}
                             />
                          </div>
                          <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
                             <button onClick={() => {setSelectedPlace('SEMUA'); setIsPlaceDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedPlace === 'SEMUA' ? 'text-lime-600 bg-lime-50' : 'text-gray-600'}`}>Semua Tempat {selectedPlace === 'SEMUA' && <Check size={14}/>}</button>
                             <div className="h-px bg-gray-100 my-1"></div>
                             {placeNames.filter(p => p.toLowerCase().includes(placeSearchTerm.toLowerCase())).map(p => (
                                <button key={p} onClick={() => {setSelectedPlace(p); setIsPlaceDropdownOpen(false)}} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedPlace === p ? 'text-dark bg-gray-100' : 'text-gray-600'}`}>
                                   <span className="truncate" title={p}>{p}</span>
                                   {selectedPlace === p && <Check size={14} className="text-lime-500 shrink-0"/>}
                                </button>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
            </div>

            {/* SELECTED PROGRAM SUMMARY PANEL */}
            {selectedProgramDetails && (
              <div 
                ref={summaryPanelRef}
                className={`
                  scroll-mt-28 bg-gradient-to-br from-[#171A18] via-gray-900 to-[#171A18] border border-lime-500/30 text-white p-5 sm:p-6 rounded-[24px] shadow-xl transition-all duration-700 relative overflow-hidden min-w-0 my-4
                  ${isRecentlySelected ? 'ring-4 ring-lime-400/80 shadow-2xl shadow-lime-400/20 scale-[1.002]' : ''}
                `}
              >
                {/* Ambient Glow Accent */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                  
                  {/* Information Section */}
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-lime-400 text-black uppercase tracking-wider shadow-xs">
                        <Sparkles size={13} />
                        Ringkasan Program Dipilih
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-lime-300 border border-white/10 backdrop-blur-md">
                        <CheckCircle2 size={13} className="text-lime-400" />
                        1 Program Ditemui ({stats.totalRespondents} Responden)
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug break-words">
                      {selectedProgramDetails.name}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs text-gray-300 font-medium">
                      <div className="flex items-center gap-2 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 min-w-0">
                        <Building size={15} className="text-lime-400 shrink-0" />
                        <span className="truncate" title={selectedProgramDetails.penganjur}>
                          <strong className="text-gray-400">Penganjur:</strong> {selectedProgramDetails.penganjur}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 min-w-0">
                        <MapPin size={15} className="text-lime-400 shrink-0" />
                        <span className="truncate" title={selectedProgramDetails.tempat}>
                          <strong className="text-gray-400">Tempat:</strong> {selectedProgramDetails.tempat}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 min-w-0">
                        <Calendar size={15} className="text-lime-400 shrink-0" />
                        <span className="truncate">
                          <strong className="text-gray-400">Tahun/Tarikh:</strong> {selectedProgramDetails.tarikh || selectedProgramDetails.tahun}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 min-w-0">
                        <Users size={15} className="text-lime-400 shrink-0" />
                        <span className="truncate">
                          <strong className="text-gray-400">Jumlah Data:</strong> {stats.totalRespondents} Responden
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap sm:flex-row lg:flex-col gap-2 shrink-0 justify-end">
                    <button
                      onClick={() => {
                        const text = `Assalamualaikum/ Salam Sejahtera \n\nTuan/Puan Dilampirkan Laporan Penilaian ${selectedProgramDetails.name}\nTarikh ${selectedProgramDetails.tarikh || selectedProgramDetails.tahun || '-'}\nTempat Program ${selectedProgramDetails.tempat || '-'}\nBilangan Responden ${stats.totalRespondents}`;
                        navigator.clipboard.writeText(text);
                        setToastMessage('Teks laporan WhatsApp berjaya disalin!');
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white hover:text-black transition-all font-black text-xs shadow-md active:scale-95 cursor-pointer"
                      title="Salin ayat laporan ke WhatsApp"
                    >
                      <MessageSquare size={15} />
                      <span>Salin WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProgram({
                          programName: selectedProgramDetails.name
                        });
                        window.scrollTo(0, 0);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-lime-400 text-black hover:bg-lime-300 transition-all font-black text-xs shadow-md active:scale-95 cursor-pointer"
                    >
                      <FileText size={15} />
                      <span>Lihat Detail Laporan</span>
                    </button>

                    <button
                      onClick={() => {
                        if (kpiSectionRef.current) {
                          kpiSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all font-bold text-xs active:scale-95 cursor-pointer"
                    >
                      <TrendingUp size={15} />
                      <span>Lihat Analisis</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProgramName('SEMUA');
                        setSearchTerm('');
                        updateUrlParams({ program: null });
                        setToastMessage('Pilihan program dikosongkan.');
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all font-bold text-xs active:scale-95 cursor-pointer"
                    >
                      <X size={15} />
                      <span>Kosongkan</span>
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* EMPTY STATE FOR PROGRAM WITH ZERO RESPONDENTS */}
            {selectedProgramName !== 'SEMUA' && stats.totalRespondents === 0 && (
              <div className="bg-amber-50/90 border border-amber-200 rounded-[24px] p-6 text-amber-950 shadow-sm flex flex-col sm:flex-row items-center gap-4 my-4">
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-700 shrink-0">
                  <AlertCircle size={32} />
                </div>
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <h3 className="font-extrabold text-base text-amber-950">Program Ditemui (Tiada Data Penilaian)</h3>
                  <p className="text-xs text-amber-800 font-medium">
                    Program ini ditemui dalam pangkalan data, tetapi tiada rekod responden bagi kombinasi penapis semasa.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedProgramName('SEMUA');
                    setSearchTerm('');
                    updateUrlParams({ program: null });
                  }}
                  className="px-4 py-2.5 bg-amber-200/90 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                >
                  Kosongkan Penapis
                </button>
              </div>
            )}


          {currentTab === 'changelog' ? (
            <ChangelogPage />
          ) : currentTab === 'comments' ? (
            <CommentsPage data={filteredData} onProgramSelect={handleProgramSelect} />
          ) : currentTab === 'bsc' ? (
            <ReportBSC data={filteredData} onExportPDF={handleExportBSCPDF} isExporting={isExporting} />
          ) : (
            <>

              {/* KPI CARDS - 6 Items aligned neatly across desktop */}
              <div ref={kpiSectionRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-w-0 scroll-mt-28">
                <StatCard 
                  title="Jumlah Responden" 
                  value={stats.totalRespondents}
                  icon={<Users size={20} />}
                  trend="Timestamp Valid"
                  highlight 
                  className="h-full"
                />
                 <StatCard 
                  title="Bilangan Program" 
                  value={stats.totalPrograms || 0}
                  icon={<Layers size={20} />}
                  trend="Unik"
                  className="h-full"
                />
                 <StatCard 
                  title="Purata Skor" 
                  value={stats.avgKeseluruhan}
                  icon={<Star size={20} />}
                  subtext={`Skor ${stats.avgKeseluruhan} — ${stats.totalRespondents} responden (Sasaran: 4.5+)`}
                  trend="Indeks"
                  className="h-full"
                />
                <StatCard 
                  title="Indeks BSC (AE)" 
                  value={stats.avgFormula}
                  icon={<Bot size={20} />}
                  subtext={`Skor ${stats.avgFormula} — ${stats.totalRespondents} responden`}
                  highlight
                  className="h-full"
                />
                 <StatCard 
                  title="Kepuasan Pengisian" 
                  value={stats.avgPengisian}
                  icon={<Activity size={20} />}
                  subtext={`Skor ${stats.avgPengisian} — ${stats.totalRespondents} responden`}
                  className="h-full"
                />
                 <StatCard 
                  title="Prestasi Fasilitator" 
                  value={stats.avgFasilitator}
                  icon={<Award size={20} />}
                  subtext={`Skor ${stats.avgFasilitator} — ${stats.totalRespondents} responden`}
                  className="h-full"
                />
              </div>

              {/* CHARTS ROW 1 (12 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
                  {/* Main Score Bar Chart (8 Columns) */}
                  <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-xs border border-[#E6EAE7] flex flex-col min-w-0">
                    <div className="mb-5 flex justify-between items-start gap-2">
                        <div>
                            <h3 className="text-base font-extrabold text-[#171A18] flex items-center gap-2.5">
                              <div className="p-2 bg-lime-100 rounded-xl text-lime-800"><TrendingUp size={18} /></div>
                              Prestasi Kategori
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mt-1">Analisis purata skor bagi setiap aspek (Berdasarkan {stats.totalRespondents} responden)</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full h-[280px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={charts.scores} margin={{ top: 25, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} 
                            axisLine={false} 
                            tickLine={false}
                            dy={10}
                          />
                          <YAxis 
                            domain={[0, 5]} 
                            tick={{ fill: '#9CA3AF', fontSize: 11 }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip cursor={{ fill: '#F9FAFB' }} content={<CustomTooltip />} />
                          <Bar 
                            dataKey="value" 
                            name="Skor"
                            radius={[6, 6, 6, 6]} 
                            barSize={32}
                            animationDuration={1500}
                          >
                            <LabelList 
                              dataKey="value" 
                              position="top" 
                              style={{ fill: COLORS.dark, fontSize: '11px', fontWeight: '800' }}
                              offset={10}
                            />
                            {charts.scores.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? COLORS.limeDark : COLORS.dark} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gender Bar Chart (4 Columns) */}
                  <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-xs border border-[#E6EAE7] flex flex-col min-w-0">
                    <div className="mb-5 flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-extrabold text-[#171A18] flex items-center gap-2.5">
                          <div className="p-2 bg-gray-100 rounded-xl text-gray-800"><Users size={18} /></div>
                          Demografi
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">Pecahan Jantina Peserta</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 h-[280px] w-full relative min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={charts.jantina} 
                          layout="horizontal"
                          margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} 
                            axisLine={false} 
                            tickLine={false}
                            dy={10}
                          />
                          <YAxis 
                            tick={{ fill: '#9CA3AF', fontSize: 11 }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip cursor={{ fill: '#F9FAFB' }} content={<CustomTooltip />} />
                          <Bar 
                            dataKey="value" 
                            name="Peserta" 
                            radius={[6, 6, 6, 6]} 
                            barSize={44}
                            animationDuration={1500}
                          >
                            <LabelList 
                              dataKey="value" 
                              position="top" 
                              style={{ fill: COLORS.dark, fontSize: '11px', fontWeight: '800' }}
                              offset={10}
                            />
                            {charts.jantina.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name.includes('LELAKI') ? COLORS.dark : COLORS.lime} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
              </div>

              {/* CHARTS ROW 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Age Group (6 Columns) */}
                  <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-xs border border-[#E6EAE7] flex flex-col min-w-0">
                     <div className="flex items-center gap-2.5 mb-5">
                        <div className="p-2 bg-gray-100 rounded-xl text-gray-800">
                           <Calendar size={18} />
                        </div>
                        <div>
                           <h3 className="text-base font-extrabold text-[#171A18]">Taburan Umur</h3>
                           <p className="text-xs text-gray-500 font-medium mt-0.5">Mengikut Kategori</p>
                        </div>
                     </div>
                     
                     <div className="h-[280px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={charts.umur} 
                            layout="vertical"
                            margin={{ left: 10, right: 50, top: 10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                            <XAxis type="number" hide />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={130}
                              tick={{ fill: '#4B5563', fontSize: 11, fontWeight: 600 }} 
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                            <Bar 
                              dataKey="value" 
                              name="Peserta"
                              fill={COLORS.dark} 
                              radius={[0, 6, 6, 0]} 
                              barSize={22} 
                              background={{ fill: '#F9FAFB', radius: [0, 6, 6, 0] } as any}
                            >
                              <LabelList 
                                dataKey="value" 
                                position="right" 
                                style={{ fill: COLORS.dark, fontSize: '11px', fontWeight: '800' }}
                                offset={10}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Top Places (6 Columns) */}
                  <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-xs border border-[#E6EAE7] flex flex-col min-w-0">
                     <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-lime-100 rounded-xl text-lime-800">
                                <Trophy size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-[#171A18]">Lokasi Popular</h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Top 3 Tempat Program</p>
                            </div>
                        </div>
                     </div>
                     
                     <div className="flex-1 flex flex-col justify-center gap-3">
                        {topPlaces.length > 0 ? (
                            topPlaces.map((place, index) => (
                                <div 
                                    key={place.name} 
                                    className={`
                                        relative p-4 rounded-xl flex items-center justify-between gap-3 transition-all
                                        ${index === 0 
                                            ? 'bg-[#171A18] text-white shadow-md' 
                                            : 'bg-gray-50 text-dark border border-gray-100'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`
                                            shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs
                                            ${index === 0 ? 'bg-lime-400 text-black' : 'bg-white text-gray-500 border border-gray-200'}
                                        `}>
                                            {index + 1}
                                        </div>
                                        <span className={`font-bold uppercase text-xs truncate ${index === 0 ? 'text-gray-100' : 'text-gray-700'}`}>
                                            {place.name}
                                        </span>
                                    </div>
                                    <div className="font-black text-base sm:text-lg">
                                        {place.value}
                                    </div>
                                    {index === 0 && (
                                        <div className="absolute top-0 right-0 -mt-1.5 -mr-1.5 text-lime-400">
                                            <Medal size={24} fill="currentColor" />
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-50">
                                <MapPin size={32} className="text-gray-300 mb-2"/>
                                <p className="text-sm font-bold text-gray-400">Tiada Data Lokasi</p>
                             </div>
                        )}
                     </div>
                  </div>
              </div>

              {/* CHARTS ROW 3 (12 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
                  {/* Generasi Demografi (6 Columns) */}
                  <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-xs border border-[#E6EAE7] flex flex-col min-w-0">
                     <div className="flex items-center gap-2.5 mb-5">
                        <div className="p-2 bg-lime-100 rounded-xl text-lime-800">
                           <Users size={18} />
                        </div>
                        <div>
                           <h3 className="text-base font-extrabold text-[#171A18]">Generasi Demografi</h3>
                           <p className="text-xs text-gray-500 font-medium mt-0.5">Mengikut Generasi</p>
                        </div>
                     </div>
                     
                     <div className="h-[280px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={charts.generasi} 
                            layout="vertical"
                            margin={{ left: 10, right: 50, top: 10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                            <XAxis type="number" hide />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={100}
                              tick={{ fill: '#4B5563', fontSize: 11, fontWeight: 600 }} 
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                            <Bar 
                              dataKey="value" 
                              name="Peserta"
                              fill={COLORS.limeDark} 
                              radius={[0, 6, 6, 0]} 
                              barSize={22} 
                              background={{ fill: '#F9FAFB', radius: [0, 6, 6, 0] } as any}
                            >
                              <LabelList 
                                dataKey="value" 
                                position="right" 
                                style={{ fill: COLORS.dark, fontSize: '11px', fontWeight: '800' }}
                                offset={10}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Analisis Bahagian (6 Columns) */}
                  <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-xs border border-[#E6EAE7] flex flex-col min-w-0">
                     <div className="flex items-center gap-2.5 mb-5">
                        <div className="p-2 bg-gray-100 rounded-xl text-gray-800">
                           <Building size={18} />
                        </div>
                        <div>
                           <h3 className="text-base font-extrabold text-[#171A18]">Analisis Bahagian</h3>
                           <p className="text-xs text-gray-500 font-medium mt-0.5">Taburan Program Mengikut Bahagian</p>
                        </div>
                     </div>
                     
                     <div className="h-[280px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={charts.bahagian} margin={{ top: 25, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }} 
                              axisLine={false} 
                              tickLine={false}
                              dy={10}
                            />
                            <YAxis 
                              tick={{ fill: '#9CA3AF', fontSize: 11 }} 
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <Tooltip cursor={{ fill: '#F9FAFB' }} content={<CustomTooltip />} />
                            <Bar 
                              dataKey="value" 
                              name="Program"
                              fill={COLORS.limeDark} 
                              radius={[6, 6, 6, 6]} 
                              barSize={28}
                              animationDuration={1500}
                            >
                              <LabelList 
                                dataKey="value" 
                                position="top" 
                                style={{ fill: COLORS.dark, fontSize: '11px', fontWeight: '800' }}
                                offset={10}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
              </div>

              {/* TABLE SECTION */}
              <div className="bg-white rounded-2xl border border-[#E6EAE7] shadow-xs overflow-hidden mt-2 min-w-0">
                <SubmissionTable 
                   data={programSummaries} 
                   onSelect={handleProgramSelect}
                   onExportPDF={handleExportProgramPDF}
                />
              </div>
            </>
          )}
        </div>

        {/* TOAST NOTIFICATION */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-6 right-6 z-50 bg-[#171A18] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-lime-400/40 flex items-center gap-3 max-w-md text-xs font-bold"
            >
              <div className="p-1.5 bg-lime-400 text-black rounded-lg shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <span className="flex-1 text-gray-200">{toastMessage}</span>
              <button 
                onClick={() => setToastMessage(null)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
