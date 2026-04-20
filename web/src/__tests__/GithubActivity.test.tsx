// web/src/__tests__/GithubActivity.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GithubActivity } from '../components/GithubActivity';

const fixture = {
  user: 'verkyyi',
  fetchedAt: '2026-04-17T06:00:00.000Z',
  stats: { publicRepos: 12, contributions30d: 84, contributionsLastYear: 1247 },
  contributions: {
    weeks: [
      Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-${11 + i}`, count: 2 })),
    ],
  },
  languages: [
    { name: 'TypeScript', color: '#3178c6', pct: 60 },
    { name: 'Python', color: '#3572a5', pct: 40 },
  ],
  repos: [
    {
      name: 'agentfolio',
      url: 'https://github.com/verkyyi/agentfolio',
      description: 'Open-source agentic portfolio engine',
      language: 'TypeScript',
      languageColor: '#3178c6',
      stars: 42,
      pushedAt: '2026-04-17T05:29:33Z',
    },
  ],
};

describe('GithubActivity', () => {
  it('does not render a contribution heatmap', () => {
    const { container } = render(<GithubActivity data={fixture} />);
    expect(container.querySelector('svg rect.heatmap-cell')).toBeNull();
  });

  it('renders each repo with link and description', () => {
    render(<GithubActivity data={fixture} />);
    const link = screen.getByRole('link', { name: 'agentfolio' });
    expect(link).toHaveAttribute('href', 'https://github.com/verkyyi/agentfolio');
    expect(screen.getByText('Open-source agentic portfolio engine')).toBeInTheDocument();
  });

  it('renders an Updated footnote with the fetchedAt date', () => {
    render(<GithubActivity data={fixture} />);
    expect(screen.getByText(/Updated 2026-04-17/)).toBeInTheDocument();
  });

  it('returns null when data is null', () => {
    const { container } = render(<GithubActivity data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('has id="activity" for in-page anchor scrolling', () => {
    const { container } = render(<GithubActivity data={fixture} />);
    expect(container.querySelector('#activity')).not.toBeNull();
  });
});
