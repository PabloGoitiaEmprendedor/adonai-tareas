const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMiniWindow: () => ipcRenderer.send('toggle-mini-window'),
  onMiniWindowClosed: (callback) => ipcRenderer.on('mini-window-closed', (_event, value) => callback(value)),
  onDeepLink: (callback) => ipcRenderer.on('on-deep-link', (_event, url) => callback(url)),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  moveWindow: (dx, dy) => ipcRenderer.send('move-mini-window', dx, dy),
  syncData: () => ipcRenderer.send('sync-data'),
  onInvalidateQueries: (callback) => ipcRenderer.on('invalidate-queries', () => callback()),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  // New: get position + screen info, set bounds
  getMiniPosition: () => ipcRenderer.invoke('get-mini-position'),
  setMiniBounds: (bounds) => ipcRenderer.send('set-mini-bounds', bounds),
});
