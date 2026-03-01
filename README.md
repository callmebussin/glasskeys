# GlassKeys - Twitch Keypress Overlay

A minimal, transparent overlay for Twitch streams that displays live keypress inputs for W, A, S, D, TAB, SPACE, and Mouse Buttons.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run the Overlay**:
    ```bash
    node index.js
    ```
    This will start the server and automatically open the overlay in your default browser.

3.  **Add to OBS**:
    -   In OBS, add a new **Browser Source**.
    -   Set URL to `http://localhost:3000`.
    -   Set Width to `400` (adjust as needed).
    -   Set Height to `200` (adjust as needed).
    -   Check "Shutdown source when not visible" (optional).
    -   Use the **Interact** button in OBS to test or resize if needed, though usually transparency works automatically.

## Troubleshooting

-   **Input Lag**: Ensure no other heavy applications are running. The WebSocket should be near instant.
-   **Keys Not Registering**: Ensure the terminal running `node index.js` has focus or is running as Administrator if capturing inputs from games running as Admin.
-   **Mouse Buttons Swapped**: If Left/Right clicks are swapped, edit `index.js` to swap button 1 and 2 logic.
