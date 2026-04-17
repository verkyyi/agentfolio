import { describe, it, expect } from 'vitest';
import { firstSentence } from '../utils/firstSentence';

describe('firstSentence', () => {
  it('returns the first sentence of a multi-sentence string', () => {
    expect(
      firstSentence('First sentence here. Second sentence should not appear. Third also excluded.'),
    ).toBe('First sentence here.');
  });

  it('does not split on abbreviations like "U.S."', () => {
    expect(
      firstSentence('U.S. citizen with a long résumé. Looking for staff roles.'),
    ).toBe('U.S. citizen with a long résumé.');
  });

  it('returns the whole string when there is no sentence boundary', () => {
    expect(firstSentence('Just one sentence without a real boundary')).toBe(
      'Just one sentence without a real boundary',
    );
  });
});
