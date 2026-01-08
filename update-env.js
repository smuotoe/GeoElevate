const fs = require('fs');
const path = './backend/.env';
const content = fs.readFileSync(path, 'utf8');
const updated = content.replace('PORT=3010', 'PORT=3001').replace('WS_PORT=3011', 'WS_PORT=3002');
fs.writeFileSync(path, updated);
console.log('Updated .env to use PORT=3001 and WS_PORT=3002');
