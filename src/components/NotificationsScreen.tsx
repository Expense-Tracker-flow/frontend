'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, CheckCheck, AlertTriangle, TrendingUp, PencilLine } from 'lucide-react';
import { api, AlertItem } from '../lib/api';

interface NotificationsScreenProps {
  onBackToHome: () => void;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const iconFor = (type: string) => {
  if (type === 'SPEND_UP') return <TrendingUp className="w-4 h-4 text-rose-500" />;
  if (type === 'NO_ENTRY') return <PencilLine className="w-4 h-4 text-amber-500" />;
  return <AlertTriangle className="w-4 h-4 text-primary" />;
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBackToHome }) => {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.getNotifications(localToday());
      if (res.success && res.data) {
        setItems(res.data.items);
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Keep whatever is already shown
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markOne = async (item: AlertItem) => {
    if (item.readAt) return;
    try {
      await api.markNotificationRead(item.id);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, readAt: now } : i)));
      setUnreadCount((n) => Math.max(0, n - 1));
    } catch {
      // Leave it unread if the server did not confirm
    }
  };

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt || now })));
      setUnreadCount(0);
    } catch {
      // Nothing changes if the request fails
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto space-y-5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-2 text-xs font-mono text-zinc-500 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="bg-surface border border-surface-border/60 rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/5 text-primary flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">Notifications</h1>
              <p className="text-[11px] text-zinc-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No notifications</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markOne(item)}
                className={`w-full text-left flex gap-3 p-3.5 rounded-2xl border border-surface-border/60 hover:bg-surface-raised/60 transition-colors cursor-pointer ${
                  item.readAt ? 'opacity-70' : ''
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">{iconFor(item.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{item.title}</span>
                    <span className="text-[10px] text-zinc-400 flex-shrink-0">{formatWhen(item.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{item.message}</p>
                </div>
                {!item.readAt && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
