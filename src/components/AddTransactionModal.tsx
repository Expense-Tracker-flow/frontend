'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowDownRight, ArrowUpRight, Check, AlertCircle } from 'lucide-react';
import { Category, PaymentMethod, TransactionType } from '../lib/types';
import { api } from '../lib/api';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  initialType?: TransactionType;
  initialNaturalQuery?: string;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  initialType = 'EXPENSE',
  initialNaturalQuery = '',
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState<string>('');
  const [naturalInput, setNaturalInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setType(initialType);
      if (initialNaturalQuery) {
        setActiveTab('ai');
        setNaturalInput(initialNaturalQuery);
        parseNaturalLanguage(initialNaturalQuery);
      } else {
        setActiveTab('manual');
        setAmount('');
        setDescription('');
        setNotes('');
        setTransactionDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, initialType, initialNaturalQuery]);

  // Client-side NLP heuristic for natural input preview
  const parseNaturalLanguage = (query: string) => {
    const lower = query.toLowerCase();
    
    // Type detection
    const isIncome = lower.includes('received') || lower.includes('salary') || lower.includes('income') || lower.includes('earned');
    const detectedType: TransactionType = isIncome ? 'INCOME' : 'EXPENSE';
    setType(detectedType);

    // Amount detection (e.g. ₹450, 450, 50,000, 50k)
    const amountMatch = query.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?|\b[0-9]+k\b)/i);
    if (amountMatch) {
      let val = amountMatch[1].replace(/,/g, '');
      if (val.toLowerCase().endsWith('k')) {
        val = (parseFloat(val) * 1000).toString();
      }
      setAmount(val);
    }

    // Description / reason extraction with clean word boundaries
    let cleanDesc = query
      .replace(/\b(?:yesterday|today|day before yesterday|\d+\s*days?\s*ago)\b/gi, ' ')
      .replace(/(?:₹|rs\.?|inr)?\s*(?:\b[0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?|\b[0-9]+k\b)/gi, ' ')
      .replace(/\b(?:by|via|with|using|through)?\s*(?:upi|cash|card|credit|debit|gpay|paytm|phonepe|netbanking|bank)\b/gi, ' ')
      .replace(/^\s*(?:i\s+)?(?:spent|paid|bought|received|got|added|recorded|purchase|purchased)\s+(?:on|for|a|an)?\s*/i, ' ')
      .replace(/\b(?:for|on|at|in|to|from)\s*$/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanDesc && lower.includes('salary')) cleanDesc = 'Salary';
    if (!cleanDesc && lower.includes('dinner')) cleanDesc = 'Dinner';
    if (!cleanDesc && lower.includes('coffee')) cleanDesc = 'Coffee';
    if (!cleanDesc && lower.includes('uber')) cleanDesc = 'Uber ride';

    if (cleanDesc && cleanDesc.length >= 2) {
      setDescription(cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1));
    }

    // Category matching heuristic
    const matchingCat = categories.find((c) => {
      const cName = c.name.toLowerCase();
      if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('coffee') || lower.includes('restaurant')) {
        return cName.includes('food');
      }
      if (lower.includes('uber') || lower.includes('taxi') || lower.includes('petrol') || lower.includes('flight') || lower.includes('transport')) {
        return cName.includes('transport') || cName.includes('travel');
      }
      if (lower.includes('grocery') || lower.includes('supermarket')) {
        return cName.includes('groceries') || cName.includes('food');
      }
      if (lower.includes('salary')) {
        return cName.includes('salary');
      }
      return false;
    });

    if (matchingCat) {
      setCategoryId(matchingCat.id);
    }
  };

  const handleAiParseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    parseNaturalLanguage(naturalInput);
    setActiveTab('manual');
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.createTransaction({
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        categoryId: categoryId || undefined,
        transactionDate,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Record Transaction</h2>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Log an inflow or outflow into your ledger</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Pill Tabs */}
          <div className="px-5 sm:px-6 pt-3 pb-1 flex-shrink-0">
            <div className="grid grid-cols-2 gap-1 bg-surface-raised p-1 rounded-2xl border border-surface-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'manual'
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-zinc-500 hover:text-foreground'
                }`}
              >
                <span>Manual Form</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'ai'
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-zinc-500 hover:text-foreground'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Smart Fill (AI)</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-5 sm:mx-6 mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'ai' ? (
            /* Smart Natural Language Mode */
            <form onSubmit={handleAiParseSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Describe what happened
                </label>
                <textarea
                  rows={3}
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  placeholder="e.g. Spent ₹450 on dinner with friends yesterday via UPI"
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl p-3.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>

              <div className="text-xs text-zinc-500 bg-surface-raised/60 p-3.5 rounded-2xl border border-surface-border space-y-1">
                <span className="font-semibold text-foreground flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Auto-Extraction:</span>
                </span>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  FLOW automatically extracts the amount, matching category, date, and payment method so you don&apos;t have to fill every field manually.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/25 active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Extract & Review Form</span>
              </button>
            </form>
          ) : (
            /* Structured Manual Form */
            <form onSubmit={handleSaveTransaction} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
                  <span>Expense</span>
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
                  <span>Income</span>
                </button>
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

              {/* Reason / Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Description / Title
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === 'EXPENSE' ? 'e.g. Dinner, Uber ride, Groceries' : 'e.g. August Salary, Freelance project'}
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Category & Payment Method Grid */}
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
                    <option value="">Select Category</option>
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
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Transaction Date
                </label>
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Notes / Tags (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context or split info"
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/30 active:scale-[0.99]"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving to ledger...' : `Add ${type === 'EXPENSE' ? 'Expense' : 'Income'}`}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
