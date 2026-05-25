import { Injectable, Signal, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

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

/**
 * Phase 3 Batch 3: owns the cross-cutting alert and notification surface:
 * the dialog primitives (AlertDialog, ConfirmDialog, MsgBox, ErrorListDialog,
 * WelcomeDialog), the snack-bar MessageBar wrapper, the HTTP error renderer,
 * and a context-menu inhibit signal that the alert subsystem uses to keep
 * map-click menus off while an alarm is active.
 *
 * The audio pipeline itself (oscillator / gain per alert) stays on
 * AppFacade.audio + AudioAlarmService for Batch 2 backward compatibility.
 * Single-fire highest-severity selection over a unified alarm queue lands
 * in Phase 7.
 */
@Injectable({ providedIn: 'root' })
export class AlarmStore {
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  /** Inhibit context menus while an alert is showing. Mirror of uiCtrl flag. */
  private readonly _inhibitContextMenu = signal<boolean>(false);
  readonly inhibitContextMenu: Signal<boolean> =
    this._inhibitContextMenu.asReadonly();

  /** Set the context-menu inhibit flag. */
  setInhibitContextMenu(value: boolean): void {
    this._inhibitContextMenu.set(value);
  }

  // ----- dialog primitives -----

  showMsgBox(title: string, message: string, btn?: string) {
    return this.dialog
      .open(MsgBox, {
        disableClose: false,
        data: { message, title, buttonText: btn }
      })
      .afterClosed();
  }

  showAlert(title: string, message: string, btn?: string) {
    return this.dialog
      .open(AlertDialog, {
        disableClose: false,
        data: { message, title, buttonText: btn }
      })
      .afterClosed();
  }

  showErrorList(errList: ErrorList, btn?: string) {
    return this.dialog
      .open(ErrorListDialog, {
        disableClose: false,
        data: { errorList: errList, buttonText: btn }
      })
      .afterClosed();
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
    return this.dialog
      .open(ConfirmDialog, {
        disableClose: true,
        data: {
          message,
          title,
          button1Text: btn1,
          button2Text: btn2,
          checkText
        }
      })
      .afterClosed();
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
  ): MatDialogRef<WelcomeDialog> | undefined {
    if (kioskMode || !['first_run', 'major', 'minor'].includes(launchResult)) {
      return undefined;
    }
    let buttonText = 'Get Started';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [];
    let showPrefs = false;

    if (launchResult === 'first_run' && !suppressFirstRun) {
      content.push(WELCOME_MESSAGES.welcome);
      if (data.server?.id) {
        content.push(WELCOME_MESSAGES[data.server.id]);
        showPrefs = true;
      }
    } else {
      const news = WELCOME_MESSAGES['whats-new'];
      if (news && news.length > 0) {
        for (const msg of news) {
          if (msg.type) {
            if (data.server?.id && msg.type === data.server.id) {
              content.push(msg);
            }
          } else {
            content.push(msg);
          }
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
  parseHttpErrorResponse(err: HttpErrorResponse): void {
    const msg =
      err.status && [401, 403].includes(err.status)
        ? 'Signal K server requires authentication to update resources.\nPlease login and try again.\n'
        : 'Operation could not be completed!\n';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const detail = (err.error?.message as string | undefined) ?? '';
    this.showAlert(`${err.status ?? 'Error'}`, msg + detail);
  }
}
