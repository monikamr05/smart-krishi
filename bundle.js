const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const cssPath = path.join(rootDir, 'style.css');
const jsPath = path.join(rootDir, 'script.js');
const htmlPath = path.join(rootDir, 'index.html');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
let html = fs.readFileSync(htmlPath, 'utf8');

// Replace stylesheet link with inlined style block + fallback link
if (html.includes('<link rel="stylesheet" href="style.css" />')) {
  html = html.replace(
    '<link rel="stylesheet" href="style.css" />',
    `<style>\n${css}\n    </style>\n    <link rel="stylesheet" href="style.css" />`
  );
}

fs.writeFileSync(htmlPath, html, 'utf8');
fs.writeFileSync(path.join(publicDir, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(publicDir, 'style.css'), css, 'utf8');
fs.writeFileSync(path.join(publicDir, 'script.js'), js, 'utf8');

console.log('Successfully bundled inlined CSS and synced public folder!');
