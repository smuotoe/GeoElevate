const fs = require('fs');

// Add focus ring styles to index.css
let indexCss = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/styles/index.css', 'utf8');

// Replace input focus styles to add box-shadow
const oldFocus = `input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--primary);
}`;

const newFocus = `input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.25);
}

/* Focus visible for keyboard navigation */
a:focus-visible,
button:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
}`;

if (indexCss.includes(oldFocus) && !indexCss.includes('box-shadow: 0 0 0 3px rgba(0, 217, 255')) {
    indexCss = indexCss.replace(oldFocus, newFocus);
    fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/styles/index.css', indexCss);
    console.log('Added focus ring styles to index.css');
} else if (indexCss.includes('box-shadow: 0 0 0 3px rgba(0, 217, 255')) {
    console.log('Focus ring styles already exist');
} else {
    console.log('Could not find input focus styles to replace');
}
