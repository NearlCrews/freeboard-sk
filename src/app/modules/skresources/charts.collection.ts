import { Injectable, inject, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import type { HttpErrorResponse } from '@angular/common/http';

import { FbDialogService } from 'src/app/design-system/primitives';
import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';
import type {
  ActionResult,
  ChartResource,
  Charts,
  FBChart,
  FBCharts,
  Position
} from 'src/app/types';

import { SKChart } from './resource-classes';
import { SelectionsManager } from './selections-manager';

const OSM_CHART_IDS = new Set(['openseamap', 'openstreetmap']);

/**
 * Charts collection: owns the chart cache, /resources/charts HTTP
 * fetch/put/post/delete, the SK v1 -> v2 transform, OSM appendage,
 * zoom-range derivation, chart layer ordering, new/edit chart dialog
 * flows, deleteChart, and the chart-cache seeding job dispatch.
 * Extracted from SKResourceService so the chart code path lives in one
 * file.
 */
@Injectable({ providedIn: 'root' })
export class ChartsCollection {
  private readonly app = inject(AppFacade);
  private readonly signalk = inject(SignalKClient);
  private readonly selections = inject(SelectionsManager);
  private readonly dialog = inject(FbDialogService);

  private readonly cache = signal<FBCharts>([]);
  readonly charts = this.cache.asReadonly();

  listFromServer(query?: string): Promise<FBChart[]> {
    const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/charts${q}`)
        .subscribe(
          (res: Charts) => {
            const list: FBChart[] = [];
            const bag = res as Record<string, ChartResource>;
            Object.keys(bag).forEach((id) => {
              const entry = bag[id];
              if (!entry) return;
              list.push([
                id,
                this.transform(entry, id),
                !this.selections.isFiltered('charts')
                  ? true
                  : this.selections.has('charts', id)
              ] as unknown as FBChart);
            });
            resolve(list);
          },
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromServer(id: string): Promise<SKChart> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/charts/${id}`)
        .subscribe(
          (res: ChartResource) => resolve(this.transform(res, id)),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromCache(id: string): FBChart | undefined {
    return this.cache().find((c) => c[0] === id);
  }

  deleteOnServer(id: string, provider?: string): Promise<void> {
    const p = provider ? `?provider=${provider}` : '';
    return new Promise((resolve, reject) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/charts/${id}${p}`)
        .subscribe(
          () => resolve(),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  putOnServer(id: string, data: SKChart): Promise<ActionResult> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(this.app.skApiVersion, `/resources/charts/${id}`, data)
        .subscribe(
          (res: ActionResult) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  postOnServer(data: SKChart): Promise<ActionResult & { id?: string }> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `/resources/charts`, data)
        .subscribe(
          (res: ActionResult & { id?: string }) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /** Append the two built-in OSM tile layers to a chart list. */
  appendOSM(chtList: FBCharts): FBCharts {
    const isChartSelected = (id: string): boolean => {
      if (!this.selections.isFiltered('charts')) return true;
      return this.selections.has('charts', id);
    };
    const openStreetMap: FBChart = [
      'openstreetmap',
      new SKChart({
        name: 'World Map',
        description: 'Open Street Map'
      }),
      isChartSelected('openstreetmap')
    ];
    const openSeaMap: FBChart = [
      'openseamap',
      new SKChart({
        name: 'Sea Map',
        description: 'Open Sea Map',
        url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
        minzoom: 1,
        maxzoom: 24,
        bounds: [-180, -90, 180, 90],
        type: 'tilelayer'
      }),
      isChartSelected('openseamap')
    ];
    chtList.push(openSeaMap);
    chtList.unshift(openStreetMap);
    return chtList;
  }

  async refresh(query?: string): Promise<void> {
    this.app.debug(`** refreshCharts(): ${query}`);
    try {
      const chts = await this.listFromServer(query);
      this.appendOSM(chts);
      let flist = chts.filter((chart) => chart[2]);
      flist = this.sortByScaleDesc(flist);
      flist = this.arrangeLayers(flist);
      this.setMapZoomRange();
      this.cache.set(flist);
    } catch (err) {
      this.app.debug('** refreshCharts:', err);
      const flist = this.appendOSM([]);
      this.setMapZoomRange();
      this.cache.set(flist);
    }
  }

  /** Aggregate min/max zoom across selected charts onto MAP_ZOOM_EXTENT. */
  setMapZoomRange(useDefault?: boolean): void {
    const defaultExtent = { min: 2, max: 28 };
    if (useDefault || !this.app.uiConfig().mapConstrainZoom) {
      this.app.MAP_ZOOM_EXTENT = defaultExtent;
      return;
    }
    const derivedExtent = { min: 1000, max: -1 };
    this.cache().forEach((c) => {
      if (c[2]) {
        if (c[1].minZoom < derivedExtent.min) {
          derivedExtent.min = c[1].minZoom;
        }
        if (c[1].maxZoom > derivedExtent.max) {
          derivedExtent.max = c[1].maxZoom;
        }
      }
      this.app.MAP_ZOOM_EXTENT.min =
        derivedExtent.min === 1000 ? defaultExtent.min : derivedExtent.min;
      this.app.MAP_ZOOM_EXTENT.max =
        derivedExtent.max === -1 ? defaultExtent.max : derivedExtent.max;
    });
    this.app.debug('*** MAP_ZOOM_EXTENT', this.app.MAP_ZOOM_EXTENT);
  }

  delete(id: string): void {
    if (!id) return;
    this.app
      .showConfirm(
        'Do you want to delete this Chart source?\n',
        'Delete Chart:',
        'YES',
        'NO'
      )
      .subscribe((res) => {
        const result = res as { ok: boolean } | undefined;
        if (result?.ok) {
          this.deleteOnServer(id, 'resources-provider').catch(
            (err: HttpErrorResponse) => this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  /** Arrange chart layers in user-defined order (config.selections.chartOrder). */
  arrangeLayers(chartList: FBCharts): FBCharts {
    if (!Array.isArray(this.app.config.selections.chartOrder)) {
      this.app.config.selections.chartOrder = [];
    }
    const chartOrder = this.app.config.selections.chartOrder;
    chartList.forEach((c) => {
      if (!chartOrder.includes(c[0])) chartOrder.push(c[0]);
    });
    const chtIds = new Set(chartList.map((c) => c[0]));
    const refList = chartOrder.filter((i) => chtIds.has(i));
    for (let destidx = 0; destidx < refList.length; destidx++) {
      const srcidx = chartList.findIndex((c) => c[0] === refList[destidx]);
      if (srcidx !== -1) {
        moveItemInArray(chartList, srcidx, destidx + 1);
      }
    }
    return chartList.slice();
  }

  reorder(): void {
    this.cache.update((current) => this.arrangeLayers(current));
  }

  addFromServer(ids?: string[]): void {
    if (!ids) {
      this.selections.unfilter('charts');
    } else if (this.selections.isFiltered('charts')) {
      this.selections.add('charts', ids);
    }
    this.refresh();
  }

  add(charts: FBCharts): void {
    this.cache.update((current) => {
      if (this.selections.isFiltered('charts')) {
        this.selections.add(
          'charts',
          charts.map((c) => c[0])
        );
      }
      return this.arrangeLayers(current.concat(charts));
    });
  }

  remove(ids?: string[]): void {
    this.cache.update((current) => {
      if (!ids) {
        this.selections.clear('charts');
        this.app.saveConfig();
        return [];
      }
      this.selections.remove('charts', ids);
      return current.filter((c) => !ids.includes(c[0]));
    });
  }

  setOpacity(id: string, value: number): void {
    if (!id || !Number.isFinite(value)) return;
    const idx = this.cache().findIndex((c) => c[0] === id);
    if (idx === -1) return;
    this.cache.update((current) =>
      current.map((c): FBChart => {
        if (c[0] !== id) return c;
        const updated = new SKChart(c[1]);
        updated.defaultOpacity = value;
        return c[2] === undefined ? [c[0], updated] : [c[0], updated, c[2]];
      })
    );
  }

  toggleSelection(ids: string | string[]): void {
    const list = !Array.isArray(ids) ? [ids] : ids;
    list.forEach((id) => {
      if (!this.selections.has('charts', id)) {
        this.selections.add('charts', id);
      } else {
        this.selections.remove('charts', id);
      }
    });
    this.refresh();
  }

  async create(chart: SKChart): Promise<void> {
    if (!chart) return;
    const { ChartPropertiesDialog } =
      await import('./components/charts/chart-properties-dialog');
    this.dialog
      .open(ChartPropertiesDialog, {
        disableClose: true,
        data: chart
      })
      .closed.subscribe(async (res) => {
        const r = res as { save: boolean; chart: SKChart } | undefined;
        if (r?.save) {
          try {
            const cht = await this.postOnServer(r.chart);
            if (cht.id) this.selections.add('charts', cht.id);
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  async editInfo(id: string): Promise<void> {
    if (!id) return;
    let chart: SKChart;
    if (OSM_CHART_IDS.has(id)) {
      const host =
        id === 'openseamap'
          ? 'tiles.openseamap.org/seamark'
          : 'tile.openstreetmap.org';
      chart = new SKChart({
        name: id === 'openseamap' ? 'Sea Map' : 'World Map',
        description: id === 'openseamap' ? 'Open Sea Map' : 'Open Street Map',
        url: `https://${host}/{z}/{x}/{y}.png`,
        minzoom: 1,
        maxzoom: 24,
        bounds: [-180, -90, 180, 90],
        type: 'tilelayer'
      });
    } else {
      try {
        this.app.sIsFetching.set(true);
        chart = await this.fromServer(id);
      } catch (err) {
        this.app.parseHttpErrorResponse(err);
        return;
      } finally {
        this.app.sIsFetching.set(false);
      }
    }
    const { ChartPropertiesDialog } =
      await import('./components/charts/chart-properties-dialog');
    this.dialog
      .open(ChartPropertiesDialog, {
        disableClose: true,
        data: chart
      })
      .closed.subscribe((res) => {
        const r = res as { save: boolean; chart: SKChart } | undefined;
        if (r?.save) {
          this.putOnServer(id, r.chart).catch((err) =>
            this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  async seedCache(chart: FBChart, bbox: Position[]): Promise<void> {
    if (!chart || !Array.isArray(bbox)) {
      this.app.showAlert('Selection Error', 'Invalid selection data!');
      return;
    }
    if (bbox.length !== 2) {
      this.app.showAlert('Selection Error', 'Invalid selection!');
      return;
    }
    const sw = bbox[0];
    const ne = bbox[1];
    if (!sw || !ne) {
      this.app.showAlert('Selection Error', 'Invalid selection!');
      return;
    }
    const parsedBbox = {
      minLon: sw[0],
      minLat: sw[1],
      maxLon: ne[0],
      maxLat: ne[1]
    };
    const { ChartSeedJobDialog } =
      await import('./components/charts/chart-seedjob-dialog');
    this.dialog
      .open(ChartSeedJobDialog, {
        data: { chart, bbox }
      })
      .closed.subscribe((res) => {
        const maxZoom = res as number | undefined;
        if (typeof maxZoom === 'number' && maxZoom > 0) {
          const req = { bbox: parsedBbox, maxZoom };
          this.app.debug(
            `Submit chart seed job ${JSON.stringify(req)} for chart ${chart[0]}`
          );
          this.signalk
            .post(`/signalk/chart-tiles/cache/${chart[0]}`, req)
            .subscribe({
              next: () => {
                this.app.showAlert(
                  'Chart Cache',
                  `Tile cache seed job created successfully.`
                );
              },
              error: (err: HttpErrorResponse) =>
                this.app.parseHttpErrorResponse(err)
            });
        }
      });
  }

  private sortByScaleDesc(chartList: FBCharts): FBCharts {
    return chartList.sort((a, b) => b[1].scale - a[1].scale);
  }

  /** Server-shape to SKChart. Public so the central transform dispatcher
   *  can route the 'charts' case here. */
  transform(chart: ChartResource, id: string): SKChart {
    if (chart.tilemapUrl) chart.url = chart.tilemapUrl;
    if (chart.chartLayers) chart.layers = chart.chartLayers;
    if (chart.serverType && !chart.type) chart.type = chart.serverType;
    if (chart.type) {
      if (
        chart.url &&
        (chart.url.startsWith('/') || !chart.url.startsWith('http'))
      ) {
        chart.url = (this.app.hostDef.url ?? '') + chart.url;
      }
    }
    const localOpacity = this.app.config.selections.chartOpacity[id];
    if (typeof localOpacity === 'number') {
      chart.defaultOpacity = localOpacity;
    }
    return new SKChart(chart);
  }
}
