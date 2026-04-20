import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSidePanel } from '../hooks/useSidePanel';

describe('useSidePanel', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useSidePanel());
    expect(result.current.panel).toBeNull();
  });

  it('opens and closes', () => {
    const { result } = renderHook(() => useSidePanel());
    act(() => result.current.open('resume'));
    expect(result.current.panel).toBe('resume');
    act(() => result.current.close());
    expect(result.current.panel).toBeNull();
  });

  it('replaces panel when opened with a different view', () => {
    const { result } = renderHook(() => useSidePanel());
    act(() => result.current.open('resume'));
    act(() => result.current.open('activity'));
    expect(result.current.panel).toBe('activity');
  });
});
