// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.

import { UUID } from './uuid';

export interface UpdatesMessage {
  context: string | null;
  updates: unknown[];
}

export interface SubscribeMessage {
  context: string | null;
  subscribe: unknown[];
}

export interface UnsubscribeMessage {
  context: string | null;
  unsubscribe: unknown[];
}

export interface RequestMessage {
  requestId: string;
}

export class Message {
  // Return UPDATES message object.
  // array values = { values: [ { path: xx, value: xx } ] }
  static updates(): UpdatesMessage {
    return {
      context: null,
      updates: []
    };
  }

  // Return SUBSCRIBE message object.
  // array values = {
  //   "path": "path.to.key",
  //   "period": 1000,
  //   "format": "delta",
  //   "policy": "ideal",
  //   "minPeriod": 200
  // }
  static subscribe(): SubscribeMessage {
    return {
      context: null,
      subscribe: []
    };
  }

  // Return UNSUBSCRIBE message object.
  // array values = { "path": "path.to.key" }
  static unsubscribe(): UnsubscribeMessage {
    return {
      context: null,
      unsubscribe: []
    };
  }

  // Return REQUEST message object.
  static request(): RequestMessage {
    return {
      requestId: new UUID().toString()
    };
  }
}
