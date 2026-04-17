import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityStrip } from '../components/ActivityStrip';
import type { ActivityData } from '../components/GithubActivity';

function sample(over: Partial<ActivityData> = {}): ActivityData {
  return {
    user: 'verkyyi',
    fetchedAt: '2026-04-17T00:00:00.000Z',
    stats: { publicRepos: 12, contributions30d: 793, contributionsLastYear: 1508 },
    contributions: {
      weeks: [
        Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-0${i+1}`, count: i })),
        Array.from({ length: 7 }, (_, i) => ({ date: `2026-04-1${i}`, count: 7 + i })),
      ],
    },
    languages: [
      { name: 'TypeScript', color: '#3178c6', pct: 42 },
      { name: 'Rust', color: '#dea584', pct: 23 },
      { name: 'JavaScript', color: '#f1e05a', pct: 18 },
      { name: 'Go', color: '#00ADD8', pct: 10 },
    ],
    repos: [],
    ...over,
  };
}

describe('ActivityStrip', () => {
  it('renders the 30d contribution count and top 3 languages', () => {
    render(<ActivityStrip data={sample()} />);
    expect(screen.getByText('793')).toBeInTheDocument();
    expect(screen.getByText(/TypeScript/)).toBeInTheDocument();
    expect(screen.getByText(/Rust/)).toBeInTheDocument();
    expect(screen.getByText(/JavaScript/)).toBeInTheDocument();
    expect(screen.queryByText(/Go/)).not.toBeInTheDocument();
  });

  it('renders a 14-bar sparkline', () => {
    const { container } = render(<ActivityStrip data={sample()} />);
    const bars = container.querySelectorAll('.strip-bars span');
    expect(bars.length).toBe(14);
  });

  it('returns nothing when data is null', () => {
    const { container } = render(<ActivityStrip data={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('jump-to-activity link scrolls to #activity', async () => {
    const scrollSpy = vi.fn();
    const target = document.createElement('div');
    target.id = 'activity';
    target.scrollIntoView = scrollSpy;
    document.body.appendChild(target);

    const user = userEvent.setup();
    render(<ActivityStrip data={sample()} />);
    await user.click(screen.getByRole('button', { name: /jump to full activity/i }));
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    document.body.removeChild(target);
  });
});
