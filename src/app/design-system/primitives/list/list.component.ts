import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  booleanAttribute,
  computed,
  input,
  model,
  output,
  viewChildren
} from '@angular/core';
import { FbIconComponent } from '../icon/icon.component';

export type FbListDensity = 'comfortable' | 'compact';

export interface FbSelectionListOption {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly icon?: string;
}

/**
 * Tier-3 List primitive.
 *
 * Token-driven shell for vertical lists. Renders `role="list"` on the host
 * with default `comfortable` density; `compact` tightens row padding for
 * dense table-like sites (region picker, wmts dialog).
 */
@Component({
  selector: 'fb-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    role: 'list',
    '[attr.data-density]': 'density()'
  },
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        background: var(--color-surface);
        color: var(--color-text);
        font-family: var(--font-family-sans);
        padding: var(--space-xs) 0;
        margin: 0;
      }
      :host([data-density='compact']) {
        padding: 0;
      }
    `
  ]
})
export class FbListComponent {
  readonly density = input<FbListDensity>('comfortable');
}

/**
 * Tier-3 NavList primitive.
 *
 * Wraps a list in a `<nav>` landmark so consumers (sidenav navigation,
 * dock left-rail) get the WAI-ARIA navigation role plus an inner
 * `role="list"`. Visually identical to `fb-list`.
 */
@Component({
  selector: 'fb-nav-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fb-nav-list__list" role="list">
      <ng-content></ng-content>
    </div>
  `,
  host: {
    role: 'navigation',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-density]': 'density()'
  },
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        background: var(--color-surface);
        color: var(--color-text);
        font-family: var(--font-family-sans);
      }
      .fb-nav-list__list {
        display: flex;
        flex-direction: column;
        padding: var(--space-xs) 0;
      }
      :host([data-density='compact']) .fb-nav-list__list {
        padding: 0;
      }
    `
  ]
})
export class FbNavListComponent {
  readonly density = input<FbListDensity>('comfortable');
  readonly ariaLabel = input<string>('');
}

/**
 * Tier-3 ListItem primitive.
 *
 * Renders a single row with three optional slots:
 *   [fbListItemLeading]  left affordance (icon, avatar)
 *   default              primary text
 *   [fbListItemSubtext]  secondary line below primary
 *   [fbListItemTrailing] right affordance (button, badge)
 *
 * When `interactive` is true the row becomes a tap target: pointer cursor,
 * focus ring, `tabindex=0`, Enter/Space emit `activated`, and the touch
 * floor matches `--touch-secondary` (44 px).
 */
@Component({
  selector: 'fb-list-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="fb-list-item__leading">
      <ng-content select="[fbListItemLeading]"></ng-content>
    </span>
    <span class="fb-list-item__text">
      <span class="fb-list-item__primary">
        <ng-content></ng-content>
      </span>
      <span class="fb-list-item__subtext">
        <ng-content select="[fbListItemSubtext]"></ng-content>
      </span>
    </span>
    <span class="fb-list-item__trailing">
      <ng-content select="[fbListItemTrailing]"></ng-content>
    </span>
  `,
  host: {
    role: 'listitem',
    '[attr.aria-selected]': 'ariaSelectedAttr()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.tabindex]': 'tabIndexAttr()',
    '[class.fb-list-item--interactive]': 'interactive()',
    '[class.fb-list-item--selected]': 'selected()',
    '[class.fb-list-item--disabled]': 'disabled()',
    '(keydown)': 'onKeyDown($event)',
    '(click)': 'onClick($event)'
  },
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-lg);
        font-size: var(--font-size-base);
        line-height: var(--line-height-tight);
        color: var(--color-text);
        background: transparent;
        transition: background-color 120ms ease;
      }
      :host(.fb-list-item--interactive) {
        cursor: pointer;
        min-height: var(--touch-secondary);
        user-select: none;
      }
      :host(.fb-list-item--interactive:hover) {
        background: var(--color-surface-raised);
      }
      :host(.fb-list-item--interactive:focus-visible) {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      :host(.fb-list-item--selected) {
        background: var(--color-surface-raised);
        font-weight: var(--font-weight-medium);
      }
      :host(.fb-list-item--disabled) {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-list-item__leading,
      .fb-list-item__trailing {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .fb-list-item__leading:empty,
      .fb-list-item__trailing:empty {
        display: none;
      }
      .fb-list-item__text {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
      }
      .fb-list-item__primary {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .fb-list-item__subtext {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        line-height: var(--line-height-normal);
      }
      .fb-list-item__subtext:empty {
        display: none;
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          transition: none;
        }
      }
    `
  ]
})
export class FbListItemComponent {
  // booleanAttribute coerces the bare-attribute form `<fb-list-item
  // interactive>` to true; without it, signal inputs see "" (falsy).
  readonly selected = input<boolean, unknown>(false, {
    transform: booleanAttribute
  });
  readonly disabled = input<boolean, unknown>(false, {
    transform: booleanAttribute
  });
  readonly interactive = input<boolean, unknown>(false, {
    transform: booleanAttribute
  });

  readonly activated = output<KeyboardEvent | MouseEvent>();

  readonly ariaSelectedAttr = computed(() => {
    if (!this.interactive()) return null;
    return this.selected() ? 'true' : 'false';
  });

  readonly tabIndexAttr = computed(() => {
    if (!this.interactive() || this.disabled()) return null;
    return '0';
  });

  onClick(event: MouseEvent): void {
    if (!this.interactive() || this.disabled()) return;
    this.activated.emit(event);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.interactive() || this.disabled()) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.activated.emit(event);
  }
}

/**
 * Tier-3 SelectionList primitive.
 *
 * Multi-select list rendered as `role="listbox"` with
 * `aria-multiselectable="true"`. Each option is a roving-tabindex row with
 * a check/box glyph in the trailing slot. Arrow keys move focus, Space or
 * Enter toggle. Disabled options are skipped during keyboard navigation.
 */
@Component({
  selector: 'fb-selection-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbIconComponent],
  template: `
    @for (opt of options(); track opt.id; let i = $index) {
      <div
        #option
        class="fb-selection-list__item"
        role="option"
        [attr.aria-selected]="isSelected(opt.id) ? 'true' : 'false'"
        [attr.aria-disabled]="opt.disabled || null"
        [attr.tabindex]="rovingIndex() === i ? 0 : -1"
        [attr.data-index]="i"
        [class.fb-selection-list__item--selected]="isSelected(opt.id)"
        [class.fb-selection-list__item--disabled]="!!opt.disabled"
        (click)="onToggle(opt, i)"
      >
        @if (opt.icon) {
          <fb-icon
            class="fb-selection-list__leading"
            [name]="opt.icon"
            size="sm"
          ></fb-icon>
        }
        <span class="fb-selection-list__label">{{ opt.label }}</span>
        <fb-icon
          class="fb-selection-list__trailing"
          [name]="isSelected(opt.id) ? 'check_box' : 'check_box_outline_blank'"
          size="sm"
          aria-hidden="true"
        ></fb-icon>
      </div>
    }
  `,
  host: {
    role: 'listbox',
    'aria-multiselectable': 'true',
    '[attr.aria-label]': 'ariaLabel() || null',
    '(keydown)': 'onKeyDown($event)'
  },
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        background: var(--color-surface);
        color: var(--color-text);
        font-family: var(--font-family-sans);
        padding: var(--space-xs) 0;
        outline: none;
      }
      .fb-selection-list__item {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        min-height: var(--touch-secondary);
        padding: var(--space-sm) var(--space-lg);
        font-size: var(--font-size-base);
        line-height: var(--line-height-tight);
        cursor: pointer;
        user-select: none;
        transition: background-color 120ms ease;
      }
      .fb-selection-list__item:hover {
        background: var(--color-surface-raised);
      }
      .fb-selection-list__item:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-selection-list__item--selected {
        background: var(--color-surface-raised);
        font-weight: var(--font-weight-medium);
      }
      .fb-selection-list__item--disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-selection-list__leading {
        flex: 0 0 auto;
      }
      .fb-selection-list__label {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .fb-selection-list__trailing {
        flex: 0 0 auto;
        color: var(--color-text-muted);
      }
      .fb-selection-list__item--selected .fb-selection-list__trailing {
        color: var(--color-primary);
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-selection-list__item {
          transition: none;
        }
      }
    `
  ]
})
export class FbSelectionListComponent {
  readonly options = input.required<readonly FbSelectionListOption[]>();
  readonly values = model<readonly string[]>([]);
  readonly ariaLabel = input<string>('');

  readonly rovingIndex = model<number>(0);

  private readonly optionRefs =
    viewChildren<ElementRef<HTMLDivElement>>('option');

  private readonly enabledIndices = computed(() => {
    const out: number[] = [];
    this.options().forEach((opt, idx) => {
      if (!opt.disabled) out.push(idx);
    });
    return out;
  });

  isSelected(id: string): boolean {
    return this.values().includes(id);
  }

  onToggle(opt: FbSelectionListOption, index: number): void {
    if (opt.disabled) return;
    this.rovingIndex.set(index);
    const current = this.values();
    const next = current.includes(opt.id)
      ? current.filter((v) => v !== opt.id)
      : [...current, opt.id];
    this.values.set(next);
  }

  @HostListener('focus')
  onFocus(): void {
    const refs = this.optionRefs();
    const target = refs[this.rovingIndex()];
    target?.nativeElement.focus();
  }

  onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const opts = this.options();
    const enabled = this.enabledIndices();
    if (enabled.length === 0) return;

    if (
      key === 'ArrowDown' ||
      key === 'ArrowUp' ||
      key === 'Home' ||
      key === 'End'
    ) {
      event.preventDefault();
      const current = this.rovingIndex();
      const pos = enabled.indexOf(current);
      let nextIdx: number;
      if (key === 'Home') {
        nextIdx = enabled[0] ?? current;
      } else if (key === 'End') {
        nextIdx = enabled[enabled.length - 1] ?? current;
      } else if (key === 'ArrowDown') {
        const nextPos = pos === -1 ? 0 : (pos + 1) % enabled.length;
        nextIdx = enabled[nextPos] ?? current;
      } else {
        const nextPos =
          pos === -1
            ? enabled.length - 1
            : (pos - 1 + enabled.length) % enabled.length;
        nextIdx = enabled[nextPos] ?? current;
      }
      this.rovingIndex.set(nextIdx);
      const refs = this.optionRefs();
      refs[nextIdx]?.nativeElement.focus();
      return;
    }

    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      const idx = this.rovingIndex();
      const opt = opts[idx];
      if (opt) this.onToggle(opt, idx);
    }
  }
}
