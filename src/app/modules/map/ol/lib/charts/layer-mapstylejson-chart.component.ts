import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  OnDestroy
} from '@angular/core';

import LayerGroup from 'ol/layer/Group';

import { MapComponent } from '../map.component';

import { FBChart } from 'src/app/types';
import { extentFromBounds } from './chart-utils';
import { applyMapboxStyleToGroup } from './mapbox-style-utils';

@Component({
  selector: 'ol-map > fb-mapstylejson-chart',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class MapStyleJsonChartLayerComponent implements OnDestroy {
  protected chart = input<FBChart>();
  protected zIndex = input<number>();

  private layer?: LayerGroup;
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
      this.layer = new LayerGroup({
        zIndex: this.zIndex()
      });
      this.layer.set('id', chart[0]);
      this.layer.set('chartId', chart[0]);
      this.layer.set('chartType', chart[1].type);
      this.layer.set('chartFormat', chart[1].format);
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      this.layer.setExtent(extentFromBounds(chart[1].bounds));
      void applyMapboxStyleToGroup(this.layer, chart[1].url);
      map.addLayer(this.layer);
    } else {
      this.layer.setZIndex(this.zIndex() ?? 0);
      this.layer.setOpacity(chart[1].defaultOpacity ?? 1);
      this.layer.setExtent(extentFromBounds(chart[1].bounds));
    }
    map.render();
  }
}
