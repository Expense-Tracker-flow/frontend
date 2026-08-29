'use client';

import React, { useState, useMemo } from 'react';
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
  Check
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
  const [runningId, setRunningId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Compute metrics
  const activeRules = rules.filter((r) => r.isActive);
  const totalAutomatedExpenses = activeRules
    .filter((r) => r.type === 'EXPENSE')
    .reduce((acc, r) => acc + r.amount, 0);

  const totalAutomatedIncome = activeRules
    .filter((r) => r.type === 'INCOME')
    .reduce((acc, r) => acc + r.amount, 0);

  const netAutomated = totalAutomatedIncome - totalAutomatedExpenses;

  // Preset templates with compact styling
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
      setTimeout(() => setSuccessId(null), 2000);
    } finally {
      setRunningId(null);
    }
  };

  // Filter & Search rules
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (filterType === 'EXPENSE' && rule.type !== 'EXPENSE') return false;
      if (filterType === 'INCOME' && rule.type !== 'INCOME') return false;
      if (filterType === 'ACTIVE' && !rule.isActive) return false;
      if (filterType === 'PAUSED' && rule.isActive) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = rule.title.toLowerCase().includes(q);
        const matchCat = (rule.categoryName || '').toLowerCase().includes(q);
        const matchMethod = (rule.paymentMethod || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchMethod) return false;
      }
      return true;
    });
  }, [rules, filterType, search]);

  // Current day of month for the timeline tracker
  const todayDate = new Date().getDate();
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Map scheduled rules to days of month (1 to 31)
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

  // Helper for days until next run
  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1) return `In ${diffDays}d`;
    return 'Pending';
  };

  return (
    <div className="space-y-5 text-foreground pb-10 max-w-6xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
              Financial Autopilot
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Monitoring</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5 text-foreground">
            Automations & Recurring
          </h1>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-primary/25 active:scale-[0.99] w-full sm:w-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Automation</span>
        </button>
      </div>

      {/* 1. Compact Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Stat 1: Monthly Recurring Expense */}
        <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Scheduled Outflows
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-foreground tracking-tight">
            {currencySymbol}{totalAutomatedExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {activeRules.filter((r) => r.type === 'EXPENSE').length} active commitments
          </div>
        </div>

        {/* Stat 2: Monthly Recurring Income */}
        <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Scheduled Inflows
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-foreground tracking-tight">
            {currencySymbol}{totalAutomatedIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {activeRules.filter((r) => r.type === 'INCOME').length} scheduled salaries & inflows
          </div>
        </div>

        {/* Stat 3: Net Automated Cashflow */}
        <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Net Monthly Auto Pulse
            </span>
            <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${netAutomated >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {netAutomated >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(netAutomated).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {activeRules.length} of {rules.length} automations enabled
          </div>
        </div>
      </div>

      {/* 2. Compact 31-Day Timeline Schedule Visualizer */}
      <div className="bg-surface border border-surface-border rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-xs font-bold text-foreground">
              Schedule Timeline ({currentMonthName})
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-mono">
            <span className="flex items-center space-x-1 text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>In</span>
            </span>
            <span className="flex items-center space-x-1 text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Out</span>
            </span>
            <span className="flex items-center space-x-1 text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>Today ({todayDate})</span>
            </span>
          </div>
        </div>

        {/* 31-Day Row */}
        <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 lg:grid-cols-31 gap-1 pt-0.5 overflow-x-auto pb-0.5">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
            const dayRules = scheduledDaysMap.get(day) || [];
            const isToday = day === todayDate;
            const hasExpense = dayRules.some((r) => r.type === 'EXPENSE');
            const hasIncome = dayRules.some((r) => r.type === 'INCOME');

            return (
              <div
                key={day}
                className={`flex flex-col items-center justify-center p-1 rounded-lg border text-center transition-all min-w-[32px] h-9 ${
                  isToday
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : dayRules.length > 0
                    ? 'bg-surface-raised border-surface-border text-foreground font-semibold'
                    : 'bg-surface/40 border-surface-border/40 text-zinc-400 opacity-60'
                }`}
                title={
                  dayRules.length > 0
                    ? `Day ${day}: ${dayRules.map((r) => `${r.title} (${currencySymbol}${r.amount})`).join(', ')}`
                    : `Day ${day}`
                }
              >
                <span className="text-[10px] font-mono leading-none">{day}</span>
                {dayRules.length > 0 && (
                  <div className="flex items-center space-x-0.5 mt-0.5">
                    {hasIncome && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
                    {hasExpense && <span className="w-1 h-1 rounded-full bg-rose-500" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Compact 1-Click Quick Setup Templates */}
      <div className="bg-surface border border-surface-border rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground">Quick Setup Presets</h3>
          <span className="text-[10px] text-zinc-400 font-mono">1-click schedule</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset)}
              className="p-2.5 rounded-xl bg-surface-raised hover:bg-primary/10 border border-surface-border hover:border-primary/30 text-left transition-all active:scale-[0.98] group flex flex-col justify-between space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{preset.icon}</span>
                <span className="text-[9px] font-mono text-zinc-400">
                  {preset.dayOfMonth === 1 ? '1st' : `${preset.dayOfMonth}th`}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                  {preset.title}
                </div>
                <div className="font-mono text-[10px] text-zinc-500">
                  {currencySymbol}{preset.amount.toLocaleString('en-IN')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Active Rules List & Search/Filter Controls */}
      <div className="bg-surface border border-surface-border rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3.5">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-surface-border pb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">Active Automation Rules</h3>
            <p className="text-[10px] text-zinc-500 font-mono">
              {filteredRules.length} {filteredRules.length === 1 ? 'rule' : 'rules'} found
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center bg-surface-raised border border-surface-border rounded-xl p-0.5 text-xs font-semibold">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  filterType === 'ALL' ? 'bg-primary text-white shadow-sm' : 'text-zinc-400 hover:text-foreground'
                }`}
              >
                All ({rules.length})
              </button>
              <button
                onClick={() => setFilterType('EXPENSE')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  filterType === 'EXPENSE' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold' : 'text-zinc-400 hover:text-foreground'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setFilterType('INCOME')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  filterType === 'INCOME' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-400 hover:text-foreground'
                }`}
              >
                Income
              </button>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[150px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rule..."
                className="w-full bg-surface-raised border border-surface-border rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Compact Rules Grid */}
        {filteredRules.length === 0 ? (
          <div className="py-8 sm:py-12 text-center text-zinc-400 text-xs font-mono space-y-1.5">
            <Zap className="w-6 h-6 mx-auto text-zinc-500 opacity-40 mb-1" />
            <p>No automation rules found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredRules.map((rule) => {
              const executionSchedule =
                rule.frequency === 'MONTHLY'
                  ? `Every ${rule.dayOfMonth === 1 ? '1st' : rule.dayOfMonth === 2 ? '2nd' : rule.dayOfMonth === 3 ? '3rd' : `${rule.dayOfMonth}th`}`
                  : rule.frequency === 'WEEKLY'
                  ? `Every ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][rule.dayOfWeek ?? 1]}`
                  : 'Daily';

              const daysUntil = getDaysUntil(rule.nextExecutionDate);

              return (
                <div
                  key={rule.id}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    rule.isActive
                      ? 'bg-surface-raised/60 hover:bg-surface-raised border-surface-border'
                      : 'bg-surface-raised/20 border-surface-border/50 opacity-60'
                  }`}
                >
                  {/* Top Row: Icon, Title, Active Badge & Amount + Switch */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          rule.type === 'INCOME'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {rule.type === 'INCOME' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-foreground truncate">
                            {rule.title}
                          </span>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            rule.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'
                          }`}>
                            {rule.isActive ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono truncate">
                          {rule.categoryName || 'General'} • {rule.paymentMethod}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Active Switch */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="text-right">
                        <div className={`font-mono font-bold text-xs sm:text-sm ${rule.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                          {rule.type === 'INCOME' ? '+' : '-'}{currencySymbol}{rule.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[8px] text-zinc-400 font-mono uppercase">
                          {rule.frequency}
                        </div>
                      </div>

                      {/* Active Switch */}
                      <button
                        onClick={() => onToggleRule(rule.id)}
                        className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
                          rule.isActive ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                        title={rule.isActive ? 'Pause automation' : 'Resume automation'}
                      >
                        <div
                          className={`w-3 h-3 rounded-full bg-white transition-transform ${
                            rule.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Schedule Pill & Inline Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-surface-border/60 text-[10px] font-mono">
                    <div className="flex items-center space-x-2 text-zinc-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span className="font-semibold text-foreground">{executionSchedule}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1 text-zinc-400">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Next: {rule.nextExecutionDate} ({daysUntil})</span>
                      </span>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleTriggerWithFeedback(rule)}
                        disabled={runningId === rule.id}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center space-x-1 transition-all ${
                          successId === rule.id
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                        }`}
                        title="Run now"
                      >
                        {runningId === rule.id ? (
                          <Sparkles className="w-3 h-3 animate-spin" />
                        ) : successId === rule.id ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Play className="w-2.5 h-2.5" />
                        )}
                        <span>{successId === rule.id ? 'Logged' : 'Run'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(rule)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-foreground hover:bg-surface transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
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
