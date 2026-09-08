
import React from 'react';

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
  // Generate a unique ID for the datalist based on the input name
  const listId = suggestions && props.name ? `${props.name}-list` : undefined;

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
        list={listId}
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

      {/* Render Mobile-friendly Suggestion Chips */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto touch-pan-y custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          {suggestions.slice(0, 8).map((item, index) => (
            <button
              key={index}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (props.onChange) {
                  const event = {
                    target: { name: props.name || '', value: uppercase ? item.toUpperCase() : item }
                  } as React.ChangeEvent<HTMLInputElement>;
                  props.onChange(event);
                }
              }}
              className="text-xs bg-white border border-gray-200 hover:border-lime-400 hover:bg-lime-50 text-gray-700 font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-2xs text-left truncate max-w-[220px] active:scale-95 touch-manipulation cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1 font-bold animate-pulse">
          ⚠ {error}
        </p>
      )}
    </div>
  );
};
