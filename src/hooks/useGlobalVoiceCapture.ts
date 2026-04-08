import { useEffect, RefObject } from 'react';
import type { TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import { OPEN_VOICE_CAPTURE_EVENT } from '@/lib/voiceEvents';

export const useGlobalVoiceCapture = (
  modalRef: RefObject<TaskCaptureModalHandle>,
  onOpen: () => void,
) => {
  useEffect(() => {
    const handleOpenVoiceCapture = () => {
      modalRef.current?.openInVoiceMode();
      onOpen();
    };

    window.addEventListener(OPEN_VOICE_CAPTURE_EVENT, handleOpenVoiceCapture);
    return () => {
      window.removeEventListener(OPEN_VOICE_CAPTURE_EVENT, handleOpenVoiceCapture);
    };
  }, [modalRef, onOpen]);
};
