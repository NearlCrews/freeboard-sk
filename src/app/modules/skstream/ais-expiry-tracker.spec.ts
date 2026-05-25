import { describe, expect, it } from 'vitest';

import { AisExpiryTracker } from './ais-expiry-tracker';

const T0 = 1_700_000_000_000;
const STALE = 6_000;
const MAX = 9_000;

function trackerAt(
  initialNow = T0,
  opts: { staleAge?: number; maxAge?: number } = {}
) {
  let now = initialNow;
  const tracker = new AisExpiryTracker({
    now: () => now,
    staleAge: opts.staleAge ?? STALE,
    maxAge: opts.maxAge ?? MAX
  });
  return {
    tracker,
    advance(ms: number) {
      now += ms;
    },
    set(ms: number) {
      now = ms;
    }
  };
}

describe('AisExpiryTracker: empty state', () => {
  it('starts with size 0', () => {
    const { tracker } = trackerAt();
    expect(tracker.size()).toBe(0);
  });

  it('tick on empty tracker returns no transitions', () => {
    const { tracker, advance } = trackerAt();
    advance(MAX * 10);
    expect(tracker.tick()).toEqual({ stale: [], expired: [] });
  });
});

describe('AisExpiryTracker: touch and tracking', () => {
  it('tracks every touched id', () => {
    const { tracker } = trackerAt();
    tracker.touch(['vessels.a', 'vessels.b', 'vessels.c']);
    expect(tracker.size()).toBe(3);
  });

  it('touch with empty array is a no-op', () => {
    const { tracker } = trackerAt();
    tracker.touch([]);
    expect(tracker.size()).toBe(0);
  });

  it('tick before staleAge reports nothing', () => {
    const { tracker, advance } = trackerAt();
    tracker.touch(['vessels.a']);
    advance(STALE - 1);
    expect(tracker.tick()).toEqual({ stale: [], expired: [] });
    expect(tracker.size()).toBe(1);
  });
});

describe('AisExpiryTracker: stale transition', () => {
  it('emits stale once after staleAge crosses', () => {
    const { tracker, advance } = trackerAt();
    tracker.touch(['vessels.a']);
    advance(STALE + 1);
    expect(tracker.tick()).toEqual({ stale: ['vessels.a'], expired: [] });
    expect(tracker.size()).toBe(1);
  });

  it('does not re-emit stale on subsequent ticks while still stale', () => {
    const { tracker, advance } = trackerAt();
    tracker.touch(['vessels.a']);
    advance(STALE + 1);
    tracker.tick();
    advance(1_000);
    expect(tracker.tick()).toEqual({ stale: [], expired: [] });
  });

  it('touch re-arms staleness, then later expiry reports again', () => {
    const { tracker, advance } = trackerAt();
    tracker.touch(['vessels.a']);
    advance(STALE + 1);
    expect(tracker.tick()).toEqual({ stale: ['vessels.a'], expired: [] });

    // re-touch, advance back into stale window
    tracker.touch(['vessels.a']);
    advance(STALE + 1);
    expect(tracker.tick()).toEqual({ stale: ['vessels.a'], expired: [] });
  });
});

describe('AisExpiryTracker: expiry transition', () => {
  it('emits expired after maxAge crosses and removes from tracker', () => {
    const { tracker, advance } = trackerAt();
    tracker.touch(['vessels.a']);
    advance(MAX + 1);
    expect(tracker.tick()).toEqual({ stale: [], expired: ['vessels.a'] });
    expect(tracker.size()).toBe(0);
  });

  it('expired ids vanish from later ticks', () => {
    const { tracker, advance } = trackerAt();
    tracker.touch(['vessels.a']);
    advance(MAX + 1);
    tracker.tick();
    advance(1_000);
    expect(tracker.tick()).toEqual({ stale: [], expired: [] });
  });

  it('expiry skips the stale emit step (deterministic transition)', () => {
    const { tracker, advance } = trackerAt();
    tracker.touch(['vessels.a']);
    // Jump directly past maxAge without observing the stale window.
    advance(MAX + 1);
    const r = tracker.tick();
    expect(r.expired).toEqual(['vessels.a']);
    expect(r.stale).toEqual([]);
  });

  it('mixed batch: stale ids in one tick, expired ids in a later tick', () => {
    const { tracker, advance } = trackerAt();
    // touch t=0
    tracker.touch(['vessels.first']);
    advance(1_000);
    // touch t=1000
    tracker.touch(['vessels.second']);
    advance(2_000);
    // touch t=3000
    tracker.touch(['vessels.third']);

    // Advance to t=8500: first=8500ms old, second=7500ms old, third=5500ms old.
    advance(STALE - 500);
    const r1 = tracker.tick();
    expect(r1.expired).toEqual([]);
    expect([...r1.stale].sort()).toEqual(['vessels.first', 'vessels.second']);

    // Advance to t=11600: first=11600ms old (expired), second=10600ms (expired),
    // third=8600ms (newly stale).
    advance(MAX - STALE + 100);
    const r2 = tracker.tick();
    expect([...r2.expired].sort()).toEqual(['vessels.first', 'vessels.second']);
    expect(r2.stale).toEqual(['vessels.third']);
  });
});

describe('AisExpiryTracker: explicit removal', () => {
  it('remove drops a single target', () => {
    const { tracker } = trackerAt();
    tracker.touch(['vessels.a', 'vessels.b']);
    tracker.remove('vessels.a');
    expect(tracker.size()).toBe(1);
  });

  it('remove on unknown id is a no-op', () => {
    const { tracker } = trackerAt();
    tracker.touch(['vessels.a']);
    tracker.remove('vessels.unknown');
    expect(tracker.size()).toBe(1);
  });

  it('clear drops every target', () => {
    const { tracker } = trackerAt();
    tracker.touch(['vessels.a', 'vessels.b', 'vessels.c']);
    tracker.clear();
    expect(tracker.size()).toBe(0);
  });
});

describe('AisExpiryTracker: runtime config', () => {
  it('setConfig updates thresholds without dropping targets', () => {
    const { tracker, advance } = trackerAt();
    tracker.touch(['vessels.a']);
    tracker.setConfig({ staleAge: 1_000, maxAge: 2_000 });
    advance(1_500);
    expect(tracker.tick().stale).toEqual(['vessels.a']);
    advance(1_000);
    expect(tracker.tick().expired).toEqual(['vessels.a']);
  });

  it('setConfig ignores invalid values silently', () => {
    const { tracker, advance } = trackerAt();
    tracker.touch(['vessels.a']);
    tracker.setConfig({ staleAge: 0, maxAge: -1 });
    advance(STALE + 1);
    // Original thresholds still apply.
    expect(tracker.tick().stale).toEqual(['vessels.a']);
  });

  it('uses Date.now() when no clock is injected', () => {
    const t = new AisExpiryTracker({ staleAge: STALE, maxAge: MAX });
    t.touch(['vessels.a']);
    // We cannot fast-forward real time, but we can assert the touch was recorded.
    expect(t.size()).toBe(1);
    expect(t.tick()).toEqual({ stale: [], expired: [] });
  });
});
