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
import { Style } from 'ol/style';
import { LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { AsyncSubject } from 'rxjs';
import { Position } from 'src/app/types';

// ** Open Binnacle Beat Angle component **
@Component({
  selector: 'ol-map > fb-target-angle',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class TargetAngleComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() line?: Coordinate[];
  @Input() mapZoom = 10;
  @Input() lineStyle?: Style;
  @Input() position?: Position; // (change trigger)
  @Input() twd?: number; //(change trigger)
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: Record<string, any>;

  public mapifiedLine: Coordinate[] = [];

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
        if (['lines', 'position', 'twd'].includes(key)) {
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

    if (Array.isArray(this.line)) {
      const mapifiedLine = mapifyCoords(this.line);
      const f = new Feature({
        geometry: new LineString(fromLonLatArray(mapifiedLine))
      });
      f.setStyle(this.buildStyle());
      fa.push(f);
    }
    this.features = fa;
  }

  // build target style
  buildStyle(): Style | undefined {
    if (this.lineStyle) {
      return this.lineStyle;
    } else {
      if (this.layerProperties?.['style']) {
        return this.layerProperties['style'] as Style;
      } else {
        return undefined;
      }
    }
  }
}
