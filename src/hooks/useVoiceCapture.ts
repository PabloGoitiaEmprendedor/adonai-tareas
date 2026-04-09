import { useState, useCallback, useRef } from 'react';
import { dispatchMicPermissionGranted } from '@/lib/voiceEvents';

export const useVoiceCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  const isSupported = typeof window !== 'undefined' &&
    !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);

  const startRecording = useCallback((): boolean => {
    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e) {}
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceFallback(true);
      return false;
    }

    if (isRecordingRef.current) {
      return true;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;


    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = 0; i < event.results.length; ++i) {
        const facet = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += facet;
        } else {
          interimTranscript += facet;
        }
      }
      
      const fullTranscriptResult = (finalTranscript + interimTranscript).trim();
      setTranscript(fullTranscriptResult);
      
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        setConfidence(lastResult[0].confidence || 0);
      }

    };

    recognition.onstart = () => {
      isRecordingRef.current = true;
      setIsRecording(true);
      setVoiceFallback(false);
    };

    recognition.onend = () => {
      isRecordingRef.current = false;
      setIsRecording(false);
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setVoiceFallback(true);
      }
      isRecordingRef.current = false;
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    try {
      setTranscript('');
      setConfidence(0);
      recognition.start();
      dispatchMicPermissionGranted();
      return true;
    } catch (err) {
      console.error('Failed to start recognition:', err);
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoiceFallback(true);
      return false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
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
