import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  input
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke } from 'ol/style';
import { MultiLineString, LineString } from 'ol/geom';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { fromLonLatArray, mapifyCoords } from '../util';
import { MapThemeService } from '../theme';
import { AsyncSubject } from 'rxjs';

// ** Open Binnacle Vessel trail component **
@Component({
  selector: 'ol-map > fb-vessel-trail',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class VesselTrailComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>();

  readonly localTrail = input<Coordinate[] | undefined>(undefined);
  readonly serverTrail = input<Coordinate[][] | undefined>(undefined);
  readonly trailStyles = input<Record<string, Style> | undefined>(undefined);
  readonly opacity = input<number | undefined>(undefined);
  readonly visible = input<boolean | undefined>(undefined);
  readonly extent = input<Extent | undefined>(undefined);
  readonly zIndex = input<number | undefined>(undefined);
  readonly minResolution = input<number | undefined>(undefined);
  readonly maxResolution = input<number | undefined>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly layerProperties = input<Record<string, any> | undefined>(undefined);

  trailLocal?: Feature;
  trailServer?: Feature;

  private readonly theme = inject(MapThemeService);

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    const fa: Feature[] = [];
    this.parseTrails();
    if (this.trailLocal) {
      fa.push(this.trailLocal);
    }
    if (this.trailServer) {
      fa.push(this.trailServer);
    }
    this.source = new VectorSource({ features: fa });
    const props = this.layerProperties() ?? {};
    this.layer = new VectorLayer({
      source: this.source,
      opacity: this.opacity(),
      visible: this.visible(),
      extent: this.extent(),
      zIndex: this.zIndex(),
      minResolution: this.minResolution(),
      maxResolution: this.maxResolution(),
      ...props
    });

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
        if (key === 'localTrail') {
          if (this.source) {
            this.parseLocalTrail();
          }
        }
        if (key === 'serverTrail') {
          if (this.source) {
            this.parseServerTrail();
          }
        }
        if (key === 'trailStyles') {
          if (this.source) {
            this.parseTrails();
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

  parseTrails() {
    this.parseLocalTrail();
    this.parseServerTrail();
  }

  parseLocalTrail() {
    const localTrail = this.localTrail();
    if (!localTrail) {
      return;
    }
    const c = fromLonLatArray(mapifyCoords(localTrail)) as Coordinate[];
    if (!this.trailLocal) {
      // create feature
      this.trailLocal = new Feature(new LineString(c));
      this.trailLocal.setId('trail.self.local');
      this.trailLocal.setStyle(this.buildStyle('local'));
    } else {
      //update feature
      const existing = this.source.getFeatureById(
        'trail.self.local'
      ) as Feature | null;
      if (!existing) {
        return;
      }
      this.trailLocal = existing;
      if (Array.isArray(localTrail)) {
        const g = this.trailLocal.getGeometry();
        if (g) {
          (g as LineString).setCoordinates(c);
        }
      }
    }
  }

  parseServerTrail() {
    const serverTrail = this.serverTrail();
    if (!serverTrail) {
      return;
    }
    const ca = serverTrail.map((t: Coordinate[]) => {
      return fromLonLatArray(mapifyCoords(t)) as Coordinate[];
    });
    if (!this.trailServer) {
      // create feature
      this.trailServer = new Feature(new MultiLineString(ca));
      this.trailServer.setId('trail.self.server');
      this.trailServer.setStyle(this.buildStyle('server'));
    } else {
      //update feature
      const existing = this.source.getFeatureById(
        'trail.self.server'
      ) as Feature | null;
      if (!existing) {
        return;
      }
      this.trailServer = existing;
      if (Array.isArray(serverTrail)) {
        const g = this.trailServer.getGeometry();
        if (g) {
          (g as MultiLineString).setCoordinates(ca);
        }
      }
    }
  }

  // build target style
  buildStyle(type = 'local'): Style {
    const trailColor = this.theme.palette().trailSelf;
    const trailStyles = this.trailStyles();
    let cs: Style;
    if (type === 'server') {
      const server = trailStyles?.['server'];
      if (server) {
        cs = server;
      } else {
        cs = new Style({
          // default server
          stroke: new Stroke({
            color: trailColor,
            width: 1,
            lineDash: [4, 4]
          })
        });
      }
    } else {
      const local = trailStyles?.['local'];
      if (local) {
        cs = local;
      } else {
        cs = new Style({
          // default local
          stroke: new Stroke({
            color: trailColor,
            width: 1,
            lineDash: [2, 2]
          })
        });
      }
    }
    return cs;
  }
}
