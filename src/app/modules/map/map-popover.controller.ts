import { Injectable, WritableSignal, inject } from '@angular/core';
import { Feature as GeoJsonFeature } from 'geojson';

import { AppFacade } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';
import type { Position, ResourceSet } from 'src/app/types';
import {
  SKResourceService,
  FBCustomResourceService,
  SKWaypoint,
  CourseService,
  NotificationManager,
  InfoPanelFacade,
  SKResourceType
} from 'src/app/modules';

import { FBMapInteractService, IPopover } from './fbmap-interact.service';
import type { IFeatureData } from './fb-map.component';
import { FEATURE_ID_PREFIX_TO_RESOURCE_TYPE } from './ol/lib/resources/feature-id-prefix';

const KNOWN_FEATURE_LIST_ICONS = new Set<string>([
  'local_offer',
  'route',
  'location_on',
  'tab_unselected',
  'beenhere',
  'star',
  'flag',
  'anchor',
  'air',
  'directions_boat',
  'airplanemode_active',
  'notification_important',
  'tour'
]);

export interface FormatPopoverOptions {
  id: string | null;
  coord: Position | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  featureList: Map<string, any> | undefined;
  dfeat: IFeatureData;
  s57Features: Record<string, Record<string, string | number>>;
  onModifyAnchor: () => void;
  onReadOnlyNote: () => void;
}

/**
 * Owns the popover dispatch pipeline that fb-map.component used to
 * inline. `formatPopover` turns a feature id and click coordinate into
 * an `IPopover` payload and writes the component's template-bound
 * overlay signal; `dispatchToInfoPanel` mirrors the selection into the
 * left info-panel for non-measurement types.
 *
 * The component still owns the overlay signal (template-bound), the
 * per-instance s57Features cache, and the `dfeat` feature container, so
 * it forwards each through to the controller. Anchor modify and the
 * readOnly-note popoverInfo path stay component-owned because they
 * mutate component state the controller does not see; the component
 * passes them in as callbacks.
 */
@Injectable({ providedIn: 'root' })
export class MapPopoverController {
  private readonly app = inject(AppFacade);
  private readonly mapInteract = inject(FBMapInteractService);
  private readonly notiMgr = inject(NotificationManager);
  private readonly skres = inject(SKResourceService);
  private readonly skresOther = inject(FBCustomResourceService);
  private readonly course = inject(CourseService);
  private readonly infoPanel = inject(InfoPanelFacade);

  formatPopover(
    overlay: WritableSignal<IPopover>,
    opts: FormatPopoverOptions
  ): void {
    const {
      id,
      coord,
      featureList,
      dfeat,
      s57Features,
      onModifyAnchor,
      onReadOnlyNote
    } = opts;
    if (!id || !coord) {
      overlay.update((current) => Object.assign({}, current, { show: false }));
      return;
    }

    const poData: IPopover = {
      show: false,
      content: [],
      id: null,
      type: null,
      title: '',
      featureCount: this.mapInteract.draw.features?.getLength() ?? 0,
      position: coord,
      readOnly: false,
      isSelf: false,
      resource: undefined
    };

    const t = id.split('.');
    const prefix = t[0] ?? '';
    const suffix = t[1] ?? '';

    switch (prefix) {
      case 's57': {
        poData.id = id;
        poData.title = 'S57 Feature';
        poData.type = 's57';
        const s57 = s57Features[id];
        if (s57) {
          poData.s57Feature = s57;
        }
        poData.position = coord;
        poData.show = true;
        poData.readOnly = true;
        break;
      }
      case 'anchor':
        onModifyAnchor();
        return;
      case 'bearing_dist': {
        const selfPos = this.app.data.vessels.self.position;
        const d = selfPos ? (GeoUtils.distanceTo(selfPos, coord) ?? 0) : 0;
        const b = selfPos
          ? (GeoUtils.greatCircleBearing(selfPos, coord) ?? 0)
          : 0;
        poData.type = prefix;
        poData.title = `${this.app.formatValueForDisplay(d, 'm')} ${this.app.formatValueForDisplay(b, 'deg')}`;
        poData.position = coord;
        poData.show = true;
        break;
      }
      case 'list':
        poData.type = prefix;
        poData.title = 'Features';
        poData.content = [];
        featureList?.forEach((f) => poData.content.push(f));
        poData.show = true;
        break;
      case 'chartlist':
        poData.type = prefix;
        poData.content = [];
        featureList?.forEach((f) => poData.content.push(f));
        poData.show = true;
        break;
      case 'alarm': {
        const aid = id.split('.').slice(1).join('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const alm = this.notiMgr.getAlert(aid) as any;
        if (!alm) {
          return;
        }
        poData.type = prefix;
        poData.alarm = alm;
        poData.id = aid;
        poData.show = true;
        break;
      }
      case 'vessels':
        poData.type = 'ais';
        poData.isSelf = true;
        poData.vessel = dfeat.self;
        poData.position = dfeat.self.position ?? coord;
        poData.show = true;
        break;
      case 'ais-vessels': {
        const aid = id.slice(4);
        const v = dfeat.ais.get(aid);
        if (!v) {
          return;
        }
        poData.type = 'ais';
        poData.id = aid;
        poData.vessel = v;
        poData.position = v.position ?? coord;
        poData.show = true;
        break;
      }
      case 'atons':
      case 'aton':
      case 'shore': {
        const at = this.app.data.atons.get(id);
        if (!at) {
          return;
        }
        poData.type = 'aton';
        poData.id = id;
        poData.aton = at;
        poData.position = at.position ?? coord;
        poData.show = true;
        break;
      }
      case 'sar': {
        const sr = this.app.data.sar.get(id);
        if (!sr) {
          return;
        }
        poData.type = 'aton';
        poData.id = id;
        poData.aton = sr;
        poData.position = sr.position ?? coord;
        poData.show = true;
        break;
      }
      case 'meteo': {
        const mt = this.app.data.meteo.get(id);
        if (!mt) {
          return;
        }
        poData.type = prefix;
        poData.id = id;
        poData.aton = mt;
        poData.position = mt.position ?? coord;
        poData.show = true;
        break;
      }
      case 'aircraft': {
        const ac = this.app.data.aircraft.get(id);
        if (!ac) {
          return;
        }
        poData.type = prefix;
        poData.id = id;
        poData.aircraft = ac;
        poData.position = ac.position ?? coord;
        poData.show = true;
        break;
      }
      case 'region': {
        const entry = this.skres.fromCache('regions', suffix);
        if (!entry) {
          return;
        }
        poData.id = suffix;
        poData.type = prefix;
        poData.title = 'Region';
        poData.resource = entry;
        poData.show = true;
        poData.readOnly = entry[1].feature.properties?.['readOnly'] === true;
        break;
      }
      case 'note': {
        const entry = this.skres.fromCache('notes', suffix);
        if (!entry) {
          return;
        }
        poData.readOnly = entry[1].properties['readOnly'] === true;
        poData.id = suffix;
        poData.type = prefix;
        poData.title = 'Note';
        poData.resource = entry;
        if (poData.readOnly) {
          poData.show = false;
          overlay.set(poData);
          onReadOnlyNote();
        } else {
          poData.show = true;
        }
        break;
      }
      case 'route': {
        const entry = this.skres.fromCache('routes', suffix);
        if (!entry) {
          return;
        }
        poData.id = suffix;
        poData.type = prefix;
        poData.title = 'Route';
        poData.resource = entry;
        poData.show = true;
        poData.readOnly = entry[1].feature.properties?.['readOnly'] === true;
        break;
      }
      case 'waypoint': {
        const entry = this.skres.fromCache('waypoints', suffix);
        if (!entry) {
          return;
        }
        poData.id = suffix;
        poData.type = prefix;
        poData.resource = entry;
        poData.title = 'Waypoint';
        poData.show = true;
        poData.readOnly = entry[1].feature.properties?.['readOnly'] === true;
        break;
      }
      case 'dest':
        poData.id = id;
        poData.type = 'destination';
        poData.resource = this.skres.buildWaypoint(coord) as unknown as [
          string,
          SKWaypoint
        ];
        poData.title = this.course.courseData().destPointName ?? 'Destination';
        poData.show = true;
        break;
      case 'rset':
        poData.id = id;
        poData.type = prefix;
        poData.resource = this.skresOther.fromResourceSetCache(id, true);
        poData.title =
          (poData.resource as GeoJsonFeature)?.properties?.['name'] ??
          'Resource Set';
        poData.show = poData.resource ? true : false;
        break;
      default:
        return;
    }
    overlay.set(poData);
    this.dispatchToInfoPanel(poData);
  }

  /**
   * Mirror the map-click selection into the left info-panel. Replaces
   * the on-map popover render path: the overlay() signal stays as the
   * selection state used by modify and delete flows, but the info-panel
   * now owns presentation. Measurement clicks (bearing_dist) stay
   * on-map because they show ad-hoc distance and bearing, not a
   * persistent feature.
   */
  private dispatchToInfoPanel(po: IPopover): void {
    if (!po.show || !po.type) {
      return;
    }
    switch (po.type) {
      case 's57':
        if (po.id && po.s57Feature) {
          this.infoPanel.openS57(
            po.id,
            po.title || 'S57 Feature',
            po.s57Feature
          );
        }
        return;
      case 'list': {
        // fb-map's featureList entries carry { id, coord, icon, text }
        // where `text` is the resource name resolved from the cache.
        // The info-panel FeatureListEntry uses `label`, so we map
        // text -> label. `type` is derived from the id prefix so users
        // see at a glance what kind of feature each row is. `icon` is
        // only forwarded when it is a known Material Icons ligature
        // (the prefix-driven set fb-map's case branch assigns); raw
        // POI-category strings like 'marina' or 'boat_ramp' are
        // dropped so fb-icon does not render them as literal text.
        // OL feature ids are <singular>.<resourceId> from the per-resource
        // layers; map singular to plural SKResourceType and strip the prefix
        // so the open() facade hits /resources/<plural>/<id>, not 404s.
        this.infoPanel.openFeatureList(
          po.title || 'Features',
          (
            po.content as {
              id?: string;
              text?: string;
              icon?: string;
            }[]
          ).map((entry) => {
            const rawId = String(entry?.id ?? '');
            const dot = rawId.indexOf('.');
            const prefix = dot > -1 ? rawId.slice(0, dot) : '';
            const type: SKResourceType | undefined =
              FEATURE_ID_PREFIX_TO_RESOURCE_TYPE[prefix];
            // Unknown prefixes (s57, alarm, ais-...) are informational rows
            // handled elsewhere, so leave the id untouched.
            const id = type ? rawId.slice(prefix.length + 1) : rawId;
            const label = entry?.text || id;
            const payload: {
              id: string;
              label: string;
              icon?: string;
              type?: SKResourceType;
            } = { id, label };
            if (entry?.icon && KNOWN_FEATURE_LIST_ICONS.has(entry.icon)) {
              payload.icon = entry.icon;
            }
            if (type) {
              payload.type = type;
            }
            return payload;
          })
        );
        return;
      }
      case 'chartlist':
        this.infoPanel.openChartList(
          (po.content as { id?: string; label?: string }[]).map((entry) => ({
            id: String(entry?.id ?? ''),
            label: String(entry?.label ?? entry?.id ?? '')
          }))
        );
        return;
      case 'alarm':
        if (po.id && po.alarm) {
          this.infoPanel.openAlarm(po.id, po.alarm);
        }
        return;
      case 'ais':
        if (po.vessel) {
          this.infoPanel.openVessel(po.id ?? '', po.vessel, po.isSelf === true);
        }
        return;
      case 'aton':
      case 'meteo':
        if (po.aton) {
          this.infoPanel.openAton(po.id ?? '', po.aton);
        } else if (po.meteo) {
          this.infoPanel.openAton(po.id ?? '', po.meteo);
        }
        return;
      case 'aircraft':
        if (po.aircraft) {
          this.infoPanel.openAircraft(po.id ?? '', po.aircraft);
        }
        return;
      case 'region':
      case 'note':
      case 'route':
      case 'waypoint':
      case 'destination':
        if (Array.isArray(po.resource)) {
          const collection = (
            po.type === 'destination' ? 'waypoints' : `${po.type}s`
          ) as SKResourceType;
          const id = po.resource[0];
          // openWith shows the cached resource immediately; open() fetches
          // the latest from the SignalK server so the description,
          // properties dict, and any plugin-augmented fields (e.g. the
          // ActiveCaptain POI body) are always current. Show cached first
          // so the panel opens with zero perceived latency, then refresh
          // in the background.
          this.infoPanel.openWith(
            collection,
            po.resource as Parameters<typeof this.infoPanel.openWith>[1]
          );
          if (id) {
            void this.infoPanel.open(collection, id);
          }
        }
        return;
      case 'rset':
        if (po.id && po.resource) {
          this.infoPanel.openResourceSet(
            po.id,
            po.title || 'Resource set',
            po.resource as ResourceSet,
            po.readOnly === true
          );
        }
        return;
      default:
        console.warn(`dispatchToInfoPanel: unhandled type "${po.type}"`);
        return;
    }
  }
}
