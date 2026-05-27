import { Injectable, inject } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { FbSnackbarComponent, type FbSnackbarKind } from './snackbar.component';

export type FbSnackbarOutcome = 'action' | 'dismiss' | 'timeout';

export interface FbSnackbarOptions {
  readonly kind?: FbSnackbarKind;
  readonly durationMs?: number;
  readonly actionLabel?: string;
}

const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 7000;

/**
 * Toast service. Opens an `FbSnackbarComponent` in a bottom-centered
 * global overlay and emits `'action' | 'dismiss' | 'timeout'` when the
 * snackbar closes.
 *
 * Defaults:
 *  - duration 4000 ms for info / success / warn, 7000 ms for error
 *    (errors need longer to read).
 *  - bottom-centered, no backdrop (toasts are non-blocking).
 */
@Injectable({ providedIn: 'root' })
export class FbSnackbarService {
  private readonly overlay = inject(Overlay);

  open(
    message: string,
    opts: FbSnackbarOptions = {}
  ): Observable<FbSnackbarOutcome> {
    const result$ = new Subject<FbSnackbarOutcome>();
    const kind: FbSnackbarKind = opts.kind ?? 'info';
    const duration =
      opts.durationMs ??
      (kind === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);
    const actionLabel = opts.actionLabel ?? '';

    const positionStrategy = this.overlay
      .position()
      .global()
      .bottom('24px')
      .centerHorizontally();

    const config: OverlayConfig = {
      positionStrategy,
      hasBackdrop: false,
      panelClass: 'fb-snackbar-panel'
    };

    const overlayRef: OverlayRef = this.overlay.create(config);
    const portal = new ComponentPortal(FbSnackbarComponent);
    const componentRef = overlayRef.attach(portal);

    componentRef.setInput('message', message);
    componentRef.setInput('kind', kind);
    if (actionLabel) {
      componentRef.setInput('actionLabel', actionLabel);
    }

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (outcome: FbSnackbarOutcome): void => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      if (overlayRef.hasAttached()) overlayRef.detach();
      overlayRef.dispose();
      result$.next(outcome);
      result$.complete();
    };

    componentRef.instance.actionInvoked.subscribe(() => finish('action'));

    if (duration > 0) {
      timer = setTimeout(() => finish('timeout'), duration);
    }

    return result$.asObservable().pipe(take(1));
  }
}
