import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dataFitted = join(__dirname, '..', '..', '..', 'data', 'fitted');
const publicFitted = join(__dirname, '..', '..', 'public', 'data', 'fitted');

function fittedSources(): string[] {
  return existsSync(dataFitted)
    ? readdirSync(dataFitted).filter((f) => f.endsWith('.md'))
    : [];
}

describe('copy-data script', () => {
  beforeAll(() => {
    execSync('npm run copy-data', { cwd: join(__dirname, '..', '..') });
  });

  it('copies every fitted markdown file to public/', () => {
    for (const file of fittedSources()) {
      expect(existsSync(join(publicFitted, file))).toBe(true);
    }
  });

  it('generates index.json with one entry per fitted markdown file', () => {
    const index = JSON.parse(readFileSync(join(publicFitted, 'index.json'), 'utf-8'));
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBe(fittedSources().length);
    for (const entry of index) {
      expect(entry.slug).toBeTruthy();
      expect(entry.label).toBeTruthy();
    }
  });

  it('copies data/github/activity.json when it exists', () => {
    const src = join(__dirname, '..', '..', '..', 'data', 'github', 'activity.json');
    const dst = join(__dirname, '..', '..', 'public', 'data', 'github', 'activity.json');
    if (existsSync(src)) {
      expect(existsSync(dst)).toBe(true);
      expect(readFileSync(src, 'utf-8')).toBe(readFileSync(dst, 'utf-8'));
    } else {
      // Absent source must not crash the copy — verify no output path was created.
      expect(existsSync(dst)).toBe(false);
    }
  });
});
