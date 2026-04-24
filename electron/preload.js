const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleMiniWindow: () => ipcRenderer.send('toggle-mini-window'),
  onMiniWindowClosed: (callback) => ipcRenderer.on('mini-window-closed', (_event, value) => callback(value)),
});
