import type { OpenPanelData } from '../../blocks/types';

const LABEL: Record<OpenPanelData['panel'], string> = {
  resume: 'Resume',
  activity: 'Activity',
  jd: 'Job description',
};

export interface OpenPanelChipProps {
  panel: OpenPanelData['panel'];
  onOpen: (panel: OpenPanelData['panel']) => void;
}

export function OpenPanelChip({ panel, onOpen }: OpenPanelChipProps) {
  return (
    <button
      type="button"
      className="block-open-panel-chip"
      data-testid="open-panel-chip"
      onClick={() => onOpen(panel)}
    >
      {LABEL[panel]}
    </button>
  );
}
