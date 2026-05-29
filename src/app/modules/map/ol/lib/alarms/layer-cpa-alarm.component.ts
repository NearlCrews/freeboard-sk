import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
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
import { Style, Stroke, Fill, Circle } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { MapThemeService } from '../theme';
import { AsyncSubject } from 'rxjs';

// ** Open Binnacle CPA Alarm component **
@Component({
  selector: 'ol-map > fb-cpa-alarms',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class CPAAlarmComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() cpaLines: Coordinate[][] = [];
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: Record<string, any>;

  private readonly mapTheme = inject(MapThemeService);

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
        if (key === 'cpaLines') {
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
    if (!Array.isArray(this.cpaLines)) {
      return;
    }
    const fa: Feature[] = [];
    this.cpaLines.forEach((cpaLine) => {
      const mapifiedLine = mapifyCoords(cpaLine);
      const head = mapifiedLine[0];
      if (!head) return;
      const f = new Feature({
        geometry: new LineString(fromLonLatArray(mapifiedLine) as Coordinate[])
      });
      f.setStyle(this.buildStyle());
      fa.push(f);
      const fp = new Feature({
        geometry: new Point(fromLonLat(head))
      });
      fp.setStyle(this.buildStyle());
      fa.push(fp);
    });
    this.features = fa;
  }

  // build target style
  buildStyle(): Style {
    let cs: Style;
    const lpStyle = this.layerProperties?.['style'] as Style | undefined;
    if (lpStyle) {
      cs = lpStyle;
    } else {
      const palette = this.mapTheme.palette();
      cs = new Style({
        image: new Circle({
          radius: 10,
          stroke: new Stroke({
            width: 2,
            color: palette.cpaAlarm,
            lineDash: [2, 3]
          }),
          fill: new Fill({
            color: palette.cpaAlarmFill
          })
        }),
        stroke: new Stroke({
          width: 2,
          color: palette.cpaAlarm,
          lineDash: [2, 3]
        }),
        fill: new Fill({
          color: palette.cpaAlarmFill
        })
      });
    }
    return cs;
  }
}
