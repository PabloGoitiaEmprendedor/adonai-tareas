import { useState, useCallback, useRef } from 'react';
import { dispatchMicPermissionGranted } from '@/lib/voiceEvents';
import { toast } from 'sonner';

export const useVoiceCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const sessionRef = useRef(0);
  const finalTranscriptRef = useRef('');

  // Voice is supported via native SpeechRecognition API
  const isSupported = typeof window !== 'undefined' &&
    !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);

  const ensureMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permissionStatus.state === 'denied') {
          toast.error('Micrófono bloqueado', {
            description: 'Activa el micrófono en la configuración de tu navegador para usar voz.',
            duration: 5000,
          });
          return false;
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err: any) {
      console.error('Mic permission error:', err);
      toast.error('Error de micrófono', {
        description: 'No se pudo acceder al micrófono. Intenta de nuevo.',
        duration: 4000,
      });
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (isRecordingRef.current) return true;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceFallback(true);
      toast.error('Tu navegador no soporta voz', {
        description: 'Usa Chrome o Edge para la entrada por voz gratuita.',
        duration: 5000,
      });
      return false;
    }

    const hasPermission = await ensureMicPermission();
    if (!hasPermission) return false;

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
        if (event.results[i].isFinal) final += piece;
        else interim += piece;
      }
      const fullText = (final + interim).trim();
      setTranscript(fullText);
      finalTranscriptRef.current = final;
    };

    recognition.onstart = () => {
      if (sessionRef.current !== sessionId) return;
      isRecordingRef.current = true;
      setIsRecording(true);
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
      setIsRecording(false);
      isRecordingRef.current = false;
    };

    recognitionRef.current = recognition;
    try {
      setTranscript('');
      finalTranscriptRef.current = '';
      recognition.start();
      dispatchMicPermissionGranted();
      return true;
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setIsRecording(false);
      isRecordingRef.current = false;
      return false;
    }
  }, [ensureMicPermission]);

  const stopRecording = useCallback(async () => {
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
    isProcessing,
    startRecording,
    stopRecording,
    resetTranscript,
  };
};
