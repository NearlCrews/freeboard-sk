import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { FbSidenavComponent, type FbSidenavSide } from './sidenav.component';
import { FbSidenavService } from './sidenav.service';

@Component({
  standalone: true,
  imports: [FbSidenavComponent],
  template: `
    <fb-sidenav [side]="side()" [width]="width()" [labelId]="labelId()">
      <span fbSidenavHeader id="sn-title">Settings</span>
      <p fbSidenavBody>Body content</p>
    </fb-sidenav>
  `
})
class HostComponent {
  side = signal<FbSidenavSide>('left');
  width = signal<string>('320px');
  labelId = signal<string>('sn-title');
}

describe('FbSidenavComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let nav: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    nav = fixture.nativeElement.querySelector('fb-sidenav');
  });

  it('renders projected header and body content', () => {
    expect(nav.querySelector('.fb-sidenav__header')?.textContent).toContain(
      'Settings'
    );
    expect(nav.querySelector('.fb-sidenav__body')?.textContent).toContain(
      'Body content'
    );
  });

  it('sets role="dialog" and aria-modal="true" on the host', () => {
    expect(nav.getAttribute('role')).toBe('dialog');
    expect(nav.getAttribute('aria-modal')).toBe('true');
  });

  it('reflects side on the host data attribute', () => {
    expect(nav.getAttribute('data-side')).toBe('left');
    host.side.set('right');
    fixture.detectChanges();
    expect(nav.getAttribute('data-side')).toBe('right');
  });

  it('reflects width on the host inline style', () => {
    expect(nav.getAttribute('style') ?? '').toContain('width: 320px');
    host.width.set('400px');
    fixture.detectChanges();
    expect(nav.getAttribute('style') ?? '').toContain('width: 400px');
  });

  it('wires aria-labelledby from input', () => {
    expect(nav.getAttribute('aria-labelledby')).toBe('sn-title');
  });

  it('drops aria-labelledby when labelId is empty', () => {
    host.labelId.set('');
    fixture.detectChanges();
    expect(nav.hasAttribute('aria-labelledby')).toBe(false);
  });
});

describe('FbSidenavService', () => {
  function makeStubs(): {
    open: ReturnType<typeof vi.fn>;
    overlayStub: { position: () => unknown };
    left: ReturnType<typeof vi.fn>;
    right: ReturnType<typeof vi.fn>;
  } {
    const open = vi
      .fn()
      .mockReturnValue({ close: vi.fn() } as unknown as DialogRef);
    const leftStrategy = {
      top: vi.fn().mockReturnValue({ tag: 'left-strategy' })
    };
    const rightStrategy = {
      top: vi.fn().mockReturnValue({ tag: 'right-strategy' })
    };
    const left = vi.fn().mockReturnValue(leftStrategy);
    const right = vi.fn().mockReturnValue(rightStrategy);
    const overlayStub = {
      position: () => ({ global: () => ({ left, right }) })
    };
    return { open, overlayStub, left, right };
  }

  it('opens with a left-pinned global strategy and safe defaults', () => {
    const { open, overlayStub } = makeStubs();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Dialog, useValue: { open } },
        { provide: Overlay, useValue: overlayStub },
        FbSidenavService
      ]
    });
    const svc = TestBed.inject(FbSidenavService);
    @Component({ standalone: true, template: '' })
    class Body {}
    svc.open(Body, 'left');
    const config = open.mock.calls[0]![1];
    expect(config.autoFocus).toBe('first-tabbable');
    expect(config.restoreFocus).toBe(true);
    expect(config.hasBackdrop).toBe(true);
    expect(config.panelClass).toBe('fb-sidenav-panel');
    expect(config.positionStrategy).toEqual({ tag: 'left-strategy' });
  });

  it('opens with a right-pinned strategy when side="right"', () => {
    const { open, overlayStub } = makeStubs();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Dialog, useValue: { open } },
        { provide: Overlay, useValue: overlayStub },
        FbSidenavService
      ]
    });
    const svc = TestBed.inject(FbSidenavService);
    @Component({ standalone: true, template: '' })
    class Body {}
    svc.open(Body, 'right');
    const config = open.mock.calls[0]![1];
    expect(config.positionStrategy).toEqual({ tag: 'right-strategy' });
  });
});
