import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

  it('renders a skip button when onSkip is provided', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<SelfIdPrompt onSubmit={() => {}} onSkip={onSkip} />);

    const skipBtn = screen.getByRole('button', { name: /skip/i });
    await user.click(skipBtn);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not render a skip button when onSkip is omitted', () => {
    render(<SelfIdPrompt onSubmit={() => {}} />);
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
  });

  it('wires datalist suggestions for company and role', () => {
    const { container } = render(
      <SelfIdPrompt
        onSubmit={() => {}}
        suggestions={{ companies: ['Cohere', 'OpenAI'], roles: ['FDE'] }}
      />,
    );

    const companyInput = screen.getByLabelText(/company/i) as HTMLInputElement;
    const roleInput = screen.getByLabelText(/role/i) as HTMLInputElement;
    expect(companyInput.getAttribute('list')).toBeTruthy();
    expect(roleInput.getAttribute('list')).toBeTruthy();

    const companyList = container.ownerDocument.getElementById(
      companyInput.getAttribute('list')!,
    );
    expect(companyList).not.toBeNull();
    const options = within(companyList as HTMLElement).getAllByRole('option', {
      hidden: true,
    });
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual([
      'Cohere',
      'OpenAI',
    ]);
  });
});
