import { useState } from 'react';
import './ChatWidget.css';

export interface ChatWidgetProps {
  slug: string;
  target: string;
}

export function ChatWidget({ slug, target }: ChatWidgetProps) {
  const proxyUrl = import.meta.env.VITE_CHAT_PROXY_URL as string | undefined;
  const [open, setOpen] = useState(false);
  if (!proxyUrl) return null;

  return (
    <>
      <button
        className="chat-fab"
        aria-label="Chat with me"
        onClick={() => setOpen((v) => !v)}
      >
        Chat
      </button>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat">
          <div className="chat-header">
            <span>Chat</span>
            <button aria-label="Close" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-messages" data-slug={slug}>
            <div className="chat-msg assistant" data-testid="chat-greeting">
              Hey — I see you're looking at the {target} adaptation. Ask me anything about my work and I'll keep it relevant to that role.
            </div>
          </div>
          <form className="chat-input" onSubmit={(e) => e.preventDefault()}>
            <input aria-label="Message" placeholder="Ask a question…" />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </>
  );
}
