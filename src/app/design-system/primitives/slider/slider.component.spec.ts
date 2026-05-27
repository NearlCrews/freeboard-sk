import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbSliderComponent } from './slider.component';

@Component({
  standalone: true,
  imports: [FbSliderComponent],
  template: `
    <fb-slider
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel()"
    ></fb-slider>
  `
})
class HostComponent {
  value = signal<number>(50);
  min = signal<number>(0);
  max = signal<number>(100);
  step = signal<number>(1);
  disabled = signal<boolean>(false);
  ariaLabel = signal<string>('Volume');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  input: () => HTMLInputElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    input: () =>
      fixture.nativeElement.querySelector(
        'input[type="range"]'
      ) as HTMLInputElement
  };
}

describe('FbSliderComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let input: () => HTMLInputElement;

  beforeEach(() => {
    ({ host, fixture, input } = setup());
  });

  it('exposes aria-valuemin, aria-valuemax, and aria-valuenow', () => {
    const el = input();
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
    expect(el.getAttribute('aria-valuenow')).toBe('50');
  });

  it('forwards ariaLabel', () => {
    expect(input().getAttribute('aria-label')).toBe('Volume');
  });

  it('updates the model on native input', () => {
    const el = input();
    el.value = '75';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.value()).toBe(75);
  });

  it('jumps by 10% of range on PageUp via host keydown', () => {
    host.value.set(50);
    fixture.detectChanges();
    const el = input();
    const evt = new KeyboardEvent('keydown', {
      key: 'PageUp',
      bubbles: true,
      cancelable: true
    });
    el.dispatchEvent(evt);
    fixture.detectChanges();
    expect(host.value()).toBe(60);
  });

  it('jumps by 10% of range on PageDown', () => {
    host.value.set(50);
    fixture.detectChanges();
    const el = input();
    const evt = new KeyboardEvent('keydown', {
      key: 'PageDown',
      bubbles: true,
      cancelable: true
    });
    el.dispatchEvent(evt);
    fixture.detectChanges();
    expect(host.value()).toBe(40);
  });

  it('respects disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    expect(input().disabled).toBe(true);
  });

  it('reflects min/max/step', () => {
    host.min.set(10);
    host.max.set(20);
    host.step.set(2);
    fixture.detectChanges();
    const el = input();
    expect(el.min).toBe('10');
    expect(el.max).toBe('20');
    expect(el.step).toBe('2');
  });
});
