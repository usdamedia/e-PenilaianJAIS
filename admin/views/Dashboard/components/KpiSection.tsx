
import React from 'react';
import { Users, Layers, Star, Activity, Award, Trophy, Building } from 'lucide-react';
import { StatCard } from '../../../../dashboard/components/StatCard';
import { DashboardData } from '../../../../dashboard/types';

interface KpiSectionProps {
  stats: any;
  charts: any;
  selectedOrganizer: string;
}

export const KpiSection: React.FC<KpiSectionProps> = ({ stats, charts, selectedOrganizer }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      <StatCard 
        title="Jumlah Responden" 
        value={stats.totalRespondents}
        icon={<Users size={24} />}
        trend="Timestamp Valid"
        highlight 
        className="h-full"
      />
      <StatCard 
        title="Program Penganjur" 
        value={stats.totalPrograms}
        icon={<Building size={24} />}
        subtext={selectedOrganizer === 'SEMUA' ? "Keseluruhan" : selectedOrganizer}
        trend="Dinamik"
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
  );
};
