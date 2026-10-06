'use client';

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Sun, Moon, DollarSign, CheckCircle2, Save, ArrowLeft, Shield, Palette, Globe, ALargeSmall } from 'lucide-react';
import { UserProfile, FontSize } from '../lib/types';
import { api } from '../lib/api';

interface SettingsScreenProps {
  user: UserProfile;
  currentTheme: 'light' | 'dark';
  currentFontSize?: FontSize;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onFontSizeChange?: (size: FontSize) => void;
  onCurrencyChange: (currency: string) => void;
  onBackToHome: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  currentTheme,
  currentFontSize = 'medium',
  onThemeChange,
  onFontSizeChange,
  onCurrencyChange,
  onBackToHome,
}) => {
  const [currency, setCurrency] = useState(user.currency || 'INR');
  const [theme, setTheme] = useState<'light' | 'dark'>(currentTheme);
  const [fontSize, setFontSize] = useState<FontSize>(currentFontSize);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrency(user.currency || 'INR');
    setTheme(currentTheme);
    const savedFs = (localStorage.getItem('flow_font_size') as FontSize) || currentFontSize || 'medium';
    setFontSize(savedFs);
  }, [user, currentTheme, currentFontSize]);

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', locale: 'en-IN' },
    { code: 'USD', symbol: '$', name: 'US Dollar (USD)', locale: 'en-US' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', locale: 'en-GB' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)', locale: 'ja-JP' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (CAD)', locale: 'en-CA' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)', locale: 'en-AU' },
  ];

  const fontSizes: { id: FontSize; label: string; scale: string; desc: string; previewClass: string }[] = [
    { id: 'small', label: 'Small', scale: '87.5%', desc: 'Compact view for high data density', previewClass: 'text-xs' },
    { id: 'medium', label: 'Default', scale: '100%', desc: 'Balanced standard typography scale', previewClass: 'text-sm' },
    { id: 'large', label: 'Large', scale: '112.5%', desc: 'Comfortable size for easy reading', previewClass: 'text-base' },
    { id: 'xlarge', label: 'X-Large', scale: '125%', desc: 'Enhanced legibility and accessibility', previewClass: 'text-lg' },
  ];

  const handleFontSizeSelect = (size: FontSize) => {
    setFontSize(size);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', size);
    }
    if (onFontSizeChange) {
      onFontSizeChange(size);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    // 1. Immediately apply locally
    onCurrencyChange(currency);
    onThemeChange(theme);
    if (onFontSizeChange) {
      onFontSizeChange(fontSize);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', fontSize);
    }
    localStorage.setItem('flow_theme', theme);
    localStorage.setItem('flow_currency', currency);
    localStorage.setItem('flow_font_size', fontSize);

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

          {/* Typography & Font Size Section */}
          <div className="space-y-4 pt-4 border-t border-surface-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <ALargeSmall className="w-4 h-4 text-violet-500" />
                <span>Text Size & Typography Scaling</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-raised border border-surface-border text-zinc-400">
                Current: {fontSizes.find((f) => f.id === fontSize)?.scale} ({fontSizes.find((f) => f.id === fontSize)?.label})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {fontSizes.map((item) => {
                const isSelected = fontSize === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleFontSizeSelect(item.id)}
                    className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500/20 shadow-sm'
                        : 'border-surface-border bg-surface-raised text-zinc-500 hover:text-foreground hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold font-sans transition-all ${
                          isSelected
                            ? 'bg-violet-500 text-white border-violet-400 shadow-sm'
                            : 'bg-surface border-surface-border text-foreground'
                        }`}
                      >
                        <span className={item.previewClass}>Aa</span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-foreground">{item.label}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{item.scale}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Interactive Preview */}
            <div className="p-4 rounded-2xl bg-surface-raised border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 font-bold">
                  Aa
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Live Typography Preview</div>
                  <div className="text-xs text-zinc-500">Coffee with friends · ₹250.00 · Food & Dining</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  + ₹50,000 Income
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  - ₹450 Expense
                </span>
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
