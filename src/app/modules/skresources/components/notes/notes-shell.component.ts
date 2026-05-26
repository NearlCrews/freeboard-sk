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
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  FbDetailPaneComponent,
  FbFilterBarComponent,
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
import { SKResourceService } from '../../resources.service';
import { SKNote } from '../../resource-classes';
import { NotePanel } from './note-panel';

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

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const GROUP_PALETTE = [
  '#b66428',
  '#5b7b8b',
  '#8b5e5e',
  '#5e8b6e',
  '#8e7948',
  '#6e5b8b',
  '#8b6e48',
  '#487b8b'
];

@Component({
  selector: 'notes-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
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
    const body = note?.description;
    if (!body) {
      return '';
    }
    let text = body.replace(/<[^>]+>/g, ' ');
    text = text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 140 ? text.slice(0, 140).trim() + '...' : text;
  }

  protected timeAgo(timestamp: string | number | undefined): string {
    if (!timestamp) {
      return '';
    }
    const t = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
    if (isNaN(t)) {
      return '';
    }
    const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return min === 1 ? '1 min ago' : `${min} mins ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr === 1 ? '1 hour ago' : `${hr} hours ago`;
    const day = Math.floor(hr / 24);
    if (day === 1) return 'yesterday';
    if (day < 7) return `${day} days ago`;
    if (day < 30) {
      const w = Math.floor(day / 7);
      return w === 1 ? '1 week ago' : `${w} weeks ago`;
    }
    if (day < 365) {
      const m = Math.floor(day / 30);
      return m === 1 ? '1 month ago' : `${m} months ago`;
    }
    const y = Math.floor(day / 365);
    return y === 1 ? '1 year ago' : `${y} years ago`;
  }

  protected groupColor(name: string | undefined): string {
    if (!name) {
      return 'var(--notes-text-muted)';
    }
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return (
      GROUP_PALETTE[Math.abs(hash) % GROUP_PALETTE.length] ??
      'var(--notes-text-muted)'
    );
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
