import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  contentChildren,
  input,
  model
} from '@angular/core';
import { FbRadioComponent } from './radio.component';

/**
 * Tier-2 form Radio Group primitive (parent).
 *
 * Holds the selected value and coordinates focus/selection across its
 * `<fb-radio>` children. Implements the WAI-ARIA radiogroup keyboard
 * pattern: arrow keys move both focus and selection, Home/End jump to
 * first/last, roving tabindex on the children.
 *
 * A11y posture:
 *  - Host gets role="radiogroup" and forwards aria-label.
 *  - Children get role="radio" + aria-checked, with tabindex 0 on the
 *    currently selected radio and -1 on the rest.
 */
@Component({
  selector: 'fb-radio-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'disabled() || null'
  },
  styles: [
    `
      :host {
        display: inline-flex;
        flex-direction: column;
        gap: var(--space-sm);
      }
    `
  ]
})
export class FbRadioGroupComponent implements AfterContentInit {
  readonly value = model<string | null>(null);
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  private readonly children = contentChildren(FbRadioComponent);

  ngAfterContentInit(): void {
    for (const child of this.children()) {
      child.attach(this);
    }
  }

  isSelected(radioValue: string): boolean {
    return this.value() === radioValue;
  }

  isFocusable(radioValue: string): boolean {
    const current = this.value();
    if (current !== null) {
      return current === radioValue;
    }
    return this.firstEnabledValue() === radioValue;
  }

  isDisabled(): boolean {
    return this.disabled();
  }

  select(radioValue: string): void {
    if (this.disabled()) return;
    this.value.set(radioValue);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const key = event.key;
    if (
      key !== 'ArrowDown' &&
      key !== 'ArrowUp' &&
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }
    event.preventDefault();
    const enabled = this.enabledValues();
    if (enabled.length === 0) return;
    const current = this.value();
    const currentIdx = current === null ? -1 : enabled.indexOf(current);

    let nextIdx: number;
    if (key === 'Home') {
      nextIdx = 0;
    } else if (key === 'End') {
      nextIdx = enabled.length - 1;
    } else if (key === 'ArrowDown' || key === 'ArrowRight') {
      nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % enabled.length;
    } else {
      nextIdx =
        currentIdx === -1
          ? enabled.length - 1
          : (currentIdx - 1 + enabled.length) % enabled.length;
    }
    const nextValue = enabled[nextIdx];
    if (nextValue === undefined) return;
    this.value.set(nextValue);
    const target = this.children().find((c) => c.value() === nextValue);
    target?.focus();
  }

  private enabledValues(): string[] {
    const out: string[] = [];
    for (const child of this.children()) {
      if (!child.disabled()) out.push(child.value());
    }
    return out;
  }

  private firstEnabledValue(): string | null {
    const enabled = this.enabledValues();
    return enabled.length > 0 ? (enabled[0] ?? null) : null;
  }
}
