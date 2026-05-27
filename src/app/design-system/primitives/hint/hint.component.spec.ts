import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbHintComponent, type FbHintVariant } from './hint.component';

@Component({
  standalone: true,
  imports: [FbHintComponent],
  template: `<fb-hint [variant]="variant()">{{ text() }}</fb-hint>`
})
class HostComponent {
  variant = signal<FbHintVariant>('info');
  text = signal('Helper text');
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  el: () => HTMLElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    el: () => fixture.nativeElement.querySelector('fb-hint') as HTMLElement
  };
}

describe('FbHintComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let el: () => HTMLElement;

  beforeEach(() => {
    ({ host, fixture, el } = setup());
  });

  it('sets role="note" on the host', () => {
    expect(el().getAttribute('role')).toBe('note');
  });

  it('renders projected text', () => {
    expect(el().textContent?.trim()).toBe('Helper text');
  });

  it('defaults variant to info', () => {
    expect(el().getAttribute('data-variant')).toBe('info');
  });

  it.each<FbHintVariant>(['info', 'warn', 'error', 'success'])(
    'reflects %s variant on the host data attribute',
    (variant) => {
      host.variant.set(variant);
      fixture.detectChanges();
      expect(el().getAttribute('data-variant')).toBe(variant);
    }
  );
});
