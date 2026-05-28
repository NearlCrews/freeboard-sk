import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFacade } from 'src/app/app.facade';
import { CoordsPipe } from 'src/app/lib/pipes';
import { FBChart, Position } from 'src/app/types';

import {
  FbButtonComponent,
  FbIconComponent,
  FbSelectComponent,
  FbToolbarComponent,
  type FbSelectOption
} from 'src/app/design-system/primitives';

interface DialogData {
  chart: FBChart;
  bbox: [Position, Position];
}

@Component({
  selector: 'ap-chartproperties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatDialogModule,
    FormsModule,
    FbButtonComponent,
    FbIconComponent,
    FbSelectComponent,
    FbToolbarComponent,
    CoordsPipe
  ],
  template: `
    <div class="_ap-chartjob">
      <fb-toolbar style="background-color: transparent">
        <span fbToolbarLeading class="dialog-icon"
          ><fb-icon name="download" ariaLabel=""></fb-icon
        ></span>
        <span fbToolbarTitle>Chart Seed job</span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Close"
            (pressed)="dialogRef.close(-1)"
          >
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>
      <mat-dialog-content>
        <div>
          <div style="flex: 1 1 auto;">{{ data.chart[1].name }}</div>
          @if (data.bbox) {
            <div
              style="flex: 1 1 auto; border: var(--color-border) 1px solid;font-size: var(--font-size-sm);"
            >
              <div style="text-align:right;">
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data.bbox[1][1] | coords: 'HDd' : true"
                >
                </span
                ><br />
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data.bbox[1][0] | coords: 'HDd'"
                >
                </span>
              </div>
              <div>
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data.bbox[0][1] | coords: 'HDd' : true"
                >
                </span
                ><br />
                <span
                  style="flex: 1 1 auto;"
                  [innerText]="data.bbox[0][0] | coords: 'HDd'"
                >
                </span>
              </div>
            </div>
          }
          <div style="flex: 1 1 auto;">
            <label for="chart-seed-zoom" style="display:block; font-weight:600">
              Max. Zoom Level
            </label>
            <fb-select
              name="chart-seed-zoom"
              [options]="zoomOptions()"
              [value]="String(selZoom)"
              (valueChange)="onZoomChange($event)"
            ></fb-select>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="right">
        <fb-button variant="primary" (pressed)="dialogRef.close(selZoom)">
          Submit
        </fb-button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-chartjob {
        font-family: arial;
        min-width: 300px;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }

      ._ap-chartjob .key-label {
        width: 150px;
        font-weight: 500;
      }

      @media only screen and (min-device-width: 768px) and (max-device-width: 1024px),
        only screen and (min-width: 800px) {
        .ap-confirm-icon {
          min-width: 25%;
          max-width: 25%;
        }
      }
    `
  ]
})
export class ChartSeedJobDialog implements OnInit {
  protected icon = '';
  protected zoomRange = signal<readonly number[]>([]);
  protected selZoom = 0;
  protected readonly String = String;

  protected zoomOptions = computed<readonly FbSelectOption[]>(() =>
    this.zoomRange().map((z) => ({ id: String(z), label: String(z) }))
  );

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<ChartSeedJobDialog>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor() {}

  ngOnInit() {
    const minZoom = this.data.chart[1].minZoom ?? 1;
    const maxZoom = this.data.chart[1].maxZoom ?? 15;
    this.selZoom = maxZoom;
    const range: number[] = [];
    for (let i = minZoom; i <= maxZoom; i++) {
      range.push(i);
    }
    this.zoomRange.set(range);
  }

  protected onZoomChange(v: string | null) {
    if (v === null) return;
    const n = Number(v);
    if (!Number.isNaN(n)) this.selZoom = n;
  }
}
