import type { BlockFrame, OpenPanelData } from '../../blocks/types';
import { ActivitySummary } from './ActivitySummary';
import { OpenPanelChip } from './OpenPanelChip';
import { RepoCard } from './RepoCard';
import { WorkHighlight } from './WorkHighlight';

export interface BlockProps {
  block: BlockFrame;
  onOpenPanel: (panel: OpenPanelData['panel']) => void;
}

export function Block({ block, onOpenPanel }: BlockProps) {
  switch (block.type) {
    case 'open-panel':
      return <OpenPanelChip panel={block.data.panel} onOpen={onOpenPanel} />;
    case 'repo-card':
      return <RepoCard data={block.data} />;
    case 'activity-summary':
      return <ActivitySummary data={block.data} />;
    case 'work-highlight':
      return <WorkHighlight data={block.data} />;
    default:
      // Silent drop for unknown types.
      return null;
  }
}
