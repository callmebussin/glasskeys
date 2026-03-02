const ipcRenderer = (typeof require !== 'undefined') ? require('electron').ipcRenderer : null;

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'desktop') {
    document.body.classList.add('desktop-mode');
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
        
        // Apply Scale
        const scale = config.windowScale || 1.0;
        document.body.style.zoom = scale;
        
        // Resize window to match scaled content
        ipcRenderer.send('resize-window', { 
            width: Math.ceil(width * scale), 
            height: Math.ceil(height * scale) 
        });
    }
}

function updateOverlay(state) {
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
        toggle(ui.MOUSE1, state.MOUSE1); 
        toggle(ui.MOUSE2, state.MOUSE2); 
    }
}

function toggle(el, active) {
    if (el) {
        if (active) el.classList.add(activeClass);
        else el.classList.remove(activeClass);
    }
}
