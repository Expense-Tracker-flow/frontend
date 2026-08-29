'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Clock
} from 'lucide-react';
import { Category, Transaction, TransactionType, DashboardSummary, AutomationRule } from '../lib/types';
import { api } from '../lib/api';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const lower = text.toLowerCase();

    // Priority Inflow patterns
    if (
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
      lower.includes('earned')
    ) {
      return 'INCOME';
    }

    // Default is Expense
    return 'EXPENSE';
  };

  // Helper 3: Robust Amount Extraction (prioritizes currency prefixes & avoids quantity counts)
  const extractAmount = (text: string): number => {
    // 1. Check for currency prefixed or suffixed amounts (e.g. ₹1500, Rs. 400, $50, for 1500, cost 300, 1.5k)
    const primaryPattern = /(?:₹|\$|€|£|rs\.?|inr|for|cost|paid|spent)\s*(\d*(?:\.\d+)?|\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|thousand)?/i;
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

    if (type === 'INCOME') {
      if (lower.includes('freelance') || lower.includes('project') || lower.includes('client')) return 'Freelance';
      if (lower.includes('dividend') || lower.includes('stock') || lower.includes('interest')) return 'Investments';
      if (lower.includes('refund') || lower.includes('cashback')) return 'Refunds & Rewards';
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

    return 'Miscellaneous';
  };

  // Helper 5: Clean Description Title with Proper Spacing
  const cleanTitle = (rawText: string, categoryFallback: string): string => {
    let title = rawText
      // 1. Remove relative dates
      .replace(/\b(?:yesterday|today|day before yesterday|\d+\s*days?\s*ago)\b/gi, ' ')
      // 2. Remove currency amounts with strict non-empty digit match
      .replace(/(?:₹|\$|€|£|rs\.?|inr)?\s*(?:\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:k|thousand)?|\b\d+k\b)/gi, ' ')
      // 3. Remove payment methods
      .replace(/\b(?:by|via|with|using|through)?\s*(?:upi|cash|credit\s*card|debit\s*card|card|gpay|paytm|phonepe|netbanking|bank\s*transfer)\b/gi, ' ')
      // 4. Remove leading verbs
      .replace(/^\s*(?:i\s+)?(?:spent|paid|bought|received|got|added|recorded|purchase|purchased)\s+(?:on|for|a|an)?\s*/i, ' ')
      // 5. Remove trailing prepositions
      .replace(/\b(?:for|on|at|in|to|from)\s*$/gi, ' ')
      // 6. Collapse spaces cleanly
      .replace(/\s+/g, ' ')
      .trim();

    if (!title || title.length < 2 || title.toLowerCase() === 'for' || title.toLowerCase() === 'on') {
      return categoryFallback;
    }
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  // Main Agent Controller
  const processWithAIAgent = async (queryText: string): Promise<{ text: string; widget?: ChatWidgetData }> => {
    const q = queryText.toLowerCase().trim();

    // 0. INTENT: Create New Category via Natural Language Chat
    const isCategoryCreation =
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
        paymentMethod: 'UPI',
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
            paymentMethod: 'UPI',
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
      return {
        text: `I'm your FLOW Financial AI Agent. You can log transactions with relative dates, ask questions, or review your spending breakdown!\n\n**Try asking:**\n• *"Yesterday spent 250 on pizza using upi"*\n• *"Friend paid me back 500"* (Logs as Income)\n• *"Bought 3 shirts for ₹1,500"*\n• *"Spent 50 on coffee and 120 on sandwich"*\n• *"What is my balance?"*`
      };
    }

    const type = classifyTransactionType(queryText);
    const categoryName = resolveCategory(queryText, type);
    const title = cleanTitle(queryText, categoryName);
    const { dateStr, label: dateLabel } = extractDate(queryText);

    let paymentMethod = 'UPI';
    if (q.includes('cash')) paymentMethod = 'CASH';
    else if (q.includes('card') || q.includes('credit') || q.includes('debit')) paymentMethod = 'CREDIT_CARD';
    else if (q.includes('bank') || q.includes('transfer') || q.includes('netbanking')) paymentMethod = 'BANK_TRANSFER';

    const matchedCategory =
      categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === type) ||
      categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase()) ||
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
      return {
        text: `Recorded **${type === 'INCOME' ? 'income' : 'expense'}** of **${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}** for "${title}"${dateText}.`,
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
    <div className="w-full flex-1 flex flex-col justify-between min-h-[calc(100dvh-12rem)] md:min-h-[calc(100vh-8rem)]">
      {/* 1. Empty / Initial State (ChatGPT-Style Centered Canvas) */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl w-full mx-auto px-2 sm:px-4 py-6 sm:py-12 text-center space-y-6 sm:space-y-8">
          {/* Greeting */}
          <div className="space-y-2 sm:space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Bot className="w-3.5 h-3.5" />
              <span>FLOW Financial AI Agent</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground font-sans">
              What happened with your money today?
            </h1>
            <p className="text-xs sm:text-base text-zinc-500 max-w-lg mx-auto">
              Ask questions about your balance, analyze spending, or log any expense/income in natural language.
            </p>
          </div>

          {/* Centered ChatGPT-style Chat Bar */}
          <div className="w-full max-w-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center bg-surface border border-surface-border focus-within:border-primary/80 rounded-3xl p-1.5 sm:p-2 shadow-xl transition-all"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
                placeholder="e.g. Yesterday spent 250 on pizza, Bought 3 shirts for 1500..."
                className="w-full bg-transparent pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="p-2 sm:p-2.5 rounded-2xl bg-primary hover:bg-primary-600 disabled:opacity-30 text-white transition-all shadow-md shadow-primary/25 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 sm:mt-4">
              <button
                onClick={onOpenExpenseModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-surface-border text-zinc-600 dark:text-zinc-300 hover:text-foreground text-xs font-medium transition-all shadow-sm"
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                <span>+ Expense</span>
              </button>
              <button
                onClick={onOpenIncomeModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-surface-border text-zinc-600 dark:text-zinc-300 hover:text-foreground text-xs font-medium transition-all shadow-sm"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>+ Income</span>
              </button>
            </div>
          </div>

          {/* ChatGPT-style Prompt Suggestion Grid (Top 4 Most Used) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl pt-4">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                className="p-3.5 rounded-2xl bg-surface hover:bg-surface-raised border border-surface-border hover:border-primary/40 text-left transition-all shadow-sm group"
              >
                <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>{item.title}</span>
                  <span className="text-[10px] font-mono font-normal text-zinc-400 group-hover:text-primary transition-colors">
                    Click to run ↵
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* 2. Active Chat Stream with Compact Pods & Interactive Widgets */
        <div className="flex-1 flex flex-col justify-between max-w-2xl w-full mx-auto px-4 pb-4">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pt-2 pb-1 border-b border-surface-border/50 text-xs text-zinc-400 font-mono">
            <span className="flex items-center space-x-1.5 text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Conversation Active</span>
            </span>
            <button
              onClick={handleClearChat}
              className="px-2 py-0.5 rounded-lg hover:bg-surface-raised hover:text-foreground text-[11px] transition-colors"
            >
              Clear Conversation
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 space-y-4 py-4 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 text-[11px] font-bold font-mono mt-0.5">
                    AI
                  </div>
                )}

                {/* Compact Chat Pod */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed transition-all ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface border border-surface-border text-foreground shadow-sm'
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
                          <div className="text-[9px] text-zinc-400 font-mono">
                            {msg.widget.transaction.category?.name || 'General'}
                            {msg.widget.transaction.transactionDate ? ` • ${msg.widget.transaction.transactionDate}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-xs ${
                            msg.widget.transaction.type === 'INCOME'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-foreground'
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

                  <div
                    className={`text-[8px] mt-1.5 font-mono ${
                      msg.sender === 'user' ? 'text-white/70 text-right' : 'text-zinc-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center text-zinc-500 flex-shrink-0 text-xs font-bold mt-0.5">
                    <User className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center space-x-2 text-[11px] text-zinc-500 pl-1">
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="flex items-center space-x-1.5 bg-surface border border-surface-border px-3 py-1.5 rounded-xl shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span>AI Agent reasoning & executing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Bottom ChatGPT Input Bar */}
          <div className="sticky bottom-4 z-20 w-full pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center bg-surface/90 backdrop-blur-md border border-surface-border focus-within:border-primary/80 rounded-3xl p-1.5 shadow-xl transition-all"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
                placeholder="Ask financial questions or log expense/income..."
                className="w-full bg-transparent pl-4 pr-10 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="p-2 rounded-2xl bg-primary hover:bg-primary-600 disabled:opacity-30 text-white transition-all shadow-md shadow-primary/25"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
