/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    toggleMiniWindow: () => void;
    onMiniWindowClosed: (callback: (value: any) => void) => void;
    onDeepLink: (callback: (url: string) => void) => void;
    openExternal?: (url: string) => void;
    resizeMiniWindow?: (width: number, height: number) => void;
    moveWindow?: (dx: number, dy: number) => void;
    syncData?: () => void;
    onInvalidateQueries?: (callback: () => void) => void;
    setIgnoreMouseEvents?: (ignore: boolean, options?: { forward?: boolean }) => void;
  };
}
