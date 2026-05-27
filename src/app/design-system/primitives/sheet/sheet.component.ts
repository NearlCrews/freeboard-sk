import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  inject,
  input
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

/**
 * Mobile-style bottom sheet layout. Pinned to the bottom of the viewport
 * by the position strategy in `FbSheetService.open()`; the component owns
 * the visual chrome (handle, header, body) and the optional drag-to-close
 * affordance.
 *
 * Why not @angular/material/bottom-sheet:
 *  - The Material variant is locked into Material's theming and dialog
 *    config; we want CDK-level control so this primitive can adopt our
 *    own tokens, our own escape semantics, and a future swipe-to-dismiss
 *    without forking MatBottomSheet.
 *
 * A11y posture:
 *  - role="dialog" + aria-modal="true" since the sheet traps focus and
 *    occludes background interaction.
 *  - aria-labelledby points at the header element's id (consumer-owned).
 *  - The decorative handle is aria-hidden.
 *  - Reduced-motion: slide-up animation is disabled when the user prefers
 *    reduced motion.
 */
@Component({
  selector: 'fb-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fb-sheet__handle" aria-hidden="true"></div>
    <header class="fb-sheet__header">
      <ng-content select="[fbSheetHeader]"></ng-content>
    </header>
    <section class="fb-sheet__body">
      <ng-content select="[fbSheetBody]"></ng-content>
      <ng-content></ng-content>
    </section>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        background: var(--color-surface);
        color: var(--color-text);
        border-top-left-radius: 14px;
        border-top-right-radius: 14px;
        border-top: 1px solid var(--color-border);
        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.25);
        width: 100vw;
        max-width: 720px;
        max-height: 85vh;
        overflow: hidden;
        font-family: var(--font-family-sans);
        animation: fb-sheet-slide-up 200ms ease-out;
      }
      .fb-sheet__handle {
        width: 40px;
        height: 4px;
        margin: var(--space-sm) auto var(--space-xs);
        background: var(--color-border);
        border-radius: var(--radius-xs);
        flex: 0 0 auto;
      }
      .fb-sheet__header {
        padding: var(--space-sm) var(--space-xl) var(--space-md);
        border-bottom: 1px solid var(--color-border);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        min-height: var(--touch-secondary);
      }
      .fb-sheet__header:empty {
        display: none;
      }
      .fb-sheet__body {
        padding: var(--space-lg) var(--space-xl);
        overflow-y: auto;
        flex: 1 1 auto;
        font-size: var(--font-size-base);
        line-height: var(--line-height-normal);
      }
      @keyframes fb-sheet-slide-up {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
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
export class FbSheetComponent {
  readonly labelId = input<string>('');

  private readonly dialogRef = inject(DialogRef, { optional: true });

  @HostBinding('attr.role') readonly roleAttr = 'dialog';
  @HostBinding('attr.aria-modal') readonly ariaModal = 'true';

  @HostBinding('attr.aria-labelledby') get ariaLabelledBy(): string | null {
    return this.labelId() || null;
  }

  /** Helper for templates: closes the parent CDK DialogRef when present. */
  close(value?: unknown): void {
    this.dialogRef?.close(value);
  }
}
