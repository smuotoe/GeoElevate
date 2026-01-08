const fs = require('fs');

// Files to update with role="alert" for error messages
const files = [
    'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Login.jsx',
    'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Register.jsx',
    'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Settings.jsx',
    'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Friends.jsx',
    'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Multiplayer.jsx'
];

// Pattern to find error displays without role="alert"
const patterns = [
    {
        find: '{error && <p className="form-error">{error}</p>}',
        replace: '{error && <p className="form-error" role="alert" aria-live="assertive">{error}</p>}'
    },
    {
        find: '<div className="error-message mb-md">',
        replace: '<div className="error-message mb-md" role="alert" aria-live="polite">'
    }
];

files.forEach(filePath => {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        patterns.forEach(pattern => {
            if (content.includes(pattern.find) && !content.includes(pattern.replace)) {
                content = content.split(pattern.find).join(pattern.replace);
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`Updated: ${filePath.split('/').pop()}`);
        } else {
            console.log(`No changes needed: ${filePath.split('/').pop()}`);
        }
    } catch (err) {
        console.log(`Error reading ${filePath.split('/').pop()}: ${err.message}`);
    }
});
