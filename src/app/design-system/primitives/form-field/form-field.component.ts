import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input
} from '@angular/core';

let nextFormFieldId = 0;

/**
 * Tier-2 form-field layout primitive.
 *
 * Wraps an inner control (fb-input, fb-select, fb-textarea, fb-datepicker)
 * with an above-the-control visible label, a required asterisk, and either
 * a hint or an error caption beneath.
 *
 * Programmatic-label association uses the `controlId` getter:
 *
 *   <fb-form-field #userField label="User name" [required]="true">
 *     <fb-input [name]="userField.controlId" [(value)]="username" />
 *   </fb-form-field>
 *
 * The form-field's <label> binds `[attr.for]="controlId"`, and the inner
 * fb-input sets its inner <input id> from the bound name, so AT
 * announces the label and the field as a single grouped form control.
 */
@Component({
  selector: 'fb-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="fb-form-field__label" [attr.for]="controlId">
      {{ label() }}
      @if (required()) {
        <span class="fb-form-field__required" aria-hidden="true">*</span>
      }
    </label>
    <div class="fb-form-field__control">
      <ng-content></ng-content>
    </div>
    @if (caption(); as text) {
      <span
        class="fb-form-field__caption"
        [class.fb-form-field__caption--error]="hasError()"
        [attr.role]="hasError() ? 'alert' : null"
      >
        {{ text }}
      </span>
    }
  `,
  host: {
    '[style.width.px]': 'widthPx()'
  },
  styles: [
    `
      :host {
        display: inline-flex;
        flex-direction: column;
        gap: var(--space-xs);
        font-family: var(--font-family-sans);
      }
      .fb-form-field__label {
        font-size: var(--font-size-sm);
        color: var(--color-text);
        line-height: var(--line-height-tight);
      }
      .fb-form-field__required {
        margin-left: var(--space-xxs);
        color: var(--color-error);
      }
      .fb-form-field__control {
        display: flex;
        align-items: stretch;
      }
      .fb-form-field__caption {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        line-height: var(--line-height-tight);
      }
      .fb-form-field__caption--error {
        color: var(--color-error);
      }
    `
  ]
})
export class FbFormFieldComponent {
  readonly label = input.required<string>();
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean, unknown>(false, {
    transform: booleanAttribute
  });
  readonly widthPx = input<number | null>(null);

  readonly controlId: string = `fb-form-field-${++nextFormFieldId}`;

  readonly hasError = computed<boolean>(() => this.error().length > 0);
  readonly caption = computed<string>(() =>
    this.hasError() ? this.error() : this.hint()
  );
}
