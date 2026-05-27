import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  viewChildren
} from '@angular/core';
import { FbIconComponent } from '../icon/icon.component';

export interface FbMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
}

/**
 * Tier-1 Menu primitive. Renders an accessible menu of items with
 * keyboard navigation (arrow up/down move focus, Home/End jump to ends,
 * Enter or Space selects, Escape dismisses). The primitive itself is the
 * presentational content the service portals into a CDK overlay; service
 * owns positioning, backdrop, and focus return.
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
  imports: [FbIconComponent],
  template: `
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
          <fb-icon class="fb-menu__icon" [name]="item.icon" size="sm"></fb-icon>
        }
        <span class="fb-menu__label">{{ item.label }}</span>
      </button>
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
      .fb-menu__item {
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
        text-align: left;
        cursor: pointer;
      }
      .fb-menu__item:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-menu__item:hover:not(:disabled) {
        background: var(--color-surface-raised);
      }
      .fb-menu__item:disabled,
      .fb-menu__item[aria-disabled='true'] {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .fb-menu__item--destructive:not(:disabled) {
        color: var(--color-error);
      }
      .fb-menu__icon {
        flex: 0 0 auto;
      }
      .fb-menu__label {
        flex: 1 1 auto;
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
  readonly items = input.required<readonly FbMenuItem[]>();
  readonly ariaLabel = input<string>('');

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

  private focusFirstEnabled(): void {
    const enabled = this.enabledIndices();
    const first = enabled[0];
    if (first === undefined) return;
    const buttons = this.itemButtons();
    buttons[first]?.nativeElement.focus();
  }
}
