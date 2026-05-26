import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';

import { Feature } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import { Style, Stroke, Fill, Text } from 'ol/style';
import { Polygon, Point } from 'ol/geom';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBCharts } from 'src/app/types';

// ** Show Chart bounds on map **
@Component({
  selector: 'ol-map > fb-chart-bounds',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ChartBoundsLayerComponent extends FBFeatureLayerComponent {
  @Input() charts: FBCharts = [];

  private boundStyles = ['red', 'magenta', 'blue', 'purple', 'green'];

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.parseChartBounds(this.charts);
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source && 'charts' in changes) {
      this.source.clear();
      this.parseChartBounds(changes['charts'].currentValue);
    }
  }

  parseChartBounds(charts: FBCharts = this.charts) {
    const fa: Feature[] = [];
    let i = 0;

    // backdrop
    fa.push(this.buildBackdrop());

    // chart bounds
    for (const c of charts) {
      const coords = this.parseBoundsCoordinates(c[1].bounds);
      if (coords.length === 0) continue;
      const ring = coords[0];
      if (!ring || ring.length < 2) continue;
      const p0 = ring[0];
      const p1 = ring[1];
      if (!p0 || !p1) continue;
      // rectangle
      const f = new Feature({
        geometry: new Polygon(coords),
        name: c[1].name
      });
      f.setId('chart-bound.' + c[0]);
      const p0x = p0[0] ?? 0;
      const p0y = p0[1] ?? 0;
      const p1x = p1[0] ?? 0;
      const p1y = p1[1] ?? 0;
      const lp = [p0x + (p0x > p1x ? p0x - p1x : p1x - p0x) / 2, p1y];
      void p0y;
      f.set('labelPos', lp);
      f.set('boundColor', this.boundStyles[i]);
      f.setStyle(this.buildStyle);
      fa.push(f);
      i++;
      i = i === this.boundStyles.length ? 0 : i;
    }
    this.source.addFeatures(fa);
  }

  buildBackdrop() {
    const f = new Feature({
      geometry: new Polygon([
        fromLonLatArray([
          [-180, -90],
          [-180, 90],
          [180, 90],
          [180, -90],
          [-180, -90]
        ])
      ]),
      name: ''
    });
    f.setId('chart-backdrop');
    f.setStyle(
      new Style({
        fill: new Fill({
          color: 'rgba(255,255,255,0.4)'
        })
      })
    );
    return f;
  }

  buildStyle(feature: FeatureLike): Style[] {
    return [
      new Style({
        stroke: new Stroke({
          color: feature.get('boundColor'),
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(255,255,255,0.1 )'
        })
      }),
      new Style({
        geometry: new Point(feature.get('labelPos')),
        text: new Text({
          text: feature.get('name'),
          overflow: true,
          offsetX: 0,
          offsetY: -10,
          fill: new Fill({
            color: feature.get('boundColor')
          }),
          justify: 'left',
          textBaseline: 'top'
        })
      })
    ];
  }

  // mapify and transform bounds to polygon
  parseBoundsCoordinates(bounds: number[]) {
    if (!Array.isArray(bounds) || bounds.length !== 4) return [];
    const [minLon, minLat, maxLon, maxLat] = bounds as [
      number,
      number,
      number,
      number
    ];
    if (minLon === -180 && minLat === -90 && maxLon === 180 && maxLat === 90) {
      return [];
    }
    const rect = mapifyCoords(
      [
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat]
      ],
      0
    );
    return [fromLonLatArray(rect)];
  }
}
