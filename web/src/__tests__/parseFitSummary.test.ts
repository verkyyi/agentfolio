import { describe, it, expect } from 'vitest';
import { parseFitSummary } from '../utils/parseFitSummary';

const withSummary = `<!--
fit-summary:
  target: Anthropic — Forward Deployed Engineer, Applied AI
  changes:
    - Changed headline from "Senior Software Engineer" to "Senior Data Infrastructure Engineer"
    - Reordered Skills above Projects
    - Tailored summary for Anthropic's FDE role
-->
# Lianghui Yi
Senior Data Infrastructure Engineer
`;

const withoutSummary = `# Lianghui Yi
Senior Software Engineer
`;

describe('parseFitSummary', () => {
  it('parses target and changes from fit-summary comment', () => {
    const { summary, body } = parseFitSummary(withSummary);
    expect(summary).not.toBeNull();
    expect(summary!.target).toBe('Anthropic — Forward Deployed Engineer, Applied AI');
    expect(summary!.changes).toEqual([
      'Changed headline from "Senior Software Engineer" to "Senior Data Infrastructure Engineer"',
      'Reordered Skills above Projects',
      "Tailored summary for Anthropic's FDE role",
    ]);
    expect(body).toBe('# Lianghui Yi\nSenior Data Infrastructure Engineer\n');
  });

  it('returns null summary and full body when no comment present', () => {
    const { summary, body } = parseFitSummary(withoutSummary);
    expect(summary).toBeNull();
    expect(body).toBe(withoutSummary);
  });
});

const withGreetingAndSuggestions = `<!--
fit-summary:
  target: Anthropic — Forward Deployed Engineer, Applied AI
  changes:
    - Changed headline to emphasize data infrastructure
    - Reordered Skills above Projects
  greeting: Hey — I'm an agent that knows Verky. Ask me about the Flink pipeline at Acme or what drew me to Anthropic's platform.
  suggestions:
    - Why Anthropic?
    - Walk me through the Flink pipeline
    - What's not on the résumé?
-->
# Lianghui Yi
`;

it('parses greeting when present', () => {
  const { summary } = parseFitSummary(withGreetingAndSuggestions);
  expect(summary).not.toBeNull();
  expect(summary!.greeting).toBe(
    "Hey — I'm an agent that knows Verky. Ask me about the Flink pipeline at Acme or what drew me to Anthropic's platform.",
  );
});

it('parses suggestions as a separate list, not mixed into changes', () => {
  const { summary } = parseFitSummary(withGreetingAndSuggestions);
  expect(summary!.suggestions).toEqual([
    'Why Anthropic?',
    'Walk me through the Flink pipeline',
    "What's not on the résumé?",
  ]);
  expect(summary!.changes).toEqual([
    'Changed headline to emphasize data infrastructure',
    'Reordered Skills above Projects',
  ]);
});

it('leaves greeting and suggestions undefined when absent (backward compat)', () => {
  const { summary } = parseFitSummary(withSummary);
  expect(summary!.greeting).toBeUndefined();
  expect(summary!.suggestions).toBeUndefined();
});
