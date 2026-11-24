// Builds ../dir-1.html from parts/: head + every .jsx part compiled once with the bundled Babel (no in-browser transform).
const fs = require('fs'), path = require('path');
process.chdir(__dirname);
const Babel = require('../../vendor/babel.min.js');
const parts = fs.readdirSync('parts').filter(f => f.endsWith('.jsx')).sort();
const G = fs.readFileSync('../../assets/logos/google-g.svg').toString('base64');
let src = `const GOOGLE_G = 'data:image/svg+xml;base64,${G}';\n`;
for (const f of parts) src += `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join('parts', f), 'utf8') + '\n';
src += 'ReactDOM.createRoot(document.getElementById("root")).render(<Board />);\n';
const out = Babel.transform(src, { presets: ['react'], filename: 'dir-1.jsx' }).code;
let head = fs.readFileSync('parts/00-head.html', 'utf8').replace('<script src="../vendor/babel.min.js"></script>\n', '');
const html = head + '<script>\n(function () {\n' + out + '\n})();\n</script>\n</body>\n</html>\n';
fs.writeFileSync('../dir-1.html', html);
console.log('built ../dir-1.html', html.length, 'chars from', parts.length, 'parts');
