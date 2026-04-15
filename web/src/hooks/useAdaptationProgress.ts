import { useEffect, useRef, useState } from 'react';
import type { ApiConfig } from '../utils/githubApi';
import { fetchIssueComments } from '../utils/githubApi';
import type { ProgressComment, ProgressStep } from '../types';

type Status = 'idle' | 'progress' | 'complete' | 'rate_limited' | 'error';

interface State {
  step: ProgressStep | 'waiting';
  status: Status;
  adaptedPath?: string;
  companySlug?: string;
  errorMessage?: string;
}

const POLL_INTERVAL_MS = 5000;

export function useAdaptationProgress(
  issueNumber: number | null,
  config: ApiConfig,
) {
  const [state, setState] = useState<State>({ step: 'waiting', status: 'idle' });
  const terminal = useRef(false);

  useEffect(() => {
    if (issueNumber === null) return;
    terminal.current = false;
    setState({ step: 'waiting', status: 'idle' });

    let cancelled = false;

    async function poll() {
      if (cancelled || terminal.current) return;
      try {
        const comments = await fetchIssueComments(issueNumber!, config);
        if (cancelled) return;

        let latestProgress: ProgressStep | null = null;
        let terminalEvent: ProgressComment | null = null;

        for (const c of comments) {
          let parsed: ProgressComment | null = null;
          try {
            parsed = JSON.parse(c.body) as ProgressComment;
          } catch {
            continue;
          }
          if (parsed.status === 'progress') {
            latestProgress = parsed.step;
          } else {
            terminalEvent = parsed;
          }
        }

        if (terminalEvent) {
          terminal.current = true;
          if (terminalEvent.status === 'complete') {
            setState({
              step: 'committed',
              status: 'complete',
              adaptedPath: terminalEvent.adapted_path,
              companySlug: terminalEvent.company_slug,
            });
          } else if (terminalEvent.status === 'rate_limited') {
            setState((s) => ({ ...s, status: 'rate_limited' }));
          } else if (terminalEvent.status === 'error') {
            const msg = terminalEvent.message;
            setState((s) => ({ ...s, status: 'error', errorMessage: msg }));
          }
          return;
        }

        if (latestProgress) {
          setState({ step: latestProgress, status: 'progress' });
        }
      } catch (e) {
        if (cancelled) return;
        setState((s) => ({ ...s, status: 'error', errorMessage: (e as Error).message }));
        terminal.current = true;
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [issueNumber, config]);

  return state;
}
