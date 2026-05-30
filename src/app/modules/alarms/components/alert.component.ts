import {
  Component,
  output,
  input,
  effect,
  signal,
  inject,
  OnDestroy
} from '@angular/core';

import { TimerButtonComponent } from './timer-button.component';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  FbIconComponent,
  FbProgressBarComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import { NotificationManager } from '../notification-manager';
import { AppIconDef } from '../../icons';
import { ALARM_STATE } from 'src/app/types/stream';
import { CourseService } from '../../course/course.service';
import { alertSeverityClass } from './alert-severity';

export interface AlertData {
  id?: string;
  path: string;
  priority: ALARM_STATE;
  message: string;
  sound: boolean;
  visual: boolean;
  properties?: Record<string, unknown>;
  icon: AppIconDef;
  type?: string;
  acknowledged: boolean;
  silenced: boolean;
  canAcknowledge?: boolean;
  canSilence?: boolean;
  canCancel?: boolean;
  createdAt: number;
}

const SoundFiles: Record<ALARM_STATE, string> = {
  emergency: './assets/sound/woop.mp3',
  alarm: './assets/sound/woop.mp3',
  alert: './assets/sound/ding.mp3',
  warn: './assets/sound/ding.mp3',
  normal: './assets/sound/ding.mp3',
  nominal: './assets/sound/ding.mp3'
};

const CRITICAL_PRIORITIES: ReadonlySet<ALARM_STATE> = new Set([
  ALARM_STATE.emergency,
  ALARM_STATE.alarm
]);

const STATIC_NEXT_POINT_TYPES: ReadonlySet<string> = new Set([
  'perpendicularPassed',
  'arrivalCircleEntered'
]);

@Component({
  selector: 'fb-alert',
  imports: [
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbIconComponent,
    FbProgressBarComponent,
    FbTooltipDirective,
    TimerButtonComponent
  ],
  template: `
    @if (app.uiCtrl().alertList || hidden()) {
      <span></span>
    } @else {
      @if (alert().visual && !alert().acknowledged) {
        <div>
          @if (!alert().canAcknowledge) {
            <fb-progress-bar [value]="progressValue()"></fb-progress-bar>
          }
          <fb-card style="padding:var(--space-xs);border-radius:0;">
            <fb-card-content>
              <div style="display:flex; width:100%;">
                <div style="width:35px;">
                  <fb-icon
                    [class]="alert().icon.class"
                    [svgName]="alert().icon.svgIcon ?? ''"
                    [name]="alert().icon.name ?? ''"
                    ariaLabel=""
                  ></fb-icon>
                </div>
                <div
                  [class]="severityClass()"
                  style="overflow: hidden;
                  display: -webkit-box;
                  -webkit-box-orient: vertical;
                  -webkit-line-clamp: 2;
                  line-clamp: 2;
                  text-overflow:ellipsis;"
                >
                  {{ alert().message }}
                </div>
              </div>
            </fb-card-content>

            <fb-card-actions align="start">
              <div style="display:flex;flex-wrap: wrap;">
                @if (alert().sound && alert().canSilence) {
                  <div style="text-align: left;">
                    <fb-button
                      variant="primary"
                      (pressed)="muteAlarm()"
                      [disabled]="alert().silenced"
                    >
                      <fb-icon
                        class="ob"
                        [svgName]="
                          alert().silenced
                            ? 'sound-off-fill'
                            : 'sound-unavailable-fill'
                        "
                        ariaLabel=""
                      ></fb-icon>
                      {{ alert().silenced ? 'MUTED' : 'MUTE' }}
                    </fb-button>
                  </div>
                }
                @if (alert().canAcknowledge) {
                  <div>
                    <fb-button variant="primary" (pressed)="ackAlarm()">
                      <fb-icon name="check" ariaLabel=""></fb-icon>
                      ACK
                    </fb-button>
                  </div>
                } @else {
                  <fb-button
                    variant="primary"
                    fbTooltip="Dismiss"
                    fbTooltipPosition="left"
                    (pressed)="hide()"
                  >
                    <fb-icon name="clear_all" ariaLabel=""></fb-icon>
                    Dismiss
                  </fb-button>
                }

                @if (app.data.activeRoute) {
                  @let isLastPoint =
                    course.courseData().pointIndex ===
                    course.courseData().pointTotal - 1;
                  <div>
                    @if (
                      app.config.course.autoNextPointOnArrival &&
                      app.config.course.autoNextPointTrigger === alert().type
                    ) {
                      <div>
                        @if (isLastPoint) {
                          <timer-button
                            [disabled]="nextPointClicked"
                            [icon]="'clear_all'"
                            [label]="'End Route in'"
                            [cancelledLabel]="'End Route'"
                            [period]="app.config.course.autoNextPointDelay"
                            (nextPoint)="endRoute()"
                          >
                          </timer-button>
                        } @else {
                          <timer-button
                            [disabled]="nextPointClicked"
                            [icon]="'skip_next'"
                            [label]="'Next point in'"
                            [cancelledLabel]="'NEXT POINT'"
                            [period]="app.config.course.autoNextPointDelay"
                            (nextPoint)="gotoNextPoint()"
                          >
                          </timer-button>
                        }
                      </div>
                    } @else if (showStaticNextPoint) {
                      @if (isLastPoint) {
                        <fb-button
                          variant="ghost"
                          [disabled]="nextPointClicked"
                          (pressed)="endRoute()"
                        >
                          <fb-icon name="clear_all" ariaLabel=""></fb-icon>
                          END ROUTE
                        </fb-button>
                      } @else {
                        <fb-button
                          variant="ghost"
                          [disabled]="nextPointClicked"
                          (pressed)="gotoNextPoint()"
                        >
                          <fb-icon name="skip_next" ariaLabel=""></fb-icon>
                          NEXT POINT
                        </fb-button>
                      }
                    }
                  </div>
                }
              </div>
            </fb-card-actions>
          </fb-card>
        </div>
      }
    }
  `,
  styles: [
    `
      .fb-alert-emergency {
        color: var(--safety-alert-emergency);
      }
      .fb-alert-alarm {
        color: var(--safety-alert-alarm);
      }
      .fb-alert-warn {
        color: var(--safety-alert-warn);
      }
      .fb-alert-caution {
        color: var(--safety-alert-caution);
      }
    `
  ]
})
export class AlertComponent implements OnDestroy {
  alert = input.required<AlertData>();
  acknowledged = input<boolean>(false);
  silenced = input<boolean>(false);
  audioStatus = input<string>(''); // changed audio context state
  doNotPlaySound = input<boolean>(false); // config setting

  hidden = signal<boolean>(false); // alert card is hidden
  progressValue = signal<number>(100);

  readonly nextPoint = output<void>();
  readonly routeEnd = output<void>();

  protected showStaticNextPoint = false;
  protected showAutoNextPoint = false;
  protected nextPointClicked = false;
  private audio: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private soundFile = SoundFiles.warn;
  private timerRef: ReturnType<typeof setInterval> | null = null;

  protected app = inject(AppFacade);
  private notiMgr = inject(NotificationManager);
  protected course = inject(CourseService);

  constructor() {
    effect(() => {
      // Touch acknowledged/silenced inputs so the effect re-runs when they
      // change. Their values are read transitively via this.alert().
      this.acknowledged();
      this.silenced();
      const al = this.alert();
      this.showStaticNextPoint = STATIC_NEXT_POINT_TYPES.has(al.type ?? '');
      this.showAutoNextPoint =
        this.showStaticNextPoint &&
        this.app.config.course.autoNextPointTrigger === al.type;
      this.processAudio(al);
      if (
        !this.timerRef &&
        !CRITICAL_PRIORITIES.has(al.priority) &&
        !this.showAutoNextPoint
      ) {
        // Auto-hide non-critical alerts after ~10 s (100 ticks of 100
        // ms, decrementing the progress bar from 100 to 0 by 1 each
        // tick). Critical alerts (`emergency`/`alarm` priority) and
        // the auto-next-point case bypass this above.
        this.timerRef = setInterval(() => {
          if (this.progressValue() > 0) {
            this.progressValue.update((value) => value - 1);
          } else {
            this.hidden.set(true);
            if (this.timerRef) {
              clearInterval(this.timerRef);
            }
          }
        }, 100);
      }
    });
  }

  ngOnDestroy() {
    if (this.timerRef) {
      clearInterval(this.timerRef);
    }
    if (this.audio) {
      this.audio.pause();
    }
    this.audio = null;
    this.source = null;
  }

  protected severityClass(): string {
    return alertSeverityClass(this.alert().priority);
  }

  protected hide() {
    this.hidden.set(true);
  }

  protected ackAlarm() {
    this.notiMgr.acknowledge(this.alert().path);
  }

  protected muteAlarm() {
    this.notiMgr.silence(this.alert().path);
  }

  private processAudio(al: AlertData) {
    this.soundFile = SoundFiles[al.priority];
    if (this.app.audio.context) {
      if (!this.audio) {
        this.audio = new Audio();
      }
      if (!this.source) {
        this.source = this.app.audio.context.createMediaElementSource(
          this.audio
        );
        this.source.connect(this.app.audio.context.destination);
      }
      if (this.audioStatus() === 'running') {
        if (al.sound) {
          if (this.doNotPlaySound() || al.silenced || al.acknowledged) {
            this.audio.pause();
          } else {
            this.audio.loop = CRITICAL_PRIORITIES.has(al.priority);
            this.audio.src = this.soundFile;
            this.audio
              .play()
              .then(() => {})
              .catch(() => {});
          }
        } else {
          this.audio.pause();
        }
      }
    }
  }

  gotoNextPoint() {
    this.nextPointClicked = true;
    this.nextPoint.emit();
    this.hide();
  }

  endRoute() {
    this.nextPointClicked = true;
    this.routeEnd.emit();
    this.hide();
  }
}
