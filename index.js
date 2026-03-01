const { uIOhook, UiohookKey } = require('uiohook-napi');
const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { ipcMain } = require('electron');

// Configuration
const HTTP_PORT = 3001;
const WS_PORT = 8081;

// State tracking
const keyState = {
    W: false,
    A: false,
    S: false,
    D: false,
    TAB: false,
    SPACE: false,
    MOUSE1: false,
    MOUSE2: false
};

// Application Config State (Layouts, Opacity, Bindings)
let appConfig = {
    opacity: 100,
    hideBinds: false, // Hides MOUSE1, MOUSE2
    hideJumpCrouch: false, // Hides SPACE, TAB
    arrowsForMouse: false, // Uses Arrows instead of M1/M2 text
    // If true, and hideBinds is true, use the 2x3 layout (replace M1/M2 slots with Crouch/Jump)
    compactMode: false,
    
    // Style Settings (Defaults = Glass)
    theme: {
        fontFamily: "'Inter', sans-serif",
        bgIdle: "rgba(0, 0, 0, 0.15)",
        borderIdle: "rgba(255, 255, 255, 0.6)",
        textIdle: "rgba(255, 255, 255, 0.6)",
        bgActive: "rgba(255, 255, 255, 0.8)",
        borderActive: "rgba(255, 255, 255, 1)",
        textActive: "#000000",
        glowActive: "rgba(255, 255, 255, 0.5)"
    }
};

// Initial Key Mapping
let keyMap = {
    [UiohookKey.W]: 'W',
    [UiohookKey.A]: 'A',
    [UiohookKey.S]: 'S',
    [UiohookKey.D]: 'D',
    [UiohookKey.Space]: 'SPACE',
    [UiohookKey.Tab]: 'TAB'
};

// Create a reverse map for KeyCode -> KeyName lookup
const ReverseKeyMap = {};
for (const [key, value] of Object.entries(UiohookKey)) {
    ReverseKeyMap[value] = key;
}

// WebSocket Server
const wss = new WebSocket.Server({ port: WS_PORT });

function broadcastState() {
    const message = JSON.stringify({ type: 'state', data: keyState });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastConfig() {
    const message = JSON.stringify({ type: 'config', data: appConfig });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

wss.on('connection', ws => {
    console.log('Overlay client connected');
    ws.send(JSON.stringify({ type: 'state', data: keyState }));
    ws.send(JSON.stringify({ type: 'config', data: appConfig }));
});

// Input Hook Handlers
// Key Recording Mode
let isRecording = false;
let recordingAction = null;

uIOhook.on('keydown', (e) => {
    if (isRecording && recordingAction) {
        
        // Remove any existing binding for this ACTION (to avoid duplicates)
        for (const [code, action] of Object.entries(keyMap)) {
            if (action === recordingAction) {
                delete keyMap[code];
            }
        }

        keyMap[e.keycode] = recordingAction;
        
        // Get human readable name
        let keyName = ReverseKeyMap[e.keycode] || e.keycode;
        
        const { BrowserWindow } = require('electron');
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('binding-recorded', { action: recordingAction, keycode: e.keycode, keyName: keyName });
        });

        isRecording = false;
        recordingAction = null;
        return; // Don't process this key as a normal input
    }

    const key = keyMap[e.keycode];
    if (key && !keyState[key]) {
        keyState[key] = true;
        broadcastState();
    }
});

uIOhook.on('keyup', (e) => {
    if (isRecording) return; // Ignore keyups during recording

    const key = keyMap[e.keycode];
    if (key && keyState[key]) {
        keyState[key] = false;
        broadcastState();
    }
});

uIOhook.on('mousedown', (e) => {
    if (isRecording) {
        // Handle mouse bind recording if needed? 
        return;
    }

    if (e.button === 1) { // Left Click
        if (!keyState.MOUSE1) {
            keyState.MOUSE1 = true;
            broadcastState();
        }
    } else if (e.button === 2) { // Right Click
        if (!keyState.MOUSE2) {
            keyState.MOUSE2 = true;
            broadcastState();
        }
    }
});

uIOhook.on('mouseup', (e) => {
    if (e.button === 1) { // Left Click
        if (keyState.MOUSE1) {
            keyState.MOUSE1 = false;
            broadcastState();
        }
    } else if (e.button === 2) { // Right Click
        if (keyState.MOUSE2) {
            keyState.MOUSE2 = false;
            broadcastState();
        }
    }
});

// Start Hook
uIOhook.start();

// IPC Handlers for Config
ipcMain.on('set-opacity', (event, opacity) => {
    appConfig.opacity = opacity;
    broadcastConfig();
});

ipcMain.on('set-hide-binds', (event, value) => {
    appConfig.hideBinds = value;
    checkCompactMode();
    broadcastConfig();
});

ipcMain.on('set-hide-jump-crouch', (event, value) => {
    appConfig.hideJumpCrouch = value;
    checkCompactMode();
    broadcastConfig();
});

ipcMain.on('set-arrows-mouse', (event, value) => {
    appConfig.arrowsForMouse = value;
    broadcastConfig();
});

ipcMain.on('set-theme', (event, theme) => {
    appConfig.theme = { ...appConfig.theme, ...theme };
    broadcastConfig();
});

function checkCompactMode() {
    // "if only binds (left and right) are hidden I want the M1... replaced"
    // So if hideBinds is TRUE and hideJumpCrouch is FALSE.
    if (appConfig.hideBinds && !appConfig.hideJumpCrouch) {
        appConfig.compactMode = true;
    } else {
        appConfig.compactMode = false;
    }
}

ipcMain.on('start-recording', (event, action) => {
    isRecording = true;
    recordingAction = action;
});

ipcMain.on('get-current-config', (event) => {
    event.reply('current-config', appConfig);
});

// Window Resize Handler
ipcMain.on('resize-window', (event, { width, height }) => {
    // Only resize the main window, not the config window
    const { BrowserWindow } = require('electron');
    // We can identify the main window by title or store a reference.
    // Ideally we stored 'mainWindow' in the closure of the createMainWindow function,
    // but here we are in index.js, separate from main.js?
    // Wait, main.js requires index.js. So variables in index.js are module-scoped.
    // The ipcMain handler in main.js handles 'resize-window' already!
    
    // WAIT. I duplicated the resize-window handler?
    // No, I added it to main.js in the previous turn.
    // But index.js is where the logic DECIDES the size.
    // So index.js SENDS the message. main.js RECEIVES it.
    // So index.js doesn't need to handle it.
    
    // Oh wait, `ipcRenderer.send` sends from Render Process (browser) to Main Process (Node).
    // `index.js` is running in the Main Process (Node) alongside `main.js`.
    // Wait, `script.js` (Renderer) calls `ipcRenderer.send('resize-window')`.
    // `main.js` (Main) listens `ipcMain.on('resize-window')`.
    // This is correct.
});

// Simple HTTP Server
const server = http.createServer((req, res) => {
    // Parse URL to handle query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname === '/' ? 'index.html' : url.pathname;
    
    let filePath = path.join(__dirname, 'public', pathname);
    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(HTTP_PORT, () => {
    console.log(`Server running at http://localhost:${HTTP_PORT}/`);
    console.log(`WebSocket server running on port ${WS_PORT}`);
});

module.exports = { appConfig }; // Export if needed
