import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';

/**
 * Bottom-anchored modal using CDK Dialog + a bottom-centered overlay
 * position. Picks Dialog (not raw Overlay) so escape, focus trap, restore
 * focus, backdrop, and aria-modal come for free.
 *
 * Defaults:
 *  - position: globalPositionStrategy pinned to the bottom of the viewport
 *    and horizontally centered
 *  - autoFocus: 'first-tabbable'
 *  - restoreFocus: true
 *  - hasBackdrop: true
 *  - panelClass: 'fb-sheet-panel' so consumers can target the overlay
 *    wrapper for transitions in their own stylesheets if needed
 */
@Injectable({ providedIn: 'root' })
export class FbSheetService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);

  open<C, D = unknown, R = unknown>(
    component: ComponentType<C>,
    config?: DialogConfig<D, DialogRef<R, C>>
  ): DialogRef<R, C> {
    const positionStrategy = this.overlay
      .position()
      .global()
      .bottom('0')
      .centerHorizontally();
    return this.dialog.open<R, D, C>(component, {
      positionStrategy,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
      panelClass: 'fb-sheet-panel',
      ...config
    });
  }
}
