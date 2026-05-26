import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
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

  @Input() id?: string;
  @Input() activeId?: string;
  @Input() position?: Coordinate;
  @Input() heading = 0;
  @Input() vesselStyles?: Record<string, Style>;
  @Input() fixedLocation?: boolean;
  @Input() iconScale = 1;
  @Input() opacity?: number;
  @Input() visible?: boolean;
  @Input() extent?: Extent;
  @Input() zIndex?: number;
  @Input() minResolution?: number;
  @Input() maxResolution?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() layerProperties?: Record<string, any>;

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
    this.layer = new VectorLayer(
      Object.assign(this, { ...this.layerProperties })
    );

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
    const pos = this.position;
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
    this.vessel.setId(this.id ?? 'self');
    const s = this.buildStyle();
    if (s) {
      const im = (s as Style).getImage();
      if (im) {
        if (this.fixedLocation) {
          im.setRotation(0);
        } else {
          im.setRotation(this.heading);
        }
      }
      this.vessel.setStyle(s);
    }
  }

  // default self style with specified scale
  generateSelfStyle() {
    if (this.iconScale) {
      vesselIconDef.scale = Math.abs(this.iconScale);
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
    // default style with specified scale
    let cs: Style | undefined = this.selfStyle;

    if (this.vesselStyles) {
      // use supplied styles
      if (this.fixedLocation) {
        const fixed = this.vesselStyles['fixed'];
        if (fixed) {
          cs = fixed;
        }
      } else {
        if (this.activeId && this.activeId !== this.id) {
          const inactive = this.vesselStyles['inactive'];
          if (inactive) {
            cs = inactive;
          }
        } else {
          const def = this.vesselStyles['default'];
          if (def) {
            cs = def;
          }
        }
      }
    } else if (this.layerProperties?.['style']) {
      cs = this.layerProperties['style'] as Style;
    } else {
      // use default styles
      if (this.fixedLocation) {
        cs = fixedVesselStyle;
      } else {
        if (this.activeId && this.activeId !== this.id) {
          cs = inactiveVesselStyle;
        }
      }
    }
    return cs;
  }
}
