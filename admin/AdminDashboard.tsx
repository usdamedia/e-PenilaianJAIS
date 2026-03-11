
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, Users, FileText, Settings as SettingsIcon, LogOut, Bell, Menu, Shield, RefreshCw, Filter, 
  Calendar, Building, Search, Star, Activity, Award, TrendingUp, MapPin, ChevronDown, X, PieChart, Trophy, Medal,
  CalendarDays, Check, SlidersHorizontal, Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPie, Pie, Cell, Legend 
} from 'recharts';
import { useDashboardData } from '../dashboard/hooks/useDashboardData';
import { StatCard } from '../dashboard/components/StatCard';
import { SubmissionTable, ProgramSummary } from './SubmissionTable';
import { ProgramDetail } from './ProgramDetail';
import { DashboardData } from '../dashboard/types';
import { Settings } from './Settings';
import { MONTHS } from '../constants';

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

// Define View Types
type AdminView = 'dashboard' | 'settings' | 'records' | 'users';

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
    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm group ${
      active
        ? 'bg-lime-400 text-dark shadow-glow'
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className="tracking-wide">{label}</span>
  </button>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { rawData, loading, refreshData, lastFetchTime } = useDashboardData(); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

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

  const [searchTerm, setSearchTerm] = useState<string>('');

  // Unified "Click Outside" Handler to close any open dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [yearDropdownRef, monthDropdownRef, quarterDropdownRef, organizerDropdownRef]);

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

  // Main Filter Logic
  const filteredData = useMemo(() => {
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
      { name: 'Logistik', value: avg('skorLogistik') },
      { name: 'Pengisian', value: avg('skorPengisian') },
      { name: 'Fasilitator', value: avg('skorFasilitator') },
      { name: 'Keurusetiaan', value: avg('skorUrusetia') },
    ];

    return { 
        scores, 
        jantina: countBy('jantina'), 
        umur: countBy('umur'),
        bahagian: countBy('bahagian')
    };
  }, [filteredData]);

  const programSummaries = useMemo<ProgramSummary[]>(() => {
    const groups: Record<string, {
      programName: string;
      bahagian: string;
      tempat: string;
      penganjur: string;
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
          totalScore: 0,
          count: 0,
          timestamps: []
        };
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

  const handleViewChange = (view: AdminView) => {
    setCurrentView(view);
    setSelectedProgram(null);
    setIsMobileMenuOpen(false);
    window.scrollTo(0,0);
  };

  const hasActiveFilters = selectedYears.length > 0 || selectedMonth !== 'SEMUA' || selectedQuarter !== 'SEMUA' || selectedOrganizer !== 'SEMUA' || searchTerm !== '';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-lime-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold animate-pulse text-sm tracking-wide">MEMUATKAN DATA...</p>
      </div>
    </div>
  );

  if (selectedProgram) {
    return (
      <ProgramDetail 
        programName={selectedProgram}
        data={rawData} 
        onBack={() => setSelectedProgram(null)}
        onRefresh={refreshData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex font-sans text-dark">
      {/* Sidebar Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-[#1A1C1E] text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-4 mb-12 mt-2">
            <div className="w-12 h-12 bg-lime-400 rounded-2xl flex items-center justify-center text-dark shadow-glow">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight block leading-none">JAIS</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Admin Panel</span>
            </div>
          </div>

          <nav className="flex-1 space-y-3">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Analisis Data" 
              active={currentView === 'dashboard'} 
              onClick={() => handleViewChange('dashboard')}
            />
            <NavItem 
              icon={<FileText size={20} />} 
              label="Rekod Penilaian" 
              active={currentView === 'records'}
              onClick={() => handleViewChange('dashboard')} 
            />
            <NavItem 
              icon={<Users size={20} />} 
              label="Akses Pengguna" 
              active={currentView === 'users'}
              onClick={() => handleViewChange('dashboard')} 
            />
            <NavItem 
              icon={<SettingsIcon size={20} />} 
              label="Konfigurasi" 
              active={currentView === 'settings'}
              onClick={() => handleViewChange('settings')}
            />
          </nav>

          <div className="pt-8 border-t border-gray-800">
            <button 
              onClick={onLogout}
              className="flex items-center gap-3 px-6 py-4 text-red-400 hover:bg-white/5 rounded-2xl transition-all w-full text-sm font-bold group"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
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
      <main className="flex-1 overflow-y-auto h-screen relative">
        <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 px-6 sm:px-10 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-gray-200/50">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 lg:hidden text-dark"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className={TYPO.h2}>
                {currentView === 'settings' ? 'Konfigurasi' : 'Analisis Program'}
              </h1>
              <p className={`${TYPO.small} text-gray-500 mt-1`}>
                {currentView === 'settings' ? 'Tetapan sistem dan status pangkalan data' : 'Dashboard prestasi dan maklum balas masa nyata'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-auto">
             <button 
                onClick={() => refreshData()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 hover:border-lime-400 hover:bg-lime-50 transition-all text-xs font-bold text-gray-600 shadow-sm active:scale-95 group"
             >
                <RefreshCw size={14} className="group-hover:animate-spin text-lime-600" />
                <span className="hidden sm:inline">Kemaskini</span>
             </button>

            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 shadow-lg shadow-lime-400/20 flex items-center justify-center text-white font-bold text-xs border-2 border-white">
              AD
            </div>
          </div>
        </header>

        <div className="p-6 sm:p-10 space-y-10 max-w-[1800px] mx-auto pb-20">
          
          {currentView === 'settings' ? (
             <Settings onRefresh={refreshData} lastUpdated={lastFetchTime} />
          ) : (
            <>
              {/* FILTER BAR - Floating Card Design */}
              <div className="bg-white p-2 rounded-[24px] shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-2">
                
                {/* Search - Dominant */}
                <div className="relative flex-1 w-full group">
                   <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Search size={18} className="text-gray-400 group-focus-within:text-lime-600 transition-colors" />
                   </div>
                   <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari program, tempat atau bahagian..."
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 hover:bg-gray-100 focus:bg-white rounded-2xl text-sm font-semibold text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400/20 transition-all border border-transparent"
                   />
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

                    {/* 3. Filter: Quarter (Custom Dropdown) */}
                    <div className="relative" ref={quarterDropdownRef}>
                       <button
                          onClick={() => setIsQuarterDropdownOpen(!isQuarterDropdownOpen)}
                          className={`
                             h-[50px] px-5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border min-w-[140px] justify-between
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
                    <div className="relative" ref={organizerDropdownRef}>
                       <button
                          onClick={() => setIsOrganizerDropdownOpen(!isOrganizerDropdownOpen)}
                          className={`
                             h-[50px] px-5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all border max-w-[200px] justify-between
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

                    {/* Reset Action */}
                    {hasActiveFilters && (
                      <button 
                        onClick={() => { setSelectedYears([]); setSelectedMonth('SEMUA'); setSelectedQuarter('SEMUA'); setSelectedOrganizer('SEMUA'); setSearchTerm(''); }}
                        className="h-[50px] px-4 text-red-500 font-bold text-xs hover:bg-red-50 rounded-2xl transition-colors ml-auto xl:ml-0"
                      >
                        Reset
                      </button>
                    )}
                </div>
              </div>

              {/* KPI CARDS - Clean & Bold - Updated Grid for 5 items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard 
                  title="Jumlah Responden" 
                  value={stats.totalRespondents}
                  icon={<Users size={24} />}
                  trend="Timestamp Valid"
                  highlight 
                  className="h-full"
                />
                 {/* New Card: Bilangan Program */}
                 <StatCard 
                  title="Bilangan Program" 
                  value={stats.totalPrograms || 0}
                  icon={<Layers size={24} />}
                  trend="Unik"
                  className="h-full"
                />
                <StatCard 
                  title="Purata Skor" 
                  value={stats.avgKeseluruhan}
                  icon={<Star size={24} />}
                  subtext="Sasaran: 4.5+"
                  trend="Indeks"
                  className="h-full"
                />
                 <StatCard 
                  title="Kepuasan Pengisian" 
                  value={stats.avgPengisian}
                  icon={<Activity size={24} />}
                  subtext="Relevansi Topik"
                  className="h-full"
                />
                 <StatCard 
                  title="Prestasi Fasilitator" 
                  value={stats.avgFasilitator}
                  icon={<Award size={24} />}
                  subtext="Kualiti Penyampaian"
                  className="h-full"
                />
              </div>

              {/* CHARTS ROW 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Score Bar Chart */}
                  <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col">
                    <div className="mb-6">
                        <h3 className={`${TYPO.h3} flex items-center gap-3 text-dark`}>
                          <div className="p-2 bg-lime-100 rounded-lg text-lime-700"><TrendingUp size={20} /></div>
                          Prestasi Kategori
                        </h3>
                        <p className={`${TYPO.small} text-gray-400 mt-1 pl-12`}>Analisis purata skor bagi setiap aspek</p>
                    </div>
                    
                    <div className="flex-1 w-full h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={charts.scores} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                            {charts.scores.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? COLORS.limeDark : COLORS.dark} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gender Bar Chart */}
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col">
                    <div className="mb-6 flex justify-between items-start">
                      <div>
                        <h3 className={`${TYPO.h3} text-dark flex items-center gap-3`}>
                          <div className="p-2 bg-gray-100 rounded-lg text-dark"><Users size={20} /></div>
                          Demografi
                        </h3>
                        <p className={`${TYPO.small} text-gray-400 mt-1 pl-12`}>Pecahan Jantina</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 h-[200px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={charts.jantina} 
                          layout="horizontal"
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                            radius={[8, 8, 8, 8]} 
                            barSize={48}
                            animationDuration={1500}
                          >
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
                  {/* Age Group */}
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
                     <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-gray-100 rounded-lg text-dark">
                           <Calendar size={20} />
                        </div>
                        <div>
                           <h3 className={TYPO.h3}>Taburan Umur</h3>
                           <p className={`${TYPO.micro} text-gray-400 mt-1`}>Mengikut Kategori</p>
                        </div>
                     </div>
                     
                     <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={charts.umur} 
                            layout="vertical"
                            margin={{ left: 10, right: 30 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                            <XAxis type="number" hide />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={140}
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
                              barSize={24} 
                              background={{ fill: '#F9FAFB', radius: [0, 6, 6, 0] } as any}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Top Places */}
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-lime-100 rounded-lg text-lime-700">
                                <Trophy size={20} />
                            </div>
                            <div>
                                <h3 className={TYPO.h3}>Lokasi Popular</h3>
                                <p className={`${TYPO.micro} text-gray-400 mt-1`}>Top 3 Tempat</p>
                            </div>
                        </div>
                     </div>
                     
                     <div className="flex-1 flex flex-col justify-center gap-4">
                        {topPlaces.length > 0 ? (
                            topPlaces.map((place, index) => (
                                <div 
                                    key={place.name} 
                                    className={`
                                        relative p-5 rounded-2xl flex items-center justify-between gap-4 transition-all
                                        ${index === 0 
                                            ? 'bg-[#1A1C1E] text-white shadow-xl shadow-gray-200' 
                                            : 'bg-gray-50 text-dark border border-gray-100'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className={`
                                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs
                                            ${index === 0 ? 'bg-lime-400 text-black' : 'bg-white text-gray-400 border border-gray-200'}
                                        `}>
                                            {index + 1}
                                        </div>
                                        <span className={`font-bold uppercase text-xs sm:text-sm truncate ${index === 0 ? 'text-gray-200' : 'text-gray-600'}`}>
                                            {place.name}
                                        </span>
                                    </div>
                                    <div className="font-black text-lg sm:text-xl">
                                        {place.value}
                                    </div>
                                    {index === 0 && (
                                        <div className="absolute top-0 right-0 -mt-2 -mr-2 text-lime-400">
                                            <Medal size={28} fill="currentColor" />
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

              {/* BAHAGIAN CHART */}
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gray-100 rounded-lg text-dark">
                       <MapPin size={20} />
                    </div>
                    <div>
                       <h3 className={TYPO.h3}>Analisis Bahagian</h3>
                       <p className={`${TYPO.micro} text-gray-400 mt-1`}>Taburan Program</p>
                    </div>
                 </div>
                 
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.bahagian} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                          barSize={32}
                          animationDuration={1500}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* TABLE SECTION */}
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden mt-2">
                <SubmissionTable 
                   data={programSummaries} 
                   onSelect={(programName) => setSelectedProgram(programName)}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
