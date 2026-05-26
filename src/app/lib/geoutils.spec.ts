/**
 * GeoUtils spec (Phase 4a Batch 3, SK-expert review).
 *
 * Pins the geolib to ol/sphere migration that landed in commit 5d99f6e4.
 * Eight call sites moved off geolib: anchor watch, COG line, dot direction,
 * range circles, route layer, measurements, laylines, and the coords pipe.
 * Three are safety-critical: anchor watch radius (helper/alarms), the COG
 * vector projection (collision avoidance), and layline destination points
 * (sail performance / wind-assist navigation).
 *
 * ol/sphere uses haversine with the WGS84 mean radius 6371008.8 m, where
 * geolib used spherical cosines with the equatorial radius 6378137 m. The
 * delta is ~0.11% (sub-meter at typical navigation ranges) and is below
 * display precision. These tests pin both the absolute output and the
 * dest-then-distance round-trip identity so a future migration would have
 * to acknowledge the math change.
 */
import { describe, expect, it } from 'vitest';
import { Angle, GeoUtils } from './geoutils';
import { Convert } from './convert';
import type { Position } from '../types';

// WGS84 mean radius used by ol/sphere. One degree of arc on this sphere
// is R times pi over 180 metres, used as the meter-per-degree reference
// for the absolute-value assertions below.
const R_WGS84 = 6_371_008.8;
const ONE_DEG_METRES = R_WGS84 * (Math.PI / 180);

describe('GeoUtils.distanceTo (great-circle, haversine)', () => {
  it('returns ~111195 m for one degree of latitude at the equator', () => {
    const d = GeoUtils.distanceTo([0, 0], [0, 1]);
    expect(d).toBeCloseTo(ONE_DEG_METRES, 0);
  });

  it('is symmetric: d(a, b) === d(b, a)', () => {
    const a: Position = [151.2106, -33.8568]; // Sydney Harbour
    const b: Position = [174.7787, -36.8485]; // Auckland
    expect(GeoUtils.distanceTo(a, b)).toBeCloseTo(GeoUtils.distanceTo(b, a), 6);
  });

  it('returns zero for identical points', () => {
    expect(GeoUtils.distanceTo([10, 20], [10, 20])).toBe(0);
  });
});

describe('GeoUtils.greatCircleBearing', () => {
  it('returns 0 (north) from equator point to a point due north', () => {
    expect(GeoUtils.greatCircleBearing([0, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('returns 90 (east) from equator point to a point due east', () => {
    expect(GeoUtils.greatCircleBearing([0, 0], [1, 0])).toBeCloseTo(90, 6);
  });

  it('returns 180 (south) from equator point to a point due south', () => {
    expect(GeoUtils.greatCircleBearing([0, 0], [0, -1])).toBeCloseTo(180, 6);
  });

  it('normalises westward bearing into [0, 360)', () => {
    const b = GeoUtils.greatCircleBearing([0, 0], [-1, 0]);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
    expect(b).toBeCloseTo(270, 6);
  });
});

describe('GeoUtils.rhumbLineBearing', () => {
  it('matches great-circle on a north-south meridian', () => {
    const gc = GeoUtils.greatCircleBearing([0, 0], [0, 10]);
    const rh = GeoUtils.rhumbLineBearing([0, 0], [0, 10]);
    expect(rh).toBeCloseTo(gc, 6);
  });

  it('returns 90 (east) on a constant-latitude eastward leg', () => {
    expect(GeoUtils.rhumbLineBearing([0, 45], [10, 45])).toBeCloseTo(90, 6);
  });

  it('returns 270 (west) on a constant-latitude westward leg', () => {
    expect(GeoUtils.rhumbLineBearing([0, 45], [-10, 45])).toBeCloseTo(270, 6);
  });
});

describe('GeoUtils.destCoordinate (round-trip with distanceTo)', () => {
  it('moving N from [0,0] by one-degree-arc lands at ~[0,1]', () => {
    const dest = GeoUtils.destCoordinate([0, 0], 0, ONE_DEG_METRES);
    expect(dest[0]).toBeCloseTo(0, 6);
    expect(dest[1]).toBeCloseTo(1, 4);
  });

  it('round-trips: destinationTo(p, theta, d) then distanceTo equals d', () => {
    const start: Position = [151.2106, -33.8568];
    const distance = 5_000; // 5 km, typical chart-display range
    const bearingRad = Convert.degreesToRadians(45);
    const dest = GeoUtils.destCoordinate(start, bearingRad, distance);
    expect(GeoUtils.distanceTo(start, dest)).toBeCloseTo(distance, 1);
  });

  it('range-circle helper: south 1 km lands at lat - ~0.009 degrees', () => {
    // Mirrors layer-range-circles.component.ts where the text label is placed
    // at bearing pi (south) from the vessel position.
    const dest = GeoUtils.destCoordinate([0, 0], Math.PI, 1_000);
    expect(dest[0]).toBeCloseTo(0, 6);
    expect(dest[1]).toBeLessThan(0);
    expect(GeoUtils.distanceTo([0, 0], dest)).toBeCloseTo(1_000, 1);
  });
});

describe('GeoUtils.geographicCenter', () => {
  it('returns the midpoint of two equatorial points', () => {
    const c = GeoUtils.geographicCenter([
      [0, 0],
      [2, 0]
    ]);
    expect(c[0]).toBeCloseTo(1, 6);
    expect(c[1]).toBeCloseTo(0, 6);
  });

  it('returns the midpoint of two meridian points', () => {
    const c = GeoUtils.geographicCenter([
      [0, 0],
      [0, 2]
    ]);
    expect(c[0]).toBeCloseTo(0, 6);
    // Spherical mean of two latitudes 0 and 2 is very close to 1, with a
    // tiny curvature correction. Loose tolerance keeps the test stable.
    expect(c[1]).toBeCloseTo(1, 4);
  });
});

describe('GeoUtils.routeLength', () => {
  it('sums per-leg great-circle distances', () => {
    const total = GeoUtils.routeLength([
      [0, 0],
      [0, 1],
      [0, 2]
    ]);
    expect(total).toBeCloseTo(2 * ONE_DEG_METRES, 0);
  });

  it('returns 0 for a one-point or empty input', () => {
    expect(GeoUtils.routeLength([[0, 0]])).toBe(0);
    expect(GeoUtils.routeLength([])).toBe(0);
  });
});

describe('Angle helpers (used alongside GeoUtils for laylines and COG)', () => {
  it('difference returns negative for port, positive for starboard', () => {
    // Per geoutils.ts: -ive return = port. Bearing 350 relative to
    // heading 0 is 10 degrees to port; bearing 10 is 10 degrees to
    // starboard.
    expect(Angle.difference(0, 350)).toBeCloseTo(-10, 6);
    expect(Angle.difference(0, 10)).toBeCloseTo(10, 6);
  });

  it('add wraps through 360', () => {
    expect(Angle.add(350, 20)).toBeCloseTo(10, 6);
    expect(Angle.add(10, -20)).toBeCloseTo(350, 6);
  });

  it('normalise keeps angles in [0, 360)', () => {
    expect(Angle.normalise(-10)).toBeCloseTo(350, 6);
    expect(Angle.normalise(370)).toBeCloseTo(10, 6);
    expect(Angle.normalise(0)).toBe(0);
  });
});

describe('GeoUtils.decimalToSexagesimal (used by CoordsPipe after geolib drop)', () => {
  it('formats whole degrees with two-zero minutes and one-zero seconds', () => {
    expect(GeoUtils.decimalToSexagesimal(12)).toBe(`12° 00' 00.0"`);
  });

  it('preserves the geolib output layout the CoordsPipe splits on', () => {
    // CoordsPipe slices on the first space, so the format must be
    // `D° MM' SS.s"` exactly for the hemisphere splice to keep working.
    const out = GeoUtils.decimalToSexagesimal(33.8568);
    expect(out).toMatch(/^\d{1,3}° \d{2}' \d{2}\.\d+"$/);
  });
});
