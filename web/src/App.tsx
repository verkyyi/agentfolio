import { useCallback, useMemo } from 'react';
import { useVisitorContext } from './hooks/useVisitorContext';
import { useAdaptation } from './hooks/useAdaptation';
import { useBehaviorTracker } from './hooks/useBehaviorTracker';
import { useChat } from './hooks/useChat';
import { AdaptiveResume } from './components/AdaptiveResume';
import { ChatWidget } from './components/ChatWidget';
import { ArchitecturePage } from './components/ArchitecturePage';
import { getApiConfig } from './utils/githubApi';
import type { SectionName } from './types';

export default function App() {
  const { context, error: ctxError } = useVisitorContext();

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

  const { adapted, error: adaptError } = useAdaptation(context?.company ?? null);

  const trackerEnabled = !!apiConfig && !!context && !!adapted;

  const startCtx = useMemo(
    () =>
      adapted && context
        ? {
            company: context.company,
            source: context.source,
            adaptation: adapted.meta?.agentfolio?.company ?? '',
            match_score: adapted.meta?.agentfolio?.match_score?.overall ?? 0,
          }
        : { company: '', source: '', adaptation: '', match_score: 0 },
    [adapted, context],
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

  const onChatQuestion = useCallback(
    (question: string, chatIssueNumber: number) => {
      track({
        type: 'chat_question',
        data: { question, issue_number: chatIssueNumber },
        ts: Date.now(),
      });
    },
    [track],
  );

  const chat = useChat({
    config: apiConfig ?? { pat: '', repo: '' },
    enabled: trackerEnabled,
    onQuestion: onChatQuestion,
  });

  const isArchitecturePath =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/$/, '').endsWith('/how-it-works');

  if (ctxError) return <main>Error loading context: {ctxError.message}</main>;
  if (adaptError) return <main>Error loading adaptation: {adaptError.message}</main>;

  if (isArchitecturePath) {
    return <ArchitecturePage compareSlugs={['cohere', 'openai', 'default']} />;
  }

  if (!context || !adapted) return <main>Loading…</main>;

  return (
    <>
      <AdaptiveResume
        adapted={adapted}
        context={context}
        onCtaClick={onCtaClick}
        onProjectClick={onProjectClick}
        onSectionDwell={trackerEnabled ? onSectionDwell : undefined}
      />
      <ChatWidget
        messages={chat.messages}
        thinking={chat.thinking}
        onAsk={chat.ask}
        enabled={trackerEnabled}
      />
    </>
  );
}
