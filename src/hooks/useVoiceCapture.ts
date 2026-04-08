import { useState, useCallback, useRef } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export const useVoiceCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== 'undefined' && 
    !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceFallback(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const text = results.map((r: any) => r[0].transcript).join('');
      setTranscript(text);
      const lastResult = results[results.length - 1];
      if (lastResult && (lastResult as any).isFinal) {
        setConfidence((lastResult as any)[0].confidence || 0);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (_e: SpeechRecognitionErrorEvent) => {
      setVoiceFallback(true);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setTranscript('');
  }, []);

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
