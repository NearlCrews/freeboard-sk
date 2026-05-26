import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, Stroke } from 'ol/style';
import { LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent, zoomOffsetLevel } from '../map.component';
import { AISBaseLayerComponent } from './ais-base.component';
import { GeoUtils } from 'src/app/lib/geoutils';
import { SKVessel } from 'src/app/modules/skresources';

// Wind vector styles only vary by apparent vs true; one instance each.
const TRUE_WIND_STYLE = new Style({
  stroke: new Stroke({ width: 2, color: 'rgba(128, 128, 0,1)' })
});
const APPARENT_WIND_STYLE = new Style({
  stroke: new Stroke({ width: 2, color: 'rgba(16, 75, 16,1)' })
});

// ** Signal K AIS Vessel Wind vector  **
@Component({
  selector: 'ol-map > sk-ais-wind',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISWindLayerComponent extends AISBaseLayerComponent {
  @Input() vectorApparent = false;

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if ('vectorApparent' in changes) {
      this.onUpdateTargets(this.extractKeys(this.targets));
    }
  }

  calcVector(target: SKVessel) {
    const awa = target.wind.awa;
    const windDirection = this.vectorApparent
      ? typeof awa === 'number'
        ? target.orientation + awa
        : null
      : target.wind.direction;

    if (typeof windDirection !== 'number' || !target.position) {
      return [];
    }

    const offset =
      zoomOffsetLevel[Math.floor(this.mapZoom())] ?? zoomOffsetLevel[0];
    if (typeof offset !== 'number') {
      return [];
    }
    const windc = GeoUtils.destCoordinate(
      target.position,
      windDirection,
      offset
    );
    return [
      fromLonLat(target.position as [number, number]),
      fromLonLat(windc as [number, number])
    ];
  }

  // add new wind vector feature
  addWindVectorWithId(id: string) {
    if (!id.includes(this.targetContext) || !this.targets.has(id)) {
      return;
    }
    const target = this.targets.get(id) as SKVessel | undefined;
    if (target && this.okToRenderTarget(id) && target.position) {
      const v = this.calcVector(target);
      if (v.length !== 2) {
        return;
      }
      const f = new Feature(new LineString(v));
      f.setId('wind-' + id);
      f.setStyle(this.buildVectorStyle());
      this.source?.addFeature(f);
    }
  }

  // build wind vector style
  buildVectorStyle(): Style {
    return this.vectorApparent ? APPARENT_WIND_STYLE : TRUE_WIND_STYLE;
  }

  // reload all Features from this.targets
  override onReloadTargets() {
    this.extractKeys(this.targets).forEach((id) => {
      this.addWindVectorWithId(id);
    });
  }

  // update wind vector feature when target updated
  override onUpdateTargets(ids: string[]) {
    const context = this.targetContext;
    const style = this.buildVectorStyle();
    ids.forEach((id: string) => {
      if (!id.includes(context)) {
        return;
      }
      const f = this.source?.getFeatureById('wind-' + id) as Feature | null;
      if (!this.okToRenderTarget(id)) {
        if (f) {
          this.source.removeFeature(f);
        }
        return;
      }
      const target = this.targets.get(id) as SKVessel | undefined;
      if (!target) {
        return;
      }
      if (!f) {
        this.addWindVectorWithId(id);
        return;
      }
      const v = this.calcVector(target);
      if (target.position && v.length === 2) {
        f.setGeometry(new LineString(v));
      }
      f.setStyle(style);
    });
  }

  // remove flag when target removed
  override onRemoveTargets(ids: string[]) {
    ids.forEach((id) => {
      const f = this.source.getFeatureById('wind-' + id) as Feature | null;
      if (f) {
        this.source.removeFeature(f);
      }
    });
  }
}
