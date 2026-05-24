import {
  Component,
  Input,
  ChangeDetectionStrategy,
  output,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { AppFacade } from 'src/app/app.facade';
import { Position } from 'src/app/types';
import { FBNotes, FBNote, FBResourceSelect, SKPosition } from 'src/app/types';
import { SKResourceService } from '../../resources.service';

interface GroupChip {
  name: string;
  label: string;
  color: string;
  count: number;
}

// Eight-stop palette for group dots. Hues sit alongside the cream/navy
// surface so they read calmly together. Names map deterministically.
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
  selector: 'note-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notelist.html',
  styleUrls: ['./notes.scss'],
  imports: [
    CommonModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    ScrollingModule
  ]
})
export class NoteListComponent {
  @Input() notes: FBNotes;
  select = output<FBResourceSelect>();
  refresh = output<void>();
  closed = output<void>();
  pan = output<{ center: Position; zoomLevel: number }>();

  filterList: FBNotes = [];
  filterText = '';
  showNotes = false;
  draftOnly = false;
  activeGroup = '';
  selectedIndex = -1;
  groupChips: GroupChip[] = [];

  protected app = inject(AppFacade);
  private skres = inject(SKResourceService);

  ngOnInit() {
    this.showNotes = this.app.config.ui.showNotes;
    this.initItems();
  }

  ngOnChanges() {
    this.initItems();
  }

  close() {
    this.closed.emit();
  }

  initItems() {
    this.rebuildGroupChips();
    this.doFilter();
    this.sortFilter();
    if (this.draftOnly) {
      this.filterDraftOnly();
    }
  }

  toggleMapDisplay(value: boolean) {
    this.showNotes = value;
    this.app.config.ui.showNotes = value;
    this.app.saveConfig();
  }

  viewNote(val: string, isGroup = false) {
    this.select.emit({ id: val, isGroup: isGroup });
  }

  itemRefresh() {
    this.skres.refreshNotes();
  }

  emitCenter(position: SKPosition) {
    const zoomTo =
      this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
        ? this.app.config.resources.notes.minZoom
        : null;
    this.pan.emit({
      center: [position.longitude, position.latitude],
      zoomLevel: zoomTo
    });
  }

  filterKeyUp(e: string) {
    this.filterText = e;
    this.doFilter();
    this.sortFilter();
  }

  filterDraftOnly() {
    this.filterList = this.filterList.filter(
      (i) => i[1].properties && i[1].properties.draft
    );
  }

  toggleDraftOnly() {
    this.draftOnly = !this.draftOnly;
    if (this.draftOnly) {
      this.filterDraftOnly();
    } else {
      this.filterKeyUp('');
    }
  }

  setActiveGroup(name: string) {
    this.activeGroup = name === this.activeGroup ? '' : name;
    this.selectedIndex = -1;
    this.doFilter();
    this.sortFilter();
    if (this.draftOnly) {
      this.filterDraftOnly();
    }
  }

  selectNote(r: FBNote, i: number) {
    this.selectedIndex = i;
    this.viewNote(r[0]);
    if (r[1].position) {
      this.emitCenter(r[1].position);
    }
  }

  onSearchKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.filterKeyUp('');
    } else if (event.key === 'ArrowDown' && this.filterList.length > 0) {
      event.preventDefault();
      this.selectedIndex = 0;
    }
  }

  onCardKey(event: KeyboardEvent, r: FBNote, i: number) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectNote(r, i);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (i < this.filterList.length - 1) {
          this.selectedIndex = i + 1;
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(-1, i - 1);
        break;
      case 'Escape':
        this.selectedIndex = -1;
        break;
    }
  }

  doFilter() {
    const text = this.filterText.toLowerCase();
    this.filterList = this.notes.filter((n: FBNote) => {
      if (this.activeGroup && n[1].group !== this.activeGroup) {
        return false;
      }
      if (text) {
        const name = (n[1].name || '').toLowerCase();
        const description = (n[1].description || '').toLowerCase();
        if (name.indexOf(text) === -1 && description.indexOf(text) === -1) {
          return false;
        }
      }
      return true;
    });
    if (this.draftOnly) {
      this.filterDraftOnly();
    }
  }

  sortFilter() {
    this.filterList.sort((a, b) => {
      const x = (a[1].name || '').toUpperCase();
      const y = (b[1].name || '').toUpperCase();
      return x <= y ? -1 : 1;
    });
  }

  trackById = (_: number, r: FBNote) => r[0];

  /**
   * Stable colour per group name using a small hash so the same group
   * keeps the same hue across renders (and across the list and detail
   * views).
   */
  groupColor(name: string | undefined): string {
    if (!name) {
      return 'var(--notes-text-muted)';
    }
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return GROUP_PALETTE[Math.abs(hash) % GROUP_PALETTE.length];
  }

  /** Relative time formatter; falls back to '' if the timestamp is unparseable. */
  timeAgo(timestamp: string | number | undefined): string {
    if (!timestamp) {
      return '';
    }
    const t =
      typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
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

  /**
   * Strip Markdown / HTML to a clean plaintext preview, truncated to ~140
   * characters with an ellipsis. Returns '' (falsy) when there is no body
   * so the template's `@if` skips rendering an empty snippet line.
   */
  snippet(note: { description?: string; mimeType?: string }): string {
    const body = note?.description;
    if (!body) {
      return '';
    }
    let text = body;
    // Strip HTML tags regardless; many notes mark themselves markdown but
    // still contain inline HTML.
    text = text.replace(/<[^>]+>/g, ' ');
    // Strip Markdown noise: images, links to label, formatting marks.
    text = text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 140 ? text.slice(0, 140).trim() + '...' : text;
  }

  /** `47.612°N 122.345°W` style coordinate pill. */
  formatPos(pos: { latitude: number; longitude: number } | undefined): string {
    if (!pos || typeof pos.latitude !== 'number') {
      return '';
    }
    const lat = Math.abs(pos.latitude).toFixed(3);
    const latDir = pos.latitude >= 0 ? 'N' : 'S';
    const lon = Math.abs(pos.longitude).toFixed(3);
    const lonDir = pos.longitude >= 0 ? 'E' : 'W';
    return `${lat}°${latDir} ${lon}°${lonDir}`;
  }

  /** Recompute group filter chips from the full notes input. */
  private rebuildGroupChips() {
    const counts = new Map<string, number>();
    for (const n of this.notes || []) {
      const g = n[1].group;
      if (g) {
        counts.set(g, (counts.get(g) || 0) + 1);
      }
    }
    const total = this.notes ? this.notes.length : 0;
    this.groupChips = [
      {
        name: '',
        label: 'All',
        color: 'var(--notes-text-muted)',
        count: total
      },
      ...Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({
          name,
          label: name,
          color: this.groupColor(name),
          count
        }))
    ];
  }
}
