import { useCallback, useEffect, useMemo, useState } from 'react';
import { useVisitorContext } from './hooks/useVisitorContext';
import { useAdaptation } from './hooks/useAdaptation';
import { useAdaptationProgress } from './hooks/useAdaptationProgress';
import { useBehaviorTracker } from './hooks/useBehaviorTracker';
import { AdaptiveResume } from './components/AdaptiveResume';
import { SelfIdPrompt } from './components/SelfIdPrompt';
import { AdaptationProgress } from './components/AdaptationProgress';
import {
  createAdaptRequest,
  findOpenRequestForCompany,
  getApiConfig,
} from './utils/githubApi';
import type { AdaptedResume, SectionName, VisitorContext } from './types';

interface SelfId {
  company: string;
  role: string;
}

function normalize(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, '-');
}

export default function App() {
  const { context: urlContext, error: ctxError } = useVisitorContext();
  const [selfId, setSelfId] = useState<SelfId | null>(null);
  const [issueNumber, setIssueNumber] = useState<number | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const apiConfig = useMemo(() => {
    try {
      return getApiConfig({
        pat: import.meta.env.VITE_GITHUB_PAT,
        repo: import.meta.env.VITE_GITHUB_REPO,
      });
    } catch {
      return null;
    }
  }, []);

  const effectiveContext: VisitorContext | null = selfId
    ? { source: 'self-id', company: normalize(selfId.company), role: selfId.role }
    : urlContext;

  const needsSelfIdForm =
    urlContext !== null && urlContext.source === 'default' && selfId === null;

  const { adapted, base, error: adaptError, needsLiveGeneration } = useAdaptation(
    needsSelfIdForm ? null : effectiveContext?.company ?? null,
  );

  useEffect(() => {
    if (!needsLiveGeneration || !selfId || issueNumber !== null || !apiConfig) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await findOpenRequestForCompany(selfId.company, apiConfig);
        if (cancelled) return;
        if (existing !== null) {
          setIssueNumber(existing);
          return;
        }
        const n = await createAdaptRequest(selfId.company, selfId.role, apiConfig);
        if (cancelled) return;
        setIssueNumber(n);
      } catch (e) {
        if (cancelled) return;
        setRequestError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsLiveGeneration, selfId, issueNumber, apiConfig]);

  const progress = useAdaptationProgress(
    issueNumber,
    apiConfig ?? { pat: '', repo: '' },
  );

  const [liveAdapted, setLiveAdapted] = useState<AdaptedResume | null>(null);
  useEffect(() => {
    if (progress.status !== 'complete' || !progress.adaptedPath) return;
    let cancelled = false;
    (async () => {
      const url = `${import.meta.env.BASE_URL}${progress.adaptedPath}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as AdaptedResume;
      if (cancelled) return;
      setLiveAdapted(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [progress.status, progress.adaptedPath]);

  const shownAdapted = liveAdapted ?? adapted;

  const trackerEnabled =
    !!apiConfig && !!effectiveContext && !!shownAdapted && !needsSelfIdForm;

  const startCtx = useMemo(
    () =>
      shownAdapted && effectiveContext
        ? {
            company: effectiveContext.company,
            source: effectiveContext.source,
            adaptation: shownAdapted.company,
            match_score: shownAdapted.match_score.overall,
          }
        : { company: '', source: '', adaptation: '', match_score: 0 },
    [shownAdapted, effectiveContext],
  );

  const { track } = useBehaviorTracker({
    config: apiConfig ?? { pat: '', repo: '' },
    startCtx,
    enabled: trackerEnabled,
  });

  const onCtaClick = useCallback(
    (target: 'email' | 'linkedin' | 'github') => {
      track({ type: 'cta_click', data: { target }, ts: Date.now() });
    },
    [track],
  );
  const onProjectClick = useCallback(
    (projectId: string, link: 'url' | 'github') => {
      track({ type: 'project_click', data: { project_id: projectId, link }, ts: Date.now() });
    },
    [track],
  );
  const onSectionDwell = useCallback(
    (section: SectionName, ms: number) => {
      track({ type: 'section_dwell', data: { section, ms }, ts: Date.now() });
    },
    [track],
  );

  if (ctxError) return <main>Error loading context: {ctxError.message}</main>;
  if (adaptError) return <main>Error loading adaptation: {adaptError.message}</main>;

  if (needsSelfIdForm) {
    return (
      <main>
        <SelfIdPrompt onSubmit={setSelfId} />
      </main>
    );
  }

  if (!effectiveContext || !shownAdapted || !base) return <main>Loading…</main>;

  return (
    <>
      {needsLiveGeneration && issueNumber !== null && progress.status !== 'complete' && (
        <AdaptationProgress
          step={progress.step}
          status={progress.status}
          errorMessage={progress.errorMessage}
        />
      )}
      {requestError && <p role="alert">Request error: {requestError}</p>}
      <AdaptiveResume
        base={base}
        adapted={shownAdapted}
        context={effectiveContext}
        onCtaClick={onCtaClick}
        onProjectClick={onProjectClick}
        onSectionDwell={trackerEnabled ? onSectionDwell : undefined}
      />
    </>
  );
}
