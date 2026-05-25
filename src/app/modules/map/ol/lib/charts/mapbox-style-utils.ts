import type LayerGroup from 'ol/layer/Group';
import type VectorLayer from 'ol/layer/Vector';
import type VectorTileLayer from 'ol/layer/VectorTile';

// Lazy-load ol-mapbox-style so the (~150 KB gzipped) MapLibre style spec,
// CSS-font helper, and sprite/expression machinery stay out of the eager
// main bundle. The first call to any helper triggers the chunk; the module
// promise is cached so subsequent calls reuse the same resolved module.
let mapboxStyleModulePromise:
  | Promise<typeof import('ol-mapbox-style')>
  | undefined;
function loadMapboxStyleModule(): Promise<typeof import('ol-mapbox-style')> {
  if (mapboxStyleModulePromise === undefined) {
    mapboxStyleModulePromise = import('ol-mapbox-style');
  }
  return mapboxStyleModulePromise;
}

// Apply a Mapbox/MapLibre Style JSON URL or inline object to an existing
// vector / vector-tile layer. Fire-and-forget: the layer is added to the
// map ahead of style resolution; OpenLayers re-renders once styling is
// ready. Resolves once the style can be used for rendering.
export async function applyMapboxStyle(
  layer: VectorTileLayer | VectorLayer,
  glStyle: string | object
): Promise<void> {
  const { applyStyle } = await loadMapboxStyleModule();
  await applyStyle(layer, glStyle);
}

// Apply a full Mapbox/MapLibre Style document (URL or inline) to an
// OpenLayers LayerGroup, creating the styled sub-layers in place. Used by
// the MapStyleJSON chart type where the entire map is described by a
// remote style document.
export async function applyMapboxStyleToGroup(
  group: LayerGroup,
  styleUrl: string
): Promise<void> {
  const { apply } = await loadMapboxStyleModule();
  await apply(group, styleUrl);
}
