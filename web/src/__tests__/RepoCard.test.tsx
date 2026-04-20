import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RepoCard } from '../components/blocks/RepoCard';

describe('RepoCard', () => {
  it('renders name, description, commit count, and link', () => {
    render(
      <RepoCard
        data={{
          name: 'AgentFolio',
          description: 'Agent-native portfolio engine',
          commits: 47,
          sparkline: [1, 2, 3, 4, 5],
          url: 'https://github.com/v/a',
        }}
      />
    );
    expect(screen.getByText('AgentFolio')).toBeInTheDocument();
    expect(screen.getByText(/agent-native portfolio/i)).toBeInTheDocument();
    expect(screen.getByText(/47 commits/i)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://github.com/v/a');
  });

  it('renders without commits or sparkline', () => {
    render(<RepoCard data={{ name: 'X', description: '', url: 'https://x' }} />);
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
