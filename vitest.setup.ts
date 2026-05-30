// happy-dom polyfills plus DOM matchers for Vitest. happy-dom provides
// `matchMedia` and `ResizeObserver` natively (jsdom did not), so only the
// `AudioContext` shim is still required. `@testing-library/jest-dom` extends
// Vitest's `expect` with DOM matchers (`toBeVisible`, `toBeInTheDocument`,
// and so on).

import '@testing-library/jest-dom/vitest';

// Stub `AudioContext` so the alarm audio service can be constructed under
// happy-dom. The facade reads `window.AudioContext`, so set it on both
// `window` and `globalThis` (workers and bare references).
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
for (const target of [
  globalThis,
  typeof window === 'undefined' ? null : window
]) {
  if (!target) continue;
  (
    target as unknown as { AudioContext: typeof AudioContextStub }
  ).AudioContext = AudioContextStub;
  (
    target as unknown as { webkitAudioContext: typeof AudioContextStub }
  ).webkitAudioContext = AudioContextStub;
}
