import { Injectable } from '@angular/core';
import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';

const BUDDIES_URI = '/resources/buddies';

@Injectable({ providedIn: 'root' })
export class Buddies {
  constructor(
    public signalk: SignalKClient,
    public app: AppFacade
  ) {}

  list() {
    return this.signalk.api.get(this.app.skApiVersion, BUDDIES_URI);
  }

  add(urn: string, name: string) {
    return this.signalk.api.post(this.app.skApiVersion, BUDDIES_URI, {
      urn,
      name
    });
  }

  update(urn: string, name: string) {
    return this.signalk.api.put(
      this.app.skApiVersion,
      `${BUDDIES_URI}/${urn}`,
      { name }
    );
  }

  remove(urn: string) {
    return this.signalk.api.delete(
      this.app.skApiVersion,
      `${BUDDIES_URI}/${urn}`
    );
  }
}
