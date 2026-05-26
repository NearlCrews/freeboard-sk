import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges,
  inject
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Text, Circle, Fill, Stroke } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBWaypoints } from 'src/app/types';
import { SKWaypoint } from 'src/app/modules/skresources';
import { MapImageRegistry } from '../map-image-registry.service';
import { MapThemeService } from '../theme';

// ** Freeboard resource collection format **
@Component({
  selector: 'ol-map > fb-waypoints',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardWaypointLayerComponent extends FBFeatureLayerComponent {
  @Input() waypointStyles?: Record<string, Style>;
  @Input() activeWaypoint?: string;
  @Input() waypoints: FBWaypoints = [];

  private readonly mapTheme = inject(MapThemeService);

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['waypoint'];
    this.parseFBWaypoints(this.waypoints);
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    if (this.source) {
      const waypointsChange = changes['waypoints'];
      const activeWaypointChange = changes['activeWaypoint'];
      if (waypointsChange) {
        this.source.clear();
        this.parseFBWaypoints(waypointsChange.currentValue);
      }
      if (activeWaypointChange) {
        this.source.clear();
        this.reloadWaypoints();
      }
    }
  }

  reloadWaypoints() {
    this.parseFBWaypoints(this.waypoints);
  }

  parseFBWaypoints(waypoints: FBWaypoints = this.waypoints) {
    const fa: Feature[] = [];
    // Snapshot palette once per parse: buildStyle() previously read the
    // signal for every waypoint in the default-style branch.
    const palette = this.mapTheme.palette();
    for (const w of waypoints) {
      if (!w[2]) {
        continue;
      }
      const f = new Feature({
        geometry: new Point(
          fromLonLat(w[1].feature.geometry.coordinates as [number, number])
        ),
        name: w[1].name
      });
      f.setId('waypoint.' + w[0]);
      f.setStyle(this.buildStyle(w[0], w[1], palette).clone());
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }

  // build waypoint style
  buildStyle(
    id: string,
    wpt: SKWaypoint,
    palette?: ReturnType<MapThemeService['palette']>
  ): Style {
    const props = wpt.feature.properties as Record<string, unknown> | undefined;
    const skIcon = props?.['skIcon'];
    const icon = this.mapImages.getWaypoint(
      wpt.type ?? 'default',
      typeof skIcon === 'string' ? skIcon : undefined
    );
    if (icon && typeof this.waypointStyles === 'undefined') {
      const s = new Style({
        image: icon,
        text: new Text({ text: '', offsetX: 0, offsetY: -28 })
      });
      return this.setTextLabel(s, wpt.name);
    }

    if (typeof this.waypointStyles !== 'undefined') {
      const activeStyle = this.waypointStyles['active'];
      if (id === this.activeWaypoint && typeof activeStyle !== 'undefined') {
        return this.setTextLabel(activeStyle, wpt.name);
      }
      const typeKey = wpt.type ? wpt.type.toLowerCase() : '';
      const typeStyle = typeKey ? this.waypointStyles[typeKey] : undefined;
      if (typeStyle) {
        return this.setTextLabel(typeStyle, wpt.name);
      }
      return this.setTextLabel(
        this.waypointStyles['default'] ?? new Style(),
        wpt.name
      );
    }
    const layerProps = this.layerProperties();
    if (layerProps?.['style']) {
      return this.setTextLabel(layerProps['style'] as Style, wpt.name);
    }
    const p = palette ?? this.mapTheme.palette();
    const fillColor = id === this.activeWaypoint ? p.routeActive : p.waypoint;
    const s = new Style({
      image: new Circle({
        radius: 5,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: 'black', width: 2 })
      }),
      text: new Text({ text: '', offsetY: -12 })
    });
    return this.setTextLabel(s, wpt.name);
  }
}
