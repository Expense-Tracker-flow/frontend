'use client';

import React, { useState } from 'react';
import { Sparkles, PlusCircle, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';

interface AiFinancialBarProps {
  onQuickSubmit: (query: string) => void;
  onOpenExpenseModal: () => void;
  onOpenIncomeModal: () => void;
}

export const AiFinancialBar: React.FC<AiFinancialBarProps> = ({
  onQuickSubmit,
  onOpenExpenseModal,
  onOpenIncomeModal,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onQuickSubmit(prompt.trim());
    setPrompt('');
  };

  return (
    <div className="w-full space-y-3">
      {/* Search / AI Input Bar */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-primary/30 to-purple-500/20 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition duration-300" />
        <div className="relative flex items-center bg-white dark:bg-[#12141C] border border-surface-border rounded-2xl px-4 py-3.5 shadow-xl">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What happened with your money today? (e.g., 'Spent ₹450 on dinner', 'Received ₹50,000 salary')"
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none pr-10 font-normal"
          />
          <button
            type="submit"
            className="absolute right-3 p-1.5 rounded-xl bg-primary/20 text-primary-300 hover:bg-primary hover:text-white transition-all flex items-center justify-center"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Quick Action Pills */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenExpenseModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-medium transition-all"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>+ Expense</span>
          </button>
          <button
            onClick={onOpenIncomeModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-all"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+ Income</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center text-xs text-zinc-500 space-x-2">
          <span>Try:</span>
          <button
            onClick={() => onQuickSubmit('Spent ₹120 on coffee')}
            className="hover:text-zinc-300 underline underline-offset-4 decoration-zinc-700"
          >
            “Coffee ₹120”
          </button>
          <span>·</span>
          <button
            onClick={() => onQuickSubmit('Received ₹50,000 salary')}
            className="hover:text-zinc-300 underline underline-offset-4 decoration-zinc-700"
          >
            “Salary ₹50k”
          </button>
        </div>
      </div>
    </div>
  );
};
