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
      relative overflow-hidden p-5 rounded-2xl transition-all duration-200 group flex flex-col justify-between
      bg-white text-[#1C1C1E] border border-black/[0.06] shadow-ios-card hover:shadow-ios hover:-translate-y-0.5
      ${className}
    `}>
      {highlight && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-lime-400/10 rounded-bl-full pointer-events-none"></div>
      )}
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0
            ${highlight ? 'bg-lime-100 text-lime-800' : 'bg-[#F2F2F7] text-[#1C1C1E] group-hover:bg-lime-100 group-hover:text-lime-800'}
          `}>
            {icon}
          </div>
          {trend && (
             <span className="text-[10px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full bg-lime-100 text-lime-900 border border-lime-300/40 shrink-0">
               {trend}
             </span>
          )}
        </div>
        
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1C1E] mb-1 tabular-nums">
            {value}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-gray-600 leading-snug">
            {title}
          </p>
          {subtext && (
            <p className="text-[11px] font-medium text-gray-400 mt-1 leading-tight line-clamp-2">
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

