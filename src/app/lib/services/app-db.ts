import { Observable, Subject } from 'rxjs';

import { IndexedDB } from './indexeddb';
import type { LineString } from 'src/app/types';

export interface AppDBUpdate {
  action: 'db_init' | 'trail_save';
  value: unknown;
}

interface StoredTrail {
  uuid: string;
  value: LineString;
}

/**
 * Wraps the IndexedDB store: trail-only today, scoped to expand as
 * Phase 5+ data layers land. Emits action / value events via dbUpdate$
 * so AppFacade can sync the in-memory trail signal on init and warn on
 * persistence failures.
 */
export class AppDB {
  private db: IndexedDB;
  private dbUpdateSource = new Subject<AppDBUpdate>();
  public dbUpdate$: Observable<AppDBUpdate> =
    this.dbUpdateSource.asObservable();

  constructor() {
    this.db = new IndexedDB('open-binnacle', 1);
    this.db
      .openDatabase(1, (_evt, db) => {
        const trail = db.createObjectStore('trail', { keyPath: 'uuid' });
        trail.createIndex('uuid_idx', 'uuid', { unique: true });
      })
      .then(
        () => this.emitDbUpdate({ action: 'db_init', value: true }),
        () => this.emitDbUpdate({ action: 'db_init', value: false })
      );
  }

  emitDbUpdate(value: AppDBUpdate): void {
    this.dbUpdateSource.next(value);
  }

  getTrail(id = 'self'): Promise<StoredTrail | undefined> {
    return this.db.getByIndex('trail', 'uuid_idx', id) as Promise<
      StoredTrail | undefined
    >;
  }

  saveTrail(id = 'self', trailData: LineString): void {
    this.db.update('trail', { uuid: id, value: trailData }).then(
      () => this.emitDbUpdate({ action: 'trail_save', value: true }),
      () => {
        this.db.add('trail', { uuid: id, value: trailData }).then(
          () => this.emitDbUpdate({ action: 'trail_save', value: true }),
          () => this.emitDbUpdate({ action: 'trail_save', value: false })
        );
      }
    );
  }
}
