'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CategoryBreakdown } from '../lib/types';
import { Utensils, ShoppingBag, Receipt, Car, ShoppingCart, Film, Activity, Tag } from 'lucide-react';

interface MoneyOrbitProps {
  balance: number;
  spent: number;
  categories: CategoryBreakdown[];
  currencySymbol?: string;
  onSelectCategory?: (category: CategoryBreakdown) => void;
}

const ICON_MAP: Record<string, any> = {
  utensils: Utensils,
  'shopping-bag': ShoppingBag,
  receipt: Receipt,
  car: Car,
  'shopping-cart': ShoppingCart,
  film: Film,
  activity: Activity,
  default: Tag,
};

export const MoneyOrbit: React.FC<MoneyOrbitProps> = ({
  balance = 0,
  spent = 0,
  categories = [],
  currencySymbol = '₹',
  onSelectCategory,
}) => {
  const [radius, setRadius] = useState(125);

  useEffect(() => {
    const updateRadius = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 420) {
          setRadius(88);
        } else if (window.innerWidth < 640) {
          setRadius(105);
        } else {
          setRadius(125);
        }
      }
    };
    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  // Take top categories (up to 5) for clean orbit visualization
  const orbitCategories = (categories || []).slice(0, 5);

  // Position nodes radially around center
  const getCoordinates = (index: number, total: number, r: number) => {
    const angle = (index * (2 * Math.PI)) / (total || 1) - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    return { x, y };
  };

  return (
    <div className="relative w-full h-[320px] sm:h-[360px] flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl glass-card p-4 sm:p-6">
      {/* Background Orbital Rings */}
      <div 
        style={{ width: `${radius * 1.8}px`, height: `${radius * 1.8}px` }}
        className="absolute rounded-full border border-dashed border-zinc-800/80 animate-[spin_60s_linear_infinite]" 
      />
      <div 
        style={{ width: `${radius * 2.3}px`, height: `${radius * 2.3}px` }}
        className="absolute rounded-full border border-zinc-800/40" 
      />

      {/* Center Balance Core */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-surface-raised to-surface border border-surface-border shadow-2xl flex flex-col items-center justify-center p-2 sm:p-3 text-center glow-primary"
      >
        <div className="text-[9px] sm:text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Balance</div>
        <div className="text-base sm:text-xl font-bold font-mono tracking-tight text-white mt-0.5 truncate max-w-[95%]">
          {currencySymbol}
          {(balance ?? 0).toLocaleString('en-IN')}
        </div>
        <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 sm:mt-1">
          <span className="text-zinc-500">Spent: </span>
          <span className="text-rose-400 font-medium">
            {currencySymbol}
            {(spent ?? 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 sm:mt-1.5 animate-ping" />
      </motion.div>

      {/* Orbiting Category Nodes */}
      {orbitCategories.map((cat, index) => {
        const name = cat.name || (cat as any).categoryName || 'General';
        const amount = Number(cat.amount ?? (cat as any).totalAmount ?? 0);
        const percentage = Number(cat.percentage ?? 0);
        const color = cat.color || '#6366F1';
        const iconKey = cat.icon || 'default';

        const coords = getCoordinates(index, orbitCategories.length, radius);
        const Icon = ICON_MAP[iconKey] || ICON_MAP.default;
        const nodeSize = Math.min(Math.max(percentage * (radius < 100 ? 0.9 : 1.2), 36), radius < 100 ? 52 : 68);

        return (
          <motion.div
            key={name + index}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: coords.x, y: coords.y }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            whileHover={{ scale: 1.15 }}
            onClick={() => onSelectCategory?.(cat)}
            className="absolute z-20 flex flex-col items-center cursor-pointer group"
          >
            {/* Connected subtle line to core */}
            <svg
              className="absolute pointer-events-none -z-10"
              style={{
                width: Math.abs(coords.x) + 20,
                height: Math.abs(coords.y) + 20,
                left: coords.x < 0 ? coords.x : 0,
                top: coords.y < 0 ? coords.y : 0,
              }}
            >
              <line
                x1={coords.x < 0 ? Math.abs(coords.x) : 0}
                y1={coords.y < 0 ? Math.abs(coords.y) : 0}
                x2={coords.x < 0 ? 0 : coords.x}
                y2={coords.y < 0 ? 0 : coords.y}
                stroke="rgba(99, 102, 241, 0.15)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </svg>

            {/* Node Circle */}
            <div
              style={{
                width: `${nodeSize}px`,
                height: `${nodeSize}px`,
                backgroundColor: `${color}1A`,
                borderColor: color,
              }}
              className="rounded-full border-2 flex items-center justify-center shadow-lg transition-transform backdrop-blur-md"
            >
              <Icon
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors"
                style={{ color }}
              />
            </div>

            {/* Label Below Node */}
            <div className="mt-0.5 sm:mt-1 text-center whitespace-nowrap">
              <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-200 group-hover:text-white transition-colors block leading-tight max-w-[80px] sm:max-w-[110px] truncate">
                {name}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 group-hover:text-primary-300">
                {currencySymbol}
                {amount.toLocaleString('en-IN')}
              </span>
            </div>
          </motion.div>
        );
      })}

      {orbitCategories.length === 0 && (
        <div className="absolute bottom-3 sm:bottom-4 text-[11px] sm:text-xs text-zinc-500 font-mono text-center px-4">
          Orbit nodes appear automatically as you record expenses.
        </div>
      )}
    </div>
  );
};
