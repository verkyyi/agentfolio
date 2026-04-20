import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivitySummary } from '../components/blocks/ActivitySummary';

describe('ActivitySummary', () => {
  it('renders total commits, window, and top repos', () => {
    render(
      <ActivitySummary
        data={{
          window: '30d',
          totalCommits: 42,
          topRepos: [{ name: 'AgentFolio', commits: 27 }, { name: 'Other', commits: 15 }],
          sparkline: [1, 2, 3, 4, 5],
        }}
      />
    );
    expect(screen.getByText(/42 commits/i)).toBeInTheDocument();
    expect(screen.getByText(/30 day/i)).toBeInTheDocument();
    expect(screen.getByText('AgentFolio')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('handles empty topRepos gracefully', () => {
    render(
      <ActivitySummary
        data={{ window: '90d', totalCommits: 5, topRepos: [], sparkline: [0,1,0,2] }}
      />
    );
    expect(screen.getByText(/5 commits/i)).toBeInTheDocument();
    expect(screen.getByText(/90 day/i)).toBeInTheDocument();
  });
});
