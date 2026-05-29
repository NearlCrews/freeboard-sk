import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbBadgeComponent,
  type FbBadgePosition,
  type FbBadgeSeverity,
  type FbBadgeSize
} from './badge.component';

@Component({
  standalone: true,
  imports: [FbBadgeComponent],
  template: `
    <fb-badge
      [value]="value()"
      [hidden]="hidden()"
      [position]="position()"
      [size]="size()"
      [severity]="severity()"
      [ariaLabel]="ariaLabel()"
      ><span class="anchor">A</span></fb-badge
    >
  `
})
class HostComponent {
  value = signal<string>('');
  hidden = signal<boolean>(false);
  position = signal<FbBadgePosition>('above after');
  size = signal<FbBadgeSize>('medium');
  severity = signal<FbBadgeSeverity>('primary');
  ariaLabel = signal<string>('');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  bubble: () => HTMLElement | null;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    bubble: () =>
      fixture.nativeElement.querySelector('.fb-badge__bubble') as HTMLElement
  };
}

describe('FbBadgeComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let bubble: () => HTMLElement | null;

  beforeEach(() => {
    ({ host, fixture, bubble } = setup());
  });

  it('renders a dot bubble when value is empty', () => {
    const b = bubble();
    expect(b).not.toBeNull();
    expect(b?.className).toContain('fb-badge__bubble--dot');
    expect(b?.textContent?.trim()).toBe('');
  });

  it('renders a text bubble with the value', () => {
    host.value.set('1');
    fixture.detectChanges();
    const b = bubble();
    expect(b?.className).toContain('fb-badge__bubble--text');
    expect(b?.textContent?.trim()).toBe('1');
  });

  it('projects ariaLabel onto the bubble with role="status"', () => {
    host.value.set('3');
    host.ariaLabel.set('3 new alerts');
    fixture.detectChanges();
    const b = bubble();
    expect(b?.getAttribute('aria-label')).toBe('3 new alerts');
    expect(b?.getAttribute('role')).toBe('status');
  });

  it('removes the bubble from the DOM when hidden', () => {
    host.hidden.set(true);
    fixture.detectChanges();
    expect(bubble()).toBeNull();
  });

  it('applies the severity class', () => {
    host.severity.set('danger');
    fixture.detectChanges();
    expect(bubble()?.className).toContain('fb-badge__bubble--danger');
  });

  it('applies the position class', () => {
    host.position.set('below before');
    fixture.detectChanges();
    expect(bubble()?.className).toContain('fb-badge__bubble--pos-below-before');
  });
});
