import { useEffect, RefObject } from 'react';
import type { TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import { OPEN_VOICE_CAPTURE_EVENT } from '@/lib/voiceEvents';

export const useGlobalVoiceCapture = (modalRef: RefObject<TaskCaptureModalHandle>) => {
  useEffect(() => {
    const handleOpenVoiceCapture = () => {
      modalRef.current?.openInVoiceMode();
    };

    window.addEventListener(OPEN_VOICE_CAPTURE_EVENT, handleOpenVoiceCapture);
    return () => {
      window.removeEventListener(OPEN_VOICE_CAPTURE_EVENT, handleOpenVoiceCapture);
    };
  }, [modalRef]);
};
