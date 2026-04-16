import { describe, it, expect } from 'vitest';
import { parseFitSummary } from '../utils/parseFitSummary';

const withSummary = `<!--
fit-summary:
  target: Notion — Software Engineer, Enterprise Data Platform
  changes:
    - Changed headline from "Senior Software Engineer" to "Senior Data Infrastructure Engineer"
    - Reordered Skills above Projects
    - Tailored summary for Notion's enterprise data platform
-->
# Alex Chen
Senior Data Infrastructure Engineer
`;

const withoutSummary = `# Alex Chen
Senior Software Engineer
`;

describe('parseFitSummary', () => {
  it('parses target and changes from fit-summary comment', () => {
    const { summary, body } = parseFitSummary(withSummary);
    expect(summary).not.toBeNull();
    expect(summary!.target).toBe('Notion — Software Engineer, Enterprise Data Platform');
    expect(summary!.changes).toEqual([
      'Changed headline from "Senior Software Engineer" to "Senior Data Infrastructure Engineer"',
      'Reordered Skills above Projects',
      "Tailored summary for Notion's enterprise data platform",
    ]);
    expect(body).toBe('# Alex Chen\nSenior Data Infrastructure Engineer\n');
  });

  it('returns null summary and full body when no comment present', () => {
    const { summary, body } = parseFitSummary(withoutSummary);
    expect(summary).toBeNull();
    expect(body).toBe(withoutSummary);
  });
});
