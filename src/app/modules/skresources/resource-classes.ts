// **** RESOURCE CLASSES **********

import {
  LineStringFeature,
  PointFeature,
  PolygonFeature,
  MultiPolygonFeature,
  MultiLineStringFeature,
  Position,
  TrackResource,
  SKPosition,
  RouteResource,
  WaypointResource,
  RegionResource,
  NoteResource,
  ChartResource
} from 'src/app/types';

// ** Signal K route class
export class SKRoute {
  name: string;
  description: string;
  distance = 0;
  feature: LineStringFeature;

  constructor(route?: RouteResource) {
    this.name = route?.name ? route.name : '';
    this.description = route?.description ? route.description : '';
    this.distance = route?.distance ? route.distance : 0;
    this.feature = route?.feature ?? {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: []
      },
      properties: {},
      id: ''
    };
  }
}

// ** Signal K waypoint
export class SKWaypoint {
  name: string;
  description: string;
  feature: PointFeature;
  type: string;

  constructor(wpt?: WaypointResource) {
    this.name = wpt?.name ? wpt.name : '';
    this.description = wpt?.description ? wpt.description : '';
    this.type = wpt?.type ? wpt.type : '';
    this.feature = wpt?.feature ?? {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      properties: {},
      id: ''
    };
  }
}

// ** Signal K Note
export class SKNote {
  name: string;
  description: string;
  position: SKPosition;
  href: string;
  mimeType: string;
  url: string;
  group: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authors: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;

  constructor(note?: NoteResource) {
    this.name = note?.name ?? '';
    this.description = note?.description ?? '';
    this.position = note?.position;
    this.href = note?.href;
    this.mimeType = note?.mimeType ?? '';
    this.url = note?.url ?? '';
    // ca reports
    this.group = note?.group;
    this.authors =
      note?.authors && Array.isArray(note?.authors) ? note.authors : [];
    this.properties =
      note?.properties && typeof note?.properties === 'object'
        ? note.properties
        : {};
  }
}

// ** Signal K Region **
export class SKRegion {
  name: string;
  description: string;
  feature: PolygonFeature | MultiPolygonFeature;

  constructor(region?: RegionResource) {
    this.name = region?.name ? region.name : '';
    this.description = region?.description ? region.description : '';
    this.feature = region?.feature ?? {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: []
      },
      properties: {},
      id: ''
    };
  }
}

// ** Signal K chart
export class SKChart {
  identifier: string;
  name: string;
  description: string;
  region: string;
  scale = 250000;
  layers: string[];
  bounds: number[];
  format: string;
  minZoom = 0;
  maxZoom = 24;
  type: string;
  url: string;
  source: string;
  style: string;
  defaultOpacity: number;
  proxy: boolean;

  constructor(chart?: ChartResource) {
    this.identifier = chart?.identifier ? chart.identifier : undefined;
    this.name = chart?.name ? chart.name : undefined;
    this.description = chart?.description ? chart.description : undefined;
    this.layers = chart?.layers ? chart.layers : [];
    this.bounds = chart?.bounds ? chart.bounds : undefined;
    this.format = chart?.format ? chart.format : undefined;
    this.minZoom =
      typeof chart?.minzoom !== 'undefined' ? chart.minzoom : this.minZoom;
    this.maxZoom =
      typeof chart?.maxzoom !== 'undefined' ? chart.maxzoom : this.maxZoom;
    this.type = chart?.type ? chart.type : undefined;
    this.url = chart?.url ? chart.url : undefined;
    this.scale =
      typeof chart?.scale !== 'undefined' && !isNaN(chart?.scale)
        ? chart.scale
        : this.scale;
    this.style = chart?.style ?? undefined;
    this.source = chart?.$source ?? undefined;
    this.defaultOpacity = chart?.defaultOpacity ?? 1;
    this.proxy = chart?.proxy ?? false;
  }
}

// ** Signal K Track
export class SKTrack {
  name: string;
  description: string;
  feature: MultiLineStringFeature;

  constructor(trk?: TrackResource) {
    this.feature = trk?.feature ?? {
      type: 'Feature',
      geometry: {
        type: 'MultiLineString',
        coordinates: []
      },
      properties: {},
      id: ''
    };
    this.name = this.feature.properties?.name ?? '';
    this.description = this.feature.properties?.description ?? '';
  }
}

// ** SK Target Base class **
class SKTargetBase {
  id = '';
  name = '';
  mmsi = '';
  position: Position | null = null;
  positionReceived = false;
  positionTimestamp = '';
  state = '';
  type: { id: number | null; name: string } = { id: -1, name: '' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any> = {};
  lastUpdated = new Date();
  callsignVhf = '';
  callsignHf = '';
  orientation = 0;
  virtual?: boolean;
}

// ** Vessel Data **

type Nullable<T> = T | null;

export class SKVessel extends SKTargetBase {
  // stream sourced attributes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anchor: { maxRadius: any; radius: any; position: any } = {
    maxRadius: null,
    radius: null,
    position: null
  };
  autopilot: {
    state: Nullable<string>;
    mode: Nullable<string>;
    target: Nullable<number>;
    enabled: boolean;
    default: Nullable<string>;
    availableActions: string[];
  } = {
    state: null,
    mode: null,
    target: null,
    enabled: false,
    default: null,
    availableActions: []
  };
  buddy = false;
  closestApproach: {
    distance: Nullable<number>;
    timeTo: Nullable<number>;
  } = {
    distance: null,
    timeTo: null
  };
  cog: Nullable<number> = null;
  cogTrue: Nullable<number> = null;
  cogMagnetic: Nullable<number> = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  courseApi: Record<string, any> = {
    arrivalCircle: 0,
    activeRoute: {},
    nextPoint: {},
    previousPoint: {}
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  courseCalcs: Record<string, any> = {};
  distanceToSelf: Nullable<number> = null;
  environment: {
    mode: Nullable<string>;
    sun: Nullable<string>;
  } = {
    mode: null,
    sun: null
  };
  heading: Nullable<number> = null;
  headingTrue: Nullable<number> = null;
  headingMagnetic: Nullable<number> = null;
  performance: {
    beatAngle: Nullable<number>;
    gybeAngle: Nullable<number>;
  } = {
    beatAngle: null,
    gybeAngle: null
  };
  racing: Record<string, string> = {};
  registrations: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resourceUpdates: any[] = []; // resource deltas
  sog: Nullable<number> = null;
  track: Position[][] = [];
  vectors: { cog: Position[] } = {
    cog: []
  };
  cogVecKey: [number, number, number, number] | null = null;
  wind: {
    direction: Nullable<number>;
    mwd: Nullable<number>;
    twd: Nullable<number>;
    tws: Nullable<number>;
    speedTrue: Nullable<number>;
    sog: Nullable<number>;
    awa: Nullable<number>;
    aws: Nullable<number>;
  } = {
    direction: null,
    mwd: null,
    twd: null,
    tws: null,
    speedTrue: null,
    sog: null,
    awa: null,
    aws: null
  };

  // http api sourced attributes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  design: Record<string, any> = {
    airHeight: null,
    beam: null,
    draft: {
      current: null,
      maximum: null
    },
    length: null
  };
  destination: {
    name: Nullable<string>;
    eta: Nullable<string>;
  } = {
    name: null,
    eta: null
  };
  flag = '';
  port = '';
}

// ** SaR class **
export class SKSaR extends SKTargetBase {
  constructor() {
    super();
  }
}

// ** Aircraft Data **
export class SKAircraft extends SKTargetBase {
  sog = 0;
  track: Position[][] = [];
  constructor() {
    super();
  }
}

// ** AtoN class **
export class SKAtoN extends SKTargetBase {
  constructor() {
    super();
  }
}

// ** Meteo / weather class **
export class SKMeteo extends SKAtoN {
  twd: number;
  tws: number;
  temperature: number;
  constructor() {
    super();
  }
}
