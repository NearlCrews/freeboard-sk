import { Injectable, inject } from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import type { SKSelection } from './resources.service';

// Typed bracket access into IAppConfig.selections without losing the
// discriminated keys. selections.tracks is the only string[] | null entry;
// the others are string[]. Array.isArray() guards the null case. SKSelection
// includes 'notes' but IAppConfig.selections has no notes field (no caller
// passes 'notes' here), so the Record reuses the string[] shape.
type SelectionsRecord = Record<SKSelection, string[] | null>;

/**
 * CRUD over the per-collection selection lists stored on
 * `AppFacade.config.selections`. Extracted from SKResourceService so the
 * pure store-mutation logic lives apart from the larger resource fetch
 * and stream-handling code path. SKResourceService delegates every
 * `selection*` call to this manager; consumers should keep going through
 * SKResourceService so the public API stays stable.
 */
@Injectable({ providedIn: 'root' })
export class SelectionsManager {
  private readonly app = inject(AppFacade);

  private store(): SelectionsRecord {
    return this.app.config.selections as unknown as SelectionsRecord;
  }

  isFiltered(collection: SKSelection): boolean {
    return Array.isArray(this.store()[collection]);
  }

  has(collection: SKSelection, id: string): boolean {
    const list = this.store()[collection];
    if (!Array.isArray(list)) {
      return false;
    }
    return list.includes(id);
  }

  add(collection: SKSelection, id: string | string[]): void {
    const sel = this.store();
    const current = sel[collection];
    if (typeof current === 'undefined') {
      return;
    }
    if (Array.isArray(current)) {
      const ids = typeof id === 'string' ? [id] : id;
      const added = ids.filter((s) => !current.includes(s));
      sel[collection] = current.concat(added);
      this.app.saveConfig();
    }
  }

  remove(collection: SKSelection, id: string | string[]): void {
    const sel = this.store();
    const current = sel[collection];
    if (typeof current === 'undefined') {
      return;
    }
    if (Array.isArray(current)) {
      const ids = typeof id === 'string' ? [id] : id;
      sel[collection] = current.filter((s: string) => !ids.includes(s));
      this.app.saveConfig();
    }
  }

  unfilter(collection: SKSelection): void {
    this.store()[collection] = null;
    this.app.saveConfig();
  }

  clear(collection: SKSelection): void {
    this.store()[collection] = [];
    this.app.saveConfig();
  }

  /** Strip selection-list entries that do not appear in `fullList`. */
  clean(collection: SKSelection, fullList: string[]): void {
    const sel = this.store();
    const current = sel[collection];
    if (!Array.isArray(current)) {
      return;
    }
    sel[collection] = current.filter((i) => fullList.includes(i));
    this.app.saveConfig();
  }
}
