import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  output
} from '@angular/core';
import { CoordsPipe } from 'src/app/lib/pipes';
import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RemarkModule } from 'ngx-remark';
import { AddTargetPipe } from './safe.pipe';

import { AppFacade } from 'src/app/app.facade';
import type { AppIconDef } from 'src/app/modules/icons';
import { getResourceIcon } from 'src/app/modules/icons';
import { SKNote } from '../../resource-classes';
import { CourseService } from 'src/app/modules/course';
import type { Position } from 'geojson';
import { SKResourceService } from '../../resources.service';

// Match the list view's palette so a group's colour is stable across
// the list card and the detail header.
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
  selector: 'note-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    CoordsPipe,
    AddTargetPipe,
    RemarkModule
  ],
  templateUrl: `note-panel.html`,
  styleUrls: ['note-panel.scss']
})
export class NotePanel {
  note = input<SKNote>(new SKNote());
  id = input<string>();

  protected _note = linkedSignal(() => this.note());

  edit = output<string>();
  panTo = output<{
    center: Position;
    zoomLevel: number;
  }>();

  protected icon: AppIconDef;
  protected app = inject(AppFacade);
  private course = inject(CourseService);
  private skres = inject(SKResourceService);

  constructor() {
    effect(() => {
      this.note();
      this.init(this.note());
    });
  }

  init(n: SKNote) {
    if (!n) {
      return;
    }
    n.properties = n.properties ?? {};
    n.description = n.description ?? '';
    this._note.set(n);
    this.icon = getResourceIcon('notes', this._note());
  }

  onEdit() {
    this.edit.emit(this.id());
  }

  onDelete() {
    this.skres.deleteNote(this.id());
  }

  onGoto() {
    if (this._note().position) {
      this.course.setDestination(this._note().position);
    }
  }

  onPanTo() {
    if (this._note().position) {
      const zoomTo =
        this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
          ? this.app.config.resources.notes.minZoom
          : null;
      this.panTo.emit({
        center: [
          this._note().position.longitude,
          this._note().position.latitude
        ],
        zoomLevel: zoomTo
      });
    }
  }

  openNoteUrl() {
    window.open(this.note().url, '_notes');
  }

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

  timeAgo(timestamp: string | number | undefined): string {
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
}
