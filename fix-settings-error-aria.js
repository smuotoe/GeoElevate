const fs = require('fs');

const filePath = 'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Settings.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update passwordError display
const oldPasswordError = '<div className="form-error">{passwordError}</div>';
const newPasswordError = '<div className="form-error" role="alert" aria-live="assertive">{passwordError}</div>';

// Update deleteError display
const oldDeleteError = '<div className="form-error">{deleteError}</div>';
const newDeleteError = '<div className="form-error" role="alert" aria-live="assertive">{deleteError}</div>';

let modified = false;

if (content.includes(oldPasswordError) && !content.includes(newPasswordError)) {
    content = content.replace(oldPasswordError, newPasswordError);
    modified = true;
}

if (content.includes(oldDeleteError) && !content.includes(newDeleteError)) {
    content = content.replace(oldDeleteError, newDeleteError);
    modified = true;
}

if (modified) {
    fs.writeFileSync(filePath, content);
    console.log('Updated Settings.jsx with ARIA attributes');
} else {
    console.log('Settings.jsx already has ARIA attributes or pattern not found');
}
