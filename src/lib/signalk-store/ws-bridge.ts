import {
  Observable,
  OperatorFunction,
  SchedulerLike,
  animationFrameScheduler,
  bufferTime,
  filter
} from 'rxjs';

import { Delta } from './types';

export interface BatchedDeltasOptions {
  // Buffer window in ms. Defaults to 16, the one-frame budget at 60 fps.
  bufferMs?: number;
  // Scheduler driving the buffer. Defaults to animationFrameScheduler so
  // flushes align with rAF and the UI repaints in the same tick. Tests
  // should pass a virtual scheduler.
  scheduler?: SchedulerLike;
}

/**
 * Operator that batches an inbound Delta stream into one array per buffer
 * window, then drops empty batches. The store consumes the resulting
 * Delta[] in one synchronous applyDeltas call.
 *
 * Buffering is owned by the WS boundary (this operator), not the store.
 * Co-locating it here keeps the store synchronous and lets the bridge be
 * swapped (e.g., for a debouncing or sampling strategy) without touching
 * the store contract.
 */
export function batchedDeltas(
  options: BatchedDeltasOptions = {}
): OperatorFunction<Delta, Delta[]> {
  const bufferMs = options.bufferMs ?? 16;
  const scheduler = options.scheduler ?? animationFrameScheduler;
  return (source: Observable<Delta>) =>
    source.pipe(
      bufferTime(bufferMs, scheduler),
      filter((batch): batch is Delta[] => batch.length > 0)
    );
}
