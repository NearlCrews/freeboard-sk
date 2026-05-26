import type LayerGroup from 'ol/layer/Group';
import type VectorLayer from 'ol/layer/Vector';
import type VectorTileLayer from 'ol/layer/VectorTile';

// Lazy-load ol-mapbox-style so the (~150 KB gzipped) MapLibre style spec,
// CSS-font helper, and sprite/expression machinery stay out of the eager
// main bundle. First call triggers the chunk; the module promise is cached.
let mapboxStyleModulePromise:
  | Promise<typeof import('ol-mapbox-style')>
  | undefined;
function loadMapboxStyleModule(): Promise<typeof import('ol-mapbox-style')> {
  if (mapboxStyleModulePromise === undefined) {
    mapboxStyleModulePromise = import('ol-mapbox-style');
  }
  return mapboxStyleModulePromise;
}

/**
 * Apply a Mapbox/MapLibre Style (URL or inline object) to an existing vector
 * or vector-tile layer. Resolves once the style can be used for rendering.
 * Safe to `void` at the call site: OL re-renders the layer when styling
 * resolves, so the layer can be added to the map ahead of this call.
 */
export async function applyMapboxStyle(
  layer: VectorTileLayer | VectorLayer,
  glStyle: string | object
): Promise<void> {
  const { applyStyle } = await loadMapboxStyleModule();
  await applyStyle(layer, glStyle);
}

/**
 * Apply a full Mapbox/MapLibre Style document URL to an OpenLayers
 * LayerGroup, creating the styled sub-layers in place. Used by the
 * MapStyleJSON chart type where the entire map is described by a remote
 * style document.
 */
export async function applyMapboxStyleToGroup(
  group: LayerGroup,
  styleUrl: string
): Promise<void> {
  const { apply } = await loadMapboxStyleModule();
  await apply(group, styleUrl);
}
