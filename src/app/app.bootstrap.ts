/**
 * Free functions extracted from AppFacade so the shim stays small. Each is
 * pure aside from window / fetch IO and is called once during AppFacade
 * construction.
 */

export interface HostDef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  name: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  port: any;
  ssl: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  url: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
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
      hostDef.params[a[0]] = a.length > 1 ? a[1] : null;
    });
  }
  hostDef.name =
    typeof hostDef.params?.host !== 'undefined'
      ? hostDef.params.host
      : devMode && devServer.host
        ? devServer.host
        : window.location.hostname;
  hostDef.ssl =
    window.location.protocol === 'https:' || (devMode && devServer.ssl);
  hostDef.port =
    typeof hostDef.params.port !== 'undefined'
      ? parseInt(hostDef.params.port)
      : devMode && devServer.port
        ? devServer.port
        : parseInt(window.location.port);
  hostDef.port = isNaN(hostDef.port) ? (hostDef.ssl ? 443 : 80) : hostDef.port;
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
 */
export function testForInternet(onOffline: () => void): void {
  window
    .fetch('https://tile.openstreetmap.org')
    .then(() => console.info('Internet connection detected.'))
    .catch(() => {
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
    tk.set(c[0], c[1]);
  });
  return tk.has(sel) ? tk.get(sel) : undefined;
}
