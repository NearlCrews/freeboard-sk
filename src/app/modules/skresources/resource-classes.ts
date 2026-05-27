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
  name = '';
  description = '';
  distance = 0;
  feature: LineStringFeature = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: []
    },
    properties: {},
    id: ''
  };

  constructor(route?: RouteResource) {
    if (route) {
      this.name = route.name ?? '';
      this.description = route.description ?? '';
      this.distance = route.distance ?? 0;
      if (route.feature) this.feature = route.feature;
    }
  }
}

// ** Signal K waypoint
export class SKWaypoint {
  name = '';
  description = '';
  type = '';
  feature: PointFeature = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [0, 0]
    },
    properties: {},
    id: ''
  };

  constructor(wpt?: WaypointResource) {
    if (wpt) {
      this.name = wpt.name ?? '';
      this.description = wpt.description ?? '';
      this.type = wpt.type ?? '';
      if (wpt.feature) this.feature = wpt.feature;
    }
  }
}

// ** Signal K Note
export class SKNote {
  name = '';
  description = '';
  position?: SKPosition;
  href = '';
  mimeType = '';
  url = '';
  group = '';
  // Producer plugin id (the SignalK delta '$source' field). Captured so
  // the info-panel can render a clean attribution footer without parsing
  // the description text.
  source = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authors: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any> = {};

  constructor(note?: NoteResource) {
    if (note) {
      this.name = note.name ?? '';
      this.description = note.description ?? '';
      if (note.position) this.position = note.position;
      this.href = note.href ?? '';
      this.mimeType = note.mimeType ?? '';
      this.url = note.url ?? '';
      this.group = note.group ?? '';
      // SignalK servers wire the producer as either '$source' (the
      // delta JSON key) or 'source' (some legacy paths); accept either.
      const raw = note as unknown as Record<string, unknown>;
      const dollarSource = raw['$source'];
      const plainSource = raw['source'];
      this.source =
        (typeof dollarSource === 'string' && dollarSource) ||
        (typeof plainSource === 'string' && plainSource) ||
        '';
      this.authors = Array.isArray(note.authors) ? note.authors : [];
      this.properties =
        note.properties && typeof note.properties === 'object'
          ? note.properties
          : {};
    }
  }
}

// ** Signal K Region **
export class SKRegion {
  name = '';
  description = '';
  feature: PolygonFeature | MultiPolygonFeature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: []
    },
    properties: {},
    id: ''
  };

  constructor(region?: RegionResource) {
    if (region) {
      this.name = region.name ?? '';
      this.description = region.description ?? '';
      if (region.feature) this.feature = region.feature;
    }
  }
}

// ** Signal K chart
export class SKChart {
  identifier = '';
  name = '';
  description = '';
  region = '';
  scale = 250000;
  layers: string[] = [];
  bounds?: number[];
  format = '';
  minZoom = 0;
  maxZoom = 24;
  type = '';
  url = '';
  source = '';
  style = '';
  defaultOpacity = 1;
  proxy = false;

  constructor(chart?: ChartResource) {
    if (chart) {
      this.identifier = chart.identifier ?? '';
      this.name = chart.name ?? '';
      this.description = chart.description ?? '';
      this.layers = chart.layers ?? [];
      if (chart.bounds) this.bounds = chart.bounds;
      this.format = chart.format ?? '';
      if (typeof chart.minzoom !== 'undefined') this.minZoom = chart.minzoom;
      if (typeof chart.maxzoom !== 'undefined') this.maxZoom = chart.maxzoom;
      this.type = chart.type ?? '';
      this.url = chart.url ?? '';
      if (typeof chart.scale !== 'undefined' && !isNaN(chart.scale)) {
        this.scale = chart.scale;
      }
      this.style = chart.style ?? '';
      this.source = chart.$source ?? '';
      this.defaultOpacity = chart.defaultOpacity ?? 1;
      this.proxy = chart.proxy ?? false;
    }
  }
}

// ** Signal K Track
export class SKTrack {
  name = '';
  description = '';
  feature: MultiLineStringFeature = {
    type: 'Feature',
    geometry: {
      type: 'MultiLineString',
      coordinates: []
    },
    properties: {},
    id: ''
  };

  constructor(trk?: TrackResource) {
    if (trk?.feature) this.feature = trk.feature;
    this.name = (this.feature.properties?.['name'] as string) ?? '';
    this.description =
      (this.feature.properties?.['description'] as string) ?? '';
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
  twd: Nullable<number> = null;
  tws: Nullable<number> = null;
  temperature: Nullable<number> = null;
  constructor() {
    super();
  }
}
