const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dataAdapted = path.join(root, '..', 'data', 'adapted');
const dataFitted = path.join(root, '..', 'data', 'fitted');
const publicAdapted = path.join(root, 'public', 'data', 'adapted');
const publicFitted = path.join(root, 'public', 'data', 'fitted');

// Copy adapted JSON + PDFs (existing behavior)
fs.cpSync(dataAdapted, publicAdapted, { recursive: true });

// Copy fitted markdown + generate index
fs.mkdirSync(publicFitted, { recursive: true });

const entries = [];
if (fs.existsSync(dataFitted)) {
  for (const file of fs.readdirSync(dataFitted)) {
    if (!file.endsWith('.md')) continue;
    fs.copyFileSync(path.join(dataFitted, file), path.join(publicFitted, file));
    entries.push({ slug: file.replace(/\.md$/, ''), filename: file });
  }
}

fs.writeFileSync(
  path.join(publicFitted, 'index.json'),
  JSON.stringify(entries, null, 2) + '\n'
);
