// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.

export class Path {
  // Transform dot notation to slash notation.
  static dotToSlash(path: string): string {
    const p = path.split('?');
    if (p[0].includes('.')) {
      p[0] = p[0].split('.').join('/');
    }
    return p.join('?');
  }

  // Parse context to a valid Signal K path.
  static contextToPath(context: string): string {
    const res = context === 'self' ? 'vessels.self' : context;
    return res.split('.').join('/');
  }
}
