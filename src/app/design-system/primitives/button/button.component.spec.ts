import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FbButtonComponent,
  type FbButtonSize,
  type FbButtonVariant
} from './button.component';

/**
 * Host wrapper drives signal inputs through the template. Backing host
 * state with signals keeps zoneless OnPush detection consistent across the
 * dev-mode two-pass verification cycle.
 */
@Component({
  standalone: true,
  imports: [FbButtonComponent],
  template: `
    <fb-button
      [variant]="variant()"
      [size]="size()"
      [disabled]="disabled()"
      [loading]="loading()"
      [ariaLabel]="ariaLabel()"
      (pressed)="onPressed($event)"
      >Hello</fb-button
    >
  `
})
class HostComponent {
  variant = signal<FbButtonVariant>('primary');
  size = signal<FbButtonSize>('md');
  disabled = signal(false);
  loading = signal(false);
  ariaLabel = signal('');
  pressedCount = 0;
  lastEvent: MouseEvent | null = null;
  onPressed(event: MouseEvent): void {
    this.pressedCount += 1;
    this.lastEvent = event;
  }
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  query: () => HTMLButtonElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    query: () =>
      fixture.nativeElement.querySelector('button') as HTMLButtonElement
  };
}

describe('FbButtonComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let query: () => HTMLButtonElement;

  beforeEach(() => {
    ({ host, fixture, query } = setup());
  });

  it('renders the projected label', () => {
    expect(query().textContent?.trim()).toContain('Hello');
  });

  it('reflects the variant input on the data attribute and class list', () => {
    host.variant.set('danger');
    fixture.detectChanges();
    const btn = query();
    expect(btn.getAttribute('data-variant')).toBe('danger');
    expect(btn.className).toContain('fb-btn--danger');
  });

  it('reflects the size input on the data attribute and class list', () => {
    host.size.set('lg');
    fixture.detectChanges();
    const btn = query();
    expect(btn.getAttribute('data-size')).toBe('lg');
    expect(btn.className).toContain('fb-btn--lg');
  });

  it('exposes ariaLabel when provided', () => {
    host.ariaLabel.set('Drop anchor');
    fixture.detectChanges();
    expect(query().getAttribute('aria-label')).toBe('Drop anchor');
  });

  it('emits pressed for normal clicks', () => {
    query().click();
    expect(host.pressedCount).toBe(1);
  });

  it('sets aria-disabled and aria-busy while loading, and suppresses pressed', () => {
    host.loading.set(true);
    fixture.detectChanges();
    const btn = query();
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    btn.click();
    expect(host.pressedCount).toBe(0);
  });

  it('does not emit when disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    const btn = query();
    expect(btn.disabled).toBe(true);
    btn.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
    expect(host.pressedCount).toBe(0);
  });
});
