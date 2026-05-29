/** History Playback Dialog **
 ********************************/

import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  computed,
  signal
} from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  FbButtonComponent,
  FbDatepickerComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
  FbDialogTitleDirective,
  FbFormFieldComponent,
  FbIconComponent,
  FbSelectComponent,
  FbTooltipDirective,
  type FbSelectOption
} from 'src/app/design-system/primitives';

@Component({
  selector: 'ap-playbackdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbDatepickerComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbDialogTitleDirective,
    FbFormFieldComponent,
    FbIconComponent,
    FbSelectComponent,
    FbTooltipDirective
  ],
  template: `
    <div class="_ap-playback">
      <div>
        <h1 fbDialogTitle>
          <fb-icon name="history" ariaLabel=""></fb-icon>&nbsp;
          &nbsp;&nbsp;History Playback
        </h1>
      </div>
      <div fbDialogContent>
        <div class="flex">
          <div>
            <div>
              <fb-form-field #contextField label="Context" [widthPx]="180">
                <fb-select
                  [name]="contextField.controlId"
                  [options]="contextOptions"
                  [(value)]="context"
                  ariaLabel="Context"
                ></fb-select>
              </fb-form-field>
            </div>
            <div>
              <fb-form-field
                #dateField
                label="Start date"
                hint="MM/DD/YYYY"
                [widthPx]="180"
              >
                <fb-datepicker
                  [(value)]="startDate"
                  [max]="maxDate"
                  ariaLabel="Start date"
                ></fb-datepicker>
              </fb-form-field>
            </div>
            <div style="font-size:var(--font-size-sm);">
              <b>Start Time:</b><br />
              <fb-form-field #hourField label="Hour" [widthPx]="100">
                <fb-select
                  [name]="hourField.controlId"
                  [options]="hourOptions"
                  [(value)]="startTimeHr"
                  ariaLabel="Start hour"
                ></fb-select>
              </fb-form-field>
              <b>: </b>
              <fb-form-field #minField label="Minutes" [widthPx]="100">
                <fb-select
                  [name]="minField.controlId"
                  [options]="minuteOptions"
                  [(value)]="startTimeMin"
                  ariaLabel="Start minute"
                ></fb-select>
              </fb-form-field>
            </div>
            <div>
              <fb-form-field #rateField label="Playback Rate" [widthPx]="150">
                <fb-select
                  fbTooltip="Advance stream the selected number of seconds for every second of playback"
                  [name]="rateField.controlId"
                  [options]="rateOptions"
                  [(value)]="playbackRate"
                  ariaLabel="Playback rate"
                ></fb-select>
              </fb-form-field>
            </div>
          </div>
        </div>
      </div>
      <div fbDialogActions>
        <div style="text-align:center;width:100%;">
          <fb-button
            variant="primary"
            [disabled]="submitDisabled()"
            (pressed)="submit()"
          >
            START
          </fb-button>
          <fb-button variant="ghost" (pressed)="submit(true)">CANCEL</fb-button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-playback {
        font-family: arial;
        min-width: 300px;
      }
      @media only screen and (min-device-width: 768px) and (max-device-width: 1024px),
        only screen and (min-width: 800px) {
      }
    `
  ]
})
export class PlaybackDialog {
  protected readonly context = signal<string | null>('all');
  protected readonly startTimeHr = signal<string | null>('00');
  protected readonly startTimeMin = signal<string | null>('00');
  protected readonly startDate = signal<Date | null>(null);
  protected readonly playbackRate = signal<number | null>(1);

  protected readonly submitDisabled = computed(() => this.startDate() === null);

  public maxDate = new Date();

  protected readonly contextOptions: readonly FbSelectOption<string>[] = [
    { id: 'self', label: 'self' },
    { id: 'all', label: 'all' }
  ];

  protected readonly hourOptions: readonly FbSelectOption<string>[] =
    Array.from({ length: 24 }, (_, i) => {
      const label = ('00' + i).slice(-2);
      return { id: label, label };
    });

  protected readonly minuteOptions: readonly FbSelectOption<string>[] =
    Array.from({ length: 59 }, (_, i) => {
      const label = ('00' + i).slice(-2);
      return { id: label, label };
    });

  protected readonly rateOptions: readonly FbSelectOption<number>[] = [
    { id: 0.5, label: '0.5' },
    { id: 1, label: '1' },
    { id: 2, label: '2' },
    { id: 5, label: '5' },
    { id: 10, label: '10' }
  ];

  constructor(
    public dialogRef: DialogRef<unknown, PlaybackDialog>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(DIALOG_DATA) public data: any
  ) {}

  submit(cancel = false) {
    let q = {};
    let ts = '';
    const start = this.startDate();
    if (!cancel && start) {
      const hr = parseInt(this.startTimeHr() ?? '0', 10);
      const min = parseInt(this.startTimeMin() ?? '0', 10);
      start.setHours(hr);
      start.setMinutes(min);
      ts = start.toISOString();
      ts = ts.slice(0, ts.indexOf('.')) + 'Z';
      q = {
        subscribe: this.context(),
        startTime: ts,
        playbackRate: this.playbackRate()
      };
    }
    this.dialogRef.close({
      result: !cancel,
      query: q,
      startTime: ts
    });
  }
}
