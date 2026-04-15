import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatWidget } from '../components/ChatWidget';

describe('ChatWidget', () => {
  it('renders closed by default with open button', () => {
    render(<ChatWidget messages={[]} thinking={false} onAsk={() => {}} enabled />);
    expect(screen.getByRole('button', { name: /ask/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/question/i)).not.toBeInTheDocument();
  });

  it('opens panel on button click', async () => {
    const user = userEvent.setup();
    render(<ChatWidget messages={[]} thinking={false} onAsk={() => {}} enabled />);
    await user.click(screen.getByRole('button', { name: /ask/i }));
    expect(screen.getByPlaceholderText(/question/i)).toBeInTheDocument();
  });

  it('renders messages in order, assistant answers after user questions', () => {
    render(
      <ChatWidget
        messages={[
          { id: '1', role: 'user', text: 'How many years of Python?' },
          { id: '2', role: 'assistant', text: '5 years.' },
        ]}
        thinking={false}
        onAsk={() => {}}
        enabled
        defaultOpen
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain('How many years');
    expect(items[1].textContent).toContain('5 years');
  });

  it('calls onAsk when form is submitted with a non-empty question', async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn();
    render(<ChatWidget messages={[]} thinking={false} onAsk={onAsk} enabled defaultOpen />);
    await user.type(screen.getByPlaceholderText(/question/i), 'Does he know React?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(onAsk).toHaveBeenCalledWith('Does he know React?');
  });

  it('shows thinking indicator when thinking prop is true', () => {
    render(<ChatWidget messages={[]} thinking onAsk={() => {}} enabled defaultOpen />);
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();
  });

  it('shows disabled notice when enabled=false', () => {
    render(<ChatWidget messages={[]} thinking={false} onAsk={() => {}} enabled={false} defaultOpen />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});
