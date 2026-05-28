/***********************************
  Alert List
  <alert-list>
***********************************/
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  output,
  input,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { CdkDrag } from '@angular/cdk/drag-drop';

import {
  FbButtonComponent,
  FbCardComponent,
  FbIconComponent,
  FbMenuService,
  FbSwitchComponent,
  type FbMenuItem
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
    MatIconModule,
    FormsModule,
    CdkDrag,
    FbButtonComponent,
    FbCardComponent,
    FbIconComponent,
    FbSwitchComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./alert-list.component.css'],
  template: `
    <fb-card variant="outlined">
      <div class="alert-list-main mat-app-background" cdkDrag>
        <div class="title" cdkDragHandle>
          @if (app.featureFlags().notificationApi) {
            <div>
              <fb-button
                class="button-warn"
                variant="primary"
                matTooltip="Raise Alarm"
                ariaLabel="Raise alarm"
                (pressed)="openAlarmsMenu($event)"
              >
                <mat-icon>warning</mat-icon>
                Raise
              </fb-button>
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
            <fb-button
              variant="ghost"
              matTooltip="Silence All"
              ariaLabel="Silence all alerts"
              (pressed)="silenceAll()"
            >
              <fb-icon
                class="ob"
                svgName="sound-off-fill"
                ariaLabel=""
              ></fb-icon>
            </fb-button>
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
            <fb-button
              variant="ghost"
              matTooltip="Close"
              ariaLabel="Close alert list"
              (pressed)="handleClose()"
            >
              <mat-icon>close</mat-icon>
            </fb-button>
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
                    <fb-icon
                      [class]="item[1].icon.class"
                      [svgName]="item[1].icon.svgIcon ?? ''"
                      [name]="item[1].icon.name ?? ''"
                      ariaLabel=""
                    ></fb-icon>
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
                      <fb-button
                        variant="ghost"
                        [matTooltip]="item[1].silenced ? 'Silenced' : 'Silence'"
                        matTooltipPosition="below"
                        [ariaLabel]="
                          item[1].silenced ? 'Alert silenced' : 'Silence alert'
                        "
                        [disabled]="item[1].acknowledged || item[1].silenced"
                        (pressed)="muteAlert(item[1].path)"
                      >
                        <fb-icon
                          [class]="item[1].acknowledged ? '' : 'ob'"
                          [svgName]="
                            item[1].silenced
                              ? 'sound-off-fill'
                              : 'sound-high-fill'
                          "
                          ariaLabel=""
                        ></fb-icon>
                      </fb-button>
                      &nbsp;
                    }
                    @if (
                      app.featureFlags().notificationApi &&
                      item[1].canAcknowledge
                    ) {
                      @if (!item[1].acknowledged) {
                        <fb-button
                          variant="ghost"
                          matTooltip="Acknowledge"
                          matTooltipPosition="below"
                          ariaLabel="Acknowledge alert"
                          [disabled]="item[1].acknowledged"
                          (pressed)="ackAlert(item[1].path)"
                        >
                          <mat-icon>check</mat-icon>
                        </fb-button>
                      } @else {
                        @if (item[1].canCancel) {
                          <fb-button
                            variant="ghost"
                            matTooltip="Clear / Cancel"
                            matTooltipPosition="below"
                            ariaLabel="Clear alert"
                            [disabled]="!item[1].acknowledged"
                            (pressed)="clearAlert(item[1].path)"
                          >
                            <mat-icon>close</mat-icon>
                          </fb-button>
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
  private destroyRef = inject(DestroyRef);
  private menu = inject(FbMenuService);

  private readonly alarmsMenuItems: readonly FbMenuItem[] = [
    { id: 'mob', label: 'Overboard!' }
  ];

  protected openAlarmsMenu(event: MouseEvent) {
    const trigger = event.currentTarget as HTMLElement;
    this.menu
      .open(trigger, this.alarmsMenuItems)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id) {
          this.raiseAlarm(id);
        }
      });
  }

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
