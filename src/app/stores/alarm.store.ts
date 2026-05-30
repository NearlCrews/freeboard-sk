import { Injectable, Signal, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { DialogRef } from '@angular/cdk/dialog';
import {
  FbDialogService,
  FbSnackBarService
} from 'src/app/design-system/primitives';

import {
  AlertDialog,
  ConfirmDialog,
  MessageBarComponent,
  MsgBox,
  WelcomeDialog
} from 'src/app/lib/components/dialogs/common-dialogs';
import { ErrorListDialog } from 'src/app/lib/components/dialogs/errorlist-dialog';
import { WELCOME_MESSAGES } from 'src/app/app.messages';
import type { ErrorList, FBAppData } from 'src/app/types';

export type LaunchResult =
  | 'first_run'
  | 'major'
  | 'minor'
  | 'patch'
  | 'current';

interface WelcomeContentItem {
  type?: string;
  title: string;
  message: string;
}

/**
 * Owns the cross-cutting alert and notification surface: dialog primitives
 * (AlertDialog, ConfirmDialog, MsgBox, ErrorListDialog, WelcomeDialog), the
 * MessageBar snack-bar wrapper, the HTTP error renderer, and a context-menu
 * inhibit signal that the alert subsystem uses to keep map-click menus off
 * while an alarm is active.
 *
 * The audio pipeline (oscillator/gain per alert) stays on AppFacade.audio +
 * AudioAlarmService until single-fire highest-severity selection over a
 * unified alarm queue lands in a later phase.
 */
@Injectable({ providedIn: 'root' })
export class AlarmStore {
  private readonly dialog = inject(FbDialogService);
  private readonly snackbar = inject(FbSnackBarService);

  /** Inhibit context menus while an alert is showing. Mirror of uiCtrl flag. */
  private readonly _inhibitContextMenu = signal<boolean>(false);
  readonly inhibitContextMenu: Signal<boolean> =
    this._inhibitContextMenu.asReadonly();

  /** Set the context-menu inhibit flag. */
  setInhibitContextMenu(value: boolean): void {
    this._inhibitContextMenu.set(value);
  }

  showMsgBox(title: string, message: string, btn?: string) {
    return this.dialog.open(MsgBox, {
      disableClose: false,
      data: { message, title, buttonText: btn }
    }).closed;
  }

  showAlert(title: string, message: string, btn?: string) {
    return this.dialog.open(AlertDialog, {
      disableClose: false,
      data: { message, title, buttonText: btn }
    }).closed;
  }

  showErrorList(errList: ErrorList, btn?: string) {
    return this.dialog.open(ErrorListDialog, {
      disableClose: false,
      data: { errorList: errList, buttonText: btn }
    }).closed;
  }

  showMessage(message: string, sound = false, duration = 5000): void {
    this.snackbar.openFromComponent(MessageBarComponent, {
      duration,
      data: { message, sound }
    });
  }

  showConfirm(
    message: string,
    title: string,
    btn1?: string,
    btn2?: string,
    checkText?: string
  ) {
    return this.dialog.open(ConfirmDialog, {
      disableClose: true,
      data: {
        message,
        title,
        button1Text: btn1,
        button2Text: btn2,
        checkText
      }
    }).closed;
  }

  /**
   * Compose the version-aware Welcome dialog payload and open it. Returns
   * undefined when kiosk mode is on, the launch result is "current" or
   * "patch", or no messages match the current SK server id.
   */
  showWelcome(
    suppressFirstRun: boolean,
    launchResult: LaunchResult,
    data: FBAppData,
    kioskMode: boolean
  ): DialogRef<unknown, WelcomeDialog> | undefined {
    if (kioskMode || !['first_run', 'major', 'minor'].includes(launchResult)) {
      return undefined;
    }
    let buttonText = 'Get Started';
    const content: WelcomeContentItem[] = [];
    let showPrefs = false;
    const serverId = data.server?.['id'] as string | undefined;

    if (launchResult === 'first_run' && !suppressFirstRun) {
      content.push(WELCOME_MESSAGES.welcome);
      if (serverId) {
        const serverMsg = (WELCOME_MESSAGES as Record<string, unknown>)[
          serverId
        ] as WelcomeContentItem | undefined;
        if (serverMsg) {
          content.push(serverMsg);
        }
        showPrefs = true;
      }
    } else {
      const news = WELCOME_MESSAGES['whats-new'];
      for (const msg of news ?? []) {
        if (!msg.type || msg.type === serverId) {
          content.push(msg);
        }
      }
      buttonText = 'Got it';
    }
    if (content.length === 0) return undefined;
    return this.dialog.open(WelcomeDialog, {
      disableClose: true,
      data: { buttonText, content, showPrefs }
    });
  }

  /** Format and display an HTTP error response. */
  parseHttpErrorResponse(err: unknown): void {
    const httpErr = err instanceof HttpErrorResponse ? err : null;
    const status = httpErr?.status;
    const msg =
      status && [401, 403].includes(status)
        ? 'Signal K server requires authentication to update resources.\nPlease login and try again.\n'
        : 'Operation could not be completed!\n';
    const errorBody = httpErr?.error as { message?: string } | undefined;
    const detail = errorBody?.message ?? '';
    this.showAlert(`${status ?? 'Error'}`, msg + detail);
  }
}
