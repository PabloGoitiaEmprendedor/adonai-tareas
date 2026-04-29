import { useState, useCallback, useRef } from 'react';
import { dispatchMicPermissionGranted } from '@/lib/voiceEvents';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useVoiceCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const isRecordingRef = useRef(false);
  const sessionRef = useRef(0);
  const finalTranscriptRef = useRef('');

  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        toast.loading("Procesando voz...", { id: "voice-process" });
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');

          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: formData,
          });

          if (error) throw error;
          if (data && data.text) {
            setTranscript(data.text);
            finalTranscriptRef.current = data.text;
          } else {
            throw new Error("No text in response");
          }
          toast.success("Voz procesada", { id: "voice-process" });
        } catch (err: any) {
          console.error("Transcription fallback error:", err);
          toast.error("Error al procesar voz", {
            id: "voice-process",
            description: "No se pudo transcribir el audio.",
          });
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setVoiceFallback(false);
      dispatchMicPermissionGranted();
      return true;
    } catch (err) {
      console.error("MediaRecorder fallback failed:", err);
      toast.error("Error de micrófono", {
        description: "No se pudo iniciar la grabación alternativa.",
      });
      return false;
    }
  };

  // Voice is supported via SpeechRecognition OR MediaRecorder fallback (Electron/desktop)
  const isSupported = typeof window !== 'undefined' &&
    (!!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition) ||
     typeof MediaRecorder !== 'undefined');

  /**
   * Request mic permissions explicitly BEFORE starting SpeechRecognition.
   * This forces the browser to show the native permission dialog if not yet granted.
   * Without this, SpeechRecognition silently fails for users who never granted mic access.
   */
  const ensureMicPermission = async (): Promise<boolean> => {
    try {
      // Check if permissions API is available
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

      // Always request getUserMedia to trigger the browser permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the stream immediately — we just needed to trigger the prompt
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err: any) {
      console.error('Mic permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Micrófono bloqueado', {
          description: 'Permite el acceso al micrófono en tu navegador para usar voz.',
          duration: 5000,
        });
      } else if (err.name === 'NotFoundError') {
        toast.error('No se encontró micrófono', {
          description: 'Conecta un micrófono para usar la entrada por voz.',
          duration: 5000,
        });
      } else {
        toast.error('Error de micrófono', {
          description: 'No se pudo acceder al micrófono. Intenta de nuevo.',
          duration: 4000,
        });
      }
      return false;
    }
  };

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (isRecordingRef.current) {
      return true;
    }

    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e) {}
       recognitionRef.current = null;
    }

    const isElectron = !!(window as any).electronAPI;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition || isElectron) {
      // Direct fallback for Electron or unsupported browsers
      return startMediaRecorderFallback();
    }

    if (!SpeechRecognition) {
      setVoiceFallback(true);
      toast.error('Tu navegador no soporta voz', {
        description: 'Usa Chrome, Edge o Safari para usar la entrada por voz.',
        duration: 5000,
      });
      return false;
    }

    // Pre-request mic permissions before starting SpeechRecognition
    const hasPermission = await ensureMicPermission();
    if (!hasPermission) {
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
        toast.error('Micrófono no autorizado', {
          description: 'Permite el acceso al micrófono e inténtalo de nuevo.',
          duration: 5000,
        });
      } else if (e.error === 'no-speech') {
        toast('No se detectó voz', {
          description: 'Habla más fuerte o acércate al micrófono.',
          duration: 3000,
        });
      } else if (e.error === 'network') {
        // Fallback to MediaRecorder + Supabase Edge Function
        toast.info('Usando motor alternativo...', { duration: 2000 });
        startMediaRecorderFallback();
        return; // don't set isRecording to false yet
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
  }, [ensureMicPermission]);

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // Streams are stopped in the onstop handler
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
