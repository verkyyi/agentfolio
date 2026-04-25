import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '../components/Hero';

describe('Hero', () => {
  it('renders name, tagline, and profile links', () => {
    render(
      <Hero
        name="Verky Yi"
        tagline="Product engineer building AI-native tools"
        profiles={[
          { network: 'LinkedIn', url: 'https://linkedin.com/in/verky' },
          { network: 'GitHub', url: 'https://github.com/verky' },
        ]}
      />
    );
    expect(screen.getByText('Verky Yi')).toBeInTheDocument();
    expect(screen.getByText(/Product engineer building AI-native tools/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/in/verky');
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/verky');
    expect(screen.queryByText(/This page is an agent/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('hero-avatar')).not.toBeInTheDocument();
  });

  it('does not render the old initials avatar', () => {
    render(<Hero name="Verky Yi" />);
    expect(screen.queryByTestId('hero-avatar')).not.toBeInTheDocument();
  });

  it('renders without tagline', () => {
    render(<Hero name="Verky Yi" />);
    expect(screen.getByText('Verky Yi')).toBeInTheDocument();
    expect(screen.queryByText(/This page is an agent/i)).not.toBeInTheDocument();
  });
});
