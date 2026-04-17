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

describe('ChatStrip — hints fetch', () => {
  it('fetches /hints once, 400ms after first pin, and renders the first hint', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(
      JSON.stringify({ hints: ['Why this fit?', 'Walk me through Acme'] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    render(<Harness />);
    act(() => { triggerIntersection(true); });
    act(() => { triggerIntersection(false); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error('fetch not called');
    expect(call[0]).toBe('https://proxy.example/hints');
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body as string);
    expect(body.slug).toBe('notion');
  });

  it('does not fetch if user scrolled back up before debounce fires', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<Harness />);
    act(() => { triggerIntersection(true); });
    act(() => { triggerIntersection(false); });
    act(() => { vi.advanceTimersByTime(200); });
    act(() => { triggerIntersection(true); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('on 404, disables hints for session', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Harness />);
    act(() => { triggerIntersection(true); });
    act(() => { triggerIntersection(false); });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    act(() => { triggerIntersection(true); });
    act(() => { triggerIntersection(false); });
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('ChatStrip — drip', () => {
  async function tick(ms: number) {
    await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  }

  it('types hints char-by-char and swaps to the next after a hold + erase', async () => {
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ hints: ['abc', 'xy'] }),
      { status: 200 },
    ));
    vi.stubGlobal('fetch', fetchMock);
    render(<Harness />);
    act(() => { triggerIntersection(true); });
    act(() => { triggerIntersection(false); });
    await tick(500);

    const hint = () => (document.querySelector('.chat-strip__hint') as HTMLElement).textContent;

    // Type "abc" (one char per 40ms tick — React batches so each tick needs its own flush)
    for (let i = 0; i < 3; i++) await tick(40);
    expect(hint()).toBe('abc');
    // typing → holding (0ms); holding → erasing (4000ms)
    await tick(1);
    await tick(4000);
    // Erase 3 chars at 30ms each
    for (let i = 0; i < 3; i++) await tick(30);
    expect(hint()).toBe('');
    // erasing → next typing (0ms)
    await tick(1);
    // Type "xy"
    for (let i = 0; i < 2; i++) await tick(40);
    expect(hint()).toBe('xy');
  });

  it('pauses drip during streaming and shows liveTail instead', () => {
    render(<Harness isStreaming={true} liveTail="…reply tail" />);
    act(() => { triggerIntersection(true); });
    act(() => { triggerIntersection(false); });
    expect((document.querySelector('.chat-strip__hint') as HTMLElement).textContent).toBe('…reply tail');
  });
});
