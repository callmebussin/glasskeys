# GlassKeys - Twitch Overlay Keypress Visualizer

![GlassKeys Demo](public/demo.gif)

A minimal, transparent overlay for Twitch streams that displays live keypress inputs for W, A, S, D, TAB, SPACE, and Mouse Buttons.

## Download & Installation

The easiest way to use GlassKeys is to download the latest release:

1.  Go to the **[Releases Page](https://github.com/callmebussin/glasskeys/releases)**.
2.  Download the latest `.zip` file (e.g., `GlassKeys-win32-x64-v1.0.1.zip`).
3.  Extract the zip file to a folder of your choice.
4.  Run `GlassKeys.exe`.

## Usage with OBS Studio

You can add GlassKeys to OBS in two ways:

### Method 1: Browser Source (Recommended)
This method provides the cleanest transparency.

1.  Run `GlassKeys.exe`.
2.  In OBS, add a new **Browser Source**.
3.  Set the **URL** to: `http://localhost:3001`
4.  Set **Width** to `765` and **Height** to `375`.
5.  Check "Shutdown source when not visible" (optional).

### Method 2: Window Capture
1.  Run `GlassKeys.exe`.
2.  In OBS, add a new **Window Capture**.
3.  Select **[GlassKeys.exe]: GlassKeys Preview**.
4.  Set "Capture Method" to **Windows 10 (1903 and up)** to support transparency properly.
5.  Enable "Allow Transparency" if available.

## Configuration

The application runs in the system tray. 
- **Double-click** the tray icon to show/hide the preview window.
- **Right-click** the tray icon to access the **Configuration** menu to change settings like opacity, key remapping, and themes.

## Build from Source (Advanced)

If you want to modify the code or build it yourself:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run in Development Mode**:
    ```bash
    npm start
    ```

3.  **Build Executable**:
    ```bash
    npm run dist
    ```
    The output will be in the `dist` folder.
