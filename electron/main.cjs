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
    backgroundColor: '#F5F5E9',
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
      resizable: true,
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

ipcMain.on('move-mini-window', (event, dx, dy) => {
  if (miniWindow) {
    const bounds = miniWindow.getBounds();
    miniWindow.setPosition(bounds.x + dx, bounds.y + dy);
  }
});

ipcMain.on('sync-data', () => {
  if (mainWindow) mainWindow.webContents.send('invalidate-queries');
  if (miniWindow) miniWindow.webContents.send('invalidate-queries');
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});
