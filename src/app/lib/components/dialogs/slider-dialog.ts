/** Slider input Dialog Component **
 ********************************/

import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import type { AppIconDef } from 'src/app/modules/icons';

import {
  FbButtonComponent,
  FbIconComponent,
  FbSliderComponent
} from 'src/app/design-system/primitives';

export interface SliderInputDialogResult {
  apply: boolean;
  value: number;
}

//********* SliderInputDialog *********
@Component({
  selector: 'ap-slider-input-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    FbButtonComponent,
    FbIconComponent,
    FbSliderComponent
  ],
  template: `
    <div class="_ap-slider-input">
      <div style="display:flex;">
        <div style="padding: 15px 0 0 10px;">
          @if (this.data.icon) {
            <mat-icon
              [svgIcon]="this.data.icon.svgIcon"
              [class]="this.data.icon.class"
              >{{ this.data.icon.name }}</mat-icon
            >
          }
        </div>
        <div style="flex: 1 1 auto;">
          <h1 mat-dialog-title>{{ data.title ?? '' }}</h1>
        </div>
        <div style="width:50px;padding: 15px 0 0 10px;">
          <fb-button
            #btncancel
            variant="ghost"
            ariaLabel="Cancel"
            (pressed)="handleClose(false)"
          >
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </fb-button>
        </div>
      </div>

      <mat-dialog-content style="padding-top: 5px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <div style="flex: 1 1 auto">{{ data.text }}</div>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <fb-slider
            style="width: stretch"
            [min]="this.data.min ?? 1"
            [max]="this.data.max ?? 100"
            [step]="this.data.step ?? 1"
            [value]="formattedValue()"
            (valueChange)="setValue($event)"
          ></fb-slider>
          <div style="min-width: 48px; text-align: right">
            {{ formattedValue() }}{{ this.data.suffix ?? '%' }}
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <fb-button variant="primary" (pressed)="handleClose(true)"
          >APPLY</fb-button
        >
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-slider-input {
      }
    `
  ]
})
export class SliderInputDialog implements OnInit {
  protected formattedValue = signal<number>(0);

  data = inject<{
    title: string;
    text: string;
    max: number;
    min: number;
    step: number;
    value: number;
    suffix: string;
    icon: AppIconDef;
    onChange: (value: number) => void;
  }>(MAT_DIALOG_DATA);

  constructor(private dialogRef: MatDialogRef<SliderInputDialog>) {}

  ngOnInit() {
    this.formattedValue.set(this.data.value);
  }

  setValue(value: number) {
    this.formattedValue.set(value);
    if (typeof this.data?.onChange === 'function') {
      this.data.onChange(value);
    }
  }

  handleClose(apply: boolean) {
    this.dialogRef.close({
      apply: apply,
      value: this.formattedValue()
    });
  }
}
