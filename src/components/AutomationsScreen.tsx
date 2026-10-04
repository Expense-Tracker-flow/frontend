'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Plus, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Pencil, 
  Trash2, 
  Play, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Search,
  Check,
  CheckCheck,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { AutomationRule, Category } from '../lib/types';
import { AddAutomationModal } from './AddAutomationModal';

interface AutomationsScreenProps {
  rules: AutomationRule[];
  categories: Category[];
  currencySymbol: string;
  onSaveRule: (rule: AutomationRule) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onTriggerRule: (rule: AutomationRule) => void;
}

export const AutomationsScreen: React.FC<AutomationsScreenProps> = ({
  rules,
  categories,
  currencySymbol = '₹',
  onSaveRule,
  onDeleteRule,
  onToggleRule,
  onTriggerRule,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [recentlyAddedPreset, setRecentlyAddedPreset] = useState<string | null>(null);

  // Compute metrics
  const activeRules = rules.filter((r) => r.isActive);
  const totalAutomatedExpenses = activeRules
    .filter((r) => r.type === 'EXPENSE')
    .reduce((acc, r) => acc + r.amount, 0);

  const totalAutomatedIncome = activeRules
    .filter((r) => r.type === 'INCOME')
    .reduce((acc, r) => acc + r.amount, 0);

  const netAutomated = totalAutomatedIncome - totalAutomatedExpenses;
  const outflowRatio = totalAutomatedIncome > 0 
    ? Math.min(100, Math.round((totalAutomatedExpenses / totalAutomatedIncome) * 100))
    : totalAutomatedExpenses > 0 ? 100 : 0;

  // Preset templates
  const presets = [
    { title: 'House Rent', amount: 15000, type: 'EXPENSE' as const, dayOfMonth: 1, frequency: 'MONTHLY' as const, category: 'Housing & Bills', icon: '🏠' },
    { title: 'SIP Mutual Fund', amount: 5000, type: 'EXPENSE' as const, dayOfMonth: 5, frequency: 'MONTHLY' as const, category: 'Investments', icon: '📈' },
    { title: 'Electricity & WiFi', amount: 1200, type: 'EXPENSE' as const, dayOfMonth: 10, frequency: 'MONTHLY' as const, category: 'Housing & Bills', icon: '💡' },
    { title: 'Netflix & Spotify', amount: 649, type: 'EXPENSE' as const, dayOfMonth: 15, frequency: 'MONTHLY' as const, category: 'Entertainment', icon: '🎬' },
    { title: 'Gym & Fitness', amount: 2000, type: 'EXPENSE' as const, dayOfMonth: 20, frequency: 'MONTHLY' as const, category: 'Healthcare', icon: '🏋️' },
    { title: 'Monthly Salary', amount: 65000, type: 'INCOME' as const, dayOfMonth: 30, frequency: 'MONTHLY' as const, category: 'Salary & Inflows', icon: '💰' },
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    const matchedCat = categories.find((c) => c.name.toLowerCase().includes(preset.category.toLowerCase()));
    const today = new Date();
    let targetMonth = today.getMonth();
    let targetYear = today.getFullYear();
    if (today.getDate() > preset.dayOfMonth) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    const nextDate = new Date(targetYear, targetMonth, preset.dayOfMonth).toISOString().split('T')[0];

    const newRule: AutomationRule = {
      id: crypto.randomUUID(),
      title: preset.title,
      amount: preset.amount,
      type: preset.type,
      frequency: preset.frequency,
      dayOfMonth: preset.dayOfMonth,
      categoryId: matchedCat?.id,
      categoryName: matchedCat?.name || preset.category,
      paymentMethod: 'UPI',
      isActive: true,
      autoLog: true,
      nextExecutionDate: nextDate,
      createdAt: new Date().toISOString(),
    };
    onSaveRule(newRule);
    setRecentlyAddedPreset(preset.title);
    setTimeout(() => setRecentlyAddedPreset(null), 2500);
  };

  const handleOpenEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleTriggerWithFeedback = async (rule: AutomationRule) => {
    setRunningId(rule.id);
    try {
      await onTriggerRule(rule);
      setSuccessId(rule.id);
      setTimeout(() => setSuccessId(null), 2200);
    } finally {
      setRunningId(null);
    }
  };

  // Helper for days until next run
  const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return { text: 'Scheduled', isUrgent: false, isPending: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: 'Past Due', isUrgent: true, isPending: true };
    if (diffDays === 0) return { text: 'Due Today', isUrgent: true, isPending: false };
    if (diffDays === 1) return { text: 'Due Tomorrow', isUrgent: true, isPending: false };
    return { text: `In ${diffDays} days`, isUrgent: false, isPending: false };
  };

  // Current day and month for timeline
  const today = new Date();
  const todayDate = today.getDate();
  const currentMonthName = today.toLocaleDateString('en-US', { month: 'short' });
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate();

  // Map scheduled rules to days of month
  const scheduledDaysMap = useMemo(() => {
    const map = new Map<number, AutomationRule[]>();
    rules.forEach((r) => {
      if (r.frequency === 'MONTHLY' && r.dayOfMonth) {
        const existing = map.get(r.dayOfMonth) || [];
        existing.push(r);
        map.set(r.dayOfMonth, existing);
      }
    });
    return map;
  }, [rules]);

  // Sort upcoming rules by scheduled day
  const upcomingRules = useMemo(() => {
    return [...rules]
      .filter((r) => r.isActive)
      .sort((a, b) => {
        const dayA = a.dayOfMonth || 0;
        const dayB = b.dayOfMonth || 0;
        // prioritize days today or later this month, then next month
        const diffA = dayA >= todayDate ? dayA - todayDate : dayA - todayDate + 31;
        const diffB = dayB >= todayDate ? dayB - todayDate : dayB - todayDate + 31;
        return diffA - diffB;
      });
  }, [rules, todayDate]);

  // Filtered rules for the main list
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (filterType === 'EXPENSE' && rule.type !== 'EXPENSE') return false;
      if (filterType === 'INCOME' && rule.type !== 'INCOME') return false;
      if (filterType === 'ACTIVE' && !rule.isActive) return false;
      if (filterType === 'PAUSED' && rule.isActive) return false;

      if (selectedDayFilter !== null) {
        if (rule.dayOfMonth !== selectedDayFilter) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = rule.title.toLowerCase().includes(q);
        const matchCat = (rule.categoryName || '').toLowerCase().includes(q);
        const matchMethod = (rule.paymentMethod || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchMethod) return false;
      }
      return true;
    });
  }, [rules, filterType, search, selectedDayFilter]);

  return (
    <div className="space-y-6 text-foreground pb-12 max-w-6xl mx-auto">
      {/* 1. Header & Main Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono tracking-widest text-primary font-semibold uppercase flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-primary animate-pulse" />
              FINANCIAL AUTOPILOT
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-ping" />
              {activeRules.length} Active Rules
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-foreground">
            Automations & Recurring
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Automate monthly bills, SIPs, and salaries with instant execution and tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-primary/25 active:scale-[0.98] w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Automation</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric & Health Pulse Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Scheduled Outflows */}
        <div className="relative overflow-hidden bg-surface border border-surface-border/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-rose-500/30 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Scheduled Outflows
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight">
            {currencySymbol}{totalAutomatedExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>{activeRules.filter((r) => r.type === 'EXPENSE').length} recurring commitments</span>
            <span className="text-rose-500 font-semibold">Monthly Out</span>
          </div>
        </div>

        {/* Scheduled Inflows */}
        <div className="relative overflow-hidden bg-surface border border-surface-border/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Scheduled Inflows
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {currencySymbol}{totalAutomatedIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>{activeRules.filter((r) => r.type === 'INCOME').length} scheduled salaries & inflows</span>
            <span className="text-emerald-500 font-semibold">Monthly In</span>
          </div>
        </div>

        {/* Net Monthly Auto Pulse */}
        <div className="relative overflow-hidden bg-surface border border-surface-border/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-primary/40 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Net Monthly Auto Pulse
            </span>
            <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${netAutomated >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {netAutomated >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(netAutomated).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          
          {/* Cashflow Ratio Indicator */}
          <div className="mt-2.5 space-y-1">
            <div className="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden flex">
              <div 
                className="bg-rose-500 transition-all duration-500 rounded-l-full" 
                style={{ width: `${outflowRatio}%` }} 
              />
              <div 
                className="bg-emerald-500 transition-all duration-500 rounded-r-full" 
                style={{ width: `${100 - outflowRatio}%` }} 
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>{outflowRatio}% Outflow Commit</span>
              <span>{100 - outflowRatio}% Retained</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Upcoming Schedule & Monthly Horizon Strip (Replaces bulky 31-box sterile grid) */}
      <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Monthly Schedule Horizon
              </h3>
              <p className="text-[11px] text-zinc-400">
                {currentMonthName} {currentYear} • Click any day to filter scheduled cash flows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Inflow</span>
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Outflow</span>
            </span>
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>Today ({todayDate})</span>
            </span>
            {selectedDayFilter !== null && (
              <button
                onClick={() => setSelectedDayFilter(null)}
                className="ml-2 text-primary font-bold hover:underline"
              >
                Clear Day Filter
              </button>
            )}
          </div>
        </div>

        {/* Sleek 31-Day Timeline Bar */}
        <div className="relative">
          <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 lg:grid-cols-31 gap-1 overflow-x-auto pb-1 pt-0.5">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dayRules = scheduledDaysMap.get(day) || [];
              const isToday = day === todayDate;
              const isSelected = selectedDayFilter === day;
              const hasExpense = dayRules.some((r) => r.type === 'EXPENSE');
              const hasIncome = dayRules.some((r) => r.type === 'INCOME');
              const totalAmount = dayRules.reduce((acc, r) => acc + (r.type === 'INCOME' ? r.amount : -r.amount), 0);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDayFilter(isSelected ? null : day)}
                  className={`group relative flex flex-col items-center justify-between py-1.5 px-0.5 rounded-xl border transition-all min-w-[32px] h-12 ${
                    isSelected
                      ? 'border-primary bg-primary text-white shadow-md shadow-primary/20 scale-105 z-10'
                      : isToday
                      ? 'border-primary/80 bg-primary/10 text-primary font-bold ring-2 ring-primary/20'
                      : dayRules.length > 0
                      ? 'bg-surface-raised border-surface-border text-foreground font-semibold hover:border-primary/50 hover:bg-surface-raised/90'
                      : 'bg-surface-raised/20 border-surface-border/40 text-zinc-400 hover:border-surface-border hover:bg-surface-raised/40'
                  }`}
                  title={
                    dayRules.length > 0
                      ? `Day ${day}: ${dayRules.map((r) => `${r.title} (${r.type === 'INCOME' ? '+' : '-'}${currencySymbol}${r.amount})`).join(', ')}`
                      : `Day ${day}`
                  }
                >
                  <span className={`text-[10px] font-mono leading-none ${isSelected ? 'text-white font-bold' : ''}`}>
                    {day}
                  </span>
                  
                  {dayRules.length > 0 ? (
                    <div className="flex items-center space-x-0.5 mb-0.5">
                      {hasIncome && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                      )}
                      {hasExpense && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-rose-500'}`} />
                      )}
                    </div>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-transparent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Cash Flow Queue / Cards */}
        {upcomingRules.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Upcoming Queue
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Sorted by nearest due date
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {upcomingRules.slice(0, 3).map((rule) => {
                const countdown = getDaysUntil(rule.nextExecutionDate);
                const isIncome = rule.type === 'INCOME';

                return (
                  <div
                    key={rule.id}
                    className="p-3 rounded-xl bg-surface-raised/50 border border-surface-border hover:border-primary/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isIncome ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-foreground truncate">{rule.title}</div>
                        <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded font-semibold ${
                            countdown.isUrgent ? 'bg-amber-500/10 text-amber-500' : 'bg-surface-raised text-zinc-400'
                          }`}>
                            {countdown.text}
                          </span>
                          <span>•</span>
                          <span>Day {rule.dayOfMonth}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`font-mono font-bold text-xs ${isIncome ? 'text-emerald-500' : 'text-foreground'}`}>
                        {isIncome ? '+' : '-'}{currencySymbol}{rule.amount.toLocaleString('en-IN')}
                      </div>
                      <button
                        onClick={() => handleTriggerWithFeedback(rule)}
                        disabled={runningId === rule.id}
                        className="text-[9px] font-mono text-primary hover:underline flex items-center justify-end gap-1 mt-0.5 ml-auto"
                      >
                        {runningId === rule.id ? (
                          <Sparkles className="w-2.5 h-2.5 animate-spin" />
                        ) : successId === rule.id ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Executed
                          </span>
                        ) : (
                          <>
                            <Play className="w-2 h-2" /> Run Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Quick Setup Templates (Interactive & Premium) */}
      <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">
              Popular Automation Presets
            </h3>
            <p className="text-[11px] text-zinc-400">
              One-click setup for common recurring commitments
            </p>
          </div>
          <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full font-semibold">
            ⚡ 1-Click Fast Add
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {presets.map((preset, idx) => {
            const isJustAdded = recentlyAddedPreset === preset.title;
            const isIncome = preset.type === 'INCOME';

            return (
              <button
                key={idx}
                onClick={() => handleApplyPreset(preset)}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] group flex flex-col justify-between space-y-2 relative overflow-hidden ${
                  isJustAdded
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'bg-surface-raised hover:bg-surface-raised/80 border-surface-border hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base p-1 rounded-xl bg-surface border border-surface-border shadow-2xs">
                    {preset.icon}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-zinc-400 px-1.5 py-0.5 rounded bg-surface border border-surface-border">
                    {preset.dayOfMonth === 1 ? '1st' : preset.dayOfMonth === 2 ? '2nd' : preset.dayOfMonth === 3 ? '3rd' : `${preset.dayOfMonth}th`}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    {preset.title}
                  </div>
                  <div className={`font-mono text-[11px] font-semibold mt-0.5 ${isIncome ? 'text-emerald-500' : 'text-zinc-500'}`}>
                    {currencySymbol}{preset.amount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="pt-1 border-t border-surface-border/50 flex items-center justify-between text-[9px] font-mono">
                  <span className="text-zinc-400 truncate">{preset.category}</span>
                  <span className={`font-bold transition-transform ${isJustAdded ? 'text-emerald-500' : 'text-primary group-hover:translate-x-0.5'}`}>
                    {isJustAdded ? '✓ Added' : '+ Add'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Main Rules Engine List */}
      <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3.5">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Active Automation Rules</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-raised border border-surface-border text-zinc-400">
              {filteredRules.length} of {rules.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Filter Pills */}
            <div className="flex items-center bg-surface-raised border border-surface-border rounded-xl p-0.5 text-xs font-semibold">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-lg text-[11px] transition-all ${
                  filterType === 'ALL' ? 'bg-primary text-white shadow-sm' : 'text-zinc-400 hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('EXPENSE')}
                className={`px-3 py-1 rounded-lg text-[11px] transition-all ${
                  filterType === 'EXPENSE' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold' : 'text-zinc-400 hover:text-foreground'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setFilterType('INCOME')}
                className={`px-3 py-1 rounded-lg text-[11px] transition-all ${
                  filterType === 'INCOME' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-400 hover:text-foreground'
                }`}
              >
                Income
              </button>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rule or category..."
                className="w-full bg-surface-raised border border-surface-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* Rules Grid */}
        {filteredRules.length === 0 ? (
          <div className="py-12 sm:py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-surface-border flex items-center justify-center mx-auto text-zinc-400">
              <Zap className="w-6 h-6 opacity-40" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">No automations found</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {search || filterType !== 'ALL' || selectedDayFilter
                  ? 'Try clearing your filters or search keywords.'
                  : 'Start by creating a new recurring rule or using a quick preset above.'}
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all inline-flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Rule</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRules.map((rule) => {
              const executionSchedule =
                rule.frequency === 'MONTHLY'
                  ? `Every ${rule.dayOfMonth === 1 ? '1st' : rule.dayOfMonth === 2 ? '2nd' : rule.dayOfMonth === 3 ? '3rd' : `${rule.dayOfMonth}th`} of month`
                  : rule.frequency === 'WEEKLY'
                  ? `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][rule.dayOfWeek ?? 1]}`
                  : 'Daily recurring';

              const countdown = getDaysUntil(rule.nextExecutionDate);
              const isIncome = rule.type === 'INCOME';

              return (
                <div
                  key={rule.id}
                  className={`relative overflow-hidden rounded-2xl border transition-all p-4 flex flex-col justify-between space-y-3.5 ${
                    rule.isActive
                      ? 'bg-surface-raised/40 hover:bg-surface-raised/80 border-surface-border hover:border-surface-border/90 hover:shadow-sm'
                      : 'bg-surface-raised/10 border-surface-border/40 opacity-60'
                  }`}
                >
                  {/* Left Type Colored Accent Bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />

                  {/* Top Row: Title, Category Badges & Amount + Toggle */}
                  <div className="flex items-start justify-between gap-3 pl-1">
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {rule.title}
                          </h4>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                              rule.isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                            }`}
                          >
                            {rule.isActive ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400 font-mono flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-surface border border-surface-border text-foreground font-sans text-[10px]">
                            {rule.categoryName || 'General'}
                          </span>
                          <span>•</span>
                          <span>{rule.paymentMethod}</span>
                          {rule.autoLog && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-500 flex items-center gap-0.5">
                                <CheckCheck className="w-3 h-3" /> Auto-log
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Active Switch */}
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <div className="text-right">
                        <div
                          className={`font-mono font-black text-sm sm:text-base ${
                            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                          }`}
                        >
                          {isIncome ? '+' : '-'}{currencySymbol}{rule.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-zinc-400 font-mono uppercase tracking-wider">
                          {rule.frequency}
                        </div>
                      </div>

                      {/* Smooth Toggle Switch */}
                      <button
                        onClick={() => onToggleRule(rule.id)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative focus:outline-none ${
                          rule.isActive ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                        title={rule.isActive ? 'Pause automation' : 'Resume automation'}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            rule.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Cadence, Next Execution Countdown & Actions Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-surface-border/70 text-[11px] font-mono pl-1">
                    <div className="flex items-center space-x-2 text-zinc-500 flex-wrap">
                      <span className="flex items-center space-x-1 text-foreground font-semibold">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span>{executionSchedule}</span>
                      </span>
                      <span>•</span>
                      <span className={`flex items-center space-x-1 ${countdown.isUrgent ? 'text-amber-500 font-bold' : 'text-zinc-400'}`}>
                        <Clock className="w-3 h-3" />
                        <span>{countdown.text}</span>
                        {rule.nextExecutionDate && <span className="text-zinc-500">({rule.nextExecutionDate})</span>}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => handleTriggerWithFeedback(rule)}
                        disabled={runningId === rule.id}
                        className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
                          successId === rule.id
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 active:scale-95'
                        }`}
                        title="Trigger rule now"
                      >
                        {runningId === rule.id ? (
                          <Sparkles className="w-3 h-3 animate-spin" />
                        ) : successId === rule.id ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        <span>{successId === rule.id ? 'Executed!' : 'Run Now'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(rule)}
                        className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface border border-transparent hover:border-surface-border transition-all"
                        title="Edit Rule"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Rule Modal */}
      <AddAutomationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveRule}
        categories={categories}
        initialRule={editingRule}
      />
    </div>
  );
};
