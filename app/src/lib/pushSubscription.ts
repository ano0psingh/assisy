import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BE-M2Jerx7wTM0P9MeI0Oa1HyVx9tzZ70UQlnFW4I1VEIC71SBbDJQKRU8XLtLm-4006BFQMVpTpG4MbnZZJB5M';

export interface PushDiagnostics {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  serviceWorkerReady: boolean;
  subscribed: boolean;
  serverBound: boolean;
  error?: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function saveSubscription(
  subscription: PushSubscription,
  habitReminders?: { name: string; time: string }[],
): Promise<boolean> {
  const token = await accessToken();
  if (!token) return false;
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      ...(habitReminders ? { habitReminders } : {}),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  return response.ok;
}

export async function subscribeToPush(
  habitReminders?: { name: string; time: string }[],
): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    return saveSubscription(subscription, habitReminders);
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

export async function updatePushReminders(
  habitReminders: { name: string; time: string }[],
): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    return saveSubscription(subscription, habitReminders);
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    let serverRemoved = true;
    const token = await accessToken();
    if (token) {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      serverRemoved = response.ok;
    }

    const browserRemoved = await subscription.unsubscribe();
    return serverRemoved && browserRemoved;
  } catch {
    return false;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/** Rebind an existing browser endpoint after sign-in or token refresh. */
export async function rebindPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? saveSubscription(subscription) : false;
}

export async function getPushDiagnostics(): Promise<PushDiagnostics> {
  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  if (!supported) return { supported, permission, serviceWorkerReady: false, subscribed: false, serverBound: false };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { supported, permission, serviceWorkerReady: true, subscribed: false, serverBound: false };
    }
    const serverBound = await saveSubscription(subscription);
    return { supported, permission, serviceWorkerReady: true, subscribed: true, serverBound };
  } catch (error) {
    return {
      supported,
      permission,
      serviceWorkerReady: false,
      subscribed: false,
      serverBound: false,
      error: error instanceof Error ? error.message : 'Push diagnostic failed',
    };
  }
}

export async function sendTestPush(): Promise<boolean> {
  const token = await accessToken();
  if (!token || !('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  const response = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  return response.ok;
}
