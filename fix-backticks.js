const fs = require('fs');

// Read GamePlay.jsx
let content = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/GamePlay.jsx', 'utf8');

// Replace escaped backticks with regular backticks
content = content.replace(/\\`/g, '`');

// Write back
fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/GamePlay.jsx', content);
console.log('Fixed backticks in GamePlay.jsx');
