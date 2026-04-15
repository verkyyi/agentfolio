import { useState } from 'react';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  thinking: boolean;
  onAsk: (q: string) => void;
  enabled: boolean;
  defaultOpen?: boolean;
}

export function ChatWidget({ messages, thinking, onAsk, enabled, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q) return;
    onAsk(q);
    setDraft('');
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label="Ask about this resume">
        Ask about this resume
      </button>
    );
  }

  return (
    <section aria-label="Chat">
      <header>
        <strong>Ask about this resume</strong>
        <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
      </header>
      {!enabled && <p>Chat is unavailable — PAT not configured.</p>}
      <ul>
        {messages.map((m) => (
          <li key={m.id} data-role={m.role}>
            <em>{m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'System'}:</em>{' '}
            {m.text}
          </li>
        ))}
        {thinking && <li data-role="assistant"><em>thinking…</em></li>}
      </ul>
      <form onSubmit={submit}>
        <input
          placeholder="Your question"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!enabled || thinking}
        />
        <button type="submit" disabled={!enabled || thinking || !draft.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
