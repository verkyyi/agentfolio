import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '../components/Hero';

describe('Hero', () => {
  it('renders name, tagline, and explainer', () => {
    render(
      <Hero
        name="Verky Yi"
        tagline="Product engineer building AI-native tools"
        image="/avatar.png"
      />
    );
    expect(screen.getByText('Verky Yi')).toBeInTheDocument();
    expect(screen.getByText(/Product engineer building AI-native tools/)).toBeInTheDocument();
    expect(screen.getByText(/This page is an agent/i)).toBeInTheDocument();
  });

  it('falls back to initials when no image', () => {
    render(<Hero name="Verky Yi" />);
    expect(screen.getByTestId('hero-avatar')).toHaveTextContent('VY');
  });

  it('renders without tagline', () => {
    render(<Hero name="Verky Yi" />);
    expect(screen.getByText('Verky Yi')).toBeInTheDocument();
    expect(screen.getByText(/This page is an agent/i)).toBeInTheDocument();
  });
});
