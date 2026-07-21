import React from 'react';

interface KpiCardProps {
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
  title: string;
  value: string;
}

export function KpiCard({ icon, iconBgClass, iconColorClass, title, value }: KpiCardProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 ${iconBgClass} ${iconColorClass} rounded-xl`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-black text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
