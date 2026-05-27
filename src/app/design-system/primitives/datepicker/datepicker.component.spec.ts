import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { OverlayModule } from '@angular/cdk/overlay';
import { FbDatepickerComponent } from './datepicker.component';

@Component({
  standalone: true,
  imports: [FbDatepickerComponent],
  template: `
    <fb-datepicker
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [ariaLabel]="ariaLabel()"
    ></fb-datepicker>
  `
})
class HostComponent {
  value = signal<Date | null>(null);
  min = signal<Date | null>(null);
  max = signal<Date | null>(null);
  placeholder = signal<string>('Arrival date');
  disabled = signal<boolean>(false);
  invalid = signal<boolean>(false);
  ariaLabel = signal<string | undefined>('Arrival date');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  trigger: () => HTMLButtonElement;
  panel: () => HTMLElement | null;
  cells: () => HTMLButtonElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [HostComponent, OverlayModule]
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    trigger: () =>
      fixture.nativeElement.querySelector(
        '.fb-datepicker__trigger'
      ) as HTMLButtonElement,
    panel: () =>
      document.querySelector('.fb-datepicker__panel') as HTMLElement | null,
    cells: () =>
      Array.from(
        document.querySelectorAll('.fb-datepicker__cell')
      ) as HTMLButtonElement[]
  };
}

function dispatchKey(target: HTMLElement, key: string, shift = false): void {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    shiftKey: shift
  });
  target.dispatchEvent(event);
}

function cellLabel(c: HTMLButtonElement): string {
  return (c.textContent ?? '').trim();
}

describe('FbDatepickerComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let trigger: () => HTMLButtonElement;
  let panel: () => HTMLElement | null;
  let cells: () => HTMLButtonElement[];

  beforeEach(() => {
    ({ host, fixture, trigger, panel, cells } = setup());
  });

  it('renders a trigger with the placeholder when no value is set', () => {
    const btn = trigger();
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.textContent).toContain('Arrival date');
  });

  it('opens the calendar overlay on click', () => {
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(panel()).not.toBeNull();
    const grid = panel()?.querySelector('[role="grid"]');
    expect(grid).not.toBeNull();
    expect(cells().length).toBe(42);
  });

  it('selects a day on click and closes the overlay', () => {
    host.value.set(new Date(2026, 4, 15));
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    const target = cells().find(
      (c) =>
        cellLabel(c) === '20' &&
        !c.classList.contains('fb-datepicker__cell--out')
    );
    expect(target).toBeDefined();
    target!.click();
    fixture.detectChanges();
    expect(host.value()?.getDate()).toBe(20);
    expect(host.value()?.getMonth()).toBe(4);
    expect(host.value()?.getFullYear()).toBe(2026);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('marks the selected day with aria-selected=true', () => {
    host.value.set(new Date(2026, 4, 10));
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    const selected = cells().find(
      (c) => c.getAttribute('aria-selected') === 'true'
    );
    expect(selected).toBeDefined();
    expect(cellLabel(selected!)).toBe('10');
  });

  it('disables cells below min and above max', () => {
    host.value.set(new Date(2026, 4, 15));
    host.min.set(new Date(2026, 4, 10));
    host.max.set(new Date(2026, 4, 20));
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    const inMonth = cells().filter(
      (c) => !c.classList.contains('fb-datepicker__cell--out')
    );
    const below = inMonth.find((c) => cellLabel(c) === '9');
    const at = inMonth.find((c) => cellLabel(c) === '10');
    const above = inMonth.find((c) => cellLabel(c) === '21');
    expect(below?.getAttribute('aria-disabled')).toBe('true');
    expect(at?.getAttribute('aria-disabled')).toBe(null);
    expect(above?.getAttribute('aria-disabled')).toBe('true');
  });

  it('moves focused date with arrow keys, PageUp/PageDown, Home/End', () => {
    host.value.set(new Date(2026, 4, 15));
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    const panelEl = panel()!;

    dispatchKey(panelEl, 'ArrowRight');
    fixture.detectChanges();
    expect(
      cells()
        .find((c) => c.getAttribute('tabindex') === '0')
        ?.textContent?.trim()
    ).toBe('16');

    dispatchKey(panelEl, 'ArrowDown');
    fixture.detectChanges();
    expect(
      cells()
        .find((c) => c.getAttribute('tabindex') === '0')
        ?.textContent?.trim()
    ).toBe('23');

    dispatchKey(panelEl, 'Home');
    fixture.detectChanges();
    const homeBtn = cells().find((c) => c.getAttribute('tabindex') === '0');
    expect(homeBtn?.textContent?.trim()).toBe('17');

    dispatchKey(panelEl, 'End');
    fixture.detectChanges();
    const endBtn = cells().find((c) => c.getAttribute('tabindex') === '0');
    expect(endBtn?.textContent?.trim()).toBe('23');

    dispatchKey(panelEl, 'PageUp');
    fixture.detectChanges();
    const headerAfterPageUp = panel()?.querySelector(
      '.fb-datepicker__month-label'
    );
    expect(headerAfterPageUp?.textContent).toContain('April');

    dispatchKey(panelEl, 'PageDown');
    fixture.detectChanges();
    const headerAfterPageDown = panel()?.querySelector(
      '.fb-datepicker__month-label'
    );
    expect(headerAfterPageDown?.textContent).toContain('May');
  });

  it('closes without selecting on Escape', () => {
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    dispatchKey(panel()!, 'Escape');
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(host.value()).toBe(null);
  });

  it('does not open when disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
  });

  it('reflects ariaLabel and aria-invalid', () => {
    host.invalid.set(true);
    fixture.detectChanges();
    const btn = trigger();
    expect(btn.getAttribute('aria-label')).toBe('Arrival date');
    expect(btn.getAttribute('aria-invalid')).toBe('true');
  });
});
