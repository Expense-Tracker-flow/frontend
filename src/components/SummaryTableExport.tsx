'use client';

import React, { useState, useMemo } from 'react';
import { Transaction } from '../lib/types';
import { 
  Download, 
  FileSpreadsheet, 
  Printer, 
  Copy, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Calendar,
  CreditCard,
  Tag,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers
} from 'lucide-react';

interface SummaryTableExportProps {
  transactions: Transaction[];
  fromDate?: string;
  toDate?: string;
  currencySymbol?: string;
}

export const SummaryTableExport: React.FC<SummaryTableExportProps> = ({
  transactions,
  fromDate,
  toDate,
  currencySymbol = '₹',
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  // Filter transactions by type and search term
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        const cat = (t.category?.name || '').toLowerCase();
        const method = (t.paymentMethod || '').toLowerCase();
        return desc.includes(query) || notes.includes(query) || cat.includes(query) || method.includes(query);
      }
      return true;
    });
  }, [transactions, filterType, searchTerm]);

  // Total Inflows & Outflows for the filtered list
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredList.forEach((t) => {
      if (t.type === 'INCOME') income += t.amount || 0;
      else expense += t.amount || 0;
    });
    return {
      income,
      expense,
      net: income - expense,
      count: filteredList.length,
    };
  }, [filteredList]);

  // Paginated list
  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // CSV Export logic
  const handleExportCSV = () => {
    if (filteredList.length === 0) return;

    const dateRangeLabel = fromDate && toDate 
      ? `${fromDate} to ${toDate}` 
      : fromDate 
      ? `From ${fromDate}` 
      : toDate 
      ? `Until ${toDate}` 
      : 'All Time';

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[] = [];

    // Header metadata block
    rows.push(['FIN-XL Financial Summary Report'].map(escapeCsv).join(','));
    rows.push(['Period:', dateRangeLabel].map(escapeCsv).join(','));
    rows.push(['Generated On:', new Date().toLocaleString('en-IN')].map(escapeCsv).join(','));
    rows.push(['Total Inflow:', `${currencySymbol}${totals.income.toFixed(2)}`].map(escapeCsv).join(','));
    rows.push(['Total Outflow:', `${currencySymbol}${totals.expense.toFixed(2)}`].map(escapeCsv).join(','));
    rows.push(['Net Savings:', `${currencySymbol}${totals.net.toFixed(2)}`].map(escapeCsv).join(','));
    rows.push(''); // blank line

    // Column Headers
    const headers = [
      'Date',
      'Type',
      'Category',
      'Description',
      'Details / Notes',
      'Payment Method',
      `Amount (${currencySymbol})`
    ];
    rows.push(headers.map(escapeCsv).join(','));

    // Data Rows
    filteredList.forEach((t) => {
      const row = [
        t.transactionDate ? t.transactionDate.split('T')[0] : '',
        t.type,
        t.category?.name || 'General',
        t.description || '',
        t.notes || '',
        t.paymentMethod || 'OTHER',
        t.type === 'INCOME' ? `+${t.amount.toFixed(2)}` : `-${t.amount.toFixed(2)}`,
      ];
      rows.push(row.map(escapeCsv).join(','));
    });

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `FIN-XL_Summary_${fromDate || 'all'}_to_${toDate || 'date'}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy quick summary to clipboard
  const handleCopySummary = () => {
    const text = [
      `📊 FIN-XL Financial Summary (${fromDate || 'Start'} to ${toDate || 'End'})`,
      `• Total Inflow: ${currencySymbol}${totals.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `• Total Outflow: ${currencySymbol}${totals.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `• Net Savings: ${currencySymbol}${totals.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `• Transactions: ${totals.count} entries`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-surface border border-surface-border rounded-3xl p-4 sm:p-7 shadow-sm space-y-5">
      {/* 1. Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Detailed Ledger & Export
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
              {filteredList.length} Entries
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Tabular breakdown of filtered expenses and income with complete metadata
          </p>
        </div>

        {/* Export and Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export to CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredList.length === 0}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            title="Download CSV for Excel or Google Sheets"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Copy Summary Text */}
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-surface-raised hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground text-xs font-medium border border-surface-border transition-colors active:scale-95"
            title="Copy summary snapshot"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Print / PDF Trigger */}
          <button
            onClick={handlePrint}
            className="hidden sm:inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-surface-raised hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground text-xs font-medium border border-surface-border transition-colors active:scale-95"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. Controls Bar: Filter Tabs & Live Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Type Filter Buttons */}
        <div className="flex items-center space-x-1 bg-surface-raised p-1 rounded-2xl border border-surface-border self-start">
          <button
            onClick={() => { setFilterType('ALL'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterType === 'ALL'
                ? 'bg-surface text-foreground font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-foreground'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => { setFilterType('EXPENSE'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1 ${
              filterType === 'EXPENSE'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-foreground'
            }`}
          >
            <ArrowDownRight className="w-3 h-3 text-rose-500" />
            <span>Expenses</span>
          </button>
          <button
            onClick={() => { setFilterType('INCOME'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1 ${
              filterType === 'INCOME'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span>Income</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search description, notes, category..."
            className="w-full bg-surface-raised border border-surface-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* 3. Tabular Ledger */}
      {filteredList.length === 0 ? (
        <div className="py-12 text-center space-y-2 border border-dashed border-surface-border rounded-2xl">
          <FileSpreadsheet className="w-8 h-8 text-zinc-400 mx-auto stroke-[1.5]" />
          <p className="text-xs font-medium text-foreground">No records found</p>
          <p className="text-[11px] text-zinc-400">
            Try adjusting your date range or filter criteria above.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-border">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-raised/70 border-b border-surface-border text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-3.5 font-semibold">Date</th>
                <th className="py-3 px-3.5 font-semibold">Type</th>
                <th className="py-3 px-3.5 font-semibold">Category</th>
                <th className="py-3 px-3.5 font-semibold">Description & Details</th>
                <th className="py-3 px-3.5 font-semibold">Method</th>
                <th className="py-3 px-3.5 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paginatedList.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                return (
                  <tr 
                    key={tx.id}
                    className="hover:bg-surface-raised/40 transition-colors group"
                  >
                    {/* Date */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-zinc-500">
                      {formatDate(tx.transactionDate)}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isIncome 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {isIncome ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                        <span>{isIncome ? 'Income' : 'Expense'}</span>
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tx.category?.color || (isIncome ? '#10B981' : '#6366F1') }}
                        />
                        <span className="font-medium text-foreground text-[11px]">
                          {tx.category?.name || 'General'}
                        </span>
                      </div>
                    </td>

                    {/* Description & Details / Notes */}
                    <td className="py-3 px-3.5 max-w-xs sm:max-w-sm">
                      <div className="font-medium text-foreground truncate">
                        {tx.description}
                      </div>
                      {tx.notes && (
                        <div className="text-[10px] text-zinc-400 italic truncate mt-0.5">
                          {tx.notes}
                        </div>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-surface-raised border border-surface-border text-zinc-500">
                        {tx.paymentMethod?.replace('_', ' ') || 'OTHER'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono font-bold text-xs">
                      <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {isIncome ? '+' : '-'}{currencySymbol}{tx.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Table Footer */}
            <tfoot>
              <tr className="bg-surface-raised/80 border-t-2 border-surface-border text-xs font-semibold">
                <td colSpan={3} className="py-3 px-3.5 text-zinc-500 font-mono text-[11px]">
                  Filtered Total ({filteredList.length} items)
                </td>
                <td colSpan={2} className="py-3 px-3.5 text-zinc-400 text-[11px] font-mono">
                  Inflow: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{currencySymbol}{totals.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> • Outflow: <span className="text-rose-600 dark:text-rose-400 font-bold">-{currencySymbol}{totals.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </td>
                <td className="py-3 px-3.5 text-right font-mono font-extrabold text-xs">
                  <span className={totals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    Net: {totals.net >= 0 ? '+' : ''}{currencySymbol}{totals.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 4. Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-zinc-400 font-mono">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-surface-border bg-surface-raised hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-surface-border bg-surface-raised hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
