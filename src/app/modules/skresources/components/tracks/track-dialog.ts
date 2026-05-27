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
import { MatIconModule } from '@angular/material/icon';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';

import {
  FbButtonComponent,
  FbIconComponent,
  FbInputComponent,
  FbTextareaComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

import type { SKTrack } from '../../resource-classes';

interface DialogData {
  track: SKTrack;
}

@Component({
  selector: 'ap-trackdialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    FormField,
    MatIconModule,
    MatDialogModule,
    FbButtonComponent,
    FbIconComponent,
    FbInputComponent,
    FbTextareaComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-track">
      <fb-toolbar style="background-color: transparent">
        <span fbToolbarLeading class="dialog-icon"
          ><mat-icon class="icon-track">show_chart</mat-icon></span
        >
        <span fbToolbarTitle>Track Details</span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Close"
            (pressed)="handleClose(false)"
          >
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>

      <mat-dialog-content>
        <div>
          <div style="padding-left: 10px;">
            <div>
              <label for="track-name" style="display:block; font-weight:600">
                Name
              </label>
              <fb-input type="text" [formField]="tForm.name"></fb-input>
              @if (
                tForm.name().invalid() &&
                (tForm.name().dirty() || tForm.name().touched())
              ) {
                <div style="color: var(--color-error); font-size:12px">
                  Please enter a name.
                </div>
              }
            </div>
            <div>
              <label
                for="track-description"
                style="display:block; font-weight:600"
              >
                Description
              </label>
              <fb-textarea
                name="track-description"
                [disabled]="readOnly"
                [(value)]="description"
              ></fb-textarea>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      @if (!readOnly) {
        <mat-dialog-actions align="right">
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
