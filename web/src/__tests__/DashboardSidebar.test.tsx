import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardSidebar } from '../components/DashboardSidebar';

const items = [
  { slug: 'default', filename: 'default.md' },
  { slug: 'notion', filename: 'notion.md' },
];

describe('DashboardSidebar', () => {
  it('renders all slugs', () => {
    render(<DashboardSidebar items={items} activeSlug="default" onSelect={() => {}} />);
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('notion')).toBeInTheDocument();
  });

  it('highlights the active slug', () => {
    render(<DashboardSidebar items={items} activeSlug="notion" onSelect={() => {}} />);
    const notionItem = screen.getByText('notion').closest('button');
    expect(notionItem).toHaveAttribute('data-active', 'true');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(<DashboardSidebar items={items} activeSlug="default" onSelect={onSelect} />);
    await userEvent.click(screen.getByText('notion'));
    expect(onSelect).toHaveBeenCalledWith('notion');
  });
});
