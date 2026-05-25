// Phase 0 floor: minimal jsdom polyfills plus DOM matchers for vitest.
// Angular TestBed is initialised by `@angular/build:unit-test` itself; nothing
// is required here for Angular Testing Library. `@testing-library/jest-dom`
// extends vitest's `expect` with the DOM matchers (toBeVisible, toBeInTheDocument,
// and so on).

import '@testing-library/jest-dom/vitest';

// `window.matchMedia` is referenced by Angular Material and CDK breakpoint
// observers; jsdom does not implement it.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    })
  });
}

// `ResizeObserver` is touched by CDK layout primitives and several
// OpenLayers-adjacent components; jsdom does not implement it.
if (
  typeof window !== 'undefined' &&
  typeof window.ResizeObserver === 'undefined'
) {
  class ResizeObserverStub {
    observe(): void {
      /* no-op */
    }
    unobserve(): void {
      /* no-op */
    }
    disconnect(): void {
      /* no-op */
    }
  }
  (
    window as unknown as { ResizeObserver: typeof ResizeObserverStub }
  ).ResizeObserver = ResizeObserverStub;
}

// Carry-over from the prior `vitest-setup.js`: stub `AudioContext` so the alarm
// audio service can be constructed under jsdom.
class AudioContextStub {
  createOscillator(): Record<string, unknown> {
    return {};
  }
  createGain(): { connect: () => void; disconnect: () => void } {
    return {
      connect: () => undefined,
      disconnect: () => undefined
    };
  }
}
(
  globalThis as unknown as { AudioContext: typeof AudioContextStub }
).AudioContext = AudioContextStub;
(
  globalThis as unknown as { webkitAudioContext: typeof AudioContextStub }
).webkitAudioContext = AudioContextStub;
