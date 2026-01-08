const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/backend/src/routes/games.js';
let content = fs.readFileSync(path, 'utf8');

// Fix the missing }); after the debug-user endpoint
content = content.replace(
    `lastPlayedNotToday: user?.last_played_date !== today
        }
    });
/**
 * Fix user streak`,
    `lastPlayedNotToday: user?.last_played_date !== today
        }
    });
});

/**
 * Fix user streak`
);

fs.writeFileSync(path, content);
console.log('Fixed closing brace');
