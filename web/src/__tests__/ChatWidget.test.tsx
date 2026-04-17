import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatWidget } from '../components/ChatWidget';

afterEach(() => {
  vi.unstubAllEnvs();
  sessionStorage.clear();
});

describe('ChatWidget — mount condition', () => {
  it('renders nothing when VITE_CHAT_PROXY_URL is empty', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', '');
    const { container } = render(<ChatWidget slug="notion" target="Notion" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the floating button when env is set', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatWidget slug="notion" target="Notion" />);
    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument();
  });

  it('opens the panel when the button is clicked', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const user = userEvent.setup();
    render(<ChatWidget slug="notion" target="Notion · Eng" />);
    await user.click(screen.getByRole('button', { name: /chat/i }));
    expect(screen.getByText(/Notion · Eng/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows a static greeting referencing the target when opened', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const user = userEvent.setup();
    render(<ChatWidget slug="notion" target="Notion · Eng" />);
    await user.click(screen.getByRole('button', { name: /chat/i }));
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting.textContent).toMatch(/Notion · Eng/);
  });
});
