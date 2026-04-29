const { app, BrowserWindow, ipcMain, shell, dialog, session, Menu, MenuItem } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let miniWindow;

// ── Auto-start on boot ──────────────────────────────────────────────────────
app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath('exe'),
  args: ['--autostart'],
});

// ── Auto-updater config ─────────────────────────────────────────────────────
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

// ── Premium update UX ───────────────────────────────────────────────────────
// Send progress events to the renderer for a beautiful in-app update bar
autoUpdater.on('checking-for-update', () => {
  broadcastToAll('update-status', { status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  broadcastToAll('update-status', { status: 'available', version: info.version });
});

autoUpdater.on('download-progress', (progress) => {
  broadcastToAll('update-status', {
    status: 'downloading',
    percent: Math.round(progress.percent),
    transferred: progress.transferred,
    total: progress.total,
  });
});

autoUpdater.on('update-downloaded', (info) => {
  broadcastToAll('update-status', { status: 'ready', version: info.version });
});

autoUpdater.on('update-not-available', () => {
  broadcastToAll('update-status', { status: 'up-to-date' });
});

autoUpdater.on('error', (err) => {
  broadcastToAll('update-status', { status: 'error', message: err?.message });
});

// IPC: user chose to restart now
ipcMain.on('install-update-now', () => {
  autoUpdater.quitAndInstall(false, true);
});

function broadcastToAll(channel, data) {
  if (mainWindow) mainWindow.webContents.send(channel, data);
  if (miniWindow) miniWindow.webContents.send(channel, data);
}

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
  // ── Grant microphone permissions automatically for Electron ──
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'microphone', 'audioCapture'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Also handle permission checks (Chromium 93+)
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'microphone', 'audioCapture'];
    return allowedPermissions.includes(permission);
  });

  // Spoof Origin and Referer for Microsoft Clarity to allow tracking from the desktop app
  const filter = { urls: ['https://*.clarity.ms/*'] };
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    details.requestHeaders['Origin'] = 'https://adonaitasks.com';
    details.requestHeaders['Referer'] = 'https://adonaitasks.com/';
    callback({ requestHeaders: details.requestHeaders });
  });

  // Enable spell-checker context menu globally for all web contents
  app.on('web-contents-created', (event, contents) => {
    contents.on('context-menu', (event, params) => {
      const menu = new Menu();

      // Add each spelling suggestion
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => contents.replaceMisspelling(suggestion)
        }));
      }

      // Allow users to add the misspelled word to the dictionary
      if (params.misspelledWord) {
        menu.append(
          new MenuItem({
            label: 'Añadir al diccionario',
            click: () => contents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          })
        );
      }

      if (menu.items.length > 0) {
        menu.append(new MenuItem({ type: 'separator' }));
      }
      
      // Add basic copy/paste
      if (params.editFlags.canCut) menu.append(new MenuItem({ role: 'cut', label: 'Cortar' }));
      if (params.editFlags.canCopy) menu.append(new MenuItem({ role: 'copy', label: 'Copiar' }));
      if (params.editFlags.canPaste) menu.append(new MenuItem({ role: 'paste', label: 'Pegar' }));

      // Only popup if there's something to show (text selected or misspelled word or editable area)
      if (menu.items.length > 0 && params.isEditable) {
        menu.popup();
      }
    });
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
