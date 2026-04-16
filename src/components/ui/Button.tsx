import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'flex justify-center items-center py-2 px-4 rounded-md font-medium focus:outline-none transition-colors duration-200';
  
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-500 text-white disabled:bg-primary-800 disabled:text-gray-400',
    danger: 'bg-danger hover:bg-red-500 text-white disabled:bg-red-900 disabled:text-gray-400',
    outline: 'border border-surface-600 hover:bg-surface-800 text-white disabled:border-surface-700 disabled:text-gray-500',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${
        disabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner className="mr-2" /> : null}
      {children}
    </button>
  );
};
