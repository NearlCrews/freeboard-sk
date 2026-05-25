import { TestScheduler } from 'rxjs/testing';
import { describe, expect, it } from 'vitest';

import {
  Delta,
  Path,
  SignalKStore,
  asPath,
  asSourceRef,
  batchedDeltas
} from './index';

const NAV_SOG: Path = asPath('navigation.speedOverGround');
const NAV_COG: Path = asPath('navigation.courseOverGround');
const ENV_WIND: Path = asPath('environment.wind.angleApparent');

const T0 = 1_700_000_000_000;

function deltaAt(
  timestamp: number,
  values: readonly { path: Path; value: unknown }[],
  sourceRef = asSourceRef('test.source')
): Delta {
  return {
    updates: [
      {
        $source: sourceRef,
        timestamp: new Date(timestamp).toISOString(),
        values: [...values]
      }
    ]
  };
}

function makeStore(initialNow = T0) {
  let now = initialNow;
  const store = new SignalKStore({ now: () => now });
  return {
    store,
    advance(ms: number) {
      now += ms;
    }
  };
}

describe('SignalKStore: lazy allocation', () => {
  it('does not allocate any signal before select or applyDeltas', () => {
    const { store } = makeStore();
    expect(store.has(NAV_SOG)).toBe(false);
    expect(store.has(NAV_COG)).toBe(false);
  });

  it('allocates a signal on first select and returns missing state', () => {
    const { store } = makeStore();
    const sel = store.select(NAV_SOG);
    expect(store.has(NAV_SOG)).toBe(true);
    const state = sel();
    expect(state.value).toBeUndefined();
    expect(state.lastUpdate).toBe(0);
    expect(state.state).toBe('missing');
    expect(state.age).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns the same Signal reference across repeated select calls', () => {
    const { store } = makeStore();
    const a = store.select(NAV_SOG);
    const b = store.select(NAV_SOG);
    expect(a).toBe(b);
  });

  it('allocates a signal for an unseen path arriving via applyDeltas', () => {
    const { store } = makeStore();
    store.applyDeltas([deltaAt(T0, [{ path: NAV_SOG, value: 5.4 }])]);
    expect(store.has(NAV_SOG)).toBe(true);
    expect(store.select(NAV_SOG)().value).toBe(5.4);
  });
});

describe('SignalKStore: batched applyDeltas', () => {
  it('flushes multiple deltas in one synchronous pass', () => {
    const { store } = makeStore();
    const sog = store.select(NAV_SOG);
    const cog = store.select(NAV_COG);
    const wind = store.select(ENV_WIND);

    store.applyDeltas([
      deltaAt(T0, [{ path: NAV_SOG, value: 1 }]),
      deltaAt(T0, [
        { path: NAV_COG, value: 90 },
        { path: ENV_WIND, value: 0.3 }
      ])
    ]);

    expect(sog().value).toBe(1);
    expect(cog().value).toBe(90);
    expect(wind().value).toBe(0.3);
  });

  it('keeps last-write-wins per path within a single batch', () => {
    const { store } = makeStore();
    const sog = store.select(NAV_SOG);
    store.applyDeltas([
      deltaAt(T0, [{ path: NAV_SOG, value: 1 }]),
      deltaAt(T0 + 1, [{ path: NAV_SOG, value: 2 }]),
      deltaAt(T0 + 2, [{ path: NAV_SOG, value: 3 }])
    ]);
    expect(sog().value).toBe(3);
    expect(sog().lastUpdate).toBe(T0 + 2);
  });

  it('is a no-op when the batch is empty or carries no values', () => {
    const { store } = makeStore();
    const sel = store.select(NAV_SOG);
    const before = sel();
    store.applyDeltas([]);
    store.applyDeltas([{ updates: [{ values: [] }] }]);
    // Omit `values` entirely rather than passing undefined: under
    // exactOptionalPropertyTypes, `values?: DeltaValue[]` rejects explicit
    // undefined. The store treats missing and missing-as-undefined the same.
    store.applyDeltas([{ updates: [{}] }]);
    expect(sel()).toEqual(before);
  });

  it('captures sourceRef from the delta update', () => {
    const { store } = makeStore();
    const src = asSourceRef('gps.n2k.0');
    store.applyDeltas([
      {
        updates: [
          {
            $source: src,
            timestamp: new Date(T0).toISOString(),
            values: [{ path: NAV_SOG, value: 4.2 }]
          }
        ]
      }
    ]);
    expect(store.select(NAV_SOG)().sourceRef).toBe(src);
  });
});

describe('SignalKStore: age and freshness transitions', () => {
  it('reports age = now - lastUpdate', () => {
    const ctx = makeStore();
    ctx.store.applyDeltas([deltaAt(T0, [{ path: NAV_SOG, value: 5 }])]);
    ctx.advance(1_500);
    ctx.store.pulse();
    expect(ctx.store.select(NAV_SOG)().age).toBe(1_500);
  });

  it('transitions fresh -> stale -> missing as time advances past thresholds', () => {
    const ctx = makeStore();
    ctx.store.applyDeltas([deltaAt(T0, [{ path: NAV_SOG, value: 5 }])]);
    const sel = ctx.store.select(NAV_SOG);

    ctx.advance(1_000);
    ctx.store.pulse();
    expect(sel().state).toBe('fresh');

    ctx.advance(5_000); // total 6 s, past 5 s stale threshold
    ctx.store.pulse();
    expect(sel().state).toBe('stale');

    ctx.advance(25_000); // total 31 s, past 30 s missing threshold
    ctx.store.pulse();
    expect(sel().state).toBe('missing');
  });

  it('honours per-path threshold overrides', () => {
    let now = T0;
    const store = new SignalKStore({
      now: () => now,
      thresholdsFor: (p) =>
        p === NAV_SOG ? { staleMs: 100, missingMs: 500 } : undefined
    });
    store.applyDeltas([
      deltaAt(T0, [
        { path: NAV_SOG, value: 5 },
        { path: NAV_COG, value: 90 }
      ])
    ]);
    now += 200;
    store.pulse();
    expect(store.select(NAV_SOG)().state).toBe('stale');
    expect(store.select(NAV_COG)().state).toBe('fresh');
  });

  it('clamps negative age to zero when timestamps run ahead of the clock', () => {
    const ctx = makeStore();
    ctx.store.applyDeltas([deltaAt(T0 + 1_000, [{ path: NAV_SOG, value: 5 }])]);
    expect(ctx.store.select(NAV_SOG)().age).toBe(0);
  });
});

describe('batchedDeltas operator', () => {
  it('coalesces deltas inside one buffer window into a single emission', () => {
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
    scheduler.run(({ cold, expectObservable }) => {
      const d1 = deltaAt(T0, [{ path: NAV_SOG, value: 1 }]);
      const d2 = deltaAt(T0, [{ path: NAV_COG, value: 2 }]);
      // a at frame 0, b at frame 1, source completes at frame 20 (1 + 1 + 18).
      // Buffer flushes at frame 16 with [a, b], a fresh empty buffer opens,
      // then source completion at frame 20 emits an empty buffer that filter drops.
      const source = cold<Delta>('ab 18ms |', { a: d1, b: d2 });
      expectObservable(source.pipe(batchedDeltas({ scheduler }))).toBe(
        '16ms x 3ms |',
        { x: [d1, d2] }
      );
    });
  });

  it('drops empty windows so the store is never called with []', () => {
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
    scheduler.run(({ cold, expectObservable }) => {
      const d1 = deltaAt(T0, [{ path: NAV_SOG, value: 1 }]);
      // First 16ms window is empty. a arrives at 20ms then source completes,
      // so the buffer holding [a] emits on completion.
      const source = cold<Delta>('20ms (a|)', { a: d1 });
      expectObservable(source.pipe(batchedDeltas({ scheduler }))).toBe(
        '20ms (x|)',
        { x: [d1] }
      );
    });
  });

  it('feeds batched output into applyDeltas end to end', () => {
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
    const ctx = makeStore();
    scheduler.run(({ cold }) => {
      const d1 = deltaAt(T0, [{ path: NAV_SOG, value: 7 }]);
      const d2 = deltaAt(T0, [{ path: NAV_COG, value: 45 }]);
      cold<Delta>('ab 18ms |', { a: d1, b: d2 })
        .pipe(batchedDeltas({ scheduler }))
        .subscribe((batch) => ctx.store.applyDeltas(batch));
    });
    expect(ctx.store.select(NAV_SOG)().value).toBe(7);
    expect(ctx.store.select(NAV_COG)().value).toBe(45);
  });
});
