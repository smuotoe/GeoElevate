const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/frontend/vite.config.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('http://localhost:3001', 'http://localhost:5001');

fs.writeFileSync(path, content);
console.log('Vite config updated to use port 5001');
