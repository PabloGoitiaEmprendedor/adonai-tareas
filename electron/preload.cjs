const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback, mapArgs = (...args) => args) {
  if (typeof callback !== 'function') return () => {};

  const listener = (_event, ...args) => {
    callback(...mapArgs(...args));
  };

  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMiniWindow: () => ipcRenderer.send('toggle-mini-window'),
  miniReady: (data) => ipcRenderer.send('mini-ready', data),
  onMiniWindowClosed: (callback) => subscribe('mini-window-closed', callback, (value) => [value]),
  onDeepLink: (callback) => subscribe('on-deep-link', callback, (url) => [url]),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  moveWindow: (dx, dy) => ipcRenderer.send('move-mini-window', dx, dy),
  startDrag: () => ipcRenderer.send('mini-start-drag'),
  stopDrag: () => ipcRenderer.send('mini-stop-drag'),
  syncData: () => ipcRenderer.send('sync-data'),
  onInvalidateQueries: (callback) => subscribe('invalidate-queries', callback, () => []),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  getMiniPosition: () => ipcRenderer.invoke('get-mini-position'),
  setMiniBounds: (bounds) => ipcRenderer.send('set-mini-bounds', bounds),
  onUpdateAvailable: (callback) => subscribe('update-available', callback, (data) => [data]),
  onUpdateDownloadProgress: (callback) => subscribe('update-download-progress', callback, (pct) => [pct]),
  onUpdateDownloaded: (callback) => subscribe('update-downloaded', callback, () => []),
  onUpdateError: (callback) => subscribe('update-error', callback, (msg) => [msg]),
  onUpdateReady: (callback) => subscribe('update-ready', callback, (data) => [data]),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  installUpdate: () => ipcRenderer.send('install-update'),
  restartApp: () => ipcRenderer.send('restart-app'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  log: (msg) => ipcRenderer.send('log-message', msg),
  showNotification: (title, body, type) => ipcRenderer.send('show-notification', { title, body, type }),
  onCustomToast: (callback) => ipcRenderer.on('custom-toast-data', callback),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (openAtLogin) => ipcRenderer.send('set-auto-start', openAtLogin),
  authStorageGet: (key) => ipcRenderer.invoke('auth-storage-get', key),
  authStorageSet: (key, value) => ipcRenderer.invoke('auth-storage-set', key, value),
  authStorageRemove: (key) => ipcRenderer.invoke('auth-storage-remove', key),
  authStorageClear: () => ipcRenderer.invoke('auth-storage-clear'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openUrl: (url) => ipcRenderer.send('open-external', url),
});
