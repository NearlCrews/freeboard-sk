import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbToolbarComponent, type FbToolbarDensity } from './toolbar.component';

@Component({
  standalone: true,
  imports: [FbToolbarComponent],
  template: `
    <fb-toolbar [density]="density()">
      <button fbToolbarLeading type="button">Back</button>
      <span fbToolbarTitle>Routes</span>
      <button fbToolbarActions type="button">Add</button>
      <span>Custom</span>
    </fb-toolbar>
  `
})
class HostComponent {
  density = signal<FbToolbarDensity>('comfortable');
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
    el: () => fixture.nativeElement.querySelector('fb-toolbar') as HTMLElement
  };
}

describe('FbToolbarComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let el: () => HTMLElement;

  beforeEach(() => {
    ({ host, fixture, el } = setup());
  });

  it('sets role="toolbar" on the host', () => {
    expect(el().getAttribute('role')).toBe('toolbar');
  });

  it('projects content into leading, title, actions, and default slots', () => {
    const leading = el().querySelector('.fb-toolbar__leading');
    const title = el().querySelector('.fb-toolbar__title');
    const actions = el().querySelector('.fb-toolbar__actions');
    const dflt = el().querySelector('.fb-toolbar__default');
    expect(leading?.textContent).toContain('Back');
    expect(title?.textContent).toContain('Routes');
    expect(actions?.textContent).toContain('Add');
    expect(dflt?.textContent).toContain('Custom');
  });

  it('defaults density to comfortable', () => {
    expect(el().getAttribute('data-density')).toBe('comfortable');
  });

  it('reflects dense density on the host data attribute', () => {
    host.density.set('dense');
    fixture.detectChanges();
    expect(el().getAttribute('data-density')).toBe('dense');
  });
});
