import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  contentChildren,
  effect,
  input,
  model,
  signal,
  viewChildren
} from '@angular/core';
import { FbIconComponent } from '../icon/icon.component';

export interface FbTabDef {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly disabled?: boolean;
}

/**
 * Companion directive used to project tab-panel content.
 *
 * Consumer usage:
 *   <div fbTabPanel fbTabPanelId="info">...</div>
 *
 * The tabs component queries these and toggles the native `hidden`
 * attribute so screen readers skip inactive panels while the DOM stays
 * mounted for fast tab switches.
 */
@Directive({
  selector: '[fbTabPanel]',
  standalone: true,
  host: {
    role: 'tabpanel',
    '[attr.id]': '"fb-tab-panel-" + fbTabPanelId()',
    '[attr.aria-labelledby]': '"fb-tab-" + fbTabPanelId()',
    '[attr.hidden]': 'hiddenAttr()',
    tabindex: '0'
  }
})
export class FbTabPanelDirective {
  readonly fbTabPanelId = input.required<string>();
  readonly hiddenAttr = signal<'' | null>('');

  setActive(active: boolean): void {
    this.hiddenAttr.set(active ? null : '');
  }
}

/**
 * Tier-3 Tabs primitive.
 *
 * Controlled tab strip plus panel projection. The strip is
 * `role="tablist"` and each tab is `role="tab"` with `aria-selected` and
 * roving tabindex (per WAI-ARIA tabs pattern with automatic activation:
 * focus = select). Panels are projected via `[fbTabPanel]` directives so
 * consumers declare content inline; the matching panel by `fbTabPanelId`
 * stays mounted and visible, others get `hidden` for AT.
 *
 * Keyboard:
 *   ArrowLeft / ArrowRight wrap-around between enabled tabs
 *   Home / End jump to first / last enabled tab
 *   Disabled tabs are skipped during navigation.
 */
@Component({
  selector: 'fb-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbIconComponent],
  host: { '(keydown)': 'onKeyDown($event)' },
  template: `
    <div
      class="fb-tabs__list"
      role="tablist"
      [attr.aria-label]="ariaLabel() || null"
    >
      @for (tab of tabs(); track tab.id; let i = $index) {
        <button
          #tabBtn
          type="button"
          class="fb-tabs__tab"
          role="tab"
          [id]="'fb-tab-' + tab.id"
          [attr.aria-selected]="activeId() === tab.id ? 'true' : 'false'"
          [attr.aria-controls]="'fb-tab-panel-' + tab.id"
          [attr.aria-disabled]="tab.disabled || null"
          [attr.tabindex]="activeId() === tab.id ? 0 : -1"
          [attr.data-index]="i"
          [disabled]="tab.disabled"
          (click)="onSelect(tab)"
        >
          @if (tab.icon) {
            <fb-icon
              class="fb-tabs__icon"
              [name]="tab.icon"
              size="sm"
            ></fb-icon>
          }
          <span class="fb-tabs__label">{{ tab.label }}</span>
        </button>
      }
    </div>
    <div class="fb-tabs__panels">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        background: var(--color-surface);
        color: var(--color-text);
        font-family: var(--font-family-sans);
      }
      .fb-tabs__list {
        display: flex;
        align-items: stretch;
        border-bottom: 1px solid var(--color-border);
        overflow-x: auto;
      }
      .fb-tabs__tab {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-xs);
        min-height: var(--touch-secondary);
        padding: var(--space-sm) var(--space-md);
        border: none;
        background: transparent;
        color: var(--color-text-muted);
        font-family: inherit;
        font-size: var(--font-size-base);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition:
          color 120ms ease,
          border-color 120ms ease,
          background 120ms ease;
      }
      .fb-tabs__tab:hover:not(:disabled):not([aria-disabled='true']) {
        background: var(--color-surface-raised);
      }
      .fb-tabs__tab:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-tabs__tab[aria-selected='true'] {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
        font-weight: var(--font-weight-medium);
      }
      .fb-tabs__tab:disabled,
      .fb-tabs__tab[aria-disabled='true'] {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-tabs__icon {
        flex: 0 0 auto;
      }
      .fb-tabs__panels {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-tabs__tab {
          transition: none;
        }
      }
    `
  ]
})
export class FbTabsComponent implements AfterContentInit {
  readonly tabs = input.required<readonly FbTabDef[]>();
  readonly activeId = model<string | null>(null);
  readonly ariaLabel = input<string>('');

  private readonly tabRefs =
    viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  private readonly panels = contentChildren(FbTabPanelDirective);

  private readonly enabledIds = computed(() =>
    this.tabs()
      .filter((t) => !t.disabled)
      .map((t) => t.id)
  );

  constructor() {
    effect(() => {
      const active = this.activeId();
      for (const panel of this.panels()) {
        panel.setActive(panel.fbTabPanelId() === active);
      }
    });
  }

  ngAfterContentInit(): void {
    if (this.activeId() === null) {
      const first = this.enabledIds()[0];
      if (first !== undefined) this.activeId.set(first);
    }
  }

  onSelect(tab: FbTabDef): void {
    if (tab.disabled) return;
    this.activeId.set(tab.id);
  }

  onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    if (
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }
    const enabled = this.enabledIds();
    if (enabled.length === 0) return;
    event.preventDefault();
    const current = this.activeId();
    const pos = current === null ? -1 : enabled.indexOf(current);

    let nextId: string | undefined;
    if (key === 'Home') {
      nextId = enabled[0];
    } else if (key === 'End') {
      nextId = enabled[enabled.length - 1];
    } else if (key === 'ArrowRight') {
      const nextPos = pos === -1 ? 0 : (pos + 1) % enabled.length;
      nextId = enabled[nextPos];
    } else {
      const nextPos =
        pos === -1
          ? enabled.length - 1
          : (pos - 1 + enabled.length) % enabled.length;
      nextId = enabled[nextPos];
    }
    if (nextId === undefined) return;
    this.activeId.set(nextId);
    const tabs = this.tabs();
    const idx = tabs.findIndex((t) => t.id === nextId);
    const refs = this.tabRefs();
    refs[idx]?.nativeElement.focus();
  }
}
