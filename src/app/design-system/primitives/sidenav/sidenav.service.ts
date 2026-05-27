import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import type { FbSidenavSide } from './sidenav.component';

/**
 * Side-anchored modal drawer using CDK Dialog plus a globally-pinned
 * overlay position. Picks Dialog (not raw Overlay) so escape, focus trap,
 * focus restore, backdrop, and aria-modal come for free.
 *
 * Defaults:
 *  - positionStrategy: global, pinned to the chosen side, full-height
 *  - autoFocus: 'first-tabbable'
 *  - restoreFocus: true
 *  - hasBackdrop: true
 *  - panelClass: 'fb-sidenav-panel'
 */
@Injectable({ providedIn: 'root' })
export class FbSidenavService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);

  open<C, D = unknown, R = unknown>(
    component: ComponentType<C>,
    side: FbSidenavSide = 'left',
    config?: DialogConfig<D, DialogRef<R, C>>
  ): DialogRef<R, C> {
    const positionStrategy =
      side === 'left'
        ? this.overlay.position().global().left('0').top('0')
        : this.overlay.position().global().right('0').top('0');
    return this.dialog.open<R, D, C>(component, {
      positionStrategy,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
      panelClass: 'fb-sidenav-panel',
      ...config
    });
  }
}
