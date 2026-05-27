import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type FbHintVariant = 'info' | 'warn' | 'error' | 'success';

@Component({
  selector: 'fb-hint',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    role: 'note',
    '[attr.data-variant]': 'variant()'
  },
  styles: [
    `
      :host {
        display: inline;
        font-family: var(--font-family-sans);
        font-size: var(--font-size-sm);
        line-height: var(--line-height-normal);
        color: var(--color-text-muted);
      }
      :host([data-variant='warn']) {
        color: var(--color-warning);
      }
      :host([data-variant='error']) {
        color: var(--color-error);
      }
      :host([data-variant='success']) {
        color: var(--color-success);
      }
    `
  ]
})
export class FbHintComponent {
  readonly variant = input<FbHintVariant>('info');
}
