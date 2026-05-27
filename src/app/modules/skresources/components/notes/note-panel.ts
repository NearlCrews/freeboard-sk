import {
  ChangeDetectionStrategy,
  Component,
  computed,
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

  // Plugin-source contributions (e.g. signalk-crows-nest from
  // ActiveCaptain) currently append a boilerplate trailer to every
  // note's description text, e.g.
  //   "Data sourced from <X> via the <plugin-name> plugin."
  //   "Something missing or room for improvement? You are encouraged to
  //   contribute."
  // The right home for the attribution is the structured `properties`
  // dict on the note (properties.source plus optional properties.plugin
  // or properties.attribution). This panel prefers the structured
  // fields and falls back to parsing the description text only for
  // older notes that predate the structured fields.
  private static readonly TRAILER_MARKER = '\nData sourced from ';
  private static readonly PLUGIN_NAME = /via the (signalk-[\w.-]+) plugin/i;

  protected readonly cleanDescription = computed<string>(() => {
    const raw = this._note().description ?? '';
    const idx = raw.indexOf(NotePanel.TRAILER_MARKER);
    return (idx > -1 ? raw.slice(0, idx) : raw).trim();
  });

  protected readonly pluginInfo = computed<{
    name: string;
    url: string;
  } | null>(() => {
    const props = this._note().properties ?? {};
    const fromProps =
      typeof props['plugin'] === 'string'
        ? props['plugin']
        : typeof props['pluginId'] === 'string'
          ? props['pluginId']
          : '';
    const name = fromProps || this.pluginNameFromDescription();
    if (!name) {
      return null;
    }
    return { name, url: `https://www.npmjs.com/package/${name}` };
  });

  private pluginNameFromDescription(): string {
    const raw = this._note().description ?? '';
    const match = raw.match(NotePanel.PLUGIN_NAME);
    return match?.[1] ?? '';
  }
}
