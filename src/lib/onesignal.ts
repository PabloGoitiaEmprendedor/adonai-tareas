const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string;

type OneSignalListener = (event: unknown) => void;

type OneSignalWebSdk = {
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void>;
    addEventListener: (event: string, listener: OneSignalListener) => void;
    removeEventListener: (event: string, listener: OneSignalListener) => void;
  };
  User: {
    PushSubscription: {
      id?: string | null;
      token?: string | null;
      optedIn?: boolean;
      optIn: () => Promise<void>;
    };
    addTag?: (key: string, value: string) => void;
    addTags?: (tags: Record<string, string>) => void;
    removeTag?: (key: string) => void;
    addEmail?: (email: string) => Promise<void>;
    removeEmail?: (email: string) => Promise<void>;
  };
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalWebSdk) => void | Promise<void>>;
    OneSignal?: OneSignalWebSdk;
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
  if (!isOneSignalSupported()) return;
  if (getOnesignalAppId() === '__ONESIGNAL_APP_ID__') return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.User.PushSubscription.optIn();
      console.info('[OneSignal] Push subscription status', {
        origin: window.location.origin,
        permission: OneSignal.Notifications.permission,
        subscriptionId: OneSignal.User.PushSubscription.id || null,
        token: OneSignal.User.PushSubscription.token || null,
        optedIn: OneSignal.User.PushSubscription.optedIn,
      });
    } catch (error) {
      console.error('[OneSignal] Unable to subscribe this browser', error);
    }
  });
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
