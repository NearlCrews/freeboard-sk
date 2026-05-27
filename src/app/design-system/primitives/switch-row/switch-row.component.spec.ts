import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbSwitchRowComponent } from './switch-row.component';

@Component({
  standalone: true,
  imports: [FbSwitchRowComponent],
  template: `
    <fb-switch-row
      [(checked)]="checked"
      [disabled]="disabled()"
      [icon]="icon()"
      [ariaLabel]="ariaLabel()"
      >Enable feature</fb-switch-row
    >
  `
})
class HostComponent {
  checked = signal<boolean>(false);
  disabled = signal<boolean>(false);
  icon = signal<string | undefined>(undefined);
  ariaLabel = signal<string | undefined>(undefined);
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  row: () => HTMLElement;
  label: () => HTMLElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    row: () =>
      fixture.nativeElement.querySelector('fb-switch-row') as HTMLElement,
    label: () =>
      fixture.nativeElement.querySelector(
        '.fb-switch-row__label'
      ) as HTMLElement
  };
}

describe('FbSwitchRowComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let row: () => HTMLElement;
  let label: () => HTMLElement;

  beforeEach(() => {
    ({ host, fixture, row, label } = setup());
  });

  it('renders host as role=group with density attribute', () => {
    expect(row().getAttribute('role')).toBe('group');
    expect(row().getAttribute('data-density')).toBe('comfortable');
  });

  it('renders the leading icon when icon input is set', () => {
    expect(
      fixture.nativeElement.querySelector('.fb-switch-row__leading')
    ).toBeNull();
    host.icon.set('visibility');
    fixture.detectChanges();
    const leading = fixture.nativeElement.querySelector(
      '.fb-switch-row__leading'
    );
    expect(leading).not.toBeNull();
    expect(leading?.textContent ?? '').toContain('visibility');
  });

  it('clicking the label area toggles checked', () => {
    label().click();
    fixture.detectChanges();
    expect(host.checked()).toBe(true);
  });

  it('clicking the row when disabled does not toggle', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    label().click();
    fixture.detectChanges();
    expect(host.checked()).toBe(false);
  });

  it('forwards ariaLabel to host role=group attribute', () => {
    host.ariaLabel.set('Toggle ship type filter');
    fixture.detectChanges();
    expect(row().getAttribute('aria-label')).toBe('Toggle ship type filter');
  });
});
