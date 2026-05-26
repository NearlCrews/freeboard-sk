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
import { Extent } from '../models';
import { AsyncSubject } from 'rxjs';
import { AlertData } from 'src/app/modules/alarms';

// ** Freeboard Notification Alarm component **
@Component({
  selector: 'ol-map > fb-alarms',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AlarmComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed
  @Input() alarms: [string, AlertData][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() alarmStyles?: Record<string, any>;
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
        if (key === 'alarms') {
          this.parseValues();
          if (this.source) {
            this.source.clear();
            this.source.addFeatures(this.features);
          }
        } else if (key === 'layerProperties') {
          layer.setProperties(properties, false);
        } else {
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
    this.alarms.forEach((alarm: [string, AlertData]) => {
      const data = alarm?.[1];
      const position = data?.properties?.['position'] as
        | { longitude: number; latitude: number }
        | undefined;
      if (!data || !position) return;
      const type = data.type ?? '';
      const fp = new Feature({
        geometry: new Point(fromLonLat([position.longitude, position.latitude]))
      });
      fp.setStyle(this.buildStyle(type));
      fp.setId(`alarm.${data.path}`);
      fp.set('type', type);
      fa.push(fp);
    });
    this.features = fa;
  }

  // build target style
  buildStyle(key: string): Style {
    const styled = this.alarmStyles?.[key] as Style | undefined;
    if (styled) {
      return styled;
    }
    const lpStyle = this.layerProperties?.['style'] as Style | undefined;
    if (lpStyle) {
      return lpStyle;
    }
    // default style
    return new Style({
      image: new RegularShape({
        points: 3,
        radius: 7,
        fill: new Fill({ color: 'red' }),
        stroke: new Stroke({
          color: 'white',
          width: 2
        }),
        rotateWithView: false
      })
    });
  }
}
