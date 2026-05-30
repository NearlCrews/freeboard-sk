import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import TileState from 'ol/TileState';
import type ImageTile from 'ol/ImageTile';
import type Tile from 'ol/Tile';
import type VectorTile from 'ol/VectorTile';
import type { FeatureLike } from 'ol/Feature';
import type { Extent } from 'ol/extent';
import type { default as Projection } from 'ol/proj/Projection';
import type { LoadFunction } from 'ol/Tile';
import type { SKChart } from 'src/app/modules/skresources';
import {
  RASTER_TILE_CACHE_SIZE,
  VECTOR_TILE_CACHE_SIZE
} from './tile-source.constants';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { MVT } from 'ol/format';
import { assignImageBlob } from './chart-utils';

// Lazy-load pmtiles so the v4 decoder stays out of the eager main bundle.
// ESM `import()` is spec-guaranteed to return the same Promise for repeat
// calls of the same specifier, so no manual cache is needed.

// OpenLayers builds the tile URL via the template, so we have to parse z/x/y
// back out here. Hoisted to module scope to avoid recompiling per tile load.
const PMTILES_URL_PATTERN = /pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/;

function parsePmtilesUrl(
  url: string
): readonly [z: number, x: number, y: number] | undefined {
  const m = PMTILES_URL_PATTERN.exec(url);
  if (!m) return undefined;
  const [, , zStr, xStr, yStr] = m;
  if (zStr === undefined || xStr === undefined || yStr === undefined) {
    return undefined;
  }
  return [+zStr, +xStr, +yStr];
}

export async function initPMTilesXYZLayer(
  chart: SKChart,
  zIndex: number
): Promise<TileLayer<XYZ>> {
  const { PMTiles } = await import('pmtiles');
  const tiles = new PMTiles(chart.url);

  const loader: LoadFunction = (tile: Tile, url: string) => {
    tile.setState(TileState.LOADING);
    const coord = parsePmtilesUrl(url);
    if (!coord) {
      tile.setState(TileState.ERROR);
      return;
    }
    const [z, x, y] = coord;
    const imageTile = tile as ImageTile;

    void tiles.getZxy(z, x, y).then(async (result) => {
      if (result) {
        const blob = new Blob([result.data]);
        await assignImageBlob(imageTile.getImage() as HTMLImageElement, blob);
        tile.setState(TileState.LOADED);
      } else {
        tile.setState(TileState.EMPTY);
      }
    });
  };

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

export async function initPMTilesVectorLayer(
  chart: SKChart,
  zIndex: number
): Promise<VectorTileLayer> {
  const { PMTiles } = await import('pmtiles');
  const tiles = new PMTiles(chart.url);

  const loader: LoadFunction = (tile: Tile, url: string) => {
    const coord = parsePmtilesUrl(url);
    if (!coord) {
      tile.setState(TileState.ERROR);
      return;
    }
    const [z, x, y] = coord;
    const vectorTile = tile as VectorTile<FeatureLike>;

    vectorTile.setLoader(
      (extent: Extent, _resolution: number, projection: Projection) => {
        tile.setState(TileState.LOADING);
        void tiles.getZxy(z, x, y).then((result) => {
          if (result) {
            const format = vectorTile.getFormat();
            const features = format.readFeatures(result.data, {
              extent: extent,
              featureProjection: projection
            });
            vectorTile.setFeatures(features as never[]);
            tile.setState(TileState.LOADED);
          } else {
            tile.setState(TileState.EMPTY);
          }
        });
      }
    );
  };

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
