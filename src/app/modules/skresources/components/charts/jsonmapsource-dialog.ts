import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import type { ChartProvider } from 'src/app/types';
import type { HttpErrorResponse } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';

interface MapboxStyle {
  version: string;
  name?: string;
  sources: Record<
    string,
    {
      type: string;
      url: string;
    }
  >[];
  layers: {
    id: string;
    source: string;
    'source-layer': string;
  }[];
}

interface TileJson {
  tilejson: string;
  name: string;
  description: string;
  vector_layers?: {
    id: string;
    description: string;
  }[];
  maxzoom: number;
  minzoom: number;
  bounds: [number, number, number, number];
  id: string;
}

@Component({
  selector: 'json-mapsource-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbDialogActionsDirective,
    FbDialogContentDirective,
    FbIconComponent,
    FbInputComponent,
    FbProgressBarComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-mapbox">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarLeading class="dialog-icon"
          ><fb-icon name="public" ariaLabel=""></fb-icon
        ></span>
        <span fbToolbarTitle>Add JSON Map Source</span>
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
      <div fbDialogContent>
        <label for="json-mapsource-host" class="block font-semibold">
          Map Server host.
        </label>
        <div class="flex items-center" style="gap: var(--space-sm)">
          <fb-input
            name="json-mapsource-host"
            type="text"
            [(value)]="hostUrl"
            [invalid]="!hostUrl"
            ariaLabel="Map server host URL"
          ></fb-input>
          <fb-button
            variant="ghost"
            size="sm"
            ariaLabel="Fetch JSON"
            [disabled]="hostUrl.length === 0"
            (pressed)="getJsonFile(hostUrl)"
          >
            <fb-icon name="arrow_forward" ariaLabel=""></fb-icon>
          </fb-button>
        </div>
        <div
          style="font-size:var(--font-size-xs); color: var(--color-text-muted)"
        >
          Enter url of the Map Server.
        </div>
        @if (!hostUrl) {
          <div class="error-xs">Map server host url is required!</div>
        }
        @if (isFetching) {
          <fb-progress-bar indeterminate></fb-progress-bar>
        } @else {
          @if (errorMsg) {
            <div style="color: var(--color-error)">
              Error retrieving data from server!
            </div>
          } @else {
            <div>
              @if (provider) {
                <br />
                <div style="height: 200px;overflow-x: hidden;overflow-y: auto;">
                  <div class="row">
                    <div class="label">Source:</div>
                    <div class="value">{{ details.type }}</div>
                  </div>
                  <div class="row">
                    <div class="label">Name:</div>
                    <div class="value">{{ details.name }}</div>
                  </div>
                  <div class="row">
                    <div class="label">Version:</div>
                    <div class="value">{{ details.version }}</div>
                  </div>
                  <div class="row">
                    <div class="label">Layers:</div>
                    <div class="value">
                      @for (l of details.layers; track l) {
                        <div>{{ l }}</div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
      @if (provider) {
        <div fbDialogActions align="end">
          <fb-button variant="primary" (pressed)="handleSave()">
            Save
          </fb-button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      ._ap-mapbox {
      }
      ._ap-mapbox .row {
        display: flex;
      }
      ._ap-mapbox .label {
        width: 70px;
        font-weight: 500;
      }
      ._ap-mapbox .value {
        flex: 1 1 auto;
      }
    `
  ]
})
export class JsonMapSourceDialog {
  protected isFetching = false;
  protected fetchError = false;
  protected errorMsg = '';
  protected hostUrl = '';
  protected provider: ChartProvider | undefined;
  protected details: {
    type: string;
    name: string;
    version: string;
    layers: string[];
  } = { type: '', name: '', version: '', layers: [] };

  protected app = inject(AppFacade);
  protected dialogRef = inject(DialogRef<unknown, JsonMapSourceDialog>);
  private http = inject(HttpClient);
  protected data = inject<SKChart>(DIALOG_DATA);
  private destroyRef = inject(DestroyRef);

  handleSave() {
    this.dialogRef.close([this.provider]);
  }

  /** Fetch the mapbox JSON file contents */
  getJsonFile(uri: string) {
    this.errorMsg = '';
    this.fetchError = false;
    this.isFetching = true;
    this.provider = undefined;
    this.details = { type: '', name: '', version: '', layers: [] };
    this.http
      .get<TileJson | MapboxStyle>(uri)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: TileJson | MapboxStyle) => {
          this.isFetching = false;
          if (!res.name) {
            this.errorMsg = 'Invalid response received!';
          } else {
            const c = this.parseFileContents(res, uri);
            if (c) {
              this.provider = c;
              const vectorLayers = (res as TileJson).vector_layers;
              this.details = {
                type: (res as TileJson).tilejson ? 'TileJSON' : 'Mapbox Style',
                name: res.name,
                version:
                  (res as MapboxStyle).version ?? (res as TileJson).tilejson,
                layers: (res as MapboxStyle).layers
                  ? (res as MapboxStyle).layers.map((l) => l.id)
                  : vectorLayers
                    ? vectorLayers.map((l) => l.id)
                    : []
              };
              this.dialogRef.close([this.provider]);
            } else {
              this.fetchError = true;
              this.errorMsg = 'Invalid file contents!';
            }
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isFetching = false;
          this.fetchError = true;
          this.errorMsg = err.message;
        }
      });
  }

  parseFileContents(
    json: TileJson | MapboxStyle,
    uri: string
  ): ChartProvider | undefined {
    if ('tilejson' in json) {
      return {
        name: json.name ?? '',
        description: json.description ?? '',
        type: 'tileJSON',
        url: uri,
        bounds: Array.isArray(json.bounds) ? json.bounds : [-180, -90, 180, 90],
        maxzoom: json.maxzoom ?? 24,
        minzoom: json.minzoom ?? 0,
        identifier: json.id ?? ''
      };
    } else if ('version' in json && 'sources' in json && 'layers' in json) {
      return {
        name: json.name ?? '',
        description: '',
        type: 'mapstyleJSON',
        url: uri
      };
    }
    return undefined;
  }
}
