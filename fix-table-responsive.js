const fs = require('fs');

// Add table responsive styles to App.css
let appCss = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/styles/App.css', 'utf8');

// Add table responsive styles if not exists
if (!appCss.includes('.table-responsive')) {
    appCss += `

/* Table responsive wrapper */
.table-responsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

/* Responsive table styles */
table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;
}

table th,
table td {
    padding: var(--spacing-sm) var(--spacing-md);
    text-align: left;
    border-bottom: 1px solid var(--border);
}

table th {
    background: var(--surface);
    font-weight: 600;
    white-space: nowrap;
}

table td {
    white-space: nowrap;
}
`;
    fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/styles/App.css', appCss);
    console.log('Added table responsive styles to App.css');
} else {
    console.log('Table responsive styles already exist');
}
