import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  contentChildren,
  inject,
  input,
  model
} from '@angular/core';
import { FbIconComponent } from '../icon/icon.component';

let nextPanelId = 0;

/**
 * Marker directives for slot composition. The default `<ng-content
 * select="[fbExpansionPanelTitle]">` works without them; the directives
 * exist so consumers get IDE autocomplete and a typed export hook.
 */
@Directive({ selector: '[fbExpansionPanelTitle]', standalone: true })
export class FbExpansionPanelTitleDirective {}

@Directive({ selector: '[fbExpansionPanelDescription]', standalone: true })
export class FbExpansionPanelDescriptionDirective {}

@Directive({ selector: '[fbExpansionPanelIcon]', standalone: true })
export class FbExpansionPanelIconDirective {}

/**
 * Tier-3 Expansion Panel primitive.
 *
 * A header button toggles a region containing arbitrary content. Used as
 * a standalone disclosure or grouped under `<fb-accordion>`.
 *
 * A11y posture:
 *  - Header is a `<button>` with `aria-expanded`, `aria-controls`, and
 *    `aria-disabled`.
 *  - Body has `role="region"` and `aria-labelledby` pointing at the
 *    header id. Collapsed body uses the `hidden` attribute so AT skips
 *    it entirely.
 *  - Keyboard Enter/Space toggle on the native button. Disabled blocks
 *    both via `aria-disabled` and the underlying disabled attribute.
 *  - Chevron rotation respects prefers-reduced-motion.
 */
@Component({
  selector: 'fb-expansion-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbIconComponent],
  template: `
    <button
      #header
      type="button"
      class="fb-expansion-panel__header"
      [attr.id]="headerId()"
      [attr.aria-expanded]="expanded() ? 'true' : 'false'"
      [attr.aria-controls]="bodyId()"
      [attr.aria-disabled]="disabled() ? 'true' : null"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      <span class="fb-expansion-panel__icon">
        <ng-content select="[fbExpansionPanelIcon]"></ng-content>
      </span>
      <span class="fb-expansion-panel__title">
        <ng-content select="[fbExpansionPanelTitle]"></ng-content>
      </span>
      <span class="fb-expansion-panel__description">
        <ng-content select="[fbExpansionPanelDescription]"></ng-content>
      </span>
      <fb-icon
        class="fb-expansion-panel__chevron"
        name="expand_more"
        size="sm"
        [attr.data-expanded]="expanded() ? 'true' : 'false'"
      ></fb-icon>
    </button>
    <div
      class="fb-expansion-panel__body"
      role="region"
      [attr.id]="bodyId()"
      [attr.aria-labelledby]="headerId()"
      [hidden]="!expanded()"
    >
      <ng-content></ng-content>
    </div>
  `,
  host: {
    '[attr.data-expanded]': "expanded() ? 'true' : 'false'",
    '[attr.data-disabled]': "disabled() ? 'true' : null"
  },
  styles: [
    `
      :host {
        display: block;
        background: var(--color-surface-raised);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        font-family: var(--font-family-sans);
        color: var(--color-text);
        overflow: hidden;
      }
      .fb-expansion-panel__header {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        width: 100%;
        min-height: var(--touch-secondary);
        padding: var(--space-md);
        border: none;
        background: transparent;
        color: inherit;
        font-family: inherit;
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        text-align: left;
        cursor: pointer;
      }
      .fb-expansion-panel__header:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-expansion-panel__header:disabled,
      .fb-expansion-panel__header[aria-disabled='true'] {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .fb-expansion-panel__icon {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
      }
      .fb-expansion-panel__icon:empty {
        display: none;
      }
      .fb-expansion-panel__title {
        flex: 1 1 auto;
        min-width: 0;
      }
      .fb-expansion-panel__description {
        flex: 0 1 auto;
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-regular);
      }
      .fb-expansion-panel__description:empty {
        display: none;
      }
      .fb-expansion-panel__chevron {
        flex: 0 0 auto;
        transition: transform 160ms ease;
      }
      .fb-expansion-panel__chevron[data-expanded='true'] {
        transform: rotate(180deg);
      }
      .fb-expansion-panel__body {
        padding: var(--space-md);
        border-top: 1px solid var(--color-border);
        font-size: var(--font-size-base);
        line-height: var(--line-height-normal);
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-expansion-panel__chevron {
          transition: none;
        }
      }
    `
  ]
})
export class FbExpansionPanelComponent {
  readonly expanded = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly panelId = input<string | undefined>(undefined);

  private readonly autoId = `fb-expansion-panel-${++nextPanelId}`;

  readonly resolvedId = computed(() => this.panelId() ?? this.autoId);
  readonly headerId = computed(() => `${this.resolvedId()}-header`);
  readonly bodyId = computed(() => `${this.resolvedId()}-body`);

  private readonly hostRef: ElementRef<HTMLElement> = inject(ElementRef);
  private host: AccordionHost | null = null;

  attach(host: AccordionHost): void {
    this.host = host;
  }

  toggle(): void {
    if (this.disabled()) return;
    const next = !this.expanded();
    if (next && this.host !== null) {
      this.host.notifyExpand(this);
    }
    this.expanded.set(next);
  }

  focusHeader(): void {
    const btn = this.hostRef.nativeElement.querySelector<HTMLButtonElement>(
      '.fb-expansion-panel__header'
    );
    btn?.focus();
  }
}

/**
 * Structural contract used by `<fb-expansion-panel>` to notify its
 * parent accordion that it is about to expand, so the parent can
 * coordinate single-open mode. The accordion implements this implicitly
 * via its public method below.
 */
export interface AccordionHost {
  notifyExpand(source: FbExpansionPanelComponent): void;
}

/**
 * Tier-3 Accordion primitive.
 *
 * Wraps a set of `<fb-expansion-panel>` children. In `single` mode only
 * one panel may be expanded at a time: opening any child collapses its
 * siblings. In `multi` mode each panel manages itself.
 *
 * A11y posture:
 *  - Host gets `role="region"` and forwards `aria-label`.
 *  - Roving focus across panel headers via arrow keys. Home / End jump
 *    to the first / last enabled panel.
 */
@Component({
  selector: 'fb-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    role: 'region',
    '[attr.aria-label]': 'ariaLabel() || null',
    '(keydown)': 'onKeyDown($event)'
  },
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
      }
    `
  ]
})
export class FbAccordionComponent implements AfterContentInit {
  readonly mode = input<'multi' | 'single'>('multi');
  readonly ariaLabel = input<string | undefined>(undefined);

  private readonly panels = contentChildren(FbExpansionPanelComponent);

  ngAfterContentInit(): void {
    for (const panel of this.panels()) {
      panel.attach(this);
    }
    if (this.mode() !== 'single') return;
    const list = this.panels();
    const firstExpanded = list.findIndex((p) => p.expanded());
    if (firstExpanded === -1) return;
    list.forEach((panel, idx) => {
      if (idx !== firstExpanded) panel.expanded.set(false);
    });
  }

  notifyExpand(source: FbExpansionPanelComponent): void {
    if (this.mode() !== 'single') return;
    for (const panel of this.panels()) {
      if (panel !== source && panel.expanded()) {
        panel.expanded.set(false);
      }
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    if (
      key !== 'ArrowDown' &&
      key !== 'ArrowUp' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target || !target.classList.contains('fb-expansion-panel__header')) {
      return;
    }
    const enabled = this.panels().filter((p) => !p.disabled());
    if (enabled.length === 0) return;
    event.preventDefault();
    const idx = this.indexOfFocusedHeader(target, enabled);
    let nextIdx: number;
    if (key === 'Home') {
      nextIdx = 0;
    } else if (key === 'End') {
      nextIdx = enabled.length - 1;
    } else if (key === 'ArrowDown') {
      nextIdx = idx === -1 ? 0 : (idx + 1) % enabled.length;
    } else {
      nextIdx =
        idx === -1
          ? enabled.length - 1
          : (idx - 1 + enabled.length) % enabled.length;
    }
    enabled[nextIdx]?.focusHeader();
  }

  private indexOfFocusedHeader(
    headerEl: HTMLElement,
    panels: readonly FbExpansionPanelComponent[]
  ): number {
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      if (!panel) continue;
      const id = panel.headerId();
      if (headerEl.id === id) return i;
    }
    return -1;
  }
}
