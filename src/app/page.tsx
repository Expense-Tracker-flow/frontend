'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, DashboardTab } from '../components/Header';
import { ExpenseChat } from '../components/ExpenseChat';
import { ProfileScreen } from '../components/ProfileScreen';
import { SettingsScreen } from '../components/SettingsScreen';
import { MoneyOrbit } from '../components/MoneyOrbit';
import { MoneyPulse } from '../components/MoneyPulse';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { AutomationsScreen } from '../components/AutomationsScreen';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { Category, CategoryBreakdown, DashboardSummary, Transaction, TransactionType, UserProfile, AutomationRule } from '../lib/types';
import { api } from '../lib/api';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  CheckCircle2, 
  ArrowRight, 
  Activity, 
  Sparkles, 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  KeyRound,
  Percent,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isInitializingAuth, setIsInitializingAuth] = useState<boolean>(true);

  // Active dashboard navigation tab: 'home' | 'summary' | 'history' | 'profile' | 'settings'
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');

  // Theme & Currency preferences (Light theme is default)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');

  // Authentication UI state on landing
  const [showAuthForm, setShowAuthForm] = useState<boolean>(false);
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authFullName, setAuthFullName] = useState<string>('');
  const [authOtpCode, setAuthOtpCode] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpTimer, setOtpTimer] = useState<number>(0);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Dashboard data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalBalance: 0,
    monthIncome: 0,
    monthExpense: 0,
    monthNetSavings: 0,
    monthOverMonthGrowth: 0,
    topCategories: [],
    dailyPulse: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<TransactionType>('EXPENSE');
  const [naturalQuery, setNaturalQuery] = useState<string>('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditModalOpen(true);
  };

  // Load and sync scheduled automations
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const saved = localStorage.getItem(`flow_automations_${user.id}`);
      if (saved) {
        try {
          setAutomations(JSON.parse(saved));
        } catch (e) {}
      } else {
        const initialDefaults: AutomationRule[] = [
          {
            id: 'auto-1',
            title: 'House Rent',
            amount: 15000,
            type: 'EXPENSE',
            frequency: 'MONTHLY',
            dayOfMonth: 1,
            categoryName: 'Housing & Bills',
            paymentMethod: 'UPI',
            isActive: true,
            autoLog: true,
            nextExecutionDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'auto-2',
            title: 'Monthly Salary',
            amount: 65000,
            type: 'INCOME',
            frequency: 'MONTHLY',
            dayOfMonth: 30,
            categoryName: 'Salary & Inflows',
            paymentMethod: 'BANK_TRANSFER',
            isActive: true,
            autoLog: true,
            nextExecutionDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-30`,
            createdAt: new Date().toISOString(),
          },
        ];
        setAutomations(initialDefaults);
        localStorage.setItem(`flow_automations_${user.id}`, JSON.stringify(initialDefaults));
      }
    }
  }, [user]);

  const saveAutomationsToStorage = (updated: AutomationRule[]) => {
    setAutomations(updated);
    if (user) {
      localStorage.setItem(`flow_automations_${user.id}`, JSON.stringify(updated));
    }
  };

  const handleSaveAutomationRule = (rule: AutomationRule) => {
    const existingIndex = automations.findIndex((r) => r.id === rule.id);
    let updated: AutomationRule[];
    if (existingIndex >= 0) {
      updated = [...automations];
      updated[existingIndex] = rule;
    } else {
      updated = [rule, ...automations];
    }
    saveAutomationsToStorage(updated);
    showToast(`Automation rule "${rule.title}" saved`);
  };

  const handleDeleteAutomationRule = (id: string) => {
    const updated = automations.filter((r) => r.id !== id);
    saveAutomationsToStorage(updated);
    showToast('Automation rule deleted');
  };

  const handleToggleAutomationRule = (id: string) => {
    const updated = automations.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    saveAutomationsToStorage(updated);
    const toggled = updated.find((r) => r.id === id);
    showToast(toggled?.isActive ? 'Automation rule resumed' : 'Automation rule paused');
  };

  const handleTriggerAutomationRule = async (rule: AutomationRule) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.createTransaction({
        type: rule.type,
        amount: rule.amount,
        description: `${rule.title} (Manual Run)`,
        categoryId: rule.categoryId,
        transactionDate: todayStr,
        paymentMethod: rule.paymentMethod,
        notes: rule.notes || 'Manually triggered scheduled automation',
      });
      if (res.success && res.data) {
        showToast(`Logged "${rule.title}" to ledger`);
        loadData();
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to trigger rule');
    }
  };

  // From & To Date Range Filter for Summary tab (defaults to current month)
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultTo = new Date().toISOString().split('T')[0];

  const [summaryFromDate, setSummaryFromDate] = useState<string>(defaultFrom);
  const [summaryToDate, setSummaryToDate] = useState<string>(defaultTo);

  const handleResetSummaryDates = () => {
    setSummaryFromDate(defaultFrom);
    setSummaryToDate(defaultTo);
  };

  const handleSummaryPreset = (preset: 'THIS_MONTH' | 'LAST_30' | 'THIS_YEAR' | 'ALL') => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (preset === 'THIS_MONTH') {
      setSummaryFromDate(defaultFrom);
      setSummaryToDate(todayStr);
    } else if (preset === 'LAST_30') {
      const past30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      setSummaryFromDate(past30);
      setSummaryToDate(todayStr);
    } else if (preset === 'THIS_YEAR') {
      const startYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      setSummaryFromDate(startYear);
      setSummaryToDate(todayStr);
    } else if (preset === 'ALL') {
      setSummaryFromDate('');
      setSummaryToDate('');
    }
  };

  // Filtered transactions for Summary based on fromDate & toDate
  const summaryFilteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txDate = t.transactionDate ? t.transactionDate.split('T')[0] : '';
      if (summaryFromDate && txDate && txDate < summaryFromDate) return false;
      if (summaryToDate && txDate && txDate > summaryToDate) return false;
      return true;
    });
  }, [transactions, summaryFromDate, summaryToDate]);

  // Computed summary stats
  const activeIncome = useMemo(() => {
    if (summaryFilteredTransactions.length === 0 && !summaryFromDate && !summaryToDate) {
      return summary.monthIncome;
    }
    return summaryFilteredTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [summaryFilteredTransactions, summary.monthIncome, summaryFromDate, summaryToDate]);

  const activeExpense = useMemo(() => {
    if (summaryFilteredTransactions.length === 0 && !summaryFromDate && !summaryToDate) {
      return summary.monthExpense;
    }
    return summaryFilteredTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [summaryFilteredTransactions, summary.monthExpense, summaryFromDate, summaryToDate]);

  const activeNetSavings = activeIncome - activeExpense;

  const activeSavingsRate = activeIncome > 0
    ? Math.max(0, Math.min(100, Math.round((activeNetSavings / activeIncome) * 100)))
    : 0;

  const activeCategories: CategoryBreakdown[] = useMemo(() => {
    if (summaryFilteredTransactions.length === 0 && !summaryFromDate && !summaryToDate) {
      return summary.topCategories || [];
    }
    const catMap = new Map<string, { amount: number; count: number; color?: string; icon?: string }>();
    summaryFilteredTransactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        const name = t.category?.name || (t as any).categoryName || 'General';
        const existing = catMap.get(name) || {
          amount: 0,
          count: 0,
          color: t.category?.color || '#6366F1',
          icon: t.category?.icon || 'default',
        };
        catMap.set(name, {
          ...existing,
          amount: existing.amount + (t.amount || 0),
          count: existing.count + 1,
        });
      });

    const total = activeExpense || 1;
    return Array.from(catMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        color: data.color || '#6366F1',
        icon: data.icon || 'default',
        transactionCount: data.count,
        percentage: Math.round((data.amount / total) * 1000) / 10,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [summaryFilteredTransactions, summary.topCategories, activeExpense, summaryFromDate, summaryToDate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getSymbolForCode = (code?: string): string => {
    switch (code?.toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'CAD': return 'C$';
      case 'AUD': return 'A$';
      case 'INR':
      default:
        return '₹';
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('flow_theme') as 'light' | 'dark') || 'light';
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('flow_theme', newTheme);
  };

  const handleCurrencyChange = (newCurrencyCode: string) => {
    setCurrencySymbol(getSymbolForCode(newCurrencyCode));
    if (user) {
      setUser({ ...user, currency: newCurrencyCode });
    }
    showToast(`Currency updated to ${newCurrencyCode} (${getSymbolForCode(newCurrencyCode)})`);
  };

  // Timer countdown effect for OTP resend
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // Helper to ensure transactions are always sorted latest first
  const sortTransactionsLatestFirst = (list: Transaction[]) => {
    return [...list].sort((a, b) => {
      const dateA = a.transactionDate ? a.transactionDate.split('T')[0] : '';
      const dateB = b.transactionDate ? b.transactionDate.split('T')[0] : '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  };

  // Fetch live user data from PostgreSQL backend
  const loadData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('flow_access_token') : null;
    if (!token) return;

    try {
      setIsLoading(true);
      const [summaryRes, txRes, catRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getTransactions({ size: 100 }),
        api.getCategories(),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
      if (txRes.success && txRes.data) {
        setTransactions(sortTransactionsLatestFirst(txRes.data.items));
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (e: any) {
      if (e?.response?.status === 401) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check stored auth session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('flow_user');
      const token = localStorage.getItem('flow_access_token');
      if (storedUser && token) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setCurrencySymbol(getSymbolForCode(parsed.currency));
        } catch (e) {
          // ignore
        }
        loadData();
      }
      setIsInitializingAuth(false);

      const handleAuthLogout = () => {
        setUser(null);
        setTransactions([]);
        setCategories([]);
        setSummary({
          totalBalance: 0,
          monthIncome: 0,
          monthExpense: 0,
          monthNetSavings: 0,
          monthOverMonthGrowth: 0,
          topCategories: [],
          dailyPulse: [],
        });
      };

      window.addEventListener('flow_auth_logout', handleAuthLogout);
      return () => window.removeEventListener('flow_auth_logout', handleAuthLogout);
    }
  }, [loadData]);

  // Send Email OTP Code
  const handleSendOtp = async () => {
    if (!authEmail.trim() || !authEmail.includes('@')) {
      setAuthError('Please enter a valid email address first.');
      return;
    }

    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthLoading(true);

    try {
      await api.sendOtp({
        email: authEmail.trim(),
        purpose: 'REGISTRATION',
      });
      setOtpSent(true);
      setOtpTimer(60);
      setAuthSuccessMsg(`Verification code sent to ${authEmail.trim()}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 404
          ? 'API service unavailable (404). Please verify backend connection.'
          : err?.message || 'Failed to send verification code. Please check your connection.');
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    // If in signup mode and OTP hasn't been sent yet, trigger OTP send
    if (!isLoginMode && !otpSent) {
      await handleSendOtp();
      return;
    }

    setAuthLoading(true);

    try {
      if (isLoginMode) {
        const res = await api.login({
          email: authEmail.trim(),
          password: authPassword,
        });

        if (res.success && res.data) {
          localStorage.setItem('flow_access_token', res.data.accessToken);
          localStorage.setItem('flow_refresh_token', res.data.refreshToken);
          localStorage.setItem('flow_user', JSON.stringify(res.data.user));
          setUser(res.data.user);
          setCurrencySymbol(getSymbolForCode(res.data.user.currency));
          showToast(`Welcome back, ${res.data.user.fullName}!`);
          loadData();
        }
      } else {
        if (!authOtpCode.trim() || authOtpCode.trim().length !== 6) {
          setAuthError('Please enter the 6-digit verification code sent to your email.');
          setAuthLoading(false);
          return;
        }

        const res = await api.register({
          email: authEmail.trim(),
          password: authPassword,
          fullName: authFullName.trim(),
          otpCode: authOtpCode.trim(),
        });

        if (res.success && res.data) {
          localStorage.setItem('flow_access_token', res.data.accessToken);
          localStorage.setItem('flow_refresh_token', res.data.refreshToken);
          localStorage.setItem('flow_user', JSON.stringify(res.data.user));
          setUser(res.data.user);
          setCurrencySymbol(getSymbolForCode(res.data.user.currency));
          showToast(`Account verified! Welcome, ${res.data.user.fullName}!`);
          loadData();
        }
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 404
          ? 'API service unavailable (404). Please verify backend connection.'
          : err?.message || (isLoginMode ? 'Invalid email or password' : 'Registration failed. Please check your verification code.'));
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('flow_refresh_token') || undefined;
    await api.logout(refreshToken);
    setUser(null);
    setTransactions([]);
    setCategories([]);
    setSummary({
      totalBalance: 0,
      monthIncome: 0,
      monthExpense: 0,
      monthNetSavings: 0,
      monthOverMonthGrowth: 0,
      topCategories: [],
      dailyPulse: [],
    });
    showToast('Signed out successfully');
  };

  const handleOpenExpense = () => {
    setNaturalQuery('');
    setModalType('EXPENSE');
    setModalOpen(true);
  };

  const handleOpenIncome = () => {
    setNaturalQuery('');
    setModalType('INCOME');
    setModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await api.deleteTransaction(id);
      showToast('Transaction removed');
      loadData();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Failed to delete transaction');
    }
  };

  // Savings rate calculation
  const savingsRate = summary.monthIncome > 0 
    ? Math.max(0, Math.min(100, Math.round((summary.monthNetSavings / summary.monthIncome) * 100)))
    : 0;

  // ==========================================
  // 0. AUTH HYDRATION CHECK (PREVENT BLINK)
  // ==========================================
  if (isInitializingAuth) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <span className="text-2xl font-bold tracking-tight text-foreground select-none">
            FIN-XL
          </span>
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ==========================================
  // 1. LANDING / AUTH VIEW (UNAUTHENTICATED)
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 relative overflow-hidden transition-colors">
        {/* Ambient Glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-400/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Navbar */}
        <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between relative z-10">
          <div 
            onClick={() => {
              setShowAuthForm(false);
              setAuthError(null);
            }} 
            className="cursor-pointer select-none"
          >
            <span className="text-xl font-bold tracking-tight text-foreground hover:opacity-85 transition-opacity">
              FIN-XL
            </span>
          </div>

          <div>
            {!showAuthForm ? (
              <button
                onClick={() => {
                  setShowAuthForm(true);
                  setAuthError(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs shadow-lg shadow-primary/25 transition-all hover:scale-105"
              >
                Get Started
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowAuthForm(false);
                  setAuthError(null);
                }}
                className="text-xs text-zinc-500 hover:text-foreground font-mono transition-colors"
              >
                ← Back to Overview
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Content: Hero OR Centered Auth Form */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center relative z-10">
          {showAuthForm ? (
            /* Centered Sign In / Sign Up Form Card */
            <div className="w-full max-w-md bg-surface border border-surface-border rounded-3xl p-8 shadow-2xl relative text-foreground">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight font-mono">
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {isLoginMode
                    ? 'Access your personal financial ledger'
                    : otpSent
                    ? 'Enter the 6-digit code sent to your email'
                    : 'Create your private financial ledger'}
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 bg-surface-raised p-1 rounded-2xl mb-6 text-xs font-semibold border border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(true);
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                    setOtpSent(false);
                  }}
                  className={`py-2 rounded-xl transition-all ${
                    isLoginMode ? 'bg-primary text-white shadow-md' : 'text-zinc-500 hover:text-foreground'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(false);
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className={`py-2 rounded-xl transition-all ${
                    !isLoginMode ? 'bg-primary text-white shadow-md' : 'text-zinc-500 hover:text-foreground'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Error Message */}
              {authError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Success Message */}
              {authSuccessMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{authSuccessMsg}</span>
                </div>
              )}

              {/* Form Fields */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {!isLoginMode && (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-500">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        required={!isLoginMode}
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        placeholder="Alex Vance"
                        className="w-full bg-surface-raised border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-500">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      required
                      disabled={!isLoginMode && otpSent}
                      value={authEmail}
                      onChange={(e) => {
                        setAuthEmail(e.target.value);
                        setAuthError(null);
                      }}
                      placeholder="alex@flow.app"
                      className="w-full bg-surface-raised border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-500">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-raised border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* OTP Code Field when in Sign Up mode and OTP is sent */}
                {!isLoginMode && otpSent && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-primary">
                        6-Digit Email Verification Code
                      </label>
                      <button
                        type="button"
                        disabled={otpTimer > 0 || authLoading}
                        onClick={handleSendOtp}
                        className="text-[11px] text-zinc-500 hover:text-primary disabled:opacity-50 transition-colors"
                      >
                        {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Resend code'}
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={authOtpCode}
                        onChange={(e) => setAuthOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full bg-surface-raised border border-primary/50 focus:border-primary rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-foreground placeholder-zinc-400 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 mt-4 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 group"
                >
                  <span>
                    {authLoading
                      ? 'Processing...'
                      : isLoginMode
                      ? 'Sign In to FIN-XL'
                      : !otpSent
                      ? 'Send Verification Code'
                      : 'Verify & Create Account'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              {/* Mode Toggle Footer */}
              <div className="text-center mt-6 text-xs text-zinc-500">
                {isLoginMode ? (
                  <span>
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => {
                        setIsLoginMode(false);
                        setAuthError(null);
                        setAuthSuccessMsg(null);
                        setOtpSent(false);
                      }}
                      className="text-primary font-semibold hover:underline"
                    >
                      Sign up now
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      onClick={() => {
                        setIsLoginMode(true);
                        setAuthError(null);
                        setAuthSuccessMsg(null);
                        setOtpSent(false);
                      }}
                      className="text-primary font-semibold hover:underline"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Clean Hero Section */
            <div className="text-center space-y-12 w-full">
              <div className="max-w-3xl mx-auto space-y-4">
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-tight">
                  Track your money by simply{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-primary to-indigo-500">
                    talking to it.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-zinc-500 max-w-2xl mx-auto leading-relaxed">
                  Gain effortless clarity over where your money goes. Natural entries, visual spending orbits, and real-time cashflow insights.
                </p>
              </div>

              {/* Single Primary Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowAuthForm(true);
                    setAuthError(null);
                  }}
                  className="inline-flex px-8 py-4 rounded-2xl bg-primary hover:bg-primary-600 text-white font-bold text-sm items-center justify-center space-x-3 shadow-xl shadow-primary/30 transition-all hover:scale-105 group"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Customer Benefit Points Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full pt-6">
                <div className="p-6 rounded-2xl bg-surface border border-surface-border hover:border-primary/40 transition-all shadow-sm group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">Effortless Expense Entry</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    “Spent ₹450 on dinner” — simply type or talk what happened, and FIN-XL categorizes everything instantly.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-surface border border-surface-border hover:border-emerald-500/40 transition-all shadow-sm group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">Visual Spending Orbits</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Understand your biggest spending areas at a glance with interactive category orbits centered on your total balance.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-surface border border-surface-border hover:border-indigo-500/40 transition-all shadow-sm group">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">Daily Cashflow Velocity</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Track daily cashflow velocity to ensure you stay comfortably within your savings goals all month long.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="max-w-7xl w-full mx-auto px-6 py-8 text-center text-xs text-zinc-500 font-mono relative z-10 border-t border-surface-border">
          FIN-XL — Personal Finance Tracker
        </footer>
      </div>
    );
  }

  // ==========================================
  // 2. AUTHENTICATED FINANCIAL DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      {/* Top Navbar with Profile Dropdown */}
      <Header
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onRefresh={loadData}
        onOpenAuth={() => {
          setShowAuthForm(true);
          setAuthError(null);
        }}
        onLogout={handleLogout}
        isLoading={isLoading}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-surface border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 px-4 py-2.5 rounded-2xl text-xs font-mono flex items-center space-x-2 shadow-xl backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-24 md:pb-8">
        {/* ============================================================== */}
        {/* 🏠 TAB 1: HOME (ChatGPT-Style Center Conversational Canvas)   */}
        {/* ============================================================== */}
        {activeTab === 'home' && (
          <div className="w-full">
            <ExpenseChat
              userName={user.fullName.split(' ')[0]}
              currencySymbol={currencySymbol}
              categories={categories}
              transactions={transactions}
              summary={summary}
              onTransactionAdded={(newTx?: Transaction) => {
                if (newTx) {
                  setTransactions((prev) => sortTransactionsLatestFirst([newTx, ...prev.filter(t => t.id !== newTx.id)]));
                  setSummary((prev) => ({
                    ...prev,
                    totalBalance: newTx.type === 'INCOME' ? prev.totalBalance + newTx.amount : prev.totalBalance - newTx.amount,
                    monthIncome: newTx.type === 'INCOME' ? prev.monthIncome + newTx.amount : prev.monthIncome,
                    monthExpense: newTx.type === 'EXPENSE' ? prev.monthExpense + newTx.amount : prev.monthExpense,
                  }));
                }
                showToast('Transaction logged in ledger');
                loadData();
              }}
              onCategoryAdded={(newCat) => {
                setCategories((prev) => [...prev.filter(c => c.id !== newCat.id), newCat]);
                showToast(`Category "${newCat.name}" created`);
                loadData();
              }}
              onAddAutomation={handleSaveAutomationRule}
              onOpenExpenseModal={handleOpenExpense}
              onOpenIncomeModal={handleOpenIncome}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* 📊 TAB 2: SUMMARY (Executive Financial Overview & Analytics) */}
        {/* ============================================================== */}
        {activeTab === 'summary' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Top Bar: Title & From/To Date Range Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
                  Financial Intelligence
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Cashflow & Category Summary
                </h1>
              </div>

              {/* From & To Date Range Filter */}
              <DateRangeFilter
                fromDate={summaryFromDate}
                toDate={summaryToDate}
                onFromChange={setSummaryFromDate}
                onToChange={setSummaryToDate}
                onResetToCurrentMonth={handleResetSummaryDates}
                onPresetSelect={handleSummaryPreset}
              />
            </div>

            {/* 1. Unified Executive Financial Hub */}
            <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-7 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Total Balance Hero */}
                <div className="space-y-1 sm:pr-8">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                      Total Net Balance
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
                    {currencySymbol}{summary.totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{summary.monthOverMonthGrowth >= 0 ? '+' : ''}{summary.monthOverMonthGrowth.toFixed(1)}% MoM</span>
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-zinc-500">
                      Period Savings: {currencySymbol}{activeNetSavings.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* 3 Executive Stat Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 flex-1 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-surface-border lg:pl-8">
                  {/* Income Stat */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-zinc-400 text-xs font-medium">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Period Income</span>
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      +{currencySymbol}{activeIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {summaryFilteredTransactions.filter(t => t.type === 'INCOME').length} Inflows
                    </p>
                  </div>

                  {/* Expense Stat */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-zinc-400 text-xs font-medium">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                      <span>Period Spent</span>
                    </div>
                    <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                      -{currencySymbol}{activeExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {activeCategories.length} Active Categories
                    </p>
                  </div>

                  {/* Savings Rate Stat */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-zinc-400 text-xs font-medium">
                      <Percent className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Savings Rate</span>
                    </div>
                    <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {activeSavingsRate}%
                    </div>
                    {/* Mini visual gauge bar */}
                    <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, activeSavingsRate))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Side-by-Side Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Category Breakdown Card */}
              <div className="lg:col-span-6 bg-surface border border-surface-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Category Distribution</h2>
                      <p className="text-[11px] text-zinc-400">Filtered expense breakdown</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-semibold bg-surface-raised border border-surface-border text-zinc-500">
                      {activeCategories.length} Categories
                    </span>
                  </div>

                  {activeCategories.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-400 font-mono">
                      No categorized expenses recorded in this date range.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {activeCategories.map((cat, idx) => {
                        const name = cat.name || (cat as any).categoryName || 'General';
                        const amount = Number(cat.amount ?? (cat as any).totalAmount ?? 0);
                        const percentage = Number(cat.percentage ?? 0);
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: cat.color || '#6366F1' }}
                                />
                                <span className="font-semibold text-foreground">{name}</span>
                              </div>
                              <div className="flex items-center space-x-2 font-mono">
                                <span className="text-zinc-600 dark:text-zinc-400">
                                  {currencySymbol}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-zinc-400 text-[10px]">({percentage.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  backgroundColor: cat.color || '#6366F1',
                                  width: `${Math.min(100, Math.max(5, percentage))}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Cashflow Pulse Card */}
              <div className="lg:col-span-6 bg-surface border border-surface-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Cashflow Pulse</h2>
                      <p className="text-[11px] text-zinc-400">Daily velocity and activity trends</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-semibold bg-surface-raised border border-surface-border text-zinc-500">
                      Activity Range
                    </span>
                  </div>
                  <MoneyPulse data={summary.dailyPulse} currencySymbol={currencySymbol} />
                </div>
              </div>
            </div>

            {/* 3. Orbital Spend Weights Visualizer */}
            <div className="bg-surface border border-surface-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Orbital Spend Weights</h2>
                  <p className="text-[11px] text-zinc-400">Visual gravity model of filtered spending</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-semibold bg-surface-raised border border-surface-border text-zinc-500">
                  Interactive Simulation
                </span>
              </div>
              <MoneyOrbit
                key={`orbit-${summary.totalBalance}-${activeExpense}`}
                balance={summary.totalBalance}
                spent={activeExpense}
                categories={activeCategories}
                currencySymbol={currencySymbol}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ⚡ TAB 3: AUTOMATE (Date-Based Recurring Schedule Engine)     */}
        {/* ============================================================== */}
        {activeTab === 'automate' && (
          <AutomationsScreen
            rules={automations}
            categories={categories}
            currencySymbol={currencySymbol}
            onSaveRule={handleSaveAutomationRule}
            onDeleteRule={handleDeleteAutomationRule}
            onToggleRule={handleToggleAutomationRule}
            onTriggerRule={handleTriggerAutomationRule}
          />
        )}

        {/* ============================================================== */}
        {/* 📜 TAB 4: HISTORY (Complete Transaction Ledger) */}
        {/* ============================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  Financial Records
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                  Transaction History
                </h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Complete chronological ledger of all income and expenses.
                </p>
              </div>

              <button
                onClick={handleOpenExpense}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs transition-all shadow-md shadow-primary/20"
              >
                + Add Transaction
              </button>
            </div>

            {/* Complete Activity Timeline */}
            <ActivityTimeline
              transactions={transactions}
              categories={categories}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              currencySymbol={currencySymbol}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* 👤 TAB 4: PROFILE SCREEN (Full Dedicated Screen)              */}
        {/* ============================================================== */}
        {activeTab === 'profile' && user && (
          <ProfileScreen
            user={user}
            onProfileUpdated={(updatedUser) => {
              setUser(updatedUser);
              showToast('Profile updated successfully');
            }}
            onBackToHome={() => setActiveTab('home')}
          />
        )}

        {/* ============================================================== */}
        {/* ⚙️ TAB 5: SETTINGS SCREEN (Full Dedicated Screen)             */}
        {/* ============================================================== */}
        {activeTab === 'settings' && user && (
          <SettingsScreen
            user={user}
            currentTheme={theme}
            onThemeChange={handleThemeChange}
            onCurrencyChange={handleCurrencyChange}
            onBackToHome={() => setActiveTab('home')}
          />
        )}
      </main>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          showToast('Transaction saved');
          loadData();
        }}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => [...prev.filter((c) => c.id !== newCat.id), newCat]);
          showToast(`Category "${newCat.name}" added`);
        }}
        categories={categories}
        initialType={modalType}
        initialNaturalQuery={naturalQuery}
      />

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => {
          showToast('Transaction updated');
          loadData();
        }}
        onDelete={handleDeleteTransaction}
        transaction={editingTransaction}
        categories={categories}
      />
      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenQuickAdd={handleOpenExpense}
      />
    </div>
  );
}
