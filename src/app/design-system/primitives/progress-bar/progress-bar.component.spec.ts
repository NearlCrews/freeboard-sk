import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbProgressBarComponent } from './progress-bar.component';

@Component({
  standalone: true,
  imports: [FbProgressBarComponent],
  template: `
    <fb-progress-bar
      [value]="value()"
      [max]="max()"
      [indeterminate]="indeterminate()"
    ></fb-progress-bar>
  `
})
class HostComponent {
  value = signal<number>(40);
  max = signal<number>(100);
  indeterminate = signal<boolean>(false);
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  el: () => HTMLElement;
  progress: () => HTMLProgressElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    el: () =>
      fixture.nativeElement.querySelector('fb-progress-bar') as HTMLElement,
    progress: () =>
      fixture.nativeElement.querySelector('progress') as HTMLProgressElement
  };
}

describe('FbProgressBarComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let el: () => HTMLElement;
  let progress: () => HTMLProgressElement;

  beforeEach(() => {
    ({ host, fixture, el, progress } = setup());
  });

  it('renders a <progress> element with role="progressbar"', () => {
    expect(progress()).not.toBeNull();
    expect(progress().getAttribute('role')).toBe('progressbar');
  });

  it('reflects value, max, and aria attributes for determinate mode', () => {
    const p = progress();
    expect(p.getAttribute('aria-valuemin')).toBe('0');
    expect(p.getAttribute('aria-valuemax')).toBe('100');
    expect(p.getAttribute('aria-valuenow')).toBe('40');
    expect(p.value).toBe(40);
    expect(p.max).toBe(100);
  });

  it('clamps value to [0, max]', () => {
    host.value.set(-10);
    fixture.detectChanges();
    expect(progress().getAttribute('aria-valuenow')).toBe('0');

    host.value.set(250);
    fixture.detectChanges();
    expect(progress().getAttribute('aria-valuenow')).toBe('100');
  });

  it('omits aria-valuenow and adds the indeterminate marker when indeterminate', () => {
    host.indeterminate.set(true);
    fixture.detectChanges();
    expect(el().getAttribute('data-indeterminate')).toBe('true');
    expect(progress().getAttribute('aria-valuenow')).toBeNull();
    expect(progress().className).toContain('fb-progress--indeterminate');
  });

  it('respects a custom max', () => {
    host.max.set(50);
    host.value.set(25);
    fixture.detectChanges();
    const p = progress();
    expect(p.getAttribute('aria-valuemax')).toBe('50');
    expect(p.getAttribute('aria-valuenow')).toBe('25');
  });
});
