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
import { Style, Icon } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { Extent, Coordinate } from '../models';
import { AsyncSubject } from 'rxjs';
import { Options } from 'ol/style/Icon';

const vesselIconDef = {
  src: './assets/img/vessels/self.png',
  anchor: [9.5, 22.5],
  anchorXUnits: 'pixels',
  anchorYUnits: 'pixels',
  size: [50, 50],
  scale: 0.9, //0.75,
  rotateWithView: true
};

const inactiveVesselStyle = new Style({
  image: new Icon({
    src: './assets/img/vessels/self_blur.png',
    anchor: [9.5, 22.5],
    anchorXUnits: 'pixels',
    anchorYUnits: 'pixels',
    size: [50, 50],
    scale: 0.75,
    rotateWithView: true
  })
});

const fixedVesselStyle = new Style({
  image: new Icon({
    src: './assets/img/vessels/self_fixed.png',
    anchor: [22.5, 50],
    anchorXUnits: 'pixels',
    anchorYUnits: 'pixels',
    size: [50, 50],
    scale: 0.5,
    rotateWithView: false
  })
});

// ** Freeboard Vessel component **
@Component({
  selector: 'ol-map > fb-vessel',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class VesselComponent implements OnInit, OnDestroy, OnChanges {
  protected layer: Layer | null = null;
  public source!: VectorSource;
  protected features: Feature[] = [];

  /**
   * This event is triggered after the layer is initialized
   * Use this to have access to the layer and some helper functions
   */
  @Output() layerReady = new AsyncSubject<Layer>();

  readonly id = input<string | undefined>(undefined);
  readonly activeId = input<string | undefined>(undefined);
  readonly position = input<Coordinate | undefined>(undefined);
  readonly heading = input(0);
  readonly vesselStyles = input<Record<string, Style> | undefined>(undefined);
  readonly fixedLocation = input<boolean | undefined>(undefined);
  readonly iconScale = input(1);
  readonly opacity = input<number | undefined>(undefined);
  readonly visible = input<boolean | undefined>(undefined);
  readonly extent = input<Extent | undefined>(undefined);
  readonly zIndex = input<number | undefined>(undefined);
  readonly minResolution = input<number | undefined>(undefined);
  readonly maxResolution = input<number | undefined>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly layerProperties = input<Record<string, any> | undefined>(undefined);

  vessel?: Feature;
  selfStyle?: Style;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  ngOnInit() {
    const fa: Feature[] = [];
    this.parseVessel();
    if (this.vessel) {
      fa.push(this.vessel);
    }

    this.source = new VectorSource({ features: fa });
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
        if (
          key === 'id' ||
          key === 'activeId' ||
          key === 'position' ||
          key === 'heading'
        ) {
          if (this.source) {
            this.parseVessel();
          }
        } else if (key === 'vesselStyles' || key === 'iconScale') {
          if (this.source) {
            this.generateSelfStyle();
            this.parseVessel();
          }
        } else if (key === 'layerProperties') {
          layer.setProperties(properties, false);
        } else {
          properties[key] = change.currentValue;
        }
      }
      layer.setProperties(properties, false);
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

  parseVessel() {
    const pos = this.position();
    if (!this.vessel) {
      // create feature
      this.vessel = new Feature(
        new Point(fromLonLat([pos?.[0] ?? 0, pos?.[1] ?? 0]))
      );
    }
    // update feature
    if (pos && Array.isArray(pos) && pos.length > 1) {
      const g = this.vessel.getGeometry();
      if (g) {
        (g as Point).setCoordinates(fromLonLat([pos[0] ?? 0, pos[1] ?? 0]));
      }
    }
    this.vessel.setId(this.id() ?? 'self');
    const s = this.buildStyle();
    if (s) {
      const im = (s as Style).getImage();
      if (im) {
        if (this.fixedLocation()) {
          im.setRotation(0);
        } else {
          im.setRotation(this.heading());
        }
      }
      this.vessel.setStyle(s);
    }
  }

  // default self style with specified scale
  generateSelfStyle() {
    const scale = this.iconScale();
    if (scale) {
      vesselIconDef.scale = Math.abs(scale);
    }
    this.selfStyle = new Style({
      image: new Icon(vesselIconDef as Options)
    });
  }

  // build target style
  buildStyle(): Style | undefined {
    if (!this.selfStyle) {
      this.generateSelfStyle();
    }
    let cs: Style | undefined = this.selfStyle;
    const vesselStyles = this.vesselStyles();
    const fixedLocation = this.fixedLocation();
    const activeId = this.activeId();
    const isInactive = !fixedLocation && !!activeId && activeId !== this.id();

    if (vesselStyles) {
      if (fixedLocation) {
        cs = vesselStyles['fixed'] ?? cs;
      } else if (isInactive) {
        cs = vesselStyles['inactive'] ?? cs;
      } else {
        cs = vesselStyles['default'] ?? cs;
      }
      return cs;
    }
    const layerProperties = this.layerProperties();
    if (layerProperties?.['style']) {
      return layerProperties['style'] as Style;
    }
    if (fixedLocation) {
      return fixedVesselStyle;
    }
    if (isInactive) {
      return inactiveVesselStyle;
    }
    return cs;
  }
}
