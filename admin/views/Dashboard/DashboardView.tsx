
import React from 'react';
import { FilterBar } from '../../components/FilterBar';
import { KpiSection } from './components/KpiSection';
import { ChartsSection } from './components/ChartsSection';
import { SubmissionTable } from '../../components/SubmissionTable';

interface DashboardViewProps {
  // Filter Props
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
  
  // Data Props
  stats: any;
  charts: any;
  topPlaces: any;
  programSummaries: any[];
  onProgramSelect: (name: string) => void;
  
  // UI Props
  colors: any;
  typo: any;
  customTooltip: any;
}

export const DashboardView: React.FC<DashboardViewProps> = (props) => {
  return (
    <div className="space-y-10">
      <FilterBar 
        searchTerm={props.searchTerm}
        setSearchTerm={props.setSearchTerm}
        selectedYears={props.selectedYears}
        toggleYear={props.toggleYear}
        setSelectedYears={props.setSelectedYears}
        isYearDropdownOpen={props.isYearDropdownOpen}
        setIsYearDropdownOpen={props.setIsYearDropdownOpen}
        yearDropdownRef={props.yearDropdownRef}
        years={props.years}
        selectedMonth={props.selectedMonth}
        setSelectedMonth={props.setSelectedMonth}
        isMonthDropdownOpen={props.isMonthDropdownOpen}
        setIsMonthDropdownOpen={props.setIsMonthDropdownOpen}
        monthDropdownRef={props.monthDropdownRef}
        months={props.months}
        selectedQuarter={props.selectedQuarter}
        setSelectedQuarter={props.setSelectedQuarter}
        isQuarterDropdownOpen={props.isQuarterDropdownOpen}
        setIsQuarterDropdownOpen={props.setIsQuarterDropdownOpen}
        quarterDropdownRef={props.quarterDropdownRef}
        quarters={props.quarters}
        getQuarterLabel={props.getQuarterLabel}
        selectedOrganizer={props.selectedOrganizer}
        setSelectedOrganizer={props.setSelectedOrganizer}
        isOrganizerDropdownOpen={props.isOrganizerDropdownOpen}
        setIsOrganizerDropdownOpen={props.setIsOrganizerDropdownOpen}
        organizerDropdownRef={props.organizerDropdownRef}
        organizers={props.organizers}
        hasActiveFilters={props.hasActiveFilters}
        resetFilters={props.resetFilters}
      />

      <KpiSection 
        stats={props.stats} 
        charts={props.charts} 
        selectedOrganizer={props.selectedOrganizer} 
      />

      <ChartsSection 
        charts={props.charts}
        topPlaces={props.topPlaces}
        colors={props.colors}
        typo={props.typo}
        customTooltip={props.customTooltip}
      />

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <SubmissionTable 
          summaries={props.programSummaries} 
          onSelectProgram={props.onProgramSelect} 
        />
      </div>
    </div>
  );
};
