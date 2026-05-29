import {
  PointFeature,
  LineStringFeature,
  MultiLineStringFeature,
  PolygonFeature,
  MultiPolygonFeature
} from './geojson';

// *** Open Binnacle defined RESOURCE types

export type Tracks = Record<string, TrackResource>;

export interface TrackResource {
  feature: MultiLineStringFeature;
}

export type ResourceSets = Record<string, ResourceSet>;

export interface ResourceSet extends CustomResource {
  type: 'ResourceSet';
  styles?: CustomStyles;
  values: {
    type: 'FeatureCollection';
    features: (
      | PointFeature
      | LineStringFeature
      | MultiLineStringFeature
      | PolygonFeature
      | MultiPolygonFeature
    )[];
  };
}

export type InfoLayers = Record<string, InfoLayerResource>;

export interface InfoLayerResource extends CustomResource {
  name: string;
  description: string;
  type: 'InfoLayer';
  values: {
    url: string;
    sourceType: 'WMTS' | 'WMS';
    layers: string[];
    opacity: number;
    minZoom: number;
    maxZoom: number;
    refreshInterval?: number;
  };
}

export type CustomResources = Record<string, CustomResource>;

export interface CustomResource {
  id?: string;
  name?: string | null;
  description?: string | null;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: Record<string, any>;
}

export interface CustomStyles {
  default?: CustomStyle;
  [key: string]: CustomStyle;
}

export interface CustomStyle {
  stroke: string;
  fill: string;
  width: number;
  lineDash?: number[];
}
