/*******************************
    GeoUtils Class Module
*******************************/
import { Convert } from './convert';
import { getDistance, offset } from 'ol/sphere';
import { containsCoordinate } from 'ol/extent';
import type { Position } from '../types';

export type Extent = [number, number, number, number]; // coords [swlon,swlat,nelon,nelat] of a bounding box

export class GeoUtils {
  private static readonly R = 6_371_000; // mean earth radius in metres

  /**
   * Rhumb-line destination: given a start [lon,lat], bearing (radians),
   * and distance (metres), return the destination [lon,lat].
   */
  static rhumbDestination(
    origin: Position,
    bearingRad: number,
    distMeters: number
  ): Position {
    const R = GeoUtils.R;
    const δ = distMeters / R;
    const φ1 = (origin[1] * Math.PI) / 180;
    const λ1 = (origin[0] * Math.PI) / 180;
    const θ = bearingRad;

    const Δφ = δ * Math.cos(θ);
    let φ2 = φ1 + Δφ;
    let δ_eff = δ;

    // Clamp to ±89° to avoid the Mercator/pole singularity (log(tan(π/2)) → ∞).
    // Scale the effective distance proportionally so that tan(θ)·Δψ — the rhumb
    // bearing identity — produces the correct longitude offset and the line points
    // in the right direction on the Mercator map.
    const MAX_φ = (89 * Math.PI) / 180;
    if (φ2 > MAX_φ && φ1 < MAX_φ) {
      δ_eff = (δ * (MAX_φ - φ1)) / Δφ;
      φ2 = MAX_φ;
    } else if (φ2 < -MAX_φ && φ1 > -MAX_φ) {
      δ_eff = (δ * (-MAX_φ - φ1)) / Δφ;
      φ2 = -MAX_φ;
    }

    const Δψ = Math.log(
      Math.tan(Math.PI / 4 + φ2 / 2) / Math.tan(Math.PI / 4 + φ1 / 2)
    );
    const q = Math.abs(Δψ) > 1e-12 ? (φ2 - φ1) / Δψ : Math.cos(φ1);
    const Δλ = (δ_eff * Math.sin(θ)) / q;

    return [((λ1 + Δλ) * 180) / Math.PI, (φ2 * 180) / Math.PI];
  }

  /**
   * Great Circle desitnation coordinate
   * @param src - origin position
   * @param bearing - angle in radians
   * @param distance - distance in meters
   * @returns
   */
  static destCoordinate(
    src: Position,
    bearing: number,
    distance: number
  ): Position {
    // ol/sphere.offset uses WGS84 mean radius (6371008.8 m) vs. geolib's
    // legacy 6378137 m. The ~0.11% difference is sub-meter for typical
    // navigation ranges and well below display precision.
    const pt = offset(src, distance, bearing);
    return [pt[0], pt[1]];
  }

  /** Calculate the great circle distance between two points in metres **/
  static distanceTo(srcpt: Position, destpt: Position) {
    // ol/sphere.getDistance (haversine, mean WGS84 radius) replaces geolib's
    // spherical-cosines + equatorial radius. Differences are ~0.11%
    // (sub-meter at typical navigation ranges), acceptable for display.
    return getDistance(srcpt, destpt);
  }

  /** Calculate the length of an array of points in metres **/
  static routeLength(points: Position[]) {
    let total = 0;
    for (let i = 1; i < points.length; ++i) {
      total += getDistance(points[i - 1], points[i]);
    }
    return total;
  }

  /** Calculate distance bearing between each point in an array
   * @param points Array of points
   * @param vessel Vessel position
   * @returns Array of objects (same length as points) containing bearing & distance.
   */
  static routeLegs(
    points: Position[],
    vessel?: Position
  ): { bearing: number; distance: number }[] {
    if (points.length < 2) {
      return [];
    }
    const legs = [];
    if (vessel) {
      legs.push({
        bearing: GeoUtils.greatCircleBearing(vessel, points[0]),
        distance: GeoUtils.distanceTo(vessel, points[0])
      });
    } else {
      legs.push({
        bearing: 0,
        distance: 0
      });
    }
    for (let i = 1; i < points.length; ++i) {
      const l = {
        bearing: GeoUtils.greatCircleBearing(points[i - 1], points[i]),
        distance: GeoUtils.distanceTo(points[i - 1], points[i])
      };
      legs.push(l);
    }
    return legs;
  }

  /** Returns the index of the closest point that is forward of vessel position
   * @param points Array of points
   * @param vessel Vessel position (degrees)
   * @param heading Vessel heading (degrees)
   * @returns Index of the point in the array that is cloosest to and forward of vessel or -1 if no point matches criteria
   */
  static closestForwardPoint(
    points: Position[],
    vessel: Position,
    heading: number
  ): number {
    if (points.length < 2 || !vessel) {
      return -1;
    }
    const closest: {
      index: number;
      distance: number;
    } = { index: -1, distance: -1 };

    for (let i = 0; i < points.length; ++i) {
      const bearing = GeoUtils.greatCircleBearing(vessel, points[i]);
      const a = Angle.difference(heading, bearing);
      // if forward of vessel
      if (a > -90 && a < 90) {
        const distance = GeoUtils.distanceTo(vessel, points[i]);
        if (closest.distance === -1 || distance < closest.distance) {
          closest.distance = distance;
          closest.index = i;
        }
      }
    }
    return closest.index;
  }

  /** Calculate the centre of polygon **/
  static centreOfPolygon(coords: Position[]): Position {
    return GeoUtils.geographicCenter(coords);
  }

  /**
   * Initial great-circle bearing in degrees [0, 360) from `origin` to `dest`.
   * Both points are `[lon, lat]` in degrees.
   */
  static greatCircleBearing(origin: Position, dest: Position): number {
    const dLon = Convert.degreesToRadians(dest[0] - origin[0]);
    const phi1 = Convert.degreesToRadians(origin[1]);
    const phi2 = Convert.degreesToRadians(dest[1]);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    return (Convert.radiansToDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  /**
   * Rhumb-line (constant-bearing) heading in degrees [0, 360) from `origin`
   * to `dest`. Both points are `[lon, lat]` in degrees. Anti-meridian crossing
   * is wrapped via the standard ±π normalisation.
   */
  static rhumbLineBearing(origin: Position, dest: Position): number {
    const phi1 = Convert.degreesToRadians(origin[1]);
    const phi2 = Convert.degreesToRadians(dest[1]);
    let dLon = Convert.degreesToRadians(dest[0] - origin[0]);
    const dPhi = Math.log(
      Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4)
    );
    if (Math.abs(dLon) > Math.PI) {
      dLon = dLon > 0 ? -(Math.PI * 2 - dLon) : Math.PI * 2 + dLon;
    }
    return (Convert.radiansToDegrees(Math.atan2(dLon, dPhi)) + 360) % 360;
  }

  /**
   * Cartesian (3D unit-sphere) centroid of a set of `[lon, lat]` points.
   * Equivalent to geolib's getCenter: averages the spherical coordinates in
   * Cartesian space to avoid the polar singularity of a naive lat/lon mean.
   */
  static geographicCenter(points: Position[]): Position {
    let X = 0;
    let Y = 0;
    let Z = 0;
    for (const p of points) {
      const lat = Convert.degreesToRadians(p[1]);
      const lon = Convert.degreesToRadians(p[0]);
      const cosLat = Math.cos(lat);
      X += cosLat * Math.cos(lon);
      Y += cosLat * Math.sin(lon);
      Z += Math.sin(lat);
    }
    const n = points.length;
    X /= n;
    Y /= n;
    Z /= n;
    const lon = Convert.radiansToDegrees(Math.atan2(Y, X));
    const lat = Convert.radiansToDegrees(
      Math.atan2(Z, Math.sqrt(X * X + Y * Y))
    );
    return [lon, lat];
  }

  /**
   * Format a decimal degree as `D° MM' SS.s"` (geolib-compatible layout, so
   * existing CoordsPipe splitting on the first space keeps working).
   * Seconds are rounded to 4 decimal places, then trailing zeros are
   * collapsed to a single zero (so `12.0000` → `12.0`).
   */
  static decimalToSexagesimal(decimal: number): string {
    const [pre, post] = decimal.toString().split('.');
    const deg = Math.abs(Number(pre));
    const min0 = Number(`0.${post ?? 0}`) * 60;
    const min = Math.floor(min0);
    const sec0 = min0.toString().split('.');
    const secRaw = Number(`0.${sec0[1] ?? 0}`) * 60;
    const secRounded = Math.round(secRaw * 10000) / 10000;
    const [secPreDec, secDec = '0'] = secRounded.toString().split('.');
    return `${deg}° ${min
      .toString()
      .padStart(2, '0')}' ${secPreDec.padStart(2, '0')}.${secDec.padEnd(
      1,
      '0'
    )}"`;
  }

  /** DateLine Crossing:
   * @returns true if point is in the zone for dateline transition
   * @param zoneValue lower end of 180 to xx range within which Longitude must fall for retun value to be true
   * @param position Coordinate to test
   **/
  static inDLCrossingZone(coord: Position, zoneValue = 170) {
    return Math.abs(coord[0]) >= zoneValue ? true : false;
  }

  // returns true if point is inside the supplied extent
  static inBounds(point: Position, extent: Extent) {
    // Extent is an axis-aligned bbox in lon/lat, so a direct bbox test via
    // ol/extent.containsCoordinate is equivalent to ray-casting against the
    // rectangular polygon geolib was given and is materially faster.
    return containsCoordinate(extent, point);
  }

  // returns mapified extent centered at point with boundary radius meters from center
  static calcMapifiedExtent(point: Position, radius: number): Extent {
    const latScale = 111111; // 1 deg of lat in meters
    const lonScale = latScale * Math.cos(Convert.degreesToRadians(point[1]));
    const ext: Extent = [0, 0, 0, 0];

    // latitude bounds
    ext[1] = point[1] + (0 - Math.abs(radius)) / latScale;
    ext[3] = point[1] + Math.abs(radius) / latScale;
    // longitude bounds
    ext[0] = point[0] + (0 - Math.abs(radius)) / lonScale;
    ext[2] = point[0] + Math.abs(radius) / lonScale;
    return ext;
  }

  // Geohash base-32 alphabet (lowercase per spec; toLowerCase in
  // geohashDecodeBbox normalizes any uppercase input defensively).
  private static readonly GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

  /**
   * Decode a geohash to a bounding box [minLat, minLon, maxLat, maxLon].
   * Port of ngeohash.decode_bbox. Each base-32 char contributes 5 bits;
   * bits alternate refining longitude then latitude, halving the active
   * range on each step.
   */
  static geohashDecodeBbox(hash: string): [number, number, number, number] {
    let isLon = true;
    let minLat = -90;
    let maxLat = 90;
    let minLon = -180;
    let maxLon = 180;
    for (let i = 0; i < hash.length; i++) {
      const c = GeoUtils.GEOHASH_BASE32.indexOf(hash.charAt(i).toLowerCase());
      if (c < 0) continue;
      for (let bit = 4; bit >= 0; bit--) {
        const v = (c >> bit) & 1;
        if (isLon) {
          const mid = (minLon + maxLon) / 2;
          if (v === 1) minLon = mid;
          else maxLon = mid;
        } else {
          const mid = (minLat + maxLat) / 2;
          if (v === 1) minLat = mid;
          else maxLat = mid;
        }
        isLon = !isLon;
      }
    }
    return [minLat, minLon, maxLat, maxLon];
  }

  /**
   * Decode a geohash to a center point and error margins.
   * Port of ngeohash.decode.
   */
  static geohashDecode(hash: string): {
    latitude: number;
    longitude: number;
    error: { latitude: number; longitude: number };
  } {
    const [minLat, minLon, maxLat, maxLon] = GeoUtils.geohashDecodeBbox(hash);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      error: {
        latitude: (maxLat - minLat) / 2,
        longitude: (maxLon - minLon) / 2
      }
    };
  }

  // ensure -180<coords<180
  static normaliseCoords(coords: Position); // Point
  static normaliseCoords(coords: Position[]); //LineString
  static normaliseCoords(coords: Position[][]); // MultiLineString
  static normaliseCoords(coords) {
    if (!Array.isArray(coords)) {
      return [0, 0];
    }
    if (typeof coords[0] === 'number') {
      if (coords[0] > 180) {
        while (coords[0] > 180) {
          coords[0] = coords[0] - 360;
        }
      } else if (coords[0] < -180) {
        while (coords[0] < -180) {
          coords[0] = 360 + coords[0];
        }
      }
      return coords;
    } else if (Array.isArray(coords[0])) {
      coords.forEach((c) => (c = this.normaliseCoords(c)));
      return coords;
    }
  }
}

export class Angle {
  /** difference between two angles (in degrees)
   * @param h: angle 1 (in degrees)
   * @param b: angle 2 (in degrees)
   * @returns angle (-ive = port)
   */
  static difference(h: number, b: number): number {
    const d = 360 - b;
    const hd = h + d;
    const a = Angle.normalise(hd);
    return a < 180 ? 0 - a : 360 - a;
  }

  /** Add two angles (in degrees)
   * @param h: angle 1 (in degrees)
   * @param b: angle 2 (in degrees)
   * @returns sum angle
   */
  static add(h: number, b: number): number {
    return Angle.normalise(h + b);
  }

  /** Normalises angle to a value between 0 & 360 degrees
   * @param a: angle (in degrees)
   * @returns value between 0-360
   */
  static normalise(a: number): number {
    return a < 0 ? a + 360 : a >= 360 ? a - 360 : a;
  }
}
