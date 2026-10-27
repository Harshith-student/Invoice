import React from 'react';

const statusConfig = {
  draft: {
    label: 'Draft',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  sent: {
    label: 'Sent',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  viewed: {
    label: 'Viewed',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  paid: {
    label: 'Paid',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  overdue: {
    label: 'Overdue',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
};

export const StatusBadge = ({ status = 'draft', size = 'normal' }) => {
  const normalized = (status || 'draft').toLowerCase();
  const config = statusConfig[normalized] || statusConfig.draft;

  const sizeClasses = size === 'small' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-xs font-medium px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} capitalize transition-all`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
