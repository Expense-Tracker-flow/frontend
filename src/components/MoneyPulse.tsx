'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DailyTrend } from '../lib/types';
import { BarChart3, TrendingUp } from 'lucide-react';

interface MoneyPulseProps {
  data: DailyTrend[];
  currencySymbol?: string;
}

export const MoneyPulse: React.FC<MoneyPulseProps> = ({ data = [], currencySymbol = '₹' }) => {
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Generate a continuous multi-day timeline (minimum 7 days) so the chart always looks rich and filled
  const chartData = useMemo(() => {
    const dataMap = new Map<string, { income: number; expense: number }>();
    (data || []).forEach((d) => {
      const dateStr = d.date ? d.date.split('T')[0] : '';
      if (dateStr) {
        dataMap.set(dateStr, {
          income: Number(d.income ?? 0),
          expense: Number(d.expense ?? 0),
        });
      }
    });

    const now = new Date();
    const dateList: string[] = [];

    // Default window: last 7 days ending today
    const WINDOW_SIZE = 7;
    for (let i = WINDOW_SIZE - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dateList.push(d.toISOString().split('T')[0]);
    }

    // Merge any other recorded dates from backend that fall outside this window
    (data || []).forEach((item) => {
      const d = item.date ? item.date.split('T')[0] : '';
      if (d && !dateList.includes(d)) {
        dateList.push(d);
      }
    });

    dateList.sort();

    return dateList.map((dateStr) => {
      const match = dataMap.get(dateStr) || { income: 0, expense: 0 };
      const dObj = new Date(dateStr + 'T00:00:00');
      return {
        date: dateStr,
        dayLabel: dObj.toLocaleDateString('en-US', { weekday: 'short' }),
        shortDate: dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        income: match.income,
        expense: match.expense,
        net: match.income - match.expense,
      };
    });
  }, [data]);

  const totalPeriodIncome = useMemo(() => chartData.reduce((acc, d) => acc + d.income, 0), [chartData]);
  const totalPeriodExpense = useMemo(() => chartData.reduce((acc, d) => acc + d.expense, 0), [chartData]);

  const formatYAxis = (v: number) => {
    if (v >= 100000) return `${(v / 1000).toFixed(0)}k`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return `${v}`;
  };

  return (
    <div className="w-full space-y-3">
      {/* Chart Controls & Legend Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Period Totals Badge */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>+{currencySymbol}{totalPeriodIncome.toLocaleString('en-IN')}</span>
          </span>
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>-{currencySymbol}{totalPeriodExpense.toLocaleString('en-IN')}</span>
          </span>
        </div>

        {/* View Mode Switcher (Bar vs Smooth Curve) */}
        <div className="flex items-center bg-surface-raised border border-surface-border p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              chartType === 'bar'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-zinc-400 hover:text-foreground'
            }`}
            title="Bar Chart View"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bars</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('area')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              chartType === 'area'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-zinc-400 hover:text-foreground'
            }`}
            title="Spline Area View"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Area</span>
          </button>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="w-full h-56 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.06} />
              <XAxis
                dataKey="shortDate"
                stroke="#71717A"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                stroke="#71717A"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-surface border border-surface-border p-3 rounded-2xl shadow-xl text-xs space-y-1 font-mono">
                        <div className="text-foreground font-bold text-xs pb-1 border-b border-surface-border">
                          {d.dayLabel}, {d.shortDate}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>Income:</span>
                          <span>+{currencySymbol}{d.income.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400 font-semibold">
                          <span>Expense:</span>
                          <span>-{currencySymbol}{d.expense.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-zinc-500 pt-1 border-t border-surface-border text-[11px]">
                          <span>Net:</span>
                          <span className={d.net >= 0 ? 'text-primary font-bold' : 'text-rose-500 font-bold'}>
                            {d.net >= 0 ? '+' : ''}{currencySymbol}{d.net.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="income"
                name="Income"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="expense"
                name="Expense"
                fill="#EF4444"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pulseIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pulseExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.06} />
              <XAxis
                dataKey="shortDate"
                stroke="#71717A"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                stroke="#71717A"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-surface border border-surface-border p-3 rounded-2xl shadow-xl text-xs space-y-1 font-mono">
                        <div className="text-foreground font-bold text-xs pb-1 border-b border-surface-border">
                          {d.dayLabel}, {d.shortDate}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>Income:</span>
                          <span>+{currencySymbol}{d.income.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400 font-semibold">
                          <span>Expense:</span>
                          <span>-{currencySymbol}{d.expense.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-zinc-500 pt-1 border-t border-surface-border text-[11px]">
                          <span>Net:</span>
                          <span className={d.net >= 0 ? 'text-primary font-bold' : 'text-rose-500 font-bold'}>
                            {d.net >= 0 ? '+' : ''}{currencySymbol}{d.net.toLocaleString('en-IN')}
                          </span>
                        </div>
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
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#pulseIncomeGrad)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#EF4444"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#pulseExpenseGrad)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
