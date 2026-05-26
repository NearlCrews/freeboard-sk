import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import {
  Point,
  MultiPoint,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon
} from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { fromLonLatArray } from '../util';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBResourceSets } from 'src/app/types';
import { SKResourceSet } from 'src/app/modules/skresources';

// ** Signal K resource collection format **
@Component({
  selector: 'ol-map > fb-resource-sets',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ResourceSetLayerComponent extends FBFeatureLayerComponent {
  protected features: Feature[] = [];

  @Input() collection = '';
  @Input() resourceSets: FBResourceSets = [];

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = ['rset'];
    this.parseResourceSets(this.resourceSets);
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    const resourceSetsChange = changes['resourceSets'];
    if (this.source && resourceSetsChange) {
      this.source.clear();
      this.parseResourceSets(resourceSetsChange.currentValue);
    }
  }

  // process resource sets
  parseResourceSets(resourceSets: FBResourceSets) {
    this.features = [];
    for (const r of resourceSets) {
      if (r[2]) {
        this.parseResources(r[1]);
      }
    }
    this.source.addFeatures(this.features);
  }

  // process a resource set
  parseResources(rSet: SKResourceSet) {
    const fa: Feature[] = [];
    let count = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features: any[] = rSet.values?.features ?? [];
    for (const w of features) {
      let f: Feature | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coords = w.geometry.coordinates as any;
      if (w.geometry.type === 'Point') {
        f = new Feature({
          geometry: new Point(fromLonLat(coords)),
          name: w.properties.name ?? `Point ${count}`
        });
      }
      if (w.geometry.type === 'MultiPoint') {
        f = new Feature({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geometry: new MultiPoint(fromLonLatArray(coords) as any),
          name: w.properties.name ?? `Pt ${count}`
        });
      } else if (w.geometry.type === 'LineString') {
        f = new Feature({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geometry: new LineString(fromLonLatArray(coords) as any),
          name: w.properties.name ?? `L${count}`
        });
      } else if (w.geometry.type === 'MultiLineString') {
        f = new Feature({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geometry: new MultiLineString(fromLonLatArray(coords) as any),
          name: w.properties.name ?? `L${count}`
        });
      } else if (w.geometry.type === 'Polygon') {
        f = new Feature({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geometry: new Polygon(fromLonLatArray(coords) as any),
          name: w.properties.name ?? `P${count}`
        });
      } else if (w.geometry.type === 'MultiPolygon') {
        f = new Feature({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          geometry: new MultiPolygon(fromLonLatArray(coords) as any),
          name: w.properties.name ?? `P${count}`
        });
      }
      if (!f) {
        continue;
      }
      f.setId(`rset.${this.collection}.${rSet.id}.${count}`);
      // set style
      const styles = rSet.styles as Record<string, unknown> | undefined;
      if (styles) {
        let rs: Style;
        const styleRef = w.properties.styleRef;
        const styleDef = w.properties.style;
        if (typeof styleRef !== 'undefined') {
          rs = this.buildStyle(
            styles[styleRef] as Record<string, unknown>,
            w.geometry.type
          );
        } else if (typeof styleDef !== 'undefined') {
          rs = this.buildStyle(styleDef, w.geometry.type);
        } else {
          rs = this.buildStyle(
            styles['default'] as Record<string, unknown>,
            w.geometry.type
          );
        }
        f.setStyle(this.setTextLabel(rs, w.properties.name));
      }
      fa.push(f);
      count++;
    }
    this.features = this.features.concat(fa);
  }

  buildStyle(
    styleDef: Record<string, unknown> | undefined,
    geom: string
  ): Style {
    const def = styleDef ?? {};
    const s = new Style();
    if (geom === 'Point' || geom === 'MulitPoint') {
      s.setImage(
        new Circle({
          radius: (def['width'] as number) ?? 5,
          fill: new Fill({ color: (def['fill'] as string) ?? 'blue' }),
          stroke: new Stroke({
            color: (def['stroke'] as string) ?? 'blue',
            width: 2,
            lineDash: (def['lineDash'] as number[]) ?? [1]
          })
        })
      );
      s.setText(
        new Text({
          text: '',
          offsetY: -20
        })
      );
    } else {
      s.setFill(new Fill({ color: (def['fill'] as string) ?? 'blue' }));
      s.setStroke(
        new Stroke({
          color: (def['stroke'] as string) ?? 'blue',
          width: (def['width'] as number) ?? 2,
          lineDash: (def['lineDash'] as number[]) ?? [1]
        })
      );
    }
    return s;
  }
}
