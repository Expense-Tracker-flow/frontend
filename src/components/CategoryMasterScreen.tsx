'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Lock, Tags, Search } from 'lucide-react';
import { Category } from '../lib/types';
import { api } from '../lib/api';
import { AddCategoryDialog } from './AddCategoryDialog';

interface CategoryMasterScreenProps {
  onBackToHome: () => void;
  onCategoriesChanged: () => void;
}

type CategoryKind = 'EXPENSE' | 'INCOME';

export const CategoryMasterScreen: React.FC<CategoryMasterScreenProps> = ({ onBackToHome, onCategoriesChanged }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.getCategories();
      if (res.success && res.data) setCategories(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Default categories first, then the user's own, each group alphabetical
  const q = search.trim().toLowerCase();
  const visible = categories
    .filter((c) => c.type === kind && (!q || c.name.toLowerCase().includes(q)))
    .sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name));

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Delete "${category.name}"? Existing transactions keep their amounts but lose this category.`)) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await api.deleteCategory(category.id);
      if (res.success) {
        setSuccess(`"${category.name}" deleted`);
        await load();
        onCategoriesChanged();
      } else {
        setError(res.message || 'Could not delete category');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not delete category');
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Category Master</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Create the categories you use for expenses and income.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setIsDialogOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold transition-colors shadow-md shadow-primary/25 flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add category</span>
          </button>
        </div>

        {/* Expense / Income switch */}
        <div className="grid grid-cols-2 gap-1 bg-surface-raised p-1 rounded-2xl border border-surface-border text-xs font-semibold">
          {(['EXPENSE', 'INCOME'] as CategoryKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                setError(null);
                setSuccess(null);
              }}
              className={`py-2 rounded-xl transition-all ${
                kind === k ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              {k === 'EXPENSE' ? 'Expense categories' : 'Income categories'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-surface-raised border border-surface-border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}
        {success && <p className="text-xs text-emerald-600 dark:text-emerald-400">{success}</p>}

        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-xs text-zinc-500">Loading categories...</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-zinc-500">No categories yet.</p>
          ) : (
            visible.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-raised border border-surface-border"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#71717a' }} />
                  <span className="text-xs font-medium text-foreground truncate">{c.name}</span>
                </div>

                {c.isSystem ? (
                  <span className="flex items-center space-x-1 text-[10px] font-mono text-zinc-400">
                    <Lock className="w-3 h-3" />
                    <span>Default</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <AddCategoryDialog
        isOpen={isDialogOpen}
        type={kind}
        existingCategories={categories}
        onClose={() => setIsDialogOpen(false)}
        onCreated={(created) => {
          setSuccess(`"${created.name}" added`);
          setCategories((prev) => [...prev.filter((c) => c.id !== created.id), created]);
          onCategoriesChanged();
        }}
      />
    </div>
  );
};
