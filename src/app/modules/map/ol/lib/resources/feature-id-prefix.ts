import type { SKResourceType } from 'src/app/modules/skresources/resources.service';

/**
 * OpenLayers feature ids set by the per-resource layers follow the pattern
 * `<singular-prefix>.<resourceId>` (e.g. `note.<uuid>`, `route.<id>`). The
 * singular prefix is what the layer-*.component.ts files call `setId` with,
 * and what the featurelist click handler in fb-map parses back out to
 * resolve the originating resource.
 *
 * Keeping the singular and plural forms in one file means the next OL
 * feature type is a single edit, not five.
 */
export const FEATURE_ID_PREFIX = {
  notes: 'note',
  routes: 'route',
  waypoints: 'waypoint',
  regions: 'region',
  tracks: 'track'
} as const satisfies Record<Exclude<SKResourceType, 'charts'>, string>;

export const FEATURE_ID_PREFIX_TO_RESOURCE_TYPE: Readonly<
  Record<string, SKResourceType>
> = Object.freeze({
  note: 'notes',
  route: 'routes',
  waypoint: 'waypoints',
  region: 'regions',
  track: 'tracks'
});
