import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  'aria-label': ariaLabel,
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-stone-900 text-white hover:bg-stone-800 focus:ring-stone-500 active:bg-stone-950',
    secondary: 'bg-stone-100 text-stone-700 hover:bg-stone-200 focus:ring-stone-400 active:bg-stone-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 active:bg-emerald-800',
    outline: 'border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 focus:ring-stone-400 active:bg-stone-100',
    ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus:ring-stone-400',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const spinnerSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <Loader2 className={`${spinnerSizes[size]} animate-spin mr-2`} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
