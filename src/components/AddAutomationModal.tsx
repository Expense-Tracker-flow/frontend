'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowDownRight, ArrowUpRight, Check, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { Category, PaymentMethod, TransactionType, AutomationRule, AutomationFrequency } from '../lib/types';

interface AddAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: AutomationRule) => void;
  categories: Category[];
  initialRule?: AutomationRule | null;
}

export const AddAutomationModal: React.FC<AddAutomationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  initialRule,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [frequency, setFrequency] = useState<AutomationFrequency>('MONTHLY');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // 1 = Monday
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [autoLog, setAutoLog] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialRule) {
        setTitle(initialRule.title);
        setAmount(String(initialRule.amount));
        setType(initialRule.type);
        setFrequency(initialRule.frequency);
        setDayOfMonth(initialRule.dayOfMonth ?? 1);
        setDayOfWeek(initialRule.dayOfWeek ?? 1);
        setCategoryId(initialRule.categoryId);
        setPaymentMethod(initialRule.paymentMethod);
        setAutoLog(initialRule.autoLog);
        setNotes(initialRule.notes ?? '');
      } else {
        setTitle('');
        setAmount('');
        setType('EXPENSE');
        setFrequency('MONTHLY');
        setDayOfMonth(1);
        setDayOfWeek(1);
        setCategoryId(undefined);
        setPaymentMethod('UPI');
        setAutoLog(true);
        setNotes('');
      }
    }
  }, [isOpen, initialRule]);

  if (!isOpen) return null;

  // Quick day preset chips
  const quickDays = [1, 5, 10, 15, 20, 25, 30];

  // Compute next execution date given frequency and chosen day
  const calculateNextDate = (freq: AutomationFrequency, dMonth: number, dWeek: number): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    if (freq === 'MONTHLY') {
      let targetMonth = month;
      let targetYear = year;
      if (date > dMonth) {
        targetMonth += 1;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear += 1;
        }
      }
      const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const safeDay = Math.min(dMonth, daysInTargetMonth);
      const nextD = new Date(targetYear, targetMonth, safeDay);
      return nextD.toISOString().split('T')[0];
    }

    if (freq === 'WEEKLY') {
      const currentDay = today.getDay();
      let diff = dWeek - currentDay;
      if (diff <= 0) diff += 7;
      const nextD = new Date(today.getTime() + diff * 86400000);
      return nextD.toISOString().split('T')[0];
    }

    // Daily
    const nextD = new Date(today.getTime() + 86400000);
    return nextD.toISOString().split('T')[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a name for this automation rule');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    const matchedCat = categories.find((c) => c.id === categoryId);
    const nextExecution = calculateNextDate(frequency, dayOfMonth, dayOfWeek);

    const newRule: AutomationRule = {
      id: initialRule ? initialRule.id : crypto.randomUUID(),
      title: title.trim(),
      amount: numAmount,
      type,
      frequency,
      dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : undefined,
      dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : undefined,
      categoryId: categoryId || undefined,
      categoryName: matchedCat?.name || (type === 'INCOME' ? 'Salary & Inflow' : 'General'),
      paymentMethod,
      isActive: initialRule ? initialRule.isActive : true,
      autoLog,
      notes: notes.trim() || undefined,
      lastExecuted: initialRule?.lastExecuted,
      nextExecutionDate: nextExecution,
      createdAt: initialRule ? initialRule.createdAt : new Date().toISOString(),
    };

    onSave(newRule);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-surface border border-surface-border rounded-3xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col my-auto text-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-surface-border flex-shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  {initialRule ? 'Edit Scheduled Rule' : 'New Date-Based Automation'}
                </h2>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Schedule recurring transactions to execute on specific dates
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-5 sm:mx-6 mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`py-2.5 rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold border transition-all ${
                  type === 'EXPENSE'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'bg-surface-raised border-surface-border text-zinc-500 hover:text-foreground'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-500" />
                <span>Recurring Expense</span>
              </button>
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`py-2.5 rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold border transition-all ${
                  type === 'INCOME'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'bg-surface-raised border-surface-border text-zinc-500 hover:text-foreground'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                <span>Recurring Income</span>
              </button>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                Automation Title / Name
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'EXPENSE' ? 'e.g. House Rent, Netflix, SIP, WiFi' : 'e.g. Monthly Salary, Freelance Retainer'}
                className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-base font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl pl-8 pr-4 py-2.5 text-base font-bold font-mono text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Frequency & Execution Day */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                    Schedule Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as AutomationFrequency)}
                    className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>

                {frequency === 'MONTHLY' && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                      Day of Month
                    </label>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                      className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : `${d}th`} of every month
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {frequency === 'WEEKLY' && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                      Day of Week
                    </label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                      className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value={1}>Every Monday</option>
                      <option value={2}>Every Tuesday</option>
                      <option value={3}>Every Wednesday</option>
                      <option value={4}>Every Thursday</option>
                      <option value={5}>Every Friday</option>
                      <option value={6}>Every Saturday</option>
                      <option value={0}>Every Sunday</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Quick Day Chips for Monthly */}
              {frequency === 'MONTHLY' && (
                <div className="flex items-center space-x-1.5 pt-0.5">
                  <span className="text-[10px] text-zinc-400 font-mono">Quick:</span>
                  {quickDays.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayOfMonth(d)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                        dayOfMonth === d
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface-raised border border-surface-border text-zinc-500 hover:text-foreground'
                      }`}
                    >
                      {d === 1 ? '1st' : `${d}th`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Category
                </label>
                <select
                  value={categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value || undefined)}
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Default Category</option>
                  {categories
                    .filter((c) => c.type === type)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="UPI">UPI / Autopay</option>
                  <option value="BANK_TRANSFER">Bank Standing Instruction</option>
                  <option value="CREDIT_CARD">Credit Card Auto-debit</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>

            {/* Auto-Log Toggle */}
            <div className="p-3.5 rounded-2xl bg-surface-raised border border-surface-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-foreground">Auto-Post to Ledger</div>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Automatically log transaction into database on the scheduled date
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLog}
                  onChange={(e) => setAutoLog(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Account number, reminder, or split note"
                className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/30 active:scale-[0.99]"
              >
                <Check className="w-4 h-4" />
                <span>{initialRule ? 'Save Automation Rule' : 'Schedule Automation'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
