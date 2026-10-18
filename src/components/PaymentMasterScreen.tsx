'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Wallet, Plus, Trash2, Lock, Search, X, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { PaymentTypeInfo, loadPaymentTypes } from '../lib/paymentTypes';

interface PaymentMasterScreenProps {
  onBackToHome: () => void;
}

export const PaymentMasterScreen: React.FC<PaymentMasterScreenProps> = ({ onBackToHome }) => {
  const [types, setTypes] = useState<PaymentTypeInfo[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      setTypes(await loadPaymentTypes());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? types.filter((t) => t.label.toLowerCase().includes(q)) : types;
  }, [types, search]);

  const handleDelete = async (t: PaymentTypeInfo) => {
    if (!window.confirm(`Delete "${t.label}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await api.deletePaymentType(t.code);
      if (res.success) {
        setSuccess(`"${t.label}" deleted`);
        await load();
      } else {
        setError(res.message || 'Could not delete payment type');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not delete payment type');
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-2 text-xs font-mono text-zinc-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Payment Type Master</h1>
            <p className="text-xs text-zinc-500 mt-0.5">The payment types you can pick when recording a transaction.</p>
          </div>
        </div>

        {/* Search and create */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payment types..."
              className="w-full bg-surface-raised border border-surface-border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setIsDialogOpen(true);
            }}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add payment type</span>
          </button>
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}
        {success && <p className="text-xs text-emerald-600 dark:text-emerald-400">{success}</p>}

        {/* List: built-in types locked, custom types removable */}
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-xs text-zinc-500">Loading payment types...</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-zinc-500">No payment types match "{search}".</p>
          ) : (
            visible.map((t) => (
              <div
                key={t.code}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-raised border border-surface-border"
              >
                <span className="text-xs font-medium text-foreground truncate">{t.label}</span>

                {t.builtIn ? (
                  <span className="flex items-center space-x-1 text-[10px] font-mono text-zinc-400">
                    <Lock className="w-3 h-3" />
                    <span>Built-in</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDelete(t)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete payment type"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <AddPaymentTypeDialog
        isOpen={isDialogOpen}
        existingLabels={types.map((t) => t.label)}
        onClose={() => setIsDialogOpen(false)}
        onCreated={(label) => {
          setSuccess(`"${label}" added`);
          load();
        }}
      />
    </div>
  );
};

interface AddPaymentTypeDialogProps {
  isOpen: boolean;
  existingLabels: string[];
  onClose: () => void;
  onCreated: (label: string) => void;
}

const AddPaymentTypeDialog: React.FC<AddPaymentTypeDialogProps> = ({ isOpen, existingLabels, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const trimmed = name.trim();
  const isDuplicate = Boolean(trimmed && existingLabels.some((l) => l.toLowerCase() === trimmed.toLowerCase()));

  const close = () => {
    setName('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (isDuplicate) {
      setError(`"${trimmed}" already exists.`);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await api.createPaymentType({ name: trimmed });
      if (res.success) {
        onCreated(trimmed);
        close();
      } else {
        setError(res.message || 'Could not add payment type');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not add payment type');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-surface border border-surface-border rounded-3xl shadow-2xl p-5 space-y-4 text-left"
      >
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-foreground">New Payment Type</h4>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
              Payment Type Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              maxLength={50}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Paytm Wallet, Company Card"
              className={`w-full bg-surface-raised border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all ${
                isDuplicate || error
                  ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-surface-border focus:border-primary focus:ring-primary/20'
              }`}
            />
            {(isDuplicate || error) && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center space-x-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{isDuplicate ? `"${trimmed}" already exists.` : error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={close}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !trimmed || isDuplicate}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-primary/25 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Add Payment Type'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
