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
  inject,
  input,
  effect
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke } from 'ol/style';
import { LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray } from '../util';
import { MapThemeService } from '../theme/map-theme.service';
import { AsyncSubject } from 'rxjs';
import { LineStyleDef } from 'src/app/modules/settings/components/linestyle-select.component';

// ** Open Binnacle Vessel Heading line component **
@Component({
  selector: 'ol-map > fb-heading-line',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class HeadingLineComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  protected coords = input<Coordinate[]>();
  protected lineStyle = input<LineStyleDef>();

  @Input() mapZoom = 10;
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: Record<string, any>;

  protected mapifiedLine: Coordinate[] = [];

  private readonly mapTheme = inject(MapThemeService);

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    effect(() => {
      this.coords();
      this.lineStyle();
      this.parseInput();
      if (this.source) {
        this.source.clear();
        this.source.addFeatures(this.features);
      }
    });
  }

  ngOnInit() {
    this.parseInput();
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

  parseInput() {
    const fa: Feature[] = [];
    const cs = this.coords();
    if (Array.isArray(cs) && cs.length !== 0) {
      this.mapifiedLine = cs.map((p) => [p[0], p[1]] as Coordinate);

      const heading = new Feature({
        geometry: new LineString(fromLonLatArray(this.mapifiedLine))
      });
      heading.setId('headingSelf');
      const ls = this.lineStyle();
      heading.setStyle(
        new Style({
          stroke: ls
            ? new Stroke({
                color: ls.stroke.color,
                width: ls.stroke.width,
                lineDash: ls.stroke.lineDash ?? undefined
              })
            : new Stroke({
                color: this.mapTheme.palette().headingLine,
                width: 4
              })
        })
      );
      fa.push(heading);
    }
    this.features = fa;
  }
}
