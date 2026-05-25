import type { ChangeDetectorRef, SimpleChanges } from '@angular/core';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke, Fill, Circle, RegularShape } from 'ol/style';
import { LineString, Point } from 'ol/geom';
import { toLonLat } from 'ol/proj';
import type { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { getRhumbLineBearing } from 'geolib';
import type { GeolibInputCoordinates } from 'geolib/es/types';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import type { FBRoutes } from 'src/app/types';

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-routes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardRouteLayerComponent extends FBFeatureLayerComponent {
  @Input() routeStyles: Record<string, Style>;
  @Input() activeRoute: string;
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
    if ('routes' in changes) {
      this.source.clear();
      this.parseFBRoutes(changes.routes.currentValue);
    } else if ('activeRoute' in changes) {
      this.onActivateRoute(
        changes.activeRoute.previousValue as string | undefined
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
        const mc = mapifyCoords(r[1].feature.geometry.coordinates);
        const c = fromLonLatArray(mc);
        const f = new Feature({
          geometry: new LineString(c),
          name: r[1].name
        });
        f.setId('route.' + r[0]);
        f.set('pointMetadata', r[1].feature.properties.coordinatesMeta ?? null);
        f.setStyle(this.buildStyle(f));
        fa.push(f);
      }
    }
    this.source.addFeatures(fa);
    this.updateLabels();
  }

  // Route style function
  buildStyle(feature: Feature) {
    const geometry = feature.getGeometry() as LineString;
    const styles = [];
    const id = (feature.getId() as string).split('.').slice(-1)[0];
    const isActive = id === this.activeRoute;
    let ptFill: Fill;

    if (typeof this.routeStyles === 'undefined') {
      if (this.layerProperties && this.layerProperties.style) {
        return this.layerProperties.style;
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
    if (isActive && typeof this.routeStyles.active !== 'undefined') {
      styles.push(this.routeStyles.active);
      ptFill = new Fill({
        color: this.routeStyles.active.getStroke().getColor()
      });
    } else {
      styles.push(this.routeStyles.default.clone());
      ptFill = new Fill({
        color: this.routeStyles.default.getStroke().getColor()
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
          const d = getRhumbLineBearing(
            toLonLat(start) as GeolibInputCoordinates,
            toLonLat(end) as GeolibInputCoordinates
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
