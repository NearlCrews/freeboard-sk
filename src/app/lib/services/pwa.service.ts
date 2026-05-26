import { Injectable, inject, signal } from '@angular/core';

/**
 * PWA wrapper for SwUpdate + offline-state surface. The Angular Service
 * Worker package is intentionally NOT a direct import here so this file
 * compiles before `@angular/service-worker` is installed. Once the
 * dependency lands and `provideServiceWorker(...)` is wired in main.ts,
 * the inline `SwUpdateLike` shape resolves at runtime via the DI token.
 *
 * Phase 6 deliverable: PWA service-worker runtime, cacheFirst chart tiles
 * (200 MB default, 2 GB max), networkFirst SignalK API with 3 s timeout
 * (see ngsw-config.json), install prompt after >=3 sessions, offline
 * banner. The cache strategy lives in ngsw-config.json; this service is
 * the runtime surface that the shell uses to render the offline banner
 * and the new-version-available toast.
 */

interface SwUpdateLike {
  isEnabled: boolean;
  versionUpdates: { subscribe(cb: (v: { type: string }) => void): unknown };
  activateUpdate(): Promise<boolean>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  readonly online = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  readonly updateAvailable = signal<boolean>(false);

  private swUpdate: SwUpdateLike | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.online.set(true));
      window.addEventListener('offline', () => this.online.set(false));
    }
    // Wire SwUpdate via a runtime resolve so this file compiles without
    // the @angular/service-worker peer dependency installed. The shell
    // calls `wireSwUpdate(inject(SwUpdate))` from main.ts when SW is on.
  }

  /** Called from main.ts after provideServiceWorker registers. */
  wireSwUpdate(swUpdate: SwUpdateLike): void {
    if (!swUpdate.isEnabled) {
      return;
    }
    this.swUpdate = swUpdate;
    swUpdate.versionUpdates.subscribe((evt) => {
      if (evt.type === 'VERSION_READY') {
        this.updateAvailable.set(true);
      }
    });
  }

  /** Activate a pending update and reload. */
  async activateUpdate(): Promise<void> {
    if (!this.swUpdate) return;
    const ok = await this.swUpdate.activateUpdate();
    if (ok) {
      window.location.reload();
    }
  }
}
