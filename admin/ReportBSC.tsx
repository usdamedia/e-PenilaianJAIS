
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import { 
  TrendingUp, Filter, Check, ChevronDown, BarChart3, PieChart, Activity, Info, FileDown, Loader2
} from 'lucide-react';
import { DashboardData } from '../dashboard/types';
import { motion, AnimatePresence } from 'motion/react';

interface ReportBSCProps {
  data: DashboardData[];
  onExportPDF: () => void;
  isExporting: boolean;
}

const CATEGORIES = [
  "1. AMAT TIDAK BAIK / SESUAI",
  "2. TIDAK BAIK / SESUAI",
  "3. SEDERHANA BAIK / SESUAI",
  "4. BAIK / SESUAI",
  "5. AMAT BAIK / SESUAI",
  "6. TIDAK BERKENAAN"
];

const CAT_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#FACC15', // Yellow
  '#A3E635', // Lime
  '#22C55E', // Green
  '#94A3B8'  // Slate/Gray
];

export const ReportBSC: React.FC<ReportBSCProps> = ({ data, onExportPDF, isExporting }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'NO_NA' | 'POSITIVE' | 'NEGATIVE'>('ALL');

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach(cat => counts[cat] = 0);

    data.forEach(item => {
      const score = Number(item.skorFormula);
      const raw = (item.rawSkorFormula || '').toUpperCase();

      let category = "";
      if (score === 1 || raw.includes("AMAT TIDAK BAIK")) category = CATEGORIES[0];
      else if (score === 2 || raw.includes("TIDAK BAIK") && !raw.includes("AMAT")) category = CATEGORIES[1];
      else if (score === 3 || raw.includes("SEDERHANA")) category = CATEGORIES[2];
      else if (score === 4 || raw.includes("BAIK") && !raw.includes("AMAT")) category = CATEGORIES[3];
      else if (score === 5 || raw.includes("AMAT BAIK")) category = CATEGORIES[4];
      else category = CATEGORIES[5];

      counts[category]++;
    });

    let result = CATEGORIES.map((name, index) => ({
      name,
      count: counts[name],
      color: CAT_COLORS[index],
      shortName: name.split('.')[0] + '.' // Just "1.", "2." etc for axis
    }));

    if (filterType === 'NO_NA') {
      result = result.filter(item => item.name !== CATEGORIES[5]);
    } else if (filterType === 'POSITIVE') {
      result = result.filter(item => item.name.includes('4.') || item.name.includes('5.'));
    } else if (filterType === 'NEGATIVE') {
      result = result.filter(item => item.name.includes('1.') || item.name.includes('2.'));
    }

    return result;
  }, [data, filterType]);

  const totalFiltered = chartData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="text-dark">
            <h2 className="text-3xl font-black tracking-tight">Report BSC</h2>
            <p className="text-gray-500 font-medium">Penilaian Keseluruhan Program - Analisis Strategik</p>
          </div>
          
          <button 
            onClick={onExportPDF}
            disabled={isExporting || data.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-dark text-lime-400 hover:bg-black transition-all text-xs font-bold shadow-lg shadow-lime-900/10 active:scale-95 disabled:opacity-50 group sm:mt-0"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            <span>Export BSC PDF</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-dark text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Papar Semua
          </button>
          <button 
            onClick={() => setFilterType('NO_NA')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'NO_NA' ? 'bg-dark text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Tanpa N/A
          </button>
          <button 
            onClick={() => setFilterType('POSITIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'POSITIVE' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Sentimen Positif
          </button>
          <button 
            onClick={() => setFilterType('NEGATIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'NEGATIVE' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Sentimen Negatif
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-8 sm:p-12 rounded-[40px] shadow-sm border border-gray-100 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-lime-100 rounded-2xl text-lime-700">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-dark">Kekerapan Penilaian</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Lajur AE: Rumusan BSC</p>
              </div>
            </div>
            
            <div className="text-right">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">JUMLAH SAMPEL</span>
               <span className="text-2xl font-black text-dark">{totalFiltered}</span>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text 
                          x={0} y={0} dy={16} 
                          textAnchor="middle" 
                          fill="#64748b" 
                          fontSize={10} 
                          fontWeight={800}
                          width={80}
                        >
                          {payload.value.split(' / ')[0].split('. ')[1] || payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 10}} 
                  content={({active, payload}) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-dark p-4 rounded-2xl shadow-2xl border border-white/10 text-white min-w-[200px]">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pb-2 border-b border-white/5">{data.name}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold">Kekerapan:</span>
                            <span className="text-xl font-black text-lime-400">{data.count}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[10, 10, 10, 10]} 
                  barSize={60}
                  animationDuration={1500}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList 
                    dataKey="count" 
                    position="top" 
                    style={{ fill: '#1e293b', fontSize: '14px', fontWeight: '900' }}
                    offset={15}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Info size={16} /> Petunjuk Warna
            </h4>
            <div className="space-y-4">
              {CATEGORIES.map((cat, i) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[i] }}></div>
                  <span className="text-xs font-bold text-dark truncate">{cat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-dark text-white p-8 rounded-[32px] shadow-xl shadow-gray-200 relative overflow-hidden group">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-lime-400/10 rounded-full blur-2xl group-hover:bg-lime-400/20 transition-all"></div>
            <div className="relative z-10">
              <TrendingUp className="text-lime-400 mb-4" size={32} />
              <h4 className="text-lg font-black leading-tight mb-2">Analisis Sentiment BSC</h4>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Visualisasi ini membantu dalam memantau KPI jabatan secara strategik berdasarkan taburan maklum balas peserta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
