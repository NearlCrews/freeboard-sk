import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FbTabPanelDirective,
  FbTabsComponent,
  type FbTabDef
} from './tabs.component';

@Component({
  standalone: true,
  imports: [FbTabsComponent, FbTabPanelDirective],
  template: `
    <fb-tabs [tabs]="tabs()" [(activeId)]="activeId" [ariaLabel]="ariaLabel()">
      <div fbTabPanel fbTabPanelId="info" class="panel-info">Info panel</div>
      <div fbTabPanel fbTabPanelId="route" class="panel-route">Route panel</div>
      <div fbTabPanel fbTabPanelId="notes" class="panel-notes">Notes panel</div>
    </fb-tabs>
  `
})
class TabsHost {
  tabs = signal<readonly FbTabDef[]>([
    { id: 'info', label: 'Info' },
    { id: 'route', label: 'Route', disabled: true },
    { id: 'notes', label: 'Notes' }
  ]);
  activeId = signal<string | null>('info');
  ariaLabel = signal<string>('Group details');
}

function setup(): {
  fixture: ComponentFixture<TabsHost>;
  host: TabsHost;
  tabsEl: () => HTMLElement;
  tabButtons: () => HTMLButtonElement[];
  panels: () => HTMLElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [TabsHost] });
  const fixture = TestBed.createComponent(TabsHost);
  fixture.detectChanges();
  return {
    fixture,
    host: fixture.componentInstance,
    tabsEl: () => fixture.nativeElement.querySelector('fb-tabs') as HTMLElement,
    tabButtons: () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.fb-tabs__tab')
      ) as HTMLButtonElement[],
    panels: () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('[role="tabpanel"]')
      ) as HTMLElement[]
  };
}

describe('FbTabsComponent', () => {
  let fixture: ComponentFixture<TabsHost>;
  let host: TabsHost;
  let tabsEl: () => HTMLElement;
  let tabButtons: () => HTMLButtonElement[];
  let panels: () => HTMLElement[];

  beforeEach(() => {
    ({ fixture, host, tabsEl, tabButtons, panels } = setup());
  });

  it('renders role=tablist with the aria-label and one role=tab per tab', () => {
    const list = tabsEl().querySelector('.fb-tabs__list');
    expect(list?.getAttribute('role')).toBe('tablist');
    expect(list?.getAttribute('aria-label')).toBe('Group details');
    const buttons = tabButtons();
    expect(buttons.length).toBe(3);
    buttons.forEach((b) => expect(b.getAttribute('role')).toBe('tab'));
  });

  it('marks the active tab with aria-selected=true and tabindex=0', () => {
    const buttons = tabButtons();
    expect(buttons[0]!.getAttribute('aria-selected')).toBe('true');
    expect(buttons[0]!.getAttribute('tabindex')).toBe('0');
    expect(buttons[2]!.getAttribute('aria-selected')).toBe('false');
    expect(buttons[2]!.getAttribute('tabindex')).toBe('-1');
  });

  it('marks the disabled tab with aria-disabled', () => {
    const buttons = tabButtons();
    expect(buttons[1]!.getAttribute('aria-disabled')).toBe('true');
  });

  it('aria-controls links tabs to their tabpanel ids', () => {
    const buttons = tabButtons();
    expect(buttons[0]!.getAttribute('aria-controls')).toBe('fb-tab-panel-info');
    const ps = panels();
    expect(ps[0]!.getAttribute('id')).toBe('fb-tab-panel-info');
    expect(ps[0]!.getAttribute('aria-labelledby')).toBe('fb-tab-info');
    expect(ps[0]!.getAttribute('role')).toBe('tabpanel');
  });

  it('hides non-active panels via the hidden attribute', () => {
    const ps = panels();
    expect(ps[0]!.hasAttribute('hidden')).toBe(false);
    expect(ps[1]!.hasAttribute('hidden')).toBe(true);
    expect(ps[2]!.hasAttribute('hidden')).toBe(true);
  });

  it('activates a tab on click and exposes its panel', () => {
    tabButtons()[2]!.click();
    fixture.detectChanges();
    expect(host.activeId()).toBe('notes');
    const ps = panels();
    expect(ps[0]!.hasAttribute('hidden')).toBe(true);
    expect(ps[2]!.hasAttribute('hidden')).toBe(false);
  });

  it('skips disabled tabs on ArrowRight', () => {
    const evt = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true
    });
    tabsEl().dispatchEvent(evt);
    fixture.detectChanges();
    expect(host.activeId()).toBe('notes');
  });

  it('jumps to last enabled tab on End and first on Home', () => {
    const end = new KeyboardEvent('keydown', {
      key: 'End',
      bubbles: true,
      cancelable: true
    });
    tabsEl().dispatchEvent(end);
    fixture.detectChanges();
    expect(host.activeId()).toBe('notes');

    const home = new KeyboardEvent('keydown', {
      key: 'Home',
      bubbles: true,
      cancelable: true
    });
    tabsEl().dispatchEvent(home);
    fixture.detectChanges();
    expect(host.activeId()).toBe('info');
  });

  it('ignores clicks on a disabled tab', () => {
    tabButtons()[1]!.click();
    fixture.detectChanges();
    expect(host.activeId()).toBe('info');
  });
});
