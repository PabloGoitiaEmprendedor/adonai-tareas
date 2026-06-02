const ADONAI_STORAGE_PREFIXES = ["adonai_", "adonai:", "sb-"];

export function isAdonaiStorageKey(key: string): boolean {
  return ADONAI_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function clearAdonaiStorage(storage: Storage = window.localStorage): void {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isAdonaiStorageKey(key)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}
