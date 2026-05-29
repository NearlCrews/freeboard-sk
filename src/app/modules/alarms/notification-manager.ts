import { inject, Injectable, signal } from '@angular/core';
import { FbBottomSheetService } from 'src/app/design-system/primitives';
import {
  ALARM_METHOD,
  NotificationMessage,
  PathValue,
  SKNotification
} from '../../types/stream';
import { AppFacade } from 'src/app/app.facade';
import { AlarmStore, SettingsStore } from 'src/app/stores';
import { SKWorkerService } from '../skstream/skstream.service';
import { AlertData } from './components/alert.component';
import { getAlertIcon } from '../icons';
import { SignalKClient } from 'src/lib/signalk-client';
import { AlertPropertiesModal } from './components/alert-properties-modal';

type AlertItems = [string, AlertData][];

@Injectable({ providedIn: 'root' })
export class NotificationManager {
  private alertMap: Map<string, AlertData>;

  // signals
  private alertsSignal = signal<AlertItems>([]);
  readonly alerts = this.alertsSignal.asReadonly();

  private mobSignal = signal<AlertItems>([]);
  readonly mobAlerts = this.mobSignal.asReadonly();

  private app = inject(AppFacade);
  // Phase 3 Batch 3: direct store injection for alert dialogs and HTTP-error
  // surface. AppFacade kept for config + data access; remove once those
  // migrate too.
  private alarm = inject(AlarmStore);
  private settings = inject(SettingsStore);
  private worker = inject(SKWorkerService);
  private signalk = inject(SignalKClient);
  private bottomSheet = inject(FbBottomSheetService);

  constructor() {
    this.alertMap = new Map();

    // ** SIGNAL K STREAM Message**
    this.worker.notification$().subscribe((msg: NotificationMessage) => {
      this.processMessage(msg);
    });
  }

  /**
   * @description Emit signals
   */
  private emitSignals() {
    const rankings: Record<string, number> = {
      emergency: 1,
      alarm: 2,
      warn: 3,
      alert: 4,
      normal: 5,
      nominal: 6
    };
    // sort based on priority and time raised
    const alerts = Array.from(this.alertMap).sort((a, b) => {
      const ra = rankings[a[1].priority] ?? 99;
      const rb = rankings[b[1].priority] ?? 99;
      if (ra === rb) {
        return b[1].createdAt - a[1].createdAt;
      } else {
        return ra - rb;
      }
    });

    this.alertsSignal.update(() => {
      return alerts;
    });

    this.mobSignal.update(() => {
      return alerts.filter((i) => i[1].type === 'mob');
    });

    // update closest vessel ids
    this.app.data.vessels.closest = alerts
      .filter((i) => i[1].type === 'cpa')
      .map((i) => i[1].properties?.['vesselId'])
      .filter((id): id is string => typeof id === 'string');
  }

  /**
   * @description Processes in-scope notification message
   * @param msg notification message
   */
  private processMessage(msg: NotificationMessage) {
    if (!msg.result) {
      return;
    }
    this.parse(msg.result);
  }

  /**
   * @description Parse the notification delta path & value
   * @param msg Signal K path / value pair
   */
  private parse(msg: PathValue) {
    const alertType = this.getAlertType(msg.path);

    // check enabled in config
    if (alertType === 'depth' && !this.app.config.display.depthAlarm.enabled) {
      return;
    }

    // test for return to normal state
    if (!msg.value || (msg.value as SKNotification)?.state === 'normal') {
      if (this.alertMap.has(msg.path)) {
        this.alertMap.delete(msg.path);
        this.emitSignals();
      }
      return;
    }

    // Only Notifications API is supported on this branch; the legacy
    // path is preserved as commented-out reference below.
    if (!this.settings.featureFlags().notificationApi) {
      return;
    }

    const v = msg.value as SKNotification;
    const status = v.status;
    if (!status) {
      return;
    }
    const alert: AlertData = {
      path: msg.path,
      priority: v.state,
      message: v.message,
      sound: v.method.includes(ALARM_METHOD.sound),
      visual: v.method.includes(ALARM_METHOD.visual),
      properties: {},
      acknowledged: status.acknowledged,
      silenced: status.silenced,
      icon: {},
      canAcknowledge: status.canAcknowledge,
      canSilence: status.canSilence,
      canCancel: status.canClear,
      createdAt: v.createdAt ? new Date(v.createdAt).valueOf() : Date.now()
    };
    if (v.id !== undefined) {
      alert.id = v.id;
    }

    alert.type = alertType;
    alert.icon = getAlertIcon(alert);
    const valueObj = msg.value as { position?: unknown };
    if (valueObj.position && alert.properties) {
      alert.properties['position'] = valueObj.position;
    }

    if (['buddy'].includes(alertType)) {
      // show toast message
      this.alarm.showMessage(
        alert.message,
        !this.app.config.display.muteSound && alert.sound
      );
      return;
    } else {
      // alert
      if (alert.type === 'cpa') {
        alert.properties = this.parseCpa(msg.value);
      }
      this.alertMap.set(alert.path, alert);
      this.emitSignals();
    }
  }

  /**
   * @description Returns the alert type
   * @param path Alert path
   */
  private getAlertType(path: string): string {
    const seg = path.split('.');
    const s1 = seg[1] ?? '';
    const s2 = seg[2] ?? '';
    const s3 = seg[3] ?? '';
    if (
      this.isStandardAlarm(s1) ||
      path.includes('notifications.area') ||
      path.includes('notifications.buddy') ||
      path.includes('notifications.meteo.warning')
    ) {
      return s1;
    } else if (path.includes('notifications.navigation.closestApproach')) {
      return 'cpa';
    } else if (
      path.includes('notifications.environment.depth.') ||
      path.includes('notifications.navigation.anchor')
    ) {
      return s2;
    } else if (
      path.includes('notifications.navigation.course.perpendicularPassed') ||
      path.includes('notifications.navigation.course.arrivalCircleEntered')
    ) {
      return s3;
    } else {
      return 'notification';
    }
  }

  /**
   * @description Test if value is a Signal K standard alarm type
   * @param value String representing the alarm type
   * @returns true if value is a standard alarm
   */
  private isStandardAlarm(value: string): boolean {
    return [
      'mob',
      'sinking',
      'fire',
      'piracy',
      'flooding',
      'collision',
      'grounding',
      'listing',
      'adrift',
      'abandon',
      'aground'
    ].includes(value);
  }

  /**
   * @description Returns Alert data for supplied path
   * @param path Path of Alert
   * @returns AlertData object
   */
  public getAlert(path: string): AlertData | undefined {
    const al = this.alerts().find((i) => i[0] === path);
    return al ? al[1] : undefined;
  }

  public showAlertInfo(path: string) {
    const alert = this.getAlert(path);
    if (!alert) {
      this.alarm.showAlert('Alert', 'Alert not found!');
      return;
    }
    this.bottomSheet
      .open(AlertPropertiesModal, {
        data: { alert }
      })
      .afterDismissed()
      .subscribe(() => {
        // some action
      });
  }

  /**
   * @description Acknowledge alert
   * @param path Path of the the alert to acknowledge
   */
  public acknowledge(path: string) {
    const alert = this.alertMap.get(path);
    if (alert && this.settings.featureFlags().notificationApi) {
      this.signalk.api
        .post(
          this.app.skApiVersion,
          `notifications/${alert.id}/acknowledge`,
          {}
        )
        .subscribe(
          () => {
            this.app.debug(`Acknowledged ${alert.id}, ${path}`);
          },
          (err: unknown) => {
            this.alarm.parseHttpErrorResponse(err);
          }
        );
    }
  }

  /**
   * @description Silence alert
   * @param path Path of the the alert to silence
   */
  public silence(path: string) {
    const alert = this.alertMap.get(path);
    if (alert && this.settings.featureFlags().notificationApi) {
      this.signalk.api
        .post(this.app.skApiVersion, `notifications/${alert.id}/silence`, {})
        .subscribe(
          () => {
            this.app.debug(`Silenced ${alert.id}, ${path}`);
          },
          (err: unknown) => {
            this.alarm.parseHttpErrorResponse(err);
          }
        );
    }
  }

  /**
   * @description Silence All alerts
   */
  public silenceAll() {
    if (this.settings.featureFlags().notificationApi) {
      this.signalk.api
        .post(this.app.skApiVersion, `notifications/silenceAll`, {})
        .subscribe(
          () => {
            this.app.debug(`Silenced All alerts`);
          },
          (err: unknown) => {
            this.alarm.parseHttpErrorResponse(err);
          }
        );
    }
  }

  /**
   * @description Clear / Cancel alert
   * @param path Path of the the alert to cancel
   */
  public clear(path: string) {
    const alert = this.alertMap.get(path);
    if (alert && this.settings.featureFlags().notificationApi) {
      this.signalk.api
        .delete(this.app.skApiVersion, `notifications/${alert.id}`)
        .subscribe(
          () => {
            this.app.debug(`Cleared ${alert.id}, ${path}`);
          },
          (err: unknown) => {
            this.alarm.parseHttpErrorResponse(err);
          }
        );
    }
  }

  /**
   * @description Raise Alarm on server
   * @param path Alarm type to raise
   */
  public raiseServerAlarm(alarmType: string, message?: string) {
    if (this.settings.featureFlags().notificationApi) {
      this.signalk.api
        .post(this.app.skApiVersion, `notifications/mob`, { message: message })
        .subscribe(
          (r: { id?: string }) => {
            this.app.debug(`MOB Alarm raised (${r.id})`);
          },
          (err: unknown) => {
            this.alarm.parseHttpErrorResponse(err);
          }
        );
    }
  }

  /**
   * @description Cancel Alarm on server
   * @param alert Alarm to cancel
   * @returns Observable
   */
  public cancelServerAlarm(alert: AlertData) {
    if (this.settings.featureFlags().notificationApi) {
      this.signalk.api
        .delete(this.app.skApiVersion, `notifications/${alert.id}`)
        .subscribe(
          () => {
            this.app.debug(`Cleared ${alert.id}`);
          },
          (err: unknown) => {
            this.alarm.parseHttpErrorResponse(err);
          }
        );
    }
  }

  // parse ClosestApproach message data
  private parseCpa(msg: unknown): Record<string, unknown> {
    const m = msg as { other?: unknown } | null;
    return {
      vesselId: m?.other ?? undefined
    };
  }
}
