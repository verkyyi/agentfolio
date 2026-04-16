import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const publicFitted = join(__dirname, '..', '..', 'public', 'data', 'fitted');

describe('copy-data script', () => {
  beforeAll(() => {
    execSync('npm run copy-data', { cwd: join(__dirname, '..', '..') });
  });

  it('copies fitted markdown files to public/', () => {
    expect(existsSync(join(publicFitted, 'default.md'))).toBe(true);
    expect(existsSync(join(publicFitted, 'notion.md'))).toBe(true);
  });

  it('generates index.json with slug entries', () => {
    const index = JSON.parse(readFileSync(join(publicFitted, 'index.json'), 'utf-8'));
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBeGreaterThanOrEqual(2);
    expect(index).toContainEqual({ slug: 'default', filename: 'default.md' });
    expect(index).toContainEqual({ slug: 'notion', filename: 'notion.md' });
  });
});
