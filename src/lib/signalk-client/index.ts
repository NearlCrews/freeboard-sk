// Vendored barrel for signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.
//
// Public surface matches the upstream package: APPDATA_CONTEXT, Alarm,
// AlarmMethod, AlarmState, AlarmType, Message, Path, SignalKApps,
// SignalKClient, SignalKClientModule, SignalKHttp, and SignalKStream.

export { Alarm } from './alarm';
export type { AlarmValue } from './alarm';
export { Message } from './message';
export type {
  RequestMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  UpdatesMessage
} from './message';
export { Path } from './path';
export { SignalKApps } from './signalk-apps.service';
export { SignalKClient } from './signalk-client.service';
export { SignalKClientModule } from './signalk-client.module';
export { SignalKHttp } from './signalk-http.service';
export { SignalKStream } from './signalk-stream.service';
export { APPDATA_CONTEXT, AlarmMethod, AlarmState, AlarmType } from './types';
export type { JSON_Patch, Server_Info } from './types';
