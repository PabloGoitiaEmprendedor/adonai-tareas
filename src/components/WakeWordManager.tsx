import { useState, useEffect, useCallback } from 'react';
import { useWakeWord } from '@/hooks/useWakeWord';
import { useAuth } from '@/contexts/AuthContext';
import WakeWordOverlay from '@/components/WakeWordOverlay';
import {
  dispatchOpenVoiceCapture,
  dispatchWakeWordTriggered,
  MIC_PERMISSION_GRANTED_EVENT,
  VOICE_CAPTURE_CLOSED_EVENT,
  VOICE_CAPTURE_OPENED_EVENT,
} from '@/lib/voiceEvents';

const WakeWordManager = () => {
  const { user } = useAuth();
  const [showOverlay, setShowOverlay] = useState(false);

  const handleWake = useCallback(() => {
    dispatchWakeWordTriggered();
    setShowOverlay(true);
    window.setTimeout(() => {
      setShowOverlay(false);
      dispatchOpenVoiceCapture();
    }, 650);
  }, []);

  const { isListening, isSupported, activate, resume, deactivate } = useWakeWord({
    onWake: handleWake,
    enabled: !!user,
  });

  const tryAutoEnable = useCallback(async () => {
    if (!user || !isSupported || isListening || !navigator.permissions?.query) return;

    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (status.state === 'granted') {
        activate();
      }
    } catch {
    }
  }, [user, isSupported, isListening, activate]);

  useEffect(() => {
    void tryAutoEnable();
  }, [tryAutoEnable]);

  useEffect(() => {
    if (!user || !isSupported) return;

    const handlePermissionGranted = () => {
      void tryAutoEnable();
    };

    const handleCaptureOpened = () => {
      deactivate();
    };

    const handleCaptureClosed = () => {
      resume();
      void tryAutoEnable();
    };

    const handleFocus = () => {
      void tryAutoEnable();
    };

    window.addEventListener(MIC_PERMISSION_GRANTED_EVENT, handlePermissionGranted);
    window.addEventListener(VOICE_CAPTURE_OPENED_EVENT, handleCaptureOpened);
    window.addEventListener(VOICE_CAPTURE_CLOSED_EVENT, handleCaptureClosed);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener(MIC_PERMISSION_GRANTED_EVENT, handlePermissionGranted);
      window.removeEventListener(VOICE_CAPTURE_OPENED_EVENT, handleCaptureOpened);
      window.removeEventListener(VOICE_CAPTURE_CLOSED_EVENT, handleCaptureClosed);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, isSupported, deactivate, resume, tryAutoEnable]);

  if (!user || !isSupported) return null;

  return <WakeWordOverlay visible={showOverlay} />;
};

export default WakeWordManager;
