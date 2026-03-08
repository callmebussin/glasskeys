const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const { initIpc } = require('./index.js');
let mainWindow;
let configWindow;
let tray = null;
let isQuitting = false;
function createMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 765,
    height: 375,
    useContentSize: true,
    resizable: true,
    backgroundColor: '#00000000',
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    title: "GlassKeys Preview",
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'icon.png'),
    alwaysOnTop: false 
  });
  mainWindow.loadURL('http://localhost:3001/?mode=desktop');
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
function createConfigWindow() {
  if (configWindow) {
    if (configWindow.isMinimized()) configWindow.restore();
    configWindow.focus();
    return;
  }
  configWindow = new BrowserWindow({
    width: 800,
    height: 740, 
    minWidth: 800,
    minHeight: 740,
    maxWidth: 800,
    maxHeight: 740,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: "GlassKeys Configuration",
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'icon.png')
  });
  configWindow.loadFile(path.join(__dirname, 'public', 'config.html'));
  configWindow.on('closed', () => {
    configWindow = null;
  });
}
function createTray() {
  const iconPath = path.join(__dirname, 'public', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon);
  tray.setToolTip('GlassKeys Overlay');
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Preview Overlay', 
      click: () => {
        if (!mainWindow) createMainWindow();
        else mainWindow.show();
      }
    },
    { 
      label: 'Configuration', 
      click: () => createConfigWindow() 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
      if (!mainWindow) createMainWindow();
      else mainWindow.show();
  });
}
ipcMain.on('resize-window', (event, { width, height }) => {
    if (mainWindow) {
        mainWindow.setContentSize(width, height);
    }
});
ipcMain.on('set-always-on-top-main', (event, value) => {
    if (mainWindow) {
        mainWindow.setAlwaysOnTop(value, "screen-saver");
    }
});
ipcMain.on('start-drag', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setMovable(true);
        const [winX, winY] = win.getPosition();
        const { screen } = require('electron');
        const cursorPos = screen.getCursorScreenPoint();
        const offsetX = cursorPos.x - winX;
        const offsetY = cursorPos.y - winY;
        event.sender.send('drag-offset', { offsetX, offsetY });
    }
});
ipcMain.on('drag-move', (event, { x, y }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setPosition(x, y);
    }
});
ipcMain.on('get-bounds', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        event.sender.send('window-bounds', win.getBounds());
    }
});
ipcMain.on('resize-bounds', (event, bounds) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setBounds(bounds);
    }
});
app.whenReady().then(() => {
  initIpc();
  createMainWindow();
  createConfigWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
  }
});
