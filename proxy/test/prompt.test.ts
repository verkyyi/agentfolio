import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, extractTarget, stripFitSummary } from '../src/prompt';

describe('stripFitSummary', () => {
  it('removes a fit-summary HTML comment', () => {
    const md = '<!--\nfit-summary:\n  target: Anthropic · FDE\n-->\n# Body';
    expect(stripFitSummary(md)).toBe('# Body');
  });

  it('leaves markdown alone when no comment', () => {
    expect(stripFitSummary('# Body')).toBe('# Body');
  });
});

describe('extractTarget', () => {
  it('prefers fit-summary target', () => {
    const fitted = '<!--\nfit-summary:\n  target: Anthropic · FDE\n  changes:\n    - a\n-->\n# r';
    expect(extractTarget(fitted, 'anthropic-fde-nyc')).toBe('Anthropic · FDE');
  });

  it('falls back to slug when no fit-summary', () => {
    expect(extractTarget('# resume', 'anthropic-fde-nyc')).toBe('anthropic-fde-nyc');
  });
});

describe('buildSystemPrompt', () => {
  it('includes name, target, and all three sections', () => {
    const p = buildSystemPrompt({
      name: 'Verky',
      target: 'Anthropic · FDE',
      fitted: '# Resume body',
      directives: 'Prefer platform engineer.',
      jd: 'Build tools.',
    });
    expect(p).toContain('You are Verky');
    expect(p).toContain('Anthropic · FDE');
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

  it('always tells the model to treat prior turns as real history', () => {
    const p = buildSystemPrompt({
      name: 'Verky',
      target: 'X',
      fitted: '# r',
      directives: null,
      jd: null,
    });
    expect(p).toContain('Prior turns in this conversation are real');
    expect(p).toContain("don't claim you lack memory");
  });

  it('embeds the greeting line when a greeting is provided', () => {
    const p = buildSystemPrompt({
      name: 'Verky',
      target: 'X',
      fitted: '# r',
      directives: null,
      jd: null,
      greeting: 'Hey — ask me about the Flink pipeline.',
    });
    expect(p).toContain('Your opening line to the visitor was: "Hey — ask me about the Flink pipeline."');
    expect(p).toContain('Treat it as something you already said.');
  });

  it('omits the greeting line when greeting is absent or blank', () => {
    const base = {
      name: 'Verky',
      target: 'X',
      fitted: '# r',
      directives: null,
      jd: null,
    };
    expect(buildSystemPrompt(base)).not.toContain('Your opening line to the visitor');
    expect(buildSystemPrompt({ ...base, greeting: '' })).not.toContain('Your opening line to the visitor');
    expect(buildSystemPrompt({ ...base, greeting: '   ' })).not.toContain('Your opening line to the visitor');
  });

  it('includes tool guidance mentioning open_panel', () => {
    const prompt = buildSystemPrompt({
      name: 'Verky', target: 'FDE', fitted: '# resume', directives: null, jd: null,
    });
    expect(prompt).toMatch(/open_panel/);
    expect(prompt).toMatch(/explicitly ask/i);
  });
});
