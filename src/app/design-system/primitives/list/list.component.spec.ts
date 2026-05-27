import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbListComponent,
  FbListItemComponent,
  FbNavListComponent,
  FbSelectionListComponent,
  type FbSelectionListOption
} from './list.component';

@Component({
  standalone: true,
  imports: [FbListComponent, FbListItemComponent],
  template: `
    <fb-list [density]="density()">
      <fb-list-item [selected]="true" [interactive]="true">
        <span fbListItemLeading>L</span>
        Primary
        <span fbListItemSubtext>Subtext</span>
        <button fbListItemTrailing>X</button>
      </fb-list-item>
      <fb-list-item [interactive]="true" (activated)="onActivate()">
        Plain row
      </fb-list-item>
      <fb-list-item [disabled]="true" [interactive]="true"
        >Disabled</fb-list-item
      >
    </fb-list>
  `
})
class ListHost {
  density = signal<'comfortable' | 'compact'>('comfortable');
  activateCount = 0;
  onActivate(): void {
    this.activateCount++;
  }
}

@Component({
  standalone: true,
  imports: [FbNavListComponent, FbListItemComponent],
  template: `
    <fb-nav-list [ariaLabel]="ariaLabel()">
      <fb-list-item>Home</fb-list-item>
      <fb-list-item>Charts</fb-list-item>
    </fb-nav-list>
  `
})
class NavHost {
  ariaLabel = signal<string>('Primary');
}

@Component({
  standalone: true,
  imports: [FbSelectionListComponent],
  template: `
    <fb-selection-list
      [options]="options()"
      [(values)]="values"
      [ariaLabel]="ariaLabel()"
    ></fb-selection-list>
  `
})
class SelectionHost {
  options = signal<readonly FbSelectionListOption[]>([
    { id: 'anchor', label: 'Anchor' },
    { id: 'fuel', label: 'Fuel', disabled: true },
    { id: 'marina', label: 'Marina' }
  ]);
  values = signal<readonly string[]>(['anchor']);
  ariaLabel = signal<string>('Tags');
}

describe('FbListComponent', () => {
  let fixture: ComponentFixture<ListHost>;
  let host: ListHost;
  let listEl: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ListHost] });
    fixture = TestBed.createComponent(ListHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    listEl = fixture.nativeElement.querySelector('fb-list') as HTMLElement;
  });

  it('renders role=list on the list host with comfortable density by default', () => {
    expect(listEl.getAttribute('role')).toBe('list');
    expect(listEl.getAttribute('data-density')).toBe('comfortable');
  });

  it('switches to compact density when input is compact', () => {
    host.density.set('compact');
    fixture.detectChanges();
    expect(listEl.getAttribute('data-density')).toBe('compact');
  });

  it('renders three list items with role=listitem', () => {
    const items = fixture.nativeElement.querySelectorAll('fb-list-item');
    expect(items.length).toBe(3);
    items.forEach((it: Element) =>
      expect(it.getAttribute('role')).toBe('listitem')
    );
  });

  it('marks an interactive item as selectable with aria-selected + tabindex=0', () => {
    const items = fixture.nativeElement.querySelectorAll('fb-list-item');
    expect(items[0]!.getAttribute('aria-selected')).toBe('true');
    expect(items[0]!.getAttribute('tabindex')).toBe('0');
    expect(items[1]!.getAttribute('aria-selected')).toBe('false');
    expect(items[1]!.getAttribute('tabindex')).toBe('0');
  });

  it('disabled interactive item gets aria-disabled and no tabindex', () => {
    const items = fixture.nativeElement.querySelectorAll('fb-list-item');
    expect(items[2]!.getAttribute('aria-disabled')).toBe('true');
    expect(items[2]!.hasAttribute('tabindex')).toBe(false);
  });

  it('emits activated on click for an interactive enabled row', () => {
    const items = fixture.nativeElement.querySelectorAll('fb-list-item');
    (items[1] as HTMLElement).click();
    fixture.detectChanges();
    expect(host.activateCount).toBe(1);
  });

  it('emits activated on Enter key for an interactive enabled row', () => {
    const items = fixture.nativeElement.querySelectorAll('fb-list-item');
    const evt = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    });
    items[1]!.dispatchEvent(evt);
    fixture.detectChanges();
    expect(host.activateCount).toBe(1);
  });

  it('does not emit activated for a disabled row', () => {
    const items = fixture.nativeElement.querySelectorAll('fb-list-item');
    (items[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(host.activateCount).toBe(0);
  });
});

describe('FbNavListComponent', () => {
  it('sets role=navigation on host with the aria-label and inner role=list', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [NavHost] });
    const fixture = TestBed.createComponent(NavHost);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector(
      'fb-nav-list'
    ) as HTMLElement;
    expect(nav.getAttribute('role')).toBe('navigation');
    expect(nav.getAttribute('aria-label')).toBe('Primary');
    const inner = nav.querySelector('.fb-nav-list__list');
    expect(inner?.getAttribute('role')).toBe('list');
  });
});

describe('FbSelectionListComponent', () => {
  let fixture: ComponentFixture<SelectionHost>;
  let host: SelectionHost;
  let listEl: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SelectionHost] });
    fixture = TestBed.createComponent(SelectionHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    listEl = fixture.nativeElement.querySelector(
      'fb-selection-list'
    ) as HTMLElement;
  });

  it('renders role=listbox with aria-multiselectable=true', () => {
    expect(listEl.getAttribute('role')).toBe('listbox');
    expect(listEl.getAttribute('aria-multiselectable')).toBe('true');
    expect(listEl.getAttribute('aria-label')).toBe('Tags');
  });

  it('renders one role=option per choice with the initial selection marked', () => {
    const items = listEl.querySelectorAll('.fb-selection-list__item');
    expect(items.length).toBe(3);
    expect(items[0]!.getAttribute('aria-selected')).toBe('true');
    expect(items[1]!.getAttribute('aria-selected')).toBe('false');
    expect(items[1]!.getAttribute('aria-disabled')).toBe('true');
  });

  it('toggles selection on click and stays single-row on repeat click', () => {
    const items = listEl.querySelectorAll('.fb-selection-list__item');
    (items[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(host.values()).toEqual(['anchor', 'marina']);
    (items[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(host.values()).toEqual(['marina']);
  });

  it('skips disabled options when arrowing through with the keyboard', () => {
    const evt = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true
    });
    listEl.dispatchEvent(evt);
    fixture.detectChanges();
    const items = listEl.querySelectorAll('.fb-selection-list__item');
    expect(items[2]!.getAttribute('tabindex')).toBe('0');
    expect(items[1]!.getAttribute('tabindex')).toBe('-1');
  });

  it('Space toggles the focused option', () => {
    const evt = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true
    });
    listEl.dispatchEvent(evt);
    fixture.detectChanges();
    expect(host.values()).toEqual([]);
  });

  it('does not toggle a disabled option even on direct click', () => {
    const items = listEl.querySelectorAll('.fb-selection-list__item');
    (items[1] as HTMLElement).click();
    fixture.detectChanges();
    expect(host.values()).toEqual(['anchor']);
  });
});
