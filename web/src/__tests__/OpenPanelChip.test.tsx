import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OpenPanelChip } from '../components/blocks/OpenPanelChip';

describe('OpenPanelChip', () => {
  it('renders panel label and triggers onOpen on click', async () => {
    const onOpen = vi.fn();
    render(<OpenPanelChip panel="resume" onOpen={onOpen} />);
    const chip = screen.getByTestId('open-panel-chip');
    expect(chip).toHaveTextContent(/resume/i);
    await userEvent.click(chip);
    expect(onOpen).toHaveBeenCalledWith('resume');
  });

  it('renders activity chip', () => {
    render(<OpenPanelChip panel="activity" onOpen={vi.fn()} />);
    expect(screen.getByTestId('open-panel-chip')).toHaveTextContent(/activity/i);
  });
});
