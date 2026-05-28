/** Multi-Select List Dialog Component **
 ********************************/

import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  Inject,
  computed,
  signal
} from '@angular/core';

import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import type { AppIconDef } from 'src/app/modules/icons';

import {
  FbButtonComponent,
  FbIconComponent,
  FbSelectionListComponent,
  type FbSelectionListOption
} from 'src/app/design-system/primitives';

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
  imports: [
    MatDialogModule,
    FbButtonComponent,
    FbIconComponent,
    FbSelectionListComponent
  ],
  template: `
    <div class="_ap-multisellist">
      <div style="display:flex;">
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
        <div style="flex: 1 1 auto;">
          <h1 mat-dialog-title>{{ this.data.title ?? 'Select Items' }}</h1>
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

      <mat-dialog-content style="padding-top: var(--space-xs);">
        <fb-selection-list
          [options]="options()"
          [values]="selectedIds()"
          (valuesChange)="selectedIds.set($event)"
        ></fb-selection-list>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <fb-button
          variant="primary"
          [disabled]="selectedIds().length === 0"
          (pressed)="handleSubmit()"
        >
          OK
        </fb-button>
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
  @ViewChild('btncancel', { static: false })
  btncancel: ElementRef<HTMLElement> | undefined;

  protected selectedIds = signal<readonly string[]>([]);
  protected options = computed<readonly FbSelectionListOption[]>(() =>
    (this.data.items ?? []).map((i) => ({ id: i.id, label: i.name }))
  );

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

  handleClose() {
    this.dialogRef.close(undefined);
  }

  handleSubmit() {
    const ids = new Set(this.selectedIds());
    const selected = (this.data.items ?? []).filter((i) => ids.has(i.id));
    this.dialogRef.close(selected);
  }
}
