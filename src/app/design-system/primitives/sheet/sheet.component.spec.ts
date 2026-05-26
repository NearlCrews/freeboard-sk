import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { FbSheetComponent } from './sheet.component';
import { FbSheetService } from './sheet.service';

@Component({
  standalone: true,
  imports: [FbSheetComponent],
  template: `
    <fb-sheet [labelId]="labelId()">
      <span fbSheetHeader id="sht-title">Weather</span>
      <p fbSheetBody>Forecast body</p>
    </fb-sheet>
  `
})
class HostComponent {
  labelId = signal('sht-title');
}

describe('FbSheetComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let sheet: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    sheet = fixture.nativeElement.querySelector('fb-sheet');
  });

  it('renders projected header and body content', () => {
    expect(sheet.querySelector('.fb-sheet__header')?.textContent).toContain(
      'Weather'
    );
    expect(sheet.querySelector('.fb-sheet__body')?.textContent).toContain(
      'Forecast body'
    );
  });

  it('sets role="dialog" and aria-modal="true" on the host', () => {
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(sheet.getAttribute('aria-modal')).toBe('true');
  });

  it('hides the decorative drag handle from assistive tech', () => {
    const handle = sheet.querySelector('.fb-sheet__handle');
    expect(handle?.getAttribute('aria-hidden')).toBe('true');
  });

  it('wires aria-labelledby from input', () => {
    expect(sheet.getAttribute('aria-labelledby')).toBe('sht-title');
  });

  it('drops aria-labelledby when input is empty', () => {
    host.labelId.set('');
    fixture.detectChanges();
    expect(sheet.hasAttribute('aria-labelledby')).toBe(false);
  });
});

describe('FbSheetService', () => {
  it('opens with a bottom-anchored global position strategy and safe defaults', () => {
    const open = vi
      .fn()
      .mockReturnValue({ close: vi.fn() } as unknown as DialogRef);
    const positionStrategy = {
      bottom: vi.fn().mockReturnThis(),
      centerHorizontally: vi.fn().mockReturnThis()
    };
    const globalStrategy = {
      ...positionStrategy,
      bottom: vi.fn().mockReturnValue(positionStrategy)
    };
    const overlayStub = {
      position: () => ({ global: () => globalStrategy })
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Dialog, useValue: { open } },
        { provide: Overlay, useValue: overlayStub },
        FbSheetService
      ]
    });
    const svc = TestBed.inject(FbSheetService);
    @Component({ standalone: true, template: '' })
    class Body {}
    svc.open(Body, { data: 'forecast' });
    expect(open).toHaveBeenCalledOnce();
    const config = open.mock.calls[0]![1];
    expect(config.autoFocus).toBe('first-tabbable');
    expect(config.restoreFocus).toBe(true);
    expect(config.hasBackdrop).toBe(true);
    expect(config.panelClass).toBe('fb-sheet-panel');
    expect(config.positionStrategy).toBeDefined();
    expect(config.data).toBe('forecast');
  });
});
