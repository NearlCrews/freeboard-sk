import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  inject,
  input
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

/**
 * Layout shell for a CDK Dialog body. Consumers project content into three
 * named slots:
 *
 *   <fb-dialog>
 *     <span fbDialogHeader>Title</span>
 *     <p fbDialogBody>Body</p>
 *     <ng-container fbDialogFooter>
 *       <fb-button (pressed)="close()">Close</fb-button>
 *     </ng-container>
 *   </fb-dialog>
 *
 * Why a separate shell instead of opening this component itself:
 * CDK Dialog takes ANY component as its content, and consumers want their
 * own component classes so they can hold their own state, inputs, and
 * outputs. This component is the visual chrome; the consumer's component
 * is the content. That decoupling is what lets `MatDialog` adopters
 * migrate one dialog at a time without rewriting the consuming component.
 *
 * A11y posture (CDK Dialog defaults documented at
 * https://material.angular.dev/cdk/dialog):
 *  - The CDK already sets role="dialog" and aria-modal="true" on the
 *    overlay container, traps focus via cdkTrapFocus, and restores focus
 *    on close. We expose `labelId` / `descriptionId` inputs that bind the
 *    overlay container's aria-labelledby / aria-describedby (consumers
 *    pass element IDs from their projected header / body).
 *  - Escape closes by default unless the consumer's DialogConfig sets
 *    disableClose, in which case our service still maps the key path so
 *    the close button stays the only exit.
 */
@Component({
  selector: 'fb-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="fb-dialog__header">
      <ng-content select="[fbDialogHeader]"></ng-content>
    </header>
    <section class="fb-dialog__body">
      <ng-content select="[fbDialogBody]"></ng-content>
      <ng-content></ng-content>
    </section>
    <footer class="fb-dialog__footer">
      <ng-content select="[fbDialogFooter]"></ng-content>
    </footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        max-width: min(560px, 100vw);
        max-height: 90vh;
        overflow: hidden;
        font-family: var(--font-family-sans);
      }
      .fb-dialog__header {
        padding: var(--space-lg) var(--space-xl);
        border-bottom: 1px solid var(--color-border);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
      }
      .fb-dialog__body {
        padding: var(--space-lg) var(--space-xl);
        overflow-y: auto;
        flex: 1 1 auto;
        font-size: var(--font-size-base);
        line-height: var(--line-height-normal);
      }
      .fb-dialog__footer {
        padding: var(--space-md) var(--space-xl);
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: flex-end;
        gap: var(--space-sm);
        background: var(--color-surface-raised);
      }
      .fb-dialog__footer:empty {
        display: none;
      }
      .fb-dialog__header:empty {
        display: none;
      }
    `
  ]
})
export class FbDialogComponent {
  readonly labelId = input<string>('');
  readonly descriptionId = input<string>('');

  // CDK Dialog injects DialogRef for the content component. We accept it as
  // optional so the shell renders standalone in the showcase (no DialogRef
  // present) without throwing.
  private readonly dialogRef = inject(DialogRef, { optional: true });

  @HostBinding('attr.role') readonly roleAttr = 'dialog';

  @HostBinding('attr.aria-labelledby') get ariaLabelledBy(): string | null {
    return this.labelId() || null;
  }

  @HostBinding('attr.aria-describedby') get ariaDescribedBy(): string | null {
    return this.descriptionId() || null;
  }

  /** Helper for templates: closes the parent CDK DialogRef when present. */
  close(value?: unknown): void {
    this.dialogRef?.close(value);
  }
}
