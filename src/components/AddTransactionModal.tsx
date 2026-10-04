'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  ArrowDownRight, 
  ArrowUpRight, 
  Check, 
  AlertCircle, 
  Plus, 
  FolderPlus,
  Zap,
  Banknote,
  CreditCard,
  Building,
  Tag
} from 'lucide-react';
import { Category, PaymentMethod, TransactionType } from '../lib/types';
import { api } from '../lib/api';
import { SearchableSelect, SelectOption } from './SearchableSelect';

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: 'UPI', label: 'UPI / GPay / PhonePe', icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
  { value: 'CASH', label: 'Cash', icon: <Banknote className="w-3.5 h-3.5 text-emerald-500" /> },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: <CreditCard className="w-3.5 h-3.5 text-blue-500" /> },
  { value: 'DEBIT_CARD', label: 'Debit Card', icon: <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <Building className="w-3.5 h-3.5 text-purple-500" /> },
  { value: 'OTHER', label: 'Other', icon: <Tag className="w-3.5 h-3.5 text-zinc-400" /> },
];

const PRESET_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#64748B', // Slate
];

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  initialType?: TransactionType;
  initialNaturalQuery?: string;
  onCategoryCreated?: (category: Category) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  initialType = 'EXPENSE',
  initialNaturalQuery = '',
  onCategoryCreated,
}) => {
  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [transactionDate, setTransactionDate] = useState<string>(getLocalDateStr());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [naturalInput, setNaturalInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic categories and Add Category popup state
  const [availableCategories, setAvailableCategories] = useState<Category[]>(categories);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>('#6366F1');
  const [newCatError, setNewCatError] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [aiDetectedCategory, setAiDetectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    setAvailableCategories(categories);
  }, [categories]);

  const trimmedNewCatName = newCatName.trim();
  const isDuplicateCategory = Boolean(
    trimmedNewCatName &&
      availableCategories.some(
        (c) => c.type === type && c.name.trim().toLowerCase() === trimmedNewCatName.toLowerCase()
      )
  );

  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setNewCatError('Please enter a category name');
      return;
    }
    if (isDuplicateCategory) {
      setNewCatError(`Category "${trimmed}" already exists for ${type === 'EXPENSE' ? 'Expenses' : 'Income'}.`);
      return;
    }

    try {
      setIsCreatingCategory(true);
      setNewCatError(null);
      const res = await api.createCategory({
        name: trimmed,
        type: type,
        color: newCatColor,
        icon: 'tag',
      });
      if (res.data) {
        const createdCat = res.data;
        setAvailableCategories((prev) => [...prev.filter((c) => c.id !== createdCat.id), createdCat]);
        setCategoryId(createdCat.id);
        onCategoryCreated?.(createdCat);
        setIsAddCategoryOpen(false);
        setNewCatName('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create category';
      setNewCatError(msg);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const matching = availableCategories.filter((c) => c.type === newType);
    const generalCat = matching.find((c) => c.name.toLowerCase() === 'general');
    if (generalCat) {
      setCategoryId(generalCat.id);
    } else if (matching.length > 0) {
      setCategoryId(matching[0].id);
    } else {
      setCategoryId(undefined);
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmount((prev) => {
      const current = parseFloat(prev) || 0;
      return (current + val).toString();
    });
  };

  const handleClearAmount = () => {
    setAmount('');
  };

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setType(initialType);
      setPaymentMethod('CASH');
      const matchingCats = categories.filter((c) => c.type === initialType);
      const generalCat = matchingCats.find((c) => c.name.toLowerCase() === 'general');
      if (generalCat) {
        setCategoryId(generalCat.id);
      } else if (matchingCats.length > 0) {
        setCategoryId(matchingCats[0].id);
      }
      if (initialNaturalQuery) {
        setActiveTab('ai');
        setNaturalInput(initialNaturalQuery);
        parseNaturalLanguage(initialNaturalQuery);
      } else {
        setActiveTab('manual');
        setAmount('');
        setDescription('');
        setNotes('');
        setTransactionDate(getLocalDateStr(new Date()));
      }
    }
  }, [isOpen, initialType, initialNaturalQuery, categories]);

  // Helper to match category semantically from natural input
  const detectCategoryForQuery = (queryText: string, targetType: TransactionType): Category | null => {
    const lower = queryText.toLowerCase();

    // 1. Direct name match with available categories
    const exactMatch = availableCategories.find(
      (c) => c.type === targetType && lower.includes(c.name.toLowerCase())
    );
    if (exactMatch) return exactMatch;

    // 2. Income semantic rules
    if (targetType === 'INCOME') {
      const isFreelance = lower.includes('freelance') || lower.includes('project') || lower.includes('client') || lower.includes('consulting');
      const isInvest = lower.includes('dividend') || lower.includes('stock') || lower.includes('interest') || lower.includes('crypto');
      const isRefund = lower.includes('refund') || lower.includes('cashback') || lower.includes('reward');
      const isBonus = lower.includes('bonus') || lower.includes('gift') || lower.includes('prize');
      const isSalary = lower.includes('salary') || lower.includes('payroll') || lower.includes('stipend') || lower.includes('wages') || lower.includes('earned');

      const targetKeyword = isFreelance ? 'freelance' : isInvest ? 'invest' : isRefund ? 'refund' : isBonus ? 'bonus' : isSalary ? 'salary' : '';
      if (targetKeyword) {
        const found = availableCategories.find(
          (c) => c.type === 'INCOME' && c.name.toLowerCase().includes(targetKeyword)
        );
        if (found) return found;
      }
      return availableCategories.find((c) => c.type === 'INCOME') || null;
    }

    // 3. Expense semantic keyword rules
    const expenseRules = [
      {
        keys: ['food', 'dining', 'coffee', 'tea', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'swiggy', 'zomato', 'snack', 'cafe', 'restaurant', 'mcdonalds', 'kfc', 'starbucks', 'drink', 'beer', 'bar', 'chai', 'biscuit'],
        targetMatches: ['food', 'dining', 'restaurant', 'meal', 'cafe']
      },
      {
        keys: ['grocery', 'groceries', 'supermarket', 'blinkit', 'zepto', 'instamart', 'vegetables', 'fruits', 'milk', 'bread', 'eggs', 'provisions', 'dmart'],
        targetMatches: ['grocer', 'supermarket', 'food', 'household']
      },
      {
        keys: ['uber', 'ola', 'rapido', 'auto', 'metro', 'bus', 'train', 'petrol', 'diesel', 'fuel', 'cab', 'flight', 'ticket', 'toll', 'parking'],
        targetMatches: ['travel', 'transport', 'commute', 'auto', 'fuel']
      },
      {
        keys: ['shopping', 'clothes', 'dress', 'shoes', 'amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'electronics', 'gadget', 'bag'],
        targetMatches: ['shopping', 'lifestyle', 'clothing', 'retail']
      },
      {
        keys: ['movie', 'netflix', 'spotify', 'hotstar', 'cinema', 'game', 'gaming', 'concert', 'event', 'party', 'outing'],
        targetMatches: ['entertainment', 'leisure', 'subscription', 'fun']
      },
      {
        keys: ['electricity', 'water', 'gas', 'wifi', 'broadband', 'recharge', 'jio', 'airtel', 'mobile bill', 'rent', 'maintenance'],
        targetMatches: ['bill', 'utility', 'utilities', 'rent', 'housing']
      },
      {
        keys: ['doctor', 'medicine', 'pharmacy', 'hospital', 'health', 'clinic', 'dentist', 'apollo', 'medical', 'gym', 'fitness'],
        targetMatches: ['health', 'medical', 'wellness', 'fitness']
      },
      {
        keys: ['course', 'book', 'tuition', 'school', 'college', 'exam', 'udemy', 'coursera', 'training'],
        targetMatches: ['education', 'learning', 'studies']
      },
      {
        keys: ['gift', 'donation', 'charity', 'present', 'tip'],
        targetMatches: ['gift', 'donation', 'personal']
      }
    ];

    for (const rule of expenseRules) {
      if (rule.keys.some((k) => lower.includes(k))) {
        const found = availableCategories.find(
          (c) =>
            c.type === 'EXPENSE' &&
            rule.targetMatches.some((tm) => c.name.toLowerCase().includes(tm))
        );
        if (found) return found;
      }
    }

    return availableCategories.find((c) => c.type === 'EXPENSE') || null;
  };

  // Rule-based NLP Parser for natural queries
  const parseNaturalLanguage = (query: string) => {
    let detectedType: TransactionType = 'EXPENSE';
    const lower = query.toLowerCase();

    const isIncome =
      lower.includes('salary') ||
      lower.includes('received') ||
      lower.includes('credited') ||
      lower.includes('earned') ||
      lower.includes('income') ||
      lower.includes('dividend') ||
      lower.includes('cashback') ||
      lower.includes('freelance') ||
      lower.includes('refund') ||
      lower.includes('got paid') ||
      lower.includes('bonus');

    if (isIncome) {
      detectedType = 'INCOME';
    }
    setType(detectedType);

    // Match amount
    const amountMatch = query.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (amountMatch) {
      const cleanAmt = amountMatch[1].replace(/,/g, '');
      setAmount(cleanAmt);
    }

    // Match payment method
    if (lower.includes('cash')) setPaymentMethod('CASH');
    else if (lower.includes('card') || lower.includes('credit')) setPaymentMethod('CREDIT_CARD');
    else if (lower.includes('debit')) setPaymentMethod('DEBIT_CARD');
    else if (lower.includes('bank') || lower.includes('neft') || lower.includes('rtgs') || lower.includes('imps') || lower.includes('transfer')) setPaymentMethod('BANK_TRANSFER');
    else if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm')) setPaymentMethod('UPI');

    // Extract cleaner description
    let cleanDesc = query
      .replace(/(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi, '')
      .replace(/\b(spent|paid|bought|received|got|for|via|by|through|using|on|yesterday|today|at|in)\b/gi, '')
      .replace(/\b(cash|upi|gpay|phonepe|paytm|card|credit card|debit card|bank)\b/gi, '')
      .trim();

    cleanDesc = cleanDesc.replace(/\s+/g, ' ');
    if (cleanDesc.length > 0) {
      setDescription(cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1));
    } else {
      setDescription(detectedType === 'EXPENSE' ? 'Expense' : 'Income');
    }

    // Match category
    const matchingCat = detectCategoryForQuery(query, detectedType);
    setAiDetectedCategory(matchingCat);
    if (matchingCat) {
      setCategoryId(matchingCat.id);
    }
  };

  const handleAiParseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    parseNaturalLanguage(naturalInput);
    if (!notes) {
      setNotes('Categorized by MonAI');
    }
    setActiveTab('manual');
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    let finalDesc = description.trim();
    if (!finalDesc) {
      const selectedCat = availableCategories.find((c) => c.id === categoryId);
      if (selectedCat) {
        finalDesc = selectedCat.name;
      } else {
        finalDesc = type === 'EXPENSE' ? 'General Expense' : 'General Income';
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.createTransaction({
        type,
        amount: numericAmount,
        description: finalDesc,
        categoryId: (categoryId && !categoryId.startsWith('general-')) ? categoryId : undefined,
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

  const currentCategories = useMemo(() => {
    const list = availableCategories.filter((c) => c.type === type);
    const generalCat = list.find((c) => c.name.toLowerCase() === 'general');
    if (!generalCat) {
      const fallbackGeneral: Category = {
        id: `general-${type.toLowerCase()}`,
        name: 'General',
        color: '#64748B',
        icon: 'tag',
        type: type,
        isSystem: true,
      };
      return [fallbackGeneral, ...list];
    }
    return [generalCat, ...list.filter((c) => c.id !== generalCat.id)];
  }, [availableCategories, type]);

  const categoryOptions: SelectOption[] = currentCategories.map((cat) => ({
    value: cat.id,
    label: cat.name,
    color: cat.color || '#6366F1',
  }));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-surface border border-surface-border rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-foreground max-h-[92dvh]"
        >
          {/* Header Bar: Type Switcher on Left, AI Fill & Close on Right */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-surface-border flex-shrink-0">
            {/* Segmented Type Switcher */}
            <div className="flex items-center bg-surface-raised p-1 rounded-2xl border border-surface-border">
              <button
                type="button"
                onClick={() => handleTypeChange('EXPENSE')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'EXPENSE'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-foreground'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Expense</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('INCOME')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'INCOME'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-foreground'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Income</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'ai' ? 'manual' : 'ai')}
                className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                  activeTab === 'ai'
                    ? 'bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-primary/40'
                    : 'bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary hover:border-primary/50'
                }`}
                title="Smart Fill with AI"
              >
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                <span className="tracking-wide">AI Fill</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-2xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
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
            <form onSubmit={handleAiParseSubmit} className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Type or paste what happened
                </label>
                <textarea
                  rows={3}
                  autoFocus
                  value={naturalInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNaturalInput(val);
                    if (val.trim()) {
                      parseNaturalLanguage(val);
                    }
                  }}
                  placeholder="e.g. Spent ₹450 on dinner with friends via UPI, or Received 85000 salary from employer"
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl p-3.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>

              {naturalInput.trim().length > 2 && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-raised border border-surface-border text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">Detected:</span>
                  <span className="font-bold text-foreground font-mono">
                    {amount ? `₹${parseFloat(amount).toLocaleString('en-IN')}` : '—'}
                  </span>
                  <span className="text-primary font-semibold text-[11px] truncate max-w-[140px]">
                    {aiDetectedCategory?.name || 'General'}
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-primary/25 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill Form</span>
              </button>
            </form>
          ) : (
            /* Clean, Modern, Elegant Manual Transaction Form */
            <form onSubmit={handleSaveTransaction} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* 1. Date Calendar Picker at Top of Form */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Transaction Date
                </label>
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                />
              </div>

              {/* 2. Amount Input & Quick-Add Pills */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-lg font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    autoFocus
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-surface-raised border border-surface-border rounded-2xl pl-9 pr-4 py-2.5 text-lg font-bold font-mono text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                {/* Clean Quick Amount Helper Pills */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {[100, 200, 500, 1000, 2000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAmount(val)}
                      className="px-2.5 py-1 rounded-xl bg-surface border border-surface-border hover:border-primary/40 text-xs font-mono font-medium text-zinc-600 dark:text-zinc-300 hover:text-primary transition-all active:scale-95 cursor-pointer"
                    >
                      +{val}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={handleClearAmount}
                      className="px-2.5 py-1 rounded-xl text-xs font-mono text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer ml-auto"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Category & Payment Method Side-by-Side (Searchable Dropdowns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Dropdown */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                    Category
                  </label>
                  <SearchableSelect
                    value={categoryId || ''}
                    onChange={(val) => {
                      setCategoryId(val || undefined);
                      const cat = availableCategories.find((c) => c.id === val);
                      if (cat && !description.trim()) {
                        setDescription(cat.name);
                      }
                    }}
                    options={categoryOptions}
                    placeholder="Select Category..."
                    searchPlaceholder="Search category..."
                  />
                </div>

                {/* Payment Method Dropdown */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                    Payment Method
                  </label>
                  <SearchableSelect
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                    options={PAYMENT_METHOD_OPTIONS}
                    placeholder="Select Payment Method..."
                    searchPlaceholder="Search payment method..."
                    searchable={false}
                  />
                </div>
              </div>

              {/* 4. Description & Notes Side-by-Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Description / Title */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                    Description / Title
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={type === 'EXPENSE' ? 'e.g. Dinner, Grocery, Uber, Shopping' : 'e.g. Monthly Salary, Freelance Client, Dividend'}
                    className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Notes (Optional) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional context or memo"
                    className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* 6. Primary Action Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-primary/30 active:scale-[0.99] cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Saving to ledger...'
                      : `Add ${type === 'EXPENSE' ? 'Expense' : 'Income'} ${
                          amount && parseFloat(amount) > 0
                            ? `• ₹${parseFloat(amount).toLocaleString('en-IN')}`
                            : ''
                        }`}
                  </span>
                </button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Add Category Popup Dialog */}
        <AnimatePresence>
          {isAddCategoryOpen && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAddCategoryOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-surface border border-surface-border rounded-3xl shadow-2xl p-5 space-y-4 text-left"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${newCatColor}20`, color: newCatColor }}
                    >
                      <FolderPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">New Category</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-zinc-500">Type:</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            type === 'EXPENSE'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {type === 'EXPENSE' ? 'Expense' : 'Income'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(false)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                      Category Name
                    </label>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={newCatName}
                      onChange={(e) => {
                        setNewCatName(e.target.value);
                        setNewCatError(null);
                      }}
                      placeholder={type === 'EXPENSE' ? 'e.g. Gym, Pet Care, Utilities' : 'e.g. Dividend, Bonus, Consulting'}
                      className={`w-full bg-surface-raised border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all ${
                        isDuplicateCategory || newCatError
                          ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-surface-border focus:border-primary focus:ring-primary/20'
                      }`}
                    />

                    {/* Real-time duplicate error banner */}
                    {isDuplicateCategory && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center space-x-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>A category named &quot;{trimmedNewCatName}&quot; already exists for {type === 'EXPENSE' ? 'Expenses' : 'Income'}.</span>
                      </div>
                    )}

                    {/* Server/other validation error */}
                    {!isDuplicateCategory && newCatError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center space-x-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{newCatError}</span>
                      </div>
                    )}
                  </div>

                  {/* Preset Colors */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                      Color Badge
                    </label>
                    <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                      {PRESET_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setNewCatColor(col)}
                          className={`w-6 h-6 rounded-full transition-all relative flex items-center justify-center cursor-pointer ${
                            newCatColor === col
                              ? 'ring-2 ring-offset-2 ring-primary ring-offset-surface scale-110'
                              : 'hover:scale-105 opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: col }}
                        >
                          {newCatColor === col && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
                    <button
                      type="button"
                      onClick={() => setIsAddCategoryOpen(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingCategory || !trimmedNewCatName || isDuplicateCategory}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-primary/25 active:scale-95 cursor-pointer"
                    >
                      {isCreatingCategory ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Category</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
