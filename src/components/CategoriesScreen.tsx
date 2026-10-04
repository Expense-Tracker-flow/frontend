'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tags, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  X, 
  Check, 
  Layers, 
  Sparkles,
  TrendingUp,
  FolderOpen
} from 'lucide-react';
import { Category, Transaction, TransactionType } from '../lib/types';
import { api } from '../lib/api';

interface CategoriesScreenProps {
  categories: Category[];
  transactions: Transaction[];
  currencySymbol?: string;
  onCategoryAdded: (category: Category) => void;
  onCategoryDeleted: (id: string) => void;
  onQuickLog?: (categoryId: string, type: TransactionType) => void;
  showToast: (msg: string) => void;
}

const PRESET_COLORS = [
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  categories = [],
  transactions = [],
  currencySymbol = '₹',
  onCategoryAdded,
  onCategoryDeleted,
  onQuickLog,
  showToast,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form state
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate volume per category from transactions
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { total: number; count: number }>();

    transactions.forEach((tx) => {
      const catId = tx.category?.id;
      const catName = tx.category?.name || 'General';
      const key = catId || catName.toLowerCase();

      const existing = stats.get(key) || { total: 0, count: 0 };
      stats.set(key, {
        total: existing.total + (tx.amount || 0),
        count: existing.count + 1,
      });
    });

    return stats;
  }, [transactions]);

  // Overall metric counts
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const incomeCategories = categories.filter((c) => c.type === 'INCOME');

  const totalExpenseVolume = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const totalIncomeVolume = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  // Filtered categories list
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (filterType !== 'ALL' && cat.type !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return cat.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categories, filterType, search]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a category name');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await api.createCategory({
        name: name.trim(),
        type,
        color,
        icon: 'default',
      });

      if (res.success && res.data) {
        onCategoryAdded(res.data);
        showToast(`Category "${res.data.name}" created`);
        setName('');
        setColor(PRESET_COLORS[0]);
        setIsModalOpen(false);
      } else {
        setError(res.message || 'Failed to create category');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error creating category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (cat.isSystem) {
      showToast('Default system categories cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }

    try {
      const res = await api.deleteCategory(cat.id);
      if (res.success) {
        onCategoryDeleted(cat.id);
        showToast(`Category "${cat.name}" deleted`);
      } else {
        showToast(res.message || 'Failed to delete category');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* 1. Header & Metric Pillars */}
      <div className="bg-surface border border-surface-border rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" />
              <span>Category Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Organize, customize, and analyze your financial categories
            </p>
          </div>

          <button
            onClick={() => {
              setError(null);
              setIsModalOpen(true);
            }}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs shadow-md shadow-primary/25 transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-raised border border-surface-border space-y-1">
            <div className="text-[10px] sm:text-xs text-zinc-400 font-mono uppercase font-semibold flex items-center justify-between">
              <span>Total Categories</span>
              <Layers className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {categories.length}
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              {expenseCategories.length} Expense • {incomeCategories.length} Income
            </p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 space-y-1">
            <div className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 font-mono uppercase font-semibold flex items-center justify-between">
              <span>Expense Categories</span>
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {expenseCategories.length}
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              Total Spent: {currencySymbol}{totalExpenseVolume.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-mono uppercase font-semibold flex items-center justify-between">
              <span>Income Categories</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {incomeCategories.length}
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              Total Inflows: +{currencySymbol}{totalIncomeVolume.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type Filter Tabs */}
        <div className="flex items-center bg-surface-raised p-1 rounded-2xl border border-surface-border">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'ALL'
                ? 'bg-primary text-white shadow-xs'
                : 'text-zinc-500 hover:text-foreground'
            }`}
          >
            All ({categories.length})
          </button>
          <button
            onClick={() => setFilterType('EXPENSE')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'EXPENSE'
                ? 'bg-primary text-white shadow-xs'
                : 'text-zinc-500 hover:text-foreground'
            }`}
          >
            Expenses ({expenseCategories.length})
          </button>
          <button
            onClick={() => setFilterType('INCOME')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'INCOME'
                ? 'bg-primary text-white shadow-xs'
                : 'text-zinc-500 hover:text-foreground'
            }`}
          >
            Income ({incomeCategories.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface border border-surface-border text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Category Grid */}
      {filteredCategories.length === 0 ? (
        <div className="bg-surface border border-surface-border rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-surface-border flex items-center justify-center mx-auto text-zinc-400">
            <FolderOpen className="w-6 h-6 opacity-40" />
          </div>
          <p className="text-xs font-bold text-foreground">No categories found</p>
          <p className="text-[11px] text-zinc-400">
            {search ? 'Try clearing your search term.' : 'Click "New Category" to add one.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCategories.map((cat) => {
            const isIncome = cat.type === 'INCOME';
            const stat = categoryStats.get(cat.id) || categoryStats.get(cat.name.toLowerCase()) || { total: 0, count: 0 };
            const accentColor = cat.color || (isIncome ? '#10B981' : '#6366F1');

            return (
              <div
                key={cat.id}
                className="bg-surface border border-surface-border hover:border-primary/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
              >
                {/* Top Row: Color Avatar + Name + Type Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0"
                      style={{ backgroundColor: accentColor }}
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {cat.name}
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded font-semibold ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {cat.type}
                        </span>
                        {cat.isSystem ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-raised text-zinc-400 font-medium">
                            Default
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-medium">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete button (only for custom user categories) */}
                  {!cat.isSystem && (
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="opacity-60 hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bottom Stats & Quick Action */}
                <div className="pt-2.5 border-t border-surface-border/70 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[9px] text-zinc-400 font-mono uppercase font-semibold">
                      Total Activity
                    </div>
                    <div className={`font-mono font-bold text-xs sm:text-sm mt-0.5 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                      {isIncome ? '+' : '-'}{currencySymbol}{stat.total.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {stat.count} {stat.count === 1 ? 'record' : 'records'}
                    </div>
                  </div>

                  {onQuickLog && (
                    <button
                      onClick={() => onQuickLog(cat.id, cat.type)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-semibold flex items-center space-x-1 transition-all border ${
                        isIncome
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Log</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add Category Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-surface border border-surface-border rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="text-sm font-bold text-foreground">Create New Category</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-foreground hover:bg-surface-raised"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateCategory} className="space-y-4">
                {/* Category Type Switch */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-semibold text-zinc-400">
                    Category Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-raised border border-surface-border">
                    <button
                      type="button"
                      onClick={() => setType('EXPENSE')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        type === 'EXPENSE'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-zinc-500 hover:text-foreground'
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('INCOME')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        type === 'INCOME'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-zinc-500 hover:text-foreground'
                      }`}
                    >
                      Income
                    </button>
                  </div>
                </div>

                {/* Category Name Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-semibold text-zinc-400">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Freelance, Streaming, Groceries"
                    className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-surface-border text-xs text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>

                {/* Color Palette Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-semibold text-zinc-400">
                    Color Accent
                  </label>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                          color === c ? 'scale-110 ring-2 ring-white shadow-md' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-primary/25 transition-all flex items-center space-x-1.5"
                  >
                    {isSubmitting ? (
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Create Category</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
