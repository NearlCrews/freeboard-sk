import { Injectable, OnDestroy, inject } from '@angular/core';

import { AppFacade } from 'src/app/app.facade';

/**
 * Owns the periodic config-persistence loop that the map component
 * starts when the view is in "moving map" mode. The map flags itself
 * dirty on every `onMapMoveEnd` (via `markDirty`) and the controller's
 * 30-second timer drains the dirty flag back into `app.saveConfig()`.
 *
 * Extracted from FBMapComponent so the timer plumbing lives apart from
 * the rest of the map's event handling. The map component delegates by
 * calling `start()`, `stop()`, `flush()`, and `markDirty()`.
 */
@Injectable({ providedIn: 'root' })
export class MapPersistenceController implements OnDestroy {
  private readonly app = inject(AppFacade);

  private timer: ReturnType<typeof setInterval> | null = null;
  private dirty = false;

  /** Start the 30 s save loop. Idempotent: a second call is a no-op. */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.dirty) {
        this.app.saveConfig();
        this.dirty = false;
      }
    }, 30_000);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  markDirty(): void {
    this.dirty = true;
  }

  markClean(): void {
    this.dirty = false;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
