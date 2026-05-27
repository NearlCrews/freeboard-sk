import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  computed,
  input,
  output
} from '@angular/core';

export type FbSnackbarKind = 'info' | 'success' | 'warn' | 'error';

/**
 * Tier-1 Snackbar primitive. Renders a single toast notification with an
 * optional action button. The service portals one instance per call into
 * a bottom-centered global overlay; the component itself is intentionally
 * thin so it can render the same way in tests without overlay plumbing.
 *
 * A11y posture:
 *  - role="status" for info and success (polite live region)
 *  - role="alert" for warn and error (assertive live region)
 *  - Reduced-motion drops the slide-up animation.
 */
@Component({
  selector: 'fb-snackbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="fb-snackbar__message">{{ message() }}</span>
    @if (actionLabel()) {
      <button type="button" class="fb-snackbar__action" (click)="onAction()">
        {{ actionLabel() }}
      </button>
    }
  `,
  host: {
    '[attr.data-kind]': 'kind()'
  },
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--space-md);
        min-height: var(--touch-secondary);
        padding: var(--space-sm) var(--space-lg);
        border-radius: var(--radius-lg);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-base);
        line-height: var(--line-height-tight);
        max-width: min(560px, 92vw);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        animation: fb-snackbar-slide-up 200ms ease-out;
        background: var(--color-surface-raised);
        color: var(--color-text);
      }
      :host([data-kind='info']) {
        background: var(--color-surface-raised);
        color: var(--color-text-muted);
      }
      :host([data-kind='success']) {
        background: var(--color-success);
        color: var(--color-on-primary);
      }
      :host([data-kind='warn']) {
        background: var(--color-warning);
        color: var(--color-text-inverse);
      }
      :host([data-kind='error']) {
        background: var(--color-error);
        color: var(--color-text-inverse);
      }
      .fb-snackbar__message {
        flex: 1 1 auto;
      }
      .fb-snackbar__action {
        flex: 0 0 auto;
        min-height: var(--touch-secondary);
        padding: var(--space-xs) var(--space-md);
        border: 1px solid currentColor;
        border-radius: var(--radius-md);
        background: transparent;
        color: inherit;
        font: inherit;
        font-weight: var(--font-weight-medium);
        cursor: pointer;
      }
      .fb-snackbar__action:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }
      @keyframes fb-snackbar-slide-up {
        from {
          transform: translateY(40%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
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
export class FbSnackbarComponent {
  readonly message = input.required<string>();
  readonly kind = input<FbSnackbarKind>('info');
  readonly actionLabel = input<string>('');

  readonly actionInvoked = output<void>();

  readonly isAssertive = computed(
    () => this.kind() === 'warn' || this.kind() === 'error'
  );

  @HostBinding('attr.role') get roleAttr(): string {
    return this.isAssertive() ? 'alert' : 'status';
  }

  @HostBinding('attr.aria-live') get ariaLiveAttr(): string {
    return this.isAssertive() ? 'assertive' : 'polite';
  }

  onAction(): void {
    this.actionInvoked.emit();
  }
}
