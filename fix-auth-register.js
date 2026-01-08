const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/backend/src/routes/auth.js';

let content = fs.readFileSync(path, 'utf8');

// Replace destructuring
content = content.replace(
    'const { email, username, password } = req.body;',
    `const { email: rawEmail, username: rawUsername, password } = req.body;

        // Trim whitespace from email and username
        const email = rawEmail?.trim();
        const username = rawUsername?.trim();`
);

// Add username length validation before email format validation
content = content.replace(
    `        // Validate email format
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;`,
    `        // Validate username length
        if (username.length < 3) {
            return res.status(400).json({
                error: { message: 'Username must be at least 3 characters' }
            });
        }

        if (username.length > 20) {
            return res.status(400).json({
                error: { message: 'Username must be at most 20 characters' }
            });
        }

        // Validate email format
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;`
);

fs.writeFileSync(path, content, 'utf8');
console.log('File updated successfully');
