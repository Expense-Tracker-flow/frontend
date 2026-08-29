'use client';

import React, { useState } from 'react';
import { Transaction } from '../lib/types';
import { Trash2, Search, ArrowDownRight, ArrowUpRight, RotateCcw, Pencil } from 'lucide-react';

interface ActivityTimelineProps {
  transactions: Transaction[];
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  currencySymbol?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  transactions,
  onEditTransaction,
  onDeleteTransaction,
  currencySymbol = '₹',
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [search, setSearch] = useState('');

  // Default From: 1st day of current month, To: Today
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultTo = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);

  const handleResetToCurrentMonth = () => {
    setFromDate(defaultFrom);
    setToDate(defaultTo);
  };

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    if (filterType !== 'ALL' && tx.type !== filterType) return false;
    
    // Date filter
    const txDate = tx.transactionDate ? tx.transactionDate.split('T')[0] : '';
    if (fromDate && txDate && txDate < fromDate) return false;
    if (toDate && txDate && txDate > toDate) return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = (tx.description || '').toLowerCase().includes(q);
      const matchCategory = (tx.category?.name || '').toLowerCase().includes(q);
      const matchNotes = (tx.notes || '').toLowerCase().includes(q);
      if (!matchDesc && !matchCategory && !matchNotes) return false;
    }
    return true;
  });

  // Group by date
  const groupByDate = (list: Transaction[]) => {
    const groups: { [dateStr: string]: Transaction[] } = {};
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    list.forEach((item) => {
      let rawDate = item.transactionDate ? item.transactionDate.split('T')[0] : '';
      let label = rawDate;
      if (rawDate === today) label = 'Today';
      else if (rawDate === yesterday) label = 'Yesterday';
      else if (rawDate) {
        label = new Date(rawDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } else {
        label = 'Recent';
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return groups;
  };

  const grouped = groupByDate(filtered);
  const dateKeys = Object.keys(grouped);

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-surface border border-surface-border p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-sm text-foreground">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-4 border-b border-surface-border pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">Activity Ledger</h2>
            <p className="text-[11px] sm:text-xs text-zinc-500 font-mono mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'} found
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* From & To Date Range Controls */}
          <div className="flex items-center justify-between space-x-1.5 bg-surface-raised border border-surface-border p-1.5 rounded-2xl text-xs w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial flex items-center space-x-1 px-2 py-1 bg-surface rounded-xl border border-surface-border">
              <span className="text-[9px] font-mono text-zinc-400 uppercase font-semibold">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-[11px] sm:text-xs font-mono text-foreground focus:outline-none cursor-pointer w-full"
              />
            </div>

            <div className="flex-1 sm:flex-initial flex items-center space-x-1 px-2 py-1 bg-surface rounded-xl border border-surface-border">
              <span className="text-[9px] font-mono text-zinc-400 uppercase font-semibold">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-[11px] sm:text-xs font-mono text-foreground focus:outline-none cursor-pointer w-full"
              />
            </div>

            <button
              onClick={handleResetToCurrentMonth}
              title="Reset to This Month"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center justify-between bg-surface-raised border border-surface-border rounded-2xl p-1 text-xs font-medium w-full sm:w-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-xl text-center transition-all ${
                filterType === 'ALL'
                  ? 'bg-primary text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('EXPENSE')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-xl text-center transition-all ${
                filterType === 'EXPENSE'
                  ? 'bg-rose-500/15 text-rose-500 font-semibold'
                  : 'text-zinc-400 hover:text-foreground'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setFilterType('INCOME')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-xl text-center transition-all ${
                filterType === 'INCOME'
                  ? 'bg-emerald-500/15 text-emerald-500 font-semibold'
                  : 'text-zinc-400 hover:text-foreground'
              }`}
            >
              Income
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, notes..."
              className="w-full bg-surface-raised border border-surface-border rounded-2xl pl-9 pr-3 py-2 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      {dateKeys.length === 0 ? (
        <div className="py-12 sm:py-16 text-center text-zinc-400 text-xs font-mono">
          No transactions match your current date range and filters.
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {dateKeys.map((dateStr) => (
            <div key={dateStr} className="space-y-2">
              <div className="text-[10px] sm:text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider pl-1">
                {dateStr}
              </div>

              <div className="space-y-2">
                {grouped[dateStr].map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-raised/60 hover:bg-surface-raised border border-surface-border transition-all group gap-3"
                  >
                    {/* Left Icon & Info */}
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'INCOME'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tx.type === 'INCOME' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {tx.description || 'Transaction'}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-zinc-400 font-mono truncate">
                          {tx.category?.name || 'General'}
                          {tx.paymentMethod ? ` • ${tx.paymentMethod}` : ''}
                          {tx.notes ? ` • ${tx.notes}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Right Amount & Actions (Edit / Delete) */}
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-xs sm:text-sm ${
                            tx.type === 'INCOME'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '+' : '-'}
                          {currencySymbol}
                          {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-zinc-400 font-mono">
                          {tx.transactionDate ? tx.transactionDate.split('T')[0] : ''}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-1">
                        {onEditTransaction && (
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1.5 rounded-xl text-zinc-400 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                            title="Edit transaction"
                            aria-label="Edit transaction"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onDeleteTransaction && (
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                            title="Delete transaction"
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
