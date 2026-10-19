'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, AlertTriangle, TrendingUp, PencilLine } from 'lucide-react';
import { api, AlertItem } from '../lib/api';
import { UserProfile } from '../lib/types';

interface NotificationBellProps {
  user: UserProfile | null;
  onShowAll?: () => void;
}

// How many alerts the bell panel shows before "Show all"
const PANEL_LIMIT = 7;

const REFRESH_MS = 5 * 60 * 1000;

// Local calendar date, so "today" matches the user's clock
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const iconFor = (type: string) => {
  if (type === 'SPEND_UP') return <TrendingUp className="w-4 h-4 text-rose-500" />;
  if (type === 'NO_ENTRY') return <PencilLine className="w-4 h-4 text-amber-500" />;
  return <AlertTriangle className="w-4 h-4 text-primary" />;
};

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ user, onShowAll }) => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AlertItem[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.getNotifications(localToday());
      if (res.success && res.data) {
        setUnreadCount(res.data.unreadCount);
        setItems(res.data.items);
      }
    } catch {
      // Alerts are not essential; keep the last list and try again later
    }
  };

  // Load on sign-in, then refresh regularly
  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [user]);

  // Close the panel when clicking outside it
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideBell = wrapRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideBell && !insidePanel) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  const markOne = async (item: AlertItem) => {
    if (item.readAt) return;
    try {
      await api.markNotificationRead(item.id);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, readAt: now } : i)));
      setUnreadCount((n) => Math.max(0, n - 1));
    } catch {
    }
  };

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt || now })));
      setUnreadCount(0);
    } catch {
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) load();
        }}
        className="relative w-8 h-8 rounded-full bg-surface-raised hover:bg-primary/10 border border-surface-border hover:border-primary/30 text-zinc-500 hover:text-primary flex items-center justify-center transition-all cursor-pointer"
        title="Alerts"
        aria-label="Alerts"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drawn on the page body, so the sticky header's blur and stacking do not hide it */}
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed right-3 top-20 w-80 max-w-[calc(100vw-1.5rem)] max-h-[60vh] flex flex-col bg-surface border border-surface-border rounded-2xl shadow-2xl z-[80] text-foreground"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <span className="text-xs font-bold">Alerts</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto">

            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-zinc-500">No notifications</p>
            ) : (
              items.slice(0, PANEL_LIMIT).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    markOne(item);
                    setOpen(false);
                    onShowAll?.();
                  }}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-surface-border/60 last:border-0 hover:bg-surface-raised transition-colors cursor-pointer ${
                    item.readAt ? 'opacity-70' : ''
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">{iconFor(item.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{item.title}</span>
                      <span className="text-[10px] text-zinc-400 flex-shrink-0">{timeAgo(item.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{item.message}</p>
                  </div>
                  {!item.readAt && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onShowAll?.();
              }}
              className="px-4 py-3 text-xs font-semibold text-primary hover:bg-surface-raised text-center border-t border-surface-border/60 cursor-pointer rounded-b-2xl"
            >
              Show all notifications
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
