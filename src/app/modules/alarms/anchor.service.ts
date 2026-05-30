import { effect, Injectable, signal } from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'src/lib/signalk-client';
import { Position } from 'src/app/types';
import { SKStreamFacade } from '../skstream/skstream.facade';

interface AnchorStatusResponse {
  position?: { value?: { latitude: number; longitude: number } };
  maxRadius?: { value?: number };
  currentRadius?: { value?: number };
}

@Injectable({ providedIn: 'root' })
export class AnchorService {
  private raisedSignal = signal<boolean>(true);
  readonly raised = this.raisedSignal.asReadonly();
  private positionSignal = signal<Position | null>(null);
  readonly position = this.positionSignal.asReadonly();
  private radiusSignal = signal<number>(0);
  readonly radius = this.radiusSignal.asReadonly();

  constructor(
    private app: AppFacade,
    private signalk: SignalKClient,
    private stream: SKStreamFacade
  ) {
    effect(() => {
      const anchor = this.stream.selfAnchor();
      if (anchor) {
        this.parseAnchorStatus(anchor);
      }
    });
  }

  public setRaisedSignal(value: boolean) {
    this.raisedSignal.set(value);
  }

  public setAnchorPosition(position: Position | null): Promise<boolean> {
    if (!position) {
      return Promise.resolve(false);
    }
    return new Promise((resolve, reject) => {
      this.signalk
        .post('/plugins/anchoralarm/setAnchorPosition', {
          position: {
            latitude: position[1],
            longitude: position[0]
          }
        })
        .subscribe({
          next: () => resolve(true),
          error: (err: unknown) => {
            reject(err);
          }
        });
    });
  }

  public queryAnchorStatus(context?: string, position?: Position) {
    this.app.debug('Retrieving anchor status...');
    context = !context || context === 'self' ? 'vessels/self' : context;
    this.signalk.api.get(`/${context}/navigation/anchor`).subscribe({
      next: (r: AnchorStatusResponse) => {
        const pos: Position | null = r.position?.value
          ? [r.position.value.longitude, r.position.value.latitude]
          : null;
        const data: {
          maxRadius?: number;
          position?: Position | null;
          radius?: number | null;
        } = { position: pos };
        if (r.maxRadius?.value !== undefined) {
          data.maxRadius = r.maxRadius.value;
        }
        if (r.currentRadius?.value !== undefined) {
          data.radius = r.currentRadius.value;
        }
        this.parseAnchorStatus(data, position);
      },
      error: () => {
        this.positionSignal.set([0, 0]);
        this.raisedSignal.set(true);
      }
    });
  }

  private parseAnchorStatus(
    r: {
      maxRadius?: number;
      position?: Position | null;
      radius?: number | null;
    },
    position?: Position
  ) {
    if (
      r.position &&
      typeof r.position[0] === 'number' &&
      typeof r.position[1] === 'number'
    ) {
      this.positionSignal.set(r.position);
      this.raisedSignal.set(false);
    } else {
      if (position) {
        this.positionSignal.set(position);
      }
      this.raisedSignal.set(true);
    }
    this.radiusSignal.set(r.maxRadius ?? -1);
  }
}
