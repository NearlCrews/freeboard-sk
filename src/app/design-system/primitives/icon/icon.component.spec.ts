import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbIconComponent,
  type FbIconFill,
  type FbIconSize,
  type FbIconWeight
} from './icon.component';

@Component({
  standalone: true,
  imports: [FbIconComponent],
  template: `
    <fb-icon
      [name]="name()"
      [size]="size()"
      [ariaLabel]="ariaLabel()"
      [weight]="weight()"
      [fill]="fill()"
    ></fb-icon>
  `
})
class HostComponent {
  name = signal<string>('anchor');
  size = signal<FbIconSize>('md');
  ariaLabel = signal<string>('');
  weight = signal<FbIconWeight>(400);
  fill = signal<FbIconFill>(0);
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  query: () => HTMLElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    query: () => fixture.nativeElement.querySelector('fb-icon') as HTMLElement
  };
}

describe('FbIconComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let query: () => HTMLElement;

  beforeEach(() => {
    ({ host, fixture, query } = setup());
  });

  it('renders the glyph ligature text', () => {
    expect(query().textContent?.trim()).toBe('anchor');
  });

  it('is aria-hidden when no ariaLabel is provided', () => {
    expect(query().getAttribute('aria-hidden')).toBe('true');
    expect(query().hasAttribute('role')).toBe(false);
    expect(query().hasAttribute('aria-label')).toBe(false);
  });

  it('exposes role="img" with the label when ariaLabel is provided', () => {
    host.ariaLabel.set('Drop anchor');
    fixture.detectChanges();
    const el = query();
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Drop anchor');
    expect(el.hasAttribute('aria-hidden')).toBe(false);
  });

  it('reflects the size input on the data attribute and class list', () => {
    host.size.set('lg');
    fixture.detectChanges();
    const el = query();
    expect(el.getAttribute('data-size')).toBe('lg');
    expect(el.className).toContain('fb-icon--lg');
  });

  it('updates the glyph when name changes', () => {
    host.name.set('route');
    fixture.detectChanges();
    expect(query().textContent?.trim()).toBe('route');
  });

  it('applies weight and fill via font-variation-settings', () => {
    host.weight.set(700);
    host.fill.set(1);
    fixture.detectChanges();
    const style = query().getAttribute('style') ?? '';
    expect(style).toContain("'FILL' 1");
    expect(style).toContain("'wght' 700");
  });
});
