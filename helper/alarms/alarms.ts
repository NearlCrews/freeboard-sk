// **** Signal K Standard ALARMS notifier ****
import { NextFunction, Request, Response } from 'express';

// Express req.body shape for area-alarm endpoints. Raw input from the
// network: every field is validated by validateAreaBody before reuse.
interface AreaAlarmBody {
  trigger?: AlarmTrigger;
  geometry?: AlarmGeometry;
  coords?: Position[];
  center?: Position;
  radius?: number;
  name?: string;
}

interface RegionFeatureProperties {
  skIcon?: string;
}

interface RegionFeatureGeometry {
  type?: string;
  coordinates: number[][][] | number[][][][];
}

interface RegionResource {
  name?: string;
  feature: {
    geometry: RegionFeatureGeometry;
    properties: RegionFeatureProperties;
  };
}
import {
  ALARM_METHOD,
  ALARM_STATE,
  Context,
  Delta,
  hasValues,
  Path,
  PathValue,
  Position,
  SKVersion,
  SubscribeMessage,
  Update
} from '@signalk/server-api';
import { FreeboardHelperApp } from '../index';
import * as uuid from 'uuid';

// Helpers replacing geolib (dropped Phase 4a). Server-side, low frequency,
// so haversine and ray-casting beat pulling OL's sphere helpers into Node.
const EARTH_R = 6371008.8;
const toRad = (d: number) => (d * Math.PI) / 180;

function isPointWithinRadius(p: Position, c: Position, r: number): boolean {
  const dLat = toRad(p.latitude - c.latitude);
  const dLon = toRad(p.longitude - c.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c.latitude)) *
      Math.cos(toRad(p.latitude)) *
      Math.sin(dLon / 2) ** 2;
  const d = 2 * EARTH_R * Math.asin(Math.sqrt(a));
  return d <= r;
}

function isPointInPolygon(p: Position, poly: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i];
    const pj = poly[j];
    if (!pi || !pj) continue;
    const intersect =
      pi.latitude > p.latitude !== pj.latitude > p.latitude &&
      p.longitude <
        ((pj.longitude - pi.longitude) * (p.latitude - pi.latitude)) /
          (pj.latitude - pi.latitude) +
          pi.longitude;
    if (intersect) inside = !inside;
  }
  return inside;
}

type AlarmTrigger = 'entry' | 'exit';
type AlarmGeometry = 'polygon' | 'circle' | 'region';

interface AreaAlarmDef {
  geometry: AlarmGeometry;
  trigger: AlarmTrigger;
  coords?: Position[];
  center?: Position;
  radius?: number;
  name?: string;
}

const AREA_TRIGGERS: AlarmTrigger[] = ['entry', 'exit'];
const AREA_GEOMETRIES: AlarmGeometry[] = ['polygon', 'circle', 'region'];

const ALARM_API_PATH = '/signalk/v2/api/alarms';

interface AreaAlarmStatus {
  alarmId: string;
  active: boolean;
  lastUpdate: number;
}

type AlarmCondition = 'inside' | 'outside';

class AreaAlarmManager {
  private alarms: Map<string, AreaAlarmStatus>;
  constructor() {
    this.alarms = new Map();
  }

  /**
   * Remove area from alarm manager
   * @param id Area identifier
   */
  delete(id: string) {
    // clean up notification
    this.alarms.delete(id);
    emitNotification({
      path: `notifications.area.${id}` as Path,
      value: null
    });
  }

  /**
   * Trigger alarm status update assessment
   * @param id Area identifier
   * @param condition current condition
   * @returns void
   */
  update(id: string, condition: AlarmCondition) {
    if (!alarmAreas.has(id)) {
      return;
    }
    if (!this.alarms.has(id)) {
      this.alarms.set(id, {
        alarmId: id,
        active: false,
        lastUpdate: Date.now() - 1000
      });
    }
    this.assessStatus(id, condition);
  }

  /**
   * Silence alarm with the supplied identifier
   * @param id Area identifier
   */
  silence(id: string) {
    const n = getSelfPathValue<{ method?: ALARM_METHOD[] }>(
      `notifications.area.${id}`
    );
    if (!n?.value) {
      return;
    }
    if (Array.isArray(n.value.method)) {
      n.value.method = n.value.method.filter((i) => i !== 'sound');
    }
    emitNotification({
      path: `notifications.area.${id}` as Path,
      value: n.value
    });
  }

  /**
   * Assess and emit alarm based on supplied condition
   * @param id alarm id
   * @param condition current condition
   */
  private assessStatus(id: string, condition: AlarmCondition) {
    const area = alarmAreas.get(id);
    const alarm = this.alarms.get(id);
    if (!area || !alarm) {
      return;
    }
    let notify = false;

    if (area.trigger === 'entry') {
      if (condition === 'inside' && !alarm.active) {
        alarm.active = true;
        notify = true;
        server.debug(`*** inactive -> to active (${id})`);
      }
      if (condition === 'outside' && alarm.active) {
        alarm.active = false;
        notify = true;
        server.debug(`*** active -> to inactive (${id})`);
      }
    } else {
      if (condition === 'outside' && !alarm.active) {
        alarm.active = true;
        notify = true;
        server.debug(`*** inactive -> to active (${id})`);
      }
      if (condition === 'inside' && alarm.active) {
        alarm.active = false;
        notify = true;
        server.debug(`*** active -> to inactive (${id})`);
      }
    }

    if (notify) {
      alarm.lastUpdate = Date.now();
      const msg =
        area.trigger === 'entry'
          ? alarm.active
            ? `Monitored area ${
                area.name ? area.name + ' ' : ''
              }has been entered.`
            : ''
          : alarm.active
            ? `Vessel has left the monitored area ${area.name ?? ''}`
            : '';

      const state = alarm.active ? ALARM_STATE.alarm : ALARM_STATE.normal;

      emitNotification({
        path: `notifications.area.${id}` as Path,
        value: {
          message: msg,
          method: [ALARM_METHOD.sound, ALARM_METHOD.visual],
          state: state
        }
      });
    }
  }
}

// ******************************************************************

let server: FreeboardHelperApp;
let pluginId: string;
let unsubscribes: (() => void)[] = [];

const alarmAreas = new Map<string, AreaAlarmDef>();
const alarmManager: AreaAlarmManager = new AreaAlarmManager();

const getSelfPathValue = <T>(path: string): { value?: T } | undefined => {
  return server.getSelfPath(path) as { value?: T } | undefined;
};

export const initAlarms = (app: FreeboardHelperApp, id: string) => {
  server = app;
  pluginId = id;

  server.debug(`** initAlarms() **`);

  initAlarmEndpoints();

  setTimeout(() => parseRegionList(), 5000);

  // subscribe to deltas
  const subCommand: SubscribeMessage = {
    context: 'vessels.self' as Context,
    subscribe: [
      {
        path: 'resources.*' as Path,
        policy: 'instant'
      },
      {
        path: 'navigation.position' as Path,
        policy: 'instant'
      }
    ]
  };

  server.subscriptionmanager.subscribe(
    subCommand,
    unsubscribes,
    (err) => {
      console.log(`error: ${err}`);
    },
    handleDeltaMessage
  );
};

export const shutdownAlarms = () => {
  unsubscribes.forEach((s) => s());
  unsubscribes = [];
};

const handleDeltaMessage = (delta: Delta) => {
  if (!delta.updates) {
    return;
  }
  delta.updates.forEach((u: Update) => {
    if (!hasValues(u)) {
      return;
    }
    u.values.forEach((v: PathValue) => {
      const t = v.path.split('.');
      if (t[0] === 'resources' && t[1] === 'regions' && t[2]) {
        processRegionUpdate(t[2], v.value as RegionResource | null | undefined);
      }
      if (t[0] === 'navigation' && t[1] === 'position') {
        processVesselPositionUpdate(v.value as Position);
      }
    });
  });
};

const initAlarmEndpoints = async () => {
  server.debug(`** Registering Alarm Action API endpoint(s) **`);

  // list area alarms
  server.get(
    `${ALARM_API_PATH}/area`,
    async (req: Request, res: Response, next: NextFunction) => {
      server.debug(`** ${req.method} ${req.path}`);
      const ar = Array.from(alarmAreas);
      res.status(200).json(ar);
    }
  );
  // new area alarm
  server.post(
    `${ALARM_API_PATH}/area`,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        validateAreaBody(req.body);
      } catch (err) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (err as Error).message
        });
        return;
      }

      if (req.body.geometry === 'region') {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: `Invalid geometry value 'region'. Use PUT request specifying a region identifier.`
        });
        return;
      }

      const id = uuid.v4();
      alarmAreas.set(id, req.body);
      res.status(200).json({
        state: 'COMPLETE',
        statusCode: 200,
        message: `Alarm Area created: ${id}`
      });
    }
  );
  server.put(
    `${ALARM_API_PATH}/area/:id`,
    async (req: Request, res: Response, next: NextFunction) => {
      server.debug(`** ${req.method} ${req.path}`);

      const id = req.params['id'];
      if (!id) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: 'Area id is required.'
        });
        return;
      }

      try {
        validateAreaBody(req.body);
      } catch (err) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (err as Error).message
        });
        return;
      }

      if (req.body.geometry === 'region') {
        try {
          const reg = (await fetchRegion(id)) as RegionResource;
          const coords = parseRegionCoords(reg);
          if (Array.isArray(coords)) {
            const def: AreaAlarmDef = {
              geometry: req.body.geometry,
              trigger: req.body.trigger ?? 'entry',
              coords: coords
            };
            if (reg.name) {
              def.name = reg.name;
            }
            alarmAreas.set(id, def);
            res.status(200).json({
              state: 'COMPLETE',
              statusCode: 200,
              message: `Alarm set for region: ${id}`
            });
          } else {
            res.status(400).json({
              state: 'FAILED',
              statusCode: 400,
              message: `Region not found!`
            });
          }
        } catch (e) {
          res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: (e as Error).message
          });
        }
      } else {
        const msg = alarmAreas.has(id)
          ? `Alarm Area updated: ${id}`
          : `Alarm Area created: ${id}`;
        alarmAreas.set(id, req.body);
        res.status(200).json({
          state: 'COMPLETE',
          statusCode: 200,
          message: msg
        });
      }
    }
  );
  server.delete(
    `${ALARM_API_PATH}/area/:id`,
    (req: Request, res: Response, next: NextFunction) => {
      server.debug(`** ${req.method} ${req.path}`);
      const id = req.params['id'];
      if (!id) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: 'Area id is required.'
        });
        return;
      }
      try {
        if (alarmAreas.has(id)) {
          deleteArea(id);
          res.status(200).json({
            state: 'COMPLETE',
            statusCode: 200,
            message: `Alarm Area Cleared: ${id}`
          });
        } else {
          res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: `Area not found!`
          });
        }
      } catch (e) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (e as Error).message
        });
      }
    }
  );

  server.post(
    `${ALARM_API_PATH}/area/:id/silence`,
    (req: Request, res: Response) => {
      server.debug(`** ${req.method} ${req.path}`);

      const id = req.params['id'];
      if (!id) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: 'Area id is required.'
        });
        return;
      }

      try {
        if (alarmAreas.has(id)) {
          alarmManager.silence(id);
          res.status(200).json({
            state: 'COMPLETE',
            statusCode: 200,
            message: `Alarm silenced: ${id}`
          });
        } else {
          res.status(400).json({
            state: 'FAILED',
            statusCode: 400,
            message: `Area not found!`
          });
        }
      } catch (e) {
        res.status(400).json({
          state: 'FAILED',
          statusCode: 400,
          message: (e as Error).message
        });
      }
    }
  );
};

// emit notification delta message **
const emitNotification = (msg: PathValue) => {
  const delta = {
    updates: [{ values: [msg] }]
  };
  server.handleMessage(pluginId, delta, SKVersion.v2);
};

// ********** Area Alarm methods ***************

/**
 * Remove Area from management
 * @param id Area identifier
 */
const deleteArea = (id: string) => {
  alarmAreas.delete(id);
  alarmManager.delete(id);
};

/**
 * Validate Area Alarm request parameters
 * @param body request body
 */
const validateAreaBody = (body: AreaAlarmBody) => {
  if (!body.trigger) {
    body.trigger = 'entry';
  } else if (!AREA_TRIGGERS.includes(body.trigger)) {
    throw new Error(`Area alarm trigger is invalid!`);
  }
  if (!body.geometry) {
    body.geometry = 'polygon';
  } else if (!AREA_GEOMETRIES.includes(body.geometry)) {
    throw new Error(`Area alarm geometry is invalid!`);
  }

  if (body.geometry === 'polygon') {
    if (!Array.isArray(body.coords)) {
      throw new Error(`Area coordinates not provided or are invalid!`);
    }
    const first = body.coords[0];
    if (!first) {
      throw new Error(`Area coordinates not provided!`);
    }
    if (!isValidPosition(first)) {
      throw new Error(`Area coordinates are invalid!`);
    }
    delete body.center;
    delete body.radius;
  }
  if (body.geometry === 'circle') {
    if (!body.center || !isValidPosition(body.center)) {
      throw new Error(`Center coordinate not provided or is invalid!`);
    }
    if (typeof body.radius !== 'number') {
      throw new Error(`Radius not provided or invalid!`);
    }
    delete body.coords;
  }

  if (body.geometry === 'region') {
    delete body.coords;
    delete body.center;
    delete body.radius;
  }
};

/**
 * Determines if supplied position is valid
 * @param position
 * @returns true if valid
 */
const isValidPosition = (position: Position): boolean => {
  return (
    !!position &&
    'latitude' in position &&
    'longitude' in position &&
    typeof position.latitude === 'number' &&
    position.latitude >= -90 &&
    position.latitude <= 90 &&
    typeof position.longitude === 'number' &&
    position.longitude >= -180 &&
    position.longitude <= 180
  );
};

/**
 * Fetch region resource details
 * @param id Region identifier
 * @returns coordinates array
 */
const fetchRegion = (id: string) =>
  server.resourcesApi.getResource('regions', id);

/**
 * Fetch list of region resources and parse them to assign alarm area
 * @returns void
 */
const parseRegionList = async () => {
  const regList = await server.resourcesApi.listResources('regions', {});
  Object.entries(regList).forEach(([id, region]) =>
    processRegionUpdate(id, region as RegionResource | null | undefined)
  );
};

/**
 * Extract and format region coordinates
 * @param region Region data
 * @returns coordinates array
 */
const parseRegionCoords = (region: RegionResource): Position[] => {
  const coords = region.feature.geometry.coordinates;
  const c: number[][] =
    region.feature.geometry.type === 'MultiPolygon'
      ? (coords as number[][][][])[0]![0]!
      : (coords as number[][][])[0]!;
  return c.map((i) => ({ latitude: i[1]!, longitude: i[0]! }));
};

/**
 * CrUD area alarm from Region delta
 * @param id Region identifier
 * @param region Region data
 */
const processRegionUpdate = (
  id: string,
  region: RegionResource | null | undefined
) => {
  const existing = alarmAreas.get(id);
  if (existing) {
    if (!region) {
      deleteArea(id);
      return;
    }
    if (region.feature.properties.skIcon !== 'hazard') {
      deleteArea(id);
      return;
    }
    existing.coords = parseRegionCoords(region);
    if (region.name) {
      existing.name = region.name;
    } else {
      delete existing.name;
    }
    alarmAreas.set(id, existing);
    return;
  }
  if (region && region.feature.properties.skIcon === 'hazard') {
    const def: AreaAlarmDef = {
      trigger: 'entry',
      geometry: 'region',
      coords: parseRegionCoords(region)
    };
    if (region.name) {
      def.name = region.name;
    }
    alarmAreas.set(id, def);
  }
};

/**
 * Process received vessel.position update delta and
 * determine the current each managed area's trigger condition
 * @param position Vessel position
 */
const processVesselPositionUpdate = (position: Position) => {
  if (!isValidPosition(position)) {
    return;
  }

  alarmAreas.forEach((v, k) => {
    let inside: boolean;
    if (v.geometry === 'circle') {
      if (!v.center || typeof v.radius !== 'number') {
        return;
      }
      inside = isPointWithinRadius(position, v.center, v.radius);
    } else {
      if (!v.coords) {
        return;
      }
      inside = isPointInPolygon(position, v.coords);
    }
    const condition: AlarmCondition = inside ? 'inside' : 'outside';
    const label = v.geometry === 'circle' ? 'radius' : 'area';
    server.debug(`Vessel ${condition} alarm ${label} ${k}`);
    alarmManager.update(k, condition);
  });
};
