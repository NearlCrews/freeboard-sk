import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  inject,
  input
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

export type FbSidenavSide = 'left' | 'right';

/**
 * Tier-1 Side-drawer primitive. Pinned to the left or right edge of the
 * viewport by `FbSidenavService.open()` via a CDK Dialog position
 * strategy; this component owns the visual chrome and slide-in animation.
 *
 * A11y posture:
 *  - role="dialog" + aria-modal="true" since the drawer captures focus
 *    and obscures background interaction.
 *  - aria-labelledby points at a consumer-owned header element id.
 *  - Reduced-motion drops the slide-in animation.
 */
@Component({
  selector: 'fb-sidenav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="fb-sidenav__header">
      <ng-content select="[fbSidenavHeader]"></ng-content>
    </header>
    <section class="fb-sidenav__body">
      <ng-content select="[fbSidenavBody]"></ng-content>
      <ng-content></ng-content>
    </section>
    <footer class="fb-sidenav__footer">
      <ng-content select="[fbSidenavFooter]"></ng-content>
    </footer>
  `,
  host: {
    '[attr.data-side]': 'side()',
    '[style.width]': 'width()'
  },
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);
        font-family: var(--font-family-sans);
        height: 100vh;
        max-height: 100vh;
        overflow: hidden;
        box-shadow: 0 0 24px rgba(0, 0, 0, 0.25);
        animation-duration: 220ms;
        animation-timing-function: ease-out;
        animation-fill-mode: both;
      }
      :host([data-side='left']) {
        border-left: none;
        animation-name: fb-sidenav-slide-in-left;
      }
      :host([data-side='right']) {
        border-right: none;
        animation-name: fb-sidenav-slide-in-right;
      }
      .fb-sidenav__header {
        padding: var(--space-lg) var(--space-xl);
        border-bottom: 1px solid var(--color-border);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        min-height: var(--touch-secondary);
      }
      .fb-sidenav__header:empty {
        display: none;
      }
      .fb-sidenav__body {
        padding: var(--space-lg) var(--space-xl);
        overflow-y: auto;
        flex: 1 1 auto;
        font-size: var(--font-size-base);
        line-height: var(--line-height-normal);
      }
      .fb-sidenav__footer {
        padding: var(--space-md) var(--space-xl);
        border-top: 1px solid var(--color-border);
        background: var(--color-surface-raised);
      }
      .fb-sidenav__footer:empty {
        display: none;
      }
      @keyframes fb-sidenav-slide-in-left {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }
      @keyframes fb-sidenav-slide-in-right {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
        }
      }
    `
  ]
})
export class FbSidenavComponent {
  readonly side = input<FbSidenavSide>('left');
  readonly width = input<string>('320px');
  readonly labelId = input<string>('');

  private readonly dialogRef = inject(DialogRef, { optional: true });

  @HostBinding('attr.role') readonly roleAttr = 'dialog';
  @HostBinding('attr.aria-modal') readonly ariaModal = 'true';

  @HostBinding('attr.aria-labelledby') get ariaLabelledBy(): string | null {
    return this.labelId() || null;
  }

  close(value?: unknown): void {
    this.dialogRef?.close(value);
  }
}
