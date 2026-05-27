import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  signal,
  viewChild,
  viewChildren
} from '@angular/core';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { FbIconComponent } from '../icon/icon.component';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const WEEKDAY_FULL_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const;

function monthLabel(idx: number): string {
  return MONTH_LABELS[idx] ?? '';
}

function weekdayLabel(idx: number): string {
  return WEEKDAY_FULL_LABELS[idx] ?? '';
}

interface DayCell {
  readonly date: Date;
  readonly key: string;
  readonly inMonth: boolean;
  readonly disabled: boolean;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

function addYears(d: Date, n: number): Date {
  return new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
}

/**
 * Tier-3 Date picker primitive.
 *
 * Minimum-viable single-date picker built on CDK Overlay. Trigger is a
 * read-only token-driven button with a calendar icon; clicking opens a
 * month grid overlay. No range mode, no locale variants past default
 * English, no custom headers.
 *
 * A11y posture:
 *  - Trigger is a button with aria-haspopup="dialog", aria-expanded, and
 *    aria-label when supplied. Disabled state propagates to the button.
 *  - Calendar wrapper has role="dialog" with aria-modal="true" so AT
 *    treats the overlay as an inline subwindow.
 *  - Day grid wraps cells in role="grid" with aria-labelledby pointing
 *    at the month/year header. Each cell is a button with role="gridcell",
 *    aria-selected when chosen, and aria-disabled when out of range or in
 *    an adjacent month.
 *  - Keyboard: Arrows step day, PageUp/PageDown step month, Shift+PageUp/
 *    PageDown step year, Home/End jump to start/end of the focused week,
 *    Enter or Space selects the focused day, Escape closes without
 *    selecting and returns focus to the trigger. Roving tabindex within
 *    the grid plus the prev/next chrome buttons.
 *  - Opens with focus on the selected day if any, else today if in range,
 *    else the first enabled day of the displayed month.
 */
@Component({
  selector: 'fb-datepicker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, FbIconComponent],
  template: `
    <button
      #trigger
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      type="button"
      class="fb-datepicker__trigger"
      [class.fb-datepicker__trigger--invalid]="invalid()"
      [attr.aria-haspopup]="'dialog'"
      [attr.aria-expanded]="open() ? 'true' : 'false'"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-invalid]="invalid() || null"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      <fb-icon
        class="fb-datepicker__leading"
        name="calendar_today"
        size="sm"
      ></fb-icon>
      <span class="fb-datepicker__value">
        @if (value() !== null) {
          {{ formattedValue() }}
        } @else {
          <span class="fb-datepicker__placeholder">{{ placeholder() }}</span>
        }
      </span>
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      [cdkConnectedOverlayPositions]="overlayPositions"
      [cdkConnectedOverlayPanelClass]="'fb-datepicker-panel'"
      (backdropClick)="close(false)"
      (detach)="close(false)"
    >
      <div
        class="fb-datepicker__panel"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="ariaLabel() || 'Date picker'"
        (keydown)="onPanelKeyDown($event)"
      >
        <div class="fb-datepicker__header">
          <button
            type="button"
            class="fb-datepicker__nav"
            aria-label="Previous month"
            [disabled]="prevMonthDisabled()"
            (click)="stepMonth(-1)"
          >
            <fb-icon name="chevron_left" size="sm"></fb-icon>
          </button>
          <span
            #monthLabel
            class="fb-datepicker__month-label"
            [id]="monthLabelId()"
            aria-live="polite"
          >
            {{ monthYearLabel() }}
          </span>
          <button
            type="button"
            class="fb-datepicker__nav"
            aria-label="Next month"
            [disabled]="nextMonthDisabled()"
            (click)="stepMonth(1)"
          >
            <fb-icon name="chevron_right" size="sm"></fb-icon>
          </button>
        </div>
        <div class="fb-datepicker__weekdays" aria-hidden="true">
          @for (label of weekdayLabels; track $index) {
            <span class="fb-datepicker__weekday">{{ label }}</span>
          }
        </div>
        <div
          class="fb-datepicker__grid"
          role="grid"
          [attr.aria-labelledby]="monthLabelId()"
        >
          @for (cell of cells(); track cell.key; let i = $index) {
            <button
              #dayBtn
              type="button"
              class="fb-datepicker__cell"
              [class.fb-datepicker__cell--out]="!cell.inMonth"
              [class.fb-datepicker__cell--today]="isToday(cell.date)"
              [class.fb-datepicker__cell--selected]="isSelected(cell.date)"
              [class.fb-datepicker__cell--focused]="i === focusedIndex()"
              role="gridcell"
              [attr.aria-label]="cellAriaLabel(cell)"
              [attr.aria-selected]="isSelected(cell.date) ? 'true' : 'false'"
              [attr.aria-disabled]="cell.disabled ? 'true' : null"
              [attr.tabindex]="i === focusedIndex() ? 0 : -1"
              [disabled]="cell.disabled"
              (click)="selectCell(cell)"
              (focus)="onCellFocus(i)"
            >
              {{ cell.date.getDate() }}
            </button>
          }
        </div>
      </div>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        width: 100%;
        position: relative;
      }
      .fb-datepicker__trigger {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        width: 100%;
        min-height: var(--touch-secondary);
        padding: var(--space-sm) var(--space-md);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
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
      .fb-datepicker__trigger:focus-visible {
        outline: none;
        border-color: var(--color-focus-ring);
        box-shadow: 0 0 0 2px var(--color-focus-ring);
      }
      .fb-datepicker__trigger:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .fb-datepicker__trigger--invalid {
        border-color: var(--color-error);
      }
      .fb-datepicker__trigger--invalid:focus-visible {
        box-shadow: 0 0 0 2px var(--color-error);
      }
      .fb-datepicker__leading {
        flex: 0 0 auto;
        color: var(--color-text-muted);
      }
      .fb-datepicker__value {
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .fb-datepicker__placeholder {
        color: var(--color-text-muted);
      }
      .fb-datepicker__panel {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        min-width: 280px;
        padding: var(--space-sm);
        background: var(--color-surface-raised);
        color: var(--color-text);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
        font-family: var(--font-family-sans);
        font-size: var(--font-size-base);
      }
      .fb-datepicker__header {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: var(--space-xs);
      }
      .fb-datepicker__nav {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--touch-secondary);
        height: var(--touch-secondary);
        padding: 0;
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        border-radius: var(--radius-md);
        transition: background 120ms ease;
      }
      .fb-datepicker__nav:hover:not(:disabled) {
        background: var(--color-surface);
      }
      .fb-datepicker__nav:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-datepicker__nav:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .fb-datepicker__month-label {
        font-weight: var(--font-weight-medium);
        text-align: center;
      }
      .fb-datepicker__weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
      }
      .fb-datepicker__weekday {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: var(--touch-secondary);
      }
      .fb-datepicker__grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0;
      }
      .fb-datepicker__cell {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--touch-secondary);
        min-height: var(--touch-secondary);
        padding: 0;
        border: 1px solid transparent;
        background: transparent;
        color: var(--color-text);
        font: inherit;
        cursor: pointer;
        border-radius: var(--radius-md);
        transition:
          background 120ms ease,
          color 120ms ease,
          border-color 120ms ease;
      }
      .fb-datepicker__cell:hover:not(:disabled) {
        background: var(--color-surface);
      }
      .fb-datepicker__cell:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .fb-datepicker__cell--out {
        color: var(--color-text-muted);
      }
      .fb-datepicker__cell--today {
        border-color: var(--color-primary);
      }
      .fb-datepicker__cell--selected {
        background: var(--color-primary);
        color: var(--color-on-primary);
      }
      .fb-datepicker__cell--selected.fb-datepicker__cell--today {
        border-color: var(--color-primary);
      }
      .fb-datepicker__cell:disabled,
      .fb-datepicker__cell[aria-disabled='true'] {
        cursor: not-allowed;
        color: var(--color-text-muted);
        opacity: 0.55;
      }
      @media (prefers-reduced-motion: reduce) {
        .fb-datepicker__trigger,
        .fb-datepicker__nav,
        .fb-datepicker__cell {
          transition: none;
        }
      }
    `
  ]
})
export class FbDatepickerComponent {
  readonly value = model<Date | null>(null);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly placeholder = input<string>('Pick a date');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly open = signal<boolean>(false);

  readonly displayedMonth = signal<Date>(this.initialDisplayedMonth());

  readonly focusedDate = signal<Date | null>(null);

  private readonly trigger =
    viewChild<ElementRef<HTMLButtonElement>>('trigger');

  private readonly dayButtons =
    viewChildren<ElementRef<HTMLButtonElement>>('dayBtn');

  readonly weekdayLabels = WEEKDAY_LABELS;

  private readonly uid = Math.random().toString(36).slice(2, 9);

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

  constructor() {
    effect(() => {
      const v = this.value();
      if (!this.open() && v !== null) {
        this.displayedMonth.set(new Date(v.getFullYear(), v.getMonth(), 1));
      }
    });
    effect(() => {
      if (this.open()) {
        queueMicrotask(() => this.focusActiveCell());
      }
    });
  }

  readonly monthYearLabel = computed(() => {
    const d = this.displayedMonth();
    return `${monthLabel(d.getMonth())} ${d.getFullYear()}`;
  });

  readonly formattedValue = computed(() => {
    const v = this.value();
    if (v === null) return '';
    return `${monthLabel(v.getMonth())} ${v.getDate()}, ${v.getFullYear()}`;
  });

  readonly cells = computed<readonly DayCell[]>(() => {
    const displayed = this.displayedMonth();
    const firstOfMonth = new Date(
      displayed.getFullYear(),
      displayed.getMonth(),
      1
    );
    const leadingDays = firstOfMonth.getDay();
    const gridStart = addDays(firstOfMonth, -leadingDays);
    const minBound = this.min();
    const maxBound = this.max();
    const minDay = minBound ? startOfDay(minBound) : null;
    const maxDay = maxBound ? startOfDay(maxBound) : null;
    const month = displayed.getMonth();
    const rows: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = addDays(gridStart, i);
      const inMonth = date.getMonth() === month;
      const belowMin = minDay !== null && date.getTime() < minDay.getTime();
      const aboveMax = maxDay !== null && date.getTime() > maxDay.getTime();
      rows.push({
        date,
        key: dayKey(date),
        inMonth,
        disabled: !inMonth || belowMin || aboveMax
      });
    }
    return rows;
  });

  readonly focusedIndex = computed<number>(() => {
    const focus = this.focusedDate();
    if (focus === null) return -1;
    const list = this.cells();
    for (let i = 0; i < list.length; i++) {
      const cell = list[i];
      if (cell && isSameDay(cell.date, focus)) return i;
    }
    return -1;
  });

  readonly prevMonthDisabled = computed<boolean>(() => {
    const minBound = this.min();
    if (!minBound) return false;
    const displayed = this.displayedMonth();
    const lastDayPrev = new Date(
      displayed.getFullYear(),
      displayed.getMonth(),
      0
    );
    return lastDayPrev.getTime() < startOfDay(minBound).getTime();
  });

  readonly nextMonthDisabled = computed<boolean>(() => {
    const maxBound = this.max();
    if (!maxBound) return false;
    const displayed = this.displayedMonth();
    const nextMonth = new Date(
      displayed.getFullYear(),
      displayed.getMonth() + 1,
      1
    );
    return nextMonth.getTime() > startOfDay(maxBound).getTime();
  });

  monthLabelId(): string {
    return `fb-datepicker-${this.uid}-month`;
  }

  isSelected(date: Date): boolean {
    const v = this.value();
    if (v === null) return false;
    return isSameDay(v, date);
  }

  isToday(date: Date): boolean {
    return isSameDay(date, new Date());
  }

  cellAriaLabel(cell: DayCell): string {
    const d = cell.date;
    return `${weekdayLabel(d.getDay())}, ${monthLabel(d.getMonth())} ${d.getDate()}, ${d.getFullYear()}`;
  }

  toggle(): void {
    if (this.disabled()) return;
    if (this.open()) {
      this.close(false);
      return;
    }
    this.openPanel();
  }

  openPanel(): void {
    const start = this.computeInitialFocus();
    this.displayedMonth.set(new Date(start.getFullYear(), start.getMonth(), 1));
    this.focusedDate.set(start);
    this.open.set(true);
  }

  close(restoreFocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) {
      this.trigger()?.nativeElement.focus();
    }
  }

  stepMonth(delta: number): void {
    const next = addMonths(this.displayedMonth(), delta);
    this.displayedMonth.set(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  selectCell(cell: DayCell): void {
    if (cell.disabled) return;
    this.value.set(cell.date);
    this.close(true);
  }

  onCellFocus(index: number): void {
    const cell = this.cells()[index];
    if (!cell) return;
    if (!isSameDay(cell.date, this.focusedDate() ?? cell.date)) {
      this.focusedDate.set(cell.date);
    }
  }

  onPanelKeyDown(event: KeyboardEvent): void {
    if (!this.open()) return;
    const key = event.key;
    if (key === 'Escape') {
      event.preventDefault();
      this.close(true);
      return;
    }
    const current = this.focusedDate();
    if (current === null) return;
    let next: Date | null = null;
    if (key === 'ArrowLeft') next = addDays(current, -1);
    else if (key === 'ArrowRight') next = addDays(current, 1);
    else if (key === 'ArrowUp') next = addDays(current, -7);
    else if (key === 'ArrowDown') next = addDays(current, 7);
    else if (key === 'Home') next = addDays(current, -current.getDay());
    else if (key === 'End') next = addDays(current, 6 - current.getDay());
    else if (key === 'PageUp') {
      next = event.shiftKey ? addYears(current, -1) : addMonths(current, -1);
    } else if (key === 'PageDown') {
      next = event.shiftKey ? addYears(current, 1) : addMonths(current, 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      const cells = this.cells();
      const idx = this.focusedIndex();
      const cell = idx >= 0 ? cells[idx] : undefined;
      if (cell && !cell.disabled) this.selectCell(cell);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    this.moveFocusTo(next);
  }

  private moveFocusTo(target: Date): void {
    const clamped = this.clampToBounds(target);
    this.focusedDate.set(clamped);
    const displayed = this.displayedMonth();
    if (
      clamped.getMonth() !== displayed.getMonth() ||
      clamped.getFullYear() !== displayed.getFullYear()
    ) {
      this.displayedMonth.set(
        new Date(clamped.getFullYear(), clamped.getMonth(), 1)
      );
    }
    queueMicrotask(() => this.focusActiveCell());
  }

  private clampToBounds(target: Date): Date {
    const minBound = this.min();
    const maxBound = this.max();
    const t = startOfDay(target);
    if (minBound && t.getTime() < startOfDay(minBound).getTime()) {
      return startOfDay(minBound);
    }
    if (maxBound && t.getTime() > startOfDay(maxBound).getTime()) {
      return startOfDay(maxBound);
    }
    return t;
  }

  private focusActiveCell(): void {
    const idx = this.focusedIndex();
    if (idx < 0) return;
    const refs = this.dayButtons();
    refs[idx]?.nativeElement.focus();
  }

  private computeInitialFocus(): Date {
    const v = this.value();
    if (v !== null) return startOfDay(v);
    const today = startOfDay(new Date());
    const minBound = this.min();
    const maxBound = this.max();
    const belowMin =
      minBound && today.getTime() < startOfDay(minBound).getTime();
    const aboveMax =
      maxBound && today.getTime() > startOfDay(maxBound).getTime();
    if (!belowMin && !aboveMax) return today;
    if (belowMin && minBound) return startOfDay(minBound);
    if (aboveMax && maxBound) return startOfDay(maxBound);
    return today;
  }

  private initialDisplayedMonth(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }
}
