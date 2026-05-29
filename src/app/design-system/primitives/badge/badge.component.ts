import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';

export type FbBadgePosition =
  | 'above before'
  | 'above after'
  | 'below before'
  | 'below after';
export type FbBadgeSize = 'small' | 'medium' | 'large';
export type FbBadgeSeverity = 'primary' | 'warn' | 'danger' | 'info';

@Component({
  selector: 'fb-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="fb-badge" [class.fb-badge--hidden]="hidden()">
      <ng-content></ng-content>
      @if (!hidden()) {
        <span
          class="fb-badge__bubble"
          [class]="bubbleClasses()"
          [attr.aria-label]="ariaLabel() || null"
          [attr.role]="ariaLabel() ? 'status' : null"
          >{{ value() }}</span
        >
      }
    </span>
  `,
  host: {
    '[attr.data-position]': 'position()',
    '[attr.data-size]': 'size()',
    '[attr.data-severity]': 'severity()'
  },
  styles: [
    `
      :host {
        display: inline-flex;
        position: relative;
      }
      .fb-badge {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .fb-badge--hidden {
        opacity: 0;
      }
      .fb-badge__bubble {
        position: absolute;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        padding: 0 var(--space-xs);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        line-height: 1;
        white-space: nowrap;
        border-radius: var(--radius-pill);
        background: var(--color-primary);
        color: var(--color-on-primary);
        pointer-events: none;
      }

      .fb-badge__bubble--dot {
        padding: 0;
        min-width: var(--space-sm);
        height: var(--space-sm);
      }
      .fb-badge__bubble--text {
        min-width: var(--space-lg);
      }

      .fb-badge__bubble--small {
        height: var(--space-md);
      }
      .fb-badge__bubble--medium {
        height: var(--space-lg);
      }
      .fb-badge__bubble--large {
        height: var(--space-xl);
        font-size: var(--font-size-sm);
      }
      .fb-badge__bubble--small.fb-badge__bubble--dot {
        min-width: var(--space-xs);
        height: var(--space-xs);
      }
      .fb-badge__bubble--large.fb-badge__bubble--dot {
        min-width: var(--space-md);
        height: var(--space-md);
      }

      .fb-badge__bubble--primary {
        background: var(--color-primary);
        color: var(--color-on-primary);
      }
      .fb-badge__bubble--warn {
        background: var(--color-warning);
        color: var(--color-text-inverse);
      }
      .fb-badge__bubble--danger {
        background: var(--color-error);
        color: var(--color-on-primary);
      }
      /* info falls back to primary palette: no --color-info token yet. */
      .fb-badge__bubble--info {
        background: var(--color-primary);
        color: var(--color-on-primary);
      }

      .fb-badge__bubble--pos-above-after {
        top: 0;
        right: 0;
        transform: translate(50%, -50%);
      }
      .fb-badge__bubble--pos-above-before {
        top: 0;
        left: 0;
        transform: translate(-50%, -50%);
      }
      .fb-badge__bubble--pos-below-after {
        bottom: 0;
        right: 0;
        transform: translate(50%, 50%);
      }
      .fb-badge__bubble--pos-below-before {
        bottom: 0;
        left: 0;
        transform: translate(-50%, 50%);
      }

      .fb-badge__bubble--no-overlap.fb-badge__bubble--pos-above-after {
        transform: translate(100%, -100%);
      }
      .fb-badge__bubble--no-overlap.fb-badge__bubble--pos-above-before {
        transform: translate(-100%, -100%);
      }
      .fb-badge__bubble--no-overlap.fb-badge__bubble--pos-below-after {
        transform: translate(100%, 100%);
      }
      .fb-badge__bubble--no-overlap.fb-badge__bubble--pos-below-before {
        transform: translate(-100%, 100%);
      }
    `
  ]
})
export class FbBadgeComponent {
  readonly value = input<string | number>('');
  readonly hidden = input<boolean>(false);
  readonly overlap = input<boolean>(true);
  readonly position = input<FbBadgePosition>('above after');
  readonly size = input<FbBadgeSize>('medium');
  readonly severity = input<FbBadgeSeverity>('primary');
  readonly ariaLabel = input<string>('');

  readonly bubbleClasses = computed(() => {
    const variant = String(this.value()) === '' ? 'dot' : 'text';
    const positionClass = `pos-${this.position().replace(' ', '-')}`;
    const overlapClass = this.overlap() ? 'overlap' : 'no-overlap';
    return [
      `fb-badge__bubble--${variant}`,
      `fb-badge__bubble--${this.size()}`,
      `fb-badge__bubble--${this.severity()}`,
      `fb-badge__bubble--${positionClass}`,
      `fb-badge__bubble--${overlapClass}`
    ];
  });
}
