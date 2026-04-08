export const OPEN_VOICE_CAPTURE_EVENT = 'adonai:open-voice-capture';
export const WAKE_WORD_TRIGGERED_EVENT = 'adonai:wake-word-triggered';
export const MIC_PERMISSION_GRANTED_EVENT = 'adonai:mic-permission-granted';
export const VOICE_CAPTURE_OPENED_EVENT = 'adonai:voice-capture-opened';
export const VOICE_CAPTURE_CLOSED_EVENT = 'adonai:voice-capture-closed';

export const dispatchOpenVoiceCapture = () => {
  window.dispatchEvent(new CustomEvent(OPEN_VOICE_CAPTURE_EVENT));
};

export const dispatchWakeWordTriggered = () => {
  window.dispatchEvent(new CustomEvent(WAKE_WORD_TRIGGERED_EVENT));
};

export const dispatchMicPermissionGranted = () => {
  window.dispatchEvent(new CustomEvent(MIC_PERMISSION_GRANTED_EVENT));
};

export const dispatchVoiceCaptureOpened = () => {
  window.dispatchEvent(new CustomEvent(VOICE_CAPTURE_OPENED_EVENT));
};

export const dispatchVoiceCaptureClosed = () => {
  window.dispatchEvent(new CustomEvent(VOICE_CAPTURE_CLOSED_EVENT));
};
