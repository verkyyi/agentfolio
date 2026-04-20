import { useCallback, useState } from 'react';
import type { OpenPanelData } from '../blocks/types';

type Panel = OpenPanelData['panel'];

export interface UseSidePanel {
  panel: Panel | null;
  open: (panel: Panel) => void;
  close: () => void;
}

export function useSidePanel(): UseSidePanel {
  const [panel, setPanel] = useState<Panel | null>(null);
  const open = useCallback((p: Panel) => setPanel(p), []);
  const close = useCallback(() => setPanel(null), []);
  return { panel, open, close };
}
