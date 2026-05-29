import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model
} from '@angular/core';

/**
 * Tier-2 form Textarea primitive.
 *
 * Multi-line variant of fb-input. Same a11y contract: aria-invalid mirrors
 * `invalid`, aria-label forwarded, focus-visible ring uses
 * --color-focus-ring. Min-height stays above --touch-secondary because the
 * field always renders >= 3 rows.
 */
@Component({
  selector: 'fb-textarea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <textarea
      [class]="classes()"
      [name]="name()"
      [id]="name()"
      [rows]="rows()"
      [attr.placeholder]="placeholder() || null"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-invalid]="invalid() || null"
      [value]="value()"
      (input)="onInput($event)"
    ></textarea>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        width: 100%;
      }
      .fb-textarea {
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
        line-height: var(--line-height-normal);
        resize: vertical;
        transition:
          border-color 120ms ease,
          box-shadow 120ms ease;
      }
      .fb-textarea::placeholder {
        color: var(--color-text-muted);
      }
      .fb-textarea:focus-visible {
        outline: none;
        border-color: var(--color-focus-ring);
        box-shadow: 0 0 0 2px var(--color-focus-ring);
      }
      .fb-textarea:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-textarea--invalid {
        border-color: var(--color-error);
      }
      .fb-textarea--invalid:focus-visible {
        box-shadow: 0 0 0 2px var(--color-error);
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-textarea {
          transition: none;
        }
      }
    `
  ]
})
export class FbTextareaComponent {
  readonly name = input.required<string>();
  readonly value = model<string>('');
  readonly rows = input<number>(3);
  readonly placeholder = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  readonly classes = computed(
    () => `fb-textarea${this.invalid() ? ' fb-textarea--invalid' : ''}`
  );

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value.set(target.value);
  }
}
