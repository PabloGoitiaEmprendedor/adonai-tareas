import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWakeWordOptions {
  onWake: () => void;
  enabled: boolean;
}

export const useWakeWord = ({ onWake, enabled }: UseWakeWordOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;

  const isSupported = typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        // Match variations: "hey adonai", "oye adonai", "hola adonai"
        if (
          transcript.includes('hey adonai') ||
          transcript.includes('oye adonai') ||
          transcript.includes('hola adonai') ||
          transcript.includes('ei adonai') ||
          transcript.includes('ey adonai')
        ) {
          // Stop listening temporarily while the capture modal is open
          shouldRestartRef.current = false;
          recognition.stop();
          onWakeRef.current();
          return;
        }
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        // Auto-restart to keep listening
        try {
          setTimeout(() => {
            if (shouldRestartRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 300);
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') {
        // Normal — just no speech detected, will auto-restart
        return;
      }
      if (e.error === 'aborted') return;
      console.error('Wake word error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        shouldRestartRef.current = false;
        setIsListening(false);
        setPermissionGranted(false);
      }
    };

    return recognition;
  }, []);

  // Activate background listening — MUST be called from a user gesture
  const activate = useCallback(() => {
    if (!isSupported) return;
    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

    try {
      recognition.start();
      setIsListening(true);
      setPermissionGranted(true);
    } catch (err) {
      console.error('Wake word start failed:', err);
    }
  }, [isSupported, createRecognition]);

  // Resume after capture modal closes
  const resume = useCallback(() => {
    if (!permissionGranted || !isSupported) return;
    
    // Small delay to avoid conflict with task capture recognition
    setTimeout(() => {
      const recognition = createRecognition();
      if (!recognition) return;
      recognitionRef.current = recognition;
      shouldRestartRef.current = true;
      try {
        recognition.start();
        setIsListening(true);
      } catch {
        // Might already be running
      }
    }, 1000);
  }, [permissionGranted, isSupported, createRecognition]);

  const deactivate = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isListening,
    isSupported,
    permissionGranted,
    activate,
    deactivate,
    resume,
  };
};
