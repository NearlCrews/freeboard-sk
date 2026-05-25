// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.

import { AlarmMethod, AlarmState } from './types';

export interface AlarmValue {
  message: string;
  state: AlarmState;
  method: AlarmMethod[];
}

export class Alarm {
  private readonly _state: AlarmState;
  private readonly _method: AlarmMethod[] = [];
  private readonly _message: string;

  constructor(
    message = '',
    state: AlarmState = AlarmState.alarm,
    visual?: boolean,
    sound?: boolean
  ) {
    this._message = message;
    this._state = state;
    if (visual) {
      this._method.push(AlarmMethod.visual);
    }
    if (sound) {
      this._method.push(AlarmMethod.sound);
    }
  }

  get value(): AlarmValue {
    return {
      message: this._message,
      state: this._state,
      method: this._method
    };
  }
}
