import { useState, useEffect, useCallback } from 'react';
import { useWakeWord } from '@/hooks/useWakeWord';
import { useAuth } from '@/contexts/AuthContext';
import WakeWordOverlay from '@/components/WakeWordOverlay';
import TaskCaptureModal from '@/components/TaskCaptureModal';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

const WakeWordManager = () => {
  const { user } = useAuth();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const handleWake = useCallback(() => {
    // Show cool animation first
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
      setCaptureOpen(true);
    }, 1200);
  }, []);

  const { isListening, isSupported, permissionGranted, activate, resume, deactivate } = useWakeWord({
    onWake: handleWake,
    enabled: !!user,
  });

  const handleCloseCaptureModal = useCallback(() => {
    setCaptureOpen(false);
    // Resume wake word listening after modal closes
    setTimeout(() => resume(), 500);
  }, [resume]);

  const handleToggle = useCallback(() => {
    if (isListening) {
      deactivate();
      toast.info('Modo voz desactivado');
    } else {
      activate();
      toast.success('Di "Hey Adonai" para crear tareas por voz');
    }
  }, [isListening, activate, deactivate]);

  if (!user || !isSupported) return null;

  return (
    <>
      {/* Wake word indicator button */}
      <button
        onClick={handleToggle}
        className={`fixed top-4 right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          isListening
            ? 'bg-primary/20 text-primary shadow-[0_0_12px_rgba(75,226,119,0.3)]'
            : 'bg-surface-container-high text-on-surface-variant'
        }`}
      >
        {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
      </button>

      {/* Listening pulse indicator */}
      {isListening && (
        <div className="fixed top-4 right-4 z-40 w-9 h-9 rounded-full bg-primary/20 animate-ping" />
      )}

      <WakeWordOverlay visible={showOverlay} />
      <TaskCaptureModal open={captureOpen} onClose={handleCloseCaptureModal} />
    </>
  );
};

export default WakeWordManager;
