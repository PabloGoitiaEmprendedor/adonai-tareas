import { useState, useCallback, useRef, useEffect } from 'react';

export const useVoiceCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== 'undefined' && 
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Pre-initialize recognition object
  useEffect(() => {
    if (!isSupported) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      const text = results.map((r: any) => r[0].transcript).join('');
      setTranscript(text);
      const lastResult = results[results.length - 1] as any;
      if (lastResult && lastResult.isFinal) {
        setConfidence(lastResult[0].confidence || 0);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e.error);
      if (e.error === 'not-allowed') {
        setVoiceFallback(true);
      }
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, [isSupported]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setVoiceFallback(true);
      return;
    }

    // Request microphone permission first (required on desktop browsers)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed the permission
      stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      console.error('Microphone permission error:', err);
      setVoiceFallback(true);
      return;
    }

    // Re-create recognition instance for each session (some browsers require this)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceFallback(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      const text = results.map((r: any) => r[0].transcript).join('');
      setTranscript(text);
      const lastResult = results[results.length - 1] as any;
      if (lastResult && lastResult.isFinal) {
        setConfidence(lastResult[0].confidence || 0);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e.error);
      if (e.error === 'not-allowed') {
        setVoiceFallback(true);
      }
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
      setTranscript('');
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setVoiceFallback(true);
    }
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
  }, []);

  return {
    isRecording,
    transcript,
    confidence,
    voiceFallback,
    isSupported,
    startRecording,
    stopRecording,
    resetTranscript,
  };
};
