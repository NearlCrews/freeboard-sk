import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Overlay } from '@angular/cdk/overlay';
import { FbMenuComponent, type FbMenuItem } from './menu.component';
import { FbMenuService } from './menu.service';

@Component({
  standalone: true,
  imports: [FbMenuComponent],
  template: `
    <fb-menu
      [items]="items()"
      [ariaLabel]="ariaLabel()"
      (itemSelected)="onSelected($event)"
      (dismissed)="onDismissed()"
    ></fb-menu>
  `
})
class HostComponent {
  items = signal<readonly FbMenuItem[]>([
    { id: 'edit', label: 'Edit', icon: 'edit' },
    { id: 'duplicate', label: 'Duplicate', disabled: true },
    { id: 'delete', label: 'Delete', destructive: true }
  ]);
  ariaLabel = signal<string>('Item actions');
  selected: string[] = [];
  dismissedCount = 0;
  onSelected(id: string): void {
    this.selected.push(id);
  }
  onDismissed(): void {
    this.dismissedCount += 1;
  }
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  menu: () => HTMLElement;
  items: () => HTMLButtonElement[];
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    menu: () => fixture.nativeElement.querySelector('fb-menu') as HTMLElement,
    items: () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.fb-menu__item')
      ) as HTMLButtonElement[]
  };
}

describe('FbMenuComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let menu: () => HTMLElement;
  let items: () => HTMLButtonElement[];

  beforeEach(() => {
    ({ host, fixture, menu, items } = setup());
  });

  it('renders one menuitem per input row with role="menu" host', () => {
    expect(menu().getAttribute('role')).toBe('menu');
    expect(menu().getAttribute('aria-label')).toBe('Item actions');
    const buttons = items();
    expect(buttons.length).toBe(3);
    expect(buttons[0]!.getAttribute('role')).toBe('menuitem');
  });

  it('marks disabled items via aria-disabled and the disabled DOM property', () => {
    const buttons = items();
    expect(buttons[1]!.getAttribute('aria-disabled')).toBe('true');
    expect(buttons[1]!.disabled).toBe(true);
    expect(buttons[0]!.hasAttribute('aria-disabled')).toBe(false);
  });

  it('emits itemSelected on click for enabled items', () => {
    items()[0]!.click();
    expect(host.selected).toEqual(['edit']);
  });

  it('does not emit itemSelected on click for disabled items', () => {
    items()[1]!.click();
    expect(host.selected.length).toBe(0);
  });

  it('emits dismissed on Escape', () => {
    const evt = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    });
    menu().dispatchEvent(evt);
    expect(host.dismissedCount).toBe(1);
  });

  it('applies destructive styling class for destructive items', () => {
    const buttons = items();
    expect(buttons[2]!.className).toContain('fb-menu__item--destructive');
  });
});

describe('FbMenuService', () => {
  it('opens a CDK overlay with a connected position strategy and transparent backdrop', () => {
    const overlayRef = {
      attach: vi.fn(),
      detach: vi.fn(),
      dispose: vi.fn(),
      hasAttached: vi.fn().mockReturnValue(true),
      backdropClick: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
      keydownEvents: vi.fn().mockReturnValue({ subscribe: vi.fn() })
    };
    overlayRef.attach.mockReturnValue({
      instance: {
        itemSelected: { subscribe: vi.fn() },
        dismissed: { subscribe: vi.fn() }
      },
      setInput: vi.fn()
    });
    const positionStrategy = {
      withPositions: vi.fn().mockReturnThis(),
      withFlexibleDimensions: vi.fn().mockReturnThis(),
      withPush: vi.fn().mockReturnThis()
    };
    const overlayStub = {
      position: () => ({
        flexibleConnectedTo: () => positionStrategy
      }),
      scrollStrategies: { reposition: vi.fn().mockReturnValue({}) },
      create: vi.fn().mockReturnValue(overlayRef)
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Overlay, useValue: overlayStub }, FbMenuService]
    });
    const svc = TestBed.inject(FbMenuService);
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    svc.open(trigger, [{ id: 'a', label: 'A' }]);
    expect(overlayStub.create).toHaveBeenCalledOnce();
    const config = overlayStub.create.mock.calls[0]![0];
    expect(config.hasBackdrop).toBe(true);
    expect(config.backdropClass).toBe('cdk-overlay-transparent-backdrop');
    expect(config.panelClass).toBe('fb-menu-panel');
    expect(positionStrategy.withPositions).toHaveBeenCalledOnce();
    document.body.removeChild(trigger);
  });
});
