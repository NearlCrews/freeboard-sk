// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.

export class Path {
  // Transform dot notation to slash notation. String.split always yields at
  // least one element, so p[0] is statically present.
  static dotToSlash(path: string): string {
    const p = path.split('?');
    const first = p[0]!;
    if (first.includes('.')) {
      p[0] = first.split('.').join('/');
    }
    return p.join('?');
  }

  // Parse context to a valid Signal K path.
  static contextToPath(context: string): string {
    const res = context === 'self' ? 'vessels.self' : context;
    return res.split('.').join('/');
  }
}
