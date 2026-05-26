import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbListPaneComponent,
  type FbListPaneItem
} from './list-pane.component';

@Component({
  standalone: true,
  imports: [FbListPaneComponent],
  template: `
    <fb-list-pane
      [items]="items()"
      [selected]="selected()"
      (selectionChange)="onSelect($event)"
    >
      <ng-template #fbListPaneHeader>Routes</ng-template>
      <ng-template #fbListPaneItem let-item>
        <span class="custom-row" [attr.data-id]="item.id">{{
          item.label
        }}</span>
      </ng-template>
      <ng-template #fbListPaneFooter>3 items</ng-template>
    </fb-list-pane>
  `
})
class HostComponent {
  items = signal<readonly FbListPaneItem[]>([
    { id: 'r1', label: 'Coastal' },
    { id: 'r2', label: 'Offshore' },
    { id: 'r3', label: 'Harbor' }
  ]);
  selected = signal<string | null>('r2');
  lastSelected = '';
  onSelect(id: string): void {
    this.lastSelected = id;
  }
}

describe('FbListPaneComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let pane: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    pane = fixture.nativeElement.querySelector('fb-list-pane');
  });

  it('renders projected header, custom item template, and footer slots', () => {
    expect(pane.querySelector('.fb-list-pane__header')?.textContent).toContain(
      'Routes'
    );
    expect(pane.querySelector('.fb-list-pane__footer')?.textContent).toContain(
      '3 items'
    );
    const rows = pane.querySelectorAll('.custom-row');
    expect(rows.length).toBe(3);
    expect(rows[0]!.textContent).toContain('Coastal');
    expect(rows[1]!.getAttribute('data-id')).toBe('r2');
  });

  it('reflects current selection as a data attribute on the matching row', () => {
    const items = pane.querySelectorAll('.fb-list-pane__item');
    expect(items[1]!.hasAttribute('data-selected')).toBe(true);
    expect(items[0]!.hasAttribute('data-selected')).toBe(false);
  });

  it('sets role="navigation" on the host for landmark a11y', () => {
    expect(pane.getAttribute('role')).toBe('navigation');
  });

  it('exposes the cdkListbox container with role="listbox" for AT navigation', () => {
    const list = pane.querySelector('.fb-list-pane__list');
    expect(list?.getAttribute('role')).toBe('listbox');
  });
});
