import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Block } from '../components/blocks';
import type { BlockFrame } from '../blocks/types';

describe('Block dispatcher', () => {
  it('renders OpenPanelChip for open-panel', () => {
    const block: BlockFrame = { id: 'b1', type: 'open-panel', data: { panel: 'resume' } };
    render(<Block block={block} onOpenPanel={vi.fn()} />);
    expect(screen.getByTestId('open-panel-chip')).toBeInTheDocument();
  });

  it('silently drops unknown types', () => {
    const { container } = render(
      <Block block={{ id: 'b1', type: 'unknown' as never, data: {} as never }} onOpenPanel={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
