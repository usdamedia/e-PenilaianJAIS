import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: React.ReactNode;
  uppercase?: boolean;
  fontSizeClass?: string;
  labelSizeClass?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  helperText, 
  uppercase, 
  fontSizeClass = 'text-base',
  labelSizeClass = 'text-sm',
  className = '', 
  ...props 
}) => {
  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-2">
        <label className={`block font-bold text-dark ${labelSizeClass}`}>
          {label} {props.required && <span className="text-lime-600">*</span>}
        </label>
        {helperText && (
          <span className={`text-gray-400 font-medium ${fontSizeClass === 'text-lg' ? 'text-xs' : 'text-[10px] sm:text-xs'}`}>
            {helperText}
          </span>
        )}
      </div>

      <input
        className={`
          w-full px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl transition-all duration-300
          text-dark bg-gray-50 border-2 border-transparent
          placeholder-gray-400 font-medium appearance-none
          focus:outline-none focus:bg-white focus:border-lime-400 focus:shadow-glow
          ${error ? 'bg-red-50 border-red-200' : 'hover:bg-gray-100'}
          ${uppercase ? 'uppercase' : ''}
          ${fontSizeClass}
          ${className}
        `}
        {...props}
      />
      
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-bold animate-pulse">
          ⚠ {error}
        </p>
      )}
    </div>
  );
};