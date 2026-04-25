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
    // Verificar actualizaciones al iniciar en producción
    autoUpdater.checkForUpdatesAndNotify();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Escuchar eventos de actualización
autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización lista',
    message: 'Una nueva versión ha sido descargada. Se instalará automáticamente al cerrar la aplicación.',
    buttons: ['Entendido']
  });
});

app.whenReady().then(() => {
  createMainWindow();
  
  // Verificar actualizaciones periódicamente (cada 2 horas)
  setInterval(() => {
    if (app.isPackaged) autoUpdater.checkForUpdates();
  }, 1000 * 60 * 60 * 2);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('toggle-mini-window', () => {
  if (miniWindow) {
    miniWindow.close();
    miniWindow = null;
  } else {
    miniWindow = new BrowserWindow({
      width: 360,
      height: 540,
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
});

// IPC para ignorar eventos del ratón (necesario para transparencia interactiva)
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setIgnoreMouseEvents(ignore, options);
});

// Move window with screen-edge clamping
ipcMain.on('move-mini-window', (event, dx, dy) => {
  if (!miniWindow) return;
  const { screen } = require('electron');
  const bounds = miniWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const workArea = display.workArea;

  let newX = bounds.x + dx;
  let newY = bounds.y + dy;

  // Clamp so the window never goes outside the screen
  newX = Math.max(workArea.x, Math.min(newX, workArea.x + workArea.width - bounds.width));
  newY = Math.max(workArea.y, Math.min(newY, workArea.y + workArea.height - bounds.height));

  miniWindow.setPosition(newX, newY);
});

ipcMain.on('sync-data', () => {
  if (mainWindow) mainWindow.webContents.send('invalidate-queries');
  if (miniWindow) miniWindow.webContents.send('invalidate-queries');
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});
