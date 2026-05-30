import { Injectable, signal } from '@angular/core';
import { Map } from 'ol';
import BaseLayer from 'ol/layer/Base';
import { Extent } from 'ol/extent';
import { get as getProj } from 'ol/proj';
import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4';

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
  maps: Map[] = [];

  private _featureInfo = signal<FeatureUrl[]>([]);
  public readonly featureUrls = this._featureInfo.asReadonly();

  getMaps(): Map[] {
    return this.maps;
  }

  getMapById(id: string): Map | null {
    for (const candidate of this.maps) {
      if (candidate.getTarget() === id) {
        return candidate;
      }
    }
    return null;
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
    this._featureInfo.update((current) =>
      Array.isArray(v) ? current.concat(v) : [...current, v]
    );
  }

  clearFeatureUrls() {
    this._featureInfo.set([]);
  }
}
