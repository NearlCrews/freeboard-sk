// Vendored from simplify-ts ^1.0.2 (MIT, James Allen).
// Converted from CommonJS to pure ESM TypeScript for tree-shaking.
// Public API preserved: ISimplifyLatLongPoint, SimplifyLL.

export interface ISimplifyLatLongPoint {
  longitude: number;
  latitude: number;
}

function getAddedSquaresLL(dlong: number, dlat: number): number {
  return dlong * dlong + dlat * dlat;
}

function getSqDistLL(
  p1: ISimplifyLatLongPoint,
  p2: ISimplifyLatLongPoint
): number {
  return getAddedSquaresLL(
    p1.longitude - p2.longitude,
    p1.latitude - p2.latitude
  );
}

function getSqSegDistLL(
  p: ISimplifyLatLongPoint,
  p1: ISimplifyLatLongPoint,
  p2: ISimplifyLatLongPoint
): number {
  let long = p1.longitude;
  let lat = p1.latitude;
  const dlong = p2.longitude - long;
  const dlat = p2.latitude - lat;
  if (dlong !== 0 || dlat !== 0) {
    const t =
      ((p.longitude - long) * dlong + (p.latitude - lat) * dlat) /
      getAddedSquaresLL(dlong, dlat);
    if (t > 1) {
      long = p2.longitude;
      lat = p2.latitude;
    } else if (t > 0) {
      long += dlong * t;
      lat += dlat * t;
    }
  }
  return getAddedSquaresLL(p.longitude - long, p.latitude - lat);
}

// Helpers below are only reached via SimplifyLL after a length > 2 guard, so
// every points[i] in 0..length-1 is statically present. Non-null assertions
// keep the original code shape without paying for runtime existence checks.

function simplifyRadialDistLL(
  points: ISimplifyLatLongPoint[],
  sqTolerance: number
): ISimplifyLatLongPoint[] {
  let prevPoint = points[0]!;
  let point: ISimplifyLatLongPoint = prevPoint;
  const newPoints: ISimplifyLatLongPoint[] = [prevPoint];
  for (let i = 1, len = points.length; i < len; i++) {
    point = points[i]!;
    if (getSqDistLL(point, prevPoint) > sqTolerance) {
      newPoints.push(point);
      prevPoint = point;
    }
  }
  if (prevPoint !== point) {
    newPoints.push(point);
  }
  return newPoints;
}

function simplifyDPStepLL(
  points: ISimplifyLatLongPoint[],
  first: number,
  last: number,
  sqTolerance: number,
  simplified: ISimplifyLatLongPoint[]
): void {
  let maxSqDist = sqTolerance;
  let index = -1;
  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDistLL(points[i]!, points[first]!, points[last]!);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }
  if (maxSqDist > sqTolerance && index !== -1) {
    if (index - first > 1) {
      simplifyDPStepLL(points, first, index, sqTolerance, simplified);
    }
    simplified.push(points[index]!);
    if (last - index > 1) {
      simplifyDPStepLL(points, index, last, sqTolerance, simplified);
    }
  }
}

function simplifyDouglasPeuckerLL(
  points: ISimplifyLatLongPoint[],
  sqTolerance: number
): ISimplifyLatLongPoint[] {
  const last = points.length - 1;
  const simplified: ISimplifyLatLongPoint[] = [points[0]!];
  simplifyDPStepLL(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]!);
  return simplified;
}

export function SimplifyLL(
  points: ISimplifyLatLongPoint[],
  tolerance = 1,
  highestQuality = false
): ISimplifyLatLongPoint[] {
  if (points.length <= 2) {
    return points;
  }
  const sqTolerance = tolerance * tolerance;
  const radial = highestQuality
    ? points
    : simplifyRadialDistLL(points, sqTolerance);
  return simplifyDouglasPeuckerLL(radial, sqTolerance);
}
