
import React from 'react';
import { Shield } from 'lucide-react';

interface AdminLoadingScreenProps {
  countdown: number;
  score: number;
  shieldPos: { top: string; left: string };
  factIndex: number;
  facts: string[];
  moveShield: () => void;
}

export const AdminLoadingScreen: React.FC<AdminLoadingScreenProps> = ({
  countdown,
  score,
  shieldPos,
  factIndex,
  facts,
  moveShield
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-lime-400/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-lime-400/5 rounded-full blur-[120px]"></div>

      <div className="flex flex-col items-center gap-12 text-center px-6 relative z-10 max-w-2xl">
        {/* Main Content with Spinner */}
        <div className="space-y-8">
          <div className="relative inline-block">
            <div className="w-32 h-32 border-4 border-white/5 border-t-lime-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-20 h-20 bg-lime-400 rounded-3xl flex items-center justify-center text-dark shadow-glow animate-pulse">
                  <Shield size={40} strokeWidth={2.5} />
               </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-white font-black text-3xl tracking-tighter uppercase italic">
              Memproses Data <span className="text-lime-400">Pintar</span>
            </h2>
            <div className="h-1 w-24 bg-lime-400 mx-auto rounded-full"></div>
          </div>
        </div>

        {/* Timer Header */}
        <div className="bg-white/5 backdrop-blur-md p-8 rounded-[40px] border border-white/10 shadow-2xl">
          <p className="text-[12px] font-black text-lime-400 uppercase tracking-[0.4em] mb-4">Sila Tunggu Sebentar</p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
            <p className="text-7xl font-black text-white font-mono tracking-tighter">
              {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </p>
            <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
          </div>
          <p className="text-gray-500 font-bold text-xs mt-4 uppercase tracking-widest">Data sedang dimuatkan dari pelayan...</p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-lime-400 transition-all duration-1000 ease-linear"
            style={{ width: `${((180 - countdown) / 180) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
