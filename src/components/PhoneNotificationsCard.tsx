'use client';

import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import {
  PushState,
  disablePush,
  enablePush,
  getPushState,
  phoneAlertsWanted,
  setPhoneAlertsWanted,
} from '../lib/push';

const MESSAGES: Partial<Record<PushState, string>> = {
  unsupported: 'Phone notifications are not supported in this browser.',
  'ios-needs-install': 'On iPhone, add FIN-XL to your Home Screen first, then turn this on.',
  blocked: 'Notifications are blocked for this site. Allow them in your browser or phone settings.',
};

export const PhoneNotificationsCard: React.FC = () => {
  // On by default; the switch shows what the user chose on this device
  const [wanted, setWanted] = useState<boolean>(true);
  const [state, setState] = useState<PushState>('off');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshState = async () => {
    const next = await getPushState().catch((): PushState => 'unsupported');
    setState(next);
    return next;
  };

  useEffect(() => {
    const on = phoneAlertsWanted();
    setWanted(on);
    refreshState().then(async (current) => {
      // Default on: subscribe automatically if the permission is already granted or not yet asked
      if (on && current === 'off') {
        try {
          await enablePush();
        } catch (e: any) {
          setError(e?.message || null);
        }
        refreshState();
      }
    });
  }, []);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (wanted) {
        setPhoneAlertsWanted(false);
        setWanted(false);
        await disablePush();
      } else {
        setPhoneAlertsWanted(true);
        setWanted(true);
        await enablePush();
      }
    } catch (e: any) {
      setError(e?.message || 'Could not change phone notifications.');
    } finally {
      await refreshState();
      setBusy(false);
    }
  };

  const isOn = wanted;
  const canToggle = state !== 'unsupported' && state !== 'ios-needs-install' && state !== 'blocked';

  return (
    <div className="bg-surface border border-surface-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 flex-shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Phone notifications</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Get alerts such as budget warnings and reminders on this device, even when the app is closed.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label="Phone notifications"
          disabled={!canToggle || busy}
          onClick={toggle}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 cursor-pointer ${
            isOn ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              isOn ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {MESSAGES[state] && <p className="mt-3 text-[11px] text-zinc-500">{MESSAGES[state]}</p>}
      {error && <p className="mt-3 text-[11px] text-rose-500">{error}</p>}
    </div>
  );
};
