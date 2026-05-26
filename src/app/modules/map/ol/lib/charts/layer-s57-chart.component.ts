import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  OnDestroy
} from '@angular/core';

import VectorTileLayer from 'ol/layer/VectorTile';

import { VectorLayerStyleFactory } from './vectorLayerStyleFactory';
import { MapComponent } from '../map.component';

import { FBChart } from 'src/app/types';
import { extentFromBounds } from './chart-utils';
import { applyMapboxStyle } from './mapbox-style-utils';

@Component({
  selector: 'ol-map > fb-s57-chart',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class S57ChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();

  private layer?: VectorTileLayer;
  private layerInitPending = false;
  private destroyed = false;
  private vectorLayerStyleFactory = inject(VectorLayerStyleFactory);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private mapComponent = inject(MapComponent);

  constructor() {
    this.changeDetectorRef.detach();
    effect(() => {
      this.chart();
      this.zIndex();
      this.parseChart();
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
    }
  }

  private parseChart() {
    const chart = this.chart();
    const map = this.mapComponent.getMap();
    if (!chart || !map) {
      return;
    }

    if (!this.layer) {
      // S57Style + xml2js are lazy chunks; guard against re-entry while the
      // chunks are in flight, then re-run parseChart so the else-branch picks
      // up any signal values that changed during async init.
      if (this.layerInitPending) {
        return;
      }
      this.layerInitPending = true;
      void this.vectorLayerStyleFactory
        .CreateVectorLayerStyler(chart[1])
        .then((styleFactory) => {
          this.layerInitPending = false;
          if (this.destroyed || this.layer) {
            return;
          }
          const layer = styleFactory.CreateLayer();
          styleFactory.ApplyStyle(layer as VectorTileLayer<never>);
          if (chart[1].style) {
            void applyMapboxStyle(layer, chart[1].style);
          }
          layer.set('id', chart[0]);
          layer.set('chartId', chart[0]);
          layer.set('chartType', chart[1].type);
          layer.set('chartFormat', chart[1].format);
          this.layer = layer;
          map.addLayer(layer);
          this.parseChart();
        });
      return;
    }
    this.layer.setZIndex(this.zIndex() ?? 0);
    this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
    this.layer.setExtent(extentFromBounds(chart[1].bounds));
    map.render();
  }
}
