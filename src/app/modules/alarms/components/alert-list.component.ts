/***********************************
  Alert List
  <alert-list>
***********************************/
import {
  Component,
  ChangeDetectionStrategy,
  output,
  input,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CdkDrag } from '@angular/cdk/drag-drop';

import {
  FbCardComponent,
  FbSwitchComponent
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { getAlertIcon } from '../../icons';
import { AlertData } from './alert.component';
import { NotificationManager } from '../notification-manager';
import { ALARM_STATE } from 'src/app/types/stream';
import { alertSeverityClass } from './alert-severity';

@Component({
  selector: 'alert-list',
  imports: [
    MatTooltipModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    FormsModule,
    CdkDrag,
    FbCardComponent,
    FbSwitchComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./alert-list.component.css'],
  template: `
    <mat-menu #alarmsmenu="matMenu">
      <button mat-menu-item (click)="raiseAlarm('mob')">
        <mat-icon class="ob" svgIcon="alarm-mob"></mat-icon>
        &nbsp;Overboard!
      </button>
    </mat-menu>
    <fb-card variant="outlined">
      <div class="alert-list-main mat-app-background" cdkDrag>
        <div class="title" cdkDragHandle>
          @if (app.featureFlags().notificationApi) {
            <div>
              <button
                class="button-warn"
                mat-raised-button
                matTooltip="Raise Alarm"
                aria-label="Raise alarm"
                [matMenuTriggerFor]="alarmsmenu"
              >
                <mat-icon>warning</mat-icon>
                Raise
              </button>
            </div>
          }
          <h2
            style="flex: 1 1 auto;
            font-size: 14pt;
            line-height: 2.5em;
            text-align: center;
            cursor: grab;
            margin: 0;
            font-weight: 500;"
          >
            Alert List
          </h2>
          <div style="display:flex">
            <button
              mat-icon-button
              matTooltip="Silence All"
              aria-label="Silence all alerts"
              (click)="silenceAll()"
            >
              <mat-icon class="ob" svgIcon="sound-off-fill"></mat-icon>
            </button>
            &nbsp; &nbsp;
            <div>
              <fb-switch
                matTooltip="Sound on /off"
                ariaLabel="Toggle alert sound"
                [checked]="!this.app.config.display.muteSound"
                (checkedChange)="togglePlaySound()"
              ></fb-switch>
            </div>
            &nbsp;
            <button
              mat-icon-button
              matTooltip="Close"
              aria-label="Close alert list"
              (click)="handleClose()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <div class="content">
          <div class="alert-list-container">
            <div class="alert-list">
              @for (item of alerts(); track item[0]) {
                <div class="alert-box">
                  <button
                    type="button"
                    class="alert-info-trigger alert-info-icon"
                    (click)="notiMgr.showAlertInfo(item[1].path)"
                    [attr.aria-label]="'Show details for ' + item[1].message"
                  >
                    <mat-icon
                      [class]="item[1].icon.class"
                      [svgIcon]="item[1].icon.svgIcon"
                      >{{ item[1].icon.name }}</mat-icon
                    >
                  </button>
                  <button
                    type="button"
                    class="alert-info-trigger alert-text"
                    (click)="notiMgr.showAlertInfo(item[1].path)"
                    [attr.aria-label]="'Show details for ' + item[1].message"
                    [ngClass]="[
                      item[1].canAcknowledge && !item[1].acknowledged
                        ? 'blink-text'
                        : '',
                      severityClass(item[1].priority)
                    ]"
                  >
                    {{ item[1].message }}
                  </button>
                  <div style="width:90px;">
                    @if (
                      app.featureFlags().notificationApi &&
                      item[1].sound &&
                      item[1].canSilence
                    ) {
                      <button
                        mat-icon-button
                        [matTooltip]="item[1].silenced ? 'Silenced' : 'Silence'"
                        matTooltipPosition="below"
                        [attr.aria-label]="
                          item[1].silenced ? 'Alert silenced' : 'Silence alert'
                        "
                        [disabled]="item[1].acknowledged || item[1].silenced"
                        (click)="muteAlert(item[1].path)"
                      >
                        <mat-icon
                          [class]="item[1].acknowledged ? '' : 'ob'"
                          [svgIcon]="
                            item[1].silenced
                              ? 'sound-off-fill'
                              : 'sound-high-fill'
                          "
                        ></mat-icon>
                      </button>
                      &nbsp;
                    }
                    @if (
                      app.featureFlags().notificationApi &&
                      item[1].canAcknowledge
                    ) {
                      @if (!item[1].acknowledged) {
                        <button
                          mat-icon-button
                          matTooltip="Acknowledge"
                          matTooltipPosition="below"
                          aria-label="Acknowledge alert"
                          [disabled]="item[1].acknowledged"
                          (click)="ackAlert(item[1].path)"
                        >
                          <mat-icon>check</mat-icon>
                        </button>
                      } @else {
                        @if (item[1].canCancel) {
                          <button
                            mat-icon-button
                            matTooltip="Clear / Cancel"
                            matTooltipPosition="below"
                            aria-label="Clear alert"
                            [disabled]="!item[1].acknowledged"
                            (click)="clearAlert(item[1].path)"
                          >
                            <mat-icon>close</mat-icon>
                          </button>
                        }
                      }
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </fb-card>
  `
})
export class AlertListComponent {
  alerts = input<[string, AlertData][]>([]);

  readonly closed = output<void>();

  protected app = inject(AppFacade);
  protected notiMgr = inject(NotificationManager);

  constructor() {}

  protected handleClose() {
    this.closed.emit();
  }

  protected togglePlaySound() {
    this.app.config.display.muteSound = !this.app.config.display.muteSound;
    this.app.saveConfig();
  }

  protected ackAlert(path: string) {
    this.notiMgr.acknowledge(path);
  }

  protected muteAlert(path: string) {
    this.notiMgr.silence(path);
  }

  protected clearAlert(path: string) {
    this.notiMgr.clear(path);
  }

  protected silenceAll() {
    this.notiMgr.silenceAll();
  }

  /**
   * @description Raise standard alarm
   * @param alarmType Signal K standard alarm
   */
  protected raiseAlarm(alarmType: string) {
    const msg = alarmType === 'mob' ? 'Person Overboard!' : undefined;
    this.notiMgr.raiseServerAlarm(alarmType, msg);
  }

  /**
   * @description Set the alert icon
   * @returns svgIcon value
   */
  protected setIcon(alert: AlertData): string {
    return getAlertIcon(alert).svgIcon ?? '';
  }

  protected severityClass(priority: ALARM_STATE): string {
    return alertSeverityClass(priority);
  }
}
