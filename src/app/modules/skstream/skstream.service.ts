/** Signal K Stream worker service.
 *
 * Phase 1 (Batch 3): the WebSocket lifecycle, delta parsing, and vessel
 * object assembly now live on the main thread in SignalKDeltaProcessor. The
 * slim worker handles only SimplifyAP and AIS TTL expiry. SKWorkerService
 * keeps the same public surface so SKStreamFacade and AppFacade are
 * unaffected.
 */
import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

import {
  NotificationMessage,
  PathValue,
  ResourceDeltaSignal,
  ResourceMessage,
  TrailMessage,
  UpdateMessage
} from 'src/app/types';

import {
  AisExpiryPayload,
  DeltaProcessorEvents,
  SignalKDeltaProcessor
} from './signalk-delta-processor';
import { VesselTrailFetcher } from './vessel-trail.fetcher';

interface StreamServiceCommand {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any;
  cmd: string;
}

@Injectable({ providedIn: 'root' })
export class SKWorkerService {
  private worker: Worker | undefined;

  private readonly events: DeltaProcessorEvents = {
    update: new Subject<UpdateMessage>(),
    notification: new Subject<NotificationMessage>(),
    resource: new Subject<ResourceMessage>(),
    connect: new Subject<UpdateMessage>(),
    close: new Subject<UpdateMessage>(),
    error: new Subject<UpdateMessage>(),
    hello: new Subject<UpdateMessage>(),
    response: new Subject<UpdateMessage>()
  };

  private readonly trailSubject = new Subject<TrailMessage>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly messageSource = new Subject<any>();
  private readonly notificationSource = new Subject<NotificationMessage>();
  private readonly resourceUpdatesSource = new Subject<PathValue[]>();
  private readonly resourceDeltaSignal = signal<ResourceDeltaSignal>({
    path: '',
    value: null
  });
  public readonly resourceUpdate = this.resourceDeltaSignal.asReadonly();

  private readonly processor: SignalKDeltaProcessor;
  private readonly trailFetcher: VesselTrailFetcher;

  constructor() {
    this.worker = new Worker(new URL('./skstream.worker', import.meta.url));
    this.worker.onmessage = ({ data }) => this.handleWorkerMessage(data);

    this.processor = new SignalKDeltaProcessor(this.events, {
      postAisTouch: (ids) =>
        this.worker?.postMessage({ cmd: 'ais-touch', ids }),
      postAisRemove: (id) =>
        this.worker?.postMessage({ cmd: 'ais-remove', id }),
      postAisClear: () => this.worker?.postMessage({ cmd: 'ais-clear' }),
      postAisConfig: (cfg) =>
        this.worker?.postMessage({ cmd: 'ais-config', ...cfg })
    });

    this.trailFetcher = new VesselTrailFetcher({
      apiUrl: () => this.processor.getApiUrl(),
      playback: () => this.processor.isPlayback(),
      postSimplify: (req) =>
        this.worker?.postMessage({ cmd: 'simplify', ...req }),
      trail$: this.trailSubject
    });

    this.wireEventsToLegacySources();
  }

  // ************ Public surface (unchanged) ************

  message$() {
    return this.messageSource.asObservable();
  }

  resource$() {
    return this.resourceUpdatesSource.asObservable();
  }

  notification$() {
    return this.notificationSource.asObservable();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings(value: any) {
    this.postMessage({ cmd: 'settings', options: value });
  }

  terminate() {
    if (this.worker) {
      this.close(true);
      this.worker.postMessage({ cmd: 'close' });
      this.worker.terminate();
      this.worker = undefined;
    }
  }

  close(terminate = false) {
    this.postMessage({ cmd: 'close', options: { terminate } });
  }

  postMessage(msg: StreamServiceCommand) {
    if (!msg || !msg.cmd) {
      return;
    }
    switch (msg.cmd) {
      case 'open':
        this.processor.applySettings(msg.options ?? { config: {} });
        this.processor.open(msg.options);
        return;
      case 'close':
        this.processor.close(!!msg.options?.terminate);
        return;
      case 'subscribe':
        this.processor.subscribe(msg.options);
        return;
      case 'settings':
        this.processor.applySettings(msg.options ?? { config: {} });
        return;
      case 'alarm':
        this.processor.actionAlarm(msg.options);
        return;
      case 'vessel':
        this.processor.setVesselName(msg.options);
        return;
      case 'auth':
        this.processor.setAuthToken(msg.options?.token);
        return;
      case 'trail':
        void this.trailFetcher.fetchTrail(msg.options);
        return;
    }
  }

  // ************ Internal wiring ************

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleWorkerMessage(data: any): void {
    if (!data || typeof data.action !== 'string') {
      return;
    }
    if (data.action === 'simplified') {
      this.trailFetcher.onSimplified(data);
      return;
    }
    if (data.action === 'ais-expiry') {
      this.processor.applyAisExpiry(data.result as AisExpiryPayload);
      return;
    }
  }

  /**
   * Bridge the processor's event subjects into the legacy public observables
   * (message$, notification$, resource$) so SKStreamFacade keeps working
   * untouched.
   */
  private wireEventsToLegacySources(): void {
    this.events.connect.subscribe((m) => this.messageSource.next(m));
    this.events.close.subscribe((m) => this.messageSource.next(m));
    this.events.error.subscribe((m) => this.messageSource.next(m));
    this.events.hello.subscribe((m) => this.messageSource.next(m));
    this.events.response.subscribe((m) => this.messageSource.next(m));
    this.events.update.subscribe((m) => this.handleUpdateMessage(m));
    this.events.resource.subscribe((m) => this.handleResourceMessage(m));
    this.events.notification.subscribe((m) => this.notificationSource.next(m));
    this.trailSubject.subscribe((m) => this.messageSource.next(m));
  }

  private handleUpdateMessage(msg: UpdateMessage): void {
    if (
      msg.action === 'update' &&
      !msg.playback &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Array.isArray((msg.result as any)?.self?.resourceUpdates) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (msg.result as any).self.resourceUpdates.length !== 0
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.resourceUpdatesSource.next((msg.result as any).self.resourceUpdates);
    }
    this.messageSource.next(msg);
  }

  private handleResourceMessage(msg: ResourceMessage): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = msg.result as any;
    if (r) {
      this.resourceDeltaSignal.set(r as ResourceDeltaSignal);
    }
  }
}
