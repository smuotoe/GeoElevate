const fs = require('fs');

const cssContent = `.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 8px 0;
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0));
    z-index: 100;
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    text-decoration: none;
    color: var(--text-secondary);
    transition: color 0.2s ease;
    min-width: 64px;
    min-height: 44px;
}

.nav-item:hover {
    color: var(--text-primary);
}

.nav-item.active {
    color: var(--primary);
}

.nav-icon {
    font-size: 24px;
    margin-bottom: 2px;
}

.nav-label {
    font-size: 11px;
    font-weight: 500;
}
`;

fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/components/BottomNav.css', cssContent);
console.log('Updated BottomNav.css with min-height 44px touch targets');

// Also fix modal close button in App.css
let appCss = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/styles/App.css', 'utf8');
appCss = appCss.replace(
    `.modal-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.25rem;
    cursor: pointer;
    padding: var(--spacing-xs);
    min-height: auto;
}`,
    `.modal-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.25rem;
    cursor: pointer;
    padding: var(--spacing-sm);
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
}`
);
fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/styles/App.css', appCss);
console.log('Updated App.css modal-close with 44px touch target');

// Also fix pauseButton in GamePlay.module.css
let gameplayCss = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/GamePlay.module.css', 'utf8');
gameplayCss = gameplayCss.replace(
    `.pauseButton {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 16px;
    font-weight: bold;
    color: var(--text-primary);
    cursor: pointer;
    transition: background-color 0.15s;
}`,
    `.pauseButton {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 16px;
    font-weight: bold;
    color: var(--text-primary);
    cursor: pointer;
    transition: background-color 0.15s;
    min-width: 44px;
    min-height: 44px;
}`
);
fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/GamePlay.module.css', gameplayCss);
console.log('Updated GamePlay.module.css pauseButton with 44px touch target');
