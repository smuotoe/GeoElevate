const fs = require('fs');
const path = './frontend/vite.config.js';
const content = fs.readFileSync(path, 'utf8');
const updated = content.replace('http://localhost:3010', 'http://localhost:3001');
fs.writeFileSync(path, updated);
console.log('Updated vite.config.js to proxy to port 3001');
