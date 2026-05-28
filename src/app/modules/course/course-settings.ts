import {
  Component,
  OnInit,
  Inject,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatBottomSheetModule,
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import {
  FbButtonComponent,
  FbDatepickerComponent,
  FbIconComponent,
  FbInputComponent,
  FbSelectComponent,
  FbSwitchComponent,
  FbToolbarComponent,
  type FbSelectOption
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'src/lib/signalk-client';
import { Convert, TARGET_UNIT } from 'src/app/lib/convert';
import { CourseService, SKStreamFacade } from 'src/app/modules';
import { UpdateMessage } from 'src/app/types';

interface CourseSettingsData {
  title?: string;
}

interface FormChangeEvent {
  targetElement?: { id?: string };
  source?: { id?: string };
  target?: { id?: string; value?: string | null };
}

interface ToggleChangeEvent {
  checked: boolean;
}

interface CoursePutResponse {
  targetArrivalTime?: string | null;
}

/********* Course Settings Modal ********
	data: {
        title: "<string>" title text
    }
***********************************/
@Component({
  selector: 'ap-course-modal',
  imports: [
    FormsModule,
    MatBottomSheetModule,
    MatTooltipModule,
    FbButtonComponent,
    FbDatepickerComponent,
    FbIconComponent,
    FbInputComponent,
    FbSelectComponent,
    FbSwitchComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-course">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading>
          <fb-icon class="ob" svgName="navigation-route" ariaLabel=""></fb-icon>
        </span>
        <span fbToolbarTitle>
          {{ data.title }}
        </span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Close"
            (pressed)="closeModal()"
            matTooltip="Close"
            matTooltipPosition="below"
          >
            <fb-icon name="keyboard_arrow_down" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>

      <fieldset>
        <legend>Arrival</legend>

        <div>
          <label for="arrivalCircle" class="block font-semibold">
            Arrival Circle Radius
          </label>
          <div style="display:flex; align-items:center; gap:var(--space-sm);">
            <fb-input
              name="arrivalCircle"
              type="number"
              [value]="String(frmArrivalCircle)"
              (valueChange)="onArrivalCircleChange($event)"
              placeholder="100"
              ariaLabel="Arrival circle radius"
              matTooltip="Enter Arrival circle radius"
            ></fb-input>
            <span>{{ renderSymbol(app.config.units.distance) }}</span>
          </div>
        </div>

        <div
          style="display:flex; align-items:center; gap:var(--space-sm); padding-right: var(--space-md); padding-top: var(--space-sm)"
        >
          <span>Target Arrival time</span>
          <fb-switch
            ariaLabel="Enable target arrival time"
            [(checked)]="targetArrivalEnabled"
            (checkedChange)="toggleTargetArrival({ checked: $event })"
          ></fb-switch>
        </div>

        <div style="display:flex; flex-wrap:wrap;">
          <div>
            <label
              for="arrivalDate"
              class="block font-semibold"
              style="font-size: var(--font-size-xs)"
            >
              Date
            </label>
            <fb-datepicker
              [value]="arrivalData.datetime"
              (valueChange)="onArrivalDateChange($event)"
              [min]="minDate"
              [disabled]="!targetArrivalEnabled"
              ariaLabel="Arrival date"
              placeholder="Choose a start date"
            ></fb-datepicker>
          </div>

          <div style="display:flex;flex-wrap:nowrap; gap: var(--space-sm);">
            <div style="width: 100px">
              <label
                for="arrivalHour"
                class="block font-semibold"
                style="font-size: var(--font-size-xs)"
              >
                Hour
              </label>
              <fb-select
                name="arrivalHour"
                [options]="hrOptions()"
                [value]="arrivalData.hour"
                [disabled]="!targetArrivalEnabled"
                (valueChange)="onArrivalHourChange($event)"
              ></fb-select>
            </div>

            <div style="width: 100px">
              <label
                for="arrivalMinutes"
                class="block font-semibold"
                style="font-size: var(--font-size-xs)"
              >
                Minutes
              </label>
              <fb-select
                name="arrivalMinutes"
                [options]="minOptions()"
                [value]="arrivalData.minutes"
                [disabled]="!targetArrivalEnabled"
                (valueChange)="onArrivalMinutesChange($event)"
              ></fb-select>
            </div>

            <div style="width: 100px">
              <label
                for="arrivalSeconds"
                class="block font-semibold"
                style="font-size: var(--font-size-xs)"
              >
                seconds
              </label>
              <fb-select
                name="arrivalSeconds"
                [options]="minOptions()"
                [value]="arrivalData.seconds"
                [disabled]="!targetArrivalEnabled"
                (valueChange)="onArrivalSecondsChange($event)"
              ></fb-select>
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  `,
  styles: [
    `
      ._ap-course {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-course .key-label {
        font-weight: 500;
        width: 120px;
      }
      ._ap-course .key-desc {
        font-style: italic;
      }
    `
  ]
})
export class CourseSettingsModal implements OnInit {
  protected readonly String = String;
  frmArrivalCircle = 0;
  private destroyRef = inject(DestroyRef);
  protected targetArrivalEnabled = false;
  protected minDate = new Date();
  protected arrivalData: {
    hour: string;
    minutes: string;
    seconds: string;
    datetime: Date | null;
  } = {
    hour: '00',
    minutes: '00',
    seconds: '00',
    datetime: null
  };
  private context = 'self';
  /*this.app.data.vessels.activeId
  ? this.app.data.vessels.activeId
  : 'self';*/

  constructor(
    public app: AppFacade,
    private stream: SKStreamFacade,
    private cdr: ChangeDetectorRef,
    private signalk: SignalKClient,
    protected course: CourseService,
    public modalRef: MatBottomSheetRef<CourseSettingsModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: CourseSettingsData
  ) {}

  ngOnInit() {
    if (this.data.title === 'undefined') {
      this.data.title = 'Course Settings';
    }
    const arrivalCircle = this.course.courseData().arrivalCircle;
    this.frmArrivalCircle = arrivalCircle ?? 0;
    if (this.app.config.units.distance !== 'kilometer') {
      const converted = Convert.transform(
        this.frmArrivalCircle,
        'm',
        'naut-mile'
      );
      this.frmArrivalCircle =
        converted === null ? 0 : Number(converted.toFixed(1));
    }

    this.stream
      .delta$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e: UpdateMessage) => {
        if (e.action === 'update') {
          this.cdr.detectChanges();
        }
      });

    this.signalk.api
      .get(this.app.skApiVersion, 'vessels/self/navigation/course')
      .subscribe((val: CoursePutResponse) => {
        console.log(val.targetArrivalTime);
        if (val.targetArrivalTime) {
          this.targetArrivalEnabled = true;
          const dt = new Date(val.targetArrivalTime);
          this.arrivalData.datetime = dt;
          this.arrivalData.hour = ('00' + dt.getHours()).slice(-2);
          this.arrivalData.minutes = ('00' + dt.getMinutes()).slice(-2);
          this.arrivalData.seconds = ('00' + dt.getSeconds()).slice(-2);
        }
      });
  }

  closeModal() {
    this.modalRef.dismiss();
  }

  onFormChange(e: FormChangeEvent) {
    if (
      e.targetElement &&
      [
        'arrivalDate',
        'arrivalHour',
        'arrivalMinutes',
        'arrivalSeconds'
      ].includes(e.targetElement.id ?? '')
    ) {
      this.processTargetArrival();
    }
    if (
      e.source &&
      ['arrivalHour', 'arrivalMinutes', 'arrivalSeconds'].includes(
        e.source.id ?? ''
      )
    ) {
      this.processTargetArrival();
    }
    if (e.target && e.target.id === 'arrivalCircle') {
      if (
        e.target.value !== '' &&
        e.target.value !== null &&
        e.target.value !== undefined
      ) {
        let d: number | null =
          this.app.config.units.distance === 'kilometer'
            ? Number(e.target.value)
            : Convert.nauticalMilesToKm(Number(e.target.value)) * 1000;
        d = d <= 0 ? null : d;
        this.app.config.course.arrivalCircle = Number(e.target.value);

        this.signalk.api
          .putWithContext(
            this.app.skApiVersion,
            this.context,
            'navigation/course/arrivalCircle',
            { value: d }
          )
          .subscribe(
            () => {},
            (error: HttpErrorResponse) => {
              let msg = `Error setting Arrival Circle!\n`;
              if (error.status === 403) {
                msg += 'Unauthorised: Please login.';
              }
              this.app.showAlert(`Error (${error.status}):`, msg);
            }
          );
      }
    }
  }

  toggleTargetArrival(e: ToggleChangeEvent) {
    this.targetArrivalEnabled = e.checked;
    if (!this.targetArrivalEnabled) {
      this.arrivalData.datetime = null;
      this.signalk.api
        .putWithContext(
          this.app.skApiVersion,
          this.context,
          'navigation/course/targetArrivalTime',
          {
            value: null
          }
        )
        .subscribe();
    } else {
      this.processTargetArrival();
    }
  }

  processTargetArrival() {
    if (this.targetArrivalEnabled) {
      if (!this.arrivalData.datetime) {
        return;
      }
      const atime = this.formatArrivalTime();
      this.signalk.api
        .putWithContext(
          this.app.skApiVersion,
          this.context,
          'navigation/course/targetArrivalTime',
          {
            value: atime
          }
        )
        .subscribe(
          () => {
            console.log('targetArrivalTime = ', atime);
          },
          (error: HttpErrorResponse) => {
            let msg = `Error setting target arrival time!\n`;
            if (error.status === 403) {
              msg += 'Unauthorised: Please login.';
            }
            this.app.showAlert(`Error (${error.status}):`, msg);
          }
        );
    }
  }

  formatArrivalTime(): string {
    const dt = this.arrivalData.datetime;
    if (!dt) return '';
    dt.setHours(parseInt(this.arrivalData.hour));
    dt.setMinutes(parseInt(this.arrivalData.minutes));
    dt.setSeconds(parseInt(this.arrivalData.seconds));
    const ts = dt.toISOString();
    return ts.slice(0, ts.indexOf('.')) + 'Z';
  }

  hrValues(): string[] {
    const v: string[] = [];
    for (let i = 0; i < 24; i++) {
      v.push(('00' + i).slice(-2));
    }
    return v;
  }

  minValues(): string[] {
    const v: string[] = [];
    for (let i = 0; i < 59; i++) {
      v.push(('00' + i).slice(-2));
    }
    return v;
  }

  protected hrOptions(): readonly FbSelectOption[] {
    return this.hrValues().map((v) => ({ id: v, label: v }));
  }

  protected minOptions(): readonly FbSelectOption[] {
    return this.minValues().map((v) => ({ id: v, label: v }));
  }

  protected onArrivalCircleChange(value: string) {
    this.onFormChange({
      target: { id: 'arrivalCircle', value }
    });
  }

  protected onArrivalDateChange(value: Date | null) {
    this.arrivalData.datetime = value;
    this.onFormChange({ targetElement: { id: 'arrivalDate' } });
  }

  protected onArrivalHourChange(value: string | null) {
    if (value === null) return;
    this.arrivalData.hour = value;
    this.onFormChange({ source: { id: 'arrivalHour' } });
  }

  protected onArrivalMinutesChange(value: string | null) {
    if (value === null) return;
    this.arrivalData.minutes = value;
    this.onFormChange({ source: { id: 'arrivalMinutes' } });
  }

  protected onArrivalSecondsChange(value: string | null) {
    if (value === null) return;
    this.arrivalData.seconds = value;
    this.onFormChange({ source: { id: 'arrivalSeconds' } });
  }

  renderSymbol(unit: TARGET_UNIT) {
    return Convert.getSymbol(unit);
  }
}
