import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbDividerComponent,
  type FbDividerOrientation
} from './divider.component';

@Component({
  standalone: true,
  imports: [FbDividerComponent],
  template: `<fb-divider [orientation]="orientation()"></fb-divider>`
})
class HostComponent {
  orientation = signal<FbDividerOrientation>('horizontal');
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
    el: () => fixture.nativeElement.querySelector('fb-divider') as HTMLElement
  };
}

describe('FbDividerComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let el: () => HTMLElement;

  beforeEach(() => {
    ({ host, fixture, el } = setup());
  });

  it('renders an <hr> for horizontal (default)', () => {
    expect(el().getAttribute('data-orientation')).toBe('horizontal');
    expect(el().querySelector('hr')).not.toBeNull();
    expect(el().querySelector('[role="separator"]')).toBeNull();
  });

  it('renders a separator span with aria-orientation for vertical', () => {
    host.orientation.set('vertical');
    fixture.detectChanges();
    expect(el().getAttribute('data-orientation')).toBe('vertical');
    const sep = el().querySelector('[role="separator"]');
    expect(sep).not.toBeNull();
    expect(sep?.getAttribute('aria-orientation')).toBe('vertical');
    expect(el().querySelector('hr')).toBeNull();
  });
});
