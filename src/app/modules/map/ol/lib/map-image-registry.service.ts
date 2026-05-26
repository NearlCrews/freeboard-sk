import { Injectable } from '@angular/core';
import { Circle, Fill, Icon, Stroke } from 'ol/style';
import {
  getAtoNDefs,
  ATON_TYPE_IDS,
  getPoiDefs,
  getVesselDefs,
  getWaypointDefs,
  AIS_TYPE_IDS,
  AIS_MOORED_STYLE_IDS
} from 'src/app/modules/icons';

type MapImageCollection = Record<string | number, Icon>;

interface MapImages {
  atons: MapImageCollection;
  poi: MapImageCollection;
  vessels: MapImageCollection;
  waypoints: MapImageCollection;
}

export interface MapIconDef {
  path: string;
  scale?: number;
  anchor?: [number, number];
}

@Injectable({
  providedIn: 'root'
})
export class MapImageRegistry {
  private icons: MapImages = {
    atons: {},
    poi: {},
    vessels: {},
    waypoints: {}
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private atonImageDefs: any = {
    virtual: {},
    real: {}
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private poiImageDefs: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private vesselImageDefs: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private waypointImageDefs: any = {};

  constructor() {
    this.atonImageDefs = getAtoNDefs();
    this.poiImageDefs = getPoiDefs();
    this.vesselImageDefs = getVesselDefs();
    this.waypointImageDefs = getWaypointDefs();
  }

  /**
   * @description Returns image for the supplied AtoN identifier
   * @param id AtoN identifier
   * @param virtual true = virtual AtoN, false = real AtoN
   * @returns Icon object
   */
  getAtoN(id: number | string, virtual?: boolean): Icon {
    const typeIds = ATON_TYPE_IDS as unknown as Record<string, string>;
    const vid = typeIds[String(id)] ?? 'aton';
    if (!this.icons.atons[vid]) {
      this.buildIcon(
        this.icons.atons,
        virtual ? this.atonImageDefs.virtual : this.atonImageDefs.real,
        vid
      );
    }
    return (this.icons.atons[vid] ?? this.icons.atons['aton']) as Icon;
  }

  /**
   * @description Returns image for the supplied AIS shipType identifier
   * @param id  AIS shipType identifier
   * @returns Icon | Circle style object
   */
  getVessel(id: number | string, moored?: boolean): Icon | Circle {
    if (moored) {
      const mooredStyles = AIS_MOORED_STYLE_IDS as unknown as Record<
        string,
        [string, string]
      >;
      const s = mooredStyles[String(id)] ?? mooredStyles['default'] ?? ['', ''];
      return new Circle({
        radius: 5,
        stroke: new Stroke({
          width: 2,
          color: s[0]
        }),
        fill: new Fill({
          color: s[1]
        })
      });
    } else {
      const typeIds = AIS_TYPE_IDS as unknown as Record<string, string>;
      const vid = typeIds[String(id)] ?? 'default';
      if (!this.icons.vessels[vid]) {
        this.buildIcon(this.icons.vessels, this.vesselImageDefs, vid, true);
      }
      return (this.icons.vessels[vid] ?? this.icons.vessels['default']) as Icon;
    }
  }

  /**
   * @description Returns image for the supplied Point of Interest identifier
   * @param id Point of Interest identifier
   * @returns Icon object
   */
  getPOI(id: string): Icon {
    id = id ?? 'default';
    if (!this.icons.poi[id]) {
      this.buildIcon(this.icons.poi, this.poiImageDefs, id);
    }
    return (this.icons.poi[id] ?? this.icons.poi['default']) as Icon;
  }

  /**
   * @description Returns image for the supplied Waypoint type
   * @param type Waypoint type
   * @returns Icon object
   */
  getWaypoint(type: string, skIcon?: string): Icon {
    type = !type ? 'default' : type;
    const wid = skIcon ?? type;
    if (!this.icons.waypoints[wid]) {
      this.buildIcon(this.icons.waypoints, this.waypointImageDefs, wid);
    }
    return (this.icons.waypoints[wid] ??
      this.icons.waypoints[type] ??
      this.icons.waypoints['default']) as Icon;
  }

  /**
   * @description Build Icon object into the selected group
   * @param group Reference to the image group to place the icon.
   * @param iconDef Icon definitions
   * @param id Icon identifier
   * @param rotate Rotate icon with view (default=false)
   * @returns
   */
  private buildIcon(
    group: MapImageCollection,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    iconDef: Record<string, any>,
    id: number | string,
    rotate = false
  ) {
    const def = iconDef[id];
    if (!def) return;
    group[id] = new Icon({
      src: def.path,
      scale: def.scale,
      anchor: def.anchor,
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      rotateWithView: rotate,
      rotation: 0
    });
  }
}
