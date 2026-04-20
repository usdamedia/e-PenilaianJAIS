
import React from 'react';
import { RefreshCw, Shield, Clock, Database, HardDrive, Bell } from 'lucide-react';

interface SettingsProps {
  onRefresh: () => void;
  lastUpdated: string;
}

export const Settings: React.FC<SettingsProps> = ({ onRefresh, lastUpdated }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tight text-dark">Tetapan Sistem</h2>
        <p className="text-gray-500 font-medium">Urus konfigurasi dan penyelenggaraan data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Management */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-lime-100 text-lime-700 rounded-2xl">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-dark">Pengurusan Data</h3>
              <p className="text-xs text-gray-400 font-medium">Kemas kini pangkalan data live</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kemas Kini Terakhir</span>
                  <span className="text-sm font-bold text-dark">{lastUpdated}</span>
                </div>
              </div>
              <button 
                onClick={onRefresh}
                className="p-3 bg-white text-dark rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            <button className="w-full py-4 bg-dark text-white rounded-2xl font-bold text-sm shadow-lg shadow-gray-200 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
              <HardDrive size={18} className="text-lime-400" />
              Eksport Semua Data (CSV)
            </button>
          </div>
        </div>

        {/* Security & Access */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gray-100 text-dark rounded-2xl">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-dark">Keselamatan</h3>
              <p className="text-xs text-gray-400 font-medium">Akses dan kebenaran pentadbir</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-gray-400" />
                <span className="text-sm font-bold text-dark">Notifikasi Emel</span>
              </div>
              <div className="w-12 h-6 bg-lime-400 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>

            <button className="w-full py-4 bg-white text-red-600 border-2 border-red-50 rounded-2xl font-bold text-sm hover:bg-red-50 transition-all active:scale-95">
              Tukar Kata Laluan Pentadbir
            </button>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-[#1A1C1E] p-8 rounded-[32px] text-white overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-lime-400 rounded-full blur-[100px] opacity-10"></div>
        <div className="relative z-10">
          <h4 className="text-lime-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">Status Sistem</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-gray-500 text-[10px] font-bold uppercase mb-1">Versi</div>
              <div className="text-lg font-black">v2.4.0</div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px] font-bold uppercase mb-1">Status API</div>
              <div className="text-lg font-black text-lime-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                Aktif
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px] font-bold uppercase mb-1">Pelayan</div>
              <div className="text-lg font-black">JAIS-CLOUD-01</div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px] font-bold uppercase mb-1">Penyimpanan</div>
              <div className="text-lg font-black">84% Digunakan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
