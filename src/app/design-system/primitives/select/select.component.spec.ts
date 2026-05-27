import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { OverlayModule } from '@angular/cdk/overlay';
import { FbSelectComponent, type FbSelectOption } from './select.component';

@Component({
  standalone: true,
  imports: [FbSelectComponent],
  template: `
    <fb-select
      name="theme"
      [options]="options()"
      [(value)]="value"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [ariaLabel]="ariaLabel()"
    ></fb-select>
  `
})
class HostComponent {
  options = signal<readonly FbSelectOption[]>([
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark', disabled: true },
    { id: 'night-red', label: 'Night red' }
  ]);
  value = signal<string | null>(null);
  placeholder = signal<string>('Choose theme');
  disabled = signal<boolean>(false);
  invalid = signal<boolean>(false);
  ariaLabel = signal<string>('Theme');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  trigger: () => HTMLButtonElement;
  options: () => HTMLElement[];
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
        '.fb-select__trigger'
      ) as HTMLButtonElement,
    options: () =>
      Array.from(
        document.querySelectorAll('.fb-select__option')
      ) as HTMLElement[]
  };
}

describe('FbSelectComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let trigger: () => HTMLButtonElement;
  let options: () => HTMLElement[];

  beforeEach(() => {
    ({ host, fixture, trigger, options } = setup());
  });

  it('renders a combobox trigger with the placeholder when no value', () => {
    const btn = trigger();
    expect(btn.getAttribute('role')).toBe('combobox');
    expect(btn.getAttribute('aria-haspopup')).toBe('listbox');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.textContent).toContain('Choose theme');
  });

  it('opens the listbox on click and shows option rows', () => {
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const opts = options();
    expect(opts.length).toBe(3);
    expect(opts[0]!.getAttribute('role')).toBe('option');
  });

  it('selects an option on click and closes', () => {
    trigger().click();
    fixture.detectChanges();
    options()[2]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe('night-red');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('marks the selected option with aria-selected=true', () => {
    host.value.set('light');
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    const opts = options();
    expect(opts[0]!.getAttribute('aria-selected')).toBe('true');
    expect(opts[2]!.getAttribute('aria-selected')).toBe('false');
  });

  it('ignores clicks on disabled options', () => {
    trigger().click();
    fixture.detectChanges();
    options()[1]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe(null);
  });

  it('reflects ariaLabel and aria-invalid', () => {
    host.invalid.set(true);
    fixture.detectChanges();
    const btn = trigger();
    expect(btn.getAttribute('aria-label')).toBe('Theme');
    expect(btn.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the selected label after picking a value', () => {
    host.value.set('night-red');
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Night red');
  });

  it('does not open when disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});
