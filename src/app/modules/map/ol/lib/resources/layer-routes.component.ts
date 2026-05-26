import {
  ChangeDetectorRef,
  SimpleChanges,
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke, Fill, Circle, RegularShape } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { GeoUtils } from 'src/app/lib/geoutils';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import type { FBRoutes, Position } from 'src/app/types';

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-routes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardRouteLayerComponent extends FBFeatureLayerComponent {
  @Input() routeStyles?: Record<string, Style>;
  @Input() activeRoute?: string;
  @Input() routes: FBRoutes = [];

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['route'];
    this.parseFBRoutes(this.routes);
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (!this.source) return;
    const routesChange = changes['routes'];
    const activeRouteChange = changes['activeRoute'];
    if (routesChange) {
      this.source.clear();
      this.parseFBRoutes(routesChange.currentValue);
    } else if (activeRouteChange) {
      this.onActivateRoute(
        activeRouteChange.previousValue as string | undefined
      );
    }
  }

  // Skip full feature rebuild; only re-style affected routes on active-state change.
  onActivateRoute(previousActive?: string) {
    if (!this.source) return;
    this.restyleRouteById(previousActive);
    if (this.activeRoute !== previousActive) {
      this.restyleRouteById(this.activeRoute);
    }
  }

  private restyleRouteById(id: string | undefined) {
    if (!id) return;
    const feature = this.source.getFeatureById('route.' + id) as Feature | null;
    if (feature) {
      feature.setStyle(this.buildStyle(feature));
    }
  }

  parseFBRoutes(routes: FBRoutes = this.routes) {
    const fa: Feature[] = [];
    for (const r of routes) {
      if (r[2]) {
        // selected
        const mc = mapifyCoords(
          r[1].feature.geometry.coordinates as [number, number][]
        );
        const c = fromLonLatArray(mc);
        const f = new Feature({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geometry: new LineString(c as any),
          name: r[1].name
        });
        f.setId('route.' + r[0]);
        const props = r[1].feature.properties as
          | Record<string, unknown>
          | undefined;
        f.set('pointMetadata', props?.['coordinatesMeta'] ?? null);
        f.setStyle(this.buildStyle(f));
        fa.push(f);
      }
    }
    this.source.addFeatures(fa);
    this.updateLabels();
  }

  // Route style function
  buildStyle(feature: Feature): Style | Style[] {
    const geometry = feature.getGeometry() as LineString;
    const styles: Style[] = [];
    const fid = feature.getId();
    const id =
      typeof fid === 'string' ? fid.split('.').slice(-1)[0] : undefined;
    const isActive = id === this.activeRoute;
    let ptFill: Fill;

    if (typeof this.routeStyles === 'undefined') {
      if (this.layerProperties?.['style']) {
        return this.layerProperties['style'] as Style;
      } else {
        styles.push(
          new Style({
            stroke: new Stroke({
              color: 'green',
              width: 2
            })
          })
        );
        return styles;
      }
    }

    // line style
    const activeStyle = this.routeStyles['active'];
    const defaultStyle = this.routeStyles['default'] ?? new Style();
    if (isActive && typeof activeStyle !== 'undefined') {
      styles.push(activeStyle);
      ptFill = new Fill({
        color: activeStyle.getStroke()?.getColor() ?? 'green'
      });
    } else {
      styles.push(defaultStyle.clone());
      ptFill = new Fill({
        color: defaultStyle.getStroke()?.getColor() ?? 'green'
      });
    }

    // point styles
    let idx = 0;
    const l = geometry.getCoordinates().length;
    geometry.forEachSegment((start, end) => {
      // start point
      if (idx === 0) {
        styles.push(
          new Style({
            geometry: new Point(start),
            image: new Circle({
              radius: 5,
              stroke: new Stroke({
                width: 1,
                color: 'white'
              }),
              fill: ptFill
            })
          })
        );
      } else {
        if (isActive) {
          styles.push(
            new Style({
              geometry: new Point(start),
              image: new Circle({
                radius: 4,
                stroke: new Stroke({
                  width: 1,
                  color: 'white'
                }),
                fill: ptFill
              })
            })
          );
        } else {
          const d = GeoUtils.rhumbLineBearing(
            toLonLat(start) as Position,
            toLonLat(end) as Position
          );
          const rotation = (d * Math.PI) / 180;
          styles.push(
            new Style({
              geometry: new Point(start),
              image: new RegularShape({
                radius: 6,
                stroke: new Stroke({
                  width: 1,
                  color: 'white'
                }),
                fill: ptFill,
                points: 3,
                angle: 0,
                rotateWithView: true,
                rotation: rotation
              })
            })
          );
        }
      }
      // last point
      if (idx === l - 2) {
        styles.push(
          new Style({
            geometry: new Point(end),
            image: new RegularShape({
              radius: 6,
              stroke: new Stroke({
                width: 1,
                color: 'white'
              }),
              fill: ptFill,
              points: 4,
              angle: Math.PI / 4
            })
          })
        );
      }
      idx++;
    });
    return styles;
  }
}
