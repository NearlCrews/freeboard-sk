import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  input,
  model
} from '@angular/core';

/**
 * Tier-2 form Slider primitive.
 *
 * Range input rendered as a track + filled portion + thumb. Wraps a native
 * <input type="range"> for free pointer-drag, native keyboard handling,
 * and form submission. We layer custom chrome on top via thumb / track
 * styling that reads tokens.
 *
 * Keyboard layered on top of native behavior:
 *  - Native <input type="range"> already handles arrow keys, Home, End,
 *    PageUp, and PageDown; we just forward them. The class-level keydown
 *    listener is a defensive backstop for browsers that under-implement
 *    PageUp/PageDown so the WAI-ARIA contract is honored even there.
 */
@Component({
  selector: 'fb-slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #native
      type="range"
      class="fb-slider__input"
      role="slider"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [value]="value()"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-valuemin]="min()"
      [attr.aria-valuemax]="max()"
      [attr.aria-valuenow]="value()"
      [style.--fb-slider-fill]="fillPercent()"
      (input)="onInput($event)"
    />
  `,
  styles: [
    `
      :host {
        display: inline-block;
        width: 100%;
      }
      .fb-slider__input {
        --fb-slider-fill: 0%;
        display: block;
        width: 100%;
        min-height: var(--touch-secondary);
        background: linear-gradient(
          to right,
          var(--color-primary) 0%,
          var(--color-primary) var(--fb-slider-fill),
          var(--color-border) var(--fb-slider-fill),
          var(--color-border) 100%
        );
        border-radius: 999px;
        appearance: none;
        cursor: pointer;
        height: 4px;
        padding: 0;
        margin: var(--space-md) 0;
      }
      .fb-slider__input:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 4px;
      }
      .fb-slider__input:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-slider__input::-webkit-slider-thumb {
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--color-primary);
        border: 2px solid var(--color-on-primary);
        cursor: pointer;
        transition: transform 120ms ease;
      }
      .fb-slider__input::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--color-primary);
        border: 2px solid var(--color-on-primary);
        cursor: pointer;
        transition: transform 120ms ease;
      }
      .fb-slider__input:active::-webkit-slider-thumb {
        transform: scale(1.1);
      }
      .fb-slider__input:active::-moz-range-thumb {
        transform: scale(1.1);
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-slider__input::-webkit-slider-thumb,
        .fb-slider__input::-moz-range-thumb {
          transition: none;
        }
        .fb-slider__input:active::-webkit-slider-thumb,
        .fb-slider__input:active::-moz-range-thumb {
          transform: none;
        }
      }
    `
  ]
})
export class FbSliderComponent {
  readonly value = model<number>(0);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  readonly fillPercent = computed(() => {
    const range = this.max() - this.min();
    if (range <= 0) return '0%';
    const pct = ((this.value() - this.min()) / range) * 100;
    const clamped = Math.max(0, Math.min(100, pct));
    return `${clamped}%`;
  });

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const numeric = Number(target.value);
    if (Number.isNaN(numeric)) return;
    this.value.set(numeric);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const key = event.key;
    if (key !== 'PageUp' && key !== 'PageDown') return;
    event.preventDefault();
    const range = this.max() - this.min();
    const bigStep = Math.max(this.step(), Math.round(range / 10));
    const current = this.value();
    const next =
      key === 'PageUp'
        ? Math.min(this.max(), current + bigStep)
        : Math.max(this.min(), current - bigStep);
    this.value.set(next);
  }
}
