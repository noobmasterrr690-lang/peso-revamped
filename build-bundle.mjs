// Production Builder for PESO App (Web + iOS/Android PWA + Capacitor dist/)
import fs from 'node:fs';
import path from 'node:path';

let ledgerCode = fs.readFileSync('js/ledger.js', 'utf8');
let qrCode = fs.readFileSync('js/qr.js', 'utf8');
let renderersCode = fs.readFileSync('js/renderers.js', 'utf8');
let appCode = fs.readFileSync('js/app.js', 'utf8');

// Strip ES module import statements
ledgerCode = ledgerCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
qrCode = qrCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
renderersCode = renderersCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
appCode = appCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');

// Strip 'export ' keywords
ledgerCode = ledgerCode.replace(/export\s+(default\s+)?(class|function|const|let|var)\s+/g, '$2 ');
qrCode = qrCode.replace(/export\s+(default\s+)?(class|function|const|let|var)\s+/g, '$2 ');
renderersCode = renderersCode.replace(/export\s+(default\s+)?(class|function|const|let|var)\s+/g, '$2 ');
appCode = appCode.replace(/export\s+(default\s+)?(class|function|const|let|var)\s+/g, '$2 ');

// Also handle export { ... }
ledgerCode = ledgerCode.replace(/export\s*\{[\s\S]*?\};?/g, '');
qrCode = qrCode.replace(/export\s*\{[\s\S]*?\};?/g, '');
renderersCode = renderersCode.replace(/export\s*\{[\s\S]*?\};?/g, '');
appCode = appCode.replace(/export\s*\{[\s\S]*?\};?/g, '');

const bundle = `/**
 * PESO Bundled Production Script
 * Full-Stack React/Capacitor + SQLite Student Cash Budgeting Distribution
 */
(function() {
  'use strict';
${ledgerCode}

${qrCode}

${renderersCode}

${appCode}
})();
`;

fs.writeFileSync('js/bundle.js', bundle, 'utf8');

// Sync to public/ and dist/ so Capacitor (iOS/Android), Vite, and GitHub Pages have complete assets
for (const targetDir of ['public', 'dist']) {
  fs.mkdirSync(path.join(targetDir, 'js'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'styles'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'js', 'bundle.js'), bundle, 'utf8');
  fs.copyFileSync(path.join('styles', 'main.css'), path.join(targetDir, 'styles', 'main.css'));
  fs.copyFileSync('index.html', path.join(targetDir, 'index.html'));
  fs.copyFileSync('manifest.webmanifest', path.join(targetDir, 'manifest.webmanifest'));
  fs.copyFileSync('sw.js', path.join(targetDir, 'sw.js'));
  fs.copyFileSync('icon.svg', path.join(targetDir, 'icon.svg'));
}

console.log('Production bundle and dist/ created successfully. Size:', bundle.length);
