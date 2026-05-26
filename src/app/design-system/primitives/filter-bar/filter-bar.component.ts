import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output
} from '@angular/core';

export interface FbFilterChip {
  readonly key: string;
  readonly label: string;
  readonly active: boolean;
}

/**
 * Tier-2 primitive: search + filter chip bar.
 *
 * `query` is a `model<string>()` so consumers can do two-way binding via
 * `[(query)]` or one-way reads via `[query]` + `(queryChange)`. The search
 * input is a native `<input type="search">` so it inherits the browser's
 * clear affordance, IME composition, and password-manager exclusion.
 *
 * Chips are buttons (not toggles via aria-pressed alone) because they
 * represent a tri-state filter pattern: each chip is a discrete additive
 * filter the user can toggle, and `chipToggle` emits the chip key so the
 * parent owns the active-set logic. The component does NOT mutate the
 * incoming `chips` array, in line with Angular signal-input contracts.
 */
@Component({
  selector: 'fb-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fb-filter-bar__search">
      <input
        type="search"
        class="fb-filter-bar__input"
        [value]="query()"
        [attr.aria-label]="searchLabel()"
        [attr.placeholder]="placeholder()"
        (input)="onInput($event)"
      />
    </div>
    @if (chips().length > 0) {
      <div
        class="fb-filter-bar__chips"
        role="group"
        [attr.aria-label]="chipsLabel()"
      >
        @for (chip of chips(); track chip.key) {
          <button
            type="button"
            class="fb-filter-bar__chip"
            [attr.aria-pressed]="chip.active"
            [attr.data-active]="chip.active ? '' : null"
            (click)="onChipClick(chip.key)"
          >
            {{ chip.label }}
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-sm) var(--space-lg);
        background: var(--ds-surface-1, var(--color-surface));
        border-bottom: 1px solid var(--color-border);
        font-family: var(--font-family-sans);
      }
      .fb-filter-bar__search {
        flex: 1 1 auto;
        min-width: 0;
      }
      .fb-filter-bar__input {
        width: 100%;
        min-height: var(--touch-secondary);
        padding: var(--space-xs) var(--space-md);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: var(--ds-surface-2, var(--color-surface-raised));
        color: var(--color-text);
        font-family: inherit;
        font-size: var(--font-size-base);
        line-height: var(--line-height-tight);
      }
      .fb-filter-bar__input::placeholder {
        color: var(--color-text-muted);
      }
      .fb-filter-bar__input:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }
      .fb-filter-bar__chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-xs);
        flex: 0 0 auto;
      }
      .fb-filter-bar__chip {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: var(--space-xs) var(--space-md);
        border: 1px solid var(--color-border);
        border-radius: 999px;
        background: transparent;
        color: var(--color-text);
        font-family: inherit;
        font-size: var(--font-size-sm);
        line-height: var(--line-height-tight);
        cursor: pointer;
        user-select: none;
        transition:
          background-color 120ms ease,
          border-color 120ms ease,
          color 120ms ease;
      }
      .fb-filter-bar__chip:hover {
        background: var(--ds-surface-2, var(--color-surface-raised));
      }
      .fb-filter-bar__chip:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }
      .fb-filter-bar__chip[data-active] {
        background: var(--color-accent);
        color: var(--color-on-accent);
        border-color: var(--color-accent);
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-filter-bar__chip {
          transition: none;
        }
      }
    `
  ]
})
export class FbFilterBarComponent {
  readonly query = model<string>('');
  readonly chips = input<readonly FbFilterChip[]>([]);
  readonly placeholder = input<string>('Search');
  readonly searchLabel = input<string>('Search');
  readonly chipsLabel = input<string>('Filters');

  readonly chipToggle = output<string>();

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.query.set(input.value);
  }

  onChipClick(key: string): void {
    this.chipToggle.emit(key);
  }
}
