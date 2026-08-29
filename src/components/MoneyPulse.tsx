'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { DailyTrend } from '../lib/types';

interface MoneyPulseProps {
  data: DailyTrend[];
  currencySymbol?: string;
}

export const MoneyPulse: React.FC<MoneyPulseProps> = ({ data = [], currencySymbol = '₹' }) => {
  // Format dates for the X-axis
  const formattedData = (data || []).map((d) => ({
    ...d,
    day: new Date(d.date).getDate(),
    formattedDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  if (formattedData.length === 0) {
    return (
      <div className="w-full h-44 flex flex-col items-center justify-center rounded-2xl glass-card text-zinc-500 text-xs font-mono">
        <span>No pulse data available for this period.</span>
        <span className="text-[11px] text-zinc-600 mt-1">Transactions will plot your daily velocity.</span>
      </div>
    );
  }

  return (
    <div className="w-full h-48 rounded-2xl glass-card p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
        <span className="font-mono uppercase tracking-wider text-[11px] text-zinc-400">Cashflow Pulse</span>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Income</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Expense</span>
          </span>
        </div>
      </div>

      <div className="w-full h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              stroke="#52525B"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#52525B"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const curr = payload[0].payload;
                  return (
                    <div className="bg-surface-raised border border-surface-border p-2.5 rounded-lg shadow-xl text-xs font-mono">
                      <p className="text-zinc-400 mb-1">{curr.formattedDate}</p>
                      <p className="text-emerald-400">
                        + {currencySymbol}{Number(curr.income ?? 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-rose-400">
                        - {currencySymbol}{Number(curr.expense ?? 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#incomeGrad)"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#EF4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#expenseGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
