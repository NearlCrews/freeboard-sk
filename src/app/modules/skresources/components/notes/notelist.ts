import type { OnInit, OnChanges } from '@angular/core';
import {
  FbButtonComponent,
  FbIconComponent
} from 'src/app/design-system/primitives';
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  output,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { AppFacade } from 'src/app/app.facade';
import type {
  Position,
  FBNotes,
  FBNote,
  FBResourceSelect,
  SKPosition
} from 'src/app/types';
import { textSnippet } from 'src/app/lib/text-snippet';
import { SKResourceService } from '../../resources.service';
import {
  groupColor as groupColorOf,
  timeAgo as timeAgoOf
} from './note-helpers';

interface GroupChip {
  name: string;
  label: string;
  color: string;
  count: number;
}

@Component({
  selector: 'note-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notelist.html',
  styleUrls: ['./notes.scss'],
  imports: [
    FbButtonComponent,
    FbIconComponent,
    CommonModule,
    MatTooltipModule,
    ScrollingModule
  ]
})
export class NoteListComponent implements OnInit, OnChanges {
  @Input() notes: FBNotes = [];
  select = output<FBResourceSelect>();
  refresh = output<void>();
  closed = output<void>();
  pan = output<{ center: Position; zoomLevel: number | null }>();

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
      (i) => i[1].properties && i[1].properties['draft']
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
        if (!name.includes(text) && !description.includes(text)) {
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

  groupColor(name: string | undefined): string {
    return groupColorOf(name);
  }

  timeAgo(timestamp: string | number | undefined): string {
    return timeAgoOf(timestamp);
  }

  snippet(note: { description?: string; mimeType?: string }): string {
    return textSnippet(note?.description);
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
