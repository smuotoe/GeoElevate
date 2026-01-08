// This script checks achievement data via API
const http = require('http');

// Make a request to check achievements
const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/achievements',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Achievements:', JSON.parse(data));
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
});

req.end();
