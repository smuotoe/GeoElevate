const fs = require('fs');

const filePath = 'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/GamePlay.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add id and aria-label to region select
const oldSelect = `<select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="input"
                        style={{`;

const newSelect = `<select
                        id="regionFilter"
                        aria-label="Filter by Region"
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="input"
                        style={{`;

if (content.includes(oldSelect) && !content.includes('id="regionFilter"')) {
    content = content.replace(oldSelect, newSelect);
    fs.writeFileSync(filePath, content);
    console.log('Added id and aria-label to region select');
} else if (content.includes('id="regionFilter"')) {
    console.log('Region select already has id');
} else {
    console.log('Could not find region select to update');
}
