const { uIOhook, UiohookKey } = require('uiohook-napi');
const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { ipcMain } = require('electron');

const HTTP_PORT = 3001;
const WS_PORT = 8081;

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

let appConfig = {
    opacity: 100,
    hideBinds: false,
    hideJumpCrouch: false,
    arrowsForMouse: false,
    compactMode: false,
    
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

let keyMap = {
    [UiohookKey.W]: 'W',
    [UiohookKey.A]: 'A',
    [UiohookKey.S]: 'S',
    [UiohookKey.D]: 'D',
    [UiohookKey.Space]: 'SPACE',
    [UiohookKey.Tab]: 'TAB'
};

const ReverseKeyMap = {};
for (const [key, value] of Object.entries(UiohookKey)) {
    ReverseKeyMap[value] = key;
}

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
    ws.send(JSON.stringify({ type: 'state', data: keyState }));
    ws.send(JSON.stringify({ type: 'config', data: appConfig }));
});

let isRecording = false;
let recordingAction = null;

uIOhook.on('keydown', (e) => {
    if (isRecording && recordingAction) {
        
        for (const [code, action] of Object.entries(keyMap)) {
            if (action === recordingAction) {
                delete keyMap[code];
            }
        }

        keyMap[e.keycode] = recordingAction;
        
        let keyName = ReverseKeyMap[e.keycode] || e.keycode;
        
        const { BrowserWindow } = require('electron');
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('binding-recorded', { action: recordingAction, keycode: e.keycode, keyName: keyName });
        });

        isRecording = false;
        recordingAction = null;
        return;
    }

    const key = keyMap[e.keycode];
    if (key && !keyState[key]) {
        keyState[key] = true;
        broadcastState();
    }
});

uIOhook.on('keyup', (e) => {
    if (isRecording) return;

    const key = keyMap[e.keycode];
    if (key && keyState[key]) {
        keyState[key] = false;
        broadcastState();
    }
});

uIOhook.on('mousedown', (e) => {
    if (isRecording) {
        return;
    }

    if (e.button === 1) {
        if (!keyState.MOUSE1) {
            keyState.MOUSE1 = true;
            broadcastState();
        }
    } else if (e.button === 2) {
        if (!keyState.MOUSE2) {
            keyState.MOUSE2 = true;
            broadcastState();
        }
    }
});

uIOhook.on('mouseup', (e) => {
    if (e.button === 1) {
        if (keyState.MOUSE1) {
            keyState.MOUSE1 = false;
            broadcastState();
        }
    } else if (e.button === 2) {
        if (keyState.MOUSE2) {
            keyState.MOUSE2 = false;
            broadcastState();
        }
    }
});

uIOhook.start();

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

const server = http.createServer((req, res) => {
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
});

module.exports = { appConfig };
