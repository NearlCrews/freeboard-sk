import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbTreeComponent,
  FbTreeSelectComponent,
  type FbTreeNode
} from './tree.component';

const sampleNodes: readonly FbTreeNode<{ kind: string }>[] = [
  {
    id: 'a',
    label: 'Alpha',
    children: [
      { id: 'a1', label: 'Alpha-1' },
      {
        id: 'a2',
        label: 'Alpha-2',
        children: [{ id: 'a2x', label: 'Alpha-2-x' }]
      }
    ]
  },
  { id: 'b', label: 'Bravo' },
  {
    id: 'c',
    label: 'Charlie',
    children: [{ id: 'c1', label: 'Charlie-1' }]
  }
];

@Component({
  standalone: true,
  imports: [FbTreeComponent],
  template: `
    <fb-tree
      [nodes]="nodes()"
      ariaLabel="Demo tree"
      [defaultExpanded]="defaultExpanded()"
      (activated)="lastActivated.set($event.id)"
    ></fb-tree>
  `
})
class TreeHostComponent {
  readonly nodes = signal<readonly FbTreeNode<{ kind: string }>[]>(sampleNodes);
  readonly defaultExpanded = signal<boolean>(false);
  readonly lastActivated = signal<string>('');
}

@Component({
  standalone: true,
  imports: [FbTreeSelectComponent],
  template: `
    <fb-tree-select
      [nodes]="nodes()"
      [cascade]="cascade()"
      [defaultExpanded]="true"
      [(selected)]="selected"
      ariaLabel="Demo select tree"
    ></fb-tree-select>
  `
})
class TreeSelectHostComponent {
  readonly nodes = signal<readonly FbTreeNode<{ kind: string }>[]>(sampleNodes);
  readonly cascade = signal<boolean>(false);
  readonly selected = signal<readonly string[]>([]);
}

function setupTree(): {
  host: TreeHostComponent;
  fixture: ComponentFixture<TreeHostComponent>;
  root: () => HTMLElement;
  rows: () => HTMLDivElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [TreeHostComponent] });
  const fixture = TestBed.createComponent(TreeHostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    root: () => fixture.nativeElement.querySelector('fb-tree') as HTMLElement,
    rows: () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.fb-tree__row')
      ) as HTMLDivElement[]
  };
}

function setupSelect(): {
  host: TreeSelectHostComponent;
  fixture: ComponentFixture<TreeSelectHostComponent>;
  root: () => HTMLElement;
  rows: () => HTMLDivElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [TreeSelectHostComponent] });
  const fixture = TestBed.createComponent(TreeSelectHostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    root: () =>
      fixture.nativeElement.querySelector('fb-tree-select') as HTMLElement,
    rows: () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.fb-tree__row')
      ) as HTMLDivElement[]
  };
}

function dispatchKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  );
}

function toggleInputIn(row: HTMLElement, checked: boolean): void {
  const input = row.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  input.checked = checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('FbTreeComponent', () => {
  let host: TreeHostComponent;
  let fixture: ComponentFixture<TreeHostComponent>;
  let root: () => HTMLElement;
  let rows: () => HTMLDivElement[];

  beforeEach(() => {
    ({ host, fixture, root, rows } = setupTree());
  });

  it('renders only root rows when defaultExpanded is false', () => {
    const list = rows();
    expect(list.length).toBe(3);
    expect(list[0]!.getAttribute('data-id')).toBe('a');
    expect(list[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(list[1]!.getAttribute('data-id')).toBe('b');
    expect(list[1]!.hasAttribute('aria-expanded')).toBe(false);
  });

  it('sets role="tree" on the host with the provided aria-label', () => {
    expect(root().getAttribute('role')).toBe('tree');
    expect(root().getAttribute('aria-label')).toBe('Demo tree');
  });

  it('expands all parents when defaultExpanded is true', () => {
    host.defaultExpanded.set(true);
    fixture.detectChanges();
    const list = rows();
    expect(list.length).toBe(7);
    expect(list[0]!.getAttribute('aria-expanded')).toBe('true');
  });

  it('expands a parent when its chevron is clicked', () => {
    const chevron = rows()[0]!.querySelector<HTMLButtonElement>(
      '.fb-tree__chevron-btn'
    )!;
    chevron.click();
    fixture.detectChanges();
    expect(rows()[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(rows().length).toBe(5);
  });

  it('roving tabindex: only the active row is tabbable', () => {
    const list = rows();
    expect(list[0]!.getAttribute('tabindex')).toBe('0');
    expect(list[1]!.getAttribute('tabindex')).toBe('-1');
    dispatchKey(list[0]!, 'ArrowDown');
    fixture.detectChanges();
    expect(rows()[1]!.getAttribute('tabindex')).toBe('0');
    expect(rows()[0]!.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowRight expands a collapsed parent', () => {
    dispatchKey(rows()[0]!, 'ArrowRight');
    fixture.detectChanges();
    expect(rows()[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(rows().length).toBe(5);
  });

  it('ArrowLeft collapses an expanded parent', () => {
    dispatchKey(rows()[0]!, 'ArrowRight');
    fixture.detectChanges();
    dispatchKey(rows()[0]!, 'ArrowLeft');
    fixture.detectChanges();
    expect(rows()[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(rows().length).toBe(3);
  });

  it('Home and End jump to first and last visible rows', () => {
    dispatchKey(rows()[0]!, 'End');
    fixture.detectChanges();
    expect(rows()[2]!.getAttribute('tabindex')).toBe('0');
    dispatchKey(rows()[2]!, 'Home');
    fixture.detectChanges();
    expect(rows()[0]!.getAttribute('tabindex')).toBe('0');
  });

  it('Enter on a leaf emits activated with the node', () => {
    dispatchKey(rows()[0]!, 'ArrowDown');
    fixture.detectChanges();
    dispatchKey(rows()[1]!, 'Enter');
    fixture.detectChanges();
    expect(host.lastActivated()).toBe('b');
  });

  it('clicking a leaf emits activated', () => {
    rows()[1]!.click();
    fixture.detectChanges();
    expect(host.lastActivated()).toBe('b');
  });
});

describe('FbTreeSelectComponent', () => {
  let host: TreeSelectHostComponent;
  let fixture: ComponentFixture<TreeSelectHostComponent>;
  let rows: () => HTMLDivElement[];

  beforeEach(() => {
    ({ host, fixture, rows } = setupSelect());
  });

  it('renders a checkbox in every row', () => {
    const checks = fixture.nativeElement.querySelectorAll(
      '.fb-tree__row fb-checkbox'
    );
    expect(checks.length).toBe(rows().length);
  });

  it('cascade off: parent and children toggle independently', () => {
    host.cascade.set(false);
    fixture.detectChanges();
    toggleInputIn(rows()[0]!, true);
    fixture.detectChanges();
    expect(host.selected()).toEqual(['a']);
    toggleInputIn(rows()[1]!, true);
    fixture.detectChanges();
    expect(host.selected()).toEqual(['a', 'a1']);
  });

  it('cascade on: checking a parent selects all descendants', () => {
    host.cascade.set(true);
    fixture.detectChanges();
    toggleInputIn(rows()[0]!, true);
    fixture.detectChanges();
    expect(new Set(host.selected())).toEqual(new Set(['a', 'a1', 'a2', 'a2x']));
  });

  it('cascade on: unchecking a parent clears all descendants', () => {
    host.cascade.set(true);
    fixture.detectChanges();
    toggleInputIn(rows()[0]!, true);
    fixture.detectChanges();
    toggleInputIn(rows()[0]!, false);
    fixture.detectChanges();
    expect(host.selected()).toEqual([]);
  });

  it('cascade on: partial selection shows indeterminate on parent', () => {
    host.cascade.set(true);
    fixture.detectChanges();
    toggleInputIn(rows()[1]!, true);
    fixture.detectChanges();
    const parent = rows()[0]!.querySelector('fb-checkbox');
    expect(parent?.querySelector('.fb-checkbox__dash')).not.toBeNull();
  });

  it('Space toggles the focused row', () => {
    dispatchKey(rows()[0]!, ' ');
    fixture.detectChanges();
    expect(host.selected()).toEqual(['a']);
  });
});
