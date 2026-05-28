import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  input,
  model,
  viewChild
} from '@angular/core';
import { FbButtonComponent } from '../button/button.component';
import { FbIconComponent } from '../icon/icon.component';
import { FbInputComponent } from '../input/input.component';

let nextSearchInputId = 0;

@Component({
  selector: 'fb-search-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbInputComponent, FbButtonComponent, FbIconComponent],
  template: `
    <label class="fb-search-input__label" [attr.for]="inputId">
      {{ label() }}
    </label>
    <div class="fb-search-input__row">
      <fb-input
        #fbInput
        class="fb-search-input__field"
        [name]="inputId"
        type="search"
        [(value)]="value"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [ariaLabel]="ariaLabel()"
      ></fb-input>
      @if (showClear()) {
        <fb-button
          class="fb-search-input__clear"
          variant="ghost"
          [disabled]="disabled()"
          [ariaLabel]="clearAriaLabel()"
          (pressed)="clear()"
        >
          <fb-icon name="close"></fb-icon>
        </fb-button>
      }
    </div>
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
      .fb-search-input__label {
        font-size: var(--font-size-sm);
        color: var(--color-text);
        line-height: var(--line-height-tight);
      }
      .fb-search-input__row {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
      }
      .fb-search-input__field {
        flex: 1 1 auto;
        min-width: 0;
      }
      .fb-search-input__clear {
        flex: 0 0 auto;
      }
    `
  ]
})
export class FbSearchInputComponent {
  readonly value = model<string>('');
  readonly label = input<string>('Type to filter list');
  readonly placeholder = input<string>('');
  readonly widthPx = input<number | null>(null);
  readonly disabled = input<boolean, unknown>(false, {
    transform: booleanAttribute
  });
  readonly ariaLabel = input<string>('');

  private readonly fbInput = viewChild<
    FbInputComponent,
    ElementRef<HTMLElement>
  >('fbInput', { read: ElementRef });

  readonly inputId: string = `fb-search-${++nextSearchInputId}`;
  readonly showClear = computed<boolean>(() => this.value().length > 0);
  readonly clearAriaLabel = computed<string>(() => `Clear ${this.label()}`);

  clear(): void {
    this.value.set('');
    this.fbInput()?.nativeElement.querySelector('input')?.focus();
  }
}
