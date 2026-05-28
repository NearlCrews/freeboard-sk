import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbFormFieldComponent } from './form-field.component';

@Component({
  standalone: true,
  imports: [FbFormFieldComponent],
  template: `
    <fb-form-field
      #field
      [label]="label()"
      [hint]="hint()"
      [error]="error()"
      [required]="required()"
      [widthPx]="widthPx()"
    >
      <input [id]="field.controlId" type="text" />
    </fb-form-field>
  `
})
class HostComponent {
  label = signal<string>('User name');
  hint = signal<string>('');
  error = signal<string>('');
  required = signal<boolean>(false);
  widthPx = signal<number | null>(null);
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  queryLabel: () => HTMLLabelElement;
  queryCaption: () => HTMLSpanElement | null;
  queryInner: () => HTMLInputElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  return {
    host: fixture.componentInstance,
    fixture,
    queryLabel: () => root.querySelector<HTMLLabelElement>('label')!,
    queryCaption: () =>
      root.querySelector<HTMLSpanElement>('.fb-form-field__caption'),
    queryInner: () => root.querySelector<HTMLInputElement>('input')!
  };
}

describe('FbFormFieldComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let queryLabel: () => HTMLLabelElement;
  let queryCaption: () => HTMLSpanElement | null;
  let queryInner: () => HTMLInputElement;

  beforeEach(() => {
    ({ host, fixture, queryLabel, queryCaption, queryInner } = setup());
  });

  it('renders the visible label text', () => {
    expect(queryLabel().textContent?.trim()).toContain('User name');
  });

  it('associates the label with the inner control via matching id and htmlFor', () => {
    const label = queryLabel();
    const inner = queryInner();
    expect(inner.id.length).toBeGreaterThan(0);
    expect(label.htmlFor).toBe(inner.id);
  });

  it('omits the required asterisk when required is false', () => {
    expect(queryLabel().querySelector('.fb-form-field__required')).toBeNull();
  });

  it('shows the required asterisk when required is true', () => {
    host.required.set(true);
    fixture.detectChanges();
    expect(
      queryLabel().querySelector('.fb-form-field__required')
    ).not.toBeNull();
  });

  it('omits the caption when no hint or error is set', () => {
    expect(queryCaption()).toBeNull();
  });

  it('renders the hint when only hint is set', () => {
    host.hint.set('Minimum 3 characters');
    fixture.detectChanges();
    const caption = queryCaption();
    expect(caption).not.toBeNull();
    expect(caption?.textContent?.trim()).toBe('Minimum 3 characters');
    expect(caption?.classList.contains('fb-form-field__caption--error')).toBe(
      false
    );
  });

  it('renders the error and adds the error class when error is set', () => {
    host.error.set('Required');
    fixture.detectChanges();
    const caption = queryCaption();
    expect(caption).not.toBeNull();
    expect(caption?.textContent?.trim()).toBe('Required');
    expect(caption?.classList.contains('fb-form-field__caption--error')).toBe(
      true
    );
  });

  it('prefers the error over the hint when both are set', () => {
    host.hint.set('Minimum 3 characters');
    host.error.set('Required');
    fixture.detectChanges();
    expect(queryCaption()?.textContent?.trim()).toBe('Required');
  });

  it('sets role="alert" on the caption only when in error state', () => {
    host.hint.set('Tip');
    fixture.detectChanges();
    expect(queryCaption()?.getAttribute('role')).toBeNull();
    host.error.set('Required');
    fixture.detectChanges();
    expect(queryCaption()?.getAttribute('role')).toBe('alert');
  });

  it('applies widthPx as inline host width', () => {
    host.widthPx.set(180);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const hostEl = root.querySelector<HTMLElement>('fb-form-field')!;
    expect(hostEl.style.width).toBe('180px');
  });
});
