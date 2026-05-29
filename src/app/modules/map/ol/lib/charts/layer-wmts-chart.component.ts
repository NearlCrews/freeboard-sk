import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  OnDestroy
} from '@angular/core';

import TileLayer from 'ol/layer/Tile';

import { MapComponent } from '../map.component';

import { FBChart } from 'src/app/types';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';

import { extentFromBounds, resolveLayerMaxZoom } from './chart-utils';
import { WmtsCapabilitiesService } from './wmts-capabilities.service';
import { createAbortableRasterTileLoader } from './tile-loader-abort';
import { RASTER_TILE_CACHE_SIZE } from './tile-source.constants';

// ** Open Binnacle WMTS Chart **
@Component({
  selector: 'ol-map > fb-wmts-chart',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class WmtsChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();
  protected overZoomTiles = input<boolean>(true);
  protected mapMaxZoom = input<number>();

  private layer?: TileLayer;
  private capabilities?: unknown;
  private changeDetectorRef = inject(ChangeDetectorRef);
  private mapComponent = inject(MapComponent);
  private wmtsCache = inject(WmtsCapabilitiesService);

  constructor() {
    this.changeDetectorRef.detach();
    effect(() => {
      this.chart();
      this.zIndex();
      this.overZoomTiles();
      this.mapMaxZoom();
      this.parseChart();
    });
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
    }
  }

  private async parseChart() {
    const chart = this.chart();
    const map = this.mapComponent.getMap();
    if (!chart || !map) {
      return;
    }

    if (!this.capabilities) {
      try {
        const url = `${chart[1].url}`;
        this.capabilities = await this.wmtsCache.getCapabilities(url);
      } catch (err) {
        console.warn(err);
        return;
      }
    }
    const layerName = chart[1].layers[0];
    if (!layerName) {
      return;
    }
    const options = optionsFromCapabilities(this.capabilities, {
      layer: layerName,
      matrixSet: 'EPSG:3857'
    });
    if (!options) {
      return;
    }

    if (!this.layer) {
      const minZ =
        chart[1].minZoom && chart[1].minZoom >= 0.1
          ? chart[1].minZoom - 0.1
          : chart[1].minZoom;
      const maxZ = chart[1].maxZoom;
      const layerMaxZ = resolveLayerMaxZoom(
        maxZ,
        this.mapMaxZoom(),
        this.overZoomTiles()
      );

      this.layer = new TileLayer({
        source: new WMTS({
          ...options,
          tileLoadFunction: createAbortableRasterTileLoader(),
          cacheSize: RASTER_TILE_CACHE_SIZE
        }),
        preload: 0,
        zIndex: this.zIndex(),
        minZoom: minZ,
        maxZoom: layerMaxZ,
        opacity: chart[1].defaultOpacity ?? 1,
        extent: extentFromBounds(chart[1].bounds)
      });

      this.layer.set('id', chart[0]);
      this.layer.set('chartId', chart[0]);
      this.layer.set('chartType', chart[1].type);
      this.layer.set('chartFormat', chart[1].format);
      map.addLayer(this.layer);
    } else {
      const minZ =
        chart[1].minZoom && chart[1].minZoom >= 0.1
          ? chart[1].minZoom - 0.1
          : chart[1].minZoom;
      const maxZ = chart[1].maxZoom;
      const layerMaxZ = resolveLayerMaxZoom(
        maxZ,
        this.mapMaxZoom(),
        this.overZoomTiles()
      );
      this.layer.setZIndex(this.zIndex() ?? 0);
      this.layer.setMinZoom(minZ);
      this.layer.setMaxZoom(layerMaxZ ?? Infinity);
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      this.layer.setExtent(extentFromBounds(chart[1].bounds));
    }
    map.render();
  }
}
