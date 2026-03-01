const fs = require('fs');
const path = require('path');

const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZDSEl.png'; // Truncated... wait, let me use a real simple one.

// 16x16 red square
const redSquare = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEUlEQVR42mP8z8AARIwDEAAA0OcP/a73s5AAAAAASUVORK5CYII=', 'base64');

fs.writeFileSync(path.join(__dirname, 'public', 'icon.png'), redSquare);
console.log('Icon created at public/icon.png');
