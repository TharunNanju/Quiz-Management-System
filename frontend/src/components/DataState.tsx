import type { ReactNode } from 'react';

export interface DataStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const DataState = ({ icon, title, description, actions }: DataStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-slate-300">
      {icon ? <div className="text-3xl text-brand">{icon}</div> : null}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description ? <p className="text-sm text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
    </div>
  );
};
