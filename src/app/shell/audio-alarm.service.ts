import { Injectable, Signal, inject, signal } from '@angular/core';
import { AppFacade } from 'src/app/app.facade';

/**
 * Owns the audio context state mirroring and the user-gesture resume flow.
 * The AudioContext itself remains on AppFacade for backwards compatibility
 * with delta-driven alarm handlers that already hold a reference.
 *
 * SCOPE BOUNDARY (deferred to Phase 7 with AlarmStore):
 * The per-component oscillator/gain/mute pipeline in
 * modules/alarms/components/alert.component.ts currently double-fires on
 * concurrent SignalK notifications such as
 * `notifications.environment.depth.belowSurface` plus
 * `notifications.navigation.anchor`. Single-fire highest-severity selection
 * over AlarmStore lands in Phase 7; lifting it here in Batch 2 would force
 * this service to either reach back into alert.component state or invent a
 * temporary selector that Phase 7 would throw away. Preserve-behavior-exactly
 * is intentional.
 */
@Injectable({ providedIn: 'root' })
export class AudioAlarmService {
  private readonly app = inject(AppFacade);
  private readonly _status = signal<AudioContextState | ''>('');
  readonly status: Signal<AudioContextState | ''> = this._status.asReadonly();

  /** Wire the AudioContext.onstatechange listener and seed the signal. */
  init(): void {
    const ctx = this.app.audio.context;
    this._status.set(ctx.state);
    this.app.debug('audio state:', this._status());
    ctx.onstatechange = () => {
      this.app.debug('audio statechange:', ctx.state);
      this._status.set(ctx.state);
    };
  }

  /** Resume the AudioContext. Browsers require a user gesture for resume(). */
  enable(): void {
    if (this.app.audio.context) {
      this.app.audio.context.resume();
    }
  }
}
