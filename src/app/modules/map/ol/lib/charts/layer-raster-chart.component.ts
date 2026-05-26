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
import WebGLTileLayer from 'ol/layer/WebGLTile';
import { XYZ } from 'ol/source';

import { initPMTilesXYZLayer } from './pmtiles-utils';
import { osmLayer } from '../util';
import { MapComponent } from '../map.component';
import { extentFromBounds, resolveLayerMaxZoom } from './chart-utils';
import { createAbortableRasterTileLoader } from './tile-loader-abort';
import { RASTER_TILE_CACHE_SIZE } from './tile-source.constants';

import { FBChart } from 'src/app/types';

@Component({
  selector: 'ol-map > fb-tilelayer-raster',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RasterChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();
  protected overZoomTiles = input<boolean>(true);
  protected mapMaxZoom = input<number>();

  private layer: TileLayer | WebGLTileLayer;
  private layerInitPending = false;
  private destroyed = false;
  private changeDetectorRef = inject(ChangeDetectorRef);
  private mapComponent = inject(MapComponent);

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
    this.destroyed = true;
    const map = this.mapComponent.getMap();
    if (this.layer) {
      map.removeLayer(this.layer);
      map.render();
    }
  }

  private finalizeNewLayer(chart: FBChart, minZ: number, layerMaxZ: number) {
    const map = this.mapComponent.getMap();
    this.layer.setMinZoom(minZ);
    this.layer.setMaxZoom(layerMaxZ);
    this.layer.setExtent(extentFromBounds(chart[1].bounds));
    this.layer.set('id', chart[0]);
    this.layer.set('chartId', chart[0]);
    this.layer.set('chartType', chart[1].type);
    this.layer.set('chartFormat', chart[1].format);
    map.addLayer(this.layer);
  }

  private parseChart(chart: FBChart = this.chart()) {
    const map = this.mapComponent.getMap();
    if (!map) {
      return;
    }

    if (!this.layer) {
      const maxZ = chart[1].maxZoom;
      const layerMaxZ = resolveLayerMaxZoom(
        maxZ,
        this.mapMaxZoom(),
        this.overZoomTiles()
      );

      if (chart[0] === 'openstreetmap') {
        this.layer = osmLayer();
        this.layer.setZIndex(this.zIndex());
        this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
        this.finalizeNewLayer(chart, chart[1].minZoom, layerMaxZ);
      } else {
        const minZ =
          chart[1].minZoom && chart[1].minZoom >= 0.1
            ? chart[1].minZoom - 0.1
            : chart[1].minZoom;

        if (chart[1].url.includes('.pmtiles')) {
          // pmtiles is lazy-loaded; guard against re-entry while the chunk
          // is in flight, then re-run parseChart so the else-branch picks
          // up any signal values that changed during async init.
          if (this.layerInitPending) {
            return;
          }
          this.layerInitPending = true;
          void initPMTilesXYZLayer(chart[1], this.zIndex()).then((layer) => {
            this.layerInitPending = false;
            if (this.destroyed || this.layer) {
              return;
            }
            this.layer = layer;
            this.finalizeNewLayer(chart, minZ, layerMaxZ);
            this.parseChart();
          });
          return;
        }

        this.layer = new TileLayer({
          source: new XYZ({
            url: chart[1].url,
            maxZoom: maxZ,
            tileLoadFunction: createAbortableRasterTileLoader(),
            cacheSize: RASTER_TILE_CACHE_SIZE
          }),
          preload: 0,
          zIndex: this.zIndex(),
          minZoom: minZ,
          maxZoom: layerMaxZ,
          opacity: chart[1].defaultOpacity ?? 1
        });
        this.finalizeNewLayer(chart, minZ, layerMaxZ);
      }
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
      this.layer.setZIndex(this.zIndex());
      this.layer.setMinZoom(minZ);
      this.layer.setMaxZoom(layerMaxZ);
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      this.layer.setExtent(extentFromBounds(chart[1].bounds));
    }
    map.render();
  }
}
