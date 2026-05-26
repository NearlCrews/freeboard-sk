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
import type { SKTrack } from '../../resource-classes';
import { MatToolbarModule } from '@angular/material/toolbar';

interface DialogData {
  track: SKTrack;
}

@Component({
  selector: 'ap-trackdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    FormField,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatToolbarModule
  ],
  template: `
    <div class="_ap-track">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"
          ><mat-icon class="icon-track">show_chart</mat-icon></span
        >
        <span style="flex: 1 1 auto; text-align: center">Track Details</span>
        <span style="text-align: right">
          <button mat-icon-button (click)="handleClose(false)">
            <mat-icon>close</mat-icon>
          </button>
        </span>
      </mat-toolbar>

      <mat-dialog-content>
        <div>
          <div style="padding-left: 10px;">
            <div>
              <mat-form-field floatLabel="always">
                <mat-label>Name</mat-label>
                <input matInput type="text" [formField]="tForm.name" />
                @if (
                  tForm.name().invalid() &&
                  (tForm.name().dirty() || tForm.name().touched())
                ) {
                  <mat-error> Please enter a name.</mat-error>
                }
              </mat-form-field>
            </div>
            <div>
              <mat-form-field floatLabel="always">
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
          </div>
        </div>
      </mat-dialog-content>

      @if (!readOnly) {
        <mat-dialog-actions align="right">
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
      ._ap-track {
        min-width: 300px;
      }
    `
  ]
})
export class TrackDialog implements OnInit {
  protected description = '';
  protected readOnly = false;

  protected tModel = signal<{ name: string }>({ name: '' });
  protected tForm = form(this.tModel, (p) => {
    required(p.name, { message: 'Please enter a name.' });
  });
  protected saveDisabled = computed(() => this.tForm().invalid());

  protected data = inject<DialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<TrackDialog>);

  ngOnInit() {
    const props = this.data.track.feature?.properties;
    this.tModel.set({ name: (props?.['name'] as string) ?? '' });
    this.description = (props?.['description'] as string) ?? '';
    this.readOnly = (props?.['readOnly'] as boolean) ?? false;
  }

  handleClose(save: boolean) {
    if (save) {
      const props = this.data.track.feature.properties ?? {};
      const name = this.tModel().name;
      props['name'] = name;
      props['description'] = this.description;
      this.data.track.feature.properties = props;
      this.data.track.name = name;
      this.data.track.description = this.description;
    }
    this.dialogRef.close({ save: save, track: this.data.track });
  }
}
