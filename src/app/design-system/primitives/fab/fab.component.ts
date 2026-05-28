import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { FbIconComponent } from '../icon/icon.component';

export type FbFabVariant = 'primary' | 'secondary';
export type FbFabPosition =
  | 'static'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

/**
 * Tier-1 Floating Action Button primitive.
 *
 * Hard rules:
 *  - `ariaLabel` is `input.required<string>()` because a FAB is always
 *    icon-only chrome and an unlabeled FAB is a hard a11y fail. Compile
 *    error if a consumer omits it, no runtime drift.
 *  - Size pinned to `--touch-primary` (56 px) so FABs always meet the
 *    safety-action touch target.
 *  - Reduced-motion drops the elevation transform and shadow easing.
 *  - Position presets use `position: fixed` + viewport edges; `static`
 *    leaves placement to the consumer's layout.
 */
@Component({
  selector: 'fb-fab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbIconComponent],
  template: `
    <button
      type="button"
      [class]="classes()"
      [attr.aria-label]="ariaLabel()"
      [attr.data-variant]="variant()"
      [disabled]="disabled()"
      (click)="onClick($event)"
    >
      <fb-icon [name]="icon()" [svgName]="svgName()" size="md"></fb-icon>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      :host([data-position]:not([data-position='static'])) {
        position: fixed;
        z-index: 50;
      }
      .fb-fab {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--touch-primary);
        height: var(--touch-primary);
        border: 1px solid transparent;
        border-radius: 50%;
        padding: 0;
        cursor: pointer;
        user-select: none;
        box-shadow:
          0 4px 8px rgba(0, 0, 0, 0.18),
          0 2px 4px rgba(0, 0, 0, 0.12);
        transition:
          background-color 120ms ease,
          border-color 120ms ease,
          box-shadow 160ms ease,
          transform 120ms ease;
      }
      .fb-fab:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }
      .fb-fab:hover:not(:disabled) {
        box-shadow:
          0 6px 14px rgba(0, 0, 0, 0.22),
          0 3px 6px rgba(0, 0, 0, 0.14);
      }
      .fb-fab:active:not(:disabled) {
        transform: translateY(1px);
      }
      .fb-fab:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        box-shadow: none;
      }
      .fb-fab--primary {
        background: var(--color-primary);
        color: var(--color-on-primary);
        border-color: var(--color-primary);
      }
      .fb-fab--primary:hover:not(:disabled) {
        background: color-mix(in oklch, var(--color-primary) 88%, black);
      }
      .fb-fab--secondary {
        background: var(--color-surface-raised);
        color: var(--color-text);
        border-color: var(--color-border);
      }
      .fb-fab--secondary:hover:not(:disabled) {
        background: color-mix(in oklch, var(--color-surface-raised) 90%, black);
      }
      :host([data-position='bottom-right']) {
        right: var(--space-xl);
        bottom: var(--space-xl);
      }
      :host([data-position='bottom-left']) {
        left: var(--space-xl);
        bottom: var(--space-xl);
      }
      :host([data-position='top-right']) {
        right: var(--space-xl);
        top: var(--space-xl);
      }
      :host([data-position='top-left']) {
        left: var(--space-xl);
        top: var(--space-xl);
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-fab {
          transition: none;
        }
        .fb-fab:active:not(:disabled) {
          transform: none;
        }
      }
    `
  ],
  host: {
    '[attr.data-position]': 'position()'
  }
})
export class FbFabComponent {
  readonly icon = input<string>('');
  readonly svgName = input<string>('');
  readonly ariaLabel = input.required<string>();
  readonly variant = input<FbFabVariant>('primary');
  readonly position = input<FbFabPosition>('static');
  readonly disabled = input<boolean>(false);

  readonly pressed = output<MouseEvent>();

  readonly classes = computed(() => `fb-fab fb-fab--${this.variant()}`);

  onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.pressed.emit(event);
  }
}
