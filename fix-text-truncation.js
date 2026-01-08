const fs = require('fs');

// Fix Leaderboards.module.css to add text truncation
let leaderboardsCss = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Leaderboards.module.css', 'utf8');
leaderboardsCss = leaderboardsCss.replace(
    `.username {
    font-weight: 500;
    color: var(--color-text-primary);
}`,
    `.username {
    font-weight: 500;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}`
);
// Also add min-width: 0 to userInfo to enable truncation in flex container
leaderboardsCss = leaderboardsCss.replace(
    `.userInfo {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}`,
    `.userInfo {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}`
);
fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Leaderboards.module.css', leaderboardsCss);
console.log('Updated Leaderboards.module.css with text truncation');

// Also check and fix App.css for common elements
let appCss = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/styles/App.css', 'utf8');

// Add truncation utility class if not exists
if (!appCss.includes('.text-truncate')) {
    appCss += `
/* Text truncation utility */
.text-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
`;
    fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/styles/App.css', appCss);
    console.log('Added text-truncate utility class to App.css');
}
