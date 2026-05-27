import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  SimpleChange,
  inject,
  input,
  effect
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Circle, Text } from 'ol/style';
import { StyleLike } from 'ol/style/Style';
import { LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { MapThemeService } from '../theme';
import { AsyncSubject } from 'rxjs';

// ** Freeboard Bearing line component **
@Component({
  selector: 'ol-map > fb-bearing-line',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class BearingLineComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  protected vesselPosition = input<Coordinate>();
  protected markerPosition = input<Coordinate>();
  protected showMarker = input<boolean>();
  protected labelMinZoom = input<number>(10);
  protected markerName = input<string>('');

  @Input() mapZoom = 10;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() bearingStyles?: Record<string, any>;
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: Record<string, any>;

  public mapifiedRadius = 0;
  public mapifiedLine: Coordinate[] = [];

  private readonly mapTheme = inject(MapThemeService);

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      this.markerPosition();
      this.vesselPosition();
      this.showMarker();
      this.parseValues();
      if (this.source) {
        this.source.clear();
        this.source.addFeatures(this.features);
      }
    });
    effect(() => {
      this.labelMinZoom();
      this.markerName();
      if (typeof this.mapZoom !== 'undefined') {
        this.updateLabel();
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
        if (key === 'mapZoom') {
          this.handleLabelZoomChange(key, change);
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
    const vesselPos = this.vesselPosition();
    const markerPos = this.markerPosition();
    if (Array.isArray(vesselPos) && Array.isArray(markerPos)) {
      this.mapifiedLine = mapifyCoords([vesselPos, markerPos]);
      const fl = new Feature({
        geometry: new LineString(fromLonLatArray(this.mapifiedLine))
      });
      fl.setStyle(this.buildStyle('line'));
      fa.push(fl);
      let fp = new Feature({
        geometry: new Point(fromLonLat(markerPos))
      });
      fp.setId('d.base');
      fp.setStyle(this.buildStyle('line'));
      this.updateLabel(fp);
      fa.push(fp);
      if (this.showMarker()) {
        fp = new Feature({
          geometry: new Point(fromLonLat(markerPos))
        });
        fp.setId('dest.point');
        fp.setStyle(this.buildStyle('marker'));
        fa.push(fp);
      }
    }
    this.features = fa;
  }

  // build target style
  buildStyle(key: string): Style | Style[] {
    if (this.bearingStyles?.[key]) {
      return this.bearingStyles[key] as Style | Style[];
    }
    if (this.layerProperties?.['style']) {
      return this.layerProperties['style'] as Style | Style[];
    }
    const bearingColor = this.mapTheme.palette().bearingLine;
    return [
      new Style({
        stroke: new Stroke({ color: 'white', width: 6 })
      }),
      new Style({
        image: new Circle({
          radius: 5,
          stroke: new Stroke({ width: 2, color: 'white' }),
          fill: new Fill({ color: bearingColor })
        }),
        stroke: new Stroke({ color: bearingColor, width: 2 }),
        text: new Text({ text: '', offsetX: 0, offsetY: -29 })
      })
    ];
  }

  // ** assess attribute change **
  handleLabelZoomChange(key: string, change: SimpleChange) {
    if (key === 'mapZoom') {
      if (typeof this.labelMinZoom() !== 'undefined') {
        if (
          (change.currentValue >= this.labelMinZoom() &&
            change.previousValue < this.labelMinZoom()) ||
          (change.currentValue < this.labelMinZoom() &&
            change.previousValue >= this.labelMinZoom())
        ) {
          this.updateLabel();
        }
      }
    }
  }

  // update feature labels
  updateLabel(f?: Feature) {
    if (!f && this.source) {
      f = this.source.getFeatureById('d.base') as Feature;
    }
    if (!f) {
      return;
    }
    try {
      const raw = f.getStyle();
      if (!raw) {
        return;
      }
      const s: StyleLike | undefined = Array.isArray(raw) ? raw[1] : raw;
      if (!s) {
        return;
      }
      const ts = (s as Style).getText();
      if (!ts) {
        return;
      }
      ts.setText(
        Math.abs(this.mapZoom) >= this.labelMinZoom()
          ? (this.markerName() ?? '')
          : ''
      );
      (s as Style).setText(ts);
      f.setStyle(s);
    } catch {
      // updateLabel runs best-effort: feature may have been removed mid-tick.
    }
  }
}
