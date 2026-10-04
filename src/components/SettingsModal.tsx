'use client';

import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, DollarSign, CheckCircle2, Save, Settings as SettingsIcon } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { api } from '../lib/api';
import { SearchableSelect } from './SearchableSelect';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  currentTheme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onCurrencyChange: (currency: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  currentTheme,
  onThemeChange,
  onCurrencyChange,
}) => {
  const [currency, setCurrency] = useState('INR');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setCurrency(user.currency || 'INR');
    }
    setTheme(currentTheme);
  }, [user, currentTheme, isOpen]);

  if (!isOpen) return null;

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
    { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (CAD)' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      if (user) {
        const res = await api.updateProfile({
          currency,
        });
        if (res.success && res.data) {
          localStorage.setItem('flow_user', JSON.stringify(res.data));
        }
      }

      onCurrencyChange(currency);
      onThemeChange(theme);
      localStorage.setItem('flow_theme', theme);
      localStorage.setItem('flow_currency', currency);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl relative text-foreground">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Preferences & Settings</h2>
            <p className="text-xs text-zinc-500">Configure theme appearance and default currency</p>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings updated successfully!</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Theme Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20'
                    : 'border-surface-border bg-surface-raised text-zinc-400 hover:text-foreground'
                }`}
              >
                <Sun className="w-6 h-6" />
                <span className="text-xs font-semibold">Light (Default)</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-2 transition-all ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20'
                    : 'border-surface-border bg-surface-raised text-zinc-400 hover:text-foreground'
                }`}
              >
                <Moon className="w-6 h-6" />
                <span className="text-xs font-semibold">Dark Mode</span>
              </button>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Display Currency
            </label>
            <SearchableSelect
              value={currency}
              onChange={(val) => setCurrency(val)}
              options={currencies.map((c) => ({
                value: c.code,
                label: `${c.symbol} ${c.name}`,
              }))}
              searchPlaceholder="Search currency..."
            />
            <p className="text-[11px] text-zinc-500">
              Balances and transaction amounts will display with this currency symbol.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-md shadow-primary/25 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
