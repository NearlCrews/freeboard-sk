import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input
} from '@angular/core';

@Component({
  selector: 'fb-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (indeterminate()) {
      <progress
        class="fb-progress fb-progress--indeterminate"
        role="progressbar"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="max()"
      ></progress>
    } @else {
      <progress
        class="fb-progress"
        role="progressbar"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="max()"
        [attr.aria-valuenow]="clampedValue()"
        [value]="clampedValue()"
        [max]="max()"
      ></progress>
    }
  `,
  host: {
    '[attr.data-indeterminate]': "indeterminate() ? 'true' : null"
  },
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .fb-progress {
        appearance: none;
        -webkit-appearance: none;
        display: block;
        width: 100%;
        height: 4px;
        border: 0;
        border-radius: 2px;
        background: var(--color-surface-raised);
        color: var(--color-primary);
        overflow: hidden;
      }
      .fb-progress::-webkit-progress-bar {
        background: var(--color-surface-raised);
        border-radius: 2px;
      }
      .fb-progress::-webkit-progress-value {
        background: var(--color-primary);
        border-radius: 2px;
      }
      .fb-progress::-moz-progress-bar {
        background: var(--color-primary);
        border-radius: 2px;
      }
      .fb-progress--indeterminate {
        background: linear-gradient(
            90deg,
            var(--color-surface-raised) 0%,
            var(--color-primary) 50%,
            var(--color-surface-raised) 100%
          )
          0 0 / 200% 100% no-repeat;
        animation: fb-progress-slide 1200ms linear infinite;
      }
      .fb-progress--indeterminate::-webkit-progress-bar {
        background: transparent;
      }
      @keyframes fb-progress-slide {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: -200% 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-progress--indeterminate {
          animation-duration: 0ms;
        }
      }
    `
  ]
})
export class FbProgressBarComponent {
  readonly value = input<number>(0);
  readonly max = input<number>(100);
  // booleanAttribute coerces the bare-attribute form `<fb-progress-bar
  // indeterminate>` to true; without it the empty string reads as falsy
  // and the indeterminate <progress> never renders. Same bug pattern as
  // fb-list-item; every consumer of this primitive uses bare-attribute.
  readonly indeterminate = input<boolean, unknown>(false, {
    transform: booleanAttribute
  });

  readonly clampedValue = computed(() => {
    const v = this.value();
    const m = this.max();
    if (Number.isNaN(v)) return 0;
    if (v < 0) return 0;
    if (v > m) return m;
    return v;
  });
}
