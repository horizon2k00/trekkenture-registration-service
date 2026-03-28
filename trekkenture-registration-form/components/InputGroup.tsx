import React from 'react';

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  label: string;
  as?: 'input' | 'select' | 'textarea';
  options?: string[]; // For select inputs
  error?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ 
  label, 
  as = 'input', 
  options, 
  className = '', 
  id,
  error,
  ...props 
}) => {
  // Styles configuration
  const baseClasses = "w-full rounded-md border px-3 py-2.5 text-sm transition-all shadow-sm focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500";
  
  // Normal state styles
  const defaultClasses = "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/10";
  
  // Error state styles
  // Updated: Red border only, keep background white and text standard
  const errorClasses = "border-rose-500 bg-white text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-rose-200";

  const inputClasses = `${baseClasses} ${error ? errorClasses : defaultClasses}`;
  
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Updated: Label keeps original color even on error */}
      <label htmlFor={id || props.name} className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-0.5">
        {label}
        {props.required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      
      {as === 'select' ? (
        <select
          id={id || props.name}
          className={`${inputClasses} cursor-pointer`}
          aria-invalid={!!error}
          {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          <option value="" disabled>Select...</option>
          {options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          id={id || props.name}
          className={`${inputClasses} min-h-[80px] leading-relaxed`}
          aria-invalid={!!error}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id || props.name}
          className={inputClasses}
          aria-invalid={!!error}
          {...props}
        />
      )}

      {error && (
        <p className="text-xs text-rose-600 font-medium ml-0.5 animate-pulse flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
};