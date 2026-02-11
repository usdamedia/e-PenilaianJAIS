
import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Users, FileText, Settings as SettingsIcon, LogOut, Bell, Menu, Shield, RefreshCw, Filter, 
  Calendar, Building, Search, Star, Activity, Award, TrendingUp, MapPin, ChevronDown, X 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useDashboardData } from '../dashboard/hooks/useDashboardData';
import { StatCard } from '../dashboard/components/StatCard';
import { SubmissionTable, ProgramSummary } from './SubmissionTable';
import { ProgramDetail } from './ProgramDetail';
import { DashboardData } from '../dashboard/types';
import { Settings } from './Settings';

interface AdminDashboardProps {
  onLogout: () => void;
}

const COLORS = {
  lime: '#D0F240',
  dark: '#1A1C1E',
  limeDark: '#9AB820',
  gray: '#E5E7EB',
  highlight: '#E1F87E'
};

const CHART_COLORS = [COLORS.lime, '#FFFFFF', COLORS.limeDark, '#555555', '#333333'];

// Custom Tooltip for Charts with better contrast/readability
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1C1E] p-4 rounded-xl shadow-2xl border border-gray-700 text-white min-w-[180px] z-50">
        <p className="font-bold text-xs uppercase tracking-wider mb-3 text-gray-400 border-b border-gray-700 pb-2">{label}</p>
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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { rawData, loading, refreshData, lastFetchTime } = useDashboardData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  
  // View State
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

  // --- FILTER STATES ---
  const [selectedYear, setSelectedYear] = useState<string>('SEMUA');
  const [selectedOrganizer, setSelectedOrganizer] = useState<string>('SEMUA');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // --- DYNAMIC FILTER OPTIONS ---
  const { years, organizers } = useMemo(() => {
    const uniqueYears = new Set<string>();
    const uniqueOrganizers = new Set<string>();

    rawData.forEach(item => {
      // Extract Year
      let y = 'N/A';
      try {
        const d = new Date(item.programDate);
        if (!isNaN(d.getTime())) {
          y = d.getFullYear().toString();
        } else if (typeof item.programDate === 'string' && item.programDate.length >= 4) {
          y = item.programDate.substring(0, 4); 
        }
      } catch (e) { console.log(e) }
      
      if (y !== 'N/A' && y !== '1970') uniqueYears.add(y);

      // Extract Organizer
      if (item.penganjur && item.penganjur !== '-') uniqueOrganizers.add(item.penganjur);
    });

    return {
      years: Array.from(uniqueYears).sort().reverse(),
      organizers: Array.from(uniqueOrganizers).sort()
    };
  }, [rawData]);


  // --- FILTERED DATA COMPUTATION ---
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      // 1. Year Check
      let matchYear = true;
      if (selectedYear !== 'SEMUA') {
        const d = new Date(item.programDate);
        const y = !isNaN(d.getTime()) ? d.getFullYear().toString() : (item.programDate || '').substring(0, 4);
        matchYear = y === selectedYear;
      }

      // 2. Organizer Check
      let matchOrg = true;
      if (selectedOrganizer !== 'SEMUA') {
        matchOrg = item.penganjur === selectedOrganizer;
      }

      return matchYear && matchOrg;
    });
  }, [rawData, selectedYear, selectedOrganizer]);


  // --- CALCULATE CHARTS BASED ON FILTERED DATA ---
  const charts = useMemo(() => {
    if (filteredData.length === 0) {
      return { scores: [], jantina: [], umur: [], bahagian: [] };
    }

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
      { name: 'Urusetia', value: avg('skorUrusetia') },
    ];

    return { 
        scores, 
        jantina: countBy('jantina'), 
        umur: countBy('umur'), 
        bahagian: countBy('bahagian').slice(0, 10) 
    };
  }, [filteredData]);


  // --- CALCULATE STATS ---
  const stats = useMemo(() => {
    if (filteredData.length === 0) return { 
        totalRespondents: 0, 
        avgKeseluruhan: "0.00",
        avgPengisian: "0.00",
        avgFasilitator: "0.00" 
    };

    const sum = (key: keyof DashboardData) => filteredData.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    const count = filteredData.length;

    return {
      totalRespondents: count,
      avgKeseluruhan: (sum('skorKeseluruhan') / count).toFixed(2),
      avgPengisian: (sum('skorPengisian') / count).toFixed(2),
      avgFasilitator: (sum('skorFasilitator') / count).toFixed(2),
    };
  }, [filteredData]);


  // --- CALCULATE TABLE LIST ---
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

    // Apply Search Filter on Summaries
    if (!searchTerm) return summaries;

    const lowerSearch = searchTerm.toLowerCase();
    return summaries.filter(s => 
       (s.programName || '').toLowerCase().includes(lowerSearch) ||
       (s.bahagian || '').toLowerCase().includes(lowerSearch) ||
       (s.tempat || '').toLowerCase().includes(lowerSearch)
    );

  }, [filteredData, searchTerm]);

  // Handle Navigation Change
  const handleViewChange = (view: AdminView) => {
    setCurrentView(view);
    setSelectedProgram(null);
    setIsMobileMenuOpen(false);
    window.scrollTo(0,0);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-lime-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold animate-pulse text-sm tracking-wide">MEMUATKAN DATA...</p>
      </div>
    </div>
  );

  // If a program is selected, show the detail view (Overrides everything else)
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

  const hasActiveFilters = selectedYear !== 'SEMUA' || selectedOrganizer !== 'SEMUA' || searchTerm !== '';

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex font-sans">
      {/* Sidebar - Desktop (Gaya Minimalist) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#1A1C1E] text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2 mt-2">
            <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center text-dark font-black shadow-lg shadow-lime-900/20">
              <Shield size={20} />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight block leading-none">JAIS</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Admin Panel</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Analisis Data" 
              active={currentView === 'dashboard'} 
              onClick={() => handleViewChange('dashboard')}
            />
            {/* Placeholders for future pages, keeping them clickable but directing to dashboard for now or just keeping visual */}
            <NavItem 
              icon={<FileText size={20} />} 
              label="Rekod Penilaian" 
              active={currentView === 'records'}
              onClick={() => handleViewChange('dashboard')} // Fallback to dashboard for now or handle separately
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

          <div className="pt-6 border-t border-gray-800">
            <button 
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white/5 rounded-xl transition-colors w-full text-sm font-bold"
            >
              <LogOut size={20} />
              Log Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen border-l border-gray-100">
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100 px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden text-dark"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1A1C1E] tracking-tight flex items-center gap-2">
                {currentView === 'settings' ? 'Konfigurasi' : 'Analisis Program'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                {currentView === 'settings' ? 'Tetapan sistem dan status pangkalan data' : 'Dashboard prestasi dan maklum balas masa nyata'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-auto">
             {/* Refresh Button - Clean Minimalist */}
             <button 
                onClick={() => refreshData()}
                className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 hover:border-lime-400 hover:bg-lime-50 transition-all text-xs font-bold text-gray-600 shadow-sm active:scale-95"
                title="Kemaskini Data"
             >
                <RefreshCw size={14} className="group-hover:animate-spin text-lime-600" />
                <span className="hidden sm:inline">Kemaskini</span>
             </button>

            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 shadow-sm flex items-center justify-center text-white font-bold text-xs border-2 border-white ring-1 ring-gray-100">
              AD
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto">
          
          {/* CONTENT SWITCHER */}
          {currentView === 'settings' ? (
             <Settings onRefresh={refreshData} lastUpdated={lastFetchTime} />
          ) : (
            <>
              {/* CONTROL BAR (UNIFIED FILTER) */}
              <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col xl:flex-row gap-2 items-center">
                
                {/* Search - Primary Action */}
                <div className="relative flex-1 w-full">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search size={18} className="text-gray-400" />
                   </div>
                   <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari nama program, tempat atau bahagian..."
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-sm font-semibold text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400/50 transition-all border border-transparent focus:bg-white"
                   />
                </div>

                <div className="h-8 w-px bg-gray-200 hidden xl:block mx-1"></div>

                {/* Filters Group */}
                <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                    {/* Year Select */}
                    <div className="relative min-w-[160px]">
                       <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                       <select 
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 appearance-none cursor-pointer hover:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/20 transition-all"
                       >
                          <option value="SEMUA">Semua Tahun</option>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                       </select>
                       <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Organizer Select */}
                    <div className="relative min-w-[200px] flex-1">
                       <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                       <select 
                          value={selectedOrganizer}
                          onChange={(e) => setSelectedOrganizer(e.target.value)}
                          className="w-full pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 appearance-none cursor-pointer hover:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/20 transition-all truncate"
                       >
                          <option value="SEMUA">Semua Penganjur</option>
                          {organizers.map(o => <option key={o} value={o}>{o}</option>)}
                       </select>
                       <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Reset Button - Only shows when needed to reduce noise */}
                {hasActiveFilters && (
                  <button 
                    onClick={() => { setSelectedYear('SEMUA'); setSelectedOrganizer('SEMUA'); setSearchTerm(''); }}
                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-700 transition-colors flex items-center justify-center tooltip"
                    title="Reset Semua Penapis"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* KPI CARDS - PRINCIPLE: VISUAL HIERARCHY (Top Priority) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <StatCard 
                  title="Jumlah Responden" 
                  value={stats.totalRespondents}
                  icon={<Users size={24} />}
                  trend="Total"
                  highlight 
                />
                <StatCard 
                  title="Purata Skor" 
                  value={stats.avgKeseluruhan}
                  icon={<Star size={24} />}
                  subtext="Sasaran: 4.5+"
                  trend="Indeks"
                />
                 <StatCard 
                  title="Kepuasan Pengisian" 
                  value={stats.avgPengisian}
                  icon={<Activity size={24} />}
                  subtext="Relevansi Topik"
                />
                 <StatCard 
                  title="Prestasi Fasilitator" 
                  value={stats.avgFasilitator}
                  icon={<Award size={24} />}
                  subtext="Kualiti Penyampaian"
                />
              </div>

              {/* CHARTS SECTION - PRINCIPLE: MINIMIZE COGNITIVE LOAD (Grouped layouts) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Score Bar Chart - Takes prominent space */}
                  <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-black text-[#1A1C1E] flex items-center gap-2">
                          <TrendingUp size={20} className="text-lime-600" />
                          Prestasi Mengikut Kategori
                        </h3>
                        <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-wide">Analisis purata skor bagi setiap aspek</p>
                      </div>
                    </div>
                    {/* Compact Height: h-[160px] */}
                    <div className="w-full h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={charts.scores} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }} 
                            axisLine={false} 
                            tickLine={false}
                            dy={5}
                          />
                          <YAxis 
                            domain={[0, 5]} 
                            tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip cursor={{ fill: '#F9FAFB' }} content={<CustomTooltip />} />
                          <Bar 
                            dataKey="value" 
                            name="Skor"
                            radius={[4, 4, 4, 4]} 
                            barSize={24}
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

                  {/* Gender Bar Chart (Replaces Pie Chart) */}
                  <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-black text-[#1A1C1E] mb-1 flex items-center gap-2">
                          <Users size={20} className="text-lime-600" />
                          Demografi
                        </h3>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Pecahan Jantina</p>
                      </div>
                      <div className="bg-gray-50 px-3 py-1 rounded-lg text-right">
                         <span className="text-xl font-black text-dark block leading-none">{stats.totalRespondents}</span>
                         <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 h-[160px] relative w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={charts.jantina} 
                          layout="horizontal"
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }} 
                            axisLine={false} 
                            tickLine={false}
                            dy={5}
                          />
                          <YAxis 
                            tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <Tooltip cursor={{ fill: '#F9FAFB' }} content={<CustomTooltip />} />
                          <Bar 
                            dataKey="value" 
                            name="Peserta" 
                            radius={[6, 6, 6, 6]} 
                            barSize={40}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Age Group Distribution */}
                  <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gray-50 rounded-xl text-[#1A1C1E]">
                           <Calendar size={20} />
                        </div>
                        <div>
                           <h3 className="font-black text-[#1A1C1E] text-lg">Taburan Umur</h3>
                           <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Penyertaan mengikut kumpulan umur</p>
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
                              width={120}
                              tick={{ fill: '#4B5563', fontSize: 10, fontWeight: 700 }} 
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                            <Bar 
                              dataKey="value" 
                              name="Peserta"
                              fill={COLORS.dark} 
                              radius={[0, 4, 4, 0]} 
                              barSize={20} 
                              background={{ fill: '#F9FAFB', radius: [0, 4, 4, 0] } as any}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Location Breakdown */}
                  <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gray-50 rounded-xl text-[#1A1C1E]">
                           <MapPin size={20} />
                        </div>
                        <div>
                           <h3 className="font-black text-[#1A1C1E] text-lg">Lokasi & Bahagian</h3>
                           <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Jumlah program mengikut kawasan</p>
                        </div>
                     </div>
                     
                     <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={charts.bahagian}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: '#9CA3AF', fontSize: 9, fontWeight: 700 }} 
                              interval={0}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <YAxis 
                              tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar 
                              dataKey="value" 
                              name="Program"
                              fill={COLORS.limeDark} 
                              radius={[4, 4, 0, 0]} 
                            />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
              </div>

              {/* TABLE SECTION */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-2">
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

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem = ({ icon, label, active = false, onClick }: NavItemProps) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-sm font-medium
      ${active 
        ? 'bg-lime-500 text-white shadow-lg shadow-lime-900/20 font-bold' 
        : 'text-gray-400 hover:bg-white/5 hover:text-dark hover:font-bold'
      }
    `}
  >
    {icon}
    {label}
  </button>
);
