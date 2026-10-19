import { api } from './api';

// Phone notifications are on by default. The user's choice to turn them off is kept on this device.
const PREF_KEY = 'flow_phone_alerts';

export const phoneAlertsWanted = (): boolean => {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    return true;
  }
};

export const setPhoneAlertsWanted = (on: boolean) => {
  try {
    localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
  } catch {
    // Storage unavailable (private mode): the choice lasts for this visit only
  }
};

export type PushState = 'unsupported' | 'ios-needs-install' | 'blocked' | 'off' | 'on';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const registration = () => navigator.serviceWorker.ready;

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) {
    // On iPhone, web push only works once the app is added to the home screen
    return isIos() && !isInstalled() ? 'ios-needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'blocked';
  const sub = await (await registration()).pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

// Asks for permission, subscribes this browser, and saves the subscription on the server
export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked. Allow them for this site in your browser or phone settings.');
  }

  const notAvailable = 'Phone notifications are not available on the server yet.';
  let keyRes;
  try {
    keyRes = await api.getPushPublicKey();
  } catch {
    // The server does not have the push routes yet, or it is unreachable
    throw new Error(notAvailable);
  }
  if (!keyRes.success || !keyRes.data?.enabled || !keyRes.data.publicKey) {
    throw new Error(notAvailable);
  }

  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(keyRes.data.publicKey) as BufferSource,
    });
  }

  const json = sub.toJSON();
  await api.subscribePush({
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
  });
}

// Removes this browser's subscription on the server and in the browser
export async function disablePush(): Promise<void> {
  const sub = await (await registration()).pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await api.unsubscribePush(endpoint);
}

function urlBase64ToBytes(base64: string): Uint8Array {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
