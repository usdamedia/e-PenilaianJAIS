
import React from 'react';
import { TrendingUp, Trophy, Award, Users, PieChart as PieChartIcon, MapPin } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPie, Pie, Cell, Legend 
} from 'recharts';

interface ChartsSectionProps {
  charts: any;
  topPlaces: any;
  colors: any;
  typo: any;
  customTooltip: any;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ 
  charts, 
  topPlaces, 
  colors, 
  typo, 
  customTooltip 
}) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8">
          {/* Main Score Bar Chart */}
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col">
            <div className="mb-6">
                <h3 className={`${typo.h3} flex items-center gap-3 text-dark`}>
                  <div className="p-2 bg-lime-100 rounded-lg text-lime-700"><TrendingUp size={20} /></div>
                  Prestasi Kategori
                </h3>
                <p className={`${typo.small} text-gray-400 mt-1 pl-12`}>Analisis purata skor bagi setiap aspek</p>
            </div>
            
            <div className="flex-1 w-full h-[300px]">
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
                  <Tooltip cursor={{ fill: '#F9FAFB' }} content={customTooltip} />
                  <Bar 
                    dataKey="value" 
                    name="Skor"
                    radius={[6, 6, 6, 6]} 
                    barSize={48}
                    animationDuration={1500}
                  >
                    {charts.scores.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? colors.limeDark : colors.dark} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
          {/* Organizer Rating Bar Chart */}
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col">
            <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className={`${typo.h3} flex items-center gap-3 text-dark`}>
                    <div className="p-2 bg-lime-100 rounded-lg text-lime-700"><Trophy size={20} /></div>
                    Prestasi Mengikut Penganjur Utama
                  </h3>
                  <p className={`${typo.small} text-gray-400 mt-1 pl-12`}>Purata skor keseluruhan bagi setiap bahagian/pejabat penganjur</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                   <Award size={16} className="text-lime-600" />
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Top 10 Penganjur</span>
                </div>
            </div>
            
            <div className="flex-1 w-full h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={charts.organizers} 
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 150, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    type="number"
                    domain={[0, 5]} 
                    tick={{ fill: '#9CA3AF', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    tick={{ fill: '#1A1C1E', fontSize: 10, fontWeight: 700 }} 
                    axisLine={false} 
                    tickLine={false}
                    width={140}
                  />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} content={customTooltip} />
                  <Bar 
                    dataKey="value" 
                    name="Purata Skor"
                    radius={[0, 6, 6, 0]} 
                    barSize={24}
                    animationDuration={2000}
                  >
                    {charts.organizers.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? colors.lime : index < 3 ? colors.limeDark : colors.dark} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
          {/* Top Venues List */}
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col">
            <div className="mb-6">
                <h3 className={`${typo.h3} flex items-center gap-3 text-dark`}>
                  <div className="p-2 bg-lime-100 rounded-lg text-lime-700"><MapPin size={20} /></div>
                  Lokasi Teratas
                </h3>
                <p className={`${typo.small} text-gray-400 mt-1 pl-12`}>Tempat program yang paling kerap dikunjungi</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              {topPlaces.map((place: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-lime-400 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-lime-600 shadow-sm group-hover:bg-lime-600 group-hover:text-white transition-all">
                      0{idx + 1}
                    </div>
                    <div>
                      <p className="font-black text-dark text-sm uppercase tracking-tight">{place.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Lokasi Program</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-dark text-2xl leading-none">{place.value}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Responden</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
};
