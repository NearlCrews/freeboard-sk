import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  input,
  model,
  output,
  signal,
  viewChildren
} from '@angular/core';
import { FbCheckboxComponent } from '../checkbox/checkbox.component';
import { FbIconComponent } from '../icon/icon.component';

/**
 * Node shape for `fb-tree` and `fb-tree-select`. Generic `T` carries the
 * consumer's domain payload through the `data` slot so the tree primitive
 * does not couple to any one resource model.
 */
export interface FbTreeNode<T = unknown> {
  readonly id: string;
  readonly label: string;
  readonly data?: T;
  readonly icon?: string;
  readonly disabled?: boolean;
  readonly children?: readonly FbTreeNode<T>[];
}

interface FlatTreeRow<T> {
  readonly node: FbTreeNode<T>;
  readonly level: number;
  readonly hasChildren: boolean;
  readonly parentId: string | null;
  readonly expanded: boolean;
}

/**
 * Flatten the visible subset of the tree given the current expansion
 * overrides map plus the default expansion flag. Hidden descendants of a
 * collapsed parent are skipped so the rendered list matches the visible
 * navigation order used for roving focus.
 */
function flattenVisible<T>(
  nodes: readonly FbTreeNode<T>[],
  overrides: ReadonlyMap<string, boolean>,
  defaultExpanded: boolean,
  level = 0,
  parentId: string | null = null,
  out: FlatTreeRow<T>[] = []
): FlatTreeRow<T>[] {
  for (const node of nodes) {
    const hasChildren = !!node.children && node.children.length > 0;
    const override = overrides.get(node.id);
    const isExpanded = hasChildren
      ? override !== undefined
        ? override
        : defaultExpanded
      : false;
    out.push({ node, level, hasChildren, parentId, expanded: isExpanded });
    if (hasChildren && isExpanded && node.children) {
      flattenVisible(
        node.children,
        overrides,
        defaultExpanded,
        level + 1,
        node.id,
        out
      );
    }
  }
  return out;
}

/**
 * Tier-3 Tree primitive.
 *
 * Nested tree of `FbTreeNode<T>` rendered with chevron expand/collapse and
 * WAI-ARIA `role="tree"` semantics. Roving tabindex moves focus with arrow
 * keys: ArrowUp/Down across visible rows, ArrowRight expands a collapsed
 * parent or descends to the first child, ArrowLeft collapses an expanded
 * parent or jumps to the parent row, Home and End jump to the first and
 * last visible nodes, and Enter activates the focused row.
 *
 * Chevron rotation drops to 0 ms under prefers-reduced-motion.
 */
@Component({
  selector: 'fb-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbIconComponent],
  template: `
    @for (row of rows(); track row.node.id; let i = $index) {
      <div
        #row
        class="fb-tree__row"
        role="treeitem"
        [attr.aria-level]="row.level + 1"
        [attr.aria-expanded]="row.hasChildren ? row.expanded : null"
        [attr.aria-disabled]="row.node.disabled || null"
        [attr.aria-selected]="ariaSelectedFor(row.node.id)"
        [attr.tabindex]="rovingIndex() === i ? 0 : -1"
        [attr.data-index]="i"
        [attr.data-id]="row.node.id"
        [attr.data-level]="row.level"
        [class.fb-tree__row--disabled]="!!row.node.disabled"
        [style.padding-inline-start]="indentFor(row.level)"
        (click)="onRowClick(row, i, $event)"
      >
        @if (row.hasChildren) {
          <button
            type="button"
            class="fb-tree__chevron-btn"
            tabindex="-1"
            [attr.aria-label]="
              row.expanded
                ? 'Collapse ' + row.node.label
                : 'Expand ' + row.node.label
            "
            (click)="onChevronClick(row, $event)"
          >
            <fb-icon
              class="fb-tree__chevron"
              [name]="row.expanded ? 'expand_more' : 'chevron_right'"
              size="sm"
              [attr.data-expanded]="row.expanded ? 'true' : 'false'"
            ></fb-icon>
          </button>
        } @else {
          <span class="fb-tree__chevron-spacer" aria-hidden="true"></span>
        }
        @if (row.node.icon) {
          <fb-icon
            class="fb-tree__icon"
            [name]="row.node.icon"
            size="sm"
            aria-hidden="true"
          ></fb-icon>
        }
        <span class="fb-tree__label">{{ row.node.label }}</span>
      </div>
    }
  `,
  host: {
    role: 'tree',
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
      .fb-tree__row {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        min-height: var(--touch-secondary);
        padding-block: var(--space-xs);
        padding-inline-end: var(--space-md);
        font-size: var(--font-size-base);
        line-height: var(--line-height-tight);
        cursor: pointer;
        user-select: none;
        transition: background-color 120ms ease;
      }
      .fb-tree__row:hover {
        background: var(--color-surface-raised);
      }
      .fb-tree__row:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-tree__row--disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-tree__chevron-btn {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        padding: 0;
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        border-radius: 4px;
      }
      .fb-tree__chevron-btn:hover {
        background: var(--color-surface-raised);
      }
      .fb-tree__chevron-btn:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-tree__chevron {
        transition: transform 160ms ease;
      }
      .fb-tree__chevron[data-expanded='true'] {
        /* The glyph itself swaps from chevron_right to expand_more, so the
           transform stays at 0deg; reserving the rule lets reduced-motion
           short-circuit cleanly. */
        transform: rotate(0deg);
      }
      .fb-tree__chevron-spacer {
        flex: 0 0 auto;
        width: 1.5rem;
        height: 1.5rem;
      }
      .fb-tree__icon {
        flex: 0 0 auto;
        color: var(--color-text-muted);
      }
      .fb-tree__label {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-tree__row,
        .fb-tree__chevron {
          transition: none;
        }
      }
    `
  ]
})
export class FbTreeComponent<T = unknown> {
  readonly nodes = input.required<readonly FbTreeNode<T>[]>();
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly defaultExpanded = input<boolean>(false);

  readonly activated = output<FbTreeNode<T>>();

  protected readonly expansionOverrides = signal<ReadonlyMap<string, boolean>>(
    new Map()
  );

  readonly rows = computed<readonly FlatTreeRow<T>[]>(() =>
    flattenVisible(
      this.nodes(),
      this.expansionOverrides(),
      this.defaultExpanded()
    )
  );

  readonly rovingIndex = signal<number>(0);

  private readonly rowRefs = viewChildren<ElementRef<HTMLDivElement>>('row');

  protected indentFor(level: number): string {
    return `calc(var(--space-md) + ${level} * 1.25rem)`;
  }

  protected ariaSelectedFor(_id: string): string | null {
    return null;
  }

  protected toggleExpanded(id: string, force?: boolean): void {
    const overrides = new Map(this.expansionOverrides());
    const currentRow = this.rows().find((r) => r.node.id === id);
    const currentOpen = currentRow?.expanded ?? this.defaultExpanded();
    const target = force === undefined ? !currentOpen : force;
    overrides.set(id, target);
    this.expansionOverrides.set(overrides);
  }

  protected onChevronClick(row: FlatTreeRow<T>, event: MouseEvent): void {
    event.stopPropagation();
    if (row.node.disabled) return;
    this.toggleExpanded(row.node.id);
  }

  protected onRowClick(
    row: FlatTreeRow<T>,
    index: number,
    _event: MouseEvent
  ): void {
    if (row.node.disabled) return;
    this.rovingIndex.set(index);
    this.focusRow(index);
    if (!row.hasChildren) {
      this.activated.emit(row.node);
    } else {
      this.toggleExpanded(row.node.id);
    }
  }

  @HostListener('focus')
  protected onHostFocus(): void {
    this.focusRow(this.rovingIndex());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const rows = this.rows();
    if (rows.length === 0) return;
    const navKeys = new Set([
      'ArrowDown',
      'ArrowUp',
      'ArrowRight',
      'ArrowLeft',
      'Home',
      'End',
      'Enter'
    ]);
    if (!navKeys.has(key)) return;
    const current = this.rovingIndex();
    const row = rows[current];
    if (!row) return;

    if (key === 'Enter') {
      event.preventDefault();
      if (row.node.disabled) return;
      if (row.hasChildren) {
        this.toggleExpanded(row.node.id);
      } else {
        this.activated.emit(row.node);
      }
      return;
    }

    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      const next = key === 'Home' ? 0 : rows.length - 1;
      this.rovingIndex.set(next);
      this.focusRow(next);
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      const step = key === 'ArrowDown' ? 1 : -1;
      let next = current + step;
      if (next < 0) next = 0;
      if (next > rows.length - 1) next = rows.length - 1;
      this.rovingIndex.set(next);
      this.focusRow(next);
      return;
    }

    if (key === 'ArrowRight') {
      event.preventDefault();
      if (row.hasChildren && !row.expanded) {
        this.toggleExpanded(row.node.id, true);
        return;
      }
      if (row.hasChildren && row.expanded) {
        const next = current + 1;
        if (next < rows.length) {
          this.rovingIndex.set(next);
          this.focusRow(next);
        }
      }
      return;
    }

    if (key === 'ArrowLeft') {
      event.preventDefault();
      if (row.hasChildren && row.expanded) {
        this.toggleExpanded(row.node.id, false);
        return;
      }
      if (row.parentId !== null) {
        const parentIdx = rows.findIndex((r) => r.node.id === row.parentId);
        if (parentIdx >= 0) {
          this.rovingIndex.set(parentIdx);
          this.focusRow(parentIdx);
        }
      }
      return;
    }
  }

  protected focusRow(index: number): void {
    const refs = this.rowRefs();
    refs[index]?.nativeElement.focus();
  }
}

/**
 * Tier-3 TreeSelect primitive.
 *
 * Extends `fb-tree` with a leading checkbox per row, multi-select via the
 * `selected` model (a list of node ids), and an optional cascade mode in
 * which checking a parent toggles its descendants and the parent reflects
 * partial child selection via `indeterminate` on the `fb-checkbox`. When
 * `cascade` is off, each row toggles independently and the parent stays a
 * plain two-state checkbox regardless of descendant state.
 *
 * Tradeoff on cascade semantics: parents become tri-state (true / false /
 * indeterminate) ONLY when `cascade` is enabled. Without cascade, parents
 * are pure two-state and ignore descendant selection entirely; this keeps
 * consumers that need per-node opt-in (e.g. WMS layer trees where some
 * groups are meaningful selections in their own right) free of surprise
 * cascade toggles.
 */
@Component({
  selector: 'fb-tree-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbCheckboxComponent, FbIconComponent],
  template: `
    @for (row of rows(); track row.node.id; let i = $index) {
      <div
        #row
        class="fb-tree__row"
        role="treeitem"
        [attr.aria-level]="row.level + 1"
        [attr.aria-expanded]="row.hasChildren ? row.expanded : null"
        [attr.aria-disabled]="row.node.disabled || null"
        [attr.aria-selected]="isChecked(row.node.id) ? 'true' : 'false'"
        [attr.tabindex]="rovingIndex() === i ? 0 : -1"
        [attr.data-index]="i"
        [attr.data-id]="row.node.id"
        [attr.data-level]="row.level"
        [class.fb-tree__row--disabled]="!!row.node.disabled"
        [style.padding-inline-start]="indentFor(row.level)"
        (click)="onRowClick(row, i, $event)"
      >
        @if (row.hasChildren) {
          <button
            type="button"
            class="fb-tree__chevron-btn"
            tabindex="-1"
            [attr.aria-label]="
              row.expanded
                ? 'Collapse ' + row.node.label
                : 'Expand ' + row.node.label
            "
            (click)="onChevronClick(row, $event)"
          >
            <fb-icon
              class="fb-tree__chevron"
              [name]="row.expanded ? 'expand_more' : 'chevron_right'"
              size="sm"
              [attr.data-expanded]="row.expanded ? 'true' : 'false'"
            ></fb-icon>
          </button>
        } @else {
          <span class="fb-tree__chevron-spacer" aria-hidden="true"></span>
        }
        <fb-checkbox
          class="fb-tree__check"
          [checked]="isChecked(row.node.id)"
          [indeterminate]="isIndeterminate(row.node.id)"
          [disabled]="!!row.node.disabled"
          [ariaLabel]="row.node.label"
          (checkedChange)="onCheckboxChange(row.node, $event)"
          (click)="onCheckboxClickStop($event)"
        ></fb-checkbox>
        @if (row.node.icon) {
          <fb-icon
            class="fb-tree__icon"
            [name]="row.node.icon"
            size="sm"
            aria-hidden="true"
          ></fb-icon>
        }
        <span class="fb-tree__label">{{ row.node.label }}</span>
      </div>
    }
  `,
  host: {
    role: 'tree',
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
      .fb-tree__row {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        min-height: var(--touch-secondary);
        padding-block: var(--space-xs);
        padding-inline-end: var(--space-md);
        font-size: var(--font-size-base);
        line-height: var(--line-height-tight);
        cursor: pointer;
        user-select: none;
        transition: background-color 120ms ease;
      }
      .fb-tree__row:hover {
        background: var(--color-surface-raised);
      }
      .fb-tree__row:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-tree__row--disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-tree__chevron-btn {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        padding: 0;
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        border-radius: 4px;
      }
      .fb-tree__chevron-btn:hover {
        background: var(--color-surface-raised);
      }
      .fb-tree__chevron-btn:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-tree__chevron {
        transition: transform 160ms ease;
      }
      .fb-tree__chevron-spacer {
        flex: 0 0 auto;
        width: 1.5rem;
        height: 1.5rem;
      }
      .fb-tree__check {
        flex: 0 0 auto;
      }
      .fb-tree__icon {
        flex: 0 0 auto;
        color: var(--color-text-muted);
      }
      .fb-tree__label {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-tree__row,
        .fb-tree__chevron {
          transition: none;
        }
      }
    `
  ]
})
export class FbTreeSelectComponent<T = unknown> {
  readonly nodes = input.required<readonly FbTreeNode<T>[]>();
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly defaultExpanded = input<boolean>(false);
  readonly cascade = input<boolean>(false);
  readonly selected = model<readonly string[]>([]);

  readonly activated = output<FbTreeNode<T>>();

  protected readonly expansionOverrides = signal<ReadonlyMap<string, boolean>>(
    new Map()
  );

  readonly rows = computed<readonly FlatTreeRow<T>[]>(() =>
    flattenVisible(
      this.nodes(),
      this.expansionOverrides(),
      this.defaultExpanded()
    )
  );

  readonly rovingIndex = signal<number>(0);

  /**
   * Memoised index of all descendant ids per parent id. Built once per
   * `nodes()` change so cascade toggles do not retraverse the tree on every
   * checkbox click.
   */
  private readonly descendantIndex = computed<
    ReadonlyMap<string, readonly string[]>
  >(() => {
    const map = new Map<string, string[]>();
    const walk = (list: readonly FbTreeNode<T>[]): string[] => {
      const collected: string[] = [];
      for (const n of list) {
        collected.push(n.id);
        if (n.children && n.children.length > 0) {
          const childIds = walk(n.children);
          map.set(n.id, childIds);
          collected.push(...childIds);
        } else {
          map.set(n.id, []);
        }
      }
      return collected;
    };
    walk(this.nodes());
    return map;
  });

  private readonly rowRefs = viewChildren<ElementRef<HTMLDivElement>>('row');

  isChecked(id: string): boolean {
    return this.selected().includes(id);
  }

  isIndeterminate(id: string): boolean {
    if (!this.cascade()) return false;
    const descendants = this.descendantIndex().get(id);
    if (!descendants || descendants.length === 0) return false;
    const sel = new Set(this.selected());
    let some = false;
    let all = true;
    for (const childId of descendants) {
      if (sel.has(childId)) {
        some = true;
      } else {
        all = false;
      }
    }
    return some && !all && !sel.has(id);
  }

  protected indentFor(level: number): string {
    return `calc(var(--space-md) + ${level} * 1.25rem)`;
  }

  protected toggleExpanded(id: string, force?: boolean): void {
    const overrides = new Map(this.expansionOverrides());
    const currentRow = this.rows().find((r) => r.node.id === id);
    const currentOpen = currentRow?.expanded ?? this.defaultExpanded();
    const target = force === undefined ? !currentOpen : force;
    overrides.set(id, target);
    this.expansionOverrides.set(overrides);
  }

  protected onChevronClick(row: FlatTreeRow<T>, event: MouseEvent): void {
    event.stopPropagation();
    if (row.node.disabled) return;
    this.toggleExpanded(row.node.id);
  }

  protected onRowClick(
    row: FlatTreeRow<T>,
    index: number,
    _event: MouseEvent
  ): void {
    if (row.node.disabled) return;
    this.rovingIndex.set(index);
    this.focusRow(index);
    if (row.hasChildren) {
      this.toggleExpanded(row.node.id);
    } else {
      this.activated.emit(row.node);
    }
  }

  protected onCheckboxClickStop(event: MouseEvent): void {
    event.stopPropagation();
  }

  protected onCheckboxChange(node: FbTreeNode<T>, next: boolean): void {
    if (node.disabled) return;
    this.applyToggle(node.id, next);
  }

  private applyToggle(id: string, next: boolean): void {
    const current = new Set(this.selected());
    if (this.cascade()) {
      const descendants = this.descendantIndex().get(id) ?? [];
      if (next) {
        current.add(id);
        for (const d of descendants) current.add(d);
      } else {
        current.delete(id);
        for (const d of descendants) current.delete(d);
      }
    } else {
      if (next) {
        current.add(id);
      } else {
        current.delete(id);
      }
    }
    this.selected.set([...current]);
  }

  @HostListener('focus')
  protected onHostFocus(): void {
    this.focusRow(this.rovingIndex());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const rows = this.rows();
    if (rows.length === 0) return;
    const navKeys = new Set([
      'ArrowDown',
      'ArrowUp',
      'ArrowRight',
      'ArrowLeft',
      'Home',
      'End',
      'Enter',
      ' '
    ]);
    if (!navKeys.has(key)) return;
    const current = this.rovingIndex();
    const row = rows[current];
    if (!row) return;

    if (key === 'Enter') {
      event.preventDefault();
      if (row.node.disabled) return;
      if (row.hasChildren) {
        this.toggleExpanded(row.node.id);
      } else {
        this.activated.emit(row.node);
      }
      return;
    }

    if (key === ' ') {
      event.preventDefault();
      if (row.node.disabled) return;
      this.applyToggle(row.node.id, !this.isChecked(row.node.id));
      return;
    }

    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      const next = key === 'Home' ? 0 : rows.length - 1;
      this.rovingIndex.set(next);
      this.focusRow(next);
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      const step = key === 'ArrowDown' ? 1 : -1;
      let next = current + step;
      if (next < 0) next = 0;
      if (next > rows.length - 1) next = rows.length - 1;
      this.rovingIndex.set(next);
      this.focusRow(next);
      return;
    }

    if (key === 'ArrowRight') {
      event.preventDefault();
      if (row.hasChildren && !row.expanded) {
        this.toggleExpanded(row.node.id, true);
        return;
      }
      if (row.hasChildren && row.expanded) {
        const next = current + 1;
        if (next < rows.length) {
          this.rovingIndex.set(next);
          this.focusRow(next);
        }
      }
      return;
    }

    if (key === 'ArrowLeft') {
      event.preventDefault();
      if (row.hasChildren && row.expanded) {
        this.toggleExpanded(row.node.id, false);
        return;
      }
      if (row.parentId !== null) {
        const parentIdx = rows.findIndex((r) => r.node.id === row.parentId);
        if (parentIdx >= 0) {
          this.rovingIndex.set(parentIdx);
          this.focusRow(parentIdx);
        }
      }
      return;
    }
  }

  protected focusRow(index: number): void {
    const refs = this.rowRefs();
    refs[index]?.nativeElement.focus();
  }
}
