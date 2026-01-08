const fs = require('fs');

// Fix Modal.module.css to use correct CSS variables
let modalCss = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/components/Modal.module.css', 'utf8');
modalCss = modalCss.replace(/var\(--bg-secondary\)/g, 'var(--surface)');
modalCss = modalCss.replace(/var\(--border-color\)/g, 'var(--border)');
modalCss = modalCss.replace(/var\(--bg-hover\)/g, 'var(--background)');
// Also fix close button touch target
modalCss = modalCss.replace(
    `.closeButton {
    background: none;
    border: none;
    font-size: 18px;
    font-weight: bold;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.15s, color 0.15s;
}`,
    `.closeButton {
    background: none;
    border: none;
    font-size: 18px;
    font-weight: bold;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.15s, color 0.15s;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
}`
);
fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/components/Modal.module.css', modalCss);
console.log('Updated Modal.module.css with correct CSS variables and 44px close button');
