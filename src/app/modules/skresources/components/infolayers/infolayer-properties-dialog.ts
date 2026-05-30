import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { AppFacade } from 'src/app/app.facade';
import { SKInfoLayer } from '../../custom-resource-classes';

import {
  FbButtonComponent,
  FbDialogContentDirective,
  FbIconComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

@Component({
  selector: 'ap-infolayerproperties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbIconComponent,
    FbButtonComponent,
    FbDialogContentDirective,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-infolayer">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading class="dialog-icon"
          ><fb-icon name="layers" ariaLabel=""></fb-icon
        ></span>
        <span fbToolbarTitle>Overlay Properties</span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            ariaLabel="Close"
            (pressed)="dialogRef.close()"
          >
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>
      <div fbDialogContent>
        <div class="flex flex-col">
          <div class="flex">
            <div class="key-label">Name:</div>
            <div class="flex-auto">{{ data.name }}</div>
          </div>
          <div class="flex">
            <div class="key-label">Description:</div>
            <div class="flex-auto">{{ data.description }}</div>
          </div>
          <div class="flex">
            <div class="key-label">Type:</div>
            <div class="flex-auto">
              {{ data.values.sourceType }}
            </div>
          </div>
          <div class="flex">
            <div class="key-label">Zoom:</div>
            <div class="flex-auto">
              <div class="flex-auto">
                <u><i>Min: </i></u>
                {{ data.values.minZoom }},
                <u><i>Max: </i></u>
                {{ data.values.maxZoom }}
              </div>
            </div>
          </div>
          <div class="flex">
            <div class="key-label">Layers:</div>
            <div class="flex-auto">{{ data.values.layers }}</div>
          </div>
          <div class="flex">
            <div class="key-label">URL:</div>
            <div style="flex: 1 1 auto;overflow-x: auto;">
              {{ data.values.url }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-infolayer {
        font-family: arial;
        min-width: 300px;
      }

      ._ap-infolayer .key-label {
        width: 150px;
        font-weight: 500;
      }
    `
  ]
})
export class InfoLayerPropertiesDialog {
  protected app = inject(AppFacade);
  protected dialogRef = inject(DialogRef<unknown, InfoLayerPropertiesDialog>);
  protected data = inject<SKInfoLayer>(DIALOG_DATA);
}
