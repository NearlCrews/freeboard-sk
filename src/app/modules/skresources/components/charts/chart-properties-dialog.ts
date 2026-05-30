import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

import {
  FbButtonComponent,
  FbDialogActionsDirective,
  FbDialogContentDirective,
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
    FbButtonComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
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
      <fb-toolbar class="bg-transparent">
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
      <div fbDialogContent>
        <div class="flex flex-col">
          <div class="flex">
            <div class="key-label">Name:</div>
            <div class="flex-auto">
              <fb-input
                name="chart-name"
                type="text"
                [disabled]="!isEditable()"
                [(value)]="data.name"
                [invalid]="!data.name"
                ariaLabel="Chart name"
              ></fb-input>
              @if (!data.name) {
                <div class="error-xs">Please enter a name.</div>
              }
            </div>
          </div>
          <div class="flex">
            <div class="key-label">Description:</div>
            <div class="flex-auto">
              <fb-input
                name="chart-description"
                type="text"
                [disabled]="!isEditable()"
                [(value)]="data.description"
                ariaLabel="Chart description"
              ></fb-input>
            </div>
          </div>
          <div class="flex">
            <div class="key-label">Scale:</div>
            <div class="flex-auto">{{ data.scale }}</div>
          </div>
          @if (data.defaultOpacity) {
            <div class="flex">
              <div class="key-label">Opacity:</div>
              <div class="flex-auto">{{ data.defaultOpacity }}</div>
            </div>
          }
          <div class="flex">
            <div class="key-label">Zoom:</div>
            <div class="flex-auto">
              <div class="flex-auto">
                <u><i>Min: </i></u>
                {{ data.minZoom }},
                <u><i>Max: </i></u>
                {{ data.maxZoom }}
              </div>
            </div>
          </div>
          @if (data.bounds; as bounds) {
            <div class="flex">
              <div class="key-label">Bounds:</div>
              <div
                style="flex: 1 1 auto; border: var(--color-border) 1px solid;
                                  max-width: 220px;font-size: var(--font-size-sm);"
              >
                <div class="text-right">
                  <span
                    class="flex-auto"
                    [innerText]="bounds[3] ?? 0 | coords: 'HDd' : true"
                  >
                  </span
                  ><br />
                  <span
                    class="flex-auto"
                    [innerText]="bounds[2] ?? 0 | coords: 'HDd'"
                  >
                  </span>
                </div>
                <div>
                  <span
                    class="flex-auto"
                    [innerText]="bounds[1] ?? 0 | coords: 'HDd' : true"
                  >
                  </span
                  ><br />
                  <span
                    class="flex-auto"
                    [innerText]="bounds[0] ?? 0 | coords: 'HDd'"
                  >
                  </span>
                </div>
              </div>
            </div>
          }
          <div class="flex">
            <div class="key-label">Format:</div>
            <div class="flex-auto">{{ data.format }}</div>
          </div>
          <div class="flex">
            <div class="key-label">Type:</div>
            <div class="flex-auto">
              {{ data.type }}
            </div>
          </div>
          <div class="flex">
            <div class="key-label">URL:</div>
            <div style="flex: 1 1 auto;overflow-x: auto;">
              {{ data.url }}
            </div>
          </div>
          @if (data.style) {
            <div class="flex">
              <div class="key-label">Style:</div>
              <div style="flex: 1 1 auto;overflow-x: auto;">
                {{ data.style }}
              </div>
            </div>
          }
          @if (data.source) {
            <div class="flex">
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
              <div class="flex-auto">
                @if (capabilitiesResource.isLoading()) {
                  <fb-progress-bar indeterminate></fb-progress-bar>
                } @else {
                  @if (layerErrorText.length) {
                    <div class="flex">
                      <div class="key-label"></div>
                      <div class="flex-auto">
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
            <div class="flex">
              <div class="key-label">Layers:</div>
              <div class="flex-auto">
                {{ data.layers }}
              </div>
            </div>
          }
        </div>
      </div>
      @if (isEditable()) {
        <div fbDialogActions align="end">
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
        </div>
      }
    </div>
  `,
  styles: [
    `
      ._ap-chartinfo {
        font-family: arial;
        min-width: 300px;
      }

      ._ap-chartinfo .key-label {
        width: 150px;
        font-weight: 500;
      }
    `
  ]
})
export class ChartPropertiesDialog implements OnInit {
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
  protected dialogRef = inject(DialogRef<unknown, ChartPropertiesDialog>);
  protected data = inject<SKChart>(DIALOG_DATA);

  constructor() {
    if (this.data.source?.toLowerCase() === 'resources-provider') {
      this.isEditable.set(true);
    }
  }

  ngOnInit() {
    if (['wms', 'wmts'].includes(this.data.type?.toLowerCase())) {
      this.capabilitiesParam.set({
        url: this.data.url,
        type: this.data.type.toLowerCase()
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
        this.wmsLayers.set(this.capabilities.layers as LayerNode[]);
      } else if (chartType === 'wmts') {
        this.capabilities = await wmtsCapabilitiesInWorker(url);
        this.wmtsLayers.set(this.capabilities.layers);
      }
    } catch {
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
