'use client';

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Sun, Moon, DollarSign, CheckCircle2, Save, ArrowLeft, Shield, Palette, Globe, Smartphone, Download } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { api } from '../lib/api';

interface SettingsScreenProps {
  user: UserProfile;
  currentTheme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onCurrencyChange: (currency: string) => void;
  onBackToHome: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  currentTheme,
  onThemeChange,
  onCurrencyChange,
  onBackToHome,
}) => {
  const [currency, setCurrency] = useState(user.currency || 'INR');
  const [theme, setTheme] = useState<'light' | 'dark'>(currentTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("To install on iOS Safari: Tap the Share button (⎋) and select 'Add to Home Screen'.\n\nOn Chrome or Edge: Click the install icon in the address bar.");
    }
  };

  useEffect(() => {
    setCurrency(user.currency || 'INR');
    setTheme(currentTheme);
  }, [user, currentTheme]);

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', locale: 'en-IN' },
    { code: 'USD', symbol: '$', name: 'US Dollar (USD)', locale: 'en-US' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', locale: 'en-GB' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)', locale: 'ja-JP' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (CAD)', locale: 'en-CA' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)', locale: 'en-AU' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    // 1. Immediately apply locally
    onCurrencyChange(currency);
    onThemeChange(theme);
    localStorage.setItem('flow_theme', theme);
    localStorage.setItem('flow_currency', currency);

    try {
      const res = await api.updateProfile({
        currency,
      });

      if (res?.success && res?.data) {
        localStorage.setItem('flow_user', JSON.stringify(res.data));
      }
    } catch (err: any) {
      console.warn('Backend sync note:', err?.message);
    } finally {
      setIsSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-2 text-xs font-mono text-zinc-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <span className="text-xs font-mono text-zinc-400">Settings & System Preferences</span>
      </div>

      {/* Main Settings Card */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-4 pb-6 border-b border-surface-border">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <SettingsIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Preferences & Settings</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Customize theme mode, default currency, and ledger options</p>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Preferences saved and applied successfully!</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-8">
          {/* Theme Mode Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <Palette className="w-4 h-4 text-primary" />
              <span>Theme Appearance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Light Theme Card */}
              <div
                onClick={() => setTheme('light')}
                className={`p-5 rounded-2xl border cursor-pointer flex items-center space-x-4 transition-all ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm'
                    : 'border-surface-border bg-surface-raised text-zinc-500 hover:text-foreground'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-surface-border flex items-center justify-center text-amber-500 shadow-sm">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Light Theme (Default)</div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Clean white canvas with soft contrast</p>
                </div>
              </div>

              {/* Dark Theme Card */}
              <div
                onClick={() => setTheme('dark')}
                className={`p-5 rounded-2xl border cursor-pointer flex items-center space-x-4 transition-all ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm'
                    : 'border-surface-border bg-surface-raised text-zinc-500 hover:text-foreground'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-surface-border flex items-center justify-center text-indigo-400 shadow-sm">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Dark Mode</div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Deep slate backdrop for low light</p>
                </div>
              </div>
            </div>
          </div>

          {/* Currency Preference Section */}
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <Globe className="w-4 h-4 text-emerald-500" />
              <span>Display Currency</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currencies.map((c) => (
                <div
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    currency === c.code
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                      : 'border-surface-border bg-surface-raised text-zinc-500 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-8 h-8 rounded-xl bg-surface border border-surface-border flex items-center justify-center font-mono font-bold text-foreground">
                      {c.symbol}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-foreground">{c.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{c.code}</div>
                    </div>
                  </div>

                  {currency === c.code && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PWA App Installation Section */}
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <div className="flex items-center space-x-2 text-[10px] sm:text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Progressive Web App</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl border border-surface-border bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
              <div className="flex items-start sm:items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <span>FIN-XL App</span>
                    {isStandalone && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Installed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {isStandalone 
                      ? 'You are running FIN-XL as an installed app.' 
                      : 'Add PWA to your phone for easier use.'}
                  </p>
                </div>
              </div>

              {!isStandalone && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-primary/25 flex-shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Add to Phone</span>
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-between border-t border-surface-border">
            <button
              type="button"
              onClick={onBackToHome}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Applying Settings...' : 'Save & Apply Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
