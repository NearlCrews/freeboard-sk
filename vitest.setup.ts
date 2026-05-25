// jsdom polyfills plus DOM matchers for Vitest. Angular TestBed is initialised
// by `@angular/build:unit-test`; nothing is required here for Angular Testing
// Library. `@testing-library/jest-dom` extends Vitest's `expect` with the DOM
// matchers (`toBeVisible`, `toBeInTheDocument`, and so on).

import '@testing-library/jest-dom/vitest';

// Angular Material and CDK breakpoint observers call `window.matchMedia`,
// which jsdom does not implement.
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

// CDK layout primitives and several OpenLayers-adjacent components touch
// `ResizeObserver`, which jsdom does not implement.
if (
  typeof window !== 'undefined' &&
  typeof window.ResizeObserver === 'undefined'
) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (
    window as unknown as { ResizeObserver: typeof ResizeObserverStub }
  ).ResizeObserver = ResizeObserverStub;
}

// Stub `AudioContext` so the alarm audio service can be constructed under jsdom.
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
