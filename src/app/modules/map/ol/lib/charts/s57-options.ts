import { DEPTH_UNIT } from 'src/app/lib/convert';

// Kept in its own module so app.config and the types barrel can pull the
// S57 options shape without dragging in the S57Service code (and through it
// xml2js + the S57Style chunk).
export interface Options {
  shallowDepth: number;
  safetyDepth: number;
  deepDepth: number;
  graphicsStyle: 'Simplified' | 'Paper';
  boundaries: 'Symbolized' | 'Plain';
  colors: 2 | 4;
  colorTable: number;
  otherLayers: string[];
  depthUnit: DEPTH_UNIT;
}

export const DefaultOptions: Options = {
  shallowDepth: 2,
  safetyDepth: 3,
  deepDepth: 6,
  graphicsStyle: 'Paper',
  boundaries: 'Plain',
  colors: 4,
  colorTable: 0,
  otherLayers: [
    'SOUNDG',
    'OBSTRN',
    'UWTROC',
    'WRECKS',
    'DEPCNT',
    'RIVERS',
    'LAKARE'
  ],
  depthUnit: 'm'
};
