/**
 * Free functions extracted from AppFacade so the shim stays small. Each is
 * pure aside from window / fetch IO and is called once during AppFacade
 * construction.
 */

export interface HostDef {
  name: string | undefined;
  port: number | undefined;
  ssl: boolean;
  url: string | undefined;
  params: Record<string, string | null | undefined>;
}

export interface DevServerDef {
  host: string;
  port: number;
  ssl: boolean;
}

/**
 * Parse window.location into hostDef. Mutates the supplied object so the
 * AppFacade.hostDef reference stays stable for downstream consumers.
 */
export function parseLaunchUrl(
  hostDef: HostDef,
  devMode: boolean,
  devServer: DevServerDef
): void {
  if (window.location.search) {
    const p = window.location.search.slice(1).split('&');
    p.forEach((i) => {
      const a = i.split('=');
      const key = a[0];
      if (key === undefined) return;
      hostDef.params[key] = a.length > 1 ? (a[1] ?? null) : null;
    });
  }
  const paramHost = hostDef.params['host'];
  hostDef.name =
    paramHost ??
    (devMode && devServer.host ? devServer.host : window.location.hostname);
  hostDef.ssl =
    window.location.protocol === 'https:' || (devMode && devServer.ssl);
  const paramPort = hostDef.params['port'];
  const parsedPort =
    paramPort != null
      ? parseInt(paramPort)
      : devMode && devServer.port
        ? devServer.port
        : parseInt(window.location.port);
  hostDef.port = isNaN(parsedPort) ? (hostDef.ssl ? 443 : 80) : parsedPort;
  hostDef.url = `${hostDef.ssl ? 'https:' : 'http:'}//${hostDef.name}:${hostDef.port}`;
}

/** Returns true if not embedded (is top window). */
export function isTopWindow(): boolean {
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
}

/**
 * Ping a known tile server to detect Internet reachability. Calls onOffline
 * when the request fails so the caller can decide whether to surface a
 * user-visible alert (gated on kiosk mode and chart selection).
 *
 * Accepts an optional AbortSignal so the caller can cancel the pending
 * fetch on its own teardown. In tests this prevents the onOffline
 * callback from firing showAlert after TestBed has destroyed the root
 * injector (NG0205).
 */
export function testForInternet(
  onOffline: () => void,
  signal?: AbortSignal
): void {
  window
    .fetch('https://tile.openstreetmap.org', { signal: signal ?? null })
    .then(() => console.info('Internet connection detected.'))
    .catch((err: unknown) => {
      if (signal?.aborted) {
        return;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.warn('No Internet connection detected!');
      onOffline();
    });
}

/** Read the named cookie from a document.cookie string. */
export function readCookie(
  cookies: string,
  sel: 'sktoken' | 'skLoginInfo'
): string | undefined {
  if (!cookies) return undefined;
  const tk = new Map<string, string>();
  cookies.split(';').forEach((i) => {
    const c = i.trim().split('=');
    const key = c[0];
    if (key === undefined) return;
    tk.set(key, c[1] ?? '');
  });
  return tk.get(sel);
}
