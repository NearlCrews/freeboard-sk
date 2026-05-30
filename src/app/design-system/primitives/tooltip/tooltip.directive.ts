import {
  DestroyRef,
  Directive,
  ElementRef,
  effect,
  inject,
  input,
  ComponentRef
} from '@angular/core';
import {
  ConnectedPosition,
  Overlay,
  OverlayPositionBuilder,
  OverlayRef
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { FbTooltipBubbleComponent } from './tooltip-bubble.component';

export type FbTooltipPosition =
  | 'above'
  | 'below'
  | 'left'
  | 'right'
  | 'before'
  | 'after';

const SHOW_DELAY_MS = 350;
const OFFSET_PX = 6;
let uidCounter = 0;

@Directive({
  selector: '[fbTooltip]',
  standalone: true,
  host: {
    '(mouseenter)': 'show()',
    '(focus)': 'show()',
    '(mouseleave)': 'hide()',
    '(blur)': 'hide()',
    '(touchstart)': 'onTouchStart()',
    '(touchend)': 'onTouchEnd()',
    '(touchcancel)': 'onTouchEnd()'
  }
})
export class FbTooltipDirective {
  readonly fbTooltip = input<string>('');
  readonly fbTooltipPosition = input<FbTooltipPosition>('below');
  readonly fbTooltipDisabled = input<boolean>(false);

  private readonly overlay = inject(Overlay);
  private readonly positionBuilder = inject(OverlayPositionBuilder);
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bubbleId = `fb-tooltip-${++uidCounter}`;

  private overlayRef: OverlayRef | undefined;
  private bubbleRef: ComponentRef<FbTooltipBubbleComponent> | undefined;
  private showTimer: ReturnType<typeof setTimeout> | undefined;
  private touchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
    // Live updates: keep the bubble in sync with bound inputs while shown.
    effect(() => {
      const text = this.fbTooltip();
      if (this.bubbleRef) {
        this.bubbleRef.setInput('text', text);
      }
      if (!text && this.overlayRef?.hasAttached()) {
        this.hide();
      }
    });
    effect(() => {
      if (this.fbTooltipDisabled() && this.overlayRef?.hasAttached()) {
        this.hide();
      }
    });
  }

  show(): void {
    if (this.fbTooltipDisabled() || !this.fbTooltip()) return;
    this.clearShowTimer();
    this.showTimer = setTimeout(() => this.attach(), SHOW_DELAY_MS);
  }

  hide(): void {
    this.clearShowTimer();
    this.clearTouchTimer();
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
      this.bubbleRef = undefined;
      // Only clear our own describedby; respect an upstream value if one was set.
      const host = this.hostEl.nativeElement;
      if (host.getAttribute('aria-describedby') === this.bubbleId) {
        host.removeAttribute('aria-describedby');
      }
    }
  }

  onTouchStart(): void {
    if (this.fbTooltipDisabled() || !this.fbTooltip()) return;
    this.clearTouchTimer();
    // Long-press matches matTooltip's touch behavior; cancel on quick release.
    this.touchTimer = setTimeout(() => this.attach(), SHOW_DELAY_MS);
  }

  onTouchEnd(): void {
    this.clearTouchTimer();
    this.hide();
  }

  private attach(): void {
    this.ensureOverlay();
    if (!this.overlayRef || this.overlayRef.hasAttached()) return;
    const portal = new ComponentPortal(FbTooltipBubbleComponent);
    this.bubbleRef = this.overlayRef.attach(portal);
    this.bubbleRef.setInput('text', this.fbTooltip());
    this.bubbleRef.setInput('id', this.bubbleId);
    this.hostEl.nativeElement.setAttribute('aria-describedby', this.bubbleId);
  }

  private ensureOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.updatePositionStrategy(this.buildPositionStrategy());
      return;
    }
    this.overlayRef = this.overlay.create({
      positionStrategy: this.buildPositionStrategy(),
      scrollStrategy: this.overlay.scrollStrategies.reposition()
    });
  }

  private buildPositionStrategy() {
    const primary = this.positionFor(this.fbTooltipPosition());
    const fallback = this.positionFor(this.opposite(this.fbTooltipPosition()));
    return this.positionBuilder
      .flexibleConnectedTo(this.hostEl)
      .withPositions([primary, fallback])
      .withPush(true)
      .withFlexibleDimensions(false);
  }

  private opposite(side: FbTooltipPosition): FbTooltipPosition {
    switch (side) {
      case 'above':
        return 'below';
      case 'below':
        return 'above';
      case 'left':
      case 'before':
        return 'right';
      case 'right':
      case 'after':
        return 'left';
    }
  }

  private positionFor(side: FbTooltipPosition): ConnectedPosition {
    switch (side) {
      case 'above':
        return {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom',
          offsetY: -OFFSET_PX
        };
      case 'left':
      case 'before':
        return {
          originX: 'start',
          originY: 'center',
          overlayX: 'end',
          overlayY: 'center',
          offsetX: -OFFSET_PX
        };
      case 'right':
      case 'after':
        return {
          originX: 'end',
          originY: 'center',
          overlayX: 'start',
          overlayY: 'center',
          offsetX: OFFSET_PX
        };
      case 'below':
        return {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: OFFSET_PX
        };
    }
  }

  private clearShowTimer(): void {
    if (this.showTimer !== undefined) {
      clearTimeout(this.showTimer);
      this.showTimer = undefined;
    }
  }

  private clearTouchTimer(): void {
    if (this.touchTimer !== undefined) {
      clearTimeout(this.touchTimer);
      this.touchTimer = undefined;
    }
  }

  private dispose(): void {
    this.clearShowTimer();
    this.clearTouchTimer();
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.bubbleRef = undefined;
  }
}
