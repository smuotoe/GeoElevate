// Script to add XP cap CSS
import fs from 'fs';

const filePath = './frontend/src/pages/GamePlay.module.css';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already added
if (content.includes('.xpCapWarning')) {
    console.log('CSS already added');
    process.exit(0);
}

// Find .statLabel and add after it
const oldCss = `.statLabel {
    font-size: 13px;
    color: var(--text-secondary);
}

.buttonGroup {`;

const newCss = `.statLabel {
    font-size: 13px;
    color: var(--text-secondary);
}

.xpCapWarning {
    display: block;
    font-size: 12px;
    color: var(--warning, #FFE66D);
    margin-top: 4px;
    font-weight: 500;
}

.buttonGroup {`;

if (content.includes(oldCss)) {
    content = content.replace(oldCss, newCss);
    fs.writeFileSync(filePath, content);
    console.log('CSS added successfully');
} else {
    console.log('Pattern not found - adding to end of file');
    content += `
.xpCapWarning {
    display: block;
    font-size: 12px;
    color: var(--warning, #FFE66D);
    margin-top: 4px;
    font-weight: 500;
}
`;
    fs.writeFileSync(filePath, content);
    console.log('CSS added to end of file');
}
