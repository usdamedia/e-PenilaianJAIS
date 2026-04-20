import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  subtext?: string;
  className?: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  subtext, 
  className = '',
  highlight = false 
}) => {
  return (
    <div className={`
      relative overflow-hidden p-5 sm:p-6 rounded-3xl transition-all duration-300 group
      ${highlight 
        ? 'bg-dark text-white shadow-xl shadow-lime-400/20' 
        : 'bg-white text-dark shadow-sm border border-gray-100 hover:shadow-md'
      } 
      ${className}
    `}>
      {highlight && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-lime-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
      )}
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className={`
            p-3 rounded-2xl flex items-center justify-center transition-colors
            ${highlight ? 'bg-white/10 text-lime-400' : 'bg-gray-50 text-dark group-hover:bg-lime-50 group-hover:text-lime-700'}
          `}>
            {icon}
          </div>
          {trend && (
             <span className={`
               text-xs font-bold px-2.5 py-1 rounded-full
               ${highlight ? 'bg-lime-400 text-black' : 'bg-lime-100 text-lime-800'}
             `}>
               {trend}
             </span>
          )}
        </div>
        
        <div>
          <h3 className={`
            font-extrabold tracking-tight mb-1
            ${typeof value === 'string' && value.length > 15 ? 'text-lg sm:text-xl' : 'text-3xl sm:text-4xl'}
          `}>
            {value}
          </h3>
          <p className={`text-sm font-semibold ${highlight ? 'text-gray-400' : 'text-gray-500'}`}>
            {title}
          </p>
          {subtext && (
            <p className={`text-xs mt-1 ${highlight ? 'text-gray-500' : 'text-gray-400'}`}>
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
