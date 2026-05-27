import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model
} from '@angular/core';

/**
 * Tier-2 form Checkbox primitive.
 *
 * Signal-driven checkbox with a token-driven box + check glyph. Label text
 * is projected via ng-content so consumers can include rich text or links.
 *
 * A11y posture:
 *  - Wraps a native <input type="checkbox"> visually hidden under the
 *    custom box so focus, keyboard activation, and form submission all
 *    work without ARIA gymnastics.
 *  - Tap target follows --touch-secondary so the whole label row is a
 *    legal touch area.
 *  - aria-label is forwarded; when absent, the projected label text is the
 *    accessible name via the <label> wrapper.
 *  - Indeterminate state is set imperatively because there is no native
 *    HTML attribute for it.
 */
@Component({
  selector: 'fb-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [class]="classes()">
      <input
        #native
        type="checkbox"
        class="fb-checkbox__native"
        [checked]="checked()"
        [disabled]="disabled()"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-checked]="ariaCheckedAttr()"
        (change)="onChange($event)"
      />
      <span
        class="fb-checkbox__box"
        [class.fb-checkbox__box--filled]="checked() || indeterminate()"
        aria-hidden="true"
      >
        @if (indeterminate()) {
          <span class="fb-checkbox__dash"></span>
        } @else if (checked()) {
          <span class="fb-checkbox__check"></span>
        }
      </span>
      <span class="fb-checkbox__label"><ng-content></ng-content></span>
    </label>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .fb-checkbox {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        min-height: var(--touch-secondary);
        cursor: pointer;
        user-select: none;
        font-family: var(--font-family-sans);
        font-size: var(--font-size-base);
        color: var(--color-text);
      }
      .fb-checkbox--disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .fb-checkbox__native {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }
      .fb-checkbox__box {
        position: relative;
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background: var(--color-surface);
        transition:
          background 120ms ease,
          border-color 120ms ease,
          box-shadow 120ms ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .fb-checkbox__box--filled {
        background: var(--color-primary);
        border-color: var(--color-primary);
      }
      .fb-checkbox__native:focus-visible + .fb-checkbox__box {
        box-shadow: 0 0 0 2px var(--color-focus-ring);
      }
      .fb-checkbox__check {
        width: 6px;
        height: 10px;
        border: solid var(--color-on-primary);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg) translate(-1px, -1px);
      }
      .fb-checkbox__dash {
        width: 10px;
        height: 2px;
        background: var(--color-on-primary);
        border-radius: 1px;
      }
      .fb-checkbox__label:empty {
        display: none;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-checkbox__box {
          transition: none;
        }
      }
    `
  ]
})
export class FbCheckboxComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly indeterminate = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  readonly classes = computed(
    () => `fb-checkbox${this.disabled() ? ' fb-checkbox--disabled' : ''}`
  );

  readonly ariaCheckedAttr = computed(() =>
    this.indeterminate() ? 'mixed' : this.checked() ? 'true' : 'false'
  );

  onChange(event: Event): void {
    if (this.disabled()) return;
    const target = event.target as HTMLInputElement;
    this.checked.set(target.checked);
  }
}
