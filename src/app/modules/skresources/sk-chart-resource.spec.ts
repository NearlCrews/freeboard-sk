/**
 * SKChart resource-flow spec (Phase 4a Batch 3, SK-expert review).
 *
 * Signal K servers expose chart resources via /signalk/v1/resources/charts/
 * (or the v2 equivalent at /signalk/v2/api/resources/charts). resources.service
 * fetches the ChartResource records and constructs SKChart instances. The
 * chart `url` (a `pmtiles://...` URL or HTTPS XYZ template) flows from SKChart
 * directly into the PMTiles consumers in pmtiles-utils.ts:
 *
 *   new PMTiles(chart.url)          // initPMTilesXYZLayer
 *   new PMTiles(chart.url)          // initPMTilesVectorLayer
 *
 * These tests pin the SKChart constructor so that the pmtiles v4 bump
 * (commit 5d99f6e4) cannot be silently broken by future field-name churn
 * on either end of the chart-resource pipeline.
 */
import { describe, expect, it } from 'vitest';
import { SKChart } from './resource-classes';
import type { ChartResource } from 'src/app/types';

describe('SKChart constructor preserves Signal K chart-resource fields', () => {
  it('passes the pmtiles URL through unchanged so PMTiles(url) receives it intact', () => {
    const url = 'pmtiles:///signalk/v1/resources/charts/awcgs/awcgs.pmtiles';
    const chart = new SKChart({
      identifier: 'awcgs',
      url,
      type: 'pmtiles'
    });
    expect(chart.url).toBe(url);
  });

  it('passes an HTTPS XYZ template through unchanged', () => {
    const url = 'https://tiles.example/{z}/{x}/{y}.png';
    const chart = new SKChart({
      identifier: 'osm-mirror',
      url,
      type: 'tilejson'
    });
    expect(chart.url).toBe(url);
  });

  it('preserves identifier, type, name, description, and format', () => {
    const cr: ChartResource = {
      identifier: 'au-cm93',
      name: 'AU CM93',
      description: 'Local cache',
      type: 'pmtiles',
      format: 'png',
      url: 'pmtiles:///charts/au-cm93.pmtiles'
    };
    const chart = new SKChart(cr);
    expect(chart.identifier).toBe('au-cm93');
    expect(chart.name).toBe('AU CM93');
    expect(chart.description).toBe('Local cache');
    expect(chart.type).toBe('pmtiles');
    expect(chart.format).toBe('png');
  });

  it('preserves min/max zoom when supplied, defaults when not', () => {
    const explicit = new SKChart({ minzoom: 4, maxzoom: 18 });
    expect(explicit.minZoom).toBe(4);
    expect(explicit.maxZoom).toBe(18);

    // Defaults match the class declarations and the values the layer
    // components expect when chart metadata omits zoom bounds.
    const defaults = new SKChart();
    expect(defaults.minZoom).toBe(0);
    expect(defaults.maxZoom).toBe(24);
  });

  it('preserves layers, bounds, style, $source, defaultOpacity, and proxy', () => {
    const cr: ChartResource = {
      layers: ['water', 'depth_contours'],
      bounds: [110, -45, 155, -10],
      style: 'mapbox://styles/marine/light',
      $source: 'resources-provider',
      defaultOpacity: 0.85,
      proxy: true
    };
    const chart = new SKChart(cr);
    expect(chart.layers).toEqual(['water', 'depth_contours']);
    expect(chart.bounds).toEqual([110, -45, 155, -10]);
    expect(chart.style).toBe('mapbox://styles/marine/light');
    expect(chart.source).toBe('resources-provider');
    expect(chart.defaultOpacity).toBe(0.85);
    expect(chart.proxy).toBe(true);
  });

  it('defaults defaultOpacity to 1 when ChartResource omits it', () => {
    const chart = new SKChart({ url: 'pmtiles:///charts/x.pmtiles' });
    expect(chart.defaultOpacity).toBe(1);
  });

  it('defaults proxy to false when ChartResource omits it', () => {
    const chart = new SKChart({ url: 'pmtiles:///charts/x.pmtiles' });
    expect(chart.proxy).toBe(false);
  });

  it('keeps the .pmtiles URL suffix so the layer-raster/vector chart routing detects it', () => {
    // RasterChartLayerComponent and VectorChartLayerComponent both branch on
    // `chart[1].url.includes('.pmtiles')` to route through the lazy pmtiles
    // loader. If the URL were mangled by the constructor, the branch would
    // miss and the chart would fall back to the XYZ template path.
    const url =
      'https://demo.signalk.org/signalk/v1/api/resources/charts/world/world.pmtiles';
    const chart = new SKChart({ url });
    expect(chart.url.includes('.pmtiles')).toBe(true);
  });

  it('returns falsy defaults for an empty constructor so consumers can detect missing metadata', () => {
    // After the Phase 5 strict ratchet, string fields default to '' (empty)
    // and bounds defaults to []. Both remain falsy / length-0 for the same
    // `if (chart.url)` and `chart.bounds.length` checks consumers used to
    // make against the prior undefined defaults.
    const chart = new SKChart();
    expect(chart.url).toBe('');
    expect(chart.identifier).toBe('');
    expect(chart.name).toBe('');
    expect(chart.type).toBe('');
    expect(chart.format).toBe('');
    expect(chart.bounds).toEqual([]);
    expect(chart.style).toBe('');
    expect(chart.source).toBe('');
  });

  it('pins array, scale, and zoom defaults so consumers can rely on non-null fallbacks', () => {
    // layers defaults to [] (not undefined) so the layer-vector-chart filter
    // can call `.includes(...)` without a null guard. scale, minZoom, and
    // maxZoom carry numeric defaults that drive the OL view extent and the
    // layer minResolution / maxResolution wiring; pin them so a future
    // ChartResource shape change cannot silently flip them to undefined.
    const chart = new SKChart();
    expect(chart.layers).toEqual([]);
    expect(chart.scale).toBe(250000);
    expect(chart.minZoom).toBe(0);
    expect(chart.maxZoom).toBe(24);
    expect(chart.defaultOpacity).toBe(1);
    expect(chart.proxy).toBe(false);
  });
});
