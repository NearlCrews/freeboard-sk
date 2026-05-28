import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  FbProgressBarComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import type { SKChart } from 'src/app/modules/skresources/resource-classes';
import { CoordsPipe } from 'src/app/lib/pipes';
import type {
  LayerNode,
  WMSCapabilitiesDef,
  WMTSCapabilitiesDef,
  WMTSLayerDef
} from './maplib';
import { wmsCapabilitiesInWorker, wmtsCapabilitiesInWorker } from './maplib';
import { NodeTreeSelect } from './node-tree-select';
import { NodeListSelect } from './node-list-select';

@Component({
  selector: 'ap-chartproperties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatTooltipModule,
    MatDialogModule,
    FbButtonComponent,
    FbIconComponent,
    FbInputComponent,
    FbProgressBarComponent,
    FbToolbarComponent,
    CoordsPipe,
    NodeTreeSelect,
    NodeListSelect
  ],
  template: `
    <div class="_ap-chartinfo">
      <fb-toolbar style="background-color: transparent">
        <span fbToolbarLeading class="dialog-icon"
          ><fb-icon [name]="isLocal(data.url)" ariaLabel=""></fb-icon
        ></span>
        <span fbToolbarTitle>Chart Properties</span>
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
        <div style="display:flex;flex-direction: column;">
          <div style="display:flex;">
            <div class="key-label">Name:</div>
            <div style="flex: 1 1 auto;">
              <fb-input
                name="chart-name"
                type="text"
                [disabled]="!isEditable()"
                [(value)]="data.name"
                [invalid]="!data.name"
                ariaLabel="Chart name"
              ></fb-input>
              @if (!data.name) {
                <div
                  style="color: var(--color-error); font-size: var(--font-size-xs)"
                >
                  Please enter a name.
                </div>
              }
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Description:</div>
            <div style="flex: 1 1 auto;">
              <fb-input
                name="chart-description"
                type="text"
                [disabled]="!isEditable()"
                [(value)]="data.description"
                ariaLabel="Chart description"
              ></fb-input>
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Scale:</div>
            <div style="flex: 1 1 auto;">{{ data.scale }}</div>
          </div>
          @if (data.defaultOpacity) {
            <div style="display:flex;">
              <div class="key-label">Opacity:</div>
              <div style="flex: 1 1 auto;">{{ data.defaultOpacity }}</div>
            </div>
          }
          <div style="display:flex;">
            <div class="key-label">Zoom:</div>
            <div style="flex: 1 1 auto;">
              <div style="flex: 1 1 auto;">
                <u><i>Min: </i></u>
                {{ data.minZoom }},
                <u><i>Max: </i></u>
                {{ data.maxZoom }}
              </div>
            </div>
          </div>
          @if (data.bounds; as bounds) {
            <div style="display:flex;">
              <div class="key-label">Bounds:</div>
              <div
                style="flex: 1 1 auto; border: var(--color-border) 1px solid;
                                  max-width: 220px;font-size: var(--font-size-sm);"
              >
                <div style="text-align:right;">
                  <span
                    style="flex: 1 1 auto;"
                    [innerText]="bounds[3] ?? 0 | coords: 'HDd' : true"
                  >
                  </span
                  ><br />
                  <span
                    style="flex: 1 1 auto;"
                    [innerText]="bounds[2] ?? 0 | coords: 'HDd'"
                  >
                  </span>
                </div>
                <div>
                  <span
                    style="flex: 1 1 auto;"
                    [innerText]="bounds[1] ?? 0 | coords: 'HDd' : true"
                  >
                  </span
                  ><br />
                  <span
                    style="flex: 1 1 auto;"
                    [innerText]="bounds[0] ?? 0 | coords: 'HDd'"
                  >
                  </span>
                </div>
              </div>
            </div>
          }
          <div style="display:flex;">
            <div class="key-label">Format:</div>
            <div style="flex: 1 1 auto;">{{ data.format }}</div>
          </div>
          <div style="display:flex;">
            <div class="key-label">Type:</div>
            <div style="flex: 1 1 auto;">
              {{ data.type }}
            </div>
          </div>
          <div style="display:flex;">
            <div class="key-label">URL:</div>
            <div style="flex: 1 1 auto;overflow-x: auto;">
              {{ data.url }}
            </div>
          </div>
          @if (data.style) {
            <div style="display:flex;">
              <div class="key-label">Style:</div>
              <div style="flex: 1 1 auto;overflow-x: auto;">
                {{ data.style }}
              </div>
            </div>
          }
          @if (data.source) {
            <div style="display:flex;">
              <div class="key-label">Source:</div>
              <div style="flex: 1 1 auto;overflow-x: auto;">
                {{ data.source }}
              </div>
            </div>
          }
          @if (
            isEditable() && ['wms', 'wmts'].includes(data.type.toLowerCase())
          ) {
            <div style="">
              <div class="key-label">Layers:</div>
              <div style="flex: 1 1 auto;">
                @if (capabilitiesResource.isLoading()) {
                  <fb-progress-bar indeterminate></fb-progress-bar>
                } @else {
                  @if (layerErrorText.length) {
                    <div style="display:flex;">
                      <div class="key-label"></div>
                      <div style="flex: 1 1 auto;">
                        {{ data.layers }}
                      </div>
                    </div>
                  } @else if (data.type.toLowerCase() === 'wms') {
                    <node-tree-select
                      [layers]="wmsLayers()"
                      [preSelect]="data.layers"
                      [expand]="true"
                      (selected)="handleLayerSelection($event)"
                    >
                    </node-tree-select>
                  } @else if (data.type.toLowerCase() === 'wmts') {
                    <node-list-select
                      [layers]="wmtsLayers()"
                      [preSelect]="data.layers"
                      (selected)="handleLayerSelection($event)"
                    >
                    </node-list-select>
                  }
                }
              </div>
            </div>
          } @else if (data.layers.length) {
            <div style="display:flex;">
              <div class="key-label">Layers:</div>
              <div style="flex: 1 1 auto;">
                {{ data.layers }}
              </div>
            </div>
          }
        </div>
      </mat-dialog-content>
      @if (isEditable()) {
        <mat-dialog-actions align="right">
          <fb-button
            variant="primary"
            [disabled]="
              !data.name ||
              (['wms', 'wmts'].includes(data.type.toLowerCase()) &&
                data.layers.length === 0)
            "
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
      ._ap-chartinfo {
        font-family: arial;
        min-width: 300px;
      }
      .ap-confirm-icon {
        min-width: 35px;
        max-width: 35px;
        color: darkorange;
        text-align: left;
      }

      ._ap-chartinfo .key-label {
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
export class ChartPropertiesDialog implements OnInit {
  protected icon = '';
  protected wmsLayers = signal<LayerNode[]>([]);
  protected wmtsLayers = signal<
    {
      name: string;
      description: string;
      format?: string;
      bounds?: [number, number, number, number];
    }[]
  >([]);
  protected isEditable = signal<boolean>(false);
  protected layerErrorText = '';
  private capabilities!: WMTSCapabilitiesDef | WMSCapabilitiesDef;

  protected capabilitiesParam = signal<{ url: string; type: string }>({
    url: '',
    type: ''
  });

  protected capabilitiesResource = resource({
    params: () => this.capabilitiesParam(),
    loader: ({ params }) => this.fetchCapabilities(params.url, params.type)
  });

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<ChartPropertiesDialog>);
  protected data = inject<SKChart>(MAT_DIALOG_DATA);

  constructor() {
    if (this.data.source?.toLowerCase() === 'resources-provider') {
      this.isEditable.set(true);
    }
  }

  ngOnInit() {
    if (['wms', 'wmts'].includes(this.data.type?.toLowerCase())) {
      this.capabilitiesParam.update(() => {
        return {
          url: this.data.url,
          type: this.data.type.toLowerCase()
        };
      });
    }
  }

  isLocal(url: string) {
    return url && url.includes('signalk') ? 'map' : 'language';
  }

  /**
   * Fetch capabilities from map server
   * @param url Chart url
   * @param chartType wms | wmts
   */
  private async fetchCapabilities(url: string, chartType: string) {
    if (!url) return;
    try {
      if (chartType === 'wms') {
        this.capabilities = await wmsCapabilitiesInWorker(url);
        this.wmsLayers.update(() => this.capabilities.layers as LayerNode[]);
      } else if (chartType === 'wmts') {
        this.capabilities = await wmtsCapabilitiesInWorker(url);
        this.wmtsLayers.update(() => this.capabilities.layers);
      }
    } catch (err) {
      this.layerErrorText = 'Error retrieving layers.';
    }
  }

  protected handleLayerSelection(e: string[]) {
    if (this.data.type?.toLowerCase() === 'wmts') {
      const l = (this.capabilities.layers as WMTSLayerDef[]).find(
        (i: WMTSLayerDef) => i.id === e[0]
      );
      if (l) {
        if (l.format) this.data.format = l.format;
        if (l.bounds) this.data.bounds = l.bounds;
      }
    }
    this.data.layers = e;
  }

  protected handleClose(save: boolean) {
    this.dialogRef.close({
      save: save,
      chart: this.data
    });
  }
}
