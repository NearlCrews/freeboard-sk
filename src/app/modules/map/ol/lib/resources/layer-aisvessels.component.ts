import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Fill, Stroke, Circle, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { Point, LineString } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent } from './ais-base.component';
import { SKVessel } from 'src/app/modules/skresources';
import { fromLonLatArray } from '../util';
import { MapImageRegistry } from '../map-image-registry.service';

// ** Signal K AIS Vessel targets **
@Component({
  selector: 'ol-map > sk-ais-vessels',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISVesselsLayerComponent extends AISBaseLayerComponent {
  @Input() cogLineLength = 0;

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
    ids.forEach((id: string) => {
      if (id.includes(this.targetContext)) {
        if (this.okToRenderTarget(id)) {
          if (this.targets.has(id)) {
            const f = this.source.getFeatureById('ais-' + id) as Feature | null;
            if (f) {
              const target = this.targets.get(id) as SKVessel | undefined;
              if (!target) return;
              const label = this.buildLabel(target);
              if (target.position) {
                f.setGeometry(
                  new Point(fromLonLat(target.position as [number, number]))
                );
              }
              const built = this.buildVesselStyle(
                target,
                label,
                this.isStale(target)
              );
              if (!built) return;
              const s = built.clone();
              f.set('name', label, true);
              f.setStyle(
                this.setTextLabel(
                  this.setRotation(s, target.orientation),
                  label
                )
              );
              this.parseCogLine(id, target);
            } else {
              this.addTargetWithId(id);
            }
          }
        } else {
          this.onRemoveTargets([id]);
        }
      }
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
    } else if (this.layerProperties?.['style']) {
      s = this.layerProperties['style'] as Style;
    } else {
      if (target.id === this.focusId) {
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
      !this.okToRenderCogLines ||
      !this.okToRenderTarget(id) ||
      !target.position
    ) {
      if (cf) {
        this.source.removeFeature(cf);
      }
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cogCoords = fromLonLatArray(target.vectors.cog as any) as any;
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
      this.targets.forEach((v, k) => {
        this.parseCogLine(k, v as SKVessel);
      });
    } else {
      this.source.forEachFeature((cl) => {
        const fid = cl.getId();
        if (typeof fid === 'string' && fid.includes('cog-')) {
          this.source.removeFeature(cl);
        }
      });
    }
  }

  // build COG vector style
  buildCogLineStyle(id: string, feature: Feature) {
    const opacity =
      this.okToRenderTarget(id) && this.okToRenderCogLines() ? 0.7 : 0;
    const geometry = feature.getGeometry() as LineString;
    const color = `rgba(0,0,0, ${opacity})`;
    const styles: Style[] = [];
    styles.push(
      new Style({
        stroke: new Stroke({
          color: color,
          width: 1,
          lineDash: [5, 5]
        })
      })
    );
    geometry.forEachSegment((start: Coordinate, end: Coordinate) => {
      styles.push(
        new Style({
          geometry: new Point(end),
          image: new Circle({
            radius: 2,
            stroke: new Stroke({
              color: color,
              width: 1
            }),
            fill: new Fill({ color: 'transparent' })
          })
        })
      );
    });
    return styles;
  }

  // ok to show cog lines
  okToRenderCogLines() {
    return this.cogLineLength !== 0 && this.mapZoom >= this.labelMinZoom;
  }
}
