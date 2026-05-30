import { Injectable } from '@angular/core';

import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';
import { HttpErrorResponse } from '@angular/common/http';

export interface AutopilotOptions {
  modes: string[];
  states: { name: string; engaged: boolean }[];
  actions: { id: string; name: string; available: boolean }[];
}

@Injectable({ providedIn: 'root' })
export class AutopilotService {
  constructor(
    private signalk: SignalKClient,
    private app: AppFacade
  ) {}

  private getPath(id?: string): string {
    return `vessels/self/autopilots/${id ?? '_default'}`;
  }

  fetchOptions(pilotId?: string): Promise<AutopilotOptions> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, this.getPath(pilotId))
        .subscribe({
          next: (val: { options: AutopilotOptions }) => {
            if (val.options) {
              resolve(val.options);
            } else {
              reject(new Error('Invalid autopilot options!'));
            }
          },
          error: () => reject(new Error('No autopilot providers found!'))
        });
    });
  }

  engage(pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `${this.getPath(pilotId)}/engage`, null)
        .subscribe({
          next: () => resolve(),
          error: (error: HttpErrorResponse) => reject(error)
        });
    });
  }

  disengage(pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `${this.getPath(pilotId)}/disengage`, null)
        .subscribe({
          next: () => resolve(),
          error: (error: HttpErrorResponse) => reject(error)
        });
    });
  }

  adjustTarget(value: number, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof value !== 'number') {
        reject(new Error(`Invalid value supplied!`));
        return;
      }
      this.signalk.api
        .put(this.app.skApiVersion, `${this.getPath(pilotId)}/target/adjust`, {
          value: value,
          units: 'deg'
        })
        .subscribe({
          next: () => resolve(),
          error: (error: HttpErrorResponse) => reject(error)
        });
    });
  }

  dodge(enable: boolean, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request$ = enable
        ? this.signalk.api.post(
            this.app.skApiVersion,
            `${this.getPath(pilotId)}/dodge`,
            null
          )
        : this.signalk.api.delete(
            this.app.skApiVersion,
            `${this.getPath(pilotId)}/dodge`
          );
      request$.subscribe({
        next: () => resolve(),
        error: (error: HttpErrorResponse) => reject(error)
      });
    });
  }

  adjustDodge(value: number, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof value !== 'number') {
        reject(new Error(`Invalid value supplied!`));
        return;
      }
      this.signalk.api
        .put(this.app.skApiVersion, `${this.getPath(pilotId)}/dodge`, {
          value: value,
          units: 'deg'
        })
        .subscribe({
          next: () => resolve(),
          error: (error: HttpErrorResponse) => reject(error)
        });
    });
  }

  mode(value: string, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof value !== 'string') {
        reject(new Error(`Invalid value supplied!`));
        return;
      }
      this.signalk.api
        .put(this.app.skApiVersion, `${this.getPath(pilotId)}/mode`, {
          value: value
        })
        .subscribe({
          next: () => resolve(),
          error: (error: HttpErrorResponse) => reject(error)
        });
    });
  }

  state(value: string, pilotId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof value !== 'string') {
        reject(new Error(`Invalid value supplied!`));
        return;
      }
      this.signalk.api
        .put(this.app.skApiVersion, `${this.getPath(pilotId)}/state`, {
          value: value
        })
        .subscribe({
          next: () => resolve(),
          error: (error: HttpErrorResponse) => reject(error)
        });
    });
  }
}
