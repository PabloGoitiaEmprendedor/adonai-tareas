/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLARITY_PROJECT_ID?: string;
  readonly VITE_ENABLE_CLARITY_IN_DEV?: string;
  readonly VITE_ENABLE_CLARITY_IN_DESKTOP?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_ENABLE_ANALYTICS_IN_DEV?: string;
  readonly VITE_ENABLE_ANALYTICS_IN_DESKTOP?: string;
  readonly VITE_ENABLE_GA_MEASUREMENT_PROTOCOL?: string;
  readonly VITE_PUBLIC_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

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
    onUpdateAvailable?: (callback: (data: { version: string; releaseNotes: string }) => void) => void;
    onUpdateDownloadProgress?: (callback: (percent: number) => void) => void;
    onUpdateDownloaded?: (callback: () => void) => void;
    onUpdateError?: (callback: (msg: string) => void) => void;
    checkForUpdates?: () => void;
    restartApp?: () => void;
    showNotification?: (title: string, body: string, type?: 'info' | 'warning' | 'success' | 'error') => void;
    authStorageGet?: (key: string) => Promise<string | null>;
    authStorageSet?: (key: string, value: string) => Promise<void>;
    authStorageRemove?: (key: string) => Promise<void>;
    authStorageClear?: () => Promise<void>;
  };
  process?: {
    versions?: {
      electron?: string;
    };
  };
}
