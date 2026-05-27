import {
  ChangeDetectionStrategy,
  Component,
  input,
  model
} from '@angular/core';

/**
 * Tier-2 form Switch primitive.
 *
 * Visual track + thumb toggle. Semantically a switch (not a checkbox) so
 * screen readers announce it as "on/off" instead of "checked/unchecked".
 *
 * A11y posture:
 *  - role="switch" on the button host, aria-checked mirrors the model.
 *  - Native <button> so Space and Enter activate without extra wiring.
 *  - Tap area >= --touch-secondary across the whole pill.
 *  - Reduced-motion drops the thumb slide transition.
 */
@Component({
  selector: 'fb-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="fb-switch"
      role="switch"
      [attr.aria-checked]="checked() ? 'true' : 'false'"
      [attr.aria-label]="ariaLabel() || null"
      [disabled]="disabled()"
      (click)="onClick($event)"
    >
      <span class="fb-switch__track" aria-hidden="true">
        <span class="fb-switch__thumb"></span>
      </span>
      <span class="fb-switch__label"><ng-content></ng-content></span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .fb-switch {
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
      .fb-switch:focus-visible {
        outline: none;
      }
      .fb-switch:focus-visible .fb-switch__track {
        box-shadow: 0 0 0 2px var(--color-focus-ring);
      }
      .fb-switch:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .fb-switch__track {
        position: relative;
        flex: 0 0 auto;
        width: 36px;
        height: 20px;
        background: var(--color-border);
        border-radius: var(--radius-pill);
        transition:
          background 160ms ease,
          box-shadow 120ms ease;
      }
      .fb-switch__thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: var(--color-surface);
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        transition: transform 160ms ease;
      }
      .fb-switch[aria-checked='true'] .fb-switch__track {
        background: var(--color-primary);
      }
      .fb-switch[aria-checked='true'] .fb-switch__thumb {
        transform: translateX(16px);
        background: var(--color-on-primary);
      }
      .fb-switch__label:empty {
        display: none;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-switch__track,
        .fb-switch__thumb {
          transition: none;
        }
      }
    `
  ]
})
export class FbSwitchComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.checked.update((v) => !v);
  }
}
