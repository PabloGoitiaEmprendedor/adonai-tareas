const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string;

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export function getOnesignalAppId(): string {
  return ONESIGNAL_APP_ID;
}

export function isOneSignalSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function getOneSignalUserId(): Promise<string | null> {
  try {
    if (window.OneSignal?.User?.PushSubscription?.id) {
      return window.OneSignal.User.PushSubscription.id;
    }
    return null;
  } catch {
    return null;
  }
}

export async function subscribeOneSignal(): Promise<boolean> {
  try {
    if (!window.OneSignal) {
      console.warn('[OneSignal] SDK not loaded yet');
      return false;
    }
    await window.OneSignal.Notifications.requestPermission();
    return true;
  } catch (err) {
    console.error('[OneSignal] subscribe error:', err);
    return false;
  }
}

export async function loginOneSignal(externalId: string): Promise<void> {
  try {
    if (!window.OneSignal) return;
    await window.OneSignal.login(externalId);
  } catch {
    // silent
  }
}

export async function logoutOneSignal(): Promise<void> {
  try {
    if (!window.OneSignal) return;
    await window.OneSignal.logout();
  } catch {
    // silent
  }
}

export async function ensureOneSignalSubscribed(): Promise<void> {
  try {
    if (!isOneSignalSupported()) return;
    if (!window.OneSignal) return;
    if (getOnesignalAppId() === '__ONESIGNAL_APP_ID__') return;
    if (window.OneSignal.Notifications.permission) return;
    await window.OneSignal.Notifications.requestPermission();
  } catch {
    // silent
  }
}

export function addOnesignalTag(key: string, value: string): void {
  try {
    if (!window.OneSignal?.User?.addTag) return;
    window.OneSignal.User.addTag(key, value);
  } catch {
    // silent
  }
}

export function addOnesignalTags(tags: Record<string, string>): void {
  try {
    if (!window.OneSignal?.User?.addTags) return;
    window.OneSignal.User.addTags(tags);
  } catch {
    // silent
  }
}

export function removeOnesignalTag(key: string): void {
  try {
    if (!window.OneSignal?.User?.removeTag) return;
    window.OneSignal.User.removeTag(key);
  } catch {
    // silent
  }
}

export async function setOnesignalEmail(email: string): Promise<void> {
  try {
    if (!window.OneSignal?.User?.addEmail) return;
    await window.OneSignal.User.addEmail(email);
  } catch {
    // silent
  }
}

export async function removeOnesignalEmail(email: string): Promise<void> {
  try {
    if (!window.OneSignal?.User?.removeEmail) return;
    await window.OneSignal.User.removeEmail(email);
  } catch {
    // silent
  }
}
