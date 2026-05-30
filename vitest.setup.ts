// AudioContext shim so `AppFacade` can construct under happy-dom (which has
// no native AudioContext). jest-dom extends Vitest's `expect` with DOM
// matchers (`toBeVisible`, `toBeInTheDocument`, and so on).

import '@testing-library/jest-dom/vitest';

class AudioContextStub {}
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
