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

const TARGET_RE = /^<!--\s*\nfit-summary:\s*\n[\s\S]*?target:\s*(.+)/;

const entries = [];
if (fs.existsSync(dataFitted)) {
  for (const file of fs.readdirSync(dataFitted)) {
    if (!file.endsWith('.md')) continue;
    fs.copyFileSync(path.join(dataFitted, file), path.join(publicFitted, file));
    const content = fs.readFileSync(path.join(dataFitted, file), 'utf-8');
    const match = content.match(TARGET_RE);
    const label = match ? match[1].trim() : file.replace(/\.md$/, '');
    entries.push({ slug: file.replace(/\.md$/, ''), filename: file, label });
  }
}

fs.writeFileSync(
  path.join(publicFitted, 'index.json'),
  JSON.stringify(entries, null, 2) + '\n'
);

// Copy JD files if they exist
const dataJd = path.join(root, '..', 'data', 'input', 'jd');
const publicJd = path.join(root, 'public', 'data', 'jd');
if (fs.existsSync(dataJd)) {
  fs.mkdirSync(publicJd, { recursive: true });
  for (const file of fs.readdirSync(dataJd)) {
    if (!file.endsWith('.md')) continue;
    fs.copyFileSync(path.join(dataJd, file), path.join(publicJd, file));
  }
}

// Copy directives if it exists
const directivesSrc = path.join(root, '..', 'data', 'input', 'directives.md');
const directivesDst = path.join(root, 'public', 'data', 'directives.md');
if (fs.existsSync(directivesSrc)) {
  fs.mkdirSync(path.dirname(directivesDst), { recursive: true });
  fs.copyFileSync(directivesSrc, directivesDst);
}
