import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';

/**
 * Thin wrapper around CDK's `Dialog` service. Pinned defaults:
 *  - autoFocus: 'first-tabbable'  (focus the first interactive control)
 *  - restoreFocus: true            (return focus to the opener on close)
 *  - hasBackdrop: true             (modal scrim, click-outside dismisses
 *                                   unless disableClose: true)
 *
 * Why a wrapper instead of using `Dialog` directly:
 *  - Centralizes the a11y defaults so individual call sites cannot drift.
 */
@Injectable({ providedIn: 'root' })
export class FbDialogService {
  private readonly dialog = inject(Dialog);

  open<C, D = unknown, R = unknown>(
    component: ComponentType<C>,
    config?: DialogConfig<D, DialogRef<R, C>>
  ): DialogRef<R, C> {
    return this.dialog.open<R, D, C>(component, {
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
      ...config
    });
  }
}
