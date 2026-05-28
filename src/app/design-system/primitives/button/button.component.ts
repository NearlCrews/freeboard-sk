import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

/**
 * Button variant. Maps to a token-driven surface + on-surface pair.
 *
 *  primary   high-emphasis safety actions (anchor drop, OK alarm)
 *  secondary medium-emphasis confirms (save, apply)
 *  ghost     low-emphasis, transparent surface
 *  danger    destructive confirms (delete route, abandon)
 */
export type FbButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Visual size step. Drives min-height via touch-target tokens. */
export type FbButtonSize = 'sm' | 'md' | 'lg';

/**
 * Tier-1 design-system Button primitive.
 *
 * Hard-fail rules from Phase 7 baked in here:
 *  - primary / md and primary / lg respect the 56 px primary touch target
 *    via --touch-primary, secondary respects 44 px via --touch-secondary.
 *  - reduced-motion: state transitions drop to 0 ms when the user prefers
 *    reduced motion (no transform animations).
 *  - aria-disabled is set instead of native `disabled` while loading so the
 *    button remains focusable for screen readers, but pointer events are
 *    blocked and click handlers no-op.
 */
@Component({
  selector: 'fb-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (href()) {
      <a
        [class]="classes()"
        [attr.href]="disabled() ? null : href()"
        [attr.target]="target() || null"
        [attr.rel]="target() === '_blank' ? 'noopener noreferrer' : null"
        [attr.role]="'button'"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-disabled]="isInteractionBlocked() || null"
        [attr.aria-busy]="loading() || null"
        [attr.data-variant]="variant()"
        [attr.data-size]="size()"
        [attr.tabindex]="disabled() ? -1 : 0"
        (click)="onClick($event)"
      >
        @if (loading()) {
          <span class="fb-btn__spinner" aria-hidden="true"></span>
        }
        <span class="fb-btn__label"><ng-content></ng-content></span>
      </a>
    } @else {
      <button
        type="button"
        [class]="classes()"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-disabled]="isInteractionBlocked() || null"
        [attr.aria-busy]="loading() || null"
        [attr.data-variant]="variant()"
        [attr.data-size]="size()"
        [disabled]="disabled()"
        (click)="onClick($event)"
      >
        @if (loading()) {
          <span class="fb-btn__spinner" aria-hidden="true"></span>
        }
        <span class="fb-btn__label"><ng-content></ng-content></span>
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .fb-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-sm);
        border: 1px solid transparent;
        border-radius: var(--radius-md);
        padding: var(--space-sm) var(--space-lg);
        font-family: var(--font-family-sans);
        font-weight: var(--font-weight-medium);
        font-size: var(--font-size-base);
        line-height: var(--line-height-tight);
        cursor: pointer;
        user-select: none;
        transition:
          background-color 120ms ease,
          border-color 120ms ease,
          color 120ms ease,
          transform 120ms ease;
      }
      /* The projected label often contains both an icon and text. Make the
         label itself an inline-flex row so the icon and text stay vertically
         centered with a deterministic gap, regardless of how the consumer
         interleaves them. Typography and transitions stay on .fb-btn so the
         .fb-btn--sm / --lg size modifiers actually reach the visible text
         and the reduced-motion override at the bottom of this stylesheet
         actually stops the hover animation. */
      .fb-btn__label {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        min-width: 0;
      }
      .fb-btn:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }
      .fb-btn:active:not(:disabled) {
        transform: translateY(1px);
      }
      .fb-btn:disabled,
      .fb-btn[aria-disabled='true'] {
        cursor: not-allowed;
        opacity: 0.55;
      }
      /* sizes (touch-target floors enforced via min-height) */
      .fb-btn--sm {
        min-height: 36px;
        padding: var(--space-xs) var(--space-md);
        font-size: var(--font-size-sm);
      }
      .fb-btn--md {
        min-height: var(--touch-secondary);
      }
      .fb-btn--lg {
        min-height: var(--touch-primary);
        font-size: var(--font-size-lg);
        padding: var(--space-md) var(--space-xl);
      }
      /* primary keeps 56 px even at md to honor safety-action contract */
      .fb-btn--primary.fb-btn--md {
        min-height: var(--touch-primary);
      }
      /* variants */
      .fb-btn--primary {
        background: var(--color-primary);
        color: var(--color-on-primary);
        border-color: var(--color-primary);
      }
      .fb-btn--primary:hover:not(:disabled):not([aria-disabled='true']) {
        background: color-mix(in oklch, var(--color-primary) 88%, black);
      }
      .fb-btn--secondary {
        background: var(--color-surface-raised);
        color: var(--color-text);
        border-color: var(--color-border);
      }
      .fb-btn--secondary:hover:not(:disabled):not([aria-disabled='true']) {
        background: color-mix(in oklch, var(--color-surface-raised) 90%, black);
      }
      .fb-btn--ghost {
        background: transparent;
        color: var(--color-text);
      }
      .fb-btn--ghost:hover:not(:disabled):not([aria-disabled='true']) {
        background: var(--color-surface-raised);
      }
      .fb-btn--danger {
        background: var(--color-error);
        color: var(--color-text-inverse);
        border-color: var(--color-error);
      }
      .fb-btn--danger:hover:not(:disabled):not([aria-disabled='true']) {
        background: color-mix(in oklch, var(--color-error) 88%, black);
      }
      /* loading spinner */
      .fb-btn__spinner {
        width: 1em;
        height: 1em;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: fb-btn-spin 720ms linear infinite;
      }
      @keyframes fb-btn-spin {
        to {
          transform: rotate(360deg);
        }
      }
      /* reduced-motion: drop transitions and spinner motion */
      @media (prefers-reduced-motion: reduce) {
        .fb-btn {
          transition: none;
        }
        .fb-btn:active:not(:disabled) {
          transform: none;
        }
        .fb-btn__spinner {
          animation-duration: 0ms;
        }
      }
    `
  ]
})
export class FbButtonComponent {
  readonly variant = input<FbButtonVariant>('primary');
  readonly size = input<FbButtonSize>('md');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly ariaLabel = input<string>('');
  readonly href = input<string>('');
  readonly target = input<string>('');

  readonly pressed = output<MouseEvent>();

  readonly isInteractionBlocked = computed(
    () => this.disabled() || this.loading()
  );

  readonly classes = computed(
    () => `fb-btn fb-btn--${this.variant()} fb-btn--${this.size()}`
  );

  onClick(event: MouseEvent): void {
    if (this.isInteractionBlocked()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.pressed.emit(event);
  }
}
