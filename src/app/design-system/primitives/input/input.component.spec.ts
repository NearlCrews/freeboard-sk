import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbInputComponent, type FbInputType } from './input.component';

@Component({
  standalone: true,
  imports: [FbInputComponent],
  template: `
    <fb-input
      [name]="name()"
      [(value)]="value"
      [type]="type()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [ariaLabel]="ariaLabel()"
    ></fb-input>
  `
})
class HostComponent {
  name = signal<string>('email');
  value = signal<string>('');
  type = signal<FbInputType>('text');
  placeholder = signal<string>('');
  disabled = signal<boolean>(false);
  invalid = signal<boolean>(false);
  ariaLabel = signal<string>('');
}

@Component({
  standalone: true,
  imports: [FbInputComponent],
  template: `
    <fb-input
      name="depth"
      [numericMode]="true"
      [(numericValue)]="depth"
      [min]="0"
      [max]="100"
      [step]="0.1"
      ariaLabel="Depth"
    ></fb-input>
  `
})
class NumericHostComponent {
  depth = signal<number | null>(null);
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  query: () => HTMLInputElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    query: () =>
      fixture.nativeElement.querySelector('input') as HTMLInputElement
  };
}

describe('FbInputComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let query: () => HTMLInputElement;

  beforeEach(() => {
    ({ host, fixture, query } = setup());
  });

  it('renders an input with the supplied name and type', () => {
    expect(query().name).toBe('email');
    expect(query().type).toBe('text');
  });

  it('reflects type changes', () => {
    host.type.set('password');
    fixture.detectChanges();
    expect(query().type).toBe('password');
  });

  it('reflects placeholder when provided', () => {
    host.placeholder.set('you@example.com');
    fixture.detectChanges();
    expect(query().getAttribute('placeholder')).toBe('you@example.com');
  });

  it('marks aria-invalid when invalid', () => {
    host.invalid.set(true);
    fixture.detectChanges();
    expect(query().getAttribute('aria-invalid')).toBe('true');
    expect(query().className).toContain('fb-input--invalid');
  });

  it('forwards ariaLabel when provided', () => {
    host.ariaLabel.set('Email address');
    fixture.detectChanges();
    expect(query().getAttribute('aria-label')).toBe('Email address');
  });

  it('disables the field when disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    expect(query().disabled).toBe(true);
  });

  it('updates the model on input', () => {
    const el = query();
    el.value = 'hello';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.value()).toBe('hello');
  });
});

describe('FbInputComponent (numeric mode)', () => {
  let host: NumericHostComponent;
  let fixture: ComponentFixture<NumericHostComponent>;
  let query: () => HTMLInputElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [NumericHostComponent] });
    fixture = TestBed.createComponent(NumericHostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    query = () =>
      fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  it('forces type=number and inputmode=numeric', () => {
    const el = query();
    expect(el.type).toBe('number');
    expect(el.getAttribute('inputmode')).toBe('numeric');
  });

  it('forwards min, max, and step attributes', () => {
    const el = query();
    expect(el.getAttribute('min')).toBe('0');
    expect(el.getAttribute('max')).toBe('100');
    expect(el.getAttribute('step')).toBe('0.1');
  });

  it('parses numeric input into the numericValue model', () => {
    const el = query();
    el.value = '42.5';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.depth()).toBe(42.5);
  });

  it('maps an empty field to null', () => {
    const el = query();
    el.value = '12';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.depth()).toBe(12);
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.depth()).toBe(null);
  });

  it('renders the stored number back into the field', () => {
    host.depth.set(7);
    fixture.detectChanges();
    expect(query().value).toBe('7');
  });
});
