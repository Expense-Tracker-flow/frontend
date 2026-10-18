'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Plus, FolderPlus } from 'lucide-react';
import { Category } from '../lib/types';
import { api } from '../lib/api';

// Same palette as the transaction modal's "New" category popup
const PRESET_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#EF4444', '#64748B'];

interface AddCategoryDialogProps {
  isOpen: boolean;
  type: 'EXPENSE' | 'INCOME';
  existingCategories: Category[];
  onClose: () => void;
  onCreated: (category: Category) => void;
}

export const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  isOpen,
  type,
  existingCategories,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const isDuplicate = Boolean(
    trimmed && existingCategories.some((c) => c.type === type && c.name.trim().toLowerCase() === trimmed.toLowerCase())
  );

  const reset = () => {
    setName('');
    setColor('#6366F1');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      setError('Please enter a category name');
      return;
    }
    if (isDuplicate) {
      setError(`Category "${trimmed}" already exists for ${type === 'EXPENSE' ? 'Expenses' : 'Income'}.`);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await api.createCategory({ name: trimmed, type, color, icon: 'tag' });
      if (res.data) {
        onCreated(res.data);
        reset();
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create category');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface border border-surface-border rounded-3xl shadow-2xl p-5 space-y-4 text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${color}20`, color }}
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
                onClick={handleClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Category Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  maxLength={100}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder={type === 'EXPENSE' ? 'e.g. Gym, Pet Care, Utilities' : 'e.g. Dividend, Bonus, Consulting'}
                  className={`w-full bg-surface-raised border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all ${
                    isDuplicate || error
                      ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-surface-border focus:border-primary focus:ring-primary/20'
                  }`}
                />

                {isDuplicate && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center space-x-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      A category named &quot;{trimmed}&quot; already exists for {type === 'EXPENSE' ? 'Expenses' : 'Income'}.
                    </span>
                  </div>
                )}

                {!isDuplicate && error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center space-x-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Color Badge
                </label>
                <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setColor(col)}
                      className={`w-6 h-6 rounded-full transition-all relative flex items-center justify-center cursor-pointer ${
                        color === col
                          ? 'ring-2 ring-offset-2 ring-primary ring-offset-surface scale-110'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col }}
                    >
                      {color === col && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !trimmed || isDuplicate}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-primary/25 cursor-pointer"
                >
                  {isSaving ? (
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
  );
};
