import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SidePanel } from '../components/SidePanel';

const baseProps = {
  slug: 'default',
  adapted: { basics: { name: 'Verky Yi' }, work: [] } as unknown as Record<string, unknown>,
  activity: null,
};

beforeEach(() => {
  // JdView self-fetches; stub fetch so it doesn't spam failures.
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 } as Response)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SidePanel', () => {
  it('renders nothing when panel is null', () => {
    const { container } = render(<SidePanel panel={null} onClose={vi.fn()} {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders resume view with close button', async () => {
    const onClose = vi.fn();
    render(<SidePanel panel="resume" onClose={onClose} {...baseProps} />);
    expect(screen.getByTestId('side-panel')).toBeInTheDocument();
    expect(screen.getByTestId('side-panel-resume')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders activity view', () => {
    render(<SidePanel panel="activity" onClose={vi.fn()} {...baseProps} />);
    expect(screen.getByTestId('side-panel-activity')).toBeInTheDocument();
  });

  it('renders jd view', () => {
    render(<SidePanel panel="jd" onClose={vi.fn()} {...baseProps} />);
    expect(screen.getByTestId('side-panel-jd')).toBeInTheDocument();
  });

  it('closes on backdrop click', async () => {
    const onClose = vi.fn();
    render(<SidePanel panel="resume" onClose={onClose} {...baseProps} />);
    await userEvent.click(screen.getByTestId('side-panel-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<SidePanel panel="resume" onClose={onClose} {...baseProps} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
