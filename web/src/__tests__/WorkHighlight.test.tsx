import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkHighlight } from '../components/blocks/WorkHighlight';

describe('WorkHighlight', () => {
  it('renders company, role, period, and bullets', () => {
    render(
      <WorkHighlight
        data={{
          company: 'Acme',
          role: 'Staff Engineer',
          period: '2022-01 – 2024-06',
          bullets: ['Built X', 'Scaled Y', 'Mentored Z'],
        }}
      />
    );
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText(/Staff Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/2022-01 – 2024-06/)).toBeInTheDocument();
    expect(screen.getByText('Built X')).toBeInTheDocument();
    expect(screen.getByText('Scaled Y')).toBeInTheDocument();
    expect(screen.getByText('Mentored Z')).toBeInTheDocument();
  });

  it('renders without bullets', () => {
    render(
      <WorkHighlight
        data={{ company: 'Acme', role: 'Engineer', period: '2020 – 2021', bullets: [] }}
      />
    );
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });
});
