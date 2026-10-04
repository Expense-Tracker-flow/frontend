'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoryBreakdown } from '../lib/types';
import { 
  Utensils, 
  ShoppingBag, 
  Receipt, 
  Car, 
  ShoppingCart, 
  Film, 
  Activity, 
  Tag,
  Play,
  Pause,
  RotateCw,
  RotateCcw,
  Sparkles,
  X
} from 'lucide-react';

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
  const [radius, setRadius] = useState(175);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClockwise, setIsClockwise] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [inspectedCategory, setInspectedCategory] = useState<CategoryBreakdown | null>(null);
  const [pinnedCategory, setPinnedCategory] = useState<CategoryBreakdown | null>(null);

  useEffect(() => {
    const updateRadius = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 480) {
          setRadius(140);
        } else if (window.innerWidth < 768) {
          setRadius(165);
        } else {
          setRadius(190);
        }
      }
    };
    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  // Filter top categories (up to 6)
  const orbitCategories = useMemo(() => {
    return (categories || []).slice(0, 6);
  }, [categories]);

  // Total spend across all categories for dynamic weight calculation
  const totalCategorySpend = useMemo(() => {
    return orbitCategories.reduce((acc, cat) => {
      const amt = Number(cat.amount ?? (cat as any).totalAmount ?? 0);
      return acc + amt;
    }, 0) || spent || 1;
  }, [orbitCategories, spent]);

  // Position nodes radially around center
  const getCoordinates = (index: number, total: number, r: number) => {
    const angle = (index * (2 * Math.PI)) / (total || 1) - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    return { x, y };
  };

  const isSpinning = !isPaused && !isHovered && !pinnedCategory;
  const activeFocus = pinnedCategory || inspectedCategory;

  // Base rotation duration modified by speed multiplier (base 28s)
  const animDuration = Math.round(28 / speedMultiplier);

  const handleToggleSpeed = () => {
    if (speedMultiplier === 1) setSpeedMultiplier(2);
    else if (speedMultiplier === 2) setSpeedMultiplier(0.5);
    else setSpeedMultiplier(1);
  };

  return (
    <div 
      className="relative w-full h-[420px] sm:h-[470px] flex items-center justify-center overflow-hidden rounded-3xl bg-transparent p-4 sm:p-6 transition-colors select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setInspectedCategory(null);
      }}
    >
      {/* Simulation Controls Bar (Top Toolbar) */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-1.5 bg-surface/90 backdrop-blur-md border border-surface-border px-2.5 py-1 rounded-full text-[10px] font-mono shadow-xs">
        {/* Speed Multiplier */}
        <button
          onClick={handleToggleSpeed}
          className="px-1.5 py-0.5 rounded text-zinc-500 hover:text-foreground font-bold hover:bg-surface-raised transition-colors"
          title="Toggle Revolution Speed"
        >
          {speedMultiplier}x
        </button>

        <span className="text-zinc-300 dark:text-zinc-700">|</span>

        {/* Direction Switch */}
        <button
          onClick={() => setIsClockwise(!isClockwise)}
          className="p-1 rounded text-zinc-500 hover:text-foreground hover:bg-surface-raised transition-colors"
          title={isClockwise ? 'Switch to Counter-Clockwise' : 'Switch to Clockwise'}
        >
          {isClockwise ? <RotateCw className="w-2.5 h-2.5 text-primary" /> : <RotateCcw className="w-2.5 h-2.5 text-primary" />}
        </button>

        <span className="text-zinc-300 dark:text-zinc-700">|</span>

        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex items-center space-x-1 text-zinc-500 hover:text-foreground transition-colors pl-0.5"
          title={isPaused ? 'Resume Orbit Revolution' : 'Pause Orbit Revolution'}
        >
          {isPaused ? (
            <>
              <Play className="w-2.5 h-2.5 text-primary" />
              <span>Resume</span>
            </>
          ) : (
            <>
              <Pause className="w-2.5 h-2.5 text-zinc-400" />
              <span className="text-foreground font-semibold">Active</span>
            </>
          )}
        </button>
      </div>

      {/* Outer Faint Celestial Guide Ring */}
      <div 
        style={{ width: `${radius * 2 + 60}px`, height: `${radius * 2 + 60}px` }}
        className="absolute rounded-full border border-surface-border/40 pointer-events-none opacity-40" 
      />

      {/* Primary Orbit Track Ring */}
      <div 
        style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
        className="absolute rounded-full border border-dashed border-primary/30 pointer-events-none transition-all duration-300" 
      />

      {/* Inner Subtle Depth Ring */}
      <div 
        style={{ width: `${radius * 2 - 60}px`, height: `${radius * 2 - 60}px` }}
        className="absolute rounded-full border border-surface-border/30 pointer-events-none opacity-30" 
      />

      {/* Orbit Comet Tracer (Traveling light point on the ring) */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: `${radius * 2}px`,
          height: `${radius * 2}px`,
          animation: 'orbit-spin 12s linear infinite',
          animationDirection: isClockwise ? 'normal' : 'reverse',
          animationPlayState: isSpinning ? 'running' : 'paused',
        }}
      >
        <div 
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(99,102,241,0.9)]"
        />
        <div 
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-gradient-to-r from-transparent via-primary/30 to-primary/80 blur-[2px]"
        />
      </div>

      {/* ============================================================== */}
      {/* 🌟 DYNAMIC PULSING EFFECT AROUND CENTER CORE                   */}
      {/* ============================================================== */}
      
      {/* Pulse Ripple 1 (Continuous Radar Wave matched to central hub) */}
      <div 
        className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-primary/35 pointer-events-none animate-radar-pulse"
      />

      {/* Pulse Ripple 2 (Staggered Wave) */}
      <div 
        className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-primary/20 pointer-events-none animate-radar-pulse-delayed"
      />

      {/* Ambient Breathing Glow Aura Behind Hub */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.35, 0.65, 0.35],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-primary/10 blur-xl pointer-events-none"
      />

      {/* ============================================================== */}
      {/* 🪐 REVOLVING ORBIT NODES CONTAINER                             */}
      {/* ============================================================== */}
      <div
        className="absolute flex items-center justify-center pointer-events-none z-20"
        style={{
          width: '0px',
          height: '0px',
          animation: `orbit-spin ${animDuration}s linear infinite`,
          animationDirection: isClockwise ? 'normal' : 'reverse',
          animationPlayState: isSpinning ? 'running' : 'paused',
        }}
      >
        {orbitCategories.map((cat, index) => {
          const name = cat.name || (cat as any).categoryName || 'General';
          const amount = Number(cat.amount ?? (cat as any).totalAmount ?? 0);
          const color = cat.color || '#6366F1';
          const iconKey = cat.icon || 'default';
          const spendShare = totalCategorySpend > 0 ? (amount / totalCategorySpend) : 0;
          const percentage = cat.percentage ?? Math.round(spendShare * 100);

          const coords = getCoordinates(index, orbitCategories.length, radius);
          const Icon = ICON_MAP[iconKey] || ICON_MAP.default;
          const isSelected = pinnedCategory?.name === name || inspectedCategory?.name === name;

          return (
            <div
              key={name + index}
              style={{
                position: 'absolute',
                left: `${coords.x}px`,
                top: `${coords.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="pointer-events-auto"
            >
              {/* Counter-rotation keeps pill upright regardless of orbit speed/direction */}
              <div
                style={{
                  animation: `orbit-counter-spin ${animDuration}s linear infinite`,
                  animationDirection: isClockwise ? 'normal' : 'reverse',
                  animationPlayState: isSpinning ? 'running' : 'paused',
                }}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => setInspectedCategory(cat)}
                  onClick={() => {
                    if (pinnedCategory?.name === name) {
                      setPinnedCategory(null);
                    } else {
                      setPinnedCategory(cat);
                    }
                    onSelectCategory?.(cat);
                  }}
                  className="cursor-pointer group relative"
                >
                  {/* Category Pill with gravitational weight glow */}
                  <div 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border transition-all whitespace-nowrap ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 shadow-md'
                        : 'border-surface-border shadow-xs hover:border-primary/50 hover:shadow-sm'
                    }`}
                    style={{
                      boxShadow: isSelected
                        ? `0 6px 20px -2px ${color}45, 0 0 0 1px ${color}70`
                        : undefined
                    }}
                  >
                    {/* Category Icon Badge */}
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>

                    {/* Category Details */}
                    <div className="flex flex-col text-left pr-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-foreground leading-tight max-w-[85px] truncate">
                          {name}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400 font-normal">
                          {percentage}%
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
                        {currencySymbol}{amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 🎯 CENTER GRAVITY LENS (Spacious 176-192px Hub, NEVER Truncated) */}
      {/* ============================================================== */}
      <motion.div
        animate={{
          scale: [1, 1.015, 1],
        }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        onClick={() => {
          if (pinnedCategory) {
            setPinnedCategory(null);
          }
        }}
        className="relative z-10 w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-surface border border-surface-border shadow-lg flex flex-col items-center justify-center p-3 text-center select-none group hover:border-primary/40 transition-all"
        title={pinnedCategory ? 'Click to reset to Balance' : 'Current Balance'}
      >
        <AnimatePresence mode="wait">
          {activeFocus ? (
            /* Category Gravity Inspection View */
            <motion.div
              key="category-focus"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center w-full px-2"
            >
              <div className="flex items-center space-x-1 mb-1">
                <span 
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: activeFocus.color || '#6366F1' }}
                />
                <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-foreground truncate max-w-[120px]">
                  {activeFocus.name || (activeFocus as any).categoryName}
                </span>
                {pinnedCategory && (
                  <X className="w-2.5 h-2.5 text-zinc-400 hover:text-rose-500" />
                )}
              </div>

              {/* Category Amount: Crisp and Completely Unclipped */}
              <div 
                className="font-extrabold tracking-tight text-foreground whitespace-nowrap text-base sm:text-lg my-1 leading-none"
                style={{ color: activeFocus.color || undefined, textOverflow: 'clip' }}
              >
                {currencySymbol}
                {Number(activeFocus.amount ?? (activeFocus as any).totalAmount ?? 0).toLocaleString('en-IN')}
              </div>

              {/* Spend Share Badge */}
              <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                <span className="font-bold text-foreground">
                  {activeFocus.percentage ?? Math.round(((Number(activeFocus.amount ?? 0)) / totalCategorySpend) * 100)}%
                </span>
                <span> of spend</span>
              </div>

              <div className="text-[9px] font-mono text-primary font-medium mt-1">
                {pinnedCategory ? 'Click center to reset' : 'Hover inspection'}
              </div>
            </motion.div>
          ) : (
            /* Default Clean Balance View */
            <motion.div
              key="balance-default"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center w-full px-2"
            >
              <div className="flex items-center space-x-1.5 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-bold">
                  Balance
                </span>
              </div>
              
              {/* Formatted Number - Full Amount, Crisp Proportions, Zero Ellipsis Guaranteed */}
              <div 
                className="font-extrabold text-foreground my-1.5 whitespace-nowrap overflow-visible leading-none tracking-tight text-base sm:text-lg"
                style={{ textOverflow: 'clip' }}
              >
                {currencySymbol}{(balance ?? 0).toLocaleString('en-IN')}
              </div>

              {/* Spent Stat */}
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1 whitespace-nowrap mt-1">
                <span>Spent</span>
                <span className="text-rose-500 font-bold">{currencySymbol}{(spent ?? 0).toLocaleString('en-IN')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Empty State / Helpful Guidance */}
      {orbitCategories.length === 0 && (
        <div className="absolute bottom-3 text-[11px] font-mono text-zinc-400 text-center px-4">
          Recorded categories will float here automatically
        </div>
      )}
    </div>
  );
};
