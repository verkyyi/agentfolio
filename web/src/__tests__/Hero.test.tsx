import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '../components/Hero';

describe('Hero', () => {
  it('renders name and tagline', () => {
    render(
      <Hero
        name="Verky Yi"
        tagline="Product engineer building AI-native tools"
        image="/avatar.png"
      />
    );
    expect(screen.getByText('Verky Yi')).toBeInTheDocument();
    expect(screen.getByText(/Product engineer building AI-native tools/)).toBeInTheDocument();
  });

  it('avatar is absent when no image', () => {
    render(<Hero name="Verky Yi" />);
    expect(screen.queryByTestId('hero-avatar')).not.toBeInTheDocument();
  });

  it('renders without tagline', () => {
    render(<Hero name="Verky Yi" />);
    expect(screen.getByText('Verky Yi')).toBeInTheDocument();
  });
});
