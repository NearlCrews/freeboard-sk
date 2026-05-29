import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
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
import { Style, Stroke, Fill } from 'ol/style';
import { Circle, LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords, mapifyRadius } from '../util';
import { MapThemeService } from '../theme';
import { AsyncSubject } from 'rxjs';

// ** Open Binnacle Anchor Alarm component **
@Component({
  selector: 'ol-map > fb-anchor-alarm',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AnchorAlarmComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  protected radius = input<number>();
  protected anchorPosition = input<Coordinate>();
  protected vesselPosition = input<Coordinate>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() anchorStyles?: Record<string, any>;
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: Record<string, any>;

  protected mapifiedRadius = 0;
  protected mapifiedLine: Coordinate[] = [];

  private readonly theme = inject(MapThemeService);

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      this.radius();
      this.anchorPosition();
      this.vesselPosition();
      this.parseValues();
      if (this.source) {
        this.source.clear();
        this.source.addFeatures(this.features);
      }
    });
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
        if (key === 'layerProperties') {
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
    const radius = this.radius();
    const anchorPos = this.anchorPosition();
    const vesselPos = this.vesselPosition();
    if (!anchorPos || !vesselPos) {
      this.features = [];
      return;
    }
    this.mapifiedRadius = mapifyRadius(
      typeof radius === 'number' && radius < 0 ? 0 : radius,
      anchorPos
    );
    this.mapifiedLine = mapifyCoords([anchorPos, vesselPos]);
    const fa: Feature[] = [];
    const f = new Feature({
      geometry: new LineString(
        fromLonLatArray(this.mapifiedLine) as Coordinate[]
      )
    });
    f.setStyle(this.buildStyle('line'));
    fa.push(f);
    const fc = new Feature({
      geometry: new Circle(fromLonLat(anchorPos), this.mapifiedRadius)
    });
    fc.setStyle(this.buildStyle('circle'));
    fa.push(fc);
    const fp = new Feature({
      geometry: new Point(fromLonLat(anchorPos))
    });
    fp.setId('anchor');
    fp.setStyle(this.buildStyle('anchor'));
    fa.push(fp);
    this.features = fa;
  }

  // build target style
  buildStyle(key: string): Style {
    const styled = this.anchorStyles?.[key] as Style | undefined;
    if (styled) {
      return styled;
    }
    const lpStyle = this.layerProperties?.['style'] as Style | undefined;
    if (lpStyle) {
      return lpStyle;
    }
    // default style: 30% alpha overlay preserves original visibility under chart.
    const fillColor = `color-mix(in srgb, ${this.theme.palette().anchorOk} 30%, transparent)`;
    return new Style({
      stroke: new Stroke({
        width: 2,
        color: 'black',
        lineDash: [5, 5]
      }),
      fill: new Fill({
        color: fillColor
      })
    });
  }
}
