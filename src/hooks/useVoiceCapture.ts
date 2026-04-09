import { useState, useCallback, useRef } from 'react';
import { dispatchMicPermissionGranted } from '@/lib/voiceEvents';

export const useVoiceCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const finalSegmentsRef = useRef<Record<number, string>>({});
  const sessionRef = useRef(0);

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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;


    recognition.onresult = (event: any) => {
      if (sessionRef.current !== sessionId) return;

      const interimSegments: string[] = [];
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const facet = event.results[i][0].transcript.trim();
        if (!facet) continue;

        if (event.results[i].isFinal) {
          finalSegmentsRef.current[i] = facet;
        } else {
          delete finalSegmentsRef.current[i];
          interimSegments.push(facet);
        }
      }

      const finalTranscript = Object.keys(finalSegmentsRef.current)
        .map(Number)
        .sort((a, b) => a - b)
        .map((index) => finalSegmentsRef.current[index])
        .join(' ')
        .trim();

      const interimTranscript = interimSegments.join(' ').trim();
      
      const fullTranscriptResult = [finalTranscript, interimTranscript]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      setTranscript(fullTranscriptResult);
      
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        setConfidence(lastResult[0].confidence || 0);
      }

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
      finalSegmentsRef.current = {};
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
    finalSegmentsRef.current = {};
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
