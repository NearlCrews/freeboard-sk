/** Single Select List Dialog Component **
 ********************************/

import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  Inject
} from '@angular/core';

import { MatInputModule } from '@angular/material/input';
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
  FbListComponent,
  FbListItemComponent
} from 'src/app/design-system/primitives';

/********* SingleSelectListDialog *********
 * data: {
    title: string,
    items: [{id: string, name: string}],
    icon: AppIconDef
 * }
 */
@Component({
  selector: 'ap-singleselectlistdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    FbButtonComponent,
    FbIconComponent,
    FbListComponent,
    FbListItemComponent
  ],
  template: `
    <div class="_ap-singlesellist">
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
          <h1 mat-dialog-title>{{ data.title ?? 'Select Item' }}</h1>
        </div>
        <div style="width:50px;padding: 15px 0 0 10px;">
          <fb-button
            #btncancel
            variant="ghost"
            ariaLabel="Cancel selection"
            (pressed)="handleClose()"
          >
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </fb-button>
        </div>
      </div>

      <mat-dialog-content style="padding-top: 5px;">
        <fb-list>
          @for (i of this.data.items; track i.id) {
            <fb-list-item interactive (activated)="handleClose(i)">
              {{ i.name }}
            </fb-list-item>
          }
        </fb-list>
      </mat-dialog-content>
    </div>
  `,
  styles: [
    `
      ._ap-singlesellist {
        min-width: 300px;
      }
    `
  ]
})
export class SingleSelectListDialog implements OnInit {
  @ViewChild('btncancel', { static: false })
  btncancel: ElementRef<HTMLElement> | undefined;

  constructor(
    private dialogRef: MatDialogRef<SingleSelectListDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      items: [{ id: string; name: string }];
      icon: AppIconDef;
    }
  ) {}

  ngOnInit() {}

  handleClose(sel?: { id: string; name: string }) {
    this.dialogRef.close(sel);
  }
}
