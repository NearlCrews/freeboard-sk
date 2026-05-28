import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  FbDetailPaneComponent,
  FbFilterBarComponent,
  FbIconComponent,
  FbListPaneComponent,
  type FbFilterChip,
  type FbListPaneItem
} from 'src/app/design-system/primitives';

import { AppFacade } from 'src/app/app.facade';
import type {
  FBNote,
  FBNotes,
  FBResourceSelect,
  Position,
  SKPosition
} from 'src/app/types';
import { textSnippet } from 'src/app/lib/text-snippet';
import { SKResourceService } from '../../resources.service';
import { SKNote } from '../../resource-classes';
import { NotePanel } from './note-panel';
import {
  RECENT_WINDOW_MS,
  groupColor as groupColorOf,
  timeAgo as timeAgoOf
} from './note-helpers';

interface NavItem extends FbListPaneItem {
  readonly kind: 'all' | 'recent' | 'untagged' | 'group';
  readonly count: number;
  readonly color: string;
}

interface NoteListItem extends FbListPaneItem {
  readonly note: FBNote;
}

const NAV_ALL = '__all';
const NAV_RECENT = '__recent';
const NAV_UNTAGGED = '__untagged';

@Component({
  selector: 'notes-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    FbIconComponent,
    MatTooltipModule,
    FbListPaneComponent,
    FbDetailPaneComponent,
    FbFilterBarComponent,
    NotePanel
  ],
  templateUrl: './notes-shell.component.html',
  styleUrls: ['./notes-shell.component.scss']
})
export class NotesShellComponent {
  notes = input<FBNotes>([]);

  select = output<FBResourceSelect>();
  closed = output<void>();
  pan = output<{ center: Position; zoomLevel: number | null }>();

  protected app = inject(AppFacade);
  private skres = inject(SKResourceService);

  protected readonly searchQuery = signal('');
  protected readonly activeNav = signal<string>(NAV_ALL);
  protected readonly draftsOnly = signal(false);
  protected readonly selectedNoteId = signal<string | null>(null);

  protected readonly leftItems = computed<readonly NavItem[]>(() => {
    const notes = this.notes();
    const total = notes.length;
    let recent = 0;
    let untagged = 0;
    const groups = new Map<string, number>();
    const now = Date.now();
    for (const n of notes) {
      const meta = n[1];
      const group = meta.group;
      if (group) {
        groups.set(group, (groups.get(group) ?? 0) + 1);
      } else {
        untagged += 1;
      }
      const ts = this.timestampOf(meta);
      if (ts !== null && now - ts <= RECENT_WINDOW_MS) {
        recent += 1;
      }
    }
    const fixed: NavItem[] = [
      {
        id: NAV_ALL,
        label: 'All',
        kind: 'all',
        count: total,
        color: 'var(--notes-text-muted)'
      },
      {
        id: NAV_RECENT,
        label: 'Recent',
        kind: 'recent',
        count: recent,
        color: 'var(--notes-accent)'
      },
      {
        id: NAV_UNTAGGED,
        label: 'Untagged',
        kind: 'untagged',
        count: untagged,
        color: 'var(--notes-text-faint)'
      }
    ];
    const groupItems: NavItem[] = Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({
        id: `group:${name}`,
        label: name,
        kind: 'group',
        count,
        color: this.groupColor(name)
      }));
    return [...fixed, ...groupItems];
  });

  protected readonly filterChips = computed<readonly FbFilterChip[]>(() => [
    { key: 'drafts', label: 'Drafts', active: this.draftsOnly() }
  ]);

  protected readonly middleItems = computed<readonly NoteListItem[]>(() => {
    const all = this.notes();
    const nav = this.activeNav();
    const query = this.searchQuery().toLowerCase();
    const draftsOnly = this.draftsOnly();
    const now = Date.now();
    const filtered = all.filter((n) => {
      const meta = n[1];
      if (nav.startsWith('group:')) {
        const group = nav.slice('group:'.length);
        if (meta.group !== group) {
          return false;
        }
      } else if (nav === NAV_UNTAGGED) {
        if (meta.group) {
          return false;
        }
      } else if (nav === NAV_RECENT) {
        const ts = this.timestampOf(meta);
        if (ts === null || now - ts > RECENT_WINDOW_MS) {
          return false;
        }
      }
      if (draftsOnly && !meta.properties?.['draft']) {
        return false;
      }
      if (query) {
        const name = (meta.name || '').toLowerCase();
        const description = (meta.description || '').toLowerCase();
        if (!name.includes(query) && !description.includes(query)) {
          return false;
        }
      }
      return true;
    });
    filtered.sort((a, b) => {
      const x = (a[1].name || '').toUpperCase();
      const y = (b[1].name || '').toUpperCase();
      return x <= y ? -1 : 1;
    });
    return filtered.map((n) => ({
      id: n[0],
      label: n[1].name || 'Untitled note',
      note: n
    }));
  });

  protected readonly selectedNote = computed<SKNote | null>(() => {
    const id = this.selectedNoteId();
    if (!id) {
      return null;
    }
    const items = this.middleItems();
    const found = items.find((it) => it.id === id);
    if (found) {
      return found.note[1];
    }
    return this.skres.fromCache('notes', id)?.[1] ?? null;
  });

  protected readonly selectedNoteReadOnly = computed(() => {
    const note = this.selectedNote();
    return !!note?.properties?.['readOnly'];
  });

  protected readonly showNotesOnMap = computed(
    () => this.app.config.ui.showNotes
  );

  constructor() {
    // Keep selectedNoteId valid: clear it when the active filter hides the
    // current selection so the detail pane shows the empty state cleanly.
    effect(() => {
      const id = this.selectedNoteId();
      if (!id) {
        return;
      }
      const visible = this.middleItems().some((it) => it.id === id);
      if (!visible) {
        this.selectedNoteId.set(null);
      }
    });
  }

  protected onNavSelect(id: string) {
    this.activeNav.set(id);
  }

  protected onNoteSelect(id: string) {
    this.selectedNoteId.set(id);
    const found = this.middleItems().find((it) => it.id === id);
    this.select.emit({ id, isGroup: false });
    if (found?.note[1].position) {
      this.emitCenter(found.note[1].position);
    }
  }

  protected onChipToggle(key: string) {
    if (key === 'drafts') {
      this.draftsOnly.update((v) => !v);
    }
  }

  protected onClose() {
    this.closed.emit();
  }

  protected onRefresh() {
    void this.skres.refreshNotes();
  }

  protected toggleMapDisplay() {
    const next = !this.app.config.ui.showNotes;
    this.app.config.ui.showNotes = next;
    this.app.saveConfig();
  }

  protected onEdit() {
    const id = this.selectedNoteId();
    if (id) {
      void this.skres.showNoteEditor({ id });
    }
  }

  protected onDelete() {
    const id = this.selectedNoteId();
    if (id) {
      this.skres.deleteNote(id);
    }
  }

  protected onDetailPanTo(event: {
    center: Position;
    zoomLevel: number | null;
  }) {
    this.pan.emit(event);
  }

  protected snippet(note: { description?: string; mimeType?: string }): string {
    return textSnippet(note?.description);
  }

  protected timeAgo(timestamp: string | number | undefined): string {
    return timeAgoOf(timestamp);
  }

  protected groupColor(name: string | undefined): string {
    return groupColorOf(name);
  }

  private timestampOf(meta: SKNote): number | null {
    const raw = (meta as unknown as { timestamp?: string | number }).timestamp;
    if (raw === undefined || raw === null) {
      return null;
    }
    const t = typeof raw === 'string' ? Date.parse(raw) : raw;
    return isNaN(t) ? null : t;
  }

  private emitCenter(position: SKPosition) {
    const zoomTo =
      this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
        ? this.app.config.resources.notes.minZoom
        : null;
    this.pan.emit({
      center: [position.longitude, position.latitude],
      zoomLevel: zoomTo
    });
  }
}
