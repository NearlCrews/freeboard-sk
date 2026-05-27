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
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RemarkModule } from 'ngx-remark';
import { AddTargetPipe } from './safe.pipe';

import {
  FbButtonComponent,
  FbIconComponent
} from 'src/app/design-system/primitives';
import { FbInfoPanelLayoutComponent } from 'src/app/modules/info-panel/layout';

import { AppFacade } from 'src/app/app.facade';
import type { AppIconDef } from 'src/app/modules/icons';
import { getResourceIcon } from 'src/app/modules/icons';
import { SKNote } from '../../resource-classes';
import { CourseService } from 'src/app/modules/course';
import type { Position } from 'src/app/types';
import {
  groupColor as groupColorOf,
  timeAgo as timeAgoOf
} from './note-helpers';

@Component({
  selector: 'note-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatTooltipModule,
    FbButtonComponent,
    FbIconComponent,
    FbInfoPanelLayoutComponent,
    CoordsPipe,
    AddTargetPipe,
    RemarkModule
  ],
  templateUrl: `note-panel.html`
})
export class NotePanel {
  note = input<SKNote>(new SKNote());
  id = input<string | undefined>(undefined);

  protected _note = linkedSignal(() => this.note());

  edit = output<string>();
  delete = output<void>();
  info = output<void>();
  panTo = output<{
    center: Position;
    zoomLevel: number | null;
  }>();

  protected icon: AppIconDef | undefined;
  protected app = inject(AppFacade);
  private course = inject(CourseService);

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
    const id = this.id();
    if (id) {
      this.edit.emit(id);
    }
  }

  onDelete() {
    this.delete.emit();
  }

  onInfo() {
    this.info.emit();
  }

  onGoto() {
    const pos = this._note().position;
    if (pos) {
      this.course.setDestination(pos);
    }
  }

  onPanTo() {
    const pos = this._note().position;
    if (pos) {
      const zoomTo =
        this.app.config.map.zoomLevel < this.app.config.resources.notes.minZoom
          ? this.app.config.resources.notes.minZoom
          : null;
      this.panTo.emit({
        center: [pos.longitude, pos.latitude],
        zoomLevel: zoomTo
      });
    }
  }

  openNoteUrl() {
    window.open(this.note().url, '_notes');
  }

  groupColor(name: string | undefined): string {
    return groupColorOf(name);
  }

  timeAgo(timestamp: string | number | undefined): string {
    return timeAgoOf(timestamp);
  }
}
