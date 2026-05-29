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
  | 'tel'
  | 'url'
  | 'search'
  | 'color';

export type FbInputValue<TType extends FbInputType> = TType extends 'number'
  ? number | null
  : string | null;

/**
 * Tier-2 form Input primitive.
 *
 * Wraps a native `<input>` with token-driven chrome. Two-way binding via
 * `model()` so consumers can do `[(value)]="model"`.
 *
 * API representation: generic class `FbInputComponent<TType extends FbInputType>`.
 * The class generic narrows the `value` model's element type via
 * `FbInputValue<TType>` so consumers see `string | null` for text-family
 * types and `number | null` for `type="number"`. This was chosen over
 * function overloads on a single `value` setter because Angular's `model()`
 * does not accept overloaded signatures: a class-level generic is the only
 * way to surface a type-narrowed two-way binding while keeping the consumer
 * template literally `<fb-input type="number" [(value)]="depth">` with zero
 * casts and zero extra inputs.
 *
 * Numeric mode (`type="number"`) parses the raw string with
 * `Number.parseFloat`. Empty fields and unparseable input both map to
 * `null`, so consumers never see `NaN`. The `min`, `max`, and `step` inputs
 * are forwarded to the underlying `<input>` only while `type="number"`.
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
      [type]="type()"
      [attr.inputmode]="inputMode()"
      [attr.step]="isNumeric() ? step() : null"
      [attr.min]="isNumeric() ? min() : null"
      [attr.max]="isNumeric() ? max() : null"
      [name]="name()"
      [id]="name()"
      [value]="displayValue()"
      [attr.placeholder]="placeholder() || null"
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
export class FbInputComponent<TType extends FbInputType = 'text'> {
  readonly name = input.required<string>();
  readonly type = input<TType>('text' as TType);
  readonly value = model<FbInputValue<TType>>(null as FbInputValue<TType>);
  readonly step = input<number | null>(null);
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly placeholder = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  readonly isNumeric = computed<boolean>(() => this.type() === 'number');

  readonly classes = computed(
    () => `fb-input${this.invalid() ? ' fb-input--invalid' : ''}`
  );

  readonly inputMode = computed<string | null>(() =>
    this.isNumeric() ? 'numeric' : null
  );

  readonly displayValue = computed<string>(() => {
    const v = this.value();
    if (v === null || v === undefined) {
      return '';
    }
    return String(v);
  });

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    if (this.isNumeric()) {
      if (raw === '') {
        this.value.set(null as FbInputValue<TType>);
        return;
      }
      const parsed = Number.parseFloat(raw);
      this.value.set(
        (Number.isNaN(parsed) ? null : parsed) as FbInputValue<TType>
      );
      return;
    }
    this.value.set(raw as FbInputValue<TType>);
  }
}
