import { Injectable, signal } from '@angular/core';
import { Map } from 'ol';
import BaseLayer from 'ol/layer/Base';
import { Extent } from 'ol/extent';
import { get as getProj } from 'ol/proj';
import { register } from 'ol/proj/proj4.js';
// proj4 2.6.2 ships no bundled .d.ts. The /// declaration below ambient
// types it as any for this consumer; the planned proj4 bump in the
// Phase 4b map track will pull in the official types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
const proj4 = require('proj4') as any;

export interface FeatureUrl {
  id: string;
  name: string;
  type: 'chart';
  subType: 'wms';
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapService {
  maps: Map[];

  private _featureInfo = signal<FeatureUrl[]>([]);
  public readonly featureUrls = this._featureInfo.asReadonly();

  constructor() {
    this.maps = [];
  }

  /**
   * Retrieves all the maps
   */
  getMaps(): Map[] {
    return this.maps;
  }

  /**
   * Returns a map object from the maps array
   */
  getMapById(id: string): Map | null {
    let map: Map | null = null;
    for (let i = 0; i < this.maps.length; i++) {
      const candidate = this.maps[i];
      if (candidate && candidate.getTarget() === id) {
        map = candidate;
        break;
      }
    }
    return map;
  }

  getLayerByKey(key: string, value: string): BaseLayer | undefined {
    let tl: BaseLayer | undefined;
    this.maps.forEach((map) => {
      map.getLayers().forEach((layer) => {
        if (layer.get(key) === value) {
          tl = layer;
        }
      });
    });
    return tl;
  }

  addMap(map: Map): void {
    this.maps.push(map);
  }

  updateSize() {
    this.maps.forEach((map) => {
      map.updateSize();
    });
  }

  addProj4(epsg: string, proj4Def: string, extent?: Extent) {
    let projection = getProj(epsg);
    if (!projection) {
      proj4.defs(epsg, proj4Def);
      register(proj4);
      projection = getProj(epsg);
      if (projection && extent) {
        projection.setExtent(extent);
      }
    }
    if (!projection) {
      console.error(`Failed to register ${epsg} projection in OpenLayers`);
    }
  }

  addFeatureUrls(v: FeatureUrl | FeatureUrl[]) {
    this._featureInfo.update((current) => {
      if (Array.isArray(v)) {
        return current.concat(v);
      } else {
        current.push(v);
        return current;
      }
    });
  }

  clearFeatureUrls() {
    this._featureInfo.set([]);
  }
}
