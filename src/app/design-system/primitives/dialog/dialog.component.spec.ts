import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { FbDialogComponent } from './dialog.component';
import { FbDialogService } from './dialog.service';

/**
 * Host wrapper renders the dialog shell directly (no overlay) so we can
 * verify the projected slots, ARIA wiring, and host attributes without
 * needing to spin up the CDK overlay container. Signal-backed host state
 * keeps zoneless OnPush detection consistent.
 */
@Component({
  standalone: true,
  imports: [FbDialogComponent],
  template: `
    <fb-dialog [labelId]="labelId()" [descriptionId]="descriptionId()">
      <span fbDialogHeader id="dlg-title">Confirm</span>
      <p fbDialogBody id="dlg-body">Are you sure?</p>
      <button fbDialogFooter type="button">Close</button>
    </fb-dialog>
  `
})
class HostComponent {
  labelId = signal('dlg-title');
  descriptionId = signal('dlg-body');
}

describe('FbDialogComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let dialog: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    dialog = fixture.nativeElement.querySelector('fb-dialog');
  });

  it('renders projected header, body, and footer content', () => {
    expect(dialog.querySelector('.fb-dialog__header')?.textContent).toContain(
      'Confirm'
    );
    expect(dialog.querySelector('.fb-dialog__body')?.textContent).toContain(
      'Are you sure?'
    );
    expect(dialog.querySelector('.fb-dialog__footer')?.textContent).toContain(
      'Close'
    );
  });

  it('sets role="dialog" on the host element', () => {
    expect(dialog.getAttribute('role')).toBe('dialog');
  });

  it('wires aria-labelledby and aria-describedby from inputs', () => {
    expect(dialog.getAttribute('aria-labelledby')).toBe('dlg-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('dlg-body');
  });

  it('drops aria-labelledby and aria-describedby when inputs are empty', () => {
    host.labelId.set('');
    host.descriptionId.set('');
    fixture.detectChanges();
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('FbDialogService', () => {
  it('opens the requested component with safe a11y defaults', () => {
    const open = vi
      .fn()
      .mockReturnValue({ close: vi.fn() } as unknown as DialogRef);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Dialog, useValue: { open } }, FbDialogService]
    });
    const svc = TestBed.inject(FbDialogService);
    @Component({ standalone: true, template: '' })
    class Body {}
    svc.open(Body, { data: 42 });
    expect(open).toHaveBeenCalledOnce();
    const config = open.mock.calls[0][1];
    expect(config.autoFocus).toBe('first-tabbable');
    expect(config.restoreFocus).toBe(true);
    expect(config.hasBackdrop).toBe(true);
    expect(config.data).toBe(42);
  });

  it('lets caller config override defaults', () => {
    const open = vi
      .fn()
      .mockReturnValue({ close: vi.fn() } as unknown as DialogRef);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Dialog, useValue: { open } }, FbDialogService]
    });
    const svc = TestBed.inject(FbDialogService);
    @Component({ standalone: true, template: '' })
    class Body {}
    svc.open(Body, { hasBackdrop: false, disableClose: true });
    const config = open.mock.calls[0][1];
    expect(config.hasBackdrop).toBe(false);
    expect(config.disableClose).toBe(true);
  });
});
