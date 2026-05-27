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

  // signalk-crows-nest v0.4.6 and later publishes attribution as
  // structured properties (properties.{source, attribution, plugin,
  // pluginRepo}) and stopped appending an inline "Data sourced from..."
  // trailer to the description. Older notes still in the SignalK store
  // may carry the legacy trailer; strip it so it is not displayed
  // twice (once inline, once via the attribution footer).
  private static readonly LEGACY_TRAILER_MARKER = '\nData sourced from ';
  private static readonly LEGACY_PLUGIN_NAME =
    /via the (signalk-[\w.-]+) plugin/i;

  protected readonly cleanDescription = computed<string>(() => {
    const raw = this._note().description ?? '';
    const idx = raw.indexOf(NotePanel.LEGACY_TRAILER_MARKER);
    return (idx > -1 ? raw.slice(0, idx) : raw).trim();
  });

  // The SignalK server's built-in storage plugin assigns this as
  // $source for every user-created resource. Surfacing it in an
  // attribution footer is noise (it just means "stored locally").
  // Skip the footer entirely when the resource is local-storage with
  // no producer-side attribution metadata.
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
    // crows-nest v0.4.6+ publishes properties.plugin and
    // properties.pluginRepo on every note. Prefer those over $source
    // (which is the producing plugin id and may be the same) and over
    // the npm-package URL guess.
    const propsPlugin =
      (typeof props['plugin'] === 'string' && props['plugin']) ||
      (typeof props['pluginId'] === 'string' && props['pluginId']) ||
      '';
    const propsPluginRepo =
      typeof props['pluginRepo'] === 'string' ? props['pluginRepo'] : '';
    const skSource = note.source;
    const isLocalStorage =
      !skSource || skSource === NotePanel.LOCAL_STORAGE_SOURCE;
    // Skip the footer entirely when nothing interesting is available:
    // a local-storage resource with no attribution and no explicit
    // plugin metadata reads as anonymous, not from "resources-provider".
    if (isLocalStorage && !attribution && !propsPlugin) {
      return null;
    }
    // Prefer the structured properties.plugin over $source (they will
    // typically agree, but the property is the producer-declared value
    // and survives a SignalK server proxying the delta through another
    // source). Fall back to regex-parsing the legacy description
    // trailer only for notes that predate v0.4.6.
    const name =
      propsPlugin ||
      (!isLocalStorage ? skSource : '') ||
      this.pluginNameFromDescription();
    if (!name) {
      return { name: '', url: '', attribution };
    }
    // Producer's pluginRepo (e.g. the GitHub repo URL) is the canonical
    // home and ships on every v0.4.6+ note. Fall back to npmjs.com only
    // when the producer did not declare a repo URL.
    const url = propsPluginRepo || `https://www.npmjs.com/package/${name}`;
    return { name, url, attribution };
  });

  private pluginNameFromDescription(): string {
    const raw = this._note().description ?? '';
    const match = raw.match(NotePanel.LEGACY_PLUGIN_NAME);
    return match?.[1] ?? '';
  }
}
