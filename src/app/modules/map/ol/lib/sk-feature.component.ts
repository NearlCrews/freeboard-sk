/** Freeboard Feature Layer Base Component
 * Abstract class for Freeboard Feature layers
 **/

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  input
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Fill, Text } from 'ol/style';
import { MapComponent } from './map.component';
import { Extent } from './models';
import { AsyncSubject } from 'rxjs';
import { LightTheme, DarkTheme } from './themes';

// Reusable label fills, keyed by the resolved color string. Avoids allocating
// a fresh Fill per feature per label refresh in setTextLabel().
const LABEL_FILL_CACHE = new Map<string, Fill>();
function getLabelFill(color: string): Fill {
  const cached = LABEL_FILL_CACHE.get(color);
  if (cached) {
    return cached;
  }
  const fill = new Fill({ color });
  LABEL_FILL_CACHE.set(color, fill);
  return fill;
}

@Component({
  selector: 'ol-map > fb-feature-layer',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FBFeatureLayerComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected theme = LightTheme;
  protected labelPrefixes: string[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  readonly darkMode = input(false);
  readonly labelMinZoom = input(10);
  readonly mapZoom = input(10);
  readonly opacity = input<number | undefined>(undefined);
  readonly visible = input<boolean | undefined>(undefined);
  readonly extent = input<Extent | undefined>(undefined);
  readonly zIndex = input<number | undefined>(undefined);
  readonly minResolution = input<number | undefined>(undefined);
  readonly maxResolution = input<number | undefined>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly layerProperties = input<Record<string, any> | undefined>(undefined);

  constructor(
    protected mapComponent: MapComponent,
    protected changeDetectorRef: ChangeDetectorRef
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    this.source = new VectorSource();
    const props = this.layerProperties() ?? {};
    this.layer = new VectorLayer({
      source: this.source,
      opacity: this.opacity(),
      visible: this.visible(),
      extent: this.extent(),
      zIndex: this.zIndex(),
      minResolution: this.minResolution(),
      maxResolution: this.maxResolution(),
      ...props
    });

    this.theme = this.darkMode() ? DarkTheme : LightTheme;

    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.addLayer(this.layer);
      map.render();
      this.layerReady.next(this.layer);
      this.layerReady.complete();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    const layer = this.layer;
    if (layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: Record<string, any> = {};
      for (const key in changes) {
        const change = changes[key];
        if (!change) continue;
        if (key === 'layerProperties') {
          layer.setProperties(properties, false);
        } else {
          properties[key] = change.currentValue;
        }
      }
      layer.setProperties(properties, false);

      this.handleAttributeChanges(changes);
    }
  }

  ngOnDestroy() {
    const map = this.mapComponent.getMap();
    if (this.layer && map) {
      map.removeLayer(this.layer);
      map.render();
      this.layer = null;
    }
  }

  protected handleAttributeChanges(changes: SimpleChanges) {
    const darkChange = changes['darkMode'];
    const minZoomChange = changes['labelMinZoom'];
    const mapZoomChange = changes['mapZoom'];
    const labelMinZoom = this.labelMinZoom();
    const mapZoom = this.mapZoom();
    if (darkChange) {
      this.theme = darkChange.currentValue ? DarkTheme : LightTheme;
      this.onDarkMode(darkChange.currentValue);
    } else if (minZoomChange && typeof mapZoom !== 'undefined') {
      this.onLabelMinZoomSet(minZoomChange.currentValue);
    } else if (mapZoomChange && typeof labelMinZoom !== 'undefined') {
      if (
        (mapZoomChange.currentValue >= labelMinZoom &&
          mapZoomChange.previousValue < labelMinZoom) ||
        (mapZoomChange.currentValue < labelMinZoom &&
          mapZoomChange.previousValue >= labelMinZoom)
      ) {
        this.onLabelZoomThreshold(mapZoomChange.currentValue >= labelMinZoom);
      }
    }
  }

  /** Called when dark mode is set / cleared.
   * @override
   * @param _isSet true when dark mode is set
   */
  onDarkMode(_isSet: boolean) {
    this.updateLabels();
  }

  /** Called when label zoom threshold is set.
   * @override
   * @param _value new threshold value
   */
  onLabelMinZoomSet(_value: number) {
    this.updateLabels();
  }

  /** Called when label zoom threshold crossed.
   * @override
   * @param _entered true when transition is from below to above threshold
   */
  onLabelZoomThreshold(_entered: boolean) {
    this.updateLabels();
  }

  /** update the labels of features with an id that contains
   * one of the values in this.match.
   */
  updateLabels() {
    if (!this.source) {
      return;
    }
    const prefixes = this.labelPrefixes;
    if (prefixes.length === 0) {
      return;
    }
    this.source.getFeatures().forEach((f: Feature) => {
      const id = f.getId() as string;
      if (prefixes.some((i: string) => id.includes(i))) {
        const s: Style = f.getStyle() as Style;
        f.setStyle(this.setTextLabel(s, f.get('name')));
      }
    });
  }

  /** return a Style with supplied label text
   * @param style openlayers Style containing text
   * @param text string containing
   */
  setTextLabel(style: Style, text: string): Style {
    if (!style || typeof style === 'function') {
      return style;
    }
    const targetStyle: Style | undefined = Array.isArray(style)
      ? (style[0] as Style | undefined)
      : style;
    const ts: Text | null = targetStyle?.getText() ?? null;
    if (ts) {
      ts.setText(Math.abs(this.mapZoom()) >= this.labelMinZoom() ? text : '');
      ts.setFill(getLabelFill(this.theme.labelText.color));
      if (targetStyle) {
        targetStyle.setText(ts);
      }
    }
    return style;
  }

  /** return a Style containing an image rotated to the supplied value
   * @param style openlayers Style containing an image
   * @param value angle in radians to rotate the image
   */
  setRotation(style: Style, value: number): Style {
    if (!style || typeof style === 'function') {
      return style;
    }
    const im = style.getImage();
    if (im) {
      im.setRotation(value ?? 0);
      style.setImage(im);
    }
    return style;
  }
}
