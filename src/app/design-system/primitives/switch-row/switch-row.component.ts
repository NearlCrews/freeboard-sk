import {
  ChangeDetectionStrategy,
  Component,
  input,
  model
} from '@angular/core';

import { FbIconComponent } from '../icon/icon.component';
import { FbSwitchComponent } from '../switch/switch.component';

export type FbSwitchRowDensity = 'comfortable' | 'compact';

/**
 * Tier-3 SwitchRow primitive.
 *
 * Full-width labeled row with an optional leading icon, projected label
 * content, and a trailing `fb-switch`. Used in lists (AIS targets, charts,
 * alerts) where the toggle owns the row's tap target.
 *
 * A11y posture:
 *  - Host is `role="group"` with the optional `ariaLabel`, so the inner
 *    switch's `aria-checked` is announced under a labeled grouping.
 *  - The inner `fb-switch` keeps its own `role="switch"` semantics and
 *    receives the `ariaLabel` so screen readers announce the toggle target.
 *  - Clicking anywhere on the row toggles `checked` unless the click
 *    landed on the inner switch (which already toggles itself).
 *  - Disabled rows block the row click and pass `disabled` to the inner
 *    switch.
 */
@Component({
  selector: 'fb-switch-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbIconComponent, FbSwitchComponent],
  template: `
    @if (icon()) {
      <fb-icon
        class="fb-switch-row__leading"
        [name]="icon() ?? ''"
        size="md"
      ></fb-icon>
    }
    <span class="fb-switch-row__label"><ng-content></ng-content></span>
    <fb-switch
      class="fb-switch-row__switch"
      [(checked)]="checked"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel() ?? ''"
      (click)="onSwitchClick($event)"
    ></fb-switch>
  `,
  host: {
    role: 'group',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-density]': 'density()',
    '[class.fb-switch-row--disabled]': 'disabled()',
    '(click)': 'onRowClick($event)'
  },
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-md) var(--space-lg);
        background: transparent;
        color: var(--color-text);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-base);
        line-height: var(--line-height-tight);
        min-height: var(--touch-secondary);
        cursor: pointer;
        user-select: none;
        transition: background-color 120ms ease;
      }
      :host([data-density='compact']) {
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
      }
      :host(:hover) {
        background: var(--color-surface-raised);
      }
      :host(:focus-within) {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      :host(.fb-switch-row--disabled) {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-switch-row__leading {
        flex: 0 0 auto;
        color: var(--color-text-muted);
      }
      .fb-switch-row__label {
        flex: 1 1 auto;
        min-width: 0;
      }
      .fb-switch-row__switch {
        flex: 0 0 auto;
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          transition: none;
        }
      }
    `
  ]
})
export class FbSwitchRowComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly icon = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly density = input<FbSwitchRowDensity>('comfortable');

  onRowClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const target = event.target as HTMLElement | null;
    // Click inside the inner fb-switch already toggles via its own handler.
    if (target?.closest('.fb-switch-row__switch')) {
      return;
    }
    this.checked.update((v) => !v);
  }

  onSwitchClick(event: MouseEvent): void {
    // Stop the row's host listener from double-toggling after the inner
    // switch handled the click itself.
    event.stopPropagation();
  }
}
