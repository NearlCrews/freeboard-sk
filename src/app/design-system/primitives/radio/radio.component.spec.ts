import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbRadioComponent } from './radio.component';
import { FbRadioGroupComponent } from './radio-group.component';

@Component({
  standalone: true,
  imports: [FbRadioComponent, FbRadioGroupComponent],
  template: `
    <fb-radio-group
      [(value)]="value"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel()"
    >
      <fb-radio value="a">Alpha</fb-radio>
      <fb-radio value="b">Bravo</fb-radio>
      <fb-radio value="c" [disabled]="bDisabled()">Charlie</fb-radio>
    </fb-radio-group>
  `
})
class HostComponent {
  value = signal<string | null>(null);
  disabled = signal<boolean>(false);
  ariaLabel = signal<string>('Letters');
  bDisabled = signal<boolean>(false);
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  group: () => HTMLElement;
  radios: () => HTMLButtonElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    group: () =>
      fixture.nativeElement.querySelector('fb-radio-group') as HTMLElement,
    radios: () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('fb-radio button')
      ) as HTMLButtonElement[]
  };
}

describe('FbRadioGroupComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let group: () => HTMLElement;
  let radios: () => HTMLButtonElement[];

  beforeEach(() => {
    ({ host, fixture, group, radios } = setup());
  });

  it('renders role=radiogroup with aria-label', () => {
    const g = group();
    expect(g.getAttribute('role')).toBe('radiogroup');
    expect(g.getAttribute('aria-label')).toBe('Letters');
  });

  it('renders three role=radio children', () => {
    const list = radios();
    expect(list.length).toBe(3);
    list.forEach((r) => expect(r.getAttribute('role')).toBe('radio'));
  });

  it('sets aria-checked on the selected radio when value is set', () => {
    host.value.set('b');
    fixture.detectChanges();
    const list = radios();
    expect(list[0]!.getAttribute('aria-checked')).toBe('false');
    expect(list[1]!.getAttribute('aria-checked')).toBe('true');
    expect(list[2]!.getAttribute('aria-checked')).toBe('false');
  });

  it('updates value on click', () => {
    radios()[2]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe('c');
  });

  it('skips clicks on disabled child radios', () => {
    host.bDisabled.set(true);
    fixture.detectChanges();
    radios()[2]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe(null);
  });

  it('applies roving tabindex so only the selected radio is tabbable', () => {
    host.value.set('a');
    fixture.detectChanges();
    const list = radios();
    expect(list[0]!.getAttribute('tabindex')).toBe('0');
    expect(list[1]!.getAttribute('tabindex')).toBe('-1');
    expect(list[2]!.getAttribute('tabindex')).toBe('-1');
  });

  it('moves selection on ArrowDown', () => {
    host.value.set('a');
    fixture.detectChanges();
    const evt = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true
    });
    group().dispatchEvent(evt);
    fixture.detectChanges();
    expect(host.value()).toBe('b');
  });

  it('moves selection to last on End', () => {
    host.value.set('a');
    fixture.detectChanges();
    const evt = new KeyboardEvent('keydown', {
      key: 'End',
      bubbles: true,
      cancelable: true
    });
    group().dispatchEvent(evt);
    fixture.detectChanges();
    expect(host.value()).toBe('c');
  });

  it('respects group-level disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    radios()[0]!.click();
    fixture.detectChanges();
    expect(host.value()).toBe(null);
    expect(group().getAttribute('aria-disabled')).toBe('true');
  });
});
