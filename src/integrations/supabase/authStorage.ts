type ElectronAuthStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
  clear?: () => Promise<void> | void;
};

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.authStorageGet;
const mirrorKey = (key: string) => `adonai_electron_auth_mirror:${key}`;

export const supabaseAuthStorage: Storage | ElectronAuthStorage =
  isElectron
    ? {
        getItem: async (key: string) => {
          try {
            const value = await window.electronAPI!.authStorageGet!(key);
            if (value !== null) {
              localStorage.setItem(mirrorKey(key), value);
              return value;
            }
          } catch (error) {
            console.warn('[authStorage] IPC get failed, using local mirror', error);
          }
          return localStorage.getItem(mirrorKey(key));
        },
        setItem: async (key: string, value: string) => {
          localStorage.setItem(mirrorKey(key), value);
          try {
            await window.electronAPI!.authStorageSet!(key, value);
          } catch (error) {
            console.warn('[authStorage] IPC set failed, session mirrored locally', error);
          }
        },
        removeItem: async (key: string) => {
          localStorage.removeItem(mirrorKey(key));
          try {
            await window.electronAPI!.authStorageRemove!(key);
          } catch (error) {
            console.warn('[authStorage] IPC remove failed', error);
          }
        },
        clear: async () => {
          Object.keys(localStorage)
            .filter((key) => key.startsWith('adonai_electron_auth_mirror:'))
            .forEach((key) => localStorage.removeItem(key));
          try {
            await window.electronAPI!.authStorageClear!();
          } catch (error) {
            console.warn('[authStorage] IPC clear failed', error);
          }
        },
      }
    : localStorage;
