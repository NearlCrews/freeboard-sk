import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbSwitchComponent } from './switch.component';

@Component({
  standalone: true,
  imports: [FbSwitchComponent],
  template: `
    <fb-switch
      [(checked)]="checked"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel()"
      >Enable</fb-switch
    >
  `
})
class HostComponent {
  checked = signal<boolean>(false);
  disabled = signal<boolean>(false);
  ariaLabel = signal<string>('');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  btn: () => HTMLButtonElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    btn: () =>
      fixture.nativeElement.querySelector('button') as HTMLButtonElement
  };
}

describe('FbSwitchComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let btn: () => HTMLButtonElement;

  beforeEach(() => {
    ({ host, fixture, btn } = setup());
  });

  it('exposes role=switch with aria-checked', () => {
    const b = btn();
    expect(b.getAttribute('role')).toBe('switch');
    expect(b.getAttribute('aria-checked')).toBe('false');
  });

  it('flips the model on click', () => {
    btn().click();
    fixture.detectChanges();
    expect(host.checked()).toBe(true);
    expect(btn().getAttribute('aria-checked')).toBe('true');
  });

  it('does not toggle when disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    btn().click();
    fixture.detectChanges();
    expect(host.checked()).toBe(false);
  });

  it('projects label content', () => {
    expect(btn().textContent).toContain('Enable');
  });

  it('forwards ariaLabel when provided', () => {
    host.ariaLabel.set('Enable feature');
    fixture.detectChanges();
    expect(btn().getAttribute('aria-label')).toBe('Enable feature');
  });
});
