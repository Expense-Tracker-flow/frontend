'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, FileText, CheckCircle2, Save, Sparkles } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { api } from '../lib/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onProfileUpdated: (updatedUser: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      const savedPhone = localStorage.getItem(`flow_phone_${user.id}`) || '';
      const savedBio = localStorage.getItem(`flow_bio_${user.id}`) || '';
      setPhone(savedPhone);
      setBio(savedBio);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const res = await api.updateProfile({
        fullName: fullName.trim(),
      });

      if (res.success && res.data) {
        localStorage.setItem(`flow_phone_${user.id}`, phone.trim());
        localStorage.setItem(`flow_bio_${user.id}`, bio.trim());
        localStorage.setItem('flow_user', JSON.stringify(res.data));
        onProfileUpdated(res.data);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl relative text-foreground">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-zinc-400 hover:text-foreground hover:bg-surface-raised transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">My Profile</h2>
            <p className="text-xs text-zinc-500">Manage your personal details and account info</p>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile saved successfully!</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">
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
                className="w-full bg-surface-raised border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full bg-surface-raised/50 border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-400 cursor-not-allowed opacity-75"
              />
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">✓ Verified Account Email</span>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-surface-raised border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Personal Bio / Note
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Personal ledger for tracking monthly budgeting and investments..."
                className="w-full bg-surface-raised border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-zinc-400 focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3">
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
              <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
