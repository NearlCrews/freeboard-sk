import { ComponentType } from '@angular/cdk/portal';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { Observable } from 'rxjs';

export const FB_BOTTOM_SHEET_DATA = new InjectionToken<unknown>(
  'FB_BOTTOM_SHEET_DATA'
);

export interface FbBottomSheetConfig<D = unknown> {
  data?: D;
  disableClose?: boolean;
  panelClass?: string | string[];
}

/**
 * Wrapper around a CDK Dialog ref that exposes an `afterDismissed` /
 * `dismiss` API. The internal DialogRef is attached lazily by
 * FbBottomSheetService.open after CDK has finished instantiating the
 * opened component, so the wrapper can be provided to the opened
 * component via DI without a chicken-and-egg construction order.
 */
export class FbBottomSheetRef<R = unknown, C = unknown> {
  private ref: DialogRef<R, C> | undefined;

  attach(ref: DialogRef<R, C>): void {
    this.ref = ref;
  }

  dismiss(value?: R): void {
    this.ref?.close(value);
  }

  afterDismissed(): Observable<R | undefined> {
    if (!this.ref) {
      throw new Error(
        'FbBottomSheetRef.afterDismissed called before the sheet was attached.'
      );
    }
    return this.ref.closed;
  }
}

/**
 * Opens a component into a CDK Dialog overlay pinned to the bottom edge
 * of the viewport, provides the FbBottomSheetRef wrapper to the opened
 * component's injector, and exposes the FB_BOTTOM_SHEET_DATA token for
 * open-time payload injection.
 */
@Injectable({ providedIn: 'root' })
export class FbBottomSheetService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);

  open<C, D = unknown, R = unknown>(
    component: ComponentType<C>,
    config?: FbBottomSheetConfig<D>
  ): FbBottomSheetRef<R, C> {
    const fbRef = new FbBottomSheetRef<R, C>();
    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .bottom('0');
    const ref = this.dialog.open<R, D, C>(component, {
      data: config?.data ?? null,
      disableClose: config?.disableClose ?? false,
      hasBackdrop: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      panelClass: config?.panelClass ?? 'fb-bottom-sheet-panel',
      backdropClass: 'fb-bottom-sheet-backdrop',
      positionStrategy,
      providers: [
        { provide: FB_BOTTOM_SHEET_DATA, useValue: config?.data ?? null },
        { provide: FbBottomSheetRef, useValue: fbRef }
      ]
    });
    fbRef.attach(ref);
    return fbRef;
  }
}
