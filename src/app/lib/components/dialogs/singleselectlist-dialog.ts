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

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import type { AppIconDef } from 'src/app/modules/icons';

import {
  FbButtonComponent,
  FbDialogContentDirective,
  FbDialogTitleDirective,
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
    FbButtonComponent,
    FbDialogContentDirective,
    FbDialogTitleDirective,
    FbIconComponent,
    FbListComponent,
    FbListItemComponent
  ],
  template: `
    <div class="_ap-singlesellist">
      <div class="flex">
        <div style="padding: var(--space-lg) 0 0 var(--space-md);">
          @if (this.data.icon) {
            <fb-icon
              [svgName]="this.data.icon.svgIcon ?? ''"
              [name]="this.data.icon.name ?? ''"
              [class]="this.data.icon.class"
              ariaLabel=""
            ></fb-icon>
          }
        </div>
        <div class="flex-auto">
          <h1 fbDialogTitle>{{ data.title ?? 'Select Item' }}</h1>
        </div>
        <div style="width:50px;padding: var(--space-lg) 0 0 var(--space-md);">
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

      <div fbDialogContent style="padding-top: var(--space-xs);">
        <fb-list>
          @for (i of this.data.items; track i.id) {
            <fb-list-item interactive (activated)="handleClose(i)">
              {{ i.name }}
            </fb-list-item>
          }
        </fb-list>
      </div>
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
