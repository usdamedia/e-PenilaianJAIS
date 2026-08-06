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
      bg-white text-[#171A18] border border-[#E6EAE7] shadow-xs hover:border-lime-300 hover:shadow-md
      ${className}
    `}>
      {highlight && (
        <div className="absolute top-0 right-0 w-20 h-20 bg-lime-400/10 rounded-bl-full pointer-events-none"></div>
      )}
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className={`
            p-2.5 rounded-xl flex items-center justify-center transition-colors shrink-0
            ${highlight ? 'bg-lime-100 text-lime-800' : 'bg-gray-100 text-gray-700 group-hover:bg-lime-100 group-hover:text-lime-800'}
          `}>
            {icon}
          </div>
          {trend && (
             <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-lime-100 text-lime-900 border border-lime-300/60 shrink-0">
               {trend}
             </span>
          )}
        </div>
        
        <div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-[#171A18] mb-1 tabular-nums">
            {value}
          </h3>
          <p className="text-xs sm:text-sm font-bold text-gray-700 leading-snug">
            {title}
          </p>
          {subtext && (
            <p className="text-[11px] font-medium text-gray-500 mt-1 leading-tight line-clamp-2">
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

