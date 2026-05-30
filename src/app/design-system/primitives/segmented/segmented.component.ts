import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  viewChildren
} from '@angular/core';
import { FbIconComponent } from '../icon/icon.component';

export interface FbSegmentedOption {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly disabled?: boolean;
}

/**
 * Tier-2 Segmented control primitive.
 *
 * One-of-N selection rendered as a row of buttons sharing a single chrome.
 * Semantically a radiogroup so screen readers announce it correctly.
 *
 * A11y posture:
 *  - Host gets role="radiogroup" with aria-label.
 *  - Each segment gets role="radio" + aria-checked.
 *  - Roving tabindex per WAI-ARIA radiogroup pattern.
 *  - Arrow keys move focus + selection between enabled segments, Home/End
 *    jump to the ends.
 */
@Component({
  selector: 'fb-segmented',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbIconComponent],
  template: `
    @for (opt of options(); track opt.id; let i = $index) {
      <button
        #segment
        type="button"
        class="fb-segmented__item"
        role="radio"
        [attr.aria-checked]="value() === opt.id ? 'true' : 'false'"
        [attr.tabindex]="value() === opt.id ? 0 : -1"
        [attr.aria-disabled]="opt.disabled || disabled() ? 'true' : null"
        [disabled]="opt.disabled || disabled()"
        [attr.data-index]="i"
        (click)="onSelect(opt)"
      >
        @if (opt.icon) {
          <fb-icon
            class="fb-segmented__icon"
            [name]="opt.icon"
            size="sm"
          ></fb-icon>
        }
        <span class="fb-segmented__label">{{ opt.label }}</span>
      </button>
    }
  `,
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'disabled() || null',
    '(keydown)': 'onKeyDown($event)'
  },
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: stretch;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-surface);
        overflow: hidden;
        font-family: var(--font-family-sans);
      }
      .fb-segmented__item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-xs);
        min-height: var(--touch-secondary);
        padding: var(--space-sm) var(--space-md);
        border: none;
        background: transparent;
        color: var(--color-text);
        font-family: inherit;
        font-size: var(--font-size-base);
        cursor: pointer;
        transition:
          background 120ms ease,
          color 120ms ease;
      }
      .fb-segmented__item + .fb-segmented__item {
        border-left: 1px solid var(--color-border);
      }
      .fb-segmented__item:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-segmented__item[aria-checked='true'] {
        background: var(--color-primary);
        color: var(--color-on-primary);
      }
      .fb-segmented__item:disabled,
      .fb-segmented__item[aria-disabled='true'] {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .fb-segmented__icon {
        flex: 0 0 auto;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-segmented__item {
          transition: none;
        }
      }
    `
  ]
})
export class FbSegmentedComponent {
  readonly options = input.required<readonly FbSegmentedOption[]>();
  readonly value = model<string>('');
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  private readonly segments =
    viewChildren<ElementRef<HTMLButtonElement>>('segment');

  readonly enabledIds = computed(() => {
    if (this.disabled()) return [] as string[];
    return this.options()
      .filter((o) => !o.disabled)
      .map((o) => o.id);
  });

  onSelect(option: FbSegmentedOption): void {
    if (option.disabled || this.disabled()) return;
    this.value.set(option.id);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const key = event.key;
    if (
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'ArrowUp' &&
      key !== 'ArrowDown' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }
    event.preventDefault();
    const enabled = this.enabledIds();
    if (enabled.length === 0) return;
    const current = this.value();
    const currentIdx = enabled.indexOf(current);

    let nextIdx: number;
    if (key === 'Home') {
      nextIdx = 0;
    } else if (key === 'End') {
      nextIdx = enabled.length - 1;
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % enabled.length;
    } else {
      nextIdx =
        currentIdx === -1
          ? enabled.length - 1
          : (currentIdx - 1 + enabled.length) % enabled.length;
    }
    const nextId = enabled[nextIdx];
    if (nextId === undefined) return;
    this.value.set(nextId);
    const options = this.options();
    const optionIdx = options.findIndex((o) => o.id === nextId);
    const refs = this.segments();
    refs[optionIdx]?.nativeElement.focus();
  }
}
