// Public types for the SignalKStore primitive.
//
// Branded Path, Context, and SourceRef types are re-exported from the
// generated schema module so consumers of this library see exactly one
// brand identity per type, regardless of where they import from.

import type { Context, Path, SourceRef } from '../../types/signalk-generated';

export {
  asContext,
  asPath,
  asSourceRef,
  type Context,
  type Path,
  type PathValueOf,
  type SourceRef
} from '../../types/signalk-generated';

export type FreshnessState = 'fresh' | 'stale' | 'missing';

export interface PathState<T> {
  value: T | undefined;
  lastUpdate: number;
  age: number;
  state: FreshnessState;
  sourceRef?: SourceRef;
}

export interface AgeThresholds {
  staleMs: number;
  missingMs: number;
}

// Signal K WebSocket delta shape, narrowed to the fields the store consumes.
// The wire format admits more, but storing more would be dead weight here.
export interface DeltaValue {
  path: Path;
  value: unknown;
}

export interface DeltaUpdate {
  $source?: SourceRef;
  source?: { label: string; type?: string };
  timestamp?: string;
  values?: DeltaValue[];
}

export interface Delta {
  context?: Context;
  updates: DeltaUpdate[];
}

export const DEFAULT_THRESHOLDS: AgeThresholds = {
  staleMs: 5_000,
  missingMs: 30_000
};
