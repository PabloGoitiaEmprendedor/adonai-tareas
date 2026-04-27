const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let miniWindow;

// Configuración de auto-actualización
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Adonai — Productividad inteligente',
    backgroundColor: '#F8F9FA',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    mainWindow.loadFile(indexPath);
    autoUpdater.checkForUpdatesAndNotify();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización lista',
    message: 'Una nueva versión ha sido descargada. Se instalará automáticamente al cerrar la aplicación.',
    buttons: ['Entendido']
  });
});

function createMiniWindow() {
  if (miniWindow) return;
  miniWindow = new BrowserWindow({
    width: 100,
    height: 52,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
    },
  });

  miniWindow.show();
  miniWindow.center();

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (!app.isPackaged) {
    miniWindow.loadURL('http://localhost:8080/#/mini');
  } else {
    miniWindow.loadFile(indexPath, { hash: 'mini' });
  }

  miniWindow.on('closed', () => {
    miniWindow = null;
    if (mainWindow) {
      mainWindow.webContents.send('mini-window-closed', true);
    }
  });
}

app.whenReady().then(() => {
  // Spoof Origin and Referer for Microsoft Clarity to allow tracking from the desktop app
  const filter = { urls: ['https://*.clarity.ms/*'] };
  require('electron').session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    details.requestHeaders['Origin'] = 'https://adonaitasks.com';
    details.requestHeaders['Referer'] = 'https://adonaitasks.com/';
    callback({ requestHeaders: details.requestHeaders });
  });

  createMainWindow();
  // Auto-open floating mini window on startup
  createMiniWindow();
  setInterval(() => {
    if (app.isPackaged) autoUpdater.checkForUpdates();
  }, 1000 * 60 * 60 * 2);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Mini window toggle ──
ipcMain.on('toggle-mini-window', () => {
  if (miniWindow) {
    miniWindow.close();
    miniWindow = null;
  } else {
    createMiniWindow();
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setIgnoreMouseEvents(ignore, options);
});

// Free movement — no clamping, user puts the pill wherever they want
ipcMain.on('move-mini-window', (event, dx, dy) => {
  if (!miniWindow) return;
  const bounds = miniWindow.getBounds();
  miniWindow.setPosition(bounds.x + dx, bounds.y + dy);
});

// Return position + screen work area so renderer decides expand direction
ipcMain.handle('get-mini-position', () => {
  if (!miniWindow) return null;
  const { screen } = require('electron');
  const bounds = miniWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const wa = display.workArea;
  return {
    x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height,
    screenX: wa.x, screenY: wa.y, screenW: wa.width, screenH: wa.height,
  };
});

// Set window bounds (position + size) — used for expand/collapse
ipcMain.on('set-mini-bounds', (event, b) => {
  if (!miniWindow) return;
  miniWindow.setBounds({
    x: Math.round(b.x), y: Math.round(b.y),
    width: Math.round(b.w), height: Math.round(b.h),
  });
});

ipcMain.on('sync-data', () => {
  if (mainWindow) mainWindow.webContents.send('invalidate-queries');
  if (miniWindow) miniWindow.webContents.send('invalidate-queries');
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});
