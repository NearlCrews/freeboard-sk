import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'fb-tooltip-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ text() }}`,
  host: {
    role: 'tooltip',
    '[attr.id]': 'id() || null'
  },
  styles: [
    `
      :host {
        display: block;
        max-width: 240px;
        padding: var(--space-xs) var(--space-sm);
        border-radius: var(--radius-sm);
        background: var(--color-text);
        color: var(--color-surface);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        line-height: var(--line-height-tight);
        white-space: normal;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        pointer-events: none;
        opacity: 0;
        animation: fb-tooltip-in 120ms ease forwards;
      }
      @keyframes fb-tooltip-in {
        to {
          opacity: 1;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
          opacity: 1;
        }
      }
    `
  ]
})
export class FbTooltipBubbleComponent {
  readonly text = input<string>('');
  readonly id = input<string>('');
}
