import {
  SKRoute,
  SKWaypoint,
  SKNote,
  SKChart,
  SKRegion,
  SKTrack,
  SKVessel
} from 'src/app/modules/skresources/resource-classes';

import {
  SKInfoLayer,
  SKResourceSet
} from 'src/app/modules/skresources/custom-resource-classes';

export type FBRoutes = FBRoute[];
export type FBRoute = [string, SKRoute, boolean?];

export type FBWaypoints = FBWaypoint[];
export type FBWaypoint = [string, SKWaypoint, boolean?];

export type FBNotes = FBNote[];
export type FBNote = [string, SKNote, boolean?];

export type FBRegions = FBRegion[];
export type FBRegion = [string, SKRegion, boolean?];

export type FBCharts = FBChart[];
export type FBChart = [string, SKChart, boolean?];

export type FBTracks = FBTrack[];
export type FBTrack = [string, SKTrack, boolean?];

export type FBVessels = FBVessel[];
export type FBVessel = [string, SKVessel, boolean?];

export type FBResourceSets = FBResourceSet[];
export type FBResourceSet = [string, SKResourceSet, boolean?];

export type FBInfoLayers = FBInfoLayer[];
export type FBInfoLayer = [string, SKInfoLayer, boolean?];

export type FBResource =
  | FBRoute
  | FBWaypoint
  | FBNote
  | FBRegion
  | FBChart
  | FBTrack;

export interface FBResourceSelect {
  id: string;
  value?: boolean;
  type?: string;
  isGroup?: boolean;
}
