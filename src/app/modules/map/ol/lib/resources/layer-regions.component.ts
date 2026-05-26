import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges,
  inject
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke, Fill, Text } from 'ol/style';
import { Polygon, MultiPolygon } from 'ol/geom';
import { MapComponent } from '../map.component';
import { fromLonLatArray, mapifyCoords } from '../util';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { MapThemeService } from '../theme';
import { FBRegions } from 'src/app/types';

@Component({
  selector: 'ol-map > fb-regions',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardRegionLayerComponent extends FBFeatureLayerComponent {
  @Input() regions: FBRegions = [];
  @Input() regionStyles?: Record<string, Style>;

  private readonly mapTheme = inject(MapThemeService);

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['region'];
    this.parseRegions(this.regions);
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    const regionsChange = changes['regions'];
    if (this.source && regionsChange) {
      this.source.clear();
      this.parseRegions(regionsChange.currentValue);
    }
  }

  parseRegions(regions: FBRegions = this.regions) {
    const fa: Feature[] = [];
    // Snapshot palette once per parse; buildStyle() previously read the
    // signal per region.
    const regionColor = this.mapTheme.palette().region;
    for (const r of regions) {
      const c = this.parseCoordinates(
        r[1].feature.geometry.coordinates,
        r[1].feature.geometry.type
      );
      const f = new Feature({
        geometry:
          r[1].feature.geometry.type === 'MultiPolygon'
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              new MultiPolygon(c as any)
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
              new Polygon(c as any),
        name: r[1].name
      });
      f.setId('region.' + r[0]);
      f.set('name', r[1].name);
      f.set('icon', 'region');
      f.setStyle(this.buildStyle(r[0], r[1], regionColor));
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }

  // build region feature style
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildStyle(id: string, reg: any, regionColor?: string): Style {
    const color = regionColor ?? this.mapTheme.palette().region;
    const fillColor = `color-mix(in srgb, ${color} 10%, transparent)`;
    // default style
    let theStyle = this.setTextLabel(
      new Style({
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: color, width: 1 }),
        text: new Text({ text: '', offsetY: 0 })
      }),
      reg.name
    );

    if (this.regionStyles) {
      const skIcon = reg.feature?.properties?.skIcon;
      if (typeof skIcon === 'string' && skIcon && this.regionStyles[skIcon]) {
        theStyle = this.setTextLabel(this.regionStyles[skIcon], reg.name);
      } else if (this.regionStyles['default']) {
        theStyle = this.setTextLabel(this.regionStyles['default'], reg.name);
      }
    } else {
      const layerProps = this.layerProperties();
      if (layerProps?.['style']) {
        theStyle = this.setTextLabel(layerProps['style'] as Style, reg.name);
      }
    }

    return theStyle;
  }

  // mapify and transform MultiLineString coordinates
  parseCoordinates(
    coords: [number, number, number?][][] | [number, number, number?][][][],
    geomType: 'Polygon' | 'MultiPolygon'
  ) {
    const m2 = (lines: [number, number, number?][][]) =>
      lines.map((line) => mapifyCoords(line as [number, number][]));
    if (geomType === 'MultiPolygon') {
      const multipoly = (coords as [number, number, number?][][][]).map(m2);
      return multipoly.map((poly) => fromLonLatArray(poly));
    }
    return fromLonLatArray(m2(coords as [number, number, number?][][]));
  }
}
