import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Expose `jest` as an alias for `vi` so @testing-library/dom's waitFor
// correctly detects Vitest fake timers (it checks `typeof jest !== 'undefined'`).
(globalThis as Record<string, unknown>).jest = vi;
