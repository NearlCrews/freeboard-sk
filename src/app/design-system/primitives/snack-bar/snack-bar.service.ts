import { ComponentType } from '@angular/cdk/portal';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { Observable } from 'rxjs';

export const FB_SNACK_BAR_DATA = new InjectionToken<unknown>(
  'FB_SNACK_BAR_DATA'
);

export interface FbSnackBarConfig<D = unknown> {
  data?: D;
  /** Auto-dismiss after this many milliseconds. 0 disables auto-dismiss. */
  duration?: number;
}

export class FbSnackBarRef<R = unknown, C = unknown> {
  private ref: DialogRef<R, C> | undefined;

  attach(ref: DialogRef<R, C>): void {
    this.ref = ref;
  }

  dismiss(): void {
    this.ref?.close();
  }

  afterDismissed(): Observable<R | undefined> {
    if (!this.ref) {
      throw new Error(
        'FbSnackBarRef.afterDismissed called before the snack was attached.'
      );
    }
    return this.ref.closed;
  }
}

const DEFAULT_DURATION_MS = 3000;

/**
 * Replaces MatSnackBar. Opens a component into a backdrop-less CDK
 * Dialog overlay pinned to the bottom edge of the viewport. Default
 * auto-dismiss is 3s; pass 0 to keep the snack until explicit dismissal.
 * The opened component can inject FB_SNACK_BAR_DATA for its payload and
 * FbSnackBarRef to call dismiss programmatically.
 */
@Injectable({ providedIn: 'root' })
export class FbSnackBarService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);

  openFromComponent<C, D = unknown, R = unknown>(
    component: ComponentType<C>,
    config?: FbSnackBarConfig<D>
  ): FbSnackBarRef<R, C> {
    const fbRef = new FbSnackBarRef<R, C>();
    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .bottom('var(--space-xl)');
    const ref = this.dialog.open<R, D, C>(component, {
      data: config?.data ?? null,
      hasBackdrop: false,
      autoFocus: false,
      restoreFocus: false,
      panelClass: 'fb-snack-bar-panel',
      positionStrategy,
      providers: [
        { provide: FB_SNACK_BAR_DATA, useValue: config?.data ?? null },
        { provide: FbSnackBarRef, useValue: fbRef }
      ]
    });
    fbRef.attach(ref);
    const duration = config?.duration ?? DEFAULT_DURATION_MS;
    if (duration > 0) {
      setTimeout(() => ref.close(), duration);
    }
    return fbRef;
  }
}
