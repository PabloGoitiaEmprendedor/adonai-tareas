import { useState, useCallback, useRef } from 'react';
import { dispatchMicPermissionGranted } from '@/lib/voiceEvents';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const IS_ELECTRON = (window as any)?.electronAPI !== undefined || navigator.userAgent?.includes('Electron');

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSupported = typeof window !== 'undefined' &&
    !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition || (window as any).MediaRecorder);

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

  const transcribeWithServer = useCallback(async (audioBlob: Blob): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-audio`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error en la transcripción');
    }

    const result = await response.json();
    return result.text || '';
  }, []);

  const startBrowserRecognition = useCallback((sessionId: number): boolean => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      if (sessionRef.current !== sessionId) return;
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += piece;
        else interim += piece;
      }
      if (final) finalTranscriptRef.current += final;
      setTranscript((finalTranscriptRef.current + interim).trim());
    };

    recognition.onstart = () => {
      if (sessionRef.current !== sessionId) return;
      console.log('[voice] SpeechRecognition started');
    };

    recognition.onend = () => {
      if (sessionRef.current !== sessionId) return;
      console.log('[voice] SpeechRecognition ended');
      if (isRecordingRef.current) {
        try { recognition.start(); } catch {}
      } else {
        recognitionRef.current = null;
        setIsRecording(false);
      }
    };

    recognition.onerror = (e: any) => {
      if (sessionRef.current !== sessionId) return;
      console.error('[voice] SpeechRecognition error:', e.error);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch (err) {
      console.error('[voice] Failed to start SpeechRecognition:', err);
      return false;
    }
  }, []);

  const startServerTranscription = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : '';

      if (!mimeType) {
        toast.error('Formato de audio no soportado', {
          description: 'Tu navegador no soporta grabación de audio.',
          duration: 4000,
        });
        stream.getTracks().forEach(t => t.stop());
        return false;
      }

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        isRecordingRef.current = false;

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) {
          toast.error('Audio vacío', { description: 'No se detectó audio. Intenta de nuevo.', duration: 3000 });
          return;
        }

        setIsProcessing(true);
        try {
          console.log('[voice] Sending audio to server for transcription...');
          const text = await transcribeWithServer(audioBlob);
          if (text) {
            console.log('[voice] Server transcription successful:', text.substring(0, 50));
            setTranscript(text);
            finalTranscriptRef.current = text;
          } else {
            setVoiceFallback(true);
          }
        } catch (err: any) {
          console.error('[voice] Server transcription error:', err);
          toast.error('Error al transcribir', {
            description: err.message || 'No se pudo transcribir el audio.',
            duration: 4000,
          });
          setVoiceFallback(true);
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      return true;
    } catch (err: any) {
      console.error('[voice] MediaRecorder error:', err);
      toast.error('Error de micrófono', {
        description: 'No se pudo acceder al micrófono.',
        duration: 4000,
      });
      return false;
    }
  }, [transcribeWithServer]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (isRecordingRef.current) return true;

    const hasPermission = await ensureMicPermission();
    if (!hasPermission) return false;

    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    setTranscript('');
    finalTranscriptRef.current = '';
    isRecordingRef.current = true;
    setIsRecording(true);

    // Try SpeechRecognition for live text (works even in Electron with flags)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const ok = startBrowserRecognition(sessionId);
      if (ok) {
        dispatchMicPermissionGranted();
        return true;
      }
    }

    // Fallback to server transcription
    console.log('[voice] SpeechRecognition unavailable — falling back to server');
    const ok = await startServerTranscription();
    if (ok) dispatchMicPermissionGranted();
    return ok;
  }, [ensureMicPermission, startBrowserRecognition, startServerTranscription]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
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
