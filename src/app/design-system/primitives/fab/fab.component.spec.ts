import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbFabComponent,
  type FbFabPosition,
  type FbFabVariant
} from './fab.component';

@Component({
  standalone: true,
  imports: [FbFabComponent],
  template: `
    <fb-fab
      [icon]="icon()"
      [ariaLabel]="ariaLabel()"
      [variant]="variant()"
      [position]="position()"
      [disabled]="disabled()"
      (pressed)="onPressed()"
    ></fb-fab>
  `
})
class HostComponent {
  icon = signal<string>('anchor');
  ariaLabel = signal<string>('Drop anchor');
  variant = signal<FbFabVariant>('primary');
  position = signal<FbFabPosition>('static');
  disabled = signal<boolean>(false);
  pressedCount = 0;
  onPressed(): void {
    this.pressedCount += 1;
  }
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  button: () => HTMLButtonElement;
  fab: () => HTMLElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    button: () =>
      fixture.nativeElement.querySelector('button') as HTMLButtonElement,
    fab: () => fixture.nativeElement.querySelector('fb-fab') as HTMLElement
  };
}

describe('FbFabComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let button: () => HTMLButtonElement;
  let fab: () => HTMLElement;

  beforeEach(() => {
    ({ host, fixture, button, fab } = setup());
  });

  it('applies the required aria-label to the underlying button', () => {
    expect(button().getAttribute('aria-label')).toBe('Drop anchor');
  });

  it('renders an fb-icon with the chosen glyph name', () => {
    const icon = fab().querySelector('fb-icon');
    expect(icon?.textContent?.trim()).toBe('anchor');
  });

  it('reflects the variant input on data attribute and class list', () => {
    host.variant.set('secondary');
    fixture.detectChanges();
    const btn = button();
    expect(btn.getAttribute('data-variant')).toBe('secondary');
    expect(btn.className).toContain('fb-fab--secondary');
  });

  it('reflects position on the host data attribute', () => {
    host.position.set('bottom-right');
    fixture.detectChanges();
    expect(fab().getAttribute('data-position')).toBe('bottom-right');
  });

  it('emits pressed for normal clicks', () => {
    button().click();
    expect(host.pressedCount).toBe(1);
  });

  it('suppresses pressed when disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    const btn = button();
    expect(btn.disabled).toBe(true);
    btn.click();
    expect(host.pressedCount).toBe(0);
  });
});
