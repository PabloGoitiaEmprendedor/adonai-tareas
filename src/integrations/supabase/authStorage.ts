type ElectronAuthStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
  clear?: () => Promise<void> | void;
};

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.authStorageGet;

export const supabaseAuthStorage: Storage | ElectronAuthStorage =
  isElectron
    ? {
        getItem: (key: string) => window.electronAPI!.authStorageGet!(key),
        setItem: (key: string, value: string) => window.electronAPI!.authStorageSet!(key, value),
        removeItem: (key: string) => window.electronAPI!.authStorageRemove!(key),
        clear: () => window.electronAPI!.authStorageClear!(),
      }
    : localStorage;
