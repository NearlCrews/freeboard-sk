import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  FbDetailPaneComponent,
  FbFilterBarComponent,
  FbListPaneComponent,
  type FbListPaneItem
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import type {
  FBResourceSelect,
  FBRoute,
  FBWaypoint,
  FBRegion,
  Position
} from 'src/app/types';
import { SKResourceService } from '../resources.service';
import { SKRoute, SKWaypoint, SKRegion } from '../resource-classes';
import { RoutePanel } from './routes/route-panel';
import { WaypointPanel } from './waypoints/waypoint-panel';
import { RegionPanel } from './regions/region-panel';

type ResourceKind = 'routes' | 'waypoints' | 'regions';
type NavKind = ResourceKind | 'all';

interface NavItem extends FbListPaneItem {
  readonly kind: NavKind;
  readonly count: number;
  readonly icon: string;
}

interface RouteRow extends FbListPaneItem {
  readonly kind: 'routes';
  readonly entry: FBRoute;
}

interface WaypointRow extends FbListPaneItem {
  readonly kind: 'waypoints';
  readonly entry: FBWaypoint;
}

interface RegionRow extends FbListPaneItem {
  readonly kind: 'regions';
  readonly entry: FBRegion;
}

type ResourceRow = RouteRow | WaypointRow | RegionRow;

const NAV_ALL = 'all';
const NAV_ROUTES = 'routes';
const NAV_WAYPOINTS = 'waypoints';
const NAV_REGIONS = 'regions';

@Component({
  selector: 'resources-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    FbListPaneComponent,
    FbDetailPaneComponent,
    FbFilterBarComponent,
    RoutePanel,
    WaypointPanel,
    RegionPanel
  ],
  templateUrl: './resources-shell.component.html',
  styleUrls: ['./resources-shell.component.scss']
})
export class ResourcesShellComponent {
  initialKind = input<NavKind>('all');
  activeRouteId = input<string | undefined>(undefined);
  activeWaypointId = input<string | undefined>(undefined);

  select = output<{ collection: ResourceKind; selection: FBResourceSelect }>();
  activate = output<FBResourceSelect>();
  deactivate = output<FBResourceSelect>();
  pan = output<{ center: Position; zoomLevel: number | null }>();
  center = output<Position>();
  closed = output<void>();

  protected app = inject(AppFacade);
  private skres = inject(SKResourceService);

  protected readonly searchQuery = signal('');
  protected readonly activeNav = signal<NavKind>('all');
  protected readonly selectedRowId = signal<string | null>(null);

  protected readonly routes = this.skres.routes;
  protected readonly waypoints = this.skres.waypoints;
  protected readonly regions = this.skres.regions;

  protected readonly leftItems = computed<readonly NavItem[]>(() => {
    const r = this.routes().length;
    const w = this.waypoints().length;
    const g = this.regions().length;
    return [
      {
        id: NAV_ALL,
        label: 'All',
        kind: 'all',
        count: r + w + g,
        icon: 'view_list'
      },
      {
        id: NAV_ROUTES,
        label: 'Routes',
        kind: 'routes',
        count: r,
        icon: 'route'
      },
      {
        id: NAV_WAYPOINTS,
        label: 'Waypoints',
        kind: 'waypoints',
        count: w,
        icon: 'place'
      },
      {
        id: NAV_REGIONS,
        label: 'Regions',
        kind: 'regions',
        count: g,
        icon: 'crop_square'
      }
    ];
  });

  protected readonly middleItems = computed<readonly ResourceRow[]>(() => {
    const nav = this.activeNav();
    const query = this.searchQuery().toLowerCase();
    const include = (label: string, description?: string) => {
      if (!query) {
        return true;
      }
      const n = label.toLowerCase();
      const d = (description ?? '').toLowerCase();
      return n.includes(query) || d.includes(query);
    };
    const rows: ResourceRow[] = [];
    if (nav === 'all' || nav === 'routes') {
      for (const r of this.routes()) {
        const name = r[1].name || 'Unnamed route';
        if (!include(name, r[1].description)) {
          continue;
        }
        rows.push({
          id: this.rowId('routes', r[0]),
          label: name,
          kind: 'routes',
          entry: r
        });
      }
    }
    if (nav === 'all' || nav === 'waypoints') {
      for (const w of this.waypoints()) {
        const name = w[1].name || 'Unnamed waypoint';
        if (!include(name, w[1].description)) {
          continue;
        }
        rows.push({
          id: this.rowId('waypoints', w[0]),
          label: name,
          kind: 'waypoints',
          entry: w
        });
      }
    }
    if (nav === 'all' || nav === 'regions') {
      for (const g of this.regions()) {
        const name = g[1].name || 'Unnamed region';
        if (!include(name, g[1].description)) {
          continue;
        }
        rows.push({
          id: this.rowId('regions', g[0]),
          label: name,
          kind: 'regions',
          entry: g
        });
      }
    }
    rows.sort((a, b) => {
      if (a.kind !== b.kind) {
        return this.kindOrder(a.kind) - this.kindOrder(b.kind);
      }
      return a.label.toUpperCase() <= b.label.toUpperCase() ? -1 : 1;
    });
    return rows;
  });

  protected readonly selectedRow = computed<ResourceRow | null>(() => {
    const id = this.selectedRowId();
    if (!id) {
      return null;
    }
    return this.middleItems().find((r) => r.id === id) ?? null;
  });

  protected readonly selectedRoute = computed<SKRoute | null>(() => {
    const row = this.selectedRow();
    if (!row || row.kind !== 'routes') {
      return null;
    }
    return row.entry[1];
  });

  protected readonly selectedWaypoint = computed<SKWaypoint | null>(() => {
    const row = this.selectedRow();
    if (!row || row.kind !== 'waypoints') {
      return null;
    }
    return row.entry[1];
  });

  protected readonly selectedRegion = computed<SKRegion | null>(() => {
    const row = this.selectedRow();
    if (!row || row.kind !== 'regions') {
      return null;
    }
    return row.entry[1];
  });

  protected readonly selectedDetailTitle = computed<string>(() => {
    const row = this.selectedRow();
    return row?.label ?? '';
  });

  protected readonly selectedDetailSubtitle = computed<string | null>(() => {
    const row = this.selectedRow();
    if (!row) {
      return null;
    }
    switch (row.kind) {
      case 'routes':
        return 'Route';
      case 'waypoints':
        return 'Waypoint';
      case 'regions':
        return 'Region';
    }
  });

  protected readonly selectedRouteIsActive = computed<boolean>(() => {
    const row = this.selectedRow();
    if (!row || row.kind !== 'routes') {
      return false;
    }
    return row.entry[0] === this.activeRouteId();
  });

  constructor() {
    effect(() => {
      const kind = this.initialKind();
      this.activeNav.set(kind);
    });

    effect(() => {
      const id = this.selectedRowId();
      if (!id) {
        return;
      }
      const visible = this.middleItems().some((it) => it.id === id);
      if (!visible) {
        this.selectedRowId.set(null);
      }
    });

    this.skres.routeAddFromServer();
    this.skres.waypointAddFromServer();
    this.skres.regionAddFromServer();
  }

  protected onNavSelect(id: string) {
    if (
      id === NAV_ALL ||
      id === NAV_ROUTES ||
      id === NAV_WAYPOINTS ||
      id === NAV_REGIONS
    ) {
      this.activeNav.set(id);
    }
  }

  protected onRowSelect(id: string) {
    this.selectedRowId.set(id);
    const row = this.middleItems().find((r) => r.id === id);
    if (!row) {
      return;
    }
    const resourceId = row.entry[0];
    this.select.emit({
      collection: row.kind,
      selection: { id: resourceId }
    });
    if (row.kind === 'waypoints') {
      const pos = row.entry[1].feature.geometry.coordinates;
      if (pos) {
        this.center.emit(pos);
      }
    }
  }

  protected onClose() {
    this.closed.emit();
  }

  protected onRefresh() {
    const nav = this.activeNav();
    if (nav === 'all' || nav === 'routes') {
      this.skres.routeAddFromServer();
    }
    if (nav === 'all' || nav === 'waypoints') {
      this.skres.waypointAddFromServer();
    }
    if (nav === 'all' || nav === 'regions') {
      this.skres.regionAddFromServer();
    }
  }

  protected onEdit() {
    const row = this.selectedRow();
    if (!row) {
      return;
    }
    const id = row.entry[0];
    switch (row.kind) {
      case 'routes':
        void this.skres.editRouteInfo(id);
        return;
      case 'waypoints':
        void this.skres.editWaypointInfo(id);
        return;
      case 'regions':
        void this.skres.editRegionInfo(id);
        return;
    }
  }

  protected onDelete() {
    const row = this.selectedRow();
    if (!row) {
      return;
    }
    const id = row.entry[0];
    switch (row.kind) {
      case 'routes':
        void this.skres.deleteRoute(id);
        return;
      case 'waypoints':
        void this.skres.deleteWaypoint(id);
        return;
      case 'regions':
        void this.skres.deleteRegion(id);
        return;
    }
  }

  protected onActivateRoute() {
    const row = this.selectedRow();
    if (!row || row.kind !== 'routes') {
      return;
    }
    this.activate.emit({ id: row.entry[0] });
  }

  protected onDeactivateRoute() {
    this.deactivate.emit({ id: '' });
  }

  protected onPanFromDetail(event: {
    center: Position;
    zoomLevel: number | null;
  }) {
    this.pan.emit(event);
  }

  protected onRoutePanelActivate(id: string) {
    this.activate.emit({ id });
  }

  protected onRoutePanelEdit() {
    this.onEdit();
  }

  protected onWaypointPanelEdit() {
    this.onEdit();
  }

  protected onRegionPanelEdit() {
    this.onEdit();
  }

  protected snippet(text: string | undefined): string {
    if (!text) {
      return '';
    }
    let body = text.replace(/<[^>]+>/g, ' ');
    body = body
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return body.length > 140 ? body.slice(0, 140).trim() + '...' : body;
  }

  protected routeDistance(route: SKRoute): string {
    const d = route.distance;
    if (!d || d <= 0) {
      return '';
    }
    return this.app.formatValueForDisplay(d, 'm', { precision: 2 });
  }

  protected waypointPosition(wpt: SKWaypoint): string {
    const c = wpt.feature.geometry.coordinates;
    if (!c || c.length < 2) {
      return '';
    }
    const lon = c[0];
    const lat = c[1];
    if (typeof lon !== 'number' || typeof lat !== 'number') {
      return '';
    }
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  protected kindIcon(kind: ResourceKind): string {
    switch (kind) {
      case 'routes':
        return 'route';
      case 'waypoints':
        return 'place';
      case 'regions':
        return 'crop_square';
    }
  }

  protected kindLabel(kind: ResourceKind): string {
    switch (kind) {
      case 'routes':
        return 'Route';
      case 'waypoints':
        return 'Waypoint';
      case 'regions':
        return 'Region';
    }
  }

  protected isRouteRow(row: ResourceRow): row is RouteRow {
    return row.kind === 'routes';
  }

  protected isWaypointRow(row: ResourceRow): row is WaypointRow {
    return row.kind === 'waypoints';
  }

  protected isRegionRow(row: ResourceRow): row is RegionRow {
    return row.kind === 'regions';
  }

  private rowId(kind: ResourceKind, id: string): string {
    return `${kind}:${id}`;
  }

  private kindOrder(kind: ResourceKind): number {
    switch (kind) {
      case 'routes':
        return 0;
      case 'waypoints':
        return 1;
      case 'regions':
        return 2;
    }
  }
}
