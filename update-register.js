const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Register.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/onChange=\{\(e\) => setEmail\(e\.target\.value\)\}/g, "onChange={(e) => { setEmail(e.target.value); setError(''); }}");
content = content.replace(/onChange=\{\(e\) => setUsername\(e\.target\.value\)\}/g, "onChange={(e) => { setUsername(e.target.value); setError(''); }}");
content = content.replace(/onChange=\{\(e\) => setPassword\(e\.target\.value\)\}/g, "onChange={(e) => { setPassword(e.target.value); setError(''); }}");
content = content.replace(/onChange=\{\(e\) => setConfirmPassword\(e\.target\.value\)\}/g, "onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}");
fs.writeFileSync(path, content);
console.log('File updated successfully');
