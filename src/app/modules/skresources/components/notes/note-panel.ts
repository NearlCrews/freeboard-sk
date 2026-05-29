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

import { RemarkModule } from 'ngx-remark';
import { AddTargetPipe } from './add-target.pipe';

import {
  FbButtonComponent,
  FbIconComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';
import { FbInfoPanelLayoutComponent } from 'src/app/modules/info-panel/layout/info-panel-layout.component';

import { AppFacade } from 'src/app/app.facade';
import type { AppIconDef } from 'src/app/modules/icons';
import { getResourceIcon } from 'src/app/modules/icons';
import { SKNote } from '../../resource-classes';
import { CourseService } from 'src/app/modules/course/course.service';
import type { Position } from 'src/app/types';
import {
  groupColor as groupColorOf,
  timeAgo as timeAgoOf
} from './note-helpers';

@Component({
  selector: 'note-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbIconComponent,
    FbTooltipDirective,
    FbInfoPanelLayoutComponent,
    CoordsPipe,
    AddTargetPipe,
    RemarkModule
  ],
  templateUrl: `note-panel.html`,
  host: {
    tabindex: '-1',
    '(keydown.escape)': 'onEscape($event)'
  }
})
export class NotePanel {
  note = input<SKNote>(new SKNote());
  id = input<string | undefined>(undefined);

  protected _note = linkedSignal(() => this.note());

  edit = output<string>();
  delete = output<void>();
  info = output<void>();
  closed = output<void>();
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

  onEscape(event: KeyboardEvent) {
    event.stopPropagation();
    this.closed.emit();
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

  // signalk-crows-nest v0.4.6+ publishes attribution as structured
  // properties ({source, attribution, plugin, pluginRepo}) and dropped
  // the inline "Data sourced from..." trailer. Older notes may still
  // carry the trailer; strip it so it does not render twice.
  private static readonly OLD_NOTE_TRAILER = '\nData sourced from ';
  private static readonly OLD_NOTE_PLUGIN_REGEX =
    /via the (signalk-[\w.-]+) plugin/i;

  protected readonly cleanDescription = computed<string>(() => {
    const raw = this._note().description ?? '';
    const idx = raw.indexOf(NotePanel.OLD_NOTE_TRAILER);
    return (idx > -1 ? raw.slice(0, idx) : raw).trim();
  });

  // $source value assigned by the SignalK server's built-in storage
  // plugin. A footer reading "stored locally" is noise; suppress it.
  private static readonly LOCAL_STORAGE_SOURCE = 'resources-provider';

  protected readonly pluginInfo = computed<{
    name: string;
    url: string;
    attribution: string;
  } | null>(() => {
    const note = this._note();
    const props = note.properties ?? {};
    const attribution =
      (typeof props['attribution'] === 'string' && props['attribution']) || '';
    const propsPlugin =
      (typeof props['plugin'] === 'string' && props['plugin']) ||
      (typeof props['pluginId'] === 'string' && props['pluginId']) ||
      '';
    const propsPluginRepo =
      typeof props['pluginRepo'] === 'string' ? props['pluginRepo'] : '';
    const skSource = note.source;
    const isLocalStorage =
      !skSource || skSource === NotePanel.LOCAL_STORAGE_SOURCE;
    if (isLocalStorage && !attribution && !propsPlugin) {
      return null;
    }
    // Prefer the producer-declared properties.plugin: it survives a
    // SignalK server proxying the delta through another $source.
    const name =
      propsPlugin ||
      (!isLocalStorage ? skSource : '') ||
      this.pluginNameFromDescription();
    if (!name) {
      return { name: '', url: '', attribution };
    }
    const url = propsPluginRepo || `https://www.npmjs.com/package/${name}`;
    return { name, url, attribution };
  });

  private pluginNameFromDescription(): string {
    const raw = this._note().description ?? '';
    const match = raw.match(NotePanel.OLD_NOTE_PLUGIN_REGEX);
    return match?.[1] ?? '';
  }
}
