
import React, { useState } from 'react';
import { 
  Server, Database, Shield, Activity, RefreshCw, 
  GitBranch, Code, Globe, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '../services/api';

interface SettingsProps {
  onRefresh: () => void;
  lastUpdated: Date;
}

export const Settings: React.FC<SettingsProps> = ({ onRefresh, lastUpdated }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('online');

  const checkConnection = async () => {
    setIsChecking(true);
    setApiStatus('checking');
    try {
      // Simple ping to the script (read mode)
      await fetch(`${GOOGLE_SCRIPT_URL}?action=read&token=JAIS_PenilaianProgram2026&_t=${new Date().getTime()}`);
      setApiStatus('online');
    } catch (e) {
      setApiStatus('offline');
    } finally {
      setTimeout(() => setIsChecking(false), 800);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#1A1C1E] to-[#2C3035] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime-400/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-2">Konfigurasi Sistem</h2>
            <p className="text-gray-400 font-medium max-w-xl">
              Pantau status sambungan, urus pangkalan data dan lihat maklumat versi aplikasi.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${apiStatus === 'online' ? 'bg-lime-400 shadow-[0_0_10px_#D0F240]' : 'bg-red-500'}`}></div>
             <span className="font-bold text-sm tracking-wide uppercase">
               {apiStatus === 'online' ? 'Sistem Online' : 'Sistem Offline'}
             </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1: Sambungan & Data */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-lime-50 text-lime-600 rounded-2xl flex items-center justify-center">
                 <Database size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-[#1A1C1E]">Pangkalan Data</h3>
                 <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Google Sheets & Apps Script</p>
              </div>
           </div>

           <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
                 <div className="flex items-center gap-3">
                    <Server size={18} className="text-gray-400"/>
                    <div className="flex flex-col">
                       <span className="font-bold text-dark text-sm">Endpoint API</span>
                       <span className="text-[10px] text-gray-400 font-mono">script.google.com/.../exec</span>
                    </div>
                 </div>
                 <button 
                   onClick={checkConnection}
                   disabled={isChecking}
                   className="text-xs font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:border-lime-500 hover:text-lime-600 transition-colors flex items-center gap-2"
                 >
                   {isChecking ? <RefreshCw size={12} className="animate-spin"/> : <Activity size={12}/>}
                   {isChecking ? 'Semak...' : 'Uji Sambungan'}
                 </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
                 <div className="flex items-center gap-3">
                    <RefreshCw size={18} className="text-gray-400"/>
                    <div className="flex flex-col">
                       <span className="font-bold text-dark text-sm">Kemaskini Terakhir</span>
                       <span className="text-[10px] text-gray-400 font-mono">
                         {lastUpdated.toLocaleTimeString('en-MY', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                       </span>
                    </div>
                 </div>
                 <button 
                    onClick={onRefresh}
                    className="text-xs font-bold bg-dark text-white px-3 py-1.5 rounded-lg hover:bg-black transition-colors shadow-lg shadow-gray-200"
                 >
                    Segerakkan Data
                 </button>
              </div>

              <div className="mt-4 p-4 bg-lime-50/50 rounded-xl border border-lime-100">
                 <div className="flex gap-3">
                    <AlertCircle size={18} className="text-lime-600 shrink-0 mt-0.5"/>
                    <div className="text-xs text-lime-900 leading-relaxed">
                       <span className="font-bold block mb-1">Nota Pentadbir:</span>
                       Data disimpan secara automatik di dalam Google Sheets. Sebarang perubahan struktur pada Google Sheets (seperti menukar nama lajur) boleh menjejaskan paparan dashboard.
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Card 2: Maklumat Aplikasi */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-2xl flex items-center justify-center">
                 <Shield size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-[#1A1C1E]">Maklumat Aplikasi</h3>
                 <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Versi & Pelesenan</p>
              </div>
           </div>

           <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                 <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><GitBranch size={16}/> Versi Semasa</span>
                 <span className="font-mono font-bold text-dark bg-gray-100 px-2 py-1 rounded text-xs">v1.2.0 (Stable)</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                 <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Code size={16}/> Framework</span>
                 <span className="font-bold text-dark text-sm">React + Vite + Tailwind</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                 <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Globe size={16}/> Persekitaran</span>
                 <span className="font-bold text-lime-600 text-sm flex items-center gap-1">
                    <CheckCircle2 size={14}/> Production
                 </span>
              </div>
           </div>

           <div className="mt-auto pt-6 text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                 Dibangunkan untuk Jabatan Agama Islam Sarawak
              </p>
              <p className="text-[10px] text-gray-300 mt-1">
                 &copy; {new Date().getFullYear()} Hak Cipta Terpelihara
              </p>
           </div>
        </div>

      </div>
    </div>
  );
};
