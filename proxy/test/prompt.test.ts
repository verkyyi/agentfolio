import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, extractTarget, stripFitSummary } from '../src/prompt';

describe('stripFitSummary', () => {
  it('removes a fit-summary HTML comment', () => {
    const md = '<!--\nfit-summary:\n  target: Notion · Eng\n-->\n# Body';
    expect(stripFitSummary(md)).toBe('# Body');
  });

  it('leaves markdown alone when no comment', () => {
    expect(stripFitSummary('# Body')).toBe('# Body');
  });
});

describe('extractTarget', () => {
  it('prefers fit-summary target', () => {
    const fitted = '<!--\nfit-summary:\n  target: Notion · Platform Eng\n  changes:\n    - a\n-->\n# r';
    expect(extractTarget(fitted, 'notion')).toBe('Notion · Platform Eng');
  });

  it('falls back to slug when no fit-summary', () => {
    expect(extractTarget('# resume', 'notion')).toBe('notion');
  });
});

describe('buildSystemPrompt', () => {
  it('includes name, target, and all three sections', () => {
    const p = buildSystemPrompt({
      name: 'Verky',
      target: 'Notion · Eng',
      fitted: '# Resume body',
      directives: 'Prefer platform engineer.',
      jd: 'Build tools.',
    });
    expect(p).toContain('You are Verky');
    expect(p).toContain('Notion · Eng');
    expect(p).toContain('# Resume body');
    expect(p).toContain('Prefer platform engineer.');
    expect(p).toContain('Build tools.');
    expect(p).toContain('Refusal rules');
  });

  it('omits missing optional sections', () => {
    const p = buildSystemPrompt({
      name: 'Verky',
      target: 'X',
      fitted: '# r',
      directives: null,
      jd: null,
    });
    expect(p).not.toContain('--- DIRECTIVES ---');
    expect(p).not.toContain('--- JOB DESCRIPTION ---');
    expect(p).toContain('--- RESUME');
  });
});
