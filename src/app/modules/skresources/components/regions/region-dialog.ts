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
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';

import {
  FbButtonComponent,
  FbCheckboxComponent,
  FbIconComponent,
  FbInputComponent,
  FbTextareaComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

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
    MatDialogModule,
    FbButtonComponent,
    FbCheckboxComponent,
    FbIconComponent,
    FbInputComponent,
    FbTextareaComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-region">
      <fb-toolbar style="background-color: transparent">
        <div fbToolbarLeading>
          <fb-icon
            name="tab_unselected"
            ariaLabel=""
            class="icon-region"
          ></fb-icon>
        </div>
        <span fbToolbarTitle>Region Details</span>
        <div fbToolbarActions style="width: 50px; text-align: right;">
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Close"
            (pressed)="handleClose(false)"
          >
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </fb-button>
        </div>
      </fb-toolbar>

      <mat-dialog-content>
        <div style="display: flex">
          <div style="flex: 1 1 auto">
            <div>
              <label for="region-name" style="display:block; font-weight:600">
                Name
              </label>
              <fb-input type="text" [formField]="rForm.name"></fb-input>
              @if (
                rForm.name().invalid() &&
                (rForm.name().dirty() || rForm.name().touched())
              ) {
                <div style="color: var(--color-error); font-size:12px">
                  Please enter a name.
                </div>
              }
            </div>
            <div>
              <label
                for="region-description"
                style="display:block; font-weight:600"
              >
                Description
              </label>
              <fb-textarea
                name="region-description"
                [disabled]="readOnly"
                [(value)]="description"
              ></fb-textarea>
            </div>
            <div>
              <fb-checkbox
                [checked]="isHazard"
                (checkedChange)="doHazard($event)"
              >
                Hazardous Area (Alarm)
              </fb-checkbox>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      @if (!readOnly) {
        <mat-dialog-actions align="end">
          <fb-button
            variant="primary"
            [disabled]="saveDisabled()"
            (pressed)="handleClose(true)"
          >
            SAVE
          </fb-button>
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
