// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.

export enum AlarmState {
  normal = 'normal',
  alert = 'alert',
  warn = 'warn',
  alarm = 'alarm',
  emergency = 'emergency'
}

export enum AlarmMethod {
  visual = 'visual',
  sound = 'sound'
}

export enum AlarmType {
  mob = 'notifications.mob',
  fire = 'notifications.fire',
  sinking = 'notifications.sinking',
  flooding = 'notifications.flooding',
  collision = 'notifications.collision',
  grounding = 'notifications.grounding',
  listing = 'notifications.listing',
  adrift = 'notifications.adrift',
  piracy = 'notifications.piracy',
  abandon = 'notifications.abandon'
}

export enum APPDATA_CONTEXT {
  USER = 'user',
  GLOBAL = 'global'
}

export interface Server_Info {
  endpoints: Record<string, Record<string, string>>;
  info: Record<string, unknown>;
  apiVersions: string[];
}

export interface JSON_Patch {
  op: 'add' | 'replace' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value: unknown;
}
