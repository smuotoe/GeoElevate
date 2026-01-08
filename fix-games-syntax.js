const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/backend/src/routes/games.js';
let content = fs.readFileSync(path, 'utf8');

// Remove the extra }); that was accidentally added
content = content.replace(
    /res\.json\(\{ before, after, today \}\);\s*\}\);\s*\n\n\}\);\s*\n/,
    'res.json({ before, after, today });\n});\n\n'
);

fs.writeFileSync(path, content);
console.log('Fixed games.js syntax');
