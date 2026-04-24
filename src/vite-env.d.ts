/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    toggleMiniWindow: () => void;
    onMiniWindowClosed: (callback: (value: any) => void) => void;
    onDeepLink: (callback: (url: string) => void) => void;
  };
}
