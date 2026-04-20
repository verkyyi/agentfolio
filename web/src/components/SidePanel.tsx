import { useEffect } from 'react';
import './SidePanel.css';
import { ResumeTheme } from './ResumeTheme';
import { GithubActivity, type ActivityData } from './GithubActivity';
import { JdView } from './JdView';
import type { OpenPanelData } from '../blocks/types';

export interface SidePanelProps {
  panel: OpenPanelData['panel'] | null;
  onClose: () => void;
  slug: string;
  adapted: Record<string, unknown> | null;
  activity?: ActivityData | null;
}

export function SidePanel({ panel, onClose, slug, adapted, activity }: SidePanelProps) {
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, onClose]);

  if (!panel) return null;

  return (
    <>
      <div
        className="side-panel-backdrop"
        data-testid="side-panel-backdrop"
        onClick={onClose}
      />
      <aside
        className="side-panel"
        data-testid="side-panel"
        role="dialog"
        aria-label={`${panel} panel`}
      >
        <div className="side-panel-header">
          <span className="side-panel-title">{panel}</span>
          <button type="button" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="side-panel-body">
          {panel === 'resume' && adapted && (
            <div data-testid="side-panel-resume">
              <ResumeTheme resume={adapted as Record<string, unknown>} />
            </div>
          )}
          {panel === 'activity' && (
            <div data-testid="side-panel-activity">
              <GithubActivity data={activity ?? null} />
            </div>
          )}
          {panel === 'jd' && (
            <div data-testid="side-panel-jd">
              <JdView slug={slug} />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
