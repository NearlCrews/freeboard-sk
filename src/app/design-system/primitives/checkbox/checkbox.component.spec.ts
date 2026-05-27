import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbCheckboxComponent } from './checkbox.component';

@Component({
  standalone: true,
  imports: [FbCheckboxComponent],
  template: `
    <fb-checkbox
      [(checked)]="checked"
      [disabled]="disabled()"
      [indeterminate]="indeterminate()"
      [ariaLabel]="ariaLabel()"
      >Subscribe</fb-checkbox
    >
  `
})
class HostComponent {
  checked = signal<boolean>(false);
  disabled = signal<boolean>(false);
  indeterminate = signal<boolean>(false);
  ariaLabel = signal<string>('');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  native: () => HTMLInputElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    native: () =>
      fixture.nativeElement.querySelector(
        'input[type="checkbox"]'
      ) as HTMLInputElement
  };
}

describe('FbCheckboxComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let native: () => HTMLInputElement;

  beforeEach(() => {
    ({ host, fixture, native } = setup());
  });

  it('projects label content', () => {
    expect(fixture.nativeElement.textContent).toContain('Subscribe');
  });

  it('toggles the model on change', () => {
    const el = native();
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(host.checked()).toBe(true);
  });

  it('respects disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    expect(native().disabled).toBe(true);
  });

  it('sets aria-checked="mixed" when indeterminate', () => {
    host.indeterminate.set(true);
    fixture.detectChanges();
    expect(native().getAttribute('aria-checked')).toBe('mixed');
  });

  it('sets aria-checked="true" when checked', () => {
    host.checked.set(true);
    fixture.detectChanges();
    expect(native().getAttribute('aria-checked')).toBe('true');
  });

  it('forwards ariaLabel when provided', () => {
    host.ariaLabel.set('Subscribe to newsletter');
    fixture.detectChanges();
    expect(native().getAttribute('aria-label')).toBe('Subscribe to newsletter');
  });
});
