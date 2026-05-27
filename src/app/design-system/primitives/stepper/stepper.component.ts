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
  untracked,
  viewChild,
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
 * When present on the active step in horizontal orientation, the stepper
 * swaps the default Back / Next footer for this template. Ignored in
 * vertical orientation (the user navigates by scrolling and clicking
 * headers).
 */
@Directive({
  selector: '[fbStepActions]',
  standalone: true
})
export class FbStepActionsDirective {
  readonly templateRef: TemplateRef<unknown> = inject(TemplateRef);
}

/**
 * Marker directive for the optional header-trailing slot on `<fb-step>`.
 *
 * Consumer usage:
 *   <fb-step label="Waypoint 1">
 *     <ng-template fbStepHeaderActions>
 *       <fb-button>Jump to</fb-button>
 *     </ng-template>
 *     ...body...
 *   </fb-step>
 *
 * The horizontal stepper ignores this slot. In vertical orientation it
 * renders inside the step header, between the label and the trailing
 * connector terminator, so consumers can attach per-step controls like
 * "jump to point" without overriding the circle glyph.
 */
@Directive({
  selector: '[fbStepHeaderActions]',
  standalone: true
})
export class FbStepHeaderActionsDirective {
  readonly templateRef: TemplateRef<unknown> = inject(TemplateRef);
}

/**
 * Single step inside a `<fb-stepper>`.
 *
 * Horizontal orientation: the step renders only its body content. The
 * stepper parent owns the header strip and hides inactive bodies via the
 * `hidden` attribute.
 *
 * Vertical orientation: the step renders its own header (circle + label +
 * optional header-actions slot) above its body, so the bodies stack with
 * the headers in document order. The stepper parent only sets orientation
 * and aria wiring; it does not own a separate header strip.
 */
@Component({
  selector: 'fb-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, FbIconComponent],
  template: `
    @if (renderHeader()) {
      <div class="fb-step__row" [attr.data-state]="state()">
        <div class="fb-step__rail">
          <span class="fb-step__circle" [attr.data-state]="state()">
            @if (complete()) {
              <fb-icon name="check" size="sm"></fb-icon>
            } @else if (icon()) {
              <fb-icon [name]="icon()!" size="sm"></fb-icon>
            } @else {
              <span class="fb-step__index">{{ stepNumber() }}</span>
            }
          </span>
          @if (!isLast()) {
            <span
              class="fb-step__rail-line"
              [attr.data-state]="
                state() === 'complete' ? 'complete' : 'pending'
              "
              aria-hidden="true"
            ></span>
          }
        </div>
        <div class="fb-step__main">
          <div class="fb-step__header-row">
            <button
              #headerBtn
              type="button"
              class="fb-step__header"
              role="tab"
              [id]="headerId()"
              [attr.aria-controls]="bodyId()"
              [attr.aria-selected]="active() ? 'true' : 'false'"
              [attr.tabindex]="active() ? 0 : -1"
              [attr.data-index]="stepIndex()"
              (click)="headerClick.emit()"
            >
              <span class="fb-step__label">{{ label() }}</span>
            </button>
            @if (headerActions(); as headerTpl) {
              <span class="fb-step__header-actions">
                <ng-container
                  *ngTemplateOutlet="headerTpl.templateRef"
                ></ng-container>
              </span>
            }
          </div>
          <div
            class="fb-step__body"
            role="tabpanel"
            [id]="bodyId()"
            [attr.aria-labelledby]="headerId()"
            [attr.data-last]="isLast() ? 'true' : null"
          >
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    } @else {
      <ng-content></ng-content>
    }
  `,
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
      .fb-step__row {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: var(--space-sm);
        min-height: var(--touch-secondary);
      }
      .fb-step__rail {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 0 0 28px;
      }
      .fb-step__circle {
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
      .fb-step__circle[data-state='active'] {
        background: var(--color-primary);
        color: var(--color-on-primary);
      }
      .fb-step__circle[data-state='complete'] {
        background: var(--color-success);
        color: var(--color-on-primary);
      }
      .fb-step__rail-line {
        flex: 1 1 auto;
        width: 1px;
        min-height: var(--space-md);
        background: var(--color-border);
        margin: var(--space-xs) 0;
        transition: background-color 160ms ease;
      }
      .fb-step__rail-line[data-state='complete'] {
        background: var(--color-primary);
      }
      .fb-step__main {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-width: 0;
      }
      .fb-step__header-row {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        min-height: var(--touch-secondary);
      }
      .fb-step__header {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-xs) 0;
        background: transparent;
        border: none;
        font-family: inherit;
        font-size: var(--font-size-base);
        color: var(--color-text-muted);
        cursor: pointer;
        flex: 1 1 auto;
        justify-content: flex-start;
        text-align: left;
      }
      .fb-step__header:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
        border-radius: var(--radius-md);
      }
      .fb-step__header[aria-selected='true'] {
        color: var(--color-text);
        font-weight: var(--font-weight-medium);
      }
      .fb-step__label {
        white-space: nowrap;
      }
      .fb-step__header-actions {
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
        flex: 0 0 auto;
      }
      .fb-step__body {
        padding-bottom: var(--space-sm);
        color: var(--color-text);
      }
      .fb-step__index {
        line-height: 1;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-step__circle,
        .fb-step__rail-line {
          transition: none;
        }
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
  readonly headerActions = contentChild(FbStepHeaderActionsDirective);

  /** Header click escape hatch for the parent stepper. */
  readonly headerClick = output<void>();

  /** Set by the parent stepper. Defaults render in body-only horizontal mode. */
  readonly renderHeader = signal<boolean>(false);
  readonly active = signal<boolean>(false);
  readonly isLast = signal<boolean>(false);
  readonly stepIndex = signal<number>(0);
  readonly stepNumber = signal<number>(1);
  readonly headerId = signal<string>('');
  readonly bodyId = signal<string>('');

  readonly state = computed<'active' | 'complete' | 'future'>(() => {
    if (this.complete()) return 'complete';
    if (this.active()) return 'active';
    return 'future';
  });

  readonly hiddenAttr = signal<'' | null>('');

  /** Internal viewchild handle so the parent can roll focus across headers. */
  readonly headerBtnRef = viewChild<ElementRef<HTMLButtonElement>>('headerBtn');

  /**
   * Apply the active flag. In horizontal mode the parent uses `hidden` to
   * suppress inactive bodies; in vertical mode (renderHeader = true) every
   * body stays visible.
   */
  setActive(active: boolean): void {
    this.active.set(active);
    const renderHeader = untracked(() => this.renderHeader());
    this.hiddenAttr.set(renderHeader || active ? null : '');
  }

  setVerticalChrome(opts: {
    stepIndex: number;
    stepNumber: number;
    isLast: boolean;
    headerId: string;
    bodyId: string;
  }): void {
    this.stepIndex.set(opts.stepIndex);
    this.stepNumber.set(opts.stepNumber);
    this.isLast.set(opts.isLast);
    this.headerId.set(opts.headerId);
    this.bodyId.set(opts.bodyId);
    this.renderHeader.set(true);
    this.hiddenAttr.set(null);
  }
}

/**
 * Tier-3 Stepper primitive.
 *
 * Two orientations:
 *  - `horizontal` (default): linear wizard. Header strip with numbered
 *    circles and labels. Only the active step's body is visible; siblings
 *    stay mounted with the `hidden` attribute so consumer state survives.
 *    Linear mode (default) blocks advance past a step that is neither
 *    `complete` nor currently `valid`. Footer Back / Next default to
 *    `<fb-button>` primitives, and a step may override via
 *    `<ng-template fbStepActions>`.
 *  - `vertical`: scrollable stacked list. Every body renders directly
 *    beneath its own header indented to the label column. Footer Back /
 *    Next is omitted (the user navigates by scrolling and clicking
 *    headers). Per-step controls go in `<ng-template fbStepHeaderActions>`,
 *    which renders in the header trailing slot. Linear gating is off by
 *    default; if `linear` is explicitly set the header click is still
 *    gated.
 *
 * A11y posture:
 *  - Host gets `role="region"` and forwards `aria-label`.
 *  - Strip (horizontal) or stack (vertical) is `role="tablist"`. Each
 *    header is `role="tab"` with `aria-selected` and roving `tabindex`.
 *  - Horizontal body is `role="tabpanel"` with `aria-labelledby` pointing
 *    at the active header. Vertical bodies render inline next to their
 *    header and are `role="tabpanel"` with `aria-labelledby` pointing at
 *    their own header.
 *  - Horizontal: ArrowLeft / ArrowRight roll focus across headers.
 *    Vertical: ArrowUp / ArrowDown. Home and End jump to ends in both.
 *    Enter or Space activates (still gated by linear in horizontal).
 *  - Connector animation drops to 0 ms under prefers-reduced-motion.
 */
@Component({
  selector: 'fb-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbButtonComponent, FbIconComponent, NgTemplateOutlet],
  host: {
    role: 'region',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-orientation]': 'orientation()'
  },
  template: `
    @if (orientation() === 'horizontal') {
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
    } @else {
      <div
        class="fb-stepper__vlist"
        role="tablist"
        aria-orientation="vertical"
        [attr.aria-label]="ariaLabel() || null"
      >
        <ng-content></ng-content>
      </div>
    }
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
        border-radius: var(--radius-md);
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
      .fb-stepper__vlist {
        display: flex;
        flex-direction: column;
        padding: var(--space-sm) var(--space-md);
        gap: 0;
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
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  readonly completed = output<void>();

  readonly steps = contentChildren(FbStepComponent);

  private readonly headerRefs =
    viewChildren<ElementRef<HTMLButtonElement>>('headerBtn');

  private readonly stepperId = `fb-stepper-${++nextStepperId}`;

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

  /** Per-step header-click subscription handles, cleared on every refresh. */
  private headerClickHandles: { unsubscribe(): void }[] = [];
  /** Track which step set was last wired so we only re-subscribe on change. */
  private wiredSteps: readonly FbStepComponent[] = [];
  /** Track the last orientation we wired chrome for. */
  private wiredOrientation: 'horizontal' | 'vertical' | null = null;

  constructor() {
    effect(() => {
      const list = this.steps();
      const active = this.activeIndex();
      const orientation = this.orientation();
      const vertical = orientation === 'vertical';
      const total = list.length;

      const listChanged =
        this.wiredSteps !== list || this.wiredOrientation !== orientation;

      if (listChanged) {
        this.headerClickHandles.forEach((h) => h.unsubscribe());
        this.headerClickHandles = [];
        this.wiredSteps = list;
        this.wiredOrientation = orientation;

        list.forEach((step, i) => {
          if (vertical) {
            step.setVerticalChrome({
              stepIndex: i,
              stepNumber: i + 1,
              isLast: i === total - 1,
              headerId: this.headerId(i),
              bodyId: this.bodyId(i)
            });
            const sub = step.headerClick.subscribe(() => this.onHeaderClick(i));
            this.headerClickHandles.push(sub);
          } else {
            step.renderHeader.set(false);
          }
        });
      }

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

  /**
   * Body id. Horizontal has a single tabpanel so the index is ignored;
   * vertical has one tabpanel per step.
   */
  bodyId(i?: number): string {
    if (this.orientation() === 'vertical' && typeof i === 'number') {
      return `${this.stepperId}-body-${i}`;
    }
    return `${this.stepperId}-body`;
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
    if (this.orientation() === 'vertical') return;
    const idx = this.activeIndex();
    if (idx === 0) return;
    this.activeIndex.set(idx - 1);
  }

  next(): void {
    if (this.orientation() === 'vertical') return;
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
    const vertical = this.orientation() === 'vertical';
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
    if (
      key !== prevKey &&
      key !== nextKey &&
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
    } else if (key === nextKey) {
      nextIdx = (current + 1) % count;
    } else {
      nextIdx = (current - 1 + count) % count;
    }
    if (vertical) {
      const stepsList = this.steps();
      stepsList[nextIdx]?.headerBtnRef()?.nativeElement.focus();
      return;
    }
    const refs = this.headerRefs();
    refs[nextIdx]?.nativeElement.focus();
  }

  private canNavigateTo(target: number): boolean {
    if (target < 0) return false;
    const list = this.steps();
    if (target >= list.length) return false;
    if (!this.linear()) return true;
    if (this.orientation() === 'vertical') return true;
    const current = this.activeIndex();
    if (target <= current) return true;
    for (let i = current; i < target; i++) {
      const step = list[i];
      if (!step?.complete()) return false;
    }
    return true;
  }
}
