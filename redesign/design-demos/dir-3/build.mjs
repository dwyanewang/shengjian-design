// Build dir-3.html: inline style.css and the JSX sources (compiled with the vendored Babel) into one page.
// Usage: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(import.meta.url);
const Babel = require(path.join(here, '../../vendor/babel.min.js'));
const src = path.join(here, 'src');
const files = fs.readdirSync(src).filter(f => /\.(jsx|js)$/.test(f)).sort();
const google = fs.readFileSync(path.join(here, '../../assets/logos/google-g.svg'));
let code = `const GOOGLE_G = "data:image/svg+xml;base64,${google.toString('base64')}";\n`;
for (const f of files) code += `\n/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(src, f), 'utf8');
let out;
try { out = Babel.transform(code, { presets: [['react', {}]], sourceType: 'script', compact: false, comments: false }).code; }
catch (e) { console.error(e.message); process.exit(1); }
const html = fs.readFileSync(path.join(src, 'template.html'), 'utf8')
  .replace('/*CSS*/', () => fs.readFileSync(path.join(src, 'style.css'), 'utf8'))
  .replace('/*JS*/', () => '(function(){\n' + out + '\n})();');
fs.writeFileSync(path.join(here, '../dir-3.html'), html);
console.log('built dir-3.html', (html.length / 1024).toFixed(0) + ' KB from', files.join(', '));
