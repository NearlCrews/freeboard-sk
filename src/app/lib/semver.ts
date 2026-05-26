/**
 * Tiny semver helpers used in place of the `semver` package, which is
 * CommonJS and blocks tree-shaking. Sufficient for x.y.z comparisons; the
 * regex deliberately ignores pre-release suffixes (e.g. "1.2.0-beta.4" is
 * treated as "1.2.0"), matching the gate semantics of the buddylist check.
 */

export function parseSemver(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(v);
  if (!m) return null;
  return [
    parseInt(m[1] ?? '0', 10),
    parseInt(m[2] ?? '0', 10),
    parseInt(m[3] ?? '0', 10)
  ];
}

/**
 * Returns negative if a < b, zero if equal, positive if a > b. Returns
 * zero when either side fails to parse; the caller's comparison (e.g.
 * `compareSemver(v, '1.2.0') > 0`) then treats malformed input as not
 * passing the gate.
 */
export function compareSemver(a: string, b: string): number {
  const A = parseSemver(a);
  const B = parseSemver(b);
  if (!A || !B) return 0;
  return A[0] - B[0] || A[1] - B[1] || A[2] - B[2];
}
