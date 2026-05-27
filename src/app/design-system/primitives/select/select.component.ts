import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  HostListener,
  computed,
  contentChild,
  input,
  model,
  signal,
  viewChild
} from '@angular/core';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { FbIconComponent } from '../icon/icon.component';

export interface FbSelectOption<T extends string | number = string> {
  readonly id: T;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * Marker directive for projecting a custom trigger label into `fb-select`.
 * Place on any element inside `<fb-select>` to override the default
 * selected-label rendering inside the trigger button.
 */
@Directive({
  selector: '[fb-select-trigger]',
  standalone: true
})
export class FbSelectTriggerDirective {}

/**
 * Tier-2 form Select primitive.
 *
 * Dropdown using CDK Overlay (NOT MatSelect). The trigger is a token-driven
 * button, the menu is a token-driven listbox of options, and selection
 * updates the `value` model (or `values` model when `multiple` is true).
 *
 * Generic over the option-id type so callers can use string or number ids.
 * Default `T = string` keeps existing call sites source-compatible.
 *
 * Multi-mode (`multiple=true`) uses a separate `values` signal model rather
 * than overloading `value`, so the typed API at the call site is clean:
 * single-select stays `T | null`, multi-select is `readonly T[]`. The
 * single-select `value` signal is ignored while `multiple` is true.
 *
 * A11y posture:
 *  - Trigger has role=combobox, aria-haspopup=listbox, aria-expanded, and
 *    aria-controls pointing at the listbox id.
 *  - Listbox has role=listbox; options have role=option + aria-selected.
 *    When `multiple` is true, listbox also has aria-multiselectable="true".
 *  - Keyboard (single): ArrowDown/ArrowUp move active option, Enter selects
 *    and closes, Escape closes without selecting. While closed, ArrowDown
 *    opens. Home/End jump.
 *  - Keyboard (multi): Space and Enter toggle, Escape closes. No dismiss
 *    on pick so the user can toggle several entries.
 *  - aria-activedescendant is set on the listbox to the active option id
 *    so screen readers track the highlight without moving focus off the
 *    trigger.
 *
 * Custom trigger slot:
 *  - Project content into `[fb-select-trigger]` to replace the default
 *    selected-label rendering inside the trigger button. The placeholder
 *    still applies when nothing is selected.
 */
@Component({
  selector: 'fb-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, FbIconComponent],
  template: `
    <button
      #trigger
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      type="button"
      class="fb-select__trigger"
      [class.fb-select__trigger--invalid]="invalid()"
      role="combobox"
      aria-haspopup="listbox"
      [attr.aria-expanded]="open() ? 'true' : 'false'"
      [attr.aria-controls]="listboxId()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-invalid]="invalid() || null"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      <span class="fb-select__value">
        @if (hasSelection()) {
          @if (customTrigger()) {
            <ng-content select="[fb-select-trigger]"></ng-content>
          } @else {
            {{ triggerLabel() }}
          }
        } @else {
          {{ placeholder() }}
        }
      </span>
      <fb-icon
        class="fb-select__chevron"
        name="arrow_drop_down"
        size="sm"
      ></fb-icon>
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      [cdkConnectedOverlayPositions]="overlayPositions"
      [cdkConnectedOverlayPanelClass]="'fb-select-panel'"
      (backdropClick)="close()"
      (detach)="close()"
    >
      <ul
        [id]="listboxId()"
        class="fb-select__listbox"
        role="listbox"
        [attr.aria-multiselectable]="multiple() ? 'true' : null"
        [attr.aria-activedescendant]="activeOptionId()"
      >
        @for (opt of options(); track opt.id; let i = $index) {
          <li
            [id]="optionDomId(opt.id)"
            class="fb-select__option"
            [class.fb-select__option--active]="i === activeIndex()"
            [class.fb-select__option--selected]="isOptionSelected(opt.id)"
            role="option"
            [attr.aria-selected]="isOptionSelected(opt.id) ? 'true' : 'false'"
            [attr.aria-disabled]="opt.disabled || null"
            (click)="selectOption(opt)"
            (mouseenter)="setActive(i)"
          >
            {{ opt.label }}
          </li>
        }
      </ul>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        width: 100%;
        position: relative;
      }
      .fb-select__trigger {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-sm);
        width: 100%;
        min-height: var(--touch-secondary);
        padding: var(--space-sm) var(--space-md);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: var(--color-surface);
        color: var(--color-text);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-base);
        text-align: left;
        cursor: pointer;
        transition:
          border-color 120ms ease,
          box-shadow 120ms ease;
      }
      .fb-select__trigger:focus-visible {
        outline: none;
        border-color: var(--color-focus-ring);
        box-shadow: 0 0 0 2px var(--color-focus-ring);
      }
      .fb-select__trigger:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-select__trigger--invalid {
        border-color: var(--color-error);
      }
      .fb-select__trigger--invalid:focus-visible {
        box-shadow: 0 0 0 2px var(--color-error);
      }
      .fb-select__value {
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
      }
      .fb-select__chevron {
        flex: 0 0 auto;
      }
      .fb-select__listbox {
        margin: 0;
        padding: var(--space-xs) 0;
        list-style: none;
        min-width: 160px;
        max-height: 320px;
        overflow-y: auto;
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-base);
      }
      .fb-select__option {
        display: flex;
        align-items: center;
        min-height: var(--touch-secondary);
        padding: var(--space-sm) var(--space-md);
        cursor: pointer;
      }
      .fb-select__option--active {
        background: var(--color-surface-raised);
      }
      .fb-select__option--selected {
        font-weight: var(--font-weight-medium);
      }
      .fb-select__option[aria-disabled='true'] {
        cursor: not-allowed;
        opacity: 0.55;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-select__trigger {
          transition: none;
        }
      }
    `
  ]
})
export class FbSelectComponent<T extends string | number = string> {
  readonly name = input.required<string>();
  readonly options = input.required<readonly FbSelectOption<T>[]>();
  readonly value = model<T | null>(null);
  readonly values = model<readonly T[]>([]);
  readonly multiple = input<boolean>(false);
  readonly placeholder = input<string>('Select...');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  readonly open = signal<boolean>(false);
  readonly activeIndex = signal<number>(-1);

  private readonly trigger =
    viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly customTrigger = contentChild(FbSelectTriggerDirective);

  readonly overlayPositions = [
    {
      originX: 'start' as const,
      originY: 'bottom' as const,
      overlayX: 'start' as const,
      overlayY: 'top' as const,
      offsetY: 4
    },
    {
      originX: 'start' as const,
      originY: 'top' as const,
      overlayX: 'start' as const,
      overlayY: 'bottom' as const,
      offsetY: -4
    }
  ];

  readonly hasSelection = computed(() => {
    if (this.multiple()) return this.values().length > 0;
    return this.value() !== null;
  });

  readonly triggerLabel = computed(() => {
    if (this.multiple()) return this.multiTriggerLabel();
    const v = this.value();
    if (v === null) return '';
    return this.options().find((o) => o.id === v)?.label ?? '';
  });

  listboxId(): string {
    return `${this.name()}-listbox`;
  }

  optionDomId(id: T): string {
    return `${this.name()}-opt-${String(id)}`;
  }

  isOptionSelected(id: T): boolean {
    if (this.multiple()) return this.values().includes(id);
    return this.value() === id;
  }

  activeOptionId(): string | null {
    const idx = this.activeIndex();
    if (idx < 0) return null;
    const opt = this.options()[idx];
    return opt ? this.optionDomId(opt.id) : null;
  }

  toggle(): void {
    if (this.disabled()) return;
    this.open.update((v) => !v);
    if (this.open()) {
      this.syncActiveToValue();
    }
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.trigger()?.nativeElement.focus();
  }

  selectOption(opt: FbSelectOption<T>): void {
    if (opt.disabled) return;
    if (this.multiple()) {
      const current = this.values();
      const next = current.includes(opt.id)
        ? current.filter((id) => id !== opt.id)
        : [...current, opt.id];
      this.values.set(next);
      return;
    }
    this.value.set(opt.id);
    this.close();
  }

  setActive(index: number): void {
    this.activeIndex.set(index);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const key = event.key;
    if (!this.open()) {
      if (key === 'ArrowDown' || key === 'Enter' || key === ' ') {
        event.preventDefault();
        this.open.set(true);
        this.syncActiveToValue();
      }
      return;
    }
    if (key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      const idx = this.activeIndex();
      const opt = this.options()[idx];
      if (opt) this.selectOption(opt);
      return;
    }
    if (
      key === 'ArrowDown' ||
      key === 'ArrowUp' ||
      key === 'Home' ||
      key === 'End'
    ) {
      event.preventDefault();
      this.moveActive(key);
    }
  }

  private multiTriggerLabel(): string {
    const selected = this.values();
    if (selected.length === 0) return '';
    if (selected.length > 2) return `${selected.length} selected`;
    const opts = this.options();
    return selected
      .map((id) => opts.find((o) => o.id === id)?.label ?? String(id))
      .join(', ');
  }

  private moveActive(key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'): void {
    const opts = this.options();
    const enabledIndices: number[] = [];
    for (let i = 0; i < opts.length; i++) {
      if (!opts[i]?.disabled) enabledIndices.push(i);
    }
    if (enabledIndices.length === 0) return;
    const current = this.activeIndex();
    const currentPos = current === -1 ? -1 : enabledIndices.indexOf(current);
    let nextPos: number;
    if (key === 'Home') {
      nextPos = 0;
    } else if (key === 'End') {
      nextPos = enabledIndices.length - 1;
    } else if (key === 'ArrowDown') {
      nextPos =
        currentPos === -1 ? 0 : (currentPos + 1) % enabledIndices.length;
    } else {
      nextPos =
        currentPos === -1
          ? enabledIndices.length - 1
          : (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
    }
    const target = enabledIndices[nextPos];
    if (target === undefined) return;
    this.activeIndex.set(target);
  }

  private syncActiveToValue(): void {
    if (this.multiple()) {
      const selected = this.values();
      if (selected.length === 0) {
        const opts = this.options();
        for (let i = 0; i < opts.length; i++) {
          if (!opts[i]?.disabled) {
            this.activeIndex.set(i);
            return;
          }
        }
        this.activeIndex.set(-1);
        return;
      }
      const first = selected[0];
      if (first === undefined) {
        this.activeIndex.set(-1);
        return;
      }
      const idx = this.options().findIndex((o) => o.id === first);
      this.activeIndex.set(idx);
      return;
    }
    const v = this.value();
    if (v === null) {
      const opts = this.options();
      for (let i = 0; i < opts.length; i++) {
        if (!opts[i]?.disabled) {
          this.activeIndex.set(i);
          return;
        }
      }
      this.activeIndex.set(-1);
      return;
    }
    const idx = this.options().findIndex((o) => o.id === v);
    this.activeIndex.set(idx);
  }
}
