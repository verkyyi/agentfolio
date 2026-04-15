import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiConfig } from '../utils/githubApi';
import { createChatRequest, fetchChatComments } from '../utils/chatApi';
import type { ChatMessage, ChatComment } from '../types';

const MAX_QUESTIONS_PER_SESSION = 5;

interface Options {
  config: ApiConfig;
  enabled: boolean;
  pollIntervalMs?: number;
  onQuestion?: (question: string, issueNumber: number) => void;
}

export function useChat(options: Options) {
  const { config, enabled, pollIntervalMs = 5000, onQuestion } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const askedCount = useRef(0);

  const ask = useCallback(
    async (question: string): Promise<void> => {
      if (!enabled) throw new Error('chat is disabled');
      if (!question.trim()) return;
      if (askedCount.current >= MAX_QUESTIONS_PER_SESSION) {
        throw new Error(`client rate limit: ${MAX_QUESTIONS_PER_SESSION} questions per session`);
      }
      askedCount.current += 1;
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        text: question,
      };
      setMessages((prev) => [...prev, userMsg]);
      const issueNumber = await createChatRequest(question, config);
      setPending(issueNumber);
      onQuestion?.(question, issueNumber);
    },
    [config, enabled, onQuestion],
  );

  useEffect(() => {
    if (pending === null) return;
    let cancelled = false;
    let terminal = false;

    async function poll() {
      if (cancelled || terminal) return;
      try {
        const comments = await fetchChatComments(pending!, config);
        for (const c of comments) {
          let parsed: ChatComment | null = null;
          try {
            parsed = JSON.parse(c.body) as ChatComment;
          } catch {
            continue;
          }
          if (parsed.status === 'answer') {
            setMessages((prev) => [
              ...prev,
              {
                id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                role: 'assistant',
                text: parsed.status === 'answer' ? parsed.answer : '',
                issueNumber: pending!,
              },
            ]);
            terminal = true;
            setPending(null);
            return;
          }
          if (parsed.status === 'rate_limited') {
            setMessages((prev) => [
              ...prev,
              {
                id: `s-${Date.now()}`,
                role: 'system',
                text: 'Rate limit reached. Try again later.',
              },
            ]);
            terminal = true;
            setPending(null);
            return;
          }
          if (parsed.status === 'error') {
            setMessages((prev) => [
              ...prev,
              {
                id: `s-${Date.now()}`,
                role: 'system',
                text: `Error: ${parsed.status === 'error' ? parsed.message : 'unknown'}`,
              },
            ]);
            terminal = true;
            setPending(null);
            return;
          }
        }
      } catch {
        // retry next tick
      }
    }

    const id = setInterval(poll, pollIntervalMs);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pending, config, pollIntervalMs]);

  return { messages, ask, thinking: pending !== null };
}
