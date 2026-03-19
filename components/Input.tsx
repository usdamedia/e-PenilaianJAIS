
import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: React.ReactNode;
  uppercase?: boolean;
  fontSizeClass?: string;
  labelSizeClass?: string;
  suggestions?: string[]; // New Prop for Autocomplete
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  helperText, 
  uppercase, 
  fontSizeClass = 'text-base',
  labelSizeClass = 'text-sm',
  className = '', 
  suggestions,
  ...props 
}) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const helperTextId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  // Generate a unique ID for the datalist based on the input name
  const listId = suggestions && props.name ? `${props.name}-list` : undefined;

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-2">
        <label htmlFor={inputId} className={`block font-bold text-dark ${labelSizeClass}`}>
          {label} {props.required && <span className="text-lime-600">*</span>}
        </label>
        {helperText && (
          <span id={helperTextId} className={`text-gray-400 font-medium ${fontSizeClass === 'text-lg' ? 'text-xs' : 'text-[10px] sm:text-xs'}`}>
            {helperText}
          </span>
        )}
      </div>

      <input
        id={inputId}
        list={listId}
        aria-invalid={!!error}
        aria-describedby={`${helperText ? helperTextId : ''} ${error ? errorId : ''}`.trim() || undefined}
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

      {/* Render Datalist if suggestions are provided */}
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((item, index) => (
            <option key={index} value={item} />
          ))}
        </datalist>
      )}
      
      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-600 flex items-center gap-1 font-bold animate-pulse">
          ⚠ {error}
        </p>
      )}
    </div>
  );
};
