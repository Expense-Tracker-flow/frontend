'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  User, 
  Sparkles, 
  Bot, 
  Wallet, 
  PieChart, 
  TrendingUp, 
  Calendar, 
  Receipt,
  HelpCircle,
  Clock,
  FolderPlus,
  Trash2,
  BarChart3,
  Terminal,
  X,
  BookOpen,
  Command,
  Zap,
  Copy,
  Check,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Tag
} from 'lucide-react';
import { Category, Transaction, TransactionType, DashboardSummary, AutomationRule } from '../lib/types';
import { api } from '../lib/api';

export interface SlashCommand {
  command: string;
  syntax: string;
  description: string;
  badge: string;
  badgeColor: string;
  iconType: 'income' | 'expense' | 'category' | 'summary' | 'recent' | 'clear' | 'help';
  template: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/income',
    syntax: '/income <amount> <description>',
    description: 'Record incoming money or salary',
    badge: 'INCOME',
    badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    iconType: 'income',
    template: '/income ',
  },
  {
    command: '/expense',
    syntax: '/expense <amount> <description>',
    description: 'Record outgoing spending or bill',
    badge: 'EXPENSE',
    badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    iconType: 'expense',
    template: '/expense ',
  },
  {
    command: '/category',
    syntax: '/category <name>',
    description: 'Create a new expense or income category',
    badge: 'ACTION',
    badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    iconType: 'category',
    template: '/category ',
  },
  {
    command: '/summary',
    syntax: '/summary',
    description: 'View total balance, income & expense overview',
    badge: 'QUERY',
    badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    iconType: 'summary',
    template: '/summary',
  },
  {
    command: '/recent',
    syntax: '/recent',
    description: 'List your latest logged transactions',
    badge: 'HISTORY',
    badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    iconType: 'recent',
    template: '/recent',
  },
  {
    command: '/clear',
    syntax: '/clear',
    description: 'Clear chat conversation history',
    badge: 'SYSTEM',
    badgeColor: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    iconType: 'clear',
    template: '/clear',
  },
  {
    command: '/help',
    syntax: '/help',
    description: 'Show all available commands and natural language tips',
    badge: 'HELP',
    badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    iconType: 'help',
    template: '/help',
  },
];

export interface ChatWidgetData {
  type: 'TRANSACTION_CONFIRMATION' | 'MULTI_TRANSACTIONS' | 'BALANCE_CARD' | 'SPEND_SUMMARY' | 'CATEGORY_QUERY' | 'RECENT_TRANSACTIONS' | 'INSIGHT' | 'CATEGORY_CREATED';
  title?: string;
  amount?: number;
  currencySymbol?: string;
  items?: Array<{ label: string; value: string | number; sub?: string }>;
  transaction?: Transaction;
  transactions?: Transaction[];
  category?: Category;
  advice?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  widget?: ChatWidgetData;
}

interface ExpenseChatProps {
  userName: string;
  currencySymbol: string;
  categories: Category[];
  transactions?: Transaction[];
  summary?: DashboardSummary;
  onTransactionAdded: (transaction?: Transaction) => void;
  onCategoryAdded?: (category: Category) => void;
  onAddAutomation?: (rule: AutomationRule) => void;
  onOpenExpenseModal: () => void;
  onOpenIncomeModal: () => void;
}

export const ExpenseChat: React.FC<ExpenseChatProps> = ({
  userName,
  currencySymbol,
  categories,
  transactions = [],
  summary,
  onTransactionAdded,
  onCategoryAdded,
  onAddAutomation,
  onOpenExpenseModal,
  onOpenIncomeModal,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [isCategoryDismissed, setIsCategoryDismissed] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState(0);
  const [isPaymentDismissed, setIsPaymentDismissed] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<'slash' | 'nlp' | 'auto' | 'query'>('slash');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeInputRef = useRef<HTMLInputElement>(null);

  const handleApplyGuidePrompt = (promptText: string, autoRun = false) => {
    setIsGuideOpen(false);
    if (autoRun) {
      handleSendMessage(promptText);
    } else {
      setInput(promptText);
      setTimeout(() => {
        activeInputRef.current?.focus();
      }, 50);
    }
  };

  const handleCopyGuidePrompt = (e: React.MouseEvent, promptText: string) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(promptText);
      setCopiedPrompt(promptText);
      setTimeout(() => setCopiedPrompt(null), 1800);
    }
  };

  const handlePillClick = (prefix: '/expense ' | '/income ', targetRef?: React.RefObject<HTMLInputElement>) => {
    if (input.startsWith(prefix.trim())) {
      // Toggle off prefix
      const remainder = input.replace(new RegExp('^' + prefix.trim() + '\\s*'), '');
      setInput(remainder);
    } else {
      // Replace existing slash prefix or prepend
      const remainder = input.replace(/^\/(expense|income)\s*/, '');
      setInput(prefix + remainder);
    }
    setTimeout(() => {
      targetRef?.current?.focus();
      activeInputRef.current?.focus();
    }, 20);
  };

  // Slash commands state & filtering
  const isSlashActive = input.startsWith('/') && !input.slice(1).includes(' ');
  const slashFilterQuery = isSlashActive ? input.slice(1).toLowerCase().trim() : '';

  const filteredSlashCommands = useMemo(() => {
    if (!isSlashActive) return [];
    if (!slashFilterQuery) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((cmd) =>
      cmd.command.slice(1).toLowerCase().startsWith(slashFilterQuery) ||
      cmd.syntax.toLowerCase().includes(slashFilterQuery) ||
      cmd.description.toLowerCase().includes(slashFilterQuery)
    );
  }, [isSlashActive, slashFilterQuery]);

  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [slashFilterQuery]);

  const selectSlashCommand = (cmd: SlashCommand) => {
    if (cmd.command === '/clear') {
      handleClearChat();
      setInput('');
      return;
    }
    if (cmd.command === '/summary' || cmd.command === '/recent' || cmd.command === '/help') {
      handleSendMessage(cmd.command);
      setInput('');
      return;
    }
    // For /income, /expense, /category:
    setInput(cmd.template);
    setTimeout(() => {
      inputRef.current?.focus();
      activeInputRef.current?.focus();
    }, 10);
  };

  // Payment suggestions state & filtering (triggered when typing "by " or "via ")
  const PAYMENT_SUGGESTIONS = useMemo(() => [
    { label: 'Cash', value: 'CASH', color: '#10B981' },
    { label: 'UPI', value: 'UPI', color: '#3B82F6' },
    { label: 'Credit Card', value: 'CREDIT_CARD', color: '#8B5CF6' },
    { label: 'Debit Card', value: 'DEBIT_CARD', color: '#F59E0B' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER', color: '#6366F1' },
  ], []);

  const paymentTriggerMatch = useMemo(() => {
    if (isSlashActive) return null;
    const match = input.match(/(?:^|\s)(by|via)(?:\s+([a-zA-Z0-9\-_ ]*))?$/i);
    if (!match) return null;
    const keyword = match[1];
    const query = (match[2] || '').trim().toLowerCase();
    return { keyword, query };
  }, [input, isSlashActive]);

  const filteredPaymentMethods = useMemo(() => {
    if (!paymentTriggerMatch) return [];
    const q = paymentTriggerMatch.query;
    if (!q) return PAYMENT_SUGGESTIONS;
    return PAYMENT_SUGGESTIONS.filter((p) => p.label.toLowerCase().includes(q));
  }, [paymentTriggerMatch, PAYMENT_SUGGESTIONS]);

  useEffect(() => {
    setIsPaymentDismissed(false);
    setSelectedPaymentIndex(0);
  }, [paymentTriggerMatch?.query, paymentTriggerMatch?.keyword]);

  const selectPaymentSuggestion = (payment: { label: string; value: string }) => {
    if (!paymentTriggerMatch) return;
    const { keyword } = paymentTriggerMatch;
    const regex = new RegExp(`(\\b${keyword}\\b)(?:\\s+[a-zA-Z0-9\\-_ ]*)?$`, 'i');
    const newInput = input.replace(regex, `$1 ${payment.label} `);
    setInput(newInput);
    setIsPaymentDismissed(true);
    setTimeout(() => {
      inputRef.current?.focus();
      activeInputRef.current?.focus();
    }, 20);
  };

  // Category suggestions state & filtering (triggered when typing "for " or "on ")
  const categoryTriggerMatch = useMemo(() => {
    if (isSlashActive || paymentTriggerMatch) return null;
    const match = input.match(/(?:^|\s)(for|on)(?:\s+([a-zA-Z0-9\-_& ]*))?$/i);
    if (!match) return null;
    if (/\b(by|via)\b/i.test(match[2] || '')) return null;
    const keyword = match[1];
    const query = (match[2] || '').trim().toLowerCase();
    return { keyword, query };
  }, [input, isSlashActive, paymentTriggerMatch]);

  const filteredCategories = useMemo(() => {
    if (!categoryTriggerMatch) return [];
    const q = categoryTriggerMatch.query;

    const lowerInput = input.toLowerCase();
    const isIncomeHint =
      lowerInput.startsWith('/income') ||
      /\b(salary|received|earned|credited|bonus|freelance|dividend|refund|interest|income)\b/i.test(lowerInput);

    const targetType: TransactionType = isIncomeHint ? 'INCOME' : 'EXPENSE';

    // Strictly show ONLY categories matching the active transaction type (INCOME vs EXPENSE)
    let list = categories.filter((c) => c.type === targetType);

    const generalCat = list.find((c) => c.name.toLowerCase() === 'general');
    if (!generalCat) {
      const fallbackGeneral: Category = {
        id: `general-${targetType.toLowerCase()}`,
        name: 'General',
        color: targetType === 'INCOME' ? '#10B981' : '#64748B',
        icon: 'tag',
        type: targetType,
        isSystem: true,
      };
      list = [fallbackGeneral, ...list];
    }

    if (q) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      // General always at top of options
      if (a.name.toLowerCase() === 'general') return -1;
      if (b.name.toLowerCase() === 'general') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [categoryTriggerMatch, categories, input]);

  useEffect(() => {
    setIsCategoryDismissed(false);
    setSelectedCategoryIndex(0);
  }, [categoryTriggerMatch?.query, categoryTriggerMatch?.keyword]);

  const selectCategorySuggestion = (cat: Category) => {
    if (!categoryTriggerMatch) return;
    const { keyword } = categoryTriggerMatch;
    const regex = new RegExp(`(\\b${keyword}\\b)(?:\\s+[a-zA-Z0-9\\-_& ]*)?$`, 'i');
    const newInput = input.replace(regex, `$1 ${cat.name} `);
    setInput(newInput);
    setIsCategoryDismissed(true);
    setTimeout(() => {
      inputRef.current?.focus();
      activeInputRef.current?.focus();
    }, 20);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSlashActive && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        selectSlashCommand(filteredSlashCommands[selectedSlashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput('');
        return;
      }
    }

    if (!isSlashActive && paymentTriggerMatch && filteredPaymentMethods.length > 0 && !isPaymentDismissed) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedPaymentIndex((prev) => (prev + 1) % filteredPaymentMethods.length);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedPaymentIndex((prev) => (prev - 1 + filteredPaymentMethods.length) % filteredPaymentMethods.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        selectPaymentSuggestion(filteredPaymentMethods[selectedPaymentIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsPaymentDismissed(true);
        return;
      }
    }

    if (!isSlashActive && categoryTriggerMatch && filteredCategories.length > 0 && !isCategoryDismissed) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCategoryIndex((prev) => (prev + 1) % filteredCategories.length);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCategoryIndex((prev) => (prev - 1 + filteredCategories.length) % filteredCategories.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        selectCategorySuggestion(filteredCategories[selectedCategoryIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsCategoryDismissed(true);
        return;
      }
    }
  };

  const renderSlashCommandPalette = () => {
    if (!isSlashActive || filteredSlashCommands.length === 0) return null;

    return (
      <div className="absolute bottom-full mb-2.5 left-0 right-0 sm:left-1 sm:right-1 bg-[#12141C]/95 backdrop-blur-xl border border-[#262A3B] rounded-2xl shadow-2xl overflow-hidden p-1.5 z-40 text-left transition-all animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#262A3B]/60 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5 font-semibold">
            <Terminal className="w-3 h-3 text-primary" />
            <span>Slash Commands</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            Claude Code Mode
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {filteredSlashCommands.map((cmd, idx) => {
            const isSelected = idx === selectedSlashIndex;
            return (
              <button
                key={cmd.command}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSlashCommand(cmd);
                }}
                onMouseEnter={() => setSelectedSlashIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all text-xs ${
                  isSelected
                    ? 'bg-primary/20 border border-primary/35 text-white shadow-sm'
                    : 'border border-transparent text-zinc-400 hover:text-white hover:bg-surface-raised'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      cmd.iconType === 'income'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : cmd.iconType === 'expense'
                        ? 'bg-rose-500/15 text-rose-400'
                        : cmd.iconType === 'category'
                        ? 'bg-indigo-500/15 text-indigo-400'
                        : cmd.iconType === 'summary'
                        ? 'bg-sky-500/15 text-sky-400'
                        : cmd.iconType === 'recent'
                        ? 'bg-purple-500/15 text-purple-400'
                        : cmd.iconType === 'help'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {cmd.iconType === 'income' && <ArrowUpRight className="w-4 h-4" />}
                    {cmd.iconType === 'expense' && <ArrowDownRight className="w-4 h-4" />}
                    {cmd.iconType === 'category' && <FolderPlus className="w-4 h-4" />}
                    {cmd.iconType === 'summary' && <BarChart3 className="w-4 h-4" />}
                    {cmd.iconType === 'recent' && <Clock className="w-4 h-4" />}
                    {cmd.iconType === 'help' && <HelpCircle className="w-4 h-4" />}
                    {cmd.iconType === 'clear' && <Trash2 className="w-4 h-4" />}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white text-xs">{cmd.command}</span>
                      <span className="text-[10px] font-mono text-zinc-500 truncate">{cmd.syntax.replace(cmd.command, '').trim()}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">{cmd.description}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                  <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md border ${cmd.badgeColor}`}>
                    {cmd.badge}
                  </span>
                  {isSelected && (
                    <span className="hidden sm:inline-block text-[10px] font-mono text-primary font-bold">
                      ↵
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-3 py-1.5 border-t border-[#262A3B]/60 mt-1 flex items-center justify-between text-[9px] font-mono text-zinc-500">
          <span>Use <strong className="text-zinc-400">↑ ↓</strong> to navigate</span>
          <span><strong className="text-zinc-400">Tab</strong> or <strong className="text-zinc-400">Enter</strong> to select</span>
          <span><strong className="text-zinc-400">Esc</strong> to dismiss</span>
        </div>
      </div>
    );
  };

  const renderSuggestionsDropdown = (placement: 'down' | 'up' = 'down') => {
    if (isSlashActive) return null;

    const positionClasses =
      placement === 'down'
        ? 'top-full mt-2 animate-in fade-in slide-in-from-top-1 duration-150'
        : 'bottom-full mb-2 animate-in fade-in slide-in-from-bottom-1 duration-150';

    // 1. Payment suggestions (triggered when typing "by " or "via ")
    if (paymentTriggerMatch && filteredPaymentMethods.length > 0 && !isPaymentDismissed) {
      return (
        <div
          className={`absolute ${positionClasses} left-0 right-0 sm:left-2 sm:right-auto sm:w-72 max-w-sm bg-surface/95 dark:bg-[#12141C]/95 backdrop-blur-xl border border-surface-border dark:border-[#262A3B] rounded-2xl shadow-2xl p-1.5 z-50 text-left transition-all`}
        >
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredPaymentMethods.map((p, idx) => {
              const isSelected = idx === selectedPaymentIndex;
              return (
                <button
                  key={p.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectPaymentSuggestion(p);
                  }}
                  onMouseEnter={() => setSelectedPaymentIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all text-xs ${
                    isSelected
                      ? 'bg-primary/15 border border-primary/30 text-primary font-medium shadow-2xs'
                      : 'border border-transparent text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.label}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono text-primary font-bold flex-shrink-0">
                      ↵
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // 2. Category suggestions (triggered when typing "for " or "on ")
    if (categoryTriggerMatch && filteredCategories.length > 0 && !isCategoryDismissed) {
      return (
        <div
          className={`absolute ${positionClasses} left-0 right-0 sm:left-2 sm:right-auto sm:w-72 max-w-sm bg-surface/95 dark:bg-[#12141C]/95 backdrop-blur-xl border border-surface-border dark:border-[#262A3B] rounded-2xl shadow-2xl p-1.5 z-50 text-left transition-all`}
        >
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredCategories.map((cat, idx) => {
              const isSelected = idx === selectedCategoryIndex;
              const dotColor = cat.color || (cat.type === 'INCOME' ? '#10b981' : '#f43f5e');
              return (
                <button
                  key={cat.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCategorySuggestion(cat);
                  }}
                  onMouseEnter={() => setSelectedCategoryIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all text-xs ${
                    isSelected
                      ? 'bg-primary/15 border border-primary/30 text-primary font-medium shadow-2xs'
                      : 'border border-transparent text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                        cat.type === 'INCOME'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {cat.type === 'INCOME' ? 'Income' : 'Expense'}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-mono text-primary font-bold">
                        ↵
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderGuideModal = () => {
    if (!isGuideOpen) return null;

    const GUIDE_ITEMS = {
      nlp: [
        {
          syntax: '/expense 450 for Food & Dining by UPI',
          desc: 'Use "for" for Category and "by" for Payment Type',
          badge: 'Smart Log',
          badgeStyle: 'bg-primary/10 text-primary border border-primary/20',
          autoRun: false,
        },
        {
          syntax: '/income 75000 for Salary & Inflows by Bank Transfer',
          desc: 'Directly set category with "for" and payment with "by"',
          badge: 'Smart Log',
          badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          autoRun: false,
        },
        {
          syntax: 'Spent 250 on pizza for Food & Dining by UPI',
          desc: 'Records ₹250 under Food & Dining with UPI payment',
          badge: 'Expense',
          badgeStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
          autoRun: false,
        },
        {
          syntax: 'Salary credited 75000 for Salary by Bank',
          desc: 'Records ₹75,000 under Salary & Inflows via Bank Transfer',
          badge: 'Income',
          badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          autoRun: false,
        },
        {
          syntax: 'Bought groceries 1200 for Groceries by Cash',
          desc: 'Records ₹1,200 under Groceries paid in Cash',
          badge: 'Expense',
          badgeStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
          autoRun: false,
        },
        {
          syntax: 'Friend sent 500 for General by UPI',
          desc: 'Records ₹500 reimbursement under General category via UPI',
          badge: 'Income',
          badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          autoRun: false,
        },
      ],
      slash: [
        {
          syntax: '/expense 450 for Food & Dining by UPI',
          desc: 'Logs expense using "for" for category and "by" for payment',
          badge: 'Shortcut',
          badgeStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
          autoRun: false,
        },
        {
          syntax: '/income 50000 for Salary by Bank Transfer',
          desc: 'Logs income using "for" for category and "by" for payment',
          badge: 'Shortcut',
          badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          autoRun: false,
        },
        {
          syntax: '/summary',
          desc: 'Shows this month\'s total income, spending, and net balance',
          badge: 'Instant',
          badgeStyle: 'bg-primary/10 text-primary border border-primary/20',
          autoRun: true,
        },
        {
          syntax: '/recent',
          desc: 'Shows your latest 5 logged transactions with dates and categories',
          badge: 'Instant',
          badgeStyle: 'bg-primary/10 text-primary border border-primary/20',
          autoRun: true,
        },
        {
          syntax: '/category Freelance',
          desc: 'Creates a brand new custom category straight from chat',
          badge: 'Setup',
          badgeStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
          autoRun: false,
        },
      ],
      auto: [
        {
          syntax: 'Recurring rent 15000 every month on day 5',
          desc: 'Schedules a monthly rule for house rent on the 5th',
          badge: 'Monthly',
          badgeStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          autoRun: false,
        },
        {
          syntax: 'Subscription Netflix 649 every month',
          desc: 'Tracks recurring entertainment subscriptions automatically',
          badge: 'Subscription',
          badgeStyle: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
          autoRun: false,
        },
        {
          syntax: 'Monthly electricity bill 2200 on day 10',
          desc: 'Auto-schedules recurring utility bills into your rules list',
          badge: 'Utility',
          badgeStyle: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
          autoRun: false,
        },
      ],
      query: [
        {
          syntax: 'What is my current balance?',
          desc: 'Shows your live balance, month income, and spending',
          badge: 'Balance',
          badgeStyle: 'bg-primary/10 text-primary border border-primary/20',
          autoRun: true,
        },
        {
          syntax: 'Show my latest expenses',
          desc: 'Retrieves your recent spending history in a glance',
          badge: 'Activity',
          badgeStyle: 'bg-primary/10 text-primary border border-primary/20',
          autoRun: true,
        },
        {
          syntax: 'How much did I spend this month?',
          desc: 'Calculates your total expenses and top spending categories',
          badge: 'Insights',
          badgeStyle: 'bg-primary/10 text-primary border border-primary/20',
          autoRun: true,
        },
      ],
    };

    const currentItems = GUIDE_ITEMS[guideTab];

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
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-surface-border flex-shrink-0 bg-surface">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground tracking-tight">
                    MonAI Guide
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Click any example below to try it in chat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors"
                title="Close guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Tabs Switcher */}
            <div className="px-5 sm:px-6 pt-3 pb-2.5 border-b border-surface-border bg-surface flex-shrink-0">
              <div className="grid grid-cols-4 gap-1 p-1 bg-surface-raised border border-surface-border rounded-2xl">
                <button
                  type="button"
                  onClick={() => setGuideTab('nlp')}
                  className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
                    guideTab === 'nlp'
                      ? 'bg-surface text-foreground shadow-xs border border-surface-border'
                      : 'text-zinc-500 hover:text-foreground'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('slash')}
                  className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
                    guideTab === 'slash'
                      ? 'bg-surface text-foreground shadow-xs border border-surface-border'
                      : 'text-zinc-500 hover:text-foreground'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Shortcuts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('auto')}
                  className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
                    guideTab === 'auto'
                      ? 'bg-surface text-foreground shadow-xs border border-surface-border'
                      : 'text-zinc-500 hover:text-foreground'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Autos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('query')}
                  className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
                    guideTab === 'query'
                      ? 'bg-surface text-foreground shadow-xs border border-surface-border'
                      : 'text-zinc-500 hover:text-foreground'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Insights</span>
                </button>
              </div>
            </div>

            {/* Quick Tip Banner */}
            <div className="px-5 sm:px-6 py-2.5 bg-primary/5 border-b border-primary/10 flex items-center space-x-2 text-xs text-zinc-600 dark:text-zinc-300 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              {guideTab === 'nlp' && (
                <span>
                  💡 <strong>Smart Chat Syntax:</strong> Use <code className="font-mono text-primary font-bold">for</code> for Category (e.g. <em>for Food</em>) and <code className="font-mono text-primary font-bold">by</code> for Payment Type (e.g. <em>by UPI</em>).
                </span>
              )}
              {guideTab === 'slash' && (
                <span>
                  Type <code className="font-mono text-primary font-bold">/expense 450 for &lt;Category&gt; by &lt;Payment&gt;</code> or type <code className="font-mono text-primary font-bold">/</code> for shortcut commands.
                </span>
              )}
              {guideTab === 'auto' && (
                <span>Schedule recurring transactions anytime (e.g. <em>Rent 15000 on 5th of every month</em>).</span>
              )}
              {guideTab === 'query' && (
                <span>Ask questions anytime to view live balance, spending summary, or category breakdowns.</span>
              )}
            </div>

            {/* Items List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 bg-surface">
              {currentItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleApplyGuidePrompt(item.syntax, item.autoRun)}
                  className="p-3.5 rounded-2xl bg-surface-raised border border-surface-border hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center space-x-1.5">
                        <span className="truncate">&ldquo;{item.syntax}&rdquo;</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                        {item.desc}
                      </p>
                    </div>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg flex-shrink-0 ${item.badgeStyle}`}>
                      {item.badge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-border/60">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Tap card to try
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyGuidePrompt(e, item.syntax);
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-foreground hover:bg-surface border border-transparent hover:border-surface-border text-[11px] font-medium transition-all"
                        title="Copy to clipboard"
                      >
                        {copiedPrompt === item.syntax ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyGuidePrompt(item.syntax, item.autoRun);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-primary hover:bg-primary-600 text-white text-[11px] font-semibold transition-all shadow-xs"
                      >
                        <span>{item.autoRun ? 'Run Now ↵' : 'Try in Chat ↵'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-3 border-t border-surface-border bg-surface flex items-center justify-between gap-2 text-xs text-zinc-500 flex-shrink-0">
              <span className="text-[11px]">
                Tip: You can also use the traditional <strong className="text-foreground">+ Transaction</strong> button anytime.
              </span>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-border border border-surface-border text-foreground text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // Load chat history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flow_chat_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);

  // Save messages to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('flow_chat_history', JSON.stringify(messages.slice(-30)));
    }
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('flow_chat_history');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isProcessing]);

  // Compute top 4 most used / most frequent suggestions from user's history
  const suggestions = useMemo(() => {
    const defaultTemplates = [
      { title: 'Coffee', desc: `Spent ${currencySymbol}120 on cappuccino`, prompt: `Spent ${currencySymbol}120 on coffee` },
      { title: 'Lunch', desc: `Paid ${currencySymbol}450 for team lunch`, prompt: `Spent ${currencySymbol}450 on lunch` },
      { title: 'Groceries', desc: `Bought ${currencySymbol}1,400 groceries`, prompt: `Bought ${currencySymbol}1,400 groceries` },
      { title: 'Salary', desc: `Received ${currencySymbol}50,000 monthly salary`, prompt: `Received ${currencySymbol}50,000 monthly salary` },
    ];

    if (!transactions || transactions.length === 0) {
      return defaultTemplates;
    }

    const frequencyMap = new Map<
      string,
      { count: number; lastAmount: number; type: TransactionType; categoryName?: string }
    >();

    transactions.forEach((tx) => {
      const normalizedTitle = (tx.description || '').trim();
      if (!normalizedTitle) return;
      const existing = frequencyMap.get(normalizedTitle);
      if (existing) {
        existing.count += 1;
        existing.lastAmount = tx.amount;
      } else {
        frequencyMap.set(normalizedTitle, {
          count: 1,
          lastAmount: tx.amount,
          type: tx.type,
          categoryName: tx.category?.name,
        });
      }
    });

    const sorted = Array.from(frequencyMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4);

    if (sorted.length === 0) {
      return defaultTemplates;
    }

    const computed = sorted.map(([title, data]) => {
      const isIncome = data.type === 'INCOME';
      const formattedAmount = `${currencySymbol}${data.lastAmount.toLocaleString('en-IN')}`;
      const verb = isIncome ? 'Received' : 'Spent';
      return {
        title,
        desc: `${verb} ${formattedAmount} • Used ${data.count} ${data.count === 1 ? 'time' : 'times'}`,
        prompt: isIncome
          ? `Received ${formattedAmount} for ${title}`
          : `Spent ${formattedAmount} on ${title}`,
      };
    });

    if (computed.length < 4) {
      for (const def of defaultTemplates) {
        if (!computed.some((c) => c.title.toLowerCase() === def.title.toLowerCase())) {
          computed.push(def);
          if (computed.length === 4) break;
        }
      }
    }

    return computed;
  }, [transactions, currencySymbol]);

  // =========================================================================
  // 🧠 ENHANCED AI AGENT ENGINE (With Edge-Case & Context Handling)
  // =========================================================================

  // Helper 1: Extract Date with relative & past dates support
  const extractDate = (text: string): { dateStr: string; label: string } => {
    const lower = text.toLowerCase();
    const now = new Date();

    if (lower.includes('yesterday')) {
      const d = new Date(Date.now() - 86400000);
      return { dateStr: d.toISOString().split('T')[0], label: 'Yesterday' };
    }

    if (lower.includes('day before yesterday')) {
      const d = new Date(Date.now() - 2 * 86400000);
      return { dateStr: d.toISOString().split('T')[0], label: '2 days ago' };
    }

    const daysAgoMatch = lower.match(/(\d+)\s*days?\s*ago/i);
    if (daysAgoMatch && daysAgoMatch[1]) {
      const days = parseInt(daysAgoMatch[1], 10);
      const d = new Date(Date.now() - days * 86400000);
      return { dateStr: d.toISOString().split('T')[0], label: `${days} days ago` };
    }

    // Default to today
    return { dateStr: now.toISOString().split('T')[0], label: 'Today' };
  };

  // Helper 2: Disambiguate Inflow vs Outflow with refund/return/repayment edge cases
  const classifyTransactionType = (text: string): TransactionType => {
    const lower = text.toLowerCase().trim();

    // 1. Explicit Slash Commands have highest precedence
    if (lower.startsWith('/income') || lower.startsWith('/inflow') || lower.startsWith('/inc')) {
      return 'INCOME';
    }
    if (lower.startsWith('/expense') || lower.startsWith('/spent') || lower.startsWith('/exp')) {
      return 'EXPENSE';
    }

    // 2. Priority Inflow patterns & keywords
    if (
      lower.includes('income') ||
      lower.includes('inflow') ||
      lower.includes('paid me') ||
      lower.includes('paid back') ||
      lower.includes('refund') ||
      lower.includes('cashback') ||
      lower.includes('reimburs') ||
      lower.includes('salary') ||
      lower.includes('dividend') ||
      lower.includes('freelance') ||
      lower.includes('bonus') ||
      lower.includes('credited') ||
      lower.includes('returned money') ||
      lower.includes('received') ||
      lower.includes('earned') ||
      lower.includes('got paid') ||
      lower.includes('stipend') ||
      lower.includes('revenue') ||
      lower.includes('profit') ||
      lower.includes('allowance') ||
      lower.includes('wage') ||
      lower.includes('deposit') ||
      lower.includes('interest credited')
    ) {
      // Edge case: "income tax" or "tax on income" is an EXPENSE
      if (lower.includes('income tax') || lower.includes('tax on income')) {
        return 'EXPENSE';
      }
      return 'INCOME';
    }

    // Default is Expense
    return 'EXPENSE';
  };

  // Helper 3: Robust Amount Extraction (prioritizes currency prefixes & avoids quantity counts)
  const extractAmount = (text: string): number => {
    // 1. Check for currency prefixed or suffixed amounts, or slash commands
    const primaryPattern = /(?:₹|\$|€|£|rs\.?|inr|for|cost|paid|spent|\/income|\/expense|\/inflow|\/spent|income|expense)\s*(\d*(?:\.\d+)?|\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|thousand)?/i;
    const match = text.match(primaryPattern);
    
    if (match && match[1]) {
      let val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        if (/k\b/i.test(match[0])) val *= 1000;
        return val;
      }
    }

    // 2. Check for abbreviation k with decimal (e.g. 1.5k, .5k)
    const kMatch = text.match(/(\d*(?:\.\d+)?)\s*k\b/i);
    if (kMatch && kMatch[1]) {
      const val = parseFloat(kMatch[1]);
      if (!isNaN(val) && val > 0) return val * 1000;
    }

    // 3. Fallback to any standalone number with 2 or more digits, or with decimal
    const numMatches = text.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/g);
    if (numMatches && numMatches.length > 0) {
      // If there are multiple numbers (e.g. "2 shirts for 1500"), pick the highest value as price
      const numbers = numMatches.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        return Math.max(...numbers);
      }
    }

    return 0;
  };

  // Helper 4: Weighted Category Semantic Matcher
  const resolveCategory = (text: string, type: TransactionType): string => {
    const lower = text.toLowerCase();

    // 0. Explicit match: user typed "for <category>" or "on <category>"
    const forMatch = text.match(/\b(?:for|on)\s+([^,.;\n]+?)(?:\s+(?:by|via|using|through|with)\b|$)/i);
    if (forMatch && forMatch[1]) {
      const explicitCat = forMatch[1].trim().toLowerCase();
      const matched = categories.find(
        (c) => c.name.toLowerCase() === explicitCat && c.type === type
      ) || categories.find(
        (c) => c.name.toLowerCase() === explicitCat
      ) || categories.find(
        (c) => (explicitCat.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(explicitCat)) && c.type === type
      ) || categories.find(
        (c) => explicitCat.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(explicitCat)
      );

      if (matched) return matched.name;
    }

    if (type === 'INCOME') {
      if (lower.includes('freelance') || lower.includes('project') || lower.includes('client') || lower.includes('contract')) return 'Freelance';
      if (lower.includes('dividend') || lower.includes('stock') || lower.includes('interest') || lower.includes('crypto')) return 'Investments';
      if (lower.includes('refund') || lower.includes('cashback') || lower.includes('reward')) return 'Refunds & Rewards';
      if (lower.includes('bonus') || lower.includes('gift')) return 'Bonus & Gifts';
      return 'Salary & Inflows';
    }

    const rules = [
      { cat: 'Food & Dining', words: ['coffee', 'tea', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'swiggy', 'zomato', 'snack', 'cafe', 'restaurant', 'mcdonalds', 'kfc', 'starbucks', 'drink', 'beer', 'bar'] },
      { cat: 'Transportation', words: ['uber', 'ola', 'cab', 'metro', 'petrol', 'diesel', 'fuel', 'flight', 'train', 'bus', 'auto', 'parking', 'toll', 'fare'] },
      { cat: 'Groceries', words: ['grocery', 'groceries', 'supermarket', 'blinkit', 'zepto', 'instamart', 'vegetables', 'fruits', 'milk', 'bread', 'eggs', 'provisions'] },
      { cat: 'Housing & Bills', words: ['rent', 'electricity', 'wifi', 'broadband', 'water', 'bill', 'maintenance', 'gas', 'cylinder', 'recharge', 'mobile bill'] },
      { cat: 'Entertainment', words: ['movie', 'cinema', 'theatre', 'netflix', 'spotify', 'prime', 'hotstar', 'concert', 'gaming', 'steam', 'game'] },
      { cat: 'Healthcare', words: ['doctor', 'medicine', 'pharmacy', 'hospital', 'clinic', 'tablet', 'medical', 'dentist', 'health', 'gym', 'fitness'] },
      { cat: 'Shopping', words: ['shirt', 'shoes', 'clothes', 'amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'electronics', 'gadget', 'laptop', 'phone', 'watch'] },
    ];

    for (const rule of rules) {
      if (rule.words.some(w => lower.includes(w))) {
        return rule.cat;
      }
    }

    return 'General';
  };

  // Helper 5: Clean Description Title with Proper Spacing
  const cleanTitle = (rawText: string, categoryFallback: string): string => {
    let title = rawText
      // 0. Remove slash commands e.g. /income, /expense, /inflow, /spent
      .replace(/^\s*\/(?:income|expense|inflow|spent|add|log|inc|exp)\s*/i, ' ')
      // 1. Remove relative dates
      .replace(/\b(?:yesterday|today|day before yesterday|\d+\s*days?\s*ago)\b/gi, ' ')
      // 2. Remove currency amounts with strict non-empty digit match
      .replace(/(?:₹|\$|€|£|rs\.?|inr)?\s*(?:\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:k|thousand)?|\b\d+k\b)/gi, ' ')
      // 3. Remove payment methods (including "by ...")
      .replace(/\b(?:by|via|with|using|through)\s+(?:upi|cash|credit\s*card|debit\s*card|card|gpay|paytm|phonepe|netbanking|bank\s*transfer)\b/gi, ' ')
      .replace(/\b(?:upi|cash|credit\s*card|debit\s*card|card|gpay|paytm|phonepe|netbanking|bank\s*transfer)\b/gi, ' ')
      // 3.5 Remove "for <category>" explicitly from title so description stays neat
      .replace(/\b(?:for|on)\s+[^,.;\n]+?(?=\s+(?:by|via|with|using|through)\b|$)/gi, ' ')
      // 4. Remove leading verbs and keywords
      .replace(/^\s*(?:i\s+)?(?:spent|paid|bought|received|got|added|recorded|purchase|purchased|income|expense|inflow)\s+(?:on|for|a|an|from|of)?\s*/i, ' ')
      // 5. Remove trailing prepositions
      .replace(/\b(?:for|on|at|in|to|from|by)\s*$/gi, ' ')
      // 6. Collapse spaces cleanly
      .replace(/\s+/g, ' ')
      .trim();

    if (!title || title.length < 2 || title.toLowerCase() === 'for' || title.toLowerCase() === 'on' || title.toLowerCase() === 'by') {
      return categoryFallback;
    }
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  // Main Agent Controller
  const processWithAIAgent = async (queryText: string): Promise<{ text: string; widget?: ChatWidgetData }> => {
    const q = queryText.toLowerCase().trim();

    // 0. SLASH COMMAND: /help
    if (q === '/help' || q === 'help') {
      return {
        text: `Here are the available **MonAI Chat Commands & Knowledge**:\n\n` +
          `💡 **Smart Keywords:**\n` +
          `• Use **\`for\`** to specify **Category** (e.g. *for Food & Dining*, *for Groceries*, *for General*)\n` +
          `• Use **\`by\`** to specify **Payment Type** (e.g. *by UPI*, *by Cash*, *by Card*, *by Bank Transfer*)\n\n` +
          `• **/expense <amount> for <category> by <payment>** — Record outgoing expense\n` +
          `  *Example: \`/expense 450 for Food & Dining by UPI\`*\n\n` +
          `• **/income <amount> for <category> by <payment>** — Record incoming money\n` +
          `  *Example: \`/income 50000 for Salary & Inflows by Bank Transfer\`*\n\n` +
          `• **/category <name>** — Create a new custom category\n` +
          `  *Example: \`/category Freelance Project\`*\n\n` +
          `• **/summary** — View total balance, income, expenses & savings rate\n\n` +
          `• **/recent** — List your latest recorded transactions\n\n` +
          `• **/clear** — Clear chat history\n\n` +
          `💡 *Tip: As you type \`for\` or \`by\`, live suggestions will appear right in the search bar!*`
      };
    }

    // 0. SLASH COMMAND: /clear
    if (q === '/clear' || q === 'clear') {
      handleClearChat();
      return {
        text: '✨ Conversation history has been cleared.'
      };
    }

    // 0. INTENT: Create New Category via Slash Command or Natural Language
    const isCategoryCreation =
      q.startsWith('/category') ||
      q.startsWith('/newcategory') ||
      q.startsWith('create category') ||
      q.startsWith('add category') ||
      q.startsWith('new category') ||
      q.startsWith('make category') ||
      q.startsWith('create expense category') ||
      q.startsWith('create income category') ||
      q.startsWith('add expense category') ||
      q.startsWith('add income category');

    if (isCategoryCreation) {
      const isIncome = q.includes('income') || q.includes('inflow') || q.includes('salary') || q.includes('revenue') || q.includes('dividend');
      const catType: TransactionType = isIncome ? 'INCOME' : 'EXPENSE';

      let cleanName = queryText
        .replace(/^\/(?:category|newcategory)\s+/i, '')
        .replace(/^(?:please\s+)?(?:create|add|new|make)\s+(?:a\s+)?(?:expense\s+|income\s+)?category\s+/i, '')
        .replace(/\b(?:for\s+income|for\s+expense|as\s+income|as\s+expense|type\s+income|type\s+expense)\b/gi, '')
        .replace(/\b(?:with\s+color|color)\s+#[0-9a-fA-F]{6}\b/gi, '')
        .trim();

      if (!cleanName) cleanName = 'Custom Category';
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

      const colorMatch = queryText.match(/#[0-9a-fA-F]{6}/);
      const defaultColors = catType === 'INCOME'
        ? ['#10B981', '#059669', '#34D399', '#0D9488', '#06B6D4']
        : ['#6366F1', '#EC4899', '#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6', '#14B8A6'];
      const chosenColor = colorMatch ? colorMatch[0] : defaultColors[Math.floor(Math.random() * defaultColors.length)];

      const res = await api.createCategory({
        name: cleanName,
        type: catType,
        icon: 'default',
        color: chosenColor,
      });

      if (res.success && res.data) {
        onCategoryAdded?.(res.data);
        return {
          text: `Created new **${catType === 'INCOME' ? 'Income' : 'Expense'}** category **"${res.data.name}"**! You can now log transactions under it.`,
          widget: {
            type: 'CATEGORY_CREATED',
            title: 'New Category Created',
            currencySymbol,
            category: res.data,
            items: [
              { label: 'Category Name', value: res.data.name },
              { label: 'Category Type', value: res.data.type },
              { label: 'Color Accent', value: res.data.color || chosenColor },
            ]
          }
        };
      } else {
        throw new Error(res.message || 'Failed to create category');
      }
    }

    // 0.5. INTENT: Create Scheduled Date-Based Automation Rule via Chat
    const isAutomationCreation =
      q.startsWith('automate') ||
      q.startsWith('schedule') ||
      q.startsWith('recurring') ||
      q.includes('on 1st of every month') ||
      q.includes('of every month') ||
      q.includes('every month on');

    if (isAutomationCreation) {
      const isIncome = q.includes('income') || q.includes('salary') || q.includes('dividend') || q.includes('inflow');
      const autoType: TransactionType = isIncome ? 'INCOME' : 'EXPENSE';
      const autoAmount = extractAmount(queryText) || 1000;

      // Extract day of month (e.g. 1st, 15th, 30th, on 1, on 5)
      const dayMatch = queryText.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      let dayOfMonth = 1;
      if (dayMatch) {
        const parsed = parseInt(dayMatch[1]);
        if (parsed >= 1 && parsed <= 31) {
          dayOfMonth = parsed;
        }
      }

      // Title extraction
      let autoTitle = queryText
        .replace(/^(?:automate|schedule|recurring|set\s+recurring)\s+/i, '')
        .replace(/(?:₹|\$|€|£|rs\.?|inr)?\s*(?:\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:k|thousand)?|\b\d+k\b)/gi, ' ')
        .replace(/\b(?:on|every|month|of|the|\d{1,2}(?:st|nd|rd|th)?)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!autoTitle || autoTitle.length < 2) {
        autoTitle = isIncome ? 'Monthly Salary' : 'Recurring Bill';
      }
      autoTitle = autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1);

      const matchedCat = categories.find((c) =>
        c.type === autoType && (autoTitle.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(autoTitle.toLowerCase()))
      ) || categories.find((c) => c.type === autoType);

      const today = new Date();
      let targetMonth = today.getMonth();
      let targetYear = today.getFullYear();
      if (today.getDate() > dayOfMonth) {
        targetMonth += 1;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear += 1;
        }
      }
      const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const safeDay = Math.min(dayOfMonth, daysInTargetMonth);
      const nextDate = new Date(targetYear, targetMonth, safeDay).toISOString().split('T')[0];

      const newRule: AutomationRule = {
        id: crypto.randomUUID(),
        title: autoTitle,
        amount: autoAmount,
        type: autoType,
        frequency: 'MONTHLY',
        dayOfMonth,
        categoryId: matchedCat?.id,
        categoryName: matchedCat?.name || (autoType === 'INCOME' ? 'Salary & Inflow' : 'General'),
        paymentMethod: 'CASH',
        isActive: true,
        autoLog: true,
        nextExecutionDate: nextDate,
        createdAt: new Date().toISOString(),
      };

      onAddAutomation?.(newRule);

      const daySuffix = dayOfMonth === 1 ? '1st' : dayOfMonth === 2 ? '2nd' : dayOfMonth === 3 ? '3rd' : `${dayOfMonth}th`;
      return {
        text: `Scheduled automated **${autoType === 'INCOME' ? 'Income' : 'Expense'}** rule: **"${autoTitle}"** of **${currencySymbol}${autoAmount.toLocaleString('en-IN')}** every month on the **${daySuffix}** (Next: ${nextDate}).`,
        widget: {
          type: 'BALANCE_CARD',
          title: 'Scheduled Automation Active',
          amount: autoAmount,
          currencySymbol,
          items: [
            { label: 'Rule Title', value: autoTitle },
            { label: 'Frequency', value: `Monthly on ${daySuffix}` },
            { label: 'Next Execution', value: nextDate },
            { label: 'Status', value: 'Auto-Post Enabled' },
          ]
        }
      };
    }

    // 1. INTENT: Get Total Balance / Net Worth
    if (
      q === '/summary' ||
      q === '/balance' ||
      q === 'summary' ||
      q === 'balance' ||
      q.includes('what is my balance') ||
      q.includes('my balance') ||
      q.includes('total balance') ||
      q.includes('how much money') ||
      q.includes('net worth') ||
      q.includes('account balance')
    ) {
      const totalBal = summary?.totalBalance ?? transactions.reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);
      const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);

      return {
        text: `Your current net balance is **${currencySymbol}${totalBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**. Here is your liquid overview:`,
        widget: {
          type: 'BALANCE_CARD',
          title: 'Total Net Balance',
          amount: totalBal,
          currencySymbol,
          items: [
            { label: 'Recorded Inflows', value: `+${currencySymbol}${totalIncome.toLocaleString('en-IN')}` },
            { label: 'Recorded Outflows', value: `-${currencySymbol}${totalExpense.toLocaleString('en-IN')}` },
            { label: 'Total Transactions', value: transactions.length },
          ]
        }
      };
    }

    // 2. INTENT: Get Monthly / Total Spending Summary
    if (
      q.includes('how much did i spend') ||
      q.includes('total spend') ||
      q.includes('total expense') ||
      q.includes('spending summary') ||
      q.includes('where did my money go') ||
      q.includes('expense summary')
    ) {
      const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
      const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
      const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

      const catMap: { [key: string]: number } = {};
      transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
        const name = t.category?.name || 'General';
        catMap[name] = (catMap[name] || 0) + t.amount;
      });

      const topCats = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, amt]) => ({
          label: name,
          value: `${currencySymbol}${amt.toLocaleString('en-IN')}`,
          sub: `${totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(0) : 0}% of spend`
        }));

      return {
        text: `You have spent a total of **${currencySymbol}${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** across ${transactions.filter(t => t.type === 'EXPENSE').length} expenses.`,
        widget: {
          type: 'SPEND_SUMMARY',
          title: 'Spending Breakdown',
          amount: totalExpense,
          currencySymbol,
          items: topCats.length > 0 ? topCats : [{ label: 'No expenses recorded yet', value: `${currencySymbol}0` }],
          advice: `Current savings rate is ${savingsRate}%.`
        }
      };
    }

    // 3. INTENT: Query Specific Category Spend (e.g. "how much on food", "spent on groceries")
    const categoryKeywords = ['food', 'dining', 'groceries', 'grocery', 'travel', 'transport', 'uber', 'bills', 'rent', 'shopping', 'entertainment', 'movie', 'health', 'medicine'];
    const matchedKeyword = categoryKeywords.find(kw => q.includes(kw));

    if (matchedKeyword && (q.includes('how much') || q.includes('spent on') || q.includes('total on') || q.includes('show') || q.includes('what did i spend on'))) {
      const matchingTxs = transactions.filter(t => {
        const desc = (t.description || '').toLowerCase();
        const cat = (t.category?.name || '').toLowerCase();
        return desc.includes(matchedKeyword) || cat.includes(matchedKeyword);
      });

      const catTotal = matchingTxs.reduce((sum, t) => sum + t.amount, 0);

      return {
        text: `You have spent a total of **${currencySymbol}${catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** on **${matchedKeyword.toUpperCase()}** across ${matchingTxs.length} records.`,
        widget: {
          type: 'CATEGORY_QUERY',
          title: `${matchedKeyword.toUpperCase()} Spending`,
          amount: catTotal,
          currencySymbol,
          items: matchingTxs.length > 0 ? matchingTxs.slice(0, 4).map(t => ({
            label: t.description || 'Expense',
            value: `${currencySymbol}${t.amount.toLocaleString('en-IN')}`,
            sub: t.transactionDate || ''
          })) : [{ label: `No ${matchedKeyword} expenses found`, value: `${currencySymbol}0` }]
        }
      };
    }

    // 4. INTENT: List Recent Transactions
    if (
      q === '/recent' ||
      q === '/history' ||
      q === 'recent' ||
      q === 'history' ||
      q.includes('recent transactions') ||
      q.includes('last transactions') ||
      q.includes('history') ||
      q.includes('show transactions') ||
      q.includes('latest records')
    ) {
      const recent = transactions.slice(0, 4);
      return {
        text: `Here are your latest **${recent.length} recorded transactions**:`,
        widget: {
          type: 'RECENT_TRANSACTIONS',
          title: 'Recent Ledger Entries',
          currencySymbol,
          items: recent.map(t => ({
            label: t.description || 'Transaction',
            value: `${t.type === 'INCOME' ? '+' : '-'}${currencySymbol}${t.amount.toLocaleString('en-IN')}`,
            sub: `${t.category?.name || 'General'} • ${t.transactionDate || ''}`
          }))
        }
      };
    }

    // 5. INTENT: Multi-Item Transactions (e.g. "spent 50 on tea and 120 on sandwich")
    if (q.includes(' and ') && q.match(/(?:₹|\$|€|£|rs\.?|inr)?\s*\d+/g)?.length && (q.match(/(?:₹|\$|€|£|rs\.?|inr)?\s*\d+/g)?.length || 0) >= 2) {
      const parts = queryText.split(/\band\b/i);
      const createdList: Transaction[] = [];

      for (const part of parts) {
        const subAmt = extractAmount(part);
        if (subAmt > 0) {
          const subType = classifyTransactionType(part);
          const subCat = resolveCategory(part, subType);
          const subTitle = cleanTitle(part, subCat);
          const { dateStr } = extractDate(queryText);
          const matchedCategory = categories.find((c) => c.name.toLowerCase() === subCat.toLowerCase()) || categories[0];

          const res = await api.createTransaction({
            amount: subAmt,
            type: subType,
            description: subTitle,
            categoryId: matchedCategory?.id,
            transactionDate: dateStr,
            paymentMethod: 'CASH',
          });
          if (res.success && res.data) {
            createdList.push(res.data);
          }
        }
      }

      if (createdList.length > 0) {
        onTransactionAdded(createdList[0]);
        const totalMulti = createdList.reduce((acc, t) => acc + t.amount, 0);
        return {
          text: `Recorded **${createdList.length} transactions** totaling **${currencySymbol}${totalMulti.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**.`,
          widget: {
            type: 'MULTI_TRANSACTIONS',
            transactions: createdList,
            currencySymbol,
            items: createdList.map(t => ({
              label: t.description,
              value: `${t.type === 'INCOME' ? '+' : '-'}${currencySymbol}${t.amount.toLocaleString('en-IN')}`,
              sub: t.category?.name || 'General'
            }))
          }
        };
      }
    }

    // 6. INTENT: Single Transaction Logging (Standard AI Execution Pipeline)
    const amount = extractAmount(queryText);

    if (amount <= 0) {
      if (q.startsWith('/income') || q.startsWith('/inflow')) {
        return {
          text: `Please specify an amount for your income entry. Example:\n• **/income 50000 Monthly Salary from Posibolt**`
        };
      }
      if (q.startsWith('/expense') || q.startsWith('/spent')) {
        return {
          text: `Please specify an amount for your expense entry. Example:\n• **/expense 450 Team lunch at cafe**`
        };
      }
      return {
        text: `I'm MonAI, your personal financial assistant. You can log transactions with slash commands or natural language!\n\n**Try asking:**\n• **/income 50000 Monthly Salary**\n• **/expense 450 Team lunch**\n• *"Yesterday spent 250 on pizza using upi"*\n• *"Friend paid me back 500"* (Logs as Income)\n• *"What is my balance?"*`
      };
    }

    const type = classifyTransactionType(queryText);
    const categoryName = resolveCategory(queryText, type);
    const title = cleanTitle(queryText, categoryName);
    const { dateStr, label: dateLabel } = extractDate(queryText);

    let paymentMethod = 'CASH';
    const byMatch = queryText.match(/\b(?:by|via|through|using)\s+([^,.;\n]+)/i);
    const methodSearchText = (byMatch ? byMatch[1] : queryText).toLowerCase();

    if (methodSearchText.includes('upi') || methodSearchText.includes('gpay') || methodSearchText.includes('phonepe') || methodSearchText.includes('paytm')) paymentMethod = 'UPI';
    else if (methodSearchText.includes('debit')) paymentMethod = 'DEBIT_CARD';
    else if (methodSearchText.includes('credit') || methodSearchText.includes('card')) paymentMethod = 'CREDIT_CARD';
    else if (methodSearchText.includes('bank') || methodSearchText.includes('transfer') || methodSearchText.includes('netbanking')) paymentMethod = 'BANK_TRANSFER';
    else if (methodSearchText.includes('cash')) paymentMethod = 'CASH';
    else if (q.includes('upi') || q.includes('gpay') || q.includes('phonepe') || q.includes('paytm')) paymentMethod = 'UPI';
    else if (q.includes('debit')) paymentMethod = 'DEBIT_CARD';
    else if (q.includes('credit') || q.includes('card')) paymentMethod = 'CREDIT_CARD';
    else if (q.includes('bank') || q.includes('transfer') || q.includes('netbanking')) paymentMethod = 'BANK_TRANSFER';

    const generalCat = categories.find((c) => c.name.toLowerCase() === 'general' && c.type === type) ||
      categories.find((c) => c.name.toLowerCase() === 'general');

    const matchedCategory =
      categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === type) ||
      categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase()) ||
      generalCat ||
      categories.find((c) => c.type === type) ||
      categories[0];

    const res = await api.createTransaction({
      amount,
      type,
      description: title,
      categoryId: matchedCategory?.id,
      transactionDate: dateStr,
      paymentMethod,
    });

    if (res.success && res.data) {
      onTransactionAdded(res.data);
      const dateText = dateLabel !== 'Today' ? ` on ${dateLabel} (${dateStr})` : '';
      const catDisplayName = matchedCategory?.name || 'General';
      return {
        text: `Recorded **${type === 'INCOME' ? 'income' : 'expense'}** of **${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** for "${title}"${dateText} • Categorized by MonAI under **${catDisplayName}**.`,
        widget: {
          type: 'TRANSACTION_CONFIRMATION',
          transaction: res.data,
          currencySymbol,
        }
      };
    } else {
      throw new Error(res.message || 'Failed to record transaction');
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || input).trim();
    if (!text || isProcessing) return;

    setInput('');
    const userMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const agentResult = await processWithAIAgent(text);
      const assistantMessage: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: agentResult.text,
        timestamp: new Date(),
        widget: agentResult.widget,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      const errorDetail =
        e?.response?.data?.message ||
        (e?.response?.data?.errors ? Object.values(e.response.data.errors).join(', ') : '') ||
        e?.message ||
        'Please check the details and try again.';
      const errorMessage: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `Could not process request: ${errorDetail}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between h-full min-h-0 overflow-hidden">
      {/* Unified WhatsApp / Instagram DM Chat Structure */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden max-w-2xl w-full mx-auto px-0 sm:px-4">
        {/* WhatsApp / Instagram DM Style Top App Bar (Always Frozen at Top) */}
        <div className="flex-shrink-0 z-30 bg-surface/95 dark:bg-[#12141C]/95 backdrop-blur-xl flex items-center justify-between px-3.5 sm:px-4 py-2.5 border-b border-surface-border shadow-xs w-full">
          <div className="flex items-center space-x-2.5">
            {/* MonAI Avatar with Online Indicator */}
            <div className="relative">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-primary/30">
                <Bot className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface animate-pulse" />
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs sm:text-sm text-foreground tracking-tight">MonAI</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[9px] font-mono font-semibold">AI Agent</span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <span>Online • Instant Assistant</span>
              </div>
            </div>
          </div>

          {/* Right Action Icons (Instagram / WhatsApp style clean icon buttons) */}
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="w-8 h-8 rounded-full bg-surface-raised hover:bg-primary/10 border border-surface-border hover:border-primary/30 text-zinc-500 hover:text-primary flex items-center justify-center transition-all"
              title="MonAI Guide & Commands"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="w-8 h-8 rounded-full bg-surface-raised hover:bg-rose-500/10 border border-surface-border hover:border-rose-500/30 text-zinc-500 hover:text-rose-500 flex items-center justify-center transition-all"
                title="Clear Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages Stream (Independently scrollable message area) */}
        <div className="flex-1 min-h-0 space-y-3 sm:space-y-4 py-2 sm:py-3 overflow-y-auto px-2 sm:px-3 custom-scrollbar overscroll-contain">
          {/* WhatsApp Style Date Divider */}
          <div className="flex justify-center my-1.5">
            <span className="px-3 py-0.5 rounded-full bg-surface-raised/90 dark:bg-surface-raised/60 border border-surface-border/70 text-[10px] font-medium text-zinc-400 shadow-2xs">
              Today
            </span>
          </div>

          {/* Initial Welcome Message Bubble & Starter Chips when chat has no messages */}
          {messages.length === 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0 mb-0.5">
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="relative text-xs sm:text-sm leading-relaxed rounded-2xl rounded-tl-xs bg-surface dark:bg-[#181B26] border border-surface-border text-foreground shadow-sm max-w-[92%] sm:max-w-[85%] p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-foreground text-sm">
                      What happened with your money today?
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300 text-xs">
                    Log expenses and income, or ask questions about your balance.
                  </p>
                  <div className="pt-2 border-t border-surface-border/70 text-[11px] font-mono text-zinc-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">for</span>
                      <span>Category (e.g. <em>for Food &amp; Dining</em>)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">by</span>
                      <span>Payment Type (e.g. <em>by UPI</em>, <em>by Cash</em>)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Prompts Tap Chips */}
              <div className="pl-9 space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Quick Prompts (Tap to run)
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendMessage('/expense 450 for Food & Dining by UPI')}
                    className="px-3 py-1.5 rounded-full bg-surface hover:bg-surface-raised border border-surface-border hover:border-rose-500/40 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium transition-all shadow-2xs hover:scale-[1.02] flex items-center gap-1.5 active:scale-95"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>💸 /expense 450 for Food by UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('/income 50000 for Salary by Bank Transfer')}
                    className="px-3 py-1.5 rounded-full bg-surface hover:bg-surface-raised border border-surface-border hover:border-emerald-500/40 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium transition-all shadow-2xs hover:scale-[1.02] flex items-center gap-1.5 active:scale-95"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>💰 /income 50000 for Salary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('What is my current balance?')}
                    className="px-3 py-1.5 rounded-full bg-surface hover:bg-surface-raised border border-surface-border hover:border-primary/40 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium transition-all shadow-2xs hover:scale-[1.02] flex items-center gap-1.5 active:scale-95"
                  >
                    <span>📊 What is my balance?</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('/recent')}
                    className="px-3 py-1.5 rounded-full bg-surface hover:bg-surface-raised border border-surface-border hover:border-primary/40 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium transition-all shadow-2xs hover:scale-[1.02] flex items-center gap-1.5 active:scale-95"
                  >
                    <span>📜 Recent transactions</span>
                  </button>
                </div>
              </div>
            </div>
          )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Bot Avatar (Left side) */}
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs flex-shrink-0 mb-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* WhatsApp / Instagram Speech Bubble */}
                <div
                  className={`relative text-xs sm:text-sm leading-relaxed transition-all ${
                    msg.sender === 'user'
                      ? 'rounded-2xl rounded-tr-xs bg-primary text-white shadow-md shadow-primary/20 max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 ml-auto'
                      : 'rounded-2xl rounded-tl-xs bg-surface dark:bg-[#181B26] border border-surface-border text-foreground shadow-sm max-w-[88%] sm:max-w-[80%] px-3.5 py-2.5'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* 1. WIDGET: Single Transaction Confirmation Card */}
                  {msg.widget?.type === 'TRANSACTION_CONFIRMATION' && msg.widget.transaction && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            msg.widget.transaction.type === 'INCOME'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {msg.widget.transaction.type === 'INCOME' ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-[11px]">
                            {msg.widget.transaction.description}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-foreground">{msg.widget.transaction.category?.name || 'General'}</span>
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-bold">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI Categorized
                            </span>
                            {msg.widget.transaction.transactionDate ? <span>• {msg.widget.transaction.transactionDate}</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-xs ${
                            msg.widget.transaction.type === 'INCOME'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {msg.widget.transaction.type === 'INCOME' ? '+' : '-'}
                          {currencySymbol}
                          {msg.widget.transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center justify-end space-x-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 inline" />
                          <span>Logged</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. WIDGET: Multi-Transactions Confirmation Card */}
                  {msg.widget?.type === 'MULTI_TRANSACTIONS' && msg.widget.items && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-surface-raised border border-surface-border space-y-1.5">
                      <div className="text-[10px] font-mono text-zinc-400 uppercase font-semibold border-b border-surface-border/80 pb-1 flex items-center justify-between">
                        <span>Logged Items</span>
                        <span className="text-emerald-500 font-normal">All Saved ✓</span>
                      </div>
                      {msg.widget.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-surface border border-surface-border">
                          <div>
                            <div className="font-medium text-foreground">{item.label}</div>
                            <div className="text-[9px] text-zinc-400 font-mono">{item.sub}</div>
                          </div>
                          <span className="font-mono font-bold text-xs text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. WIDGET: Balance / Spend Summary Card */}
                  {(msg.widget?.type === 'BALANCE_CARD' || msg.widget?.type === 'SPEND_SUMMARY' || msg.widget?.type === 'CATEGORY_QUERY') && (
                    <div className="mt-2.5 p-3 rounded-xl bg-surface-raised border border-surface-border space-y-2">
                      <div className="flex items-center justify-between border-b border-surface-border/80 pb-2">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                          {msg.widget.title}
                        </span>
                        {msg.widget.amount !== undefined && (
                          <span className="font-mono font-bold text-sm text-foreground">
                            {currencySymbol}{msg.widget.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      {msg.widget.items && (
                        <div className="space-y-1.5 pt-1">
                          {msg.widget.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-500">{item.label}</span>
                              <div className="text-right font-mono font-medium text-foreground">
                                <span>{item.value}</span>
                                {item.sub && <span className="text-[9px] text-zinc-400 ml-1.5">({item.sub})</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.widget.advice && (
                        <div className="text-[10px] text-primary font-mono pt-1 border-t border-surface-border/50">
                          {msg.widget.advice}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. WIDGET: Recent Transactions List */}
                  {msg.widget?.type === 'RECENT_TRANSACTIONS' && msg.widget.items && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-surface-raised border border-surface-border space-y-2">
                      <div className="text-[10px] font-mono text-zinc-400 uppercase font-semibold border-b border-surface-border/80 pb-1.5">
                        {msg.widget.title}
                      </div>
                      <div className="space-y-1.5">
                        {msg.widget.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-surface border border-surface-border">
                            <div>
                              <div className="font-medium text-foreground">{item.label}</div>
                              <div className="text-[9px] text-zinc-400 font-mono">{item.sub}</div>
                            </div>
                            <span className="font-mono font-bold text-xs text-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. WIDGET: Category Created Confirmation Card */}
                  {msg.widget?.type === 'CATEGORY_CREATED' && msg.widget.category && (
                    <div className="mt-2.5 p-3 rounded-xl bg-surface-raised border border-surface-border space-y-2">
                      <div className="flex items-center justify-between border-b border-surface-border/80 pb-2">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3.5 h-3.5 rounded-full shadow-sm"
                            style={{ backgroundColor: msg.widget.category.color || '#6366F1' }}
                          />
                          <span className="font-semibold text-xs text-foreground">
                            {msg.widget.category.name}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          msg.widget.category.type === 'INCOME'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}>
                          {msg.widget.category.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Ready to use! You can now log {msg.widget.category.type === 'INCOME' ? 'income' : 'expenses'} for {msg.widget.category.name}.
                      </div>
                    </div>
                  )}

                  {/* Message Timestamp & WhatsApp Double Checkmark */}
                  <div
                    className={`text-[9px] mt-1 font-mono flex items-center justify-end space-x-1 ${
                      msg.sender === 'user' ? 'text-white/75' : 'text-zinc-400'
                    }`}
                  >
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.sender === 'user' && (
                      <span className="text-[10px] leading-none text-white/90">✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center space-x-2 text-[11px] text-zinc-500 pl-1">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="flex items-center space-x-1.5 bg-surface border border-surface-border px-3 py-1.5 rounded-2xl rounded-tl-xs shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span>MonAI is typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* WhatsApp / Instagram DM Sticky Bottom Bar (Always Frozen at Bottom) */}
          <div className="flex-shrink-0 z-30 w-full pt-1.5 pb-2 px-2 sm:px-0 bg-surface/95 dark:bg-[#12141C]/95 backdrop-blur-xl border-t border-surface-border/70 sm:border-t-0">
            {/* Quick Reply Chips Row - WhatsApp / Instagram Style */}
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={() => handlePillClick('/expense ', activeInputRef)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all duration-150 ${
                  input.startsWith('/expense')
                    ? 'bg-rose-500 text-white font-semibold shadow-md shadow-rose-500/30 scale-[1.02]'
                    : 'bg-surface-raised/95 hover:bg-rose-500/10 border border-surface-border text-rose-500'
                }`}
                title="Record Expense"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>/expense</span>
              </button>
              <button
                type="button"
                onClick={() => handlePillClick('/income ', activeInputRef)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all duration-150 ${
                  input.startsWith('/income')
                    ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/30 scale-[1.02]'
                    : 'bg-surface-raised/95 hover:bg-emerald-500/10 border border-surface-border text-emerald-500'
                }`}
                title="Record Income"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>/income</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center bg-surface/95 dark:bg-[#12141C]/95 backdrop-blur-xl border border-surface-border focus-within:border-primary/80 rounded-full p-1.5 shadow-xl transition-all z-40"
            >
              {renderSlashCommandPalette()}
              {renderSuggestionsDropdown('up')}

              {/* Slash Command Quick Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setInput('/');
                  setTimeout(() => activeInputRef.current?.focus(), 10);
                }}
                className="w-8 h-8 rounded-full bg-surface-raised hover:bg-primary/10 border border-surface-border hover:border-primary/30 text-zinc-500 hover:text-primary flex items-center justify-center transition-all flex-shrink-0 ml-0.5"
                title="Commands"
              >
                <Terminal className="w-3.5 h-3.5 text-primary" />
              </button>

              <input
                ref={activeInputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                disabled={isProcessing}
                placeholder={
                  input.startsWith('/expense')
                    ? "amount (e.g. 450 for Food by UPI)..."
                    : input.startsWith('/income')
                    ? "amount (e.g. 50000 for Salary by Bank)..."
                    : "e.g. 300 for Groceries by UPI (or type /)..."
                }
                className="w-full bg-transparent pl-2.5 sm:pl-3 pr-2 py-2 text-xs sm:text-sm text-foreground placeholder-zinc-400 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0 mr-1"
                title="MonAI Guide"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary hover:bg-primary-600 disabled:opacity-30 text-white transition-all shadow-md shadow-primary/25 flex items-center justify-center flex-shrink-0 active:scale-95"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>

      {/* Interactive AI Guide & Cheatsheet Modal */}
      {renderGuideModal()}
    </div>
  );
};
