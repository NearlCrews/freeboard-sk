import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { PwaService } from '../services/pwa.service';

import {
  FbButtonComponent,
  FbIconComponent
} from 'src/app/design-system/primitives';

/**
 * Renders a single status strip across the top of the app:
 *   - "Offline" when navigator.onLine flips false (chart tiles served
 *     from the SW cache, SignalK delta stream may be stale).
 *   - "Update available" when SwUpdate signals a new ngsw-worker build,
 *     with a Reload button that activates the update.
 *
 * Both signals come from PwaService. The host gates display on whichever
 * is active; offline takes precedence so the user knows their data is
 * stale before being prompted to reload into a new bundle.
 */
@Component({
  selector: 'fb-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbButtonComponent, FbIconComponent],
  template: `
    @if (mode() === 'offline') {
      <div class="fb-offline-banner fb-offline-banner--offline">
        <fb-icon name="cloud_off" ariaLabel=""></fb-icon>
        <span>Offline. Data may be stale.</span>
      </div>
    } @else if (mode() === 'update') {
      <div class="fb-offline-banner fb-offline-banner--update">
        <fb-icon name="system_update_alt" ariaLabel=""></fb-icon>
        <span>A new version is ready.</span>
        <fb-button variant="ghost" (pressed)="reload()">Reload</fb-button>
      </div>
    }
  `,
  styles: [
    `
      .fb-offline-banner {
        align-items: center;
        display: flex;
        font-size: 14px;
        gap: 8px;
        padding: 6px 12px;
      }
      .fb-offline-banner--offline {
        background: var(--safety-alert-warn, #b78a00);
        color: var(--safety-alert-warn-on, #fff);
      }
      .fb-offline-banner--update {
        background: var(--color-info, #1976d2);
        color: var(--color-info-on, #fff);
      }
    `
  ]
})
export class OfflineBannerComponent {
  private readonly pwa = inject(PwaService);

  readonly mode = computed<'offline' | 'update' | null>(() => {
    if (!this.pwa.online()) return 'offline';
    if (this.pwa.updateAvailable()) return 'update';
    return null;
  });

  reload(): void {
    void this.pwa.activateUpdate();
  }
}
