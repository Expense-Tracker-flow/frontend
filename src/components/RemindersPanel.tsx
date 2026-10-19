'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Check, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Category, PaymentReminder, PaymentReminderInput } from '../lib/types';
import { api } from '../lib/api';
import { logReminderAsExpense } from '../lib/reminders';
import { getCustomPaymentTypes, paymentLabel } from '../lib/paymentTypes';
import { SearchableSelect, SelectOption } from './SearchableSelect';

const PAYMENT_OPTIONS: SelectOption[] = [
  { value: 'UPI', label: 'UPI / Autopay' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'CASH', label: 'Cash' },
];

const DAY_OF_MONTH_OPTIONS: SelectOption[] = Array.from({ length: 31 }, (_, i) => i + 1).map((d) => ({
  value: d.toString(),
  label: `${d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : `${d}th`} of every month`,
}));

const REMIND_OPTIONS: SelectOption[] = [
  { value: '0', label: 'On the due date' },
  { value: '1', label: '1 day before' },
  { value: '2', label: '2 days before' },
  { value: '3', label: '3 days before' },
  { value: '5', label: '5 days before' },
  { value: '7', label: '7 days before' },
];

const ordinal = (d: number) => `${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}`;

// Days from today to a YYYY-MM-DD date, using the local calendar date
const daysUntil = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

const dueText = (dateStr: string) => {
  const days = daysUntil(dateStr);
  if (days < 0) return { text: 'Unpaid, past due', urgent: true };
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days === 1) return { text: 'Due tomorrow', urgent: true };
  return { text: `In ${days} days`, urgent: false };
};

const EMPTY_FORM = {
  title: '',
  amount: '',
  dueDay: '1',
  remindDaysBefore: '1',
  categoryId: '',
  paymentMethod: 'UPI',
};

interface RemindersPanelProps {
  categories: Category[];
  currencySymbol: string;
  onExpenseLogged?: () => void;
}

export const RemindersPanel: React.FC<RemindersPanelProps> = ({ categories, currencySymbol, onExpenseLogged }) => {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [loaded, setLoaded] = useState(false);
  // null = list only; 'new' = blank form; a reminder = editing that one
  const [editing, setEditing] = useState<PaymentReminder | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.getPaymentReminders();
      if (res.success && res.data) setReminders(res.data);
      setListError(null);
    } catch {
      setListError('Could not load payment reminders. Check your connection and try again.');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const openNew = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing('new');
  };

  const openEdit = (r: PaymentReminder) => {
    setForm({
      title: r.title,
      amount: String(r.amount),
      dueDay: String(r.dueDay),
      remindDaysBefore: String(r.remindDaysBefore),
      categoryId: r.categoryId || '',
      paymentMethod: r.paymentMethod || 'UPI',
    });
    setFormError(null);
    setEditing(r);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.title.trim()) {
      setFormError('Please give this reminder a name');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setFormError('Please enter an amount greater than 0');
      return;
    }

    const body: PaymentReminderInput = {
      title: form.title.trim(),
      amount,
      dueDay: parseInt(form.dueDay, 10),
      remindDaysBefore: parseInt(form.remindDaysBefore, 10),
      categoryId: form.categoryId || null,
      paymentMethod: form.paymentMethod || null,
    };

    setSaving(true);
    try {
      const res = editing && editing !== 'new'
        ? await api.updatePaymentReminder(editing.id, body)
        : await api.createPaymentReminder(body);
      if (!res.success) throw new Error(res.message || 'Could not save the reminder');
      setEditing(null);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Could not save the reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePaymentReminder(id);
      await load();
    } catch {
      setListError('Could not delete the reminder. Try again.');
    }
  };

  const handleLog = async (r: PaymentReminder) => {
    setBusyId(r.id);
    setListError(null);
    try {
      await logReminderAsExpense(r);
      setDoneId(r.id);
      setTimeout(() => setDoneId(null), 2200);
      onExpenseLogged?.();
      await load();
    } catch (err: any) {
      setListError(err?.response?.data?.message || err?.message || 'Could not add the expense');
    } finally {
      setBusyId(null);
    }
  };

  const paymentOptions = [...PAYMENT_OPTIONS, ...getCustomPaymentTypes().map((c) => ({ value: c.code, label: c.label }))];

  return (
    <div className="bg-surface border border-surface-border/60 rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-primary/5 text-primary flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">Payment Reminders</h3>
            <p className="text-[10px] sm:text-[11px] text-zinc-400">
              Get a phone alert before a bill is due. Tap “Add expense” to log it.
            </p>
          </div>
        </div>

        {editing === null && (
          <button
            type="button"
            onClick={openNew}
            className="px-3.5 py-2 rounded-2xl bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Reminder</span>
          </button>
        )}
      </div>

      {listError && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
          {listError}
        </div>
      )}

      {/* Add / edit form */}
      {editing !== null && (
        <form onSubmit={handleSave} className="p-3.5 sm:p-4 rounded-2xl bg-surface-raised/50 border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-zinc-500">
              {editing === 'new' ? 'New payment reminder' : 'Edit payment reminder'}
            </span>
            <button type="button" onClick={() => setEditing(null)} className="p-1 rounded-lg text-zinc-400 hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">Bill Name</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Credit card, Electricity, Rent"
                className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">Amount ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full bg-surface-raised border border-surface-border rounded-2xl px-3.5 py-2.5 text-xs font-mono text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">Due Date</label>
              <SearchableSelect
                value={form.dueDay}
                onChange={(val) => setForm({ ...form, dueDay: val })}
                options={DAY_OF_MONTH_OPTIONS}
                searchPlaceholder="Search day..."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">Remind Me</label>
              <SearchableSelect
                value={form.remindDaysBefore}
                onChange={(val) => setForm({ ...form, remindDaysBefore: val })}
                options={REMIND_OPTIONS}
                searchable={false}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">Category</label>
              <SearchableSelect
                value={form.categoryId}
                onChange={(val) => setForm({ ...form, categoryId: val })}
                options={expenseCategories.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
                placeholder="Default Category..."
                searchPlaceholder="Search categories..."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">Payment Method</label>
              <SearchableSelect
                value={form.paymentMethod}
                onChange={(val) => setForm({ ...form, paymentMethod: val })}
                options={paymentOptions}
                placeholder="Select Payment Method..."
                searchPlaceholder="Search payment method..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-foreground">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : editing === 'new' ? 'Save Reminder' : 'Update Reminder'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Reminder list */}
      {!loaded ? (
        <div className="py-10 text-center text-xs text-zinc-400">Loading reminders...</div>
      ) : reminders.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <p className="text-xs font-bold text-foreground">No payment reminders yet</p>
          <p className="text-[11px] text-zinc-400">Add a bill like rent, a card payment or a subscription to get an alert before it is due.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reminders.map((r) => {
            const due = dueText(r.nextDueDate);
            const busy = busyId === r.id;
            return (
              <div
                key={r.id}
                className={`relative overflow-hidden rounded-2xl border border-surface-border/60 p-4 flex flex-col justify-between space-y-3 bg-surface ${
                  r.active ? '' : 'opacity-60'
                }`}
              >
                <span className="absolute left-4 top-[1.15rem] w-1.5 h-1.5 rounded-full bg-rose-400" />

                <div className="flex items-start justify-between gap-2.5 pl-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">{r.title}</h4>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px] sm:text-[11px] font-mono text-zinc-400">
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${due.urgent ? 'bg-amber-500/10 text-amber-500' : 'bg-surface-raised text-zinc-400'}`}>
                        {due.text}
                      </span>
                      <span>•</span>
                      <span>{ordinal(r.dueDay)} of month</span>
                      <span>•</span>
                      <span>{r.remindDaysBefore === 0 ? 'Alert on due date' : `Alert ${r.remindDaysBefore} day${r.remindDaysBefore > 1 ? 's' : ''} before`}</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-mono text-zinc-500 mt-1">
                      {paymentLabel(r.paymentMethod || 'UPI')}
                    </div>
                  </div>
                  <div className="font-mono font-black text-xs sm:text-base text-foreground flex-shrink-0">
                    {currencySymbol}{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 pl-3">
                  <button
                    type="button"
                    onClick={() => handleLog(r)}
                    disabled={busy || !r.active}
                    className={`px-2.5 py-1 rounded-xl border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all ${
                      doneId === r.id
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-transparent hover:bg-primary/5 text-primary border-primary/20 active:scale-95'
                    }`}
                  >
                    {busy ? <Sparkles className="w-2.5 h-2.5 animate-spin" /> : doneId === r.id ? <Check className="w-2.5 h-2.5" /> : null}
                    <span>{doneId === r.id ? 'Logged!' : busy ? 'Adding...' : 'Add expense'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface border border-transparent hover:border-surface-border transition-all"
                      title="Edit Reminder"
                      aria-label="Edit Reminder"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                      title="Delete Reminder"
                      aria-label="Delete Reminder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
