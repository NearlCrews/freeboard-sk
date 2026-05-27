import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

import {
  FbButtonComponent,
  FbIconComponent,
  FbInputComponent,
  FbProgressBarComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { ChartProvider } from 'src/app/types';
import { SKInfoLayer } from '../../custom-resource-classes';
import { LayerNode, wmsCapabilitiesInWorker } from './maplib';
import { NodeTreeSelect } from './node-tree-select';

/********* WMSDialog **********
	data: SKChart
***********************************/
@Component({
  selector: 'wms-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    MatIconModule,
    MatDialogModule,
    FbButtonComponent,
    FbIconComponent,
    FbInputComponent,
    FbProgressBarComponent,
    FbToolbarComponent,
    NodeTreeSelect
  ],
  template: `
    <div class="_ap-wms">
      <fb-toolbar style="background-color: transparent">
        <span fbToolbarLeading class="dialog-icon"
          ><mat-icon>public</mat-icon></span
        >
        <span fbToolbarTitle>Add WMS Source</span>
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
        <label for="wms-host" style="display:block; font-weight:600">
          WMS host.
        </label>
        <div style="display:flex; gap:6px; align-items:center">
          <fb-input
            name="wms-host"
            type="text"
            [(value)]="hostUrl"
            [invalid]="!hostUrl"
            ariaLabel="WMS host URL"
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
          Enter url of the WMS host.
        </div>
        @if (!hostUrl) {
          <div style="color: var(--color-error); font-size:12px">
            WMS host is required!
          </div>
        }

        @if (isFetching) {
          <fb-progress-bar indeterminate></fb-progress-bar>
        } @else {
          @if (errorMsg) {
            <div style="color: var(--color-error)">
              Error retrieving capabilities from server!
            </div>
          } @else {
            <node-tree-select
              [layers]="dataSource"
              (selected)="handleLayerSelection()"
            >
            </node-tree-select>
          }
        }
      </mat-dialog-content>
      @if (data.format !== 'chartprovider') {
        <mat-dialog-actions align="right">
          <fb-button
            variant="primary"
            [disabled]="this.selections.length === 0"
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
      ._ap-wms {
      }
      ._ap-wms .key-label {
        width: 150px;
        font-weight: 500;
      }
    `
  ]
})
export class WMSDialog {
  protected isFetching = false;
  protected fetchError = false;
  protected errorMsg = '';
  protected selections: string[] = [];
  protected wmsBase: ChartProvider | undefined;
  protected wmsSources: Record<string, ChartProvider | SKInfoLayer> = {};
  protected hostUrl = '';

  protected dataSource: LayerNode[] = [];

  protected app = inject(AppFacade);
  protected dialogRef = inject(MatDialogRef<WMSDialog>);
  protected data = inject<{ format: 'chartprovider' | 'infolayer' }>(
    MAT_DIALOG_DATA
  );

  constructor() {}
  /**
   * Handle layer selections and build WMS source objects
   */
  protected handleLayerSelection() {
    this.selections = [];
    this.wmsSources = {};
    this.dataSource.forEach((l: LayerNode) => {
      this.parseSelections(l);
    });
  }

  /**
   * Parse selections under the supplied layer node
   * @param node Parent layer
   */
  private parseSelections(node: LayerNode) {
    const selNode = (n: LayerNode) => {
      if (n.selected) {
        if (!this.selections.includes(n.name)) {
          this.selections.push(n.name);
          this.wmsSources[n.name] = this.buildSource(n);
        } else {
          const existing = this.wmsSources[n.name];
          if (existing && existing.description === existing.name) {
            existing.description = n.description;
          }
        }
      }
    };
    if (Array.isArray(node.children)) {
      node.children.forEach((c) => this.parseSelections(c));
    } else {
      selNode(node);
    }
  }

  /**
   *
   * @param l Build and return the WMS source object
   * @returns WMS source object
   */
  private buildSource(l: LayerNode): ChartProvider | SKInfoLayer {
    if (this.data.format === 'infolayer') {
      const s = new SKInfoLayer();
      s.name = l.name;
      s.description = l.description;
      s.values.layers = [l.name];
      s.values.time = l.time;
      s.values.url = this.wmsBase?.url ?? '';
      s.values.sourceType = 'WMS';
      return s;
    } else {
      const base = this.wmsBase;
      const s: ChartProvider = base
        ? {
            ...base,
            name: l.name,
            description: l.description,
            layers: [l.name]
          }
        : {
            name: l.name,
            description: l.description,
            type: 'WMS',
            url: '',
            layers: [l.name]
          };
      return s;
    }
  }

  /**
   * Close and return WMS objects
   */
  protected handleSave() {
    this.dialogRef.close(Object.values(this.wmsSources));
  }

  /**
   * Retrieve and process capabilities from WMS server
   * @param wmsHost WMS server host url (without parameters)
   */
  protected async getCapabilities(wmsHost: string) {
    if (this.data.format === 'chartprovider') {
      this.dialogRef.close([
        {
          name: 'New WMS Chart',
          description: '',
          type: 'WMS',
          url: wmsHost,
          layers: []
        }
      ]);
      return;
    }
    this.selections = [];
    this.errorMsg = '';
    try {
      this.isFetching = true;
      const capabilities = await wmsCapabilitiesInWorker(wmsHost);
      this.wmsBase = {
        name: capabilities?.name ?? '',
        description: capabilities?.description ?? '',
        type: 'WMS',
        url: wmsHost,
        layers: []
      };
      this.dataSource = capabilities.layers;
      this.isFetching = false;
    } catch (err) {
      this.isFetching = false;
      this.fetchError = true;
      this.errorMsg = err instanceof Error ? err.message : String(err);
    }
  }
}
