import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Expose `jest` as an alias for `vi` so @testing-library/dom's waitFor
// correctly detects Vitest fake timers (it checks `typeof jest !== 'undefined'`).
(globalThis as Record<string, unknown>).jest = vi;

// JSDOM lacks IntersectionObserver; provide a minimal mock driven by tests.
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  elements: Element[] = [];
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    (globalThis as any).__iobservers = (globalThis as any).__iobservers || [];
    (globalThis as any).__iobservers.push(this);
  }
  observe(el: Element) { this.elements.push(el); }
  unobserve(el: Element) { this.elements = this.elements.filter((e) => e !== el); }
  disconnect() { this.elements = []; }
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds = [];
  trigger(intersecting: boolean) {
    this.callback(
      this.elements.map((target) => ({
        target,
        isIntersecting: intersecting,
        intersectionRatio: intersecting ? 1 : 0,
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
        time: Date.now(),
      })) as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }
}
(globalThis as any).IntersectionObserver = MockIntersectionObserver;

export function triggerIntersection(intersecting: boolean) {
  const list = ((globalThis as any).__iobservers as MockIntersectionObserver[]) || [];
  for (const o of list) o.trigger(intersecting);
}
