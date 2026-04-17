import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdentityCard } from '../components/IdentityCard';

const baseBasics = {
  name: 'Verky Yi',
  label: 'Senior Engineer',
  summary: 'Shipped search infra for a 50M-DAU product. Looking for staff IC roles.',
  location: { city: 'New York', region: 'NY' },
  profiles: [
    { network: 'GitHub', url: 'https://github.com/verkyyi' },
    { network: 'LinkedIn', url: 'https://linkedin.com/in/verkyyi' },
  ],
  email: 'verky.yi@gmail.com',
};

describe('IdentityCard', () => {
  it('renders name and role line', () => {
    render(<IdentityCard basics={baseBasics} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/verky yi/i);
    expect(screen.getByText(/Senior Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/New York, NY/)).toBeInTheDocument();
  });

  it('does not render the summary one-liner or adapter-meta label', () => {
    const { container } = render(<IdentityCard basics={baseBasics} />);
    expect(container.querySelector('.idcard-oneliner')).toBeNull();
    expect(container.querySelector('.idcard-label')).toBeNull();
    expect(screen.queryByText(/Shipped search infra/)).not.toBeInTheDocument();
    expect(screen.queryByText(/adapted for/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/~\//)).not.toBeInTheDocument();
  });

  it('renders profile + email links', () => {
    render(<IdentityCard basics={baseBasics} />);
    expect(screen.getByRole('link', { name: /GitHub/i })).toHaveAttribute('href', 'https://github.com/verkyyi');
    expect(screen.getByRole('link', { name: /LinkedIn/i })).toHaveAttribute('href', 'https://linkedin.com/in/verkyyi');
    expect(screen.getByRole('link', { name: /verky\.yi@gmail\.com/ })).toHaveAttribute('href', 'mailto:verky.yi@gmail.com');
  });

  it('skips role line when label is absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, label: undefined }} />);
    expect(container.querySelector('.idcard-role')).toBeNull();
  });

  it('skips profile row when profiles and email are both absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, profiles: [], email: undefined }} />);
    expect(container.querySelector('.idcard-profiles')).toBeNull();
  });
});
