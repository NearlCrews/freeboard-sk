import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model
} from '@angular/core';

export type FbInputType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'search'
  | 'color';

/**
 * Tier-2 form Input primitive.
 *
 * Wraps a native `<input>` with token-driven chrome. No MatInput dependency.
 * Two-way binding via `model()` so consumers can do `[(value)]="model"`.
 *
 * Numeric mode (`numericMode=true`) switches the model to a separate
 * `numericValue` signal of `number | null` and forces type="number" with
 * inputmode="numeric". Parsed values that come back NaN map to null so
 * consumers always see a numeric value or the explicit "empty" sentinel.
 * The string `value` model is ignored while numericMode is true.
 *
 * A11y posture:
 *  - aria-invalid mirrors the `invalid` input so screen readers announce
 *    validation state.
 *  - aria-label is forwarded when provided; otherwise the consumer is
 *    expected to associate a `<label for="">` via the `name` input.
 *  - Min-height is pinned to --touch-secondary (44 px) so the field is a
 *    legal tap target on touch displays.
 */
@Component({
  selector: 'fb-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      [class]="classes()"
      [type]="effectiveType()"
      [attr.inputmode]="inputMode()"
      [attr.step]="numericMode() ? step() : null"
      [attr.min]="numericMode() ? min() : null"
      [attr.max]="numericMode() ? max() : null"
      [name]="name()"
      [id]="name()"
      [value]="displayValue()"
      [placeholder]="placeholder() || null"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-invalid]="invalid() || null"
      (input)="onInput($event)"
    />
  `,
  styles: [
    `
      :host {
        display: inline-block;
        width: 100%;
      }
      .fb-input {
        display: block;
        width: 100%;
        min-height: var(--touch-secondary);
        padding: var(--space-sm) var(--space-md);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        color: var(--color-text);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-base);
        line-height: var(--line-height-tight);
        transition:
          border-color 120ms ease,
          box-shadow 120ms ease;
      }
      .fb-input::placeholder {
        color: var(--color-text-muted);
      }
      /* Hide WebKit/Blink native search clear control. Consumers that wrap
         type="search" (fb-search-input) provide their own clear button. */
      .fb-input[type='search']::-webkit-search-cancel-button,
      .fb-input[type='search']::-webkit-search-decoration {
        appearance: none;
      }
      .fb-input:focus-visible {
        outline: none;
        border-color: var(--color-focus-ring);
        box-shadow: 0 0 0 2px var(--color-focus-ring);
      }
      .fb-input:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-input--invalid {
        border-color: var(--color-error);
      }
      .fb-input--invalid:focus-visible {
        box-shadow: 0 0 0 2px var(--color-error);
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-input {
          transition: none;
        }
      }
    `
  ]
})
export class FbInputComponent {
  readonly name = input.required<string>();
  readonly value = model<string>('');
  readonly numericValue = model<number | null>(null);
  readonly type = input<FbInputType>('text');
  readonly numericMode = input<boolean>(false);
  readonly step = input<number | null>(null);
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly placeholder = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  readonly classes = computed(
    () => `fb-input${this.invalid() ? ' fb-input--invalid' : ''}`
  );

  readonly effectiveType = computed<FbInputType>(() =>
    this.numericMode() ? 'number' : this.type()
  );

  readonly inputMode = computed<string | null>(() =>
    this.numericMode() ? 'numeric' : null
  );

  readonly displayValue = computed<string>(() => {
    if (this.numericMode()) {
      const n = this.numericValue();
      return n === null ? '' : String(n);
    }
    return this.value();
  });

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (this.numericMode()) {
      const raw = target.value;
      if (raw === '') {
        this.numericValue.set(null);
        return;
      }
      const parsed = Number(raw);
      this.numericValue.set(Number.isNaN(parsed) ? null : parsed);
      return;
    }
    this.value.set(target.value);
  }
}
