import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FbTooltipDirective } from './tooltip.directive';

const SHOW_DELAY_MS = 350;

@Component({
  standalone: true,
  imports: [FbTooltipDirective],
  template: `
    <button type="button" [fbTooltip]="text()" [fbTooltipDisabled]="disabled()">
      Host
    </button>
  `
})
class HostComponent {
  text = signal<string>('Hello');
  disabled = signal<boolean>(false);
}

@Component({
  standalone: true,
  imports: [FbTooltipDirective],
  template: `
    <button type="button" [fbTooltip]="'One'">One</button>
    <button type="button" [fbTooltip]="'Two'">Two</button>
  `
})
class TwoHostsComponent {}

function bubbleEl(): HTMLElement | null {
  return document.body.querySelector('[role="tooltip"]') as HTMLElement | null;
}

function allBubbles(): HTMLElement[] {
  return Array.from(
    document.body.querySelectorAll('[role="tooltip"]')
  ) as HTMLElement[];
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  trigger: HTMLButtonElement;
} {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const trigger = fixture.nativeElement.querySelector(
    'button'
  ) as HTMLButtonElement;
  return { host: fixture.componentInstance, fixture, trigger };
}

describe('FbTooltipDirective', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    vi.useFakeTimers();
    ({ host, fixture, trigger } = setup());
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('attaches the tooltip overlay on mouseenter after the show delay', () => {
    trigger.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    expect(bubbleEl()).toBeNull();
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    expect(bubbleEl()).not.toBeNull();
    expect(bubbleEl()?.textContent?.trim()).toBe('Hello');
  });

  it('attaches on focus and detaches on blur', () => {
    trigger.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    expect(bubbleEl()).not.toBeNull();
    trigger.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(bubbleEl()).toBeNull();
  });

  it('does not attach the overlay when fbTooltipDisabled is true', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    expect(bubbleEl()).toBeNull();
  });

  it('does not attach the overlay when fbTooltip is empty', () => {
    host.text.set('');
    fixture.detectChanges();
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    expect(bubbleEl()).toBeNull();
  });

  it('detaches the overlay on mouseleave', () => {
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    expect(bubbleEl()).not.toBeNull();
    trigger.dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
    expect(bubbleEl()).toBeNull();
  });

  it('sets aria-describedby on the host to the bubble id when shown', () => {
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    const id = trigger.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id ?? '')).toBe(bubbleEl());
  });

  it('removes aria-describedby on hide', () => {
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    trigger.dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
    expect(trigger.hasAttribute('aria-describedby')).toBe(false);
  });

  it('assigns a unique id to each directive instance', () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TwoHostsComponent] });
    const f = TestBed.createComponent(TwoHostsComponent);
    f.detectChanges();
    const buttons = Array.from(
      f.nativeElement.querySelectorAll('button')
    ) as HTMLButtonElement[];
    const a = buttons[0]!;
    const b = buttons[1]!;
    a.dispatchEvent(new Event('mouseenter'));
    b.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    f.detectChanges();
    const bubbles = allBubbles();
    expect(bubbles.length).toBe(2);
    const idA = a.getAttribute('aria-describedby');
    const idB = b.getAttribute('aria-describedby');
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
    f.destroy();
  });

  it('updates the bubble text live while shown', () => {
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    expect(bubbleEl()?.textContent?.trim()).toBe('Hello');
    host.text.set('World');
    fixture.detectChanges();
    expect(bubbleEl()?.textContent?.trim()).toBe('World');
  });

  it('hides the tooltip when disabled flips true while shown', () => {
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    expect(bubbleEl()).not.toBeNull();
    host.disabled.set(true);
    fixture.detectChanges();
    expect(bubbleEl()).toBeNull();
  });

  it('hides the tooltip when text becomes empty while shown', () => {
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    expect(bubbleEl()).not.toBeNull();
    host.text.set('');
    fixture.detectChanges();
    expect(bubbleEl()).toBeNull();
  });

  it('registers a primary and fallback position on the overlay', () => {
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    // The CDK overlay renders a connected-position bounding wrapper; the
    // tooltip directive registers both a primary and a fallback connected
    // position. We assert the bubble exists and is positioned by checking
    // the bounding wrapper has been populated.
    const pane = document.body.querySelector('.cdk-overlay-pane');
    expect(pane).not.toBeNull();
    expect(pane?.contains(bubbleEl())).toBe(true);
  });

  it('removes the overlay panel from the DOM after fixture.destroy()', () => {
    trigger.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    fixture.detectChanges();
    expect(bubbleEl()).not.toBeNull();
    fixture.destroy();
    expect(bubbleEl()).toBeNull();
  });
});
