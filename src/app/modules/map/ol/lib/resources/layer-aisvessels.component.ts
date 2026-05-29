import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Fill, Stroke, Circle, Text } from 'ol/style';
import { asArray } from 'ol/color';
import { fromLonLat } from 'ol/proj';
import { Point, LineString } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent } from './ais-base.component';
import { SKVessel } from 'src/app/modules/skresources';
import { fromLonLatArray } from '../util';
import { MapImageRegistry } from '../map-image-registry.service';
import { MapThemeService } from '../theme/map-theme.service';

// Reused transparent fill for COG segment markers; new Fill() per segment per
// render was a measurable allocation churn when many AIS targets had cog lines.
const COG_SEGMENT_FILL = new Fill({ color: 'transparent' });

// ** Signal K AIS Vessel targets **
@Component({
  selector: 'ol-map > sk-ais-vessels',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISVesselsLayerComponent extends AISBaseLayerComponent {
  @Input() cogLineLength = 0;

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
    this.labelPrefixes = ['ais-'];
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    const cogLineLengthChange = changes['cogLineLength'];
    if (cogLineLengthChange) {
      this.cogLineLength = cogLineLengthChange.currentValue ?? 0;
      this.onUpdateTargets(this.extractKeys(this.targets));
    }
  }

  // reload all Features from this.targets
  override onReloadTargets() {
    this.extractKeys(this.targets).forEach((id) => {
      this.addTargetWithId(id);
    });
  }

  // update targets
  override onUpdateTargets(ids: string[]) {
    if (!this.source) return;
    const context = this.targetContext;
    ids.forEach((id: string) => {
      if (!id.includes(context)) {
        return;
      }
      if (!this.okToRenderTarget(id)) {
        this.onRemoveTargets([id]);
        return;
      }
      const target = this.targets.get(id) as SKVessel | undefined;
      if (!target) {
        return;
      }
      const f = this.source.getFeatureById('ais-' + id) as Feature | null;
      if (!f) {
        this.addTargetWithId(id);
        return;
      }
      const label = this.buildLabel(target);
      if (target.position) {
        f.setGeometry(
          new Point(fromLonLat(target.position as [number, number]))
        );
      }
      const built = this.buildVesselStyle(target, label, this.isStale(target));
      if (!built) return;
      const s = built.clone();
      f.set('name', label, true);
      f.setStyle(
        this.setTextLabel(this.setRotation(s, target.orientation), label)
      );
      this.parseCogLine(id, target);
    });
  }

  // remove target features
  override onRemoveTargets(ids: string[]) {
    ids.forEach((id) => {
      if (id.includes(this.targetContext)) {
        let f = this.source.getFeatureById('ais-' + id) as Feature | null;
        if (f) {
          this.source.removeFeature(f);
        }
        f = this.source.getFeatureById('cog-' + id) as Feature | null;
        if (f) {
          this.source.removeFeature(f);
        }
      }
    });
  }

  // label zoom threshold crossed
  override onLabelZoomThreshold(entered: boolean) {
    super.updateLabels();
    this.toggleCogLines(entered);
  }

  // add new target
  addTargetWithId(id: string) {
    if (!id.includes(this.targetContext) || !this.targets.has(id)) {
      return;
    }
    const target = this.targets.get(id) as SKVessel | undefined;
    if (!target) return;
    if (this.okToRenderTarget(id) && target.position) {
      const label = this.buildLabel(target);
      const f = new Feature({
        geometry: new Point(fromLonLat(target.position as [number, number])),
        name: target.name
      });
      f.setId('ais-' + id);
      f.set('name', label, true);
      const built = this.buildVesselStyle(target, label, this.isStale(target));
      if (!built) return;
      const s = built.clone();
      f.setStyle(
        this.setTextLabel(this.setRotation(s, target.orientation), label)
      );
      this.source.addFeature(f);
      this.parseCogLine(id, target);
    }
  }

  // build target style
  buildVesselStyle(
    target: SKVessel,
    label?: string,
    setStale = false
  ): Style | undefined {
    let s: Style | undefined;
    const isMoored = target.state === 'moored';

    const shipClass =
      typeof target.type.id === 'number'
        ? Math.abs(Math.floor(target.type.id / 10) * 10)
        : -1;

    const icon =
      target.id === this.focusId
        ? this.mapImages.getVessel('focused')
        : setStale
          ? this.mapImages.getVessel('inactive', isMoored)
          : target.buddy
            ? this.mapImages.getVessel('buddy', isMoored)
            : shipClass === -1
              ? this.mapImages.getVessel('default', isMoored)
              : this.mapImages.getVessel(shipClass, isMoored);

    if (icon && typeof this.targetStyles === 'undefined') {
      return new Style({
        image: icon,
        text: new Text({
          text: '',
          offsetX: 0,
          offsetY: isMoored ? 12 : 22
        })
      });
    }

    if (typeof this.targetStyles !== 'undefined') {
      const ts = this.targetStyles;
      if (target.id === this.focusId && ts['focus']) {
        s = ts['focus'];
      } else if (setStale) {
        // stale
        s = ts['inactive'] ?? ts['default'];
      } else if (target.type && ts[shipClass]) {
        // ship type & state
        const shipStyles = ts[shipClass] as unknown as Record<string, Style>;
        if (target.state && shipStyles[target.state]) {
          s = shipStyles[target.state];
        } else {
          s = shipStyles['default'];
        }
      } else if (target.buddy && ts['buddy']) {
        // buddy
        s = ts['buddy'];
      } else {
        // all others
        if (target.state && ts[target.state]) {
          // state only
          s = ts[target.state];
        } else {
          s = ts['default'];
        }
      }
    } else {
      const layerProps = this.layerProperties();
      if (layerProps?.['style']) {
        s = layerProps['style'] as Style;
      } else if (target.id === this.focusId) {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      } else if (setStale) {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'orange' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      } else {
        s = new Style({
          image: new RegularShape({
            points: 3,
            radius: 4,
            fill: new Fill({ color: 'magenta' }),
            stroke: new Stroke({
              color: 'black',
              width: 1
            }),
            rotateWithView: true
          })
        });
      }
    }
    return s;
  }

  // add update COG vector
  parseCogLine(id: string, target: SKVessel) {
    if (!this.source || !target.vectors.cog) {
      return;
    }

    let cf = this.source.getFeatureById('cog-' + id) as Feature | null;
    if (
      !this.okToRenderCogLines() ||
      !this.okToRenderTarget(id) ||
      !target.position
    ) {
      if (cf) {
        this.source.removeFeature(cf);
      }
      return;
    }

    const cogCoords = fromLonLatArray(target.vectors.cog as Coordinate[]);
    if (cf) {
      // update vector
      cf.setGeometry(new LineString(cogCoords));
      cf.setStyle(this.buildCogLineStyle(id, cf));
    } else {
      // create vector
      cf = new Feature(new LineString(cogCoords));
      cf.setId('cog-' + id);
      cf.setStyle(this.buildCogLineStyle(id, cf));
      this.source.addFeature(cf);
    }
  }

  // show / hide cog vector
  toggleCogLines(show: boolean) {
    if (show) {
      for (const [k, v] of this.targets) {
        this.parseCogLine(k, v as SKVessel);
      }
    } else {
      // Collect first to avoid mutating the source mid-iteration; OL does
      // not document forEachFeature as safe under concurrent removal.
      const toRemove: Feature[] = [];
      this.source.forEachFeature((cl) => {
        const fid = cl.getId();
        if (typeof fid === 'string' && fid.startsWith('cog-')) {
          toRemove.push(cl);
        }
      });
      for (const f of toRemove) {
        this.source.removeFeature(f);
      }
    }
  }

  // build COG vector style
  buildCogLineStyle(id: string, feature: Feature) {
    const opacity =
      this.okToRenderTarget(id) && this.okToRenderCogLines() ? 0.7 : 0;
    const geometry = feature.getGeometry() as LineString;
    const [r, g, b] = asArray(this.mapTheme.palette().aisCogLine);
    const color = `rgba(${r},${g},${b},${opacity})`;
    const styles: Style[] = [
      new Style({
        stroke: new Stroke({
          color: color,
          width: 1,
          lineDash: [5, 5]
        })
      })
    ];
    geometry.forEachSegment((_start: Coordinate, end: Coordinate) => {
      styles.push(
        new Style({
          geometry: new Point(end),
          image: new Circle({
            radius: 2,
            stroke: new Stroke({
              color: color,
              width: 1
            }),
            fill: COG_SEGMENT_FILL
          })
        })
      );
    });
    return styles;
  }

  // ok to show cog lines
  okToRenderCogLines() {
    return this.cogLineLength !== 0 && this.mapZoom() >= this.labelMinZoom();
  }
}
