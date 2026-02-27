import React from 'react';
import { Search, Calendar, ChevronDown, CalendarDays, PieChart, Building, Check } from 'lucide-react';
import { MONTHS } from '../../constants';

interface FilterBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedYears: string[];
  toggleYear: (year: string) => void;
  setSelectedYears: (years: string[]) => void;
  isYearDropdownOpen: boolean;
  setIsYearDropdownOpen: (open: boolean) => void;
  yearDropdownRef: React.RefObject<HTMLDivElement | null>;
  years: string[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  isMonthDropdownOpen: boolean;
  setIsMonthDropdownOpen: (open: boolean) => void;
  monthDropdownRef: React.RefObject<HTMLDivElement | null>;
  months: number[];
  selectedQuarter: string;
  setSelectedQuarter: (q: string) => void;
  isQuarterDropdownOpen: boolean;
  setIsQuarterDropdownOpen: (open: boolean) => void;
  quarterDropdownRef: React.RefObject<HTMLDivElement | null>;
  quarters: string[];
  getQuarterLabel: (q: string) => string;
  selectedOrganizer: string;
  setSelectedOrganizer: (o: string) => void;
  isOrganizerDropdownOpen: boolean;
  setIsOrganizerDropdownOpen: (open: boolean) => void;
  organizerDropdownRef: React.RefObject<HTMLDivElement | null>;
  organizers: string[];
  hasActiveFilters: boolean;
  resetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  selectedYears,
  toggleYear,
  setSelectedYears,
  isYearDropdownOpen,
  setIsYearDropdownOpen,
  yearDropdownRef,
  years,
  selectedMonth,
  setSelectedMonth,
  isMonthDropdownOpen,
  setIsMonthDropdownOpen,
  monthDropdownRef,
  months,
  selectedQuarter,
  setSelectedQuarter,
  isQuarterDropdownOpen,
  setIsQuarterDropdownOpen,
  quarterDropdownRef,
  quarters,
  getQuarterLabel,
  selectedOrganizer,
  setSelectedOrganizer,
  isOrganizerDropdownOpen,
  setIsOrganizerDropdownOpen,
  organizerDropdownRef,
  organizers,
  hasActiveFilters,
  resetFilters,
}) => {
  return (
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
              onClick={resetFilters}
              className="h-[50px] px-4 text-red-500 font-bold text-xs hover:bg-red-50 rounded-2xl transition-colors ml-auto xl:ml-0"
            >
              Reset
            </button>
          )}
      </div>
    </div>
  );
};
