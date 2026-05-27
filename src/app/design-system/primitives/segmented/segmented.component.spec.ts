import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbSegmentedComponent,
  type FbSegmentedOption
} from './segmented.component';

@Component({
  standalone: true,
  imports: [FbSegmentedComponent],
  template: `
    <fb-segmented
      [options]="options()"
      [(value)]="value"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel()"
    ></fb-segmented>
  `
})
class HostComponent {
  options = signal<readonly FbSegmentedOption[]>([
    { id: 'day', label: 'Day' },
    { id: 'night', label: 'Night', disabled: true },
    { id: 'auto', label: 'Auto' }
  ]);
  value = signal<string>('day');
  disabled = signal<boolean>(false);
  ariaLabel = signal<string>('Mode');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  group: () => HTMLElement;
  segments: () => HTMLButtonElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    group: () =>
      fixture.nativeElement.querySelector('fb-segmented') as HTMLElement,
    segments: () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.fb-segmented__item')
      ) as HTMLButtonElement[]
  };
}

describe('FbSegmentedComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let group: () => HTMLElement;
  let segments: () => HTMLButtonElement[];

  beforeEach(() => {
    ({ host, fixture, group, segments } = setup());
  });

  it('renders role=radiogroup on host with one role=radio per option', () => {
    expect(group().getAttribute('role')).toBe('radiogroup');
    expect(group().getAttribute('aria-label')).toBe('Mode');
    const list = segments();
    expect(list.length).toBe(3);
    list.forEach((s) => expect(s.getAttribute('role')).toBe('radio'));
  });

  it('marks the selected segment with aria-checked=true', () => {
    const list = segments();
    expect(list[0]!.getAttribute('aria-checked')).toBe('true');
    expect(list[1]!.getAttribute('aria-checked')).toBe('false');
    expect(list[2]!.getAttribute('aria-checked')).toBe('false');
  });

  it('applies roving tabindex (selected = 0, rest = -1)', () => {
    const list = segments();
    expect(list[0]!.getAttribute('tabindex')).toBe('0');
    expect(list[1]!.getAttribute('tabindex')).toBe('-1');
    expect(list[2]!.getAttribute('tabindex')).toBe('-1');
  });

  it('updates value on click', () => {
    segments()[2]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe('auto');
  });

  it('ignores clicks on disabled segments', () => {
    segments()[1]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe('day');
  });

  it('skips disabled segments on ArrowRight', () => {
    const evt = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true
    });
    group().dispatchEvent(evt);
    fixture.detectChanges();
    expect(host.value()).toBe('auto');
  });

  it('jumps to last enabled on End', () => {
    const evt = new KeyboardEvent('keydown', {
      key: 'End',
      bubbles: true,
      cancelable: true
    });
    group().dispatchEvent(evt);
    fixture.detectChanges();
    expect(host.value()).toBe('auto');
  });

  it('respects group-level disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    segments()[2]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe('day');
    expect(group().getAttribute('aria-disabled')).toBe('true');
  });
});
