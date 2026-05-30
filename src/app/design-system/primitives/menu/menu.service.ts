import {
  Injectable,
  TemplateRef,
  ViewContainerRef,
  inject
} from '@angular/core';
import {
  ConnectedPosition,
  Overlay,
  OverlayConfig,
  PositionStrategy
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Observable, Subject, take } from 'rxjs';
import {
  FbMenuComponent,
  type FbMenuItem,
  type FbMenuTemplateContext
} from './menu.component';

const CONNECTED_POSITIONS: readonly ConnectedPosition[] = [
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
];

export interface FbMenuTemplateOpenConfig<T> {
  readonly trigger: HTMLElement;
  readonly templateRef: TemplateRef<FbMenuTemplateContext<T>>;
  readonly viewContainerRef: ViewContainerRef;
  readonly context?: T;
  readonly ariaLabel?: string;
}

export interface FbMenuTemplateOpenAtConfig<T> {
  readonly position: { readonly x: number; readonly y: number };
  readonly templateRef: TemplateRef<FbMenuTemplateContext<T>>;
  readonly viewContainerRef: ViewContainerRef;
  readonly context?: T;
  readonly ariaLabel?: string;
  readonly returnFocusTo?: HTMLElement;
}

export interface FbMenuTemplateRef {
  /** Programmatically close the menu (also called by the template `close()` context). */
  close(): void;
}

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
 * Three open modes:
 *  - `open(trigger, items)` for static `FbMenuItem[]` lists.
 *  - `openTemplate({ trigger, templateRef, viewContainerRef, context })`
 *    when the consumer needs conditional rows, dividers, projected
 *    components, or per-row matBadge ornaments that the typed item shape
 *    cannot express. The template ref receives `{ $implicit: context,
 *    close }` so rows can dismiss the overlay after acting.
 *  - `openAt({ position, templateRef, viewContainerRef, context })` to
 *    anchor at an arbitrary viewport point (right-click context menus).
 *
 * The static `open` returns the chosen id or null on dismiss; the template
 * forms return an `FbMenuTemplateRef` because the template owns its own
 * action wiring.
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
      .withPositions([...CONNECTED_POSITIONS])
      .withFlexibleDimensions(false)
      .withPush(true);

    const overlayRef = this.overlay.create(this.buildConfig(positionStrategy));
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

  openTemplate<T>(config: FbMenuTemplateOpenConfig<T>): FbMenuTemplateRef {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(config.trigger)
      .withPositions([...CONNECTED_POSITIONS])
      .withFlexibleDimensions(false)
      .withPush(true);
    return this.attachTemplate({
      positionStrategy,
      templateRef: config.templateRef,
      viewContainerRef: config.viewContainerRef,
      ...('context' in config ? { context: config.context as T } : {}),
      ...(config.ariaLabel !== undefined
        ? { ariaLabel: config.ariaLabel }
        : {}),
      returnFocusTo: config.trigger
    });
  }

  openAt<T>(config: FbMenuTemplateOpenAtConfig<T>): FbMenuTemplateRef {
    const positionStrategy = this.overlay
      .position()
      .global()
      .left(`${config.position.x}px`)
      .top(`${config.position.y}px`);
    return this.attachTemplate({
      positionStrategy,
      templateRef: config.templateRef,
      viewContainerRef: config.viewContainerRef,
      ...('context' in config ? { context: config.context as T } : {}),
      ...(config.ariaLabel !== undefined
        ? { ariaLabel: config.ariaLabel }
        : {}),
      ...(config.returnFocusTo ? { returnFocusTo: config.returnFocusTo } : {})
    });
  }

  private attachTemplate<T>(args: {
    positionStrategy: PositionStrategy;
    templateRef: TemplateRef<FbMenuTemplateContext<T>>;
    viewContainerRef: ViewContainerRef;
    context?: T;
    ariaLabel?: string;
    returnFocusTo?: HTMLElement;
  }): FbMenuTemplateRef {
    const overlayRef = this.overlay.create(
      this.buildConfig(args.positionStrategy)
    );

    let closed = false;
    const finish = (): void => {
      if (closed) return;
      closed = true;
      if (overlayRef.hasAttached()) {
        overlayRef.detach();
      }
      overlayRef.dispose();
      args.returnFocusTo?.focus();
    };

    const componentPortal = new ComponentPortal(
      FbMenuComponent,
      args.viewContainerRef
    );
    const componentRef = overlayRef.attach(componentPortal);

    const templateContext: FbMenuTemplateContext<T> = {
      $implicit: args.context as T,
      close: () => finish()
    };

    componentRef.setInput('templateRef', args.templateRef);
    componentRef.setInput('templateContext', templateContext);
    if (args.ariaLabel) {
      componentRef.setInput('ariaLabel', args.ariaLabel);
    }

    componentRef.instance.dismissed.subscribe(() => finish());
    overlayRef.backdropClick().subscribe(() => finish());
    overlayRef.keydownEvents().subscribe((event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish();
      }
    });

    return { close: finish };
  }

  private buildConfig(positionStrategy: PositionStrategy): OverlayConfig {
    return {
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      panelClass: 'fb-menu-panel'
    };
  }
}
