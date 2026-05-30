import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, RegularShape } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { AsyncSubject } from 'rxjs';
import { GeoUtils } from 'src/app/lib/geoutils';
import { Position } from 'src/app/types';

// Shared blue triangle fill + stroke for direction-of-travel dots.
const DOT_FILL = new Fill({ color: 'blue' });
const DOT_STROKE = new Stroke({ color: 'white', width: 1 });

// ** Open Binnacle direction of travel component **
@Component({
  selector: 'ol-map > fb-route-direction',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class DirectionOfTravelComponent
  implements OnInit, OnDestroy, OnChanges
{
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() points: Coordinate[] = [];
  @Input() reverse = false;
  @Input() pointIndex = 0;
  @Input() mapZoom = 10;
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: Record<string, any>;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.parseValues();
    this.source = new VectorSource({ features: this.features });
    this.layer = new VectorLayer(
      Object.assign(this, { ...this.layerProperties })
    );

    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.addLayer(this.layer);
      map.render();
      this.layerReady.next(this.layer);
      this.layerReady.complete();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    const layer = this.layer;
    if (layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: Record<string, any> = {};

      for (const key in changes) {
        const change = changes[key];
        if (!change) continue;
        if (key === 'points' || key === 'reverse' || key === 'pointIndex') {
          this.parseValues();
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key === 'layerProperties') {
          layer.setProperties(properties, false);
        } else if (key !== 'mapZoom') {
          properties[key] = change.currentValue;
        }
      }
      layer.setProperties(properties, false);
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
  }

  parseValues() {
    const fa: Feature[] = [];
    const pts = this.points;
    if (pts && pts.length !== 0) {
      const addArrow = (idx: number) => {
        const pctr = GeoUtils.geographicCenter(
          pts.slice(idx, idx + 2) as Position[]
        );
        const f = new Feature({
          geometry: new Point(fromLonLat(pctr as [number, number]))
        });
        f.setId(`dot.${idx}`);
        f.setStyle(this.buildStyle(idx));
        fa.push(f);
      };
      if (pts.length < 4) {
        addArrow(0);
      } else {
        for (let idx = 1; idx < pts.length - 2; idx += 2) {
          addArrow(idx);
        }
      }
    }
    this.features = fa;
  }

  // build target style
  buildStyle(index: number): Style {
    return new Style({
      image: new RegularShape({
        points: 3,
        radius: 7,
        fill: DOT_FILL,
        stroke: DOT_STROKE,
        rotateWithView: true,
        rotation: this.getOrientation(index)
      })
    });
  }

  getOrientation(idx: number) {
    const a = this.points[idx]! as Position;
    const b = this.points[idx + 1]! as Position;
    const o = this.reverse
      ? GeoUtils.rhumbLineBearing(b, a)
      : GeoUtils.rhumbLineBearing(a, b);
    return (Math.PI / 180) * o;
  }
}
