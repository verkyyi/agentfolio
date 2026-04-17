import { describe, it, expect } from 'vitest';
import { extractTargetFromFitted } from '../utils/fitSummary';

describe('extractTargetFromFitted', () => {
  it('returns target from fit-summary comment', () => {
    const md = '<!-- fit-summary: {"target":"Notion · Eng"} -->\n# R';
    expect(extractTargetFromFitted(md, 'notion')).toBe('Notion · Eng');
  });

  it('falls back to slug when missing', () => {
    expect(extractTargetFromFitted('# R', 'notion')).toBe('notion');
  });
});
