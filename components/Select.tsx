import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
  placeholder?: string;
  error?: string;
  fontSizeClass?: string;
  labelSizeClass?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  options, 
  placeholder = "Sila Pilih", 
  error,
  fontSizeClass = 'text-base',
  labelSizeClass = 'text-sm',
  id,
  ...props 
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className="w-full">
      <label htmlFor={selectId} className={`block font-bold text-dark mb-2 ${labelSizeClass}`}>
        {label} {props.required && <span aria-hidden="true" className="text-lime-600">*</span>}
      </label>
      <div className="relative group">
        <select
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full px-5 py-3.5 pr-10 sm:px-6 sm:py-4 sm:pr-12 rounded-2xl appearance-none transition-all duration-300
            text-dark bg-gray-50 border-2 border-transparent font-medium cursor-pointer
            focus:outline-none focus:bg-white focus:border-lime-400 focus:shadow-glow
            ${error ? 'bg-red-50 border-red-200' : 'hover:bg-gray-100'}
            ${fontSizeClass}
          `}
          {...props}
        >
          <option value="" disabled className="text-gray-400">{placeholder}</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt} className="text-dark py-2">
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 sm:px-5 pointer-events-none text-gray-400 group-hover:text-dark transition-colors">
          <ChevronDown size={20} strokeWidth={2.5} />
        </div>
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-600 font-bold" role="alert">⚠ {error}</p>
      )}
    </div>
  );
};