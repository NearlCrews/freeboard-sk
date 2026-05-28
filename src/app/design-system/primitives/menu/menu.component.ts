import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  TemplateRef,
  computed,
  inject,
  input,
  output,
  viewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FbIconComponent } from '../icon/icon.component';

export interface FbMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
}

export interface FbMenuTemplateContext<T = unknown> {
  readonly $implicit: T;
  readonly close: () => void;
}

/**
 * Tier-1 Menu primitive. Renders an accessible menu of items with
 * keyboard navigation (arrow up/down move focus, Home/End jump to ends,
 * Enter or Space selects, Escape dismisses). The primitive itself is the
 * presentational content the service portals into a CDK overlay; service
 * owns positioning, backdrop, and focus return.
 *
 * Two content modes:
 *  - Static items: pass an `items` array of `FbMenuItem`. Each item renders
 *    as a focusable button with optional icon, disabled, and destructive
 *    styling. Selection emits `itemSelected` with the item id.
 *  - Projected template: open via `FbMenuService.openTemplate(...)` so the
 *    consumer can express conditional rows, dividers, embedded components,
 *    or per-row badges that the typed item shape cannot represent. The
 *    template context carries `$implicit` (the per-open context object) and
 *    `close()` (call to dismiss the overlay). Use `class="fb-menu-item"` on
 *    rows so they pick up the shared focus/hover/disabled styling, and
 *    `class="fb-menu-divider"` (or `<hr class="fb-menu-divider" />`) for
 *    grouping rules.
 *
 * A11y posture:
 *  - Host gets `role="menu"`.
 *  - Each item gets `role="menuitem"` and `aria-disabled` when disabled.
 *  - Disabled items are skipped during keyboard navigation but stay
 *    visible so the user understands they exist.
 *  - On mount, focus moves to the first enabled item.
 */
@Component({
  selector: 'fb-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FbIconComponent],
  template: `
    @if (templateRef(); as tpl) {
      <ng-container
        [ngTemplateOutlet]="tpl"
        [ngTemplateOutletContext]="templateContext()"
      ></ng-container>
    } @else {
      @for (item of items(); track item.id; let i = $index) {
        <button
          #itemButton
          type="button"
          class="fb-menu__item"
          [class.fb-menu__item--destructive]="item.destructive"
          [attr.role]="'menuitem'"
          [attr.aria-disabled]="item.disabled ? 'true' : null"
          [attr.data-index]="i"
          [disabled]="item.disabled"
          tabindex="-1"
          (click)="onSelect(item)"
        >
          @if (item.icon) {
            <fb-icon
              class="fb-menu__icon"
              [name]="item.icon"
              size="sm"
            ></fb-icon>
          }
          <span class="fb-menu__label">{{ item.label }}</span>
        </button>
      }
    }
  `,
  host: {
    role: 'menu',
    '[attr.aria-label]': 'ariaLabel() || null'
  },
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-width: 200px;
        max-width: 320px;
        padding: var(--space-xs) 0;
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-base);
        animation: fb-menu-fade-in 120ms ease-out;
      }
      .fb-menu__item,
      :host ::ng-deep .fb-menu-item {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        width: 100%;
        min-height: var(--touch-secondary);
        padding: var(--space-sm) var(--space-md);
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: var(--font-size-base);
        text-align: left;
        cursor: pointer;
        box-sizing: border-box;
      }
      .fb-menu__item:focus-visible,
      :host ::ng-deep .fb-menu-item:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-menu__item:hover:not(:disabled),
      :host ::ng-deep .fb-menu-item:hover:not(:disabled) {
        background: var(--color-surface-raised);
      }
      .fb-menu__item:disabled,
      .fb-menu__item[aria-disabled='true'],
      :host ::ng-deep .fb-menu-item:disabled,
      :host ::ng-deep .fb-menu-item[aria-disabled='true'] {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .fb-menu__item--destructive:not(:disabled),
      :host ::ng-deep .fb-menu-item--destructive:not(:disabled) {
        color: var(--color-error);
      }
      .fb-menu__icon {
        flex: 0 0 auto;
      }
      .fb-menu__label {
        flex: 1 1 auto;
      }
      :host ::ng-deep .fb-menu-divider {
        display: block;
        height: 0;
        margin: var(--space-xs) 0;
        border: none;
        border-top: 1px solid var(--color-border);
      }
      @keyframes fb-menu-fade-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
        }
      }
    `
  ]
})
export class FbMenuComponent implements AfterViewInit {
  readonly items = input<readonly FbMenuItem[]>([]);
  readonly ariaLabel = input<string>('');
  readonly templateRef = input<TemplateRef<unknown> | null>(null);
  readonly templateContext = input<FbMenuTemplateContext | null>(null);

  readonly itemSelected = output<string>();
  readonly dismissed = output<void>();

  private readonly itemButtons =
    viewChildren<ElementRef<HTMLButtonElement>>('itemButton');

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly enabledIndices = computed(() => {
    const indices: number[] = [];
    const list = this.items();
    for (let i = 0; i < list.length; i++) {
      if (!list[i]?.disabled) {
        indices.push(i);
      }
    }
    return indices;
  });

  ngAfterViewInit(): void {
    queueMicrotask(() => this.focusFirstEnabled());
  }

  onSelect(item: FbMenuItem): void {
    if (item.disabled) return;
    this.itemSelected.emit(item.id);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    if (
      key === 'ArrowDown' ||
      key === 'ArrowUp' ||
      key === 'Home' ||
      key === 'End'
    ) {
      event.preventDefault();
      this.moveFocus(key);
      return;
    }
    if (key === 'Escape') {
      event.preventDefault();
      this.dismissed.emit();
      return;
    }
  }

  private moveFocus(key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'): void {
    if (this.templateRef()) {
      this.moveFocusInTemplate(key);
      return;
    }
    const enabled = this.enabledIndices();
    if (enabled.length === 0) return;
    const buttons = this.itemButtons();
    const active = this.host.nativeElement.ownerDocument?.activeElement;
    const currentIdx = buttons.findIndex((ref) => ref.nativeElement === active);
    const currentEnabledPos =
      currentIdx === -1 ? -1 : enabled.indexOf(currentIdx);

    let nextEnabledPos: number;
    if (key === 'Home') {
      nextEnabledPos = 0;
    } else if (key === 'End') {
      nextEnabledPos = enabled.length - 1;
    } else if (key === 'ArrowDown') {
      nextEnabledPos =
        currentEnabledPos === -1 ? 0 : (currentEnabledPos + 1) % enabled.length;
    } else {
      nextEnabledPos =
        currentEnabledPos === -1
          ? enabled.length - 1
          : (currentEnabledPos - 1 + enabled.length) % enabled.length;
    }
    const targetIndex = enabled[nextEnabledPos];
    if (targetIndex === undefined) return;
    buttons[targetIndex]?.nativeElement.focus();
  }

  private moveFocusInTemplate(
    key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
  ): void {
    const candidates = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        'button.fb-menu-item, a.fb-menu-item, [role="menuitem"]'
      )
    ).filter(
      (el) =>
        !el.hasAttribute('disabled') &&
        el.getAttribute('aria-disabled') !== 'true'
    );
    if (candidates.length === 0) return;
    const active = this.host.nativeElement.ownerDocument?.activeElement;
    const currentIdx = candidates.findIndex((el) => el === active);
    let nextIdx: number;
    if (key === 'Home') {
      nextIdx = 0;
    } else if (key === 'End') {
      nextIdx = candidates.length - 1;
    } else if (key === 'ArrowDown') {
      nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % candidates.length;
    } else {
      nextIdx =
        currentIdx === -1
          ? candidates.length - 1
          : (currentIdx - 1 + candidates.length) % candidates.length;
    }
    candidates[nextIdx]?.focus();
  }

  private focusFirstEnabled(): void {
    if (this.templateRef()) {
      const first = this.host.nativeElement.querySelector<HTMLElement>(
        'button.fb-menu-item:not([disabled]):not([aria-disabled="true"]), a.fb-menu-item:not([aria-disabled="true"]), [role="menuitem"]:not([aria-disabled="true"])'
      );
      first?.focus();
      return;
    }
    const enabled = this.enabledIndices();
    const first = enabled[0];
    if (first === undefined) return;
    const buttons = this.itemButtons();
    buttons[first]?.nativeElement.focus();
  }
}
