/**
 * WebGLAISLayerComponent
 *
 * Renders AIS targets via OL `WebGLPointsLayer` for high-count scenarios
 * (>~50 targets) where the canvas-based `AISTargetsLayerComponent` becomes a
 * paint bottleneck. Drop-in input contract with `AISBaseLayerComponent`:
 * targets, targetContext, mapZoom, layerProperties.
 *
 * The component intentionally renders only the point glyph (color + radius);
 * label rendering stays with the canvas layer because flat-style text on
 * WebGLPoints does not yet match the visual quality of `ol/style/Text`.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component
} from '@angular/core';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import WebGLPointsLayer from 'ol/layer/WebGLPoints';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import {
  AISBaseLayerComponent,
  SKTarget
} from '../resources/ais-base.component';
import { DarkTheme, LightTheme } from '../themes';
import {
  AIS_DEFAULT_OPACITY,
  AIS_DEFAULT_RADIUS,
  AIS_STALE_OPACITY,
  buildAisPointsStyle,
  colorForShipType
} from './ais-points-style';

@Component({
  selector: 'ol-map > sk-ais-webglpoints',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class WebGLAISLayerComponent extends AISBaseLayerComponent {
  private webglLayer: WebGLPointsLayer<VectorSource> | null = null;

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    this.source = new VectorSource();
    this.theme = this.darkMode() ? DarkTheme : LightTheme;
    const map = this.mapComponent.getMap();
    if (!map) {
      return;
    }

    const props = this.layerProperties() ?? {};
    this.webglLayer = new WebGLPointsLayer<VectorSource>({
      source: this.source,
      style: buildAisPointsStyle(),
      opacity: this.opacity(),
      visible: this.visible(),
      extent: this.extent(),
      zIndex: this.zIndex(),
      minResolution: this.minResolution(),
      maxResolution: this.maxResolution(),
      properties: { ...props }
    });
    this.assignLayer(this.webglLayer);

    map.addLayer(this.webglLayer);
    map.render();
    this.layerReady.next(this.webglLayer);
    this.layerReady.complete();

    this.labelPrefixes = [this.targetContext];
    this.onReloadTargets();
  }

  private assignLayer(layer: WebGLPointsLayer<VectorSource>) {
    (this as unknown as { layer: WebGLPointsLayer<VectorSource> }).layer =
      layer;
  }

  override ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.webglLayer && map) {
      map.removeLayer(this.webglLayer);
      this.webglLayer.dispose();
      this.webglLayer = null;
      map.render();
    }
  }

  override onReloadTargets() {
    if (!this.source) return;
    this.source.clear();
    this.extractKeys(this.targets).forEach((id) => this.addTargetWithId(id));
  }

  override onUpdateTargets(ids: string[]) {
    if (!this.source) return;
    ids.forEach((id) => {
      if (!id.includes(this.targetContext)) return;
      const existing = this.source.getFeatureById(id) as Feature | null;
      if (!this.okToRenderTarget(id) || !this.targets.has(id)) {
        if (existing) this.source.removeFeature(existing);
        return;
      }
      const target = this.targets.get(id);
      if (!target) return;
      if (existing) {
        this.applyTargetToFeature(existing, target);
      } else {
        this.addTargetWithId(id);
      }
    });
  }

  override onRemoveTargets(ids: string[]) {
    if (!this.source) return;
    ids.forEach((id) => {
      if (!id.includes(this.targetContext)) return;
      const f = this.source.getFeatureById(id) as Feature | null;
      if (f) this.source.removeFeature(f);
    });
  }

  private addTargetWithId(id: string) {
    if (
      !id.includes(this.targetContext) ||
      !this.targets.has(id) ||
      !this.okToRenderTarget(id)
    ) {
      return;
    }
    const target = this.targets.get(id);
    if (!target || !target.position) return;
    const f = new Feature({
      geometry: new Point(fromLonLat(target.position as [number, number]))
    });
    f.setId(id);
    this.applyTargetToFeature(f, target);
    this.source.addFeature(f);
  }

  private applyTargetToFeature(feature: Feature, target: SKTarget) {
    if (target.position) {
      feature.setGeometry(
        new Point(fromLonLat(target.position as [number, number]))
      );
    }
    feature.set('color', colorForShipType(target.type?.id), true);
    feature.set('iconScale', AIS_DEFAULT_RADIUS, true);
    feature.set(
      'opacity',
      this.isStale(target) ? AIS_STALE_OPACITY : AIS_DEFAULT_OPACITY,
      true
    );
    feature.set('name', this.buildLabel(target), true);
  }
}
