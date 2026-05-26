import { Map } from 'ol';
import { MapService } from './map.service';

/* enum types */

export enum LayerType {
  IMAGE,
  TILE,
  VECTOR_TILE,
  VECTOR
}

export enum SourceType {
  BINGMAPS,
  CARTODB,
  CLUSTER,
  IMAGE,
  IMAGEARCGISREST,
  IMAGECANVAS,
  IMAGEMAPGUIDE,
  IMAGESTATIC,
  IMAGEVECTOR,
  IMAGEWMS,
  OSM,
  RASTER,
  STAMEN,
  TILEARCGISREST,
  TILEDEBUG,
  TILEIMAGE,
  TILEJSON,
  TILEUTFGRID,
  TILEWMS,
  URLTILE,
  VECTOR,
  VECTORTILE,
  WMTS,
  XYZ,
  ZOOMIFY
}

/* interface types */
// Re-export OL's Coordinate so the local alias and the upstream one are
// the same nominal type. The agents introduced casts assuming they
// match; making them identical at the type level prevents future drift.
export type { Coordinate } from 'ol/coordinate';

export type Extent = [number, number, number, number];

export interface MapReadyEvent {
  map: Map;
  mapService: MapService;
}
