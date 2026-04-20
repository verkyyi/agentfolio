import type { BlockFrame, OpenPanelData } from '../../blocks/types';
import { OpenPanelChip } from './OpenPanelChip';

export interface BlockProps {
  block: BlockFrame;
  onOpenPanel: (panel: OpenPanelData['panel']) => void;
}

export function Block({ block, onOpenPanel }: BlockProps) {
  switch (block.type) {
    case 'open-panel':
      return <OpenPanelChip panel={block.data.panel} onOpen={onOpenPanel} />;
    default:
      // Silent drop for unknown types.
      // Renderers for 'repo-card', 'activity-summary', 'work-highlight' land in Tasks 3.5–3.7.
      return null;
  }
}
