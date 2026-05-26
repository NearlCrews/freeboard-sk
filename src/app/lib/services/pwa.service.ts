import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';

/**
 * PWA wrapper for SwUpdate + offline-state surface. Phase 6 deliverable:
 * PWA service-worker runtime, cacheFirst chart tiles (200 MB default,
 * 2 GB max) and networkFirst SignalK API with 3 s timeout (see
 * ngsw-config.json), install prompt after >=3 sessions, offline banner.
 * The cache strategy lives in ngsw-config.json; this service is the
 * runtime surface the shell uses to render the offline banner and the
 * new-version-available toast.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  readonly online = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  readonly updateAvailable = signal<boolean>(false);

  private readonly swUpdate = inject(SwUpdate, { optional: true });

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.online.set(true));
      window.addEventListener('offline', () => this.online.set(false));
    }
    if (this.swUpdate?.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((evt: VersionEvent) => {
        if (evt.type === 'VERSION_READY') {
          this.updateAvailable.set(true);
        }
      });
    }
  }

  /** Activate a pending update and reload. */
  async activateUpdate(): Promise<void> {
    if (!this.swUpdate?.isEnabled) return;
    const ok = await this.swUpdate.activateUpdate();
    if (ok) {
      window.location.reload();
    }
  }
}
