import { AppIconSet } from './app.icons';
import { AtoNsType1 } from './atons';
import { MapIconDef } from '../map/ol/lib/map-image-registry.service';

const WaypointMarkerIcons: AppIconSet = {
  path: './assets/img/waypoints',
  scale: 1,
  anchor: [10.5, 25],
  files: ['waypoint.png', 'marker-blue.png', 'marker-green.png']
};

export const WaypointIcons: AppIconSet = {
  path: './assets/img/waypoints',
  scale: 1,
  anchor: [12, 24],
  files: [
    'start-pin.svg',
    'start-boat.svg',
    'whale.svg',
    'pob.svg',
    'pseudoaton.svg'
  ]
};

export const getWaypointDefs = (): Record<string, MapIconDef> => {
  const waypointList: Record<string, MapIconDef> = {};

  const addToList = (list: AppIconSet) => {
    list.files.forEach((file: string) => {
      const id = file.slice(0, file.indexOf('.'));
      const def: MapIconDef = { path: `${list.path}/${file}` };
      if (list.scale !== undefined) def.scale = list.scale;
      if (list.anchor !== undefined) def.anchor = list.anchor;
      waypointList[id] = def;
    });
  };
  addToList(WaypointMarkerIcons);
  addToList(WaypointIcons);
  addToList(AtoNsType1);
  const fallback = waypointList['waypoint'];
  if (fallback) waypointList['default'] = fallback;
  return waypointList;
};
