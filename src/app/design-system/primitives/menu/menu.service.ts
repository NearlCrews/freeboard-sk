import { Injectable, inject } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { FbMenuComponent, type FbMenuItem } from './menu.component';

/**
 * Opens an `FbMenuComponent` in a CDK Overlay positioned beneath the
 * trigger element (with a fallback above when there is no room below).
 *
 * Why CDK Overlay (not Dialog): a menu is a transient, non-modal popover
 * that does not need focus trap, modal backdrop, or aria-modal semantics.
 * Overlay gives us a flexible connected-position strategy and a backdrop
 * we configure as transparent so clicks outside dismiss without darkening
 * the page.
 *
 * Returns an Observable that emits the chosen item id, or null when the
 * user dismisses with Escape or backdrop click. Either way the overlay is
 * disposed and focus returns to the trigger element.
 */
@Injectable({ providedIn: 'root' })
export class FbMenuService {
  private readonly overlay = inject(Overlay);

  open(
    trigger: HTMLElement,
    items: readonly FbMenuItem[]
  ): Observable<string | null> {
    const result$ = new Subject<string | null>();
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(trigger)
      .withPositions([
        {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
          offsetY: 4
        },
        {
          originX: 'start',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'bottom',
          offsetY: -4
        },
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'top',
          offsetY: 4
        },
        {
          originX: 'end',
          originY: 'top',
          overlayX: 'end',
          overlayY: 'bottom',
          offsetY: -4
        }
      ])
      .withFlexibleDimensions(false)
      .withPush(true);

    const config: OverlayConfig = {
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      panelClass: 'fb-menu-panel'
    };

    const overlayRef = this.overlay.create(config);
    const portal = new ComponentPortal(FbMenuComponent);
    const componentRef = overlayRef.attach(portal);

    componentRef.setInput('items', items);

    const finish = (value: string | null): void => {
      if (overlayRef.hasAttached()) {
        overlayRef.detach();
      }
      overlayRef.dispose();
      trigger.focus();
      result$.next(value);
      result$.complete();
    };

    componentRef.instance.itemSelected.subscribe((id) => finish(id));
    componentRef.instance.dismissed.subscribe(() => finish(null));
    overlayRef.backdropClick().subscribe(() => finish(null));
    overlayRef.keydownEvents().subscribe((event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(null);
      }
    });

    return result$.asObservable().pipe(take(1));
  }
}
