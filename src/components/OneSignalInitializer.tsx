import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import {
  isOneSignalSupported,
  getOnesignalAppId,
  loginOneSignal,
  logoutOneSignal,
  addOnesignalTag,
  setOnesignalEmail,
} from '@/lib/onesignal';

const isElectron = !!(
  window.electronAPI ||
  navigator.userAgent.toLowerCase().includes('electron') ||
  (window.process && window.process.versions && !!window.process.versions.electron)
);

type NotificationClickEvent = {
  data?: {
    url?: string;
    launchUrl?: string;
  };
};

const OneSignalInitializer = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const identitySetRef = useRef(false);

  useEffect(() => {
    if (!user || !isOneSignalSupported()) return;
    if (isElectron) return;
    if (getOnesignalAppId() === '__ONESIGNAL_APP_ID__') return;
    if (identitySetRef.current) return;

    const setupIdentity = async (OneSignal: NonNullable<typeof window.OneSignal>) => {
      if (!user || identitySetRef.current) return;

      if (user.id) {
        await loginOneSignal(user.id);
      }

      if (profile?.tier) {
        addOnesignalTag('tier', profile.tier);
      }

      if (user.email) {
        await setOnesignalEmail(user.email);
      }

      identitySetRef.current = true;
      console.info('[OneSignal] User identity configured', {
        origin: window.location.origin,
        permission: OneSignal.Notifications.permission,
        externalId: user.id,
        pushSubscriptionId: OneSignal.User.PushSubscription.id || null,
        pushOptedIn: OneSignal.User.PushSubscription.optedIn,
      });
    };

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(setupIdentity);
  }, [user, profile]);

  useEffect(() => {
    if (!user && identitySetRef.current) {
      identitySetRef.current = false;
      logoutOneSignal();
    }
  }, [user]);

  useEffect(() => {
    if (!window.OneSignal) return;
    if (isElectron) return;
    if (getOnesignalAppId() === '__ONESIGNAL_APP_ID__') return;

    const handlers: Array<() => void> = [];

    const setupListeners = () => {
      if (!window.OneSignal) return;

      const handleNotificationClick = (event: NotificationClickEvent) => {
        const targetUrl = event?.data?.url || event?.data?.launchUrl;
        if (targetUrl) {
          navigate(targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`);
        }
      };

      window.OneSignal.Notifications.addEventListener('click', handleNotificationClick);
      handlers.push(() => window.OneSignal.Notifications.removeEventListener('click', handleNotificationClick));
    };

    if (window.OneSignal) {
      setupListeners();
    } else {
      const interval = setInterval(() => {
        if (window.OneSignal) {
          clearInterval(interval);
          setupListeners();
        }
      }, 500);
      handlers.push(() => clearInterval(interval));
    }

    return () => {
      handlers.forEach((fn) => fn());
    };
  }, [navigate]);

  return null;
};

export default OneSignalInitializer;
