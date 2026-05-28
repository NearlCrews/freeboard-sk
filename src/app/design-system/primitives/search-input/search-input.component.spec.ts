import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbSearchInputComponent } from './search-input.component';

@Component({
  standalone: true,
  imports: [FbSearchInputComponent],
  template: `
    <fb-search-input
      [(value)]="value"
      [label]="label()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel()"
      [widthPx]="widthPx()"
    ></fb-search-input>
  `
})
class HostComponent {
  value = signal<string>('');
  label = signal<string>('Type to filter list');
  placeholder = signal<string>('');
  disabled = signal<boolean>(false);
  ariaLabel = signal<string>('');
  widthPx = signal<number | null>(null);
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  queryInput: () => HTMLInputElement;
  queryClear: () => HTMLButtonElement | null;
  queryLabel: () => HTMLLabelElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  return {
    host: fixture.componentInstance,
    fixture,
    queryInput: () => root.querySelector<HTMLInputElement>('input')!,
    queryClear: () =>
      root.querySelector<HTMLButtonElement>('.fb-search-input__clear button'),
    queryLabel: () => root.querySelector<HTMLLabelElement>('label')!
  };
}

describe('FbSearchInputComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let queryInput: () => HTMLInputElement;
  let queryClear: () => HTMLButtonElement | null;
  let queryLabel: () => HTMLLabelElement;

  beforeEach(() => {
    ({ host, fixture, queryInput, queryClear, queryLabel } = setup());
  });

  it('renders the visible label text', () => {
    expect(queryLabel().textContent?.trim()).toBe('Type to filter list');
  });

  it('renders the inner input with type="search"', () => {
    expect(queryInput().type).toBe('search');
  });

  it('associates the label to the input via matching id and htmlFor', () => {
    const label = queryLabel();
    const input = queryInput();
    expect(input.id.length).toBeGreaterThan(0);
    expect(label.htmlFor).toBe(input.id);
  });

  it('propagates typing through the two-way value binding', () => {
    const input = queryInput();
    input.value = 'anchor';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.value()).toBe('anchor');
  });

  it('hides the clear button when value is empty', () => {
    expect(queryClear()).toBeNull();
  });

  it('reveals the clear button once value is non-empty', () => {
    host.value.set('marina');
    fixture.detectChanges();
    expect(queryClear()).not.toBeNull();
  });

  it('resets the model to empty when clear is clicked', () => {
    host.value.set('fuel');
    fixture.detectChanges();
    queryClear()?.click();
    fixture.detectChanges();
    expect(host.value()).toBe('');
  });

  it('hides the clear button again after clearing', () => {
    host.value.set('fuel');
    fixture.detectChanges();
    queryClear()?.click();
    fixture.detectChanges();
    expect(queryClear()).toBeNull();
  });

  it('disables the inner input when disabled is true', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    expect(queryInput().disabled).toBe(true);
  });

  it('disables the clear button when disabled is true', () => {
    host.value.set('fuel');
    host.disabled.set(true);
    fixture.detectChanges();
    expect(queryClear()?.disabled).toBe(true);
  });

  it('omits aria-label so the visible label is the accessible name when ariaLabel is empty', () => {
    host.label.set('Filter routes');
    fixture.detectChanges();
    expect(queryInput().getAttribute('aria-label')).toBeNull();
  });

  it('emits an explicit ariaLabel when the caller overrides the accessible name', () => {
    host.label.set('Filter routes');
    host.ariaLabel.set('Search route names');
    fixture.detectChanges();
    expect(queryInput().getAttribute('aria-label')).toBe('Search route names');
  });

  it('keeps the visible label rendered after the input is focused', () => {
    queryInput().focus();
    fixture.detectChanges();
    expect(queryLabel().textContent?.trim()).toBe('Type to filter list');
  });

  it('applies widthPx as inline host width', () => {
    host.widthPx.set(240);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const hostEl = root.querySelector<HTMLElement>('fb-search-input')!;
    expect(hostEl.style.width).toBe('240px');
  });
});
