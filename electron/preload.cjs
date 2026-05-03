const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMiniWindow: () => ipcRenderer.send('toggle-mini-window'),
  miniReady: (data) => ipcRenderer.send('mini-ready', data),
  onMiniWindowClosed: (callback) => ipcRenderer.on('mini-window-closed', (_event, value) => callback(value)),
  onDeepLink: (callback) => ipcRenderer.on('on-deep-link', (_event, url) => callback(url)),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  moveWindow: (dx, dy) => ipcRenderer.send('move-mini-window', dx, dy),
  syncData: () => ipcRenderer.send('sync-data'),
  onInvalidateQueries: (callback) => ipcRenderer.on('invalidate-queries', () => callback()),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  getMiniPosition: () => ipcRenderer.invoke('get-mini-position'),
  setMiniBounds: (bounds) => ipcRenderer.send('set-mini-bounds', bounds),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, data) => callback(data)),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_event, pct) => callback(pct)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', () => callback()),
  restartApp: () => ipcRenderer.send('restart-app'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  log: (msg) => ipcRenderer.send('log-message', msg),
});
