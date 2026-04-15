import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdaptationProgress } from '../components/AdaptationProgress';

describe('AdaptationProgress', () => {
  it('shows all four pipeline steps', () => {
    render(<AdaptationProgress step="waiting" status="idle" />);
    expect(screen.getByText(/parsing request/i)).toBeInTheDocument();
    expect(screen.getByText(/building profile/i)).toBeInTheDocument();
    expect(screen.getByText(/adapting resume/i)).toBeInTheDocument();
    expect(screen.getByText(/committing/i)).toBeInTheDocument();
  });

  it('marks steps up to and including current step as done', () => {
    render(<AdaptationProgress step="profile_built" status="progress" />);
    const jd = screen.getByText(/parsing request/i).closest('li');
    const profile = screen.getByText(/building profile/i).closest('li');
    const adapted = screen.getByText(/adapting resume/i).closest('li');
    expect(jd?.getAttribute('data-state')).toBe('done');
    expect(profile?.getAttribute('data-state')).toBe('done');
    expect(adapted?.getAttribute('data-state')).toBe('pending');
  });

  it('shows rate-limited message when status is rate_limited', () => {
    render(<AdaptationProgress step="waiting" status="rate_limited" />);
    expect(screen.getByText(/rate limit/i)).toBeInTheDocument();
  });

  it('shows error message when status is error', () => {
    render(<AdaptationProgress step="waiting" status="error" errorMessage="boom" />);
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });
});
