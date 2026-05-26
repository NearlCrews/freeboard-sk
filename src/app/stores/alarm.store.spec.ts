import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AlarmStore } from './alarm.store';

function fakeDialogRef(value: unknown = undefined) {
  return {
    afterClosed: () => ({
      subscribe: (cb: (v: unknown) => void) => cb(value)
    })
  };
}

describe('AlarmStore', () => {
  let openSpy: ReturnType<typeof vi.fn>;
  let snackSpy: ReturnType<typeof vi.fn>;
  let store: AlarmStore;

  beforeEach(() => {
    TestBed.resetTestingModule();
    openSpy = vi.fn().mockReturnValue(fakeDialogRef());
    snackSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: { open: openSpy } },
        { provide: MatSnackBar, useValue: { openFromComponent: snackSpy } }
      ]
    });
    store = TestBed.inject(AlarmStore);
  });

  it('setInhibitContextMenu mirrors into the signal', () => {
    expect(store.inhibitContextMenu()).toBe(false);
    store.setInhibitContextMenu(true);
    expect(store.inhibitContextMenu()).toBe(true);
  });

  it('showAlert opens AlertDialog with the supplied payload', () => {
    store.showAlert('Title', 'Body', 'OK');
    expect(openSpy).toHaveBeenCalledTimes(1);
    const cfg = openSpy.mock.calls[0]![1];
    expect(cfg.data).toEqual({
      title: 'Title',
      message: 'Body',
      buttonText: 'OK'
    });
    expect(cfg.disableClose).toBe(false);
  });

  it('showConfirm opens ConfirmDialog with disableClose true', () => {
    store.showConfirm('msg', 'title', 'Yes', 'No', 'remember');
    const cfg = openSpy.mock.calls[0]![1];
    expect(cfg.disableClose).toBe(true);
    expect(cfg.data).toEqual({
      message: 'msg',
      title: 'title',
      button1Text: 'Yes',
      button2Text: 'No',
      checkText: 'remember'
    });
  });

  it('showMessage forwards to MatSnackBar.openFromComponent', () => {
    store.showMessage('hello', true, 1234);
    expect(snackSpy).toHaveBeenCalledTimes(1);
    const cfg = snackSpy.mock.calls[0]![1];
    expect(cfg.duration).toBe(1234);
    expect(cfg.data).toEqual({ message: 'hello', sound: true });
  });

  it('parseHttpErrorResponse uses the auth message on 401 and 403', () => {
    store.parseHttpErrorResponse(new HttpErrorResponse({ status: 401 }));
    const data1 = openSpy.mock.calls[0]![1].data;
    expect(data1.title).toBe('401');
    expect(data1.message).toContain('requires authentication');

    store.parseHttpErrorResponse(new HttpErrorResponse({ status: 403 }));
    const data2 = openSpy.mock.calls[1]![1].data;
    expect(data2.title).toBe('403');
    expect(data2.message).toContain('requires authentication');
  });

  it('parseHttpErrorResponse uses the generic message on other statuses', () => {
    store.parseHttpErrorResponse(new HttpErrorResponse({ status: 500 }));
    const data = openSpy.mock.calls[0]![1].data;
    expect(data.title).toBe('500');
    expect(data.message).toContain('could not be completed');
  });
});
