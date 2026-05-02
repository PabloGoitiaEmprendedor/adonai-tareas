/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    toggleMiniWindow: () => void;
    miniReady: (data: { hasSession: boolean }) => void;
    onMiniWindowClosed: (callback: (value: any) => void) => void;
    onDeepLink: (callback: (url: string) => void) => void;
    openExternal?: (url: string) => void;
    resizeMiniWindow?: (width: number, height: number) => void;
    moveWindow?: (dx: number, dy: number) => void;
    syncData?: () => void;
    onInvalidateQueries?: (callback: () => void) => void;
    setIgnoreMouseEvents?: (ignore: boolean, options?: { forward?: boolean }) => void;
    getMiniPosition?: () => Promise<any>;
    setMiniBounds?: (bounds: { x: number; y: number; w: number; h: number }) => void;
    onUpdateAvailable?: (callback: (event: any, data: { version: string; releaseNotes: string }) => void) => void;
    onUpdateDownloadProgress?: (callback: (event: any, percent: number) => void) => void;
    onUpdateDownloaded?: (callback: () => void) => void;
    restartApp?: () => void;
  };
  process?: {
    versions?: {
      electron?: string;
    };
  };
}
