const ipcRenderer = (typeof require !== 'undefined') ? require('electron').ipcRenderer : null;
const urlParams = new URLSearchParams(window.location.search);
const isDesktop = urlParams.get('mode') === 'desktop';
if (isDesktop) {
    document.body.classList.add('desktop-mode');
}
if (isDesktop && ipcRenderer) {
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let isResizing = false;
    let resizeCorner = null;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartBounds = null;
    const resizeHandles = document.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            resizeCorner = handle.dataset.resize;
            resizeStartX = e.screenX;
            resizeStartY = e.screenY;
            ipcRenderer.send('get-bounds');
        });
    });
    ipcRenderer.on('window-bounds', (event, bounds) => {
        resizeStartBounds = bounds;
    });
    document.addEventListener('mousedown', (e) => {
        if (isResizing) return;
        if (e.target.closest('.resize-handle')) return;
        e.preventDefault();
        isDragging = true;
        document.body.classList.add('dragging');
        ipcRenderer.send('start-drag');
    });
    ipcRenderer.on('drag-offset', (event, { offsetX, offsetY }) => {
        dragOffsetX = offsetX;
        dragOffsetY = offsetY;
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            ipcRenderer.send('drag-move', {
                x: e.screenX - dragOffsetX,
                y: e.screenY - dragOffsetY
            });
        }
        if (isResizing && resizeStartBounds) {
            const dx = e.screenX - resizeStartX;
            const dy = e.screenY - resizeStartY;
            const sb = resizeStartBounds;
            let newX = sb.x, newY = sb.y, newW = sb.width, newH = sb.height;
            if (resizeCorner === 'br') {
                newW = Math.max(200, sb.width + dx);
                newH = Math.max(150, sb.height + dy);
            } else if (resizeCorner === 'bl') {
                newW = Math.max(200, sb.width - dx);
                newH = Math.max(150, sb.height + dy);
                newX = sb.x + (sb.width - newW);
            } else if (resizeCorner === 'tr') {
                newW = Math.max(200, sb.width + dx);
                newH = Math.max(150, sb.height - dy);
                newY = sb.y + (sb.height - newH);
            } else if (resizeCorner === 'tl') {
                newW = Math.max(200, sb.width - dx);
                newH = Math.max(150, sb.height - dy);
                newX = sb.x + (sb.width - newW);
                newY = sb.y + (sb.height - newH);
            }
            ipcRenderer.send('resize-bounds', {
                x: Math.round(newX), y: Math.round(newY),
                width: Math.round(newW), height: Math.round(newH)
            });
        }
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.classList.remove('dragging');
        }
        if (isResizing) {
            isResizing = false;
            resizeCorner = null;
            resizeStartBounds = null;
        }
    });
}
const socket = new WebSocket('ws://localhost:8081');
const ui = {
    W: document.getElementById('key-W'),
    A: document.getElementById('key-A'),
    S: document.getElementById('key-S'),
    D: document.getElementById('key-D'),
    SPACE: document.getElementById('key-SPACE'),
    TAB: document.getElementById('key-TAB'),
    MOUSE1: document.getElementById('key-MOUSE1'),
    MOUSE2: document.getElementById('key-MOUSE2')
};
let currentConfig = {
    opacity: 100,
    hideBinds: false,
    hideJumpCrouch: false,
    arrowsForMouse: false,
    compactMode: false,
    flipTurnBinds: false
};
const activeClass = 'active';
socket.addEventListener('open', () => {
    console.log('Connected to GlassKeys server');
});
socket.addEventListener('message', (event) => {
    try {
        const message = JSON.parse(event.data);
        if (message.type === 'state') {
            updateOverlay(message.data);
        } else if (message.type === 'config') {
            currentConfig = message.data;
            applyConfig(currentConfig);
        } else if (!message.type && message.W !== undefined) {
             updateOverlay(message);
        }
    } catch (e) {
        console.error('Error parsing message:', e);
    }
});
function applyConfig(config) {
    document.body.style.opacity = config.opacity / 100;
    if (config.theme) {
        const root = document.documentElement;
        root.style.setProperty('--font-family', config.theme.fontFamily || "'Inter', sans-serif");
        root.style.setProperty('--bg-idle', config.theme.bgIdle);
        root.style.setProperty('--border-idle', config.theme.borderIdle);
        root.style.setProperty('--text-idle', config.theme.textIdle);
        root.style.setProperty('--bg-active', config.theme.bgActive);
        root.style.setProperty('--border-active', config.theme.borderActive);
        root.style.setProperty('--text-active', config.theme.textActive);
        root.style.setProperty('--glow-active', config.theme.glowActive);
    }
    for (let keyId in ui) {
        const el = ui[keyId];
        if (el) {
            el.style.display = 'flex';
            el.style.fontSize = ''; 
            el.style.fontFamily = ''; 
        }
    }
    if (config.compactMode) {
        ui.TAB.style.display = 'none';
        ui.SPACE.style.display = 'none';
        ui.MOUSE1.textContent = 'CROUCH';
        ui.MOUSE1.style.fontSize = '24px';
        ui.MOUSE2.textContent = 'JUMP';
        ui.MOUSE2.style.fontSize = '24px';
    } else {
        const showArrows = config.arrowsForMouse === true || config.arrowsForMouse === 'true';
        if (showArrows) {
            ui.MOUSE1.innerHTML = '&#8592;'; 
            ui.MOUSE1.style.fontFamily = 'Arial, sans-serif'; 
            ui.MOUSE1.style.fontSize = '54px';
            ui.MOUSE2.innerHTML = '&#8594;'; 
            ui.MOUSE2.style.fontFamily = 'Arial, sans-serif';
            ui.MOUSE2.style.fontSize = '54px';
        } else {
            ui.MOUSE1.textContent = '+L';
            ui.MOUSE1.style.fontSize = '42px';
            ui.MOUSE2.textContent = '+R';
            ui.MOUSE2.style.fontSize = '42px';
        }
        ui.TAB.textContent = 'CROUCH';
        ui.TAB.style.fontSize = '32px';
        ui.SPACE.textContent = 'JUMP';
        ui.SPACE.style.fontSize = '32px';
        if (config.hideBinds) {
            ui.MOUSE1.style.display = 'none';
            ui.MOUSE2.style.display = 'none';
        }
        if (config.hideJumpCrouch) {
            ui.TAB.style.display = 'none';
            ui.SPACE.style.display = 'none';
        }
    }
    if (ipcRenderer) {
        let width = 765;
        let height = 375;
        if (config.compactMode) {
            width = 570;
        } else {
            if (config.hideJumpCrouch && !config.hideBinds) width = 570;
            if (config.hideBinds && config.hideJumpCrouch) width = 570;
        }
        const scale = config.windowScale || 1.0;
        document.body.style.zoom = scale;
        ipcRenderer.send('resize-window', { 
            width: Math.ceil(width * scale), 
            height: Math.ceil(height * scale) 
        });
    }
}
function updateOverlay(state) {
    let m1State = state.MOUSE1;
    let m2State = state.MOUSE2;
    if (currentConfig.flipTurnBinds) {
        m1State = state.MOUSE2;
        m2State = state.MOUSE1;
    }
    if (currentConfig.compactMode) {
        toggle(ui.W, state.W);
        toggle(ui.A, state.A);
        toggle(ui.S, state.S);
        toggle(ui.D, state.D);
        toggle(ui.MOUSE1, state.TAB);   
        toggle(ui.MOUSE2, state.SPACE); 
    } else {
        toggle(ui.W, state.W);
        toggle(ui.A, state.A);
        toggle(ui.S, state.S);
        toggle(ui.D, state.D);
        toggle(ui.TAB, state.TAB);
        toggle(ui.SPACE, state.SPACE);
        toggle(ui.MOUSE1, m1State); 
        toggle(ui.MOUSE2, m2State); 
    }
}
function toggle(el, active) {
    if (el) {
        if (active) el.classList.add(activeClass);
        else el.classList.remove(activeClass);
    }
}
