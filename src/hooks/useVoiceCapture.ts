import { useState, useCallback, useRef } from 'react';
import { dispatchMicPermissionGranted } from '@/lib/voiceEvents';

export const useVoiceCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const sessionRef = useRef(0);
  const finalTranscriptRef = useRef('');

  const isSupported = typeof window !== 'undefined' &&
    !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);

  const startRecording = useCallback((): boolean => {
    if (isRecordingRef.current) {
      return true;
    }

    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e) {}
       recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceFallback(true);
      return false;
    }

    const recognition = new SpeechRecognition();
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;

    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;


    recognition.onresult = (event: any) => {
      if (sessionRef.current !== sessionId) return;

      let final = '';
      let interim = '';
      
      for (let i = 0; i < event.results.length; ++i) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += piece;
        } else {
          interim += piece;
        }
      }
      
      const fullText = (final + interim).trim();
      setTranscript(fullText);
      finalTranscriptRef.current = final;
    };

    recognition.onstart = () => {
      if (sessionRef.current !== sessionId) return;
      isRecordingRef.current = true;
      setIsRecording(true);
      setVoiceFallback(false);
    };

    recognition.onend = () => {
      if (sessionRef.current !== sessionId) return;
      isRecordingRef.current = false;
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (e: any) => {
      if (sessionRef.current !== sessionId) return;
      console.error('Speech recognition error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setVoiceFallback(true);
      }
      isRecordingRef.current = false;
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      setTranscript('');
      setConfidence(0);
      finalTranscriptRef.current = '';
      recognition.start();
      dispatchMicPermissionGranted();
      return true;
    } catch (err) {
      console.error('Failed to start recognition:', err);
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoiceFallback(true);
      recognitionRef.current = null;
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
    finalTranscriptRef.current = '';
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
