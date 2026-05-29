import type { Position as ServerApiPosition } from '@signalk/server-api';
import {
  PointFeature,
  LineStringFeature,
  PolygonFeature,
  MultiPolygonFeature
} from './geojson';

/**
 * Lat/lon/altitude position. Re-exports `Position` from
 * `@signalk/server-api` so the codebase stays aligned with the upstream
 * Signal K type and the local GeoJSON tuple `Position` (which lives in
 * ./geojson) keeps its short name. Use SKPosition whenever the value is
 * an object with `latitude`/`longitude`, never the tuple form.
 */
export type SKPosition = ServerApiPosition;

export type Routes = Record<string, RouteResource>;
export type Waypoints = Record<string, WaypointResource>;
export type Regions = Record<string, RegionResource>;
export type Notes = Record<string, NoteResource>;
export type Charts = Record<string, ChartResource>;

export interface RouteResource {
  name?: string | null;
  description?: string | null;
  distance?: number | null;
  feature: LineStringFeature;
}

export interface WaypointResource {
  name?: string | null;
  description?: string | null;
  type?: string | null;
  feature: PointFeature;
}

export interface RegionResource {
  name?: string | null;
  description?: string | null;
  feature: PolygonFeature | MultiPolygonFeature;
}

export interface NoteResource {
  name?: string;
  description?: string;
  href?: string;
  position?: SKPosition;
  mimeType?: string;
  url?: string;
  // ca reports attributes
  group?: string;
  authors?: unknown[];
  properties: Record<string, unknown>;
  timestamp: string;
  source: string;
  // Legacy server fields. resources.service.ts#transformNote migrates these
  // into name (from title), href (from region), and position (from geohash)
  // and deletes them. Newer servers do not emit them.
  title?: string;
  region?: string;
  geohash?: string;
}

export interface ChartResource {
  name?: string;
  identifier?: string;
  description?: string;
  bounds?: number[];
  format?: string;
  minzoom?: number;
  maxzoom?: number;
  type?: string;
  scale?: number;
  url?: string;
  layers?: string[];
  defaultOpacity?: number;
  proxy?: boolean;
  $source?: string;
  style?: string;
  //v1
  tilemapUrl?: string; // replaced by url
  chartLayers?: string[]; // replaced by layers
  serverType?: string; // replaced by type
}

export interface ChartProvider {
  identifier?: string;
  name: string;
  title?: string;
  description: string;
  type: 'tileJSON' | 'WMS' | 'WMTS' | 'mapstyleJSON';
  url: string;
  layers?: string[];
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
  format?: string;
  defaultOpacity?: number;
}
