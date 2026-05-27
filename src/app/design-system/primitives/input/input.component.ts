import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model
} from '@angular/core';

export type FbInputType = 'text' | 'number' | 'email' | 'password' | 'search';

/**
 * Tier-2 form Input primitive.
 *
 * Wraps a native `<input>` with token-driven chrome. No MatInput dependency.
 * Two-way binding via `model()` so consumers can do `[(value)]="model"`.
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
      [name]="name()"
      [id]="name()"
      [value]="value()"
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
        border-radius: 6px;
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
  readonly type = input<FbInputType>('text');
  readonly placeholder = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  readonly classes = computed(
    () => `fb-input${this.invalid() ? ' fb-input--invalid' : ''}`
  );

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }
}
