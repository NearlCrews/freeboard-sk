import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import type { SKRegion } from '../../resource-classes';

interface DialogData {
  region: SKRegion;
}

@Component({
  selector: 'ap-regiondialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    FormField,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatToolbarModule,
    MatCheckbox
  ],
  template: `
    <div class="_ap-region">
      <mat-toolbar style="background-color: transparent">
        <div>
          <mat-icon class="icon-region">tab_unselected</mat-icon>
        </div>
        <span style="flex: 1 1 auto; text-align: center;">Region Details</span>
        <div style="width: 50px;text-align:right;">
          <button mat-icon-button (click)="handleClose(false)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </mat-toolbar>

      <mat-dialog-content>
        <div style="display: flex">
          <div style="flex: 1 1 auto">
            <div>
              <mat-form-field floatLabel="always" style="width:100%">
                <mat-label>Name</mat-label>
                <input matInput type="text" [formField]="rForm.name" />
                @if (
                  rForm.name().invalid() &&
                  (rForm.name().dirty() || rForm.name().touched())
                ) {
                  <mat-error> Please enter a name.</mat-error>
                }
              </mat-form-field>
            </div>
            <div>
              <mat-form-field floatLabel="always" style="width:100%">
                <mat-label>Description</mat-label>
                <textarea
                  matInput
                  rows="3"
                  [readonly]="readOnly"
                  [(ngModel)]="description"
                >
                </textarea>
              </mat-form-field>
            </div>
            <div>
              <mat-checkbox
                [checked]="isHazard"
                (change)="doHazard($event.checked)"
                >Hazardous Area (Alarm)
              </mat-checkbox>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      @if (!readOnly) {
        <mat-dialog-actions align="end">
          <button
            mat-flat-button
            [disabled]="saveDisabled()"
            (click)="handleClose(true)"
          >
            SAVE
          </button>
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [
    `
      ._ap-region {
        min-width: 300px;
      }
    `
  ]
})
export class RegionDialog implements OnInit {
  protected description = '';
  protected isHazard = false;
  protected readOnly = false;

  protected rModel = signal<{ name: string }>({ name: '' });
  protected rForm = form(this.rModel, (p) => {
    required(p.name, { message: 'Please enter a name.' });
  });
  protected saveDisabled = computed(() => this.rForm().invalid());

  private dialogRef = inject(MatDialogRef<RegionDialog>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  ngOnInit() {
    this.rModel.set({ name: this.data.region.name ?? '' });
    this.description = this.data.region.description ?? '';
    const props = this.data.region.feature.properties;
    this.isHazard = props?.['skIcon'] === 'hazard';
    this.readOnly = (props?.['readOnly'] as boolean) ?? false;
  }

  protected doHazard(checked: boolean) {
    this.isHazard = checked;
  }

  protected handleClose(save: boolean) {
    if (save) {
      this.data.region.name = this.rModel().name;
      this.data.region.description = this.description;
      const props = this.data.region.feature.properties ?? {};
      if (this.isHazard) {
        props['skIcon'] = 'hazard';
      } else {
        delete props['skIcon'];
      }
      this.data.region.feature.properties = props;
    }
    this.dialogRef.close({ save: save, region: this.data.region });
  }
}
