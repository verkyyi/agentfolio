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
  it('renders name, role line, and one-liner', () => {
    render(<IdentityCard basics={baseBasics} slug="default" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/verky yi/i);
    expect(screen.getByText(/Senior Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/New York, NY/)).toBeInTheDocument();
    expect(screen.getByText(/Shipped search infra/)).toBeInTheDocument();
  });

  it('renders the slug label', () => {
    render(<IdentityCard basics={baseBasics} slug="notion" />);
    expect(screen.getByText(/adapted for notion/i)).toBeInTheDocument();
  });

  it('renders profile + email links', () => {
    render(<IdentityCard basics={baseBasics} slug="default" />);
    expect(screen.getByRole('link', { name: /GitHub/i })).toHaveAttribute('href', 'https://github.com/verkyyi');
    expect(screen.getByRole('link', { name: /LinkedIn/i })).toHaveAttribute('href', 'https://linkedin.com/in/verkyyi');
    expect(screen.getByRole('link', { name: /verky\.yi@gmail\.com/ })).toHaveAttribute('href', 'mailto:verky.yi@gmail.com');
  });

  it('truncates summary to the first sentence for the one-liner', () => {
    const basics = {
      ...baseBasics,
      summary: 'First sentence here. Second sentence should not appear in the card one-liner. Third also excluded.',
    };
    render(<IdentityCard basics={basics} slug="default" />);
    expect(screen.getByText(/First sentence here\./)).toBeInTheDocument();
    expect(screen.queryByText(/Second sentence should not appear/)).not.toBeInTheDocument();
  });

  it('skips role line when label is absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, label: undefined }} slug="default" />);
    expect(container.querySelector('.idcard-role')).toBeNull();
  });

  it('skips one-liner when summary is absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, summary: undefined }} slug="default" />);
    expect(container.querySelector('.idcard-oneliner')).toBeNull();
  });

  it('skips profile row when profiles and email are both absent', () => {
    const { container } = render(<IdentityCard basics={{ ...baseBasics, profiles: [], email: undefined }} slug="default" />);
    expect(container.querySelector('.idcard-profiles')).toBeNull();
  });

  it('extracts ~/handle from the GitHub profile url', () => {
    render(<IdentityCard basics={baseBasics} slug="default" />);
    expect(screen.getByText(/~\/verkyyi/)).toBeInTheDocument();
    expect(screen.getByText(/adapted for default/)).toBeInTheDocument();
  });

  it('falls back to slug when no GitHub profile exists', () => {
    const basics = { ...baseBasics, profiles: [{ network: 'LinkedIn', url: 'https://linkedin.com/in/foo' }] };
    render(<IdentityCard basics={basics} slug="acme" />);
    expect(screen.getByText(/~\/acme/)).toBeInTheDocument();
  });

  it('handles abbreviations like "U.S." without splitting on them', () => {
    const basics = { ...baseBasics, summary: 'U.S. citizen with a long résumé. Looking for staff roles.' };
    render(<IdentityCard basics={basics} slug="default" />);
    expect(screen.getByText(/U\.S\. citizen with a long résumé\./)).toBeInTheDocument();
    expect(screen.queryByText(/Looking for staff roles/)).not.toBeInTheDocument();
  });

  it('returns the whole summary when there is no second sentence', () => {
    const basics = { ...baseBasics, summary: 'Just one sentence without a real boundary' };
    render(<IdentityCard basics={basics} slug="default" />);
    expect(screen.getByText(/Just one sentence without a real boundary/)).toBeInTheDocument();
  });
});
