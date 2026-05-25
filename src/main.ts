import { Type, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { AppComponent } from './app/app.component';

/**
 * Lazy /design-system route.
 *
 * The Angular router is not currently wired into this app; AppComponent is
 * bootstrapped directly. Rather than introduce the router runtime in this
 * batch (and bundle its overhead into every freeboard load), we gate the
 * design-system showcase behind a path check and dynamic import.
 *
 * Why this is "lazy" enough:
 *  - `import('./app/design-system/design-system-showcase.component')` is a
 *    code-split point in esbuild/Angular CLI builds, so the design-system
 *    chunk is its own JS file that never ships to the AppComponent route.
 *  - The chunk is only fetched when the URL path contains `/design-system`.
 *
 * Path matching: substring match on pathname so any base href (signalk-server
 * mounts freeboard-sk under `/@signalk/freeboard-sk/`, dev server at `/`)
 * resolves the same way.
 */
function isDesignSystemRoute(): boolean {
  return window.location.pathname.includes('/design-system');
}

const providers = [
  provideZonelessChangeDetection(),
  provideHttpClient(withInterceptorsFromDi())
];

if (isDesignSystemRoute()) {
  import('./app/design-system/design-system-showcase.component')
    .then((m) =>
      bootstrapApplication(m.DesignSystemShowcaseComponent as Type<unknown>, {
        providers
      })
    )
    .catch((e) => console.error(e));
} else {
  bootstrapApplication(AppComponent, { providers }).catch((e) =>
    console.error(e)
  );
}
