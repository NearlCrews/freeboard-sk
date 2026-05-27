import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule, MatSelectionListChange } from '@angular/material/list';

import {
  FbButtonComponent,
  FbIconComponent,
  FbInputComponent
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { SKInfoLayer } from '../../custom-resource-classes';
import { WMTSLayerDef, wmtsCapabilitiesInWorker } from './maplib';

@Component({
  selector: 'wmts-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatListModule,
    FbButtonComponent,
    FbIconComponent,
    FbInputComponent
  ],
  template: `
    <div class="_ap-wmts">
      <mat-toolbar style="background-color: transparent">
        <span class="dialog-icon"><mat-icon>public</mat-icon></span>
        <span style="flex: 1 1 auto; text-align: center">Add WMTS Source</span>
        <span style="text-align: right">
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Close"
            (pressed)="dialogRef.close()"
          >
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </mat-toolbar>
      <mat-dialog-content>
        <label for="wmts-host" style="display:block; font-weight:600">
          WMTS host.
        </label>
        <div style="display:flex; gap:6px; align-items:center">
          <fb-input
            name="wmts-host"
            type="text"
            [(value)]="hostUrl"
            [invalid]="!hostUrl"
            ariaLabel="WMTS host URL"
          ></fb-input>
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Fetch capabilities"
            [disabled]="hostUrl.length === 0"
            (pressed)="getCapabilities(hostUrl)"
          >
            <fb-icon name="arrow_forward" ariaLabel=""></fb-icon>
          </fb-button>
        </div>
        <div style="font-size: 12px; color: var(--color-text-muted)">
          Enter url of the WMTS host.
        </div>
        @if (!hostUrl) {
          <div style="color: var(--color-error); font-size:12px">
            WMTS host is required!
          </div>
        }

        @if (isFetching) {
          <mat-progress-bar mode="query"></mat-progress-bar>
        } @else {
          @if (errorMsg) {
            <div style="color: var(--color-error)">
              Error retrieving capabilities from server!
            </div>
          } @else {
            <div>
              @if (wmtsLayers.length > 0) {
                <div style="height: 200px;overflow-x: hidden;overflow-y: auto;">
                  <mat-selection-list
                    #wlayers
                    [multiple]="false"
                    (selectionChange)="handleSelection($event)"
                  >
                    @for (layer of wmtsLayers; track layer; let idx = $index) {
                      <mat-list-option [value]="idx">
                        <span matListItemTitle>{{ layer.name }}</span>
                        <span
                          style="flex: 1 1 auto;white-space: pre; overflow:hidden;text-overflow:elipsis;"
                          >{{ layer.description }}</span
                        >
                      </mat-list-option>
                    }
                  </mat-selection-list>
                </div>
              }
            </div>
          }
        }
      </mat-dialog-content>
      @if (data.format !== 'chartprovider') {
        <mat-dialog-actions align="right">
          <fb-button
            variant="primary"
            [disabled]="selections.length === 0"
            (pressed)="handleSave()"
          >
            Save
          </fb-button>
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [
    `
      ._ap-wmts {
      }
      ._ap-wmts .key-label {
        width: 150px;
        font-weight: 500;
      }
    `
  ]
})
export class WMTSDialog {
  protected isFetching = false;
  protected fetchError = false;
  protected errorMsg = '';
  protected wmtsLayers: WMTSLayerDef[] = [];
  protected selections: number[] = [];
  protected selectionInfo: { name: string; description: string }[] = [];
  protected hostUrl = '';

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<WMTSDialog>);
  protected data = inject<{ format: 'chartprovider' | 'infolayer' }>(
    MAT_DIALOG_DATA
  );

  constructor() {}

  handleSelection(e: MatSelectionListChange) {
    this.selections = e.source.selectedOptions.selected.map((opt) => opt.value);
  }

  handleSave() {
    const idx = this.selections[0];
    if (idx === undefined) return;
    const layer = this.wmtsLayers[idx];
    if (!layer) return;
    const l = new SKInfoLayer();
    l.name = layer.name ?? 'Untitled layer';
    l.description = layer.description ?? '';
    l.values.layers = [layer.id];
    l.values.url = this.hostUrl;
    l.values.sourceType = 'WMTS';
    if (layer.time) {
      l.values.time = layer.time;
    }
    this.dialogRef.close([l]);
  }

  /**
   * Retrieve and process capabilities from WMS server
   * @param wmtsHost WMTS server host url (without parameters)
   */
  async getCapabilities(wmtsHost: string) {
    this.selections = [];
    this.selectionInfo = [];
    this.wmtsLayers = [];
    this.errorMsg = '';
    this.hostUrl = wmtsHost;
    try {
      if (this.data.format === 'chartprovider') {
        this.dialogRef.close([
          {
            name: 'New WMTS Chart',
            description: '',
            type: 'WMTS',
            url: wmtsHost,
            format: 'png',
            layers: []
          }
        ]);
        return;
      }
      this.isFetching = true;
      const capabilities = await wmtsCapabilitiesInWorker(wmtsHost);
      this.isFetching = false;
      this.wmtsLayers = capabilities.layers;
    } catch (err) {
      this.isFetching = false;
      this.fetchError = true;
      this.errorMsg = err instanceof Error ? err.message : String(err);
    }
  }
}
