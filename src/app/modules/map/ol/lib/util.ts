import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { getPointResolution, fromLonLat } from 'ol/proj';

import { Coordinate } from './models';

export function osmLayer() {
  return new TileLayer({ source: new OSM() });
}

// Point | LineString | MultiLineString
export function fromLonLatArray(coords: Coordinate): Coordinate;
export function fromLonLatArray(coords: Coordinate[]): Coordinate[];
export function fromLonLatArray(coords: Coordinate[][]): Coordinate[][];
export function fromLonLatArray(
  coords: Coordinate | Coordinate[] | Coordinate[][]
): Coordinate | Coordinate[] | Coordinate[][] {
  if (!Array.isArray(coords)) {
    return coords;
  }
  const first = coords[0];
  if (typeof first === 'number') {
    return fromLonLat(coords as Coordinate) as Coordinate;
  } else if (Array.isArray(first)) {
    return (coords as Coordinate[]).map((c) => {
      return fromLonLatArray(c) as Coordinate;
    });
  } else {
    return coords;
  }
}

/** DateLine Crossing:
 * returns true if point is in the zone for dateline transition
 * zoneValue: lower end of 180 to xx range within which Longitude must fall for retun value to be true
 **/
export function inDLCrossingZone(coord: Coordinate, zoneValue = 170): boolean {
  return Math.abs(coord[0] ?? 0) >= zoneValue;
}

// update linestring coords for map display (including dateline crossing)
export function mapifyCoords(
  coords: Coordinate[],
  zoneValue?: number
): Coordinate[] {
  if (coords.length === 0) {
    return coords;
  }
  let dlCrossing = 0;
  const last = coords[0];
  if (!last) {
    return coords;
  }
  const lastLon = last[0] ?? 0;
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    if (!c) continue;
    const lon = c[0] ?? 0;
    if (inDLCrossingZone(c, zoneValue) || inDLCrossingZone(last, zoneValue)) {
      dlCrossing = lastLon > 0 && lon < 0 ? 1 : lastLon < 0 && lon > 0 ? -1 : 0;
      if (dlCrossing === 1) {
        c[0] = lon + 360;
      }
      if (dlCrossing === -1) {
        c[0] = Math.abs(lon) - 360;
      }
    }
  }
  return coords;
}

// ** return adjusted radius to correctly render circle on ground at given position.
export function mapifyRadius(
  radius: number | undefined,
  position: Coordinate | undefined
): number {
  if (typeof radius === 'undefined' || typeof position === 'undefined') {
    return radius ?? 0;
  }
  return radius / getPointResolution('EPSG:3857', 1, fromLonLat(position));
}
