/** Signal K Stream worker service.
 *
 * Phase 1 (Batch 3): the WebSocket lifecycle, delta parsing, and vessel
 * object assembly now live on the main thread in SignalKDeltaProcessor. The
 * slim worker handles only SimplifyAP and AIS TTL expiry. SKWorkerService
 * keeps the same public surface so SKStreamFacade and AppFacade are
 * unaffected.
 */
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  // options shape varies per cmd; each branch in postMessage() narrows it
  // before passing to a typed processor method. Phase 6 will tighten the
  // discriminated union per cmd.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
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
  private readonly messageSource = new Subject<UpdateMessage | TrailMessage>();
  private readonly notificationSource = new Subject<NotificationMessage>();
  private readonly resourceUpdatesSource = new Subject<PathValue[]>();
  private readonly resourceDeltaSignal = signal<ResourceDeltaSignal>({
    path: '',
    value: null
  });
  public readonly resourceUpdate = this.resourceDeltaSignal.asReadonly();

  private readonly processor: SignalKDeltaProcessor;
  private readonly trailFetcher: VesselTrailFetcher;
  private readonly destroyRef = inject(DestroyRef);

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

  settings(value: unknown) {
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

  private handleWorkerMessage(data: unknown): void {
    if (!data || typeof data !== 'object') {
      return;
    }
    const msg = data as {
      action?: string;
      result?: unknown;
      requestId?: number;
    };
    if (typeof msg.action !== 'string') {
      return;
    }
    if (msg.action === 'simplified') {
      this.trailFetcher.onSimplified(
        msg as { requestId: number; result: [number, number][] }
      );
      return;
    }
    if (msg.action === 'ais-expiry') {
      this.processor.applyAisExpiry(msg.result as AisExpiryPayload);
      return;
    }
  }

  /**
   * Bridge the processor's event subjects into the legacy public observables
   * (message$, notification$, resource$) so SKStreamFacade keeps working
   * untouched.
   */
  private wireEventsToLegacySources(): void {
    const ref = this.destroyRef;
    this.events.connect
      .pipe(takeUntilDestroyed(ref))
      .subscribe((m) => this.messageSource.next(m));
    this.events.close
      .pipe(takeUntilDestroyed(ref))
      .subscribe((m) => this.messageSource.next(m));
    this.events.error
      .pipe(takeUntilDestroyed(ref))
      .subscribe((m) => this.messageSource.next(m));
    this.events.hello
      .pipe(takeUntilDestroyed(ref))
      .subscribe((m) => this.messageSource.next(m));
    this.events.response
      .pipe(takeUntilDestroyed(ref))
      .subscribe((m) => this.messageSource.next(m));
    this.events.update
      .pipe(takeUntilDestroyed(ref))
      .subscribe((m) => this.handleUpdateMessage(m));
    this.events.resource
      .pipe(takeUntilDestroyed(ref))
      .subscribe((m) => this.handleResourceMessage(m));
    this.events.notification
      .pipe(takeUntilDestroyed(ref))
      .subscribe((m) => this.notificationSource.next(m));
    this.trailSubject
      .pipe(takeUntilDestroyed(ref))
      .subscribe((m) => this.messageSource.next(m));
  }

  private handleUpdateMessage(msg: UpdateMessage): void {
    const result = msg.result as
      | { self?: { resourceUpdates?: PathValue[] } }
      | undefined;
    if (
      msg.action === 'update' &&
      !msg.playback &&
      Array.isArray(result?.self?.resourceUpdates) &&
      result.self.resourceUpdates.length !== 0
    ) {
      this.resourceUpdatesSource.next(result.self.resourceUpdates);
    }
    this.messageSource.next(msg);
  }

  private handleResourceMessage(msg: ResourceMessage): void {
    const r = msg.result as ResourceDeltaSignal | null;
    if (r) {
      this.resourceDeltaSignal.set(r);
    }
  }
}
