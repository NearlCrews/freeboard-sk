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
 * Generic over the value type. Default `T = string` keeps existing
 * call sites source-compatible; numeric-keyed groups can specialize.
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
export class FbRadioGroupComponent<
  T extends string | number = string
> implements AfterContentInit {
  readonly value = model<T | null>(null);
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  private readonly children = contentChildren(FbRadioComponent);

  ngAfterContentInit(): void {
    for (const child of this.children()) {
      child.attach(this);
    }
  }

  isSelected(radioValue: string | number): boolean {
    return this.value() === (radioValue as T);
  }

  isFocusable(radioValue: string | number): boolean {
    const current = this.value();
    if (current !== null) {
      return current === (radioValue as T);
    }
    return this.firstEnabledValue() === radioValue;
  }

  isDisabled(): boolean {
    return this.disabled();
  }

  select(radioValue: string | number): void {
    if (this.disabled()) return;
    this.value.set(radioValue as T);
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

  private enabledValues(): T[] {
    const out: T[] = [];
    for (const child of this.children()) {
      if (!child.disabled()) out.push(child.value() as T);
    }
    return out;
  }

  private firstEnabledValue(): T | null {
    const enabled = this.enabledValues();
    return enabled.length > 0 ? (enabled[0] ?? null) : null;
  }
}

/**
 * Structural host contract the child `fb-radio` uses to read selection
 * state, focusability, and disabled-state from its parent group. The
 * group implements this implicitly via its public methods above; the
 * child stores it as a type-erased `string | number` reference so it
 * does not need to be generic itself.
 */
export interface RadioGroupHost {
  isSelected(value: string | number): boolean;
  isFocusable(value: string | number): boolean;
  isDisabled(): boolean;
  select(value: string | number): void;
}
