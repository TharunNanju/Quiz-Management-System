import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

const baseStyles = 'inline-flex items-center justify-center rounded-lg font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

const variants = {
  primary: 'bg-brand text-white hover:bg-brand/90 focus-visible:outline-brand',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:outline-slate-500',
  ghost: 'bg-transparent text-slate-200 hover:bg-slate-800 focus-visible:outline-slate-500'
} as const;

const sizes = {
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
  sm: 'px-3 py-1.5 text-xs'
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  className,
  leftIcon,
  rightIcon,
  children,
  ...props
}: ButtonProps) => {
  return (
    <button className={clsx(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {leftIcon ? <span className="mr-2">{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span className="ml-2">{rightIcon}</span> : null}
    </button>
  );
};
