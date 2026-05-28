import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFacade } from 'src/app/app.facade';
import { SKInfoLayer } from '../../custom-resource-classes';

import {
  FbButtonComponent,
  FbIconComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

@Component({
  selector: 'ap-infolayerproperties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    FbIconComponent,
    FbButtonComponent,
    MatDialogModule,
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
      <mat-dialog-content>
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
      </mat-dialog-content>
    </div>
  `,
  styles: [
    `
      ._ap-infolayer {
        font-family: arial;
        min-width: 300px;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }

      ._ap-infolayer .key-label {
        width: 150px;
        font-weight: 500;
      }

      @media only screen and (min-device-width: 768px) and (max-device-width: 1024px),
        only screen and (min-width: 800px) {
        .ap-confirm-icon {
          min-width: 25%;
          max-width: 25%;
        }
      }
    `
  ]
})
export class InfoLayerPropertiesDialog {
  protected icon = '';

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<InfoLayerPropertiesDialog>);
  protected data = inject<SKInfoLayer>(MAT_DIALOG_DATA);

  constructor() {}
}
