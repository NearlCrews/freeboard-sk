import DataTile from 'ol/source/DataTile';
import TileLayer from 'ol/layer/Tile';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import { XYZ } from 'ol/source';
import TileState from 'ol/TileState';
import type ImageTile from 'ol/ImageTile';
import type VectorTile from 'ol/VectorTile';
import type { Extent } from 'ol/extent';
import type { default as Projection } from 'ol/proj/Projection';
import type { SKChart } from 'src/app/modules/skresources';
import {
  RASTER_TILE_CACHE_SIZE,
  VECTOR_TILE_CACHE_SIZE
} from './tile-source.constants';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';

// Lazy-load pmtiles so the v4 decoder stays out of the eager main bundle.
// The first call to any PMTiles initializer triggers the chunk; the module
// promise is cached so subsequent calls reuse the same resolved module.
let pmtilesModulePromise: Promise<typeof import('pmtiles')> | undefined;
function loadPmtilesModule(): Promise<typeof import('pmtiles')> {
  if (pmtilesModulePromise === undefined) {
    pmtilesModulePromise = import('pmtiles');
  }
  return pmtilesModulePromise;
}

// OpenLayers builds the tile URL via the template, so we have to parse z/x/y
// back out here. Hoisted to module scope to avoid recompiling per tile load.
const PMTILES_URL_PATTERN = /pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/;

// create a PMTile WebGLtile layer
export async function initPMTilesWebGLLayer(
  url: string,
  minZoom: number,
  maxZoom: number,
  zIndex: number
): Promise<WebGLTileLayer> {
  const { PMTiles } = await loadPmtilesModule();
  const tiles = new PMTiles(url);

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', () => reject(new Error('load failed')));
      img.src = src;
    });
  }

  async function loader(
    z: number,
    x: number,
    y: number
  ): Promise<HTMLImageElement> {
    const response = await tiles.getZxy(z, x, y);
    if (!response) {
      throw new Error('pmtiles tile not found');
    }
    const blob = new Blob([response.data]);
    const src = URL.createObjectURL(blob);
    try {
      return await loadImage(src);
    } finally {
      URL.revokeObjectURL(src);
    }
  }

  return new WebGLTileLayer({
    source: new DataTile({
      loader,
      wrapX: true,
      maxZoom: maxZoom,
      minZoom: minZoom
    }),
    style: {},
    zIndex: zIndex
  });
}

// create a PMTile XYZ source TileLayer
export async function initPMTilesXYZLayer(
  chart: SKChart,
  zIndex: number
): Promise<TileLayer<XYZ>> {
  const { PMTiles } = await loadPmtilesModule();
  const tiles = new PMTiles(chart.url);

  function loader(tile: ImageTile, url: string): void {
    tile.setState(TileState.LOADING);
    const result = PMTILES_URL_PATTERN.exec(url);
    if (!result) {
      tile.setState(TileState.ERROR);
      return;
    }
    const z = +result[2];
    const x = +result[3];
    const y = +result[4];

    void tiles.getZxy(z, x, y).then((tile_result) => {
      if (tile_result) {
        const blob = new Blob([tile_result.data]);
        const imageUrl = URL.createObjectURL(blob);
        (tile.getImage() as HTMLImageElement).src = imageUrl;
        tile.setState(TileState.LOADED);
      } else {
        tile.setState(TileState.EMPTY);
      }
    });
  }

  return new TileLayer({
    source: new XYZ({
      tileLoadFunction: loader,
      tileSize: [512, 512],
      url: 'pmtiles://' + chart.url + '/{z}/{x}/{y}',
      wrapX: true,
      maxZoom: chart.maxZoom,
      minZoom: chart.minZoom,
      cacheSize: RASTER_TILE_CACHE_SIZE
    }),
    zIndex: zIndex,
    opacity: chart.defaultOpacity ?? 1
  });
}

// create a PMTile Vector layer
export async function initPMTilesVectorLayer(
  chart: SKChart,
  zIndex: number
): Promise<VectorTileLayer> {
  const { PMTiles } = await loadPmtilesModule();
  const tiles = new PMTiles(chart.url);

  function loader(tile: VectorTile<never>, url: string): void {
    const result = PMTILES_URL_PATTERN.exec(url);
    if (!result) {
      tile.setState(TileState.ERROR);
      return;
    }
    const z = +result[2];
    const x = +result[3];
    const y = +result[4];

    tile.setLoader(
      (extent: Extent, _resolution: number, projection: Projection) => {
        tile.setState(TileState.LOADING);
        void tiles.getZxy(z, x, y).then((tile_result) => {
          if (tile_result) {
            const format = tile.getFormat();
            const features = format.readFeatures(tile_result.data, {
              extent: extent,
              featureProjection: projection
            });
            tile.setFeatures(features as never[]);
            tile.setState(TileState.LOADED);
          } else {
            tile.setState(TileState.EMPTY);
          }
        });
      }
    );
  }

  return new VectorTileLayer({
    source: new VectorTileSource({
      format: new MVT(),
      url: 'pmtiles://' + chart.url + '/{z}/{x}/{y}',
      tileLoadFunction: loader,
      cacheSize: VECTOR_TILE_CACHE_SIZE
    }),
    zIndex: zIndex,
    opacity: chart.defaultOpacity ?? 1,
    minZoom: chart.minZoom,
    maxZoom: chart.maxZoom,
    declutter: true,
    preload: 0
  });
}
