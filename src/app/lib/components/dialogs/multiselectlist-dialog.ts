/** Multi-Select List Dialog Component **
 ********************************/

import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  Inject
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import type { MatListOption } from '@angular/material/list';
import { MatListModule } from '@angular/material/list';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import type { AppIconDef } from 'src/app/modules/icons';

/********* MultiSelectListDialog **********
 * 
 * data: {
    title: string,
    items: [{id: string, name: string}],
    icon: AppIconDef
 * }
 */
@Component({
  selector: 'ap-multiselectlistdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatDialogModule, MatListModule],
  template: `
    <div class="_ap-multisellist">
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
          <h1 mat-dialog-title>{{ this.data.title ?? 'Select Items' }}</h1>
        </div>
        <div style="width:50px;padding: 15px 0 0 10px;">
          <button #btncancel mat-icon-button (click)="handleClose()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <mat-dialog-content style="padding-top: 5px;">
        <mat-selection-list #lItems>
          @for (i of this.data.items; track i.id) {
            <mat-list-option [value]="i">{{ i.name }}</mat-list-option>
          }
        </mat-selection-list>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button
          mat-raised-button
          [disabled]="lItems.selectedOptions.selected.length === 0"
          (click)="handleClose(lItems.selectedOptions.selected)"
        >
          OK
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      ._ap-multisellist {
        min-width: 300px;
      }
    `
  ]
})
export class MultiSelectListDialog implements OnInit {
  @ViewChild('btncancel', { static: false }) btncancel;

  constructor(
    private dialogRef: MatDialogRef<MultiSelectListDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      items: [{ id: string; name: string }];
      icon: AppIconDef;
    }
  ) {}

  ngOnInit() {}

  handleClose(sidIds?: MatListOption[]) {
    this.dialogRef.close(
      Array.isArray(sidIds) ? sidIds.map((i) => i.value) : undefined
    );
  }
}
