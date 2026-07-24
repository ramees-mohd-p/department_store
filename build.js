import fs from 'fs';
import path from 'path';

const frontendDir = './frontend';
const html = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf-8');
const css = fs.readFileSync(path.join(frontendDir, 'styles.css'), 'utf-8');
const js = fs.readFileSync(path.join(frontendDir, 'app.js'), 'utf-8');

// Inject CSS and JS into HTML
const bundled = html
  .replace('<style id="inline-css"></style>', `<style>${css}</style>`)
  .replace('<script id="inline-js"></script>', `<script>${js}</script>`);

fs.writeFileSync(path.join(frontendDir, 'index.html.bundled'), bundled);
console.log('Build complete: frontend/index.html.bundled');
