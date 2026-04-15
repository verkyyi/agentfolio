import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { SectionDwellTracker } from '../components/SectionDwellTracker';
import { triggerIntersection } from '../test-setup';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('SectionDwellTracker', () => {
  it('calls onDwell with elapsed ms when section leaves viewport', () => {
    const onDwell = vi.fn();
    render(
      <SectionDwellTracker name="projects" onDwell={onDwell}>
        <div data-testid="inner">content</div>
      </SectionDwellTracker>,
    );

    act(() => {
      triggerIntersection(true);
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      triggerIntersection(false);
    });

    expect(onDwell).toHaveBeenCalledTimes(1);
    const [section, ms] = onDwell.mock.calls[0];
    expect(section).toBe('projects');
    expect(ms).toBeGreaterThanOrEqual(2900);
    expect(ms).toBeLessThanOrEqual(3100);
  });

  it('calls onDwell on unmount if still visible', () => {
    const onDwell = vi.fn();
    const { unmount } = render(
      <SectionDwellTracker name="summary" onDwell={onDwell}>
        <div />
      </SectionDwellTracker>,
    );
    act(() => {
      triggerIntersection(true);
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    unmount();
    expect(onDwell).toHaveBeenCalled();
    const [section, ms] = onDwell.mock.calls[0];
    expect(section).toBe('summary');
    expect(ms).toBeGreaterThanOrEqual(1900);
  });

  it('does not call onDwell if never intersected', () => {
    const onDwell = vi.fn();
    const { unmount } = render(
      <SectionDwellTracker name="skills" onDwell={onDwell}>
        <div />
      </SectionDwellTracker>,
    );
    unmount();
    expect(onDwell).not.toHaveBeenCalled();
  });
});
