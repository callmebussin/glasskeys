// Handle Environment (Electron vs Browser)
const ipcRenderer = (typeof require !== 'undefined') ? require('electron').ipcRenderer : null;

// Check for desktop mode
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'desktop') {
    document.body.classList.add('desktop-mode');
}

const socket = new WebSocket('ws://localhost:8081');

// Get Elements once
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
    compactMode: false
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
    // 1. Opacity
    document.body.style.opacity = config.opacity / 100;

    // 2. Theme
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

    // 3. Reset Visibility & Styles
    // We must reset these because Compact Mode or Arrow Mode might have changed them
    for (let keyId in ui) {
        const el = ui[keyId];
        if (el) {
            el.style.display = 'flex';
            el.style.fontSize = ''; // Clear inline size
            el.style.fontFamily = ''; // Clear inline font
        }
    }

    // 4. Compact Mode (2x3 Layout)
    if (config.compactMode) {
        // Hide unused keys
        ui.TAB.style.display = 'none';
        ui.SPACE.style.display = 'none';
        
        // Remap Mouse Keys
        ui.MOUSE1.textContent = 'CROUCH';
        ui.MOUSE1.style.fontSize = '24px';
        
        ui.MOUSE2.textContent = 'JUMP';
        ui.MOUSE2.style.fontSize = '24px';
        
    } else {
        // 5. Standard Mode
        
        // Label Logic
        // Strict Boolean check, or string check if coming from sloppy IPC
        const showArrows = config.arrowsForMouse === true || config.arrowsForMouse === 'true';

        if (showArrows) {
            // ARROW MODE
            ui.MOUSE1.innerHTML = '&#8592;'; // Left Arrow Entity
            ui.MOUSE1.style.fontFamily = 'Arial, sans-serif'; 
            ui.MOUSE1.style.fontSize = '54px';
            
            ui.MOUSE2.innerHTML = '&#8594;'; // Right Arrow Entity
            ui.MOUSE2.style.fontFamily = 'Arial, sans-serif';
            ui.MOUSE2.style.fontSize = '54px';
        } else {
            // TEXT MODE
            ui.MOUSE1.textContent = '+L';
            ui.MOUSE1.style.fontSize = '42px';
            
            ui.MOUSE2.textContent = '+R';
            ui.MOUSE2.style.fontSize = '42px';
        }
        
        // Reset labels for others in case we came from compact mode
        ui.TAB.textContent = 'CROUCH';
        ui.TAB.style.fontSize = '32px';
        
        ui.SPACE.textContent = 'JUMP';
        ui.SPACE.style.fontSize = '32px';

        // Visibility Logic
        if (config.hideBinds) {
            ui.MOUSE1.style.display = 'none';
            ui.MOUSE2.style.display = 'none';
        }
        
        if (config.hideJumpCrouch) {
            ui.TAB.style.display = 'none';
            ui.SPACE.style.display = 'none';
        }
    }

    // 6. Resize Window (IPC)
    if (ipcRenderer) {
        let width = 765;
        
        if (config.compactMode) {
            width = 570;
        } else {
            // If just Jump/Crouch hidden (Left Col) -> 3 cols wide?
            // Actually, TAB/SPACE are usually Col 1.
            // If they are hidden, we effectively have 3 cols of content.
            if (config.hideJumpCrouch && !config.hideBinds) width = 570;
            
            // If Both hidden (Only WASD) -> 3 cols wide (Row 2 is A,S,D)
            if (config.hideBinds && config.hideJumpCrouch) width = 570;
        }
        
        ipcRenderer.send('resize-window', { width: width, height: 375 });
    }
}

function updateOverlay(state) {
    if (currentConfig.compactMode) {
        // Remap Logic for Compact Mode
        toggle(ui.W, state.W);
        toggle(ui.A, state.A);
        toggle(ui.S, state.S);
        toggle(ui.D, state.D);
        toggle(ui.MOUSE1, state.TAB);   // M1 -> Crouch
        toggle(ui.MOUSE2, state.SPACE); // M2 -> Jump
    } else {
        // Standard Logic
        toggle(ui.W, state.W);
        toggle(ui.A, state.A);
        toggle(ui.S, state.S);
        toggle(ui.D, state.D);
        toggle(ui.TAB, state.TAB);
        toggle(ui.SPACE, state.SPACE);
        toggle(ui.MOUSE1, state.MOUSE1); // M1 -> Left Click
        toggle(ui.MOUSE2, state.MOUSE2); // M2 -> Right Click
    }
}

function toggle(el, active) {
    if (el) {
        if (active) el.classList.add(activeClass);
        else el.classList.remove(activeClass);
    }
}
