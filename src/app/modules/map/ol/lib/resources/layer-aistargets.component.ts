import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Fill, Stroke, Text } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { AISBaseLayerComponent, SKTarget } from './ais-base.component';
import { MapImageRegistry } from '../map-image-registry.service';

// ** Signal K non-vessel targets **
@Component({
  selector: 'ol-map > sk-ais-targets',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AISTargetsLayerComponent extends AISBaseLayerComponent {
  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = [this.targetContext];
  }

  // reload all Features from this.targets
  override onReloadTargets() {
    this.extractKeys(this.targets).forEach((id) => {
      this.addTargetWithId(id);
    });
  }

  // update targets
  override onUpdateTargets(ids: string[]) {
    ids.forEach((id: string) => {
      if (id.includes(this.targetContext)) {
        const f = this.source.getFeatureById(id) as Feature | null;
        if (this.okToRenderTarget(id)) {
          if (this.targets.has(id)) {
            if (f) {
              const target = this.targets.get(id);
              if (!target) return;
              const label = this.buildLabel(target);
              if (target.position) {
                f.setGeometry(
                  new Point(fromLonLat(target.position as [number, number]))
                );
              }
              const built = this.buildStyle(target);
              if (!built) return;
              const s = built.clone();
              f.set('name', label, true);
              f.setStyle(
                this.setTextLabel(
                  this.setRotation(s, target.orientation),
                  label
                )
              );
            } else {
              this.addTargetWithId(id);
            }
          }
        } else if (f) {
          this.source.removeFeature(f);
        }
      }
    });
  }

  // remove target features
  override onRemoveTargets(ids: string[]) {
    ids.forEach((id) => {
      if (id.includes(this.targetContext)) {
        const f = this.source.getFeatureById(id) as Feature | null;
        if (f) {
          this.source.removeFeature(f);
        }
      }
    });
  }

  // add new target
  addTargetWithId(id: string) {
    if (!id.includes(this.targetContext) || !this.targets.has(id)) {
      return;
    }
    const target = this.targets.get(id);
    if (!target) return;
    const label = this.buildLabel(target);
    if (target.position) {
      const f = new Feature({
        geometry: new Point(fromLonLat(target.position as [number, number])),
        name: target.name
      });
      f.setId(id);
      f.set('name', label, true);
      const built = this.buildStyle(target);
      if (!built) return;
      const s = built.clone();
      f.setStyle(
        this.setTextLabel(this.setRotation(s, target.orientation), label)
      );
      this.source.addFeature(f);
    }
  }

  // build target style
  buildStyle(target: SKTarget): Style | undefined {
    const typeId = target.type?.id;
    const icon =
      typeof typeId === 'number' || typeof typeId === 'string'
        ? this.mapImages.getAtoN(typeId, target.virtual)
        : undefined;
    if (icon && typeof this.targetStyles === 'undefined') {
      return new Style({
        image: icon,
        text: new Text({
          text: '',
          offsetX: 0,
          offsetY: -18
        })
      });
    }
    let s: Style | undefined;
    const setStale = this.isStale(target);
    if (typeof this.targetStyles !== 'undefined') {
      if (setStale) {
        s = this.targetStyles['inactive'] ?? this.targetStyles['default'];
      } else {
        s = this.targetStyles['default'];
      }
    } else if (this.layerProperties?.['style']) {
      s = this.layerProperties['style'] as Style;
    } else {
      s = new Style({
        image: new RegularShape({
          points: 3,
          radius: 7,
          fill: new Fill({ color: 'magenta' }),
          stroke: new Stroke({
            color: 'black',
            width: 1
          }),
          rotateWithView: true
        })
      });
    }
    return s;
  }
}
