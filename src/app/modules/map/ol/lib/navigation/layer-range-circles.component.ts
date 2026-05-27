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
import { Style, Stroke, Fill, Text } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { MapThemeService } from '../theme';
import { AsyncSubject } from 'rxjs';
import { Convert, TARGET_UNIT } from '../../../../../lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
import { DarkTheme } from '../themes';
import { circular } from 'ol/geom/Polygon';

// Resolution -> circle range (meters) buckets, ordered high to low. The first
// entry whose resolution threshold is exceeded wins. Hoisted from a 12-deep
// nested ternary in parseValues() so the table is shared instead of
// re-parsed each render.
const RESOLUTION_RANGE_BUCKETS: readonly (readonly [number, number])[] = [
  [5000, 150000],
  [2000, 75000],
  [1500, 25000],
  [1000, 20000],
  [600, 15000],
  [300, 10000],
  [100, 5000],
  [40, 2000],
  [20, 1000],
  [10, 500]
];
const RANGE_MIN = 250;

function rangeForResolution(resolution: number): number {
  for (const [threshold, range] of RESOLUTION_RANGE_BUCKETS) {
    if (resolution > threshold) {
      return range;
    }
  }
  return RANGE_MIN;
}

// Transparent fills/strokes for the per-circle text feature: the canvas needs
// a no-op fill/stroke so OL draws just the text. Allocating these per circle
// per render was wasteful (maxCircles * N renders); one instance is enough.
const TRANSPARENT_FILL = new Fill({ color: 'transparent' });
const TRANSPARENT_STROKE = new Stroke({ color: 'transparent' });

// ** Freeboard Range Circles component **
@Component({
  selector: 'ol-map > fb-range-circles',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RangeCirclesComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];
  private readonly mapTheme = inject(MapThemeService);
  private labelColor = this.mapTheme.palette().mapLabel;

  protected darkMode = input<boolean>(false);
  protected fixedMode = input<boolean>(false);
  protected fixedDistance = input<number>(1000);

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  @Input() position?: Coordinate;
  @Input() maxCircles = 4;
  @Input() mapZoom = 0;
  @Input() units = 'm';
  @Input() minZoom = 0;
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
    effect(() => {
      this.labelColor = this.darkMode()
        ? DarkTheme.labelText.color
        : this.mapTheme.palette().mapLabel;
      this.parseValues();
    });

    effect(() => {
      this.fixedMode();
      this.fixedDistance();
      this.processChange();
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
        if (
          ['position', 'mapZoom', 'minZoom', 'units', 'maxCircles'].includes(
            key
          )
        ) {
          this.processChange();
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
    let range: number;
    if (this.fixedMode()) {
      range = this.fixedDistance();
    } else {
      const map = this.mapComponent.getMap();
      if (!map) return;
      const zoomResolution = map.getView().getResolutionForZoom(this.mapZoom);
      range = rangeForResolution(zoomResolution);
    }
    const fa: Feature[] = [];
    if (this.position && this.mapZoom >= this.minZoom) {
      const st = this.buildCircleStyle();
      for (let i = 1; i <= this.maxCircles; ++i) {
        const d = range * i;
        const geodesicCircle = circular(this.position, d, 1024);
        geodesicCircle.transform('EPSG:4326', 'EPSG:3857'); // Transform from ol default projection (EPSG:4326) to map projection (EPSG:3857)
        const f = new Feature({ geometry: geodesicCircle });
        f.setStyle(st);
        fa.push(f);
        // point for text display: south (180 degrees = π radians)
        const tp = GeoUtils.destCoordinate(
          this.position as [number, number],
          Math.PI,
          d
        );
        const p = new Feature({
          geometry: new Point(fromLonLat(tp as [number, number]))
        });
        p.setStyle(this.buildTextStyle(d));
        fa.push(p);
      }
    }
    this.features = fa;
  }

  processChange() {
    this.parseValues();
    if (this.source) {
      this.source.clear();
      this.source.addFeatures(this.features);
    }
  }

  // build target style
  buildCircleStyle(): Style {
    let cs: Style;
    if (this.layerProperties?.['style']) {
      cs = this.layerProperties['style'] as Style;
    } else {
      // default style
      cs = new Style({
        fill: new Fill({ color: 'transparent' }),
        stroke: new Stroke({
          color: this.mapTheme.palette().rangeCircle,
          width: 1.5,
          lineDash: [2, 3]
        })
      });
    }
    return cs;
  }

  buildTextStyle(value: number) {
    return new Style({
      fill: TRANSPARENT_FILL,
      stroke: TRANSPARENT_STROKE,
      text: new Text({
        text: value ? this.formatLabel(value) : '',
        offsetX: 0,
        offsetY: 0,
        fill: new Fill({ color: this.labelColor })
      })
    });
  }

  formatLabel(value: number): string {
    if (this.units === 'kilometer') {
      const u =
        value >= 1000 ? (this.units as TARGET_UNIT) : ('m' as TARGET_UNIT);
      const p = u === ('m' as TARGET_UNIT) ? 0 : 1;
      const tv = Convert.transform(value, 'm', u);
      return `${tv?.toFixed(p) ?? ''}${Convert.getSymbol(u)}`;
    } else {
      const tv = Convert.transform(value, 'm', this.units as TARGET_UNIT);
      return `${tv?.toFixed(1) ?? ''}${Convert.getSymbol(this.units as TARGET_UNIT)}`;
    }
  }
}
