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
        if (
          transcript.includes('hey adonai') ||
          transcript.includes('oye adonai') ||
          transcript.includes('hola adonai') ||
          transcript.includes('ei adonai') ||
          transcript.includes('ey adonai')
        ) {
          shouldRestartRef.current = false;
          recognition.stop();
          onWakeRef.current();
          return;
        }
      }
    };

    recognition.onend = () => {
      if (!shouldRestartRef.current) {
        setIsListening(false);
        return;
      }

      window.setTimeout(() => {
        if (!shouldRestartRef.current || !recognitionRef.current) return;
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          setIsListening(false);
        }
      }, 250);
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        return;
      }
      console.error('Wake word error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        shouldRestartRef.current = false;
        setIsListening(false);
        setPermissionGranted(false);
      }
    };

    return recognition;
  }, []);

  const activate = useCallback(() => {
    if (!enabled || !isSupported || isListening) return;
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
  }, [enabled, isSupported, isListening, createRecognition]);

  const resume = useCallback(() => {
    if (!enabled || !permissionGranted || !isSupported || isListening) return;
    const recognition = createRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    shouldRestartRef.current = true;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
    }
  }, [enabled, permissionGranted, isSupported, isListening, createRecognition]);

  const deactivate = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      deactivate();
    }
  }, [enabled, deactivate]);

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
