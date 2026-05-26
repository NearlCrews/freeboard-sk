// AtoN Icons

import { AppIconSet } from './app.icons';
import { MapIconDef } from '../map/ol/lib/map-image-registry.service';

export const AtoNsType1: AppIconSet = {
  path: './assets/img/atons',
  files: [
    'real-north.svg',
    'real-south.svg',
    'real-east.svg',
    'real-west.svg',
    'real-port.svg',
    'real-starboard.svg',
    'real-danger.svg',
    'real-special.svg',
    'virtual-north.svg',
    'virtual-south.svg',
    'virtual-east.svg',
    'virtual-west.svg',
    'virtual-port.svg',
    'virtual-starboard.svg',
    'virtual-danger.svg',
    'virtual-special.svg'
  ],
  scale: 0.4,
  anchor: [23, 72]
};

const AtoNsType2: AppIconSet = {
  path: './assets/img/atons',
  files: [
    'real-basestation.svg',
    'real-aton.svg',
    'real-safe.svg',
    'virtual-basestation.svg',
    'virtual-aton.svg',
    'virtual-safe.svg'
  ],
  scale: 0.4,
  anchor: [23, 49]
};

export const ATON_TYPE_IDS: Record<string, string> = {
  aton: 'aton',
  '-2': 'basestation',
  '-1': 'weatherStation',
  //fixed
  9: 'north',
  10: 'east',
  11: 'south',
  12: 'west',
  13: 'port',
  14: 'starboard',
  // floating
  20: 'north',
  21: 'east',
  22: 'south',
  23: 'west',
  24: 'port',
  25: 'starboard',
  28: 'danger',
  29: 'safe',
  30: 'special'
};

const WeatherStation: MapIconDef = {
  path: './assets/img/weather_station.png',
  anchor: [1, 25],
  scale: 0.75
};

/**
 * @description Build MapIcon definitions for use by MapImageRegistry
 */
type AtoNGroup = Record<string, MapIconDef>;
type AtoNList = Record<string, AtoNGroup>;

export const getAtoNDefs = () => {
  const atonList: AtoNList = {};

  const addToList = (list: AppIconSet) => {
    list.files.forEach((file: string) => {
      const gid = file.slice(0, file.lastIndexOf('-'));
      const id = file.slice(file.lastIndexOf('-') + 1, file.indexOf('.'));
      let group = atonList[gid];
      if (!group) {
        group = {};
        atonList[gid] = group;
      }
      group[id] = {
        path: `${list.path}/${file}`,
        scale: list.scale,
        anchor: list.anchor
      };
    });
  };
  addToList(AtoNsType1);
  addToList(AtoNsType2);
  const real = atonList['real'] ?? (atonList['real'] = {});
  const virtual = atonList['virtual'] ?? (atonList['virtual'] = {});
  real['weatherStation'] = WeatherStation;
  virtual['weatherStation'] = WeatherStation;
  return atonList;
};
