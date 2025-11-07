import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

const baseStyles = 'block w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-60';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className, ...props }: InputProps) => {
  return (
    <label className="flex w-full flex-col gap-1">
      {label ? <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span> : null}
      <input className={clsx(baseStyles, className, error && 'border-rose-500 ring-rose-500/50')} {...props} />
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </label>
  );
};
