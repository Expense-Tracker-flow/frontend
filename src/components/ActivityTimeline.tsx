'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category } from '../lib/types';
import { Trash2, Search, ArrowDownRight, ArrowUpRight, RotateCcw, Pencil, Sparkles, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchableSelect, SelectOption } from './SearchableSelect';

const getPageNumbers = (current: number, total: number): (number | string)[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

interface ActivityTimelineProps {
  transactions: Transaction[];
  categories?: Category[];
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  currencySymbol?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  transactions,
  categories = [],
  onEditTransaction,
  onDeleteTransaction,
  currencySymbol = '₹',
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Default From: 1st day of current month, To: Today
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultTo = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);

  // Pagination: 30 transactions per page
  const PAGE_SIZE = 30;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedCategory, fromDate, toDate, search]);

  const handleResetToCurrentMonth = () => {
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setSelectedCategory('ALL');
    setFilterType('ALL');
    setSearch('');
    setCurrentPage(1);
  };

  // Build category options list for SearchableSelect
  const categoryOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [
      { value: 'ALL', label: 'All Categories' },
    ];
    const seen = new Set<string>();

    // 1. From passed categories
    categories.forEach((cat) => {
      if (cat.name && !seen.has(cat.name.toLowerCase())) {
        seen.add(cat.name.toLowerCase());
        list.push({
          value: cat.name,
          label: cat.name,
          color: cat.color,
        });
      }
    });

    // 2. From actual transaction history
    transactions.forEach((tx) => {
      const name = tx.category?.name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({
          value: name,
          label: name,
          color: tx.category?.color,
        });
      }
    });

    return list;
  }, [categories, transactions]);

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    if (filterType !== 'ALL' && tx.type !== filterType) return false;
    
    // Category filter
    if (selectedCategory !== 'ALL') {
      const txCategory = (tx.category?.name || (tx as any).categoryName || '').toLowerCase();
      if (txCategory !== selectedCategory.toLowerCase()) return false;
    }

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

  // Sort transactions: Latest date first, then latest createdAt timestamp first
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // 1. Transaction Date (latest date first)
      const dateA = a.transactionDate ? a.transactionDate.split('T')[0] : '';
      const dateB = b.transactionDate ? b.transactionDate.split('T')[0] : '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }

      // 2. CreatedAt timestamp (latest created first)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }

      // 3. Fallback: string compare id
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [filtered]);

  // Pagination calculations
  const totalCount = sortedFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return sortedFiltered.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedFiltered, safeCurrentPage]);

  const startItem = totalCount === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safeCurrentPage * PAGE_SIZE, totalCount);

  // Group by date keeping exact date order (latest date first) for active page
  const dateGroups = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const groupMap = new Map<string, { label: string; items: Transaction[] }>();

    paginatedTransactions.forEach((item) => {
      const rawDate = item.transactionDate ? item.transactionDate.split('T')[0] : '1970-01-01';
      let label = rawDate;
      if (rawDate === today) label = 'Today';
      else if (rawDate === yesterday) label = 'Yesterday';
      else if (rawDate && rawDate !== '1970-01-01') {
        label = new Date(rawDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } else {
        label = 'Recent';
      }

      if (!groupMap.has(rawDate)) {
        groupMap.set(rawDate, { label, items: [] });
      }
      groupMap.get(rawDate)!.items.push(item);
    });

    return Array.from(groupMap.entries())
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([rawDate, group]) => ({
        dateKey: rawDate,
        label: group.label,
        items: group.items,
      }));
  }, [paginatedTransactions]);

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-surface border border-surface-border p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-sm text-foreground">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-4 border-b border-surface-border pb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">Activity Ledger</h2>
              {selectedCategory !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  <span>Category: {selectedCategory}</span>
                  <button 
                    onClick={() => setSelectedCategory('ALL')}
                    className="hover:text-rose-500"
                    title="Clear category filter"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-500 font-mono mt-0.5">
              {totalCount} {totalCount === 1 ? 'transaction' : 'transactions'} found
              {totalPages > 1 && ` • Page ${safeCurrentPage} of ${totalPages}`}
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
              title="Reset all filters"
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

          {/* Category Filter Dropdown */}
          <div className="w-full sm:w-[190px]">
            <SearchableSelect
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={categoryOptions}
              placeholder="All Categories"
              searchPlaceholder="Filter category..."
              className="text-xs"
            />
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
      {dateGroups.length === 0 ? (
        <div className="py-12 sm:py-16 text-center text-zinc-400 text-xs font-mono">
          No transactions match your current date range and filters.
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {dateGroups.map((group) => (
            <div key={group.dateKey} className="space-y-2">
              <div className="text-[10px] sm:text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider pl-1">
                {group.label}
              </div>

              <div className="space-y-2">
                {group.items.map((tx) => (
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
                        <div className="text-[10px] sm:text-[11px] text-zinc-400 font-mono truncate flex items-center gap-1.5 flex-wrap">
                          <span className="text-foreground font-medium">{tx.category?.name || 'General'}</span>
                          {(tx.notes?.includes('MonAI') || tx.notes?.includes('AI') || tx.notes?.includes('#ai-categorized')) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI
                            </span>
                          )}
                          {tx.paymentMethod ? <span>• {tx.paymentMethod}</span> : null}
                          {tx.notes && !tx.notes.includes('Categorized by MonAI') ? <span>• {tx.notes}</span> : null}
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
                              : 'text-rose-600 dark:text-rose-400'
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

      {/* Pagination Footer */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-surface-border">
          <div className="text-xs text-zinc-400 font-mono text-center sm:text-left">
            Showing <span className="font-semibold text-foreground">{startItem}</span>–<span className="font-semibold text-foreground">{endItem}</span> of{' '}
            <span className="font-semibold text-foreground">{totalCount}</span> transactions
            {totalPages > 1 && <span className="text-zinc-500 ml-1.5">(30 per page)</span>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                }}
                disabled={safeCurrentPage <= 1}
                className="px-2.5 py-1.5 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-foreground transition-all flex items-center gap-1"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {getPageNumbers(safeCurrentPage, totalPages).map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-xs text-zinc-500 font-mono">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    onClick={() => {
                      setCurrentPage(p as number);
                    }}
                    className={`min-w-[28px] h-7 sm:min-w-[32px] sm:h-8 px-2 rounded-xl text-xs font-mono font-medium transition-all ${
                      safeCurrentPage === p
                        ? 'bg-primary text-white shadow-sm font-bold'
                        : 'border border-surface-border bg-surface-raised hover:bg-surface text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                }}
                disabled={safeCurrentPage >= totalPages}
                className="px-2.5 py-1.5 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-foreground transition-all flex items-center gap-1"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
