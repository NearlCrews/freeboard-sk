import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  HostListener,
  TemplateRef,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChildren
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FbButtonComponent } from '../button/button.component';
import { FbIconComponent } from '../icon/icon.component';

let nextStepperId = 0;

/**
 * Marker directive for the optional custom actions slot on `<fb-step>`.
 *
 * Consumer usage:
 *   <fb-step label="Confirm">
 *     ...body...
 *     <ng-template fbStepActions>
 *       <fb-button>Custom Submit</fb-button>
 *     </ng-template>
 *   </fb-step>
 *
 * When present on the active step, the stepper swaps the default Back / Next
 * footer for this template.
 */
@Directive({
  selector: '[fbStepActions]',
  standalone: true
})
export class FbStepActionsDirective {
  readonly templateRef: TemplateRef<unknown> = inject(TemplateRef);
}

/**
 * Single step inside a `<fb-stepper>`. Renders only its body content; the
 * stepper parent generates header chrome from the step's `label`, `icon`,
 * `valid`, and `complete` inputs.
 */
@Component({
  selector: 'fb-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    '[attr.hidden]': 'hiddenAttr()'
  },
  styles: [
    `
      :host {
        display: block;
      }
      :host([hidden]) {
        display: none;
      }
    `
  ]
})
export class FbStepComponent {
  readonly label = input.required<string>();
  readonly valid = input<boolean>(true);
  readonly complete = input<boolean>(false);
  readonly icon = input<string | undefined>(undefined);

  readonly actions = contentChild(FbStepActionsDirective);

  readonly hiddenAttr = signal<'' | null>('');

  setActive(active: boolean): void {
    this.hiddenAttr.set(active ? null : '');
  }
}

/**
 * Tier-3 Stepper primitive.
 *
 * Horizontal linear wizard. The header strip shows numbered circles plus
 * step labels. The active step's body is visible; siblings stay mounted with
 * the `hidden` attribute so consumer state (form values, scroll position)
 * survives step switches.
 *
 * Linear mode (default) blocks advance past a step that is neither
 * `complete` nor currently `valid`. Footer Back / Next default to
 * `<fb-button>` primitives, and a step may override that footer via
 * `<ng-template fbStepActions>` for non-standard submit chrome.
 *
 * On the last step, Next reads "Finish" and emits `completed` instead of
 * advancing.
 *
 * A11y posture:
 *  - Host gets `role="region"` and forwards `aria-label`.
 *  - Strip is `role="tablist"`. Each header is `role="tab"` with
 *    `aria-selected` and roving `tabindex`.
 *  - Body is `role="tabpanel"` with `aria-labelledby` pointing at the
 *    active header.
 *  - Arrow keys roll focus across headers, Home / End jump to ends, and
 *    Enter on a focused header activates that step (still gated by linear
 *    validity).
 *  - Connector animation drops to 0 ms under prefers-reduced-motion.
 */
@Component({
  selector: 'fb-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbButtonComponent, FbIconComponent, NgTemplateOutlet],
  host: {
    role: 'region',
    '[attr.aria-label]': 'ariaLabel() || null'
  },
  template: `
    <div
      class="fb-stepper__list"
      role="tablist"
      [attr.aria-label]="ariaLabel() || null"
    >
      @for (step of steps(); track step; let i = $index) {
        <div class="fb-stepper__item" [attr.data-state]="stateOf(i)">
          <button
            #headerBtn
            type="button"
            class="fb-stepper__header"
            role="tab"
            [id]="headerId(i)"
            [attr.aria-controls]="bodyId()"
            [attr.aria-selected]="activeIndex() === i ? 'true' : 'false'"
            [attr.tabindex]="activeIndex() === i ? 0 : -1"
            [attr.data-index]="i"
            (click)="onHeaderClick(i)"
          >
            <span class="fb-stepper__circle" [attr.data-state]="stateOf(i)">
              @if (step.complete()) {
                <fb-icon name="check" size="sm"></fb-icon>
              } @else if (step.icon()) {
                <fb-icon [name]="step.icon()!" size="sm"></fb-icon>
              } @else {
                <span class="fb-stepper__index">{{ i + 1 }}</span>
              }
            </span>
            <span class="fb-stepper__label">{{ step.label() }}</span>
          </button>
          @if (!isLast(i)) {
            <span
              class="fb-stepper__connector"
              [attr.data-state]="connectorStateOf(i)"
              aria-hidden="true"
            ></span>
          }
        </div>
      }
    </div>
    <div
      class="fb-stepper__body"
      role="tabpanel"
      [id]="bodyId()"
      [attr.aria-labelledby]="activeHeaderId()"
    >
      <ng-content></ng-content>
      @if (activeStepActions(); as actionsTpl) {
        <div class="fb-stepper__actions fb-stepper__actions--custom">
          <ng-container *ngTemplateOutlet="actionsTpl"></ng-container>
        </div>
      } @else {
        <div class="fb-stepper__actions">
          <fb-button
            variant="ghost"
            size="md"
            [disabled]="activeIndex() === 0"
            (pressed)="back()"
          >
            Back
          </fb-button>
          <fb-button
            variant="primary"
            size="md"
            [disabled]="!canAdvance()"
            (pressed)="next()"
          >
            {{ isAtLast() ? 'Finish' : 'Next' }}
          </fb-button>
        </div>
      }
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
      .fb-stepper__list {
        display: flex;
        align-items: center;
        gap: 0;
        padding: var(--space-md);
        border-bottom: 1px solid var(--color-border);
        overflow-x: auto;
      }
      .fb-stepper__item {
        display: flex;
        align-items: center;
        flex: 0 0 auto;
      }
      .fb-stepper__header {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-xs) var(--space-sm);
        min-height: var(--touch-secondary);
        background: transparent;
        border: none;
        font-family: inherit;
        font-size: var(--font-size-base);
        color: var(--color-text-muted);
        cursor: pointer;
      }
      .fb-stepper__header:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
        border-radius: 6px;
      }
      .fb-stepper__header[aria-selected='true'] {
        color: var(--color-text);
        font-weight: var(--font-weight-medium);
      }
      .fb-stepper__circle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        background: var(--color-surface-raised);
        color: var(--color-text-muted);
        flex: 0 0 auto;
        transition:
          background-color 160ms ease,
          color 160ms ease;
      }
      .fb-stepper__circle[data-state='active'] {
        background: var(--color-primary);
        color: var(--color-on-primary);
      }
      .fb-stepper__circle[data-state='complete'] {
        background: var(--color-success);
        color: var(--color-on-primary);
      }
      .fb-stepper__index {
        line-height: 1;
      }
      .fb-stepper__label {
        white-space: nowrap;
      }
      .fb-stepper__connector {
        flex: 1 1 auto;
        min-width: var(--space-lg);
        height: 1px;
        background: var(--color-border);
        margin: 0 var(--space-sm);
        transition: background-color 160ms ease;
      }
      .fb-stepper__connector[data-state='complete'] {
        background: var(--color-primary);
      }
      .fb-stepper__body {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        padding: var(--space-md);
      }
      .fb-stepper__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--space-sm);
        padding-top: var(--space-sm);
        border-top: 1px solid var(--color-border);
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-stepper__circle,
        .fb-stepper__connector {
          transition: none;
        }
      }
    `
  ]
})
export class FbStepperComponent implements AfterContentInit {
  readonly activeIndex = model<number>(0);
  readonly linear = input<boolean>(true);
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly completed = output<void>();

  readonly steps = contentChildren(FbStepComponent);

  private readonly headerRefs =
    viewChildren<ElementRef<HTMLButtonElement>>('headerBtn');

  private readonly stepperId = `fb-stepper-${++nextStepperId}`;

  readonly bodyId = computed(() => `${this.stepperId}-body`);

  readonly activeHeaderId = computed(() => this.headerId(this.activeIndex()));

  readonly isAtLast = computed(() => {
    const count = this.steps().length;
    return count > 0 && this.activeIndex() === count - 1;
  });

  readonly canAdvance = computed(() => {
    const list = this.steps();
    const idx = this.activeIndex();
    const current = list[idx];
    if (!current) return false;
    if (!current.valid()) return false;
    return true;
  });

  readonly activeStepActions = computed(() => {
    const list = this.steps();
    const idx = this.activeIndex();
    const current = list[idx];
    return current?.actions()?.templateRef ?? null;
  });

  constructor() {
    effect(() => {
      const list = this.steps();
      const active = this.activeIndex();
      list.forEach((step, i) => step.setActive(i === active));
    });
  }

  ngAfterContentInit(): void {
    const count = this.steps().length;
    if (count === 0) return;
    const idx = this.activeIndex();
    if (idx < 0 || idx >= count) {
      this.activeIndex.set(0);
    }
  }

  headerId(i: number): string {
    return `${this.stepperId}-header-${i}`;
  }

  isLast(i: number): boolean {
    return i === this.steps().length - 1;
  }

  stateOf(i: number): 'active' | 'complete' | 'future' {
    const list = this.steps();
    const step = list[i];
    if (step?.complete()) return 'complete';
    if (i === this.activeIndex()) return 'active';
    return 'future';
  }

  connectorStateOf(i: number): 'complete' | 'pending' {
    const list = this.steps();
    const step = list[i];
    return step?.complete() ? 'complete' : 'pending';
  }

  onHeaderClick(i: number): void {
    if (i === this.activeIndex()) return;
    if (!this.canNavigateTo(i)) return;
    this.activeIndex.set(i);
  }

  back(): void {
    const idx = this.activeIndex();
    if (idx === 0) return;
    this.activeIndex.set(idx - 1);
  }

  next(): void {
    if (!this.canAdvance()) return;
    if (this.isAtLast()) {
      this.completed.emit();
      return;
    }
    this.activeIndex.update((v) => v + 1);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || target.getAttribute('role') !== 'tab') return;
    const key = event.key;
    if (
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'Home' &&
      key !== 'End' &&
      key !== 'Enter' &&
      key !== ' '
    ) {
      return;
    }
    const count = this.steps().length;
    if (count === 0) return;
    const current = this.activeIndex();

    if (key === 'Enter' || key === ' ') {
      const raw = target.getAttribute('data-index');
      const idx = raw === null ? -1 : Number.parseInt(raw, 10);
      if (Number.isNaN(idx)) return;
      event.preventDefault();
      this.onHeaderClick(idx);
      return;
    }

    event.preventDefault();
    let nextIdx: number;
    if (key === 'Home') {
      nextIdx = 0;
    } else if (key === 'End') {
      nextIdx = count - 1;
    } else if (key === 'ArrowRight') {
      nextIdx = (current + 1) % count;
    } else {
      nextIdx = (current - 1 + count) % count;
    }
    const refs = this.headerRefs();
    refs[nextIdx]?.nativeElement.focus();
  }

  private canNavigateTo(target: number): boolean {
    if (target < 0) return false;
    const list = this.steps();
    if (target >= list.length) return false;
    if (!this.linear()) return true;
    const current = this.activeIndex();
    if (target <= current) return true;
    for (let i = current; i < target; i++) {
      const step = list[i];
      if (!step?.complete()) return false;
    }
    return true;
  }
}
