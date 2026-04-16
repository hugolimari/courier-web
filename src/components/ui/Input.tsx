import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className={`flex flex-col mb-4 ${className}`}>
        <label className="mb-1 text-sm font-medium text-gray-300">
          {label}
        </label>
        <input
          ref={ref}
          className={`px-3 py-2 bg-surface-800 border ${
            error ? 'border-danger' : 'border-surface-600'
          } rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200`}
          {...props}
        />
        {error && <span className="mt-1 text-xs text-danger">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
