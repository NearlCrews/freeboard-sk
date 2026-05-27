import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type FbDividerOrientation = 'horizontal' | 'vertical';

@Component({
  selector: 'fb-divider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (orientation() === 'vertical') {
      <span
        class="fb-divider fb-divider--vertical"
        role="separator"
        aria-orientation="vertical"
      ></span>
    } @else {
      <hr class="fb-divider fb-divider--horizontal" />
    }
  `,
  host: {
    '[attr.data-orientation]': 'orientation()'
  },
  styles: [
    `
      :host {
        display: contents;
      }
      .fb-divider {
        background: var(--color-border);
        border: 0;
        flex: 0 0 auto;
      }
      .fb-divider--horizontal {
        display: block;
        width: 100%;
        height: 1px;
        margin: var(--space-sm) 0;
      }
      .fb-divider--vertical {
        display: inline-block;
        width: 1px;
        align-self: stretch;
        min-height: 1em;
        margin: 0 var(--space-sm);
      }
    `
  ]
})
export class FbDividerComponent {
  readonly orientation = input<FbDividerOrientation>('horizontal');
}
