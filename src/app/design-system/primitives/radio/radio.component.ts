import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import type { RadioGroupHost } from './radio-group.component';

/**
 * Tier-2 form Radio primitive (child of fb-radio-group).
 *
 * Renders a single radio with a token-driven dot. Selection state and
 * keyboard nav are owned by the parent group; this child is a leaf button
 * that forwards click to the group and exposes role="radio".
 *
 * Generic over the value type. Default `T = string` keeps existing call
 * sites unchanged; numeric-keyed groups can specialize at the call site.
 *
 * A11y posture:
 *  - role="radio" + aria-checked + tabindex (roving) supplied by the
 *    parent group's per-radio query helpers.
 *  - Native button so Space activates without extra handling.
 */
@Component({
  selector: 'fb-radio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #native
      type="button"
      class="fb-radio"
      role="radio"
      [attr.aria-checked]="selected() ? 'true' : 'false'"
      [attr.aria-label]="ariaLabel() || null"
      [attr.tabindex]="tabindex()"
      [disabled]="isDisabled()"
      (click)="onClick()"
    >
      <span class="fb-radio__ring" aria-hidden="true">
        @if (selected()) {
          <span class="fb-radio__dot"></span>
        }
      </span>
      <span class="fb-radio__label"><ng-content></ng-content></span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .fb-radio {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        min-height: var(--touch-secondary);
        padding: 0;
        border: none;
        background: transparent;
        color: var(--color-text);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-base);
        cursor: pointer;
      }
      .fb-radio:focus-visible {
        outline: none;
      }
      .fb-radio:focus-visible .fb-radio__ring {
        box-shadow: 0 0 0 2px var(--color-focus-ring);
      }
      .fb-radio:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .fb-radio__ring {
        position: relative;
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        border: 1px solid var(--color-border);
        border-radius: 50%;
        background: var(--color-surface);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition:
          background 120ms ease,
          border-color 120ms ease,
          box-shadow 120ms ease;
      }
      .fb-radio[aria-checked='true'] .fb-radio__ring {
        border-color: var(--color-primary);
      }
      .fb-radio__dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-primary);
      }
      .fb-radio__label:empty {
        display: none;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-radio__ring {
          transition: none;
        }
      }
    `
  ]
})
export class FbRadioComponent<T extends string | number | null = string> {
  readonly value = input.required<T>();
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly groupRef = signal<RadioGroupHost | null>(null);

  readonly selected = computed(() => {
    const group = this.groupRef();
    return group ? group.isSelected(this.value()) : false;
  });

  readonly tabindex = computed(() => {
    const group = this.groupRef();
    if (!group) return 0;
    return group.isFocusable(this.value()) ? 0 : -1;
  });

  readonly isDisabled = computed(() => {
    const group = this.groupRef();
    return this.disabled() || (group ? group.isDisabled() : false);
  });

  attach(group: RadioGroupHost): void {
    this.groupRef.set(group);
  }

  focus(): void {
    const btn = this.hostEl.nativeElement.querySelector(
      'button'
    ) as HTMLButtonElement | null;
    btn?.focus();
  }

  onClick(): void {
    if (this.isDisabled()) return;
    this.groupRef()?.select(this.value());
  }
}
