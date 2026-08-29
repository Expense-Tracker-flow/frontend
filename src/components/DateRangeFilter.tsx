'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onResetToCurrentMonth?: () => void;
  onPresetSelect?: (preset: 'THIS_MONTH' | 'LAST_30' | 'THIS_YEAR' | 'ALL') => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  onResetToCurrentMonth,
  onPresetSelect,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-surface border border-surface-border p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl shadow-sm text-xs w-full sm:w-auto">
      {/* Date Pickers Container */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between">
        {/* From Date */}
        <div className="flex-1 sm:flex-initial flex items-center space-x-1.5 bg-surface-raised border border-surface-border px-2.5 py-1.5 rounded-xl min-w-0">
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase font-mono text-zinc-400">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromChange(e.target.value)}
            className="bg-transparent text-[11px] sm:text-xs font-mono text-foreground focus:outline-none cursor-pointer w-full"
          />
        </div>

        {/* To Date */}
        <div className="flex-1 sm:flex-initial flex items-center space-x-1.5 bg-surface-raised border border-surface-border px-2.5 py-1.5 rounded-xl min-w-0">
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase font-mono text-zinc-400">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToChange(e.target.value)}
            className="bg-transparent text-[11px] sm:text-xs font-mono text-foreground focus:outline-none cursor-pointer w-full"
          />
        </div>

        {/* Reset */}
        {onResetToCurrentMonth && (
          <button
            type="button"
            onClick={onResetToCurrentMonth}
            title="Reset to Current Month"
            className="p-2 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Presets */}
      {onPresetSelect && (
        <div className="flex items-center space-x-1 pt-1.5 sm:pt-0 sm:pl-2 border-t sm:border-t-0 sm:border-l border-surface-border overflow-x-auto">
          <button
            type="button"
            onClick={() => onPresetSelect('THIS_MONTH')}
            className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors whitespace-nowrap"
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => onPresetSelect('LAST_30')}
            className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors whitespace-nowrap"
          >
            30 Days
          </button>
          <button
            type="button"
            onClick={() => onPresetSelect('ALL')}
            className="px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors whitespace-nowrap"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
};
