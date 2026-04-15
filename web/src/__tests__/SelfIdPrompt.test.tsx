import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelfIdPrompt } from '../components/SelfIdPrompt';

describe('SelfIdPrompt', () => {
  it('renders company and role fields and a submit button', () => {
    render(<SelfIdPrompt onSubmit={() => {}} />);
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show me/i })).toBeInTheDocument();
  });

  it('calls onSubmit with trimmed values when both fields are filled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SelfIdPrompt onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/company/i), '  Stripe  ');
    await user.type(screen.getByLabelText(/role/i), ' FDE ');
    await user.click(screen.getByRole('button', { name: /show me/i }));

    expect(onSubmit).toHaveBeenCalledWith({ company: 'Stripe', role: 'FDE' });
  });

  it('does not call onSubmit when either field is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SelfIdPrompt onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/company/i), 'Stripe');
    await user.click(screen.getByRole('button', { name: /show me/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
