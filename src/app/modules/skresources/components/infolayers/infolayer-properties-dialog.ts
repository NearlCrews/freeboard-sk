import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { AppFacade } from 'src/app/app.facade';
import { SKInfoLayer } from '../../custom-resource-classes';

import {
  FbIconComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';

@Component({
  selector: 'ap-infolayerproperties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    FbIconComponent,
    MatButtonModule,
    MatDialogModule,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-infolayer">
      <fb-toolbar style="background-color: transparent">
        <span fbToolbarLeading class="dialog-icon"
          ><fb-icon name="layers" ariaLabel=""></fb-icon
        ></span>
        <span fbToolbarTitle>Overlay Properties</span>
        <span fbToolbarActions>
          <button mat-icon-button (click)="dialogRef.close()">
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </button>
        </span>
      </fb-toolbar>
      <mat-dialog-content>
        <div style="display:flex;flex-direction: column;">
          <div style="display:flex;">
            <div class="key-label">Name:</div>
            <div style="flex: 1 1 auto;">{{ data.name }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Description:</div>
            <div style="flex: 1 1 auto;">{{ data.description }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Type:</div>
            <div style="flex: 1 1 auto;">
              {{ data.values.sourceType }}
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Zoom:</div>
            <div style="flex: 1 1 auto;">
              <div style="flex: 1 1 auto;">
                <u><i>Min: </i></u>
                {{ data.values.minZoom }},
                <u><i>Max: </i></u>
                {{ data.values.maxZoom }}
              </div>
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Layers:</div>
            <div style="flex: 1 1 auto;">{{ data.values.layers }}</div>
          </div>
          <div style="display:flex;">
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
