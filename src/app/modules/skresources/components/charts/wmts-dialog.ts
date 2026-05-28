import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  FbButtonComponent,
  FbIconComponent,
  FbInputComponent,
  FbListComponent,
  FbListItemComponent,
  FbProgressBarComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { SKInfoLayer } from '../../custom-resource-classes';
import { WMTSLayerDef, wmtsCapabilitiesInWorker } from './maplib';

@Component({
  selector: 'wmts-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatDialogModule,
    FbButtonComponent,
    FbIconComponent,
    FbInputComponent,
    FbListComponent,
    FbListItemComponent,
    FbProgressBarComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-wmts">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading class="dialog-icon"
          ><fb-icon name="public" ariaLabel=""></fb-icon
        ></span>
        <span fbToolbarTitle>Add WMTS Source</span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Close"
            (pressed)="dialogRef.close()"
          >
            <fb-icon name="close" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>
      <mat-dialog-content>
        <label for="wmts-host" class="block font-semibold"> WMTS host. </label>
        <div class="flex items-center" style="gap: var(--space-sm)">
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
        <div
          style="font-size: var(--font-size-xs); color: var(--color-text-muted)"
        >
          Enter url of the WMTS host.
        </div>
        @if (!hostUrl) {
          <div class="error-xs">WMTS host is required!</div>
        }

        @if (isFetching) {
          <fb-progress-bar indeterminate></fb-progress-bar>
        } @else {
          @if (errorMsg) {
            <div style="color: var(--color-error)">
              Error retrieving capabilities from server!
            </div>
          } @else {
            <div>
              @if (wmtsLayers.length > 0) {
                <div style="height: 200px;overflow-x: hidden;overflow-y: auto;">
                  <fb-list density="compact">
                    @for (layer of wmtsLayers; track layer; let idx = $index) {
                      <fb-list-item
                        interactive
                        [selected]="selections[0] === idx"
                        (activated)="selectLayer(idx)"
                      >
                        {{ layer.name }}
                        <span fbListItemSubtext>{{ layer.description }}</span>
                      </fb-list-item>
                    }
                  </fb-list>
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

  selectLayer(idx: number) {
    this.selections = [idx];
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
