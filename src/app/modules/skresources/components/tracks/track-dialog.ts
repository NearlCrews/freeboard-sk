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
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import {
  FbButtonComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
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
    FbButtonComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbIconComponent,
    FbInputComponent,
    FbTextareaComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-track">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading class="dialog-icon"
          ><fb-icon name="show_chart" ariaLabel="" class="icon-track"></fb-icon
        ></span>
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

      <div fbDialogContent>
        <div>
          <div class="pl-md">
            <div>
              <label for="track-name" class="block font-semibold"> Name </label>
              <fb-input type="text" [formField]="tForm.name"></fb-input>
              @if (
                tForm.name().invalid() &&
                (tForm.name().dirty() || tForm.name().touched())
              ) {
                <div class="error-xs">Please enter a name.</div>
              }
            </div>
            <div>
              <label for="track-description" class="block font-semibold">
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
      </div>

      @if (!readOnly) {
        <div fbDialogActions align="end">
          <fb-button
            variant="primary"
            [disabled]="saveDisabled()"
            (pressed)="handleClose(true)"
          >
            SAVE
          </fb-button>
        </div>
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
