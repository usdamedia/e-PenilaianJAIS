
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  LayoutDashboard, Users, Star, Activity, ArrowLeft, 
  TrendingUp, MapPin, Calendar, Award 
} from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { StatCard } from './components/StatCard';

// Brand Colors
const COLORS = {
  lime: '#D0F240',
  dark: '#111111',
  limeDark: '#9AB820',
  gray: '#E5E7EB',
  highlight: '#E1F87E'
};

const CHART_COLORS = [COLORS.lime, COLORS.dark, COLORS.limeDark, '#555555', '#333333'];

interface DashboardProps {
  onBack: () => void;
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/10 text-white min-w-[150px]">
        <p className="font-bold text-sm mb-2 text-gray-300 border-b border-gray-700 pb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-sm mb-1">
            <span style={{ color: entry.color }} className="font-medium capitalize">
              {entry.name}:
            </span>
            <span className="font-bold font-mono">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ onBack }) => {
  const { loading, stats, charts } = useDashboardData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-dark font-bold text-lg">Memuatkan Analisis...</p>
          <p className="text-gray-400 text-sm">Sila tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans pb-20 selection:bg-lime-400 selection:text-black">
      {/* Navbar / Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack} 
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-dark transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-dark tracking-tight flex items-center gap-2">
                <LayoutDashboard className="text-lime-600" size={24} />
                Analisis Program
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                Paparan data dan maklum balas masa nyata
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-fit self-end md:self-auto">
             <span className="text-xs font-bold text-gray-500 px-3 uppercase tracking-wider">Status Data</span>
             <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-dark">Aktif</span>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard 
            title="Jumlah Responden" 
            value={stats.totalRespondents} 
            icon={<Users size={24} />} 
            trend="+12% bulan ini"
            highlight
          />
          <StatCard 
            title="Purata Skor" 
            value={stats.avgKeseluruhan} 
            icon={<Star size={24} />}
            subtext="Daripada skala 5.0"
            trend="Cemerlang"
          />
          <StatCard 
            title="Kepuasan Pengisian" 
            value={stats.avgPengisian} 
            icon={<Activity size={24} />}
            subtext="Relevansi topik"
          />
          <StatCard 
            title="Prestasi Fasilitator" 
            value={stats.avgFasilitator} 
            icon={<Award size={24} />}
            subtext="Penyampaian & Interaksi"
          />
        </div>

        {/* Charts Section: Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Score Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[2rem] shadow-soft border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-bold text-dark flex items-center gap-2">
                  <TrendingUp size={20} className="text-lime-600" />
                  Prestasi Keseluruhan Mengikut Kategori
                </h3>
                <p className="text-gray-400 text-sm mt-1">Perbandingan purata skor bagi setiap aspek penilaian.</p>
              </div>
            </div>
            
            <div className="h-[300px] sm:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.scores} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 5] as [number, number]} 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    name="Skor"
                    fill={COLORS.lime} 
                    radius={[8, 8, 8, 8]} 
                    barSize={40}
                    animationDuration={1500}
                  >
                    {charts.scores.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? COLORS.lime : COLORS.limeDark} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gender Pie Chart */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-soft border border-gray-100 flex flex-col">
            <h3 className="text-lg font-bold text-dark mb-2 flex items-center gap-2">
              <Users size={20} className="text-lime-600" />
              Demografi Peserta
            </h3>
            <p className="text-gray-400 text-sm mb-6">Pecahan jantina responden.</p>
            
            <div className="flex-1 min-h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.jantina}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {charts.jantina.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-dark font-bold text-xs ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                 <div className="text-center">
                    <span className="block text-3xl font-extrabold text-dark">{stats.totalRespondents}</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Responden</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Age & Location Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Age Group Distribution */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-soft border border-gray-100">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl text-dark">
                   <Calendar size={20} />
                </div>
                <div>
                   <h3 className="font-bold text-dark text-lg">Taburan Umur</h3>
                   <p className="text-gray-400 text-sm">Penyertaan mengikut kumpulan umur</p>
                </div>
             </div>
             
             <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={charts.umur} 
                    layout="vertical"
                    margin={{ left: 20 }}
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
                      fill={COLORS.dark} 
                      radius={[0, 6, 6, 0]} 
                      barSize={24} 
                      background={{ fill: '#F9FAFB', radius: [0, 6, 6, 0] } as any}
                    />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Location Breakdown */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-soft border border-gray-100">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl text-dark">
                   <MapPin size={20} />
                </div>
                <div>
                   <h3 className="font-bold text-dark text-lg">Lokasi & Bahagian</h3>
                   <p className="text-gray-400 text-sm">Jumlah program mengikut kawasan</p>
                </div>
             </div>
             
             <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.bahagian}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fill: '#9CA3AF', fontSize: 11 }} 
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
      </div>
    </div>
  );
};
