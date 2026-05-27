import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type FbToolbarDensity = 'comfortable' | 'dense';

@Component({
  selector: 'fb-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fb-toolbar__leading">
      <ng-content select="[fbToolbarLeading]"></ng-content>
    </div>
    <div class="fb-toolbar__title">
      <ng-content select="[fbToolbarTitle]"></ng-content>
    </div>
    <div class="fb-toolbar__default">
      <ng-content></ng-content>
    </div>
    <div class="fb-toolbar__actions">
      <ng-content select="[fbToolbarActions]"></ng-content>
    </div>
  `,
  host: {
    role: 'toolbar',
    '[attr.data-density]': 'density()'
  },
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        width: 100%;
        background: var(--color-surface-raised);
        color: var(--color-text);
        padding: 0 var(--space-md);
        font-family: var(--font-family-sans);
        box-sizing: border-box;
      }
      :host([data-density='comfortable']) {
        min-height: 44px;
      }
      :host([data-density='dense']) {
        min-height: 40px;
      }
      .fb-toolbar__leading {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        flex: 0 0 auto;
      }
      .fb-toolbar__leading:empty {
        display: none;
      }
      .fb-toolbar__title {
        flex: 1 1 auto;
        display: flex;
        justify-content: center;
        align-items: center;
        min-width: 0;
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        text-align: center;
      }
      .fb-toolbar__title:empty {
        display: none;
      }
      .fb-toolbar__default {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
      }
      .fb-toolbar__default:empty {
        display: none;
      }
      .fb-toolbar__actions {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        flex: 0 0 auto;
      }
      .fb-toolbar__actions:empty {
        display: none;
      }
    `
  ]
})
export class FbToolbarComponent {
  readonly density = input<FbToolbarDensity>('comfortable');
}
