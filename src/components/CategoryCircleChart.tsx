'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoryBreakdown } from '../lib/types';
import { PieChart as PieIcon, BarChart2 } from 'lucide-react';

interface CategoryCircleChartProps {
  categories: CategoryBreakdown[];
  currencySymbol?: string;
  totalExpense?: number;
}

const PALETTE = [
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#06B6D4', // Cyan
  '#EAB308', // Yellow
];

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeDonutArc(
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const isFull = endAngle - startAngle >= 359.99;
  const effectiveEnd = isFull ? startAngle + 359.99 : endAngle;

  const startOuter = polarToCartesian(x, y, outerRadius, effectiveEnd);
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, startAngle);
  const endInner = polarToCartesian(x, y, innerRadius, effectiveEnd);

  const arcSweep = effectiveEnd - startAngle <= 180 ? '0' : '1';

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, arcSweep, 0, endOuter.x, endOuter.y,
    'L', startInner.x, startInner.y,
    'A', innerRadius, innerRadius, 0, arcSweep, 1, endInner.x, endInner.y,
    'Z',
  ].join(' ');
}

export const CategoryCircleChart: React.FC<CategoryCircleChartProps> = ({
  categories = [],
  currencySymbol = '₹',
  totalExpense = 0,
}) => {
  const [viewMode, setViewMode] = useState<'circle' | 'bars'>('circle');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalCalculated = useMemo(() => {
    if (totalExpense > 0) return totalExpense;
    return categories.reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [categories, totalExpense]);

  // Slices configuration for Donut Chart
  const slices = useMemo(() => {
    if (!categories.length || totalCalculated <= 0) return [];

    let currentAngle = 0;
    const GAP = categories.length > 1 ? 1.5 : 0; // Small degree gap between slices

    return categories.map((cat, idx) => {
      const percentage = (cat.amount / totalCalculated) * 100;
      const angleSpan = Math.max(0.5, (percentage / 100) * 360);
      const startAngle = currentAngle + (GAP / 2);
      const endAngle = currentAngle + angleSpan - (GAP / 2);
      currentAngle += angleSpan;

      const color = cat.color && cat.color !== '#6366F1' ? cat.color : PALETTE[idx % PALETTE.length];

      return {
        ...cat,
        color,
        percentage,
        startAngle,
        endAngle,
      };
    });
  }, [categories, totalCalculated]);

  const activeCategory = hoveredIdx !== null && slices[hoveredIdx] ? slices[hoveredIdx] : null;

  if (categories.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-zinc-400 font-mono">
        No categorized expenses recorded in this date range.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Toggle Switch & Category Count */}
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-semibold bg-surface-raised border border-surface-border text-zinc-500">
          {categories.length} Categories
        </span>

        {/* View Mode Toggle: Circle vs Bars */}
        <div className="flex items-center bg-surface-raised p-0.5 rounded-xl border border-surface-border">
          <button
            type="button"
            onClick={() => setViewMode('circle')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              viewMode === 'circle'
                ? 'bg-primary text-white shadow-xs'
                : 'text-zinc-500 hover:text-foreground'
            }`}
            title="Circle / Donut Chart"
          >
            <PieIcon className="w-3 h-3" />
            <span>Circle</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bars')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              viewMode === 'bars'
                ? 'bg-primary text-white shadow-xs'
                : 'text-zinc-500 hover:text-foreground'
            }`}
            title="Bar List Breakdown"
          >
            <BarChart2 className="w-3 h-3" />
            <span>Bars</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'circle' ? (
          <motion.div
            key="circle-view"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 pt-2"
          >
            {/* 1. SVG Donut Chart with Dynamic Center Text */}
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex-shrink-0 flex items-center justify-center">
              <svg
                viewBox="0 0 240 240"
                className="w-full h-full overflow-visible transition-transform duration-300 drop-shadow-xs"
              >
                {/* Background Ring */}
                <circle
                  cx="120"
                  cy="120"
                  r="78"
                  fill="none"
                  stroke="currentColor"
                  className="text-surface-raised dark:text-zinc-800/60"
                  strokeWidth="28"
                />

                {/* Slices */}
                {slices.map((slice, idx) => {
                  const isHovered = hoveredIdx === idx;
                  const innerR = isHovered ? 62 : 64;
                  const outerR = isHovered ? 96 : 92;
                  const path = describeDonutArc(120, 120, innerR, outerR, slice.startAngle, slice.endAngle);

                  return (
                    <path
                      key={idx}
                      d={path}
                      fill={slice.color}
                      className="transition-all duration-200 cursor-pointer"
                      style={{
                        opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                        filter: isHovered ? `drop-shadow(0 0 8px ${slice.color}80)` : 'none',
                      }}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  );
                })}
              </svg>

              {/* Center Donut Hole Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                {activeCategory ? (
                  <motion.div
                    key={`active-${activeCategory.name}`}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-0.5 max-w-[130px]"
                  >
                    <div className="text-[10px] uppercase font-mono font-bold text-zinc-400 truncate">
                      {activeCategory.name}
                    </div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-foreground leading-tight">
                      {currencySymbol}{activeCategory.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </div>
                    <div
                      className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full inline-block"
                      style={{ backgroundColor: `${activeCategory.color}20`, color: activeCategory.color }}
                    >
                      {activeCategory.percentage.toFixed(0)}% of spend
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-0.5 max-w-[130px]">
                    <div className="text-[10px] uppercase font-mono font-semibold text-zinc-400">
                      Total Spent
                    </div>
                    <div className="text-base sm:text-lg font-black font-mono text-foreground leading-tight">
                      {currencySymbol}{totalCalculated.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-[9px] text-zinc-400 font-mono">
                      {categories.length} Categories
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Interactive Category Legend Alongside */}
            <div className="w-full flex-1 max-h-56 overflow-y-auto pr-1 space-y-2 no-scrollbar">
              {slices.map((cat, idx) => {
                const isHovered = hoveredIdx === idx;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                      isHovered
                        ? 'bg-surface-raised border border-surface-border shadow-xs'
                        : 'hover:bg-surface-raised/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-200"
                        style={{
                          backgroundColor: cat.color,
                          transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                        }}
                      />
                      <span className={`text-xs truncate ${isHovered ? 'font-bold text-foreground' : 'text-zinc-600 dark:text-zinc-300'}`}>
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono flex-shrink-0 text-right">
                      <span className="text-xs font-semibold text-foreground">
                        {currencySymbol}{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${cat.color}15`,
                          color: cat.color,
                        }}
                      >
                        {cat.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* Detailed Progress Bars View */
          <motion.div
            key="bars-view"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 sm:space-y-3.5 pt-1"
          >
            {categories.map((cat, idx) => {
              const name = cat.name || (cat as any).categoryName || 'General';
              const amount = Number(cat.amount ?? (cat as any).totalAmount ?? 0);
              const percentage = Number(cat.percentage ?? 0);
              const color = cat.color && cat.color !== '#6366F1' ? cat.color : PALETTE[idx % PALETTE.length];

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-semibold text-foreground truncate">{name}</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono flex-shrink-0">
                      <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                        {currencySymbol}{amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </span>
                      <span className="text-zinc-400 text-[10px]">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 sm:h-2 rounded-full bg-surface-raised overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: color,
                        width: `${Math.min(100, Math.max(5, percentage))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
