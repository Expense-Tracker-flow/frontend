'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile } from '../lib/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        const res = await api.register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          currency,
        });

        if (res.success && res.data) {
          localStorage.setItem('flow_access_token', res.data.accessToken);
          localStorage.setItem('flow_refresh_token', res.data.refreshToken);
          localStorage.setItem('flow_user', JSON.stringify(res.data.user));
          onAuthSuccess(res.data.user);
          onClose();
        }
      } else {
        const res = await api.login({
          email: email.trim(),
          password,
        });

        if (res.success && res.data) {
          localStorage.setItem('flow_access_token', res.data.accessToken);
          localStorage.setItem('flow_refresh_token', res.data.refreshToken);
          localStorage.setItem('flow_user', JSON.stringify(res.data.user));
          onAuthSuccess(res.data.user);
          onClose();
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || (mode === 'login' ? 'Invalid credentials' : 'Registration failed');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-surface border border-surface-border rounded-3xl shadow-2xl overflow-hidden p-6 text-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                {mode === 'login' ? 'Sign In to FLOW' : 'Create FLOW Account'}
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                {mode === 'login'
                  ? 'Access your private financial ledger'
                  : 'Start tracking your money effortlessly'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-surface-raised p-1 rounded-2xl my-4 text-xs font-semibold border border-surface-border">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'login' ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'register' ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Vance"
                    className="w-full bg-surface-raised border border-surface-border rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@flow.app"
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase font-semibold text-zinc-600 dark:text-zinc-300 tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-raised border border-surface-border rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 rounded-2xl bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/30 active:scale-[0.99]"
            >
              <span>{isLoading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
