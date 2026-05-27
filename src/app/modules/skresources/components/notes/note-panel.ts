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
  // ActiveCaptain) append a boilerplate trailer to every note's
  // description text:
  //   "Data sourced from <X> via the <plugin-name> plugin."
  //   "Something missing or room for improvement? You are encouraged to
  //   contribute."
  // The user sees the same template on every note; redundant noise.
  // Strip it from the rendered description and expose the plugin name
  // as a tiny attribution footer at the bottom of the body, linked to
  // its npm page (which always exists for published plugins and
  // forwards to the GitHub repo from there).
  private static readonly PLUGIN_TRAILER =
    /\n\s*Data sourced from .+?(?:\nSomething missing or room for improvement\?[\s\S]*)?$/i;
  private static readonly PLUGIN_NAME = /via the (signalk-[\w.-]+) plugin/i;

  protected readonly cleanDescription = computed<string>(() => {
    const raw = this._note().description ?? '';
    return raw.replace(NotePanel.PLUGIN_TRAILER, '').trim();
  });

  protected readonly pluginInfo = computed<{
    name: string;
    url: string;
  } | null>(() => {
    const raw = this._note().description ?? '';
    const match = raw.match(NotePanel.PLUGIN_NAME);
    if (!match || !match[1]) {
      return null;
    }
    const name = match[1];
    return { name, url: `https://www.npmjs.com/package/${name}` };
  });
}
