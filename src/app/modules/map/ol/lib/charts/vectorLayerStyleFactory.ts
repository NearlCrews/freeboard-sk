import { Injectable } from '@angular/core';
import { SKChart } from 'src/app/modules';
import { S57Service } from './s57.service';
import { VECTOR_TILE_CACHE_SIZE } from './tile-source.constants';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { Extent } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import { MVT } from 'ol/format';
import type Feature from 'ol/Feature';
import type { StyleFunction } from 'ol/style/Style';
import type { OrderFunction } from 'ol/render';

// S57Style and its ~1200-line symbol/style dispatch table are loaded only
// when the first S57 chart layer is created. ESM `import()` is
// spec-guaranteed to return the same Promise for repeat calls of the same
// specifier, so no manual cache is needed.
type S57StyleModule = typeof import('./s57Style');

export abstract class VectorLayerStyler {
  public MinZ: number;
  public MaxZ: number;

  constructor(public chart: SKChart) {
    this.MinZ =
      this.chart.minZoom && this.chart.minZoom >= 0.1
        ? this.chart.minZoom - 0.1
        : this.chart.minZoom;
    this.MaxZ = this.chart.maxZoom;
  }

  public abstract ApplyStyle(vectorLayer: VectorTileLayer<never>): void;
  public abstract CreateLayer(): VectorTileLayer<never>;
}

class S57LayerStyler extends VectorLayerStyler {
  constructor(
    chart: SKChart,
    private s57service: S57Service,
    private S57StyleCtor: S57StyleModule['S57Style']
  ) {
    super(chart);
  }

  public CreateLayer(): VectorTileLayer<never> {
    let extent: Extent | undefined;
    if (this.chart.bounds && this.chart.bounds.length > 0) {
      extent = transformExtent(this.chart.bounds, 'EPSG:4326', 'EPSG:3857');
    }
    return new VectorTileLayer({ declutter: true, extent: extent });
  }

  public ApplyStyle(vectorLayer: VectorTileLayer<never>) {
    const source = new VectorTileSource({
      url: this.chart.url,
      minZoom: this.chart.minZoom,
      maxZoom: this.chart.maxZoom,
      format: new MVT({}),
      tileSize: 256,
      cacheSize: VECTOR_TILE_CACHE_SIZE
    });

    const style = new this.S57StyleCtor(this.s57service);

    vectorLayer.setSource(source as never);
    vectorLayer.setPreload(0);
    // FeatureLike (= Feature | RenderFeature) vs Feature variance is the
    // only reason for these casts: S57Style narrows to Feature internally.
    vectorLayer.setStyle(style.getStyle as unknown as StyleFunction);
    vectorLayer.setMinZoom(this.chart.minZoom);
    vectorLayer.setMaxZoom(23);
    vectorLayer.setRenderOrder(style.renderOrder as unknown as OrderFunction);

    this.s57service.refresh.subscribe(() => {
      source.refresh();
    });

    // S-52 SAFCON prerender pass: every freshly-loaded tile gets its
    // features fed through `updateSafeContour` before the next render, so
    // depth-contour styling stays consistent as tiles stream in. Without
    // this hook, getStyle's per-feature pass eventually converges, but the
    // FIRST frame after a tile load uses an old `selectedSafeContour` value
    // for features styled earlier in the same render.
    source.on('tileloadend', (event) => {
      const tile = (event as { tile?: { getFeatures?: () => Feature[] } }).tile;
      const features = tile?.getFeatures?.();
      if (!features || features.length === 0) return;
      let changed = false;
      for (const feature of features) {
        if (style.updateSafeContour(feature)) {
          changed = true;
        }
      }
      if (changed) {
        vectorLayer.changed();
      }
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class VectorLayerStyleFactory {
  constructor(private s57service: S57Service) {}

  public async CreateVectorLayerStyler(
    chart: SKChart
  ): Promise<VectorLayerStyler> {
    if (chart.type === 'S-57' || chart.type === 's-57') {
      this.s57service.fetchSymbols();
      const { S57Style } = await import('./s57Style');
      return new S57LayerStyler(chart, this.s57service, S57Style);
    }
    throw new Error(`Unsupported chart type for vector layer: ${chart.type}`);
  }
}
