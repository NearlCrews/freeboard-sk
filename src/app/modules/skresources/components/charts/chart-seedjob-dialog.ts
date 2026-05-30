import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { AppFacade } from 'src/app/app.facade';
import { CoordsPipe } from 'src/app/lib/pipes';
import { FBChart, Position } from 'src/app/types';

import {
  FbButtonComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
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
    FormsModule,
    FbButtonComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbIconComponent,
    FbSelectComponent,
    FbToolbarComponent,
    CoordsPipe
  ],
  template: `
    <div class="_ap-chartjob">
      <fb-toolbar class="bg-transparent">
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
      <div fbDialogContent>
        <div>
          <div class="flex-auto">{{ data.chart[1].name }}</div>
          @if (data.bbox) {
            <div
              style="flex: 1 1 auto; border: var(--color-border) 1px solid;font-size: var(--font-size-sm);"
            >
              <div class="text-right">
                <span
                  class="flex-auto"
                  [innerText]="data.bbox[1][1] | coords: 'HDd' : true"
                >
                </span
                ><br />
                <span
                  class="flex-auto"
                  [innerText]="data.bbox[1][0] | coords: 'HDd'"
                >
                </span>
              </div>
              <div>
                <span
                  class="flex-auto"
                  [innerText]="data.bbox[0][1] | coords: 'HDd' : true"
                >
                </span
                ><br />
                <span
                  class="flex-auto"
                  [innerText]="data.bbox[0][0] | coords: 'HDd'"
                >
                </span>
              </div>
            </div>
          }
          <div class="flex-auto">
            <label for="chart-seed-zoom" class="block font-semibold">
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
      </div>
      <div fbDialogActions align="end">
        <fb-button variant="primary" (pressed)="dialogRef.close(selZoom)">
          Submit
        </fb-button>
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-chartjob {
        font-family: arial;
        min-width: 300px;
      }

      ._ap-chartjob .key-label {
        width: 150px;
        font-weight: 500;
      }
    `
  ]
})
export class ChartSeedJobDialog implements OnInit {
  protected zoomRange = signal<readonly number[]>([]);
  protected selZoom = 0;
  protected readonly String = String;

  protected zoomOptions = computed<readonly FbSelectOption[]>(() =>
    this.zoomRange().map((z) => ({ id: String(z), label: String(z) }))
  );

  protected app = inject(AppFacade);
  protected dialogRef = inject(DialogRef<unknown, ChartSeedJobDialog>);
  protected data = inject<DialogData>(DIALOG_DATA);

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
