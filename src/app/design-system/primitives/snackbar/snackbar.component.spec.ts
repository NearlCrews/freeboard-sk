import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Overlay } from '@angular/cdk/overlay';
import { FbSnackbarComponent, type FbSnackbarKind } from './snackbar.component';
import { FbSnackbarService } from './snackbar.service';

@Component({
  standalone: true,
  imports: [FbSnackbarComponent],
  template: `
    <fb-snackbar
      [message]="message()"
      [kind]="kind()"
      [actionLabel]="actionLabel()"
      (actionInvoked)="onAction()"
    ></fb-snackbar>
  `
})
class HostComponent {
  message = signal<string>('Saved');
  kind = signal<FbSnackbarKind>('info');
  actionLabel = signal<string>('');
  actionCount = 0;
  onAction(): void {
    this.actionCount += 1;
  }
}

function setup(): {
  host: HostComponent;
  fixture: ComponentFixture<HostComponent>;
  snackbar: () => HTMLElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    fixture,
    snackbar: () =>
      fixture.nativeElement.querySelector('fb-snackbar') as HTMLElement
  };
}

describe('FbSnackbarComponent', () => {
  let host: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let snackbar: () => HTMLElement;

  beforeEach(() => {
    ({ host, fixture, snackbar } = setup());
  });

  it('renders the message text', () => {
    expect(snackbar().textContent).toContain('Saved');
  });

  it('uses role="status" and aria-live="polite" for info kind', () => {
    expect(snackbar().getAttribute('role')).toBe('status');
    expect(snackbar().getAttribute('aria-live')).toBe('polite');
  });

  it('uses role="status" and aria-live="polite" for success kind', () => {
    host.kind.set('success');
    fixture.detectChanges();
    expect(snackbar().getAttribute('role')).toBe('status');
    expect(snackbar().getAttribute('aria-live')).toBe('polite');
  });

  it('uses role="alert" and aria-live="assertive" for warn kind', () => {
    host.kind.set('warn');
    fixture.detectChanges();
    expect(snackbar().getAttribute('role')).toBe('alert');
    expect(snackbar().getAttribute('aria-live')).toBe('assertive');
  });

  it('uses role="alert" and aria-live="assertive" for error kind', () => {
    host.kind.set('error');
    fixture.detectChanges();
    expect(snackbar().getAttribute('role')).toBe('alert');
    expect(snackbar().getAttribute('aria-live')).toBe('assertive');
  });

  it('reflects kind on the host data attribute', () => {
    host.kind.set('error');
    fixture.detectChanges();
    expect(snackbar().getAttribute('data-kind')).toBe('error');
  });

  it('hides the action button when actionLabel is empty', () => {
    expect(snackbar().querySelector('.fb-snackbar__action')).toBeNull();
  });

  it('renders the action button and emits actionInvoked on click', () => {
    host.actionLabel.set('Undo');
    fixture.detectChanges();
    const action = snackbar().querySelector('.fb-snackbar__action')!;
    expect(action.textContent?.trim()).toBe('Undo');
    action.click();
    expect(host.actionCount).toBe(1);
  });
});

describe('FbSnackbarService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens a bottom-centered overlay with no backdrop', () => {
    const overlayRef = {
      attach: vi.fn(),
      detach: vi.fn(),
      dispose: vi.fn(),
      hasAttached: vi.fn().mockReturnValue(true)
    };
    overlayRef.attach.mockReturnValue({
      instance: { actionInvoked: { subscribe: vi.fn() } },
      setInput: vi.fn()
    });
    const positionStrategy = {
      bottom: vi.fn().mockReturnThis(),
      centerHorizontally: vi.fn().mockReturnThis()
    };
    const overlayStub = {
      position: () => ({ global: () => positionStrategy }),
      create: vi.fn().mockReturnValue(overlayRef)
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Overlay, useValue: overlayStub },
        FbSnackbarService
      ]
    });
    const svc = TestBed.inject(FbSnackbarService);
    svc.open('Saved');
    expect(overlayStub.create).toHaveBeenCalledOnce();
    const config = overlayStub.create.mock.calls[0]![0];
    expect(config.hasBackdrop).toBe(false);
    expect(config.panelClass).toBe('fb-snackbar-panel');
  });

  it('emits "timeout" after the duration elapses for info kind', () => {
    const overlayRef = {
      attach: vi.fn(),
      detach: vi.fn(),
      dispose: vi.fn(),
      hasAttached: vi.fn().mockReturnValue(true)
    };
    overlayRef.attach.mockReturnValue({
      instance: { actionInvoked: { subscribe: vi.fn() } },
      setInput: vi.fn()
    });
    const positionStrategy = {
      bottom: vi.fn().mockReturnThis(),
      centerHorizontally: vi.fn().mockReturnThis()
    };
    const overlayStub = {
      position: () => ({ global: () => positionStrategy }),
      create: vi.fn().mockReturnValue(overlayRef)
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Overlay, useValue: overlayStub },
        FbSnackbarService
      ]
    });
    const svc = TestBed.inject(FbSnackbarService);
    const outcomes: string[] = [];
    svc.open('hi').subscribe((value) => outcomes.push(value));
    vi.advanceTimersByTime(4000);
    expect(outcomes).toEqual(['timeout']);
    expect(overlayRef.dispose).toHaveBeenCalledOnce();
  });

  it('uses 7000 ms duration for error kind by default', () => {
    const overlayRef = {
      attach: vi.fn(),
      detach: vi.fn(),
      dispose: vi.fn(),
      hasAttached: vi.fn().mockReturnValue(true)
    };
    overlayRef.attach.mockReturnValue({
      instance: { actionInvoked: { subscribe: vi.fn() } },
      setInput: vi.fn()
    });
    const positionStrategy = {
      bottom: vi.fn().mockReturnThis(),
      centerHorizontally: vi.fn().mockReturnThis()
    };
    const overlayStub = {
      position: () => ({ global: () => positionStrategy }),
      create: vi.fn().mockReturnValue(overlayRef)
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Overlay, useValue: overlayStub },
        FbSnackbarService
      ]
    });
    const svc = TestBed.inject(FbSnackbarService);
    const outcomes: string[] = [];
    svc.open('boom', { kind: 'error' }).subscribe((v) => outcomes.push(v));
    vi.advanceTimersByTime(4000);
    expect(outcomes).toEqual([]);
    vi.advanceTimersByTime(3000);
    expect(outcomes).toEqual(['timeout']);
  });
});
