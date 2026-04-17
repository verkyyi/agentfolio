import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardSidebar } from '../components/DashboardSidebar';

const items = [
  { slug: 'default', filename: 'default.md' },
  { slug: 'anthropic-fde-nyc', filename: 'anthropic-fde-nyc.md' },
];

describe('DashboardSidebar', () => {
  it('renders all slugs', () => {
    render(<DashboardSidebar items={items} activeSlug="default" onSelect={() => {}} />);
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('anthropic-fde-nyc')).toBeInTheDocument();
  });

  it('highlights the active slug', () => {
    render(<DashboardSidebar items={items} activeSlug="anthropic-fde-nyc" onSelect={() => {}} />);
    const anthropicItem = screen.getByText('anthropic-fde-nyc').closest('button');
    expect(anthropicItem).toHaveAttribute('data-active', 'true');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(<DashboardSidebar items={items} activeSlug="default" onSelect={onSelect} />);
    await userEvent.click(screen.getByText('anthropic-fde-nyc'));
    expect(onSelect).toHaveBeenCalledWith('anthropic-fde-nyc');
  });
});
