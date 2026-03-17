import React, { useId } from 'react';

interface RatingScaleProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  required?: boolean;
  fontSizeClass?: string;
  highlight?: boolean;
}

export const RatingScale: React.FC<RatingScaleProps> = ({ 
  label, 
  value, 
  onChange,
  required,
  fontSizeClass = 'text-base',
  highlight = false
}) => {
  const labelId = useId();

  return (
    <div className="mb-6 last:mb-0">
      <label id={labelId} className={`block font-bold text-dark mb-3 sm:mb-4 ${fontSizeClass}`}>
        {label} {required && <span aria-hidden="true" className="text-lime-600">*</span>}
      </label>
      
      <div
        className="flex items-center justify-between gap-2 sm:gap-3"
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {[0, 1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            role="radio"
            aria-checked={value === num}
            onClick={() => onChange(num)}
            className={`
              relative flex-1 aspect-square sm:min-w-[40px] rounded-xl sm:rounded-2xl flex items-center justify-center 
              text-lg md:text-xl font-bold transition-all duration-200
              ${value === num 
                ? 'bg-lime-400 text-black scale-105 shadow-glow z-10' 
                : 'bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-dark active:scale-95'
              }
            `}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};