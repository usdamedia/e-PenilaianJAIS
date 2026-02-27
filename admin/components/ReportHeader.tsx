import React from 'react';
import { Calendar, MapPin, Building2, Filter } from 'lucide-react';

interface ReportHeaderProps {
  programName: string;
  displayPenganjur: string;
  id: string;
  uniqueDates: { iso: string, label: string }[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  displayedLocation: string;
  uniqueBahagian: string[];
  selectedBahagian: string;
  setSelectedBahagian: (bahagian: string) => void;
  fs: (type: any) => string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  programName,
  displayPenganjur,
  id,
  uniqueDates,
  selectedDate,
  setSelectedDate,
  displayedLocation,
  uniqueBahagian,
  selectedBahagian,
  setSelectedBahagian,
  fs,
}) => {
  return (
    <div className="bg-[#1A1C1E] text-white p-8 sm:p-12 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-lime-400/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20"></div>
      
      <div className="relative z-10 flex flex-col gap-6">
        {/* Meta Tag */}
        <div className="flex items-center gap-3">
          <div className="bg-lime-400 text-black text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">
              Laporan Program
          </div>
          <span className="text-gray-500 text-[10px] font-mono tracking-wider">
              ID: {id || 'N/A'}
          </span>
        </div>
        
        {/* Title & Organizer */}
        <div>
          <h1 className={`${fs('headerTitle')} font-black uppercase leading-tight tracking-tight break-words mb-4 text-white`}>
            {programName}
          </h1>
          <div className="flex items-center gap-2 text-lime-400/90 border-l-2 border-lime-400 pl-3">
              <p className={`${fs('subHeader')} font-bold uppercase tracking-wide opacity-90`}>
                {displayPenganjur}
              </p>
          </div>
        </div>
        
        {/* Info Grid - Refined for Scanning */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/10 mt-2">
            {/* Date Filter - DYNAMIC */}
            <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tarikh</span>
                <div className="relative">
                  {uniqueDates.length > 1 ? (
                    <>
                        <select 
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="bg-white/5 text-white border border-white/10 rounded-lg px-2 py-1.5 w-full text-sm font-medium appearance-none cursor-pointer hover:bg-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all pr-8 truncate"
                        >
                          <option value="SEMUA" className="text-dark bg-white">SEMUA TARIKH ({uniqueDates.length})</option>
                          {uniqueDates.map(d => (
                            <option key={d.label} value={d.label} className="text-dark bg-white">{d.label}</option>
                          ))}
                        </select>
                        <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </>
                  ) : (
                      <div className="flex items-center gap-2 text-white font-bold text-sm py-1.5">
                        <Calendar size={14} className="text-lime-500" />
                        {uniqueDates[0]?.label || '-'}
                      </div>
                  )}
                </div>
            </div>

            {/* Location Display - READ ONLY */}
            <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Lokasi (Auto)</span>
                <div className="relative">
                  <div className="flex items-center gap-2 text-white font-bold text-sm py-1.5 truncate">
                    <MapPin size={14} className="text-lime-500 shrink-0" />
                    <span className="truncate" title={displayedLocation}>{displayedLocation}</span>
                  </div>
                </div>
            </div>

            {/* Division Filter - DYNAMIC */}
            <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Bahagian</span>
                <div className="relative">
                  {uniqueBahagian.length > 1 ? (
                    <>
                      <select 
                        value={selectedBahagian}
                        onChange={(e) => setSelectedBahagian(e.target.value)}
                        className="bg-white/5 text-white border border-white/10 rounded-lg px-2 py-1.5 w-full text-sm font-medium appearance-none cursor-pointer hover:bg-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all pr-8 truncate"
                      >
                        <option value="SEMUA" className="text-dark bg-white">SEMUA BAHAGIAN ({uniqueBahagian.length})</option>
                        {uniqueBahagian.map(b => (
                          <option key={b} value={b} className="text-dark bg-white">{b}</option>
                        ))}
                      </select>
                      <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                    </>
                  ) : (
                      <div className="flex items-center gap-2 text-white font-bold text-sm py-1.5">
                        <Building2 size={14} className="text-lime-500" />
                        {uniqueBahagian[0] || '-'}
                      </div>
                  )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
