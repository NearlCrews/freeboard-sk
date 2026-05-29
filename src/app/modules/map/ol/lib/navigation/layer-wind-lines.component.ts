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
  input,
  effect
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Icon } from 'ol/style';
import { Point } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { AsyncSubject } from 'rxjs';
import { fromLonLat } from 'ol/proj';

// ** Open Binnacle TWD / AWA lines component **
@Component({
  selector: 'ol-map > fb-wind-lines',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class WindLinesComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  protected twd = input<number>();
  protected awa = input<number>();
  protected tws = input<number>(0);
  protected aws = input<number>(0);
  protected position = input<Coordinate>();

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
      this.twd();
      this.awa();
      this.tws();
      this.aws();
      this.position();
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

  ngOnChanges(_changes: SimpleChanges) {
    const layer = this.layer;
    if (layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: Record<string, any> = {};
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
    const pos = this.position();
    if (Array.isArray(pos)) {
      const twd = this.twd();
      if (typeof twd === 'number' && this.tws() > 0) {
        const twdArrow = new Feature({
          geometry: new Point(fromLonLat(pos))
        });
        twdArrow.setId('twd');
        twdArrow.setStyle(
          new Style({
            image: new Icon({
              src: './assets/img/wind/twd.svg',
              scale: 5,
              anchor: [3.5, 37],
              anchorXUnits: 'pixels',
              anchorYUnits: 'pixels',
              rotateWithView: true,
              rotation: twd
            })
          })
        );
        fa.push(twdArrow);
      }
      const awa = this.awa();
      if (typeof awa === 'number' && this.aws() > 0) {
        const awaArrow = new Feature({
          geometry: new Point(fromLonLat(pos))
        });
        awaArrow.setId('awa');
        awaArrow.setStyle(
          new Style({
            image: new Icon({
              src: './assets/img/wind/awa.svg',
              scale: 5,
              anchor: [3.5, 37],
              anchorXUnits: 'pixels',
              anchorYUnits: 'pixels',
              rotateWithView: true,
              rotation: awa
            })
          })
        );
        fa.push(awaArrow);
      }
    }
    this.features = fa;
  }
}
