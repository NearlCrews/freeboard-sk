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
import type { SKRoute } from '../../resource-classes';
import { MatToolbarModule } from '@angular/material/toolbar';

interface DialogData {
  route: SKRoute;
}

@Component({
  selector: 'ap-routedialog',
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
    <div class="_ap-route">
      <mat-toolbar style="background-color: transparent">
        <div>
          <mat-icon class="icon-route" svgIcon="route"></mat-icon>
        </div>
        <span style="flex: 1 1 auto; text-align: center;">Route Details</span>
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
              <mat-form-field floatLabel="always" style="width: 100%">
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
              <mat-form-field floatLabel="always" style="width: 100%">
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
      ._ap-route {
        min-width: 300px;
      }
    `
  ]
})
export class RouteDialog implements OnInit {
  protected description = '';
  protected readOnly = false;

  protected rModel = signal<{ name: string }>({ name: '' });
  protected rForm = form(this.rModel, (p) => {
    required(p.name, { message: 'Please enter a name.' });
  });
  protected saveDisabled = computed(() => this.rForm().invalid());

  private dialogRef = inject(MatDialogRef<RouteDialog>);
  protected data = inject<DialogData>(MAT_DIALOG_DATA);

  ngOnInit() {
    this.rModel.set({ name: this.data.route.name ?? '' });
    this.description = this.data.route.description ?? '';
    this.readOnly =
      (this.data.route.feature.properties?.['readOnly'] as boolean) ?? false;
  }

  handleClose(save: boolean) {
    if (save) {
      this.data.route.name = this.rModel().name;
      this.data.route.description = this.description;
    }
    this.dialogRef.close({ save: save, route: this.data.route });
  }
}
