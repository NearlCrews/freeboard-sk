import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';

import TileLayer from 'ol/layer/Tile';
import { TileWMS, WMTS, XYZ } from 'ol/source';
import { optionsFromCapabilities } from 'ol/source/WMTS';

import { MapComponent } from '../map.component';
import { RASTER_TILE_CACHE_SIZE } from '../charts/tile-source.constants';
import { WmtsCapabilitiesService } from '../charts/wmts-capabilities.service';
import { FBInfoLayer, FBInfoLayers } from 'src/app/types';
import { SKInfoLayer } from 'src/app/modules/skresources';

import LayerGroup from 'ol/layer/Group';
import BaseLayer from 'ol/layer/Base';
import { Collection } from 'ol';

interface LiveLayer {
  layer: TileLayer;
  lastRefresh: number;
  infoLayer: SKInfoLayer;
}

interface LayerParam {
  id: string;
  param: Record<string, any>;
}

// ** Freeboard InfoLayer (live layer) **
@Component({
  selector: 'ol-map > fb-livelayer',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FreeboardLiveLayerComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() layerDefs?: FBInfoLayers;
  @Input() zIndex = 100; // start number for layer zIndex

  public params = input<LayerParam[]>();

  protected layerGroup: LayerGroup | null = null;
  private wmtsCache = inject(WmtsCapabilitiesService);
  private layerMap = new Map<string, LiveLayer>();
  private refreshTimer: ReturnType<typeof setInterval>;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
    this.refreshTimer = setInterval(() => this.onTimerTick(), 60000);

    effect(() => {
      const params = this.params();
      if (!Array.isArray(params)) return;
      params.forEach((p) => {
        const v = this.layerMap.get(p.id);
        if (!v) return;
        // update source params
        const src = v.layer.getSource();
        const sourceType = v.infoLayer.values?.sourceType;
        if (
          src &&
          typeof sourceType === 'string' &&
          sourceType.toLowerCase() === 'wms'
        ) {
          (src as TileWMS).updateParams(p.param);
        } else if (
          src &&
          typeof sourceType === 'string' &&
          sourceType.toLowerCase() === 'wmts'
        ) {
          (src as WMTS).updateDimensions(p.param);
        }
      });
    });
  }

  ngOnInit() {
    this.parseLayers(this.layerDefs);
  }

  ngOnChanges(changes: SimpleChanges) {
    for (const key in changes) {
      const change = changes[key];
      if (!change) continue;
      if (key === 'layerDefs' && !change.firstChange) {
        this.parseLayers(change.currentValue);
      }
    }
  }

  ngOnDestroy() {
    clearInterval(this.refreshTimer);
    this.clearlayers();
  }

  /** Process Refresh Timer tick */
  private onTimerTick() {
    const n = Date.now();
    //console.log('InfoLayer timer tick...', n);
    this.layerMap.forEach((v) => {
      //console.log(k, v.infoLayer.values.refreshInterval, v.lastRefresh, n - v.lastRefresh)
      const refreshInterval = v.infoLayer.values?.refreshInterval;
      if (
        typeof refreshInterval === 'number' &&
        refreshInterval > 0 &&
        n - v.lastRefresh >= refreshInterval
      ) {
        // refresh layer source
        const src = v.layer.getSource();
        src?.refresh();
        v.lastRefresh = n;
      }
    });
  }

  private clearlayers() {
    const map = this.mapComponent.getMap();
    if (this.layerGroup && map) {
      map.removeLayer(this.layerGroup);
    }
  }

  /** Process changes in layerDefs array */
  private async parseLayers(ld: FBInfoLayers | undefined = this.layerDefs) {
    if (!ld) return;
    const map = this.mapComponent.getMap();
    if (!map) return;
    let layerGroup = this.layerGroup;
    if (!layerGroup) {
      layerGroup = new LayerGroup({
        zIndex: this.zIndex
      });
      layerGroup.set('id', 'infogroup');
      map.addLayer(layerGroup);
      this.layerGroup = layerGroup;
    }

    const lc = new Collection<BaseLayer>();
    const ids: string[] = [];
    for (let i = 0; i < ld.length; i++) {
      const l = ld[i];
      if (!l) continue;
      ids.push(l[0]);
      const existing = this.layerMap.get(l[0]);
      if (!existing) {
        // add layer
        const layer = await this.buildLayer(l, String(i));
        if (layer) {
          this.layerMap.set(l[0], {
            layer: layer,
            lastRefresh: Date.now(),
            infoLayer: l[1]
          });
          lc.push(layer);
        }
      } else {
        // update layer
        const layer = existing.layer;

        if (layer.getOpacity() !== (l[1].values?.opacity ?? 1)) {
          layer.setOpacity(l[1].values?.opacity ?? 1);
        }
        if (layer.getMinZoom() !== (l[1].values?.minZoom ?? 1)) {
          layer.setMinZoom(l[1].values?.minZoom ?? 1);
        }
        if (layer.getMaxZoom() !== (l[1].values?.maxZoom ?? 24)) {
          layer.setMaxZoom(l[1].values?.maxZoom ?? 24);
        }
        this.layerMap.set(l[0], {
          layer: layer,
          lastRefresh: Date.now(),
          infoLayer: l[1]
        });
        lc.push(layer);
      }
    }
    layerGroup.setLayers(lc);
    map.render();
    // clean-up layerMap
    const keep = new Set(ids);
    for (const arid of this.layerMap.keys()) {
      if (!keep.has(arid)) {
        this.layerMap.delete(arid);
      }
    }
  }

  /** @returns TileLayer */
  private async buildLayer(
    ldef: FBInfoLayer,
    index: string
  ): Promise<TileLayer | undefined> {
    let source: TileWMS | WMTS | XYZ | undefined;
    if (ldef[1].type === 'InfoLayer') {
      const sourceType = ldef[1].values?.sourceType;
      const normalized =
        typeof sourceType === 'string' ? sourceType.toLowerCase() : '';
      if (normalized === 'wms') {
        source = this.setWMSSource(ldef);
      } else if (normalized === 'wmts') {
        source = await this.setWMTSSource(ldef);
      } else if (normalized === 'xyz') {
        source = new XYZ({
          url: ldef[1].values?.url,
          cacheSize: RASTER_TILE_CACHE_SIZE
        });
      }
      const layer = new TileLayer({
        source: source,
        preload: 0,
        zIndex: this.zIndex + parseInt(index),
        minZoom: ldef[1].values?.minZoom ?? 1,
        maxZoom: ldef[1].values?.maxZoom ?? 24,
        opacity: ldef[1].values?.opacity ?? 1
      });
      layer.set('id', ldef[0]);
      return layer;
    }
    return undefined;
  }

  /** remove layer and render map */
  private removeLayer(id: string) {
    const map = this.mapComponent.getMap();
    if (!map) return;
    const entry = this.layerMap.get(id);
    if (!entry || !this.layerGroup) return;
    const lc = this.layerGroup.getLayers();
    lc.remove(entry.layer);
    map.render();
  }

  /** @returns WMS tile source */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setWMSSource(ldef: any): TileWMS {
    return new TileWMS({
      url: ldef[1].values?.url,
      params: {
        LAYERS: ldef[1].values?.layers ? ldef[1].values?.layers.join(',') : ''
      },
      cacheSize: RASTER_TILE_CACHE_SIZE
    });
  }

  /** @returns WMTS source */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async setWMTSSource(ldef: any): Promise<WMTS | undefined> {
    let result: unknown;
    try {
      result = await this.wmtsCache.getCapabilities(ldef[1].values?.url);
    } catch {
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = optionsFromCapabilities(result as any, {
      layer: ldef[1].values?.layers[0],
      matrixSet: 'EPSG:3857'
    });
    if (!options) return undefined;
    return new WMTS({ ...options, cacheSize: RASTER_TILE_CACHE_SIZE });
  }
}
