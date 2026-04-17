import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, type ComponentProps } from 'react';
import { ChatStrip } from '../components/ChatStrip';
import { triggerIntersection } from '../test-setup';

function Harness(props: Partial<ComponentProps<typeof ChatStrip>> = {}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div>chat body above</div>
      <div ref={sentinelRef} />
      <ChatStrip
        slug="notion"
        ownerName="Alex Chen"
        proxyUrl="https://proxy.example"
        isStreaming={false}
        liveTail=""
        sentinelRef={sentinelRef}
        onJump={() => {}}
        {...props}
      />
    </>
  );
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ChatStrip — visibility', () => {
  it('renders hidden by default', () => {
    render(<Harness />);
    const root = document.querySelector('.chat-strip') as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root!.hasAttribute('hidden')).toBe(true);
  });

  it('pins when sentinel leaves the viewport after being seen', () => {
    render(<Harness />);
    act(() => { triggerIntersection(true); });
    act(() => { triggerIntersection(false); });
    const root = document.querySelector('.chat-strip') as HTMLElement;
    expect(root.hasAttribute('hidden')).toBe(false);
  });

  it('does NOT pin if the sentinel never intersected (page short)', () => {
    render(<Harness />);
    act(() => { triggerIntersection(false); });
    const root = document.querySelector('.chat-strip') as HTMLElement;
    expect(root.hasAttribute('hidden')).toBe(true);
  });

  it('unpins when sentinel re-enters the viewport', () => {
    render(<Harness />);
    act(() => { triggerIntersection(true); });
    act(() => { triggerIntersection(false); });
    act(() => { triggerIntersection(true); });
    const root = document.querySelector('.chat-strip') as HTMLElement;
    expect(root.hasAttribute('hidden')).toBe(true);
  });

  it('calls onJump when the strip is clicked', async () => {
    const onJump = vi.fn();
    vi.useRealTimers();
    render(<Harness onJump={onJump} />);
    act(() => { triggerIntersection(true); });
    act(() => { triggerIntersection(false); });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /return to chat/i }));
    expect(onJump).toHaveBeenCalledTimes(1);
  });
});
