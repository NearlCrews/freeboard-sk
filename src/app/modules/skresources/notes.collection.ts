import { Injectable, inject, signal } from '@angular/core';
import type { HttpErrorResponse } from '@angular/common/http';

import { FbDialogService } from 'src/app/design-system/primitives';
import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';
import { processUrlTokens } from 'src/app/app.config';
import type {
  ActionResult,
  FBNote,
  FBNotes,
  NoteResource,
  Notes,
  Position
} from 'src/app/types';

import { SKNote } from './resource-classes';
import type { SKResourceType } from './resources.service';
import { SelectionsManager } from './selections-manager';

interface ReOpenState {
  key?: string;
  value?: string;
  readOnly?: boolean;
}

/**
 * Notes collection: owns the note cache, /resources/notes HTTP
 * fetch/put/post/delete, the legacy-region / legacy-geohash transform,
 * the edit / details / related-notes dialog flows, and the reopen-last
 * related-dialog bookkeeping. Extracted from SKResourceService so the
 * notes code path lives in one file.
 *
 * `getRelatedNotes` is exposed publicly for callers (e.g., region /
 * route / waypoint collections do not need it because they inline
 * their own related-notes lookup; the InfoPanel and route-dialog use
 * this public form).
 */
@Injectable({ providedIn: 'root' })
export class NotesCollection {
  private readonly app = inject(AppFacade);
  private readonly signalk = inject(SignalKClient);
  private readonly selections = inject(SelectionsManager);
  private readonly dialog = inject(FbDialogService);

  private readonly cache = signal<FBNotes>([]);
  readonly notes = this.cache.asReadonly();

  private reOpen: ReOpenState = {};

  listFromServer(query?: string): Promise<FBNote[]> {
    const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/notes${q}`)
        .subscribe(
          (res: Notes) => {
            const list: FBNote[] = [];
            const bag = res as Record<string, NoteResource>;
            Object.keys(bag).forEach((id) => {
              const entry = bag[id];
              if (!entry) return;
              list.push([
                id,
                this.transform(entry, id),
                !this.selections.isFiltered('notes')
                  ? true
                  : this.selections.has('notes', id)
              ] as unknown as FBNote);
            });
            resolve(list);
          },
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromServer(id: string): Promise<SKNote> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/notes/${id}`)
        .subscribe(
          (res: NoteResource) => resolve(this.transform(res, id)),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromCache(id: string): FBNote | undefined {
    return this.cache().find((n) => n[0] === id);
  }

  deleteOnServer(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/notes/${id}`)
        .subscribe(
          () => resolve(),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  putOnServer(id: string, data: SKNote): Promise<ActionResult> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(this.app.skApiVersion, `/resources/notes/${id}`, data)
        .subscribe(
          (res: ActionResult) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  postOnServer(data: SKNote): Promise<ActionResult & { id?: string }> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `/resources/notes`, data)
        .subscribe(
          (res: ActionResult & { id?: string }) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  async refresh(query?: string): Promise<void> {
    query =
      query ??
      processUrlTokens(
        this.app.config.resources.notes.rootFilter,
        this.app.config
      );
    this.app.debug(`** refreshNotes->query: ${query}`);
    try {
      const notes = await this.listFromServer(query);
      const flist = notes.filter((n) => n[2]);
      this.cache.set(flist);
    } catch (err) {
      this.app.debug('** refreshNotes:', err);
    }
  }

  selected(id: string, showRelated: boolean): void {
    if (showRelated) {
      this.showRelated(id, 'group');
    } else {
      this.showDetails(id);
    }
  }

  /** Public helper for InfoPanel and similar callers. */
  async getRelated(collection: SKResourceType, id: string): Promise<FBNotes> {
    try {
      return await this.listFromServer(`href=/resources/${collection}/${id}`);
    } catch {
      return [];
    }
  }

  async showRelated(
    id: string,
    relatedBy = 'region',
    readOnly = false
  ): Promise<void> {
    let paramName: string;
    if (!['group', 'destination'].includes(relatedBy)) {
      id = !id.includes(relatedBy) ? `/resources/${relatedBy}s/${id}` : id;
      paramName = 'href';
    } else {
      paramName = relatedBy;
    }
    this.app.sIsFetching.set(true);
    try {
      const notes = await this.listFromServer(`${paramName}=${id}`);
      this.app.sIsFetching.set(false);
      const { RelatedNotesDialog } =
        await import('./components/notes/relatednotes-dialog');
      this.dialog
        .open(RelatedNotesDialog, {
          disableClose: true,
          data: { notes, relatedBy, readOnly }
        })
        .closed.subscribe((res) => {
          const r = res as
            | { result?: boolean; data?: string; id?: string }
            | undefined;
          if (!r?.result) return;
          if (relatedBy) {
            this.reOpen = { key: relatedBy, value: id, readOnly };
          } else {
            this.reOpen = {};
          }
          switch (r.data) {
            case 'edit':
              if (r.id) this.showEditor({ id: r.id });
              break;
            case 'add':
              if (relatedBy !== 'group') {
                this.showEditor({
                  type: relatedBy,
                  href: { id, exists: true }
                });
              }
              break;
            case 'delete':
              if (r.id) this.delete(r.id);
              break;
          }
        });
    } catch {
      this.app.sIsFetching.set(false);
      this.app.showAlert(
        'ERROR',
        `Unable to retrieve Notes for specified ${relatedBy}!`
      );
    }
  }

  async showEditor(
    e: {
      id?: string;
      position?: Position;
      group?: string;
      type?: string;
      href?: { id: string; exists: boolean };
    } | null = null
  ): Promise<void> {
    if (!e) return;
    let note: SKNote;
    const data: {
      noteId: string | null;
      note: SKNote | null;
      editable: boolean;
      addNote: boolean;
      title: string | null;
      region: { id: string; exists: boolean } | null;
      createRegion: boolean | null;
    } = {
      noteId: null,
      note: null,
      editable: true,
      addNote: true,
      title: null,
      region: null,
      createRegion: null
    };

    if (!e.id && e.position) {
      data.title = 'Add Note';
      note = new SKNote();
      if (e.group) note.group = e.group;
      const pos = GeoUtils.normaliseCoords(e.position);
      note.position = { latitude: pos[1], longitude: pos[0] };
      note.name = '';
      note.description = '';
      data.note = note;
      this.openForEdit(data);
    } else if (!e.id && !e.position && e.group) {
      data.title = 'Add Note to Group';
      note = new SKNote();
      note.group = e.group;
      note.name = '';
      note.description = '';
      data.note = note;
      this.openForEdit(data);
    } else if (!e.id && e.href && e.type) {
      note = new SKNote();
      note.href = !e.href.id.includes(e.type)
        ? `/resources/${e.type}s/${e.href.id}`
        : e.href.id;
      note.name = '';
      note.description = '';
      data.title = `Add Note to ${e.type}`;
      data.region = e.href;
      data.note = note;
      data.createRegion = e.href.exists ? false : e.type === 'region';
      this.openForEdit(data);
    } else if (e.id) {
      this.app.sIsFetching.set(true);
      try {
        const res = await this.fromServer(e.id);
        data.noteId = e.id;
        data.title = 'Edit Note';
        data.note = res;
        data.addNote = false;
        this.openForEdit(data);
      } catch {
        this.app.showAlert('ERROR', 'Unable to retrieve Note!');
      } finally {
        this.app.sIsFetching.set(false);
      }
    }
  }

  async showDetails(id: string): Promise<void> {
    if (!id) return;
    let note: SKNote;
    try {
      this.app.sIsFetching.set(true);
      note = await this.fromServer(id);
    } catch {
      this.app.showAlert('ERROR', 'Unable to retrieve Note!');
      return;
    } finally {
      this.app.sIsFetching.set(false);
    }
    const { NoteDialog } = await import('./components/notes/note-dialog');
    this.dialog
      .open(NoteDialog, {
        disableClose: true,
        data: { note, editable: false }
      })
      .closed.subscribe((res) => {
        const r = res as
          | { result?: boolean; data?: string; value?: string }
          | undefined;
        if (!r?.result) return;
        if (r.data === 'url') {
          window.open(note.url, 'note');
        }
        if (r.data === 'edit') this.showEditor({ id });
        if (r.data === 'delete') this.delete(id);
        if (r.data === 'group' && r.value) {
          this.showRelated(r.value, r.data);
        }
      });
  }

  delete(id: string): void {
    if (!id) return;
    this.app
      .showConfirm(
        'Do you want to delete this Note from the server?\n',
        'Delete Note:',
        'YES',
        'NO'
      )
      .subscribe(async (res) => {
        const ok = res as { ok: boolean } | boolean | undefined;
        const confirmed = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok);
        if (confirmed) {
          try {
            await this.deleteOnServer(id);
            this.reopenRelatedDialog();
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        } else {
          this.reopenRelatedDialog();
        }
      });
  }

  async updatePosition(id: string, position: Position): Promise<void> {
    if (!id) return;
    const t = this.fromCache(id);
    if (!t) return;
    const note = t[1];
    const p = GeoUtils.normaliseCoords(position);
    note.position = { latitude: p[1], longitude: p[0] };
    try {
      await this.putOnServer(id, note);
      this.reopenRelatedDialog();
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    }
  }

  private async create(note: SKNote): Promise<void> {
    try {
      await this.postOnServer(note);
      this.reopenRelatedDialog();
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    }
  }

  private async openForEdit(e: {
    noteId: string | null;
    note: SKNote | null;
    editable: boolean;
    addNote: boolean;
    title: string | null;
    region?: { id: string; exists: boolean } | null;
    createRegion?: boolean | null;
  }): Promise<void> {
    const { NoteDialog } = await import('./components/notes/note-dialog');
    this.dialog
      .open(NoteDialog, {
        disableClose: true,
        data: {
          note: e.note,
          editable: e.editable,
          addNote: e.addNote,
          title: e.title
        }
      })
      .closed.subscribe(async (res) => {
        const r = res as { result?: boolean; data?: SKNote } | undefined;
        if (r?.result && r.data) {
          const note = r.data;
          if (!e.noteId) {
            this.create(note);
          } else {
            if (typeof note.href !== 'undefined' && !note.href) {
              delete (note as Partial<SKNote>).href;
            }
            try {
              await this.putOnServer(e.noteId, note);
              this.reopenRelatedDialog();
            } catch (err) {
              this.app.parseHttpErrorResponse(err);
            }
          }
        } else {
          this.reopenRelatedDialog();
        }
      });
  }

  private reopenRelatedDialog(noReset = false): void {
    if (this.reOpen.key && this.reOpen.value) {
      this.showRelated(
        this.reOpen.value,
        this.reOpen.key,
        this.reOpen.readOnly
      );
      if (noReset) return;
      this.reOpen = {};
    }
  }

  /** Server-shape to SKNote. Public so the central transform dispatcher
   *  can route the 'notes' case here. */
  transform(note: NoteResource, id: string): SKNote {
    if (!note.name) {
      note.name = note.title ?? 'Note-' + id.slice(-6);
      if (note.title) delete note.title;
    }
    if (!note.href) {
      note.href = note.region ?? '';
      if (note.region) delete note.region;
      if (note.href && note.href.includes('resources/')) {
        const a = note.href.split('/');
        const last = a[a.length - 1];
        if (typeof last === 'string') {
          const segments = last.split(':');
          const h = segments[segments.length - 1];
          if (typeof h === 'string') {
            a[a.length - 1] = h;
            note.href = a.join('/');
          }
        }
      }
    }
    if (typeof note.properties === 'undefined') {
      note.properties = {};
    }
    if (typeof note.position === 'undefined') {
      if (typeof note.geohash !== 'undefined') {
        const gh = GeoUtils.geohashDecode(note.geohash);
        note.position = { latitude: gh.latitude, longitude: gh.longitude };
        delete note.geohash;
      }
    }
    return new SKNote(note);
  }
}
