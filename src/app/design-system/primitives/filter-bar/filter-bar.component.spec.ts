import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbFilterBarComponent, type FbFilterChip } from '../index';

@Component({
  standalone: true,
  imports: [FbFilterBarComponent],
  template: `
    <fb-filter-bar
      [(query)]="query"
      [chips]="chips()"
      (chipToggle)="onToggle($event)"
    ></fb-filter-bar>
  `
})
class HostComponent {
  query = signal('');
  chips = signal<readonly FbFilterChip[]>([
    { key: 'route', label: 'Routes', active: true },
    { key: 'wpt', label: 'Waypoints', active: false }
  ]);
  toggled = '';
  onToggle(key: string): void {
    this.toggled = key;
  }
}

describe('FbFilterBarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let bar: HTMLElement;
  const inputEl = (): HTMLInputElement => bar.querySelector('input')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    bar = fixture.nativeElement.querySelector('fb-filter-bar');
  });

  it('renders the search input and the configured chips', () => {
    expect(inputEl().getAttribute('type')).toBe('search');
    const chips = bar.querySelectorAll('.fb-filter-bar__chip');
    expect(chips.length).toBe(2);
    expect(chips[0]!.textContent).toContain('Routes');
    expect(chips[0]!.getAttribute('aria-pressed')).toBe('true');
    expect(chips[1]!.getAttribute('aria-pressed')).toBe('false');
  });

  it('propagates input value back through the two-way bound query model', () => {
    const el = inputEl();
    el.value = 'harbor';
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.query()).toBe('harbor');
  });

  it('reflects the host query value on the input element', () => {
    host.query.set('coastal');
    fixture.detectChanges();
    expect(inputEl().value).toBe('coastal');
  });

  it('emits chipToggle with the chip key when a chip is clicked', () => {
    const chips = bar.querySelectorAll<HTMLElement>('.fb-filter-bar__chip');
    chips[1]!.click();
    expect(host.toggled).toBe('wpt');
  });

  it('omits the chip group entirely when chips are empty', () => {
    host.chips.set([]);
    fixture.detectChanges();
    expect(bar.querySelector('.fb-filter-bar__chips')).toBeNull();
  });
});
