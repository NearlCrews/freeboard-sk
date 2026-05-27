import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbTextareaComponent } from './textarea.component';

@Component({
  standalone: true,
  imports: [FbTextareaComponent],
  template: `
    <fb-textarea
      [name]="name()"
      [(value)]="value"
      [rows]="rows()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [ariaLabel]="ariaLabel()"
    ></fb-textarea>
  `
})
class HostComponent {
  name = signal<string>('notes');
  value = signal<string>('');
  rows = signal<number>(3);
  placeholder = signal<string>('');
  disabled = signal<boolean>(false);
  invalid = signal<boolean>(false);
  ariaLabel = signal<string>('');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  query: () => HTMLTextAreaElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    query: () =>
      fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement
  };
}

describe('FbTextareaComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let query: () => HTMLTextAreaElement;

  beforeEach(() => {
    ({ host, fixture, query } = setup());
  });

  it('renders a textarea with default rows=3', () => {
    expect(query().rows).toBe(3);
  });

  it('reflects rows changes', () => {
    host.rows.set(6);
    fixture.detectChanges();
    expect(query().rows).toBe(6);
  });

  it('marks aria-invalid when invalid', () => {
    host.invalid.set(true);
    fixture.detectChanges();
    expect(query().getAttribute('aria-invalid')).toBe('true');
    expect(query().className).toContain('fb-textarea--invalid');
  });

  it('forwards ariaLabel when provided', () => {
    host.ariaLabel.set('Notes');
    fixture.detectChanges();
    expect(query().getAttribute('aria-label')).toBe('Notes');
  });

  it('updates the model on input', () => {
    const el = query();
    el.value = 'multiline\nvalue';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.value()).toBe('multiline\nvalue');
  });
});
