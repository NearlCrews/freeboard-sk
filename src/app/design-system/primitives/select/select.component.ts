import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  input,
  model,
  signal,
  viewChild
} from '@angular/core';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { FbIconComponent } from '../icon/icon.component';

export interface FbSelectOption {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * Tier-2 form Select primitive.
 *
 * Dropdown using CDK Overlay (NOT MatSelect). The trigger is a token-driven
 * button, the menu is a token-driven listbox of options, and selection
 * updates the `value` model.
 *
 * A11y posture:
 *  - Trigger has role=combobox, aria-haspopup=listbox, aria-expanded, and
 *    aria-controls pointing at the listbox id.
 *  - Listbox has role=listbox; options have role=option + aria-selected.
 *  - Keyboard: ArrowDown/ArrowUp move active option, Enter selects and
 *    closes, Escape closes without selecting. While closed, ArrowDown
 *    opens. Home/End jump.
 *  - aria-activedescendant is set on the listbox to the active option id
 *    so screen readers track the highlight without moving focus off the
 *    trigger.
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
        {{ selectedLabel() || placeholder() }}
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
        [attr.aria-activedescendant]="activeOptionId()"
      >
        @for (opt of options(); track opt.id; let i = $index) {
          <li
            [id]="optionDomId(opt.id)"
            class="fb-select__option"
            [class.fb-select__option--active]="i === activeIndex()"
            [class.fb-select__option--selected]="opt.id === value()"
            role="option"
            [attr.aria-selected]="opt.id === value() ? 'true' : 'false'"
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
export class FbSelectComponent {
  readonly name = input.required<string>();
  readonly options = input.required<readonly FbSelectOption[]>();
  readonly value = model<string | null>(null);
  readonly placeholder = input<string>('Select...');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  readonly open = signal<boolean>(false);
  readonly activeIndex = signal<number>(-1);

  private readonly trigger =
    viewChild<ElementRef<HTMLButtonElement>>('trigger');

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

  listboxId(): string {
    return `${this.name()}-listbox`;
  }

  optionDomId(id: string): string {
    return `${this.name()}-opt-${id}`;
  }

  selectedLabel(): string {
    const v = this.value();
    if (v === null) return '';
    return this.options().find((o) => o.id === v)?.label ?? '';
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

  selectOption(opt: FbSelectOption): void {
    if (opt.disabled) return;
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
