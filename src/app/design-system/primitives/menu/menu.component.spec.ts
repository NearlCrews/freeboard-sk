import {
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  inject,
  signal
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Overlay } from '@angular/cdk/overlay';
import {
  FbMenuComponent,
  type FbMenuItem,
  type FbMenuTemplateContext
} from './menu.component';
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

@Component({
  standalone: true,
  imports: [FbMenuComponent],
  template: `
    <fb-menu
      [templateRef]="tplRef"
      [templateContext]="ctx"
      (dismissed)="onDismissed()"
    ></fb-menu>
    <ng-template #tpl let-data let-close="close">
      <button
        type="button"
        class="fb-menu-item"
        data-id="alpha"
        (click)="onClick('alpha-' + data, close)"
      >
        Alpha
      </button>
      <hr class="fb-menu-divider" />
      <button
        type="button"
        class="fb-menu-item"
        data-id="beta"
        (click)="onClick('beta-' + data, close)"
      >
        Beta
      </button>
    </ng-template>
  `
})
class TemplateHostComponent {
  @ViewChild('tpl', { static: true })
  tpl!: TemplateRef<FbMenuTemplateContext<string>>;
  get tplRef(): TemplateRef<unknown> | null {
    return this.tpl as TemplateRef<unknown> | null;
  }
  picked: string[] = [];
  closes = 0;
  dismissedCount = 0;
  ctx: FbMenuTemplateContext<string> = {
    $implicit: 'ctxVal',
    close: () => {
      this.closes += 1;
    }
  };
  onClick(label: string, close: () => void): void {
    this.picked.push(label);
    close();
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

describe('FbMenuComponent template projection', () => {
  it('renders projected template with $implicit context and forwards close', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TemplateHostComponent] });
    const fixture = TestBed.createComponent(TemplateHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const projected = Array.from(
      root.querySelectorAll<HTMLButtonElement>('button.fb-menu-item')
    );
    expect(projected.length).toBe(2);
    expect(projected[0]!.dataset['id']).toBe('alpha');
    expect(root.querySelector('hr.fb-menu-divider')).not.toBeNull();
    expect(
      root.querySelectorAll('.fb-menu__item').length,
      'static items[] section must not render in template mode'
    ).toBe(0);

    projected[1]!.click();
    expect(fixture.componentInstance.picked).toEqual(['beta-ctxVal']);
    expect(fixture.componentInstance.closes).toBe(1);
  });

  it('emits dismissed on Escape while in template mode', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TemplateHostComponent] });
    const fixture = TestBed.createComponent(TemplateHostComponent);
    fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('fb-menu') as HTMLElement;
    menu.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      })
    );
    expect(fixture.componentInstance.dismissedCount).toBe(1);
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
        flexibleConnectedTo: () => positionStrategy,
        global: () => ({
          left: vi.fn().mockReturnThis(),
          top: vi.fn().mockReturnThis()
        })
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

  it('openAt routes through a global position strategy at the given coordinates', () => {
    const overlayRef = {
      attach: vi.fn(),
      detach: vi.fn(),
      dispose: vi.fn(),
      hasAttached: vi.fn().mockReturnValue(true),
      backdropClick: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
      keydownEvents: vi.fn().mockReturnValue({ subscribe: vi.fn() })
    };
    overlayRef.attach.mockReturnValue({
      instance: { dismissed: { subscribe: vi.fn() } },
      setInput: vi.fn()
    });
    const globalStrategy = {
      left: vi.fn().mockReturnThis(),
      top: vi.fn().mockReturnThis()
    };
    const overlayStub = {
      position: () => ({
        flexibleConnectedTo: () => ({
          withPositions: vi.fn().mockReturnThis(),
          withFlexibleDimensions: vi.fn().mockReturnThis(),
          withPush: vi.fn().mockReturnThis()
        }),
        global: () => globalStrategy
      }),
      scrollStrategies: { reposition: vi.fn().mockReturnValue({}) },
      create: vi.fn().mockReturnValue(overlayRef)
    };

    @Component({
      standalone: true,
      template: `<ng-template #tpl></ng-template>`
    })
    class HostForAt {
      @ViewChild('tpl', { static: true })
      tpl!: TemplateRef<FbMenuTemplateContext<string>>;
      readonly vcr = inject(ViewContainerRef);
    }

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HostForAt],
      providers: [{ provide: Overlay, useValue: overlayStub }, FbMenuService]
    });
    const fixture = TestBed.createComponent(HostForAt);
    fixture.detectChanges();
    const svc = TestBed.inject(FbMenuService);
    const host = fixture.componentInstance;
    svc.openAt<string>({
      position: { x: 120, y: 240 },
      templateRef: host.tpl,
      viewContainerRef: host.vcr,
      context: 'hello'
    });
    expect(globalStrategy.left).toHaveBeenCalledWith('120px');
    expect(globalStrategy.top).toHaveBeenCalledWith('240px');
    expect(overlayStub.create).toHaveBeenCalledOnce();
  });
});
