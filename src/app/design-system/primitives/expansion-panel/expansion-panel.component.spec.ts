import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbAccordionComponent,
  FbExpansionPanelComponent
} from './expansion-panel.component';

@Component({
  standalone: true,
  imports: [FbExpansionPanelComponent],
  template: `
    <fb-expansion-panel
      [(expanded)]="expanded"
      [disabled]="disabled()"
      panelId="solo"
    >
      <span fbExpansionPanelTitle>Header</span>
      <span fbExpansionPanelDescription>Sub</span>
      <p>Body content</p>
    </fb-expansion-panel>
  `
})
class SoloHostComponent {
  expanded = signal<boolean>(false);
  disabled = signal<boolean>(false);
}

@Component({
  standalone: true,
  imports: [FbAccordionComponent, FbExpansionPanelComponent],
  template: `
    <fb-accordion [mode]="mode()" ariaLabel="Layers">
      <fb-expansion-panel [(expanded)]="a" panelId="p-a">
        <span fbExpansionPanelTitle>Alpha</span>
        <p>A body</p>
      </fb-expansion-panel>
      <fb-expansion-panel [(expanded)]="b" panelId="p-b">
        <span fbExpansionPanelTitle>Bravo</span>
        <p>B body</p>
      </fb-expansion-panel>
      <fb-expansion-panel
        [(expanded)]="c"
        [disabled]="cDisabled()"
        panelId="p-c"
      >
        <span fbExpansionPanelTitle>Charlie</span>
        <p>C body</p>
      </fb-expansion-panel>
    </fb-accordion>
  `
})
class AccordionHostComponent {
  mode = signal<'multi' | 'single'>('multi');
  a = signal<boolean>(false);
  b = signal<boolean>(false);
  c = signal<boolean>(false);
  cDisabled = signal<boolean>(false);
}

function setupSolo(): {
  host: SoloHostComponent;
  fixture: ComponentFixture<SoloHostComponent>;
  panel: () => HTMLElement;
  header: () => HTMLButtonElement;
  body: () => HTMLElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [SoloHostComponent] });
  const fixture = TestBed.createComponent(SoloHostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    panel: () =>
      fixture.nativeElement.querySelector('fb-expansion-panel') as HTMLElement,
    header: () =>
      fixture.nativeElement.querySelector(
        '.fb-expansion-panel__header'
      ) as HTMLButtonElement,
    body: () =>
      fixture.nativeElement.querySelector(
        '.fb-expansion-panel__body'
      ) as HTMLElement
  };
}

function setupAccordion(): {
  host: AccordionHostComponent;
  fixture: ComponentFixture<AccordionHostComponent>;
  accordion: () => HTMLElement;
  headers: () => HTMLButtonElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [AccordionHostComponent] });
  const fixture = TestBed.createComponent(AccordionHostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    accordion: () =>
      fixture.nativeElement.querySelector('fb-accordion') as HTMLElement,
    headers: () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.fb-expansion-panel__header')
      ) as HTMLButtonElement[]
  };
}

describe('FbExpansionPanelComponent', () => {
  let host: SoloHostComponent;
  let fixture: ComponentFixture<SoloHostComponent>;
  let header: () => HTMLButtonElement;
  let body: () => HTMLElement;

  beforeEach(() => {
    ({ host, fixture, header, body } = setupSolo());
  });

  it('renders header button with aria-expanded/aria-controls and region body', () => {
    const btn = header();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-controls')).toBe('solo-body');
    expect(btn.id).toBe('solo-header');
    const region = body();
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-labelledby')).toBe('solo-header');
    expect(region.id).toBe('solo-body');
    expect(region.hasAttribute('hidden')).toBe(true);
  });

  it('toggles expanded on click and unhides the body', () => {
    header().click();
    fixture.detectChanges();
    expect(host.expanded()).toBe(true);
    expect(header().getAttribute('aria-expanded')).toBe('true');
    expect(body().hasAttribute('hidden')).toBe(false);
  });

  it('blocks toggling when disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    expect(header().getAttribute('aria-disabled')).toBe('true');
    header().click();
    fixture.detectChanges();
    expect(host.expanded()).toBe(false);
  });

  it('toggles when consumer writes the model', () => {
    host.expanded.set(true);
    fixture.detectChanges();
    expect(header().getAttribute('aria-expanded')).toBe('true');
    expect(body().hasAttribute('hidden')).toBe(false);
  });
});

describe('FbAccordionComponent', () => {
  let host: AccordionHostComponent;
  let fixture: ComponentFixture<AccordionHostComponent>;
  let accordion: () => HTMLElement;
  let headers: () => HTMLButtonElement[];

  beforeEach(() => {
    ({ host, fixture, accordion, headers } = setupAccordion());
  });

  it('renders region with aria-label and houses each panel header', () => {
    expect(accordion().getAttribute('role')).toBe('region');
    expect(accordion().getAttribute('aria-label')).toBe('Layers');
    expect(headers().length).toBe(3);
  });

  it('multi mode: opening one panel does not close siblings', () => {
    headers()[0]!.click();
    headers()[1]!.click();
    fixture.detectChanges();
    expect(host.a()).toBe(true);
    expect(host.b()).toBe(true);
  });

  it('single mode: opening a sibling collapses the previously open panel', () => {
    host.mode.set('single');
    fixture.detectChanges();
    headers()[0]!.click();
    fixture.detectChanges();
    expect(host.a()).toBe(true);
    headers()[1]!.click();
    fixture.detectChanges();
    expect(host.a()).toBe(false);
    expect(host.b()).toBe(true);
  });

  it('ArrowDown moves focus to the next header, wrapping at the end', () => {
    const list = headers();
    list[0]!.focus();
    list[0]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      })
    );
    expect(document.activeElement).toBe(list[1]);
    list[2]!.focus();
    list[2]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      })
    );
    expect(document.activeElement).toBe(list[0]);
  });

  it('ArrowUp moves focus to the previous header, wrapping at the start', () => {
    const list = headers();
    list[1]!.focus();
    list[1]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true
      })
    );
    expect(document.activeElement).toBe(list[0]);
    list[0]!.focus();
    list[0]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true
      })
    );
    expect(document.activeElement).toBe(list[2]);
  });

  it('Home and End jump to the first and last enabled headers', () => {
    const list = headers();
    list[1]!.focus();
    list[1]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true
      })
    );
    expect(document.activeElement).toBe(list[2]);
    list[2]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true
      })
    );
    expect(document.activeElement).toBe(list[0]);
  });

  it('arrow navigation skips disabled panels', () => {
    host.cDisabled.set(true);
    fixture.detectChanges();
    const list = headers();
    list[1]!.focus();
    list[1]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true
      })
    );
    expect(document.activeElement).toBe(list[0]);
  });
});
