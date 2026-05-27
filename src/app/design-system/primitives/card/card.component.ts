import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type FbCardVariant = 'filled' | 'outlined';
export type FbCardActionsAlign = 'start' | 'end' | 'space-between';

@Component({
  selector: 'fb-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    '[attr.data-variant]': 'variant()',
    '[class.fb-card--outlined]': "variant() === 'outlined'",
    '[class.fb-card--filled]': "variant() === 'filled'"
  },
  styles: [
    `
      :host {
        display: block;
        background: var(--color-surface);
        color: var(--color-text);
        border-radius: var(--radius-lg);
        font-family: var(--font-family-sans);
        overflow: hidden;
      }
      :host(.fb-card--outlined) {
        border: 1px solid var(--color-border);
      }
      :host(.fb-card--filled) {
        background: var(--color-surface-raised);
      }
    `
  ]
})
export class FbCardComponent {
  readonly variant = input<FbCardVariant>('filled');
}

@Component({
  selector: 'fb-card-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fb-card-header__text">
      <div class="fb-card-header__title">
        <ng-content select="[fbCardTitle]"></ng-content>
      </div>
      <div class="fb-card-header__subtitle">
        <ng-content select="[fbCardSubtitle]"></ng-content>
      </div>
    </div>
    <div class="fb-card-header__actions">
      <ng-content select="[fbCardHeaderActions]"></ng-content>
    </div>
    <ng-content></ng-content>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-md);
        border-bottom: 1px solid var(--color-border);
      }
      .fb-card-header__text {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
      }
      .fb-card-header__title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        line-height: var(--line-height-tight);
      }
      .fb-card-header__title:empty {
        display: none;
      }
      .fb-card-header__subtitle {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        line-height: var(--line-height-normal);
      }
      .fb-card-header__subtitle:empty {
        display: none;
      }
      .fb-card-header__actions {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        flex: 0 0 auto;
      }
      .fb-card-header__actions:empty {
        display: none;
      }
    `
  ]
})
export class FbCardHeaderComponent {}

@Component({
  selector: 'fb-card-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styles: [
    `
      :host {
        display: block;
        padding: var(--space-md);
        font-size: var(--font-size-base);
        line-height: var(--line-height-normal);
      }
    `
  ]
})
export class FbCardContentComponent {}

@Component({
  selector: 'fb-card-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    '[attr.data-align]': 'align()'
  },
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-md);
        border-top: 1px solid var(--color-border);
      }
      :host([data-align='start']) {
        justify-content: flex-start;
      }
      :host([data-align='end']) {
        justify-content: flex-end;
      }
      :host([data-align='space-between']) {
        justify-content: space-between;
      }
    `
  ]
})
export class FbCardActionsComponent {
  readonly align = input<FbCardActionsAlign>('end');
}
