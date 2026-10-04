'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownRight, ArrowUpRight, Check, Trash2, AlertCircle } from 'lucide-react';
import { Category, PaymentMethod, Transaction, TransactionType } from '../lib/types';
import { api } from '../lib/api';
import { SearchableSelect, SelectOption } from './SearchableSelect';

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: 'UPI', label: 'UPI / GPay / PhonePe' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'OTHER', label: 'Other' },
];

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (id: string) => void;
  transaction: Transaction | null;
  categories: Category[];
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  transaction,
  categories,
}) => {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [transactionDate, setTransactionDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transaction) {
      setError(null);
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDescription(transaction.description || '');
      setCategoryId(transaction.category?.id || undefined);
      setTransactionDate(
        transaction.transactionDate ? transaction.transactionDate.split('T')[0] : new Date().toISOString().split('T')[0]
      );
      setPaymentMethod((transaction.paymentMethod as PaymentMethod) || 'UPI');
      setNotes(transaction.notes || '');
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const handleUpdate = async (e: React.FormEvent) => {
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

      await api.updateTransaction(transaction.id, {
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
      setError(err?.response?.data?.message || 'Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        setIsDeleting(true);
        if (onDelete) {
          onDelete(transaction.id);
        } else {
          await api.deleteTransaction(transaction.id);
          onSuccess();
        }
        onClose();
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to delete transaction');
      } finally {
        setIsDeleting(false);
      }
    }
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
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Edit Transaction</h2>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Modify ledger details or re-categorize</p>
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

          {/* Edit Form */}
          <form onSubmit={handleUpdate} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
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

            {/* Description */}
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                Description / Title
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dinner, Rent, Salary"
                className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Category & Payment Method Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Category
                </label>
                <SearchableSelect
                  value={categoryId || ''}
                  onChange={(val) => setCategoryId(val || undefined)}
                  options={categories
                    .filter((c) => c.type === type)
                    .map((cat) => ({
                      value: cat.id,
                      label: cat.name,
                      color: cat.color,
                    }))}
                  placeholder="Select Category..."
                  searchPlaceholder="Search categories..."
                />
              </div>

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
                />
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

            {/* Action Buttons: Save & Delete */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="px-4 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
                title="Delete this transaction"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="flex-1 py-3 rounded-2xl bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/30 active:scale-[0.99]"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving changes...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
