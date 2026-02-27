
import React from 'react';
import { Menu, RefreshCw } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  onMenuClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  onMenuClick,
  onRefresh,
  isRefreshing
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 px-6 sm:px-10 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-gray-200/50">
      <div className="flex items-center gap-4">
        <button 
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 lg:hidden text-dark"
          onClick={onMenuClick}
        >
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-[26px] sm:text-[32px] leading-tight font-extrabold tracking-tight text-dark">
            {title}
          </h1>
          <p className="text-[13px] leading-normal font-medium text-gray-500 mt-1">
            {subtitle}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 self-end sm:self-auto">
         <button 
            onClick={onRefresh}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 hover:border-lime-400 hover:bg-lime-50 transition-all text-xs font-bold text-gray-600 shadow-sm active:scale-95 group"
         >
            <RefreshCw size={14} className={`${isRefreshing ? 'animate-spin' : ''} text-lime-600`} />
            <span className="hidden sm:inline">Kemaskini</span>
         </button>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 shadow-lg shadow-lime-400/20 flex items-center justify-center text-white font-bold text-xs border-2 border-white">
          AD
        </div>
      </div>
    </header>
  );
};
