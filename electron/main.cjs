const { app, BrowserWindow, ipcMain, shell, dialog, session, Menu, MenuItem } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let miniWindow;

// ── Single Instance Lock & Protocol Registration ────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
    
    // Protocol handler for Windows/Linux
    // find the custom protocol URL in the command line arguments.
    const url = commandLine.find(arg => arg.startsWith('adonai-tasks://'));
    if (url) {
      handleDeepLink(url);
    }
  });

  // Handle deep link on macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('adonai-tasks', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('adonai-tasks');
}

function handleDeepLink(url) {
  if (!url) return;
  console.log("Processing deep link:", url);
  // Send to renderer
  if (mainWindow) {
    mainWindow.webContents.send('on-deep-link', url);
  } else {
    // If window not ready, wait and try again or store it
    app.whenReady().then(() => {
       if (mainWindow) mainWindow.webContents.send('on-deep-link', url);
    });
  }
}

// ── Window State Management ────────────────────────────────────────────────
const configPath = path.join(app.getPath('userData'), 'window-state.json');

function saveWindowState(state) {
  try {
    const existing = loadWindowState() || {};
    const newState = { ...existing, ...state };
    fs.writeFileSync(configPath, JSON.stringify(newState));
  } catch (e) {
    console.error('Failed to save window state', e);
  }
}

function loadWindowState() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    // console.error('Failed to load window state', e);
  }
  return null;
}

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
  const state = loadWindowState();
  const miniState = state?.mini || {};

  miniWindow = new BrowserWindow({
    width: miniState.width || 100,
    height: miniState.height || 52,
    x: miniState.x,
    y: miniState.y,
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
  if (miniState.x === undefined || miniState.y === undefined) {
    miniWindow.center();
  }

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

  const isAutostart = process.argv.includes('--autostart');
  
  if (!isAutostart) {
    createMainWindow();
  }
  
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
  const newX = bounds.x + dx;
  const newY = bounds.y + dy;
  miniWindow.setPosition(newX, newY);
  
  // Save position
  saveWindowState({
    mini: {
      x: newX,
      y: newY,
      width: bounds.width,
      height: bounds.height
    }
  });
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

  // Save state (mostly for size changes if any, but also position)
  saveWindowState({
    mini: {
      x: Math.round(b.x),
      y: Math.round(b.y),
      width: Math.round(b.w),
      height: Math.round(b.h)
    }
  });
});

ipcMain.on('sync-data', () => {
  if (mainWindow) mainWindow.webContents.send('invalidate-queries');
  if (miniWindow) miniWindow.webContents.send('invalidate-queries');
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});
