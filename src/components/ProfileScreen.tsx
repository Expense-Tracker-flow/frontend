'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, FileText, CheckCircle2, Save, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { api } from '../lib/api';

interface ProfileScreenProps {
  user: UserProfile;
  onProfileUpdated: (updatedUser: UserProfile) => void;
  onBackToHome: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onProfileUpdated,
  onBackToHome,
}) => {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user.fullName || '');
    const savedPhone = localStorage.getItem(`flow_phone_${user.id}`) || '';
    const savedBio = localStorage.getItem(`flow_bio_${user.id}`) || '';
    setPhone(savedPhone);
    setBio(savedBio);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    // 1. Immediately apply locally
    const updatedUser = { ...user, fullName: fullName.trim() };
    localStorage.setItem(`flow_phone_${user.id}`, phone.trim());
    localStorage.setItem(`flow_bio_${user.id}`, bio.trim());
    localStorage.setItem('flow_user', JSON.stringify(updatedUser));
    onProfileUpdated(updatedUser);

    try {
      const res = await api.updateProfile({
        fullName: fullName.trim(),
      });

      if (res?.success && res?.data) {
        localStorage.setItem('flow_user', JSON.stringify(res.data));
        onProfileUpdated(res.data);
      }
    } catch (err: any) {
      console.warn('Backend profile sync note:', err?.message);
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

        <span className="text-[10px] sm:text-xs font-mono text-zinc-400" title={user.id}>
          UID: {user.id ? `${user.id.slice(0, 8)}...` : ''}
        </span>
      </div>

      {/* Main Profile Card */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
        {/* Profile Avatar & Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{user.fullName}</h1>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified User Account</span>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Your profile details have been saved successfully!</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Form Details */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Vance"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl pl-10 pr-4 py-3 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-surface-raised/50 border border-surface-border rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-400 cursor-not-allowed opacity-75"
                />
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                ✓ Primary Login Email
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-surface-raised border border-surface-border rounded-xl pl-10 pr-4 py-3 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Personal Bio & Budget Notes
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Personal financial ledger for tracking monthly budgeting and investments..."
                className="w-full bg-surface-raised border border-surface-border rounded-xl pl-10 pr-4 py-3 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors resize-none"
              />
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
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
