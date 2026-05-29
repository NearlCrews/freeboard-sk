import { AlertData } from '../alarms';
import {
  SKNote,
  SKRegion,
  SKResourceType,
  SKRoute,
  SKWaypoint
} from '../skresources';

import { OpenBridgeIcons } from './openbridge';
import { PoiIcons } from './poi';
import { AtoNsType1 } from './atons';
import { WaypointIcons, getWaypointDefs } from './waypoints';
import { VesselAisIcons, AIS_TYPE_IDS } from './vessels';

export interface AppIconSet {
  path: string;
  files: string[];
  scale?: number;
  anchor?: [number, number];
}

export interface AppIconDef {
  class?: string;
  svgIcon?: string;
  name?: string;
}

/** Return a list of SVG Icons
 * @description Builds a list of SVG Icons for loading into the IconRegistry
 * @returns Array of files (including path)
 */
export const getSvgList = (): { id: string; path: string }[] => {
  const svgList: { id: string; path: string }[] = [];

  const addToList = (list: AppIconSet, prefix?: string) => {
    list.files.forEach((file: string) => {
      const id = file.slice(0, file.lastIndexOf('.'));
      svgList.push({
        id: `${prefix ?? ''}${id}`,
        path: `${list.path}/${file}`
      });
    });
  };
  addToList(OpenBridgeIcons);
  addToList(PoiIcons, 'sk-');
  addToList(VesselAisIcons);
  addToList(WaypointIcons);
  addToList(AtoNsType1);
  return svgList;
};

/**
 * @description Return an icon definition that can be used to assign an fb-icon for a resource
 * @param resourceType The type of resource supplied 'route' | 'waypoint' | 'region' | 'note'
 * @param resource Signal K resource
 * @returns Icon definition object
 */
export const getResourceIcon = (
  resourceType: SKResourceType,
  resource?: SKRoute | SKWaypoint | SKRegion | SKNote | string
): AppIconDef => {
  if (resourceType === 'routes') {
    return { class: 'icon-route', svgIcon: 'route' };
  }
  if (resourceType === 'regions') {
    const iconDef: AppIconDef = {
      class: 'icon-region',
      name: 'tab_unselected'
    };
    if (!resource) {
      return iconDef;
    }
    const icon =
      typeof resource === 'string'
        ? resource
        : (resource as SKRegion).feature.properties?.['skIcon'];
    if (!icon) {
      return iconDef;
    }
    return { svgIcon: `sk-${icon}` };
  }
  if (resourceType === 'notes') {
    const iconDef: AppIconDef = {
      class: 'icon-accent',
      name: 'local_offer'
    };
    if (!resource) {
      return iconDef;
    }
    const icon =
      typeof resource === 'string'
        ? resource
        : (resource as SKNote).properties?.['skIcon'];
    if (!icon) {
      return iconDef;
    }
    return { svgIcon: `sk-${icon}` };
  }
  if (resourceType === 'waypoints') {
    const wptDefs = getWaypointDefs();
    const skIcon =
      typeof resource === 'string' || typeof resource === 'undefined'
        ? undefined
        : (resource as SKWaypoint).feature.properties?.['skIcon'];
    const wptType =
      typeof resource === 'string' || typeof resource === 'undefined'
        ? resource
        : (resource as SKWaypoint).type;
    const wid = skIcon ?? wptType ?? 'default';

    if (!resource || wid === 'default' || !wptDefs[wid]) {
      return { class: 'icon-waypoint', name: 'location_on' };
    }
    return { svgIcon: wid };
  }
  return { class: 'icon-default', name: 'help_outline' };
};

/**
 * @description Return an icon definition for an Alert
 * @param alert AlertData object
 * @returns Icon Definition object
 */
export const getAlertIcon = (alert: AlertData): AppIconDef => {
  if (
    alert.type !== undefined &&
    ['mob', 'fire', 'abandon', 'aground', 'cpa', 'depth'].includes(alert.type)
  ) {
    return { class: 'ob', svgIcon: `alarm-${alert.type}` };
  } else if (alert.type === 'arrivalCircleEntered') {
    return { svgIcon: 'alarm-arrival', name: 'arrival' };
  } else if (alert.type === 'anchor') {
    return { name: 'anchor' };
  } else if (alert.type === 'meteo') {
    return { name: 'air' };
  } else if (alert.priority === 'warn') {
    return { class: 'ob', svgIcon: 'warning-unack-iec' };
  } else if (['emergency', 'alarm'].includes(alert.priority)) {
    const icon = alert.acknowledged
      ? 'alarm-acknowledged-iec'
      : alert.silenced
        ? 'alarm-silenced-iec'
        : 'alarm-unack-iec';
    return { svgIcon: icon };
  } else {
    const icon = alert.acknowledged
      ? 'warning-acknowledged-iec'
      : alert.silenced
        ? 'warning-silenced-iec'
        : 'warning-unack-iec';
    return { svgIcon: icon };
  }
};

/**
 * @description Return an icon definition for an AIS vessel
 * @param id AIS shipType
 * @returns Icon Definition object
 */
export const getAisIcon = (id: number | string): AppIconDef => {
  if (typeof id === 'number') {
    id = Math.floor(id / 10) * 10;
  }
  const key = String(id);
  const svgIcon = AIS_TYPE_IDS[key];
  if (!id || !svgIcon) {
    const fallback = AIS_TYPE_IDS['default'] ?? 'ais_active';
    return { svgIcon: fallback, name: 'default' };
  }
  return { svgIcon, name: key };
};

/**
 * @description Return a list of POI icon ids
 */
export const listPoiIds = (): { id: string; name: string }[] => {
  const icons = PoiIcons.files.map((file: string) => {
    const name = file.slice(0, file.lastIndexOf('.'));
    return {
      id: `sk-${name}`,
      name: name
    };
  });
  icons.unshift({
    id: '',
    name: `local_offer`
  });
  return icons;
};
